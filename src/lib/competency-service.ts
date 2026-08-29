// @ts-nocheck
import { prisma } from "./db";

export function normalizeKey(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export interface ScoreCalculationResult {
  achievedScore: number | null;
  maxScore: number | null;
  competencyPercent: number | null;
  calculationSource: "SYSTEM_CALCULATED" | "LEGACY_IMPORTED" | null;
}

/**
 * Calculates competency percentage following strict business rules:
 * 1. New data: achievedScore / maxScore * 100, rounded to 1 decimal place, bounded [0, 100].
 * 2. Legacy data (2025-2026): If maxScore is empty but rawRadarPercent has a value,
 *    use rawRadarPercent * 100, marked as LEGACY_IMPORTED without guessing max score.
 * 3. 0 vs NULL: 0 is evaluated with 0% score; null is no data / not evaluated.
 */
export function calculateCompetencyScore(
  rawAchieved: any,
  rawMax: any,
  rawRadarPercent: any
): ScoreCalculationResult {
  const parseNum = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const str = String(v).trim().replace(",", ".");
    if (str === "" || str === "—" || str === "-") return null;
    const n = Number(str);
    return isNaN(n) ? null : n;
  };

  const parsePercent = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    let str = String(v).trim().replace(",", ".");
    if (str === "" || str === "—" || str === "-") return null;
    if (str.endsWith("%")) {
      const n = Number(str.slice(0, -1).trim());
      return isNaN(n) ? null : n; // e.g. "100%" -> 100
    }
    const n = Number(str);
    if (isNaN(n)) return null;
    // If entered as decimal 1 or 0.85, convert to percentage
    if (n <= 1 && n > 0) return n * 100;
    return n;
  };

  const achieved = parseNum(rawAchieved);
  const max = parseNum(rawMax);
  const radarPct = parsePercent(rawRadarPercent);

  // Case 1: Has maxScore > 0 and achievedScore is not null (System calculated)
  if (max !== null && max > 0 && achieved !== null) {
    let pct = (achieved / max) * 100;
    pct = Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
    return {
      achievedScore: achieved,
      maxScore: max,
      competencyPercent: pct,
      calculationSource: "SYSTEM_CALCULATED",
    };
  }

  // Case 2: Legacy data: max is empty/null, but rawRadarPercent has value
  if ((max === null || max === 0) && radarPct !== null) {
    let pct = Math.min(100, Math.max(0, Math.round(radarPct * 10) / 10));
    return {
      achievedScore: achieved,
      maxScore: null,
      competencyPercent: pct,
      calculationSource: "LEGACY_IMPORTED",
    };
  }

  // Case 3: 0 achieved with max
  if (achieved === 0 && max !== null && max > 0) {
    return {
      achievedScore: 0,
      maxScore: max,
      competencyPercent: 0.0,
      calculationSource: "SYSTEM_CALCULATED",
    };
  }

  // Case 4: No data (NULL)
  return {
    achievedScore: achieved,
    maxScore: max,
    competencyPercent: null,
    calculationSource: null,
  };
}

/**
 * Normalizes and resolves Subject from name or alias
 */
export function resolveSubjectMatch(
  rawSubjectName: string,
  subjects: Array<{ id: string; subjectCode: string; subjectName: string }>,
  subjectAliases: Array<{ id: string; subjectId: string; normalizedKey: string }>
): string | null {
  if (!rawSubjectName) return null;
  const key = normalizeKey(rawSubjectName);
  if (!key) return null;

  // 1. Direct match on subjectCode or subjectName
  const directMatch = subjects.find(
    (s) =>
      normalizeKey(s.subjectCode) === key ||
      normalizeKey(s.subjectName) === key
  );
  if (directMatch) return directMatch.id;

  // 2. Alias match
  const aliasMatch = subjectAliases.find((a) => a.normalizedKey === key);
  if (aliasMatch) return aliasMatch.subjectId;

  // 3. Substring fuzzy match
  const subMatch = subjects.find(
    (s) =>
      key.includes(normalizeKey(s.subjectName)) ||
      normalizeKey(s.subjectName).includes(key)
  );
  if (subMatch) return subMatch.id;

  return null;
}

