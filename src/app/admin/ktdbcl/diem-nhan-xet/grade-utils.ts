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
