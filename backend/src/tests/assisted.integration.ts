import '../config/env';
import assert from 'node:assert/strict';
import {randomUUID,randomInt} from 'node:crypto';
import {prisma} from '../config/prisma';
import {signToken} from '../utils/jwt';
const origin=process.env.TEST_API_URL||'http://localhost:4000';
const phone=`+919${String(randomInt(100000000,999999999))}`;
const password=`Test-only-${randomUUID()}`;
let partyId:string|undefined,token='';let checks=0;
async function call(path:string,method='GET',body?:unknown,status=200){
 const response=await fetch(origin+'/api/'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data:any=await response.json();assert.equal(response.status,status,`${method} ${path}: ${data.error||''}`);checks++;return data;
}
async function main(){try{
 await call('auth/register','POST',{phone,password,name:'QA restricted signup',district:'Nashik',role:'PLATFORM_ADMIN'},400);
 const session=await call('auth/register','POST',{phone,password,name:'QA assisted account',district:'Nashik',role:'FARMER'});
 partyId=session.party.id;token=session.token;assert.ok(token);assert.deepEqual(session.party.roles,['FARMER']);assert.equal(session.party.passwordHash,undefined);
 const scopedToken=token;token=signToken({userId:randomUUID(),phone,roles:['FARMER']});
 await call('workspace/updates','GET',undefined,401);await call('workspace/recommendations','GET',undefined,401);token=scopedToken;
 await call('auth/password-login','POST',{phone,password:'incorrect-password'},401);
 const login=await call('auth/password-login','POST',{phone,password});assert.equal(login.party.id,partyId);
 await call('auth/register','POST',{phone,password,name:'Duplicate',district:'Nashik'},409);
 const input={clientRequestId:randomUUID(),resourceType:'CROP_LOT',district:'Nashik',price:2500,priceUnit:'per_quintal',attributes:{crop:'Wheat',quantityKg:2000,qualityGrade:'A'}};
 const first=await call('workspace/resources/listing','POST',input,201);
 const repeated=await call('workspace/resources/listing','POST',input,201);assert.equal(first.listing.id,repeated.listing.id);assert.equal(first.listing.price,25);assert.equal(first.listing.priceUnit,'per_kg');
 await call('workspace/resources/listing','POST',{...input,price:2600},409);
 await call('workspace/resources/listing','POST',{...input,clientRequestId:randomUUID(),attributes:{...input.attributes,isPooled:true}},400);
 const home=await call('workspace/farmer-home');assert.equal(home.party.listings.length,1);
 const create=await call('workspace/snapshot?section=create');assert.equal(create.listings.length,0);assert.equal(create.offers.length,0);
 const options=await call(`workspace/sell-options/${first.listing.id}`);assert.equal(options.listing.id,first.listing.id);assert.ok(options.options.every((o:any)=>o.buyer.id!==partyId));
 await call('bookings', 'GET',undefined,410);
 await call('listings', 'GET',undefined,410);
 await call('auth/request-otp','POST',{phone},503);
 const updates=await call('workspace/updates');assert.equal(updates.partyId,partyId);assert.deepEqual(updates.updates,[]);
 const saved=await prisma.user.findUnique({where:{phone}});assert.ok(saved?.passwordHash?.startsWith('scrypt:'));assert.notEqual(saved?.passwordHash,password);
 console.log(`PASS: ${checks} HTTP checks plus password hashing, restricted signup, persistence, idempotency, unit conversion, server-only pooling metadata and private legacy-route checks.`);
 }finally{
  // Only IDs returned by this test's successful registration are eligible for cleanup.
  if(partyId){await prisma.listing.deleteMany({where:{partyId}});const party=await prisma.party.findUnique({where:{id:partyId},select:{userId:true}});if(party){await prisma.party.delete({where:{id:partyId}});await prisma.user.delete({where:{id:party.userId}});}}
  await prisma.$disconnect();
 }}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