/**
 * Normalizes and resolves Competency from name or alias within a subject
 */
export function resolveCompetencyMatch(
  subjectId: string,
  rawCompName: string,
  competencies: Array<{
    id: string;
    subjectId: string;
    code: string;
    name: string;
  }>,
  competencyAliases: Array<{
    id: string;
    competencyId: string;
    normalizedKey: string;
  }>
): string | null {
  if (!rawCompName || !subjectId) return null;
  const key = normalizeKey(rawCompName);
  if (!key) return null;

  const subjectComps = competencies.filter((c) => c.subjectId === subjectId);

  // 1. Direct match
  const directMatch = subjectComps.find(
    (c) =>
      normalizeKey(c.code) === key ||
      normalizeKey(c.name) === key
  );
  if (directMatch) return directMatch.id;

  // 2. Alias match
  const compIds = new Set(subjectComps.map((c) => c.id));
  const aliasMatch = competencyAliases.find(
    (a) => compIds.has(a.competencyId) && a.normalizedKey === key
  );
  if (aliasMatch) return aliasMatch.competencyId;

  // 3. Partial / fuzzy match
  const fuzzy = subjectComps.find(
    (c) =>
      key.includes(normalizeKey(c.name)) ||
      normalizeKey(c.name).includes(key)
  );
  if (fuzzy) return fuzzy.id;

  return null;
}

export interface RadarPoint {
  competencyId: string;
  code: string;
  name: string;
  displayOrder: number;
  weight: number;
  percent: number | null; // null if missing/not evaluated
  achievedScore?: number | null;
  maxScore?: number | null;
  calculationSource?: string | null;
}

/**
 * Synthesizes Radar points and overall weighted subject score
 * Respects displayOrder and treats NULL distinctly from 0.
 */
export function synthesizeSubjectSummary(
  allCompetenciesOfSubject: Array<{
    id: string;
    code: string;
    name: string;
    displayOrder: number;
    weight: number;
  }>,
  studentAssessments: Array<{
    competencyId: string;
    competencyPercent: number | null;
    achievedScore?: number | null;
    maxScore?: number | null;
    calculationSource?: string | null;
  }>
) {
  const assessmentMap = new Map<string, typeof studentAssessments[0]>();
  studentAssessments.forEach((a) => assessmentMap.set(a.competencyId, a));

  const sortedCompetencies = [...allCompetenciesOfSubject].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  let totalWeightedPercent = 0;
  let totalWeightEvaluated = 0;
  let evaluatedCount = 0;

  const radarData: RadarPoint[] = sortedCompetencies.map((c) => {
    const assessment = assessmentMap.get(c.id);
    const hasValue = assessment && assessment.competencyPercent !== null && assessment.competencyPercent !== undefined;
    const percent = hasValue ? assessment.competencyPercent : null;

    if (percent !== null) {
      const weight = c.weight || 1.0;
      totalWeightedPercent += percent * weight;
      totalWeightEvaluated += weight;
      evaluatedCount++;
    }

    return {
      competencyId: c.id,
      code: c.code,
      name: c.name,
      displayOrder: c.displayOrder,
      weight: c.weight || 1.0,
      percent,
      achievedScore: assessment?.achievedScore,
      maxScore: assessment?.maxScore,
      calculationSource: assessment?.calculationSource,
    };
  });

  const subjectScore =
    totalWeightEvaluated > 0
      ? Math.round((totalWeightedPercent / totalWeightEvaluated) * 10) / 10
      : null;

  return {
    subjectScore,
    evaluatedCount,
    totalCompetencies: sortedCompetencies.length,
    radarData,
  };
}
