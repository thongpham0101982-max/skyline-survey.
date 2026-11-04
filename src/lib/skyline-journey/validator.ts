import {
  TC02SStageDefinition,
  getTC02SStageByLessonCode,
  getTC02SStageByPeriod
} from "./tc02s-catalog";

export type StageProgressStatus =
  | "LOCKED"
  | "READY"
  | "IN_PROGRESS"
  | "WAITING_CONFIRMATION"
  | "NEEDS_REVISION"
  | "COMPLETED";

export interface BackpackSubmissionPayload {
  /** Map of `${contextId}:${itemId}` or `contextPlacements[contextId][itemId]` -> "GROUP_A" | "GROUP_B" */
  placements: Record<string, Record<string, "GROUP_A" | "GROUP_B">>;
  selectedReasonOptionId: string;
  practicalNote?: string;
}

export interface ShopSubmissionPayload {
  selectedItemIds: string[];
  /** Optional priority ordering for stages with requirePriorityListFirst */
  priorityOrderedIds?: string[];
  calculatedTotalCost: number;
  calculatedRemainingCoins: number;
  selectedPoliteResponseId: string;
  practicalNote?: string;
}

export interface DreamNestSubmissionPayload {
  /** Map of jarId -> allocated coins */
  jarAllocations: Record<string, number>;
  selectedGoalId?: string;
  selectedTwistOptionId: string;
  practicalNote?: string;
}

export interface VillageRescueSubmissionPayload {
  /** Map of hotspotId -> selectedActionId */
  hotspotActions: Record<string, string>;
  selectedReflectionOptionId: string;
  practicalNote?: string;
}

export interface DiaryAdSubmissionPayload {
  /** For COIN_DIARY & MASTER_FINANCE_CAPSTONE */
  calculatedTotalSpent?: number;
  calculatedRemainingCoins?: number;
  /** Map of entryId -> student's classification whether it was necessary */
  entryClassifications?: Record<string, boolean>;
  /** For AD_DETECTIVE: map of billboardId -> { identifiedHookType, shouldBuyDecision } */
  adDecisions?: Record<
    string,
    {
      identifiedHookType?: string;
      shouldBuy: boolean;
    }
  >;
  /** For MASTER_FINANCE_CAPSTONE */
  capstoneAllocations?: {
    needCoins: number;
    saveCoins: number;
    shareCoins: number;
  };
  selectedSurpriseOptionId?: string;
  practicalNote?: string;
}

export type StageActionPayload =
  | BackpackSubmissionPayload
  | ShopSubmissionPayload
  | DreamNestSubmissionPayload
  | VillageRescueSubmissionPayload
  | DiaryAdSubmissionPayload
  | Record<string, any>;

export interface StageValidationResult {
  isValid: boolean;
  autoChallengePassed: boolean;
  requiresTeacherConfirmation: boolean;
  nextStatus: StageProgressStatus;
  scorePercent: number;
  achievedCriterionCodes: string[];
  feedbackSummary: string;
  detailedFeedback: string[];
  worldStateEffect: {
    effectType:
      | "BACKPACK_ORGANIZED"
      | "SHOP_CHECKOUT_SUCCESS"
      | "NEST_UPGRADED"
      | "VILLAGE_RESTORED"
      | "DIARY_AND_BILLBOARD_MASTERED";
    headline: string;
    visualLevel: number;
    metrics: Record<string, number | string | boolean>;
  };
}

/**
 * Validate Mechanic A: BACKPACK_BUILDER (Chuẩn bị hành lý & Phân loại theo bối cảnh)
 */
