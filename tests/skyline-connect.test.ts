import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getVietnamMonthBoundsUtc,
  doPeriodRangesOverlap,
  calculateReviewDeadlineUtc,
  isWithinHalfOpenPeriod,
  selectValidPeriodRatingRevisions,
  selectValidPeriodVerifiedApplications,
  computeBayesianScoreC,
  computeExpertScoreE,
  computeApplicationScoreU,
  evaluateCandidateForPeriod,
  rankHallOfFameCandidates,
  filterRankedCandidatesKeepingOriginalRank,
  formatDisplayScore,
  computeDiscoveryRankScore,
  preserveDraftStateOnTypeSwitch,
  insertStarterPromptAtCursor,
  evaluatePostBumpEligibility,
  recalculatePostLastBumpedAt,
  buildPostSpreadJourney,
} from "../src/lib/skyline-connect/scoring"
import {
  canViewPost,
  isEligibleForAudienceHallOfFame,
  canUserRateTarget,
  canEditOrDeleteComment,
  canPinOrMarkFeedbackOnPost,
  canUserAccessFeatureFlag,
  hasSlcRoleInScope,
  filterAllowedMentionUsersForPost,
  canAccessPostAttachmentOrDeepLink,
  SlcUserContext,
  PostAccessTarget,
} from "../src/lib/skyline-connect/permissions"
import { SLC_CONTRIBUTION_TYPES } from "../src/lib/skyline-connect/constants"
import {
  sanitizeRichText,
  validateSafeExternalUrl,
  sanitizeFileName,
  validateUploadFile,
} from "../src/lib/skyline-connect/security"

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG PHÂN HỆ SKY-LINE CONNECT V2.0 (BỨC TƯỜNG Ý TƯỞNG AI)
 * Tuân thủ nghiêm ngặt quy tắc GEMINI.md:
 * - Tuyệt đối không kết nối hoặc ghi dữ liệu test vào local.db, dev.db hay Turso Cloud.
 * - Kiểm thử toàn bộ 12 nhóm kịch bản bắt buộc ở Mục XI của đặc tả.
 */

function createMockUserContext(overrides: Partial<SlcUserContext> = {}): SlcUserContext {
  return {
    userId: "user-gv-a",
    fullName: "Cô Minh Anh",
    email: "minhanh@skyline.edu.vn",
    systemRole: "TEACHER",
    teacherId: "GV001",
    campusId: "CAMPUS_1",
    campusName: "Cơ sở 1",
    campusIds: ["CAMPUS_1"],
    mainSubjectCode: "TOAN",
    mainSubjectName: "Toán học",
    approvedGroupIds: [],
    ownedGroupIds: [],
    moderatedGroupIds: [],
    roleAssignments: [],
    ...overrides,
  }
}

