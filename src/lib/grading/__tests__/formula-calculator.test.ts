import { describe, expect, it } from "vitest"
import {
  calculateCompositeScore,
  computeCompositeFromComponentScores,
  generateExcelFormula,
  sanitizeFormulaExpression,
  shouldAutoComputeFormulaComposite,
} from "@/lib/grading/formula-calculator"

describe("formula-calculator (custom formula, rounding & recalculation)", () => {
  const englishGrade5Gk1Config = {
    evaluationPeriod: "GK1",
    configType: "INTERNAL",
    columnCount: 3,
    columnNames: JSON.stringify(["Listening", "Reading & Writing", "Speaking"]),
    columnTypes: JSON.stringify(["SCORE_MAX_20", "SCORE_MAX_50", "SCORE_MAX_30"]),
    columnMaxScores: JSON.stringify([20, 50, 30]),
    hasCompositeColumn: true,
    compositeColumnName: "KT GK1",
    formula: "CUSTOM",
    formulaCustom: "( + [col0] + [col1] + [col2] ) / 10",
    roundingRule: "ROUND_INT",
  }

  it("sanitizes stray leading + after opening parenthesis", () => {
    expect(sanitizeFormulaExpression("( + [col0] + [col1] + [col2] ) / 10")).toBe(
      "([col0] + [col1] + [col2] ) / 10"
    )
    expect(sanitizeFormulaExpression(" + [col0] + [col1]")).toBe("[col0] + [col1]")
  })

  it("evaluates custom formula with ROUND_INT for Grade 5 English 3-skill scores", () => {
    expect(
      calculateCompositeScore({ col0: "16", col1: "42", col2: "24" }, englishGrade5Gk1Config, 3)
    ).toBe("8") // 82 / 10 = 8.2 -> 8
    expect(
      calculateCompositeScore({ col0: "18", col1: "48", col2: "25" }, englishGrade5Gk1Config, 3)
    ).toBe("9") // 91 / 10 = 9.1 -> 9
    expect(
      calculateCompositeScore({ col0: "10", col1: "45", col2: "22" }, englishGrade5Gk1Config, 3)
    ).toBe("8") // 77 / 10 = 7.7 -> 8
    expect(
      calculateCompositeScore({ col0: "20", col1: "48", col2: "22" }, englishGrade5Gk1Config, 3)
    ).toBe("9") // 90 / 10 = 9.0 -> 9
  })

  it("computes composite from JSON componentScores string", () => {
    const res = computeCompositeFromComponentScores(
      JSON.stringify({ col0: "16", col1: "42", col2: "24" }),
      englishGrade5Gk1Config
    )
    expect(res).toEqual({ value: 8, formatted: "8" })
  })

  it("generates clean Excel formula without stray leading +", () => {
    expect(generateExcelFormula(["F", "G", "H"], englishGrade5Gk1Config, 2)).toBe(
      "=ROUND((F2 + G2 + H2 ) / 10, 0)"
    )
  })

  it("guards shouldAutoComputeFormulaComposite against CN and TT22 secondary configs", () => {
    expect(shouldAutoComputeFormulaComposite(englishGrade5Gk1Config, "GK1")).toBe(true)
    expect(shouldAutoComputeFormulaComposite(englishGrade5Gk1Config, "CN")).toBe(false)
    expect(
      shouldAutoComputeFormulaComposite({ ...englishGrade5Gk1Config, hasCompositeColumn: false }, "GK1")
    ).toBe(false)
    expect(
      shouldAutoComputeFormulaComposite(
        {
          evaluationPeriod: "CK1",
          hasCompositeColumn: true,
          columnCount: 4,
          formula: "AVERAGE",
          columnsJson: JSON.stringify([
            { key: "tx1", label: "TX1" },
            { key: "tx2", label: "TX2" },
            { key: "gk", label: "GK" },
            { key: "ck", label: "CK" },
          ]),
        },
        "CK1"
      )
    ).toBe(false)
  })
})
