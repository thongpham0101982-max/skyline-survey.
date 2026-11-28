import type {
  DayOfWeekCode,
  SessionCode,
  SlotRecord,
  WeekTypeCode,
} from "./types"

/**
 * Phân tầng địa lý các cơ sở Sky-Line để tối ưu gom cụm lịch dạy cho GV liên cơ sở:
 * - URBAN_CORE: CS1 (Riverside), CS2 (Central), CS3 (Global) — nội đô Đà Nẵng (~10–20 phút).
 * - DISTANT_HILL: CS4 (Sky-Line Hill — Điện Bàn / Hội An, ~35–50 phút).
 * - DISTANT_BEACH: CS5 (Sky-Line Beach — Liên Chiểu, ~25–40 phút).
 */
export type CampusZoneTier = "URBAN_CORE" | "DISTANT_HILL" | "DISTANT_BEACH"

export interface CampusMetaForMemory {
  id: string
  campusCode?: string | null
  campusName?: string | null
  address?: string | null
}

export interface LearnedSubjectHabit {
  subjectCode: string
  /** Tỷ lệ thực tế môn học được xếp thành cặp 2 tiết liền (0..1) */
  doubleBlockRatio: number
  /** Có ưu tiên tách thành block 2 tiết liền (Tiết 1–2 hoặc Tiết 3–4) hay không */
  preferDoubleBlock: boolean
  /** Xu hướng buổi học: > 0 nghiêng về Sáng, < 0 nghiêng về Chiều */
  morningBias: number
  /** Danh sách mã môn thường ghép cặp Luân phiên (0.5 + 0.5 = 1.0 tiết/tuần) */
  preferredAltSubjectCodes: string[]
}

export interface LearnedScheduleMemory {
  /** Thói quen theo mã môn học (kết hợp tiên nghiệm Sky-Line + học từ Kéo thả & Lịch nền) */
  subjectHabits: Map<string, LearnedSubjectHabit>
  /**
   * Ghi nhớ vị trí Lịch nền / Kéo thả ổn định:
   * Key: `${classId}::${subjectId}::${dayOfWeek}::${session}::${periodNumber}` -> bonus weight
   */
  baselineCellAnchors: Set<string>
  /**
   * Ghi nhớ cặp môn Luân phiên đã từng ghép thành công:
   * Key: `${subjectCodeA}` -> Set<subjectCodeB>
   */
  learnedAlternatingPartners: Map<string, Set<string>>
  /** Số cơ sở mà mỗi GV đang giảng dạy (từ phân công + externalActiveSlots) */
  teacherCampusSet: Map<string, Set<string>>
  /** Số cấp học mà mỗi GV đang giảng dạy */
  teacherLevelSet: Map<string, Set<string>>
  /** Phân vùng địa lý theo campusId */
  campusZoneById: Map<string, CampusZoneTier>
}

/**
 * Tri thức nền (Empirical Priors) trích xuất từ 1.173 ô tiết kéo thả thực tế tại Sky-Line
 * và Khung chương trình QĐ 82/2026/QĐ-SKL (40 tiết/tuần):
 */
export const SKYLINE_EMPIRICAL_SUBJECT_PRIORS: Record<
  string,
  {
    preferDoubleBlock: boolean
    morningBias: number // +1: ưu tiên Sáng, 0: trung tính, -1: ưu tiên Chiều
    preferredAltSubjectCodes: string[]
  }