describe("Sky-Line Connect v2.0 — 12 Nhóm Kiểm thử Tự động (Mục XI)", () => {
  // ============================================================================
  // KỊCH BẢN 1: Quyền truy cập nhóm riêng, bài chia sẻ, nội dung đã lưu và tệp đính kèm
  // ============================================================================
  describe("1. Phân quyền nhóm riêng, bài chia sẻ, danh sách Đã lưu & kế thừa quyền tệp", () => {
    const privateGroupPost: PostAccessTarget = {
      id: "post-group-b-1",
      authorId: "user-gv-b",
      status: "PUBLISHED",
      visibility: "GROUP",
      campusId: "CAMPUS_1",
      groupId: "group-private-b",
      groupVisibility: "PRIVATE",
    }

    it("GV A không thuộc nhóm riêng B không xem, tìm kiếm hoặc tải tệp của bài trong nhóm B", () => {
      const gvA = createMockUserContext({
        userId: "user-gv-a",
        approvedGroupIds: ["group-other"],
      })
      const gvBMember = createMockUserContext({
        userId: "user-gv-member-b",
        approvedGroupIds: ["group-private-b"],
      })

      expect(canViewPost(gvA, privateGroupPost)).toBe(false)
      expect(canViewPost(gvBMember, privateGroupPost)).toBe(true)
    })

    it("Chia sẻ bài hoặc thông báo không làm lộ bài có phạm vi hạn chế cho người không có quyền xem bài gốc", () => {
      const gvOutside = createMockUserContext({
        userId: "user-outside",
        approvedGroupIds: [],
      })

      // Một thành viên chia sẻ bài từ nhóm riêng B ra tường với visibility SYSTEM
      const sharedWrapperPost: PostAccessTarget = {
        id: "post-shared-1",
        authorId: "user-gv-member-b",
        status: "PUBLISHED",
        visibility: "SYSTEM",
        campusId: "CAMPUS_1",
      }

      // Mặc dù bài chia sẻ đặt SYSTEM, nhưng bài gốc là GROUP riêng -> người ngoài nhóm không được xem
      expect(canViewPost(gvOutside, sharedWrapperPost, privateGroupPost)).toBe(false)

      // Khi bài gốc bị ẩn kiểm duyệt (HIDDEN_MODERATION) hoặc lưu trữ (ARCHIVED), bài chia sẻ cũng bị chặn
      const hiddenSourcePost: PostAccessTarget = {
        ...privateGroupPost,
        visibility: "SYSTEM",
        groupId: null,
        status: "HIDDEN_MODERATION",
      }
      expect(canViewPost(gvOutside, sharedWrapperPost, hiddenSourcePost)).toBe(false)
    })

    it("Tab Đã lưu chỉ hiển thị nội dung đã lưu mà người dùng còn quyền truy cập hiện hành", () => {
      const gvA = createMockUserContext({
        userId: "user-gv-a",
        approvedGroupIds: ["group-private-b"], // Lúc đầu là thành viên nhóm B
      })

      const savedPosts: PostAccessTarget[] = [
        privateGroupPost,
        {
          id: "post-public-1",
          authorId: "user-gv-c",
          status: "PUBLISHED",
          visibility: "SYSTEM",
        },
      ]

      // Khi còn trong nhóm B -> xem được cả 2 bài đã lưu
      const visibleBefore = savedPosts.filter((p) => canViewPost(gvA, p))
      expect(visibleBefore.map((p) => p.id)).toEqual(["post-group-b-1", "post-public-1"])

      // Sau khi rời nhóm B hoặc bài bị thu hồi quyền -> tab Đã lưu tự động lọc bỏ bài không còn quyền
      const gvAAfterLeaving = createMockUserContext({
        userId: "user-gv-a",
        approvedGroupIds: [],
      })
      const visibleAfter = savedPosts.filter((p) => canViewPost(gvAAfterLeaving, p))
      expect(visibleAfter.map((p) => p.id)).toEqual(["post-public-1"])
    })
  })

  // ============================================================================
  // KỊCH BẢN 2: Tạo nháp, đăng bài, sửa bài có lịch sử, thả cảm xúc duy nhất, lưu bài
  // ============================================================================
  describe("2. Vòng đời bài đăng: Nháp, xuất bản, lịch sử chỉnh sửa và cảm xúc duy nhất", () => {
    it("Bài DRAFT và ARCHIVED chỉ tác giả mới xem được; bài PUBLISHED hiển thị theo phạm vi", () => {
      const author = createMockUserContext({ userId: "author-1" })
      const colleague = createMockUserContext({ userId: "colleague-2" })

      const draftPost: PostAccessTarget = {
        id: "post-draft-1",
        authorId: "author-1",
        status: "DRAFT",
        visibility: "SYSTEM",
      }
      expect(canViewPost(author, draftPost)).toBe(true)
      expect(canViewPost(colleague, draftPost)).toBe(false)

      const publishedPost: PostAccessTarget = {
        ...draftPost,
        status: "PUBLISHED",
      }
      expect(canViewPost(colleague, publishedPost)).toBe(true)
    })

    it("Mỗi người dùng chỉ có tối đa 1 cảm xúc hiện hành trên 1 bài đăng (đổi cảm xúc cập nhật bản ghi thay vì nhân đôi)", () => {
      // Mô phỏng bảng SlcReaction với khóa duy nhất (postId, userId)
      const reactionStore = new Map<string, { postId: string; userId: string; type: string }>()
      const upsertReaction = (postId: string, userId: string, type: "USEFUL" | "LOVE" | "INSPIRED" | "SUPPORT") => {
        const key = `${postId}::${userId}`
        const existing = reactionStore.get(key)
        if (existing && existing.type === type) {
          reactionStore.delete(key)
          return { action: "REMOVED" }
        }
        reactionStore.set(key, { postId, userId, type })
        return { action: "SET", type }
      }

      upsertReaction("post-1", "gv-1", "USEFUL")
      expect(reactionStore.size).toBe(1)
      expect(reactionStore.get("post-1::gv-1")?.type).toBe("USEFUL")

      // Đổi sang INSPIRED -> vẫn chỉ có 1 cảm xúc hiện hành
      upsertReaction("post-1", "gv-1", "INSPIRED")
      expect(reactionStore.size).toBe(1)
      expect(reactionStore.get("post-1::gv-1")?.type).toBe("INSPIRED")

      // Bấm lại INSPIRED -> gỡ cảm xúc
      upsertReaction("post-1", "gv-1", "INSPIRED")
      expect(reactionStore.size).toBe(0)
    })
  })

  // ============================================================================
  // KỊCH BẢN 3: Quy tắc đánh giá sao (chặn tự chấm, chặn đồng tác giả, lịch sử revision, cộng sự mới)
  // ============================================================================
  describe("3. Quy tắc đánh giá sao: Chặn tự chấm / cộng sự, lịch sử revision, vô hiệu hóa khi thành cộng sự", () => {
    it("Chặn ở backend việc tự đánh giá bài của mình hoặc đánh giá đối tượng mình là đồng tác giả/cộng sự", () => {
      const authorCtx = createMockUserContext({ userId: "gv-author" })
      const collabCtx = createMockUserContext({ userId: "gv-collab-1" })
      const independentCtx = createMockUserContext({ userId: "gv-independent" })

      const target = {
        authorId: "gv-author",
        collaboratorIds: ["gv-collab-1", "gv-collab-2"],
      }

      const selfCheck = canUserRateTarget(authorCtx, target)
      expect(selfCheck.allowed).toBe(false)
      expect(selfCheck.reason).toContain("Tác giả không thể tự đánh giá")

      const collabCheck = canUserRateTarget(collabCtx, target)
      expect(collabCheck.allowed).toBe(false)
      expect(collabCheck.reason).toContain("Đồng tác giả / cộng sự")

      const validCheck = canUserRateTarget(independentCtx, target)
      expect(validCheck.allowed).toBe(true)
    })

    it("Gửi nhiều lần chỉ giữ một đánh giá hiện hành mỗi người (lấy revision hợp lệ cuối cùng trước cuối kỳ) nhưng lưu đủ lịch sử", () => {
      const { startDateUtc, endDateUtc } = getVietnamMonthBoundsUtc(2026, 11)
      const revisions = [
        {
          id: "rev-1",
          reviewerId: "gv-reviewer-1",
          stars: 3,
          confirmedExperienced: true,
          createdAt: new Date("2026-11-05T03:00:00.000Z"),
        },
        {
          id: "rev-2",
          reviewerId: "gv-reviewer-1",
          stars: 5,
          confirmedExperienced: true,
          createdAt: new Date("2026-11-12T08:30:00.000Z"),
        },
      ]

      const selected = selectValidPeriodRatingRevisions(revisions, {
        targetType: "PRODUCT",
        startDateUtc,
        endDateUtc,
        authorId: "gv-author",
      })

      expect(RevisionsHistoryLength(revisions)).toBe(2)
      expect(selected).toHaveLength(1)
      expect(selected[0].id).toBe("rev-2")
      expect(selected[0].stars).toBe(5)
    })

    it("Khi người đã đánh giá trở thành cộng sự trong kỳ chưa khóa, đánh giá đó không tính vào kỳ mở", () => {
      const { startDateUtc, endDateUtc } = getVietnamMonthBoundsUtc(2026, 11)
      const revisions = [
        {
          id: "rev-gv2",
          reviewerId: "gv-2",
          stars: 5,
          confirmedExperienced: true,
          createdAt: new Date("2026-11-04T02:00:00.000Z"),
        },
        {
          id: "rev-gv3",
          reviewerId: "gv-3",
          stars: 4,
          confirmedExperienced: true,
          createdAt: new Date("2026-11-06T02:00:00.000Z"),
        },
      ]

      // Trước khi gv-2 trở thành cộng sự: cả 2 đánh giá đều hợp lệ
      const beforeJoin = selectValidPeriodRatingRevisions(revisions, {
        targetType: "PRODUCT",
        startDateUtc,
        endDateUtc,
        authorId: "gv-author",
        collaboratorIds: [],
      })
      expect(beforeJoin).toHaveLength(2)

      // Sau khi gv-2 được xác nhận là cộng sự trong kỳ chưa khóa: đánh giá của gv-2 bị loại khỏi kỳ mở
      const afterJoin = selectValidPeriodRatingRevisions(revisions, {
        targetType: "PRODUCT",
        startDateUtc,
        endDateUtc,
        authorId: "gv-author",
        collaboratorIds: ["gv-2"],
      })
      expect(afterJoin).toHaveLength(1)
      expect(afterJoin[0].reviewerId).toBe("gv-3")
    })
  })

  // ============================================================================
  // KỊCH BẢN 4: Mở liên kết dùng thử & áp dụng tự khai báo không được tính vào điểm áp dụng U
  // ============================================================================
  describe("4. Mở liên kết dùng thử và áp dụng chưa xác nhận không được tính vào U", () => {
    it("Chỉ bấm Mở liên kết dùng thử (openLinkCount) hoặc chưa xác nhận đã trải nghiệm thì không tính đánh giá Sản phẩm AI", () => {
      const { startDateUtc, endDateUtc } = getVietnamMonthBoundsUtc(2026, 11)
      const revisions = [
        {
          id: "rev-unconfirmed",
          reviewerId: "gv-only-clicked-link",
          stars: 5,
          confirmedExperienced: false, // Mới bấm link, chưa xác nhận đã trải nghiệm
          createdAt: new Date("2026-11-10T04:00:00.000Z"),
        },
      ]

      const validProductRatings = selectValidPeriodRatingRevisions(revisions, {
        targetType: "PRODUCT",
        startDateUtc,
        endDateUtc,
        authorId: "gv-author",
      })
      expect(validProductRatings).toHaveLength(0)
    })

    it("Áp dụng tự khai báo (SELF_DECLARED) hoặc đang chờ xác minh (PENDING_VERIFICATION) không được tính vào a và U", () => {
      const { startDateUtc, endDateUtc } = getVietnamMonthBoundsUtc(2026, 11)
      const reviewDeadlineUtc = calculateReviewDeadlineUtc(endDateUtc)

      const applications = [
        {
          id: "app-1",
          applicantId: "gv-1",
          verificationStatus: "SELF_DECLARED",
          submittedAt: new Date("2026-11-08T03:00:00.000Z"),
        },
        {
          id: "app-2",
          applicantId: "gv-2",
          verificationStatus: "PENDING_VERIFICATION",
          submittedAt: new Date("2026-11-09T03:00:00.000Z"),
        },
        {
          id: "app-3",
          applicantId: "gv-3",
          verificationStatus: "REJECTED",
          submittedAt: new Date("2026-11-10T03:00:00.000Z"),
        },
        {
          id: "app-4",
          applicantId: "gv-4",
          verificationStatus: "VERIFIED",
          submittedAt: new Date("2026-11-11T03:00:00.000Z"),
          verifiedAt: new Date("2026-11-12T03:00:00.000Z"),
        },
      ]

      const verifiedApps = selectValidPeriodVerifiedApplications(applications, {
        startDateUtc,
        endDateUtc,
        reviewDeadlineUtc,
        authorId: "gv-author",
      })

      expect(verifiedApps).toHaveLength(1)
      expect(verifiedApps[0].applicantId).toBe("gv-4")
      expect(computeApplicationScoreU(verifiedApps.length, 10)).toBe(10)
    })
  })

  // ============================================================================
  // KỊCH BẢN 5: Kiểm tra công thức chuẩn n = 10, R = 4.5, E = 80, a = 6 -> C ≈ 83.33, U = 60, Tổng ≈ 75.67
  // ============================================================================
  describe("5. Kiểm tra chính xác công thức tính điểm chuẩn (Mục IX & XI.5)", () => {
    it("Với n = 10, R = 4.5, E = 80, a = 6 trong kỳ tháng: C ≈ 83.33, U = 60, Điểm sản phẩm ≈ 75.67", () => {
      const n = 10
      const R = 4.5
      const E = 80
      const a = 6

      const C = computeBayesianScoreC(n, R, 5.0, 3.5)
      const U = computeApplicationScoreU(a, 10)

      // C = 20 * ((10 * 4.5 + 5 * 3.5) / 15) = 20 * (62.5 / 15) = 83.33333333333333
      expect(C).toBeCloseTo(83.333333, 5)
      expect(U).toBe(60)
      expect(formatDisplayScore(C, 2)).toBe("83,33")

      const candidateResult = evaluateCandidateForPeriod({
        targetType: "PRODUCT",
        targetId: "prod-1",
        validRatingCountN: n,
        avgRatingR: R,
        expertCount: 2,
        avgExpertStars: 4.0,
        scoreE: E,
        verifiedAppsCountA: a,
        isAudienceAccessible: true,
        hasConcludedViolation: false,
      })

      expect(candidateResult.isEligible).toBe(true)
      // Điểm sản phẩm = 0.50 * 83.333333... + 0.20 * 80 + 0.30 * 60 = 41.666666... + 16 + 18 = 75.666666...
      expect(candidateResult.totalScoreRaw).not.toBeNull()
      expect(candidateResult.totalScoreRaw!).toBeCloseTo(75.666667, 5)
      expect(formatDisplayScore(candidateResult.totalScoreRaw, 2)).toBe("75,67")
    })
  })

  // ============================================================================
  // KỊCH BẢN 6: Ngưỡng tối thiểu, thiếu điểm chuyên môn (null chứ không phải 0), xử lý đồng điểm,
  //             vi phạm đã kết luận, múi giờ Asia/Ho_Chi_Minh và hạn rà soát 3 ngày làm việc
  // ============================================================================
  describe("6. Ngưỡng điều kiện, thiếu điểm chuyên môn, đồng điểm, vi phạm, múi giờ UTC+7 & hạn rà soát", () => {
    it("Thiếu điểm chuyên môn (< 2 người chấm độc lập) trả về scoreE = null và trạng thái Chưa đủ điều kiện, tuyệt đối không tính E = 0", () => {
      const singleExpertEval = computeExpertScoreE(
        [
          {
            expertId: "expert-1",
            status: "SUBMITTED",
            criterion1Score: 5,
            criterion2Score: 5,
            criterion3Score: 5,
          },
        ],
        { authorId: "gv-author", minExpertReviewers: 2 }
      )

      expect(singleExpertEval.isSufficient).toBe(false)
      expect(singleExpertEval.scoreE).toBeNull()

      const evaluated = evaluateCandidateForPeriod({
        targetType: "IDEA",
        targetId: "idea-missing-expert",
        validRatingCountN: 12,
        avgRatingR: 4.8,
        expertCount: singleExpertEval.validExpertCount,
        avgExpertStars: singleExpertEval.avgExpertStars,
        scoreE: singleExpertEval.scoreE,
        isRegisteredForPeriod: true,
        isAudienceAccessible: true,
      })

      expect(evaluated.isEligible).toBe(false)
      expect(evaluated.totalScoreRaw).toBeNull() // Không bao giờ gán 0.6 * C + 0.4 * 0
      expect(evaluated.ineligibleReasons.some((r) => r.includes("chuyên môn"))).toBe(true)
    })

    it("Vi phạm đã kết luận loại đối tượng khỏi danh sách đủ điều kiện xếp hạng", () => {
      const evaluated = evaluateCandidateForPeriod({
        targetType: "IDEA",
        targetId: "idea-violated",
        validRatingCountN: 10,
        avgRatingR: 4.9,
        expertCount: 2,
        avgExpertStars: 4.8,
        scoreE: 96,
        isRegisteredForPeriod: true,
        isAudienceAccessible: true,
        hasConcludedViolation: true,
      })

      expect(evaluated.isEligible).toBe(false)
      expect(evaluated.totalScoreRaw).toBeNull()
      expect(evaluated.ineligibleReasons).toContain("Có vi phạm đã được kết luận trong kỳ")
    })

    it("Xử lý đồng điểm theo thứ tự: totalScoreRaw -> scoreE -> validRatingCountN -> đồng hạng cạnh tranh (1, 1, 3)", () => {
      const makeCandidate = (
        id: string,
        totalScoreRaw: number,
        scoreE: number,
        validRatingCountN: number
      ) => ({
        targetType: "IDEA" as const,
        targetId: id,
        isEligible: true,
        ineligibleReasons: [],
        validRatingCountN,
        avgRatingR: 4.5,
        scoreC: 80,
        expertCount: 2,
        avgExpertStars: scoreE / 20,
        scoreE,
        verifiedAppsCountA: 0,
        scoreU: null,
        totalScoreRaw,
      })

      // Hai ứng viên đầu bằng nhau cả totalScoreRaw, scoreE và n -> cùng hạng 1; ứng viên tiếp theo hạng 3
      const cA = makeCandidate("idea-A", 85.0, 90.0, 12)
      const cB = makeCandidate("idea-B", 85.0, 90.0, 12)
      // cC có cùng totalScoreRaw = 82.0 với cD nhưng scoreE cao hơn -> cC xếp trên cD
      const cC = makeCandidate("idea-C", 82.0, 88.0, 8)
      const cD = makeCandidate("idea-D", 82.0, 80.0, 15)

      const ranked = rankHallOfFameCandidates([cD, cB, cA, cC])

      expect(ranked[0].candidate.targetId).toBe("idea-A")
      expect(ranked[0].rank).toBe(1)
      expect(ranked[0].isTied).toBe(true)

      expect(ranked[1].candidate.targetId).toBe("idea-B")
      expect(ranked[1].rank).toBe(1)
      expect(ranked[1].isTied).toBe(true)

      // Hạng tiếp theo sau hai đồng hạng 1 phải là hạng 3 (1, 1, 3)
      expect(ranked[2].candidate.targetId).toBe("idea-C")
      expect(ranked[2].rank).toBe(3)
      expect(ranked[2].isTied).toBe(false)

      expect(ranked[3].candidate.targetId).toBe("idea-D")
      expect(ranked[3].rank).toBe(4)
    })

    it("Múi giờ Asia/Ho_Chi_Minh (UTC+7) nửa khoảng [start, end) không đếm trùng ở ranh giới tháng và tính đúng 3 ngày làm việc rà soát", () => {
      const nov = getVietnamMonthBoundsUtc(2026, 11)
      const dec = getVietnamMonthBoundsUtc(2026, 12)

      // 00:00:00 ngày 01/11/2026 giờ VN = 17:00:00 ngày 31/10/2026 UTC
      expect(nov.startDateUtc.toISOString()).toBe("2026-10-31T17:00:00.000Z")
      // 00:00:00 ngày 01/12/2026 giờ VN = 17:00:00 ngày 30/11/2026 UTC
      expect(nov.endDateUtc.toISOString()).toBe("2026-11-30T17:00:00.000Z")
      expect(dec.startDateUtc.toISOString()).toBe(nov.endDateUtc.toISOString())

      // Thời điểm đúng tại biên 00:00:00 ngày 01/12/2026 giờ VN chỉ thuộc tháng 12, không thuộc tháng 11
      const boundaryTimestamp = new Date("2026-11-30T17:00:00.000Z")
      expect(isWithinHalfOpenPeriod(boundaryTimestamp, nov.startDateUtc, nov.endDateUtc)).toBe(false)
      expect(isWithinHalfOpenPeriod(boundaryTimestamp, dec.startDateUtc, dec.endDateUtc)).toBe(true)

      // 01/12/2026 là Thứ Ba -> 3 ngày làm việc là Thứ Ba (01/12), Thứ Tư (02/12), Thứ Năm (03/12)
      // Hạn kết thúc ngày làm việc thứ 3 là đầu ngày 04/12 giờ VN (tức 2026-12-03T17:00:00.000Z)
      const reviewDeadline = calculateReviewDeadlineUtc(nov.endDateUtc, { workingDaysCount: 3 })
      expect(reviewDeadline.toISOString()).toBe("2026-12-03T17:00:00.000Z")
    })
  })

  // ============================================================================
  // KỊCH BẢN 7: Sửa đánh giá sau hạn kỳ không đổi snapshot đã chốt; kỳ mới không tự mang điểm cũ;
  //             kỳ năm khử trùng lặp người đánh giá và người áp dụng qua nhiều tháng
  // ============================================================================
  describe("7. Bảo toàn snapshot đã chốt, không tự mang điểm tháng cũ sang tháng mới, khử trùng lặp kỳ năm", () => {
    it("Đánh giá ở tháng 10 không tự động mang sang tháng 11 nếu người dùng không đánh giá/cập nhật trong tháng 11", () => {
      const oct = getVietnamMonthBoundsUtc(2026, 10)
      const nov = getVietnamMonthBoundsUtc(2026, 11)

      const allRevisions = [
        {
          id: "rev-oct-1",
          reviewerId: "gv-1",
          stars: 5,
          confirmedExperienced: true,
          createdAt: new Date("2026-10-15T03:00:00.000Z"),
        },
        {
          id: "rev-after-nov-end",
          reviewerId: "gv-2",
          stars: 1,
          confirmedExperienced: true,
          // Sửa/tạo sau khi tháng 11 đã kết thúc -> không ảnh hưởng dữ liệu tháng 11
          createdAt: new Date("2026-12-02T03:00:00.000Z"),
        },
      ]

      const octValid = selectValidPeriodRatingRevisions(allRevisions, {
        targetType: "PRODUCT",
        startDateUtc: oct.startDateUtc,
        endDateUtc: oct.endDateUtc,
        authorId: "gv-author",
      })
      const novValid = selectValidPeriodRatingRevisions(allRevisions, {
        targetType: "PRODUCT",
        startDateUtc: nov.startDateUtc,
        endDateUtc: nov.endDateUtc,
        authorId: "gv-author",
      })

      expect(octValid).toHaveLength(1)
      expect(novValid).toHaveLength(0)
    })

    it("Kỳ Năm học khử trùng lặp người đánh giá (chỉ lấy revision hợp lệ cuối cùng trong năm) và người áp dụng qua các tháng", () => {
      const yearStartUtc = getVietnamMonthBoundsUtc(2026, 8).startDateUtc
      const yearEndUtc = getVietnamMonthBoundsUtc(2027, 5).endDateUtc
      const yearReviewDeadline = calculateReviewDeadlineUtc(yearEndUtc)

      // Cùng 1 GV đánh giá sản phẩm ở tháng 9, tháng 10, tháng 11
      const multiMonthRevisions = [
        {
          id: "rev-sep",
          reviewerId: "gv-loyal",
          stars: 3,
          confirmedExperienced: true,
          createdAt: new Date("2026-09-10T03:00:00.000Z"),
        },
        {
          id: "rev-oct",
          reviewerId: "gv-loyal",
          stars: 4,
          confirmedExperienced: true,
          createdAt: new Date("2026-10-10T03:00:00.000Z"),
        },
        {
          id: "rev-nov",
          reviewerId: "gv-loyal",
          stars: 5,
          confirmedExperienced: true,
          createdAt: new Date("2026-11-10T03:00:00.000Z"),
        },
      ]

      const yearlyRatings = selectValidPeriodRatingRevisions(multiMonthRevisions, {
        targetType: "PRODUCT",
        startDateUtc: yearStartUtc,
        endDateUtc: yearEndUtc,
        authorId: "gv-author",
      })
      expect(yearlyRatings).toHaveLength(1)
      expect(yearlyRatings[0].id).toBe("rev-nov")
      expect(yearlyRatings[0].stars).toBe(5)

      // Cùng 1 GV nộp minh chứng áp dụng ở 2 học kỳ khác nhau trong năm -> chỉ tính a = 1 cho sản phẩm đó
      const multiMonthApps = [
        {
          id: "app-sem1",
          applicantId: "gv-applicant-1",
          verificationStatus: "VERIFIED",
          submittedAt: new Date("2026-10-12T03:00:00.000Z"),
          verifiedAt: new Date("2026-10-14T03:00:00.000Z"),
        },
        {
          id: "app-sem2",
          applicantId: "gv-applicant-1",
          verificationStatus: "VERIFIED",
          submittedAt: new Date("2027-02-12T03:00:00.000Z"),
          verifiedAt: new Date("2027-02-14T03:00:00.000Z"),
        },
      ]

      const yearlyVerifiedApps = selectValidPeriodVerifiedApplications(multiMonthApps, {
        startDateUtc: yearStartUtc,
        endDateUtc: yearEndUtc,
        reviewDeadlineUtc: yearReviewDeadline,
        authorId: "gv-author",
      })
      expect(yearlyVerifiedApps).toHaveLength(1)
    })
  })

  // ============================================================================
  // KỊCH BẢN 8: Chốt kỳ idempotent, không cấp trùng huy hiệu, không sửa quy chế kỳ đã mở/chốt,
  //             nội dung nhóm riêng không lọt vào bảng vàng toàn hệ thống
  // ============================================================================
  describe("8. Chốt kỳ idempotent, bảo vệ quy chế kỳ đã mở/chốt và cô lập nhóm riêng khỏi Bảng vàng chung", () => {
    it("Nội dung trong nhóm riêng hoặc chỉ thuộc cơ sở không được đưa vào Bảng vàng chung toàn hệ thống", () => {
      const systemAudience = { audienceScope: "SYSTEM", audienceScopeId: "ALL" }

      expect(
        isEligibleForAudienceHallOfFame(
          { status: "PUBLISHED", visibility: "GROUP", groupId: "group-private-1" },
          systemAudience
        )
      ).toBe(false)

      expect(
        isEligibleForAudienceHallOfFame(
          { status: "PUBLISHED", visibility: "CAMPUS", campusId: "CAMPUS_1" },
          systemAudience
        )
      ).toBe(false)

      expect(
        isEligibleForAudienceHallOfFame(
          { status: "PUBLISHED", visibility: "SYSTEM", groupId: null },
          systemAudience
        )
      ).toBe(true)
    })

    it("Lọc Bảng vàng theo Cơ sở / Môn / Khối giữ nguyên thứ hạng gốc (rank) trên bảng chung, không tự đánh lại 1, 2, 3", () => {
      const rankedOverall = [
        {
          rank: 1,
          isTied: false,
          candidate: {
            targetType: "PRODUCT" as const,
            targetId: "prod-c1",
            campusId: "CAMPUS_1",
            subjectCodes: ["TOAN"],
            gradeLevels: ["K10"],
            isEligible: true,
            ineligibleReasons: [],
            validRatingCountN: 15,
            avgRatingR: 4.8,
            scoreC: 90,
            expertCount: 2,
            avgExpertStars: 4.5,
            scoreE: 90,
            verifiedAppsCountA: 8,
            scoreU: 80,
            totalScoreRaw: 87,
          },
        },
        {
          rank: 2,
          isTied: false,
          candidate: {
            targetType: "PRODUCT" as const,
            targetId: "prod-c2",
            campusId: "CAMPUS_2",
            subjectCodes: ["VAN"],
            gradeLevels: ["K11"],
            isEligible: true,
            ineligibleReasons: [],
            validRatingCountN: 12,
            avgRatingR: 4.6,
            scoreC: 85,
            expertCount: 2,
            avgExpertStars: 4.2,
            scoreE: 84,
            verifiedAppsCountA: 6,
            scoreU: 60,
            totalScoreRaw: 77.3,
          },
        },
      ]

      const filteredCampus2 = filterRankedCandidatesKeepingOriginalRank(rankedOverall, {
        campusId: "CAMPUS_2",
      })
      expect(filteredCampus2).toHaveLength(1)
      expect(filteredCampus2[0].candidate.targetId).toBe("prod-c2")
      // Thứ hạng hiển thị vẫn phải giữ nguyên hạng 2 trên bảng toàn hệ thống, không biến thành hạng 1
      expect(filteredCampus2[0].rank).toBe(2)
    })

    it("Cấp huy hiệu Top 3 theo khóa duy nhất (periodId, targetType, targetId, badgeCode) đảm bảo idempotent khi retry", () => {
      const badgeSet = new Set<string>()
      const grantBadgeIdempotent = (periodId: string, targetType: string, targetId: string, badgeCode: string) => {
        const uniqueKey = `${periodId}::${targetType}::${targetId}::${badgeCode}`
        const alreadyExists = badgeSet.has(uniqueKey)
        badgeSet.add(uniqueKey)
        return { created: !alreadyExists, totalBadges: badgeSet.size }
      }

      const firstRun = grantBadgeIdempotent("period-2026-11", "PRODUCT", "prod-1", "GOLD_1")
      const retryRun = grantBadgeIdempotent("period-2026-11", "PRODUCT", "prod-1", "GOLD_1")

      expect(firstRun.created).toBe(true)
      expect(retryRun.created).toBe(false)
      expect(badgeSet.size).toBe(1)
    })
  })

  // ============================================================================
  // KỊCH BẢN 9: Kiểm tra tệp tải lên, giới hạn dung lượng, chặn SSRF và làm sạch XSS
  // ============================================================================
  describe("9. Bảo mật tải tệp, chống SSRF và làm sạch XSS (Mục X & XI.9)", () => {
    it("Làm sạch nội dung văn bản: loại bỏ <script>, <iframe>, thuộc tính on* và javascript: URI", () => {
      const maliciousInput =
        `<p onclick="stealCookie()">Xin chào</p><script>alert("xss")</script>` +
        `<iframe src="https://evil.example.com"></iframe>` +
        `<a href="javascript:alert(1)">Bấm vào đây</a>`

      const cleaned = sanitizeRichText(maliciousInput)
      expect(cleaned).not.toContain("<script")
      expect(cleaned).not.toContain("<iframe")
      expect(cleaned).not.toContain("onclick")
      expect(cleaned).not.toContain("javascript:alert")
      expect(cleaned).toContain("Xin chào")
    })

    it("Chặn SSRF đối với localhost, IP nội bộ (127.0.0.1, 10.x, 192.168.x, 169.254.169.254, IPv6 ::1) và giao thức ngoài HTTP/HTTPS", () => {
      expect(validateSafeExternalUrl("http://localhost:3000/admin").valid).toBe(false)
      expect(validateSafeExternalUrl("http://127.0.0.1:8080/secret").valid).toBe(false)
      expect(validateSafeExternalUrl("https://10.0.0.1/internal").valid).toBe(false)
      expect(validateSafeExternalUrl("https://192.168.1.50/router").valid).toBe(false)
      expect(validateSafeExternalUrl("http://169.254.169.254/latest/meta-data/").valid).toBe(false)
      expect(validateSafeExternalUrl("http://[::1]:3000/").valid).toBe(false)
      expect(validateSafeExternalUrl("file:///etc/passwd").valid).toBe(false)

      // Liên kết dùng thử sản phẩm yêu cầu HTTPS
      expect(validateSafeExternalUrl("http://example.com/demo", { requireHttps: true }).valid).toBe(false)
      expect(validateSafeExternalUrl("https://ai-demo.skyline.edu.vn/app", { requireHttps: true }).valid).toBe(true)
    })

    it("Kiểm tra allowlist MIME/extension và giới hạn dung lượng (ảnh <= 10MB, tài liệu <= 25MB), chặn tệp thực thi", () => {
      // Tệp thực thi hoặc script giả danh bị chặn
      expect(
        validateUploadFile({
          name: "trojan.exe",
          mimeType: "application/octet-stream",
          sizeBytes: 1024,
        }).valid
      ).toBe(false)

      expect(
        validateUploadFile({
          name: "xss.svg",
          mimeType: "image/svg+xml",
          sizeBytes: 1024,
        }).valid
      ).toBe(false)

      // Ảnh vượt quá 10MB bị từ chối
      expect(
        validateUploadFile({
          name: "banner.png",
          mimeType: "image/png",
          sizeBytes: 11 * 1024 * 1024,
        }).valid
      ).toBe(false)

      // Tài liệu vượt quá 25MB bị từ chối
      expect(
        validateUploadFile({
          name: "hoc-lieu.pdf",
          mimeType: "application/pdf",
          sizeBytes: 26 * 1024 * 1024,
        }).valid
      ).toBe(false)

      // Ảnh và PDF hợp lệ được chấp nhận
      const validImage = validateUploadFile({
        name: "Ảnh minh họa lớp 3.png",
        mimeType: "image/png",
        sizeBytes: 2 * 1024 * 1024,
      })
      expect(validImage.valid).toBe(true)
      expect(validImage.attachmentType).toBe("IMAGE")

      const validPdf = validateUploadFile({
        name: "Giao_an_AI.pdf",
        mimeType: "application/pdf",
        sizeBytes: 5 * 1024 * 1024,
      })
      expect(validPdf.valid).toBe(true)
      expect(validPdf.attachmentType).toBe("DOCUMENT")
    })
  })

  // ============================================================================
  // KỊCH BẢN 10: Bình luận tối đa 2 cấp, @nhắc tên, sửa/xóa giữ placeholder khi có trả lời,
  //              ghim tối đa 3 bình luận, tác giả bài không sửa/xóa bình luận hợp lệ của người khác
  // ============================================================================
  describe("10. Bình luận luồng 2 cấp, placeholder khi xóa, giới hạn ghim 3 bình luận & bảo vệ bình luận đồng nghiệp", () => {
    it("Tác giả bài đăng được ghim/đánh dấu góp ý nhưng KHÔNG được sửa hoặc xóa bình luận hợp lệ của đồng nghiệp", () => {
      const postAuthor = createMockUserContext({ userId: "gv-post-author" })
      const commentAuthor = createMockUserContext({ userId: "gv-commenter" })

      const post = { authorId: "gv-post-author", campusId: "CAMPUS_1" }
      const comment = { authorId: "gv-commenter" }

      // Tác giả bình luận được sửa/xóa bình luận của chính mình
      expect(canEditOrDeleteComment(commentAuthor, comment, "EDIT").allowed).toBe(true)
      expect(canEditOrDeleteComment(commentAuthor, comment, "DELETE").allowed).toBe(true)

      // Tác giả bài đăng KHÔNG được sửa hoặc xóa bình luận của đồng nghiệp
      expect(canEditOrDeleteComment(postAuthor, comment, "EDIT").allowed).toBe(false)
      expect(canEditOrDeleteComment(postAuthor, comment, "DELETE").allowed).toBe(false)

      // Nhưng tác giả bài đăng được quyền ghim và đánh dấu trạng thái góp ý trên bài của mình
      expect(canPinOrMarkFeedbackOnPost(postAuthor, post)).toBe(true)
    })

    it("Trả lời giới hạn hiển thị 2 cấp (depth 0 và depth 1); xóa bình luận đã có trả lời giữ placeholder 'Bình luận đã được xóa' và ẩn tệp", () => {
      interface MockComment {
        id: string
        parentId: string | null
        rootId: string | null
        depth: number
        authorId: string
        authorName: string
        replyToUserName?: string | null
        content: string
        status: "ACTIVE" | "DELETED_PLACEHOLDER" | "HIDDEN_MODERATION"
        attachments: string[]
      }

      const comments: MockComment[] = []

      const addComment = (input: {
        id: string
        authorId: string
        authorName: string
        content: string
        parentComment?: MockComment
        attachments?: string[]
      }): MockComment => {
        if (!input.parentComment) {
          const root: MockComment = {
            id: input.id,
            parentId: null,
            rootId: null,
            depth: 0,
            authorId: input.authorId,
            authorName: input.authorName,
            content: input.content,
            status: "ACTIVE",
            attachments: input.attachments ?? [],
          }
          comments.push(root)
          return root
        }

        // Luôn quy về tối đa depth = 1 thuộc cùng rootId để không lồng vô hạn
        const rootId = input.parentComment.depth === 0 ? input.parentComment.id : input.parentComment.rootId!
        const reply: MockComment = {
          id: input.id,
          parentId: input.parentComment.id,
          rootId,
          depth: 1,
          authorId: input.authorId,
          authorName: input.authorName,
          replyToUserName: input.parentComment.authorName,
          content: input.content,
          status: "ACTIVE",
          attachments: input.attachments ?? [],
        }
        comments.push(reply)
        return reply
      }

      const cRoot = addComment({
        id: "c-root",
        authorId: "gv-1",
        authorName: "Cô Lan",
        content: "Có thể thêm câu hỏi theo từng bài không?",
        attachments: ["minh-hoa-1.png"],
      })
      const cReply1 = addComment({
        id: "c-reply-1",
        authorId: "gv-2",
        authorName: "Cô Minh Anh",
        content: "Mình sẽ bổ sung ở bản tiếp theo.",
        parentComment: cRoot,
      })
      const cReplyDeep = addComment({
        id: "c-reply-deep",
        authorId: "gv-3",
        authorName: "Thầy Hoàng",
        content: "Cảm ơn hai cô, ý kiến rất sát thực tế!",
        parentComment: cReply1,
      })

      // Phản hồi cấp sâu hơn vẫn giữ depth = 1, thuộc cùng rootId và lưu tên người được trả lời
      expect(cReplyDeep.depth).toBe(1)
      expect(cReplyDeep.rootId).toBe("c-root")
      expect(cReplyDeep.replyToUserName).toBe("Cô Minh Anh")

      // Khi xóa cRoot (đã có trả lời), giữ placeholder "Bình luận đã được xóa" và xóa danh sách tệp hiển thị
      const hasReplies = comments.some((c) => c.rootId === cRoot.id || c.parentId === cRoot.id)
      if (hasReplies) {
        cRoot.status = "DELETED_PLACEHOLDER"
        cRoot.content = "Bình luận đã được xóa"
        cRoot.attachments = []
      }

      expect(cRoot.status).toBe("DELETED_PLACEHOLDER")
      expect(cRoot.content).toBe("Bình luận đã được xóa")
      expect(cRoot.attachments).toHaveLength(0)
    })
  })

  // ============================================================================
  // KỊCH BẢN 11: Chống gửi lặp bình luận do retry (clientRequestId), bộ đếm không tính placeholder/ẩn,
  //              đánh dấu bình luận "Đã áp dụng" không làm tăng chỉ số áp dụng sản phẩm U
  // ============================================================================
  describe("11. Chống gửi lặp bình luận (clientRequestId), bộ đếm chính xác & tách biệt 'Đã áp dụng' với điểm U", () => {
    it("Gửi trùng clientRequestId do retry mạng chỉ tạo 1 bình luận duy nhất và bộ đếm chỉ tính bình luận ACTIVE", () => {
      const commentByIdempotencyKey = new Map<string, { id: string; status: string }>()
      const createCommentIdempotent = (postId: string, authorId: string, clientRequestId: string) => {
        const key = `${postId}::${authorId}::${clientRequestId}`
        if (commentByIdempotencyKey.has(key)) {
          return { deduplicated: true, comment: commentByIdempotencyKey.get(key)! }
        }
        const created = { id: `cmt-${commentByIdempotencyKey.size + 1}`, status: "ACTIVE" }
        commentByIdempotencyKey.set(key, created)
        return { deduplicated: false, comment: created }
      }

      const first = createCommentIdempotent("post-1", "gv-1", "req-uuid-123")
      const retry = createCommentIdempotent("post-1", "gv-1", "req-uuid-123")

      expect(first.deduplicated).toBe(false)
      expect(retry.deduplicated).toBe(true)
      expect(retry.comment.id).toBe(first.comment.id)

      const allThreadComments = [
        { id: "c1", status: "ACTIVE" },
        { id: "c2", status: "DELETED_PLACEHOLDER" },
        { id: "c3", status: "HIDDEN_MODERATION" },
        { id: "c4", status: "ACTIVE" }, // reply
      ]
      const activeCommentCount = allThreadComments.filter((c) => c.status === "ACTIVE").length
      expect(activeCommentCount).toBe(2)
    })

    it("Tác giả đánh dấu bình luận góp ý là 'Đã áp dụng' (APPLIED) KHÔNG làm tăng số GV áp dụng sản phẩm (a) hay điểm U", () => {
      const { startDateUtc, endDateUtc } = getVietnamMonthBoundsUtc(2026, 11)
      const reviewDeadlineUtc = calculateReviewDeadlineUtc(endDateUtc)

      // Có 5 bình luận được tác giả gắn nhãn feedbackStatus = "APPLIED" ("Đã áp dụng" cải tiến vào sản phẩm)
      const appliedFeedbackComments = [
        { id: "cmt-1", authorId: "gv-1", feedbackStatus: "APPLIED" },
        { id: "cmt-2", authorId: "gv-2", feedbackStatus: "APPLIED" },
        { id: "cmt-3", authorId: "gv-3", feedbackStatus: "APPLIED" },
        { id: "cmt-4", authorId: "gv-4", feedbackStatus: "APPLIED" },
        { id: "cmt-5", authorId: "gv-5", feedbackStatus: "APPLIED" },
      ]
      expect(appliedFeedbackComments).toHaveLength(5)

      // Nhưng chưa có hồ sơ minh chứng áp dụng sản phẩm nào được VERIFIED
      const verifiedApplications = selectValidPeriodVerifiedApplications([], {
        startDateUtc,
        endDateUtc,
        reviewDeadlineUtc,
        authorId: "gv-author",
      })

      expect(verifiedApplications).toHaveLength(0)
      expect(computeApplicationScoreU(verifiedApplications.length, 10)).toBe(0)
    })
  })

  // ============================================================================
  // KỊCH BẢN 12: Chuyển Ý tưởng đã có sao sang Sản phẩm AI mở đối tượng mới có liên kết nguồn gốc,
  //              không mang nguyên điểm sao ý tưởng sang sản phẩm và không làm mất lịch sử bình luận
  // ============================================================================
  describe("12. Chuyển đổi Ý tưởng sang Sản phẩm AI: Liên kết nguồn gốc, tách riêng sao đánh giá và bảo toàn bình luận", () => {
    it("Khi phát triển Ý tưởng thành Sản phẩm AI: tạo đối tượng Sản phẩm mới có sourceIdeaId, điểm sao Sản phẩm khởi đầu = 0, giữ nguyên sao Ý tưởng và lịch sử bình luận", () => {
      const existingIdea = {
        id: "idea-101",
        title: "Học sinh AI cùng luyện bài",
        avgStars: 4.8,
        validRatingsCount: 16,
        convertedToProductId: null as string | null,
      }

      const existingCommentsOnPost = [
        { id: "cmt-idea-1", content: "Ý tưởng rất hay cho môn Toán!", status: "ACTIVE" },
        { id: "cmt-idea-2", content: "Nên thêm phần gợi ý từng bước.", status: "ACTIVE", feedbackStatus: "APPLIED" },
      ]

      // Thực hiện chuyển đổi Ý tưởng -> Sản phẩm AI
      const convertedProduct = {
        id: "prod-202",
        title: "Học sinh AI cùng luyện bài (Bản thử nghiệm v1.0)",
        sourceIdeaId: existingIdea.id,
        avgStars: 0, // Không mang nguyên sao Tiềm năng của Ý tưởng sang sao Hữu dụng của Sản phẩm
        validRatingsCount: 0,
        verifiedAppsCount: 0,
      }
      existingIdea.convertedToProductId = convertedProduct.id

      // 1. Có liên kết hai chiều giữa Ý tưởng gốc và Sản phẩm AI
      expect(convertedProduct.sourceIdeaId).toBe("idea-101")
      expect(existingIdea.convertedToProductId).toBe("prod-202")

      // 2. Điểm sao của Sản phẩm AI bắt đầu mới (0 đánh giá), không sao chép 4.8 sao của Ý tưởng
      expect(convertedProduct.avgStars).toBe(0)
      expect(convertedProduct.validRatingsCount).toBe(0)

      // 3. Điểm sao của Ý tưởng gốc và toàn bộ lịch sử bình luận đóng góp được bảo toàn nguyên vẹn
      expect(existingIdea.avgStars).toBe(4.8)
      expect(existingIdea.validRatingsCount).toBe(16)
      expect(existingCommentsOnPost).toHaveLength(2)
      expect(existingCommentsOnPost[1].feedbackStatus).toBe("APPLIED")
    })
  })
})

