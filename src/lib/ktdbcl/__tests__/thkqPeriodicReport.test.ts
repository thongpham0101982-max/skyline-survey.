import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import * as XLSX from "xlsx"

const { mockAuth, mockPrisma } = vi.hoisted(() => {
  const prismaObj: any = {
    academicYear: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    campus: {
      findMany: vi.fn(),
    },
    subject: {
      findMany: vi.fn(),
    },
    subjectGradeConfig: {
      findMany: vi.fn(),
    },
    subjectBenchmarkConfig: {
      findMany: vi.fn(),
    },
    gradebookLock: {
      findMany: vi.fn(),
    },
    subjectGradeEntry: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    studentTermScore: {
      findMany: vi.fn(),
    },
    class: {
      findMany: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
    studentTransfer: {
      findMany: vi.fn(),
    },
    vnEduImportSession: {
      findMany: vi.fn(),
    },
    userCampusAssignment: {
      findMany: vi.fn(),
    },
    teacher: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    teachingAssignment: {
      findMany: vi.fn(),
    },
    ctqtTeachingAssignment: {
      findMany: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  }
  return { mockAuth: vi.fn(), mockPrisma: prismaObj }
})

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

import {
  THKQ_REPORT_GROUPS,
  getActiveThkqMenuSubModules,
} from "../thkqReportCatalog"
import {
  buildScoreBuckets,
  calculateRateValue,
  classifyEducationSystem,
  computePeriodicRowStats,
  formatClassDisplayWithCampus,
  parseRawStudentTestStatus,
  resolveScoreBucketId,
  StudentReconciledItem,
} from "../thkqPeriodicReportEngine"
import { buildPeriodicReportWorkbook } from "../thkqPeriodicExcelExporter"
import { GET, POST } from "@/app/api/admin/ktdbcl/thkq-periodic-report/route"

describe("THKQ Redesign - Danh mục báo cáo & Công thức Thống kê KTĐK", () => {
  it("1. Danh mục THKQ có đủ các nhóm nghiệp vụ và chỉ đưa lên menu các báo cáo đã hoạt động", () => {
    expect(THKQ_REPORT_GROUPS.map((g) => g.id)).toContain("COMPONENT_SCORES")
    expect(THKQ_REPORT_GROUPS.map((g) => g.id)).toContain("AVERAGE_SCORES")
    expect(THKQ_REPORT_GROUPS.map((g) => g.id)).toContain("SCORE_DISTRIBUTION")
    expect(THKQ_REPORT_GROUPS.map((g) => g.id)).toContain("COMPREHENSIVE_SUMMARY")

    const activeMenuItems = getActiveThkqMenuSubModules(true)
    expect(activeMenuItems.length).toBeGreaterThanOrEqual(5)
    expect(activeMenuItems[0].code).toBe("KTDBCL_THKQ_KT_DINH_KY")
    expect(activeMenuItems[1].code).toBe("KTDBCL_THKQ_CHAT_LUONG_GV")
    // Không còn báo cáo trùng lặp giữa Kết quả môn/lớp và ĐTB theo môn/khối/cơ sở
    expect(activeMenuItems.some((m) => m.code === "KTDBCL_THKQ_MON_LOP")).toBe(false)
    // Khi không có dữ liệu thì trả về rỗng
    expect(getActiveThkqMenuSubModules(false)).toEqual([])
  })

  it("2. Kiểm tra quy tắc làm tròn 2 chữ số thập phân, mẫu số = 0 ('—') và tử số = 0 ('0.00%')", () => {
    expect(calculateRateValue(0, 0)).toEqual({ rate: null, display: "—" })
    expect(calculateRateValue(5, 0)).toEqual({ rate: null, display: "—" })
    expect(calculateRateValue(0, 27)).toEqual({ rate: 0, display: "0.00%" })
    // Dòng Tổng cộng ảnh vnEdu: Nữ Điểm 10 = 45, TSHS = 388 -> 45 / 388 = 11.60%
    expect(calculateRateValue(45, 388)).toEqual({ rate: 11.6, display: "11.60%" })
    // Dòng Tổng cộng ảnh vnEdu: Nữ Cộng >= 5 = 176, TSHS = 388 -> 176 / 388 = 45.36%
    expect(calculateRateValue(176, 388)).toEqual({ rate: 45.36, display: "45.36%" })
  })

  it("3. Đối soát chính xác dòng lớp 4/2_CS1 với ảnh mẫu vnEdu ở cả 2 chế độ (VNEDU_RECONCILE & SSM_ANALYSIS)", () => {
    const buckets = buildScoreBuckets({
      scoreScaleMode: "INTEGER",
      includeZeroScore: false,
    })

    // Tạo đúng 27 học sinh của lớp 4/2_CS1 như ảnh mẫu vnEdu:
    // Điểm 10: SL=5, Nữ=3
    // Điểm 9: SL=19, Nữ=8
    // Điểm 8: SL=3, Nữ=2
    // Tổng: TSHS=27, Tổng nữ=13, TSHS KT=27, Nữ KT=13
    const makeStudents = (count: number, femaleCount: number, score: number, startIdx: number) => {
      const arr: StudentReconciledItem[] = []
      for (let i = 0; i < count; i++) {
        const isFem = i < femaleCount
        arr.push({
          studentId: `st_${startIdx + i}`,
          studentCode: `HS${startIdx + i}`,
          studentName: `Học sinh ${startIdx + i}`,
          isFemale: isFem,
          isMissingGender: false,
          ethnicity: "Kinh",
          classId: "cls_4_2_cs1",
          className: "4/2",
          classDisplayCode: "4/2_CS1",
          campusId: "cp1",
          campusCode: "CS1",
          campusName: "Cơ sở 1",
          level: "TIEU_HOC",
          gradeNumber: 4,
          gradeLabel: "Khối 4",
          educationSystemCode: "HE_S",
          educationSystemLabel: "Hệ S",
          statusInTest: "VALID_SCORE",
          officialScore: score,
          rawScoreText: String(score),
          bucketId: resolveScoreBucketId(score, buckets),
          isAboveThreshold: score >= 5,
          isAboveSkyline: score >= 7,
          skylineBenchmark: 7.0,
          sourceType: "VNEDU_IMPORT",
          configType: "VNEDU",
        })
      }
      return arr
    }

    const students4_2 = [
      ...makeStudents(5, 3, 10, 1),
      ...makeStudents(19, 8, 9, 6),
      ...makeStudents(3, 2, 8, 25),
    ]

    // Chế độ 1: Đối chiếu vnEdu (TL = Nữ tại mức / TSHS)
    const vneduRow = computePeriodicRowStats({
      rowKey: "CLASS_4_2_CS1",
      rowType: "CLASS",
      stt: 1,
      label: "4/2_CS1",
      students: students4_2,
      buckets,
      rateMode: "VNEDU_RECONCILE",
    })

    expect(vneduRow.tshs).toBe(27)
    expect(vneduRow.totalFemale).toBe(13)
    expect(vneduRow.tshsKt).toBe(27)
    expect(vneduRow.femaleKt).toBe(13)
    expect(vneduRow.tshsKtRatioLabel).toBe("27/13")
    expect(vneduRow.buckets["INT_10"].sl).toBe(5)
    expect(vneduRow.buckets["INT_10"].female).toBe(3)
    expect(vneduRow.buckets["INT_10"].tlDisplay).toBe("11.11%")
    expect(vneduRow.buckets["INT_9"].sl).toBe(19)
    expect(vneduRow.buckets["INT_9"].female).toBe(8)
    expect(vneduRow.buckets["INT_9"].tlDisplay).toBe("29.63%")
    expect(vneduRow.buckets["INT_8"].sl).toBe(3)
    expect(vneduRow.buckets["INT_8"].female).toBe(2)
    expect(vneduRow.buckets["INT_8"].tlDisplay).toBe("7.41%")
    expect(vneduRow.aboveThreshold.sl).toBe(27)
    expect(vneduRow.aboveThreshold.female).toBe(13)
    expect(vneduRow.aboveThreshold.tlDisplay).toBe("48.15%")
    expect(vneduRow.belowThreshold.sl).toBe(0)
    expect(vneduRow.belowThreshold.tlDisplay).toBe("0.00%")

    // Chế độ 2: Phân tích SSM (TL = SL tại mức / TSHS KT, và TL Nữ KT = Nữ tại mức / Nữ KT)
    const ssmRow = computePeriodicRowStats({
      rowKey: "CLASS_4_2_CS1",
      rowType: "CLASS",
      stt: 1,
      label: "4/2_CS1",
      students: students4_2,
      buckets,
      rateMode: "SSM_ANALYSIS",
    })

    // 5 / 27 = 18.52%
    expect(ssmRow.buckets["INT_10"].tlDisplay).toBe("18.52%")
    // Nữ KT: 3 / 13 = 23.08%
    expect(ssmRow.buckets["INT_10"].tlFemaleKtDisplay).toBe("23.08%")
    // Cộng >= 5: 27 / 27 = 100.00%
    expect(ssmRow.aboveThreshold.tlDisplay).toBe("100.00%")
  })

  it("4. Hỗ trợ cột Điểm 0 và khoảng điểm thập phân không chồng lấn [0,1)..[9,10), 10", () => {
    const intWithZero = buildScoreBuckets({
      scoreScaleMode: "INTEGER",
      includeZeroScore: true,
    })
    expect(intWithZero.some((b) => b.id === "INT_0")).toBe(true)
    expect(resolveScoreBucketId(0, intWithZero)).toBe("INT_0")

    const decBuckets = buildScoreBuckets({
      scoreScaleMode: "DECIMAL",
      includeZeroScore: true,
    })
    expect(resolveScoreBucketId(10, decBuckets)).toBe("DEC_10")
    expect(resolveScoreBucketId(9.75, decBuckets)).toBe("DEC_9_10")
    expect(resolveScoreBucketId(5.0, decBuckets)).toBe("DEC_5_6")
    expect(resolveScoreBucketId(4.95, decBuckets)).toBe("DEC_4_5")
    expect(resolveScoreBucketId(0.5, decBuckets)).toBe("DEC_0_1")
    expect(resolveScoreBucketId(0, decBuckets)).toBe("DEC_0_1")
  })

  it("5. Xử lý tiến độ (đủ ĐK, vắng/chờ bù, miễn, chưa có điểm) và học sinh thiếu giới tính", () => {
    expect(parseRawStudentTestStatus({ rawScoreVal: "Miễn" }).statusInTest).toBe("EXEMPT")
    expect(parseRawStudentTestStatus({ rawScoreVal: "Vắng" }).statusInTest).toBe("ABSENT_MAKEUP")
    expect(parseRawStudentTestStatus({ rawScoreVal: "" }).statusInTest).toBe("MISSING_SCORE")
    expect(parseRawStudentTestStatus({ rawScoreVal: "12.5" }).statusInTest).toBe("OUT_OF_RANGE")
    expect(parseRawStudentTestStatus({ rawScoreVal: "8,5" })).toEqual({
      statusInTest: "VALID_SCORE",
      officialScore: 8.5,
      rawScoreText: "8,5",
    })

    expect(formatClassDisplayWithCampus("4/2", "CS1")).toBe("4/2_CS1")
    expect(formatClassDisplayWithCampus("4UK_CS3", "CS3")).toBe("4UK_CS3")
    expect(classifyEducationSystem("", "4INT_CS3").code).toBe("HE_I")
    expect(classifyEducationSystem("", "4UK_CS3").code).toBe("HE_UK")
    expect(classifyEducationSystem("", "4/2_CS1").code).toBe("HE_S")
  })
})

describe("API /api/admin/ktdbcl/thkq-periodic-report (Phân quyền, Drill-down & Xuất Excel)", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma.academicYear.findUnique.mockResolvedValue({
      id: "ay_2026",
      name: "2026-2027",
      status: "ACTIVE",
    })
    mockPrisma.campus.findMany.mockResolvedValue([
      { id: "cp1", campusCode: "CS1", campusName: "Cơ sở 1" },
      { id: "cp2", campusCode: "CS2", campusName: "Cơ sở 2" },
    ])
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: "sub_tv", subjectCode: "TVI", subjectName: "Tiếng Việt", category: "MOET", level: "TIEU_HOC" },
    ])
    mockPrisma.subjectGradeConfig.findMany.mockResolvedValue([
      {
        id: "cfg_tv_gk1",
        academicYearId: "ay_2026",
        evaluationPeriod: "GK1",
        grade: "Khối 4",
        subjectId: "sub_tv",
        configType: "VNEDU",
        confirmationStatus: "CONFIRMED",
        isActive: true,
        subject: { id: "sub_tv", subjectCode: "TVI", subjectName: "Tiếng Việt", category: "MOET" },
      },
    ])
    mockPrisma.subjectBenchmarkConfig.findMany.mockResolvedValue([])
    mockPrisma.gradebookLock.findMany.mockResolvedValue([])
    mockPrisma.subjectGradeEntry.groupBy.mockResolvedValue([
      { evaluationPeriod: "GK1", subjectId: "sub_tv", _count: { _all: 2 } },
    ])
    mockPrisma.class.findMany.mockResolvedValue([
      {
        id: "cls_4_2_cs1",
        className: "4/2",
        classCode: "4_2_CS1",
        grade: "Khối 4",
        level: "Tiểu học",
        educationSystem: "HE_S",
        campusId: "cp1",
        campus: { id: "cp1", campusCode: "CS1", campusName: "Cơ sở 1" },
        teachers: [],
        teachingAssignments: [],
      },
      {
        id: "cls_4_3_cs2",
        className: "4/3",
        classCode: "4_3_CS2",
        grade: "Khối 4",
        level: "Tiểu học",
        educationSystem: "HE_S",
        campusId: "cp2",
        campus: { id: "cp2", campusCode: "CS2", campusName: "Cơ sở 2" },
        teachers: [],
        teachingAssignments: [],
      },
    ])
    mockPrisma.student.findMany.mockResolvedValue([
      {
        id: "st1",
        studentCode: "HS001",
        vnEduCode: "VN001",
        studentName: "Nguyễn Thị Mai",
        gender: "Nữ",
        classId: "cls_4_2_cs1",
        campusId: "cp1",
        status: "ACTIVE",
      },
      {
        id: "st2",
        studentCode: "HS002",
        vnEduCode: "VN002",
        studentName: "Trần Văn Nam",
        gender: null, // Thiếu thông tin giới tính -> vẫn tính trong TSHS
        classId: "cls_4_2_cs1",
        campusId: "cp1",
        status: "ACTIVE",
      },
    ])
    mockPrisma.studentTransfer.findMany.mockResolvedValue([])
    mockPrisma.vnEduImportSession.findMany.mockResolvedValue([])
    mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
      {
        id: "ent1",
        studentId: "st1",
        subjectId: "sub_tv",
        classId: "cls_4_2_cs1",
        academicYearId: "ay_2026",
        evaluationPeriod: "GK1",
        configType: "VNEDU",
        componentScores: JSON.stringify({ col0: 10, gk: 10 }),
        compositeScore: 10,
        updatedAt: new Date("2026-11-10T08:00:00Z"),
      },
      {
        id: "ent2",
        studentId: "st2",
        subjectId: "sub_tv",
        classId: "cls_4_2_cs1",
        academicYearId: "ay_2026",
        evaluationPeriod: "GK1",
        configType: "VNEDU",
        componentScores: JSON.stringify({ col0: 4, gk: 4 }),
        compositeScore: 4,
        updatedAt: new Date("2026-11-10T08:00:00Z"),
      },
    ])
    mockPrisma.userCampusAssignment.findMany.mockResolvedValue([])
    mockPrisma.permission.findMany.mockResolvedValue([])
    mockPrisma.permission.count.mockResolvedValue(0)
    mockPrisma.teacher.findUnique.mockResolvedValue(null)
    mockPrisma.auditLog.create.mockResolvedValue({ id: "log1" })
  })

  it("1. Trả về báo cáo chuẩn và thống kê học sinh thiếu giới tính trong ghi chú chất lượng dữ liệu", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u_kt", email: "ktdbcl@skylineschool.edu.vn", role: "KT_DBCL" },
    })

    const req = new NextRequest(
      "http://localhost/api/admin/ktdbcl/thkq-periodic-report?academicYearId=ay_2026&level=TIEU_HOC&evaluationPeriod=GK1&subjectId=sub_tv&rateMode=VNEDU_RECONCILE"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    const data = json.data
    expect(data.totalRow.tshs).toBe(2)
    expect(data.totalRow.totalFemale).toBe(1)
    expect(data.totalRow.tshsKt).toBe(2)
    expect(data.totalRow.femaleKt).toBe(1)
    expect(data.reconciliationSummary.missingGenderCount).toBe(1)
    expect(data.buckets.find((b: any) => b.id === "INT_10")).toBeTruthy()
    expect(data.totalRow.buckets["INT_10"].sl).toBe(1)
    expect(data.totalRow.buckets["INT_10"].female).toBe(1)
    // 1 nữ điểm 10 / 2 TSHS = 50.00%
    expect(data.totalRow.buckets["INT_10"].tlDisplay).toBe("50.00%")
  })

  it("2. Kiểm tra Drill-down chi tiết học sinh và chặn 409 Conflict khi snapshotVersion lệch", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u_kt", email: "ktdbcl@skylineschool.edu.vn", role: "KT_DBCL" },
    })

    // Lấy snapshotVersion hiện tại
    const initReq = new NextRequest(
      "http://localhost/api/admin/ktdbcl/thkq-periodic-report?academicYearId=ay_2026&level=TIEU_HOC&evaluationPeriod=GK1&subjectId=sub_tv"
    )
    const initJson = await (await GET(initReq)).json()
    const validSnap = initJson.data.snapshotVersion

    // Drill-down với snapshot đúng
    const drillReq = new NextRequest(
      `http://localhost/api/admin/ktdbcl/thkq-periodic-report?academicYearId=ay_2026&level=TIEU_HOC&evaluationPeriod=GK1&subjectId=sub_tv&drilldownRowKey=TOTAL&drilldownMetric=BUCKET_SL&drilldownBucketId=INT_10&expectedSnapshotVersion=${validSnap}`
    )
    const drillRes = await GET(drillReq)
    expect(drillRes.status).toBe(200)
    const drillJson = await drillRes.json()
    expect(drillJson.totalMatched).toBe(1)
    expect(drillJson.students[0].studentCode).toBe("HS001")

    // Drill-down với snapshot cũ -> trả về 409 Conflict
    const staleReq = new NextRequest(
      `http://localhost/api/admin/ktdbcl/thkq-periodic-report?academicYearId=ay_2026&level=TIEU_HOC&evaluationPeriod=GK1&subjectId=sub_tv&drilldownRowKey=TOTAL&drilldownMetric=BUCKET_SL&drilldownBucketId=INT_10&expectedSnapshotVersion=stale_hash_123`
    )
    const staleRes = await GET(staleReq)
    expect(staleRes.status).toBe(409)
  })

  it("3. Xuất Excel (.xlsx) tạo đủ Sheet 'Tổng hợp', 'Thông tin', công thức tỷ lệ và ghi AuditLog", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u_kt", email: "ktdbcl@skylineschool.edu.vn", role: "KT_DBCL" },
    })

    const initReq = new NextRequest(
      "http://localhost/api/admin/ktdbcl/thkq-periodic-report?academicYearId=ay_2026&level=TIEU_HOC&evaluationPeriod=GK1&subjectId=sub_tv"
    )
    const initJson = await (await GET(initReq)).json()

    const postReq = new NextRequest("http://localhost/api/admin/ktdbcl/thkq-periodic-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filters: initJson.data.appliedFilters,
        expectedSnapshotVersion: initJson.data.snapshotVersion,
        includeStudentDetails: true,
        includeProgressColumns: true,
      }),
    })

    const postRes = await POST(postReq)
    expect(postRes.status).toBe(200)
    const postJson = await postRes.json()
    expect(postJson.success).toBe(true)
    expect(postJson.detailedStudents.length).toBe(2)
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1)

    const wb = buildPeriodicReportWorkbook({
      reportData: postJson.data,
      includeProgressColumns: true,
      includeStudentDetails: true,
      canExportDetail: true,
      detailedStudents: postJson.detailedStudents,
    })

    expect(wb.SheetNames).toContain("Tổng hợp")
    expect(wb.SheetNames).toContain("Thông tin")
    expect(wb.SheetNames).toContain("Phân tích Bậc - Hệ học")
    expect(wb.SheetNames).toContain("Danh sách chi tiết")

    // Kiểm tra khi không chọn xuất chi tiết -> không xuất sheet Danh sách chi tiết
    const wbNoDetail = buildPeriodicReportWorkbook({
      reportData: postJson.data,
      includeProgressColumns: false,
      includeStudentDetails: false,
      canExportDetail: true,
      detailedStudents: postJson.detailedStudents,
    })
    expect(wbNoDetail.SheetNames).not.toContain("Danh sách chi tiết")
  })

  it("4. Phân quyền GĐCS (CAMPUS_MANAGER) và nhóm theo Cơ sở -> Khối -> Lớp + xử lý chuyển lớp tại mốc chốt", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u_gdcs1", email: "gdcs1@skylineschool.edu.vn", role: "GDCS" },
    })
    mockPrisma.userCampusAssignment.findMany.mockResolvedValue([{ campusId: "cp1" }])
    mockPrisma.campus.findMany.mockResolvedValue([
      { id: "cp1", campusCode: "CS1", campusName: "Cơ sở 1" },
    ])
    mockPrisma.gradebookLock.findMany.mockResolvedValue([
      {
        id: "lock1",
        academicYearId: "ay_2026",
        evaluationPeriod: "GK1",
        classId: "ALL",
        subjectId: "ALL",
        isLocked: true,
        lockedAt: new Date("2026-11-15T00:00:00Z"),
      },
    ])
    // Học sinh st2 chuyển trường (OUT) trước mốc chốt 15/11 -> không tính vào sĩ số tại mốc chốt
    mockPrisma.studentTransfer.findMany.mockResolvedValue([
      {
        id: "tr1",
        studentId: "st2",
        type: "OUT",
        transferDate: new Date("2026-11-01T00:00:00Z"),
      },
    ])

    const req = new NextRequest(
      "http://localhost/api/admin/ktdbcl/thkq-periodic-report?academicYearId=ay_2026&level=TIEU_HOC&evaluationPeriod=GK1&subjectId=sub_tv&groupBy=CAMPUS_GRADE_CLASS"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(json.data.permissions.roleTier).toBe("CAMPUS_MANAGER")
    expect(json.data.permissions.isCampusRestricted).toBe(true)
    expect(json.data.isProvisionalRoster).toBe(false)
    // Chỉ còn st1 trong sĩ số tại mốc chốt (st2 đã OUT trước mốc chốt)
    expect(json.data.totalRow.tshs).toBe(1)
    expect(json.data.tableRows.some((r: any) => r.rowType === "CAMPUS")).toBe(true)
  })
})
