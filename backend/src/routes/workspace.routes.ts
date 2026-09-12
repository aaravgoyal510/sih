import { Router, Response, NextFunction, raw } from 'express';
import { PartyRole, ResourceType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { signToken } from '../utils/jwt';
import { createHash } from 'node:crypto';
import { validateAttributes } from '../schemas/resource-attributes.schema';
import { matchingEngine } from '../matching/matching-engine';
import {scoreTrust} from '../services/trust-score';
import {makeRecommendation} from '../services/recommendation';
import {notifyParties,tradeEvent} from '../services/trade-events';
import {DOCUMENT_BUCKET,MAX_DOCUMENT_BYTES,StorageFailure,documentExtension,storageObjectPath,uploadDocument,downloadDocument} from '../services/verification-storage';
import decisionRoutes from '../decision/routes';
import {DecisionError} from '../decision/core';
import {decisionsForAcceptance,linkDecisions,releaseDecisionCapacity} from '../decision/execution';

const router = Router();
const publicUrl=z.string().url().refine(value=>['https:','http:'].includes(new URL(value).protocol),'Use an HTTP or HTTPS document link.');
class Failure extends Error { constructor(public status: number, message: string) { super(message); } }
const check = (condition: unknown, status: number, message: string) => { if (!condition) throw new Failure(status, message); };
const run = (handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => handler(req, res).catch(next);
const adminRoles = ['DISTRICT_ADMIN', 'STATE_ADMIN', 'PLATFORM_ADMIN'];
const isAdmin = (p: any) => p.roles.some((r: string) => adminRoles.includes(r));
const isState = (p: any) => p.roles.some((r: string) => ['STATE_ADMIN', 'PLATFORM_ADMIN'].includes(r));
const publicParty = { id: true, name: true, district: true, roles: true, credibility: true } as const;
const offerInclude = { decisionQuote:{select:{id:true,status:true,validUntil:true,recommendations:{where:{selection:{isNot:null}},select:{id:true,farmerPartyId:true,selection:{select:{id:true,bookingId:true,selectedAt:true}}}}}},listing: { include: { party: { select: publicParty } } }, requirement: { include: { party: { select: publicParty } } }, booking: { include: { dispute: true, ratings: true, events:{orderBy:{createdAt:'desc'},take:20} } } } as const;
const documents: Record<string, string[]> = {
  STORAGE_OPERATOR: ['WDRA_LICENSE', 'STORAGE_PERMIT', 'GST'], TRANSPORT_OPERATOR: ['TRANSPORT_PERMIT', 'VEHICLE_FITNESS_CERT', 'GST'],
  EQUIPMENT_PROVIDER: ['MACHINE_REG', 'GST'], LABOR_CONTRACTOR: ['LABOR_REGISTRATION'], INPUT_SUPPLIER: ['PESTICIDE_DEALER_LICENSE', 'GST'],
  BUYER: ['GST', 'KYC'], FARMER: ['LAND_RECORD'], FPO_ADMIN: ['FPO_REGISTRATION'],
};
const resourceRoles: Record<string, string[]> = {
  CROP_LOT: ['FARMER', 'FPO_ADMIN'], COLD_STORAGE: ['STORAGE_OPERATOR'], TRANSPORT: ['TRANSPORT_OPERATOR'],
  EQUIPMENT_SERVICE: ['EQUIPMENT_PROVIDER'], LABOR: ['LABOR_CONTRACTOR'], INPUT_GROUP_BUY: ['INPUT_SUPPLIER', 'FPO_ADMIN'],
  USED_EQUIPMENT: ['FARMER', 'EQUIPMENT_PROVIDER'], CONTRACT_FARMING: ['FARMER', 'FPO_ADMIN', 'BUYER'],
};
async function actor(req: AuthenticatedRequest) {
  const party = await prisma.party.findUnique({ where: { id: req.user?.partyId || '' }, include: { credibility: true, verifications: true, fpo: true } });
  check(party, 401, 'Please sign in again.');
  return party!;
}
async function serial<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(fn, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 60000 }); }
    catch (e: any) { if (e.code !== 'P2034' || attempt >= 2) throw e; }
  }
}

