import { Router, Response, NextFunction } from 'express';
import { PartyRole, ResourceType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { signToken } from '../utils/jwt';
import { validateAttributes } from '../schemas/resource-attributes.schema';
import { matchingEngine } from '../matching/matching-engine';

const router = Router();
class Failure extends Error { constructor(public status: number, message: string) { super(message); } }
const check = (condition: unknown, status: number, message: string) => { if (!condition) throw new Failure(status, message); };
const run = (handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => handler(req, res).catch(next);
const adminRoles = ['DISTRICT_ADMIN', 'STATE_ADMIN', 'PLATFORM_ADMIN'];
const isAdmin = (p: any) => p.roles.some((r: string) => adminRoles.includes(r));
const isState = (p: any) => p.roles.some((r: string) => ['STATE_ADMIN', 'PLATFORM_ADMIN'].includes(r));
const publicParty = { id: true, name: true, district: true, roles: true, credibility: true } as const;
const offerInclude = { listing: { include: { party: { select: publicParty } } }, requirement: { include: { party: { select: publicParty } } }, booking: { include: { dispute: true, ratings: true } } } as const;
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
router.get('/snapshot', run(async (req, res) => {
  const p = await actor(req);
  const district = isState(p) ? undefined : p.district;
  const admin = isAdmin(p);
  const [listings, requirements, offers, verifications, disputes, logs, stats, members] = await Promise.all([
    prisma.listing.findMany({ include: { party: { select: publicParty } }, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.requirement.findMany({ include: { party: { select: publicParty }, _count: { select: { offers: { where: { status: 'ACCEPTED' } } } } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.offer.findMany({ where: admin ? { listing: { district } } : { OR: [{ listing: { partyId: p.id } }, { requirement: { partyId: p.id } }] }, include: offerInclude, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.verification.findMany({ where: admin ? { party: { district } } : { partyId: p.id }, include: { party: { select: publicParty }, auditLogs: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.dispute.findMany({ where: admin ? { booking: { offer: { listing: { district } } } } : { OR: [{ raisedByPartyId: p.id }, { respondentPartyId: p.id }] }, include: { auditLogs: true, booking: { include: { offer: { include: { listing: true } } } } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    admin ? prisma.portalSyncLog.findMany({ orderBy: { syncedAt: 'desc' }, take: 30 }) : Promise.resolve([]),
    admin ? prisma.districtDailyStats.findMany({ where: { district }, orderBy: { date: 'desc' }, take: 100 }) : Promise.resolve([]),
    p.roles.includes('FPO_ADMIN') ? prisma.party.findMany({ where: p.fpoId ? { fpoId: p.fpoId } : { id: p.id }, select: publicParty }) : Promise.resolve([]),
  ]);
  res.json({ success: true, party: p, listings, requirements, offers, verifications, disputes, logs, stats, members, documents, serverTime: new Date() });
}));

const resourceInput = z.object({ resourceType: z.nativeEnum(ResourceType), district: z.string().min(2).max(100), price: z.number().positive().finite(), priceUnit: z.enum(['per_kg','per_quintal','per_day','per_trip','flat']), quantityNeeded: z.number().positive().finite().optional(), attributes: z.record(z.unknown()), availableFrom: z.string().datetime().optional(), availableTo: z.string().datetime().optional() });
router.post('/resources/:kind', run(async (req, res) => {
  const p = await actor(req); const input = resourceInput.parse(req.body);
  check(!p.credibility?.suspended, 403, 'Account suspended. Contact your district administrator.');
  check(['listing', 'requirement'].includes(req.params.kind as string), 400, 'Unknown resource kind');
  const attributes = validateAttributes(input.resourceType, input.attributes);
  if (input.availableFrom && input.availableTo) check(new Date(input.availableTo) >= new Date(input.availableFrom), 400, 'Availability end must follow start');
  if (req.params.kind === 'listing') {
    const allowed = resourceRoles[input.resourceType];
    check(p.roles.some(r => allowed.includes(r)), 403, 'This resource requires the corresponding seller role.');
    const needsLicense = ['COLD_STORAGE','TRANSPORT','EQUIPMENT_SERVICE','LABOR','INPUT_GROUP_BUY'].includes(input.resourceType);
    if (needsLicense) check(p.verifications.some(v => allowed.includes(v.role) && v.status === 'APPROVED' && (!v.expiresAt || v.expiresAt > new Date())), 403, 'An approved, unexpired role verification is required before publishing.');
    const listing = await prisma.listing.create({ data: { partyId: p.id, resourceType: input.resourceType, district: input.district, price: input.price, priceUnit: input.priceUnit, attributes, availableFrom: input.availableFrom, availableTo: input.availableTo } });
    res.status(201).json({ success: true, listing });
  } else {
    check(!isAdmin(p), 403, 'Use a marketplace account to post demand.');
    const requirement = await prisma.requirement.create({ data: { partyId: p.id, resourceType: input.resourceType, district: input.district, budget: input.price, quantityNeeded: input.quantityNeeded || 1, attributes } });
    res.status(201).json({ success: true, requirement });
  }
}));
router.post('/offers', run(async (req, res) => {
  const p = await actor(req);
  const input = z.object({ listingId: z.string().uuid(), requirementId: z.string().uuid().optional(), price: z.number().positive().finite(), quantity: z.number().positive().finite() }).parse(req.body);
  check(!p.credibility?.suspended && !isAdmin(p), 403, 'Marketplace account required.');
  const offer = await serial(async tx => {
    const listing = await tx.listing.findUnique({ where: { id: input.listingId } });
    check(listing && listing.status === 'OPEN', 409, 'This listing is no longer available');
    const l = listing!;
    const capacity = Number((l.attributes as any).quantityKg || (l.attributes as any).capacityQuintal || (l.attributes as any).capacityKg || Infinity);
    check(input.quantity <= capacity, 400, 'Requested quantity exceeds available capacity');
    let requirementId = input.requirementId;
    if (requirementId) {
      const r = await tx.requirement.findUnique({ where: { id: requirementId } });
      check(r && r.resourceType === l.resourceType && (r.partyId === p.id || l.partyId === p.id) && r.partyId !== l.partyId, 403, 'Requirement and listing must belong to opposite parties.');
      check(!r!.quantityNeeded || input.quantity === r!.quantityNeeded, 400, 'Offer must match the published requirement quantity');
      check(!await tx.offer.findFirst({ where: { requirementId, status: 'ACCEPTED' } }), 409, 'This requirement has already been fulfilled');
    } else {
      check(l.partyId !== p.id, 400, 'You cannot send an offer to yourself');
      const r = await tx.requirement.create({ data: { partyId: p.id, resourceType: l.resourceType, district: p.district, quantityNeeded: input.quantity, budget: input.price, attributes: l.attributes as Prisma.InputJsonValue } });
      requirementId = r.id;
    }
    return tx.offer.create({ data: { listingId: l.id, requirementId, price: input.price, status: l.partyId === p.id ? 'COUNTERED' : 'PENDING' }, include: offerInclude });
  });
  res.status(201).json({ success: true, offer });
}));
router.patch('/offers/:id', run(async (req, res) => {
  const p = await actor(req); const input = z.object({ action: z.enum(['ACCEPT','REJECT','COUNTER']), price: z.number().positive().finite().optional() }).parse(req.body);
  const offer = await serial(async tx => {
    const o = await tx.offer.findUnique({ where: { id: String(req.params.id) }, include: offerInclude });
    check(o && (o.listing.partyId === p.id || o.requirement?.partyId === p.id), 403, 'You are not a party to this offer');
    const current = o!;
    if (current.status === 'ACCEPTED' && input.action === 'ACCEPT') return current;
    check(['PENDING','COUNTERED'].includes(current.status), 409, 'Offer is already closed');
    check(current.listing.status === 'OPEN', 409, 'Listing is already booked or pooled');
    const seller = current.listing.partyId === p.id;
    if (input.action === 'COUNTER') {
      check(seller && current.status === 'PENDING' && input.price, 403, 'Only the seller can counter a pending offer');
      return tx.offer.update({ where: { id: current.id }, data: { status: 'COUNTERED', price: input.price }, include: offerInclude });
    }
    if (input.action === 'ACCEPT') {
      check((seller && current.status === 'PENDING') || (!seller && current.status === 'COUNTERED'), 403, 'The receiving party must accept this offer');
      if (current.requirementId) check(!await tx.offer.findFirst({ where: { requirementId: current.requirementId, status: 'ACCEPTED' } }), 409, 'This requirement has already been fulfilled');
      const qty = current.requirement?.quantityNeeded || 1;
      await tx.booking.create({ data: { offerId: current.id, totalAmount: Math.round(current.price * qty * 100) / 100, logisticsNote: 'Agreement available in the booking. Payment simulation only.' } });
      await tx.listing.update({ where: { id: current.listingId }, data: { status: 'BOOKED' } });
      await tx.offer.updateMany({ where: { OR: [{ listingId: current.listingId }, ...(current.requirementId ? [{ requirementId: current.requirementId }] : [])], id: { not: current.id }, status: { in: ['PENDING','COUNTERED'] } }, data: { status: 'REJECTED' } });
    }
    return tx.offer.update({ where: { id: current.id }, data: { status: input.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' }, include: offerInclude });
  });
  res.json({ success: true, offer });
}));
router.post('/bookings/:id/action', run(async (req, res) => {
  const p = await actor(req); const { action } = z.object({ action: z.enum(['FUND','START','COMPLETE','RELEASE']) }).parse(req.body);
  const booking = await serial(async tx => {
    const b = await tx.booking.findUnique({ where: { id: String(req.params.id) }, include: { offer: { include: { listing: true, requirement: true } }, dispute: true } });
    check(b, 404, 'Booking not found'); const current = b!;
    const seller = current.offer.listing.partyId === p.id, buyer = current.offer.requirement?.partyId === p.id;
    check(seller || buyer, 403, 'Booking access denied');
    check(!current.dispute || ['RESOLVED','REJECTED'].includes(current.dispute.status), 409, 'Resolve the active dispute first');
    let data: Prisma.BookingUpdateInput = {};
    if (action === 'FUND') { check(buyer && current.paymentStatus === 'PENDING', 409, 'Only the buyer can fund a pending booking'); data.paymentStatus = 'ESCROWED'; }
    if (action === 'START') { check(seller && current.paymentStatus === 'ESCROWED' && current.fulfillmentStatus === 'PENDING', 409, 'Fund escrow before starting fulfillment'); data.fulfillmentStatus = 'IN_PROGRESS'; }
    if (action === 'COMPLETE') { check(seller && current.fulfillmentStatus === 'IN_PROGRESS', 409, 'Start fulfillment before completing'); data.fulfillmentStatus = 'COMPLETED'; await tx.listing.update({ where: { id: current.offer.listingId }, data: { status: 'COMPLETED' } }); }
    if (action === 'RELEASE') { check(buyer && current.paymentStatus === 'ESCROWED' && current.fulfillmentStatus === 'COMPLETED', 409, 'Buyer can release only after fulfillment'); data.paymentStatus = 'RELEASED'; }
    const updated = await tx.booking.update({ where: { id: current.id }, data });
    if (['FUND','RELEASE'].includes(action)) await tx.portalSyncLog.create({ data: { portal: 'PAYMENT_GW', tier: 3, status: 'STUBBED', message: `Simulated ${action} for booking ${current.id}; no money moved.` } });
    return updated;
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
  const p = await actor(req); const input = z.object({ category: z.enum(['PAYMENT','QUALITY','LOGISTICS','STORAGE_DAMAGE','SERVICE_NOT_RENDERED','OTHER']), reason: z.string().min(10).max(3000), evidenceUrls: z.array(z.string().url()).max(5).default([]) }).parse(req.body);
  const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) }, include: { offer: { include: { listing: true, requirement: true } }, dispute: true } });
  check(b, 404, 'Booking not found'); const ids = [b!.offer.listing.partyId, b!.offer.requirement?.partyId];
  check(ids.includes(p.id), 403, 'Booking access denied'); check(!b!.dispute, 409, 'A dispute already exists');
  const dispute = await prisma.dispute.create({ data: { bookingId: b!.id, raisedByPartyId: p.id, respondentPartyId: ids.find(id => id && id !== p.id)!, ...input, slaDeadline: new Date(Date.now() + 72 * 3600000), auditLogs: { create: { actorId: p.id, fromStatus: 'NONE', toStatus: 'OPEN', note: input.reason } } } });
  res.status(201).json({ success: true, dispute });
}));
router.post('/verification', run(async (req, res) => {
  const p = await actor(req); const input = z.object({ role: z.nativeEnum(PartyRole), documentType: z.string(), documentRef: z.string().min(3).max(200), documentUrl: z.string().url().optional() }).parse(req.body);
  check(p.roles.includes(input.role) && documents[input.role]?.includes(input.documentType), 400, 'Select a valid document for your role');
  check(!p.verifications.some(v => v.role === input.role && v.documentType === input.documentType && ['PENDING','ESCALATED'].includes(v.status)), 409, 'This document is already awaiting review');
  const verification = await prisma.verification.create({ data: { partyId: p.id, ...input, slaDeadline: new Date(Date.now()+72*3600000), auditLogs: { create: { actorId: p.id, fromStatus: 'NONE', toStatus: 'PENDING', note: 'Document submitted by account holder' } } } });
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
      return tx.verification.update({ where: { id }, data: { status, reviewedBy: p.id, reviewedAt: new Date(), rejectionReason: input.note, auditLogs: { create: { actorId: p.id, fromStatus: v!.status, toStatus: status, note: input.note } } } });
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
      const data = { score: Math.max(0,(score?.score || 50)-10), disputeCount: count, suspended: count >= 3 };
      await tx.credibilityScore.upsert({ where: { partyId: input.atFaultPartyId }, create: { partyId: input.atFaultPartyId, ...data }, update: data });
    }
    return tx.dispute.update({ where: { id }, data: { status, resolutionNote: input.note, resolvedAt: ['RESOLVED','REJECTED'].includes(status) ? new Date() : null, ...(isState(p) ? { stateAdminId: p.id } : { districtAdminId: p.id }), auditLogs: { create: { actorId: p.id, fromStatus: d!.status, toStatus: status, note: input.note } } } });
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
  res.json({ success: true, matches });
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
  const booking = await prisma.booking.update({ where: { id: b!.id }, data: { logisticsNote: note } });
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
  const status = err instanceof Failure ? err.status : err instanceof z.ZodError ? 400 : err.code === 'P2002' ? 409 : 500;
  const error = err instanceof z.ZodError ? err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') : status === 500 ? 'The request could not be completed. Please retry.' : err.message;
  if (status === 500) console.error('Workspace request failed:', err.code || err.name, err.code === 'P2028' ? err.meta?.error : '');
  res.status(status).json({ success: false, error });
});
export default router;
