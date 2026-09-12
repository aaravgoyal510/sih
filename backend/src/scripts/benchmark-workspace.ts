// Read-only latency/size measurements. Demo sign-in mints a token, no data mutation.
export {};
const origin=process.env.TEST_API_URL||'http://localhost:4000';
async function main(){
 const profiles=await fetch(origin+'/api/workspace/demo-profiles').then(r=>r.json()) as any;
 const party=profiles.profiles.find((p:any)=>p.roles.includes('FARMER'));
 const session=await fetch(origin+'/api/workspace/demo-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({partyId:party.id})}).then(r=>r.json()) as any;
 for(const path of ['/snapshot','/me','/snapshot?section=create','/snapshot?section=overview','/snapshot?section=offers']){
  const start=performance.now();const r=await fetch(origin+'/api/workspace'+path,{headers:{Authorization:`Bearer ${session.token}`}});const text=await r.text();console.log(JSON.stringify({path,status:r.status,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(text),serverTiming:r.headers.get('server-timing')}));
 }
}
main().catch(()=>{console.error('Benchmark could not reach demo API.');process.exitCode=1;});
