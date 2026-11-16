import { DEFAULT_MONTHLY_RULE_PARAMS, DEFAULT_YEARLY_RULE_PARAMS, SlcRuleParameters } from "./constants"

const VN_OFFSET_MS = 7 * 60 * 60 * 1000 // Asia/Ho_Chi_Minh is UTC+7 year-round (no DST)
const EPSILON = 1e-9

/**
 * Chuyển đổi thời điểm đầu tháng và đầu tháng kế tiếp theo giờ nghiệp vụ Asia/Ho_Chi_Minh (UTC+7)
 * sang UTC để truy vấn nửa khoảng [startDateUtc, endDateUtc), tránh đếm trùng ở ranh giới hai kỳ.
 */
export function getVietnamMonthBoundsUtc(
  year: number,
  month1To12: number,
  customStartUtc?: Date | null,
  customEndUtc?: Date | null
): { startDateUtc: Date; endDateUtc: Date } {
  if (customStartUtc && customEndUtc) {
    return {
      startDateUtc: new Date(customStartUtc.getTime()),
      endDateUtc: new Date(customEndUtc.getTime()),
    }
  }

  // 00:00:00.000 Asia/Ho_Chi_Minh on YYYY-MM-01 is (Date.UTC(year, month - 1, 1) - 7 hours)
  const startMs = Date.UTC(year, month1To12 - 1, 1, 0, 0, 0, 0) - VN_OFFSET_MS
  const nextYear = month1To12 === 12 ? year + 1 : year
  const nextMonth = month1To12 === 12 ? 1 : month1To12 + 1
  const endMs = Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0) - VN_OFFSET_MS

  return {
    startDateUtc: customStartUtc ? new Date(customStartUtc.getTime()) : new Date(startMs),
    endDateUtc: customEndUtc ? new Date(customEndUtc.getTime()) : new Date(endMs),
  }
}

/**
 * Kiểm tra hai kỳ giải thưởng cùng loại / cùng phạm vi có bị giao nhau về thời gian [start, end) hay không.
 */
export function doPeriodRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime()
}

/**
 * Tính hạn rà soát sau khi hết kỳ (mặc định 3 ngày làm việc theo giờ Asia/Ho_Chi_Minh).
 * Nếu admin truyền hạn rà soát rõ ràng thì ưu tiên dùng hạn đó.
 */
export function calculateReviewDeadlineUtc(
  periodEndDateUtc: Date,
  options: {
    explicitDeadlineUtc?: Date | null
    workingDaysCount?: number
    workingDaysOfWeek?: number[] // 1=Mon ... 5=Fri
    holidaysIsoDates?: string[] // ["2026-09-02", ...] in YYYY-MM-DD Vietnam time
  } = {}
): Date {
  if (options.explicitDeadlineUtc) {
    return new Date(options.explicitDeadlineUtc.getTime())
  }

  const workingDaysNeeded = options.workingDaysCount ?? 3
  const workingDays = new Set(options.workingDaysOfWeek ?? [1, 2, 3, 4, 5])
  const holidays = new Set(options.holidaysIsoDates ?? [])

  // Start from periodEndDateUtc in Vietnam local date
  let cursorVnMs = periodEndDateUtc.getTime() + VN_OFFSET_MS
  let counted = 0

  while (counted < workingDaysNeeded) {
    const d = new Date(cursorVnMs)
    const dayOfWeek = d.getUTCDay()
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(d.getUTCDate()).padStart(2, "0")
    const isoDate = `${yyyy}-${mm}-${dd}`

    if (workingDays.has(dayOfWeek) && !holidays.has(isoDate)) {
      counted++
    }
    // Advance 1 day (end of the 3rd working day = start of next day in VN time -> [start, reviewDeadlineUtc))
    cursorVnMs += 24 * 60 * 60 * 1000
  }

  return new Date(cursorVnMs - VN_OFFSET_MS)
}

/**
 * Kiểm tra một timestamp có thuộc khoảng nửa mở [startDateUtc, endDateUtc) hay không.
 */
export function isWithinHalfOpenPeriod(
  timestamp: Date | string,
  startDateUtc: Date,
  endDateUtc: Date
): boolean {
  const t = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp.getTime()
  return t >= startDateUtc.getTime() && t < endDateUtc.getTime()
}

export interface RatingRevisionRecord {
  id: string
  reviewerId: string
  reviewerName?: string
  stars: number
  confirmedExperienced?: boolean
  productVersion?: string | null
  majorVersion?: number
  createdAt: Date | string
  isValid?: boolean
}

/**
 * Lọc danh sách revision đánh giá hợp lệ trong kỳ [startDateUtc, endDateUtc):
 * - Chỉ tính revision được tạo/cập nhật trong khoảng [startDateUtc, endDateUtc).
 * - Không mang điểm tháng trước sang nếu người đó không có revision trong kỳ.
 * - Loại bỏ tác giả và toàn bộ thành viên/cộng tác viên đã xác nhận của đối tượng.
 * - Với Sản phẩm AI, bắt buộc confirmedExperienced === true.
 * - Mỗi người đánh giá (reviewerId) chỉ lấy revision hợp lệ cuối cùng trước endDateUtc
 *   (kể cả khi mở lại đợt đánh giá phiên bản lớn, vẫn giữ 1 người 1 đánh giá trong kỳ).
 */