export function validateBackpackMechanic(
  stage: TC02SStageDefinition,
  payload: BackpackSubmissionPayload
): StageValidationResult {
  const cfg = stage.interactive.backpackConfig;
  if (!cfg) {
    throw new Error(`Stage ${stage.lessonCode} missing backpackConfig`);
  }

  const placements = payload?.placements || {};
  const detailedFeedback: string[] = [];
  let totalItems = 0;
  let correctItems = 0;

  for (const ctx of cfg.contexts) {
    const ctxMap = placements[ctx.id] || {};
    for (const item of ctx.items) {
      totalItems += 1;
      const chosen = ctxMap[item.id];
      if (chosen === item.correctGroup) {
        correctItems += 1;
      } else {
        const expectedGroupLabel =
          item.correctGroup === "GROUP_A" ? ctx.targetGroupAName : ctx.targetGroupBName;
        detailedFeedback.push(
          `Trong "${ctx.title}", "${item.name}" phù hợp với nhóm "${expectedGroupLabel}": ${item.contextReason}`
        );
      }
    }
  }

  const chosenOption = cfg.reasonQuestion.options.find(
    (opt) => opt.id === payload?.selectedReasonOptionId
  );
  const reasonPassed = Boolean(chosenOption?.isOptimal);
  if (!reasonPassed) {
    detailedFeedback.push(
      chosenOption?.feedback ||
        "Em hãy xem lại câu hỏi giải thích theo bối cảnh để chọn lý do phù hợp nhất nhé!"
    );
  } else if (chosenOption) {
    detailedFeedback.push(chosenOption.feedback);
  }

  const allItemsCorrect = totalItems > 0 && correctItems === totalItems;
  const autoChallengePassed = allItemsCorrect && reasonPassed;

  const totalChecks = totalItems + 1;
  const passedChecks = correctItems + (reasonPassed ? 1 : 0);
  const scorePercent = Math.round((passedChecks / Math.max(1, totalChecks)) * 100);

  const requiresTeacherConfirmation = stage.interactive.evaluationMode === "HYBRID_TEACHER";
  const hasPracticalNote = Boolean(payload?.practicalNote && payload.practicalNote.trim().length >= 5);

  let nextStatus: StageProgressStatus = "IN_PROGRESS";
  if (autoChallengePassed) {
    if (requiresTeacherConfirmation) {
      nextStatus = hasPracticalNote ? "WAITING_CONFIRMATION" : "IN_PROGRESS";
      if (!hasPracticalNote) {
        detailedFeedback.push(
          "Em đã vượt qua thử thách tự động! Hãy viết thêm chia sẻ ngắn ở phần Liên hệ thực tế để gửi thầy/cô xác nhận nhé."
        );
      }
    } else {
      nextStatus = "COMPLETED";
    }
  }

  return {
    isValid: autoChallengePassed && (!requiresTeacherConfirmation || hasPracticalNote),
    autoChallengePassed,
    requiresTeacherConfirmation,
    nextStatus,
    scorePercent,
    achievedCriterionCodes: autoChallengePassed ? stage.criteria.map((c) => c.code) : [],
    feedbackSummary: autoChallengePassed
      ? "Tuyệt vời! Chiếc ba lô của chim Sky-Line đã được sắp xếp đúng theo từng bối cảnh!"
      : "Một vài món đồ trong ba lô chưa thật phù hợp với bối cảnh. Em hãy xem gợi ý và thử sắp xếp lại nhé!",
    detailedFeedback,
    worldStateEffect: {
      effectType: "BACKPACK_ORGANIZED",
      headline: autoChallengePassed
        ? "Ba lô gọn nhẹ, đúng nhu cầu theo từng thời tiết & hoạt động!"
        : "Ba lô đang chờ em điều chỉnh lại cho hợp lý hơn.",
      visualLevel: autoChallengePassed ? 3 : Math.max(1, Math.round((correctItems / Math.max(1, totalItems)) * 2)),
      metrics: {
        correctItems,
        totalItems,
        reasonPassed
      }
    }
  };
}

/**
 * Validate Mechanic B: BIRD_SHOP (Cửa hàng của chim – hỗ trợ nhiều phương án giỏ hàng hợp lệ theo điều kiện & tiêu chí)
 */
