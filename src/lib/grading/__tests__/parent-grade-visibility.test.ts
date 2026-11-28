import { describe, expect, it } from "vitest"
import {
  buildParentGradeVisibilityMap,
  getLockedParentGradePeriods,
  isParentGradePeriodLocked,
  normalizeParentGradePeriod,
} from "../parent-grade-visibility"

describe("parent-grade-visibility", () => {
  it("normalizes all period code variants accurately", () => {
    expect(normalizeParentGradePeriod("KSĐN")).toBe("KSĐN")
    expect(normalizeParentGradePeriod("ksdn")).toBe("KSĐN")
    expect(normalizeParentGradePeriod("Khảo sát đầu năm")).toBe("KSĐN")

    expect(normalizeParentGradePeriod("GK1")).toBe("GK1")
    expect(normalizeParentGradePeriod("GIUA_KY_1")).toBe("GK1")
    expect(normalizeParentGradePeriod("Giữa kỳ 1")).toBe("GK1")
    expect(normalizeParentGradePeriod("Giữa kì 1")).toBe("GK1")

    expect(normalizeParentGradePeriod("CK1")).toBe("CK1")
    expect(normalizeParentGradePeriod("CUOI_KY_1")).toBe("CK1")

    expect(normalizeParentGradePeriod("GK2")).toBe("GK2")
    expect(normalizeParentGradePeriod("GIUA_KY_2")).toBe("GK2")

    expect(normalizeParentGradePeriod("CK2")).toBe("CK2")
    expect(normalizeParentGradePeriod("CUOI_KY_2")).toBe("CK2")

    expect(normalizeParentGradePeriod("UNKNOWN")).toBeNull()
    expect(normalizeParentGradePeriod(null)).toBeNull()
  })

  it("locks GK1 and GK2 by default when no database records exist", () => {
    const map = buildParentGradeVisibilityMap([], "ay-2026")
    expect(getLockedParentGradePeriods(map)).toEqual(["GK1", "GK2"])
    expect(isParentGradePeriodLocked(map, "KSĐN")).toBe(false)
    expect(isParentGradePeriodLocked(map, "GK1")).toBe(true)
    expect(isParentGradePeriodLocked(map, "GIUA_KY_1")).toBe(true)
    expect(isParentGradePeriodLocked(map, "CK1")).toBe(false)
    expect(isParentGradePeriodLocked(map, "GK2")).toBe(true)
    expect(isParentGradePeriodLocked(map, "CK2")).toBe(false)
  })

  it("applies year-specific overrides over global records and defaults", () => {
    const map = buildParentGradeVisibilityMap(
      [
        {
          code: "GK1",
          academicYearId: null,
          name: JSON.stringify({ isLocked: true, updatedBy: "Global Admin" }),
        },
        {
          code: "GK1",
          academicYearId: "ay-2026",
          name: JSON.stringify({ isLocked: false, updatedBy: "KTDBCL", reason: "Đã công bố GK1" }),
        },
        {
          code: "CK1",
          academicYearId: "ay-2026",
          name: JSON.stringify({ isLocked: true, updatedBy: "KTDBCL", reason: "Đang rà soát CK1" }),
        },
      ],
      "ay-2026"
    )

    expect(isParentGradePeriodLocked(map, "GK1")).toBe(false)
    expect(map.GK1.updatedBy).toBe("KTDBCL")
    expect(isParentGradePeriodLocked(map, "CK1")).toBe(true)
    expect(isParentGradePeriodLocked(map, "GK2")).toBe(true)
    expect(getLockedParentGradePeriods(map)).toEqual(["CK1", "GK2"])
  })
})