export function selectValidPeriodRatingRevisions(
  revisions: RatingRevisionRecord[],
  options: {
    targetType: "IDEA" | "PRODUCT"
    startDateUtc: Date
    endDateUtc: Date
    authorId: string
    collaboratorIds?: string[]
    invalidatedReviewerIds?: string[]
  }
): RatingRevisionRecord[] {
  const excludedUsers = new Set<string>([
    options.authorId,
    ...(options.collaboratorIds ?? []),
    ...(options.invalidatedReviewerIds ?? []),
  ])

  const inPeriod = revisions.filter((rev) => {
    if (!rev || !rev.reviewerId) return false
    if (excludedUsers.has(rev.reviewerId)) return false
    if (rev.isValid === false) return false
    if (rev.stars < 1 || rev.stars > 5) return false
    if (options.targetType === "PRODUCT" && !rev.confirmedExperienced) return false
    return isWithinHalfOpenPeriod(rev.createdAt, options.startDateUtc, options.endDateUtc)
  })

  // Sort ascending by createdAt, then pick the latest revision per reviewerId
  const sorted = [...inPeriod].sort((a, b) => {
    const tA = new Date(a.createdAt).getTime()
    const tB = new Date(b.createdAt).getTime()
    if (tA !== tB) return tA - tB
    return String(a.id).localeCompare(String(b.id))
  })

  const latestByReviewer = new Map<string, RatingRevisionRecord>()
  for (const rev of sorted) {
    latestByReviewer.set(rev.reviewerId, rev)
  }

  return Array.from(latestByReviewer.values())
}

export interface ProductApplicationRecord {
  id: string
  applicantId: string
  applicantName?: string
  verificationStatus: string // SELF_DECLARED | PENDING_VERIFICATION | VERIFIED | SUPPLEMENT_REQUESTED | REJECTED
  submittedAt: Date | string
  verifiedAt?: Date | string | null
}

/**
 * Lọc danh sách lượt áp dụng có minh chứng đã được xác nhận hợp lệ trong kỳ:
 * - Minh chứng phải được nộp trong kỳ [startDateUtc, endDateUtc).
 * - Quyết định xác nhận (VERIFIED) được hoàn tất trước hoặc trong thời gian rà soát (<= reviewDeadlineUtc).
 * - Loại bỏ tác giả và cộng tác viên.
 * - Mỗi người (applicantId) chỉ tính 1 lượt áp dụng hợp lệ cho 1 sản phẩm mỗi kỳ (hoặc toàn năm).
 */
export function selectValidPeriodVerifiedApplications(
  applications: ProductApplicationRecord[],
  options: {
    startDateUtc: Date
    endDateUtc: Date
    reviewDeadlineUtc: Date
    authorId: string
    collaboratorIds?: string[]
  }
): ProductApplicationRecord[] {
  const excludedUsers = new Set<string>([
    options.authorId,
    ...(options.collaboratorIds ?? []),
  ])

  const validApps = applications.filter((app) => {
    if (!app || !app.applicantId) return false
    if (excludedUsers.has(app.applicantId)) return false
    if (app.verificationStatus !== "VERIFIED") return false
    if (!isWithinHalfOpenPeriod(app.submittedAt, options.startDateUtc, options.endDateUtc)) {
      return false
    }
    if (app.verifiedAt) {
      const vTime = new Date(app.verifiedAt).getTime()
      if (vTime > options.reviewDeadlineUtc.getTime()) {
        return false
      }
    }
    return true
  })

  const uniqueByApplicant = new Map<string, ProductApplicationRecord>()
  for (const app of validApps) {
    if (!uniqueByApplicant.has(app.applicantId)) {
      uniqueByApplicant.set(app.applicantId, app)
    }
  }

  return Array.from(uniqueByApplicant.values())
}

/**
 * Công thức điểm cộng đồng hiệu chỉnh Bayes:
 * C = 20 * ((n * R + m * prior) / (n + m))
 * Mặc định m = 5, prior = 3.5.
 */
export function computeBayesianScoreC(
  n: number,
  R: number,
  m = 5.0,
  prior = 3.5
): number {
  if (n <= 0) return 0
  return 20 * ((n * R + m * prior) / (n + m))
}

export interface ExpertEvalInput {
  expertId: string
  status: string
  criterion1Score?: number | null
  criterion2Score?: number | null
  criterion3Score?: number | null
}

/**
 * Tính điểm chuyên môn E = 20 * sao chuyên môn trung bình:
 * - Ít nhất minExpertReviewers (mặc định 2) người độc lập được phân công, không phải tác giả/cộng tác viên.
 * - Mỗi người chấm 3 tiêu chí 1–5, trọng số bằng nhau.
 * - Nếu không đủ người chấm hợp lệ -> trả về null (Chưa đủ điều kiện, tuyệt đối không gán bằng 0).
 */
