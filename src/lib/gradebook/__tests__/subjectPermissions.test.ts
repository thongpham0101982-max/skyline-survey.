import { describe, it, expect, vi, beforeEach } from "vitest"
import { APP_CATEGORIES } from "@/config/modules"
import { SIDEBAR_TRANSLATIONS, getCategoryName, getModuleName } from "@/config/sidebarTranslations"

const mockQueryRawUnsafe = vi.fn()
const mockExecuteRawUnsafe = vi.fn()
const mockFindManySubjects = vi.fn()
const mockFindUniqueTeacher = vi.fn()
const mockFindFirstAcademicYear = vi.fn()
const mockFindManyTeachingAssignments = vi.fn()
const mockFindManyCtqtAssignments = vi.fn()

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRawUnsafe: (...args: any[]) => mockQueryRawUnsafe(...args),
    $executeRawUnsafe: (...args: any[]) => mockExecuteRawUnsafe(...args),
    subject: {
      findMany: (...args: any[]) => mockFindManySubjects(...args),
    },
    teacher: {
      findUnique: (...args: any[]) => mockFindUniqueTeacher(...args),
    },
    academicYear: {
      findFirst: (...args: any[]) => mockFindFirstAcademicYear(...args),
    },
    teachingAssignment: {
      findMany: (...args: any[]) => mockFindManyTeachingAssignments(...args),
    },
    ctqtTeachingAssignment: {
      findMany: (...args: any[]) => mockFindManyCtqtAssignments(...args),
    },
  },
}))

import {
  mapSubjectsToCtqtCodes,
  resolveAccountGradebookScope,
} from "../subjectPermissions"
import {
  REPORT_PERIOD_OPTIONS,
  REPORT_TEMPLATE_OPTIONS,
} from "@/app/teacher/diem-lop-chu-nhiem/components/StudentSurveyReportModal"

describe("Gradebook Category & Subject Permission Scope", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecuteRawUnsafe.mockResolvedValue(0)
    mockFindFirstAcademicYear.mockResolvedValue({ id: "ay-2026" })
  })

  it("includes GRADEBOOK_REMARKS (Sổ điểm - Nhận xét) category with 5 modules including Xuất bảng điểm", () => {
    const gradebookCat = APP_CATEGORIES.find((c) => c.id === "GRADEBOOK_REMARKS")
    expect(gradebookCat).toBeDefined()
    expect(gradebookCat?.name).toBe("Sổ điểm - Nhận xét")
    expect(getCategoryName("GRADEBOOK_REMARKS", "", "vi")).toBe("Sổ điểm - Nhận xét")

    const codes = gradebookCat?.modules.map((m) => m.code)
    expect(codes).toEqual([
      "KTDBCL_GRADE_REMARKS",
      "KTDBCL_GRADE_CTQT",
      "KTDBCL_THONG_KE_BAO_CAO",
      "KTDBCL_PHAN_TICH_THKQ",
      "KTDBCL_XUAT_BANG_DIEM",
    ])

    expect(getModuleName("KTDBCL_GRADE_REMARKS", "", "vi")).toBe("Sổ điểm Vnedu")
    expect(getModuleName("KTDBCL_GRADE_CTQT", "", "vi")).toBe("Sổ điểm CTQT")
    expect(getModuleName("KTDBCL_THONG_KE_BAO_CAO", "", "vi")).toBe("Thống kê báo cáo")
    expect(getModuleName("KTDBCL_PHAN_TICH_THKQ", "", "vi")).toBe("Phân tích Tổng hợp Kết quả (THKQ)")
    expect(getModuleName("KTDBCL_XUAT_BANG_DIEM", "", "vi")).toBe("Xuất bảng điểm")
    expect(SIDEBAR_TRANSLATIONS.modules.KTDBCL_GRADE_REMARKS.vi).toBe("Sổ điểm Vnedu")
    expect(SIDEBAR_TRANSLATIONS.modules.KTDBCL_XUAT_BANG_DIEM.vi).toBe("Xuất bảng điểm")
  })

  it("maps MOET and International subjects to CTQT subject codes accurately", () => {
    const codes = mapSubjectsToCtqtCodes([
      { subjectCode: "TA", subjectName: "Tiếng Anh" },
      { subjectCode: "TOA", subjectName: "Toán" },
    ])
    expect(codes).toContain("ENG")
    expect(codes).toContain("AE")
    expect(codes).toContain("IELTS")
    expect(codes).toContain("MAT")
    expect(codes).not.toContain("SCI")
  })

  it("returns unrestricted scope for ADMIN without explicit subject assignment", async () => {
    mockQueryRawUnsafe.mockResolvedValue([])
    const scope = await resolveAccountGradebookScope("admin-1", "ADMIN", "ay-2026")
    expect(scope.isFullSchoolUnrestricted).toBe(true)
    expect(scope.isSubjectScoped).toBe(false)
    expect(scope.allowedSubjectIds).toEqual([])
  })

  it("scopes account to explicitly assigned subjects and resolves CTQT codes", async () => {
    mockQueryRawUnsafe.mockResolvedValue([
      { subjectId: "sub-math", subjectCode: "TOA" },
      { subjectId: "sub-sci", subjectCode: "SCI" },
    ])
    mockFindUniqueTeacher.mockResolvedValue(null)
    mockFindManySubjects.mockResolvedValue([
      { id: "sub-math", subjectCode: "TOA", subjectName: "Toán", category: "MOET", parentId: null },
      { id: "sub-sci", subjectCode: "SCI", subjectName: "Khoa học", category: "MOET", parentId: null },
      { id: "sub-lit", subjectCode: "TVI", subjectName: "Tiếng Việt", category: "MOET", parentId: null },
    ])

    const scope = await resolveAccountGradebookScope("user-1", "KT_DBCL", "ay-2026")
    expect(scope.hasExplicitSubjectAssignment).toBe(true)
    expect(scope.isSubjectScoped).toBe(true)
    expect(scope.allowedSubjectIds).toEqual(["sub-math", "sub-sci"])
    expect(scope.allowedCtqtSubjectCodes).toContain("MAT")
    expect(scope.allowedCtqtSubjectCodes).toContain("SCI")
    expect(scope.allowedSubjectIds).not.toContain("sub-lit")
  })

  it("provides evaluation periods, semesters, and 3 report templates for GVCN Report Export", () => {
    const periodCodes = REPORT_PERIOD_OPTIONS.map((p) => p.code)
    expect(periodCodes).toEqual(["KSĐN", "GK1", "CK1", "HK1", "GK2", "CK2", "HK2", "CN"])

    const templateCodes = REPORT_TEMPLATE_OPTIONS.map((t) => t.code)
    expect(templateCodes).toEqual(["DETAILED_CONFIG", "SUMMARY_STANDARD", "CIRCULAR_TERM"])
  })
})
