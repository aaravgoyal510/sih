import '../config/env';
import assert from 'node:assert/strict';
import { prisma } from '../config/prisma';
import { signToken } from '../utils/jwt';
import { PartyRole } from '@prisma/client';

const runId = `QA-${Date.now()}`;
const actors: any[] = [];
const origin = process.env.TEST_API_URL || 'http://localhost:4000';
const stats = { assertions: 0 };
async function person(role: PartyRole, district = 'Nashik', fpoId?: string) {
  const user = await prisma.user.create({ data: { phone: `${runId}-${actors.length}`, party: { create: { name: `${runId} ${role}`, district, roles: [role], fpoId, credibility: { create: { score: 50 } } } } }, include: { party: true } });
  const token = signToken({ userId: user.id, partyId: user.party!.id, phone: user.phone, roles: user.party!.roles, district });
  const account = { ...user.party, userId: user.id, token }; actors.push(account); return account;
}
async function call(a: any, path: string, method='GET', body?: any, expected=200) {
  console.log(`Checking ${method} ${path.replace(/[a-f0-9-]{36}/g, ':id')} -> ${expected}`);
  const response = await fetch(`${origin}/api/workspace${path}`, { method, headers: { Authorization:`Bearer ${a.token}`, 'Content-Type':'application/json' }, ...(body?{body:JSON.stringify(body)}:{}) });
  const data:any = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`); stats.assertions++;
  return data;
}
async function main() {
 const org = await prisma.fpo.create({data:{name:runId,district:'Nashik'}});
 try {
  const farmer=await person('FARMER','Nashik',org.id),buyer=await person('BUYER','Pune'),stranger=await person('BUYER'),admin=await person('DISTRICT_ADMIN'),wrongAdmin=await person('DISTRICT_ADMIN','Pune'),state=await person('STATE_ADMIN','Maharashtra'),provider=await person('STORAGE_OPERATOR'),fpo=await person('FPO_ADMIN','Nashik',org.id);
  const input={resourceType:'CROP_LOT',district:'Nashik',price:20,priceUnit:'per_kg',attributes:{crop:runId,quantityKg:100,qualityGrade:'A'}};
  const {listing}=await call(farmer,'/resources/listing','POST',input,201);
  await call(buyer,'/resources/listing','POST',input,403);
  const {offer}=await call(buyer,'/offers','POST',{listingId:listing.id,price:20,quantity:100},201);
  const alternate=await call(farmer,'/resources/listing','POST',input,201);
  const competing=await call(farmer,'/offers','POST',{listingId:alternate.listing.id,requirementId:offer.requirementId,price:20,quantity:100},201);
  await call(stranger,`/offers/${offer.id}`,'PATCH',{action:'ACCEPT'},403);
  await call(buyer,`/offers/${offer.id}`,'PATCH',{action:'ACCEPT'},403);
  await call(farmer,`/offers/${offer.id}`,'PATCH',{action:'COUNTER',price:21});
  const accepted=await call(buyer,`/offers/${offer.id}`,'PATCH',{action:'ACCEPT'});
  const booking=accepted.offer.booking;assert.equal(booking.totalAmount,2100);stats.assertions++;
  assert.equal((await prisma.offer.findUnique({where:{id:competing.offer.id}}))!.status,'REJECTED');stats.assertions++;
  await call(farmer,'/offers','POST',{listingId:alternate.listing.id,requirementId:offer.requirementId,price:20,quantity:100},409);
  await call(stranger,`/bookings/${booking.id}/logistics`,'PATCH',{note:'Unauthorized edit'},403);
  const logistics=await call(farmer,`/bookings/${booking.id}/logistics`,'PATCH',{note:'Pickup at QA gate tomorrow morning'});
  assert.equal(logistics.booking.logisticsNote,'Pickup at QA gate tomorrow morning');stats.assertions++;
  await call(farmer,'/demo-session','POST',{partyId:farmer.id},403);
  const again=await call(buyer,`/offers/${offer.id}`,'PATCH',{action:'ACCEPT'});assert.equal(again.offer.booking.id,booking.id);stats.assertions++;
  await call(farmer,`/bookings/${booking.id}/action`,'POST',{action:'START'},409);
  await call(buyer,`/bookings/${booking.id}/action`,'POST',{action:'FUND'});
  await call(farmer,`/bookings/${booking.id}/action`,'POST',{action:'START'});
  await call(farmer,`/bookings/${booking.id}/action`,'POST',{action:'COMPLETE'});
  await call(buyer,`/bookings/${booking.id}/action`,'POST',{action:'RELEASE'});
  await call(buyer,`/bookings/${booking.id}/action`,'POST',{action:'RELEASE'},409);
  await call(buyer,`/bookings/${booking.id}/rating`,'POST',{score:5,comment:'QA completed'},201);
  await call(buyer,`/bookings/${booking.id}/rating`,'POST',{score:5},409);
  console.log('PASS: offer negotiation, ownership, booking, payment transitions and ratings');
  const {dispute}=await call(farmer,`/bookings/${booking.id}/dispute`,'POST',{category:'QUALITY',reason:'QA testing a quality dispute'},201);
  await call(wrongAdmin,`/review/dispute/${dispute.id}`,'POST',{action:'RESOLVE',note:'QA outside district'},403);
  await call(admin,`/review/dispute/${dispute.id}`,'POST',{action:'ESCALATE',note:'QA escalated for state review'});
  await call(admin,`/review/dispute/${dispute.id}`,'POST',{action:'RESOLVE',note:'QA district tries state case'},403);
  await call(state,`/review/dispute/${dispute.id}`,'POST',{action:'RESOLVE',note:'QA state review complete',atFaultPartyId:buyer.id});
  assert.equal((await prisma.credibilityScore.findUnique({where:{partyId:buyer.id}}))!.score,40);stats.assertions++;
  console.log('PASS: district boundary, escalation and credibility penalty');
  const storage={resourceType:'COLD_STORAGE',district:'Nashik',price:5,priceUnit:'per_quintal',attributes:{capacityQuintal:20,cropSuitability:['Onion']}};
  await call(provider,'/resources/listing','POST',storage,403);
  const {verification}=await call(provider,'/verification','POST',{role:'STORAGE_OPERATOR',documentType:'WDRA_LICENSE',documentRef:runId},201);
  await call(wrongAdmin,`/review/verification/${verification.id}`,'POST',{action:'APPROVE',note:'QA wrong district'},403);
  await call(admin,`/review/verification/${verification.id}`,'POST',{action:'APPROVE',note:'QA approved test evidence'});
  await call(provider,'/resources/listing','POST',storage,201);
  console.log('PASS: provider publication gate and verification audit');
  const first=await call(farmer,'/resources/listing','POST',input,201),second=await call(farmer,'/resources/listing','POST',input,201);
  const pool=await call(fpo,'/pool','POST',{listingIds:[first.listing.id,second.listing.id]},201);
  assert.equal(pool.listing.attributes.quantityKg,200);stats.assertions++;
  await call(fpo,'/pool','POST',{listingIds:[first.listing.id,second.listing.id]},400);
  console.log('PASS: FPO pooling quantity and double-pooling prevention');
  console.log(`PASS: ${stats.assertions} integration assertions`);
 } finally {
  // Remove only records owned by this test's exact freshly-created account IDs.
  const ids=actors.map(a=>a.id),userIds=actors.map(a=>a.userId);
  const disputes=await prisma.dispute.findMany({where:{raisedByPartyId:{in:ids}},select:{id:true}});
  await prisma.disputeAuditLog.deleteMany({where:{disputeId:{in:disputes.map(d=>d.id)}}});
  await prisma.dispute.deleteMany({where:{id:{in:disputes.map(d=>d.id)}}});
  await prisma.rating.deleteMany({where:{giverPartyId:{in:ids}}});
  const bookingIds=await prisma.booking.findMany({where:{offer:{listing:{partyId:{in:ids}}}},select:{id:true}});
  await prisma.portalSyncLog.deleteMany({where:{portal:'PAYMENT_GW',OR:bookingIds.map(b=>({message:{contains:b.id}}))}});
  await prisma.booking.deleteMany({where:{id:{in:bookingIds.map(b=>b.id)}}});
  await prisma.offer.deleteMany({where:{listing:{partyId:{in:ids}}}});
  await prisma.requirement.deleteMany({where:{partyId:{in:ids}}});
  await prisma.listing.deleteMany({where:{partyId:{in:ids}}});
  await prisma.verificationAuditLog.deleteMany({where:{verification:{partyId:{in:ids}}}});
  await prisma.verification.deleteMany({where:{partyId:{in:ids}}});
  await prisma.credibilityScore.deleteMany({where:{partyId:{in:ids}}});
  await prisma.party.deleteMany({where:{id:{in:ids}}});
  await prisma.user.deleteMany({where:{id:{in:userIds}}});
  await prisma.fpo.delete({where:{id:org.id}});
  console.log('QA records cleaned; existing data preserved.');
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
