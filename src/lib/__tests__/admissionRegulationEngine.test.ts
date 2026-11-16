import { describe, it, expect } from "vitest"
import {
  CURRENT_REGULATION_SCHEMA_VERSION,
  DEFAULT_ADMISSION_REGULATIONS,
  analyzeStudentAcademicAndRegulation,
  matchRecommendedSubjectIds,
  isPreschoolSystem,
  getStudentK12Track,
  getDefaultHocKyByGrade,
  normalizeStudentHocKyDisplay,
  parseAdmissionRegulationConfig,
  resolveStudentExamSubjects,
  summarizeSystemSubjectsFromMappings
} from "../admissionRegulationEngine"

function buildMoetStudent(params: {
  grade: string
  system: string
  hocKy?: string
  rating?: string
  math?: number
  vnOrLitName?: string
  vnOrLitScore?: number
  eng?: number
}) {
  const subjects: { id: string; name: string; score: string }[] = []
  if (params.math !== undefined) subjects.push({ id: "toan", name: "Toán", score: String(params.math) })
  if (params.vnOrLitScore !== undefined) {
    subjects.push({
      id: "van",
      name: params.vnOrLitName || (parseInt(params.grade, 10) <= 5 ? "Tiếng Việt" : "Ngữ Văn"),
      score: String(params.vnOrLitScore)
    })
  }
  if (params.eng !== undefined) subjects.push({ id: "anh", name: "Tiếng Anh", score: String(params.eng) })

  return {
    studentCode: "HS_TEST",
    fullName: "Học sinh đối chiếu",
    grade: params.grade,
    hocKy: params.hocKy || "",
    surveyFormType: params.system,
    surveySystem: "Trực tiếp",
    kqHocTap:
      subjects.length === 0 && !params.rating
        ? ""
        : JSON.stringify({
            programType: "BO_GD_DT",
            transcriptPeriod: params.hocKy?.includes("2") ? "HK1" : "CA_NAM",
            overallRating: params.rating || "Hoàn thành tốt",
            moet: {
              gradeLevel: params.grade,
              overallRating: params.rating || "Hoàn thành tốt",
              conductRating: "Tốt",
              subjects
            }
          })
  }
}