> = {
  // Nhóm Quốc tế / Song ngữ — thực tế kéo thả 88%–100% xếp cặp 2 tiết liền (1-2 hoặc 3-4)
  ESL: { preferDoubleBlock: true, morningBias: 0.25, preferredAltSubjectCodes: [] },
  SCI: { preferDoubleBlock: true, morningBias: 0.1, preferredAltSubjectCodes: [] },
  MAT: { preferDoubleBlock: true, morningBias: 0.15, preferredAltSubjectCodes: [] },
  "INT-GLOBAL": { preferDoubleBlock: true, morningBias: -0.2, preferredAltSubjectCodes: [] },
  "INT-AE": { preferDoubleBlock: true, morningBias: 0.2, preferredAltSubjectCodes: [] },
  "INT-BUS": { preferDoubleBlock: true, morningBias: -0.2, preferredAltSubjectCodes: [] },
  IELTS: { preferDoubleBlock: true, morningBias: 0.1, preferredAltSubjectCodes: [] },
  "INT-SAT": { preferDoubleBlock: true, morningBias: 0.1, preferredAltSubjectCodes: [] },

  // Nhóm Cốt lõi MOET — các cặp 2 tiết liền + tiết lẻ/luân phiên (.5 ghép GDCD hoặc TOA<->NVA ở K10,11)
  TOA: { preferDoubleBlock: true, morningBias: 0.5, preferredAltSubjectCodes: ["GDCD", "NVA"] },
  NVA: { preferDoubleBlock: true, morningBias: 0.35, preferredAltSubjectCodes: ["GDCD", "TOA"] },
  TVI: { preferDoubleBlock: true, morningBias: 0.35, preferredAltSubjectCodes: [] },
  KHT: { preferDoubleBlock: true, morningBias: 0.15, preferredAltSubjectCodes: [] },
  TA: { preferDoubleBlock: true, morningBias: -0.1, preferredAltSubjectCodes: [] },

  // Nhóm Đặc thù / Thực hành / Thể chất — 100% xếp cặp 2 tiết liền khi định mức >= 2
  GTC: { preferDoubleBlock: true, morningBias: -0.25, preferredAltSubjectCodes: [] },
  ICT: { preferDoubleBlock: true, morningBias: -0.1, preferredAltSubjectCodes: [] },
  STE: { preferDoubleBlock: true, morningBias: -0.25, preferredAltSubjectCodes: ["CLB"] },

  // Nhóm Tổ hợp lựa chọn THPT (2* tiết/tuần -> ưu tiên 1 cặp 2 tiết liền hoặc 2 tiết tách ngày)
  VLI: { preferDoubleBlock: true, morningBias: 0.2, preferredAltSubjectCodes: [] },
  HHO: { preferDoubleBlock: true, morningBias: 0.2, preferredAltSubjectCodes: [] },
  SHO: { preferDoubleBlock: true, morningBias: 0.1, preferredAltSubjectCodes: [] },
  GKP: { preferDoubleBlock: true, morningBias: -0.15, preferredAltSubjectCodes: [] },

  // Nhóm 1 tiết hoặc 0.5 tiết Luân phiên
  GDCD: { preferDoubleBlock: false, morningBias: 0.2, preferredAltSubjectCodes: ["TOA", "NVA"] },
  CLB: { preferDoubleBlock: false, morningBias: -0.8, preferredAltSubjectCodes: ["GCX", "STE"] },
  GCX: { preferDoubleBlock: false, morningBias: -0.6, preferredAltSubjectCodes: ["CLB"] },
  ANA: { preferDoubleBlock: false, morningBias: -0.1, preferredAltSubjectCodes: ["MTU"] },
  MTU: { preferDoubleBlock: false, morningBias: -0.1, preferredAltSubjectCodes: ["ANA"] },
  LSU: { preferDoubleBlock: false, morningBias: 0.2, preferredAltSubjectCodes: ["DLI"] },
  DLI: { preferDoubleBlock: false, morningBias: 0.1, preferredAltSubjectCodes: ["LSU"] },
  TNH: { preferDoubleBlock: false, morningBias: -0.6, preferredAltSubjectCodes: [] },
  HTT: { preferDoubleBlock: false, morningBias: 1.0, preferredAltSubjectCodes: [] },
  HĐTN: { preferDoubleBlock: false, morningBias: 1.0, preferredAltSubjectCodes: [] },
}

