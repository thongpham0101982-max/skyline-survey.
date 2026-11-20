import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    inputAssessmentStudent: { updateMany: vi.fn() },
    preschoolInputAssessmentStudent: { updateMany: vi.fn() },
    permission: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

import {
  validateNameChangeInput,
  canModifyRequestStatus,
  sortGradeValues,
  syncStudentNameAcrossTables,
} from "../helpers"
import { prisma } from "@/lib/db"

describe("StudentNameChangeRequest helpers", () => {
  describe("validateNameChangeInput", () => {
    it("rejects empty new name", () => {
      const res = validateNameChangeInput({
        oldName: "Nguyễn Văn A",
        newName: "   ",
        reason: "Đính chính theo giấy khai sinh",
      })
      expect(res.valid).toBe(false)
      expect(res.error).toContain("tên mới")
    })

    it("rejects identical new name after whitespace normalization", () => {
      const res = validateNameChangeInput({
        oldName: "Nguyễn Văn A",
        newName: "  Nguyễn   Văn   A  ",
        reason: "Đính chính",
      })
      expect(res.valid).toBe(false)
      expect(res.error).toContain("trùng khớp")
    })

    it("rejects empty reason", () => {
      const res = validateNameChangeInput({
        oldName: "Nguyễn Quỳnh Anh",
        newName: "Nguyễn Tuệ Nghi",
        reason: "   ",
      })
      expect(res.valid).toBe(false)
      expect(res.error).toContain("lý do")
    })

    it("accepts valid Vietnamese & international names and collapses extra spaces", () => {
      const res = validateNameChangeInput({
        oldName: "May Li Na Van Rensburg",
        newName: "  Van   Rensburg May Li Na  ",
        reason: "  Cập nhật theo hộ chiếu  ",
      })
      expect(res.valid).toBe(true)
      expect(res.cleanedNewName).toBe("Van Rensburg May Li Na")
      expect(res.cleanedReason).toBe("Cập nhật theo hộ chiếu")
    })
  })

  describe("canModifyRequestStatus", () => {
    it("allows editing PENDING and REJECTED, blocks APPROVED", () => {
      expect(canModifyRequestStatus("PENDING")).toBe(true)
      expect(canModifyRequestStatus("REJECTED")).toBe(true)
      expect(canModifyRequestStatus("APPROVED")).toBe(false)
    })
  })

  describe("sortGradeValues", () => {
    it("sorts preschool first and numeric grades in ascending numeric order", () => {
      const sorted = sortGradeValues(["10", "2", "1", "Mầm non", "12", "6", "9", "2"])
      expect(sorted).toEqual(["Mầm non", "1", "2", "6", "9", "10", "12"])
    })
  })

  describe("syncStudentNameAcrossTables", () => {
    it("updates both K12 and preschool assessment tables with uppercased studentCode", async () => {
      await syncStudentNameAcrossTables("  hs-2026-001 ", "Nguyễn Tuệ Nghi")
      expect((prisma as any).inputAssessmentStudent.updateMany).toHaveBeenCalledWith({
        where: { studentCode: "HS-2026-001" },
        data: { fullName: "Nguyễn Tuệ Nghi" },
      })
      expect((prisma as any).preschoolInputAssessmentStudent.updateMany).toHaveBeenCalledWith({
        where: { studentCode: "HS-2026-001" },
        data: { fullName: "Nguyễn Tuệ Nghi" },
      })
    })
  })
})