export function computeExpertScoreE(
  evaluations: ExpertEvalInput[],
  options: {
    authorId: string
    collaboratorIds?: string[]
    minExpertReviewers?: number
  }
): {
  isSufficient: boolean
  validExpertCount: number
  avgExpertStars: number | null
  scoreE: number | null
} {
  const minExperts = options.minExpertReviewers ?? 2
  const excluded = new Set<string>([options.authorId, ...(options.collaboratorIds ?? [])])

  const validSubmitted: number[] = []
  const seenExperts = new Set<string>()

  for (const ev of evaluations) {
    if (!ev || ev.status !== "SUBMITTED") continue
    if (excluded.has(ev.expertId)) continue
    if (seenExperts.has(ev.expertId)) continue
    const c1 = ev.criterion1Score
    const c2 = ev.criterion2Score
    const c3 = ev.criterion3Score
    if (
      typeof c1 !== "number" ||
      typeof c2 !== "number" ||
      typeof c3 !== "number" ||
      c1 < 1 ||
      c1 > 5 ||
      c2 < 1 ||
      c2 > 5 ||
      c3 < 1 ||
      c3 > 5
    ) {
      continue
    }
    seenExperts.add(ev.expertId)
    validSubmitted.push((c1 + c2 + c3) / 3)
  }

  if (validSubmitted.length < minExperts) {
    return {
      isSufficient: false,
      validExpertCount: validSubmitted.length,
      avgExpertStars: validSubmitted.length > 0
        ? validSubmitted.reduce((s, v) => s + v, 0) / validSubmitted.length
        : null,
      scoreE: null,
    }
  }

  const avgExpertStars = validSubmitted.reduce((s, v) => s + v, 0) / validSubmitted.length
  const scoreE = 20 * avgExpertStars

  return {
    isSufficient: true,
    validExpertCount: validSubmitted.length,
    avgExpertStars,
    scoreE,
  }
}

/**
 * Công thức điểm áp dụng thực tế U:
 * U = 100 * min(a / cap, 1)
 * Trong đó a là số GV có minh chứng xác nhận hợp lệ, cap tháng = 10, cap năm = 20.
 */
export function computeApplicationScoreU(a: number, cap: number): number {
  if (a <= 0 || cap <= 0) return 0
  return 100 * Math.min(a / cap, 1)
}

export interface CandidateScoreResult {
  targetType: "IDEA" | "PRODUCT"
  targetId: string
  isEligible: boolean
  ineligibleReasons: string[]
  validRatingCountN: number
  avgRatingR: number
  scoreC: number
  expertCount: number
  avgExpertStars: number | null
  scoreE: number | null
  verifiedAppsCountA: number
  scoreU: number | null
  totalScoreRaw: number | null
}

/**
 * Tính điểm tổng hợp của một đối tượng (Ý tưởng hoặc Sản phẩm AI) trong kỳ theo bộ tham số quy chế:
 * - Điểm ý tưởng = 0.60 * C + 0.40 * E
 * - Điểm sản phẩm = 0.50 * C + 0.20 * E + 0.30 * U
 * - Kiểm tra đầy đủ điều kiện n, a, chuyên môn, quyền công bố bảng chung, và vi phạm đã kết luận.
 * - Không dùng điểm tổng thiếu dữ liệu thành 0.
 */
export function evaluateCandidateForPeriod(input: {
  targetType: "IDEA" | "PRODUCT"
  targetId: string
  validRatingCountN: number
  avgRatingR: number
  expertCount: number
  avgExpertStars: number | null
  scoreE: number | null
  verifiedAppsCountA?: number
  hasConcludedViolation?: boolean
  isRegisteredForPeriod?: boolean
  isReEntryWithoutImprovement?: boolean
  isAudienceAccessible?: boolean
  ruleParams?: Partial<SlcRuleParameters>
}): CandidateScoreResult {
  const baseParams =
    input.ruleParams?.periodType === "YEARLY"
      ? DEFAULT_YEARLY_RULE_PARAMS
      : DEFAULT_MONTHLY_RULE_PARAMS
  const rules: SlcRuleParameters = { ...baseParams, ...(input.ruleParams ?? {}) }

  const reasons: string[] = []
  const n = input.validRatingCountN
  const R = n > 0 ? input.avgRatingR : 0
  const a = input.verifiedAppsCountA ?? 0

  if (input.isAudienceAccessible === false) {
    reasons.push("Nội dung thuộc phạm vi riêng, chưa công bố cho toàn bộ đối tượng xem bảng vàng")
  }
  if (input.hasConcludedViolation) {
    reasons.push("Có vi phạm đã được kết luận trong kỳ")
  }
  if (input.targetType === "IDEA" && input.isRegisteredForPeriod === false) {
    reasons.push("Ý tưởng chưa đăng ký dự kỳ trước hạn")
  }
  if (input.targetType === "IDEA" && input.isReEntryWithoutImprovement) {
    reasons.push("Ý tưởng dự lại chưa có cải tiến đáng kể được điều phối viên xác nhận")
  }

  const minN = input.targetType === "IDEA" ? rules.minRatingsIdea : rules.minRatingsProduct
  if (n < minN) {
    reasons.push(`Chưa đủ số người đánh giá hợp lệ (${n}/${minN} GV)`)
  }

  if (input.targetType === "PRODUCT" && a < rules.minVerifiedAppsProduct) {
    reasons.push(`Chưa đủ minh chứng áp dụng được xác nhận (${a}/${rules.minVerifiedAppsProduct} GV)`)
  }

  if (input.expertCount < rules.minExpertReviewers || input.scoreE === null) {
    reasons.push(`Chưa đủ điểm chấm chuyên môn độc lập (${input.expertCount}/${rules.minExpertReviewers} chuyên gia)`)
  }

  const scoreC = n > 0 ? computeBayesianScoreC(n, R, rules.bayesianM, rules.bayesianPrior) : 0
  const scoreU = input.targetType === "PRODUCT" ? computeApplicationScoreU(a, rules.capVerifiedApps) : null

  const isEligible = reasons.length === 0 && input.scoreE !== null

  let totalScoreRaw: number | null = null
  if (isEligible && input.scoreE !== null) {
    if (input.targetType === "IDEA") {
      totalScoreRaw = rules.ideaWeightC * scoreC + rules.ideaWeightE * input.scoreE
    } else {
      totalScoreRaw =
        rules.productWeightC * scoreC +
        rules.productWeightE * input.scoreE +
        rules.productWeightU * (scoreU ?? 0)
    }
  }

  return {
    targetType: input.targetType,
    targetId: input.targetId,
    isEligible,
    ineligibleReasons: reasons,
    validRatingCountN: n,
    avgRatingR: R,
    scoreC,
    expertCount: input.expertCount,
    avgExpertStars: input.avgExpertStars,
    scoreE: input.scoreE,
    verifiedAppsCountA: a,
    scoreU,
    totalScoreRaw,
  }
}

