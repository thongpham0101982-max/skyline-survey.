/**
 * advisoryWeights.ts
 * Quy định chuẩn hóa danh mục và trọng số theo khối lớp cho phân hệ Cố vấn học tập Sky-Line K12
 */

export interface AdvisoryCategoryWeight {
  key: string
  label: string
  weight: number // Phần trăm trọng số (0 - 100)
  iconName?: string
  colorClass?: string
  description?: string
}

/**
 * Trích xuất chuẩn hóa khối lớp từ tên khối hoặc tên lớp (VD: "Khối 12", "12/1", "K12", "Lớp 4A"...)
 */
export function normalizeGradeLevel(gradeInput?: string, classInput?: string): string {
  const gStr = String(gradeInput || "").trim()
  const cStr = String(classInput || "").trim()
  const combined = (gStr + " " + cStr).toUpperCase()

  if (
    cStr.startsWith("1.") ||
    cStr.startsWith("1INT") ||
    cStr.startsWith("1UK") ||
    cStr.startsWith("1S") ||
    combined.includes("KHỐI 1") ||
    combined.includes("LỚP 1") ||
    gStr === "1" ||
    gStr === "K1"
  ) {
    return "K1"
  }

  const match = combined.match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
  if (match && match[1]) {
    return "K" + parseInt(match[1], 10)
  }
  return "K12"
}

/**
 * Lấy danh sách nhóm mục tiêu và trọng số theo quy định từng khối:
 * - Học tập: 50% cho tất cả các khối
 * - Khối 1, 4, 5: Sức khỏe: 20%, Sở thích: 15%, Phẩm chất: 15%
 * - Khối 2, 3: Kỹ năng: 20%, Các nhóm còn lại: 10%/nhóm (Sức khỏe, Sở thích, Phẩm chất)
 * - Khối 6–12: Thói quen: 15%, Kỹ năng cảm xúc: 15%, Định hướng: 20%
 */
export function getGradeCategoryWeights(gradeInput?: string, classInput?: string): AdvisoryCategoryWeight[] {
  const grade = normalizeGradeLevel(gradeInput, classInput)

  if (grade === "K1" || grade === "K4" || grade === "K5") {
    return [
      {
        key: "HOC_TAP",
        label: "1. Mục tiêu học tập",
        weight: 50,
        description: "Hoàn thành bài tập, nâng cao kiến thức, rèn chữ viết và khả năng đọc hiểu"
      },
      {
        key: "SUC_KHOE",
        label: "2. Mục tiêu sức khỏe & Thói quen",
        weight: 20,
        description: "Ăn ngủ đúng giờ, tập thể dục, giữ gìn vệ sinh và an toàn thân thể"
      },
      {
        key: "SO_THICH",
        label: "3. Mục tiêu sở thích & Năng khiếu",
        weight: 15,
        description: "Vẽ tranh, âm nhạc, thể thao, đọc sách và các hoạt động yêu thích"
      },
      {
        key: "PHAM_CHAT",
        label: "4. Mục tiêu phẩm chất & Đạo đức",
        weight: 15,
        description: "Lễ phép, trung thực, biết ơn, giúp đỡ bạn bè và người thân"
      }
    ]
  }

  if (grade === "K2" || grade === "K3") {
    return [
      {
        key: "HOC_TAP",
        label: "1. Mục tiêu học tập",
        weight: 50,
        description: "Tự giác học tập, hoàn thành nhiệm vụ và nâng cao điểm số các môn"
      },
      {
        key: "KY_NANG",
        label: "2. Mục tiêu kỹ năng",
        weight: 20,
        description: "Tự phục vụ, giao tiếp tự tin, hợp tác nhóm và xử lý tình huống"
      },
      {
        key: "SUC_KHOE",
        label: "3. Mục tiêu sức khỏe",
        weight: 10,
        description: "Rèn luyện thể lực, ăn uống lành mạnh và giữ thói quen tốt"
      },
      {
        key: "SO_THICH",
        label: "4. Mục tiêu sở thích",
        weight: 10,
        description: "Phát triển sở trường, tham gia câu lạc bộ và hoạt động sáng tạo"
      },
      {
        key: "PHAM_CHAT",
        label: "5. Mục tiêu phẩm chất",
        weight: 10,
        description: "Kỷ luật, đoàn kết, yêu thương và trách nhiệm với tập thể"
      }
    ]
  }

  // Khối 6 đến 12 (K6 - K12)
  return [
    {
      key: "HOC_TAP",
      label: "1. Mục tiêu học tập",
      weight: 50,
      description: "Kết quả học tập các môn, kỳ thi chuẩn hóa, chứng chỉ và phương pháp tự học"
    },
    {
      key: "THOI_QUEN",
      label: "2. Mục tiêu thói quen",
      weight: 15,
      description: "Quản lý thời gian, đọc sách, thể dục thể thao và kỷ luật bản thân"
    },
    {
      key: "KY_NANG_CAM_XUC",
      label: "3. Mục tiêu kỹ năng & Cảm xúc",
      weight: 15,
      description: "Thuyết trình, giao tiếp, quản trị cảm xúc và làm việc nhóm"
    },
    {
      key: "DINH_HUONG",
      label: "4. Mục tiêu định hướng & Hướng nghiệp",
      weight: 20,
      description: "Định hướng ngành nghề, du học, săn học bổng và hồ sơ ngoại khóa"
    }
  ]
}

