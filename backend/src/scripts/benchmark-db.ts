import '../config/env';
import {Pool} from 'pg';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';

// Read-only comparison of warm client round-trips. Never log connection strings.
async function main(){
 const url=new URL(process.env.DATABASE_URL!);
 if(url.hostname.endsWith('.pooler.supabase.com')&&url.port==='5432')url.port='6543';
 url.searchParams.set('pgbouncer','true');url.searchParams.set('connection_limit','1');
 console.log({regionEndpoint:url.hostname});
 const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000});
 const prisma=new PrismaClient({datasourceUrl:url.toString()});
 const adapted=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000})});
 try{
  for(let i=0;i<3;i++){let start=Date.now();await prisma.party.count();console.log({client:'Prisma',probe:i,ms:Date.now()-start});start=Date.now();await pool.query('SELECT count(*) FROM "Party"');console.log({client:'pg',probe:i,ms:Date.now()-start});start=Date.now();await adapted.party.count();console.log({client:'Prisma with pg adapter',probe:i,ms:Date.now()-start});}
 }finally{await pool.end();await prisma.$disconnect();await adapted.$disconnect();}
}
main().catch(error=>{console.error('Database probe failed:',error.code||error.name);process.exitCode=1;});
