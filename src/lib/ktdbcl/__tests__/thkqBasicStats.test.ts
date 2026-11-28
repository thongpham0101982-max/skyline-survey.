import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      academicYear: { findUnique: vi.fn(), findFirst: vi.fn() },
      campus: { findMany: vi.fn() },
      subject: { findMany: vi.fn() },
      subjectGradeConfig: { findMany: vi.fn() },
      subjectBenchmarkConfig: { findMany: vi.fn() },
      gradebookLock: { findMany: vi.fn() },
      subjectGradeEntry: { groupBy: vi.fn(), findMany: vi.fn() },
      studentTermScore: { findMany: vi.fn() },
      class: { findMany: vi.fn() },
      student: { findMany: vi.fn() },
      studentTransfer: { findMany: vi.fn() },
      vnEduImportSession: { findMany: vi.fn() },
    },
  }
})

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

import {
  buildBasicStatsIndicatorRows,
  computeColumnBasicStats,
  computeFrequencyTable025,
  computeScoreDistribution8Buckets,
  generateBasicStatsReport,
  resolveFrequency025Index,
  resolveScoreDistribution8BucketId,
  resolveTargetGradesForLevel,
} from "../thkqBasicStatsEngine"
import { generatePeriodicTestReport } from "../thkqPeriodicReportEngine"
import { ThkqAccessScope } from "../thkqPermissions"

