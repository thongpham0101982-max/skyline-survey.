import { describe, it, expect } from "vitest"
import {
  formatAuditLogSummary,
  formatAuditTargetRef,
  safeParseAuditJson,
} from "../audit-format"

describe("audit-format", () => {
  it("formats DELETE_AUDIT_LOGS with human-readable summary", () => {
    const res = formatAuditLogSummary({
      action: "DELETE_AUDIT_LOGS",
      targetTable: "AuditLog",
      targetId: "BULK",
      newValues: JSON.stringify({ deletedCount: 125, mode: "before_days", days: 30 }),
    })

    expect(res.title).toContain("125")
    expect(res.title).toContain("30 ngày")
    expect(res.subtitle).toContain("Nhật ký hệ thống")
    expect(res.hasStructuredDetails).toBe(true)
  })

  it("formats DELETE_INPUT_ASSESSMENT_ASSIGNMENT with oldValues items", () => {
    const res = formatAuditLogSummary({
      action: "DELETE_INPUT_ASSESSMENT_ASSIGNMENT",
      targetTable: "InputAssessmentTeacherAssignment",
      targetId: "cmm1gn2gc11070qv0gorgu0t2,cmm1gn2g311050qv017wh815v",
      oldValues: JSON.stringify({
        items: [
          {
            teacherName: "Nguyễn Văn A",
            subjectName: "Toán",
            grade: "6",
            educationSystem: "S",
            batchName: "Đợt 1",
          },
          {
            teacherName: "Trần Thị B",
            subjectName: "Tiếng Anh",
            grade: "6",
            educationSystem: "I",
            batchName: "Đợt 1",
          },
        ],
      }),
      newValues: JSON.stringify({ deletedCount: 2 }),
    })

    expect(res.actionLabel).toBe("Xóa phân công GV khảo sát đầu vào")
    expect(res.title).toBe("Đã xóa 2 phân công GV chấm khảo sát đầu vào")
    expect(res.detailLines).toHaveLength(2)
    expect(res.detailLines[0]).toContain("Nguyễn Văn A")
    expect(res.detailLines[0]).toContain("Toán")
    expect(res.detailLines[1]).toContain("Trần Thị B")
    expect(res.hasStructuredDetails).toBe(true)
  })

  it("formats legacy DELETE_INPUT_ASSESSMENT_ASSIGNMENT without oldValues", () => {
    const res = formatAuditLogSummary({
      action: "DELETE_INPUT_ASSESSMENT_ASSIGNMENT",
      targetTable: "InputAssessmentTeacherAssignment",
      targetId: "cmm1gn2gc11070qv0gorgu0t2,cmm1gn2g311050qv017wh815v,cmm1gn2g311030qv0726s1x12",
      newValues: JSON.stringify({ deletedCount: 3 }),
    })

    expect(res.actionLabel).toBe("Xóa phân công GV khảo sát đầu vào")
    expect(res.title).toBe("Đã xóa 3 phân công GV chấm khảo sát đầu vào")
    expect(res.subtitle).toContain("3 mã bản ghi")
    expect(res.subtitle).toContain("chưa lưu tên GV/môn")
  })

  it("preserves plain-text newValues directly", () => {
    const res = formatAuditLogSummary({
      action: "LOGIN_FAILED",
      targetTable: "User",
      targetId: "u1",
      newValues: "Sai mật khẩu",
    })

    expect(res.title).toBe("Sai mật khẩu")
  })

  it("summarizes generic JSON objects into readable title and badges", () => {
    const res = formatAuditLogSummary({
      action: "UPDATE_USER",
      targetTable: "User",
      targetId: "u1",
      newValues: JSON.stringify({ fullName: "Lê Phương Dung", role: "GIAO_VU", status: "ACTIVE" }),
    })

    expect(res.title).toContain("Lê Phương Dung")
    expect(res.hasStructuredDetails).toBe(true)
  })

  it("handles safeParseAuditJson and target ref safely", () => {
    expect(safeParseAuditJson("not json")).toBeNull()
    expect(safeParseAuditJson("{bad json")).toBeNull()
    expect(safeParseAuditJson('{"a":1}')).toEqual({ a: 1 })

    const ref = formatAuditTargetRef("InputAssessmentTeacherAssignment", "id1,id2,id3")
    expect(ref.idCount).toBe(3)
    expect(ref.idSummary).toBe("3 mã bản ghi")
  })
})
