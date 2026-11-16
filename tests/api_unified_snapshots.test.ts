import { describe, it, expect, vi, beforeEach } from "vitest"
import { hashApiKey, maskSensitivePhone, maskSensitiveEmail } from "@/lib/api-auth"
import { GET as getUnifiedTeachers } from "@/app/api/v1/unified/teachers/route"
import { GET as getUnifiedTeacherDetail } from "@/app/api/v1/unified/teachers/[id]/route"
import { GET as getUnifiedStudents } from "@/app/api/v1/unified/students/route"
import { GET as getUnifiedStudentDetail } from "@/app/api/v1/unified/students/[id]/route"
import { GET as getUnifiedStudentAcademic } from "@/app/api/v1/unified/students/[id]/academic/route"

// ---------------------------------------------------------------------------
// PURE IN-MEMORY MOCK FOR PRISMA (Strictly zero writes to local.db / Turso)
// Compliant with RULE 1 (GEMINI.md): No unsolicited test data
// ---------------------------------------------------------------------------

const mockState = {
  apiKeys: [] as any[],
  apiApplications: [] as any[],
  snapshotTeachers: [] as any[],
  snapshotStudents: [] as any[],
  subjectGradeEntries: [] as any[],
  orientationRecords: [] as any[],
}

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      $executeRawUnsafe: vi.fn().mockResolvedValue(0),
      $queryRawUnsafe: vi.fn().mockImplementation((query: string, ...args: any[]) => {
        // 1. API Key Auth Lookup
        if (query.includes("FROM api_keys")) {
          const hash = args[0]
          const key = mockState.apiKeys.find((k) => k.keyHash === hash)
          if (!key) return []
          const app = mockState.apiApplications.find((a) => a.id === key.applicationId)
          if (!app) return []
          return [
            {
              id: key.id,
              keyId: key.keyId,
              keyPrefix: key.keyPrefix,
              keyHash: key.keyHash,
              status: key.status,
              expiresAt: key.expiresAt,
              applicationId: key.applicationId,
              app_name: app.name,
              app_status: app.status,
              app_permissions: app.permissions,
              app_campus: app.allowedCampusIds,
              app_class: app.allowedClassIds || "[]",
              app_dept: app.allowedDepartmentIds || "[]",
              app_rate_limit: app.rateLimitRpm || 120,
            },
          ]
        }

        // 2. Count api_snapshot_teachers
        if (query.includes('SELECT COUNT(*) as total FROM "api_snapshot_teachers"')) {
          let rows = [...mockState.snapshotTeachers]
          if (query.includes('"status" = ?')) {
            const stIndex = query.indexOf('"status" = ?')
            // Simple match
            rows = rows.filter((r) => r.status === "ACTIVE")
          }
          return [{ total: rows.length }]
        }

        // 3. Select single from api_snapshot_teachers (Detail)
        if (query.includes('FROM "api_snapshot_teachers"') && (query.includes('"teacherId" = ?') || query.includes("LIMIT 1"))) {
          const idOrCode = args[0]
          const found = mockState.snapshotTeachers.find(
            (t) => t.teacherId === idOrCode || t.teacherCode === idOrCode
          )
          return found ? [found] : []
        }

        // 4. Select from api_snapshot_teachers (List)
        if (query.includes('FROM "api_snapshot_teachers"') && query.includes("LIMIT")) {
          return mockState.snapshotTeachers
        }

        // 5. Count api_snapshot_students
        if (query.includes('SELECT COUNT(*) as total FROM "api_snapshot_students"')) {
          return [{ total: mockState.snapshotStudents.length }]
        }

        // 6. Select single from api_snapshot_students (Detail)
        if (query.includes('FROM "api_snapshot_students"') && (query.includes('"studentId" = ?') || query.includes("LIMIT 1"))) {
          const idOrCode = args[0]
          const found = mockState.snapshotStudents.find(
            (s) => s.studentId === idOrCode || s.studentCode === idOrCode
          )
          return found ? [found] : []
        }

        // 7. Select from api_snapshot_students (List)
        if (query.includes('FROM "api_snapshot_students"') && query.includes("LIMIT")) {
          return mockState.snapshotStudents
        }

        return []
      }),
      subjectGradeEntry: {
        findMany: vi.fn().mockImplementation(({ where }: any) => {
          return mockState.subjectGradeEntries.filter((g) => g.studentId === where?.studentId)
        }),
      },
      studentOrientationRecord: {
        findFirst: vi.fn().mockImplementation(({ where }: any) => {
          return mockState.orientationRecords.find((o) => o.studentId === where?.studentId) || null
        }),
      },
    },
  }
})

