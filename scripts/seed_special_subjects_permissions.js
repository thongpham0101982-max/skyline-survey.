const { createClient } = require("@libsql/client");
const path = require("path");

const LOCAL_DB_PATH = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const modules = [
  "SPECIAL_SUBJECTS_ROOT",
  "SPEC_SUB_DASHBOARD",
  "SPEC_SUB_CATALOGS",
  "SPEC_SUB_CURRICULUMS",
  "SPEC_SUB_ASSIGNMENTS",
  "SPEC_SUB_GRADEBOOK"
];

async function grantPermissions(client, name) {
  console.log(`Seeding permissions on ${name}...`);
  const existingRolesRes = await client.execute('SELECT code FROM Role');
  const validRoles = new Set(existingRolesRes.rows.map(r => r.code));
  const targetRoles = ["ADMIN", "GDCS", "TTCM", "KHAO_THI", "ĐBCL", "GIAO_VU", "TEACHER"].filter(r => validRoles.has(r));

  for (const role of targetRoles) {
    for (const mod of modules) {
      const permId = `perm_${role.toLowerCase()}_${mod.toLowerCase()}`;
      await client.execute({
        sql: `INSERT INTO "Permission" (id, roleCode, module, canRead, canCreate, canUpdate, canDelete)
              VALUES (?, ?, ?, 1, 1, 1, 1)
              ON CONFLICT(roleCode, module) DO UPDATE SET
                canRead = 1, canCreate = 1, canUpdate = 1, canDelete = 1;`,
        args: [permId, role, mod]
      });
    }
  }
  console.log(`[${name}] Permissions seeded for roles: ${targetRoles.join(", ")}`);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await grantPermissions(localClient, "LOCAL SQLite");

  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await grantPermissions(cloudClient, "TURSO Cloud");
  } catch (err) {
    console.warn("Turso cloud permissions warning:", err.message);
  }
}

main().catch(console.error);
