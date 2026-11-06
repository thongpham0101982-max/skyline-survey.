import { describe, it, expect, vi, beforeEach } from "vitest"
import { hashApiKey, validateApiRequest, enforceScopeFilter, isCampusInScope, isClassInScope } from "@/lib/api-auth"
import { GET as getStudents, POST as postStudents } from "@/app/api/v1/students/route"
import { GET as getStudentDetail, PATCH as patchStudent } from "@/app/api/v1/students/[id]/route"
import { POST as postGrades } from "@/app/api/v1/grades/route"
import { PATCH as patchGrade } from "@/app/api/v1/grades/[id]/route"
import { POST as postSurveyResults } from "@/app/api/v1/survey-results/route"
import { GET as getAccessLogs } from "@/app/api/v1/access-logs/route"

// ---------------------------------------------------------------------------
// PURE IN-MEMORY MOCK FOR PRISMA (Strictly zero writes to local.db / Turso)
// ---------------------------------------------------------------------------

const mockDbState: {
  apiKeys: any[]
  apiApplications: any[]
  students: any[]
  grades: any[]
  locks: any[]
  campuses: any[]
  classes: any[]
  academicYears: any[]
  subjects: any[]
  surveyPeriods: any[]
  surveyForms: any[]
  accessLogs: any[]
} = {
  apiKeys: [],
  apiApplications: [],
  students: [],
  grades: [],
  locks: [],
  campuses: [],
  classes: [],
  academicYears: [],
  subjects: [],
  surveyPeriods: [],
  surveyForms: [],
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
        update: vi.fn().mockImplementation(({ where, data }) => {
          const item = mockDbState.apiApplications.find((a) => a.id === where.id)
          if (item) Object.assign(item, data)
          return item
        }),
      },
      apiAccessLog: {
        create: vi.fn().mockResolvedValue({ id: "log_mock" }),
        count: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.accessLogs.filter((l) => !where.applicationId || l.applicationId === where.applicationId).length
        }),
        findMany: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.accessLogs.filter((l) => !where.applicationId || l.applicationId === where.applicationId)
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit_mock" }),
      },
      student: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          if (where.OR) {
            const ids = where.OR.map((o: any) => o.id || o.studentCode)
            return mockDbState.students.find((s) => ids.includes(s.id) || ids.includes(s.studentCode)) || null
          }
          return null
        }),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id) return mockDbState.students.find((s) => s.id === where.id) || null
          if (where.studentCode_academicYearId) {
            return (
              mockDbState.students.find(
                (s) =>
                  s.studentCode === where.studentCode_academicYearId.studentCode &&
                  s.academicYearId === where.studentCode_academicYearId.academicYearId
              ) || null
            )
          }
          return null
        }),
        findMany: vi.fn().mockImplementation(() => mockDbState.students),
        count: vi.fn().mockImplementation(() => mockDbState.students.length),
        create: vi.fn().mockImplementation(({ data }) => {
          const created = { id: `std_${Date.now()}`, ...data }
          mockDbState.students.push(created)
          return created
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          const item = mockDbState.students.find((s) => s.id === where.id)
          if (item) Object.assign(item, data)
          return item
        }),
      },
      campus: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.campuses.find((c) => c.id === where.id) || null
        }),
      },
      class: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.classes.find((c) => c.id === where.id) || null
        }),
      },
      academicYear: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.academicYears.find((y) => y.id === where.id) || null
        }),
      },
      subject: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.subjects.find((s) => s.id === where.id) || null
        }),
      },
      gradebookLock: {
        findMany: vi.fn().mockImplementation(() => mockDbState.locks),
      },
      subjectGradeEntry: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id) return mockDbState.grades.find((g) => g.id === where.id) || null
          if (where.studentId_subjectId_evaluationPeriod_academicYearId) {
            const w = where.studentId_subjectId_evaluationPeriod_academicYearId
            return (
              mockDbState.grades.find(
                (g) =>
                  g.studentId === w.studentId &&
                  g.subjectId === w.subjectId &&
                  g.evaluationPeriod === w.evaluationPeriod &&
                  g.academicYearId === w.academicYearId
              ) || null
            )
          }
          return null
        }),
        create: vi.fn().mockImplementation(({ data }) => {
          const created = { id: `grd_${Date.now()}`, createdAt: new Date(), updatedAt: new Date(), ...data }
          mockDbState.grades.push(created)
          return created
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          const item = mockDbState.grades.find((g) => g.id === where.id)
          if (item) {
            Object.assign(item, data)
            item.updatedAt = new Date()
          }
          return item
        }),
      },
      surveyPeriod: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          return mockDbState.surveyPeriods.find((p) => p.id === where.id) || null
        }),
      },
      surveyForm: {
        findFirst: vi.fn().mockImplementation(() => null),
        create: vi.fn().mockImplementation(({ data }) => {
          const created = { id: `svf_${Date.now()}`, ...data }
          mockDbState.surveyForms.push(created)
          return created
        }),
      },
    },
  }
})

