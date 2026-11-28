import { describe, expect, it } from "vitest"
import {
  buildParentPeriodicSubjectRow,
  resolveParentPeriodLookup,
} from "../parent-periodic-grades"

describe("parent-periodic-grades", () => {
  it("resolves CK1 to include HK1 and GK1 fallback without mixing HK2", () => {
    const lookup = resolveParentPeriodLookup("CK1")
    expect(lookup.displayMode).toBe("ENDTERM")
    expect(lookup.semester).toBe(1)
    expect(lookup.primaryPeriods).toContain("CK1")
    expect(lookup.primaryPeriods).toContain("HK1")
    expect(lookup.midtermFallbackPeriods).toContain("GK1")
    expect(lookup.entryPeriods).not.toContain("HK2")
  })

  it("extracts ONLY ĐĐGgk (8.5) and never TX-averaged compositeScore (7.3) for Toán 9S_CS4 in GK1", () => {
    const lookup = resolveParentPeriodLookup("GK1")
    const row = buildParentPeriodicSubjectRow({
      subject: { id: "sub_toa", subjectCode: "TOA", subjectName: "Toán học", category: "MOET" },
      stt: 1,
      grade: "9",
      lookup,
      entriesForSubject: [
        {
          subjectId: "sub_toa",
          evaluationPeriod: "GK1",
          configType: "VNEDU",
          componentScores: JSON.stringify({
            col0: "5",
            tx1: "5",
            col1: "7",
            tx2: "7",
            col4: "8.5",
            gk: "8.5",
          }),
          compositeScore: 7.3,
        },
      ],
    })

    expect(row.subjectGroup).toBe("MOET")
    expect(row.ddgGk.display).toBe("8.5")
    expect(row.ddgGk.numeric).toBe(8.5)
    expect(row.score).toBe(8.5)
    expect(row.ddgCk.display).toBeNull()
    expect(row.dtbMhk.display).toBeNull()
  })

  it("in CK1, backfills ĐĐGgk from GK1 and keeps ĐTBmhk null when ĐĐGck is not yet entered", () => {
    const lookup = resolveParentPeriodLookup("CK1")
    const row = buildParentPeriodicSubjectRow({
      subject: { id: "sub_toa", subjectCode: "TOA", subjectName: "Toán học", category: "MOET" },
      stt: 1,
      grade: "9",
      lookup,
      entriesForSubject: [
        {
          subjectId: "sub_toa",
          evaluationPeriod: "GK1",
          configType: "VNEDU",
          componentScores: JSON.stringify({
            tx1: "5",
            tx2: "7",
            gk: "8.5",
          }),
          compositeScore: 7.3,
        },
      ],
    })

    expect(row.ddgGk.display).toBe("8.5")
    expect(row.ddgCk.display).toBeNull()
    expect(row.dtbMhk.display).toBeNull()
  })

  it("in CK1, returns ĐĐGgk, ĐĐGck, and ĐTBmhk from HK1 VNEDU entry when ĐĐGck exists", () => {
    const lookup = resolveParentPeriodLookup("CK1")
    const row = buildParentPeriodicSubjectRow({
      subject: { id: "sub_toa", subjectCode: "TOA", subjectName: "Toán học", category: "MOET" },
      stt: 1,
      grade: "9",
      lookup,
      entriesForSubject: [
        {
          subjectId: "sub_toa",
          evaluationPeriod: "HK1",
          configType: "VNEDU",
          componentScores: JSON.stringify({
            tx1: "5",
            tx2: "7",
            gk: "8.5",
            ck: "9.0",
          }),
          compositeScore: 8.0,
        },
      ],
    })

    expect(row.ddgGk.display).toBe("8.5")
    expect(row.ddgCk.display).toBe("9.0")
    expect(row.dtbMhk.display).toBe("8.0")
  })

  it("prefers VNEDU over INTERNAL for MOET Tiếng Anh so 100-scale internal score (40) does not overwrite ĐĐGgk (4.0)", () => {
    const lookup = resolveParentPeriodLookup("CK1")
    const row = buildParentPeriodicSubjectRow({
      subject: { id: "sub_ta", subjectCode: "TA", subjectName: "Tiếng Anh", category: "MOET, KSDV" },
      stt: 2,
      grade: "9",
      lookup,
      entriesForSubject: [
        {
          subjectId: "sub_ta",
          evaluationPeriod: "GK1",
          configType: "INTERNAL",
          componentScores: JSON.stringify({ col0: "13", col1: "27" }),
          compositeScore: 40,
        },
        {
          subjectId: "sub_ta",
          evaluationPeriod: "GK1",
          configType: "VNEDU",
          componentScores: JSON.stringify({ col4: "4", gk: "4" }),
          compositeScore: 4,
        },
      ],
    })

    expect(row.ddgGk.display).toBe("4.0")
    expect(row.ddgGk.numeric).toBe(4)
  })

  it("classifies special subjects (BILINGUAL / SKL) separately and extracts periodic columns", () => {
    const lookup = resolveParentPeriodLookup("CK1")
    const row = buildParentPeriodicSubjectRow({
      subject: { id: "sub_mat", subjectCode: "MAT", subjectName: "Mathematics", category: "BILINGUAL" },
      stt: 1,
      grade: "6",
      lookup,
      configForSubject: {
        subjectId: "sub_mat",
        evaluationPeriod: "CK1",
        configType: "INTERNAL",
        columnNames: JSON.stringify(["Mid Term GK", "EOT KTHK"]),
      },
      entriesForSubject: [
        {
          subjectId: "sub_mat",
          evaluationPeriod: "CK1",
          configType: "INTERNAL",
          componentScores: JSON.stringify({ col0: "8.5", col1: "9.0" }),
          compositeScore: 8.8,
        },
      ],
    })

    expect(row.subjectGroup).toBe("SPECIAL")
    expect(row.isSpecialSubject).toBe(true)
    expect(row.ddgGk.display).toBe("8.5")
    expect(row.ddgCk.display).toBe("9.0")
    expect(row.specialScore.display).toBe("8.8")
  })

  it("handles TT22 comment-only subjects (Đ / CĐ) cleanly in CK1", () => {
    const lookup = resolveParentPeriodLookup("CK1")
    const row = buildParentPeriodicSubjectRow({
      subject: { id: "sub_gdtc", subjectCode: "GTC", subjectName: "Giáo dục thể chất", category: "MOET", evaluationType: "REMARK" },
      stt: 3,
      grade: "9",
      lookup,
      entriesForSubject: [
        {
          subjectId: "sub_gdtc",
          evaluationPeriod: "HK1",
          configType: "VNEDU",
          componentScores: JSON.stringify({ tx1: "Đ", gk: "Đ", ck: "Đ" }),
          ratingValue: "Đ",
        },
      ],
    })

    expect(row.isCommentOnly).toBe(true)
    expect(row.ddgGk.display).toBe("Đ")
    expect(row.ddgCk.display).toBe("Đ")
    expect(row.dtbMhk.display).toBe("Đ")
  })

  it("keeps Tiếng Nhật (category MOET) in MOET group and does not copy ĐĐGgk into Điểm đặc thù when ĐĐGck is empty", () => {
    const lookup = resolveParentPeriodLookup("CK1")
    const tnhRow = buildParentPeriodicSubjectRow({
      subject: { id: "sub_tnh", subjectCode: "TNH", subjectName: "Tiếng Nhật", category: "MOET" },
      stt: 1,
      grade: "11",
      lookup,
      entriesForSubject: [
        {
          subjectId: "sub_tnh",
          evaluationPeriod: "GK1",
          configType: "VNEDU",
          componentScores: JSON.stringify({ col4: "9", gk: "9" }),
          compositeScore: 9,
        },
      ],
    })
    expect(tnhRow.subjectGroup).toBe("MOET")
    expect(tnhRow.ddgGk.display).toBe("9.0")
    expect(tnhRow.ddgCk.display).toBeNull()
    expect(tnhRow.dtbMhk.display).toBeNull()

    const specialRow = buildParentPeriodicSubjectRow({
      subject: { id: "sub_esl", subjectCode: "ESL", subjectName: "ESL", category: "BILINGUAL" },
      stt: 1,
      grade: "11",
      lookup,
      entriesForSubject: [
        {
          subjectId: "sub_esl",
          evaluationPeriod: "GK1",
          configType: "VNEDU",
          componentScores: JSON.stringify({ gk: "8.0" }),
          compositeScore: 8.0,
        },
      ],
    })
    expect(specialRow.subjectGroup).toBe("SPECIAL")
    expect(specialRow.ddgGk.display).toBe("8.0")
    expect(specialRow.ddgCk.display).toBeNull()
    expect(specialRow.specialScore.display).toBeNull()
  })
})