export function classifyCampusZone(campus?: CampusMetaForMemory | null): CampusZoneTier {
  if (!campus) return "URBAN_CORE"
  const raw = `${campus.campusCode || ""} ${campus.campusName || ""} ${campus.address || ""}`.toUpperCase()
  if (raw.includes("HILL") || raw.includes("CS4")) return "DISTANT_HILL"
  if (raw.includes("BEACH") || raw.includes("CS5")) return "DISTANT_BEACH"
  return "URBAN_CORE"
}

/**
 * Xây dựng Bộ nhớ xếp lịch (`LearnedScheduleMemory`) từ:
 * 1) Các tiết Kéo & Thả hiện có (`dragDropSlots`)
 * 2) Các tiết thuộc Lịch nền (`baselineSlots`)
 * 3) Các tiết liên cơ sở / liên cấp (`externalSlots`) & hồ sơ phân công đa cơ sở (`teacherCampuses`)
 */
export function buildLearnedScheduleMemory(params: {
  dragDropSlots?: SlotRecord[]
  baselineSlots?: SlotRecord[]
  externalSlots?: Array<{ slot: SlotRecord; campusId: string }>
  campuses?: CampusMetaForMemory[]
  teacherAssignmentsMeta?: Array<{
    teacherId: string
    campusId: string
    level?: string | null
  }>
}): LearnedScheduleMemory {
  const campusZoneById = new Map<string, CampusZoneTier>()
  for (const cp of params.campuses || []) {
    campusZoneById.set(cp.id, classifyCampusZone(cp))
  }

  const subjectHabits = new Map<string, LearnedSubjectHabit>()
  for (const [code, prior] of Object.entries(SKYLINE_EMPIRICAL_SUBJECT_PRIORS)) {
    subjectHabits.set(code, {
      subjectCode: code,
      doubleBlockRatio: prior.preferDoubleBlock ? 0.9 : 0.1,
      preferDoubleBlock: prior.preferDoubleBlock,
      morningBias: prior.morningBias,
      preferredAltSubjectCodes: [...prior.preferredAltSubjectCodes],
    })
  }

  const baselineCellAnchors = new Set<string>()
  const learnedAlternatingPartners = new Map<string, Set<string>>()
  for (const [code, prior] of Object.entries(SKYLINE_EMPIRICAL_SUBJECT_PRIORS)) {
    if (prior.preferredAltSubjectCodes.length > 0) {
      learnedAlternatingPartners.set(code, new Set(prior.preferredAltSubjectCodes))
    }
  }

  const referenceSlots: SlotRecord[] = [
    ...(params.baselineSlots || []),
    ...(params.dragDropSlots || []),
  ]

  // Ghi nhớ neo ô tiết từ Lịch nền + các tiết đã khóa từ Kéo & Thả
  for (const s of params.baselineSlots || []) {
    if (s.classId && s.subjectId) {
      baselineCellAnchors.add(
        `${s.classId}::${s.subjectId}::${s.dayOfWeek}::${s.session}::${s.periodNumber}`
      )
    }
  }
  for (const s of params.dragDropSlots || []) {
    if (s.isLocked && s.classId && s.subjectId) {
      baselineCellAnchors.add(
        `${s.classId}::${s.subjectId}::${s.dayOfWeek}::${s.session}::${s.periodNumber}`
      )
    }
  }

  // Học tỷ lệ Sáng/Chiều, Block 2 tiết liền và cặp Luân phiên từ dữ liệu thực tế
  const subSessionStats = new Map<
    string,
    { morning: number; afternoon: number; doubleRuns: number; singleRuns: number }
  >()
  const byClassDaySession = new Map<string, SlotRecord[]>()

  for (const s of referenceSlots) {
    const code = String(s.subjectCode || "").trim().toUpperCase()
    if (!code) continue
    if (!subSessionStats.has(code)) {
      subSessionStats.set(code, { morning: 0, afternoon: 0, doubleRuns: 0, singleRuns: 0 })
    }
    const st = subSessionStats.get(code)!
    if (s.session === "MORNING") st.morning++
    else st.afternoon++

    const wt = String(s.weekType || "ALL").toUpperCase()
    if ((wt === "ODD" || wt === "EVEN") && s.altSubjectName) {
      const altCode = String(s.altSubjectName || "").trim().toUpperCase()
      if (altCode && altCode !== code) {
        if (!learnedAlternatingPartners.has(code)) learnedAlternatingPartners.set(code, new Set())
        learnedAlternatingPartners.get(code)!.add(altCode)
      }
    }

    const cdsKey = `${s.versionId || "V"}::${s.classId}::${s.dayOfWeek}::${s.session}`
    if (!byClassDaySession.has(cdsKey)) byClassDaySession.set(cdsKey, [])
    byClassDaySession.get(cdsKey)!.push(s)
  }

  for (const list of byClassDaySession.values()) {
    list.sort((a, b) => Number(a.periodNumber) - Number(b.periodNumber))
    let i = 0
    while (i < list.length) {
      const cur = list[i]
      const code = String(cur.subjectCode || "").trim().toUpperCase()
      let run = 1
      while (
        i + run < list.length &&
        String(list[i + run].subjectCode || "").trim().toUpperCase() === code &&
        Number(list[i + run].periodNumber) === Number(cur.periodNumber) + run
      ) {
        run++
      }
      if (code && subSessionStats.has(code)) {
        const st = subSessionStats.get(code)!
        if (run >= 2) st.doubleRuns++
        else st.singleRuns++
      }
      i += run
    }
  }

  for (const [code, st] of subSessionStats.entries()) {
    const totalRuns = st.doubleRuns + st.singleRuns
    const totalPeriods = st.morning + st.afternoon
    const existing = subjectHabits.get(code)
    const observedDoubleRatio = totalRuns >= 3 ? st.doubleRuns / totalRuns : null
    const observedMorningBias =
      totalPeriods >= 4 ? (st.morning - st.afternoon) / totalPeriods : null

    const doubleBlockRatio =
      observedDoubleRatio !== null
        ? existing
          ? existing.doubleBlockRatio * 0.4 + observedDoubleRatio * 0.6
          : observedDoubleRatio
        : existing?.doubleBlockRatio ?? 0.2

    const morningBias =
      observedMorningBias !== null
        ? existing
          ? existing.morningBias * 0.5 + observedMorningBias * 0.5
          : observedMorningBias
        : existing?.morningBias ?? 0.1

    const partners = Array.from(learnedAlternatingPartners.get(code) || [])
    subjectHabits.set(code, {
      subjectCode: code,
      doubleBlockRatio,
      preferDoubleBlock: doubleBlockRatio >= 0.55 || Boolean(existing?.preferDoubleBlock),
      morningBias,
      preferredAltSubjectCodes: partners,
    })
  }

  // Xây dựng hồ sơ GV dạy nhiều cơ sở & liên cấp
  const teacherCampusSet = new Map<string, Set<string>>()
  const teacherLevelSet = new Map<string, Set<string>>()

  const recordTeacherScope = (tid?: string | null, campusId?: string | null, level?: string | null) => {
    if (!tid) return
    if (campusId) {
      if (!teacherCampusSet.has(tid)) teacherCampusSet.set(tid, new Set())
      teacherCampusSet.get(tid)!.add(campusId)
    }
    if (level) {
      if (!teacherLevelSet.has(tid)) teacherLevelSet.set(tid, new Set())
      teacherLevelSet.get(tid)!.add(level)
    }
  }

  for (const m of params.teacherAssignmentsMeta || []) {
    recordTeacherScope(m.teacherId, m.campusId, m.level)
  }
  for (const s of referenceSlots) {
    recordTeacherScope(s.teacherId, s.campusId, s.level)
    recordTeacherScope(s.coTeacherId, s.campusId, s.level)
    recordTeacherScope(s.altTeacherId, s.campusId, s.level)
  }
  for (const ext of params.externalSlots || []) {
    recordTeacherScope(ext.slot.teacherId, ext.campusId, ext.slot.level)
    recordTeacherScope(ext.slot.coTeacherId, ext.campusId, ext.slot.level)
    recordTeacherScope(ext.slot.altTeacherId, ext.campusId, ext.slot.level)
  }

  return {
    subjectHabits,
    baselineCellAnchors,
    learnedAlternatingPartners,
    teacherCampusSet,
    teacherLevelSet,
    campusZoneById,
  }
}

