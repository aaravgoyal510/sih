import '../config/env';
async function main(){
 for(const filter of ['state.keyword','state']){
  const url=new URL('https://api.data.gov.in/resource/'+(process.env.AGMARKNET_RESOURCE_ID||'9ef84268-d588-465a-a308-a864a43d0070'));
  url.searchParams.set('api-key',process.env.AGMARKNET_API_KEY||'');url.searchParams.set('format','json');url.searchParams.set('limit','2');url.searchParams.set(`filters[${filter}]`,'Maharashtra');
  try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});const body:any=await r.json();const error=JSON.stringify(body.error||'').replaceAll(process.env.AGMARKNET_API_KEY||'__none__','[REDACTED]');console.log(JSON.stringify({filter,status:r.status,error,count:body.records?.length,sample:body.records?.[0]}));}catch(e:any){console.log({filter,error:e.name});}
 }
}
main();
