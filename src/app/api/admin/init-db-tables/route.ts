import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const ddlList = [
  "CREATE TABLE IF NOT EXISTS \"StudentGoal\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"studentId\" TEXT NOT NULL, \"academicYearId\" TEXT NOT NULL, \"gradeLevel\" TEXT NOT NULL DEFAULT 'K8', \"semester\" TEXT NOT NULL DEFAULT 'CA_NAM', \"category\" TEXT NOT NULL DEFAULT 'HOC_TAP', \"targetText\" TEXT NOT NULL, \"presetId\" TEXT, \"teacherSupportRequest\" TEXT, \"parentSupportRequest\" TEXT, \"smartSpecific\" TEXT, \"smartMeasurable\" TEXT, \"smartAchievable\" TEXT, \"smartRelevant\" TEXT, \"smartTimeBound\" TEXT, \"checkpointDate\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"achievementLevel\" TEXT NOT NULL DEFAULT 'DANG_TIEN_TRIEN', \"status\" TEXT NOT NULL DEFAULT 'DRAFT', \"studentCommitment\" TEXT, \"parentMessage\" TEXT, \"teacherComment\" TEXT, \"signedByStudent\" BOOLEAN NOT NULL DEFAULT false, \"signedByParent\" BOOLEAN NOT NULL DEFAULT false, \"signedByTeacher\" BOOLEAN NOT NULL DEFAULT false, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS \"StudentGoalAction\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"goalId\" TEXT NOT NULL, \"actionText\" TEXT NOT NULL, \"status\" TEXT NOT NULL DEFAULT 'PENDING', \"targetDate\" DATETIME, \"completedAt\" DATETIME, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS \"StudentGoalTrackingLog\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"studentId\" TEXT NOT NULL, \"academicYearId\" TEXT NOT NULL, \"goalId\" TEXT, \"category\" TEXT NOT NULL DEFAULT 'HOC_TAP', \"targetText\" TEXT NOT NULL, \"checkPoint\" TEXT NOT NULL DEFAULT 'DAU_NAM', \"progressStatus\" TEXT NOT NULL DEFAULT 'TIEN_TRIEN', \"teacherNotes\" TEXT, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS \"GoalPreset\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"gradeGroup\" TEXT NOT NULL, \"category\" TEXT NOT NULL, \"goalText\" TEXT NOT NULL, \"actionPreset\" TEXT, \"status\" TEXT NOT NULL DEFAULT 'ACTIVE', \"sortOrder\" INTEGER NOT NULL DEFAULT 0, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS \"AcademicConsultationLog\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"studentId\" TEXT NOT NULL, \"teacherId\" TEXT NOT NULL, \"academicYearId\" TEXT NOT NULL, \"consultationDate\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"consultationType\" TEXT NOT NULL DEFAULT 'CAN_BANG_TAM_LY', \"issuesIdentified\" TEXT NOT NULL, \"actionPlan\" TEXT NOT NULL, \"outcomeStatus\" TEXT NOT NULL DEFAULT 'IN_PROGRESS', \"notes\" TEXT, \"followUpDate\" DATETIME, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS \"StudentReflection\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"studentId\" TEXT NOT NULL, \"academicYearId\" TEXT NOT NULL, \"checkPoint\" TEXT NOT NULL DEFAULT 'GIUA_KY_1', \"strengths\" TEXT, \"weaknesses\" TEXT, \"lessonLearned\" TEXT, \"nextSteps\" TEXT, \"submittedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS \"StudentHelpRequest\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"studentId\" TEXT NOT NULL, \"academicYearId\" TEXT NOT NULL, \"teacherId\" TEXT, \"helpCategory\" TEXT NOT NULL DEFAULT 'HOC_TAP', \"urgencyLevel\" TEXT NOT NULL DEFAULT 'TRUNG_BINH', \"detailRequest\" TEXT NOT NULL, \"status\" TEXT NOT NULL DEFAULT 'PENDING', \"resolutionNotes\" TEXT, \"resolvedAt\" DATETIME, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS \"StudentAdvisoryStatus\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"studentId\" TEXT NOT NULL, \"academicYearId\" TEXT NOT NULL, \"overallWarningStatus\" TEXT NOT NULL DEFAULT 'BINH_THUONG', \"academicRisk\" TEXT NOT NULL DEFAULT 'BINH_THUONG', \"conductRisk\" TEXT NOT NULL DEFAULT 'BINH_THUONG', \"psychologyRisk\" TEXT NOT NULL DEFAULT 'BINH_THUONG', \"lastEvaluatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS \"StudentTermEvaluation\" (\"id\" TEXT NOT NULL PRIMARY KEY, \"studentId\" TEXT NOT NULL, \"academicYearId\" TEXT NOT NULL, \"term\" TEXT NOT NULL DEFAULT 'HOCKY_1', \"academicConductRating\" TEXT, \"lifeSkillsRating\" TEXT, \"physicalHealthRating\" TEXT, \"careerOrientationRating\" TEXT, \"overallHomeroomComment\" TEXT, \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \"updatedAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);"
]

export async function GET() {
  const results = []
  for (let i = 0; i < ddlList.length; i++) {
    try {
      await prisma.$executeRawUnsafe(ddlList[i])
      results.push(`Table ${i + 1} OK`)
    } catch (err: any) {
      results.push(`Table ${i + 1} Error: ${err.message}`)
    }
  }

  const res = NextResponse.json({ success: true, results })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}
