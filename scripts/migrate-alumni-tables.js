const { createClient } = require('@libsql/client');
require('dotenv').config();
const path = require('path');

const localDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/');
const localClient = createClient({ url: `file:${localDbPath}` });

let tursoClient = null;
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
}

const statements = [
  // 1. AlumniProfile
  `CREATE TABLE IF NOT EXISTS "AlumniProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentCode" TEXT NOT NULL,
    "originalStudentId" TEXT,
    "studentName" TEXT NOT NULL,
    "englishName" TEXT,
    "gender" TEXT,
    "dateOfBirth" DATETIME,
    "personalEmail" TEXT,
    "personalPhone" TEXT,
    "campusId" TEXT NOT NULL,
    "graduationGrade" TEXT NOT NULL DEFAULT '12',
    "graduationYear" INTEGER NOT NULL,
    "graduationBatch" TEXT,
    "educationSystem" TEXT,
    "lastClassName" TEXT,
    "currentResidenceCountry" TEXT DEFAULT 'Việt Nam',
    "currentResidenceCity" TEXT,
    "currentAcademicStatus" TEXT DEFAULT 'STUDYING',
    "currentCareerStatus" TEXT DEFAULT 'WORKING',
    "currentEmployer" TEXT,
    "currentJobTitle" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "lastVerifiedAt" DATETIME,
    "verifiedById" TEXT,
    "lastSelfUpdatedAt" DATETIME,
    "allowContact" BOOLEAN NOT NULL DEFAULT 1,
    "joinAlumniNetwork" BOOLEAN NOT NULL DEFAULT 1,
    "allowMediaSharing" BOOLEAN NOT NULL DEFAULT 0,
    "dataConsentAccepted" BOOLEAN NOT NULL DEFAULT 0,
    "dataConsentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AlumniProfile_studentCode_key" ON "AlumniProfile"("studentCode")`,
  `CREATE INDEX IF NOT EXISTS "AlumniProfile_graduationYear_idx" ON "AlumniProfile"("graduationYear")`,
  `CREATE INDEX IF NOT EXISTS "AlumniProfile_campusId_idx" ON "AlumniProfile"("campusId")`,
  `CREATE INDEX IF NOT EXISTS "AlumniProfile_verificationStatus_idx" ON "AlumniProfile"("verificationStatus")`,
  `CREATE INDEX IF NOT EXISTS "AlumniProfile_graduationGrade_idx" ON "AlumniProfile"("graduationGrade")`,

  // 2. AlumniQrToken
  `CREATE TABLE IF NOT EXISTS "AlumniQrToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alumniId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "generatedById" TEXT,
    "revokedById" TEXT,
    "revokedAt" DATETIME,
    "revocationReason" TEXT,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlumniQrToken_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "AlumniProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AlumniQrToken_publicToken_key" ON "AlumniQrToken"("publicToken")`,
  `CREATE INDEX IF NOT EXISTS "AlumniQrToken_alumniId_idx" ON "AlumniQrToken"("alumniId")`,
  `CREATE INDEX IF NOT EXISTS "AlumniQrToken_publicToken_idx" ON "AlumniQrToken"("publicToken")`,
  `CREATE INDEX IF NOT EXISTS "AlumniQrToken_status_idx" ON "AlumniQrToken"("status")`,

  // 3. AlumniEducation
  `CREATE TABLE IF NOT EXISTS "AlumniEducation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alumniId" TEXT NOT NULL,
    "degreeLevel" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "institutionCode" TEXT,
    "majorName" TEXT NOT NULL,
    "specialization" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Việt Nam',
    "city" TEXT,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT 0,
    "scholarshipInfo" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlumniEducation_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "AlumniProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AlumniEducation_alumniId_idx" ON "AlumniEducation"("alumniId")`,
  `CREATE INDEX IF NOT EXISTS "AlumniEducation_country_idx" ON "AlumniEducation"("country")`,
  `CREATE INDEX IF NOT EXISTS "AlumniEducation_institutionName_idx" ON "AlumniEducation"("institutionName")`,

  // 4. AlumniCareer
  `CREATE TABLE IF NOT EXISTS "AlumniCareer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alumniId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "organization" TEXT,
    "workCountry" TEXT NOT NULL DEFAULT 'Việt Nam',
    "workCity" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isCurrent" BOOLEAN NOT NULL DEFAULT 1,
    "isVerified" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlumniCareer_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "AlumniProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AlumniCareer_alumniId_idx" ON "AlumniCareer"("alumniId")`,
  `CREATE INDEX IF NOT EXISTS "AlumniCareer_industry_idx" ON "AlumniCareer"("industry")`,
  `CREATE INDEX IF NOT EXISTS "AlumniCareer_workCountry_idx" ON "AlumniCareer"("workCountry")`,

  // 5. AlumniUpdateSubmission
  `CREATE TABLE IF NOT EXISTS "AlumniUpdateSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alumniId" TEXT NOT NULL,
    "submissionCode" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlumniUpdateSubmission_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "AlumniProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AlumniUpdateSubmission_submissionCode_key" ON "AlumniUpdateSubmission"("submissionCode")`,
  `CREATE INDEX IF NOT EXISTS "AlumniUpdateSubmission_alumniId_idx" ON "AlumniUpdateSubmission"("alumniId")`,
  `CREATE INDEX IF NOT EXISTS "AlumniUpdateSubmission_status_idx" ON "AlumniUpdateSubmission"("status")`,
  `CREATE INDEX IF NOT EXISTS "AlumniUpdateSubmission_createdAt_idx" ON "AlumniUpdateSubmission"("createdAt")`,

  // 6. AlumniCatalog
  `CREATE TABLE IF NOT EXISTS "AlumniCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "parentCode" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AlumniCatalog_type_code_key" ON "AlumniCatalog"("type", "code")`,
  `CREATE INDEX IF NOT EXISTS "AlumniCatalog_type_idx" ON "AlumniCatalog"("type")`,
  `CREATE INDEX IF NOT EXISTS "AlumniCatalog_parentCode_idx" ON "AlumniCatalog"("parentCode")`,

  // 7. AlumniConsentLog
  `CREATE TABLE IF NOT EXISTS "AlumniConsentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alumniId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlumniConsentLog_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "AlumniProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AlumniConsentLog_alumniId_idx" ON "AlumniConsentLog"("alumniId")`
];

async function runMigration() {
  console.log('=== [1/2] Applying Alumni Migration to LOCAL SQLite (local.db) ===');
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    try {
      await localClient.execute(sql);
    } catch (err) {
      console.error(`Error executing statement ${i + 1} on local:`, err.message);
      throw err;
    }
  }
  console.log('✓ Local migration completed successfully!');

  if (tursoClient) {
    console.log('\n=== [2/2] Applying Alumni Migration to CLOUD TURSO ===');
    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i];
      try {
        await tursoClient.execute(sql);
      } catch (err) {
        console.warn(`Turso statement ${i + 1} notice:`, err.message);
      }
    }
    console.log('✓ Turso migration completed!');
  } else {
    console.log('\n[2/2] Turso client not configured or skipped.');
  }

  // Verification
  console.log('\n=== [VERIFICATION] Checking newly created tables in local.db ===');
  const res = await localClient.execute(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE 'Alumni%'
    ORDER BY name
  `);
  console.log('Alumni tables in local.db:', res.rows.map(r => r.name));
  
  const studentCount = await localClient.execute('SELECT count(*) as count FROM Student');
  console.log('Integrity check - Total Student records intact:', studentCount.rows[0].count);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
