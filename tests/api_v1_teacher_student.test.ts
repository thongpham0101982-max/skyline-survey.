import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  hashApiKey,
  validateApiRequest,
  maskSensitivePhone,
  maskSensitiveEmail,
  isDepartmentInScope,
  isCampusInScope,
  isClassInScope,
  hasPermission,
} from "@/lib/api-auth"
import { GET as getTeachers, POST as postTeachers } from "@/app/api/v1/teachers/route"
import { GET as getTeacherDetail, PATCH as patchTeacher } from "@/app/api/v1/teachers/[id]/route"
import { GET as getTeacherAssignments } from "@/app/api/v1/teachers/[id]/assignments/route"
import { GET as getStudentGrades } from "@/app/api/v1/students/[id]/grades/route"
import { GET as getStudentDetail } from "@/app/api/v1/students/[id]/route"

// ---------------------------------------------------------------------------
// PURE IN-MEMORY MOCK FOR PRISMA (Strictly zero writes to local.db / Turso)
// Compliant with RULE 1 (GEMINI.md): No unsolicited test data
// ---------------------------------------------------------------------------

const mockDbState: {
  apiKeys: any[]
  apiApplications: any[]
  teachers: any[]
  teachingAssignments: any[]
  students: any[]
  parents: any[]
  parentLinks: any[]
  grades: any[]
  termScores: any[]
  campuses: any[]
  departments: any[]
  classes: any[]
  users: any[]
  auditLogs: any[]
  accessLogs: any[]
} = {
  apiKeys: [],
  apiApplications: [],
  teachers: [],
  teachingAssignments: [],
  students: [],
  parents: [],
  parentLinks: [],
  grades: [],
  termScores: [],
  campuses: [],
  departments: [],
  classes: [],
  users: [],
  auditLogs: [],
  accessLogs: [],
}

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      $executeRawUnsafe: vi.fn().mockResolvedValue(0),
      $queryRawUnsafe: vi.fn().mockImplementation((query: string, ...args: any[]) => {
        if (query.includes("FROM api_keys")) {
          const hash = args[0]
          const key = mockDbState.apiKeys.find((k) => k.keyHash === hash)
          if (!key) return []
          const app = mockDbState.apiApplications.find((a) => a.id === key.applicationId)
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
              app_class: app.allowedClassIds,
              app_scope: app.allowedDataScope,
              app_rpm: app.rateLimitRpm,
              app_expires: app.expiresAt,
            },
          ]
        }
        return []
      }),
      apiKey: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          const match = mockDbState.apiKeys.find((k) => {
            if (where.keyHash && k.keyHash !== where.keyHash) return false
            if (where.id && k.id !== where.id) return false
            if (where.keyId && k.keyId !== where.keyId) return false
            return true
          })
          if (!match) return null
          const app = mockDbState.apiApplications.find((a) => a.id === match.applicationId)
          return { ...match, application: app }
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          const item = mockDbState.apiKeys.find((k) => k.id === where.id)
          if (item) Object.assign(item, data)
          return item
        }),
      },
      apiApplication: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.apiApplications.find((a) => a.id === where.id) || null
        }),
      },
      apiAccessLog: {
        create: vi.fn().mockImplementation(({ data }) => {
          const entry = { id: `log_${Date.now()}`, ...data, createdAt: new Date() }
          mockDbState.accessLogs.push(entry)
          return entry
        }),
      },
      apiAuditLog: {
        create: vi.fn().mockImplementation(({ data }) => {
          const entry = { id: `audit_${Date.now()}`, ...data, createdAt: new Date() }
          mockDbState.auditLogs.push(entry)
          return entry
        }),
      },
      teacher: {
        findMany: vi.fn().mockImplementation(({ where, skip = 0, take = 50 }) => {
          let list = [...mockDbState.teachers]
          if (where?.status) list = list.filter((t) => t.status === where.status)
          if (where?.campusId) {
            if (typeof where.campusId === "string") {
              list = list.filter((t) => t.campusId === where.campusId)
            } else if (where.campusId.in) {
              list = list.filter((t) => where.campusId.in.includes(t.campusId))
            }
          }
          if (where?.departmentId) {
            if (typeof where.departmentId === "string") {
              list = list.filter((t) => t.departmentId === where.departmentId)
            } else if (where.departmentId.in) {
              list = list.filter((t) => where.departmentId.in.includes(t.departmentId))
            }
          }
          return list.slice(skip, skip + take).map((t) => ({
            ...t,
            departmentRel: mockDbState.departments.find((d) => d.id === t.departmentId) || null,
            campus: mockDbState.campuses.find((c) => c.id === t.campusId) || null,
          }))
        }),
        count: vi.fn().mockImplementation(() => mockDbState.teachers.length),
        findFirst: vi.fn().mockImplementation(({ where }) => {
          let match = null
          if (where.OR) {
            match = mockDbState.teachers.find((t) => where.OR.some((cond: any) => cond.id === t.id || cond.teacherCode === t.teacherCode))
          } else if (where.id) {
            match = mockDbState.teachers.find((t) => t.id === where.id)
          } else if (where.teacherCode) {
            match = mockDbState.teachers.find((t) => t.teacherCode === where.teacherCode)
          } else if (where.email) {
            match = mockDbState.teachers.find((t) => t.email === where.email)
          }
          if (!match) return null
          return {
            ...match,
            departmentRel: mockDbState.departments.find((d) => d.id === match.departmentId) || null,
            campus: mockDbState.campuses.find((c) => c.id === match.campusId) || null,
            mainSubjectRel: null,
          }
        }),
        create: vi.fn().mockImplementation(({ data }) => {
          const created = { id: `tc_${Date.now()}`, ...data }
          mockDbState.teachers.push(created)
          return created
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          const item = mockDbState.teachers.find((t) => t.id === where.id)
          if (item) Object.assign(item, data)
          return {
            ...item,
            departmentRel: mockDbState.departments.find((d) => d.id === item.departmentId) || null,
            campus: mockDbState.campuses.find((c) => c.id === item.campusId) || null,
          }
        }),
      },
      teachingAssignment: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.teachingAssignments
            .filter((a) => a.teacherId === where.teacherId)
            .map((a) => ({
              ...a,
              class: mockDbState.classes.find((c) => c.id === a.classId) || null,
              subject: { id: a.subjectId, name: "Toán", code: "MATH" },
              academicYear: { id: "AY01", name: "2026-2027" },
            }))
        }),
      },
      student: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          let match = null
          if (where.OR) {
            match = mockDbState.students.find((s) => where.OR.some((cond: any) => cond.id === s.id || cond.studentCode === s.studentCode))
          } else if (where.id) {
            match = mockDbState.students.find((s) => s.id === where.id)
          }
          if (!match) return null
          const links = mockDbState.parentLinks.filter((l) => l.studentId === match.id)
          return {
            ...match,
            class: mockDbState.classes.find((c) => c.id === match.classId) || null,
            campus: mockDbState.campuses.find((c) => c.id === match.campusId) || null,
            academicYear: { id: "AY01", name: "2026-2027" },
            parents: links.map((l) => ({
              ...l,
              parent: mockDbState.parents.find((p) => p.id === l.parentId) || null,
            })),
          }
        }),
      },
      subjectGradeEntry: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.grades.filter((g) => g.studentId === where.studentId)
        }),
      },
      studentTermScore: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.termScores.filter((t) => t.studentId === where.studentId)
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => {
          const user = { id: `usr_${Date.now()}`, ...data }
          mockDbState.users.push(user)
          return user
        }),
      },
    },
  }
})

