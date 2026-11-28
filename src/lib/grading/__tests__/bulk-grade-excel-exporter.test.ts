import { describe, it, expect } from "vitest"
import * as XLSX from "xlsx"
import {
  buildBulkGradeWorkbook,
  resolvePeriodColumnValue,
  selectBestEntryForPeriod
} from "../bulk-grade-excel-exporter"

const tt22Config = {
  id: "cfg-tt22-math-6",
  subjectId: "subj-math",
  grade: "Khối 6",
  evaluationPeriod: "HK1",
  configType: "VNEDU",
  columnCount: 6,
  columnNames: JSON.stringify(["TX1", "TX2", "TX3", "TX4", "ĐĐGgk", "ĐĐGck"]),
  columnTypes: JSON.stringify(["SCORE_10", "SCORE_10", "SCORE_10", "SCORE_10", "SCORE_10", "SCORE_10"]),
  columnMaxScores: JSON.stringify([10, 10, 10, 10, 10, 10]),
  hasCompositeColumn: true,
  compositeColumnName: "ĐTBmhk",
  hasRatingColumn: false,
  hasRemarkColumn: true
}

describe("bulk-grade-excel-exporter (multi-grade + ĐĐGgk / ĐĐGck)", () => {
  it("extracts ĐĐGgk for GK1 from HK1 vnEdu entry even when compositeScore is null", () => {
    const entry = {
      studentId: "st-1",
      subjectId: "subj-math",
      evaluationPeriod: "HK1",
      configType: "VNEDU",
      componentScores: JSON.stringify({ col0: 8, col1: 9, col4: 8.5 }),
      compositeScore: null,
      remark: "Tốt"
    }

    const res = resolvePeriodColumnValue(entry, tt22Config, "GK1")
    expect(res.columnLabel).toBe("ĐĐGgk")
    expect(res.value).toBe(8.5)
    expect(res.numericValue).toBe(8.5)
  })

  it("extracts ĐĐGck for CK1 from comp.ck fallback when col5 is absent", () => {
    const entry = {
      studentId: "st-1",
      subjectId: "subj-math",
      evaluationPeriod: "HK1",
      configType: "VNEDU",
      componentScores: JSON.stringify({ tx1: 8, gk: 8.5, ck: 9.2 }),
      compositeScore: 8.8,
      remark: "Xuất sắc"
    }

    const res = resolvePeriodColumnValue(entry, tt22Config, "CK1")
    expect(res.columnLabel).toBe("ĐĐGck")
    expect(res.value).toBe(9.2)
    expect(res.numericValue).toBe(9.2)
  })

  it("does not leak TX-only score as ĐĐGgk when GK1 score is missing", () => {
    const entry = {
      studentId: "st-2",
      subjectId: "subj-math",
      evaluationPeriod: "HK1",
      configType: "VNEDU",
      componentScores: JSON.stringify({ col0: 9, col1: 8 }),
      compositeScore: null
    }

    const res = resolvePeriodColumnValue(entry, tt22Config, "GK1")
    expect(res.value).toBe("")
    expect(res.numericValue).toBeNull()
  })

  it("selectBestEntryForPeriod prefers HK1 VNEDU entry containing ĐĐGgk over empty GK1 entry", () => {
    const emptyGk1 = {
      evaluationPeriod: "GK1",
      configType: "INTERNAL",
      componentScores: JSON.stringify({}),
      compositeScore: null
    }
    const filledHk1 = {
      evaluationPeriod: "HK1",
      configType: "VNEDU",
      componentScores: JSON.stringify({ col4: 9.0 }),
      compositeScore: null
    }

    const best = selectBestEntryForPeriod([emptyGk1, filledHk1], tt22Config, "GK1")
    expect(best).toBe(filledHk1)
  })

  it("builds workbook with multi-grade filename tag and ĐĐGgk across Overview, Master, and focused Subject sheet", () => {
    const { workbook, fileName } = buildBulkGradeWorkbook({
      campusName: "CS1",
      academicYearName: "2026-2027",
      evaluationPeriodCode: "GK1",
      evaluationPeriodName: "Giữa kỳ 1 (GK1)",
      selectedGrades: ["Khối 6", "Khối 7", "Khối 8", "Khối 9"],
      classes: [{ id: "cls-6a", className: "6.1", grade: "Khối 6" }],
      students: [
        {
          id: "st-1",
          studentCode: "HS001",
          vnEduCode: "VN001",
          studentName: "Nguyễn Văn An",
          dateOfBirth: "2014-05-10",
          gender: "Nam",
          classId: "cls-6a"
        }
      ],
      subjects: [{ id: "subj-math", subjectCode: "TOA", subjectName: "Toán học" }],
      configs: [tt22Config],
      entries: [
        {
          studentId: "st-1",
          subjectId: "subj-math",
          classId: "cls-6a",
          evaluationPeriod: "HK1",
          configType: "VNEDU",
          componentScores: JSON.stringify({ tx1: 8, gk: 8.75, ck: 9.5 }),
          compositeScore: null,
          remark: "Chăm học"
        }
      ],
      includeOverviewSheet: true,
      includeMasterSummarySheet: true,
      onlyPeriodScoreColumn: true
    })

    expect(fileName).toBe("BangDiem_CS1_K6-K9_GK1_2026-2027.xlsx")
    expect(workbook.SheetNames).toContain("00_TongQuan_BaoCao")
    expect(workbook.SheetNames).toContain("TongHop_DiemHS")
    expect(workbook.SheetNames).toContain("Toán học")

    const overview = XLSX.utils.sheet_to_json(workbook.Sheets["00_TongQuan_BaoCao"], { header: 1 }) as any[][]
    expect(overview[1][0]).toContain("Khối 6, Khối 7, Khối 8, Khối 9")
    expect(overview[1][0]).toContain("ĐĐGgk")
    expect(overview[5][4]).toBe(1) // Đã có điểm = 1
    expect(overview[5][7]).toBe("8.75") // Điểm TB môn = 8.75

    const master = XLSX.utils.sheet_to_json(workbook.Sheets["TongHop_DiemHS"], { header: 1 }) as any[][]
    expect(master[4][8]).toBe("Toán học (ĐĐGgk)")
    expect(master[5][8]).toBe(8.75)

    const subjSheet = XLSX.utils.sheet_to_json(workbook.Sheets["Toán học"], { header: 1 }) as any[][]
    expect(subjSheet[4]).toEqual([
      "STT",
      "Khối",
      "Lớp",
      "Mã HS",
      "Mã vnEdu",
      "Họ và tên",
      "Ngày sinh",
      "Giới tính",
      "ĐĐGgk",
      "Nhận xét"
    ])
    expect(subjSheet[5][8]).toBe(8.75)
    expect(subjSheet[5][9]).toBe("Chăm học")
  })
})
