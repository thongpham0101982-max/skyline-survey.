import { EducationLevelCode } from "./types"

function formatScoreNumber(
  score: number,
  level?: EducationLevelCode
): string {
  const rounded = Math.round((score + Number.EPSILON) * 100) / 100
  if (Math.abs(rounded) <= 1e-9) return "0"
  if (Math.abs(rounded - 10) <= 1e-9) return "10"

  const useIntegerForWhole = level === "TIEU_HOC"
  if (Number.isInteger(rounded)) {
    return useIntegerForWhole ? String(rounded) : `${rounded},0`
  }

  const oneDec = Math.round((rounded + Number.EPSILON) * 10) / 10
  if (Math.abs(rounded - oneDec) <= 1e-9) {
    return oneDec.toFixed(1).replace(".", ",")
  }

  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",")
}

export function formatScoreForDisplay(
  score: number | null | undefined,
  level?: EducationLevelCode
): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return "—"
  return formatScoreNumber(Number(score), level)
}

export function formatDeltaForDisplay(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) return "—"
  const rounded = Math.round((Number(delta) + Number.EPSILON) * 100) / 100
  if (Math.abs(rounded) <= 1e-9) return "0"
  const absStr = Math.abs(rounded)
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
    .replace(".", ",")
  return rounded > 0 ? `+${absStr}` : `−${absStr}`
}

export function formatRateWithFraction(
  numerator: number,
  denominator: number,
  rate: number | null
): string {
  if (!denominator || denominator <= 0 || rate === null) return "—"
  return `${numerator}/${denominator} (${rate.toFixed(1).replace(".", ",")}%)`
}
