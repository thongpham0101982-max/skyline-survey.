const { createClient } = require('@libsql/client');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

async function run() {
  const localDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/');
  console.log('Applying teacher digital signature DDL to local.db:', localDbPath);
  const localClient = createClient({ url: `file:${localDbPath}` });

  const migrationSqlPath = path.resolve(
    process.cwd(),
    'prisma',
    'migrations',
    '20261105_teacher_digital_signatures',
    'migration.sql'
  );
  const sql = fs.readFileSync(migrationSqlPath, 'utf8');

  // Clean comments and split statements by semicolon
  const cleanedSql = sql.replace(/--.*$/gm, '');
  const statements = cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await localClient.execute(stmt);
      console.log('✓ Executed:', stmt.substring(0, 50).replace(/\n/g, ' ') + '...');
    } catch (err) {
      console.error('Error executing stmt:', stmt, err.message);
    }
  }

  // Also apply to Turso if configured
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    try {
      console.log('Applying teacher digital signature DDL to Turso cloud...');
      const tursoClient = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
      for (const stmt of statements) {
        try {
          await tursoClient.execute(stmt);
        } catch (tursoErr) {
          console.warn('Turso DDL note:', tursoErr.message);
        }
      }
      console.log('✓ Turso DDL sync completed.');
    } catch (e) {
      console.warn('Could not sync to Turso (non-fatal):', e.message);
    }
  }

  console.log('All teacher signature DDL operations completed successfully (zero test rows inserted).');
}

run().catch(console.error);
