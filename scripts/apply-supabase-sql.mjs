/**
 * Aplica um ficheiro .sql ao Postgres do Supabase (sem precisar de `supabase login`).
 * Uso: npm run db:apply-sql
 * Requer no .env: SUPABASE_DB_PASSWORD e opcional SUPABASE_PROJECT_REF (default pcudkhfnujqbsvtlpcij).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

config({ path: join(root, '.env') });
config({ path: join(root, '.env.local') });

const ref = process.env.SUPABASE_PROJECT_REF || 'pcudkhfnujqbsvtlpcij';
const pwd = process.env.SUPABASE_DB_PASSWORD;
const migrationPath =
  process.argv[2] || join(root, 'supabase/migrations/20260504000000_site_config_and_storage.sql');

if (!pwd) {
  console.error('Defina SUPABASE_DB_PASSWORD no .env');
  process.exit(1);
}

const sql = readFileSync(migrationPath, 'utf8');
const client = new pg.Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: pwd,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log('SQL aplicado:', migrationPath);
} finally {
  await client.end();
}
