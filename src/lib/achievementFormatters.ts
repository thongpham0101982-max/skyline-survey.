export interface AchievementLabelMaps {
  categoryMap: Record<string, string>
  levelMap: Record<string, string>
  yearMap?: Record<string, string>
}

export function buildAchievementLabelMaps(
  categories: Array<{ id?: string; code?: string | null; name?: string | null }> = [],
  levels: Array<{
    id?: string
    code?: string | null
    name?: string | null
    categoryId?: string | null
  }> = [],
  academicYears: Array<{ id?: string; name?: string | null }> = []
): AchievementLabelMaps {
  const categoryMap: Record<string, string> = {}
  const catIdToCode: Record<string, string> = {}

  for (const c of categories || []) {
    const code = String(c?.code || "").trim()
    const name = String(c?.name || "").trim()
    if (!code || !name) continue
    categoryMap[code] = name
    categoryMap[code.toUpperCase()] = name
    if (c.id) {
      catIdToCode[c.id] = code
    }
  }

  const levelMap: Record<string, string> = {}
  for (const l of levels || []) {
    const code = String(l?.code || "").trim()
    const name = String(l?.name || "").trim()
    if (!code || !name) continue
    if (!levelMap[code]) levelMap[code] = name
    if (!levelMap[code.toUpperCase()]) levelMap[code.toUpperCase()] = name
    const catCode = l.categoryId ? catIdToCode[l.categoryId] : ""
    if (catCode) {
      levelMap[`${catCode}:${code}`] = name
      levelMap[`${catCode.toUpperCase()}:${code.toUpperCase()}`] = name
    }
  }

  const yearMap: Record<string, string> = {}
  for (const y of academicYears || []) {
    if (y?.id && y?.name) {
      yearMap[y.id] = y.name
    }
  }

  return { categoryMap, levelMap, yearMap }
}

export function resolveAchievementCategoryLabel(
  rawCat?: string | null,
  categoryMap?: Record<string, string>
): string {
  const cat = String(rawCat || "").trim()
  if (!cat) return "Giải thưởng"

  if (categoryMap) {
    if (categoryMap[cat]) return categoryMap[cat]
    if (categoryMap[cat.toUpperCase()]) return categoryMap[cat.toUpperCase()]
  }

  const upper = cat.toUpperCase()
  switch (upper) {
    case "GIAI_THUONG":
      return "Giải thưởng"
    case "HUY_CHUONG":
      return "Huy chương"
    case "CHUNG_NHAN":
      return "Chứng nhận"
    case "TOP_RANK":
      return "Xếp hạng / Top rank"
    case "OLYMPIC":
      return "Olympic"
    case "KHKT":
      return "Khoa học kỹ thuật"
    case "THE_THAO":
      return "Thể dục thể thao"
    case "VAN_NGHE":
      return "Văn nghệ - Nghệ thuật"
    case "HOC_THUAT":
      return "Học thuật"
    case "STEM":
      return "STEM / Robotics"
    case "KHAC":
      return "Giải thưởng khác"
    default:
      return cat
  }
}

export function resolveAchievementLevelLabel(
  rawLvl?: string | null,
  rawCat?: string | null,
  levelMap?: Record<string, string>,
  categoryMap?: Record<string, string>
): string {
  const lvl = String(rawLvl || "").trim()
  const cat = String(rawCat || "").trim()

  if (lvl && levelMap) {
    if (cat && levelMap[`${cat}:${lvl}`]) return levelMap[`${cat}:${lvl}`]
    if (cat && levelMap[`${cat.toUpperCase()}:${lvl.toUpperCase()}`]) {
      return levelMap[`${cat.toUpperCase()}:${lvl.toUpperCase()}`]
    }
    if (levelMap[lvl]) return levelMap[lvl]
    if (levelMap[lvl.toUpperCase()]) return levelMap[lvl.toUpperCase()]
  }

  if (!lvl || lvl.toUpperCase() === "KHAC") {
    return resolveAchievementCategoryLabel(cat, categoryMap) || "Đạt giải"
  }

  const upper = lvl.toUpperCase()
  switch (upper) {
    case "NHAT":
    case "1":
      return "Giải Nhất"
    case "NHI":
    case "2":
      return "Giải Nhì"
    case "BA":
    case "3":
      return "Giải Ba"
    case "KHUYEN_KHICH":
    case "KK":
    case "4":
      return "Khuyến khích"
    case "VANG":
    case "HCV":
      return "Huy chương Vàng"
    case "BAC":
    case "HCB":
      return "Huy chương Bạc"
    case "DONG":
    case "HCD":
      return "Huy chương Đồng"
    case "TOP_5":
      return "Top 5"
    case "TOP_10":
      return "Top 10"
    case "TOP_20":
      return "Top 20"
    case "CAP_QUOC_TE":
      return "Cấp Quốc tế"
    case "CAP_QUOC_GIA":
      return "Cấp Quốc gia"
    case "CAP_THANH_PHO":
    case "CAP_TINH":
      return "Cấp Thành phố / Tỉnh"
    case "CAP_QUAN":
    case "CAP_HUYEN":
      return "Cấp Quận / Huyện"
    case "CAP_TRUONG":
      return "Cấp Trường"
    default:
      return lvl.replace(/_/g, " ")
  }
}