describe("Unified API Gateway (/api/v1/unified/*) Tests", () => {
  const RAW_VALID_KEY = "sky_live_unified_test_key_1234567890abcdef"
  const RAW_RESTRICTED_KEY = "sky_live_restricted_key_9876543210fedcba"

  beforeEach(() => {
    // Reset in-memory test fixtures
    mockState.apiApplications = [
      {
        id: "app-full-access",
        name: "Sky-Line Unified Integration",
        status: "ACTIVE",
        permissions: JSON.stringify([
          "teachers:directory:read",
          "teachers:read",
          "students:profile:read",
          "students:contact:read",
          "students:read",
          "grades:read",
        ]),
        allowedCampusIds: JSON.stringify(["*"]),
        allowedClassIds: JSON.stringify(["*"]),
        allowedDepartmentIds: JSON.stringify(["*"]),
        rateLimitRpm: 120,
      },
      {
        id: "app-restricted-danang",
        name: "Campus Riverside Da Nang Only",
        status: "ACTIVE",
        permissions: JSON.stringify(["teachers:directory:read", "students:profile:read"]),
        allowedCampusIds: JSON.stringify(["CP_DN_RIVERSIDE"]),
        allowedClassIds: JSON.stringify(["CLS_DN_10A1"]),
        allowedDepartmentIds: JSON.stringify(["DEPT_MATH"]),
        rateLimitRpm: 60,
      },
    ]

    mockState.apiKeys = [
      {
        id: "key-full",
        keyId: "sky_key_full",
        keyPrefix: "sky_live_unif...",
        keyHash: hashApiKey(RAW_VALID_KEY),
        status: "ACTIVE",
        expiresAt: null,
        applicationId: "app-full-access",
      },
      {
        id: "key-restricted",
        keyId: "sky_key_restricted",
        keyPrefix: "sky_live_rest...",
        keyHash: hashApiKey(RAW_RESTRICTED_KEY),
        status: "ACTIVE",
        expiresAt: null,
        applicationId: "app-restricted-danang",
      },
    ]

    mockState.snapshotTeachers = [
      {
        teacherId: "TEA_001",
        teacherCode: "GV001",
        teacherName: "Nguyễn Văn An",
        email: "an.nv@skylineschool.edu.vn",
        phone: "0905123456",
        position: "Tổ trưởng",
        positionsJson: JSON.stringify(["Tổ trưởng", "Giáo viên môn"]),
        campusId: "CP_DN_RIVERSIDE",
        campusCode: "DN_RS",
        campusName: "Sky-Line Riverside (Đà Nẵng)",
        departmentId: "DEPT_MATH",
        departmentCode: "TOAN",
        departmentName: "Tổ Toán - Tin",
        mainSubjectId: "SUB_MATH",
        mainSubjectName: "Toán học",
        homeroomClass: "10A1",
        status: "ACTIVE",
        totalClassesTaught: 3,
        totalWeeklyPeriods: 18,
        qaScore: 94.5,
        assignmentsSummaryJson: JSON.stringify([
          { classId: "CLS_DN_10A1", className: "10A1", subjectName: "Toán học", periodsPerWeek: 6 },
        ]),
        lastSyncedAt: new Date().toISOString(),
      },
      {
        teacherId: "TEA_002",
        teacherCode: "GV002",
        teacherName: "Trần Thị Mai",
        email: "mai.tt@skylineschool.edu.vn",
        phone: "0914987654",
        position: "Giáo viên",
        positionsJson: JSON.stringify(["Giáo viên môn"]),
        campusId: "CP_HOIAN",
        campusCode: "HA_CS",
        campusName: "Sky-Line Hội An",
        departmentId: "DEPT_ENG",
        departmentCode: "TA",
        departmentName: "Tổ Tiếng Anh",
        mainSubjectId: "SUB_ENG",
        mainSubjectName: "Tiếng Anh",
        homeroomClass: null,
        status: "ACTIVE",
        totalClassesTaught: 4,
        totalWeeklyPeriods: 16,
        qaScore: 92.0,
        assignmentsSummaryJson: "[]",
        lastSyncedAt: new Date().toISOString(),
      },
    ]

    mockState.snapshotStudents = [
      {
        studentId: "STU_001",
        studentCode: "HS2026_001",
        studentName: "Lê Hoàng Long",
        fullName: "Lê Hoàng Long",
        gender: "MALE",
        dob: "2010-05-15",
        campusId: "CP_DN_RIVERSIDE",
        campusCode: "DN_RS",
        campusName: "Sky-Line Riverside (Đà Nẵng)",
        academicYearId: "AY_2025_2026",
        academicYearCode: "2025-2026",
        academicYearName: "Năm học 2025 - 2026",
        classId: "CLS_DN_10A1",
        className: "10A1",
        grade: "10",
        homeroomTeacherId: "TEA_001",
        homeroomTeacherName: "Nguyễn Văn An",
        status: "STUDYING",
        avatarUrl: null,
        parentsContactJson: JSON.stringify({
          fatherName: "Lê Minh Tuấn",
          fatherPhone: "0905888999",
          motherName: "Phạm Thị Hương",
          motherPhone: "0905777666",
          email: "phuhuynh.long@gmail.com",
          address: "123 Đường 2/9, Hải Châu, Đà Nẵng",
        }),
        attendanceRate: 98.5,
        gpaScore: 8.7,
        conduct: "Tốt",
        totalSurveysCompleted: 4,
        avgSurveySatisfaction: 4.8,
        extracurricularCount: 3,
        achievementsJson: JSON.stringify([
          { title: "Giải Nhì HSG Toán Cấp Thành Phố", year: "2025-2026" },
        ]),
        termGradesSummaryJson: JSON.stringify([
          { term: "HK1", gpa: 8.7, conduct: "Tốt" },
        ]),
        lastSyncedAt: new Date().toISOString(),
      },
      {
        studentId: "STU_002",
        studentCode: "HS2026_002",
        studentName: "Phạm Hải Đăng",
        fullName: "Phạm Hải Đăng",
        gender: "MALE",
        dob: "2010-08-20",
        campusId: "CP_HOIAN",
        campusCode: "HA_CS",
        campusName: "Sky-Line Hội An",
        academicYearId: "AY_2025_2026",
        academicYearCode: "2025-2026",
        academicYearName: "Năm học 2025 - 2026",
        classId: "CLS_HA_10B1",
        className: "10B1",
        grade: "10",
        homeroomTeacherId: "TEA_002",
        homeroomTeacherName: "Trần Thị Mai",
        status: "STUDYING",
        avatarUrl: null,
        parentsContactJson: JSON.stringify({
          fatherName: "Phạm Quốc Hùng",
          fatherPhone: "0914111222",
          email: "hung.pq@gmail.com",
          address: "Hội An, Quảng Nam",
        }),
        attendanceRate: 99.0,
        gpaScore: 9.1,
        conduct: "Tốt",
        totalSurveysCompleted: 5,
        avgSurveySatisfaction: 5.0,
        extracurricularCount: 2,
        achievementsJson: "[]",
        termGradesSummaryJson: "[]",
        lastSyncedAt: new Date().toISOString(),
      },
    ]

    mockState.subjectGradeEntries = [
      {
        id: "GR_001",
        studentId: "STU_001",
        subjectId: "SUB_MATH",
        evaluationPeriod: "SEMESTER_1",
        compositeScore: 9.2,
        componentScores: JSON.stringify({ tx1: 9.0, tx2: 9.5, gk: 9.0, ck: 9.2 }),
        remark: "Tư duy logic rất sắc bén, tích cực phát biểu",
      },
    ]

    mockState.orientationRecords = [
      {
        studentId: "STU_001",
        status: "COMPLETED",
        interviewerName: "Thầy Cố vấn Nguyễn Văn An",
        hollandCode: "IRC",
        hollandPrimaryType: "Investigative (Nghiên cứu)",
        careerAspirations: "Kỹ sư Trí tuệ Nhân tạo / Khoa học Dữ liệu",
        academicStrengthNotes: "Môn thế mạnh: Toán, Tin học, Tiếng Anh",
        advisoryRecommendations: "Khuyến khích tham gia CLB Robotic và dự án NCKH của trường",
      },
    ]
  })

  // 1. Authentication & Security
  it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/teachers")
    const res = await getUnifiedTeachers(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe("UNAUTHORIZED")
  })

  // 2. GET /api/v1/unified/teachers
  it("returns paginated teachers from unified snapshot for full-access client", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/teachers?page=1&limit=10", {
      headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
    })
    const res = await getUnifiedTeachers(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.length).toBe(2)
    // Full access client can see full phone number
    expect(json.data[0].phone).toBe("0905123456")
  })

  it("masks teacher phone number when client only has directory read scope", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/teachers?campusId=CP_DN_RIVERSIDE", {
      headers: { Authorization: `Bearer ${RAW_RESTRICTED_KEY}` },
    })
    const res = await getUnifiedTeachers(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    // Masked phone format (e.g. 090****456)
    expect(json.data[0].phone).toMatch(/^090\*{4}456$/)
  })

  // 3. Anti-IDOR Check on Teacher Campus Scope
  it("enforces campus scope boundary and rejects unauthorized campus with 403", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/teachers?campusId=CP_HOIAN", {
      headers: { Authorization: `Bearer ${RAW_RESTRICTED_KEY}` },
    })
    const res = await getUnifiedTeachers(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error.code).toBe("CAMPUS_SCOPE_EXCEEDED")
  })

  // 4. GET /api/v1/unified/teachers/:id
  it("returns single teacher detail with assignments from snapshot", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/teachers/TEA_001", {
      headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
    })
    const res = await getUnifiedTeacherDetail(req, {
      params: Promise.resolve({ id: "TEA_001" }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.teacherName).toBe("Nguyễn Văn An")
    expect(json.data.assignments.length).toBe(1)
    expect(json.data.assignments[0].subjectName).toBe("Toán học")
  })

  // 5. GET /api/v1/unified/students
  it("returns student list with PII masking according to Decree 13/2023 when not holding contact permission", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/students?campusId=CP_DN_RIVERSIDE", {
      headers: { Authorization: `Bearer ${RAW_RESTRICTED_KEY}` },
    })
    const res = await getUnifiedStudents(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)
    const stu = json.data[0]
    expect(stu.fullName).toBe("Lê Hoàng Long")
    // Parents phone and email must be masked
    expect(stu.parentsContact.fatherPhone).toMatch(/^090\*{4}999$/)
    expect(stu.parentsContact.motherPhone).toMatch(/^090\*{4}666$/)
    expect(stu.parentsContact.email).toContain("***")
    expect(stu.parentsContact.addressNote).toBe("[Đã ẩn địa chỉ chi tiết theo NĐ 13/2023/NĐ-CP]")
  })

  it("returns full contact when client has students:contact:read", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/students", {
      headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
    })
    const res = await getUnifiedStudents(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    const stu = json.data[0]
    expect(stu.parentsContact.fatherPhone).toBe("0905888999")
    expect(stu.parentsContact.address).toBe("123 Đường 2/9, Hải Châu, Đà Nẵng")
  })

  // 6. Anti-IDOR Check on Student Detail
  it("blocks access to student outside authorized campus scope with 403", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/students/STU_002", {
      headers: { Authorization: `Bearer ${RAW_RESTRICTED_KEY}` },
    })
    const res = await getUnifiedStudentDetail(req, {
      params: Promise.resolve({ id: "STU_002" }),
    })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error.code).toBe("CAMPUS_SCOPE_EXCEEDED")
  })

  // 7. GET /api/v1/unified/students/:id/academic
  it("returns academic record and orientation career profile requiring grades:read", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/students/STU_001/academic", {
      headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
    })
    const res = await getUnifiedStudentAcademic(req, {
      params: Promise.resolve({ id: "STU_001" }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.gpaScore).toBe(8.7)
    expect(json.data.subjectGradeEntries.length).toBe(1)
    expect(json.data.subjectGradeEntries[0].compositeScore).toBe(9.2)
    expect(json.data.orientation.hollandCode).toBe("IRC")
  })

  it("rejects academic request when client lacks grades:read scope", async () => {
    const req = new Request("http://localhost:3000/api/v1/unified/students/STU_001/academic", {
      headers: { Authorization: `Bearer ${RAW_RESTRICTED_KEY}` }, // Restricted key only has directory and profile read
    })
    const res = await getUnifiedStudentAcademic(req, {
      params: Promise.resolve({ id: "STU_001" }),
    })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error.code).toBe("PERMISSION_DENIED")
  })
})
