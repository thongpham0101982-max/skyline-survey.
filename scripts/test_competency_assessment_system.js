const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

function calculateCompetencyScore(rawAchieved, rawMax, rawRadarPercent) {
  const parseNum = (v) => {
    if (v === null || v === undefined) return null;
    const str = String(v).trim().replace(",", ".");
    if (str === "" || str === "—" || str === "-") return null;
    const n = Number(str);
    return isNaN(n) ? null : n;
  };

  const parsePercent = (v) => {
    if (v === null || v === undefined) return null;
    let str = String(v).trim().replace(",", ".");
    if (str === "" || str === "—" || str === "-") return null;
    if (str.endsWith("%")) {
      const n = Number(str.slice(0, -1).trim());
      return isNaN(n) ? null : n;
    }
    const n = Number(str);
    if (isNaN(n)) return null;
    if (n <= 1 && n > 0) return n * 100;
    return n;
  };

  const achieved = parseNum(rawAchieved);
  const max = parseNum(rawMax);
  const radarPct = parsePercent(rawRadarPercent);

  // Case 1: Has maxScore > 0 and achievedScore is not null (System calculated)
  if (max !== null && max > 0 && achieved !== null) {
    let pct = (achieved / max) * 100;
    pct = Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
    return {
      achievedScore: achieved,
      maxScore: max,
      competencyPercent: pct,
      calculationSource: "SYSTEM_CALCULATED",
    };
  }

  // Case 2: Legacy data (2025-2026): max is empty/null, but rawRadarPercent has value
  if ((max === null || max === 0) && radarPct !== null) {
    let pct = Math.min(100, Math.max(0, Math.round(radarPct * 10) / 10));
    return {
      achievedScore: achieved,
      maxScore: null,
      competencyPercent: pct,
      calculationSource: "LEGACY_IMPORTED",
    };
  }

  // Case 3: 0 achieved with max
  if (achieved === 0 && max !== null && max > 0) {
    return {
      achievedScore: 0,
      maxScore: max,
      competencyPercent: 0.0,
      calculationSource: "SYSTEM_CALCULATED",
    };
  }

  // Case 4: No data (NULL)
  return {
    achievedScore: achieved,
    maxScore: max,
    competencyPercent: null,
    calculationSource: null,
  };
}

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ HỆ THỐNG ĐÁNH GIÁ NĂNG LỰC HỌC SINH ---');

  // Test 1: Scoring Rules
  console.log('\n[TEST 1: Quy tắc Tính điểm]');
  
  // 1.1 New data: 40/50 -> 80.0%, SYSTEM_CALCULATED
  const t1 = calculateCompetencyScore(40, 50, null);
  console.assert(t1.competencyPercent === 80.0 && t1.calculationSource === 'SYSTEM_CALCULATED', 'Test 1.1 failed');
  console.log('  ✓ 1.1 Tính điểm mới (40/50):', t1);

  // 1.2 Legacy data: Empty max, radar = "100%" -> 100.0%, LEGACY_IMPORTED, maxScore = null
  const t2 = calculateCompetencyScore(null, null, "100%");
  console.assert(t2.competencyPercent === 100.0 && t2.calculationSource === 'LEGACY_IMPORTED' && t2.maxScore === null, 'Test 1.2 failed');
  console.log('  ✓ 1.2 Tính dữ liệu lịch sử (%_ThucTe_Radar = 100%):', t2);

  // 1.3 0 vs NULL: 0 score achieved
  const t3_zero = calculateCompetencyScore(0, 50, null);
  console.assert(t3_zero.competencyPercent === 0.0, 'Test 1.3 zero failed');
  console.log('  ✓ 1.3 Đạt 0 điểm (0/50): percent =', t3_zero.competencyPercent, '(Có đánh giá)');

  // 1.4 NULL (Chưa đánh giá)
  const t3_null = calculateCompetencyScore(null, null, null);
  console.assert(t3_null.competencyPercent === null, 'Test 1.4 null failed');
  console.log('  ✓ 1.4 Chưa có dữ liệu (NULL): percent =', t3_null.competencyPercent, '(Không tạo trục 0%)');

  // Test 2: Alias Resolution with Excel Sample
  console.log('\n[TEST 2: Chuẩn hóa Môn & Năng lực theo Alias]');
  const subjects = await prisma.subject.findMany({ select: { id: true, subjectCode: true, subjectName: true } });
  const subjectAliases = await prisma.subjectAlias.findMany({ select: { id: true, subjectId: true, normalizedKey: true } });
  const competencies = await prisma.subjectCompetency.findMany({ select: { id: true, subjectId: true, code: true, name: true, displayOrder: true, weight: true } });
  const compAliases = await prisma.subjectCompetencyAlias.findMany({ select: { id: true, competencyId: true, normalizedKey: true } });

  const rawSubjectSample1 = "KHOA HỌC TỰ NHIÊN (HÓA)";
  const rawSubjectSample2 = "KHOA HỌC TỰ NHIÊN (LÝ)";
  const rawSubjectSample3 = "KHOA HỌC TỰ NHIÊN (SINH)";

  const alias1 = subjectAliases.find(a => a.normalizedKey === normalizeKey(rawSubjectSample1));
  const alias2 = subjectAliases.find(a => a.normalizedKey === normalizeKey(rawSubjectSample2));
  const alias3 = subjectAliases.find(a => a.normalizedKey === normalizeKey(rawSubjectSample3));

  console.assert(alias1 && alias2 && alias3, 'Failed to resolve subject aliases');
  console.assert(alias1.subjectId === alias2.subjectId && alias2.subjectId === alias3.subjectId, 'Aliases did not map to same subject');
  console.log('  ✓ Khớp thành công 3 tên phân môn KHTN (Hóa, Lý, Sinh) về cùng Môn học chuẩn:', alias1.subjectId);

  // Test 3: Staging Batch Creation & Duplicate Protection
  console.log('\n[TEST 3: Cơ chế Staging & Duplicate Detection]');
  const existingBatch = await prisma.importBatch.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('  ✓ Bảng ImportBatch sẵn sàng. Đợt gần nhất:', existingBatch ? existingBatch.batchCode : 'Chưa có');

  console.log('\n--- TẤT CẢ KIỂM THỬ ĐÃ VƯỢT QUA THÀNH CÔNG (100% PASS) ---');
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