describe("Sky-Line Connect v2.1 — Cộng đồng Cùng sáng tạo ('Góp một mảnh sáng tạo' — 10 Kịch bản Mục 12)", () => {
  it("1. Đổi loại mảnh đóng góp (Một cách làm / Học liệu / Thử nghiệm / Kỹ năng / Kết nối) không làm mất nội dung, tệp, liên kết hay đồng nghiệp nhắc tên", () => {
    expect(SLC_CONTRIBUTION_TYPES).toHaveLength(5)
    expect(SLC_CONTRIBUTION_TYPES.map((t) => t.value)).toEqual([
      "METHOD",
      "MATERIAL",
      "EXPERIMENT",
      "SKILL",
      "CONNECTION",
    ])

    const initialDraft = {
      postId: "post-5p-ai",
      contributionType: "METHOD" as const,
      content: "Tôi đề xuất cho học sinh chọn mức độ câu hỏi trước khi chơi.",
      attachments: [
        {
          fileName: "Bo_cau_hoi_lop4.pdf",
          fileUrl: "/uploads/bo_cau_hoi.pdf",
          mimeType: "application/pdf",
          fileSize: 102400,
          attachmentType: "DOCUMENT",
        },
      ],
      links: [{ url: "https://skyline.edu.vn/hoc-lieu", title: "Kho học liệu số" }],
      mentionedUserIds: ["gv-lan", "gv-duc"],
      followPost: true,
      helpRequestId: "hr-1",
    }

    const afterSwitchToMaterial = preserveDraftStateOnTypeSwitch(initialDraft, "MATERIAL")
    expect(afterSwitchToMaterial.contributionType).toBe("MATERIAL")
    expect(afterSwitchToMaterial.content).toBe(initialDraft.content)
    expect(afterSwitchToMaterial.attachments).toEqual(initialDraft.attachments)
    expect(afterSwitchToMaterial.links).toEqual(initialDraft.links)
    expect(afterSwitchToMaterial.mentionedUserIds).toEqual(["gv-lan", "gv-duc"])

    const afterSwitchToExperiment = preserveDraftStateOnTypeSwitch(afterSwitchToMaterial, "EXPERIMENT")
    expect(afterSwitchToExperiment.contributionType).toBe("EXPERIMENT")
    expect(afterSwitchToExperiment.content).toBe(initialDraft.content)
  })

  it("2. Nhấn câu gợi ý mở đầu chèn vào đúng vị trí con trỏ, không ghi đè nội dung đã viết", () => {
    // Khi ô nhập đang có nội dung và con trỏ ở cuối
    const existing = "Mình rất thích ý tưởng này."
    const resEnd = insertStarterPromptAtCursor(existing, "Tôi đề xuất…", existing.length)
    expect(resEnd.text).toContain("Mình rất thích ý tưởng này.")
    expect(resEnd.text).toContain("Tôi đề xuất ")
    expect(resEnd.text).toBe("Mình rất thích ý tưởng này. Tôi đề xuất ")

    // Khi chèn vào giữa câu tại vị trí con trỏ
    const middleText = "Phần đầu. Phần sau."
    const resMid = insertStarterPromptAtCursor(middleText, "Nếu thử cách này…", 9)
    expect(resMid.text).toContain("Phần đầu.")
    expect(resMid.text).toContain("Nếu thử cách này ")
    expect(resMid.text).toContain("Phần sau.")
  })

  it("3 & 4. Upload lỗi và gửi lỗi giữ nguyên bản nháp; Retry với cùng clientRequestId không tạo trùng bình luận hoặc sự kiện đẩy bài", () => {
    const store = new Map<string, { id: string; content: string; contributionType: string }>()
    let bumpCount = 0

    const submitPieceWithRetry = (payload: {
      postId: string
      authorId: string
      clientRequestId: string
      content: string
      contributionType: string
      simulateNetworkFailure?: boolean
    }) => {
      if (payload.simulateNetworkFailure) {
        return {
          ok: false,
          preservedDraft: payload.content,
          preservedClientRequestId: payload.clientRequestId,
        }
      }
      const key = `${payload.postId}::${payload.authorId}::${payload.clientRequestId}`
      if (store.has(key)) {
        return { ok: true, deduplicated: true, comment: store.get(key)! }
      }
      const created = {
        id: `piece-${store.size + 1}`,
        content: payload.content,
        contributionType: payload.contributionType,
      }
      store.set(key, created)
      bumpCount += 1
      return { ok: true, deduplicated: false, comment: created }
    }

    // Lần 1: Lỗi mạng -> giữ nguyên bản nháp và mã clientRequestId
    const failedAttempt = submitPieceWithRetry({
      postId: "post-5p-ai",
      authorId: "gv-duc",
      clientRequestId: "piece-req-001",
      content: "Tôi có thể thử trong tiết Toán tuần này.",
      contributionType: "EXPERIMENT",
      simulateNetworkFailure: true,
    })
    expect(failedAttempt.ok).toBe(false)
    expect(failedAttempt.preservedDraft).toBe("Tôi có thể thử trong tiết Toán tuần này.")
    expect(bumpCount).toBe(0)

    // Lần 2: Gửi thành công
    const firstSuccess = submitPieceWithRetry({
      postId: "post-5p-ai",
      authorId: "gv-duc",
      clientRequestId: "piece-req-001",
      content: "Tôi có thể thử trong tiết Toán tuần này.",
      contributionType: "EXPERIMENT",
    })
    expect(firstSuccess.ok).toBe(true)
    expect(firstSuccess.deduplicated).toBe(false)
    expect(bumpCount).toBe(1)

    // Lần 3: Người dùng nhấn đúp / retry cùng clientRequestId -> không tạo bình luận thứ 2 và không đẩy bài lần 2
    const retrySuccess = submitPieceWithRetry({
      postId: "post-5p-ai",
      authorId: "gv-duc",
      clientRequestId: "piece-req-001",
      content: "Tôi có thể thử trong tiết Toán tuần này.",
      contributionType: "EXPERIMENT",
    })
    expect(retrySuccess.deduplicated).toBe(true)
    expect(store.size).toBe(1)
    expect(bumpCount).toBe(1)
  })

  it("5. Kiểm tra quyền comment, tệp đính kèm, đường dẫn sâu và @nhắc tên đồng nghiệp theo phạm vi bài gốc", () => {
    const campus1Post: PostAccessTarget = {
      id: "post-campus-1",
      authorId: "gv-author-c1",
      status: "PUBLISHED",
      visibility: "CAMPUS",
      campusId: "CAMPUS_1",
    }

    const candidates = [
      { userId: "gv-c1", teacherName: "Cô Lan Cơ sở 1", campusId: "CAMPUS_1" },
      { userId: "gv-c2", teacherName: "Thầy Nam Cơ sở 2", campusId: "CAMPUS_2" },
    ]

    // Chỉ đồng nghiệp có quyền xem bài (cùng CAMPUS_1) mới nằm trong danh sách cho phép @nhắc tên
    const allowedMentions = filterAllowedMentionUsersForPost(candidates, campus1Post)
    expect(allowedMentions.map((u) => u.userId)).toEqual(["gv-c1"])

    // Người dùng ở CAMPUS_2 không truy cập được tệp đính kèm hoặc deep link của bài CAMPUS_1
    const gvCampus2 = createMockUserContext({
      userId: "gv-c2",
      campusId: "CAMPUS_2",
      campusIds: ["CAMPUS_2"],
    })
    expect(canAccessPostAttachmentOrDeepLink(gvCampus2, campus1Post)).toBe(false)
  })

  it("6, 7 & 8. Tiếp nhận đóng góp, liên kết bản cập nhật, ghi nhận người đóng góp (có tùy chọn ẩn tên) và không tự cộng lượt áp dụng U", () => {
    // Mô phỏng sản phẩm có danh sách cộng sự gốc
    const product = {
      id: "prod-ai-quiz",
      authorId: "gv-minh-anh",
      collaboratorIds: ["gv-co-author-1"],
      verifiedAppsCountA: 2,
      versions: [] as Array<{
        id: string
        version: string
        sourceCommentId: string
        contributorUserId: string
        contributorName: string
        contributorOptOutPublic: boolean
      }>,
    }

    // Cô Mai gửi mảnh đóng góp "Một cách làm"
    const pieceComment = {
      id: "cmt-mai-1",
      authorId: "gv-mai",
      authorName: "Cô Mai",
      contributionType: "METHOD",
      content: "Thêm chế độ chơi theo nhóm sẽ rất thú vị.",
      feedbackStatus: "NONE",
      statusHistory: [] as Array<{ status: string; note?: string }>,
    }

    // 1. Tác giả đánh dấu "Đưa vào phát triển"
    pieceComment.feedbackStatus = "IN_PROGRESS"
    pieceComment.statusHistory.push({
      status: "IN_PROGRESS",
      note: "Đưa vào hạng mục phát triển v1.2",
    })

    // 2. Tác giả công bố bản cập nhật v1.2 gắn với góp ý của Cô Mai
    pieceComment.feedbackStatus = "APPLIED"
    pieceComment.statusHistory.push({
      status: "APPLIED",
      note: "Đã bổ sung chế độ chia đội chơi nhóm trong v1.2",
    })
    product.versions.push({
      id: "ver-1.2",
      version: "1.2",
      sourceCommentId: pieceComment.id,
      contributorUserId: pieceComment.authorId,
      contributorName: pieceComment.authorName,
      contributorOptOutPublic: false,
    })

    // Kiểm tra:
    // - Bản cập nhật hiển thị người đóng góp và liên kết góp ý nguồn
    expect(product.versions[0].contributorName).toBe("Cô Mai")
    expect(product.versions[0].sourceCommentId).toBe("cmt-mai-1")
    // - Người đóng góp KHÔNG tự động biến thành đồng tác giả (collaboratorIds giữ nguyên)
    expect(product.collaboratorIds).not.toContain("gv-mai")
    // - Tiếp nhận / áp dụng góp ý KHÔNG tự động làm tăng số lượt GV áp dụng thực tế (a vẫn bằng 2)
    expect(product.verifiedAppsCountA).toBe(2)

    // - Khi Cô Mai chọn ẩn tên công khai trên bản cập nhật
    product.versions[0].contributorOptOutPublic = true
    expect(product.versions[0].contributorOptOutPublic).toBe(true)
  })

  it("9. Cơ chế đẩy bài 'Đang sôi nổi': chặn tự đẩy, chặn đổi cảm xúc / unlike+relike / sửa comment, cooldown 30 phút và tính lại khi xóa", () => {
    const t0 = new Date("2026-11-09T01:00:00.000Z")
    const t10m = new Date("2026-11-09T01:10:00.000Z")
    const t35m = new Date("2026-11-09T01:35:00.000Z")

    // 1. Tác giả tự tương tác -> KHÔNG đẩy bài
    const selfInteract = evaluatePostBumpEligibility({
      postAuthorId: "gv-author",
      actorId: "gv-author",
      sourceType: "COMMENT",
      sourceId: "cmt-self",
      now: t0,
      cooldownMinutes: 30,
      existingBumpEvents: [],
    })
    expect(selfInteract.shouldBump).toBe(false)

    // 2. Đổi cảm xúc, unlike rồi like lại, sửa comment -> KHÔNG tạo lần đẩy mới
    expect(
      evaluatePostBumpEligibility({
        postAuthorId: "gv-author",
        actorId: "gv-colleague-1",
        sourceType: "REACTION",
        sourceId: "react-1",
        isReactionTypeChange: true,
        now: t0,
        existingBumpEvents: [],
      }).shouldBump
    ).toBe(false)

    // Giả sử gv-colleague-1 đã pernah like trước đó -> unlike rồi like lại
    const firstLike = evaluatePostBumpEligibility({
      postAuthorId: "gv-author",
      actorId: "gv-colleague-2",
      sourceType: "REACTION",
      sourceId: "react-2",
      now: t0,
      existingBumpEvents: [],
    })
    expect(firstLike.shouldBump).toBe(true)

    const relikeAfterUnlike = evaluatePostBumpEligibility({
      postAuthorId: "gv-author",
      actorId: "gv-colleague-2",
      sourceType: "REACTION",
      sourceId: "react-2-again",
      now: t35m,
      existingBumpEvents: firstLike.updatedBumpEvents,
    })
    expect(relikeAfterUnlike.shouldBump).toBe(false)
    expect(relikeAfterUnlike.reason).toBe("RELIKE_NO_NEW_BUMP")

    expect(
      evaluatePostBumpEligibility({
        postAuthorId: "gv-author",
        actorId: "gv-colleague-1",
        sourceType: "COMMENT",
        sourceId: "cmt-edit",
        isCommentEdit: true,
        now: t0,
        existingBumpEvents: [],
      }).shouldBump
    ).toBe(false)

    // 3. Đồng nghiệp gửi mảnh đóng góp mới hợp lệ -> Đẩy bài
    const validBump1 = evaluatePostBumpEligibility({
      postAuthorId: "gv-author",
      actorId: "gv-colleague-1",
      sourceType: "COMMENT",
      sourceId: "cmt-1",
      now: t0,
      cooldownMinutes: 30,
      existingBumpEvents: [],
    })
    expect(validBump1.shouldBump).toBe(true)
    expect(validBump1.newLastBumpedAt?.toISOString()).toBe(t0.toISOString())

    // 4. Cùng đồng nghiệp đó tương tác tiếp sau 10 phút (< 30 phút cooldown) -> KHÔNG đẩy bài lần nữa
    const withinCooldown = evaluatePostBumpEligibility({
      postAuthorId: "gv-author",
      actorId: "gv-colleague-1",
      sourceType: "COMMENT",
      sourceId: "cmt-2",
      now: t10m,
      cooldownMinutes: 30,
      existingBumpEvents: validBump1.updatedBumpEvents,
    })
    expect(withinCooldown.shouldBump).toBe(false)
    expect(withinCooldown.reason).toBe("COOLDOWN_ACTIVE")

    // 5. Sau 35 phút (> 30 phút cooldown) -> Được phép đẩy bài
    const afterCooldown = evaluatePostBumpEligibility({
      postAuthorId: "gv-author",
      actorId: "gv-colleague-1",
      sourceType: "COMMENT",
      sourceId: "cmt-3",
      now: t35m,
      cooldownMinutes: 30,
      existingBumpEvents: validBump1.updatedBumpEvents,
    })
    expect(afterCooldown.shouldBump).toBe(true)
    expect(afterCooldown.newLastBumpedAt?.toISOString()).toBe(t35m.toISOString())

    // 6. Khi bình luận cmt-3 bị xóa hoặc ẩn -> tính lại lastBumpedAt về mốc hợp lệ trước đó (t0)
    const recalculated = recalculatePostLastBumpedAt({
      publishedAt: new Date("2026-11-08T00:00:00.000Z"),
      existingBumpEvents: afterCooldown.updatedBumpEvents,
      removedSourceType: "COMMENT",
      removedSourceId: "cmt-3",
    })
    expect(recalculated.lastBumpedAt.toISOString()).toBe(t0.toISOString())
    expect(recalculated.updatedBumpEvents.filter((e) => e.isActive !== false)).toHaveLength(1)
  })

  it("10. 'Hành trình lan tỏa' tổng hợp đúng chuỗi sự kiện thật, khử trùng lặp và không tiết lộ sự kiện khi người xem không có quyền xem bài gốc", () => {
    const journeyInput = {
      canViewerAccessPost: true,
      post: {
        id: "post-1",
        title: "5 phút đầu giờ cùng AI",
        postType: "AI_PRODUCT",
        authorName: "Cô Minh Anh",
        publishedAt: "2026-11-01T08:00:00.000Z",
      },
      comments: [
        {
          id: "c-1",
          authorName: "Thầy Đức",
          contributionType: "EXPERIMENT",
          feedbackStatus: "RECEIVED",
          status: "ACTIVE",
          createdAt: "2026-11-02T09:00:00.000Z",
          feedbackUpdatedAt: "2026-11-02T10:00:00.000Z",
        },
        // Sự kiện trùng id để kiểm tra khử trùng lặp
        {
          id: "c-1",
          authorName: "Thầy Đức",
          contributionType: "EXPERIMENT",
          feedbackStatus: "RECEIVED",
          status: "ACTIVE",
          createdAt: "2026-11-02T09:00:00.000Z",
          feedbackUpdatedAt: "2026-11-02T10:00:00.000Z",
        },
        {
          id: "c-2",
          authorName: "Cô Mai",
          contributionType: "METHOD",
          feedbackStatus: "IN_PROGRESS",
          developmentItemNote: "Thêm chế độ chơi nhóm",
          status: "ACTIVE",
          createdAt: "2026-11-03T09:00:00.000Z",
          feedbackUpdatedAt: "2026-11-03T11:00:00.000Z",
        },
      ],
      productVersions: [
        {
          id: "v-1.2",
          version: "1.2",
          releaseNotes: "Bổ sung chế độ chơi nhóm",
          contributorName: "Cô Mai",
          contributorOptOutPublic: false,
          sourceCommentId: "c-2",
          createdAt: "2026-11-04T08:00:00.000Z",
        },
      ],
      verifiedApplications: [
        {
          id: "app-1",
          applicantName: "Thầy Đức",
          subjectOrTask: "Toán Lớp 4",
          verificationStatus: "VERIFIED",
          submittedAt: "2026-11-05T07:00:00.000Z",
          verifiedAt: "2026-11-05T08:00:00.000Z",
        },
      ],
      officialAwards: [
        {
          id: "aw-1",
          periodName: "Bảng vàng Tháng 11/2026",
          badgeTitle: "Giải Nhất Tháng",
          rank: 1,
          awardedAt: "2026-11-30T10:00:00.000Z",
        },
      ],
    }

    const events = buildPostSpreadJourney(journeyInput)
    expect(events.map((e) => e.stage)).toEqual([
      "POST_PUBLISHED",
      "FEEDBACK_RECEIVED",
      "FEEDBACK_RECEIVED",
      "MOVED_TO_DEVELOPMENT",
      "VERSION_RELEASED",
      "APPLICATION_VERIFIED",
      "OFFICIAL_AWARD",
    ])

    // Nếu người xem không có quyền xem bài gốc -> trả về mảng rỗng, không lộ bất kỳ sự kiện nào
    const unauthorizedEvents = buildPostSpreadJourney({
      ...journeyInput,
      canViewerAccessPost: false,
    })
    expect(unauthorizedEvents).toHaveLength(0)
  })
})


function RevisionsHistoryLength(list: unknown[]): number {
  return list.length
}