export interface RankedCandidate<T extends CandidateScoreResult = CandidateScoreResult> {
  candidate: T
  rank: number | null
  isTied: boolean
}

/**
 * Xếp hạng các đối tượng đủ điều kiện trên Bảng vàng:
 * - Làm tròn chỉ khi hiển thị, KHÔNG làm tròn trước khi xếp hạng.
 * - Đồng điểm chính xác theo độ chính xác lưu trữ:
 *   1. totalScoreRaw cao hơn
 *   2. scoreE cao hơn
 *   3. validRatingCountN (n) nhiều hơn
 *   4. Nếu cả 3 bằng nhau -> đồng hạng cạnh tranh (1, 1, 3).
 * - Các đối tượng chưa đủ điều kiện có rank = null.
 */
export function rankHallOfFameCandidates<T extends CandidateScoreResult>(
  candidates: T[]
): RankedCandidate<T>[] {
  const eligible = candidates.filter((c) => c.isEligible && c.totalScoreRaw !== null)
  const ineligible = candidates.filter((c) => !c.isEligible || c.totalScoreRaw === null)

  const sortedEligible = [...eligible].sort((a, b) => {
    const scoreA = a.totalScoreRaw ?? -1
    const scoreB = b.totalScoreRaw ?? -1
    if (Math.abs(scoreB - scoreA) > EPSILON) {
      return scoreB - scoreA
    }
    const eA = a.scoreE ?? -1
    const eB = b.scoreE ?? -1
    if (Math.abs(eB - eA) > EPSILON) {
      return eB - eA
    }
    if (b.validRatingCountN !== a.validRatingCountN) {
      return b.validRatingCountN - a.validRatingCountN
    }
    return String(a.targetId).localeCompare(String(b.targetId))
  })

  const rankedEligible: RankedCandidate<T>[] = []
  for (let i = 0; i < sortedEligible.length; i++) {
    const curr = sortedEligible[i]
    if (i === 0) {
      rankedEligible.push({ candidate: curr, rank: 1, isTied: false })
      continue
    }
    const prev = sortedEligible[i - 1]
    const sameTotal = Math.abs((curr.totalScoreRaw ?? 0) - (prev.totalScoreRaw ?? 0)) <= EPSILON
    const sameE = Math.abs((curr.scoreE ?? 0) - (prev.scoreE ?? 0)) <= EPSILON
    const sameN = curr.validRatingCountN === prev.validRatingCountN

    if (sameTotal && sameE && sameN) {
      const prevRank = rankedEligible[i - 1].rank ?? i
      rankedEligible[i - 1].isTied = true
      rankedEligible.push({ candidate: curr, rank: prevRank, isTied: true })
    } else {
      // Standard competitive ranking: 1, 1, 3
      rankedEligible.push({ candidate: curr, rank: i + 1, isTied: false })
    }
  }

  const rankedIneligible: RankedCandidate<T>[] = ineligible.map((c) => ({
    candidate: c,
    rank: null,
    isTied: false,
  }))

  return [...rankedEligible, ...rankedIneligible]
}

/**
 * Lọc bảng vàng chung theo Cơ sở, Môn học, Khối lớp nhưng GIỮ NGUYÊN thứ hạng gốc (rank) trên bảng chung,
 * tuyệt đối không tự đánh lại hạng 1, 2, 3 mới dưới tên giải chung.
 */
export function filterRankedCandidatesKeepingOriginalRank<
  T extends CandidateScoreResult & {
    campusId?: string | null
    subjectCodes?: string[]
    gradeLevels?: string[]
  }
>(
  rankedList: RankedCandidate<T>[],
  filters: {
    campusId?: string
    subjectCode?: string
    gradeLevel?: string
  }
): RankedCandidate<T>[] {
  return rankedList.filter(({ candidate }) => {
    if (filters.campusId && filters.campusId !== "ALL") {
      if (candidate.campusId !== filters.campusId) return false
    }
    if (filters.subjectCode && filters.subjectCode !== "ALL") {
      if (!candidate.subjectCodes?.includes(filters.subjectCode)) return false
    }
    if (filters.gradeLevel && filters.gradeLevel !== "ALL") {
      if (!candidate.gradeLevels?.includes(filters.gradeLevel)) return false
    }
    return true
  })
}

/**
 * Làm tròn điểm chỉ để hiển thị trên UI (không dùng trước khi xếp hạng).
 */
