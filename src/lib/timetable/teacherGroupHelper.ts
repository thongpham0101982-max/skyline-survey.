export type TeacherGroupCode = "GVVN" | "GVNN"

export interface GradeTeacherSplit {
  gvvn: number
  gvnn: number
}

export type TeacherSplitMap = Record<string, GradeTeacherSplit>

const VN_TONE_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

const VN_SURNAME_REGEX =
  /^(Nguyen|Tran|Le|Pham|Hoang|Huynh|Phan|Vu|Vo|Dang|Bui|Do|Ho|Ngo|Duong|Ly|Truong|Dinh|Mai|Cao|Luu|Tong|Trinh|Ha|Ta|Chau|Bach|Kieu|Luong|Dao|Doan|Vuong|Quach|Lam|Van|Khuc|Ninh|Dam|Thai|La|Chu|Au|Ung|Ton|Nghiem|Mac|Diep|Phung|Tu)\b/i

export function detectTeacherGroupFromName(teacherName?: string | null): TeacherGroupCode {
  const clean = String(teacherName || "").trim()
  if (!clean) return "GVVN"
  if (VN_TONE_REGEX.test(clean)) return "GVVN"
  if (VN_SURNAME_REGEX.test(clean)) return "GVVN"
  if (/^[A-Za-z.\-'\s]+$/.test(clean) && clean.includes(" ")) {
    return "GVNN"
  }
  return "GVVN"
}

export function resolveTeacherGroup(
  teacher?: { teacherGroup?: string | null; teacherName?: string | null } | null
): TeacherGroupCode {
  if (!teacher) return "GVVN"
  const explicit = String(teacher.teacherGroup || "").trim().toUpperCase()
  if (explicit === "GVNN") return "GVNN"
  if (explicit === "GVVN") return "GVVN"
  return detectTeacherGroupFromName(teacher.teacherName)
}

function roundHalf(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function parseTeacherSplitJson(raw?: string | null): TeacherSplitMap {
  if (!raw || typeof raw !== "string" || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    const out: TeacherSplitMap = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v === "object") {
        const gvvn = Math.max(0, roundHalf(Number((v as any).gvvn) || 0))
        const gvnn = Math.max(0, roundHalf(Number((v as any).gvnn) || 0))
        if (gvvn > 0 || gvnn > 0) {
          out[k] = { gvvn, gvnn }
        }
      }
    }
    return out
  } catch {
    return {}
  }
}

export function serializeTeacherSplitJson(map: TeacherSplitMap): string {
  const cleaned: TeacherSplitMap = {}
  for (const [k, v] of Object.entries(map || {})) {
    const gvvn = Math.max(0, roundHalf(Number(v?.gvvn) || 0))
    const gvnn = Math.max(0, roundHalf(Number(v?.gvnn) || 0))
    if (gvvn > 0 || gvnn > 0) {
      cleaned[k] = { gvvn, gvnn }
    }
  }
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : ""
}

export function resolveSlotKeyTeacherSplit(
  splitMap: TeacherSplitMap,
  gradeNum: number | null,
  track?: "TN" | "XH" | null
): GradeTeacherSplit | null {
  if (!gradeNum || gradeNum < 1 || gradeNum > 12) return null
  if (gradeNum >= 10 && gradeNum <= 12) {
    if (track) {
      const trackHit = splitMap[`quotaG${gradeNum}${track}`] || splitMap[`G${gradeNum}${track}`]
      if (trackHit) return trackHit
    }
    return (
      splitMap[`quotaG${gradeNum}`] ||
      splitMap[`G${gradeNum}`] ||
      splitMap[`quotaG${gradeNum}TN`] ||
      splitMap[`G${gradeNum}TN`] ||
      splitMap[`quotaG${gradeNum}XH`] ||
      splitMap[`G${gradeNum}XH`] ||
      null
    )
  }
  return splitMap[`quotaG${gradeNum}`] || splitMap[`G${gradeNum}`] || null
}

const DUAL_TEACHER_SUBJECT_CODES = new Set([
  "ESL",
  "INT-ENG",
  "TA",
  "INT-AE",
  "IELTS",
  "INT-IELTS",
])

export function isDualGvvnGvnnSubject(subject?: {
  subjectCode?: string | null
  subjectName?: string | null
  category?: string | null
}): boolean {
  if (!subject) return false
  const code = String(subject.subjectCode || "").trim().toUpperCase()
  const name = String(subject.subjectName || "").trim().toUpperCase()
  if (DUAL_TEACHER_SUBJECT_CODES.has(code)) return true
  if (name === "ESL" || name.includes("ESL") || name === "ENGLISH") return true
  return false
}
