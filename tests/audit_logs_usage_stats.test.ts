import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockGetAdminSession = vi.fn()
const mockRoleFindMany = vi.fn()
const mockCampusFindMany = vi.fn()
const mockUserFindMany = vi.fn()
const mockAuditLogFindMany = vi.fn()

vi.mock("@/lib/session", () => ({
  getAdminSession: () => mockGetAdminSession(),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    role: { findMany: (...args: any[]) => mockRoleFindMany(...args) },
    campus: { findMany: (...args: any[]) => mockCampusFindMany(...args) },
    user: { findMany: (...args: any[]) => mockUserFindMany(...args) },
    auditLog: { findMany: (...args: any[]) => mockAuditLogFindMany(...args) },
  },
}))

import { GET } from "@/app/api/admin/audit-logs/usage-stats/route"

describe("GET /api/admin/audit-logs/usage-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("trả về 401 nếu chưa đăng nhập", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "", role: "" })
    const req = new NextRequest("http://localhost/api/admin/audit-logs/usage-stats?range=30d")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("trả về 403 nếu tài khoản là phụ huynh hoặc học sinh", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "u-parent", role: "PARENT" })
    const req = new NextRequest("http://localhost/api/admin/audit-logs/usage-stats?range=30d")
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it("tổng hợp chính xác chỉ số sử dụng, nhóm quyền, khung giờ và tài khoản chưa truy cập", async () => {
    mockGetAdminSession.mockResolvedValue({ userId: "admin-1", role: "ADMIN" })

    mockRoleFindMany.mockResolvedValue([
      { code: "ADMIN", name: "Administrator" },
      { code: "TEACHER", name: "GV Phổ thông" },
    ])

    mockCampusFindMany.mockResolvedValue([
      { id: "cs1", campusCode: "CS1", campusName: "Sky-Line Riverside" },
    ])

    mockUserFindMany.mockResolvedValue([
      {
        id: "u1",
        email: "gv1@skylineschool.edu.vn",
        fullName: "Nguyễn Văn A",
        role: "TEACHER",
        teacher: { campusId: "cs1", teacherCode: "GV001" },
        campusAssignments: [],
      },
      {
        id: "u2",
        email: "gv2@skylineschool.edu.vn",
        fullName: "Trần Thị B",
        role: "TEACHER",
        teacher: { campusId: "cs1", teacherCode: "GV002" },
        campusAssignments: [],
      },
    ])

    const now = new Date("2026-11-19T02:30:00.000Z") // 09:30 giờ VN (UTC+7)
    mockAuditLogFindMany.mockResolvedValue([
      {
        id: "log-1",
        userId: "u1",
        userEmail: "gv1@skylineschool.edu.vn",
        action: "LOGIN_SUCCESS",
        targetTable: "User",
        createdAt: now,
      },
      {
        id: "log-2",
        userId: "u1",
        userEmail: "gv1@skylineschool.edu.vn",
        action: "SCORE_UPDATE",
        targetTable: "SubjectGradeEntry",
        createdAt: now,
      },
      {
        id: "log-3",
        userId: "N/A",
        userEmail: "unknown@skylineschool.edu.vn",
        action: "LOGIN_FAILED",
        targetTable: "User",
        createdAt: now,
      },
    ])

    const req = new NextRequest("http://localhost/api/admin/audit-logs/usage-stats?range=30d")
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.summary.totalEvents).toBe(3)
    expect(body.summary.loginSuccess).toBe(1)
    expect(body.summary.loginFailed).toBe(1)
    expect(body.summary.dataActions).toBe(1)
    expect(body.summary.activeUsersCount).toBe(1)
    expect(body.summary.totalStaffUsers).toBe(2)
    expect(body.summary.adoptionRate).toBe(50)
    expect(body.summary.inactiveUsersCount).toBe(1)
    expect(body.summary.loginSuccessRate).toBe(50)

    // 02:30 UTC -> 09:30 VN (hour index 9)
    expect(body.hourlyDistribution[9].total).toBe(3)

    // Inactive user is u2
    expect(body.inactiveUsers).toHaveLength(1)
    expect(body.inactiveUsers[0].userId).toBe("u2")

    // Active top user is u1
    expect(body.topUsers).toHaveLength(1)
    expect(body.topUsers[0].userId).toBe("u1")
    expect(body.topUsers[0].logins).toBe(1)
    expect(body.topUsers[0].dataActions).toBe(1)
  })
})