describe("Báo cáo Thống kê cơ bản & Bộ lọc bài kiểm tra định kỳ", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. Tính đúng 7 chỉ số nghiệm thu trên tập điểm mẫu Khối 1: CS1=[0, 5, 7, 10], CS2=[4, 7] => Hệ thống=[0, 4, 5, 7, 7, 10]", () => {
    const cs1Scores = [0, 5, 7, 10]
    const cs2Scores = [4, 7]
    const systemScores = [...cs1Scores, ...cs2Scores]

    const sysStats = computeColumnBasicStats(systemScores)

    // 1) Số HS có điểm: 6
    expect(sysStats.validCount).toBe(6)
    expect(sysStats.validCountDisplay).toBe("6")

    // 2) Điểm trung vị: 6
    expect(sysStats.median).toBe(6)
    expect(sysStats.medianDisplay).toBe("6")

    // 3) Điểm có nhiều HS đạt nhất: 7 (2 HS)
    expect(sysStats.modeDisplay).toBe("7 (2 HS)")

    // 4) Tỷ lệ đạt dưới 5 điểm: 33,33% (2/6)
    expect(sysStats.below5Count).toBe(2)
    expect(sysStats.below5Display).toBe("33,33% (2/6)")

    // 5) Tỷ lệ đạt từ 7 điểm trở lên: 50% (3/6)
    expect(sysStats.aboveOrEqual7Count).toBe(3)
    expect(sysStats.aboveOrEqual7Display).toBe("50% (3/6)")

    // 6) Học sinh đạt điểm <= 1: 1 (điểm 0)
    expect(sysStats.scoreLte1Count).toBe(1)
    expect(sysStats.scoreLte1Display).toBe("1")

    // 7) Số HS đạt điểm 10: 1
    expect(sysStats.score10Count).toBe(1)
    expect(sysStats.score10Display).toBe("1")

    // 8) Độ lệch chuẩn tổng thể: 3,10 (tương đương ~3.0957 làm tròn 2 chữ số thập phân)
    expect(sysStats.stdDev).toBe(3.1)
    expect(sysStats.stdDevDisplay).toBe("3,10")
  })

  it("2. Xử lý đúng các trường hợp biên: cột rỗng, mọi mức điểm xuất hiện 1 lần, đồng hạng mode, không có điểm 10, loại điểm ngoài [0, 10]", () => {
    // Cột chưa có điểm hợp lệ
    const emptyStats = computeColumnBasicStats([null, undefined, NaN, -1, 10.5])
    expect(emptyStats.validCountDisplay).toBe("0")
    expect(emptyStats.medianDisplay).toBe("—")
    expect(emptyStats.modeDisplay).toBe("—")
    expect(emptyStats.below5Display).toBe("—")
    expect(emptyStats.aboveOrEqual7Display).toBe("—")
    expect(emptyStats.score10Display).toBe("—")
    expect(emptyStats.stdDevDisplay).toBe("—")

    // Mọi mức điểm chỉ xuất hiện 1 lần và có nhiều mức điểm khác nhau -> "Không có mức điểm nổi trội"
    const distinctStats = computeColumnBasicStats([4, 7])
    expect(distinctStats.validCountDisplay).toBe("2")
    expect(distinctStats.medianDisplay).toBe("5,5")
    expect(distinctStats.modeDisplay).toBe("Không có mức điểm nổi trội")
    expect(distinctStats.score10Display).toBe("0")
    expect(distinctStats.stdDevDisplay).toBe("1,50")

    // Nhiều mức điểm đồng hạng tần suất cao nhất -> hiển thị đầy đủ theo thứ tự tăng dần
    const multiModeStats = computeColumnBasicStats([8, 6, 9, 6, 8])
    expect(multiModeStats.modeDisplay).toBe("6 (2 HS), 8 (2 HS)")
  })

  it("3. Bố cục bảng Tiểu học gồm Khối 1..4 theo thứ tự, mỗi khối ghép cặp [Cơ sở | Hệ thống]; đổi cơ sở giữ nguyên Hệ thống; chặn 403 khi chọn cơ sở trái quyền", async () => {
    mockPrisma.academicYear.findUnique.mockResolvedValue({
      id: "AY_2026",
      name: "2026-2027",
      status: "ACTIVE",
    })
    mockPrisma.campus.findMany.mockResolvedValue([
      { id: "CP_CS1", campusCode: "CS1", campusName: "Cơ sở 1" },
      { id: "CP_CS2", campusCode: "CS2", campusName: "Cơ sở 2" },
    ])
    mockPrisma.subject.findMany.mockResolvedValue([
      {
        id: "SUB_TOAN",
        subjectCode: "TOAN",
        subjectName: "Toán",
        level: "TIEU_HOC",
        category: "REQUIRED",
        evaluationType: "SCORE",
      },
    ])
    mockPrisma.subjectGradeConfig.findMany.mockResolvedValue([
      {
        id: "CFG_1",
        subjectId: "SUB_TOAN",
        grade: "ALL",
        evaluationPeriod: "GK1",
        configType: "VNEDU",
        columnDefinitions: JSON.stringify([{ key: "gk", label: "KT GK1", dataType: "NUMBER", group: "GK" }]),
        columnsJson: JSON.stringify([{ key: "gk", label: "KT GK1", dataType: "NUMBER", group: "GK" }]),
        hasCompositeColumn: false,
        confirmationStatus: "CONFIRMED",
      },
    ])
    mockPrisma.class.findMany.mockResolvedValue([
      { id: "CLS_1A_CS1", className: "1/1_CS1", grade: "Khối 1", level: "TIEU_HOC", campusId: "CP_CS1", teachingAssignments: [{ subjectId: "SUB_TOAN" }] },
      { id: "CLS_1A_CS2", className: "1/1_CS2", grade: "Khối 1", level: "TIEU_HOC", campusId: "CP_CS2", teachingAssignments: [{ subjectId: "SUB_TOAN" }] },
      { id: "CLS_2A_CS1", className: "2/1_CS1", grade: "Khối 2", level: "TIEU_HOC", campusId: "CP_CS1", teachingAssignments: [{ subjectId: "SUB_TOAN" }] },
      { id: "CLS_2A_CS2", className: "2/1_CS2", grade: "Khối 2", level: "TIEU_HOC", campusId: "CP_CS2", teachingAssignments: [{ subjectId: "SUB_TOAN" }] },
      { id: "CLS_3A_CS1", className: "3/1_CS1", grade: "Khối 3", level: "TIEU_HOC", campusId: "CP_CS1", teachingAssignments: [{ subjectId: "SUB_TOAN" }] },
      { id: "CLS_4A_CS1", className: "4/1_CS1", grade: "Khối 4", level: "TIEU_HOC", campusId: "CP_CS1", teachingAssignments: [{ subjectId: "SUB_TOAN" }] },
    ])
    mockPrisma.subjectGradeEntry.groupBy.mockResolvedValue([
      { evaluationPeriod: "GK1", subjectId: "SUB_TOAN", _count: { _all: 8 } },
    ])

    // Khối 1: CS1 = [0, 5, 7, 10], CS2 = [4, 7]
    // Khối 2: CS1 = [8, 9], CS2 = [] (chưa có điểm tại CS2 nhưng có điểm tại CS1)
    // Khối 3 & Khối 4: chưa có điểm ở cả CS1 và CS2
    mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
      { studentId: "S1", classId: "CLS_1A_CS1", evaluationPeriod: "GK1", configType: "VNEDU", componentScores: JSON.stringify({ gk: 0 }), student: { id: "S1", status: "ACTIVE", classId: "CLS_1A_CS1", campusId: "CP_CS1" } },
      { studentId: "S2", classId: "CLS_1A_CS1", evaluationPeriod: "GK1", configType: "VNEDU", componentScores: JSON.stringify({ gk: 5 }), student: { id: "S2", status: "ACTIVE", classId: "CLS_1A_CS1", campusId: "CP_CS1" } },
      { studentId: "S3", classId: "CLS_1A_CS1", evaluationPeriod: "GK1", configType: "VNEDU", componentScores: JSON.stringify({ gk: 7 }), student: { id: "S3", status: "ACTIVE", classId: "CLS_1A_CS1", campusId: "CP_CS1" } },
      { studentId: "S4", classId: "CLS_1A_CS1", evaluationPeriod: "GK1", configType: "VNEDU", componentScores: JSON.stringify({ gk: 10 }), student: { id: "S4", status: "ACTIVE", classId: "CLS_1A_CS1", campusId: "CP_CS1" } },
      { studentId: "S5", classId: "CLS_1A_CS2", evaluationPeriod: "GK1", configType: "VNEDU", componentScores: JSON.stringify({ gk: 4 }), student: { id: "S5", status: "ACTIVE", classId: "CLS_1A_CS2", campusId: "CP_CS2" } },
      { studentId: "S6", classId: "CLS_1A_CS2", evaluationPeriod: "GK1", configType: "VNEDU", componentScores: JSON.stringify({ gk: 7 }), student: { id: "S6", status: "ACTIVE", classId: "CLS_1A_CS2", campusId: "CP_CS2" } },
      // Khối 2 chỉ có điểm ở CS1
      { studentId: "S7", classId: "CLS_2A_CS1", evaluationPeriod: "GK1", configType: "VNEDU", componentScores: JSON.stringify({ gk: 8 }), student: { id: "S7", status: "ACTIVE", classId: "CLS_2A_CS1", campusId: "CP_CS1" } },
      { studentId: "S8", classId: "CLS_2A_CS1", evaluationPeriod: "GK1", configType: "VNEDU", componentScores: JSON.stringify({ gk: 9 }), student: { id: "S8", status: "ACTIVE", classId: "CLS_2A_CS1", campusId: "CP_CS1" } },
    ])
    mockPrisma.studentTermScore.findMany.mockResolvedValue([])

    const systemScope: ThkqAccessScope = {
      userId: "U_ADMIN",
      role: "SUPER_ADMIN",
      scopeTier: "SYSTEM_QA_EXEC",
      scopeLabel: "Quản trị hệ thống",
      canViewReport: true,
      canViewDetail: true,
      canExportExcel: true,
      canExportWithStudentList: true,
      isCampusRestricted: false,
      allowedCampusIds: [],
      isClassRestricted: false,
      allowedClassIds: [],
      isSubjectRestricted: false,
      allowedSubjectIds: [],
      allowedGrades: [],
      allowedLevels: [],
    }

    // Chạy với Cơ sở 1 (CS1)
    const reportCs1 = await generateBasicStatsReport(
      {
        academicYearId: "AY_2026",
        evaluationPeriod: "GK1",
        level: "TIEU_HOC",
        subjectId: "SUB_TOAN",
        campusId: "CP_CS1",
      },
      systemScope
    )

    // Bốn nhóm khối từ Khối 1 đến Khối 4 theo đúng thứ tự
    expect(reportCs1.gradePairs.map((g) => g.gradeLabel)).toEqual([
      "Khối 1",
      "Khối 2",
      "Khối 3",
      "Khối 4",
    ])
    expect(reportCs1.gradePairs[0].campusColumnLabel).toBe("CS1")
    expect(reportCs1.gradePairs[0].systemColumnLabel).toBe("Hệ thống")

    // Kiểm tra Khối 1 của CS1 và Hệ thống
    const g1Cs1 = reportCs1.gradePairs[0]
    expect(g1Cs1.campusStats.validCountDisplay).toBe("4")
    expect(g1Cs1.systemStats.validCountDisplay).toBe("6")
    expect(g1Cs1.systemStats.medianDisplay).toBe("6")
    expect(g1Cs1.systemStats.modeDisplay).toBe("7 (2 HS)")
    expect(g1Cs1.systemStats.below5Display).toBe("33,33% (2/6)")
    expect(g1Cs1.systemStats.aboveOrEqual7Display).toBe("50% (3/6)")
    expect(g1Cs1.systemStats.score10Display).toBe("1")
    expect(g1Cs1.systemStats.stdDevDisplay).toBe("3,10")

    // Đổi sang Cơ sở 2 (CS2), giữ nguyên kỳ, bậc học và môn
    const reportCs2 = await generateBasicStatsReport(
      {
        academicYearId: "AY_2026",
        evaluationPeriod: "GK1",
        level: "TIEU_HOC",
        subjectId: "SUB_TOAN",
        campusId: "CP_CS2",
      },
      systemScope
    )

    // Cột cơ sở cập nhật sang CS2, còn cột Hệ thống giữ nguyên
    const g1Cs2 = reportCs2.gradePairs[0]
    expect(g1Cs2.campusColumnLabel).toBe("CS2")
    expect(g1Cs2.campusStats.validCountDisplay).toBe("2")
    expect(g1Cs2.campusStats.medianDisplay).toBe("5,5")
    expect(g1Cs2.systemStats).toEqual(g1Cs1.systemStats)

    // Tại Khối 2: CS2 chưa có điểm hợp lệ ("0" và "—"), nhưng Hệ thống vẫn hiển thị điểm từ CS1
    const g2Cs2 = reportCs2.gradePairs[1]
    expect(g2Cs2.campusStats.validCountDisplay).toBe("0")
    expect(g2Cs2.campusStats.medianDisplay).toBe("—")
    expect(g2Cs2.systemStats.validCountDisplay).toBe("2")
    expect(g2Cs2.systemStats.medianDisplay).toBe("8,5")

    // Tại Khối 3 (chưa có dữ liệu toàn hệ thống): hiển thị "0" ở dòng Số HS có điểm và "—" ở 6 dòng còn lại
    const g3Cs2 = reportCs2.gradePairs[2]
    expect(g3Cs2.campusStats.validCountDisplay).toBe("0")
    expect(g3Cs2.campusStats.medianDisplay).toBe("—")
    expect(g3Cs2.systemStats.validCountDisplay).toBe("0")
    expect(g3Cs2.systemStats.stdDevDisplay).toBe("—")

    // Kiểm tra phân quyền: Tài khoản chỉ có quyền xem CS1 nhưng gửi yêu cầu CS2 -> bị từ chối 403
    const cs1OnlyScope: ThkqAccessScope = {
      ...systemScope,
      scopeTier: "CAMPUS_MANAGER",
      isCampusRestricted: true,
      allowedCampusIds: ["CP_CS1"],
    }

    await expect(
      generateBasicStatsReport(
        {
          academicYearId: "AY_2026",
          evaluationPeriod: "GK1",
          level: "TIEU_HOC",
          subjectId: "SUB_TOAN",
          campusId: "CP_CS2",
        },
        cs1OnlyScope
      )
    ).rejects.toThrow(/FORBIDDEN_CAMPUS/)
  })

  it("4. Bộ lọc 'Đợt / Bài kiểm tra' trong báo cáo kiểm tra định kỳ chỉ lấy cột điểm kiểm tra định kỳ (GK/CK), loại bỏ TX1..TX4 và Điểm TB", async () => {
    mockPrisma.academicYear.findUnique.mockResolvedValue({
      id: "AY_2026",
      name: "2026-2027",
      status: "ACTIVE",
    })
    mockPrisma.campus.findMany.mockResolvedValue([
      { id: "CP_CS1", campusCode: "CS1", campusName: "Cơ sở 1" },
    ])
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: "SUB_TOAN", subjectCode: "TOAN", subjectName: "Toán", level: "THCS", category: "REQUIRED" },
    ])
    mockPrisma.subjectGradeConfig.findMany.mockResolvedValue([
      {
        id: "CFG_THCS_TOAN",
        subjectId: "SUB_TOAN",
        grade: "Khối 6",
        evaluationPeriod: "GK1",
        configType: "VNEDU",
        columnsJson: JSON.stringify([
          { key: "tx1", label: "TX1", dataType: "NUMBER", group: "TX" },
          { key: "tx2", label: "TX2", dataType: "NUMBER", group: "TX" },
          { key: "tx3", label: "TX3", dataType: "NUMBER", group: "TX" },
          { key: "gk", label: "ĐĐGgk", dataType: "NUMBER", group: "GK" },
          { key: "ck", label: "ĐĐGck", dataType: "NUMBER", group: "CK" },
        ]),
        hasCompositeColumn: true,
        compositeColumnName: "ĐTBmhk",
        confirmationStatus: "CONFIRMED",
      },
    ])
    mockPrisma.subjectBenchmarkConfig.findMany.mockResolvedValue([])
    mockPrisma.gradebookLock.findMany.mockResolvedValue([])
    mockPrisma.subjectGradeEntry.groupBy.mockResolvedValue([])
    mockPrisma.class.findMany.mockResolvedValue([])
    mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([])
    mockPrisma.studentTermScore.findMany.mockResolvedValue([])
    mockPrisma.vnEduImportSession.findMany.mockResolvedValue([])

    const adminScope: ThkqAccessScope = {
      userId: "U_ADMIN",
      role: "SUPER_ADMIN",
      scopeTier: "SYSTEM_QA_EXEC",
      scopeLabel: "Quản trị hệ thống",
      canViewReport: true,
      canViewDetail: true,
      canExportExcel: true,
      canExportWithStudentList: true,
      isCampusRestricted: false,
      allowedCampusIds: [],
      isClassRestricted: false,
      allowedClassIds: [],
      isSubjectRestricted: false,
      allowedSubjectIds: [],
      allowedGrades: [],
      allowedLevels: [],
    }

    const report = await generatePeriodicTestReport(
      {
        academicYearId: "AY_2026",
        level: "THCS",
        evaluationPeriod: "GK1",
        subjectId: "SUB_TOAN",
      },
      adminScope
    )

    const testKeys = report.filterOptions.tests.map((t: any) => t.key)
    const testLabels = report.filterOptions.tests.map((t: any) => t.label)

    // Phải có OFFICIAL và cột GK (VNEDU::gk), tuyệt đối không có TX1, TX2, TX3, CK hay composite (ĐTBmhk)
    expect(testKeys).toContain("OFFICIAL")
    expect(testKeys).toContain("VNEDU::gk")
    expect(testKeys).not.toContain("VNEDU::tx1")
    expect(testKeys).not.toContain("VNEDU::tx2")
    expect(testKeys).not.toContain("VNEDU::tx3")
    expect(testKeys).not.toContain("VNEDU::ck")
    expect(testKeys).not.toContain("VNEDU::composite")
    expect(testLabels.some((l: string) => l.includes("TX1") || l.includes("ĐTBmhk"))).toBe(false)
  })

  it("5. Thống kê phổ điểm 8 nhóm theo môn: phân nhóm đúng các mốc 0, 2, 4, 5, 7, 8, 10; tổng 8 cột khớp số HS có điểm; định dạng tooltip đúng chuẩn", () => {
    // Kiểm tra các mốc biên: Điểm 0 và 10 có nhóm riêng; Điểm đúng 2, 4, 5, 7, 8 vào nhóm bắt đầu tại mốc tương ứng
    expect(resolveScoreDistribution8BucketId(0)).toBe("SCORE_0")
    expect(resolveScoreDistribution8BucketId(0.5)).toBe("SCORE_0_2")
    expect(resolveScoreDistribution8BucketId(1)).toBe("SCORE_0_2")
    expect(resolveScoreDistribution8BucketId(1.99)).toBe("SCORE_0_2")
    expect(resolveScoreDistribution8BucketId(2)).toBe("SCORE_2_4")
    expect(resolveScoreDistribution8BucketId(3.99)).toBe("SCORE_2_4")
    expect(resolveScoreDistribution8BucketId(4)).toBe("SCORE_4_5")
    expect(resolveScoreDistribution8BucketId(4.99)).toBe("SCORE_4_5")
    expect(resolveScoreDistribution8BucketId(5)).toBe("SCORE_5_7")
    expect(resolveScoreDistribution8BucketId(6.99)).toBe("SCORE_5_7")
    expect(resolveScoreDistribution8BucketId(7)).toBe("SCORE_7_8")
    expect(resolveScoreDistribution8BucketId(7.99)).toBe("SCORE_7_8")
    expect(resolveScoreDistribution8BucketId(8)).toBe("SCORE_8_10")
    expect(resolveScoreDistribution8BucketId(9.99)).toBe("SCORE_8_10")
    expect(resolveScoreDistribution8BucketId(10)).toBe("SCORE_10")

    const sampleScores = [0, 1, 2, 4, 5, 6.5, 7, 8, 9.5, 10]
    const dist = computeScoreDistribution8Buckets(sampleScores)

    // Thứ tự 8 nhóm điểm chuẩn
    expect(dist.buckets.map((b) => b.label)).toEqual([
      "Điểm 0",
      "0 < điểm < 2",
      "2 ≤ điểm < 4",
      "4 ≤ điểm < 5",
      "5 ≤ điểm < 7",
      "7 ≤ điểm < 8",
      "8 ≤ điểm < 10",
      "Điểm 10",
    ])

    // Số lượng từng nhóm: [1, 1, 1, 1, 2, 1, 2, 1] -> tổng = 10
    expect(dist.buckets.map((b) => b.count)).toEqual([1, 1, 1, 1, 2, 1, 2, 1])
    const sum8Buckets = dist.buckets.reduce((acc, b) => acc + b.count, 0)
    expect(sum8Buckets).toBe(dist.totalValidCount)
    expect(dist.totalValidCount).toBe(10)

    // 4 nhóm đầu (< 5): 4 HS (40%), 4 nhóm cuối (>= 5): 6 HS (60%)
    expect(dist.below5Count).toBe(4)
    expect(dist.below5RateDisplay).toBe("40% (4/10)")
    expect(dist.aboveOrEqual5Count).toBe(6)
    expect(dist.aboveOrEqual5RateDisplay).toBe("60% (6/10)")

    // Kiểm tra định dạng tooltip: "5 ≤ điểm < 7 · 2/10 học sinh · 20,00%"
    const bucket5To7 = dist.buckets.find((b) => b.id === "SCORE_5_7")!
    expect(bucket5To7.tooltipText).toBe("5 ≤ điểm < 7 · 2/10 học sinh · 20,00%")
  })

  it("6. Bảng tần số 40 khoảng điểm bước 0,25 ([0, 0.25] .. (9.75, 10]) và 11 chỉ số thống kê cơ bản (Mean, MAD, Điểm 0, Điểm <= 1)", () => {
    expect(resolveFrequency025Index(0)).toBe(0)
    expect(resolveFrequency025Index(0.25)).toBe(0)
    expect(resolveFrequency025Index(0.26)).toBe(1)
    expect(resolveFrequency025Index(0.5)).toBe(1)
    expect(resolveFrequency025Index(6.0)).toBe(23) // (5.75, 6]
    expect(resolveFrequency025Index(6.25)).toBe(24) // (6, 6.25]
    expect(resolveFrequency025Index(10)).toBe(39) // (9.75, 10]

    const sampleScores = [0, 4, 5, 6.2, 6.25, 6.25, 7, 10]
    const freq025 = computeFrequencyTable025(sampleScores)
    expect(freq025.intervals.length).toBe(40)
    expect(freq025.intervals[0].label).toBe("[0, 0.25]")
    expect(freq025.intervals[1].label).toBe("(0.25, 0.5]")
    expect(freq025.intervals[24].label).toBe("(6, 6.25]")
    expect(freq025.intervals[39].label).toBe("(9.75, 10]")
    expect(freq025.intervals[24].count).toBe(3)
    expect(freq025.peakIntervalLabel).toBe("(6, 6.25]")
    expect(freq025.peakUpperMilestoneDisplay).toBe("6,25")
    expect(freq025.intervals.reduce((a, b) => a + b.count, 0)).toBe(sampleScores.length)

    // Kiểm tra MAD và Điểm trung bình trên tập [0, 4, 5, 7, 7, 10]
    // Trung bình = 33 / 6 = 5.50 ("5,50")
    // Trung vị = 6
    // MAD = (|0-6| + |4-6| + |5-6| + |7-6| + |7-6| + |10-6|) / 6 = (6 + 2 + 1 + 1 + 1 + 4) / 6 = 15 / 6 = 2.50 ("2,50")
    const stats = computeColumnBasicStats([0, 4, 5, 7, 7, 10])
    expect(stats.meanDisplay).toBe("5,50")
    expect(stats.madDisplay).toBe("2,50")
    expect(stats.score0Count).toBe(1)
    expect(stats.score0Display).toBe("1")
    expect(stats.scoreLte1Count).toBe(1)
    expect(stats.scoreLte1PctOnlyDisplay).toBe("16,67%")
  })
})