export function validateBirdShopMechanic(
  stage: TC02SStageDefinition,
  payload: ShopSubmissionPayload
): StageValidationResult {
  const cfg = stage.interactive.shopConfig;
  if (!cfg) {
    throw new Error(`Stage ${stage.lessonCode} missing shopConfig`);
  }

  const detailedFeedback: string[] = [];
  const selectedIds = Array.from(new Set(payload?.selectedItemIds || []));
  const selectedItems = selectedIds
    .map((id) => cfg.items.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const actualTotalCost = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const actualRemaining = cfg.walletBudget - actualTotalCost;

  // 1. Check minimum items
  const enoughItems = selectedItems.length >= cfg.minRequiredItems;
  if (!enoughItems) {
    detailedFeedback.push(
      `Giỏ hàng cần có ít nhất ${cfg.minRequiredItems} món phù hợp (hiện mới chọn ${selectedItems.length} món).`
    );
  }

  // 2. Check budget constraint
  const withinBudget = actualTotalCost <= cfg.walletBudget && actualTotalCost > 0;
  if (actualTotalCost > cfg.walletBudget) {
    detailedFeedback.push(
      `Tổng tiền giỏ hàng (${actualTotalCost} Xu) đang vượt quá ngân sách trong ví (${cfg.walletBudget} Xu). Em hãy bớt món chưa cần thiết nhé!`
    );
  }

  // 3. Check required need tags covered (multi-solution condition check, not fixed single cart!)
  const coveredTags = new Set(selectedItems.map((it) => it.needTag));
  const missingTags = cfg.requiredNeedTags.filter((tag) => !coveredTags.has(tag as any));
  const tagsCovered = missingTags.length === 0;
  if (!tagsCovered) {
    detailedFeedback.push(
      "Giỏ hàng chưa đủ nhóm đồ dùng thiết yếu theo mục tiêu nhiệm vụ. Em hãy kiểm tra lại nhu cầu cần mua nhé!"
    );
  }

  // 4. Check quality / expiry requirement if enabled
  let qualityPassed = true;
  if (cfg.requireQualityCheck) {
    const lowQualityItems = selectedItems.filter((it) => !it.isHighQuality);
    if (lowQualityItems.length > 0) {
      qualityPassed = false;
      detailedFeedback.push(
        `Món "${lowQualityItems.map((i) => i.name).join(", ")}" chưa đảm bảo chất lượng/hạn sử dụng hoặc vượt ngoài nhu cầu thiết yếu.`
      );
    }
  } else {
    // Even if requireQualityCheck is false, ensure student didn't pick purely non-essential TOY_WANT that crowds out essentials
    const unwantedToys = selectedItems.filter((it) => it.needTag === "TOY_WANT" && !it.isHighQuality);
    if (unwantedToys.length > 0) {
      qualityPassed = false;
      detailedFeedback.push(
        `Món "${unwantedToys.map((i) => i.name).join(", ")}" là món muốn nhất thời ngoài kế hoạch, em nên ưu tiên món cần thiết trước nhé!`
      );
    }
  }

  // 5. Check student's calculation of total cost and remaining coins (if provided by client)
  const calcCostProvided = typeof payload?.calculatedTotalCost === "number";
  const calcRemProvided = typeof payload?.calculatedRemainingCoins === "number";
  const mathCorrect =
    (!calcCostProvided || Number(payload.calculatedTotalCost) === actualTotalCost) &&
    (!calcRemProvided || Number(payload.calculatedRemainingCoins) === actualRemaining);

  if (!mathCorrect) {
    detailedFeedback.push(
      `Em hãy kiểm tra lại phép tính nhé: Tổng giỏ hàng là ${actualTotalCost} Xu, ví có ${cfg.walletBudget} Xu thì còn lại ${actualRemaining} Xu.`
    );
  }

  // 6. Check polite response / change verification scenario
  const chosenPolite = cfg.changeScenario.politeResponses.find(
    (r) => r.id === payload?.selectedPoliteResponseId
  );
  const politePassed = Boolean(chosenPolite?.isCorrect);
  if (!politePassed) {
    detailedFeedback.push(
      chosenPolite?.feedback ||
        "Em hãy chọn cách kiểm tra tiền trả lại và ứng xử lịch sự với người bán hàng nhé!"
    );
  } else if (chosenPolite) {
    detailedFeedback.push(chosenPolite.feedback);
  }

  const autoChallengePassed =
    enoughItems && withinBudget && tagsCovered && qualityPassed && mathCorrect && politePassed;

  const checkFlags = [enoughItems, withinBudget, tagsCovered, qualityPassed, mathCorrect, politePassed];
  const scorePercent = Math.round(
    (checkFlags.filter(Boolean).length / checkFlags.length) * 100
  );

  const requiresTeacherConfirmation = stage.interactive.evaluationMode === "HYBRID_TEACHER";
  const hasPracticalNote = Boolean(payload?.practicalNote && payload.practicalNote.trim().length >= 5);

  let nextStatus: StageProgressStatus = "IN_PROGRESS";
  if (autoChallengePassed) {
    if (requiresTeacherConfirmation) {
      nextStatus = hasPracticalNote ? "WAITING_CONFIRMATION" : "IN_PROGRESS";
      if (!hasPracticalNote) {
        detailedFeedback.push(
          "Em đã mua sắm rất thông thái! Hãy ghi thêm chia sẻ thực hành của em để gửi thầy/cô xác nhận hoàn thành chặng nhé."
        );
      }
    } else {
      nextStatus = "COMPLETED";
    }
  }

  return {
    isValid: autoChallengePassed && (!requiresTeacherConfirmation || hasPracticalNote),
    autoChallengePassed,
    requiresTeacherConfirmation,
    nextStatus,
    scorePercent,
    achievedCriterionCodes: autoChallengePassed ? stage.criteria.map((c) => c.code) : [],
    feedbackSummary: autoChallengePassed
      ? `Thanh toán thành công tại ${cfg.shopName}! Em đã chi ${actualTotalCost}/${cfg.walletBudget} Xu và còn dư ${actualRemaining} Xu!`
      : "Giỏ hàng hoặc bước thanh toán cần điều chỉnh một chút. Em xem gợi ý của chim Sky-Line và thử lại nhé!",
    detailedFeedback,
    worldStateEffect: {
      effectType: "SHOP_CHECKOUT_SUCCESS",
      headline: autoChallengePassed
        ? `Giỏ hàng thông thái (${selectedItems.length} món) – Còn dư ${actualRemaining} Xu trong ví!`
        : "Quầy thanh toán đang chờ em kiểm tra lại giỏ hàng.",
      visualLevel: autoChallengePassed ? 3 : 1,
      metrics: {
        selectedCount: selectedItems.length,
        actualTotalCost,
        actualRemaining,
        walletBudget: cfg.walletBudget
      }
    }
  };
}

/**
 * Validate Mechanic C: DREAM_NEST (Xây tổ ước mơ & Hũ xu thông thái)
 */
export function validateDreamNestMechanic(
  stage: TC02SStageDefinition,
  payload: DreamNestSubmissionPayload
): StageValidationResult {
  const cfg = stage.interactive.nestConfig;
  if (!cfg) {
    throw new Error(`Stage ${stage.lessonCode} missing nestConfig`);
  }

  const detailedFeedback: string[] = [];
  const allocations = payload?.jarAllocations || {};

  let totalAllocated = 0;
  let allJarsInRange = true;

  for (const jar of cfg.jars) {
    const val = Number(allocations[jar.id] ?? 0);
    totalAllocated += val;
    if (val < jar.minCoins || val > jar.maxCoins) {
      allJarsInRange = false;
      detailedFeedback.push(
        `Ở "${jar.name}", mức phân bổ hợp lý là từ ${jar.minCoins} đến ${jar.maxCoins} Xu (em đang đặt ${val} Xu).`
      );
    }
  }

  const totalMatchesBudget = totalAllocated === cfg.totalCoins;
  if (!totalMatchesBudget) {
    detailedFeedback.push(
      `Tổng số xu phân bổ vào các hũ cần bằng đúng ${cfg.totalCoins} Xu (hiện tại tổng là ${totalAllocated} Xu).`
    );
  }

  // Goal check if stage has goals (e.g., Stage 11 Piggy Bank)
  let goalPassed = true;
  if (cfg.goals && cfg.goals.length > 0) {
    const selectedGoal = cfg.goals.find((g) => g.id === payload?.selectedGoalId);
    if (!selectedGoal || !selectedGoal.ageAppropriate) {
      goalPassed = false;
      detailedFeedback.push(
        selectedGoal?.feedback ||
          "Em hãy chọn một mục tiêu tiết kiệm vừa sức với học sinh lớp 2 nhé!"
      );
    } else {
      detailedFeedback.push(selectedGoal.feedback);
    }
  }

  // Unexpected twist check
  const chosenTwist = cfg.unexpectedTwist.options.find(
    (opt) => opt.id === payload?.selectedTwistOptionId
  );
  const twistPassed = Boolean(chosenTwist?.isCorrect);
  if (!twistPassed) {
    detailedFeedback.push(
      chosenTwist?.feedback ||
        "Em hãy chọn phương án điều chỉnh kế hoạch phù hợp khi có tình huống bất ngờ nhé!"
    );
  } else if (chosenTwist) {
    detailedFeedback.push(chosenTwist.feedback);
  }

  const autoChallengePassed =
    totalMatchesBudget && allJarsInRange && goalPassed && twistPassed;

  const checkFlags = [totalMatchesBudget, allJarsInRange, goalPassed, twistPassed];
  const scorePercent = Math.round(
    (checkFlags.filter(Boolean).length / checkFlags.length) * 100
  );

  const requiresTeacherConfirmation = stage.interactive.evaluationMode === "HYBRID_TEACHER";
  const hasPracticalNote = Boolean(payload?.practicalNote && payload.practicalNote.trim().length >= 5);

  let nextStatus: StageProgressStatus = "IN_PROGRESS";
  if (autoChallengePassed) {
    if (requiresTeacherConfirmation) {
      nextStatus = hasPracticalNote ? "WAITING_CONFIRMATION" : "IN_PROGRESS";
      if (!hasPracticalNote) {
        detailedFeedback.push(
          "Chiếc tổ ước mơ đã rực sáng! Em hãy viết thêm vài dòng chia sẻ ở mục Thực hành để gửi thầy/cô xác nhận nhé."
        );
      }
    } else {
      nextStatus = "COMPLETED";
    }
  }

  return {
    isValid: autoChallengePassed && (!requiresTeacherConfirmation || hasPracticalNote),
    autoChallengePassed,
    requiresTeacherConfirmation,
    nextStatus,
    scorePercent,
    achievedCriterionCodes: autoChallengePassed ? stage.criteria.map((c) => c.code) : [],
    feedbackSummary: autoChallengePassed
      ? "Chiếc Tổ Ước Mơ của chim Sky-Line đã được nâng cấp vững chắc nhờ kế hoạch phân bổ và tiết kiệm hợp lý!"
      : "Kế hoạch phân bổ xu hoặc xử lý tình huống bất ngờ cần điều chỉnh thêm. Em xem gợi ý và thử lại nhé!",
    detailedFeedback,
    worldStateEffect: {
      effectType: "NEST_UPGRADED",
      headline: autoChallengePassed
        ? "Tổ Ấm Ước Mơ nở hoa và heo đất tích lũy đầy ắp niềm vui!"
        : "Tổ chim đang chờ em hoàn thiện phân bổ các hũ xu.",
      visualLevel: autoChallengePassed ? 3 : 1,
      metrics: {
        totalAllocated,
        totalCoins: cfg.totalCoins,
        allJarsInRange
      }
    }
  };
}

/**
 * Validate Mechanic D: VILLAGE_RESCUE (Giải cứu ngôi làng – tiết kiệm điện nước, giá trị lao động, tái sử dụng & phân biệt tự làm vs nhờ người lớn)
 */
export function validateVillageRescueMechanic(
  stage: TC02SStageDefinition,
  payload: VillageRescueSubmissionPayload
): StageValidationResult {
  const cfg = stage.interactive.villageConfig;
  if (!cfg) {
    throw new Error(`Stage ${stage.lessonCode} missing villageConfig`);
  }

  const detailedFeedback: string[] = [];
  const actionsMap = payload?.hotspotActions || {};

  let restoredCount = 0;
  for (const hotspot of cfg.hotspots) {
    const selectedActionId = actionsMap[hotspot.id];
    const actionObj = hotspot.actions.find((a) => a.id === selectedActionId);
    if (actionObj && actionObj.isCorrect && selectedActionId === hotspot.correctActionId) {
      restoredCount += 1;
    } else {
      detailedFeedback.push(
        `Tại "${hotspot.title}" (${
          hotspot.safetyType === "ASK_ADULT" ? "Cần nhờ người lớn" : "Em tự thực hiện được"
        }): ${actionObj?.feedback || "Em hãy chọn hành động an toàn và tiết kiệm phù hợp nhé!"}`
      );
    }
  }

  const allHotspotsRestored = restoredCount === cfg.hotspots.length;
  const chosenReflection = cfg.reflectionQuestion.options.find(
    (o) => o.id === payload?.selectedReflectionOptionId
  );
  const reflectionPassed = Boolean(chosenReflection?.isCorrect);
  if (!reflectionPassed) {
    detailedFeedback.push(
      chosenReflection?.feedback || "Em hãy trả lời câu hỏi suy ngẫm cuối chặng nhé!"
    );
  } else if (chosenReflection) {
    detailedFeedback.push(chosenReflection.feedback);
  }

  const autoChallengePassed = allHotspotsRestored && reflectionPassed;
  const totalChecks = cfg.hotspots.length + 1;
  const passedChecks = restoredCount + (reflectionPassed ? 1 : 0);
  const scorePercent = Math.round((passedChecks / Math.max(1, totalChecks)) * 100);

  const requiresTeacherConfirmation = stage.interactive.evaluationMode === "HYBRID_TEACHER";
  const hasPracticalNote = Boolean(payload?.practicalNote && payload.practicalNote.trim().length >= 5);

  let nextStatus: StageProgressStatus = "IN_PROGRESS";
  if (autoChallengePassed) {
    if (requiresTeacherConfirmation) {
      nextStatus = hasPracticalNote ? "WAITING_CONFIRMATION" : "IN_PROGRESS";
      if (!hasPracticalNote) {
        detailedFeedback.push(
          "Ngôi làng đã xanh tươi trở lại! Em hãy ghi lại 1 việc làm thực tế của em để thầy/cô xác nhận nhé."
        );
      }
    } else {
      nextStatus = "COMPLETED";
    }
  }

  return {
    isValid: autoChallengePassed && (!requiresTeacherConfirmation || hasPracticalNote),
    autoChallengePassed,
    requiresTeacherConfirmation,
    nextStatus,
    scorePercent,
    achievedCriterionCodes: autoChallengePassed ? stage.criteria.map((c) => c.code) : [],
    feedbackSummary: autoChallengePassed
      ? `Tuyệt vời! Em đã khôi phục toàn bộ ${restoredCount}/${cfg.hotspots.length} điểm trong ngôi làng!`
      : `Em đã khôi phục ${restoredCount}/${cfg.hotspots.length} điểm. Hãy xem lại các điểm còn lại và lưu ý an toàn nhé!`,
    detailedFeedback,
    worldStateEffect: {
      effectType: "VILLAGE_RESTORED",
      headline: autoChallengePassed
        ? "Ngôi làng Xanh rực sáng, cây cối xanh tươi và tài nguyên được bảo vệ!"
        : `Ngôi làng đã khôi phục ${restoredCount}/${cfg.hotspots.length} khu vực.`,
      visualLevel: autoChallengePassed ? 3 : Math.max(1, restoredCount),
      metrics: {
        restoredCount,
        totalHotspots: cfg.hotspots.length,
        reflectionPassed
      }
    }
  };
}

/**
 * Validate Mechanic E: COIN_DIARY_AD_STREET (Nhật ký đồng xu, Phố quảng cáo & Chặng Đích Nhà tài chính nhí tài ba)
 */
export function validateDiaryAdMechanic(
  stage: TC02SStageDefinition,
  payload: DiaryAdSubmissionPayload
): StageValidationResult {
  const cfg = stage.interactive.diaryAdConfig;
  if (!cfg) {
    throw new Error(`Stage ${stage.lessonCode} missing diaryAdConfig`);
  }

  const detailedFeedback: string[] = [];
  let autoChallengePassed = false;
  let scorePercent = 0;

  if (cfg.mode === "COIN_DIARY") {
    const entries = cfg.diaryEntries || [];
    const expectedTotalSpent = entries.reduce((sum, e) => sum + e.cost, 0);
    const expectedRemaining = cfg.startingCoins - expectedTotalSpent;

    const spentMatches = Number(payload?.calculatedTotalSpent) === expectedTotalSpent;
    const remainingMatches = Number(payload?.calculatedRemainingCoins) === expectedRemaining;

    if (!spentMatches || !remainingMatches) {
      detailedFeedback.push(
        `Em hãy kiểm tra lại phép tính: Tổng các khoản đã chi là ${expectedTotalSpent} Xu, từ ${cfg.startingCoins} Xu ban đầu thì số tiền còn lại là ${expectedRemaining} Xu.`
      );
    }

    const classifications = payload?.entryClassifications || {};
    let correctClassifications = 0;
    for (const entry of entries) {
      if (classifications[entry.id] === entry.isNecessary) {
        correctClassifications += 1;
      } else {
        detailedFeedback.push(
          `Khoản "${entry.itemName}" (${entry.cost} Xu): ${entry.note}.`
        );
      }
    }

    const allClassified = correctClassifications === entries.length;
    autoChallengePassed = spentMatches && remainingMatches && allClassified;
    const checks = [spentMatches, remainingMatches, allClassified];
    scorePercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    if (autoChallengePassed) {
      detailedFeedback.push(
        `Chính xác! Em đã tính đúng tổng chi ${expectedTotalSpent} Xu, còn lại ${expectedRemaining} Xu và nhận diện đúng khoản chi hợp lý/chưa hợp lý.`
      );
    }
  } else if (cfg.mode === "AD_DETECTIVE") {
    const billboards = cfg.adBillboards || [];
    const decisions = payload?.adDecisions || {};
    let correctBoards = 0;

    for (const board of billboards) {
      const dec = decisions[board.id];
      const hookOk =
        !dec?.identifiedHookType || dec.identifiedHookType === board.hookType;
      const buyOk = Boolean(dec && dec.shouldBuy === board.shouldBuy);

      if (hookOk && buyOk) {
        correctBoards += 1;
      } else {
        detailedFeedback.push(`Biển quảng cáo "${board.productName}": ${board.explanation}`);
      }
    }

    autoChallengePassed = billboards.length > 0 && correctBoards === billboards.length;
    scorePercent = Math.round((correctBoards / Math.max(1, billboards.length)) * 100);
    if (autoChallengePassed) {
      detailedFeedback.push(
        "Em đã nhận diện chính xác các chi tiết thu hút trong quảng cáo và chọn đúng món hàng phù hợp với nhu cầu & túi tiền!"
      );
    }
  } else if (cfg.mode === "MASTER_FINANCE_CAPSTONE") {
    const cap = cfg.capstoneChallenge!;
    const alloc = payload?.capstoneAllocations || { needCoins: 0, saveCoins: 0, shareCoins: 0 };
    const sumAlloc =
      Number(alloc.needCoins || 0) +
      Number(alloc.saveCoins || 0) +
      Number(alloc.shareCoins || 0);

    const budgetOk = sumAlloc === cap.totalBudget && Number(alloc.needCoins) > 0;
    const saveOk = Number(alloc.saveCoins) >= cap.minSaveCoins;
    const shareOk = Number(alloc.shareCoins) >= cap.minShareCoins;

    if (!budgetOk) {
      detailedFeedback.push(
        `Tổng số xu phân bổ cho 3 mục (Cần thiết + Tiết kiệm + Chia sẻ) cần bằng đúng ${cap.totalBudget} Xu (hiện tại là ${sumAlloc} Xu).`
      );
    }
    if (!saveOk) {
      detailedFeedback.push(
        `Em hãy dành ít nhất ${cap.minSaveCoins} Xu cho mục Tiết kiệm bỏ heo đất nhé!`
      );
    }
    if (!shareOk) {
      detailedFeedback.push(
        `Em hãy dành ít nhất ${cap.minShareCoins} Xu cho mục Chia sẻ yêu thương nhé!`
      );
    }

    const surpriseOpt = cap.surpriseOptions.find(
      (o) => o.id === payload?.selectedSurpriseOptionId
    );
    const surpriseOk = Boolean(surpriseOpt?.isCorrect);
    if (!surpriseOk) {
      detailedFeedback.push(
        surpriseOpt?.feedback ||
          "Em hãy chọn cách xử lý tình huống phát sinh vừa lịch sự vừa bảo vệ kế hoạch tài chính nhé!"
      );
    } else if (surpriseOpt) {
      detailedFeedback.push(surpriseOpt.feedback);
    }

    autoChallengePassed = budgetOk && saveOk && shareOk && surpriseOk;
    const checks = [budgetOk, saveOk, shareOk, surpriseOk];
    scorePercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  const requiresTeacherConfirmation = stage.interactive.evaluationMode === "HYBRID_TEACHER";
  const hasPracticalNote = Boolean(payload?.practicalNote && payload.practicalNote.trim().length >= 5);

  let nextStatus: StageProgressStatus = "IN_PROGRESS";
  if (autoChallengePassed) {
    if (requiresTeacherConfirmation) {
      nextStatus = hasPracticalNote ? "WAITING_CONFIRMATION" : "IN_PROGRESS";
      if (!hasPracticalNote) {
        detailedFeedback.push(
          "Em đã hoàn thành xuất sắc thử thách! Hãy viết lời cam kết / chia sẻ thực tế của em để gửi thầy/cô xác nhận nhé."
        );
      }
    } else {
      nextStatus = "COMPLETED";
    }
  }

  return {
    isValid: autoChallengePassed && (!requiresTeacherConfirmation || hasPracticalNote),
    autoChallengePassed,
    requiresTeacherConfirmation,
    nextStatus,
    scorePercent,
    achievedCriterionCodes: autoChallengePassed ? stage.criteria.map((c) => c.code) : [],
    feedbackSummary: autoChallengePassed
      ? "Chúc mừng! Em đã làm chủ Nhật ký đồng xu và Kính lúp thông thái trên Phố Quảng Cáo!"
      : "Một số phép tính trong Nhật ký đồng xu hoặc lựa chọn quảng cáo chưa chính xác. Em xem gợi ý và thử lại nhé!",
    detailedFeedback,
    worldStateEffect: {
      effectType: "DIARY_AND_BILLBOARD_MASTERED",
      headline: autoChallengePassed
        ? "Nhật ký đồng xu cân đối – Kính lúp thông thái tỏa sáng!"
        : "Sổ nhật ký đồng xu đang chờ em kiểm tra lại số liệu.",
      visualLevel: autoChallengePassed ? 3 : 1,
      metrics: {
        mode: cfg.mode,
        scorePercent
      }
    }
  };
}

/**
 * Dispatcher: Validate any stage submission by lessonCode or periodIndex
 */
export function validateStageSubmission(
  stageOrCode: TC02SStageDefinition | string | number,
  payload: StageActionPayload
): StageValidationResult {
  const stage =
    typeof stageOrCode === "string"
      ? getTC02SStageByLessonCode(stageOrCode)
      : typeof stageOrCode === "number"
      ? getTC02SStageByPeriod(stageOrCode)
      : stageOrCode;

  if (!stage) {
    throw new Error(`Không tìm thấy cấu hình chặng cho mã: ${String(stageOrCode)}`);
  }

  switch (stage.interactive.mechanic) {
    case "BACKPACK_BUILDER":
      return validateBackpackMechanic(stage, payload as BackpackSubmissionPayload);
    case "BIRD_SHOP":
      return validateBirdShopMechanic(stage, payload as ShopSubmissionPayload);
    case "DREAM_NEST":
      return validateDreamNestMechanic(stage, payload as DreamNestSubmissionPayload);
    case "VILLAGE_RESCUE":
      return validateVillageRescueMechanic(stage, payload as VillageRescueSubmissionPayload);
    case "COIN_DIARY_AD_STREET":
      return validateDiaryAdMechanic(stage, payload as DiaryAdSubmissionPayload);
    default:
      throw new Error(`Cơ chế game chưa được hỗ trợ: ${stage.interactive.mechanic}`);
  }
}
