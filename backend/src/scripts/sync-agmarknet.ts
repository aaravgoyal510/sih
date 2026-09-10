import dotenv from 'dotenv';
import { AgmarknetAdapter } from '../adapters/agmarknet.adapter';
import { prisma } from '../config/prisma';

dotenv.config();

async function main() {
  console.log('Starting Agmarknet Price Ingestion Job...');
  const adapter = new AgmarknetAdapter();
  const result = await adapter.sync(100);

  console.log('\n--- Sync Job Output ---');
  console.log(JSON.stringify(result, null, 2));

  await prisma.$disconnect();
  process.exit(result.status === 'SUCCESS' ? 0 : 1);
}

main();
