import { describe, it, expect } from "vitest"
import * as XLSX from "xlsx"

import {
  computeColumnBasicStats,
  computeScoreDistribution8Buckets,
  resolveScoreDistribution8BucketId,
  computeFrequencyTable025,
} from "@/lib/ktdbcl/thkqBasicStatsEngine"

import {
  parseAcademicCommittedSubjects,
  formatCommitmentScoreWithSklArrow,
  isExplicitNonCommitmentRecord,
  doesSubjectMatchCommittedSubject,
} from "@/lib/ktdbcl/entranceCommitmentReportEngine"

import {
  generateTeachingPlanTemplateBuffer,
  parseAndValidateTeachingPlanExcel,
  buildDeterministicSkeletonPeriodCode,
} from "@/lib/teaching-plan/excelService"

import {
  parseVnEduWorkbook,
  readCodeCellAsText,
} from "@/lib/grading/vnedu-excel-parser"

import {
  doWeekTypesOverlap,
  validateTimetable,
} from "@/lib/timetable/validator"

import {
  buildDefaultPeriodTimes,
} from "@/lib/timetable/scopeResolver"

describe("QA Functional & Boundary Regression Suite (Pure / No DB Writes)", () => {
  describe("Scenario B: Kế hoạch dạy học (Template, Parse, Mismatch, Deterministic Period Codes)", () => {
    it("B-01: Roundtrip tải mẫu & kiểm tra hợp lệ 100%", () => {
      const buf = generateTeachingPlanTemplateBuffer({
        academicYearName: "2026-2027",
        grade: "1",
        subjectName: "Toán học",
        programName: "Hệ S",
        scopeLabel: "Toàn hệ thống",
      })
      const preview = parseAndValidateTeachingPlanExcel(buf, {
        academicYearName: "2026-2027",
        grade: "1",
        subjectCode: "TOA",
        subjectName: "Toán học",
        programName: "Hệ S",
        scopeType: "SYSTEM",
      })
      expect(preview.errors).toHaveLength(0)
      expect(preview.lessons.length).toBe(2)
      expect(preview.periods.length).toBe(9)
    })

    it("B-02: Phát hiện sai Năm học / Khối", () => {
      const buf = generateTeachingPlanTemplateBuffer({
        academicYearName: "2025-2026",
        grade: "2",
        subjectName: "Toán học",
      })
      const preview = parseAndValidateTeachingPlanExcel(buf, {
        academicYearName: "2026-2027",
        grade: "1",
        subjectCode: "TOA",
        subjectName: "Toán học",
        scopeType: "SYSTEM",
      })
      expect(preview.errors.length).toBeGreaterThanOrEqual(2)
      expect(preview.mismatches.some((m) => m.field === "academicYear")).toBe(true)
      expect(preview.mismatches.some((m) => m.field === "grade")).toBe(true)
    })

    it("B-03: Sinh mã tiết deterministic theo mã bài", () => {
      expect(buildDeterministicSkeletonPeriodCode("TOAN1-B09", 1)).toBe("TOAN1-B09-T01")
      expect(buildDeterministicSkeletonPeriodCode("toan1 b10", 12)).toBe("TOAN1-B10-T12")
    })
  })

  describe("Scenario D: Import vnEdu nhiều sheet (Trùng tên khác mã, điểm 0 vs trống, thập phân, lỗi công thức)", () => {
    it("D-01: Bảo toàn số 0 đầu mã HS, phân biệt điểm 0 và ô trống, tách 2 HS trùng tên khác mã, loại bỏ dòng footer", () => {
      const wb = XLSX.utils.book_new()
      const sheetData: any[][] = [
        ["BẢNG ĐIỂM MÔN TOÁN - LỚP 6/1 - NĂM HỌC 2026-2027 - HỌC KỲ 1"],
        ["STT", "Mã học sinh", "Họ và tên", "Ngày sinh", "ĐĐGtx1", "ĐĐGgk", "ĐĐGck"],
        [1, "0123456789", "Nguyễn Minh Anh", "01/05/2014", 0, 7.5, 8.25],
        [2, "0987654321", "Nguyễn Minh Anh", "15/08/2014", "", 5, 10],
        ["Thống kê", "", "Tổng số HS: 2", "", "", "", ""],
        ["Giáo viên bộ môn", "", "Ký tên", "", "", "", ""],
      ]
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws["E4"] = { t: "e", v: 0x17, w: "#REF!" }
      XLSX.utils.book_append_sheet(wb, ws, "Toan_6_1")

      const ws2 = XLSX.utils.aoa_to_sheet([
        ["BẢNG ĐIỂM MÔN NGỮ VĂN - LỚP 6/1 - NĂM HỌC 2026-2027 - HỌC KỲ 1"],
        ["STT", "Mã học sinh", "Họ và tên", "ĐĐGgk", "ĐĐGck"],
        [1, "0123456789", "Nguyễn Minh Anh", 6.5, 7],
      ])
      XLSX.utils.book_append_sheet(wb, ws2, "NguVan_6_1")

      const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
      const parsed = parseVnEduWorkbook(buf, "vnedu_multi_sheet_test.xlsx")

      expect(parsed.sheets).toHaveLength(2)
      const s1 = parsed.sheets[0]
      expect(s1.rows).toHaveLength(2)
      expect(s1.skippedFooterStartRow).not.toBeNull()

      expect(s1.rows[0].fullName).toBe("Nguyễn Minh Anh")
      expect(s1.rows[1].fullName).toBe("Nguyễn Minh Anh")
      expect(s1.rows[0].vnEduCode).toBe("0123456789")
      expect(s1.rows[1].vnEduCode).toBe("0987654321")

      expect(s1.rows[0].valuesByColIndex[4]).toBe("0")
      expect(s1.rows[0].valuesByColIndex[5]).toBe("7.5")
      expect(s1.rows[0].valuesByColIndex[6]).toBe("8.25")

      expect(s1.rows[1].formulaErrors.length).toBeGreaterThanOrEqual(1)
      expect(s1.rows[1].valuesByColIndex[4]).toBe("")
    })

    it("D-02: readCodeCellAsText bảo toàn mã số lớn không chuyển sang ký hiệu khoa học", () => {
      expect(readCodeCellAsText({ t: "s", v: "0012345678", w: "0012345678" })).toBe("0012345678")
      expect(readCodeCellAsText({ t: "n", v: 2026000123, w: "2026000123" })).toBe("2026000123")
    })
  })

  describe("Scenario F: Thống kê cơ bản, Phổ điểm 8 nhóm & HS cam kết đầu vào", () => {
    it("F-01: Đối chiếu khớp 100% số liệu tính tay với biên 0, 2, 4, 5, 7, 8, 10, lẻ, null, ngoài miền", () => {
      const raw = [0, 2, 4, 5, 7, 8, 10, 7.5, 7.5, null, undefined, Number.NaN, -1, 11]
      const stats = computeColumnBasicStats(raw)

      expect(stats.validCount).toBe(9)
      expect(stats.mean).toBe(5.67)
      expect(stats.median).toBe(7)
      expect(stats.stdDev).toBe(3.01)
      expect(stats.modes).toEqual([{ score: 7.5, count: 2 }])
      expect(stats.below5Count).toBe(3)
      expect(stats.below5Rate).toBe(33.33)
      expect(stats.aboveOrEqual7Count).toBe(5)
      expect(stats.aboveOrEqual7Rate).toBe(55.56)
      expect(stats.score10Count).toBe(1)
      expect(stats.score0Count).toBe(1)
    })

    it("F-02: Xử lý đồng hạng Mode (bimodal) và không có mức điểm nổi trội (all unique)", () => {
      const bimodal = computeColumnBasicStats([5, 5, 8, 8, 6])
      expect(bimodal.modes).toEqual([
        { score: 5, count: 2 },
        { score: 8, count: 2 },
      ])
      expect(bimodal.modeDisplay).toBe("5 (2 HS), 8 (2 HS)")

      const unique = computeColumnBasicStats([4, 5, 6, 7])
      expect(unique.modes).toEqual([])
      expect(unique.modeDisplay).toBe("Không có mức điểm nổi trội")
    })

    it("F-03: Ranh giới phổ điểm 8 nhóm tại 0, 2, 4, 5, 7, 8, 10 và tổng khớp 100%", () => {
      expect(resolveScoreDistribution8BucketId(0)).toBe("SCORE_0")
      expect(resolveScoreDistribution8BucketId(1.99)).toBe("SCORE_0_2")
      expect(resolveScoreDistribution8BucketId(2)).toBe("SCORE_2_4")
      expect(resolveScoreDistribution8BucketId(4)).toBe("SCORE_4_5")
      expect(resolveScoreDistribution8BucketId(5)).toBe("SCORE_5_7")
      expect(resolveScoreDistribution8BucketId(7)).toBe("SCORE_7_8")
      expect(resolveScoreDistribution8BucketId(8)).toBe("SCORE_8_10")
      expect(resolveScoreDistribution8BucketId(10)).toBe("SCORE_10")

      const dist = computeScoreDistribution8Buckets([0, 2, 4, 5, 7, 8, 10, null])
      expect(dist.totalValidCount).toBe(7)
      expect(dist.below5Count).toBe(3)
      expect(dist.aboveOrEqual5Count).toBe(4)
      expect(dist.buckets.reduce((s, b) => s + b.count, 0)).toBe(7)

      const freq025 = computeFrequencyTable025([0, 0.25, 0.26, 10])
      expect(freq025.intervals[0].count).toBe(2)
      expect(freq025.intervals[1].count).toBe(1)
      expect(freq025.intervals[39].count).toBe(1)
    })

    it("F-04: HS cam kết nhiều môn (Toán + Ngữ văn -> 2 dòng), mũi tên SKL lên/xuống, phân biệt điểm 0 và điểm thiếu", () => {
      const subs = parseAcademicCommittedSubjects("Môn cam kết: Toán, Ngữ văn", "Đạt có cam kết", "7/1", "7")
      expect(subs).toEqual(["Toán", "Ngữ văn"])

      const noCommit = parseAcademicCommittedSubjects("Không cần cam kết", "Đạt", "7/1", "7")
      expect(noCommit).toEqual([])
      expect(isExplicitNonCommitmentRecord("Đạt", "Không cần cam kết")).toBe(true)

      expect(doesSubjectMatchCommittedSubject("Toán", { subjectCode: "TOA", subjectName: "Toán học" })).toBe(true)
      expect(doesSubjectMatchCommittedSubject("Ngữ văn", { subjectCode: "NVA", subjectName: "Ngữ văn" })).toBe(true)

      const above = formatCommitmentScoreWithSklArrow(8.5, 7.0, { period: "GK1", level: "THCS" })
      expect(above.comparison).toBe("ABOVE")
      expect(above.arrow).toBe("↑")
      expect(above.display).toBe("8,5 ↑")

      const below = formatCommitmentScoreWithSklArrow(6.5, 7.0, { period: "CK1", level: "THCS" })
      expect(below.comparison).toBe("BELOW")
      expect(below.arrow).toBe("↓")
      expect(below.display).toBe("6,5 ↓")

      const equal = formatCommitmentScoreWithSklArrow(7.0, 7.0, { period: "GK2", level: "THCS" })
      expect(equal.comparison).toBe("EQUAL")
      expect(equal.arrow).toBeNull()
      expect(equal.display).toBe("7,0")

      const zeroScore = formatCommitmentScoreWithSklArrow(0, 7.0, { period: "CK2", level: "THCS" })
      expect(zeroScore.score).toBe(0)
      expect(zeroScore.comparison).toBe("BELOW")
      expect(zeroScore.arrow).toBe("↓")
      expect(zeroScore.display).toBe("0 ↓")

      const missingScore = formatCommitmentScoreWithSklArrow(null, 7.0, { period: "CK2", level: "THCS" })
      expect(missingScore.score).toBeNull()
      expect(missingScore.comparison).toBe("NO_SCORE")
      expect(missingScore.arrow).toBeNull()
      expect(missingScore.display).toBe("—")
    })
  })

  describe("Scenario G: Thời khóa biểu (Tuần chẵn/lẻ, Trùng GV/Phòng, Di chuyển liên cơ sở)", () => {
    it("G-01: Kiểm tra chồng lấn tuần chẵn/lẻ", () => {
      expect(doWeekTypesOverlap("EVEN", "ODD")).toBe(false)
      expect(doWeekTypesOverlap("EVEN", "EVEN")).toBe(true)
      expect(doWeekTypesOverlap("ALL", "ODD")).toBe(true)
      expect(doWeekTypesOverlap("ALL", "EVEN")).toBe(true)
    })

    it("G-02: Phát hiện trùng lịch GV, trùng lịch Phòng và vi phạm thời gian di chuyển liên cơ sở", () => {
      const periodTimes = buildDefaultPeriodTimes("TRUNG_HOC", 5, 5)
      const baseSlot = {
        id: "s1",
        timetableVersionId: "v1",
        classId: "c1",
        className: "6/1",
        subjectId: "sub1",
        subjectName: "Toán",
        teacherId: "t1",
        teacherName: "GV A",
        roomId: "r1",
        roomName: "P101",
        dayOfWeek: "MON",
        session: "MORNING",
        periodNumber: 1,
        weekType: "ALL",
        isDoublePeriod: false,
        isLocked: false,
      } as any

      const conflictSlot = {
        ...baseSlot,
        id: "s2",
        classId: "c2",
        className: "6/2",
      }

      const teachersById = new Map([
        ["t1", { id: "t1", teacherCode: "GV01", teacherName: "GV A" }],
      ])

      const report = validateTimetable({
        slots: [baseSlot, conflictSlot],
        config: {
          campusId: "CS1",
          scopeGroup: "TRUNG_HOC",
          morningPeriods: 5,
          afternoonPeriods: 5,
          periodTimes,
          workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
        } as any,
        campusId: "CS1",
        campusName: "CS1",
        classes: [
          { id: "c1", className: "6/1", grade: "6", level: "THCS" },
          { id: "c2", className: "6/2", grade: "6", level: "THCS" },
        ],
        teachersById,
        rooms: [
          { id: "r1", campusId: "CS1", roomCode: "P101", roomName: "P101", roomType: "CLASSROOM", capacity: 30, allowedSubjectIds: [] },
        ],
        travelRules: [
          { fromCampusId: "CS1", toCampusId: "CS4", minTravelMinutes: 30, allowSameSession: false, allowSameDay: true },
        ],
        externalActiveSlots: [
          {
            slot: { ...baseSlot, id: "ext1", classId: "c9", className: "7/1_CS4", periodNumber: 2 },
            campusId: "CS4",
            campusName: "CS4",
            scopeGroup: "TRUNG_HOC",
            startMinutes: 495,
            endMinutes: 540,
          },
        ],
      })

      const violatedRules = report.rules.filter((r) => r.status === "VIOLATED")
      const totalRuleViolations = violatedRules.reduce((sum, r) => sum + r.violationCount, 0)
      expect(violatedRules.length).toBeGreaterThanOrEqual(2)
      expect(totalRuleViolations).toBeGreaterThanOrEqual(2)
    })
  })
})
