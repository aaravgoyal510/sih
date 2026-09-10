import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

async function checkDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('\n=================================================');
    console.log(' SUPABASE POSTGRESQL SCHEMA VERIFICATION ');
    console.log('=================================================');

    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n[1. TABLES IN SUPABASE DB]:');
    resTables.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.table_name}`);
    });

    const resEnums = await client.query(`
      SELECT t.typname as enum_name, string_agg(e.enumlabel, ', ') as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `);

    console.log('\n[2. ENUMS CREATED IN SUPABASE DB]:');
    resEnums.rows.forEach((row) => {
      console.log(`  - ${row.enum_name}: [${row.enum_values}]`);
    });

    console.log('\n=================================================\n');
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

checkDatabase();
