import './config/env';
import { AggregationService } from './services/aggregation.service';
import { SlaEscalationService } from './services/sla-escalation.service';
import { AgmarknetAdapter } from './adapters/agmarknet.adapter';
import { prisma } from './config/prisma';

const running=new Set<string>();
async function job(name:string,fn:()=>Promise<unknown>){if(running.has(name))return;running.add(name);try{await fn();console.log(`[worker] ${name} completed`);}catch(e:any){console.error(`[worker] ${name} failed: ${e.code||e.name}`);}finally{running.delete(name);}}
const aggregation=()=>job('daily aggregation',()=>new AggregationService().runDailyAggregation());
const sla=()=>job('SLA escalation',()=>new SlaEscalationService().processSlaEscalations());
const sync=()=>job('Agmarknet sync',async()=>{const result=await new AgmarknetAdapter().sync();if(result.status==='FAILED')throw new Error('Government feed unavailable');return result;});
const timers=[setInterval(aggregation,3600000),setInterval(sla,15*60000),setInterval(sync,15*60000)];
async function boot(){await sla();if(process.env.AGMARKNET_API_KEY)await sync();await aggregation();}
boot();
async function stop(){timers.forEach(clearInterval);await prisma.$disconnect();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