describe("Sky-Line SSM Integration API v1 Test Suite", () => {
  const RAW_VALID_KEY = "sky_live_112233445566778899aabbccddeeff0011223344"
  const RAW_REVOKED_KEY = "sky_live_revoked_key_000000000000000000000000"
  const RAW_EXPIRED_KEY = "sky_live_expired_key_000000000000000000000000"

  beforeEach(() => {
    // Reset mock in-memory state cleanly before each test
    mockDbState.apiApplications = [
      {
        id: "app_riverside_lms",
        name: "Riverside LMS Integration",
        status: "ACTIVE",
        permissions: JSON.stringify(["students:read", "students:write", "grades:read", "grades:write"]),
        allowedCampusIds: JSON.stringify(["cp_riverside"]),
        allowedClassIds: JSON.stringify(["*"]),
        allowedDataScope: "ALL",
        rateLimitRpm: 60,
      },
      {
        id: "app_survey_partner",
        name: "Survey Partner App",
        status: "ACTIVE",
        permissions: JSON.stringify(["survey-results:read", "survey-results:write"]),
        allowedCampusIds: JSON.stringify(["*"]),
        allowedClassIds: JSON.stringify(["*"]),
        allowedDataScope: "ALL",
        rateLimitRpm: 60,
      },
    ]

    mockDbState.apiKeys = [
      {
        id: "key_active",
        applicationId: "app_riverside_lms",
        keyId: "kid_valid01",
        keyPrefix: "sky_live_1122...3344",
        keyHash: hashApiKey(RAW_VALID_KEY),
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 86400000),
      },
      {
        id: "key_revoked",
        applicationId: "app_riverside_lms",
        keyId: "kid_revoked01",
        keyPrefix: "sky_live_revo...0000",
        keyHash: hashApiKey(RAW_REVOKED_KEY),
        status: "REVOKED",
        expiresAt: new Date(Date.now() + 86400000),
      },
      {
        id: "key_expired",
        applicationId: "app_riverside_lms",
        keyId: "kid_expired01",
        keyPrefix: "sky_live_expi...0000",
        keyHash: hashApiKey(RAW_EXPIRED_KEY),
        status: "ACTIVE",
        expiresAt: new Date(Date.now() - 86400000), // In past
      },
    ]

    mockDbState.campuses = [
      { id: "cp_riverside", campusCode: "CP_RIVERSIDE", campusName: "Sky-Line Riverside" },
      { id: "cp_central", campusCode: "CP_CENTRAL", campusName: "Sky-Line Central" },
    ]

    mockDbState.classes = [
      { id: "cl_10a1", className: "10/1", campusId: "cp_riverside" },
      { id: "cl_10a2", className: "10/2", campusId: "cp_central" },
    ]

    mockDbState.academicYears = [
      { id: "ay_2026", name: "2026-2027", status: "ACTIVE" },
    ]

    mockDbState.subjects = [
      { id: "sub_math", subjectCode: "TOAN", subjectName: "Toán học" },
    ]

    mockDbState.students = [
      {
        id: "std_01",
        studentCode: "HS2026-001",
        studentName: "Nguyễn Văn A",
        classId: "cl_10a1",
        campusId: "cp_riverside",
        academicYearId: "ay_2026",
        status: "ACTIVE",
        studentType: "CHINH_KHOA",
      },
      {
        id: "std_02",
        studentCode: "HS2026-002",
        studentName: "Trần Thị B",
        classId: "cl_10a2",
        campusId: "cp_central", // Different campus!
        academicYearId: "ay_2026",
        status: "ACTIVE",
        studentType: "CHINH_KHOA",
      },
    ]

    mockDbState.grades = []
    mockDbState.locks = []
    mockDbState.surveyPeriods = [
      { id: "sp_01", code: "KS_DAU_NAM_2026", name: "Khảo sát đầu năm", status: "ACTIVE", isActive: true },
    ]
    mockDbState.surveyForms = []
  })

  // -------------------------------------------------------------------------
  // TEST 1: Khóa sai, hết hạn, bị thu hồi
  // -------------------------------------------------------------------------
  describe("1. Khóa sai, hết hạn, bị thu hồi (API Key Authentication)", () => {
    it("Từ chối khi request không có header Authorization", async () => {
      const req = new Request("http://localhost/api/v1/students")
      const result = await validateApiRequest(req, "students:read")
      expect(result.ok).toBe(false)
      const data = await result.errorResponse!.json()
      expect(data.error.code).toBe("UNAUTHORIZED")
    })

    it("Từ chối khi khóa sai / không tồn tại", async () => {
      const req = new Request("http://localhost/api/v1/students", {
        headers: { Authorization: "Bearer sky_live_non_existent_key_12345678" },
      })
      const result = await validateApiRequest(req, "students:read")
      expect(result.ok).toBe(false)
      const data = await result.errorResponse!.json()
      expect(data.error.code).toBe("INVALID_API_KEY")
    })

    it("Từ chối khi khóa đã hết hạn (KEY_EXPIRED)", async () => {
      const req = new Request("http://localhost/api/v1/students", {
        headers: { Authorization: `Bearer ${RAW_EXPIRED_KEY}` },
      })
      const result = await validateApiRequest(req, "students:read")
      expect(result.ok).toBe(false)
      const data = await result.errorResponse!.json()
      expect(data.error.code).toBe("KEY_EXPIRED")
    })

    it("Từ chối khi khóa đã bị thu hồi (KEY_REVOKED)", async () => {
      const req = new Request("http://localhost/api/v1/students", {
        headers: { Authorization: `Bearer ${RAW_REVOKED_KEY}` },
      })
      const result = await validateApiRequest(req, "students:read")
      expect(result.ok).toBe(false)
      const data = await result.errorResponse!.json()
      expect(data.error.code).toBe("KEY_REVOKED")
    })
  })

  // -------------------------------------------------------------------------
  // TEST 2: Thiếu quyền đọc hoặc ghi (Default Deny)
  // -------------------------------------------------------------------------
  describe("2. Thiếu quyền đọc hoặc ghi (Principle of Default Deny)", () => {
    it("Từ chối khi ứng dụng không có quyền yêu cầu (PERMISSION_DENIED)", async () => {
      // app_riverside_lms has students:read/write and grades:read/write, but NOT survey-results:read
      const req = new Request("http://localhost/api/v1/survey-results", {
        headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
      })
      const result = await validateApiRequest(req, "survey-results:read")
      expect(result.ok).toBe(false)
      const data = await result.errorResponse!.json()
      expect(data.error.code).toBe("PERMISSION_DENIED")
    })
  })

  // -------------------------------------------------------------------------
  // TEST 3: Truy cập chéo cơ sở bằng cách thay ID bản ghi (Anti-IDOR / Scope)
  // -------------------------------------------------------------------------
  describe("3. Truy cập chéo cơ sở bằng cách thay ID bản ghi (Anti-IDOR Scope)", () => {
    it("Cho phép xem học sinh std_01 thuộc cơ sở cp_riverside", async () => {
      const req = new Request("http://localhost/api/v1/students/std_01", {
        headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
      })
      const res = await getStudentDetail(req, { params: Promise.resolve({ id: "std_01" }) })
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.studentCode).toBe("HS2026-001")
    })

    it("Chặn truy cập chéo cơ sở khi thay ID sang học sinh std_02 (cp_central) (403 ACCESS_DENIED_SCOPE)", async () => {
      const req = new Request("http://localhost/api/v1/students/std_02", {
        headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
      })
      const res = await getStudentDetail(req, { params: Promise.resolve({ id: "std_02" }) })
      const body = await res.json()
      expect(res.status).toBe(403)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("ACCESS_DENIED_SCOPE")
    })

    it("Chặn khi client cố tình truyền campusId không được cấp quyền qua query params", async () => {
      const req = new Request("http://localhost/api/v1/students?campusId=cp_central", {
        headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
      })
      const res = await getStudents(req)
      const body = await res.json()
      expect(res.status).toBe(403)
      expect(body.error.code).toBe("CAMPUS_SCOPE_EXCEEDED")
    })
  })

  // -------------------------------------------------------------------------
  // TEST 4: Gửi trường dữ liệu ngoài danh sách cho phép (Whitelist Check)
  // -------------------------------------------------------------------------
  describe("4. Gửi trường dữ liệu ngoài danh sách cho phép (Field Whitelist)", () => {
    it("Từ chối tạo học sinh khi body chứa trường lạ không xác định (UNKNOWN_FIELDS)", async () => {
      const req = new Request("http://localhost/api/v1/students", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RAW_VALID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentCode: "HS2026-999",
          studentName: "Test Hack",
          classId: "cl_10a1",
          campusId: "cp_riverside",
          academicYearId: "ay_2026",
          maliciousInjection: "DROP TABLE users;", // Not allowed!
        }),
      })

      const res = await postStudents(req)
      const body = await res.json()
      expect(res.status).toBe(400)
      expect(body.error.code).toBe("UNKNOWN_FIELDS")
      expect(body.error.details.invalidFields).toContain("maliciousInjection")
    })
  })

  // -------------------------------------------------------------------------
  // TEST 5: Nhập điểm sai thang hoặc sửa kỳ đã khóa (Gradebook Lock & Range)
  // -------------------------------------------------------------------------
  describe("5. Nhập điểm sai thang hoặc sửa kỳ đã khóa (Business Logic Rules)", () => {
    it("Từ chối khi điểm số nằm ngoài thang 0 đến 10", async () => {
      const req = new Request("http://localhost/api/v1/grades", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RAW_VALID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: "std_01",
          subjectId: "sub_math",
          classId: "cl_10a1",
          academicYearId: "ay_2026",
          evaluationPeriod: "KSĐN",
          compositeScore: 12.5, // > 10!
        }),
      })

      const res = await postGrades(req)
      const body = await res.json()
      expect(res.status).toBe(400)
      expect(body.error.code).toBe("INVALID_SCORE_RANGE")
    })

    it("Từ chối nhập điểm khi sổ điểm kỳ đó đang bị Khóa (GRADEBOOK_LOCKED)", async () => {
      mockDbState.locks.push({
        id: "lck_01",
        academicYearId: "ay_2026",
        evaluationPeriod: "KSĐN",
        classId: "cl_10a1",
        subjectId: "sub_math",
        isLocked: true,
      })

      const req = new Request("http://localhost/api/v1/grades", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RAW_VALID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: "std_01",
          subjectId: "sub_math",
          classId: "cl_10a1",
          academicYearId: "ay_2026",
          evaluationPeriod: "KSĐN",
          compositeScore: 9.0,
        }),
      })

      const res = await postGrades(req)
      const body = await res.json()
      expect(res.status).toBe(403)
      expect(body.error.code).toBe("GRADEBOOK_LOCKED")
    })
  })

  // -------------------------------------------------------------------------
  // TEST 6: Gửi lặp yêu cầu không tạo bản ghi trùng (Idempotency)
  // -------------------------------------------------------------------------
  describe("6. Gửi lặp yêu cầu không tạo bản ghi trùng (Idempotency)", () => {
    it("Trả về bản ghi hiện tại kèm cờ idempotentReplay khi gửi trùng yêu cầu tạo học sinh", async () => {
      const payload = {
        studentCode: "HS2026-001",
        studentName: "Nguyễn Văn A",
        classId: "cl_10a1",
        campusId: "cp_riverside",
        academicYearId: "ay_2026",
      }

      const req = new Request("http://localhost/api/v1/students", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RAW_VALID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const res = await postStudents(req)
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.meta.idempotentReplay).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // TEST 7: Cập nhật bằng phiên bản cũ bị từ chối (Optimistic Concurrency)
  // -------------------------------------------------------------------------
  describe("7. Cập nhật bằng phiên bản cũ bị từ chối (Optimistic Locking)", () => {
    it("Từ chối khi client truyền version cũ không khớp fingerprint hiện tại", async () => {
      const req = new Request("http://localhost/api/v1/students/std_01", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${RAW_VALID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: "Nguyễn Văn A Đã Sửa",
          expectedVersion: "stale_version_fingerprint_12345",
        }),
      })

      const res = await patchStudent(req, { params: Promise.resolve({ id: "std_01" }) })
      const body = await res.json()
      expect(res.status).toBe(409)
      expect(body.error.code).toBe("VERSION_CONFLICT")
    })
  })

  // -------------------------------------------------------------------------
  // TEST 8: Thu hồi khóa có hiệu lực với các request tiếp theo
  // -------------------------------------------------------------------------
  describe("8. Thu hồi khóa có hiệu lực với các request tiếp theo", () => {
    it("Ngay khi khóa chuyển sang status REVOKED, request tiếp theo bị từ chối ngay lập tức", async () => {
      // First request is active and valid
      const req1 = new Request("http://localhost/api/v1/students/std_01", {
        headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
      })
      const res1 = await getStudentDetail(req1, { params: Promise.resolve({ id: "std_01" }) })
      expect(res1.status).toBe(200)

      // Simulate revocation of this active key
      const keyRecord = mockDbState.apiKeys.find((k) => k.keyHash === hashApiKey(RAW_VALID_KEY))
      keyRecord.status = "REVOKED"
      keyRecord.revokedAt = new Date()

      // Subsequent request using same token MUST be rejected
      const req2 = new Request("http://localhost/api/v1/students/std_01", {
        headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
      })
      const res2 = await getStudentDetail(req2, { params: Promise.resolve({ id: "std_01" }) })
      const body2 = await res2.json()
      expect(res2.status).toBe(401)
      expect(body2.error.code).toBe("KEY_REVOKED")
    })
  })

  // -------------------------------------------------------------------------
  // TEST 9: Nghiệp vụ Khảo sát & Phân công (SSM Business Integrity)
  // -------------------------------------------------------------------------
  describe("9. Nghiệp vụ Khảo sát & Phân quyền đặc thù Sky-Line", () => {
    it("Lưu kết quả khảo sát thành công ở trạng thái SUBMITTED, không tự ý chuyển thành APPROVED", async () => {
      // Use partner survey key
      const partnerKey = "sky_live_partner_key_11223344556677889900"
      mockDbState.apiKeys.push({
        id: "key_partner",
        applicationId: "app_survey_partner",
        keyId: "kid_partner01",
        keyPrefix: "sky_live_part...9900",
        keyHash: hashApiKey(partnerKey),
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 86400000),
      })

      const req = new Request("http://localhost/api/v1/survey-results", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${partnerKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surveyPeriodId: "sp_01",
          studentId: "std_01",
          classId: "cl_10a1",
          campusId: "cp_riverside",
          academicYearId: "ay_2026",
          npsScoreRaw: 10,
          responses: [{ questionId: "q1", numericScore: 5 }],
        }),
      })

      const res = await postSurveyResults(req)
      const body = await res.json()
      expect(res.status).toBe(201)
      expect(body.data.status).toBe("SUBMITTED")
      expect(body.data.status).not.toBe("APPROVED")
    })
  })

  // -------------------------------------------------------------------------
  // TEST 10: Dữ liệu truy cập (Access Logs API)
  // -------------------------------------------------------------------------
  describe("10. API Lấy Dữ liệu Truy cập & Nhật ký (Access Logs)", () => {
    it("Cho phép ứng dụng tra cứu lịch sử truy cập của chính mình với khóa API hợp lệ", async () => {
      mockDbState.accessLogs = [
        {
          id: "log_01",
          applicationId: "app_riverside_lms",
          requestId: "req_test_01",
          endpoint: "/api/v1/students",
          method: "GET",
          statusCode: 200,
          ipAddress: "127.0.0.1",
          durationMs: 25,
          requestSummary: "Listed students",
          createdAt: new Date(),
        },
        {
          id: "log_02",
          applicationId: "app_other_system", // Log of a different app!
          requestId: "req_test_02",
          endpoint: "/api/v1/grades",
          method: "POST",
          statusCode: 201,
          createdAt: new Date(),
        },
      ]

      const req = new Request("http://localhost/api/v1/access-logs", {
        headers: { Authorization: `Bearer ${RAW_VALID_KEY}` },
      })

      const res = await getAccessLogs(req)
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.length).toBe(1)
      expect(body.data[0].requestId).toBe("req_test_01")
      expect(body.data[0].statusCode).toBe(200)
    })
  })
})
