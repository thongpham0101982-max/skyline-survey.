import { describe, it, expect, beforeEach } from "vitest"
import fs from "fs"
import path from "path"
import {
  checkRateLimit,
  resetRateLimitStore,
  getSafeAppBaseUrl,
  maskEmail,
  sanitizeFileName,
  isPrivilegedGradebookRole,
} from "../src/lib/security-guard"

const ROOT = path.resolve(__dirname, "..")
const readSrc = (relPath: string) => fs.readFileSync(path.join(ROOT, relPath), "utf-8")

describe("OWASP ASVS Security, RBAC & Data Protection Audit Suite", () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  describe("1. Secrets Management & Credential Leak Prevention (ASVS V2 / V14)", () => {
    it("removes hardcoded Turso JWT tokens from all database and API files", () => {
      const targetFiles = [
        "src/lib/db/index.ts",
        "src/app/api/advisory/goals/route.ts",
        "src/app/api/advisory/goals/unlock/route.ts",
        "src/app/api/special-subjects/curriculums/import/route.ts",
        "src/app/api/special-subjects/teaching-logs/route.ts",
      ]

      for (const file of targetFiles) {
        const content = readSrc(file)
        expect(content, `${file} must not contain hardcoded JWT`).not.toMatch(/eyJhbGciOi[A-Za-z0-9_-]{20,}/)
      }
    })

    it("protects /api/check-smtp with admin session and never leaks SMTP_PASS characters", () => {
      const smtpRoute = readSrc("src/app/api/check-smtp/route.ts")
      expect(smtpRoute).toContain("requireAdminOrLeadershipSession")
      expect(smtpRoute).not.toContain("rawPassStart")
      expect(smtpRoute).not.toContain("rawPassEnd")
      expect(smtpRoute).not.toContain("rawPassLength")
    })

    it("requires environment-configured SYNC_API_SECRET without hardcoded fallback", () => {
      const syncRoute = readSrc("src/app/api/sync-excel-students/route.ts")
      expect(syncRoute).not.toContain("skyline_sync_secret_token_2026")
      expect(syncRoute).toContain("if (!SYNC_API_SECRET")
    })
  })

  describe("2. Rate Limiting, Host Header Validation & Path Sanitization (ASVS V2 / V5 / V12)", () => {
    it("enforces sliding-window rate limits for brute-force protection", () => {
      const key = "login:127.0.0.1:teacher01"
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true)
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true)
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true)
      const fourth = checkRateLimit(key, 3, 60_000)
      expect(fourth.allowed).toBe(false)
      expect(fourth.remaining).toBe(0)
    })

    it("prevents Host Header Injection when generating password reset or approval URLs", () => {
      const maliciousReq = new Request("https://ssm.skylineschool.edu.vn/api/auth/forgot-password", {
        headers: {
          host: "evil-phishing-domain.com",
          "x-forwarded-host": "evil-phishing-domain.com",
        },
      })
      const safeUrl = getSafeAppBaseUrl(maliciousReq)
      expect(safeUrl).not.toContain("evil-phishing-domain.com")
      expect(safeUrl).toBe("https://ssm.skylineschool.edu.vn")

      const trustedReq = new Request("https://ssm.skylineschool.edu.vn/api/auth/forgot-password", {
        headers: {
          host: "ssm.skylineschool.edu.vn",
          "x-forwarded-proto": "https",
        },
      })
      expect(getSafeAppBaseUrl(trustedReq)).toBe("https://ssm.skylineschool.edu.vn")
    })

    it("masks email addresses in unauthenticated password recovery responses", () => {
      expect(maskEmail("thongpn@skylineschool.edu.vn")).toBe("th***n@skylineschool.edu.vn")
      expect(maskEmail("ab@skylineschool.edu.vn")).toBe("a***@skylineschool.edu.vn")
    })

    it("sanitizes user-supplied filenames against path traversal", () => {
      expect(sanitizeFileName("../../../etc/passwd")).toBe("passwd")
      expect(sanitizeFileName("..\\..\\Windows\\win.ini")).toBe("win.ini")
      expect(sanitizeFileName("phieu_ket_qua_2026.pdf")).toBe("phieu_ket_qua_2026.pdf")
    })
  })

  describe("3. Least Privilege, Object-Level RBAC & Audit Logging (ASVS V4 / V7)", () => {
    it("strictly restricts gradebook privilege override to leadership/QA roles and blocks PARENT/TEACHER escalation", () => {
      expect(isPrivilegedGradebookRole("PARENT", ["PARENT"])).toBe(false)
      expect(isPrivilegedGradebookRole("STUDENT", ["STUDENT"])).toBe(false)
      expect(isPrivilegedGradebookRole("TEACHER", ["TEACHER"])).toBe(false)
      expect(isPrivilegedGradebookRole("ADMIN", ["ADMIN"])).toBe(true)
      expect(isPrivilegedGradebookRole("KT_DBCL", ["KT_DBCL"])).toBe(true)
      expect(isPrivilegedGradebookRole("GDCS", ["GDCS"])).toBe(true)

      const gradeEntriesRoute = readSrc("src/app/api/teacher/grade-entries/route.ts")
      expect(gradeEntriesRoute).not.toContain('searchParams.get("isManage") === "true"')
      expect(gradeEntriesRoute).not.toContain('userRole !== "TEACHER"')
      expect(gradeEntriesRoute).toContain("isPrivilegedGradebookRole")
      expect(gradeEntriesRoute).toContain('action: "SCORE_UPDATE"')
    })

    it("enforces student relationship verification (IDOR protection) on advisory goal unlock API", () => {
      const unlockRoute = readSrc("src/app/api/advisory/goals/unlock/route.ts")
      expect(unlockRoute).toContain("resolveAdvisoryCaller")
      expect(unlockRoute).toContain("verifyStudentRelationship")
    })

    it("enforces authentication and campus scoping on student lookup, assessment, and admin server actions", () => {
      const protectedApiFiles = [
        "src/app/api/students/search/route.ts",
        "src/app/api/student-transfers/assessment-students/route.ts",
        "src/app/api/admin/tra-cuu-hoc-sinh/profiles/route.ts",
        "src/app/api/admin/tra-cuu-hoc-sinh/grades/route.ts",
        "src/app/api/admin/tra-cuu-hoc-sinh/achievements/route.ts",
        "src/app/api/admin/tra-cuu-hoc-sinh/rankings/route.ts",
        "src/app/api/admin/tra-cuu-hoc-sinh/filter-options/route.ts",
        "src/app/api/admin/ktdbcl/feedback-tracking/route.ts",
        "src/app/api/input-assessment-students/route.ts",
        "src/app/api/input-assessments/route.ts",
        "src/app/api/input-assessment-assignments/route.ts",
        "src/app/api/assessment-configs/route.ts",
        "src/app/api/admin/export-pdf/route.ts",
        "src/app/api/student-photos/[studentId]/route.ts",
      ]

      for (const file of protectedApiFiles) {
        const content = readSrc(file)
        expect(
          content.includes("requireStaffSession") || content.includes("requireAdminOrLeadershipSession"),
          `${file} must enforce staff/admin session`
        ).toBe(true)
      }

      const protectedActionFiles = [
        "src/app/admin/roles/actions.ts",
        "src/app/admin/users/actions.ts",
        "src/app/admin/maintenance/actions.ts",
        "src/app/admin/teaching-assignments/actions.ts",
        "src/app/admin/subjects/actions.ts",
        "src/app/admin/categories/actions.ts",
        "src/app/admin/reports/actions.ts",
        "src/app/admin/surveys/[id]/publish/actions.ts",
        "src/app/admin/surveys/[id]/questions/actions.ts",
      ]

      for (const file of protectedActionFiles) {
        const content = readSrc(file)
        expect(
          content.includes("getAdminSession") ||
            content.includes("requireAdminOrLeadershipSession") ||
            content.includes("requireStaffSession"),
          `${file} must enforce authentication`
        ).toBe(true)
      }
    })
  })
})
