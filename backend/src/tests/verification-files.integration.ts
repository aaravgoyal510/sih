import '../config/env';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../config/prisma';
import {signToken} from '../utils/jwt';
import {DOCUMENT_BUCKET,storageObjectPath} from '../services/verification-storage';
const origin=process.env.TEST_API_URL||'http://localhost:4000';
const parties:{id:string;userId:string;token:string}[]=[];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0foAAAAASUVORK5CYII=','base64');
let objectPath:string|null=null,checks=0;
async function main(){try{
 for(const [role,district] of [['FARMER','Nashik'],['FARMER','Nashik'],['DISTRICT_ADMIN','Nashik'],['DISTRICT_ADMIN','Pune']] as const){
  const user=await prisma.user.create({data:{phone:`QA-FILES-${randomUUID()}`,party:{create:{name:'QA private document',roles:[role],district}}},include:{party:true}});
  const p=user.party!;parties.push({id:p.id,userId:user.id,token:signToken({userId:user.id,partyId:p.id,phone:user.phone,roles:p.roles,district:p.district})});
 }
 const key=randomUUID(),headers={'Content-Type':'image/png','x-verification-role':'FARMER','x-document-type':'LAND_RECORD','x-document-ref':encodeURIComponent('QA जमीन 123'),'x-request-id':key,Authorization:`Bearer ${parties[0].token}`};
 async function upload(extra:Record<string,string>={},body:Buffer=png,status=201){const r=await fetch(origin+'/api/workspace/verification-upload',{method:'POST',headers:{...headers,...extra},body:new Uint8Array(body)});const data:any=await r.json();assert.equal(r.status,status,data.error);checks++;return data;}
 await upload({Authorization:''},png,401);
 await upload({'Content-Type':'image/svg+xml'},Buffer.from('<svg/>'),400);
 await upload({},Buffer.from('not an image'),400);
 await upload({},Buffer.alloc(2*1024*1024+1),413);
 const first=await upload();const v=first.verification;assert.equal(v.status,'PENDING');assert.equal(v.documentRef,'QA जमीन 123');objectPath=storageObjectPath(v.documentUrl,parties[0].id);assert.ok(objectPath);
 assert.equal((await upload()).verification.id,v.id);
 await upload({'x-document-ref':'changed-reference'},png,409);
 await upload({},Buffer.concat([png,Buffer.from('changed')]),409);
 await upload({'x-request-id':randomUUID()},png,409);
 for(const [index,status] of [[0,200],[1,404],[2,200],[3,404]] as const){const r=await fetch(`${origin}/api/workspace/verification/${v.id}/document`,{headers:{Authorization:`Bearer ${parties[index].token}`}});assert.equal(r.status,status);checks++;if(status===200){assert.equal(r.headers.get('cache-control'),'private, no-store');assert.match(r.headers.get('content-disposition')||'',/^attachment/);assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);}}
 const unauth=await fetch(`${origin}/api/workspace/verification/${v.id}/document`);assert.equal(unauth.status,401);checks++;
 const publicUrl=`${process.env.SUPABASE_URL}/storage/v1/object/public/${DOCUMENT_BUCKET}/${objectPath}`;
 const publicRead=await fetch(publicUrl);assert.notEqual(publicRead.status,200);checks++;
 const anon=await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${DOCUMENT_BUCKET}/${objectPath}`,{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY||''}});assert.notEqual(anon.status,200);checks++;
 assert.equal(await prisma.verification.count({where:{partyId:parties[0].id}}),1);assert.equal(await prisma.verificationAuditLog.count({where:{verificationId:v.id}}),1);
 console.log(`PASS: ${checks} private document HTTP checks, owner/reviewer byte equality, role and district isolation, MIME/size limits, request replay, private storage and one audit record.`);
 }finally{
  if(objectPath){const response=await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${DOCUMENT_BUCKET}`,{method:'DELETE',headers:{apikey:process.env.SUPABASE_SECRET_KEY!,Authorization:`Bearer ${process.env.SUPABASE_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[objectPath]})});assert.ok(response.ok,'QA object cleanup failed');}
  for(const p of parties){await prisma.verificationAuditLog.deleteMany({where:{verification:{partyId:p.id}}});await prisma.verification.deleteMany({where:{partyId:p.id}});await prisma.notification.deleteMany({where:{partyId:p.id}});await prisma.party.delete({where:{id:p.id}});await prisma.user.delete({where:{id:p.userId}});}
  await prisma.$disconnect();
  console.log('Removed only this test’s private document and temporary accounts; the private bucket is retained.');
 }}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
