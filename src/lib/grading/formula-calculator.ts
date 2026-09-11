/**
 * Flexible Grade Formula Calculator for Skyline Survey / Grading System
 */

export type FormulaType = "AVERAGE" | "WEIGHTED" | "SUM" | "CUSTOM"
export type RoundingRule = "ROUND_1" | "ROUND_2" | "ROUND_HALF" | "NONE"

export interface GradeConfigLike {
  formula?: string | null
  weights?: string | number[] | null
  formulaCustom?: string | null
  roundingRule?: string | null
  hasCompositeColumn?: boolean
  compositeColumnName?: string | null
  columnCount?: number
  columnNames?: string | string[]
  columnTypes?: string | string[]
}

/**
 * Round a numeric score based on the selected RoundingRule
 */
export function roundScore(value: number, rule: RoundingRule | string = "ROUND_1"): string {
  if (isNaN(value) || !isFinite(value)) return ""
  
  switch (rule) {
    case "ROUND_1": {
      const rounded = Math.round(value * 10) / 10
      return rounded.toFixed(1)
    }
    case "ROUND_2": {
      const rounded = Math.round(value * 100) / 100
      return rounded.toFixed(2)
    }
    case "ROUND_HALF": {
      const rounded = Math.round(value * 2) / 2
      return rounded.toFixed(1)
    }
    case "NONE":
    default:
      return String(Math.round(value * 1000) / 1000)
  }
}

/**
 * Safely parse weights array from JSON or string or array
 */
export function parseWeights(weightsRaw: any, length: number): number[] {
  if (Array.isArray(weightsRaw)) {
    return weightsRaw.map(w => Number(w) || 1)
  }
  if (typeof weightsRaw === "string" && weightsRaw.trim()) {
    try {
      const parsed = JSON.parse(weightsRaw)
      if (Array.isArray(parsed)) {
        return parsed.map(w => Number(w) || 1)
      }
    } catch (_) {
      // maybe comma-separated
      const parts = weightsRaw.split(",").map(p => Number(p.trim()) || 1)
      if (parts.length > 0) return parts
    }
  }
  // Default equal weights
  return Array(length).fill(1)
}

/**
 * Calculate composite score from component scores dict
 * componentScores: { col0: "8.5", col1: "9", ... }
 */
export function calculateCompositeScore(
  componentScores: Record<string, any>,
  config: GradeConfigLike | null,
  totalCols?: number
): string {
  if (!config || config.hasCompositeColumn === false) return ""

  const formula = (config.formula || "AVERAGE").toUpperCase() as FormulaType
  const roundingRule = (config.roundingRule || "ROUND_1") as RoundingRule
  const count = totalCols || config.columnCount || Object.keys(componentScores).length || 1

  // Extract numeric scores
  const numericMap: Record<number, number> = {}
  for (let i = 0; i < count; i++) {
    const raw = componentScores[`col${i}`]
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      const num = Number(String(raw).replace(",", "."))
      if (!isNaN(num)) {
        numericMap[i] = num
      }
    }
  }

  const presentIndices = Object.keys(numericMap).map(Number)
  if (presentIndices.length === 0) return ""

  if (formula === "SUM") {
    const sum = presentIndices.reduce((acc, idx) => acc + numericMap[idx], 0)
    return roundScore(sum, roundingRule)
  }

  if (formula === "WEIGHTED") {
    const weights = parseWeights(config.weights, count)
    let weightedSum = 0
    let totalWeight = 0
    presentIndices.forEach(idx => {
      const w = weights[idx] !== undefined ? weights[idx] : 1
      weightedSum += numericMap[idx] * w
      totalWeight += w
    })
    if (totalWeight <= 0) return ""
    const result = weightedSum / totalWeight
    return roundScore(result, roundingRule)
  }

  if (formula === "CUSTOM" && config.formulaCustom && config.formulaCustom.trim()) {
    try {
      let expr = config.formulaCustom
      // Replace col0, col1, [col0], [Cột 1], etc.
      for (let i = 0; i < count; i++) {
        const val = numericMap[i] !== undefined ? numericMap[i] : 0
        expr = expr.replace(new RegExp(`\\[col${i}\\]|\\[cột\\s*${i + 1}\\]|col${i}`, "gi"), `(${val})`)
      }
      // sanitize expr: only allow digits, arithmetic symbols, parens, Math functions
      if (!/^[\d\s\+\-\*\/\.\(\)\,\%\Math\w]+$/.test(expr)) {
        return ""
      }
      // Evaluate safely
      // eslint-disable-next-line no-new-func
      const func = new Function(`return (${expr})`)
      const res = Number(func())
      if (!isNaN(res) && isFinite(res)) {
        return roundScore(res, roundingRule)
      }
    } catch (e) {
      console.warn("Lỗi tính custom formula:", e)
    }
  }

  // Default: AVERAGE (Equal weight)
  const avg = presentIndices.reduce((acc, idx) => acc + numericMap[idx], 0) / presentIndices.length
  return roundScore(avg, roundingRule)
}

/**
 * Generate human readable formula description for UI badges/labels
 */
export function getFormulaDescription(config: GradeConfigLike, columnNames: string[] = []): string {
  const formula = (config.formula || "AVERAGE").toUpperCase()
  if (formula === "SUM") {
    return "Tổng điểm các cột"
  }
  if (formula === "WEIGHTED") {
    const weights = parseWeights(config.weights, columnNames.length || 3)
    const parts = columnNames.map((name, i) => `${name || `Cột ${i + 1}`} (x${weights[i] || 1})`)
    return `Hệ số: ${parts.join(" + ")}`
  }
  if (formula === "CUSTOM") {
    return `Tùy biến: ${config.formulaCustom || "Chưa thiết lập"}`
  }
  return "Trung bình cộng đều"
}

/**
 * Generate standard Excel Formula string for a row
 * colLetters: array of excel column letters e.g. ["E", "F", "G"]
 */
export function generateExcelFormula(
  colLetters: string[],
  config: GradeConfigLike,
  rowNum: number
): string {
  const formula = (config.formula || "AVERAGE").toUpperCase()
  if (colLetters.length === 0) return ""

  const firstCol = colLetters[0] + rowNum
  const lastCol = colLetters[colLetters.length - 1] + rowNum

  if (formula === "SUM") {
    return `=ROUND(SUM(${firstCol}:${lastCol}), 1)`
  }

  if (formula === "WEIGHTED") {
    const weights = parseWeights(config.weights, colLetters.length)
    const sumProducts = colLetters.map((col, i) => `${col}${rowNum}*${weights[i] || 1}`).join(" + ")
    const totalWeight = weights.slice(0, colLetters.length).reduce((a, b) => a + b, 0) || 1
    return `=ROUND((${sumProducts}) / ${totalWeight}, 1)`
  }

  if (formula === "CUSTOM" && config.formulaCustom) {
    let expr = config.formulaCustom
    colLetters.forEach((col, i) => {
      expr = expr.replace(new RegExp(`\\[col${i}\\]|\\[cột\\s*${i + 1}\\]|col${i}`, "gi"), `${col}${rowNum}`)
    })
    return `=ROUND(${expr}, 1)`
  }

  return `=ROUND(AVERAGE(${firstCol}:${lastCol}), 1)`
}