export function resolveAchievementYearLabel(
  ach: any,
  yearMap?: Record<string, string>,
  fallbackYearName?: string
): string {
  if (ach?.academicYear?.name) return ach.academicYear.name
  if (ach?.academicYearName && ach.academicYearName !== "N/A") return ach.academicYearName
  if (ach?.yearName && ach.yearName !== "N/A") return ach.yearName
  const yrId = String(ach?.academicYearId || "").trim()
  if (yrId) {
    if (yearMap?.[yrId]) return yearMap[yrId]
    if (yrId === "AY-2026") return "2025-2026"
    if (yrId.startsWith("AY-")) {
      const yearNum = yrId.replace("AY-", "")
      if (yearNum.length === 4 && !isNaN(Number(yearNum))) {
        return `${Number(yearNum) - 1}-${yearNum}`
      }
    }
    // Avoid exposing raw CUIDs like "cmnsccvbl0002wjbroigj12zd"
    if (/^c[a-z0-9]{20,}$/i.test(yrId)) {
      return fallbackYearName || "—"
    }
    return yrId
  }
  return fallbackYearName || "—"
}

export function getAchievementBadgeToneClass(
  rawLvl?: string | null,
  rawName?: string | null
): string {
  const u = String(rawLvl || "").trim().toUpperCase()
  const n = String(rawName || "").trim().toLowerCase()

  const isTop =
    u === "NHAT" ||
    u === "VANG" ||
    u === "HCV" ||
    u === "1" ||
    n.includes("giải nhất") ||
    n.includes("huy chương vàng")
  if (isTop) return "bg-amber-50 text-[#D97706] border-amber-200"

  const isSecond =
    u === "NHI" ||
    u === "BAC" ||
    u === "HCB" ||
    u === "2" ||
    n.includes("giải nhì") ||
    n.includes("huy chương bạc")
  if (isSecond) return "bg-slate-100 text-slate-700 border-slate-300"

  const isThird =
    u === "BA" ||
    u === "DONG" ||
    u === "HCD" ||
    u === "3" ||
    n.includes("giải ba") ||
    n.includes("huy chương đồng")
  if (isThird) return "bg-amber-50/60 text-amber-800 border-amber-200"

  return "bg-emerald-50 text-[#059669] border-emerald-200"
}

export interface NormalizedStudentAchievementRow {
  linkId: string
  achievementId: string
  studentId: string
  studentCode: string
  studentName: string
  className: string
  campusName: string
  examName: string
  achievementName: string
  rawCategory: string
  categoryLabel: string
  rawType: string
  typeLabel: string
  rawLevel: string
  levelLabel: string
  teacherName: string
  yearName: string
  badgeClass: string
  status?: string
  statusLabel?: string
  isRequest?: boolean
  requestId?: string
  evidenceUrl?: string | null
  reviewNote?: string | null
}

