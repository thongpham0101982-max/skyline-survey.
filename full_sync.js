const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('./prisma/generated/client2');

const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const localP = new PrismaClient();
const libsql = createClient({ url: tursoUrl, authToken: authToken });
const adapter = new PrismaLibSQL(libsql);
const tursoP = new PrismaClient({ adapter });

const tables = [
  'user',
  'campus',
  'department',
  'academicYear',
  'educationSystem',
  'teacher',
  'class',
  'student',
  'assessmentConfig',
  'assessmentSubject',
  'inputAssessmentPeriod',
  'inputAssessmentBatch',
  'inputAssessmentStudent',
  'inputAssessmentTeacherAssignment',
  'studentAssessmentScore'
];

async function sync() {
  console.log('--- STARTING CLEAN SYNC LOCAL -> TURSO ---');
  
  for (const model of tables) {
    try {
      console.log(`Syncing ${model}...`);
      const localData = await localP[model].findMany();
      console.log(`Found ${localData.length} records locally.`);
      
      if (localData.length === 0) continue;

      let count = 0;
      for (const item of localData) {
        try {
          if (model === 'user') {
             // For user, upsert by email to avoid ID conflicts
             await tursoP.user.upsert({
               where: { email: item.email },
               update: item,
               create: item
             });
          } else {
             // For others, use ID to maintain FK integrity
             await tursoP[model].upsert({
               where: { id: item.id },
               update: item,
               create: item
             });
          }
          count++;
        } catch (innerE) {
          // If ID fails for some reason (maybe FK), skip for now
          // console.warn(`  [${model}] Skipped item ${item.id || item.email}: ${innerE.message.substring(0, 100)}`);
        }
      }
      console.log(`Finished ${model}: ${count} records.`);
    } catch (e) {
      console.error(`Error syncing ${model}:`, e.message);
    }
  }
  
  console.log('--- SYNC COMPLETE ---');
}

sync()
  .catch(e => console.error('FATAL:', e))
  .finally(async () => {
    await localP.$disconnect();
    await tursoP.$disconnect();
  });