// A local evaluation session is explicit and cannot elevate arbitrary accounts.
const demoPhones = ['+919822012345','+919822098765','+919822044444','+919890011111','+919890022222','+919833011111','+919833022222','+919833033333','+919833044444','+919833055555','+919900011111','+919900099999','DEMO-PLATFORM-ADMIN'];
router.get('/demo-profiles', run(async (_req, res) => {
  check(process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true', 404, 'Demo access disabled');
  const profiles = await prisma.party.findMany({ where: { user: { phone: { in: demoPhones } } }, select: { id: true, name: true, district: true, roles: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, profiles });
}));
router.post('/demo-session', run(async (req, res) => {
  check(process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true', 404, 'Demo access disabled');
  const { partyId } = z.object({ partyId: z.string().uuid() }).parse(req.body);
  const party = await prisma.party.findUnique({ where: { id: partyId }, include: { user: true } });
  check(party, 404, 'Profile not found');
  check(demoPhones.includes(party!.user.phone), 403, 'Only designated evaluation accounts support demo sign-in');
  const { user, ...profile } = party!;
  const token = signToken({ userId: user.id, phone: user.phone, partyId: profile.id, roles: profile.roles, district: profile.district });
  res.json({ success: true, token, party: profile });
}));
router.use(authenticateToken);
router.use(decisionRoutes);
router.post('/recommendations/preview',run(async(req,res)=>{
  const paise=z.number().int().min(0).max(1e12);
  const input=z.object({listingId:z.string().uuid(),requirementId:z.string().uuid(),offerId:z.string().uuid().optional(),transportPaise:paise,otherCostsPaise:paise,baselineNetPaise:z.number().int().min(-1e12).max(1e12).optional()}).parse(req.body);
  const [listing,requirement,offer]=await Promise.all([
    prisma.listing.findUnique({where:{id:input.listingId},include:{party:{select:publicParty}}}),
    prisma.requirement.findUnique({where:{id:input.requirementId},include:{party:{select:publicParty},offers:{where:{status:'ACCEPTED'},select:{id:true}}}}),
    input.offerId?prisma.offer.findUnique({where:{id:input.offerId}}):null,
  ]);
  check(listing?.partyId===req.user?.partyId,403,'Only the lot owner can request this decision.');
  check(listing?.resourceType==='CROP_LOT'&&listing.status==='OPEN',409,'Choose an open crop lot.');
  check(requirement?.resourceType==='CROP_LOT'&&requirement.party.roles.includes('BUYER')&&!requirement.offers.length&&requirement.partyId!==listing!.partyId,409,'An open buyer crop requirement is required.');
  check(!listing!.party.credibility?.suspended&&!requirement!.party.credibility?.suspended,403,'Suspended parties are excluded from new decisions.');
  check(!requirement!.deadline||requirement!.deadline>new Date(),409,'The buyer requirement has expired.');
  check(!listing!.availableTo||listing!.availableTo>new Date(),409,'This listing availability has expired.');
  if(input.offerId)check(offer&&offer.listingId===listing!.id&&offer.requirementId===requirement!.id&&['PENDING','COUNTERED'].includes(offer.status),409,'Choose a current offer for this crop and buyer.');
  const a=listing!.attributes as any,b=requirement!.attributes as any;
  check(String(a.crop).toLowerCase()===String(b.crop).toLowerCase()&&(!b.qualityGrade||a.qualityGrade===b.qualityGrade),400,'Crop and declared grade must match.');
  const quantity=Number(requirement!.quantityNeeded),budget=Number(offer?offer.price:requirement!.budget);
  check(quantity>0&&quantity<=Number(a.quantityKg)&&budget>0,400,'This quantity or budget is not feasible for the selected lot.');
  check(!a.isPooled||quantity===Number(a.quantityKg),400,'Pooled lots need a full-lot buyer requirement.');
  let recommendation;try{recommendation=makeRecommendation({buyerName:requirement!.party.name,quantityKg:quantity,budgetPerKg:budget,transportPaise:input.transportPaise,otherCostsPaise:input.otherCostsPaise,baselineNetPaise:input.baselineNetPaise,source:offer?'OFFER':'BUDGET'});}catch{throw new Failure(400,'Decision amounts exceed supported limits.');}
  const trust=await prisma.trustScore.findUnique({where:{partyId_role:{partyId:requirement!.partyId,role:'BUYER'}}});
  const trustSnapshot=trust&&Date.now()-trust.asOf.getTime()<15*60000?trust.evidenceSnapshot:undefined;
  const saved=await prisma.recommendation.create({data:{id:recommendation.id,farmerPartyId:listing!.partyId,buyerPartyId:requirement!.partyId,listingId:listing!.id,what:recommendation.what,why:recommendation.why,risk:'HIGH',riskBasis:recommendation.risk.basis,what_if_wait:recommendation.what_if_wait,expectedNetPaise:BigInt(recommendation.why.expectedNetPaise),baselineNetPaise:recommendation.why.baselineNetPaise===null?null:BigInt(recommendation.why.baselineNetPaise),deltaPaise:recommendation.why.deltaPaise===null?null:BigInt(recommendation.why.deltaPaise),trustSnapshot:trustSnapshot as Prisma.InputJsonValue|undefined,inputSnapshot:{...input,quantityKg:quantity,crop:a.crop,qualityGrade:a.qualityGrade,budgetPerKg:budget,requirementPublishedAt:requirement!.createdAt.toISOString()},explanationVersion:recommendation.explanationVersion,validUntil:recommendation.validUntil}});
  res.setHeader('Cache-Control','private, no-store');res.json({success:true,recommendation:{...recommendation,persisted:true,id:saved.id,buyerTrust:trustSnapshot||null},sourceEvidence:{listingId:listing!.id,requirementId:requirement!.id,requirementPublishedAt:requirement!.createdAt}});
}));
router.get('/recommendations/:id',run(async(req,res)=>{
 const record=await prisma.recommendation.findUnique({where:{id:z.string().uuid().parse(req.params.id)}});check(record?.farmerPartyId===req.user?.partyId,404,'Decision not found.');const r=record!;
 res.setHeader('Cache-Control','private, no-store');res.json({success:true,recommendation:{id:r.id,synthetic:false,persisted:true,what:r.what,why:r.why,risk:{level:r.risk==='HIGH'?'High':r.risk==='MEDIUM'?'Medium':'Low',basis:r.riskBasis},what_if_wait:r.what_if_wait,buyerTrust:r.trustSnapshot,createdAt:r.createdAt.toISOString(),validUntil:r.validUntil.toISOString(),explanationVersion:r.explanationVersion}});
}));
router.get('/recommendations',run(async(req,res)=>{
 const recommendations=await prisma.recommendation.findMany({where:{farmerPartyId:req.user!.partyId},orderBy:{createdAt:'desc'},take:20,select:{id:true,what:true,why:true,createdAt:true,validUntil:true}});
 res.setHeader('Cache-Control','private, no-store');res.json({success:true,recommendations});
}));
router.get('/updates',run(async(req,res)=>{
 const partyId=req.user!.partyId;
 const records=await prisma.notification.findMany({where:{partyId},orderBy:{createdAt:'desc'},take:50});
 res.setHeader('Cache-Control','private, no-store');res.json({success:true,partyId,updates:records.map(record=>({...record.payload as Record<string,unknown>,id:record.id,kind:record.kind,recordedAt:record.createdAt,readAt:record.readAt})),coverage:'Latest 50 durable events recorded since this release. Payment events are simulations.'});
}));
router.post('/updates/read',run(async(req,res)=>{
 const {ids}=z.object({ids:z.array(z.string().uuid()).max(50)}).parse(req.body);
 await prisma.notification.updateMany({where:{partyId:req.user!.partyId,id:{in:ids},readAt:null},data:{readAt:new Date()}});
 res.json({success:true});
}));
router.use('/ads',(_req,res)=>{res.status(410).json({success:false,error:'Advertising is outside the current farmer-income phase. Existing records are retained.'});});
router.get('/trust/:partyId',run(async(req,res)=>{
  const partyId=z.string().uuid().parse(req.params.partyId);
  const party=await prisma.party.findUnique({where:{id:partyId},select:{id:true,name:true,roles:true,credibility:true,verifications:{where:{documentType:'KYC',status:'APPROVED',OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},select:{id:true}}}});
  check(party?.roles.includes('BUYER'),404,'Buyer profile not found.');
  const [orders,ratings,disputesCount]=await Promise.all([
    prisma.booking.groupBy({by:['fulfillmentStatus'],where:{offer:{requirement:{partyId}}},_count:{_all:true}}),
    prisma.rating.aggregate({where:{receiverPartyId:partyId},_avg:{score:true},_count:{score:true}}),
    prisma.dispute.count({where:{OR:[{raisedByPartyId:partyId},{respondentPartyId:partyId}]}}),
  ]);
  const count=(status:string)=>orders.find(o=>o.fulfillmentStatus===status)?._count._all||0;
  const trust=scoreTrust({partyId,role:'BUYER',kycVerified:!!party!.verifications.length,totalTransactions:count('COMPLETED'),eligibleOrders:orders.reduce((sum,o)=>sum+o._count._all,0),onTimePayments:0,eligiblePayments:0,attributableCancellations:null,cancelledOrdersCount:count('CANCELLED'),counterpartRating:ratings._avg.score===null?null:Math.round(ratings._avg.score*10)/10,ratingCount:ratings._count.score,disputesCount,confirmedAtFaultDisputes:party!.credibility?.disputeCount||0,suspended:party!.credibility?.suspended||false});
  const stored={partyId,role:'BUYER' as const,score:trust.score,tier:trust.tier as 'HIGH_TRUST'|'MEDIUM_TRUST'|'LOW_TRUST',kycVerified:trust.kycVerified,totalTransactions:trust.totalTransactions,eligibleOrders:trust.eligibleOrders,onTimePayments:trust.onTimePayments,eligiblePayments:trust.eligiblePayments,onTimePaymentPct:trust.onTimePaymentPct,onTimeFulfillmentPct:null,disputesCount:trust.disputesCount,confirmedAtFaultDisputes:trust.confirmedAtFaultDisputes,cancelledOrdersCount:trust.cancelledOrdersCount,counterpartRating:trust.counterpartRating,ratingCount:trust.ratingCount,provisional:trust.provisional,suspended:trust.suspended,formulaVersion:trust.formulaVersion,evidenceSnapshot:trust,asOf:new Date(trust.asOf)};
  await prisma.trustScore.upsert({where:{partyId_role:{partyId,role:'BUYER'}},create:stored,update:stored});
  res.setHeader('Cache-Control','private, no-store');res.json({success:true,buyer:{id:partyId,name:party!.name},trust});
}));
router.get('/farmer-home', run(async (req,res)=>{
  const party=await prisma.party.findUnique({where:{id:req.user?.partyId||''},select:{id:true,name:true,district:true,village:true,roles:true,fpoId:true,listings:{where:{resourceType:'CROP_LOT'},orderBy:{createdAt:'desc'},take:5,select:{id:true,attributes:true,price:true,status:true,offers:{where:{status:{in:['PENDING','COUNTERED']}},select:{id:true,price:true,status:true}}}}}});
  check(party?.roles.includes('FARMER'),403,'Farmer workspace required.');
  res.setHeader('Cache-Control','private, no-store');res.json({success:true,party});
}));
// Lightweight identity: farmer home and guided forms do not need the whole market.
router.get('/me', run(async (req, res) => {
  const party = await prisma.party.findUnique({ where: { id: req.user?.partyId || '' }, select: { id: true, name: true, district: true, village: true, roles: true, fpoId: true } });
  check(party, 401, 'Please sign in again.');
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ success: true, party });
}));
router.get('/sell-options/:listingId',run(async(req,res)=>{
  const listing=await prisma.listing.findUnique({where:{id:String(req.params.listingId)},include:{party:{select:publicParty}}});
  check(listing?.partyId===req.user?.partyId,403,'Only the lot owner can compare this sale.');
  check(listing?.resourceType==='CROP_LOT',400,'A crop lot is required.');
  const attributes=listing!.attributes as any;
  const candidates=await prisma.requirement.findMany({where:{resourceType:'CROP_LOT',partyId:{not:listing!.partyId},party:{roles:{has:'BUYER'},OR:[{credibility:null},{credibility:{suspended:false}}]},offers:{none:{status:'ACCEPTED'}}},include:{party:{select:{...publicParty,verifications:{where:{role:'BUYER',status:'APPROVED',OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},select:{id:true,documentType:true}}}}},orderBy:{createdAt:'desc'},take:200});
  const options=candidates.filter(r=>{const a=r.attributes as any;return Number(r.budget)>0&&Number(r.quantityNeeded)>0&&(!r.deadline||r.deadline>new Date())&&(!attributes.isPooled||Number(r.quantityNeeded)===Number(attributes.quantityKg))&&String(a.crop).trim().toLowerCase()===String(attributes.crop).trim().toLowerCase()&&(!a.qualityGrade||a.qualityGrade===attributes.qualityGrade);}).map(r=>({id:r.id,buyer:{id:r.party.id,name:r.party.name,district:r.party.district},quantityKg:r.quantityNeeded,budgetPerKg:r.budget,qualityGrade:(r.attributes as any).qualityGrade,verified:r.party.verifications.length>0,credibility:r.party.credibility,createdAt:r.createdAt,requiresPooling:Number(r.quantityNeeded)>Number(attributes.quantityKg),sameDistrict:r.party.district===listing!.district}));
  res.setHeader('Cache-Control','private, no-store');res.json({success:true,listing,options,coverage:'Latest 200 open crop requirements; budgets are indicative, not binding offers.'});
}));
router.get('/snapshot', run(async (req, res) => {
  const started = Date.now();
  const p = await actor(req);
  const district = isState(p) ? undefined : p.district;
  const admin = isAdmin(p);
  const section = z.enum(['all','overview','market','create','offers','verification','disputes','analytics','members']).parse(req.query.section || 'all');
  const needs = (...sections: string[]) => section === 'all' || sections.includes(section);
  const [listings, requirements, offers, verifications, disputes, logs, stats, members] = await Promise.all([
    needs('overview','market','members') ? prisma.listing.findMany({ where: section==='overview'&&!admin ? { partyId:p.id } : undefined, include: { party: { select: publicParty } }, orderBy: { createdAt: 'desc' }, take: 300 }) : [],
    needs('overview','market') ? prisma.requirement.findMany({ where: section==='overview' ? {partyId:p.id} : undefined, include: { party: { select: publicParty }, _count: { select: { offers: { where: { status: 'ACCEPTED' } } } } }, orderBy: { createdAt: 'desc' }, take: 200 }) : [],
    needs('overview','offers') ? prisma.offer.findMany({ where: admin ? { listing: { district } } : { OR: [{ listing: { partyId: p.id } }, { requirement: { partyId: p.id } }] }, include: offerInclude, orderBy: { createdAt: 'desc' }, take: 200 }) : [],
    needs('overview','verification') ? prisma.verification.findMany({ where: admin ? { party: { district } } : { partyId: p.id }, include: { party: { select: publicParty }, auditLogs: true }, orderBy: { createdAt: 'desc' }, take: 200 }) : [],
    needs('disputes') || (admin&&needs('overview')) ? prisma.dispute.findMany({ where: admin ? { booking: { offer: { listing: { district } } } } : { OR: [{ raisedByPartyId: p.id }, { respondentPartyId: p.id }] }, include: { auditLogs: true, booking: { include: { offer: { include: { listing: true } } } } }, orderBy: { createdAt: 'desc' }, take: 200 }) : [],
    admin && needs('analytics') ? prisma.portalSyncLog.findMany({ orderBy: { syncedAt: 'desc' }, take: 30 }) : [],
    admin && needs('analytics') ? prisma.districtDailyStats.findMany({ where: { district }, orderBy: { date: 'desc' }, take: 100 }) : [],
    p.roles.includes('FPO_ADMIN') && needs('overview','members') ? prisma.party.findMany({ where: p.fpoId ? { fpoId: p.fpoId } : { id: p.id }, select: publicParty }) : [],
  ]);
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Server-Timing',`workspace;dur=${Date.now()-started}`);
  res.json({ success: true, party: p, listings, requirements, offers, verifications, disputes, logs, stats, members, documents, serverTime: new Date() });
}));

const resourceInput = z.object({ clientRequestId:z.string().uuid().optional(), resourceType: z.nativeEnum(ResourceType), district: z.string().min(2).max(100), price: z.number().positive().finite(), priceUnit: z.enum(['per_kg','per_quintal','per_day','per_trip','flat']), quantityNeeded: z.number().positive().finite().optional(), attributes: z.record(z.unknown()), availableFrom: z.string().datetime().optional(), availableTo: z.string().datetime().optional() });
async function saveResourceOnce(kind: 'listing'|'requirement', partyId:string, input:z.infer<typeof resourceInput>, attributes:Record<string,unknown>) {
  const digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const hash = input.clientRequestId ? createHash('sha256').update(`${partyId}:${kind}:${input.clientRequestId}`).digest('hex') : null;
  const id = hash ? `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}` : undefined;
  const savedAttributes = input.clientRequestId ? {...attributes, submissionDigest:digest} : attributes;
  try {
    if(kind==='listing') return await prisma.listing.create({data:{id,partyId,resourceType:input.resourceType,district:input.district,price:input.price,priceUnit:input.priceUnit,attributes:savedAttributes as Prisma.InputJsonValue,availableFrom:input.availableFrom,availableTo:input.availableTo}});
    return await prisma.requirement.create({data:{id,partyId,resourceType:input.resourceType,district:input.district,budget:input.price,quantityNeeded:input.quantityNeeded||1,attributes:savedAttributes as Prisma.InputJsonValue}});
  } catch(error:any) {
    if(error.code!=='P2002'||!id) throw error;
    const existing = kind==='listing' ? await prisma.listing.findUnique({where:{id}}) : await prisma.requirement.findUnique({where:{id}});
    check(existing?.partyId===partyId && (existing.attributes as any).submissionDigest===digest,409,'This submission was already used for different details. Review the saved item before creating another.');
    return existing;
  }
}
router.post('/resources/:kind', run(async (req, res) => {
  const p = await actor(req); const input = resourceInput.parse(req.body);
  check(!['isPooled','pooledFromListingIds','participatingFarmerCount','submissionDigest','splitFromListingId'].some(key=>key in input.attributes),400,'Pooling and submission metadata are managed by the server.');
  if(input.resourceType==='CROP_LOT'){
    check(['per_kg','per_quintal'].includes(input.priceUnit),400,'Crop prices must be per kg or per quintal; crop quantities are always kg.');
    if(input.priceUnit==='per_quintal')input.price=input.price/100;
    input.priceUnit='per_kg';
  }
  check(!p.credibility?.suspended, 403, 'Account suspended. Contact your district administrator.');
  check(['listing', 'requirement'].includes(req.params.kind as string), 400, 'Unknown resource kind');
  const attributes = validateAttributes(input.resourceType, input.attributes);
  if (input.availableFrom && input.availableTo) check(new Date(input.availableTo) >= new Date(input.availableFrom), 400, 'Availability end must follow start');
  if (req.params.kind === 'listing') {
    const allowed = resourceRoles[input.resourceType];
    check(p.roles.some(r => allowed.includes(r)), 403, 'This resource requires the corresponding seller role.');
    const needsLicense = ['COLD_STORAGE','TRANSPORT','EQUIPMENT_SERVICE','LABOR','INPUT_GROUP_BUY'].includes(input.resourceType);
    if (needsLicense) check(p.verifications.some(v => allowed.includes(v.role) && v.status === 'APPROVED' && (!v.expiresAt || v.expiresAt > new Date())), 403, 'An approved, unexpired role verification is required before publishing.');
    const listing = await saveResourceOnce('listing',p.id,input,attributes);
    res.status(201).json({ success: true, listing });
  } else {
    check(!isAdmin(p), 403, 'Use a marketplace account to post demand.');
    const requirement = await saveResourceOnce('requirement',p.id,input,attributes);
    res.status(201).json({ success: true, requirement });
  }
}));
router.post('/offers', run(async (req, res) => {
  const p = await actor(req);
  const input = z.object({ clientRequestId:z.string().uuid().optional(),listingId: z.string().uuid(), requirementId: z.string().uuid().optional(), price: z.number().positive().finite(), quantity: z.number().positive().finite() }).parse(req.body);
  const requestHash=input.clientRequestId?createHash('sha256').update(`offer:${p.id}:${input.clientRequestId}`).digest('hex'):null;
  const offerId=requestHash?`${requestHash.slice(0,8)}-${requestHash.slice(8,12)}-5${requestHash.slice(13,16)}-a${requestHash.slice(17,20)}-${requestHash.slice(20,32)}`:undefined;
  check(!p.credibility?.suspended && !isAdmin(p), 403, 'Marketplace account required.');
  const offer = await serial(async tx => {
    if(offerId){
      const previous=await tx.offer.findUnique({where:{id:offerId},include:offerInclude});
      if(previous){check(previous.listingId===input.listingId&&(!input.requirementId||previous.requirementId===input.requirementId)&&previous.price===input.price&&previous.requirement?.quantityNeeded===input.quantity,409,'The previous request has different or negotiated terms. Check your offers before sending another request.');return previous;}
    }
    const listing = await tx.listing.findUnique({ where: { id: input.listingId },include:{party:{select:{credibility:true}}} });
    check(listing && listing.status === 'OPEN', 409, 'This listing is no longer available');
    check(!listing!.party.credibility?.suspended,403,'This supplier is suspended from new trading.');
  const l = listing!;
    check(!l.availableTo||l.availableTo>new Date(),409,'This listing availability has expired.');
    const capacity = Number((l.attributes as any).quantityKg || (l.attributes as any).capacityQuintal || (l.attributes as any).capacityKg || Infinity);
    check(input.quantity <= capacity, 400, 'Requested quantity exceeds available capacity');
    if(l.resourceType==='CROP_LOT'&&(l.attributes as any).isPooled)check(input.quantity===capacity,400,'Pooled lots must be requested in full until member-level partial allocation is available.');
    let requirementId = input.requirementId;
    if (requirementId) {
      const r = await tx.requirement.findUnique({ where: { id: requirementId },include:{party:{select:{credibility:true}}} });
      check(r && r.resourceType === l.resourceType && (r.partyId === p.id || l.partyId === p.id) && r.partyId !== l.partyId, 403, 'Requirement and listing must belong to opposite parties.');
      check(!r!.party.credibility?.suspended,403,'This buyer is suspended from new trading.');
      check(!r!.deadline||r!.deadline>new Date(),409,'The buyer requirement has expired.');
      if(l.resourceType==='CROP_LOT'){
        const wanted=r!.attributes as any,available=l.attributes as any;
        check(String(wanted.crop).trim().toLowerCase()===String(available.crop).trim().toLowerCase()&&(!wanted.qualityGrade||wanted.qualityGrade===available.qualityGrade),400,'Crop and quality grade must match the buyer requirement.');
      }
      check(!r!.quantityNeeded || input.quantity === r!.quantityNeeded, 400, 'Offer must match the published requirement quantity');
      check(!await tx.offer.findFirst({ where: { requirementId, status: 'ACCEPTED' } }), 409, 'This requirement has already been fulfilled');
    } else {
      check(l.partyId !== p.id, 400, 'You cannot send an offer to yourself');
      const r = await tx.requirement.create({ data: { partyId: p.id, resourceType: l.resourceType, district: p.district, quantityNeeded: input.quantity, budget: input.price, attributes: l.attributes as Prisma.InputJsonValue } });
      requirementId = r.id;
    }
    const created=await tx.offer.create({ data: { id:offerId,listingId: l.id, requirementId, price: input.price, status: l.partyId === p.id ? 'COUNTERED' : 'PENDING' }, include: offerInclude });
    await tradeEvent(tx,p.id,created,'NEW_OFFER');return created;
  });
  res.status(201).json({ success: true, offer });
}));
router.patch('/offers/:id', run(async (req, res) => {
  const p = await actor(req); const input = z.object({ action: z.enum(['ACCEPT','REJECT','COUNTER']), price: z.number().positive().finite().optional(),recommendationId:z.string().uuid().optional() }).parse(req.body);
  const offer = await serial(async tx => {
    const o = await tx.offer.findUnique({ where: { id: String(req.params.id) }, include: offerInclude });
    check(o && (o.listing.partyId === p.id || o.requirement?.partyId === p.id), 403, 'You are not a party to this offer');
    const current = o!;
    if (current.status === 'ACCEPTED' && input.action === 'ACCEPT') return current;
    if(input.action!=='REJECT')check(!current.listing.party.credibility?.suspended&&!current.requirement?.party.credibility?.suspended,403,'A suspended party cannot enter a new agreement. Existing obligations and grievances remain accessible.');
    check(['PENDING','COUNTERED'].includes(current.status), 409, 'Offer is already closed');
    check(current.listing.status === 'OPEN', 409, 'Listing is already booked or pooled');
    if(input.action!=='REJECT'){
      check(!current.listing.availableTo||current.listing.availableTo>new Date(),409,'This listing availability has expired.');
      check(!current.requirement?.deadline||current.requirement.deadline>new Date(),409,'The buyer requirement has expired.');
    }
    const seller = current.listing.partyId === p.id;
    if (input.action === 'COUNTER') {
      check(seller && current.status === 'PENDING' && input.price, 403, 'Only the seller can counter a pending offer');
      const countered=await tx.offer.update({ where: { id: current.id }, data: { status: 'COUNTERED', price: input.price }, include: offerInclude });
      await tradeEvent(tx,p.id,countered,'COUNTER');return countered;
    }
    if (input.action === 'ACCEPT') {
      const decision=await decisionsForAcceptance(tx,current,input.recommendationId);
      check((seller && current.status === 'PENDING') || (!seller && current.status === 'COUNTERED'), 403, 'The receiving party must accept this offer');
      if (current.requirementId) check(!await tx.offer.findFirst({ where: { requirementId: current.requirementId, status: 'ACCEPTED' } }), 409, 'This requirement has already been fulfilled');
      const qty = current.requirement?.quantityNeeded || 1;
      check(current.requirement?.partyId,409,'The agreement requires a known buyer.');
      if(current.listing.resourceType==='CROP_LOT'){
        const attrs=current.listing.attributes as Record<string,any>,available=Number(attrs.quantityKg);
        check(qty<=available,409,'The lot no longer has enough quantity.');
        check(!attrs.isPooled||qty===available,409,'Pooled lots must be sold in full until member-level partial allocation is available.');
        if(qty<available){
          const {submissionDigest,...remainingAttrs}=attrs;
          await tx.listing.create({data:{partyId:current.listing.partyId,resourceType:'CROP_LOT',district:current.listing.district,price:current.listing.price,priceUnit:current.listing.priceUnit,attributes:{...remainingAttrs,quantityKg:available-qty,splitFromListingId:current.listing.id}}});
          await tx.listing.update({where:{id:current.listing.id},data:{attributes:{...attrs,quantityKg:qty}}});
        }
      }
      const totalPaise=Math.round(current.price*qty*100);check(Number.isSafeInteger(totalPaise),400,'Trade value exceeds supported limits.');
      const agreementSnapshot={version:1,acceptedAt:new Date().toISOString(),acceptedBy:p.id,offerId:current.id,listingId:current.listingId,quantity:qty,pricePerUnit:current.price,unit:current.listing.priceUnit||'flat',resourceType:current.listing.resourceType,resource:current.listing.attributes as Prisma.JsonObject,seller:{id:current.listing.partyId,name:current.listing.party.name},buyer:{id:current.requirement!.partyId,name:current.requirement!.party.name},totalAmountPaise:totalPaise,paymentMode:'SIMULATED',deliveryTerms:'Not agreed at acceptance'};
      const createdBooking=await tx.booking.create({ data: { offerId: current.id, totalAmount: totalPaise/100,agreementSnapshot,paymentDueAt:decision.quote?.paymentDueAt,deliveryDueAt:decision.quote?.endAt } });
      await linkDecisions(tx,createdBooking,decision);
      await tx.listing.update({ where: { id: current.listingId }, data: { status: 'BOOKED' } });
      await tx.offer.updateMany({ where: { OR: [{ listingId: current.listingId }, ...(current.requirementId ? [{ requirementId: current.requirementId }] : [])], id: { not: current.id }, status: { in: ['PENDING','COUNTERED'] } }, data: { status: 'REJECTED' } });
    }
    const changed=await tx.offer.update({ where: { id: current.id }, data: { status: input.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' }, include: offerInclude });
    await tradeEvent(tx,p.id,changed,input.action);return changed;
  });
  res.json({ success: true, offer });
}));
router.post('/bookings/:id/action', run(async (req, res) => {
  const p = await actor(req); const { action,reason } = z.object({ action: z.enum(['FUND','START','COMPLETE','RELEASE','CANCEL']),reason:z.string().trim().min(5).max(1000).optional() }).parse(req.body);
  const booking = await serial(async tx => {
    const b = await tx.booking.findUnique({ where: { id: String(req.params.id) }, include: { offer: { include: { listing: true, requirement: true } }, dispute: true } });
    check(b, 404, 'Booking not found'); const current = b!;
    const seller = current.offer.listing.partyId === p.id, buyer = current.offer.requirement?.partyId === p.id;
    check(seller || buyer, 403, 'Booking access denied');
    check(!current.dispute || ['RESOLVED','REJECTED'].includes(current.dispute.status), 409, 'Resolve the active dispute first');
    check(current.fulfillmentStatus!=='CANCELLED',409,'This booking is cancelled.');
    let data: Prisma.BookingUpdateInput = {};
    if(action==='CANCEL'){
      check(current.paymentStatus==='PENDING'&&current.fulfillmentStatus==='PENDING',409,'Only an unfunded, unstarted booking can be cancelled. Raise a dispute for an active trade.');
      check(reason,400,'Give a cancellation reason.');data={fulfillmentStatus:'CANCELLED',cancelledAt:new Date(),cancelledById:p.id,cancellationReason:reason};
      await tx.offer.update({where:{id:current.offerId},data:{status:'REJECTED'}});
      await tx.listing.update({where:{id:current.offer.listingId},data:{status:'OPEN'}});
    }
    if (action === 'FUND') { check(buyer && current.paymentStatus === 'PENDING', 409, 'Only the buyer can fund a pending booking'); data.paymentStatus = 'ESCROWED'; }
    if (action === 'START') { check(seller && current.paymentStatus === 'ESCROWED' && current.fulfillmentStatus === 'PENDING', 409, 'Fund escrow before starting fulfillment'); data.fulfillmentStatus = 'IN_PROGRESS'; }
    if (action === 'COMPLETE') { check(seller && current.fulfillmentStatus === 'IN_PROGRESS', 409, 'Start fulfillment before completing'); data.fulfillmentStatus = 'COMPLETED'; await tx.listing.update({ where: { id: current.offer.listingId }, data: { status: 'COMPLETED' } }); }
    if (action === 'RELEASE') { check(buyer && current.paymentStatus === 'ESCROWED' && current.fulfillmentStatus === 'COMPLETED', 409, 'Buyer can release only after fulfillment'); data.paymentStatus = 'RELEASED'; }
    const updated = await tx.booking.update({ where: { id: current.id }, data });
    if(['CANCEL','COMPLETE'].includes(action))await releaseDecisionCapacity(tx,current.id);
    await tradeEvent(tx,p.id,{...current.offer,status:action==='CANCEL'?'REJECTED':current.offer.status,booking:updated},action);
    if (['FUND','RELEASE'].includes(action)) await tx.portalSyncLog.create({ data: { portal: 'PAYMENT_GW', tier: 3, status: 'STUBBED', message: `Simulated ${action} for booking ${current.id}; no money moved.` } });
    return tx.booking.findUnique({where:{id:updated.id},include:{events:{orderBy:{createdAt:'desc'},take:20}}});
  }); res.json({ success: true, booking });
}));
router.post('/bookings/:id/rating', run(async (req, res) => {
  const p = await actor(req); const input = z.object({ score: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() }).parse(req.body);
  const rating = await serial(async tx => {
    const b = await tx.booking.findUnique({ where: { id: String(req.params.id) }, include: { offer: { include: { listing: true, requirement: true } }, ratings: true } });
    check(b && b.fulfillmentStatus === 'COMPLETED', 409, 'Complete the booking before rating');
    const parties = [b!.offer.listing.partyId, b!.offer.requirement?.partyId];
    check(parties.includes(p.id), 403, 'Booking access denied');
    check(!b!.ratings.some(r => r.giverPartyId === p.id), 409, 'You have already rated this booking');
    return tx.rating.create({ data: { bookingId: b!.id, giverPartyId: p.id, receiverPartyId: parties.find(id => id && id !== p.id)!, ...input } });
  }); res.status(201).json({ success: true, rating });
}));
router.post('/bookings/:id/dispute', run(async (req, res) => {
  const p = await actor(req); const input = z.object({ category: z.enum(['PAYMENT','QUALITY','LOGISTICS','STORAGE_DAMAGE','SERVICE_NOT_RENDERED','OTHER']), reason: z.string().min(10).max(3000), evidenceUrls: z.array(publicUrl).max(5).default([]) }).parse(req.body);
  const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) }, include: { offer: { include: { listing: true, requirement: true } }, dispute: true } });
  check(b, 404, 'Booking not found'); const ids = [b!.offer.listing.partyId, b!.offer.requirement?.partyId];
  check(ids.includes(p.id), 403, 'Booking access denied'); check(!b!.dispute, 409, 'A dispute already exists');
  const dispute = await serial(async tx=>{
    const created=await tx.dispute.create({ data: { bookingId: b!.id, raisedByPartyId: p.id, respondentPartyId: ids.find(id => id && id !== p.id)!, ...input, slaDeadline: new Date(Date.now() + 72 * 3600000), auditLogs: { create: { actorId: p.id, fromStatus: 'NONE', toStatus: 'OPEN', note: input.reason } } } });
    await tx.bookingEvent.create({data:{bookingId:b!.id,actorId:p.id,kind:'DISPUTE_OPENED',snapshot:{disputeId:created.id,category:input.category}}});
    await notifyParties(tx,ids,`dispute:${created.id}:OPEN`,'DISPUTE',{reference:created.id,status:'OPEN'});return created;
  });
  res.status(201).json({ success: true, dispute });
}));
router.post('/verification-upload', raw({type:['image/png','image/jpeg','application/pdf'],limit:MAX_DOCUMENT_BYTES}), run(async(req,res)=>{
  const p=await actor(req);
  let documentRef='';try{documentRef=decodeURIComponent(req.get('x-document-ref')||'');}catch{throw new Failure(400,'Invalid document reference.');}
  const input=z.object({role:z.nativeEnum(PartyRole),documentType:z.string(),documentRef:z.string().trim().min(3).max(200),clientRequestId:z.string().uuid()}).parse({role:req.get('x-verification-role'),documentType:req.get('x-document-type'),documentRef,clientRequestId:req.get('x-request-id')});
  check(p.roles.includes(input.role)&&documents[input.role]?.includes(input.documentType),400,'Select a valid document for your role');
  const mime=(req.get('content-type')||'').split(';')[0], extension=documentExtension(req.body,mime);
  check(extension,400,'Choose a PNG, JPEG or PDF document up to 2 MB.');
  const digest=createHash('sha256').update(`${p.id}:verification:${input.clientRequestId}`).digest('hex');
  const id=`${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`;
  const path=`${p.id}/${id}-${createHash('sha256').update(req.body).digest('hex')}.${extension}`;
  const documentUrl=`storage://${DOCUMENT_BUCKET}/${path}`;
  const existing=await prisma.verification.findUnique({where:{id}});
  if(existing){check(existing.partyId===p.id&&existing.role===input.role&&existing.documentType===input.documentType&&existing.documentRef===input.documentRef&&existing.documentUrl===documentUrl,409,'This upload request already has different content.');res.status(201).json({success:true,verification:existing});return;}
  check(!p.verifications.some(v=>v.role===input.role&&v.documentType===input.documentType&&['PENDING','ESCALATED'].includes(v.status)),409,'This document is already awaiting review');
  await uploadDocument(path,req.body,mime);
  const verification=await serial(async tx=>{
    const repeated=await tx.verification.findUnique({where:{id}});if(repeated){check(repeated.documentUrl===documentUrl&&repeated.documentRef===input.documentRef&&repeated.role===input.role&&repeated.documentType===input.documentType,409,'This upload request already has different content.');return repeated;}
    const pending=await tx.verification.count({where:{partyId:p.id,role:input.role,documentType:input.documentType,status:{in:['PENDING','ESCALATED']}}});check(!pending,409,'This document is already awaiting review');
    const created=await tx.verification.create({data:{id,partyId:p.id,role:input.role,documentType:input.documentType,documentRef:input.documentRef,documentUrl,slaDeadline:new Date(Date.now()+72*3600000),auditLogs:{create:{actorId:p.id,fromStatus:'NONE',toStatus:'PENDING',note:'Private document uploaded by account holder'}}}});
    await notifyParties(tx,[p.id],`verification:${id}:PENDING`,'VERIFICATION',{reference:id,status:'PENDING'});return created;
  });
  res.status(201).json({success:true,verification});
}));
router.get('/verification/:id/document',run(async(req,res)=>{
  const p=await actor(req),v=await prisma.verification.findUnique({where:{id:z.string().uuid().parse(req.params.id)},include:{party:{select:{district:true}}}});
  check(v&&(v.partyId===p.id||isState(p)||(isAdmin(p)&&v.party.district===p.district)),404,'Document not found.');
  const path=storageObjectPath(v!.documentUrl||'',v!.partyId);check(path,404,'Private document not found.');
  const {buffer,mime}=await downloadDocument(path!);
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type',mime);res.setHeader('Content-Disposition',`attachment; filename="document-${v!.id}.${path!.split('.').pop()}"`);res.setHeader('X-Content-Type-Options','nosniff');res.send(buffer);
}));
router.post('/verification', run(async (req, res) => {
  const p = await actor(req); const input = z.object({ role: z.nativeEnum(PartyRole), documentType: z.string(), documentRef: z.string().min(3).max(200), documentUrl: publicUrl.optional() }).parse(req.body);
  check(p.roles.includes(input.role) && documents[input.role]?.includes(input.documentType), 400, 'Select a valid document for your role');
  check(!p.verifications.some(v => v.role === input.role && v.documentType === input.documentType && ['PENDING','ESCALATED'].includes(v.status)), 409, 'This document is already awaiting review');
  const verification = await serial(async tx=>{
    const created=await tx.verification.create({ data: { partyId: p.id, ...input, slaDeadline: new Date(Date.now()+72*3600000), auditLogs: { create: { actorId: p.id, fromStatus: 'NONE', toStatus: 'PENDING', note: 'Document submitted by account holder' } } } });
    await notifyParties(tx,[p.id],`verification:${created.id}:PENDING`,'VERIFICATION',{reference:created.id,status:'PENDING'});return created;
  });
  res.status(201).json({ success: true, verification });
}));
router.post('/review/:kind/:id', run(async (req, res) => {
  const p = await actor(req); check(isAdmin(p), 403, 'Administrator role required');
  const input = z.object({ action: z.enum(['APPROVE','REJECT','RESOLVE','ESCALATE','REQUEST_MORE_INFO']), note: z.string().min(5).max(2000), atFaultPartyId: z.string().uuid().optional() }).parse(req.body);
  const result = await serial(async tx => {
    const id = String(req.params.id);
    if (req.params.kind === 'verification') {
      check(['APPROVE','REJECT','ESCALATE','REQUEST_MORE_INFO'].includes(input.action), 400, 'Invalid verification action');
      const v = await tx.verification.findUnique({ where: { id }, include: { party: true } });
      check(v && (isState(p) || v.party.district === p.district), 403, 'Outside your administrative scope');
      check(['PENDING','ESCALATED'].includes(v!.status), 409, 'This review has already been closed');
      check(v!.status !== 'ESCALATED' || isState(p), 403, 'Escalated cases require state review');
      const status = ({ APPROVE: 'APPROVED', REJECT: 'REJECTED', ESCALATE: 'ESCALATED', REQUEST_MORE_INFO: 'PENDING' } as const)[input.action as 'APPROVE'];
      const updated=await tx.verification.update({ where: { id }, data: { status, reviewedBy: p.id, reviewedAt: new Date(), rejectionReason: input.note, auditLogs: { create: { actorId: p.id, fromStatus: v!.status, toStatus: status, note: input.note } } } });
      await notifyParties(tx,[v!.partyId],`verification:${id}:${updated.reviewedAt!.toISOString()}`,'VERIFICATION',{reference:id,status});return updated;
    }
    check(req.params.kind === 'dispute' && input.action !== 'APPROVE', 400, 'Invalid dispute action');
    const d = await tx.dispute.findUnique({ where: { id }, include: { booking: { include: { offer: { include: { listing: true } } } } } });
    check(d && (isState(p) || d.booking.offer.listing.district === p.district), 403, 'Outside your administrative scope');
    check(!['RESOLVED','REJECTED'].includes(d!.status), 409, 'This dispute is already closed');
    check(!['ESCALATED','UNDER_STATE_REVIEW'].includes(d!.status) || isState(p), 403, 'Escalated cases require state review');
    const status = ({ RESOLVE: 'RESOLVED', REJECT: 'REJECTED', ESCALATE: 'ESCALATED', REQUEST_MORE_INFO: isState(p) ? 'UNDER_STATE_REVIEW' : 'UNDER_DISTRICT_REVIEW' } as const)[input.action as 'RESOLVE'];
    if (input.action === 'RESOLVE' && input.atFaultPartyId) {
      check([d!.raisedByPartyId,d!.respondentPartyId].includes(input.atFaultPartyId), 400, 'At-fault account must be a dispute participant');
      const score = await tx.credibilityScore.findUnique({ where: { partyId: input.atFaultPartyId } });
      const count = (score?.disputeCount || 0) + 1;
      const data = { score: Math.max(0,(score?.score ?? 50)-10), disputeCount: count, suspended: count >= 3 };
      await tx.credibilityScore.upsert({ where: { partyId: input.atFaultPartyId }, create: { partyId: input.atFaultPartyId, ...data }, update: data });
    }
    const updated=await tx.dispute.update({ where: { id }, data: { status, resolutionNote: input.note, resolvedAt: ['RESOLVED','REJECTED'].includes(status) ? new Date() : null, ...(isState(p) ? { stateAdminId: p.id } : { districtAdminId: p.id }), auditLogs: { create: { actorId: p.id, fromStatus: d!.status, toStatus: status, note: input.note } } } });
    await notifyParties(tx,[d!.raisedByPartyId,d!.respondentPartyId],`dispute:${id}:${status}`,'DISPUTE',{reference:id,status});return updated;
  }); res.json({ success: true, result });
}));
router.post('/pool', run(async (req, res) => {
  const p = await actor(req); check(p.roles.includes('FPO_ADMIN') && p.fpoId, 403, 'An FPO membership is required');
  const { listingIds } = z.object({ listingIds: z.array(z.string().uuid()).min(2).max(50) }).parse(req.body);
  check(new Set(listingIds).size === listingIds.length, 400, 'Duplicate lots selected');
  const listing = await serial(async tx => {
    const lots = await tx.listing.findMany({ where: { id: { in: listingIds }, party: { fpoId: p.fpoId }, status: 'OPEN', resourceType: 'CROP_LOT' } });
    check(lots.length === listingIds.length, 400, 'Only open crop lots owned by members of your FPO can be pooled');
    const first = lots[0].attributes as any;
    check(lots.every(l => { const a = l.attributes as any; return a.crop === first.crop && a.qualityGrade === first.qualityGrade; }), 400, 'Pool matching crop and quality grades only');
    const qty = lots.reduce((sum,l) => sum + Number((l.attributes as any).quantityKg),0);
    const price = lots.reduce((sum,l) => sum + (l.price || 0) * Number((l.attributes as any).quantityKg),0) / qty;
    const pooled = await tx.listing.create({ data: { partyId: p.id, resourceType: 'CROP_LOT', district: p.district, price, priceUnit: 'per_kg', attributes: { ...first, quantityKg: qty, isPooled: true, pooledFromListingIds: listingIds, participatingFarmerCount: new Set(lots.map(l => l.partyId)).size } } });
    await tx.listing.updateMany({ where: { id: { in: listingIds } }, data: { status: 'POOLED' } });
    return pooled;
  }); res.status(201).json({ success: true, listing });
}));
router.get('/matches/:id', run(async (req, res) => {
  const p = await actor(req);
  const requirement = await prisma.requirement.findUnique({ where: { id: String(req.params.id) } });
  check(requirement, 404, 'Requirement not found');
  const matches = (await matchingEngine.matchRequirement(requirement!)).filter(m => m.score > 0);
  res.json({ success: true, matches,coverage:'Latest 500 open, non-expired listings from non-suspended suppliers. Fit score is not a net-income recommendation.' });
}));
router.get('/fpos', run(async (_req, res) => {
  const fpos = await prisma.fpo.findMany({ select: { id: true, name: true, district: true } });
  res.json({ success: true, fpos });
}));
router.post('/membership', run(async (req, res) => {
  const p = await actor(req); check(p.roles.includes('FARMER'), 403, 'Farmer account required');
  const { fpoId } = z.object({ fpoId: z.string().uuid() }).parse(req.body);
  check(!p.fpoId || p.fpoId === fpoId, 409, 'You already belong to an FPO. Contact your administrator to transfer.');
  const fpo = await prisma.fpo.findUnique({ where: { id: fpoId } });
  check(fpo && fpo.district === p.district, 400, 'Choose an FPO in your district');
  await prisma.party.update({ where: { id: p.id }, data: { fpoId } });
  res.json({ success: true });
}));
router.patch('/bookings/:id/logistics', run(async (req, res) => {
  const p = await actor(req); const { note } = z.object({ note: z.string().min(3).max(2000) }).parse(req.body);
  const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) }, include: { offer: { include: { listing: true, requirement: true } } } });
  check(b && [b.offer.listing.partyId,b.offer.requirement?.partyId].includes(p.id), 403, 'Booking access denied');
  const booking=await serial(async tx=>{
    const current=await tx.booking.findUnique({where:{id:b!.id}});check(current?.fulfillmentStatus!=='CANCELLED',409,'Cancelled bookings cannot receive new delivery instructions.');
    if(current!.logisticsNote===note)return current;
    const updated=await tx.booking.update({where:{id:b!.id},data:{logisticsNote:note}});
    const event=await tx.bookingEvent.create({data:{bookingId:b!.id,actorId:p.id,kind:'LOGISTICS_UPDATED',snapshot:{note}}});
    await notifyParties(tx,[b!.offer.listing.partyId,b!.offer.requirement?.partyId],`logistics:${event.id}`,'TRADE',{reference:b!.offerId,status:b!.offer.status,event:'LOGISTICS_UPDATED'});return {...updated,events:await tx.bookingEvent.findMany({where:{bookingId:updated.id},orderBy:{createdAt:'desc'},take:20})};
  });
  res.json({ success: true, booking });
}));
router.post('/ads', run(async (req,res) => {
  const p = await actor(req); const input=z.object({title:z.string().min(5).max(120),description:z.string().min(10).max(1000),targetUrl:z.string().url().optional(),placement:z.enum(['BUYER_DASHBOARD','PROVIDER_DASHBOARD'])}).parse(req.body);
  check(!p.credibility?.suspended && p.verifications.some(v=>v.status==='APPROVED'&&(!v.expiresAt||v.expiresAt>new Date())),403,'Approved, unexpired seller verification required');
  const ad=await prisma.marketplaceAd.create({data:{partyId:p.id,...input}});res.status(201).json({success:true,ad});
}));
router.get('/ads',run(async(req,res)=>{
  const p=await actor(req);check(!p.roles.includes('FARMER'),403,'Ads are not served in farmer workflows');
  const ads=await prisma.marketplaceAd.findMany({where:{active:true,placement:p.roles.includes('BUYER')?'BUYER_DASHBOARD':'PROVIDER_DASHBOARD',party:{verifications:{some:{status:'APPROVED',OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}}}},select:{id:true,title:true,description:true,targetUrl:true,party:{select:{name:true}}},take:10,orderBy:{createdAt:'desc'}});
  res.json({success:true,ads});
}));
router.use((err: any, _req: any, res: Response, _next: NextFunction) => {
  const status = err instanceof Failure || err instanceof StorageFailure || err instanceof DecisionError ? err.status : err.type === 'entity.too.large' ? 413 : err instanceof z.ZodError ? 400 : err.code === 'P2002' ? 409 : 500;
  const error = err instanceof z.ZodError ? err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') : status === 500 ? 'The request could not be completed. Please retry.' : err.message;
  if (status === 500) console.error('Workspace request failed:', err.code || err.name, err.code === 'P2028' ? err.meta?.error : '');
  res.status(status).json({ success: false, error });
});
export default router;
