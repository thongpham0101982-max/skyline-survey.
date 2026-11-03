const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const TURSO_URL = 'https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw';

async function migrate(client, name = 'Turso') {
  console.log(`Starting migration for ${name}...`);

  const statements = [
    // WorkTask
    `ALTER TABLE WorkTask ADD COLUMN taskGroupId TEXT`,
    `ALTER TABLE WorkTask ADD COLUMN department TEXT DEFAULT 'KT&ĐBCL'`,
    `ALTER TABLE WorkTask ADD COLUMN priority TEXT DEFAULT 'MEDIUM'`,
    `ALTER TABLE WorkTask ADD COLUMN completedAt DATETIME`,
    
    // TaskComment
    `ALTER TABLE TaskComment ADD COLUMN commentType TEXT DEFAULT 'GENERAL'`,
    `ALTER TABLE TaskComment ADD COLUMN actionAssigneeId TEXT`,
    `ALTER TABLE TaskComment ADD COLUMN actionDueDate DATETIME`,
    `ALTER TABLE TaskComment ADD COLUMN actionStatus TEXT DEFAULT 'NONE'`,
    `ALTER TABLE TaskComment ADD COLUMN mentionedUserIds TEXT`,

    // Department
    `ALTER TABLE Department ADD COLUMN taskConfig TEXT`
  ];

  for (const sql of statements) {
    try {
      await client.execute(sql);
      console.log(`[SUCCESS] ${sql}`);
    } catch (err) {
      if (err.message && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
        console.log(`[SKIPPED] Column already exists: ${sql}`);
      } else {
        console.error(`[ERROR] ${sql}:`, err.message);
      }
    }
  }

  // Update existing tasks to assign default taskGroup based on category
  try {
    const tasksRes = await client.execute(`SELECT id, category, taskGroupId FROM WorkTask WHERE taskGroupId IS NULL OR taskGroupId = ''`);
    const groupsRes = await client.execute(`SELECT id, name FROM TaskGroup`);
    const groupMap = {};
    for (const g of groupsRes.rows) {
      groupMap[g.name] = g.id;
    }

    console.log('Available TaskGroups:', groupMap);

    for (const task of tasksRes.rows) {
      const cat = (task.category || '').toLowerCase();
      let targetGroupId = null;
      if (cat.includes('phổ thông') || cat.includes('pt') || cat.includes('định kì')) {
        targetGroupId = groupMap['Khảo thí Phổ thông'];
      } else if (cat.includes('tiếng anh') || cat.includes('ctqt') || cat.includes('cambridge') || cat.includes('đầu ra')) {
        targetGroupId = groupMap['Khảo thí TA&CTQT'];
      } else if (cat.includes('học sinh') || cat.includes('mầm non') || cat.includes('mn')) {
        targetGroupId = groupMap['ĐBCL Học sinh'] || groupMap['Khảo thí Tổng hợp'];
      } else if (cat.includes('giáo viên') || cat.includes('đbcl')) {
        targetGroupId = groupMap['ĐBCL Giáo viên'] || groupMap['ĐBCL'];
      } else {
        targetGroupId = groupMap['Khảo thí Tổng hợp'] || Object.values(groupMap)[0];
      }

      if (targetGroupId) {
        await client.execute({
          sql: `UPDATE WorkTask SET taskGroupId = ?, department = 'KT&ĐBCL' WHERE id = ?`,
          args: [targetGroupId, task.id]
        });
        console.log(`Mapped task "${task.id}" (${task.category}) -> TaskGroup ${targetGroupId}`);
      }
    }
  } catch (err) {
    console.error('Error auto-mapping task groups:', err);
  }

  console.log(`Migration completed for ${name}!`);
}

async function main() {
  const tursoClient = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN
  });
  await migrate(tursoClient, 'Turso Cloud');

  const localDbPath = path.resolve(__dirname, '../local.db');
  if (fs.existsSync(localDbPath)) {
    const localClient = createClient({
      url: `file:${localDbPath}`
    });
    await migrate(localClient, 'Local SQLite');
  }
}

main().catch(console.error);
