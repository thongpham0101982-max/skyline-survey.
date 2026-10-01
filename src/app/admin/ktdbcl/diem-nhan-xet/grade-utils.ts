/**
 * Shared grade matching helper for KTĐBCL Diem & Nhan xet
 * Accurately matches "Khối 2", "2", "K2", "Lớp 2"
 */
export const isGradeMatching = (configGrade?: string | null, targetGrade?: string | null): boolean => {
  if (!configGrade || !targetGrade) return false
  const c = configGrade.trim()
  const t = targetGrade.trim()
  if (c === "ALL" || t === "ALL" || c === "" || t === "") return true
  if (c.toLowerCase() === t.toLowerCase()) return true
  
  // Extract numbers (e.g. "Khối 2", "K2", "2" -> "2")
  const d1 = c.replace(/\D/g, "")
  const d2 = t.replace(/\D/g, "")
  if (d1 && d2) {
    return d1 === d2 // Exact number comparison: "2" === "2", NOT "12" === "2"
  }
  
  // Non-numeric grades (e.g. Mầm, Chồi, Lá)
  const clean1 = c.toLowerCase().replace(/khối|khoi|lớp|lop|\s/g, "")
  const clean2 = t.toLowerCase().replace(/khối|khoi|lớp|lop|\s/g, "")
  return clean1 === clean2
}

/**
 * Shared level matching helper for KTĐBCL:
 * - TieuHoc: Khối 1 đến 5 (loại trừ tuyệt đối 10, 11, 12)
 * - THCS: Khối 6 đến 9
 * - THPT: Khối 10 đến 12
 * - MamNon: Mầm non / Nhà trẻ / Mẫu giáo
 */
export const isClassInLevel = (
  cls: { level?: string | null; grade?: string | null; className?: string | null },
  levelFilter?: string | null
): boolean => {
  if (!levelFilter || levelFilter === "ALL") return true

  const cLevel = (cls.level || "").toLowerCase()
  const cGrade = (cls.grade || "").toLowerCase()
  const cName = (cls.className || "").toLowerCase().trim()

  const numMatch = cName.match(/^(\d+)/)
  const gradeNum = numMatch ? parseInt(numMatch[1], 10) : (parseInt(cGrade.replace(/\D/g, ""), 10) || null)

  if (levelFilter === "TieuHoc") {
    if (gradeNum !== null) {
      return gradeNum >= 1 && gradeNum <= 5
    }
    return (cLevel.includes("tiểu học") || cLevel.includes("tieu hoc")) && !cLevel.includes("thcs") && !cLevel.includes("thpt")
  }

  if (levelFilter === "THCS") {
    if (gradeNum !== null) {
      return gradeNum >= 6 && gradeNum <= 9
    }
    return (cLevel.includes("thcs") || cLevel.includes("trung học cơ sở")) && !cLevel.includes("tiểu học") && !cLevel.includes("thpt")
  }

  if (levelFilter === "THPT") {
    if (gradeNum !== null) {
      return gradeNum >= 10 && gradeNum <= 12
    }
    return (cLevel.includes("thpt") || cLevel.includes("trung học phổ thông") || cLevel.includes("cấp 3")) && !cLevel.includes("tiểu học") && !cLevel.includes("thcs")
  }

  if (levelFilter === "MamNon") {
    if (gradeNum !== null) return false
    return (
      cLevel.includes("mầm non") || cLevel.includes("mam non") || cLevel.includes("nhà trẻ") || cLevel.includes("mẫu giáo") ||
      cGrade.includes("mẫu giáo") || cGrade.includes("nhà trẻ") ||
      /^(mg|nt|sn|mgb|mgl|mgn)/i.test(cName)
    )
  }

  return true
}
