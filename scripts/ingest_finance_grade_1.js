const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const EXCEL_PATH = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH_1S.xlsx');
const MAPPING_JSON_PATH = path.resolve(__dirname, '../src/lib/special-subjects/tc01s-mapping.json');
const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";
const ACADEMIC_YEAR_ID = 'cmnseevbh0000wjbmoigji2zd';

console.log('Reading Excel file:', EXCEL_PATH);
const wb = xlsx.readFile(EXCEL_PATH, { cellFormula: true, cellNF: true, cellText: true });

function getCellInfo(ws, rZero, cZero) {
  const addr = xlsx.utils.encode_cell({ r: rZero, c: cZero });
  const cell = ws[addr];
  if (!cell) return { text: '', raw: null, error: null, formula: null };
  const isError = cell.t === 'e' || (typeof cell.w === 'string' && (cell.w.startsWith('#REF!') || cell.w.startsWith('#VALUE!')));
  const text = cell.w != null ? String(cell.w).trim() : (cell.v != null ? String(cell.v).trim() : '');
  return {
    text,
    raw: cell.v ?? null,
    error: isError ? (cell.w || String(cell.v)) : null,
    formula: cell.f || null
  };
}

function normalizeTopicDisplayName(rawName) {
  // Normalize "Chủ đề 2: Chi tiêu thông minh" -> "Chủ đề 2. Chi tiêu thông minh" while preserving rawTopicName
  return String(rawName || '')
    .trim()
    .replace(/^Chủ đề\s*(\d+)\s*:\s*/i, 'Chủ đề $1. ');
}

