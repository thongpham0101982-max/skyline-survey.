import { beforeEach, describe, expect, it, vi } from "vitest"

const mockPrisma = vi.hoisted(() => ({
  academicYear: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
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
  teacher: {
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

const mockAuth = vi.hoisted(() => vi.fn())
const mockResolveScope = vi.hoisted(() => vi.fn())
const mockAuditLog = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/security-guard", () => ({ writeSecurityAuditLog: mockAuditLog }))
vi.mock("@/lib/student-statistics/scope", () => ({
  resolveStudentStatisticsScope: mockResolveScope,
}))

import {
  evaluateGk1Outcome,
  generateAcademicCommitmentStatistics,
  resolveGk1ProgressThreshold,
} from "../academicCommitmentEngine"
import {
  generateExchangeStudentStatistics,
  isExchangeStudentRecord,
} from "../exchangeStudentEngine"
import {
  generateHomeschoolingStatistics,
  isHomeschoolingEntranceRecord,
} from "../homeschoolingEngine"
import {
  evaluatePsychMonthTracking,
  generatePsychologyCommitmentStatistics,
  isConfirmedPsychEntranceTarget,
} from "../psychologyCommitmentEngine"
import {
  buildAcademicHierarchy,
  evaluateLatestStandard,
  isK12Class,
  resolveLatestPeriodScore,
} from "../standardEvaluator"
import { generateOverviewStatistics } from "../overviewEngine"
import {
  buildAcademicCommitmentPdfHtml,
  buildAcademicPdfFileName,
  buildExchangePdfFileName,
  buildExchangePdfHtml,
  buildHomeschoolingPdfFileName,
  buildHomeschoolingPdfHtml,
  buildOverviewPdfFileName,
  buildOverviewPdfHtml,
  buildPsychologyCommitmentPdfHtml,
  buildPsychologyPdfFileName,
  renderHtmlToLandscapePdfBuffer,
} from "../pdfExportService"
import { StudentStatisticsAccessScope } from "../types"
import { GET as exportPdfGET } from "@/app/api/admin/student-statistics/export-pdf/route"
import { NextRequest } from "next/server"

const fullScope: StudentStatisticsAccessScope = {
  userId: "u_admin",
  roleCode: "ADMIN",
  roleDisplayLabel: "Quản trị hệ thống",
  canViewReport: true,
  canViewAcademicTab: true,
  canViewPsychologyTab: true,
  canViewDetail: true,
  canViewPsychologyComments: true,
  canExportPdf: true,
  canExportDetailPdf: true,
  isSummaryOnly: false,
  isCampusRestricted: false,
  allowedCampusIds: [],
  defaultCampusId: "ALL",
  isClassRestricted: false,
  allowedClassIds: [],
  isSubjectRestricted: false,
  allowedSubjectIds: [],
  teacherId: null,
}

const cs1OnlyScope: StudentStatisticsAccessScope = {
  ...fullScope,
  userId: "u_gdcs1",
  roleCode: "GDCS",
  roleDisplayLabel: "Giám đốc Cơ sở 1",
  isCampusRestricted: true,
  allowedCampusIds: ["cp_cs1"],
  defaultCampusId: "cp_cs1",
}

const summaryOnlyScope: StudentStatisticsAccessScope = {
  ...fullScope,
  userId: "u_summary",
  roleCode: "SUMMARY_VIEWER",
  roleDisplayLabel: "Xem tổng hợp",
  canViewDetail: false,
  canViewPsychologyComments: false,
  canExportDetailPdf: false,
  isSummaryOnly: true,
}

describe("Báo cáo thống kê học sinh trên SSM", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma.academicYear.findMany.mockResolvedValue([
      {
        id: "ay_2026",
        name: "2026-2027",
        status: "ACTIVE",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-05-31"),
      },
    ])
    mockPrisma.academicYear.findFirst.mockResolvedValue({
      id: "ay_2026",
      name: "2026-2027",
      status: "ACTIVE",
    })
    mockPrisma.campus.findMany.mockImplementation(
      async ({ where }: { where?: { id?: { in?: string[] } } }) => {
      const all = [
        { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
        { id: "cp_cs2", campusCode: "CS2", campusName: "Cơ sở 2" },
      ]
      if (where?.id?.in) return all.filter((c) => where.id.in.includes(c.id))
      return all
    })
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
      { id: "sub_ta", subjectCode: "TA", subjectName: "Tiếng Anh" },
      { id: "sub_tv", subjectCode: "TVI", subjectName: "Tiếng Việt" },
      { id: "sub_nv", subjectCode: "NVA", subjectName: "Ngữ Văn" },
    ])
    mockPrisma.inputAssessmentPeriod.findMany.mockResolvedValue([{ id: "iap_1" }])
    mockPrisma.preschoolInputAssessmentPeriod.findMany.mockResolvedValue([])
    mockPrisma.preschoolInputAssessmentStudent.findMany.mockResolvedValue([])
    mockPrisma.studentLearningCommitment.findMany.mockResolvedValue([])
    mockPrisma.studentTransfer.findMany.mockResolvedValue([])
    mockPrisma.subjectBenchmarkConfig.findMany.mockResolvedValue([])
    mockPrisma.subjectGradeConfig.findMany.mockResolvedValue([])
    mockPrisma.teacher.findMany.mockResolvedValue([
      { id: "t_psych1", userId: "u_psych1", teacherName: "Nguyễn Tâm Lý" },
    ])
  })

  describe("1. Phân loại Kết quả GK1 & Ngưỡng chuẩn (Tab 1)", () => {
    it("Tiểu học 6,0 -> 7,0 đạt tiến bộ; 5,0 -> 6,5 tăng điểm chưa đạt chuẩn", () => {
      const thPass = evaluateGk1Outcome({ ksdnScore: 6.0, gk1Score: 7.0, threshold: 7.0 })
      expect(thPass.gk1Outcome).toBe("DAT_TIEN_BO")
      expect(thPass.gk1OutcomeLabel).toBe("Đạt tiến bộ")
      expect(thPass.deltaGk1Ksdn).toBe(1)
      expect(thPass.isGk1Pass).toBe(true)
      expect(thPass.isComparableForProgress).toBe(true)
      expect(thPass.isProgressAchieved).toBe(true)

      const thIncreaseNotPass = evaluateGk1Outcome({
        ksdnScore: 5.0,
        gk1Score: 6.5,
        threshold: 7.0,
      })
      expect(thIncreaseNotPass.gk1Outcome).toBe("TANG_CHUA_DAT_CHUAN")
      expect(thIncreaseNotPass.gk1OutcomeLabel).toBe("Tăng điểm, chưa đạt chuẩn")
      expect(thIncreaseNotPass.deltaGk1Ksdn).toBe(1.5)
      expect(thIncreaseNotPass.isGk1Pass).toBe(false)
      expect(thIncreaseNotPass.isProgressAchieved).toBe(false)
    })

    it("THCS 4,0 -> 5,0 đạt tiến bộ; 5,0 -> 5,0 đạt chuẩn giữ nguyên điểm", () => {
      const thcsProgress = evaluateGk1Outcome({ ksdnScore: 4.0, gk1Score: 5.0, threshold: 5.0 })
      expect(thcsProgress.gk1Outcome).toBe("DAT_TIEN_BO")
      expect(thcsProgress.isProgressAchieved).toBe(true)

      const thcsEqual = evaluateGk1Outcome({ ksdnScore: 5.0, gk1Score: 5.0, threshold: 5.0 })
      expect(thcsEqual.gk1Outcome).toBe("DAT_CHUAN_GIU_NGUYEN")
      expect(thcsEqual.gk1OutcomeLabel).toBe("Đạt chuẩn, giữ nguyên điểm")
      expect(thcsEqual.deltaGk1Ksdn).toBe(0)
      expect(thcsEqual.isGk1Pass).toBe(true)
      expect(thcsEqual.isProgressAchieved).toBe(false)
    })

    it("Điểm giảm, điểm 0 hợp lệ, thiếu KSĐN/GK1 và thiếu cấu hình chuẩn", () => {
      const passDrop = evaluateGk1Outcome({ ksdnScore: 8.5, gk1Score: 7.0, threshold: 7.0 })
      expect(passDrop.gk1Outcome).toBe("DAT_CHUAN_GIAM")
      expect(passDrop.deltaGk1Ksdn).toBe(-1.5)

      const failDrop = evaluateGk1Outcome({ ksdnScore: 4.0, gk1Score: 0, threshold: 5.0 })
      expect(failDrop.gk1Outcome).toBe("CHUA_DAT_CHUAN_GIAM")
      expect(failDrop.deltaGk1Ksdn).toBe(-4)
      expect(failDrop.isComparableForProgress).toBe(true)

      const zeroToPass = evaluateGk1Outcome({ ksdnScore: 0, gk1Score: 5.0, threshold: 5.0 })
      expect(zeroToPass.gk1Outcome).toBe("DAT_TIEN_BO")
      expect(zeroToPass.deltaGk1Ksdn).toBe(5)

      const failSame = evaluateGk1Outcome({ ksdnScore: 4.5, gk1Score: 4.5, threshold: 5.0 })
      expect(failSame.gk1Outcome).toBe("CHUA_DAT_CHUAN_GIU_NGUYEN")

      // Thiếu KSĐN nhưng GK1 đạt chuẩn vẫn tính isGk1Pass = true
      const missingKsdn = evaluateGk1Outcome({ ksdnScore: null, gk1Score: 7.5, threshold: 7.0 })
      expect(missingKsdn.gk1Outcome).toBe("CHUA_DU_DU_LIEU")
      expect(missingKsdn.deltaGk1Ksdn).toBeNull()
      expect(missingKsdn.isGk1Pass).toBe(true)
      expect(missingKsdn.isComparableForProgress).toBe(false)

      // Thiếu cấu hình chuẩn cho THPT khi chưa cấu hình SubjectBenchmarkConfig
      const thptMissing = resolveGk1ProgressThreshold({
        level: "THPT",
        grade: "10",
        matchedSubjectIds: ["sub_toan"],
        committedSubject: "Toán",
        benchmarkConfigs: [],
      })
      expect(thptMissing.threshold).toBeNull()
      const noConfigOutcome = evaluateGk1Outcome({
        ksdnScore: 5.0,
        gk1Score: 7.0,
        threshold: thptMissing.threshold,
      })
      expect(noConfigOutcome.gk1Outcome).toBe("CHUA_CO_CAU_HINH_CHUAN")
      expect(noConfigOutcome.isComparableForProgress).toBe(false)
      expect(noConfigOutcome.isGk1Pass).toBeNull()
    })
  })

  describe("2. Tổng hợp Tab 1: nhiều môn, trùng hồ sơ, chuyển cơ sở, điểm kiểm tra bù", () => {
    it("Tính đúng số HS duy nhất, hợp nhất trùng, chuyển cơ sở, ưu tiên điểm KT bù", async () => {
      mockPrisma.class.findMany.mockResolvedValue([
        {
          id: "cls_3a",
          classCode: "3A",
          className: "3/1",
          grade: "3",
          level: "Tieu hoc",
          campusId: "cp_cs1",
          campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
        },
        {
          id: "cls_6a",
          classCode: "6A",
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
          studentName: "Nguyễn Minh An",
          classId: "cls_3a",
          campusId: "cp_cs1",
          class: {
            id: "cls_3a",
            classCode: "3A",
            className: "3/1",
            grade: "3",
            level: "Tieu hoc",
            campusId: "cp_cs1",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
          },
        },
        {
          id: "st_2",
          studentCode: "HS002",
          studentName: "Trần Bảo Bình",
          classId: "cls_3a", // Sẽ chuyển sang cls_6a (CS2) qua studentTransfer
          campusId: "cp_cs1",
          class: {
            id: "cls_3a",
            classCode: "3A",
            className: "3/1",
            grade: "3",
            level: "Tieu hoc",
            campusId: "cp_cs1",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
          },
        },
      ])

      mockPrisma.studentTransfer.findMany.mockResolvedValue([
        {
          id: "tr_1",
          studentId: "st_2",
          fromClassId: "cls_3a",
          toClassId: "cls_6a",
          status: "APPROVED",
          createdAt: new Date("2026-09-01"),
        },
      ])

      // HS001 cam kết 2 môn (Toán, Tiếng Anh) + bản ghi trùng Toán từ LearningSupportTarget
      mockPrisma.inputAssessmentStudent.findMany.mockResolvedValue([
        {
          id: "ias_1",
          studentCode: "HS001",
          fullName: "Nguyễn Minh An",
          admissionResult: "Đạt cam kết",
          directorNote: "Môn cam kết: [Toán, Tiếng Anh]",
        },
        {
          id: "ias_2",
          studentCode: "HS002",
          fullName: "Trần Bảo Bình",
          admissionResult: "Đạt cam kết",
          directorNote: "Môn cam kết: [Toán]",
        },
      ])
      mockPrisma.learningSupportTarget.findMany.mockResolvedValue([
        {
          id: "lst_dup",
          studentId: "st_1",
          supportType: "ACADEMIC",
          sourceType: "ADMISSION",
          terminationStatus: "ACTIVE",
          reason: "Toán",
          notes: "Cam kết đầu vào môn Toán",
        },
      ])

      // Điểm: HS001 Toán KSĐN=6.0, GK1 có điểm KT bù=7.0 (thay cho 6.5) -> Đạt tiến bộ
      // HS001 Tiếng Anh: KSĐN=5.0, GK1=6.5 -> Tăng điểm, chưa đạt chuẩn
      // HS002 Toán (THCS): KSĐN=4.0, GK1=5.5 -> Đạt tiến bộ
      mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
        {
          id: "g1",
          studentId: "st_1",
          subjectId: "sub_toan",
          evaluationPeriod: "KSĐN",
          compositeScore: 6.0,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          id: "g2",
          studentId: "st_1",
          subjectId: "sub_toan",
          evaluationPeriod: "GK1",
          compositeScore: 6.5,
          componentScores: JSON.stringify({ gk: 6.5, kt_bu: 7.0 }),
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          id: "g3",
          studentId: "st_1",
          subjectId: "sub_ta",
          evaluationPeriod: "KSĐN",
          compositeScore: 5.0,
          subject: { id: "sub_ta", subjectCode: "TA", subjectName: "Tiếng Anh" },
        },
        {
          id: "g4",
          studentId: "st_1",
          subjectId: "sub_ta",
          evaluationPeriod: "GK1",
          compositeScore: 6.5,
          subject: { id: "sub_ta", subjectCode: "TA", subjectName: "Tiếng Anh" },
        },
        {
          id: "g5",
          studentId: "st_2",
          subjectId: "sub_toan",
          evaluationPeriod: "KSĐN",
          compositeScore: 4.0,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          id: "g6",
          studentId: "st_2",
          subjectId: "sub_toan",
          evaluationPeriod: "GK1",
          compositeScore: 5.5,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
      ])

      const result = await generateAcademicCommitmentStatistics(
        { academicYearId: "ay_2026", asOfDate: "2026-11-20T00:00:00Z" },
        fullScope
      )

      // 2 học sinh duy nhất, 3 lượt cam kết (HS001 2 môn + HS002 1 môn)
      expect(result.summary.distinctStudentCount).toBe(2)
      expect(result.summary.commitmentRowCount).toBe(3)
      expect(result.summary.comparableRowCount).toBe(3)
      expect(result.summary.gk1PassCount).toBe(2)
      expect(result.summary.progressCount).toBe(2)
      // Toàn hệ thống = 2/3 = 66.7% (KHÔNG phải trung bình cộng (50% + 100%)/2 = 75%)
      expect(result.summary.progressRate).toBe(66.7)

      // HS002 đã chuyển sang CS2 (lớp 6/1)
      const hs2Row = result.detailRows.find((r) => r.studentCode === "HS002")
      expect(hs2Row?.campusCode).toBe("CS2")
      expect(hs2Row?.className).toBe("6/1")

      // HS001 môn Toán dùng điểm KT bù = 7.0 -> Đạt tiến bộ
      const hs1Toan = result.detailRows.find(
        (r) => r.studentCode === "HS001" && r.committedSubject === "Toán"
      )
      expect(hs1Toan?.gk1Score).toBe(7)
      expect(hs1Toan?.gk1Outcome).toBe("DAT_TIEN_BO")

      // Có ghi nhận đối soát trùng hồ sơ + chuyển lớp + KT bù
      expect(result.reconciliationItems.some((r) => r.type === "DUPLICATE_COMMITMENT_MERGED")).toBe(true)
      expect(result.reconciliationItems.some((r) => r.type === "STUDENT_TRANSFERRED_CLASS")).toBe(true)
      expect(result.reconciliationItems.some((r) => r.type === "MAKEUP_OR_UPDATED_SCORE_USED")).toBe(true)
    })
  })

  describe("3. Tab 2 — Tâm lý cam kết đầu vào", () => {
    it("Chỉ nhận đúng diện Tâm lý cam kết đầu vào; loại trừ hồ sơ tâm lý diện khác", async () => {
      expect(
        isConfirmedPsychEntranceTarget({
          supportType: "PSYCHOLOGICAL",
          sourceType: "ADMISSION",
        })
      ).toBe(true)
      expect(
        isConfirmedPsychEntranceTarget({
          supportType: "PSYCHOLOGICAL",
          sourceType: "GVCN",
          reason: "Hỗ trợ tâm lý định kỳ",
        })
      ).toBe(false)

      mockPrisma.class.findMany.mockResolvedValue([
        {
          id: "cls_4a",
          classCode: "4A",
          className: "4/1",
          grade: "4",
          campusId: "cp_cs1",
          campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
        },
      ])
      mockPrisma.student.findMany.mockResolvedValue([
        {
          id: "st_p1",
          studentCode: "HS101",
          studentName: "Lê Gia Hân",
          classId: "cls_4a",
          campusId: "cp_cs1",
          class: {
            id: "cls_4a",
            classCode: "4A",
            className: "4/1",
            grade: "4",
            campusId: "cp_cs1",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
          },
        },
        {
          id: "st_p2",
          studentCode: "HS102",
          studentName: "Phạm Quốc Khánh",
          classId: "cls_4a",
          campusId: "cp_cs1",
          class: {
            id: "cls_4a",
            classCode: "4A",
            className: "4/1",
            grade: "4",
            campusId: "cp_cs1",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
          },
        },
      ])

      // HS101 có hồ sơ KSĐV Tâm lý cam kết đầu vào nhưng CHƯA phân công GV
      mockPrisma.inputAssessmentStudent.findMany.mockResolvedValue([
        {
          id: "ias_p1",
          studentCode: "HS101",
          fullName: "Lê Gia Hân",
          admissionResult: "Đạt cam kết",
          directorNote: "Cam kết theo dõi Tâm lý đầu vào",
        },
      ])
      // HS102 là hồ sơ tâm lý đề xuất từ GVCN (diện khác) -> KHÔNG được xuất hiện
      mockPrisma.learningSupportTarget.findMany.mockResolvedValue([
        {
          id: "lst_other",
          studentId: "st_p2",
          supportType: "PSYCHOLOGICAL",
          sourceType: "GVCN",
          reason: "Hỗ trợ hòa nhập lớp",
          notes: "GVCN đề xuất giữa kỳ",
          terminationStatus: "ACTIVE",
          assignments: [],
          evaluations: [],
        },
      ])

      const result = await generatePsychologyCommitmentStatistics(
        { academicYearId: "ay_2026", month: "Tháng 10", asOfDate: "2026-10-18T10:00:00Z" },
        fullScope
      )

      expect(result.summary.totalStudents).toBe(1)
      expect(result.summary.unassignedStudents).toBe(1)
      expect(result.detailRows).toHaveLength(1)
      expect(result.detailRows[0].studentCode).toBe("HS101")
      expect(result.detailRows[0].assignedTeacherName).toBe("Chưa phân công")
      expect(result.detailRows[0].categoryLabel).toBe("Tâm lý cam kết đầu vào")
      expect(result.detailRows[0].teacherEvalStatus).toBe("CHUA_PHAN_CONG")
    })

    it("Xử lý đúng tuần không có lịch, nhiều lượt trong tuần, quá hạn và tổng kết tháng", () => {
      const tracked = evaluatePsychMonthTracking({
        monthLabel: "Tháng 10",
        monthNumber: 10,
        calendarYear: 2026,
        asOfDate: new Date("2026-10-18T12:00:00Z"), // Đang ở Tuần 3
        isUnassigned: false,
        trackingStartDate: new Date("2026-10-08T00:00:00Z"), // Tuần 1 chưa có lịch
        scheduledSessionsPerWeek: { 2: 2 }, // Tuần 2 có 2 lượt nhưng mới xong 1 -> Quá hạn (1/2)
        evaluations: [
          {
            id: "ev1",
            periodType: "WEEK",
            periodName: "Tuần 2 - Tháng 10 (Lượt 1)",
            trackingLevel: "Tiến triển tốt",
            comment: "Học sinh hợp tác tốt. Hướng hỗ trợ tiếp theo: Duy trì trao đổi nhóm nhỏ.",
            evaluatorName: "Nguyễn Tâm Lý",
            createdAt: "2026-10-12T08:00:00Z",
          },
          {
            id: "ev_m",
            periodType: "MONTH",
            periodName: "Tổng kết Tháng 10",
            trackingLevel: "Ổn định tích cực",
            comment: "Tổng kết tháng 10 đạt yêu cầu.",
            evaluatorName: "Nguyễn Tâm Lý",
            createdAt: "2026-10-17T08:00:00Z",
          },
        ],
        canViewComments: true,
      })

      expect(tracked.weeks[0].status).toBe("KHONG_CO_LICH")
      expect(tracked.weeks[1].status).toBe("QUA_HAN")
      expect(tracked.weeks[1].completedSessions).toBe(1)
      expect(tracked.weeks[1].totalScheduledSessions).toBe(2)
      expect(tracked.weeks[2].status).toBe("DEN_HAN")
      expect(tracked.weeks[3].status).toBe("CHUA_DEN_HAN")
      expect(tracked.hasMonthSummary).toBe(true)
      expect(tracked.monthSummaryResult).toBe("Ổn định tích cực")
      expect(tracked.teacherEvalStatus).toBe("CO_DANH_GIA_QUA_HAN")
      expect(tracked.latestCommentShort).toContain("Tổng kết tháng 10")
    })
  })

  describe("4. Xuất PDF & Phân quyền phía máy chủ", () => {
    it("Xuất HTML/PDF tiếng Việt, trạng thái rỗng và ẩn chi tiết cho tài khoản chỉ xem tổng hợp", async () => {
      mockPrisma.class.findMany.mockResolvedValue([])
      mockPrisma.student.findMany.mockResolvedValue([])
      mockPrisma.inputAssessmentStudent.findMany.mockResolvedValue([])
      mockPrisma.learningSupportTarget.findMany.mockResolvedValue([])
      mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([])

      const emptyAcademic = await generateAcademicCommitmentStatistics(
        { academicYearId: "ay_2026" },
        fullScope
      )
      const emptyHtml = buildAcademicCommitmentPdfHtml(emptyAcademic, fullScope, "10:00 25/11/2026")
      expect(emptyHtml).toContain("Chưa có dữ liệu phù hợp")
      expect(emptyHtml).toContain("HỆ THỐNG GIÁO DỤC SKY-LINE")
      expect(buildAcademicPdfFileName(emptyAcademic)).toContain("Bao_cao_HS_Cam_ket_mon_hoc")

      const pdfBuf = await renderHtmlToLandscapePdfBuffer(emptyHtml, "Test_PDF")
      expect(pdfBuf.toString("utf-8").startsWith("%PDF-")).toBe(true)

      const summaryPsych = await generatePsychologyCommitmentStatistics(
        { academicYearId: "ay_2026", month: "Tháng 10" },
        summaryOnlyScope
      )
      const summaryHtml = buildPsychologyCommitmentPdfHtml(
        summaryPsych,
        summaryOnlyScope,
        "10:00 25/11/2026"
      )
      expect(summaryHtml).toContain("chỉ có quyền xem số liệu tổng hợp")
      expect(buildPsychologyPdfFileName(summaryPsych)).toContain("Bao_cao_Tam_ly_cam_ket")
    })

    it("Chặn truy cập trực tiếp endpoint xuất PDF khi chưa đăng nhập hoặc ngoài phạm vi phân quyền", async () => {
      // 1. Chưa đăng nhập -> 401
      mockAuth.mockResolvedValueOnce(null)
      const res401 = await exportPdfGET(
        new NextRequest("http://localhost/api/admin/student-statistics/export-pdf?tab=academic")
      )
      expect(res401.status).toBe(401)

      // 2. Tài khoản CS1 cố xuất PDF của CS2 -> 403
      mockAuth.mockResolvedValueOnce({ user: { id: "u_gdcs1", role: "GDCS" } })
      mockResolveScope.mockResolvedValueOnce(cs1OnlyScope)
      const res403Campus = await exportPdfGET(
        new NextRequest(
          "http://localhost/api/admin/student-statistics/export-pdf?tab=academic&academicYearId=ay_2026&campusId=cp_cs2"
        )
      )
      expect(res403Campus.status).toBe(403)

      // 3. Tài khoản không có quyền Tâm lý cố xuất PDF tab psychology -> 403
      mockAuth.mockResolvedValueOnce({ user: { id: "u_gv", role: "TEACHER" } })
      mockResolveScope.mockResolvedValueOnce({ ...fullScope, canViewPsychologyTab: false })
      const res403Psych = await exportPdfGET(
        new NextRequest(
          "http://localhost/api/admin/student-statistics/export-pdf?tab=psychology&academicYearId=ay_2026"
        )
      )
      expect(res403Psych.status).toBe(403)

      // 4. Tài khoản hợp lệ -> 200 application/pdf
      mockPrisma.class.findMany.mockResolvedValue([])
      mockPrisma.student.findMany.mockResolvedValue([])
      mockPrisma.inputAssessmentStudent.findMany.mockResolvedValue([])
      mockPrisma.learningSupportTarget.findMany.mockResolvedValue([])
      mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([])
      mockAuth.mockResolvedValueOnce({ user: { id: "u_admin", role: "ADMIN" } })
      mockResolveScope.mockResolvedValueOnce(fullScope)

      const res200 = await exportPdfGET(
        new NextRequest(
          "http://localhost/api/admin/student-statistics/export-pdf?tab=academic&academicYearId=ay_2026"
        )
      )
      expect(res200.status).toBe(200)
      expect(res200.headers.get("Content-Type")).toBe("application/pdf")
      expect(res200.headers.get("Content-Disposition")).toContain("attachment; filename=")
    })
  })

  describe("5. Tab 3 — Theo dõi học sinh nhập học Chương trình Homeschooling", () => {
    it("Nhận diện chính xác hồ sơ Homeschooling từ JSON kqHocTap và targetType, loại trừ Bộ GD&ĐT", () => {
      const fromJson = isHomeschoolingEntranceRecord({
        kqHocTap: JSON.stringify({
          programType: "HOMESCHOOLING",
          homeschool: { learningMode: "ONLINE", subjects: [] },
        }),
      })
      expect(fromJson.isHomeschooling).toBe(true)
      expect(fromJson.learningModeLabel).toContain("Online")

      const fromTarget = isHomeschoolingEntranceRecord({ targetType: "Home Schooling" })
      expect(fromTarget.isHomeschooling).toBe(true)

      const moet = isHomeschoolingEntranceRecord({
        kqHocTap: JSON.stringify({ programType: "BO_GD_DT" }),
        targetType: "Tuyển mới",
      })
      expect(moet.isHomeschooling).toBe(false)
    })

    it("Tổng hợp đầy đủ HS Homeschooling có cam kết & không cam kết, điểm KSĐN/định kỳ/Tiến bộ và xuất PDF", async () => {
      mockPrisma.class.findMany.mockResolvedValue([
        {
          id: "cls_5a",
          classCode: "5A",
          className: "5/1",
          grade: "5",
          level: "Tieu hoc",
          campusId: "cp_cs1",
          campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
        },
      ])
      mockPrisma.student.findMany.mockResolvedValue([
        {
          id: "st_hs1",
          studentCode: "HS501",
          studentName: "Võ Hoàng Minh",
          classId: "cls_5a",
          campusId: "cp_cs1",
          class: {
            id: "cls_5a",
            classCode: "5A",
            className: "5/1",
            grade: "5",
            level: "Tieu hoc",
            campusId: "cp_cs1",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
          },
        },
        {
          id: "st_hs2",
          studentCode: "HS502",
          studentName: "Đặng Thảo Vy",
          classId: "cls_5a",
          campusId: "cp_cs1",
          class: {
            id: "cls_5a",
            classCode: "5A",
            className: "5/1",
            grade: "5",
            level: "Tieu hoc",
            campusId: "cp_cs1",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
          },
        },
      ])
      mockPrisma.inputAssessmentStudent.findMany.mockResolvedValue([
        {
          id: "ias_hs1",
          studentCode: "HS501",
          fullName: "Võ Hoàng Minh",
          kqHocTap: JSON.stringify({
            programType: "HOMESCHOOLING",
            homeschool: { learningMode: "INDEPENDENT", subjects: [] },
          }),
          admissionResult: "Đạt cam kết",
          directorNote: "Môn cam kết: [Toán]",
        },
        {
          id: "ias_hs2",
          studentCode: "HS502",
          fullName: "Đặng Thảo Vy",
          kqHocTap: JSON.stringify({
            programType: "HOMESCHOOLING",
            homeschool: { learningMode: "CO_OP", subjects: [] },
          }),
          admissionResult: "Đạt tuyển thẳng",
          directorNote: "Không cần cam kết",
        },
      ])
      mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
        {
          id: "gh1",
          studentId: "st_hs1",
          subjectId: "sub_toan",
          evaluationPeriod: "KSĐN",
          compositeScore: 6.0,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          id: "gh2",
          studentId: "st_hs1",
          subjectId: "sub_toan",
          evaluationPeriod: "GK1",
          compositeScore: 7.5,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          id: "gh3",
          studentId: "st_hs1",
          subjectId: "sub_toan",
          evaluationPeriod: "CK1",
          compositeScore: 8.0,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
      ])

      const result = await generateHomeschoolingStatistics(
        { academicYearId: "ay_2026" },
        fullScope
      )

      expect(result.summary.distinctStudentCount).toBe(2)
      expect(result.summary.committedStudentCount).toBe(1)

      const hs1Row = result.detailRows.find(
        (r) => r.studentCode === "HS501" && r.subjectName === "Toán"
      )
      expect(hs1Row?.hasCommitment).toBe(true)
      expect(hs1Row?.commitmentSummary).toContain("Toán")
      expect(hs1Row?.ksdnScore).toBe(6.0)
      expect(hs1Row?.gk1Score).toBe(7.5)
      expect(hs1Row?.ck1Score).toBe(8.0)
      expect(hs1Row?.gk1Outcome).toBe("DAT_TIEN_BO")

      // HS502 không cam kết vẫn xuất hiện với các môn cốt lõi Tiểu học (Toán, Tiếng Việt, Tiếng Anh)
      const hs2Rows = result.detailRows.filter((r) => r.studentCode === "HS502")
      expect(hs2Rows.length).toBe(3)
      expect(hs2Rows[0].hasCommitment).toBe(false)
      expect(hs2Rows[0].commitmentSummary).toBe("Không cam kết")

      // Kiểm tra HTML/PDF cho Homeschooling
      const html = buildHomeschoolingPdfHtml(result, fullScope, "17:00 25/11/2026")
      expect(html).toContain("HOMESCHOOLING")
      expect(html).toContain("Võ Hoàng Minh")
      expect(html).toContain("Đạt tiến bộ")
      expect(buildHomeschoolingPdfFileName(result)).toContain("Bao_cao_HS_Homeschooling")

      // Endpoint export-pdf?tab=homeschooling trả 200 PDF
      mockAuth.mockResolvedValueOnce({ user: { id: "u_admin", role: "ADMIN" } })
      mockResolveScope.mockResolvedValueOnce(fullScope)
      const pdfRes = await exportPdfGET(
        new NextRequest(
          "http://localhost/api/admin/student-statistics/export-pdf?tab=homeschooling&academicYearId=ay_2026"
        )
      )
      expect(pdfRes.status).toBe(200)
      expect(pdfRes.headers.get("Content-Type")).toBe("application/pdf")
    })
  })

  describe("6. Tab 4 — Theo dõi học sinh diện Học giao lưu (GIAO_LUU)", () => {
    it("Chỉ nhận học sinh có studentType === 'GIAO_LUU', loại trừ CHINH_KHOA và TRANSFERRED_OUT", () => {
      expect(isExchangeStudentRecord({ studentType: "GIAO_LUU", status: "ACTIVE" })).toBe(true)
      expect(isExchangeStudentRecord({ studentType: "CHINH_KHOA", status: "ACTIVE" })).toBe(false)
      expect(
        isExchangeStudentRecord({ studentType: "GIAO_LUU", status: "TRANSFERRED_OUT" })
      ).toBe(false)
    })

    it("Tổng hợp HS diện Học giao lưu, điểm KSĐN / định kỳ / Tiến bộ và xuất PDF tab=exchange", async () => {
      mockPrisma.class.findMany.mockResolvedValue([
        {
          id: "cls_7a",
          classCode: "7A",
          className: "7/1",
          grade: "7",
          level: "THCS",
          campusId: "cp_cs1",
          campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
        },
      ])
      mockPrisma.student.findMany.mockResolvedValue([
        {
          id: "st_ex1",
          studentCode: "HS701",
          studentName: "Nguyễn Bảo Ngọc",
          studentType: "GIAO_LUU",
          studentTypeNote: "Học giao lưu theo kết quả khảo sát đầu vào",
          status: "ACTIVE",
          classId: "cls_7a",
          campusId: "cp_cs1",
          class: {
            id: "cls_7a",
            classCode: "7A",
            className: "7/1",
            grade: "7",
            level: "THCS",
            campusId: "cp_cs1",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
          },
        },
      ])
      mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
        {
          id: "ge1",
          studentId: "st_ex1",
          subjectId: "sub_toan",
          evaluationPeriod: "KSĐN",
          compositeScore: 4.5,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          id: "ge2",
          studentId: "st_ex1",
          subjectId: "sub_toan",
          evaluationPeriod: "GK1",
          compositeScore: 6.0,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
        {
          id: "ge3",
          studentId: "st_ex1",
          subjectId: "sub_toan",
          evaluationPeriod: "CK1",
          compositeScore: 6.5,
          subject: { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học" },
        },
      ])

      const result = await generateExchangeStudentStatistics(
        { academicYearId: "ay_2026" },
        fullScope
      )

      expect(result.summary.distinctStudentCount).toBe(1)
      expect(result.summary.trackedRowCount).toBe(3) // Toán, Ngữ văn, Tiếng Anh (THCS)
      const toanRow = result.detailRows.find((r) => r.subjectName === "Toán")
      expect(toanRow?.studentTypeLabel).toBe("Học giao lưu")
      expect(toanRow?.ksdnScore).toBe(4.5)
      expect(toanRow?.gk1Score).toBe(6.0)
      expect(toanRow?.ck1Score).toBe(6.5)
      expect(toanRow?.gk1Outcome).toBe("DAT_TIEN_BO")

      const html = buildExchangePdfHtml(result, fullScope, "17:12 25/11/2026")
      expect(html).toContain("HỌC SINH DIỆN HỌC GIAO LƯU")
      expect(html).toContain("Nguyễn Bảo Ngọc")
      expect(html).toContain("Đạt tiến bộ")
      expect(buildExchangePdfFileName(result)).toContain("Bao_cao_HS_Hoc_giao_luu")

      mockAuth.mockResolvedValueOnce({ user: { id: "u_admin", role: "ADMIN" } })
      mockResolveScope.mockResolvedValueOnce(fullScope)
      const pdfRes = await exportPdfGET(
        new NextRequest(
          "http://localhost/api/admin/student-statistics/export-pdf?tab=exchange&academicYearId=ay_2026"
        )
      )
      expect(pdfRes.status).toBe(200)
      expect(pdfRes.headers.get("Content-Type")).toBe("application/pdf")
    })
  })

  describe("7. Chuẩn quy định mới (kỳ gần nhất), phân cấp Hệ thống → Cơ sở → Khối → Lớp & Tab Tổng quan", () => {
    it("Phân loại đúng Tiểu học (7–8 Đạt chuẩn, 9–10 Tiến bộ vượt bậc) và THCS (5–7 Đạt chuẩn, 8–10 Tiến bộ vượt bậc) theo kỳ gần nhất", () => {
      // Kỳ gần nhất: có KSĐN=5.0, GK1=7.5 -> lấy GK1
      const latestGk1 = resolveLatestPeriodScore({ ksdnScore: 5.0, gk1Score: 7.5 })
      expect(latestGk1.latestPeriod).toBe("GK1")
      expect(latestGk1.latestScore).toBe(7.5)

      // Có thêm CK1=9.0 -> lấy CK1
      const latestCk1 = resolveLatestPeriodScore({ ksdnScore: 5.0, gk1Score: 7.5, ck1Score: 9.0 })
      expect(latestCk1.latestPeriod).toBe("CK1")
      expect(latestCk1.latestScore).toBe(9.0)

      // Tiểu học: 6.5 Chưa đạt chuẩn, 7.0 & 8.5 Đạt chuẩn, 9.0 & 10 Tiến bộ vượt bậc
      expect(evaluateLatestStandard({ level: "TIEU_HOC", latestScore: 6.5 }).classification).toBe("CHUA_DAT_CHUAN")
      const thDat = evaluateLatestStandard({ level: "TIEU_HOC", latestScore: 8.0 })
      expect(thDat.classification).toBe("DAT_CHUAN")
      expect(thDat.isStandardMet).toBe(true)
      expect(thDat.isOutstandingProgress).toBe(false)
      const thVuot = evaluateLatestStandard({ level: "TIEU_HOC", latestScore: 9.0 })
      expect(thVuot.classification).toBe("TIEN_BO_VUOT_BAC")
      expect(thVuot.isStandardMet).toBe(true)
      expect(thVuot.isOutstandingProgress).toBe(true)

      // THCS: 4.5 Chưa đạt chuẩn, 5.0 & 7.5 Đạt chuẩn, 8.0 & 10 Tiến bộ vượt bậc
      expect(evaluateLatestStandard({ level: "THCS", latestScore: 4.5 }).classification).toBe("CHUA_DAT_CHUAN")
      const thcsDat = evaluateLatestStandard({ level: "THCS", latestScore: 7.0 })
      expect(thcsDat.classification).toBe("DAT_CHUAN")
      expect(thcsDat.isStandardMet).toBe(true)
      const thcsVuot = evaluateLatestStandard({ level: "THCS", latestScore: 8.0 })
      expect(thcsVuot.classification).toBe("TIEN_BO_VUOT_BAC")
      expect(thcsVuot.isStandardMet).toBe(true)
      expect(thcsVuot.isOutstandingProgress).toBe(true)
    })

    it("Xây dựng đúng cây Toàn hệ thống → Cơ sở → Khối → Lớp và Tab Tổng quan + Xuất PDF overview", async () => {
      const h = buildAcademicHierarchy(
        [
          {
            studentId: "s1",
            studentCode: "HS1",
            campusId: "cp1",
            campusCode: "CS1",
            campusName: "Cơ sở 1",
            grade: "3",
            classId: "c31",
            className: "3/1",
            isEligibleForStandardRate: true,
            isStandardMet: true,
            isStandardBandOnly: false,
            isOutstandingProgress: true,
          },
          {
            studentId: "s2",
            studentCode: "HS2",
            campusId: "cp1",
            campusCode: "CS1",
            campusName: "Cơ sở 1",
            grade: "3",
            classId: "c31",
            className: "3/1",
            isEligibleForStandardRate: true,
            isStandardMet: false,
            isStandardBandOnly: false,
            isOutstandingProgress: false,
          },
        ],
        {
          system: 20,
          byCampus: new Map([["cp1", 20]]),
          byCampusGrade: new Map([["cp1_3", 10]]),
          byClass: new Map([["c31", 10]]),
        }
      )

      expect(h.distinctStudentCount).toBe(2)
      expect(h.enrolledStudentCount).toBe(20)
      expect(h.enrolledShareRate).toBe(10)
      expect(h.totalStandardMetCount).toBe(1)
      expect(h.outstandingCount).toBe(1)
      expect(h.standardRate).toBe(50)
      expect(h.children?.[0].children?.[0].children?.[0].label).toBe("Lớp 3/1")

      // Tab Tổng quan & PDF overview (có dữ liệu Lịch sử HS chuyển đến type = "IN")
      mockPrisma.class.findMany.mockResolvedValue([])
      mockPrisma.student.findMany.mockResolvedValue([])
      mockPrisma.inputAssessmentStudent.findMany.mockResolvedValue([])
      mockPrisma.learningSupportTarget.findMany.mockResolvedValue([])
      mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([])
      mockPrisma.studentTransfer.findMany.mockResolvedValue([
        {
          id: "tin_1",
          type: "IN",
          studentId: "st_in1",
          student: {
            id: "st_in1",
            studentCode: "HS901",
            status: "ACTIVE",
            campusId: "cp_cs1",
            classId: "cls_71",
            campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
            class: {
              id: "cls_71",
              className: "7.1_CS1",
              grade: "7",
              campusId: "cp_cs1",
              campus: { id: "cp_cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
            },
          },
        },
        {
          id: "tin_2",
          type: "OUT", // Chuyển đi KHÔNG được tính vào HS nhập học
          studentId: "st_out1",
          student: { id: "st_out1", studentCode: "HS902", status: "TRANSFERRED_OUT" },
        },
      ])

      const ov = await generateOverviewStatistics({ academicYearId: "ay_2026" }, fullScope)
      expect(ov.hierarchy.nodeType).toBe("SYSTEM")
      expect(ov.hierarchy.enrolledStudentCount).toBe(1)
      expect(ov.hierarchy.children?.[0].code).toBe("CS1")
      expect(ov.hierarchy.children?.[0].enrolledStudentCount).toBe(1)
      const ovHtml = buildOverviewPdfHtml(ov, fullScope, "08:40 26/11/2026")
      expect(ovHtml).toContain("BÁO CÁO HỌC SINH THEO DÕI CAM KẾT")
      expect(ovHtml).toContain("TỔNG QUAN THEO CƠ SỞ")
      expect(ovHtml).toContain("Ghi chú căn cứ tính Đạt chuẩn")
      expect(ovHtml).toContain("<svg")
      expect(ovHtml).toContain("Tiến bộ vượt bậc")
      expect(buildOverviewPdfFileName(ov)).toContain("Bao_cao_Tong_quan_Thong_ke_HS")

      mockAuth.mockResolvedValueOnce({ user: { id: "u_admin", role: "ADMIN" } })
      mockResolveScope.mockResolvedValueOnce(fullScope)
      const pdfRes = await exportPdfGET(
        new NextRequest(
          "http://localhost/api/admin/student-statistics/export-pdf?tab=overview&academicYearId=ay_2026"
        )
      )
      expect(pdfRes.status).toBe(200)
      expect(pdfRes.headers.get("Content-Type")).toBe("application/pdf")
    })

    it("Chỉ áp dụng khối Phổ thông K-12 (Khối 1–12), loại trừ hoàn toàn Mầm non", () => {
      expect(isK12Class({ level: "Tieu hoc", grade: "1", className: "1.1_CS1" })).toBe(true)
      expect(isK12Class({ level: "THCS", grade: "7", className: "7.1_CS1" })).toBe(true)
      expect(isK12Class({ level: "THPT", grade: "12", className: "12.1_CS1" })).toBe(true)

      expect(isK12Class({ level: "Mầm non", grade: "Mầm", className: "Mầm 1" })).toBe(false)
      expect(isK12Class({ level: "MAM_NON", grade: "0", className: "Lá 2" })).toBe(false)
      expect(isK12Class({ level: "Preschool", grade: "", className: "Chồi 1" })).toBe(false)
      expect(isK12Class(null)).toBe(false)
    })
  })
})
