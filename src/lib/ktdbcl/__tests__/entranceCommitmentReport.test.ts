import { beforeEach, describe, expect, it, vi } from "vitest"

const mockPrisma = vi.hoisted(() => ({
  academicYear: {
    findMany: vi.fn(),
  },
  campus: {
    findMany: vi.fn(),
  },
  class: {
    findMany: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
  },
  inputAssessmentPeriod: {
    findMany: vi.fn(),
  },
  preschoolInputAssessmentPeriod: {
    findMany: vi.fn(),
  },
  inputAssessmentStudent: {
    findMany: vi.fn(),
  },
  preschoolInputAssessmentStudent: {
    findMany: vi.fn(),
  },
  learningSupportTarget: {
    findMany: vi.fn(),
  },
  studentLearningCommitment: {
    findMany: vi.fn(),
  },
  studentTransfer: {
    findMany: vi.fn(),
  },
  subject: {
    findMany: vi.fn(),
  },
  subjectBenchmarkConfig: {
    findMany: vi.fn(),
  },
  subjectGradeConfig: {
    findMany: vi.fn(),
  },
  subjectGradeEntry: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

import {
  formatCommitmentScoreWithSklArrow,
  generateEntranceCommitmentReport,
  parseAcademicCommittedSubjects,
  resolveConfiguredSklBenchmark,
} from "../entranceCommitmentReportEngine"
import { ThkqAccessScope } from "../thkqPermissions"

const fullAccessScope: ThkqAccessScope = {
  userId: "u_admin",
  roleCode: "ADMIN",
  roleTier: "SYSTEM_QA_EXEC",
  roleDisplayLabel: "Quản trị hệ thống",
  canViewReport: true,
  canViewDetail: true,
  canExportSummary: true,
  canExportDetail: true,
  isCampusRestricted: false,
  allowedCampusIds: ["cp_cs1"], // Dù hồ sơ nhân sự gắn CS1, ADMIN vẫn không bị giới hạn cơ sở
  isSubjectRestricted: false,
  allowedSubjectIds: [],
  allowedSubjectCodes: [],
  isClassRestricted: false,
  allowedClassIds: [],
  homeroomClassIds: [],
}

describe("Báo cáo Học sinh cam kết đầu vào — entranceCommitmentReportEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma.academicYear.findMany.mockResolvedValue([
      { id: "ay_2026", name: "2026-2027", status: "ACTIVE" },
      { id: "ay_2025", name: "2025-2026", status: "COMPLETED" },
    ])

    mockPrisma.campus.findMany.mockImplementation(async ({ where }: any) => {
      const all = [
        { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
        { id: "cp_cs2", campusCode: "CS2", campusName: "Cơ sở 2" },
      ]
      if (where?.id?.in) {
        return all.filter((c) => where.id.in.includes(c.id))
      }
      return all
    })

    mockPrisma.subject.findMany.mockResolvedValue([
      { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
      { id: "sub_van", subjectCode: "NVA", subjectName: "Ngữ Văn" },
      { id: "sub_anh", subjectCode: "TA", subjectName: "Tiếng Anh" },
      { id: "sub_tv", subjectCode: "TVI", subjectName: "Tiếng Việt" },
      { id: "sub_khtn", subjectCode: "KHTN", subjectName: "Khoa học tự nhiên" },
    ])

    mockPrisma.inputAssessmentPeriod.findMany.mockResolvedValue([{ id: "iap_1" }])
    mockPrisma.preschoolInputAssessmentPeriod.findMany.mockResolvedValue([])
    mockPrisma.preschoolInputAssessmentStudent.findMany.mockResolvedValue([])
    mockPrisma.studentLearningCommitment.findMany.mockResolvedValue([])
    mockPrisma.studentTransfer.findMany.mockResolvedValue([])
    mockPrisma.subjectGradeConfig.findMany.mockResolvedValue([])
  })

  describe("1. Quy tắc hiển thị mũi tên theo chuẩn SKL (formatCommitmentScoreWithSklArrow)", () => {
    it("Với chuẩn SKL = 5,0: điểm 4,5 -> '4,5 ↓'; điểm 5,0 -> '5,0'; điểm 5,5 -> '5,5 ↑'", () => {
      const below = formatCommitmentScoreWithSklArrow(4.5, 5.0, {
        period: "GK1",
        level: "THCS",
      })
      expect(below.display).toBe("4,5 ↓")
      expect(below.arrow).toBe("↓")
      expect(below.comparison).toBe("BELOW")

      const equal = formatCommitmentScoreWithSklArrow(5.0, 5.0, {
        period: "GK1",
        level: "THCS",
      })
      expect(equal.display).toBe("5,0")
      expect(equal.arrow).toBeNull()
      expect(equal.comparison).toBe("EQUAL")

      const above = formatCommitmentScoreWithSklArrow(5.5, 5.0, {
        period: "GK1",
        level: "THCS",
      })
      expect(above.display).toBe("5,5 ↑")
      expect(above.arrow).toBe("↑")
      expect(above.comparison).toBe("ABOVE")
    })

    it("Xử lý đúng điểm 0 hợp lệ, ô chưa có điểm ('—'), môn chưa có chuẩn SKL và hai môn có chuẩn khác nhau", () => {
      // Điểm 0 là kết quả hợp lệ và hiển thị là 0 (kèm mũi tên xuống nếu chuẩn > 0)
      const zeroWithBenchmark = formatCommitmentScoreWithSklArrow(0, 5.0, {
        period: "KSĐN",
        level: "THCS",
      })
      expect(zeroWithBenchmark.display).toBe("0 ↓")
      expect(zeroWithBenchmark.score).toBe(0)

      const zeroNoBenchmark = formatCommitmentScoreWithSklArrow(0, null, {
        period: "KSĐN",
        level: "THCS",
      })
      expect(zeroNoBenchmark.display).toBe("0")
      expect(zeroNoBenchmark.arrow).toBeNull()

      // Chưa có điểm -> "—"
      const missingScore = formatCommitmentScoreWithSklArrow(null, 5.0, {
        period: "CK1",
        level: "THCS",
      })
      expect(missingScore.display).toBe("—")
      expect(missingScore.comparison).toBe("NO_SCORE")

      // Môn chưa có chuẩn -> chỉ hiển thị số điểm, không tự đặt ngưỡng
      const noBenchmark = formatCommitmentScoreWithSklArrow(6.5, null, {
        period: "GK1",
        level: "THCS",
      })
      expect(noBenchmark.display).toBe("6,5")
      expect(noBenchmark.arrow).toBeNull()
      expect(noBenchmark.comparison).toBe("NO_BENCHMARK")

      // Hai môn có chuẩn khác nhau (VD: Toán chuẩn 7,0 ở Tiểu học -> điểm 8 hiển thị '8 ↑'; Tiếng Anh chuẩn 8,5 -> điểm 8 hiển thị '8 ↓')
      const mathPrimary = formatCommitmentScoreWithSklArrow(8, 7.0, {
        period: "GK1",
        level: "TIEU_HOC",
      })
      expect(mathPrimary.display).toBe("8 ↑")

      const englishPrimary = formatCommitmentScoreWithSklArrow(8, 8.5, {
        period: "GK1",
        level: "TIEU_HOC",
      })
      expect(englishPrimary.display).toBe("8 ↓")
    })

    it("Tra cứu chuẩn SKL ưu tiên đúng cấu hình môn riêng biệt và trả về null khi thiếu cấu hình", () => {
      const configs = [
        {
          academicYearId: "ay_2026",
          evaluationPeriod: "ALL",
          level: "THCS",
          grade: "6",
          subjectId: "sub_toan",
          benchmarkScore: 6.5,
        },
        {
          academicYearId: "ay_2026",
          evaluationPeriod: "ALL",
          level: "THCS",
          grade: "6",
          subjectId: "sub_van",
          benchmarkScore: 5.0,
        },
      ]

      const bmToan = resolveConfiguredSklBenchmark({
        benchmarkConfigs: configs,
        level: "THCS",
        grade: "6",
        matchedSubjectIds: ["sub_toan"],
        committedSubject: "Toán",
        period: "GK1",
      })
      expect(bmToan).toBe(6.5)

      const bmVan = resolveConfiguredSklBenchmark({
        benchmarkConfigs: configs,
        level: "THCS",
        grade: "6",
        matchedSubjectIds: ["sub_van"],
        committedSubject: "Ngữ văn",
        period: "GK1",
      })
      expect(bmVan).toBe(5.0)

      // Môn KHTN chưa có cấu hình chuẩn -> trả về null (không tự đặt ngưỡng)
      const bmKhtn = resolveConfiguredSklBenchmark({
        benchmarkConfigs: configs,
        level: "THCS",
        grade: "6",
        matchedSubjectIds: ["sub_khtn"],
        committedSubject: "Khoa học tự nhiên",
        period: "GK1",
      })
      expect(bmKhtn).toBeNull()
    })
  })

  describe("2. Bộ lọc, tách dòng học sinh đa môn cam kết và phân biệt lớp trùng tên", () => {
    beforeEach(() => {
      // Hai cơ sở CS1 và CS2 cùng có lớp trùng tên "6/1" nhưng khác ID nội bộ
      mockPrisma.class.findMany.mockResolvedValue([
        {
          id: "cls_6_1_cs1",
          classCode: "6/1_CS1",
          className: "6/1",
          grade: "6",
          level: "THCS",
          campusId: "cp_cs1",
          campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
        },
        {
          id: "cls_6_1_cs2",
          classCode: "6/1_CS2",
          className: "6/1",
          grade: "6",
          level: "THCS",
          campusId: "cp_cs2",
          campus: { id: "cp_cs2", campusCode: "CS2", campusName: "Cơ sở 2" },
        },
      ])

      mockPrisma.student.findMany.mockResolvedValue([
        {
          id: "st_1",
          studentCode: "HS001",
          studentName: "Nguyễn Văn An",
          status: "ACTIVE",
          classId: "cls_6_1_cs1",
          campusId: "cp_cs1",
          class: {
            id: "cls_6_1_cs1",
            classCode: "6/1_CS1",
            className: "6/1",
            grade: "6",
            level: "THCS",
            campusId: "cp_cs1",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
          },
        },
        {
          id: "st_2",
          studentCode: "HS002",
          studentName: "Trần Thị Bình",
          status: "ACTIVE",
          classId: "cls_6_1_cs2",
          campusId: "cp_cs2",
          class: {
            id: "cls_6_1_cs2",
            classCode: "6/1_CS2",
            className: "6/1",
            grade: "6",
            level: "THCS",
            campusId: "cp_cs2",
            campus: { id: "cp_cs2", campusCode: "CS2", campusName: "Cơ sở 2" },
          },
        },
      ])

      // Học sinh Nguyễn Văn An cam kết 2 môn: Toán và Ngữ văn
      // Học sinh Trần Thị Bình ở CS2 cam kết 1 môn: Tiếng Anh
      mockPrisma.inputAssessmentStudent.findMany.mockResolvedValue([
        {
          id: "ias_1",
          studentCode: "HS001",
          fullName: "Nguyễn Văn An",
          grade: "6",
          admissionResult: "Đạt cam kết",
          directorNote: "Môn cam kết: [Toán, Ngữ văn, Tâm lý]",
        },
        {
          id: "ias_2",
          studentCode: "HS002",
          fullName: "Trần Thị Bình",
          grade: "6",
          admissionResult: "Đạt cam kết",
          directorNote: "Môn cam kết: [Tiếng Anh]",
        },
      ])

      mockPrisma.learningSupportTarget.findMany.mockResolvedValue([])

      mockPrisma.subjectBenchmarkConfig.findMany.mockResolvedValue([
        {
          academicYearId: "ay_2026",
          evaluationPeriod: "ALL",
          level: "THCS",
          grade: "ALL",
          subjectId: "ALL",
          benchmarkScore: 5.0,
        },
      ])

      mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
        // Điểm Toán của Nguyễn Văn An: KSĐN = 4.5, GK1 = 5.0, CK1 = 5.5, GK2 = 7.0, CK2 = 8.0
        {
          studentId: "st_1",
          subjectId: "sub_toan",
          evaluationPeriod: "KSĐN",
          compositeScore: 4.5,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          studentId: "st_1",
          subjectId: "sub_toan",
          evaluationPeriod: "GK1",
          compositeScore: 5.0,
          componentScores: JSON.stringify({ gk: "5.0" }),
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          studentId: "st_1",
          subjectId: "sub_toan",
          evaluationPeriod: "CK1",
          compositeScore: 5.5,
          componentScores: JSON.stringify({ ck: "5.5" }),
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          studentId: "st_1",
          subjectId: "sub_toan",
          evaluationPeriod: "GK2",
          compositeScore: 7.0,
          componentScores: JSON.stringify({ gk: "7.0" }),
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          studentId: "st_1",
          subjectId: "sub_toan",
          evaluationPeriod: "CK2",
          compositeScore: 8.0,
          componentScores: JSON.stringify({ ck: "8.0" }),
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        // Điểm Ngữ văn của Nguyễn Văn An: KSĐN = 4.0, các kỳ sau chưa có điểm
        {
          studentId: "st_1",
          subjectId: "sub_van",
          evaluationPeriod: "KSĐN",
          compositeScore: 4.0,
          subject: { id: "sub_van", subjectCode: "NVA", subjectName: "Ngữ Văn" },
        },
      ])
    })

    it("Học sinh cam kết Toán và Ngữ văn xuất hiện trên 2 dòng riêng, có họ tên ở cả 2 dòng và khớp đủ 5 cột điểm", async () => {
      const report = await generateEntranceCommitmentReport(
        { academicYearId: "ay_2026", campusId: "cp_cs1" },
        fullAccessScope
      )

      expect(report.classGroups).toHaveLength(1)
      const cs1Group = report.classGroups[0]
      expect(cs1Group.classId).toBe("cls_6_1_cs1")
      expect(cs1Group.rows).toHaveLength(2)

      const rowToan = cs1Group.rows[0]
      const rowVan = cs1Group.rows[1]

      expect(rowToan.stt).toBe(1)
      expect(rowToan.studentName).toBe("Nguyễn Văn An")
      expect(rowToan.committedSubject).toBe("Toán")
      expect(rowToan.scores.KSĐN.display).toBe("4,5 ↓")
      expect(rowToan.scores.GK1.display).toBe("5,0")
      expect(rowToan.scores.CK1.display).toBe("5,5 ↑")
      expect(rowToan.scores.GK2.display).toBe("7,0 ↑")
      expect(rowToan.scores.CK2.display).toBe("8,0 ↑")

      expect(rowVan.stt).toBe(2)
      expect(rowVan.studentName).toBe("Nguyễn Văn An")
      expect(rowVan.committedSubject).toBe("Ngữ văn")
      expect(rowVan.scores.KSĐN.display).toBe("4,0 ↓")
      expect(rowVan.scores.GK1.display).toBe("—")
      expect(rowVan.scores.CK1.display).toBe("—")
      expect(rowVan.scores.GK2.display).toBe("—")
      expect(rowVan.scores.CK2.display).toBe("—")
    })

    it("Khi lọc môn Toán, chỉ hiển thị dòng Toán của học sinh đó", async () => {
      const report = await generateEntranceCommitmentReport(
        {
          academicYearId: "ay_2026",
          campusId: "cp_cs1",
          committedSubject: "Toán",
        },
        fullAccessScope
      )

      expect(report.classGroups).toHaveLength(1)
      expect(report.classGroups[0].rows).toHaveLength(1)
      expect(report.classGroups[0].rows[0].committedSubject).toBe("Toán")
      expect(report.classGroups[0].rows[0].studentName).toBe("Nguyễn Văn An")
    })

    it("Khi đổi cơ sở, danh sách lớp cập nhật theo đúng cơ sở và phân biệt đúng 2 lớp trùng tên '6/1' ở CS1 và CS2", async () => {
      const reportAll = await generateEntranceCommitmentReport(
        { academicYearId: "ay_2026", campusId: "ALL" },
        fullAccessScope
      )
      expect(reportAll.availableFilters.classes).toHaveLength(2)
      expect(reportAll.availableFilters.classes.map((c) => c.id)).toEqual([
        "cls_6_1_cs1",
        "cls_6_1_cs2",
      ])

      const reportCs2 = await generateEntranceCommitmentReport(
        { academicYearId: "ay_2026", campusId: "cp_cs2" },
        fullAccessScope
      )
      expect(reportCs2.availableFilters.classes).toHaveLength(1)
      expect(reportCs2.availableFilters.classes[0].id).toBe("cls_6_1_cs2")
      expect(reportCs2.classGroups[0].rows[0].studentName).toBe("Trần Thị Bình")
    })
  })

  describe("3. Trường hợp biên (chuyển lớp/cơ sở, hồ sơ cam kết trùng, thi lại, năm học đã kết thúc) và Phân quyền", () => {
    beforeEach(() => {
      mockPrisma.class.findMany.mockResolvedValue([
        {
          id: "cls_7a_cs1",
          classCode: "7A_CS1",
          className: "7A",
          grade: "7",
          level: "THCS",
          campusId: "cp_cs1",
          campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
        },
        {
          id: "cls_7b_cs2",
          classCode: "7B_CS2",
          className: "7B",
          grade: "7",
          level: "THCS",
          campusId: "cp_cs2",
          campus: { id: "cp_cs2", campusCode: "CS2", campusName: "Cơ sở 2" },
        },
      ])

      mockPrisma.student.findMany.mockResolvedValue([
        {
          id: "st_transfer",
          studentCode: "HS777",
          studentName: "Lê Hoàng Nam",
          status: "ACTIVE",
          classId: "cls_7a_cs1",
          campusId: "cp_cs1",
        },
      ])

      // Học sinh chuyển từ lớp 7A (CS1) sang lớp 7B (CS2)
      mockPrisma.studentTransfer.findMany.mockResolvedValue([
        {
          id: "tr_1",
          studentId: "st_transfer",
          fromClassId: "cls_7a_cs1",
          toClassId: "cls_7b_cs2",
          status: "APPROVED",
        },
      ])

      // Hồ sơ cam kết xuất hiện trùng ở cả InputAssessmentStudent và LearningSupportTarget
      mockPrisma.inputAssessmentStudent.findMany.mockResolvedValue([
        {
          id: "ias_tr",
          studentCode: "HS777",
          fullName: "Lê Hoàng Nam",
          grade: "7",
          admissionResult: "Đạt cam kết",
          directorNote: "Môn cam kết: [Toán]",
        },
      ])

      mockPrisma.learningSupportTarget.findMany.mockResolvedValue([
        {
          id: "lst_tr_1",
          studentId: "st_transfer",
          supportType: "ACADEMIC",
          sourceType: "ADMISSION",
          terminationStatus: "ACTIVE",
          reason: "Toán",
          notes: "Tự động đồng bộ từ Cam kết khảo sát đầu vào",
        },
      ])

      mockPrisma.subjectBenchmarkConfig.findMany.mockResolvedValue([
        {
          academicYearId: "ay_2026",
          evaluationPeriod: "ALL",
          level: "THCS",
          grade: "ALL",
          subjectId: "ALL",
          benchmarkScore: 5.0,
        },
      ])

      // Học sinh có điểm thi lần đầu 3.5 và điểm thi lại (kt_bu) = 6.0 ở GK1
      mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
        {
          studentId: "st_transfer",
          subjectId: "sub_toan",
          evaluationPeriod: "GK1",
          compositeScore: 3.5,
          componentScores: JSON.stringify({ gk: "3.5", kt_bu: "6.0" }),
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
      ])
    })

    it("Học sinh chuyển lớp/cơ sở chỉ xuất hiện 1 lần ở lớp hiệu lực, hợp nhất hồ sơ cam kết trùng và lấy điểm thi lại chính thức", async () => {
      const report = await generateEntranceCommitmentReport(
        { academicYearId: "ay_2026" },
        fullAccessScope
      )

      // Chỉ xuất hiện ở lớp mới cls_7b_cs2 (CS2), không xuất hiện trùng ở cls_7a_cs1
      expect(report.classGroups).toHaveLength(1)
      expect(report.classGroups[0].classId).toBe("cls_7b_cs2")
      expect(report.classGroups[0].rows).toHaveLength(1)

      const row = report.classGroups[0].rows[0]
      expect(row.studentName).toBe("Lê Hoàng Nam")
      expect(row.committedSubject).toBe("Toán")
      expect(row.scores.GK1.score).toBe(6.0)
      expect(row.scores.GK1.display).toBe("6,0 ↑")

      // Ghi nhận đầy đủ các trường hợp cần đối soát
      const noteTypes = report.reconciliationNotes.map((n) => n.type)
      expect(noteTypes).toContain("STUDENT_TRANSFERRED_CLASS")
      expect(noteTypes).toContain("DUPLICATE_COMMITMENT_MERGED")
      expect(noteTypes).toContain("MAKEUP_OR_UPDATED_SCORE_USED")
    })

    it("Tài khoản bị giới hạn theo cơ sở, lớp hoặc môn bị chặn khi truy cập ngoài phạm vi được cấp", async () => {
      const cs1RestrictedScope: ThkqAccessScope = {
        userId: "u_cs1",
        roleCode: "TEACHER",
        roleTier: "TEACHER_SCOPED",
        roleDisplayLabel: "Giáo viên CS1",
        canViewReport: true,
        canViewDetail: true,
        canExportSummary: true,
        canExportDetail: false,
        isCampusRestricted: true,
        allowedCampusIds: ["cp_cs1"],
        isClassRestricted: true,
        allowedClassIds: ["cls_7a_cs1"],
        homeroomClassIds: [],
        isSubjectRestricted: true,
        allowedSubjectIds: ["sub_van"],
        allowedSubjectCodes: ["NVA"],
      }

      // Cố tình truyền campusId = cp_cs2 ngoài phạm vi -> ném lỗi FORBIDDEN_SCOPE
      await expect(
        generateEntranceCommitmentReport(
          { academicYearId: "ay_2026", campusId: "cp_cs2" },
          cs1RestrictedScope
        )
      ).rejects.toThrow(/FORBIDDEN_SCOPE/)

      // Cố tình truyền classId = cls_7b_cs2 ngoài phạm vi -> ném lỗi FORBIDDEN_SCOPE
      await expect(
        generateEntranceCommitmentReport(
          { academicYearId: "ay_2026", classId: "cls_7b_cs2" },
          cs1RestrictedScope
        )
      ).rejects.toThrow(/FORBIDDEN_SCOPE/)

      // Cố tình truyền môn Toán ngoài phạm vi môn Ngữ văn được phân công -> ném lỗi FORBIDDEN_SCOPE
      await expect(
        generateEntranceCommitmentReport(
          { academicYearId: "ay_2026", committedSubject: "Toán" },
          cs1RestrictedScope
        )
      ).rejects.toThrow(/FORBIDDEN_SCOPE/)
    })

    it("Loại bỏ ghi chú 'Không cần cam kết' khỏi danh sách học sinh cam kết đầu vào", () => {
      const subs = parseAcademicCommittedSubjects(
        "Cần cải thiện thêm tiếng Anh (Không cần cam kết nhưng gvta sẽ phải tương tác kĩ với PH)",
        "Đạt",
        "1/1",
        "1"
      )
      expect(subs).toEqual([])
    })
  })
})