export function formatDisplayScore(score: number | null | undefined, decimals = 2): string {
  if (score === null || score === undefined || Number.isNaN(score)) return "—"
  return score.toFixed(decimals).replace(".", ",")
}

/**
 * Tính điểm sắp xếp "Mới đáng khám phá" (Discovery Score) trên Bức tường ý tưởng AI:
 * Ưu tiên nội dung mới đăng và còn ít lượt tiếp cận thực tế (reachCount thấp), không giả mạo lượt xem.
 */
export function computeDiscoveryRankScore(item: {
  publishedAt: Date | string
  reachCount: number
  commentCount: number
  validRatingCount?: number
  nowMs?: number
}): number {
  const now = item.nowMs ?? Date.now()
  const pubMs = new Date(item.publishedAt).getTime()
  const ageHours = Math.max(0, (now - pubMs) / (1000 * 60 * 60))
  // Freshness decays smoothly over 14 days (336 hours)
  const freshness = 100 / (1 + ageHours / 48)
  // Low-reach boost for new items that haven't had many eyes yet
  const exposurePenalty = Math.log2(1 + Math.max(0, item.reachCount)) * 4
  const underReviewedBoost = (item.validRatingCount ?? 0) < 5 ? 18 : 0
  return freshness + underReviewedBoost - exposurePenalty
}

// =============================================================================
// CỘNG ĐỒNG CÙNG SÁNG TẠO — GỢI Ý MỞ ĐẦU, GIỮ NHÁP, ĐẨY BÀI & HÀNH TRÌNH LAN TỎA
// =============================================================================

export interface ContributePieceDraftState {
  postId: string
  contributionType: "METHOD" | "MATERIAL" | "EXPERIMENT" | "SKILL" | "CONNECTION"
  content: string
  links: Array<{ url: string; title?: string }>
  attachments: Array<{
    id?: string
    fileName: string
    fileUrl: string
    mimeType: string
    fileSize: number
    attachmentType?: string
  }>
  mentionedUserIds: string[]
  followPost: boolean
  helpRequestId?: string | null
  updatedAt?: string
}

/**
 * Đổi loại mảnh đóng góp (Một cách làm / Học liệu / Thử nghiệm / Kỹ năng / Kết nối)
 * nhưng giữ nguyên toàn bộ nội dung đang nhập, tệp đính kèm, liên kết và @nhắc tên.
 */
