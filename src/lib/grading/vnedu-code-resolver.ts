import { prisma } from "@/lib/db"

export function normalizeStudentCodeKey(code?: string | null): string {
  const clean = String(code || "").trim().toUpperCase()
  if (!clean) return ""
  // Chuẩn hóa trường hợp mã số học sinh bị mất số 0 ở đầu khi import từ Excel (VD: 601012081 -> 0601012081)
  if (/^\d+$/.test(clean)) {
    return clean.replace(/^0+/, "") || "0"
  }
  return clean
}

export function buildCandidateDatabaseCodes(studentCodes: string[]): string[] {
  const candidates = new Set<string>()
  for (const raw of studentCodes) {
    const clean = String(raw || "").trim()
    if (!clean) continue
    candidates.add(clean)
    candidates.add(clean.toUpperCase())
    if (/^\d+$/.test(clean)) {
      const stripped = clean.replace(/^0+/, "")
      if (stripped) {
        candidates.add(stripped)
        if (stripped.length === 9) {
          candidates.add(`0${stripped}`)
        }
      }
    }
  }
  return Array.from(candidates)
}

/**
 * Tra cứu Mã vnEdu (chỉ đọc) cho danh sách mã học sinh xuyên suốt các năm học:
 * - Ưu tiên bản ghi StudentCodeMapping của năm học hiện hành (preferredAcademicYearId).
 * - Nếu năm học hiện hành chưa có bản ghi đồng bộ, tự động kế thừa Mã vnEdu từ năm học gần nhất.
 * - Hỗ trợ đối sánh chuẩn hóa cả trường hợp mã học sinh bị mất số 0 ở đầu khi import Excel.
 */
export async function resolveVnEduCodeMap(
  studentCodes: string[],
  preferredAcademicYearId?: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const validCodes = studentCodes.map(c => String(c || "").trim()).filter(Boolean)
  if (validCodes.length === 0) return result

  const candidateDbCodes = buildCandidateDatabaseCodes(validCodes)
  const codeMappings = await prisma.studentCodeMapping
    .findMany({
      where: {
        databaseCode: { in: candidateDbCodes },
      },
      select: {
        databaseCode: true,
        markFileCode: true,
        academicYearId: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    })
    .catch(() =>
      prisma.studentCodeMapping.findMany({
        where: {
          databaseCode: { in: candidateDbCodes },
        },
        select: {
          databaseCode: true,
          markFileCode: true,
          academicYearId: true,
        },
      })
    )

  // Gom nhóm theo khóa chuẩn hóa và khóa chính xác
  const mappingsByNormKey = new Map<string, Array<{ databaseCode: string; markFileCode: string; academicYearId: string }>>()
  for (const m of codeMappings) {
    const markCode = String(m.markFileCode || "").trim()
    if (!markCode) continue
    const normKey = normalizeStudentCodeKey(m.databaseCode)
    if (!normKey) continue
    const list = mappingsByNormKey.get(normKey) || []
    list.push({
      databaseCode: String(m.databaseCode || "").trim(),
      markFileCode: markCode,
      academicYearId: String(m.academicYearId || ""),
    })
    mappingsByNormKey.set(normKey, list)
  }

  for (const sCode of validCodes) {
    const normKey = normalizeStudentCodeKey(sCode)
    const matches = mappingsByNormKey.get(normKey)
    if (!matches || matches.length === 0) continue

    const preferredMatch = preferredAcademicYearId
      ? matches.find(m => m.academicYearId === preferredAcademicYearId && m.databaseCode.toUpperCase() === sCode.toUpperCase()) ||
        matches.find(m => m.academicYearId === preferredAcademicYearId)
      : null

    const chosen =
      preferredMatch ||
      matches.find(m => m.databaseCode.toUpperCase() === sCode.toUpperCase()) ||
      matches[0]

    if (chosen?.markFileCode) {
      result.set(sCode, chosen.markFileCode)
      result.set(sCode.toUpperCase(), chosen.markFileCode)
    }
  }

  return result
}