function parseGrade1Sheet() {
  const sheetName = wb.SheetNames.find(n => n.toUpperCase().includes('1S')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Sheet KHỐI 1S not found in Excel!');

  const range = xlsx.utils.decode_range(ws['!ref']);
  const topicsMap = new Map();
  const records = [];
  const rowAnomalies = [];

  let currentTopicRawName = '';
  let currentTopicDisplayName = '';
  let currentTopicIndex = 0;
  let currentTopicCode = '';
  let currentTopicId = '';

  let currentLessonRawName = '';
  let currentLessonIndex = 0;
  let currentLessonCode = '';
  let currentLessonId = '';

  let criteriaCounter = 0;
  const competencyCounts = { 'Hiểu': 0, 'Biết': 0, 'Vận dụng': 0 };
  const levelCounts = { 'Mức 1': 0, 'Mức 2': 0, 'Mức 3': 0 };

  // Data rows start at row index 3 (Excel row 4)
  for (let r = 3; r <= range.e.r; r++) {
    const excelRow = r + 1;
    // Columns in KHỐI 1S:
    // B (c=1): Chủ đề
    // C (c=2): Bài học
    // D (c=3): Mô tả tiêu chuẩn
    // E (c=4): Mức
    // F (c=5): Mã tiêu chuẩn
    // G (c=6): Văn bản hướng dẫn
    // H (c=7): Hiểu
    // I (c=8): Biết
    // J (c=9): Vận dụng
    // P (c=15): MÃ CHỦ ĐỀ
    // Q (c=16): MÃ BÀI HỌC
    const cTopic = getCellInfo(ws, r, 1);
    const cLesson = getCellInfo(ws, r, 2);
    const cDesc = getCellInfo(ws, r, 3);
    const cMuc = getCellInfo(ws, r, 4);
    const cStdCode = getCellInfo(ws, r, 5);
    const cGuide = getCellInfo(ws, r, 6);
    const cHieu = getCellInfo(ws, r, 7);
    const cBiet = getCellInfo(ws, r, 8);
    const cVanDung = getCellInfo(ws, r, 9);
    const cRawTopicCode = getCellInfo(ws, r, 15);
    const cRawLessonCode = getCellInfo(ws, r, 16);

    if (!cStdCode.text && !cDesc.text) continue;

    // Inherit merged/blank topic from group above
    if (cTopic.text) {
      currentTopicIndex++;
      currentTopicRawName = cTopic.text;
      currentTopicDisplayName = normalizeTopicDisplayName(cTopic.text);
      currentTopicCode = `TC01S.${String(currentTopicIndex).padStart(2, '0')}`;
      currentTopicId = `top_fin_g1_${currentTopicIndex}`;

      topicsMap.set(currentTopicCode, {
        topicIndex: currentTopicIndex,
        topicId: currentTopicId,
        topicCode: currentTopicCode,
        rawTopicName: currentTopicRawName,
        topicName: currentTopicDisplayName,
        lessons: new Map()
      });
    }

    // Inherit merged/blank lesson from group above
    if (cLesson.text) {
      currentLessonIndex++;
      currentLessonRawName = cLesson.text;
      currentLessonCode = `${currentTopicCode}.${String(currentLessonIndex).padStart(4, '0')}`;
      currentLessonId = `les_fin_g1_p${String(currentLessonIndex).padStart(2, '0')}`;

      const tObj = topicsMap.get(currentTopicCode);
      tObj.lessons.set(currentLessonCode, {
        lessonIndex: currentLessonIndex,
        lessonId: currentLessonId,
        lessonCode: currentLessonCode,
        lessonName: currentLessonRawName,
        topicId: currentTopicId,
        topicCode: currentTopicCode,
        isProject: currentLessonRawName.toLowerCase().includes('dự án') || currentLessonRawName.toLowerCase().includes('nhà quản lí tài chính nhí'),
        criteria: []
      });
    }

    criteriaCounter++;
    const sourceCode = cStdCode.text || `TC01S.01.0001.${String(criteriaCounter).padStart(2, '0')}`;
    const criterionId = `crit_fin_g1_${sourceCode.replace(/\./g, '_')}`;

    // Competency marks
    const compList = [];
    if (cHieu.text.toLowerCase() === 'x') compList.push('Hiểu');
    if (cBiet.text.toLowerCase() === 'x') compList.push('Biết');
    if (cVanDung.text.toLowerCase() === 'x') compList.push('Vận dụng');

    const competencyGroup = compList.length > 0 ? compList.join(', ') : 'Chưa gắn năng lực';
    if (competencyCounts[competencyGroup] !== undefined) {
      competencyCounts[competencyGroup]++;
    }
    if (levelCounts[cMuc.text] !== undefined) {
      levelCounts[cMuc.text]++;
    }

    // Detect row-level source anomalies
    const itemAnomalies = [];
    if (cRawTopicCode.error || cRawTopicCode.text.startsWith('#')) {
      itemAnomalies.push({
        type: 'TOPIC_CODE_FORMULA_ERROR',
        column: 'P (MÃ CHỦ ĐỀ)',
        rawValue: cRawTopicCode.text,
        resolvedValue: currentTopicCode,
        note: `Ô P${excelRow} bị lỗi công thức ${cRawTopicCode.text}; khôi phục theo nhóm chủ đề phía trên thành ${currentTopicCode} (${currentTopicId}).`
      });
    } else if (cRawTopicCode.text && cRawTopicCode.text !== currentTopicCode) {
      itemAnomalies.push({
        type: 'TOPIC_CODE_REPEATED',
        column: 'P (MÃ CHỦ ĐỀ)',
        rawValue: cRawTopicCode.text,
        resolvedValue: currentTopicCode,
        note: `Ô P${excelRow} đang lặp mã ${cRawTopicCode.text} cho ${currentTopicDisplayName}; chuẩn hóa mã chủ đề thành ${currentTopicCode} (${currentTopicId}).`
      });
    }

    if (cRawLessonCode.error || cRawLessonCode.text.startsWith('#')) {
      itemAnomalies.push({
        type: 'LESSON_CODE_FORMULA_ERROR',
        column: 'Q (MÃ BÀI HỌC)',
        rawValue: cRawLessonCode.text,
        resolvedValue: currentLessonCode,
        note: `Ô Q${excelRow} bị lỗi công thức ${cRawLessonCode.text}; khôi phục theo bài học "${currentLessonRawName}" thành ${currentLessonCode} (${currentLessonId}).`
      });
    } else if (cRawLessonCode.text && cRawLessonCode.text !== currentLessonCode) {
      itemAnomalies.push({
        type: 'LESSON_CODE_TOPIC_PREFIX',
        column: 'Q (MÃ BÀI HỌC)',
        rawValue: cRawLessonCode.text,
        resolvedValue: currentLessonCode,
        note: `Ô Q${excelRow} ghi ${cRawLessonCode.text} (kế thừa mã chủ đề lặp TC01S.01); ánh xạ sang mã chuẩn ${currentLessonCode} (${currentLessonId}).`
      });
    }

    // Check criterion code prefix vs lesson index
    if (currentLessonIndex > 1 && sourceCode.startsWith('TC01S.01.0001.')) {
      itemAnomalies.push({
        type: 'CRITERION_CODE_STATIC_LESSON_SEGMENT',
        column: 'F (Mã tiêu chuẩn)',
        rawValue: sourceCode,
        resolvedValue: `${currentLessonId} -> ${criterionId}`,
        note: `Mã tiêu chuẩn ${sourceCode} giữ cố định cụm .01.0001. của Bài 1 nhưng thuộc "${currentLessonRawName}"; giữ nguyên mã hiển thị nguồn và liên kết bằng khóa nội bộ ${criterionId} -> ${currentLessonId}.`
      });
    }

    // Check Mức vs Năng lực consistency (Mức 1 <-> Hiểu, Mức 2 <-> Biết, Mức 3 <-> Vận dụng)
    const expectedCompetencyByMuc = {
      'Mức 1': 'Hiểu',
      'Mức 2': 'Biết',
      'Mức 3': 'Vận dụng'
    };
    const expectedComp = expectedCompetencyByMuc[cMuc.text];
    if (expectedComp && competencyGroup !== expectedComp) {
      itemAnomalies.push({
        type: 'LEVEL_COMPETENCY_MISMATCH',
        column: 'E (Mức) & H-J (Năng lực)',
        rawValue: `${cMuc.text} / Năng lực: ${competencyGroup}`,
        resolvedValue: `Giữ nguyên nguồn (${cMuc.text} + ${competencyGroup}) — Cần rà soát chuyên môn`,
        note: `Dòng ${excelRow} (${currentLessonRawName}, mã ${sourceCode}): Cột Mức ghi "${cMuc.text}" nhưng đánh dấu x tại cột "${competencyGroup}". Đã giữ nguyên dữ liệu gốc và đưa vào danh sách cần rà soát.`
      });
    }

    if (itemAnomalies.length > 0) {
      rowAnomalies.push({
        excelRow,
        criterionCode: sourceCode,
        topicName: currentTopicDisplayName,
        lessonName: currentLessonRawName,
        anomalies: itemAnomalies
      });
    }

    const critItem = {
      criterionIndex: criteriaCounter,
      criterionId,
      sourceCode,
      description: cDesc.text,
      programLevel: cMuc.text,
      competencyGroup,
      guideDoc: cGuide.text || null,
      rawTopicName: currentTopicRawName,
      rawTopicCode: cRawTopicCode.text,
      rawLessonName: currentLessonRawName,
      rawLessonCode: cRawLessonCode.text,
      rawMarks: {
        hieu: cHieu.text || '',
        biet: cBiet.text || '',
        vanDung: cVanDung.text || ''
      },
      excelRow,
      anomalies: itemAnomalies
    };

    topicsMap.get(currentTopicCode).lessons.get(currentLessonCode).criteria.push(critItem);

    records.push({
      excelRow,
      criterionIndex: criteriaCounter,
      rawTopicName: currentTopicRawName,
      rawTopicCode: cRawTopicCode.text,
      rawLessonName: currentLessonRawName,
      rawLessonCode: cRawLessonCode.text,
      rawCriterionCode: sourceCode,
      rawLevel: cMuc.text,
      rawMarks: critItem.rawMarks,
      description: cDesc.text,
      normalizedTopicId: currentTopicId,
      normalizedTopicCode: currentTopicCode,
      normalizedTopicName: currentTopicDisplayName,
      normalizedLessonId: currentLessonId,
      normalizedLessonCode: currentLessonCode,
      normalizedLessonName: currentLessonRawName,
      lessonIndex: currentLessonIndex,
      normalizedCriterionId: criterionId,
      competencyGroup,
      programLevel: cMuc.text,
      hasLevelCompetencyMismatch: Boolean(expectedComp && competencyGroup !== expectedComp),
      anomalies: itemAnomalies
    });
  }

  return {
    sheetName,
    topicsMap,
    records,
    rowAnomalies,
    summary: {
      topicsCount: topicsMap.size,
      lessonsCount: currentLessonIndex,
      criteriaCount: criteriaCounter,
      competencyCounts,
      levelCounts
    }
  };
}

const parsedGrade1 = parseGrade1Sheet();
console.log('=== SUMMARY FOR GRADE 1S (TC01S) ===');
console.log(JSON.stringify(parsedGrade1.summary, null, 2));

// Build structured mapping & reconciliation report JSON
const mappingReport = {
  programCode: 'TC01S',
  sheetName: parsedGrade1.sheetName,
  subjectCode: 'FIN_EDU',
  subjectName: 'Giáo dục Tài chính cá nhân',
  grade: '1',
  educationSystem: 'HNS',
  educationSystemLabel: 'Hệ đào tạo S (Sky-Line Chuẩn / Hội nhập S)',
  versionId: 'spec_ver_fin_v1_0',
  versionCode: 'v1.0',
  durationConfigured: false,
  durationNote: 'Chưa có dữ liệu thời lượng, tuần hoặc học kỳ trong file nguồn KHỐI 1S; không tự quy đổi 15 bài học thành 15 tiết.',
  generatedAt: new Date().toISOString(),
  summary: parsedGrade1.summary,
  anomalyCategories: [
    {
      code: 'LESSON_CODE_FORMULA_ERROR_REF',
      severity: 'WARNING',
      title: 'Lỗi công thức #REF! tại cột Mã bài học (Cột Q) và Mã chủ đề (Cột P)',
      affectedRows: [9, 11, 38, 49],
      rawValues: ['Q9: #REF!', 'Q11: #REF!', 'Q38: #REF!', 'P49: #REF!', 'Q49: #REF!'],
      resolution: 'Lưu nguyên giá trị #REF! trong bảng đối chiếu nguồn; khôi phục quan hệ Chủ đề/Bài học từ vị trí nhóm ô gộp phía trên (Bài 2, Bài 12, Bài 15) và liên kết bằng ID nội bộ ổn định (les_fin_g1_p02, les_fin_g1_p12, les_fin_g1_p15). Không dùng #REF! làm khóa liên kết.'
    },
    {
      code: 'LESSON_CODE_FORMULA_ERROR_VALUE',
      severity: 'WARNING',
      title: 'Lỗi công thức #VALUE! tại cột Mã bài học (Cột Q) của Bài 5',
      affectedRows: [18, 19, 20],
      rawValues: ['Q18: #VALUE!', 'Q19: #VALUE!', 'Q20: #VALUE!'],
      resolution: 'Toàn bộ 3 dòng của Bài 5 ("5. Điều em cần hay em muốn?") bị lỗi #VALUE! ở Cột Q do tiêu đề Chủ đề 2 dùng dấu hai chấm ("Chủ đề 2: Chi tiêu thông minh"). Khôi phục quan hệ bài học từ tên bài tại Cột C, chuẩn hóa mã bài thành TC01S.02.0005 và gắn khóa nội bộ les_fin_g1_p05.'
    },
    {
      code: 'TOPIC_CODE_REPEATED_TC01S_01',
      severity: 'INFO',
      title: 'Cột Mã chủ đề (Cột P) lặp mã TC01S.01 cho nhiều chủ đề',
      affectedRows: Array.from({ length: 31 }, (_, idx) => idx + 18),
      rawValues: ['P18..P48: TC01S.01 (dù thuộc Chủ đề 2, 3, 4)'],
      resolution: 'Lưu nguyên mã nguồn TC01S.01 để đối chiếu; chuẩn hóa mã chủ đề hệ thống theo thứ tự 4 chủ đề thành TC01S.01, TC01S.02, TC01S.03, TC01S.04 (top_fin_g1_1 .. top_fin_g1_4).'
    },
    {
      code: 'CRITERION_CODE_STATIC_GROUP_PREFIX',
      severity: 'INFO',
      title: 'Mã tiêu chuẩn (Cột F) giữ cố định cụm .01.0001. cho tất cả 15 bài học',
      affectedRows: Array.from({ length: 42 }, (_, idx) => idx + 8),
      rawValues: ['TC01S.01.0001.05 .. TC01S.01.0001.46'],
      resolution: 'Giữ nguyên mã tiêu chuẩn nguồn (TC01S.01.0001.01 .. TC01S.01.0001.46) để hiển thị và đối chiếu với file Excel; sử dụng khóa ngoại lessonId (les_fin_g1_p01 .. les_fin_g1_p15) để liên kết chính xác từng tiêu chuẩn vào đúng bài học và chủ đề.'
    },
    {
      code: 'LEVEL_COMPETENCY_MISMATCH_ROW_28',
      severity: 'REVIEW_REQUIRED',
      title: 'Cần rà soát chuyên môn: Bài 8 "8. Siêu thị tí hon" (TC01S.01.0001.25) ghi Mức 2 nhưng đánh dấu tại cột Vận dụng',
      affectedRows: [28],
      rawValues: ['Dòng 28 — Cột E (Mức): Mức 2 | Cột J (Vận dụng): x'],
      resolution: 'Giữ nguyên Mức = "Mức 2" và Năng lực = "Vận dụng" đúng theo file nguồn (không tự ý đổi thành Mức 3 hoặc chuyển sang cột Biết khi chưa có xác nhận chuyên môn). Hiển thị cảnh báo trong danh sách cần rà soát trên giao diện Khung chương trình & Giám sát.'
    }
  ],
  topics: Array.from(parsedGrade1.topicsMap.values()).map(t => ({
    topicIndex: t.topicIndex,
    topicId: t.topicId,
    topicCode: t.topicCode,
    rawTopicName: t.rawTopicName,
    topicName: t.topicName,
    lessonsCount: t.lessons.size,
    criteriaCount: Array.from(t.lessons.values()).reduce((sum, l) => sum + l.criteria.length, 0),
    lessons: Array.from(t.lessons.values()).map(l => ({
      lessonIndex: l.lessonIndex,
      lessonId: l.lessonId,
      lessonCode: l.lessonCode,
      lessonName: l.lessonName,
      criteriaCount: l.criteria.length,
      criteriaCodes: l.criteria.map(c => c.sourceCode)
    }))
  })),
  records: parsedGrade1.records
};

fs.mkdirSync(path.dirname(MAPPING_JSON_PATH), { recursive: true });
fs.writeFileSync(MAPPING_JSON_PATH, JSON.stringify(mappingReport, null, 2), 'utf8');
console.log('Saved mapping & reconciliation report to:', MAPPING_JSON_PATH);

async function ingestGrade1OnClient(client, parsed, dbName) {
  const versionId = 'spec_ver_fin_v1_0';
  const grade = '1';
  const gradeConfigId = `spec_cfg_fin_g${grade}`;

  console.log(`\n[${dbName}] Starting idempotent Grade ${grade} (TC01S) ingestion...`);

  // 1. Upsert SpecialSubjectGradeConfig for Grade 1
  // Note: totalPeriods = 0 and periodMinutes = 0 represent "Chưa cấu hình thời lượng / số tiết"
  // while preserving non-null integer constraints in Prisma.
  await client.execute({
    sql: `INSERT INTO "SpecialSubjectGradeConfig" (id, versionId, grade, totalPeriods, periodMinutes, overallGoal, evalCycle, evalScaleType, summaryFormula, isLocked, createdAt, updatedAt)
          VALUES (?, ?, ?, 0, 0, ?, 'PER_LESSON', 'TOT_HOAN_THANH_CAN_CO_GANG', 'MOST_FREQUENT', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(versionId, grade) DO UPDATE SET
            totalPeriods = 0,
            periodMinutes = 0,
            overallGoal = excluded.overallGoal,
            evalCycle = 'PER_LESSON',
            evalScaleType = 'TOT_HOAN_THANH_CAN_CO_GANG',
            summaryFormula = 'MOST_FREQUENT',
            updatedAt = CURRENT_TIMESTAMP;`,
    args: [
      gradeConfigId,
      versionId,
      grade,
      `Chương trình Giáo dục Tài chính cá nhân Khối 1 - Hệ đào tạo S (Mã chương trình: TC01S, sheet nguồn: KHỐI 1S): Gồm 4 chủ đề, 15 bài học và 46 tiêu chuẩn đánh giá giúp học sinh làm quen với đồng tiền, chi tiêu thông minh, tiết kiệm mỗi ngày và bước đầu làm chủ đồng tiền.`
    ]
  });

  // 2. Upsert 4 SpecialTopic records using ON CONFLICT(id) DO UPDATE
  const validTopicIds = [];
  const validLessonIds = [];
  const validCriterionIds = [];

  for (const [, tObj] of parsed.topicsMap.entries()) {
    validTopicIds.push(tObj.topicId);

    // Clear any conflicting (versionId, grade, code) on obsolete topic IDs before upserting
    await client.execute({
      sql: `DELETE FROM "SpecialTopic" WHERE versionId = ? AND grade = ? AND code = ? AND id != ?;`,
      args: [versionId, grade, tObj.topicCode, tObj.topicId]
    });

    await client.execute({
      sql: `INSERT INTO "SpecialTopic" (id, versionId, grade, code, name, sortOrder, description, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              versionId = excluded.versionId,
              grade = excluded.grade,
              code = excluded.code,
              name = excluded.name,
              sortOrder = excluded.sortOrder,
              description = excluded.description,
              updatedAt = CURRENT_TIMESTAMP;`,
      args: [
        tObj.topicId,
        versionId,
        grade,
        tObj.topicCode,
        tObj.topicName,
        tObj.topicIndex,
        `Nguồn KHỐI 1S (${tObj.rawTopicName}) — Mã chuẩn: ${tObj.topicCode}`
      ]
    });

    // 3. Upsert 15 SpecialLesson records IN-PLACE (preserving existing SpecialGradeEntry FKs!)
    for (const [, lObj] of tObj.lessons.entries()) {
      validLessonIds.push(lObj.lessonId);
      const objectives = `${tObj.topicName} - ${lObj.lessonName} (${lObj.criteria.length} tiêu chuẩn đánh giá)`;
      const requirements = lObj.criteria.map(c => c.description).join('; ');

      await client.execute({
        sql: `INSERT INTO "SpecialLesson" (id, versionId, topicId, grade, periodIndex, lessonName, objectives, requirements, isProject, projectMinPeriods, status, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                versionId = excluded.versionId,
                topicId = excluded.topicId,
                grade = excluded.grade,
                periodIndex = excluded.periodIndex,
                lessonName = excluded.lessonName,
                objectives = excluded.objectives,
                requirements = excluded.requirements,
                isProject = excluded.isProject,
                projectMinPeriods = excluded.projectMinPeriods,
                status = 'ACTIVE',
                updatedAt = CURRENT_TIMESTAMP;`,
        args: [
          lObj.lessonId,
          versionId,
          tObj.topicId,
          grade,
          lObj.lessonIndex,
          lObj.lessonName,
          objectives,
          requirements,
          lObj.isProject ? 1 : 0
        ]
      });

      // 4. Upsert 46 SpecialAssessmentCriterion records & their 3 SpecialRubricLevel records
      for (const crit of lObj.criteria) {
        validCriterionIds.push(crit.criterionId);

        await client.execute({
          sql: `INSERT INTO "SpecialAssessmentCriterion" (id, gradeConfigId, lessonId, competencyGroup, programLevel, code, name, description, weight, sortOrder, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                  gradeConfigId = excluded.gradeConfigId,
                  lessonId = excluded.lessonId,
                  competencyGroup = excluded.competencyGroup,
                  programLevel = excluded.programLevel,
                  code = excluded.code,
                  name = excluded.name,
                  description = excluded.description,
                  weight = excluded.weight,
                  sortOrder = excluded.sortOrder,
                  updatedAt = CURRENT_TIMESTAMP;`,
          args: [
            crit.criterionId,
            gradeConfigId,
            lObj.lessonId,
            crit.competencyGroup,
            crit.programLevel || null,
            crit.sourceCode,
            crit.description.slice(0, 100),
            crit.description,
            crit.criterionIndex
          ]
        });

        // Upsert 3 Rubric Levels: TOT (3), DAT (2), CAN_CO_GANG (1)
        const rubrics = [
          { suffix: 'TOT', code: 'TOT', name: 'Tốt', desc: 'Hoàn thành tốt tiêu chí', val: 3, sort: 1 },
          { suffix: 'DAT', code: 'DAT', name: 'Đạt', desc: 'Hoàn thành tiêu chí', val: 2, sort: 2 },
          { suffix: 'CCG', code: 'CAN_CO_GANG', name: 'Cần cố gắng', desc: 'Cần cố gắng thêm', val: 1, sort: 3 }
        ];
        for (const rLevel of rubrics) {
          await client.execute({
            sql: `INSERT INTO "SpecialRubricLevel" (id, criterionId, levelCode, levelName, description, numericValue, sortOrder, createdAt, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT(id) DO UPDATE SET
                    criterionId = excluded.criterionId,
                    levelCode = excluded.levelCode,
                    levelName = excluded.levelName,
                    description = excluded.description,
                    numericValue = excluded.numericValue,
                    sortOrder = excluded.sortOrder,
                    updatedAt = CURRENT_TIMESTAMP;`,
            args: [
              `rub_${crit.criterionId}_${rLevel.suffix}`,
              crit.criterionId,
              rLevel.code,
              rLevel.name,
              rLevel.desc,
              rLevel.val,
              rLevel.sort
            ]
          });
        }
      }
    }
  }

  // 5. Remove obsolete placeholder topics for Grade 1 (e.g., topic_g1_1 .. topic_g1_5) now that lessons point to top_fin_g1_1..4
  if (validTopicIds.length > 0) {
    const placeholders = validTopicIds.map(() => '?').join(', ');
    await client.execute({
      sql: `DELETE FROM "SpecialTopic" WHERE versionId = ? AND grade = ? AND id NOT IN (${placeholders});`,
      args: [versionId, grade, ...validTopicIds]
    });
  }

  // 6. Remove any stale criteria for Grade 1 that are not in validCriterionIds
  if (validCriterionIds.length > 0) {
    const placeholders = validCriterionIds.map(() => '?').join(', ');
    await client.execute({
      sql: `DELETE FROM "SpecialAssessmentCriterion" WHERE gradeConfigId = ? AND id NOT IN (${placeholders});`,
      args: [gradeConfigId, ...validCriterionIds]
    });
  }

  console.log(`✓ [${dbName}] Grade ${grade} (TC01S) complete: ${validTopicIds.length} topics, ${validLessonIds.length} lessons, ${validCriterionIds.length} criteria, ${validCriterionIds.length * 3} rubrics.`);
}

async function syncGrade1Assignments(client, dbName) {
  console.log(`\n[${dbName}] Syncing FIN_EDU assignments for Grade 1 Hệ đào tạo S (HNS) classes...`);
  const allGrade1Classes = await client.execute({
    sql: `SELECT id, className, grade, campusId, educationSystem, homeroomTeacherId 
          FROM "Class" 
          WHERE status = 'ACTIVE' 
            AND academicYearId = ?
            AND grade IN ('1', 1);`,
    args: [ACADEMIC_YEAR_ID]
  });

  let assignedSCount = 0;
  for (const cls of allGrade1Classes.rows) {
    const classId = String(cls.id);
    const eduSys = String(cls.educationSystem || 'HNS').toUpperCase();
    const isSystemS = eduSys === 'HNS' || eduSys === 'S';

    if (isSystemS && cls.homeroomTeacherId) {
      const teacherId = String(cls.homeroomTeacherId);
      const assignmentId = `assign_fin_${classId}_${teacherId}_1`;
      await client.execute({
        sql: `INSERT INTO "SpecialTeachingAssignment" (id, subjectId, teacherId, classId, academicYearId, semester, isLeadTeacher, status, createdAt, updatedAt)
              VALUES (?, 'spec_sub_fin_edu', ?, ?, ?, 1, 1, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(subjectId, teacherId, classId, academicYearId, semester) DO UPDATE SET
                status = 'ACTIVE',
                isLeadTeacher = 1,
                updatedAt = CURRENT_TIMESTAMP;`,
        args: [assignmentId, teacherId, classId, ACADEMIC_YEAR_ID]
      });
      assignedSCount++;
    } else if (!isSystemS) {
      // Check if non-S class has any grade entries; if 0 grade entries, mark auto-created assignment INACTIVE
      // per Requirement 2: "Gán chương trình đúng hệ đào tạo S theo cấu hình hệ thống. Không tự động áp dụng cho hệ khác khi chưa có chương trình tương ứng."
      const existingAssigns = await client.execute({
        sql: `SELECT a.id, (SELECT COUNT(*) FROM "SpecialGradeEntry" g WHERE g.assignmentId = a.id) as entryCount
              FROM "SpecialTeachingAssignment" a
              WHERE a.subjectId = 'spec_sub_fin_edu' AND a.classId = ? AND a.academicYearId = ? AND a.status = 'ACTIVE';`,
        args: [classId, ACADEMIC_YEAR_ID]
      });
      for (const aRow of existingAssigns.rows) {
        if (Number(aRow.entryCount) === 0) {
          await client.execute({
            sql: `UPDATE "SpecialTeachingAssignment" SET status = 'INACTIVE', updatedAt = CURRENT_TIMESTAMP WHERE id = ?;`,
            args: [String(aRow.id)]
          });
          console.log(`  - Deactivated auto-assignment on non-S class ${cls.className} (educationSystem=${eduSys}, 0 entries)`);
        }
      }
    }
  }
  console.log(`✓ [${dbName}] Verified FIN_EDU assignments for ${assignedSCount} active Grade 1 Hệ S (HNS) classes.`);
}

async function runOnClient(client, dbName) {
  console.log(`\n=================== PROCESSING ${dbName} ===================`);
  await ingestGrade1OnClient(client, parsedGrade1, dbName);
  await syncGrade1Assignments(client, dbName);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await runOnClient(localClient, 'LOCAL SQLite');

  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await runOnClient(cloudClient, 'TURSO Cloud');
  } catch (err) {
    console.warn('Turso Cloud Error:', err.stack || err);
  }
}

main().catch(console.error);
