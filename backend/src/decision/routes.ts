import {Router,Response,NextFunction} from 'express';
import {z} from 'zod';
import {prisma} from '../config/prisma';
import {AuthenticatedRequest} from '../middleware/auth.middleware';
import {DecisionError,hash,jsonSafe,requireDecision} from './core';
import {quoteInclude,quoteSnapshot} from './evidence';
import {createQuote} from './quotes';
import {authorizedRecommendation,generateComparison,recommendationView,revalidateRecommendation,runView} from './service';
import {OUTCOME_COSTS,bookingAudience,bookingContext,recordOutcome,summarizeOutcomes} from './outcomes';
import {recomputeTrustBatch} from './trust';
const router=Router();
const run=(f:(req:AuthenticatedRequest,res:Response)=>Promise<void>)=>(req:AuthenticatedRequest,res:Response,next:NextFunction)=>f(req,res).catch(next);
export async function transaction<T>(fn:Parameters<typeof prisma.$transaction>[0]):Promise<T>{
 for(let attempt=0;;attempt++){try{return await prisma.$transaction(fn as any,{isolationLevel:'Serializable',maxWait:10000,timeout:60000}) as T;}catch(e:any){if(e.code!=='P2034'||attempt>=3)throw e;}}
}
export async function decisionActor(req:AuthenticatedRequest){const p=await prisma.party.findUnique({where:{id:req.user!.partyId},include:{credibility:true,verifications:true}});requireDecision(p,401,'Please sign in again.');return p;}
const quoteView=(q:any)=>jsonSafe({...quoteSnapshot(q),issuerName:q.issuer.name,lot:q.listing?{id:q.listing.id,attributes:q.listing.attributes,district:q.listing.district}:undefined});
router.use((_req,res,next)=>{res.setHeader('Cache-Control','private, no-store');next();});
router.get('/decision-lots',run(async(req,res)=>{
 const actor=await decisionActor(req);const listings=await prisma.listing.findMany({where:{resourceType:'CROP_LOT',status:{in:['OPEN','DRAFT']},...(actor.roles.includes('FARMER')?{partyId:actor.id}:{})},select:{id:true,partyId:true,district:true,attributes:true,price:true,status:true,party:{select:{name:true}}},orderBy:{createdAt:'desc'},take:100});
 const services=await prisma.listing.findMany({where:{partyId:actor.id,status:'OPEN',resourceType:{in:['TRANSPORT','COLD_STORAGE']}},take:50});res.json({success:true,listings,services});
}));
router.post('/decision-quotes',run(async(req,res)=>{const actor=await decisionActor(req),quote:any=await transaction(tx=>createQuote(tx,actor,req.body));res.status(201).json({success:true,quote:quoteView(quote)});}));
router.get('/decision-quotes',run(async(req,res)=>{const actor=await decisionActor(req);const quotes=await prisma.decisionQuote.findMany({where:{OR:[{issuerPartyId:actor.id},{listing:{partyId:actor.id}}]},include:quoteInclude,take:100,orderBy:{createdAt:'desc'}});res.json({success:true,quotes:quotes.map(quoteView)});}));
router.post('/decision-quotes/:id/revoke',run(async(req,res)=>{const actor=await decisionActor(req),id=z.string().uuid().parse(req.params.id);await transaction(async tx=>{const q=await tx.decisionQuote.findUnique({where:{id}});requireDecision(q?.issuerPartyId===actor.id,404,'Quote not found.');await tx.decisionQuote.update({where:{id},data:{status:'REVOKED'}});await tx.recommendation.updateMany({where:{quoteId:id,selection:{is:null}},data:{scenarioStatus:'INVALIDATED'}});});res.json({success:true});}));
router.get('/recommendations/options/:listingId',run(async(req,res)=>{
 const actor=await decisionActor(req),id=z.string().uuid().parse(req.params.listingId),lot=await prisma.listing.findUnique({where:{id},select:{id:true,partyId:true,district:true,status:true,attributes:true,availableFrom:true,availableTo:true}});requireDecision(lot?.partyId===actor.id,404,'Crop lot not found.');
 const quotes=await prisma.decisionQuote.findMany({where:{listingId:id},include:quoteInclude,take:90,orderBy:{createdAt:'desc'}});res.json({success:true,lot,quotes:quotes.map(quoteView)});
}));
router.post('/recommendations',run(async(req,res)=>{const actor=await decisionActor(req),result=await transaction(tx=>generateComparison(tx,actor,req.body));res.status(201).json(result);}));
router.get('/decision-runs/:id',run(async(req,res)=>{const runRecord=await prisma.decisionRun.findUnique({where:{id:z.string().uuid().parse(req.params.id)},include:{recommendations:{include:{selection:true}}}});requireDecision(runRecord?.farmerPartyId===req.user!.partyId,404,'Comparison not found.');res.json(runView(runRecord));}));
router.get('/recommendations',run(async(req,res)=>{const recommendations=await prisma.recommendation.findMany({where:{farmerPartyId:req.user!.partyId},include:{selection:true},orderBy:{createdAt:'desc'},take:30});res.json({success:true,recommendations:recommendations.map(recommendationView)});}));
router.get('/recommendations/:id',run(async(req,res)=>{const actor=await decisionActor(req),r=await authorizedRecommendation(prisma,z.string().uuid().parse(req.params.id),actor);res.json({success:true,recommendation:recommendationView(r)});}));
router.post('/recommendations/:id/share',run(async(req,res)=>{const actor=await decisionActor(req),r=await authorizedRecommendation(prisma,z.string().uuid().parse(req.params.id),actor),{share}=z.object({share:z.boolean()}).parse(req.body);requireDecision(r.farmerPartyId===actor.id&&(!share||actor.fpoId),403,'Only the farmer can share with their own FPO.');await prisma.recommendation.update({where:{id:r.id},data:{sharedFpoId:share?actor.fpoId:null}});res.json({success:true});}));
router.post('/recommendations/:id/choose',run(async(req,res)=>{
 const actor=await decisionActor(req),id=z.string().uuid().parse(req.params.id);
 const selection:any=await transaction(async tx=>{const r=await authorizedRecommendation(tx,id,actor);requireDecision(r.farmerPartyId===actor.id,403,'Only the farmer can choose this decision.');if(r.selection)return r.selection;
  requireDecision(!r.poolPlanId,409,'A pooled recommendation requires explicit member consent in the pool workflow.');await revalidateRecommendation(tx,r);
  const chosen=await tx.decisionSelection.create({data:{recommendationId:id,actorId:actor.id,evidenceHash:r.evidenceHash!}});console.log(JSON.stringify({event:'decision.selected'}));return chosen;});
 res.json({success:true,selection:jsonSafe(selection),message:'Choice recorded. No inventory reserved, offer accepted or money moved.'});
}));
router.get('/trust/:partyId',run(async(req,res)=>{const id=z.string().uuid().parse(req.params.partyId);const trusts=await recomputeTrustBatch(prisma,[id]);requireDecision(trusts.has(id),404,'Buyer not found.');const buyer=await prisma.party.findUnique({where:{id},select:{id:true,name:true}});res.json({success:true,buyer,trust:trusts.get(id)});}));
router.get('/bookings/:id/outcomes',run(async(req,res)=>{
 const actor=await decisionActor(req),b=await bookingContext(prisma,z.string().uuid().parse(req.params.id));requireDecision(bookingAudience(b,actor.id),404,'Booking not found.');
 const seller=b.offer.listing.partyId,payee=actor.id===b.offer.requirement?.partyId?seller:actor.id;
 const selection=b.decisionSelections.find(s=>s.recommendation.farmerPartyId===payee),expected=selection?Number(selection.recommendation.expectedNetPaise):null;
 const events=b.outcomeEvents.filter(e=>(e.payload as any).payeePartyId===payee);
 res.json({success:true,bookingId:b.id,payeePartyId:payee,payerPartyId:payee===seller?b.offer.requirement?.partyId:seller,events:jsonSafe(events),summary:summarizeOutcomes(events,payee,expected,b.fulfillmentStatus==='COMPLETED'),recommendation:selection?recommendationView(selection.recommendation):null});
}));
router.post('/bookings/:id/outcomes',run(async(req,res)=>{const actor=await decisionActor(req),id=z.string().uuid().parse(req.params.id),event=await transaction(tx=>recordOutcome(tx,id,actor.id,req.body));res.status(201).json({success:true,event:jsonSafe(event)});}));
router.post('/bookings/:id/outcome-costs',run(async(req,res)=>{
 const actor=await decisionActor(req),id=z.string().uuid().parse(req.params.id),input=z.object({clientRequestId:z.string().uuid(),occurredAt:z.string().datetime(),simulation:z.boolean(),evidenceRef:z.string().min(5).max(500),complete:z.literal(true),payeePartyId:z.string().uuid().optional(),costs:z.object({transport:z.number().int().nonnegative(),storage:z.number().int().nonnegative(),handling:z.number().int().nonnegative(),commission:z.number().int().nonnegative(),spoilage:z.number().int().nonnegative(),financing:z.number().int().nonnegative()})}).parse(req.body);
 const events=await transaction(async tx=>{const created:any[]=[];for(const [key,kind] of [...Object.entries(OUTCOME_COSTS),['complete','COSTS_COMPLETE']]){const h=hash({key,id:input.clientRequestId}),requestId=`${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;created.push(await recordOutcome(tx,id,actor.id,{kind,amountPaise:key==='complete'?undefined:input.costs[key as keyof typeof input.costs],occurredAt:input.occurredAt,simulation:input.simulation,evidenceRef:input.evidenceRef,idempotencyKey:requestId,payeePartyId:input.payeePartyId}));}return created;});res.status(201).json({success:true,events:jsonSafe(events)});
}));
router.use((e:any,_req:any,res:Response,next:NextFunction)=>{if(e instanceof DecisionError||e instanceof z.ZodError){res.status(e instanceof DecisionError?e.status:400).json({success:false,error:e.message});return;}next(e);});
export default router;
