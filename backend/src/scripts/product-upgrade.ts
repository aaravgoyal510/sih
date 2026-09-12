import '../config/env';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {prisma} from '../config/prisma';
async function main(){
 const tables=await prisma.$queryRaw<Array<{name:string;present:boolean}>>`SELECT name, to_regclass(format('%I',name)) IS NOT NULL AS present FROM unnest(ARRAY['Recommendation','TrustScore','Notification','BookingEvent']) AS name`;
 console.log('Additive product storage:',tables);
 if(!process.argv.includes('--apply'))return;
 const paths=['20260912000000_decision_records','20260912010000_decision_intelligence'];
 // One static, reviewed DO statement: only CREATE / ADD COLUMN / CREATE INDEX.
 // Existing marketplace rows are never updated, reset or deleted by this upgrade.
 for(const path of paths){const sql=readFileSync(resolve(__dirname,`../../prisma/migrations/${path}/migration.sql`),'utf8');await prisma.$executeRawUnsafe(sql);}
 console.log('Additive product storage upgrade applied; existing records preserved.');
}
main().catch(e=>{console.error('Product storage check/upgrade failed:',e.code||e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