describe("Quy chế Tuyển sinh Phổ thông Sky-Line 2026 (Đúng môn • Đúng hệ • Đúng thời điểm)", () => {
  it("Lọc sạch hệ Mầm non (MNS, MNG) ra khỏi cấu hình Phổ thông K-12", () => {
    expect(isPreschoolSystem("MNS", "Mầm non Sky-Line")).toBe(true)
    expect(isPreschoolSystem("MNG", "Mầm non Global")).toBe(true)
    expect(isPreschoolSystem("HNS", "Hệ Hội nhập S")).toBe(false)
    expect(isPreschoolSystem("HNG", "Hệ Hội nhập Global")).toBe(false)
    expect(isPreschoolSystem("HNC", "Hệ Hội nhập Compass")).toBe(false)
    expect(isPreschoolSystem("SB", "Hệ Song bằng")).toBe(false)
  })

  it("Khối 1 Đầu năm học vs Học kỳ 2 phân tách đúng môn giữa Hệ HNS và Hệ Global/Compass/SB", () => {
    // 1. K1 Đầu năm - Hệ HNS: 16 tiêu chí + Tiếng Anh vấn đáp (định hướng)
    const k1DauNamHns = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({ grade: "1", system: "HNS", hocKy: "Đầu năm học" }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k1DauNamHns.recommendedSubjectNames).toContain("Bộ chuẩn phát triển trẻ em 5–6 tuổi")
    expect(k1DauNamHns.orientationSubjectNames).toContain("Tiếng Anh (vấn đáp)")
    expect(k1DauNamHns.recommendedSubjectNames).not.toContain("ESL (vấn đáp)")

    // 2. K1 Đầu năm - Hệ HNG: 16 tiêu chí + ESL vấn đáp (định hướng)
    const k1DauNamHng = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({ grade: "1", system: "HNG", hocKy: "Đầu năm học" }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k1DauNamHng.recommendedSubjectNames).toContain("Bộ chuẩn phát triển trẻ em 5–6 tuổi")
    expect(k1DauNamHng.orientationSubjectNames).toContain("ESL (vấn đáp)")

    // 3. K1 HK2 - Hệ HNS: Toán 8.5 (>=8 miễn), Tiếng Việt 7.5 (<8 khảo sát) + Tiếng Anh vấn đáp (định hướng)
    const k1Hk2Hns = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "1",
        system: "HNS",
        hocKy: "Học kỳ 2",
        math: 8.5,
        vnOrLitName: "Tiếng Việt",
        vnOrLitScore: 7.5
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k1Hk2Hns.exemptedSubjectNames).toEqual(["Toán học"])
    expect(k1Hk2Hns.recommendedSubjectNames).toEqual(["Tiếng Việt", "Tiếng Anh (vấn đáp)"])

    // 4. K1 HK2 - Hệ Compass (HNC): Không khảo sát Toán, chỉ xét Tiếng Việt (<8) + ESL vấn đáp (định hướng)
    const k1Hk2Compass = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "1",
        system: "HNC",
        hocKy: "Học kỳ 2",
        math: 6.0,
        vnOrLitName: "Tiếng Việt",
        vnOrLitScore: 8.5
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k1Hk2Compass.exemptedSubjectNames).toEqual(["Tiếng Việt"])
    expect(k1Hk2Compass.recommendedSubjectNames).toEqual(["ESL (vấn đáp)"])
  })

  it("Khối 3 Học kỳ 1 vs Học kỳ 2 (Hệ HNS): HK1 Tiếng Anh chỉ định hướng, HK2 Tiếng Anh xét miễn theo ngưỡng 8.0", () => {
    const k3Hk1 = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "3",
        system: "HNS",
        hocKy: "Học kỳ 1",
        math: 8.5,
        vnOrLitName: "Tiếng Việt",
        vnOrLitScore: 8.0
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k3Hk1.exemptedSubjectNames).toEqual(["Tiếng Việt", "Toán học"])
    expect(k3Hk1.orientationSubjectNames).toContain("Tiếng Anh (vấn đáp)")

    const k3Hk2FailEng = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "3",
        system: "HNS",
        hocKy: "Học kỳ 2",
        math: 8.5,
        vnOrLitName: "Tiếng Việt",
        vnOrLitScore: 8.5,
        eng: 7.0
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k3Hk2FailEng.exemptedSubjectNames).toEqual(["Tiếng Việt", "Toán học"])
    expect(k3Hk2FailEng.recommendedSubjectNames).toContain("Tiếng Anh (viết)")
    expect(k3Hk2FailEng.recommendedSubjectNames).toContain("Tiếng Anh (vấn đáp)")
  })

  it("Khối 6 phân biệt chính xác Đầu năm học (Tiếng Việt < 8.0) và Học kỳ 2 (Ngữ văn < 6.5)", () => {
    // Lớp 6 Đầu năm học (căn cứ cuối năm lớp 5): điểm 7.0 < 8.0 => Phải khảo sát Tiếng Việt!
    const k6DauNam = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "6",
        system: "HNG",
        hocKy: "Đầu năm học",
        rating: "Hoàn thành tốt",
        vnOrLitName: "Tiếng Việt",
        vnOrLitScore: 7.0
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k6DauNam.intakeTimingCode).toBe("DAU_NAM")
    expect(k6DauNam.exemptedSubjectNames).toEqual([])
    expect(k6DauNam.recommendedSubjectNames).toContain("Tiếng Việt")
    expect(k6DauNam.recommendedSubjectNames).toContain("EPT")
    expect(k6DauNam.recommendedSubjectNames).toContain("ESL (vấn đáp)")
    expect(k6DauNam.recommendedSubjectNames).not.toContain("Toán học")

    // Lớp 6 Học kỳ 2 (căn cứ HK1 lớp 6): điểm Ngữ văn 7.0 >= 6.5 => Được miễn Ngữ văn, chỉ thi EPT + ESL + Định hướng!
    const k6Hk2 = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "6",
        system: "HNG",
        hocKy: "Học kỳ 2",
        rating: "Khá",
        vnOrLitName: "Ngữ Văn",
        vnOrLitScore: 7.0
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k6Hk2.intakeTimingCode).toBe("HK2")
    expect(k6Hk2.exemptedSubjectNames).toEqual(["Ngữ Văn"])
    expect(k6Hk2.recommendedSubjectNames).toContain("EPT")
    expect(k6Hk2.recommendedSubjectNames).toContain("ESL (vấn đáp)")
    expect(k6Hk2.recommendedSubjectNames).not.toContain("Ngữ Văn")
  })

  it("Khối 11 HK1 xét miễn >= 6.5 nhưng Khối 11 HK2 & Khối 12 Cả năm bắt buộc kiểm tra đủ môn (không miễn theo điểm)", () => {
    // K11 HK1 - HNS đạt 8.0 cả 3 môn -> Miễn cả 3 môn văn hóa
    const k11Hk1 = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "11",
        system: "HNS",
        hocKy: "Học kỳ 1",
        rating: "Giỏi",
        math: 8.0,
        vnOrLitName: "Ngữ Văn",
        vnOrLitScore: 8.0,
        eng: 8.0
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k11Hk1.exemptedSubjectNames).toContain("Ngữ Văn")
    expect(k11Hk1.exemptedSubjectNames).toContain("Toán học")

    // K11 HK2 - HNS dù đạt 9.0 cả 3 môn vẫn KHÔNG miễn theo điểm!
    const k11Hk2 = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "11",
        system: "HNS",
        hocKy: "Học kỳ 2",
        rating: "Giỏi",
        math: 9.0,
        vnOrLitName: "Ngữ Văn",
        vnOrLitScore: 9.0,
        eng: 9.0
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k11Hk2.exemptedSubjectNames).toEqual([])
    expect(k11Hk2.recommendedSubjectNames).toContain("Ngữ Văn")
    expect(k11Hk2.recommendedSubjectNames).toContain("Toán học")
    expect(k11Hk2.recommendedSubjectNames).toContain("Tiếng Anh (viết)")

    // K12 Đầu năm / Cả năm - Hệ Song bằng (SB) dù điểm 9.0 vẫn KHÔNG miễn Ngữ văn!
    const k12Sb = analyzeStudentAcademicAndRegulation(
      buildMoetStudent({
        grade: "12",
        system: "SB",
        hocKy: "HK1",
        rating: "Khá",
        vnOrLitName: "Ngữ Văn",
        vnOrLitScore: 9.0
      }),
      DEFAULT_ADMISSION_REGULATIONS
    )
    expect(k12Sb.exemptedSubjectNames).toEqual([])
    expect(k12Sb.recommendedSubjectNames).toContain("Ngữ Văn")
    expect(k12Sb.recommendedSubjectNames).toContain("EPT")
    expect(k12Sb.recommendedSubjectNames).toContain("ESL (vấn đáp)")
  })

  it("Ánh xạ chính xác ID môn khảo sát (phân biệt rõ ESL vấn đáp vs Tiếng Anh vấn đáp, khớp TCI 16 tiêu chí & EPT)", () => {
    const dbSubjects = [
      { id: "id-tci", code: "TCI", name: "Bộ chuẩn phát triển trẻ em 5-6 tuổi" },
      { id: "id-ta-vd", code: "ENG_SPK", name: "Tiếng Anh (vấn đáp)" },
      { id: "id-ta-viet", code: "ENG_WRT", name: "Tiếng Anh (viết)" },
      { id: "id-ept", code: "EPT", name: "EPT" },
      { id: "id-esl", code: "ESL_SPK", name: "ESL (vấn đáp)" },
      { id: "id-tv", code: "TV", name: "Tiếng Việt" }
    ]

    const intlIds = matchRecommendedSubjectIds(
      ["Bộ chuẩn phát triển trẻ em 5–6 tuổi", "EPT", "ESL (vấn đáp)"],
      dbSubjects
    )
    expect(intlIds).toEqual(["id-tci", "id-ept", "id-esl"])
    expect(intlIds).not.toContain("id-ta-vd")

    const hnsIds = matchRecommendedSubjectIds(["Tiếng Việt", "Tiếng Anh (vấn đáp)"], dbSubjects)
    expect(hnsIds).toEqual(["id-tv", "id-ta-vd"])
    expect(hnsIds).not.toContain("id-esl")
  })

  it("Tương thích ngược an toàn khi đọc cấu hình v1 cũ từ CSDL", () => {
    const legacyJson = JSON.stringify({
      documentTitle: "Quy chế cũ",
      effectiveYear: "2026-2027",
      rules: [
        {
          id: "old-k2-k5",
          name: "Tiểu học Chuyển ngang",
          grades: ["2", "3", "4", "5"],
          systems: ["HNS", "MNS"],
          minCoreScoreHNS: 7,
          minCoreScoreHNG_SB: 8,
          defaultSubjects: ["Toán học", "Tiếng Việt", "Tâm lý"],
          transcriptExemptSubjects: ["Toán học", "Tiếng Việt"]
        }
      ]
    })
    const parsed = parseAdmissionRegulationConfig(legacyJson)
    expect(parsed.schemaVersion).toBe(CURRENT_REGULATION_SCHEMA_VERSION)
    expect(parsed.rules[0].systems).toEqual(["HNS"]) // Đã tự loại MNS
    expect(parsed.rules[0].conditionalSubjects).toEqual(["Toán học", "Tiếng Việt"])
    expect(parsed.rules[0].mandatorySubjects).toContain("Tiếng Anh (vấn đáp)")
    expect(parsed.rules[0].mandatorySubjects).not.toContain("Tâm lý")
  })

  it("resolveStudentExamSubjects: Xác định môn kiểm tra đúng môn, đúng hệ, đúng thời điểm và môn miễn", () => {
    // 1. K1 Đầu năm - Hệ HNS
    const k1Hns = resolveStudentExamSubjects(
      { grade: "1", surveyFormType: "HNS", hocKy: "Đầu năm" },
      { regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
    )
    expect(k1Hns.requiredSubjects.map(s => s.subjectName)).toContain("Bộ chuẩn phát triển trẻ em 5–6 tuổi")
    expect(k1Hns.requiredSubjects.find(s => s.subjectName === "Tiếng Anh (vấn đáp)")?.isOrientation).toBe(true)
    expect(k1Hns.requiredSubjects.map(s => s.subjectName)).not.toContain("Toán học")

    // 2. K1 Đầu năm - Hệ HNG
    const k1Hng = resolveStudentExamSubjects(
      { grade: "1", surveyFormType: "HNG", hocKy: "Đầu năm" },
      { regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
    )
    expect(k1Hng.requiredSubjects.map(s => s.subjectName)).toContain("Bộ chuẩn phát triển trẻ em 5–6 tuổi")
    expect(k1Hng.requiredSubjects.find(s => s.subjectName === "ESL (vấn đáp)")?.isOrientation).toBe(true)
    expect(k1Hng.requiredSubjects.map(s => s.subjectName)).not.toContain("Toán học")

    // 3. K3 Hệ HNS - Đạt Toán 8.5, Tiếng Việt 8.5 (>= 8.0) -> Miễn Toán và Tiếng Việt, chỉ còn Tiếng Anh (vấn đáp - định hướng)
    const k3HnsExempt = resolveStudentExamSubjects(
      buildMoetStudent({
        grade: "3",
        system: "HNS",
        hocKy: "Học kỳ 1",
        math: 8.5,
        vnOrLitName: "Tiếng Việt",
        vnOrLitScore: 8.5
      }),
      { regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
    )
    expect(k3HnsExempt.exemptSubjects.map(s => s.subjectName)).toContain("Toán học")
    expect(k3HnsExempt.exemptSubjects.map(s => s.subjectName)).toContain("Tiếng Việt")
    expect(k3HnsExempt.requiredSubjects.map(s => s.subjectName)).toContain("Tiếng Anh (vấn đáp)")
    expect(k3HnsExempt.requiredSubjects.find(s => s.subjectName === "Tiếng Anh (vấn đáp)")?.isOrientation).toBe(true)

    // 4. K7 Hệ HNG / SB - Không có Toán; Tiếng Việt / Ngữ văn điểm 7.0 (>=6.5) -> Miễn Ngữ văn, còn EPT và ESL (vấn đáp)
    const k7Hng = resolveStudentExamSubjects(
      buildMoetStudent({
        grade: "7",
        system: "HNG",
        hocKy: "Học kỳ 1",
        math: 5.0,
        vnOrLitName: "Ngữ Văn",
        vnOrLitScore: 7.0
      }),
      { regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
    )
    expect(k7Hng.exemptSubjects.map(s => s.subjectName)).toContain("Ngữ Văn")
    expect(k7Hng.requiredSubjects.map(s => s.subjectName)).toContain("EPT")
    expect(k7Hng.requiredSubjects.map(s => s.subjectName)).toContain("ESL (vấn đáp)")
    expect(k7Hng.requiredSubjects.map(s => s.subjectName)).not.toContain("Toán học")

    // 5. K11 HK2 / K12 - Yêu cầu học lực Khá trở lên, kiểm tra đủ 03 môn, không miễn theo điểm
    const k11Hk2 = resolveStudentExamSubjects(
      buildMoetStudent({
        grade: "11",
        system: "HNS",
        hocKy: "Học kỳ 2",
        rating: "Khá",
        math: 9.0,
        vnOrLitName: "Ngữ Văn",
        vnOrLitScore: 9.0,
        eng: 9.0
      }),
      { regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
    )
    expect(k11Hk2.exemptSubjects.length).toBe(0) // Không miễn theo điểm
    expect(k11Hk2.requiredSubjects.map(s => s.subjectName)).toContain("Ngữ Văn")
    expect(k11Hk2.requiredSubjects.map(s => s.subjectName)).toContain("Toán học")
    expect(k11Hk2.requiredSubjects.map(s => s.subjectName)).toContain("Tiếng Anh (viết)")

    // 6. Chế độ nhập liệu trực tiếp (Excel inline) với JSON điểm rút gọn
    const inlineK4 = resolveStudentExamSubjects(
      {
        grade: "4",
        surveyFormType: "HNS",
        kqRenLuyen: "Tốt",
        kqgdTieuHoc: "Hoàn thành tốt",
        kqHocTap: JSON.stringify({
          programType: "BO_GD_DT",
          transcriptPeriod: "Cả năm",
          overallRating: "Hoàn thành tốt",
          math: "8.5",
          literature: "7.5",
          english: "8.0"
        })
      },
      { regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
    )
    expect(inlineK4.exemptSubjects.map(s => s.subjectName)).toContain("Toán học")
    expect(inlineK4.exemptSubjects.map(s => s.subjectName)).toContain("Tiếng Anh (viết)")
    expect(inlineK4.exemptSubjects.map(s => s.subjectName)).not.toContain("Tiếng Anh (vấn đáp)")
    expect(inlineK4.requiredSubjects.map(s => s.subjectName)).toEqual(["Tiếng Anh (vấn đáp)", "Tiếng Việt"])
    expect(inlineK4.ruleApplied).toContain("Hệ HNS • Khối 4 • Đầu năm (KTĐK ≥ 8.0)")
  })

  it("summarizeSystemSubjectsFromMappings: Tổng hợp đúng môn theo từng hệ K-12 từ bảng cấu hình môn học", () => {
    const mockMappings = [
      { grade: "1", educationSystem: "HNS", subject: { name: "Bộ chuẩn phát triển trẻ em 5–6 tuổi" } },
      { grade: "1", educationSystem: "HNG", subject: { name: "Bộ chuẩn phát triển trẻ em 5–6 tuổi" } },
      { grade: "2", educationSystem: "HNS", subject: { name: "Tiếng Việt" } },
      { grade: "6", educationSystem: "HNS", subject: { name: "Ngữ Văn" } },
      { grade: "2", educationSystem: "HNS", subject: { name: "Toán học" } },
      { grade: "2", educationSystem: "HNS", subject: { name: "Tiếng Anh (viết)" } },
      { grade: "2", educationSystem: "HNS", subject: { name: "Tiếng Anh (vấn đáp)" } },
      { grade: "2", educationSystem: "HNG", subject: { name: "Tiếng Việt" } },
      { grade: "6", educationSystem: "SB", subject: { name: "Ngữ Văn" } },
      { grade: "2", educationSystem: "HNG", subject: { name: "EPT" } },
      { grade: "2", educationSystem: "SB", subject: { name: "ESL (vấn đáp)" } },
      // Trường hợp cấu hình thừa Tiếng Anh (vấn đáp) vào HNG hoặc Mầm non MNS -> tự động chuẩn hóa
      { grade: "2", educationSystem: "HNG", subject: { name: "Tiếng Anh (vấn đáp)" } },
      { grade: "1", educationSystem: "MNS", subject: { name: "Tâm lý" } }
    ]

    const summary = summarizeSystemSubjectsFromMappings(mockMappings)
    const hns = summary.find(x => x.systemGroup === "HNS")
    const intl = summary.find(x => x.systemGroup.includes("HNG"))

    expect(hns?.subjectsLabel).toContain("Toán học")
    expect(hns?.subjectsLabel).toContain("Tiếng Việt / Ngữ Văn")
    expect(hns?.subjectsLabel).not.toContain("EPT")

    expect(intl?.subjectsLabel).toContain("EPT")
    expect(intl?.subjectsLabel).toContain("ESL (vấn đáp)")
    expect(intl?.subjectsLabel).toContain("Tiếng Việt / Ngữ Văn")
    expect(intl?.subjectsLabel).not.toContain("Toán")
    expect(intl?.subjectsLabel).not.toContain("Tiếng Anh")
  })

  it("Phân tách độc lập Tag Danh sách Khảo sát Hệ S (HNS) và Hệ I (HNG, SB, HNC) + đồng bộ 1. Mốc thời gian / Kỳ khảo sát", () => {
    expect(getStudentK12Track({ surveyFormType: "HNS" })).toBe("HE_S")
    expect(getStudentK12Track({ surveyFormType: "" })).toBe("HE_S")
    expect(getStudentK12Track({ surveyFormType: "HNG" })).toBe("HE_I")
    expect(getStudentK12Track({ surveyFormType: "SB" })).toBe("HE_I")
    expect(getStudentK12Track({ surveyFormType: "HNC" })).toBe("HE_I")

    expect(getDefaultHocKyByGrade("1")).toBe("Đầu năm")
    expect(getDefaultHocKyByGrade("4")).toBe("Đầu năm")
    expect(getDefaultHocKyByGrade("6")).toBe("Đầu năm")
    expect(getDefaultHocKyByGrade("11", "Tuyển sinh HK2")).toBe("Học kỳ 2")
    expect(getDefaultHocKyByGrade("12")).toBe("Đầu năm")

    expect(normalizeStudentHocKyDisplay({ grade: "1", hocKy: "HK2" })).toBe("Học kỳ 2")
    expect(normalizeStudentHocKyDisplay({ grade: "3", hocKy: "Đầu năm học" })).toBe("Đầu năm")
    expect(normalizeStudentHocKyDisplay({ grade: "12", hocKy: "" })).toBe("Đầu năm")
    expect(
      normalizeStudentHocKyDisplay(
        { grade: "4", hocKy: "Open Day" },
        "Open Day",
        [{ id: "p-op", name: "Open Day" }]
      )
    ).toBe("Open Day")
  })

  it("Bám sát Cấu hình file điểm KSĐV (gradeConfigs), lọc bỏ Tâm lý/NLTD rò rỉ và chạy miễn môn tức thời theo Điểm Toán, Văn/TV, Anh", () => {
    const mockGradeConfigs = [
      // Bản ghi ALL | ALL chứa Tâm lý, NLTD mặc định trong DB không được làm lệch cột Môn kiểm tra
      {
        periodId: "ALL",
        educationSystemId: "ALL",
        grade: "Khối 4",
        subjects: [
          { subject: { id: "s-tly", code: "TLY", name: "Tâm lý" } },
          { subject: { id: "s-nltd", code: "NLTD", name: "Năng lực tư duy" } },
          { subject: { id: "s-tav", code: "TAv", name: "Tiếng Anh (viết)" } },
          { subject: { id: "s-tavd", code: "TAvd", name: "Tiếng Anh (vấn đáp)" } }
        ]
      },
      // Cấu hình Đầu năm | HNG | Khối 4
      {
        periodId: "DAU_NAM",
        educationSystemId: "HNG",
        grade: "Khối 4",
        subjects: [{ subject: { id: "s-tvi", code: "TVI", name: "Tiếng Việt" } }]
      },
      // Cấu hình Đầu năm vs HK2 | HNG | Khối 6
      {
        periodId: "DAU_NAM",
        educationSystemId: "HNG",
        grade: "Khối 6",
        subjects: [{ subject: { id: "s-tvi", code: "TVI", name: "Tiếng Việt" } }]
      },
      {
        periodId: "HK2",
        educationSystemId: "HNG",
        grade: "Khối 6",
        subjects: [{ subject: { id: "s-nva", code: "NVA", name: "Ngữ Văn" } }]
      }
    ]

    // Giả lập dữ liệu QUY_CHE_TS cũ có dính "Tâm lý" & "Phiếu định hướng đầu vào" trong rule-custom Hệ I và "TAv" cứng trong rule-k2-k5
    const dirtyLegacyDbConfig = parseAdmissionRegulationConfig(
      JSON.stringify({
        schemaVersion: 2,
        documentTitle: "Quy chế DB cũ",
        effectiveYear: "2026-2027",
        rules: [
          {
            id: "rule-k2-k5",
            name: "Quy tắc Khối 2–5",
            grades: ["2", "3", "4", "5"],
            systems: ["HNS"],
            intakeTiming: "THEO_DOT",
            exemptionPolicy: "PRIMARY_KTĐK",
            minCoreScoreHNS: 8,
            minCoreScoreHNG_SB: 8,
            mandatorySubjects: ["Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)"],
            conditionalSubjects: ["Tiếng Việt", "Toán học"],
            orientationSubjects: []
          },
          {
            id: "rule-custom-1794458253457",
            name: "Quy tắc Khối 2,3,4,5/Hệ I",
            grades: ["2", "3", "4", "5"],
            systems: ["HNG", "SB"],
            intakeTiming: "THEO_DOT",
            exemptionPolicy: "PRIMARY_KTĐK",
            minCoreScoreHNS: 8,
            minCoreScoreHNG_SB: 8,
            mandatorySubjects: ["EPT", "ESL (vấn đáp)", "Phiếu định hướng đầu vào", "Tâm lý"],
            conditionalSubjects: ["Tiếng Việt"],
            orientationSubjects: []
          }
        ]
      })
    )

    // 1. Khối 4 Hệ I (HNG) chưa nhập điểm -> EPT, ESL (vấn đáp), Tiếng Việt (TUYỆT ĐỐI KHÔNG dính Tâm lý / Phiếu định hướng / Tiếng Anh viết)
    const k4HngEmpty = resolveStudentExamSubjects(
      {
        grade: "4",
        hocKy: "Đầu năm",
        surveyFormType: "HNG",
        kqHocTap: JSON.stringify({
          programType: "BO_GD_DT",
          transcriptPeriod: "Cả năm",
          overallRating: "",
          math: "",
          literature: "",
          english: ""
        })
      },
      { gradeConfigs: mockGradeConfigs, regulationConfig: dirtyLegacyDbConfig }
    )
    expect(k4HngEmpty.requiredSubjects.map(s => s.subjectName)).toEqual(["EPT", "ESL (vấn đáp)", "Tiếng Việt"])
    expect(k4HngEmpty.requiredSubjects.map(s => s.subjectName)).not.toContain("Tâm lý")
    expect(k4HngEmpty.exemptSubjects).toEqual([])

    // 2. Khối 4 Hệ I (HNG) nhập Điểm Văn/TV = 8.5 (dù KQ Xếp loại để trống "") -> Miễn tức thời Tiếng Việt, còn EPT + ESL (vấn đáp)
    const k4HngPassTvBlankRating = resolveStudentExamSubjects(
      {
        grade: "4",
        hocKy: "Đầu năm",
        surveyFormType: "HNG",
        kqHocTap: JSON.stringify({
          programType: "BO_GD_DT",
          transcriptPeriod: "Cả năm",
          overallRating: "",
          math: "7.0",
          literature: "8.5",
          english: ""
        })
      },
      { gradeConfigs: mockGradeConfigs, regulationConfig: dirtyLegacyDbConfig }
    )
    expect(k4HngPassTvBlankRating.exemptSubjects.map(s => s.subjectName)).toEqual(["Tiếng Việt"])
    expect(k4HngPassTvBlankRating.requiredSubjects.map(s => s.subjectName)).toEqual(["EPT", "ESL (vấn đáp)"])

    // 3. Khối 4 Hệ S (HNS) nhập Toán = 9.0, Văn/TV = 8.5, Anh = 8.5 -> Miễn Toán, Tiếng Việt, Tiếng Anh (viết), NHƯNG VẪN KHẢO SÁT Tiếng Anh (vấn đáp)!
    const k4HnsPassAll = resolveStudentExamSubjects(
      {
        grade: "4",
        hocKy: "Đầu năm",
        surveyFormType: "HNS",
        kqHocTap: JSON.stringify({
          programType: "BO_GD_DT",
          transcriptPeriod: "Cả năm",
          overallRating: "HTT",
          math: "9.0",
          literature: "8.5",
          english: "8.5"
        })
      },
      { gradeConfigs: mockGradeConfigs, regulationConfig: dirtyLegacyDbConfig }
    )
    expect(k4HnsPassAll.exemptSubjects.map(s => s.subjectName)).toContain("Toán học")
    expect(k4HnsPassAll.exemptSubjects.map(s => s.subjectName)).toContain("Tiếng Việt")
    expect(k4HnsPassAll.exemptSubjects.map(s => s.subjectName)).toContain("Tiếng Anh (viết)")
    expect(k4HnsPassAll.exemptSubjects.map(s => s.subjectName)).not.toContain("Tiếng Anh (vấn đáp)")
    expect(k4HnsPassAll.requiredSubjects.map(s => s.subjectName)).toEqual(["Tiếng Anh (vấn đáp)"])

    // 4. Nếu KQ Xếp loại ghi rõ "Chưa hoàn thành" hoặc KQ Rèn luyện = "Chưa đạt" -> Không được miễn dù điểm >= 8.0
    const k4HnsFailingConduct = resolveStudentExamSubjects(
      {
        grade: "4",
        hocKy: "Đầu năm",
        surveyFormType: "HNS",
        kqRenLuyen: "Chưa đạt",
        kqHocTap: JSON.stringify({
          programType: "BO_GD_DT",
          transcriptPeriod: "Cả năm",
          overallRating: "Hoàn thành tốt",
          math: "9.0",
          literature: "9.0",
          english: "9.0"
        })
      },
      { gradeConfigs: mockGradeConfigs, regulationConfig: dirtyLegacyDbConfig }
    )
    expect(k4HnsFailingConduct.exemptSubjects).toEqual([])
    expect(k4HnsFailingConduct.requiredSubjects.map(s => s.subjectName)).toContain("Toán học")
    expect(k4HnsFailingConduct.requiredSubjects.map(s => s.subjectName)).toContain("Tiếng Việt")

    // 5. Khối 6 Hệ I đổi từ "Đầu năm" (ngưỡng 8.0, Tiếng Việt) sang "Học kỳ 2" (ngưỡng 6.5, Ngữ Văn) với Điểm Văn/TV = 7.2
    const k6DauNam72 = resolveStudentExamSubjects(
      {
        grade: "6",
        hocKy: "Đầu năm",
        surveyFormType: "HNG",
        kqHocTap: JSON.stringify({
          programType: "BO_GD_DT",
          transcriptPeriod: "Cả năm",
          overallRating: "",
          literature: "7.2"
        })
      },
      { gradeConfigs: mockGradeConfigs, regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
    )
    expect(k6DauNam72.exemptSubjects).toEqual([])
    expect(k6DauNam72.requiredSubjects.map(s => s.subjectName)).toEqual(["EPT", "ESL (vấn đáp)", "Tiếng Việt"])

    const k6Hk272 = resolveStudentExamSubjects(
      {
        grade: "6",
        hocKy: "Học kỳ 2",
        surveyFormType: "HNG",
        kqHocTap: JSON.stringify({
          programType: "BO_GD_DT",
          transcriptPeriod: "HK1",
          overallRating: "",
          literature: "7.2"
        })
      },
      { gradeConfigs: mockGradeConfigs, regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
    )
    expect(k6Hk272.exemptSubjects.map(s => s.subjectName)).toEqual(["Ngữ Văn"])
    expect(k6Hk272.requiredSubjects.map(s => s.subjectName)).toEqual(["EPT", "ESL (vấn đáp)"])
  })

  it("Hệ I (HNG, SB, HNC): Hiển thị đầy đủ EPT, ESL (vấn đáp), Tiếng Việt / Ngữ Văn bám sát Thời điểm ngay cả khi CSDL còn lưu JSON v1 gộp hệ", () => {
    const legacyMixedConfig = parseAdmissionRegulationConfig(
      JSON.stringify({
        documentTitle: "Quy chế cũ v1",
        effectiveYear: "2026-2027",
        rules: [
          {
            id: "legacy-mixed-k2-k5",
            name: "Tiểu học Chuyển ngang",
            grades: ["2", "3", "4", "5"],
            systems: ["HNG", "HNS", "SB"],
            minCoreScoreHNS: 7,
            minCoreScoreHNG_SB: 8,
            defaultSubjects: ["Toán học", "Tiếng Việt", "Tiếng Anh (vấn đáp)"],
            transcriptExemptSubjects: ["Toán học", "Tiếng Việt"]
          }
        ]
      })
    )

    // 1. K1 Học kỳ 2 - Hệ HNG (điểm Tiếng Việt 7.5 < 8.0) -> Tiếng Việt + ESL (vấn đáp)
    const k1Hk2Intl = resolveStudentExamSubjects(
      buildMoetStudent({ grade: "1", system: "HNG", hocKy: "Học kỳ 2", vnOrLitName: "Tiếng Việt", vnOrLitScore: 7.5 }),
      { regulationConfig: legacyMixedConfig }
    )
    expect(k1Hk2Intl.requiredSubjects.map(s => s.subjectName)).toEqual(["Tiếng Việt", "ESL (vấn đáp)"])

    // 2. K2–K5 Theo đợt tuyển sinh - Hệ SB (điểm Tiếng Việt 7.5 < 8.0) -> Tiếng Việt + EPT + ESL (vấn đáp)
    const k3IntlFailTv = resolveStudentExamSubjects(
      buildMoetStudent({ grade: "3", system: "SB", hocKy: "Theo đợt tuyển sinh", vnOrLitName: "Tiếng Việt", vnOrLitScore: 7.5 }),
      { regulationConfig: legacyMixedConfig }
    )
    expect(k3IntlFailTv.requiredSubjects.map(s => s.subjectName)).toEqual(["EPT", "ESL (vấn đáp)", "Tiếng Việt"])
    expect(k3IntlFailTv.requiredSubjects.map(s => s.subjectName)).not.toContain("Toán học")

    // 3. K2–K5 Theo đợt tuyển sinh - Hệ HNG (điểm Tiếng Việt 8.5 >= 8.0) -> Miễn Tiếng Việt, bắt buộc EPT + ESL (vấn đáp)
    const k4IntlExemptTv = resolveStudentExamSubjects(
      buildMoetStudent({ grade: "4", system: "HNG", hocKy: "Theo đợt tuyển sinh", vnOrLitName: "Tiếng Việt", vnOrLitScore: 8.5 }),
      { regulationConfig: legacyMixedConfig }
    )
    expect(k4IntlExemptTv.exemptSubjects.map(s => s.subjectName)).toEqual(["Tiếng Việt"])
    expect(k4IntlExemptTv.requiredSubjects.map(s => s.subjectName)).toEqual(["EPT", "ESL (vấn đáp)"])

    // 4. K11 Theo đợt tuyển sinh / Học kỳ 1 vs Học kỳ 2 - Hệ HNG
    const k11Hk1Intl = resolveStudentExamSubjects(
      buildMoetStudent({ grade: "11", system: "HNG", hocKy: "Theo đợt tuyển sinh", rating: "Khá", vnOrLitName: "Ngữ Văn", vnOrLitScore: 7.5 }),
      { regulationConfig: legacyMixedConfig }
    )
    expect(k11Hk1Intl.exemptSubjects.map(s => s.subjectName)).toEqual(["Ngữ Văn"])
    expect(k11Hk1Intl.requiredSubjects.map(s => s.subjectName)).toEqual(["EPT", "ESL (vấn đáp)"])

    const k11Hk2Intl = resolveStudentExamSubjects(
      buildMoetStudent({ grade: "11", system: "HNG", hocKy: "Học kỳ 2", rating: "Giỏi", vnOrLitName: "Ngữ Văn", vnOrLitScore: 9.0 }),
      { regulationConfig: legacyMixedConfig }
    )
    expect(k11Hk2Intl.exemptSubjects).toEqual([])
    expect(k11Hk2Intl.requiredSubjects.map(s => s.subjectName)).toEqual(["Ngữ Văn", "EPT", "ESL (vấn đáp)"])
  })

  it("Hệ S (HNS) từ Khối 1 đến Khối 12: Môn Tiếng Anh (vấn đáp) luôn được khảo sát ở tất cả 12 khối kể cả khi đủ điểm miễn hoặc Tuyển thẳng", () => {
    for (let g = 1; g <= 12; g++) {
      const gradeStr = String(g)
      for (const hocKy of ["Đầu năm", "Học kỳ 1", "Học kỳ 2"]) {
        // 1. Học sinh đạt điểm tối đa 9.5 cả 3 môn + chứng chỉ quốc tế IELTS 7.5
        const highScoreRes = resolveStudentExamSubjects(
          {
            grade: gradeStr,
            hocKy,
            surveyFormType: "HNS",
            kqRenLuyen: "Tốt",
            kqgdTieuHoc: g <= 5 ? "Hoàn thành xuất sắc" : "Giỏi",
            kqHocTap: JSON.stringify({
              programType: "BO_GD_DT",
              transcriptPeriod: hocKy === "Học kỳ 2" ? "HK1" : "Cả năm",
              overallRating: g <= 5 ? "Hoàn thành xuất sắc" : "Giỏi",
              achievements: "IELTS 7.5",
              math: "9.5",
              literature: "9.5",
              english: "9.5"
            })
          },
          { regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
        )

        const requiredNames = highScoreRes.requiredSubjects.map(s => s.subjectName)
        const exemptNames = highScoreRes.exemptSubjects.map(s => s.subjectName)
        expect(requiredNames, `Khối ${gradeStr} (${hocKy}) phải khảo sát Tiếng Anh (vấn đáp)`).toContain("Tiếng Anh (vấn đáp)")
        expect(exemptNames, `Khối ${gradeStr} (${hocKy}) không được miễn Tiếng Anh (vấn đáp)`).not.toContain("Tiếng Anh (vấn đáp)")

        // 2. Học sinh diện Tuyển thẳng
        const directRes = resolveStudentExamSubjects(
          {
            grade: gradeStr,
            hocKy,
            surveyFormType: "HNS",
            admissionCriteria: "Tuyển thẳng",
            kqHocTap: JSON.stringify({
              programType: "BO_GD_DT",
              achievements: "Giải Nhất cấp Thành phố"
            })
          },
          { regulationConfig: DEFAULT_ADMISSION_REGULATIONS }
        )
        expect(
          directRes.requiredSubjects.map(s => s.subjectName),
          `Khối ${gradeStr} (${hocKy}) diện Tuyển thẳng vẫn khảo sát Tiếng Anh (vấn đáp)`
        ).toContain("Tiếng Anh (vấn đáp)")
      }
    }
  })

  it("Bám sát tuyệt đối Cấu hình quy chế tuyển sinh đã lưu (không bị ghi đè bởi mặc định hoặc tiêm thêm môn từ gradeConfigs)", () => {
    const customSavedConfig = parseAdmissionRegulationConfig(
      JSON.stringify({
        schemaVersion: CURRENT_REGULATION_SCHEMA_VERSION,
        documentTitle: "Quy chế tùy chỉnh từ Quản trị viên",
        effectiveYear: "2026-2027",
        rules: [
          {
            id: "custom-hns-k4",
            name: "Quy tắc tùy chỉnh Khối 4 Hệ S",
            grades: ["4"],
            systems: ["HNS"],
            intakeTiming: "THEO_DOT",
            exemptionPolicy: "PRIMARY_KTĐK",
            minCoreScoreHNS: 8.5,
            minCoreScoreHNG_SB: 8.5,
            mandatorySubjects: ["Tiếng Anh (vấn đáp)"],
            conditionalSubjects: ["Tiếng Việt", "Toán học", "Tiếng Anh (viết)"],
            orientationSubjects: []
          }
        ]
      })
    )

    // Điểm 8.0 < ngưỡng tùy chỉnh 8.5 => Không được miễn (chứng minh dùng đúng customSavedConfig thay vì mặc định 8.0)
    // Đồng thời gradeConfigs có thêm môn lạ "Khoa học tự nhiên" cũng KHÔNG được tiêm vào cột Môn kiểm tra
    const res80 = resolveStudentExamSubjects(
      {
        grade: "4",
        hocKy: "Đầu năm",
        surveyFormType: "HNS",
        kqHocTap: JSON.stringify({
          programType: "BO_GD_DT",
          transcriptPeriod: "Cả năm",
          overallRating: "Hoàn thành tốt",
          math: "8.0",
          literature: "8.0",
          english: "8.0"
        })
      },
      {
        regulationConfig: customSavedConfig,
        gradeConfigs: [
          {
            periodId: "DAU_NAM",
            educationSystemId: "HNS",
            grade: "Khối 4",
            subject: { id: "s-khtn", code: "KHTN", name: "Khoa học tự nhiên" }
          },
          {
            periodId: "DAU_NAM",
            educationSystemId: "HNS",
            grade: "Khối 4",
            subject: { id: "s-nva", code: "NVA", name: "Ngữ Văn" }
          }
        ]
      }
    )

    expect(res80.exemptSubjects).toEqual([])
    expect(res80.requiredSubjects.map(s => s.subjectName)).toEqual([
      "Tiếng Anh (vấn đáp)",
      "Tiếng Việt",
      "Toán học",
      "Tiếng Anh (viết)"
    ])
    expect(res80.requiredSubjects.map(s => s.subjectName)).not.toContain("Khoa học tự nhiên")
    expect(res80.requiredSubjects.map(s => s.subjectName)).not.toContain("Ngữ Văn")
  })
})
