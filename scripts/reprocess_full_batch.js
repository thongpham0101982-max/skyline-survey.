const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");
const crypto = require("crypto");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

function normalizeKey(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function resolveSubjectMatch(rawSub, subjects, aliases) {
  if (!rawSub) return null;
  const norm = normalizeKey(rawSub);
  const aliasMatch = aliases.find(a => a.normalizedKey === norm);
  if (aliasMatch) return aliasMatch.subjectId;
  const subMatch = subjects.find(s => normalizeKey(s.subjectName) === norm || normalizeKey(s.subjectCode) === norm);
  if (subMatch) return subMatch.id;
  const partialSub = subjects.find(s => {
    const sNorm = normalizeKey(s.subjectName);
    return norm.includes(sNorm) || sNorm.includes(norm);
  });
  return partialSub ? partialSub.id : null;
}

function resolveCompetencyMatch(subjectId, rawComp, competencies, aliases) {
  if (!rawComp || !subjectId) return null;
  const norm = normalizeKey(rawComp);
  const subjectComps = competencies.filter(c => c.subjectId === subjectId);
  const subjectCompIds = new Set(subjectComps.map(c => c.id));
  const aliasMatch = aliases.find(a => subjectCompIds.has(a.competencyId) && a.normalizedKey === norm);
  if (aliasMatch) return aliasMatch.competencyId;
  const exact = subjectComps.find(c => normalizeKey(c.name) === norm || normalizeKey(c.code) === norm);
  if (exact) return exact.id;
  const partial = subjectComps.find(c => {
    const cNorm = normalizeKey(c.name);
    return norm.includes(cNorm) || cNorm.includes(norm);
  });
  return partial ? partial.id : null;
}

function synthesizeSubjectSummary(subjectCompetencies, evaluations) {
  if (!subjectCompetencies || subjectCompetencies.length === 0) {
    return { subjectScore: null, evaluatedCount: 0, totalCompetencies: 0, radarData: [] };
  }
  const radarData = [];
  let totalScore = 0;
  let evaluatedCount = 0;

  for (const comp of subjectCompetencies) {
    const ev = evaluations.find(e => e.competencyId === comp.id);
    if (ev && ev.competencyPercent !== null && ev.competencyPercent !== undefined) {
      radarData.push({
        competencyId: comp.id,
        code: comp.code,
        name: comp.name,
        displayOrder: comp.displayOrder,
        weight: comp.weight,
        percent: ev.competencyPercent,
        achievedScore: ev.achievedScore,
        maxScore: ev.maxScore,
        calculationSource: ev.calculationSource
      });
      totalScore += ev.competencyPercent;
      evaluatedCount++;
    } else {
      radarData.push({
        competencyId: comp.id,
        code: comp.code,
        name: comp.name,
        displayOrder: comp.displayOrder,
        weight: comp.weight,
        percent: null
      });
    }
  }

  const subjectScore = evaluatedCount > 0 ? Math.round((totalScore / evaluatedCount) * 10) / 10 : null;
  return { subjectScore, evaluatedCount, totalCompetencies: subjectCompetencies.length, radarData };
}

async function reprocessAll() {
  console.log("=== STARTING FULL RE-PROCESSING OF ALL SUBJECTS ===");

  // Find latest committed batch or staged batch
  const batch = await prisma.importBatch.findFirst({
    where: { totalRows: { gt: 1000 } },
    orderBy: { createdAt: "desc" }
  });

  if (!batch) {
    console.error("No batch found!");
    return;
  }
  console.log(`Found batch: ${batch.batchCode} (${batch.id}), totalRows=${batch.totalRows}`);

  // Load dictionaries
  const [students, subjects, subjectAliases, competencies, compAliases] = await Promise.all([
    prisma.student.findMany({ select: { id: true, studentCode: true } }),
    prisma.subject.findMany({ select: { id: true, subjectCode: true, subjectName: true } }),
    prisma.subjectAlias.findMany({ select: { id: true, subjectId: true, normalizedKey: true } }),
    prisma.subjectCompetency.findMany({ select: { id: true, subjectId: true, code: true, name: true, displayOrder: true, weight: true } }),
    prisma.subjectCompetencyAlias.findMany({ select: { id: true, competencyId: true, normalizedKey: true } }),
  ]);

  const studentMap = new Map();
  students.forEach(s => {
    if (s.studentCode) studentMap.set(s.studentCode.trim().toLowerCase(), s.id);
  });

  console.log(`Loaded: ${students.length} students, ${subjects.length} subjects, ${competencies.length} competencies`);

  // Fetch all staging records in chunks
  const totalStaging = await prisma.stagingCompetencyAssessment.count({ where: { batchId: batch.id } });
  console.log(`Total staging records in batch: ${totalStaging}`);

  const STAGING_CHUNK = 5000;
  let updatedCount = 0;
  let resolvedComps = 0;

  const validStagingRecords = [];

  for (let offset = 0; offset < totalStaging; offset += STAGING_CHUNK) {
    const chunk = await prisma.stagingCompetencyAssessment.findMany({
      where: { batchId: batch.id },
      skip: offset,
      take: STAGING_CHUNK,
      orderBy: { rowNumber: "asc" }
    });

    for (const record of chunk) {
      let studentId = record.studentId;
      if (!studentId && record.rawStudentCode) {
        studentId = studentMap.get(record.rawStudentCode.trim().toLowerCase()) || null;
      }

      let subjectId = record.subjectId;
      if (!subjectId && record.rawSubject) {
        subjectId = resolveSubjectMatch(record.rawSubject, subjects, subjectAliases);
      }

      let competencyId = record.competencyId;
      if (!competencyId && subjectId && record.rawCompetency) {
        competencyId = resolveCompetencyMatch(subjectId, record.rawCompetency, competencies, compAliases);
      }

      if (competencyId) resolvedComps++;

      if (studentId && subjectId && competencyId) {
        validStagingRecords.push({
          ...record,
          studentId,
          subjectId,
          competencyId
        });
      }
    }
    console.log(`Processed ${Math.min(offset + STAGING_CHUNK, totalStaging)} / ${totalStaging}... (Resolved valid: ${validStagingRecords.length})`);
  }

  console.log(`Total valid evaluation records across ALL subjects: ${validStagingRecords.length}`);

  // Group by Student + Subject + Competency
  const studentCompGroupMap = new Map();
  for (const record of validStagingRecords) {
    const compKey = record.studentId + "_" + record.subjectId + "_" + record.competencyId;
    if (!studentCompGroupMap.has(compKey)) {
      studentCompGroupMap.set(compKey, []);
    }
    studentCompGroupMap.get(compKey).push(record);
  }

  const assessmentRecordsToInsert = [];
  const studentSubjectMap = new Map();

  for (const [compKey, records] of Array.from(studentCompGroupMap.entries())) {
    const first = records[0];
    let finalPercent = null;
    let finalAchieved = null;
    let finalMax = null;
    let finalSource = first.calculationSource || "LEGACY_IMPORTED";

    const validPercents = records.map(r => r.competencyPercent).filter(p => p !== null && p !== undefined);
    if (validPercents.length > 0) {
      const sum = validPercents.reduce((a, b) => a + b, 0);
      finalPercent = Math.round((sum / validPercents.length) * 100) / 100;
    }

    const validAchieved = records.map(r => r.achievedScore).filter(s => s !== null);
    const validMax = records.map(r => r.maxScore).filter(s => s !== null);
    if (validAchieved.length > 0 && validMax.length > 0) {
      finalAchieved = Math.round((validAchieved.reduce((a, b) => a + b, 0) / validAchieved.length) * 100) / 100;
      finalMax = Math.round((validMax.reduce((a, b) => a + b, 0) / validMax.length) * 100) / 100;
    }

    if (records.length > 1) {
      finalSource = "AVERAGED_COMPONENTS";
    }

    assessmentRecordsToInsert.push({
      id: crypto.randomUUID(),
      batchId: batch.id,
      studentId: first.studentId,
      subjectId: first.subjectId,
      competencyId: first.competencyId,
      academicYearId: batch.academicYearId,
      semester: batch.semester,
      assessmentPeriod: batch.assessmentPeriod,
      achievedScore: finalAchieved,
      maxScore: finalMax,
      competencyPercent: finalPercent !== null ? finalPercent : 0,
      calculationSource: finalSource,
    });

    const subjectGroupKey = first.studentId + "_" + first.subjectId;
    if (!studentSubjectMap.has(subjectGroupKey)) {
      studentSubjectMap.set(subjectGroupKey, []);
    }
    studentSubjectMap.get(subjectGroupKey).push({
      competencyId: first.competencyId,
      competencyPercent: finalPercent,
      achievedScore: finalAchieved,
      maxScore: finalMax,
      calculationSource: finalSource,
    });
  }

  console.log(`Unique assessments to insert: ${assessmentRecordsToInsert.length}`);

  // Summaries
  const summariesToInsert = [];
  for (const [groupKey, assessments] of Array.from(studentSubjectMap.entries())) {
    const [studentId, subjectId] = groupKey.split("_");
    const subjectComps = competencies.filter(c => c.subjectId === subjectId);
    const summary = synthesizeSubjectSummary(subjectComps, assessments);

    summariesToInsert.push({
      id: crypto.randomUUID(),
      studentId,
      subjectId,
      academicYearId: batch.academicYearId,
      semester: batch.semester,
      assessmentPeriod: batch.assessmentPeriod,
      subjectScore: summary.subjectScore,
      evaluatedCount: summary.evaluatedCount,
      totalCompetencies: summary.totalCompetencies,
      radarData: JSON.stringify(summary.radarData),
    });
  }

  console.log(`Total Subject Summaries to insert (all subjects): ${summariesToInsert.length}`);

  // Execute Bulk Insert
  console.log("Clearing previous assessments for this batch and inserting full multi-subject radar data...");
  await prisma.studentCompetencyAssessment.deleteMany({
    where: { academicYearId: batch.academicYearId, assessmentPeriod: batch.assessmentPeriod }
  });
  await prisma.studentSubjectCompetencySummary.deleteMany({
    where: { academicYearId: batch.academicYearId, assessmentPeriod: batch.assessmentPeriod }
  });

  const BATCH_SIZE = 1500;
  for (let i = 0; i < assessmentRecordsToInsert.length; i += BATCH_SIZE) {
    const chunk = assessmentRecordsToInsert.slice(i, i + BATCH_SIZE);
    await prisma.studentCompetencyAssessment.createMany({ data: chunk });
    console.log(`Inserted assessments ${Math.min(i + BATCH_SIZE, assessmentRecordsToInsert.length)} / ${assessmentRecordsToInsert.length}`);
  }

  for (let i = 0; i < summariesToInsert.length; i += BATCH_SIZE) {
    const chunk = summariesToInsert.slice(i, i + BATCH_SIZE);
    await prisma.studentSubjectCompetencySummary.createMany({ data: chunk });
    console.log(`Inserted summaries ${Math.min(i + BATCH_SIZE, summariesToInsert.length)} / ${summariesToInsert.length}`);
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMMITTED",
      validRows: assessmentRecordsToInsert.length
    }
  });

  console.log("=== ALL SUBJECTS RADAR DATA CREATED SUCCESSFULLY! ===");
}

reprocessAll().catch(console.error).finally(() => prisma.$disconnect());