describe("API v1: Teachers & Students Granular Permissions & PII Masking", () => {
  const TEST_SECRET = "sky_live_teacher_student_test_secret_key_12345"
  const TEST_HASH = hashApiKey(TEST_SECRET)

  beforeEach(() => {
    mockDbState.apiKeys = [
      {
        id: "key_01",
        keyId: "sky_key_test_01",
        keyPrefix: "sky_live_teach",
        keyHash: TEST_HASH,
        status: "ACTIVE",
        expiresAt: null,
        applicationId: "app_test_01",
      },
    ]

    mockDbState.apiApplications = [
      {
        id: "app_test_01",
        name: "Test Client App",
        status: "ACTIVE",
        permissions: JSON.stringify(["teachers:directory:read", "students:profile:read", "grades:read"]),
        allowedCampusIds: JSON.stringify(["*"]),
        allowedClassIds: JSON.stringify(["*"]),
        allowedDataScope: "ALL",
        rateLimitRpm: 120,
        expiresAt: null,
      },
    ]

    mockDbState.teachers = [
      {
        id: "tc_01",
        teacherCode: "GV_TOAN_01",
        teacherName: "Thầy Nguyễn Văn A",
        email: "nguyenvana@skylineschool.edu.vn",
        phone: "0905123456",
        campusId: "CP01",
        departmentId: "DEPT_TOAN",
        status: "ACTIVE",
        position: "GV",
        userId: "usr_tc_01",
      },
    ]

    mockDbState.teachingAssignments = [
      {
        id: "assign_01",
        teacherId: "tc_01",
        classId: "cls_10a1",
        subjectId: "subj_math",
        academicYearId: "AY01",
        semester: "HK1",
        periodsPerWeek: 4,
        role: "GVBM",
        status: "ACTIVE",
      },
    ]

    mockDbState.campuses = [{ id: "CP01", campusCode: "CP01", campusName: "Sky-Line Riverside" }]
    mockDbState.departments = [{ id: "DEPT_TOAN", code: "TOAN", name: "Tổ Toán" }]
    mockDbState.classes = [{ id: "cls_10a1", className: "10A1", grade: "10" }]

    mockDbState.parents = [
      {
        id: "p_01",
        parentCode: "PH001",
        parentName: "Trần Thị B",
        phone: "0912345678",
        email: "tranthib@gmail.com",
        status: "ACTIVE",
      },
    ]

    mockDbState.students = [
      {
        id: "std_01",
        studentCode: "HS2026_01",
        studentName: "Học Sinh Thử Nghiệm",
        campusId: "CP01",
        classId: "cls_10a1",
        academicYearId: "AY01",
        status: "ACTIVE",
      },
    ]

    mockDbState.parentLinks = [
      {
        id: "link_01",
        studentId: "std_01",
        parentId: "p_01",
        relationship: "Mẹ",
        status: "ACTIVE",
      },
    ]

    mockDbState.grades = [
      {
        id: "gr_01",
        studentId: "std_01",
        subjectId: "subj_math",
        grade: 9.0,
        evaluationType: "REGULAR",
        notes: "Kiểm tra 15p",
      },
    ]

    mockDbState.termScores = [
      {
        id: "score_01",
        studentId: "std_01",
        academicYearId: "AY01",
        term: "HK1",
        averageScore: 8.8,
        academicRank: "TOT",
      },
    ]

    mockDbState.auditLogs = []
    mockDbState.accessLogs = []
  })

  // 1. PII Masking Pure Functions
  describe("PII Masking utilities", () => {
    it("masks phone numbers correctly", () => {
      expect(maskSensitivePhone("0905123456")).toBe("090****456")
      expect(maskSensitivePhone("0987654321")).toBe("098****321")
      expect(maskSensitivePhone("123")).toBe("****")
      expect(maskSensitivePhone(null)).toBeNull()
    })

    it("masks email addresses correctly", () => {
      expect(maskSensitiveEmail("nguyen@skylineschool.edu.vn")).toBe("n***n@skylineschool.edu.vn")
      expect(maskSensitiveEmail("ab@gmail.com")).toBe("*@gmail.com")
      expect(maskSensitiveEmail(null)).toBeNull()
    })
  })

  // 2. Department & Scope utilities
  describe("Scope checking utilities", () => {
    it("enforces department scope properly", () => {
      expect(isDepartmentInScope(["*"], "DEPT_TOAN")).toBe(true)
      expect(isDepartmentInScope(["DEPT_TOAN"], "DEPT_TOAN")).toBe(true)
      expect(isDepartmentInScope(["DEPT_VAN"], "DEPT_TOAN")).toBe(false)
      expect(isDepartmentInScope([], "DEPT_TOAN")).toBe(true)
    })

    it("evaluates fine-grained permissions properly", () => {
      const mockContext: any = {
        application: {
          permissions: ["teachers:directory:read", "students:profile:read"],
        },
      }
      expect(hasPermission(mockContext, "teachers:directory:read")).toBe(true)
      expect(hasPermission(mockContext, "students:profile:read")).toBe(true)
      expect(hasPermission(mockContext, "teachers:read")).toBe(false)
      expect(hasPermission(mockContext, "students:contact:read")).toBe(false)
    })
  })

  // 3. Teachers API Endpoints
  describe("GET /api/v1/teachers", () => {
    it("returns teachers list with phone masked when lacking teachers:read", async () => {
      const req = new Request("http://localhost:3000/api/v1/teachers", {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      })
      const res = await getTeachers(req)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.length).toBe(1)
      expect(json.data[0].teacherCode).toBe("GV_TOAN_01")
      // Phone should be masked
      expect(json.data[0].phone).toBe("090****456")
      expect(json.meta._phoneMasked).toBe(true)
    })

    it("returns teachers detail by ID with phone masked", async () => {
      const req = new Request("http://localhost:3000/api/v1/teachers/tc_01", {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      })
      const res = await getTeacherDetail(req, { params: Promise.resolve({ id: "tc_01" }) })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.teacherCode).toBe("GV_TOAN_01")
      expect(json.data.phone).toBe("090****456")
    })

    it("returns teacher assignments for assigned teacher", async () => {
      // Grant teachers:assignments:read
      mockDbState.apiApplications[0].permissions = JSON.stringify([
        "teachers:directory:read",
        "teachers:assignments:read",
      ])

      const req = new Request("http://localhost:3000/api/v1/teachers/tc_01/assignments", {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      })
      const res = await getTeacherAssignments(req, { params: Promise.resolve({ id: "tc_01" }) })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.assignments.length).toBe(1)
      expect(json.data.assignments[0].role).toBe("GVBM")
      expect(json.data.assignments[0].periodsPerWeek).toBe(4)
    })
  })

  // 4. Students API Endpoints with PII Masking
  describe("GET /api/v1/students/:id & PII Masking", () => {
    it("masks parent phone & email when lacking students:contact:read", async () => {
      const req = new Request("http://localhost:3000/api/v1/students/std_01", {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      })
      const res = await getStudentDetail(req, { params: Promise.resolve({ id: "std_01" }) })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.studentCode).toBe("HS2026_01")
      expect(json.data._contactMasked).toBe(true)

      const parent = json.data.parents[0].parent
      expect(parent.phone).toBe("091****678")
      expect(parent.email).toBe("t***b@gmail.com")
    })

    it("discloses full parent phone & email when granted students:contact:read", async () => {
      mockDbState.apiApplications[0].permissions = JSON.stringify([
        "students:profile:read",
        "students:contact:read",
      ])

      const req = new Request("http://localhost:3000/api/v1/students/std_01", {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      })
      const res = await getStudentDetail(req, { params: Promise.resolve({ id: "std_01" }) })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data._contactMasked).toBe(false)

      const parent = json.data.parents[0].parent
      expect(parent.phone).toBe("0912345678")
      expect(parent.email).toBe("tranthib@gmail.com")
    })

    it("returns student grades via /api/v1/students/:id/grades", async () => {
      const req = new Request("http://localhost:3000/api/v1/students/std_01/grades", {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      })
      const res = await getStudentGrades(req, { params: Promise.resolve({ id: "std_01" }) })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.regularGrades.length).toBe(1)
      expect(json.data.regularGrades[0].grade).toBe(9.0)
      expect(json.data.termScores.length).toBe(1)
      expect(json.data.termScores[0].averageScore).toBe(8.8)
    })
  })
})