/**
 * Độ ưu tiên độ khó của Giáo viên (GV càng dạy nhiều cơ sở / cơ sở xa Hill-Beach / liên cấp càng phải xếp trước!)
 */
export function computeTeacherMultiCampusPriority(
  memory: LearnedScheduleMemory,
  teacherId: string
): number {
  const campuses = memory.teacherCampusSet.get(teacherId)
  const levels = memory.teacherLevelSet.get(teacherId)
  const campusCount = campuses ? campuses.size : 1
  const levelCount = levels ? levels.size : 1

  let score = 0
  if (campusCount >= 3) score += 300
  else if (campusCount === 2) score += 180

  if (campuses && campusCount > 1) {
    for (const cid of campuses) {
      const zone = memory.campusZoneById.get(cid)
      if (zone === "DISTANT_HILL") score += 120
      else if (zone === "DISTANT_BEACH") score += 80
    }
  }

  if (levelCount >= 2) score += 60
  return score
}

/**
 * Kiểm tra cặp tiết đôi có rơi vào cặp chuẩn không vắt qua giờ giải lao 20 phút hay không:
 * Chuẩn Sky-Line (4 tiết Sáng + 4 tiết Chiều):
 * - Cặp chuẩn: Tiết (1, 2) hoặc Tiết (3, 4) -> không bị cắt ngang bởi ra chơi giữa Tiết 2 & Tiết 3!
 */
