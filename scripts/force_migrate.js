const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('./prisma/generated/client2');
const bcrypt = require('bcryptjs');

const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const localP = new PrismaClient();
const libsql = createClient({ url: tursoUrl, authToken: authToken });
const adapter = new PrismaLibSQL(libsql);
const tursoP = new PrismaClient({ adapter });

const tables = [
  'SurveyResponse',
  'SurveyForm',
  'SurveyQuestion',
  'SurveySection',
  'SurveyPeriod',
  'SummaryByClass',
  'SummaryByCampus',
  'SummarySystem',
  'StudentAssessmentScore',
  'InputAssessmentTeacherAssignment',
  'InputAssessmentStudent',
  'InputAssessmentBatch',
  'InputAssessmentPeriod',
  'AssessmentSubject',
  'AssessmentConfig',
  'EducationSystem',
  'TeacherClassAssignment',
  'TeachingAssignment',
  'SubjectQuota',
  'Student',
  'Class',
  'Teacher',
  'Subject', // Added Subject
  'Department',
  'Campus',
  'AcademicYear',
  'User'
];

async function sync() {
  console.log('--- STARTING CLEAN FORCE SYNC v4 (FIXED ORDER) ---');
  
  for (const table of tables) {
    try {
      console.log(`Clearing ${table} on Turso...`);
      await libsql.execute(`DELETE FROM ${table}`);
    } catch (e) {
      // console.warn(`  Warning clearing ${table}: ${e.message}`);
    }
  }

  const syncOrder = [...tables].reverse();
  for (const model of syncOrder) {
    try {
      const prismaModel = model.charAt(0).toLowerCase() + model.slice(1);
      console.log(`Syncing ${prismaModel}...`);
      const localData = await localP[prismaModel].findMany();
      if (localData.length === 0) {
        console.log(`No records for ${prismaModel}.`);
        continue;
      }
      console.log(`Found ${localData.length} records.`);
      
      let count = 0;
      for (const item of localData) {
        await tursoP[prismaModel].upsert({
          where: { id: item.id },
          update: item,
          create: item
        });
        count++;
      }
      console.log(`Done ${prismaModel}: ${count} synced.`);
    } catch (e) {
      console.error(`  Error syncing ${model}:`, e.message);
    }
  }
  
  // Set known passwords
  console.log('Finalizing admin credentials...');
  const newHash = await bcrypt.hash('admin@2026', 10);
  const adminEmails = ['admin@skyline.edu', '0201000707'];
  for (const email of adminEmails) {
    try {
      await tursoP.user.update({
        where: { email: email },
        data: { passwordHash: newHash, role: 'ADMIN', status: 'ACTIVE' }
      });
      console.log(`Password reset for ${email} successful.`);
    } catch (e) {
       console.warn(`Could not set password for ${email}: ${e.message}`);
    }
  }

  console.log('--- FORCE SYNC v4 COMPLETE ---');
}

sync()
  .catch(e => console.error('FATAL:', e))
  .finally(async () => {
    await localP.$disconnect();
    await tursoP.$disconnect();
  });