export function extractAchievementDisplayNames(
  ach: any,
  item?: any
): { achievementName: string; examName: string } {
  let rawAchName = String(
    ach?.name || ach?.title || item?.achievementName || "Giải thưởng"
  ).trim()

  const reqExamName = String(
    ach?.achievementRequests?.[0]?.examName || item?.requestExamName || ""
  ).trim()

  let rawExamName = String(
    ach?.exam?.name ||
      (ach?.examName && ach.examName !== "Ngoài hệ thống" ? ach.examName : "") ||
      (item?.examName && item.examName !== "Ngoài hệ thống" ? item.examName : "") ||
      reqExamName ||
      ""
  ).trim()

  // Clean legacy "Achievement — Exam" concatenation if created before examId linking
  if (rawAchName.includes(" — ")) {
    const parts = rawAchName.split(" — ")
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      const left = parts[0].trim()
      const right = parts[1].trim()
      if (!rawExamName || rawExamName.toLowerCase() === right.toLowerCase()) {
        rawAchName = left
        if (!rawExamName) rawExamName = right
      }
    }
  }

  return {
    achievementName: rawAchName || "Giải thưởng",
    examName: rawExamName || "Ngoài hệ thống",
  }
}

export function normalizeStudentAchievementRow(
  item: any,
  studentCtx?: any,
  maps?: AchievementLabelMaps
): NormalizedStudentAchievementRow {
  const ach = item?.achievement || item || {}
  const rawCategory = String(ach?.category || item?.category || ach?.examCategoryName || "").trim()
  const rawLevel = String(ach?.level ?? item?.level ?? "").trim()
  const rawType = String(ach?.type || item?.type || "CA_NHAN").trim().toUpperCase()
  const { achievementName, examName } = extractAchievementDisplayNames(ach, item)

  const categoryLabel =
    ach?.categoryLabel ||
    item?.categoryLabel ||
    resolveAchievementCategoryLabel(rawCategory, maps?.categoryMap)

  const levelLabel =
    ach?.levelLabel ||
    item?.levelLabel ||
    resolveAchievementLevelLabel(rawLevel, rawCategory, maps?.levelMap, maps?.categoryMap)

  const typeLabel = rawType === "DONG_DOI" ? "Đồng đội" : "Cá nhân"

  const rawTeacher =
    ach?.teacherName ||
    ach?.teacher?.teacherName ||
    item?.teacherName ||
    item?.coachTeacher ||
    ""
  const teacherName =
    rawTeacher && rawTeacher !== "Chưa xác định" && rawTeacher !== "N/A"
      ? String(rawTeacher).trim()
      : "—"

  const studentId = String(item?.studentId || studentCtx?.id || studentCtx?.student?.id || "").trim()
  const studentCode = String(
    item?.studentCode || studentCtx?.studentCode || studentCtx?.student?.studentCode || "—"
  ).trim()
  const studentName = String(
    item?.studentName ||
      studentCtx?.studentName ||
      studentCtx?.fullName ||
      studentCtx?.student?.studentName ||
      "—"
  ).trim()
  const className = String(
    item?.className ||
      studentCtx?.className ||
      studentCtx?.class?.className ||
      studentCtx?.student?.class?.className ||
      "—"
  ).trim()
  const campusName = String(
    item?.campusName ||
      studentCtx?.campusName ||
      studentCtx?.campus?.campusName ||
      studentCtx?.student?.campus?.campusName ||
      "—"
  ).trim()

  const yearName = resolveAchievementYearLabel(
    ach,
    maps?.yearMap,
    studentCtx?.yearName || studentCtx?.academicYear?.name
  )

  return {
    linkId: String(item?.id || item?.linkId || ach?.id || ""),
    achievementId: String(ach?.id || item?.achievementId || ""),
    studentId,
    studentCode: studentCode || "—",
    studentName: studentName || "—",
    className: className || "—",
    campusName: campusName || "—",
    examName: examName || "Ngoài hệ thống",
    achievementName: achievementName || "Giải thưởng",
    rawCategory,
    categoryLabel,
    rawType,
    typeLabel,
    rawLevel,
    levelLabel,
    teacherName,
    yearName,
    badgeClass: getAchievementBadgeToneClass(rawLevel, achievementName),
    status: item?.status,
    statusLabel: item?.statusLabel,
    isRequest: Boolean(item?.isRequest),
    requestId: item?.requestId,
    evidenceUrl: item?.evidenceUrl || null,
    reviewNote: item?.reviewNote || null,
  }
}
