import { describe, expect, it } from "vitest"
import { resolveBenchmarkScore } from "@/lib/campus-quality/baseContext"
import { resolveEffectiveCampusIds } from "@/lib/campus-quality/scope"
import {
  buildScoreDistributionBuckets,
  computeDiffPp,
  computeNextReviewDate,
  computeScoreStats,
  isApprovedAdmissionPass,
  isConfirmedEnrollment,
  isInternalSkylineTransfer,
  normalizePsychologyOutcome,
} from "@/lib/campus-quality/stats"
import { CampusQualityAccessScope } from "@/lib/campus-quality/types"

describe("Campus Quality Dashboard — Pure Calculation & Governance Rules", () => {
  it("includes valid score 0 in distribution, average, median, mode, stdDev and <5 count", () => {
    const scores = [0, 0, 5, 7, 8, 10]
    const stats = computeScoreStats(scores)

    expect(stats.validCount).toBe(6)
    expect(stats.average).toBe(5)
    expect(stats.median).toBe(6)
    expect(stats.mode).toBe(0)
    expect(stats.countGte7).toBe(3)
    expect(stats.rateGte7).toBe(50)
    expect(stats.count10).toBe(1)
    expect(stats.below5Count).toBe(2)
    expect(stats.below5Rate).toBe(33.3)
    expect(stats.stdDev).not.toBeNull()

    const buckets = buildScoreDistributionBuckets(scores, scores, scores)
    const lt5 = buckets.find((b) => b.bucketId === "LT_5")
    expect(lt5?.classCount).toBe(2)
    expect(lt5?.classPct).toBe(33.3)
  })

  it("returns null when no benchmark config matches so UI displays 'Chưa cấu hình ngưỡng'", () => {
    const configs = [
      {
        evaluationPeriod: "GK1",
        level: "TIEU_HOC",
        grade: "5",
        subjectId: "SUB_MATH",
        benchmarkScore: 7.0,
      },
    ]
    expect(resolveBenchmarkScore(configs, "GK1", "TIEU_HOC", "5", "SUB_MATH")).toBe(7.0)
    expect(resolveBenchmarkScore(configs, "GK1", "THCS", "8", "SUB_PHYS")).toBeNull()
  })

  it("computes system comparison difference in percentage points (pp)", () => {
    expect(computeDiffPp(82.4, 80.0)).toBe(2.4)
    expect(computeDiffPp(74.2, 76.0)).toBe(-1.8)
    expect(computeDiffPp(null, 80.0)).toBeNull()
  })

  it("detects internal Sky-Line transfers accurately for net=0 system verification", () => {
    expect(isInternalSkylineTransfer("Sky-Line Riverside CS2", "", false)).toBe(true)
    expect(isInternalSkylineTransfer("Trường THCS Nguyễn Huệ", "Chuyển đi tỉnh khác", false)).toBe(false)
    expect(isInternalSkylineTransfer("", "", true)).toBe(true)
  })

  it("classifies admission approval & confirmed enrollment accurately", () => {
    expect(isApprovedAdmissionPass("Đạt")).toEqual({
      isPassed: true,
      isCommitted: false,
      isPending: false,
    })
    expect(isApprovedAdmissionPass("Đạt cam kết")).toEqual({
      isPassed: true,
      isCommitted: true,
      isPending: false,
    })
    expect(isApprovedAdmissionPass("")).toEqual({
      isPassed: false,
      isCommitted: false,
      isPending: true,
    })
    expect(isApprovedAdmissionPass("Không đạt")).toEqual({
      isPassed: false,
      isCommitted: false,
      isPending: false,
    })

    expect(isConfirmedEnrollment("ENROLLED", null, null)).toBe(true)
    expect(isConfirmedEnrollment(null, "cls_123", null)).toBe(true)
    expect(isConfirmedEnrollment("CANCELLED", null, new Date())).toBe(false)
  })

  it("computes next review date and psychology outcome labels", () => {
    const start = new Date("2026-10-01T00:00:00Z")
    const nextMonth = computeNextReviewDate(start, null, "MONTH")
    expect(nextMonth.getTime()).toBeGreaterThan(start.getTime())

    const nextWeek = computeNextReviewDate(start, new Date("2026-11-10T00:00:00Z"), "WEEK")
    expect(nextWeek.toISOString().slice(0, 10)).toBe("2026-11-17")

    expect(normalizePsychologyOutcome("Đạt mục tiêu", null, "ACTIVE").isGoalAchieved).toBe(true)
    expect(normalizePsychologyOutcome(null, "Có tiến triển", "ACTIVE").code).toBe("PROGRESSING")
    expect(normalizePsychologyOutcome(null, "Cần điều chỉnh phương án", "ACTIVE").code).toBe(
      "ADJUST_PLAN"
    )
  })

  it("strictly enforces GĐCS campus scope against URL campusId tampering", () => {
    const gdcsScope = {
      userId: "u1",
      roleCode: "GDCS",
      roleTier: "CAMPUS_MANAGER",
      roleDisplayLabel: "GĐCS",
      canViewReport: true,
      canViewDetail: true,
      canExportSummary: true,
      canExportDetail: true,
      isCampusRestricted: true,
      allowedCampusIds: ["CS1"],
      isSubjectRestricted: false,
      allowedSubjectIds: [],
      allowedSubjectCodes: [],
      isClassRestricted: false,
      allowedClassIds: [],
      homeroomClassIds: [],
      canViewPsychology: true,
      canExportExcel: true,
      defaultCampusId: "CS1",
      teacherId: null,
      assignedDepartmentIds: [],
    } satisfies CampusQualityAccessScope

    expect(resolveEffectiveCampusIds("CS1", gdcsScope)).toEqual({
      campusIdParam: "CS1",
      allowedCampusFilter: ["CS1"],
      forbidden: false,
    })
    expect(resolveEffectiveCampusIds("CS2", gdcsScope).forbidden).toBe(true)
    expect(resolveEffectiveCampusIds("ALL", gdcsScope)).toEqual({
      campusIdParam: "CS1",
      allowedCampusFilter: ["CS1"],
      forbidden: false,
    })
  })
})