/**
 * Chuẩn hóa nhận diện key nhóm mục tiêu
 */
export function matchCategoryKey(rawCategory: string, gradeLevel = "K12"): string {
  const c = String(rawCategory || "").toUpperCase().trim()
  if (c.includes("HOC_TAP") || c.includes("HỌC TẬP")) return "HOC_TAP"
  
  if (gradeLevel === "K1" || gradeLevel === "K4" || gradeLevel === "K5" || gradeLevel === "K2" || gradeLevel === "K3") {
    if (c.includes("KY_NANG") || c.includes("KỸ NĂNG")) return "KY_NANG"
    if (c.includes("SUC_KHOE") || c.includes("SỨC KHỎE")) return "SUC_KHOE"
    if (c.includes("SO_THICH") || c.includes("SỞ THÍCH")) return "SO_THICH"
    if (c.includes("PHAM_CHAT") || c.includes("PHẨM CHẤT")) return "PHAM_CHAT"
  }

  if (c.includes("THOI_QUEN") || c.includes("THÓI QUEN") || c.includes("SUC_KHOE") || c.includes("SỨC KHỎE")) return "THOI_QUEN"
  if (c.includes("KY_NANG") || c.includes("KỸ NĂNG") || c.includes("CAM_XUC") || c.includes("CẢM XÚC") || c.includes("SO_THICH")) return "KY_NANG_CAM_XUC"
  if (c.includes("DINH_HUONG") || c.includes("ĐỊNH HƯỚNG") || c.includes("PHAM_CHAT") || c.includes("PHẨM CHẤT")) return "DINH_HUONG"
  return "HOC_TAP"
}

/**
 * Quy đổi trạng thái tiến độ Checkpoint thành % hoàn thành
 */
export function convertProgressStatusToPercent(status?: string): number {
  if (!status || status === "CHUA_DANH_GIA") return 0
  if (status === "DAT" || status === "HOAN_THANH" || status === "COMPLETED") return 100
  if (status === "TIEN_TRIEN" || status === "IN_PROGRESS" || status === "DANG_TIEN_TRIEN") return 50
  if (status === "CAN_CO_GANG" || status === "PARTIAL") return 25
  if (status === "CHUA_DAT" || status === "NOT_STARTED") return 0
  return 0
}

/**
 * Quy đổi mức điểm Rubric (1 - 5) thành % hoàn thành
 */
export function convertRubricLevelToPercent(level?: number): number {
  if (!level || level <= 0) return 0
  if (level === 5) return 100
  if (level === 4) return 75
  if (level === 3) return 50
  if (level === 2) return 25
  if (level === 1) return 10
  return 0
}

export interface SubGoalItem {
  goalId?: string
  categoryKey?: string
  category?: string
  targetText: string
  actionText?: string
  progressStatus?: string
  goalCompletionLevel?: number
  initiativeLevel?: number
  participationAttitude?: number
  teacherNotes?: string
}

