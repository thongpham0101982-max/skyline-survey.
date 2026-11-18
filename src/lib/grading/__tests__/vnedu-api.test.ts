import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockAuth, mockPrisma } = vi.hoisted(() => {
  const prismaObj: any = {
    vnEduImportSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    teacher: {
      findUnique: vi.fn(),
    },
    class: {
      findMany: vi.fn(),
    },
    subject: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subjectGradeConfig: {
      findMany: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    studentCodeMapping: {
      findMany: vi.fn(),
    },
    gradebookLock: {
      findMany: vi.fn(),
    },
    subjectGradeEntry: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    teachingAssignment: {
      findMany: vi.fn(),
    },
    vnEduSubjectMappingHint: {
      upsert: vi.fn(),
    },
    vnEduImportLog: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(prismaObj)),
  }
  return { mockAuth: vi.fn(), mockPrisma: prismaObj }
})

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

import { POST } from "@/app/api/admin/ktdbcl/vnedu-import/route"
import { resolveVnEduCodeMap } from "@/lib/grading/vnedu-code-resolver"

function makeJsonReq(body: any) {
  return new NextRequest("http://localhost/api/admin/ktdbcl/vnedu-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const sampleParsedSheet = {
  fileName: "toan.xls",
  sheetName: "4_1",
  detectedSubject: "Toán học",
  detectedClass: "4/1",
  detectedAcademicYear: "2026-2027",
  detectedPeriod: "GK1",
  metadataConflicts: [],
  warnings: [],
  headerRowStart: 7,
  headerRowEnd: 7,
  columns: [
    { colIndex: 0, headerLabel: "STT", tier1Label: "STT", tier2Label: "", normalizedHeader: "stt", isHidden: false, role: "STT" },
    { colIndex: 1, headerLabel: "Mã HS", tier1Label: "Mã HS", tier2Label: "", normalizedHeader: "mã hs", isHidden: true, role: "VNEDU_CODE" },
    { colIndex: 2, headerLabel: "Họ và tên", tier1Label: "Họ và tên", tier2Label: "", normalizedHeader: "họ và tên", isHidden: false, role: "FULL_NAME" },
    { colIndex: 3, headerLabel: "KT GK1", tier1Label: "KT GK1", tier2Label: "", normalizedHeader: "kt gk1", isHidden: false, role: "SCORE_OR_VALUE" },
  ],
  rows: [
    {
      rowIndex: 8,
      stt: "1",
      vnEduCode: "VN001",
      fullName: "Nguyễn Văn An",
      dob: "",
      valuesByColIndex: { 0: "1", 1: "VN001", 2: "Nguyễn Văn An", 3: "9.5" },
      valuesByHeader: { STT: "1", "Mã HS": "VN001", "Họ và tên": "Nguyễn Văn An", "KT GK1": "9.5" },
      formulaErrors: [],
      isEmptyResultRow: false,
    },
  ],
  skippedFooterStartRow: null,
}

describe("API /api/admin/ktdbcl/vnedu-import (Mocked DB & Auth)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: "u1", name: "Admin", role: "ADMIN" } })
    mockPrisma.vnEduImportSession.findUnique.mockResolvedValue({ id: "sess1", status: "PARSED", idempotencyKey: null })
    mockPrisma.class.findMany.mockResolvedValue([{ id: "cls1", className: "4/1", grade: "Khối 4", educationSystem: "MOET" }])
    mockPrisma.subject.findMany.mockResolvedValue([{ id: "sub1", subjectCode: "TOAN", subjectName: "Toán học" }])
    mockPrisma.subjectGradeConfig.findMany.mockResolvedValue([
      {
        id: "cfg1",
        academicYearId: "ay1",
        program: "ALL",
        grade: "Khối 4",
        subjectId: "sub1",
        evaluationPeriod: "GK1",
        configType: "VNEDU",
        confirmationStatus: "CONFIRMED",
        version: 1,
        isActive: true,
        hasCompositeColumn: false,
        hasRatingColumn: false,
        hasRemarkColumn: false,
        columnsJson: JSON.stringify([{ key: "gk1", label: "KT GK1", group: "GK", dataType: "NUMBER", maxScore: 10, aliases: ["KT GK1"] }]),
      },
    ])
    mockPrisma.student.findMany.mockResolvedValue([
      { id: "st1", studentCode: "HS001", vnEduCode: "VN001", studentName: "Nguyễn Văn An", dateOfBirth: null, classId: "cls1", class: { className: "4/1" } },
    ])
    mockPrisma.studentCodeMapping.findMany.mockResolvedValue([])
    mockPrisma.gradebookLock.findMany.mockResolvedValue([])
    mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([])
    mockPrisma.teachingAssignment.findMany.mockResolvedValue([])
  })

  it("chặn ghi khi chưa xác nhận môn đích (confirmedByUser=false)", async () => {
    const res = await POST(
      makeJsonReq({
        action: "commit",
        academicYearId: "ay1",
        sessionId: "sess1",
        sheetMappings: [
          {
            fileName: "toan.xls",
            sheetName: "4_1",
            targetClassId: "cls1",
            confirmedSubjectId: "sub1",
            confirmedByUser: false,
            evaluationPeriod: "GK1",
            parsedSheet: sampleParsedSheet,
          },
        ],
      })
    )
    expect(res.status).toBe(400)
    expect(mockPrisma.subjectGradeEntry.upsert).not.toHaveBeenCalled()
  })

  it("chặn giáo viên không được phân công hoặc khi sổ điểm đã khóa", async () => {
    mockAuth.mockResolvedValue({ user: { id: "t1", name: "GV", role: "TEACHER" } })
    mockPrisma.teacher.findUnique.mockResolvedValue({ id: "teacher1" })
    mockPrisma.teachingAssignment.findMany.mockResolvedValue([{ classId: "cls1", subjectId: "sub1" }])
    mockPrisma.gradebookLock.findMany.mockResolvedValue([
      { evaluationPeriod: "GK1", classId: "cls1", subjectId: "sub1", isLocked: true },
    ])

    const res = await POST(
      makeJsonReq({
        action: "preview",
        academicYearId: "ay1",
        sessionId: "sess1",
        sheetMappings: [
          {
            fileName: "toan.xls",
            sheetName: "4_1",
            targetClassId: "cls1",
            confirmedSubjectId: "sub1",
            confirmedByUser: true,
            evaluationPeriod: "GK1",
            parsedSheet: sampleParsedSheet,
          },
        ],
      })
    )
    expect(res.status).toBe(403)
  })

  it("phát hiện xung đột khi dữ liệu thay đổi sau preview (409)", async () => {
    mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
      {
        id: "e1",
        studentId: "st1",
        subjectId: "sub1",
        classId: "cls1",
        evaluationPeriod: "GK1",
        configType: "VNEDU",
        updatedAt: new Date("2026-11-16T12:00:00Z"),
      },
    ])

    const res = await POST(
      makeJsonReq({
        action: "commit",
        academicYearId: "ay1",
        sessionId: "sess1",
        previewTimestamp: "2026-11-16T10:00:00Z",
        idempotencyKey: "idem_1",
        sheetMappings: [
          {
            fileName: "toan.xls",
            sheetName: "4_1",
            targetClassId: "cls1",
            confirmedSubjectId: "sub1",
            confirmedByUser: true,
            evaluationPeriod: "GK1",
            parsedSheet: sampleParsedSheet,
          },
        ],
      })
    )
    expect(res.status).toBe(409)
    expect(mockPrisma.subjectGradeEntry.upsert).not.toHaveBeenCalled()
  })

  it("chống request lặp bằng idempotencyKey và không bao giờ tạo/sửa Subject hoặc Student", async () => {
    mockPrisma.vnEduImportSession.findUnique.mockImplementation(async ({ where }: any) => {
      if (where?.idempotencyKey === "idem_dup") {
        return { id: "sess_other", status: "COMMITTED", summaryJson: JSON.stringify({ addedCount: 1 }) }
      }
      return { id: "sess1", status: "PARSED", idempotencyKey: null }
    })

    const res = await POST(
      makeJsonReq({
        action: "commit",
        academicYearId: "ay1",
        sessionId: "sess1",
        idempotencyKey: "idem_dup",
        sheetMappings: [
          {
            fileName: "toan.xls",
            sheetName: "4_1",
            targetClassId: "cls1",
            confirmedSubjectId: "sub1",
            confirmedByUser: true,
            evaluationPeriod: "GK1",
            parsedSheet: sampleParsedSheet,
          },
        ],
      })
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.idempotentReplay).toBe(true)
    expect(mockPrisma.subject.create).not.toHaveBeenCalled()
    expect(mockPrisma.subject.update).not.toHaveBeenCalled()
    expect(mockPrisma.student.update).not.toHaveBeenCalled()
  })

  it("resolveVnEduCodeMap kế thừa mã vnEdu từ năm học trước (như lớp 5.2_CS1) và chuẩn hóa mã mất số 0 đầu", async () => {
    mockPrisma.studentCodeMapping.findMany.mockResolvedValue([
      { databaseCode: "0601020904", markFileCode: "2101062237", academicYearId: "AY-2026" },
      { databaseCode: "601012081", markFileCode: "2403846607", academicYearId: "ay1" },
    ])

    const map = await resolveVnEduCodeMap(["0601020904", "0601012081"], "ay1")
    expect(map.get("0601020904")).toBe("2101062237")
    expect(map.get("0601012081")).toBe("2403846607")
  })
})
