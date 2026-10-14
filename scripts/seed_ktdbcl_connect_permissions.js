const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const defaultLocalDbPath = path.resolve(__dirname, '..', 'local.db').replace(/\\/g, '/');

const tursoUrl = process.env.TURSO_DATABASE_URL
  ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://')
  : 'https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io';
const tursoToken = process.env.TURSO_AUTH_TOKEN || '';

const cloudClient = createClient({
  url: tursoUrl,
  authToken: tursoToken
});

const localClient = createClient({
  url: `file:${defaultLocalDbPath}`
});

const MODULES = [
  'KTDBCL_CONNECT',
  'KTDBCL_CONNECT_DASHBOARD',
  'KTDBCL_CONNECT_ANNOUNCEMENTS',
  'KTDBCL_CONNECT_KNOWLEDGE',
  'KTDBCL_CONNECT_METRICS'
];

const ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'KT_DBCL',
  'KTDBCL',
  'KHAO_THI',
  'ĐBCL',
  'DBCL',
  'GDCS',
  'GIAO_VU',
  'BGH_MN'
];

async function seedOn(client, name) {
  console.log(`\n=== Seeding KTDBCL_CONNECT permissions on ${name} ===`);
  for (const roleCode of ROLES) {
    const isLeadershipOrOfficer = ['ADMIN', 'SUPER_ADMIN', 'KT_DBCL', 'KTDBCL', 'KHAO_THI', 'ĐBCL', 'DBCL'].includes(roleCode);
    for (const mod of MODULES) {
      const id = `perm_${roleCode}_${mod}`.toLowerCase();
      try {
        await client.execute({
          sql: `INSERT OR REPLACE INTO "Permission" ("id", "roleCode", "module", "canRead", "canCreate", "canUpdate", "canDelete")
                VALUES (?, ?, ?, 1, ?, ?, ?)`,
          args: [
            id,
            roleCode,
            mod,
            isLeadershipOrOfficer ? 1 : 0,
            isLeadershipOrOfficer ? 1 : 0,
            isLeadershipOrOfficer ? 1 : 0
          ]
        });
      } catch (e) {
        console.warn(`[${name}] Warning inserting perm:`, e.message);
      }
    }
  }
  console.log(`[${name}] Done seeding permissions.`);
}

async function main() {
  await seedOn(localClient, 'Local SQLite (local.db)');
  try {
    await seedOn(cloudClient, 'Turso Cloud');
  } catch (err) {
    console.warn('Cloud seeding error:', err.message);
  }
}

main().then(() => {
  console.log('Finished seeding cleanly!');
  process.exit(0);
}).catch(console.error);