export interface CategoryEvaluationResult {
  categoryKey: string
  categoryLabel: string
  weight: number
  subGoalsCount: number
  evaluatedCount: number
  averagePercent: number
  averageRubricLevel: number
  avgGoalCompletion: number // Mức hoàn thành mục tiêu (1 - 5)
  avgInitiative: number // Mức độ chủ động (1 - 5)
  avgParticipation: number // Thái độ tham gia (1 - 5)
  status: "DAT" | "TIEN_TRIEN" | "CHUA_DAT" | "CHUA_DANH_GIA"
}

export interface OverallEvaluationResult {
  gradeLevel: string
  overallPercent: number // 0 - 100%
  overallRubricScore: number // 1.0 - 5.0
  overallGoalCompletion: number // 1.0 - 5.0 (Có trọng số)
  overallInitiative: number // 1.0 - 5.0 (Có trọng số)
  overallParticipation: number // 1.0 - 5.0 (Có trọng số)
  totalWeights: number
  classification: "XUAT_SAC" | "TOT" | "KHA" | "CAN_CO_GANG" | "CHUA_DANH_GIA"
  classificationLabel: string
  classificationColor: string
  categories: CategoryEvaluationResult[]
}

/**
 * Tính toán kết quả đánh giá theo trọng số nhóm và mục tiêu nhỏ cho cả 3 tiêu chí Rubric
 */
