import { describe, it, expect } from 'vitest';
import {
  SKYLINE_5_QUALITIES_CATALOG,
  IP21_OFFICIAL_CONFIG,
  calculateStudentQualityScoresFromRatings,
  aggregatePrideNpsFromRawResponses,
  isEligibleGrade4To12,
  isStudentInPeriodScope,
  buildAnonymousNpsTokenHash,
  CriteriaRatingMap,
  PrideNpsRawRecord,
} from '../src/lib/reflection-pride/catalog-and-engine';

describe('Sky-Line Reflection & Pride NPS - Pure Engine & Governance Rules', () => {
  it('1. Danh mục 5 phẩm chất chuẩn gồm 4 phẩm chất IP2.1 chính thức và 1 phẩm chất Tự hào Sky-Line mở rộng (14 tiêu chí)', () => {
    expect(SKYLINE_5_QUALITIES_CATALOG).toHaveLength(5);

    const officialQualities = SKYLINE_5_QUALITIES_CATALOG.filter((q) => q.includedInOfficialIp21);
    const extendedOnlyQualities = SKYLINE_5_QUALITIES_CATALOG.filter((q) => !q.includedInOfficialIp21);

    expect(officialQualities).toHaveLength(4);
    expect(extendedOnlyQualities).toHaveLength(1);
    expect(extendedOnlyQualities[0].code).toBe('PC5');

    const totalCriteria = SKYLINE_5_QUALITIES_CATALOG.reduce((acc, q) => acc + q.criteria.length, 0);
    expect(totalCriteria).toBe(14);
  });

  it('2. Công thức KPI IP2.1 chính thức: 4 phẩm chất, thang 16 điểm, ngưỡng đạt 72% (11.52/16), chỉ tiêu 90%, không bị thay đổi bởi phẩm chất thứ 5', () => {
    expect(IP21_OFFICIAL_CONFIG.maxScore).toBe(16);
    expect(IP21_OFFICIAL_CONFIG.studentPassThresholdPct).toBe(72);
    expect(IP21_OFFICIAL_CONFIG.schoolKpiTargetPct).toBe(90);

    // Giả lập học sinh đạt đúng mức 3.0 ở 4 phẩm chất đầu (12.0/16 = 75% >= 72%)
    // nhưng chọn mức 1.0 ở phẩm chất thứ 5 (Tự hào Sky-Line)
    const ratingsCaseA: CriteriaRatingMap = {
      'TC1.1': 3,
      'TC1.2': 3,
      'TC1.3': 3,
      'TC2.1': 3,
      'TC2.2': 3,
      'TC2.3': 3,
      'TC3.1': 3,
      'TC3.2': 3,
      'TC3.3': 3,
      'TC4.1': 3,
      'TC4.2': 3,
      'TC4.3': 3,
      // Phẩm chất thứ 5 = 1.0
      'TC5.1': 1,
      'TC5.2': 1,
    };

    const resA = calculateStudentQualityScoresFromRatings(ratingsCaseA);
    expect(resA.ip21TotalScore16).toBe(12);
    expect(resA.ip21Percentage).toBe(75);
    expect(resA.ip21Passed).toBe(true); // Vẫn đạt chuẩn IP2.1 (>= 72%)
    expect(resA.prideQualityScore4).toBe(1);
    expect(resA.extended5TotalScore20).toBe(13); // 12 + 1 = 13 / 20

    // Trường hợp ngược lại: 4 phẩm chất đầu chỉ đạt 2.5/4 (10.0/16 = 62.5% < 72%), dù PC5 đạt 4.0/4.0 vẫn KHÔNG đạt IP2.1
    const ratingsCaseB: CriteriaRatingMap = {
      'TC1.1': 2,
      'TC1.2': 3,
      'TC1.3': 2,
      'TC2.1': 2,
      'TC2.2': 3,
      'TC2.3': 2,
      'TC3.1': 3,
      'TC3.2': 2,
      'TC3.3': 3,
      'TC4.1': 3,
      'TC4.2': 2,
      'TC4.3': 3,
      'TC5.1': 4,
      'TC5.2': 4,
    };

    const resB = calculateStudentQualityScoresFromRatings(ratingsCaseB);
    expect(resB.ip21TotalScore16).toBe(10);
    expect(resB.ip21Percentage).toBe(62.5);
    expect(resB.ip21Passed).toBe(false);
    expect(resB.prideQualityScore4).toBe(4);
  });

  it('3. Quy tắc Pride NPS: Không lấy trung bình NPS lớp để tính NPS toàn trường; luôn tính lại từ dữ liệu gốc', () => {
    // Lớp A chỉ có 5 học sinh, cả 5 đều là Detractors (0..6) -> NPS Lớp A = -100
    const classARaw: PrideNpsRawRecord[] = [
      { score: 5, classId: 'CLS_A' },
      { score: 5, classId: 'CLS_A' },
      { score: 6, classId: 'CLS_A' },
      { score: 4, classId: 'CLS_A' },
      { score: 6, classId: 'CLS_A' },
    ];

    // Lớp B có 45 học sinh, cả 45 đều là Promoters (9..10) -> NPS Lớp B = +100
    const classBRaw: PrideNpsRawRecord[] = Array.from({ length: 45 }, () => ({
      score: 10,
      classId: 'CLS_B',
    }));

    const npsClassA = aggregatePrideNpsFromRawResponses(classARaw, 5);
    const npsClassB = aggregatePrideNpsFromRawResponses(classBRaw, 5);

    expect(npsClassA.npsScore).toBe(-100);
    expect(npsClassB.npsScore).toBe(100);

    // Nếu lấy trung bình cộng sai nguyên tắc: (-100 + 100) / 2 = 0 (SAI!)
    const wrongAverageOfClasses = ((npsClassA.npsScore ?? 0) + (npsClassB.npsScore ?? 0)) / 2;
    expect(wrongAverageOfClasses).toBe(0);

    // Tính đúng từ dữ liệu gốc toàn trường (50 học sinh: 45 Promoters, 5 Detractors -> (45 - 5)/50 * 100 = +80)
    const schoolRaw = [...classARaw, ...classBRaw];
    const npsSchool = aggregatePrideNpsFromRawResponses(schoolRaw, 5);

    expect(npsSchool.totalResponses).toBe(50);
    expect(npsSchool.npsScore).toBe(80);
    expect(npsSchool.npsScore).not.toBe(wrongAverageOfClasses);
  });

  it('4. Bảo mật Ẩn danh Pride NPS: Ẩn toàn bộ điểm số và nhận xét nếu số lượng phản hồi < ngưỡng tối thiểu (5)', () => {
    const smallSample: PrideNpsRawRecord[] = [
      { score: 10, proudMoments: 'Em rất tự hào' },
      { score: 9, proudMoments: 'Thầy cô tận tâm' },
      { score: 4, improvementIdeas: 'Cần thêm câu lạc bộ' },
    ];

    const maskedResult = aggregatePrideNpsFromRawResponses(smallSample, 5);
    expect(maskedResult.totalResponses).toBe(3);
    expect(maskedResult.isAnonymityMet).toBe(false);
    expect(maskedResult.npsScore).toBeNull();
    expect(maskedResult.promotersCount).toBeNull();
    expect(maskedResult.detractorsCount).toBeNull();
    expect(maskedResult.anonymizedComments).toHaveLength(0);

    // Mã băm ẩn danh một chiều SHA-256 phải tất định theo (periodId + studentId) và không chứa studentId dạng rõ
    const hash1 = buildAnonymousNpsTokenHash('PERIOD_2026_HK1', 'STUDENT_001');
    const hash2 = buildAnonymousNpsTokenHash('PERIOD_2026_HK1', 'STUDENT_001');
    const hashOtherPeriod = buildAnonymousNpsTokenHash('PERIOD_2026_HK2', 'STUDENT_001');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashOtherPeriod);
    expect(hash1).not.toContain('STUDENT_001');
    expect(hash1).toHaveLength(64);
  });

  it('5. Giới hạn đối tượng Khối 4–12 & Kiểm tra phạm vi kỳ khảo sát', () => {
    expect(isEligibleGrade4To12('1')).toBe(false);
    expect(isEligibleGrade4To12('Khối 2')).toBe(false);
    expect(isEligibleGrade4To12('Lớp 3A')).toBe(false);
    expect(isEligibleGrade4To12('Khối 4')).toBe(true);
    expect(isEligibleGrade4To12('9/2')).toBe(true);
    expect(isEligibleGrade4To12('12GAC')).toBe(true);

    // Kiểm tra học sinh thuộc kỳ khảo sát đang mở
    expect(
      isStudentInPeriodScope({
        gradeLevel: '8',
        campusId: 'CS1',
        classId: 'CLS_8A',
        targetGradesJson: JSON.stringify(['6', '7', '8', '9']),
        targetCampusesJson: JSON.stringify(['CS1']),
        targetClassesJson: null,
      }).eligible
    ).toBe(true);

    // Học sinh Khối 5 không nằm trong kỳ khảo sát chỉ mở cho THCS (6-9)
    expect(
      isStudentInPeriodScope({
        gradeLevel: '5',
        campusId: 'CS1',
        classId: 'CLS_5A',
        targetGradesJson: JSON.stringify(['6', '7', '8', '9']),
        targetCampusesJson: JSON.stringify(['CS1']),
        targetClassesJson: null,
      }).eligible
    ).toBe(false);
  });
});