export function preserveDraftStateOnTypeSwitch(
  draft: ContributePieceDraftState,
  nextType: ContributePieceDraftState["contributionType"]
): ContributePieceDraftState {
  return {
    ...draft,
    contributionType: nextType,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Chèn câu gợi ý mở đầu vào ô nhập ở vị trí con trỏ phù hợp,
 * TUYỆT ĐỐI KHÔNG ghi đè nội dung đã viết.
 * Chuẩn hóa dấu ba chấm ("…" hoặc "...") ở cuối câu gợi ý thành khoảng trắng để GV viết tiếp tự nhiên.
 */
export function insertStarterPromptAtCursor(
  currentText: string,
  starterPrompt: string,
  cursorPosition?: number | null
): { text: string; nextCursorPosition: number } {
  const normalizedStarter = starterPrompt.trim().replace(/(?:…|\.{3})+$/, "") + " "
  const baseText = currentText ?? ""

  if (!baseText.trim()) {
    return {
      text: normalizedStarter,
      nextCursorPosition: normalizedStarter.length,
    }
  }

  const pos =
    typeof cursorPosition === "number" && cursorPosition >= 0 && cursorPosition <= baseText.length
      ? cursorPosition
      : baseText.length

  const before = baseText.slice(0, pos)
  const after = baseText.slice(pos)

  const needsLeadingSpace = before.length > 0 && !/\s$/.test(before)
  const prefix = needsLeadingSpace ? " " : ""
  const needsTrailingSpace = after.length > 0 && !/^\s/.test(after) && !/\s$/.test(normalizedStarter)
  const suffix = needsTrailingSpace ? " " : ""

  const inserted = `${prefix}${normalizedStarter}${suffix}`
  const nextText = `${before}${inserted}${after}`
  return {
    text: nextText,
    nextCursorPosition: before.length + inserted.length,
  }
}

export interface SlcPostBumpEvent {
  id: string
  actorId: string
  sourceType: "REACTION" | "COMMENT"
  sourceId: string
  createdAt: string // ISO string
  isActive?: boolean // false if source comment/reaction was deleted or hidden, while keeping history for anti-relike check
}

/**
 * Đánh giá một tương tác mới có được đẩy bài ("Đang sôi nổi") hay không:
 * - Tác giả tự tương tác KHÔNG đẩy bài.
 * - Đổi cảm xúc (isReactionTypeChange), unlike rồi like lại (hasActorEverReactedOnPost),
 *   hoặc sửa comment (isCommentEdit) KHÔNG tạo lần đẩy mới.
 * - Một người với một bài chỉ tạo tối đa 1 lần đẩy trong khoảng cooldownMinutes (mặc định 30 phút).
 */
export function evaluatePostBumpEligibility(input: {
  postAuthorId: string
  actorId: string
  sourceType: "REACTION" | "COMMENT"
  sourceId: string
  now?: Date | string
  cooldownMinutes?: number
  isReactionTypeChange?: boolean
  isCommentEdit?: boolean
  existingBumpEvents?: SlcPostBumpEvent[]
}): {
  shouldBump: boolean
  reason?: string
  updatedBumpEvents: SlcPostBumpEvent[]
  newLastBumpedAt?: Date
} {
  const nowDate = input.now ? new Date(input.now) : new Date()
  const nowMs = nowDate.getTime()
  const cooldownMs = Math.max(1, input.cooldownMinutes ?? 30) * 60 * 1000
  const events = Array.isArray(input.existingBumpEvents) ? [...input.existingBumpEvents] : []

  if (!input.actorId || input.actorId === input.postAuthorId) {
    return {
      shouldBump: false,
      reason: "AUTHOR_SELF_INTERACTION",
      updatedBumpEvents: events,
    }
  }

  if (input.isCommentEdit) {
    return {
      shouldBump: false,
      reason: "COMMENT_EDIT_NO_BUMP",
      updatedBumpEvents: events,
    }
  }

  if (input.isReactionTypeChange) {
    return {
      shouldBump: false,
      reason: "REACTION_TYPE_CHANGE_NO_BUMP",
      updatedBumpEvents: events,
    }
  }

  // Anti unlike-then-relike spam: if this user already created a REACTION bump on this post previously
  // (even if they unliked it later), reliking does not create a new bump.
  if (input.sourceType === "REACTION") {
    const priorReactionBump = events.some(
      (ev) => ev.actorId === input.actorId && ev.sourceType === "REACTION"
    )
    if (priorReactionBump) {
      // Reactivate their original reaction bump event if it matches or keep existing history without creating a fresh bump
      return {
        shouldBump: false,
        reason: "RELIKE_NO_NEW_BUMP",
        updatedBumpEvents: events,
      }
    }
  }

  // Cooldown check: 1 user with 1 post can only create 1 bump within cooldownMinutes (default 30m)
  const hasRecentBumpFromActor = events.some((ev) => {
    if (ev.actorId !== input.actorId) return false
    const evMs = new Date(ev.createdAt).getTime()
    return !Number.isNaN(evMs) && nowMs - evMs < cooldownMs
  })

  if (hasRecentBumpFromActor) {
    return {
      shouldBump: false,
      reason: "COOLDOWN_ACTIVE",
      updatedBumpEvents: events,
    }
  }

  const newEvent: SlcPostBumpEvent = {
    id: `${input.sourceType}_${input.sourceId}_${nowMs}`,
    actorId: input.actorId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    createdAt: nowDate.toISOString(),
    isActive: true,
  }

  const updatedBumpEvents = [...events, newEvent]
  return {
    shouldBump: true,
    updatedBumpEvents,
    newLastBumpedAt: nowDate,
  }
}

/**
 * Khi một bình luận hoặc cảm xúc bị xóa hoặc ẩn kiểm duyệt:
 * Đánh dấu sự kiện đẩy tương ứng là không còn hiệu lực (isActive = false, vẫn giữ lịch sử để chặn unlike-relike)
 * và tính lại lastBumpedAt từ các tương tác hợp lệ còn lại (hoặc quay về publishedAt của bài).
 */
export function recalculatePostLastBumpedAt(input: {
  publishedAt: Date | string
  existingBumpEvents: SlcPostBumpEvent[]
  removedSourceType?: "REACTION" | "COMMENT"
  removedSourceId?: string
  removedReactionActorId?: string
  validActiveCommentIds?: Set<string>
  validActiveReactionUserIds?: Set<string>
}): {
  updatedBumpEvents: SlcPostBumpEvent[]
  lastBumpedAt: Date
} {
  const pubDate = new Date(input.publishedAt)
  const updatedBumpEvents = (input.existingBumpEvents || []).map((ev) => {
    let active = ev.isActive !== false
    if (
      input.removedSourceType &&
      ev.sourceType === input.removedSourceType &&
      input.removedSourceId &&
      ev.sourceId === input.removedSourceId
    ) {
      active = false
    }
    if (
      input.removedSourceType === "REACTION" &&
      ev.sourceType === "REACTION" &&
      input.removedReactionActorId &&
      ev.actorId === input.removedReactionActorId
    ) {
      active = false
    }
    if (ev.sourceType === "COMMENT" && input.validActiveCommentIds) {
      if (!input.validActiveCommentIds.has(ev.sourceId)) {
        active = false
      }
    }
    if (ev.sourceType === "REACTION" && input.validActiveReactionUserIds) {
      if (!input.validActiveReactionUserIds.has(ev.actorId)) {
        active = false
      }
    }
    return { ...ev, isActive: active }
  })

  let maxMs = pubDate.getTime()
  for (const ev of updatedBumpEvents) {
    if (ev.isActive === false) continue
    const t = new Date(ev.createdAt).getTime()
    if (!Number.isNaN(t) && t > maxMs) {
      maxMs = t
    }
  }

  return {
    updatedBumpEvents,
    lastBumpedAt: new Date(maxMs),
  }
}

export interface SlcSpreadJourneyEvent {
  id: string
  stage:
    | "POST_PUBLISHED"
    | "FEEDBACK_RECEIVED"
    | "MOVED_TO_DEVELOPMENT"
    | "VERSION_RELEASED"
    | "APPLICATION_VERIFIED"
    | "OFFICIAL_AWARD"
  title: string
  description: string
  actorName?: string | null
  timestamp: string
  deepLink?: string | null
  badgeLabel: string
}

/**
 * Xây dựng "Hành trình lan tỏa" từ dữ liệu thật của bài đăng (tránh nhập lại hoặc tạo trùng),
 * tôn trọng lựa chọn ẩn tên công khai của người đóng góp và quyền xem bài gốc.
 */
export function buildPostSpreadJourney(input: {
  canViewerAccessPost: boolean
  post: {
    id: string
    title?: string | null
    postType: string
    authorName: string
    publishedAt: Date | string
  }
  comments?: Array<{
    id: string
    authorName: string
    contributionType?: string
    feedbackStatus: string
    feedbackUpdatedAt?: Date | string | null
    linkedProjectId?: string | null
    developmentItemNote?: string | null
    appliedChangeNote?: string | null
    contributorOptOutPublic?: boolean
    createdAt: Date | string
    isDeleted?: boolean
    status?: string
  }>
  productVersions?: Array<{
    id: string
    version: string
    releaseNotes: string
    sourceCommentId?: string | null
    contributorName?: string | null
    contributorOptOutPublic?: boolean
    createdAt: Date | string
  }>
  verifiedApplications?: Array<{
    id: string
    applicantName: string
    campusName?: string | null
    subjectOrTask: string
    verificationStatus: string
    verifiedAt?: Date | string | null
    submittedAt: Date | string
  }>
  officialAwards?: Array<{
    id: string
    periodName: string
    badgeTitle: string
    rank: number
    awardedAt: Date | string
  }>
}): SlcSpreadJourneyEvent[] {
  // Sự kiện không được tiết lộ nội dung vượt quyền bài gốc
  if (!input.canViewerAccessPost) {
    return []
  }

  const events: SlcSpreadJourneyEvent[] = []
  const seenKeys = new Set<string>()

  const pushUnique = (key: string, ev: SlcSpreadJourneyEvent) => {
    if (seenKeys.has(key)) return
    seenKeys.add(key)
    events.push(ev)
  }

  // 1. Ý tưởng / Bài viết được đăng
  const postPubIso = new Date(input.post.publishedAt).toISOString()
  pushUnique(`POST_PUBLISHED_${input.post.id}`, {
    id: `journey_post_${input.post.id}`,
    stage: "POST_PUBLISHED",
    title:
      input.post.postType === "AI_PRODUCT"
        ? "Sản phẩm AI được giới thiệu lên cộng đồng"
        : "Ý tưởng được đăng tải trên Bức tường sáng tạo",
    description: `${input.post.authorName} đã khởi xướng "${input.post.title || "Chia sẻ sáng tạo"}".`,
    actorName: input.post.authorName,
    timestamp: postPubIso,
    deepLink: `/teacher/skyline-connect/posts/${input.post.id}`,
    badgeLabel: "Khởi nguồn",
  })

  // 2. Góp ý được tiếp nhận & 3. Đóng góp được đưa vào phát triển
  for (const c of input.comments || []) {
    if (c.isDeleted || (c.status && c.status !== "ACTIVE")) continue
    const contributorLabel = c.contributorOptOutPublic ? "Một đồng nghiệp Sky-Line" : c.authorName
    const ts = new Date(c.feedbackUpdatedAt || c.createdAt).toISOString()

    if (c.feedbackStatus === "RECEIVED" || c.feedbackStatus === "IN_PROGRESS" || c.feedbackStatus === "APPLIED") {
      pushUnique(`FEEDBACK_RECEIVED_${c.id}`, {
        id: `journey_received_${c.id}`,
        stage: "FEEDBACK_RECEIVED",
        title: "Góp ý được tác giả tiếp nhận",
        description: `Mảnh đóng góp từ ${contributorLabel} đã được ghi nhận.`,
        actorName: contributorLabel,
        timestamp: new Date(c.createdAt).toISOString(),
        deepLink: `/teacher/skyline-connect/posts/${input.post.id}?commentId=${c.id}`,
        badgeLabel: "Đã tiếp nhận",
      })
    }

    if (c.feedbackStatus === "IN_PROGRESS" || c.feedbackStatus === "APPLIED") {
      const devNote = c.developmentItemNote || c.appliedChangeNote
      pushUnique(`MOVED_TO_DEVELOPMENT_${c.id}`, {
        id: `journey_dev_${c.id}`,
        stage: "MOVED_TO_DEVELOPMENT",
        title: "Đóng góp được đưa vào phát triển",
        description: devNote
          ? `Cùng phát triển từ góp ý của ${contributorLabel}: ${devNote}`
          : `Ý kiến của ${contributorLabel} đã được đưa vào hạng mục phát triển.`,
        actorName: contributorLabel,
        timestamp: ts,
        deepLink: `/teacher/skyline-connect/posts/${input.post.id}?commentId=${c.id}`,
        badgeLabel: "Đưa vào phát triển",
      })
    }
  }

  // 4. Phiên bản mới được công bố
  for (const v of input.productVersions || []) {
    const hasCredit = v.contributorName && !v.contributorOptOutPublic
    const creditText = hasCredit
      ? ` (Có đóng góp từ ${v.contributorName})`
      : v.sourceCommentId
        ? " (Có đóng góp từ đồng nghiệp)"
        : ""
    pushUnique(`VERSION_RELEASED_${v.id}`, {
      id: `journey_ver_${v.id}`,
      stage: "VERSION_RELEASED",
      title: `Phiên bản mới v${v.version} được công bố${creditText}`,
      description: v.releaseNotes,
      actorName: hasCredit ? v.contributorName : input.post.authorName,
      timestamp: new Date(v.createdAt).toISOString(),
      deepLink: v.sourceCommentId
        ? `/teacher/skyline-connect/posts/${input.post.id}?commentId=${v.sourceCommentId}`
        : `/teacher/skyline-connect/posts/${input.post.id}`,
      badgeLabel: `Phiên bản v${v.version}`,
    })
  }

  // 5. Trải nghiệm áp dụng được xác nhận
  for (const app of input.verifiedApplications || []) {
    if (app.verificationStatus !== "VERIFIED") continue
    const ts = new Date(app.verifiedAt || app.submittedAt).toISOString()
    pushUnique(`APPLICATION_VERIFIED_${app.id}`, {
      id: `journey_app_${app.id}`,
      stage: "APPLICATION_VERIFIED",
      title: "Trải nghiệm áp dụng thực tế được xác nhận",
      description: `${app.applicantName}${app.campusName ? ` (${app.campusName})` : ""} đã áp dụng vào "${app.subjectOrTask}".`,
      actorName: app.applicantName,
      timestamp: ts,
      deepLink: `/teacher/skyline-connect/posts/${input.post.id}`,
      badgeLabel: "Áp dụng thực tế",
    })
  }

  // 6. Kết quả vinh danh chính thức
  for (const aw of input.officialAwards || []) {
    pushUnique(`OFFICIAL_AWARD_${aw.id}`, {
      id: `journey_award_${aw.id}`,
      stage: "OFFICIAL_AWARD",
      title: `Vinh danh chính thức: ${aw.badgeTitle} (Hạng #${aw.rank})`,
      description: `Được công nhận tại kỳ giải thưởng "${aw.periodName}".`,
      actorName: input.post.authorName,
      timestamp: new Date(aw.awardedAt).toISOString(),
      deepLink: `/teacher/skyline-connect/hall-of-fame`,
      badgeLabel: "Vinh danh",
    })
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

/**
 * Công thức tính điểm sắp xếp "Đang thảo luận" (DISCUSSING) trên Tường chia sẻ:
 * - Lượt thích và bình luận mới hợp lệ giúp bài tăng độ nổi bật.
 * - Có suy giảm theo thời gian (time-decay) theo tuổi của bài và tuổi của từng tương tác.
 * - Giới hạn tác động của tương tác lặp (tối đa 2 sự kiện tính điểm / 1 người dùng trên 1 bài),
 *   loại bỏ hoàn toàn tự tương tác (actorId === authorId) và spam.
 * - Bỏ thích (isActive === false) thu hồi điểm của lượt thích đó, tuyệt đối KHÔNG tạo thêm điểm.
 */
export function computeDiscussionHotScore(input: {
  authorId: string
  publishedAt: Date | string
  bumpEvents?: Array<{
    id?: string
    actorId: string
    sourceType: "REACTION" | "COMMENT"
    sourceId?: string
    createdAt: Date | string
    isActive?: boolean
  }>
  reactionCount?: number
  commentCount?: number
  nowMs?: number
}): number {
  const now = input.nowMs ?? Date.now()
  const pubMs = new Date(input.publishedAt).getTime()
  const postAgeHours = Math.max(0, (now - pubMs) / (1000 * 60 * 60))

  // Base freshness score with time decay
  const baseFreshness = 12 / Math.pow(1 + postAgeHours / 24, 1.25)

  const events = Array.isArray(input.bumpEvents) ? input.bumpEvents : []
  if (events.length === 0) {
    // Fallback if no granular bumpEvents array is present
    const safeReactions = Math.min(20, Math.max(0, Number(input.reactionCount || 0)))
    const safeComments = Math.min(30, Math.max(0, Number(input.commentCount || 0)))
    const fallbackEngagement = safeReactions * 1.5 + safeComments * 3.0
    return Number((baseFreshness + fallbackEngagement / Math.pow(1 + postAgeHours / 18, 1.35)).toFixed(6))
  }

  const actorEventCount = new Map<string, number>()
  let engagementScore = 0

  for (const ev of events) {
    // Unliked / deleted / moderated events have isActive === false -> contribute 0 points
    if (ev.isActive === false) continue
    // Self-interaction never adds points
    if (!ev.actorId || ev.actorId === input.authorId) continue

    // Anti-spam / repeated interaction cap per user per post (max 2 scored interactions per actor)
    const prevCount = actorEventCount.get(ev.actorId) || 0
    if (prevCount >= 2) continue
    actorEventCount.set(ev.actorId, prevCount + 1)

    const evMs = new Date(ev.createdAt).getTime()
    if (Number.isNaN(evMs)) continue
    const evAgeHours = Math.max(0, (now - evMs) / (1000 * 60 * 60))

    // Comments carry higher discussion weight than likes; second interaction by same user has diminishing weight
    const rawWeight = ev.sourceType === "COMMENT" ? 4.0 : 2.0
    const repeatDampener = prevCount === 0 ? 1.0 : 0.4
    const decayedWeight = (rawWeight * repeatDampener) / Math.pow(1 + evAgeHours / 12, 1.35)

    engagementScore += decayedWeight
  }

  return Number((baseFreshness + engagementScore).toFixed(6))
}