export function calculateAdvisoryEvaluation(
  subGoals: SubGoalItem[],
  gradeInput?: string,
  classInput?: string
): OverallEvaluationResult {
  const gradeLevel = normalizeGradeLevel(gradeInput, classInput)
  const categoryDefs = getGradeCategoryWeights(gradeLevel, classInput)

  const categoriesResult: CategoryEvaluationResult[] = []
  let totalWeightedPercent = 0
  let totalWeightedGoalCompletion = 0
  let totalWeightedInitiative = 0
  let totalWeightedParticipation = 0
  let totalWeightsCounted = 0

  for (const catDef of categoryDefs) {
    const matchedItems = subGoals.filter(item => {
      const itemKey = item.categoryKey || matchCategoryKey(item.category || "", gradeLevel)
      return itemKey === catDef.key
    })

    if (matchedItems.length === 0) {
      categoriesResult.push({
        categoryKey: catDef.key,
        categoryLabel: catDef.label,
        weight: catDef.weight,
        subGoalsCount: 0,
        evaluatedCount: 0,
        averagePercent: 0,
        averageRubricLevel: 0,
        avgGoalCompletion: 0,
        avgInitiative: 0,
        avgParticipation: 0,
        status: "CHUA_DANH_GIA"
      })
      continue
    }

    let sumPercent = 0
    let sumGoalCompletion = 0
    let sumInitiative = 0
    let sumParticipation = 0
    let evaluatedCount = 0

    for (const item of matchedItems) {
      let percent = 0
      const gLevel = item.goalCompletionLevel && item.goalCompletionLevel > 0 ? item.goalCompletionLevel : 0
      const iLevel = item.initiativeLevel && item.initiativeLevel > 0 ? item.initiativeLevel : 0
      const pLevel = item.participationAttitude && item.participationAttitude > 0 ? item.participationAttitude : 0

      if (gLevel > 0 || iLevel > 0 || pLevel > 0) {
        const criteriaScores = [gLevel, iLevel, pLevel].filter(v => v > 0)
        const avgCriteria = criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length
        percent = convertRubricLevelToPercent(Math.round(avgCriteria))
        if (gLevel > 0) sumGoalCompletion += gLevel
        if (iLevel > 0) sumInitiative += iLevel
        if (pLevel > 0) sumParticipation += pLevel
        evaluatedCount++
      } else if (item.progressStatus && item.progressStatus !== "CHUA_DANH_GIA") {
        percent = convertProgressStatusToPercent(item.progressStatus)
        const equivalentRubric = percent >= 100 ? 5 : percent >= 50 ? 3 : percent >= 25 ? 2 : 1
        sumGoalCompletion += equivalentRubric
        evaluatedCount++
      }
      sumPercent += percent
    }

    const count = matchedItems.length
    const avgPercent = count > 0 ? Math.round(sumPercent / count) : 0
    const avgGoalComp = evaluatedCount > 0 && sumGoalCompletion > 0 ? Number((sumGoalCompletion / evaluatedCount).toFixed(1)) : 0
    const avgInit = evaluatedCount > 0 && sumInitiative > 0 ? Number((sumInitiative / evaluatedCount).toFixed(1)) : 0
    const avgPart = evaluatedCount > 0 && sumParticipation > 0 ? Number((sumParticipation / evaluatedCount).toFixed(1)) : 0
    const avgRubric = Number((1 + (avgPercent / 100) * 4).toFixed(1))

    let status: "DAT" | "TIEN_TRIEN" | "CHUA_DAT" | "CHUA_DANH_GIA" = "CHUA_DANH_GIA"
    if (evaluatedCount > 0) {
      if (avgPercent >= 75) status = "DAT"
      else if (avgPercent >= 40) status = "TIEN_TRIEN"
      else status = "CHUA_DAT"
    }

    categoriesResult.push({
      categoryKey: catDef.key,
      categoryLabel: catDef.label,
      weight: catDef.weight,
      subGoalsCount: count,
      evaluatedCount,
      averagePercent: avgPercent,
      averageRubricLevel: avgRubric,
      avgGoalCompletion: avgGoalComp,
      avgInitiative: avgInit,
      avgParticipation: avgPart,
      status
    })

    totalWeightedPercent += (avgPercent * catDef.weight) / 100
    if (avgGoalComp > 0) totalWeightedGoalCompletion += (avgGoalComp * catDef.weight) / 100
    if (avgInit > 0) totalWeightedInitiative += (avgInit * catDef.weight) / 100
    if (avgPart > 0) totalWeightedParticipation += (avgPart * catDef.weight) / 100
    totalWeightsCounted += catDef.weight
  }

  const overallPercent = Math.round(totalWeightedPercent)
  const overallRubricScore = Number((1 + (overallPercent / 100) * 4).toFixed(1))
  const overallGoalCompletion = totalWeightedGoalCompletion > 0 ? Number(totalWeightedGoalCompletion.toFixed(1)) : overallRubricScore
  const overallInitiative = totalWeightedInitiative > 0 ? Number(totalWeightedInitiative.toFixed(1)) : overallRubricScore
  const overallParticipation = totalWeightedParticipation > 0 ? Number(totalWeightedParticipation.toFixed(1)) : overallRubricScore

  let classification: "XUAT_SAC" | "TOT" | "KHA" | "CAN_CO_GANG" | "CHUA_DANH_GIA" = "CHUA_DANH_GIA"
  let classificationLabel = "Chưa đánh giá đầy đủ"
  let classificationColor = "text-slate-600 bg-slate-100 border-slate-300"

  const hasAnyEvaluation = categoriesResult.some(c => c.evaluatedCount > 0)
  if (hasAnyEvaluation) {
    if (overallPercent >= 90) {
      classification = "XUAT_SAC"
      classificationLabel = "Xuất sắc 🌟"
      classificationColor = "text-emerald-900 bg-emerald-100 border-emerald-300"
    } else if (overallPercent >= 70) {
      classification = "TOT"
      classificationLabel = "Tốt / Đạt chuẩn 🟢"
      classificationColor = "text-teal-900 bg-teal-100 border-teal-300"
    } else if (overallPercent >= 50) {
      classification = "KHA"
      classificationLabel = "Khá / Đang tiến triển 🟡"
      classificationColor = "text-amber-900 bg-amber-100 border-amber-300"
    } else {
      classification = "CAN_CO_GANG"
      classificationLabel = "Cần cố gắng / Hỗ trợ 🔴"
      classificationColor = "text-rose-900 bg-rose-100 border-rose-300"
    }
  }

  return {
    gradeLevel,
    overallPercent,
    overallRubricScore,
    overallGoalCompletion,
    overallInitiative,
    overallParticipation,
    totalWeights: totalWeightsCounted,
    classification,
    classificationLabel,
    classificationColor,
    categories: categoriesResult
  }
}