export function isCleanNonBreakDoublePair(startPeriod: number): boolean {
  return startPeriod === 1 || startPeriod === 3
}

/**
 * Chấm điểm ô ứng viên kết hợp:
 * 1) Gom cụm cơ sở theo Ngày / Buổi cho GV dạy nhiều cơ sở (Multi-campus Day/Session Clustering)
 * 2) Giữ ổn định theo Lịch nền (Baseline Anchor)
 * 3) Cặp tiết chuẩn (1–2, 3–4) không cắt ngang giờ giải lao
 * 4) Thói quen buổi Sáng/Chiều của môn học & trải đều trong tuần
 */
export function scoreCandidateWithMemory(params: {
  memory: LearnedScheduleMemory
  campusId: string
  classId: string
  subjectId: string
  subjectCode: string
  teacherId: string
  coTeacherId?: string | null
  blockSize: 1 | 2
  weekType: WeekTypeCode
  dayOfWeek: DayOfWeekCode
  session: SessionCode
  periodNumber: number
  currentSlots: SlotRecord[]
  externalSlots?: Array<{ slot: SlotRecord; campusId: string }>
  preferMorningDefault: boolean
}): number {
  const {
    memory,
    campusId,
    classId,
    subjectId,
    subjectCode,
    teacherId,
    coTeacherId,
    blockSize,
    dayOfWeek,
    session,
    periodNumber,
    currentSlots,
    externalSlots,
    preferMorningDefault,
  } = params

  let score = 0
  const normCode = String(subjectCode || "").trim().toUpperCase()
  const habit = memory.subjectHabits.get(normCode)

  // 1. Giữ ổn định với Lịch nền / Tiết neo cũ (Baseline Stability)
  const anchorKey = `${classId}::${subjectId}::${dayOfWeek}::${session}::${periodNumber}`
  if (memory.baselineCellAnchors.has(anchorKey)) {
    score += 45
  }

  // 2. Ưu tiên cặp 2 tiết liền chuẩn (1–2 hoặc 3–4), phạt vắt qua giờ giải lao (2–3)
  if (blockSize === 2) {
    if (isCleanNonBreakDoublePair(periodNumber)) {
      score += 30
    } else {
      score -= 25
    }
  }

  // 3. Gom cụm lịch dạy cho Giáo viên liên cơ sở (Multi-Campus Teacher Clustering)
  const teacherIds = [teacherId, coTeacherId].filter(Boolean) as string[]
  for (const tid of teacherIds) {
    const campuses = memory.teacherCampusSet.get(tid)
    const isMultiCampus = campuses && campuses.size > 1

    let sameCampusSameSession = 0
    let sameCampusOtherSession = 0
    let otherCampusToday = 0
    let hasDistantCampusSwitchToday = false
    let teacherTotalPeriodsToday = 0

    for (const s of currentSlots) {
      if (s.dayOfWeek !== dayOfWeek) continue
      if (s.teacherId !== tid && s.coTeacherId !== tid && s.altTeacherId !== tid) continue
      teacherTotalPeriodsToday++
      const sCampus = s.campusId || campusId
      if (sCampus === campusId) {
        if (s.session === session) sameCampusSameSession++
        else sameCampusOtherSession++
      } else {
        otherCampusToday++
        const z1 = memory.campusZoneById.get(campusId) || "URBAN_CORE"
        const z2 = memory.campusZoneById.get(sCampus) || "URBAN_CORE"
        if (z1 !== "URBAN_CORE" || z2 !== "URBAN_CORE") {
          hasDistantCampusSwitchToday = true
        }
      }
    }

    for (const ext of externalSlots || []) {
      if (ext.slot.dayOfWeek !== dayOfWeek) continue
      if (
        ext.slot.teacherId !== tid &&
        ext.slot.coTeacherId !== tid &&
        ext.slot.altTeacherId !== tid
      ) {
        continue
      }
      teacherTotalPeriodsToday++
      if (ext.campusId === campusId) {
        if (ext.slot.session === session) sameCampusSameSession++
        else sameCampusOtherSession++
      } else {
        otherCampusToday++
        const z1 = memory.campusZoneById.get(campusId) || "URBAN_CORE"
        const z2 = memory.campusZoneById.get(ext.campusId) || "URBAN_CORE"
        if (z1 !== "URBAN_CORE" || z2 !== "URBAN_CORE") {
          hasDistantCampusSwitchToday = true
        }
      }
    }

    if (isMultiCampus) {
      // Thưởng mạnh khi gom các tiết của GV liên cơ sở vào cùng buổi / cùng ngày tại 1 cơ sở
      if (sameCampusSameSession > 0) score += 38
      else if (sameCampusOtherSession > 0 && otherCampusToday === 0) score += 24

      // Phạt nặng nếu trong cùng 1 ngày phải di chuyển giữa 2 cơ sở (đặc biệt CS4 Hill / CS5 Beach)
      if (otherCampusToday > 0) {
        score -= hasDistantCampusSwitchToday ? 95 : 48
      }
    }

    // Tránh dồn quá tải > 6 tiết/ngày cho 1 GV nếu còn ngày khác thoáng hơn
    if (teacherTotalPeriodsToday + blockSize > 6) {
      score -= 20
    }
  }

  // 4. Trải đều môn học của lớp trong tuần (tránh dồn 2 cụm của cùng môn sát ngày nhau nếu là môn 4–8 tiết)
  const classSameSubOnDay = currentSlots.some(
    (s) => s.classId === classId && s.subjectId === subjectId && s.dayOfWeek === dayOfWeek
  )
  if (classSameSubOnDay) {
    score -= 30
  }

  // 5. Thói quen buổi Sáng / Chiều từ dữ liệu Kéo thả & Đặc thù môn
  const bias = habit ? habit.morningBias : preferMorningDefault ? 0.25 : 0
  if (session === "MORNING") {
    score += Math.round(bias * 20) - periodNumber
  } else {
    score -= Math.round(bias * 20) + periodNumber
  }

  return score
}
