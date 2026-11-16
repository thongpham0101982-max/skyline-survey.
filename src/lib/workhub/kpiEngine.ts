import { prisma } from "@/lib/db"
import { ensureWorkHubSchema, makeWorkHubId, safeJsonParse } from "./schemaInit"
import {
  canActorAccessTargetScope,
  recordWorkHubSystemAudit,
  WorkHubForbiddenError,
  WorkHubValidationError,
} from "./permissions"
import { listScopedWorkHubTasks, selectCanonicalStatisticalTasks } from "./taskEngine"
import type {
  WorkHubActorScope,
  WorkHubKpiDataSourceType,
  WorkHubKpiDefinitionRecord,
  WorkHubKpiDirection,
  WorkHubKpiEvaluationResult,
  WorkHubKpiFormulaConfig,
  WorkHubKpiFormulaType,
  WorkHubKpiMissingRule,
  WorkHubKpiOutcomeBand,
  WorkHubKpiTargetScope,
  WorkHubPlanPeriodType,
  WorkHubTaskRecord,
} from "./types"

/**
 * Đánh giá ngưỡng kết quả (Đạt / Cảnh báo / Chưa đạt / Chưa đủ dữ liệu) theo 3 chiều đánh giá:
 * - HIGHER_IS_BETTER: Càng cao càng tốt
 * - LOWER_IS_BETTER: Càng thấp càng tốt
 * - WITHIN_RANGE: Đạt khi nằm trong khoảng [rangeMin, rangeMax]
 */
export function evaluateKpiOutcomeBand(params: {
  actualValue: number | null
  direction: WorkHubKpiDirection
  targetValue: number
  passThreshold: number
  warningThreshold: number
  capScorePercent: number
  rangeMin?: number | null
  rangeMax?: number | null
}): {
  outcomeBand: WorkHubKpiOutcomeBand
  achievementScorePercent: number | null
} {
  const {
    actualValue,
    direction,
    targetValue,
    passThreshold,
    warningThreshold,
    capScorePercent,
    rangeMin,
    rangeMax,
  } = params

  if (actualValue === null || actualValue === undefined || Number.isNaN(actualValue)) {
    return { outcomeBand: "INSUFFICIENT_DATA", achievementScorePercent: null }
  }

  const cap = capScorePercent > 0 ? capScorePercent : 100

  if (direction === "HIGHER_IS_BETTER") {
    let outcomeBand: WorkHubKpiOutcomeBand = "FAIL"
    if (actualValue >= passThreshold) outcomeBand = "PASS"
    else if (actualValue >= warningThreshold) outcomeBand = "WARNING"

    const rawScore =
      targetValue > 0
        ? (actualValue / targetValue) * 100
        : actualValue >= passThreshold
        ? 100
        : 0
    return {
      outcomeBand,
      achievementScorePercent: Math.max(0, Math.min(cap, Number(rawScore.toFixed(1)))),
    }
  }

  if (direction === "LOWER_IS_BETTER") {
    // Với chỉ số càng thấp càng tốt (VD: Tỷ lệ quá hạn <= 5% là Đạt, <= 12% là Cảnh báo, > 12% là Chưa đạt)
    let outcomeBand: WorkHubKpiOutcomeBand = "FAIL"
    if (actualValue <= passThreshold) outcomeBand = "PASS"
    else if (actualValue <= warningThreshold) outcomeBand = "WARNING"

    let rawScore = 100
    if (actualValue <= targetValue) {
      rawScore = 100
    } else if (warningThreshold > targetValue) {
      const excessRatio = (actualValue - targetValue) / (warningThreshold - targetValue)
      rawScore = Math.max(0, 100 - excessRatio * 35)
    } else {
      rawScore = actualValue <= passThreshold ? 100 : 40
    }
    return {
      outcomeBand,
      achievementScorePercent: Math.max(0, Math.min(cap, Number(rawScore.toFixed(1)))),
    }
  }

  // WITHIN_RANGE: Đạt trong khoảng [minB, maxB]
  const minB = rangeMin !== null && rangeMin !== undefined ? rangeMin : passThreshold
  const maxB = rangeMax !== null && rangeMax !== undefined ? rangeMax : warningThreshold
  const low = Math.min(minB, maxB)
  const high = Math.max(minB, maxB)
  const margin = Math.max(1, (high - low) * 0.25)

  if (actualValue >= low && actualValue <= high) {
    return { outcomeBand: "PASS", achievementScorePercent: Math.min(cap, 100) }
  }
  if (actualValue >= low - margin && actualValue <= high + margin) {
    return { outcomeBand: "WARNING", achievementScorePercent: Math.min(cap, 75) }
  }
  return { outcomeBand: "FAIL", achievementScorePercent: 40 }
}

/**
 * Hàm thuần túy tính giá trị KPI tự động từ tập công việc (đã khử trùng cha-con) hoặc tập báo cáo
 * Đảm bảo mẫu số = 0 trả về "Chưa đủ dữ liệu" (actualValue = null), tuyệt đối không quy về 0 hay 100%!
 */
export function calculateKpiFormulaFromSources(params: {
  formulaType: WorkHubKpiFormulaType
  formulaConfig: WorkHubKpiFormulaConfig
  unit: string
  canonicalTasks: WorkHubTaskRecord[]
  periodStart: Date
  periodEnd: Date
  reportsForRate?: Array<{
    id: string
    status: string
    submittedSnapshotAt?: string | null
    periodEnd: string
  }>
  expectedReportPeriodsCount?: number
  manualValue?: number | null
}): {
  numeratorValue: number | null
  denominatorValue: number | null
  actualValue: number | null
  actualDisplay: string
  sourceRecordIds: string[]
} {
  const { formulaType, formulaConfig, unit, periodStart, periodEnd } = params
  const startMs = periodStart.getTime()
  const endMs = periodEnd.getTime()

  // Lọc công việc theo cấu hình công thức
  const scopedTasks = params.canonicalTasks.filter((t) => {
    if (formulaConfig.excludeCancelled !== false && t.workStatus === "CANCELLED") return false
    if (formulaConfig.excludePaused && t.workStatus === "PAUSED") return false
    if (formulaConfig.categoryFilter && t.category !== formulaConfig.categoryFilter) return false
    // Tập công việc có hạn hoàn thành hoặc hoàn thành rơi vào kỳ tính
    const dueMs = new Date(t.endDate).getTime()
    const compMs = t.completedAt ? new Date(t.completedAt).getTime() : null
    const inPeriod =
      (dueMs >= startMs && dueMs <= endMs) ||
      (compMs !== null && compMs >= startMs && compMs <= endMs)
    return inPeriod
  })

  if (formulaType === "MANUAL_METRIC") {
    if (params.manualValue === null || params.manualValue === undefined || Number.isNaN(params.manualValue)) {
      return {
        numeratorValue: null,
        denominatorValue: null,
        actualValue: null,
        actualDisplay: "Chưa đủ dữ liệu",
        sourceRecordIds: [],
      }
    }
    const val = Number(params.manualValue.toFixed(2))
    return {
      numeratorValue: val,
      denominatorValue: null,
      actualValue: val,
      actualDisplay: `${val}${unit === "%" ? "%" : ` ${unit}`}`,
      sourceRecordIds: [],
    }
  }

  if (formulaType === "CONFIRMED_OUTPUT_COUNT") {
    // Chỉ số đếm số lượng sản phẩm chuyên môn đã xác nhận (KHÔNG chia mẫu số!)
    // Nếu kỳ tính không có bất kỳ công việc nào được giao trong phạm vi -> Chưa đủ dữ liệu (nếu chưa phát sinh giao việc)
    if (scopedTasks.length === 0) {
      return {
        numeratorValue: null,
        denominatorValue: 0,
        actualValue: null,
        actualDisplay: "Chưa đủ dữ liệu",
        sourceRecordIds: [],
      }
    }
    const confirmedTasks = scopedTasks.filter(
      (t) => t.workStatus === "COMPLETED" && t.productMetCriteria !== false
    )
    const count = confirmedTasks.length
    return {
      numeratorValue: count,
      denominatorValue: scopedTasks.length,
      actualValue: count,
      actualDisplay: `${count} ${unit || "sản phẩm"}`,
      sourceRecordIds: confirmedTasks.map((t) => t.id),
    }
  }

  if (formulaType === "ON_TIME_REPORT_RATE") {
    const expectedCount = params.expectedReportPeriodsCount ?? (params.reportsForRate?.length || 0)
    if (expectedCount <= 0) {
      return {
        numeratorValue: 0,
        denominatorValue: 0,
        actualValue: null,
        actualDisplay: "Chưa đủ dữ liệu",
        sourceRecordIds: [],
      }
    }
    const reports = params.reportsForRate || []
    const onTimeReports = reports.filter((r) => {
      if (r.status === "DRAFT") return false
      if (!r.submittedSnapshotAt) return false
      const subMs = new Date(r.submittedSnapshotAt).getTime()
      const pEndMs = new Date(r.periodEnd).getTime() + 36 * 3600 * 1000 // cộng 36h hạn chót nộp sau kỳ
      return subMs <= pEndMs
    })
    const num = onTimeReports.length
    const actual = Number(((num / expectedCount) * 100).toFixed(1))
    return {
      numeratorValue: num,
      denominatorValue: expectedCount,
      actualValue: actual,
      actualDisplay: `${actual}%`,
      sourceRecordIds: reports.map((r) => r.id),
    }
  }

  if (formulaType === "ON_TIME_TASK_RATE") {
    const denominator = scopedTasks.length
    if (denominator === 0) {
      return {
        numeratorValue: 0,
        denominatorValue: 0,
        actualValue: null,
        actualDisplay: "Chưa đủ dữ liệu",
        sourceRecordIds: [],
      }
    }
    const onTimeDone = scopedTasks.filter(
      (t) => t.workStatus === "COMPLETED" && t.completedOnTime === true
    )
    const num = onTimeDone.length
    const actual = Number(((num / denominator) * 100).toFixed(1))
    return {
      numeratorValue: num,
      denominatorValue: denominator,
      actualValue: actual,
      actualDisplay: `${actual}%`,
      sourceRecordIds: scopedTasks.map((t) => t.id),
    }
  }

  if (formulaType === "ACCEPTED_TASK_RATE") {
    const candidateTasks = scopedTasks.filter(
      (t) =>
        t.workStatus === "COMPLETED" ||
        t.workStatus === "PENDING_REVIEW" ||
        t.submittedForReviewAt !== null ||
        t.isOverdue
    )
    const denominator = candidateTasks.length
    if (denominator === 0) {
      return {
        numeratorValue: 0,
        denominatorValue: 0,
        actualValue: null,
        actualDisplay: "Chưa đủ dữ liệu",
        sourceRecordIds: [],
      }
    }
    const accepted = candidateTasks.filter((t) => t.workStatus === "COMPLETED")
    const num = accepted.length
    const actual = Number(((num / denominator) * 100).toFixed(1))
    return {
      numeratorValue: num,
      denominatorValue: denominator,
      actualValue: actual,
      actualDisplay: `${actual}%`,
      sourceRecordIds: candidateTasks.map((t) => t.id),
    }
  }

  // DELIVERABLE_PASS_RATE: Tỷ lệ sản phẩm đáp ứng tiêu chí nghiệm thu
  const reviewedTasks = scopedTasks.filter(
    (t) => t.productMetCriteria !== null || t.workStatus === "COMPLETED"
  )
  const denominator = reviewedTasks.length
  if (denominator === 0) {
    return {
      numeratorValue: 0,
      denominatorValue: 0,
      actualValue: null,
      actualDisplay: "Chưa đủ dữ liệu",
      sourceRecordIds: [],
    }
  }
  const passed = reviewedTasks.filter((t) => t.productMetCriteria !== false && t.workStatus === "COMPLETED")
  const num = passed.length
  const actual = Number(((num / denominator) * 100).toFixed(1))
  return {
    numeratorValue: num,
    denominatorValue: denominator,
    actualValue: actual,
    actualDisplay: `${actual}%`,
    sourceRecordIds: reviewedTasks.map((t) => t.id),
  }
}

/**
 * Tổng hợp bảng điểm KPI (kiểm tra tổng trọng số, xử lý thiếu dữ liệu và áp mức trần điểm)
 */
export function computeKpiScorecardSummary(
  evaluations: WorkHubKpiEvaluationResult[],
  overallCapPercent = 100
): {
  configuredKpiCount: number
  weightedKpiCount: number
  totalConfiguredWeight: number
  isWeightSumValid: boolean
  weightValidationWarning: string | null
  insufficientDataCount: number
  aggregatedScorePercent: number | null
  aggregatedDisplay: string
} {
  const configuredKpiCount = evaluations.length
  const weightedItems = evaluations.filter((e) => typeof e.weight === "number" && e.weight > 0)
  const weightedKpiCount = weightedItems.length
  const totalConfiguredWeight = Number(
    weightedItems.reduce((s, e) => s + Number(e.weight || 0), 0).toFixed(2)
  )
  const isWeightSumValid =
    weightedKpiCount === 0 || Math.abs(totalConfiguredWeight - 100) <= 0.01

  const weightValidationWarning =
    weightedKpiCount > 0 && !isWeightSumValid
      ? `Tổng trọng số các chỉ số KPI đang là ${totalConfiguredWeight}% (khác 100%). Vui lòng rà soát lại cấu hình trọng số.`
      : null

  const insufficientDataCount = evaluations.filter(
    (e) => e.outcomeBand === "INSUFFICIENT_DATA"
  ).length

  if (weightedKpiCount === 0) {
    return {
      configuredKpiCount,
      weightedKpiCount: 0,
      totalConfiguredWeight: 0,
      isWeightSumValid: true,
      weightValidationWarning: null,
      insufficientDataCount,
      aggregatedScorePercent: null,
      aggregatedDisplay: "Không dùng bảng điểm trọng số",
    }
  }

  const validScored = weightedItems.filter(
    (e) => e.outcomeBand !== "INSUFFICIENT_DATA" && typeof e.achievementScorePercent === "number"
  )
  if (validScored.length === 0) {
    return {
      configuredKpiCount,
      weightedKpiCount,
      totalConfiguredWeight,
      isWeightSumValid,
      weightValidationWarning,
      insufficientDataCount,
      aggregatedScorePercent: null,
      aggregatedDisplay: "Chưa đủ dữ liệu",
    }
  }

  const activeWeightSum = validScored.reduce((s, e) => s + Number(e.weight || 0), 0)
  const weightedSum = validScored.reduce(
    (s, e) => s + Number(e.achievementScorePercent || 0) * Number(e.weight || 0),
    0
  )
  const rawAgg = activeWeightSum > 0 ? weightedSum / activeWeightSum : 0
  const capped = Math.min(overallCapPercent, Number(rawAgg.toFixed(1)))

  return {
    configuredKpiCount,
    weightedKpiCount,
    totalConfiguredWeight,
    isWeightSumValid,
    weightValidationWarning,
    insufficientDataCount,
    aggregatedScorePercent: capped,
    aggregatedDisplay: `${capped}%`,
  }
}

function defaultFormulaConfigForType(formulaType: WorkHubKpiFormulaType): WorkHubKpiFormulaConfig {
  switch (formulaType) {
    case "ON_TIME_TASK_RATE":
      return {
        numeratorDescription: "Số công việc lá hoàn thành đúng hạn (completedAt <= endDate) trong kỳ",
        denominatorDescription: "Tổng số công việc lá có hạn hoàn thành hoặc kết thúc trong kỳ (loại trừ CV hủy & cha có con)",
        includedTaskFilter: "ALL_ASSIGNED_LEAF",
        excludeCancelled: true,
        excludePaused: false,
      }
    case "ACCEPTED_TASK_RATE":
      return {
        numeratorDescription: "Số công việc lá đã được người nghiệm thu xác nhận Hoàn thành",
        denominatorDescription: "Tổng số công việc lá đã gửi nghiệm thu hoặc đến hạn nghiệm thu trong kỳ",
        includedTaskFilter: "REVIEW_REQUIRED_LEAF",
        excludeCancelled: true,
        excludePaused: false,
      }
    case "ON_TIME_REPORT_RATE":
      return {
        numeratorDescription: "Số báo cáo định kỳ gửi đúng thời điểm chốt",
        denominatorDescription: "Tổng số kỳ báo cáo yêu cầu trong giai đoạn đánh giá",
        includedTaskFilter: "SUBMITTED_REPORTS",
        excludeCancelled: true,
        excludePaused: false,
      }
    case "DELIVERABLE_PASS_RATE":
      return {
        numeratorDescription: "Số công việc có sản phẩm đầu ra được nghiệm thu xác nhận đạt tiêu chí",
        denominatorDescription: "Tổng số công việc đã qua đánh giá nghiệm thu sản phẩm trong kỳ",
        includedTaskFilter: "REVIEW_REQUIRED_LEAF",
        excludeCancelled: true,
        excludePaused: false,
      }
    case "CONFIRMED_OUTPUT_COUNT":
      return {
        numeratorDescription: "Tổng số lượng sản phẩm chuyên môn đã được xác nhận hoàn thành đạt chuẩn",
        denominatorDescription: "Không chia mẫu số (chỉ số đếm sản lượng chuyên môn thực chứng)",
        includedTaskFilter: "REVIEW_REQUIRED_LEAF",
        excludeCancelled: true,
        excludePaused: false,
      }
    default:
      return {
        numeratorDescription: "Giá trị thực tế được người phụ trách / quản lý nhập kèm minh chứng kiểm chứng",
        denominatorDescription: "Đối chiếu trực tiếp với ngưỡng mục tiêu / khoảng cho phép",
        includedTaskFilter: "MANUAL_INPUT",
        excludeCancelled: true,
        excludePaused: false,
      }
  }
}

export async function listWorkHubKpiDefinitions(
  actor: WorkHubActorScope,
  filters?: { targetScope?: string; activeOnly?: boolean }
): Promise<WorkHubKpiDefinitionRecord[]> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return []

  const rows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_kpi_definitions" ORDER BY "kpiCode" ASC`
  )

  return (rows || [])
    .filter((r) => {
      if (filters?.activeOnly && !Number(r.isActive)) return false
      if (filters?.targetScope && filters.targetScope !== "ALL" && r.targetScope !== filters.targetScope) {
        return false
      }
      if (!actor.isExecutive) {
        if (
          r.departmentId &&
          r.departmentId !== actor.primaryDepartmentId &&
          !actor.managedDepartmentIds?.includes(String(r.departmentId))
        ) {
          return false
        }
        if (
          r.campusId &&
          r.campusId !== actor.primaryCampusId &&
          !actor.managedCampusIds?.includes(String(r.campusId))
        ) {
          return false
        }
      }
      return true
    })
    .map((r) => {
      const fType = (r.formulaType as WorkHubKpiFormulaType) || "ON_TIME_TASK_RATE"
      return {
        id: String(r.id),
        kpiCode: String(r.kpiCode),
        name: String(r.name),
        purpose: String(r.purpose || ""),
        unit: String(r.unit || "%"),
        targetScope: (r.targetScope as WorkHubKpiTargetScope) || "INDIVIDUAL",
        evaluationCycle: (r.evaluationCycle as WorkHubPlanPeriodType) || "MONTHLY",
        effectiveFrom: String(r.effectiveFrom),
        effectiveTo: r.effectiveTo ? String(r.effectiveTo) : null,
        targetValue: Number(r.targetValue),
        direction: (r.direction as WorkHubKpiDirection) || "HIGHER_IS_BETTER",
        formulaType: fType,
        formulaConfig: safeJsonParse<WorkHubKpiFormulaConfig>(
          r.formulaConfigJson,
          defaultFormulaConfigForType(fType)
        ),
        dataSourceType: (r.dataSourceType as WorkHubKpiDataSourceType) || "AUTO",
        passThreshold: Number(r.passThreshold),
        warningThreshold: Number(r.warningThreshold),
        failThreshold: Number(r.failThreshold),
        weight: r.weight !== null && r.weight !== undefined ? Number(r.weight) : null,
        capScorePercent: Number(r.capScorePercent || 100),
        confirmerRoleOrUserId: r.confirmerRoleOrUserId ? String(r.confirmerRoleOrUserId) : null,
        missingDataRule: (r.missingDataRule as WorkHubKpiMissingRule) || "EXCLUDE_REWEIGHT",
        exceptionNote: r.exceptionNote ? String(r.exceptionNote) : null,
        currentVersion: Number(r.currentVersion || 1),
        isActive: Boolean(Number(r.isActive ?? 1)),
        departmentId: r.departmentId ? String(r.departmentId) : null,
        campusId: r.campusId ? String(r.campusId) : null,
        createdAt: String(r.createdAt),
        updatedAt: String(r.updatedAt),
      }
    })
}

/**
 * Tạo mới hoặc cập nhật phiên bản cấu hình KPI (Lưu phiên bản công thức, mục tiêu & trọng số để không làm sai lệch kỳ đã chốt)
 */
export async function saveWorkHubKpiDefinition(
  actor: WorkHubActorScope,
  input: {
    id?: string
    kpiCode: string
    name: string
    purpose: string
    unit: string
    targetScope: WorkHubKpiTargetScope
    evaluationCycle: WorkHubPlanPeriodType
    effectiveFrom: string
    effectiveTo?: string | null
    targetValue: number
    direction: WorkHubKpiDirection
    formulaType: WorkHubKpiFormulaType
    formulaConfig?: Partial<WorkHubKpiFormulaConfig>
    dataSourceType?: WorkHubKpiDataSourceType
    passThreshold: number
    warningThreshold: number
    failThreshold: number
    weight?: number | null
    capScorePercent?: number
    confirmerRoleOrUserId?: string | null
    missingDataRule?: WorkHubKpiMissingRule
    exceptionNote?: string | null
    isActive?: boolean
    departmentId?: string | null
    campusId?: string | null
    changeReason?: string
  }
): Promise<{ id: string; versionNumber: number }> {
  await ensureWorkHubSchema()
  if (!actor.canManageKpiDefinitions) {
    throw new WorkHubForbiddenError("Bạn không có quyền thiết lập hoặc điều chỉnh cấu hình chỉ số KPI.")
  }
  if (!input.kpiCode?.trim() || !input.name?.trim() || !input.purpose?.trim()) {
    throw new WorkHubValidationError("Mã KPI, tên chỉ số và mục đích đánh giá là bắt buộc.")
  }

  const pAny = prisma as any
  const nowIso = new Date().toISOString()
  const baseConfig = defaultFormulaConfigForType(input.formulaType)
  const mergedFormulaConfig: WorkHubKpiFormulaConfig = {
    ...baseConfig,
    ...(input.formulaConfig || {}),
  }
  const resolvedSourceType: WorkHubKpiDataSourceType =
    input.formulaType === "MANUAL_METRIC" ? "MANUAL" : input.dataSourceType || "AUTO"

  if (!input.id) {
    const id = makeWorkHubId("whkpi")
    await pAny.$executeRawUnsafe(
      `INSERT INTO "workhub_kpi_definitions" (
        "id", "kpiCode", "name", "purpose", "unit", "targetScope", "evaluationCycle",
        "effectiveFrom", "effectiveTo", "targetValue", "direction", "formulaType",
        "formulaConfigJson", "dataSourceType", "passThreshold", "warningThreshold",
        "failThreshold", "weight", "capScorePercent", "confirmerRoleOrUserId",
        "missingDataRule", "exceptionNote", "currentVersion", "isActive",
        "departmentId", "campusId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      id,
      input.kpiCode.trim().toUpperCase(),
      input.name.trim(),
      input.purpose.trim(),
      input.unit.trim() || "%",
      input.targetScope,
      input.evaluationCycle,
      new Date(input.effectiveFrom).toISOString(),
      input.effectiveTo ? new Date(input.effectiveTo).toISOString() : null,
      Number(input.targetValue),
      input.direction,
      input.formulaType,
      JSON.stringify(mergedFormulaConfig),
      resolvedSourceType,
      Number(input.passThreshold),
      Number(input.warningThreshold),
      Number(input.failThreshold),
      input.weight !== undefined && input.weight !== null ? Number(input.weight) : null,
      Number(input.capScorePercent ?? 100),
      input.confirmerRoleOrUserId || null,
      input.missingDataRule || "EXCLUDE_REWEIGHT",
      input.exceptionNote || null,
      input.isActive === false ? 0 : 1,
      input.departmentId || null,
      input.campusId || null,
      nowIso,
      nowIso
    )

    await recordWorkHubSystemAudit({
      actor,
      action: "KPI_DEFINITION_CREATED",
      targetTable: "workhub_kpi_definitions",
      targetId: id,
      newValues: { kpiCode: input.kpiCode, formulaType: input.formulaType, targetValue: input.targetValue },
    })
    return { id, versionNumber: 1 }
  }

  // Update existing KPI -> create version snapshot first!
  const existingRows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_kpi_definitions" WHERE "id" = ? LIMIT 1`,
    input.id
  )
  const existing = existingRows?.[0]
  if (!existing) throw new WorkHubValidationError("Không tìm thấy chỉ số KPI cần cập nhật.")

  const reason = (input.changeReason || "").trim()
  if (!reason) {
    throw new WorkHubValidationError(
      "Khi thay đổi công thức, mục tiêu hoặc trọng số KPI, vui lòng nhập lý do cập nhật phiên bản."
    )
  }

  const prevVer = Number(existing.currentVersion || 1)
  const nextVer = prevVer + 1

  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_kpi_versions" (
      "id", "kpiId", "versionNumber", "changeReason",
      "configSnapshotJson", "changedByUserId", "changedByName", "createdAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    makeWorkHubId("whkv"),
    input.id,
    prevVer,
    reason,
    JSON.stringify(existing),
    actor.userId,
    actor.userName,
    nowIso
  )

  await pAny.$executeRawUnsafe(
    `UPDATE "workhub_kpi_definitions"
     SET "name" = ?, "purpose" = ?, "unit" = ?, "targetScope" = ?, "evaluationCycle" = ?,
         "effectiveFrom" = ?, "effectiveTo" = ?, "targetValue" = ?, "direction" = ?,
         "formulaType" = ?, "formulaConfigJson" = ?, "dataSourceType" = ?,
         "passThreshold" = ?, "warningThreshold" = ?, "failThreshold" = ?,
         "weight" = ?, "capScorePercent" = ?, "confirmerRoleOrUserId" = ?,
         "missingDataRule" = ?, "exceptionNote" = ?, "currentVersion" = ?,
         "isActive" = ?, "departmentId" = ?, "campusId" = ?, "updatedAt" = ?
     WHERE "id" = ?`,
    input.name.trim(),
    input.purpose.trim(),
    input.unit.trim() || "%",
    input.targetScope,
    input.evaluationCycle,
    new Date(input.effectiveFrom).toISOString(),
    input.effectiveTo ? new Date(input.effectiveTo).toISOString() : null,
    Number(input.targetValue),
    input.direction,
    input.formulaType,
    JSON.stringify(mergedFormulaConfig),
    resolvedSourceType,
    Number(input.passThreshold),
    Number(input.warningThreshold),
    Number(input.failThreshold),
    input.weight !== undefined && input.weight !== null ? Number(input.weight) : null,
    Number(input.capScorePercent ?? 100),
    input.confirmerRoleOrUserId || null,
    input.missingDataRule || "EXCLUDE_REWEIGHT",
    input.exceptionNote || null,
    nextVer,
    input.isActive === false ? 0 : 1,
    input.departmentId ?? existing.departmentId,
    input.campusId ?? existing.campusId,
    nowIso,
    input.id
  )

  await recordWorkHubSystemAudit({
    actor,
    action: "KPI_DEFINITION_VERSIONED_UPDATE",
    targetTable: "workhub_kpi_definitions",
    targetId: input.id,
    oldValues: { version: prevVer, targetValue: existing.targetValue, weight: existing.weight },
    newValues: { version: nextVer, targetValue: input.targetValue, weight: input.weight, reason },
  })

  return { id: input.id, versionNumber: nextVer }
}

/**
 * Tính toán và truy xuất kết quả KPI theo đối tượng (Cá nhân / Phòng ban / Cơ sở) và Kỳ đánh giá.
 * Nếu kỳ đánh giá đã được xác nhận chốt (status === 'CONFIRMED'), giữ nguyên công thức & kết quả phiên bản đã chốt!
 */
export async function evaluateTargetWorkHubKpis(
  actor: WorkHubActorScope,
  params: {
    targetScope: WorkHubKpiTargetScope
    targetEntityId: string
    periodKey: string
    periodLabel: string
    periodStart: string
    periodEnd: string
    academicYearId?: string
  }
): Promise<{
  evaluations: WorkHubKpiEvaluationResult[]
  scorecard: ReturnType<typeof computeKpiScorecardSummary>
}> {
  await ensureWorkHubSchema()
  if (
    !canActorAccessTargetScope(actor, {
      targetScope: params.targetScope,
      targetId: params.targetEntityId,
    })
  ) {
    throw new WorkHubForbiddenError("Bạn không có quyền xem chỉ tiêu KPI của đối tượng ngoài phạm vi quản lý.")
  }

  const pAny = prisma as any
  const definitions = await listWorkHubKpiDefinitions(actor, {
    targetScope: params.targetScope,
    activeOnly: false,
  })

  // Fetch existing saved/confirmed evaluations for this target + period
  const savedRows: any[] =
    typeof pAny.$queryRawUnsafe === "function"
      ? await pAny.$queryRawUnsafe(
          `SELECT * FROM "workhub_kpi_evaluations" WHERE "targetScope" = ? AND "targetEntityId" = ? AND "periodKey" = ?`,
          params.targetScope,
          params.targetEntityId,
          params.periodKey
        )
      : []

  const savedByKpiId = new Map<string, any>()
  for (const r of savedRows || []) {
    savedByKpiId.set(String(r.kpiId), r)
  }

  // Resolve target entity display name
  let targetEntityName = params.targetEntityId
  if (params.targetScope === "INDIVIDUAL") {
    const u = await prisma.user.findUnique({
      where: { id: params.targetEntityId },
      select: { fullName: true },
    })
    if (u?.fullName) targetEntityName = u.fullName
  } else if (params.targetScope === "DEPARTMENT") {
    const d = await prisma.department.findUnique({
      where: { id: params.targetEntityId },
      select: { name: true },
    })
    if (d?.name) targetEntityName = d.name
  } else if (params.targetScope === "CAMPUS") {
    const c = await prisma.campus.findUnique({
      where: { id: params.targetEntityId },
      select: { campusName: true },
    })
    if (c?.campusName) targetEntityName = c.campusName
  }

  // Load scoped tasks & reports for live calculation of unconfirmed KPIs
  const taskFilters: any = { academicYearId: params.academicYearId }
  if (params.targetScope === "INDIVIDUAL") taskFilters.userId = params.targetEntityId
  if (params.targetScope === "DEPARTMENT") taskFilters.departmentId = params.targetEntityId
  if (params.targetScope === "CAMPUS") taskFilters.campusId = params.targetEntityId

  const [scopedTasks, reportRows] = await Promise.all([
    listScopedWorkHubTasks(actor, taskFilters),
    typeof pAny.$queryRawUnsafe === "function"
      ? pAny
          .$queryRawUnsafe(
            `SELECT "id", "status", "submittedSnapshotAt", "periodEnd" FROM "workhub_reports"
             WHERE "reportScope" = ? AND (${
               params.targetScope === "INDIVIDUAL"
                 ? `"ownerUserId" = ?`
                 : params.targetScope === "DEPARTMENT"
                 ? `"departmentId" = ?`
                 : `"campusId" = ?`
             })`,
            params.targetScope,
            params.targetEntityId
          )
          .catch(() => [])
      : Promise.resolve([]),
  ])

  const canonicalTasks = selectCanonicalStatisticalTasks(scopedTasks)
  const pStart = new Date(params.periodStart)
  const pEnd = new Date(params.periodEnd)

  const evaluations: WorkHubKpiEvaluationResult[] = []

  for (const def of definitions) {
    const saved = savedByKpiId.get(def.id)

    // Nếu đã chốt CONFIRMED ở kỳ này -> trả về đúng bản ghi đã chốt theo phiên bản lúc chốt!
    if (saved && saved.status === "CONFIRMED") {
      const snap = safeJsonParse<any>(saved.formulaSnapshotJson, {})
      const actualVal =
        saved.actualValue !== null && saved.actualValue !== undefined
          ? Number(saved.actualValue)
          : null
      const unitStr = snap.unit || def.unit
      evaluations.push({
        id: String(saved.id),
        kpiId: def.id,
        kpiCode: def.kpiCode,
        kpiName: snap.name || def.name,
        purpose: snap.purpose || def.purpose,
        unit: unitStr,
        kpiVersion: Number(saved.kpiVersion || def.currentVersion),
        targetScope: params.targetScope,
        targetEntityId: params.targetEntityId,
        targetEntityName,
        periodKey: params.periodKey,
        periodLabel: params.periodLabel,
        direction: snap.direction || def.direction,
        formulaType: snap.formulaType || def.formulaType,
        formulaConfig: snap.formulaConfig || def.formulaConfig,
        dataSourceType: snap.dataSourceType || def.dataSourceType,
        targetValue: Number(snap.targetValue ?? def.targetValue),
        passThreshold: Number(snap.passThreshold ?? def.passThreshold),
        warningThreshold: Number(snap.warningThreshold ?? def.warningThreshold),
        weight: snap.weight !== undefined ? snap.weight : def.weight,
        capScorePercent: Number(snap.capScorePercent ?? def.capScorePercent),
        numeratorValue: saved.numeratorValue !== null ? Number(saved.numeratorValue) : null,
        denominatorValue: saved.denominatorValue !== null ? Number(saved.denominatorValue) : null,
        actualValue: actualVal,
        actualDisplay:
          actualVal === null
            ? "Chưa đủ dữ liệu"
            : `${actualVal}${unitStr === "%" ? "%" : ` ${unitStr}`}`,
        achievementScorePercent:
          saved.achievementScorePercent !== null ? Number(saved.achievementScorePercent) : null,
        outcomeBand: (saved.outcomeBand as WorkHubKpiOutcomeBand) || "INSUFFICIENT_DATA",
        sourceRecordIds: safeJsonParse<string[]>(saved.sourceRecordIdsJson, []),
        manualEvidenceNote: saved.manualEvidenceNote || null,
        status: "CONFIRMED",
        confirmedByUserId: saved.confirmedByUserId || null,
        confirmedByName: saved.confirmedByName || null,
        confirmedAt: saved.confirmedAt ? String(saved.confirmedAt) : null,
        updatedAt: String(saved.updatedAt),
      })
      continue
    }

    if (!def.isActive) continue

    // Kiểm tra thời gian hiệu lực của KPI
    const effFrom = new Date(def.effectiveFrom)
    const effTo = def.effectiveTo ? new Date(def.effectiveTo) : null
    if (effFrom.getTime() > pEnd.getTime()) continue
    if (effTo && effTo.getTime() < pStart.getTime()) continue

    const manualVal =
      def.dataSourceType === "MANUAL" && saved && saved.actualValue !== null
        ? Number(saved.actualValue)
        : null

    const calc = calculateKpiFormulaFromSources({
      formulaType: def.formulaType,
      formulaConfig: def.formulaConfig,
      unit: def.unit,
      canonicalTasks,
      periodStart: pStart,
      periodEnd: pEnd,
      reportsForRate: reportRows,
      expectedReportPeriodsCount: reportRows.length > 0 ? reportRows.length : 0,
      manualValue: manualVal,
    })

    const band = evaluateKpiOutcomeBand({
      actualValue: calc.actualValue,
      direction: def.direction,
      targetValue: def.targetValue,
      passThreshold: def.passThreshold,
      warningThreshold: def.warningThreshold,
      capScorePercent: def.capScorePercent,
      rangeMin: def.formulaConfig.rangeMin,
      rangeMax: def.formulaConfig.rangeMax,
    })

    evaluations.push({
      id: saved?.id ? String(saved.id) : `prov_${def.id}_${params.periodKey}`,
      kpiId: def.id,
      kpiCode: def.kpiCode,
      kpiName: def.name,
      purpose: def.purpose,
      unit: def.unit,
      kpiVersion: def.currentVersion,
      targetScope: params.targetScope,
      targetEntityId: params.targetEntityId,
      targetEntityName,
      periodKey: params.periodKey,
      periodLabel: params.periodLabel,
      direction: def.direction,
      formulaType: def.formulaType,
      formulaConfig: def.formulaConfig,
      dataSourceType: def.dataSourceType,
      targetValue: def.targetValue,
      passThreshold: def.passThreshold,
      warningThreshold: def.warningThreshold,
      weight: def.weight,
      capScorePercent: def.capScorePercent,
      numeratorValue: calc.numeratorValue,
      denominatorValue: calc.denominatorValue,
      actualValue: calc.actualValue,
      actualDisplay: calc.actualDisplay,
      achievementScorePercent: band.achievementScorePercent,
      outcomeBand: band.outcomeBand,
      sourceRecordIds: calc.sourceRecordIds,
      manualEvidenceNote: saved?.manualEvidenceNote || null,
      status: "PROVISIONAL",
      confirmedByUserId: null,
      confirmedByName: null,
      confirmedAt: null,
      updatedAt: saved?.updatedAt ? String(saved.updatedAt) : new Date().toISOString(),
    })
  }

  return {
    evaluations,
    scorecard: computeKpiScorecardSummary(evaluations),
  }
}

/**
 * Nhập số liệu thủ công cho KPI loại MANUAL hoặc Xác nhận chốt kết quả KPI (khóa theo phiên bản công thức hiện hành)
 */
export async function recordOrConfirmKpiEvaluation(
  actor: WorkHubActorScope,
  params: {
    kpiId: string
    targetScope: WorkHubKpiTargetScope
    targetEntityId: string
    periodKey: string
    periodLabel: string
    periodStart: string
    periodEnd: string
    mode: "SAVE_MANUAL_VALUE" | "CONFIRM_RESULT"
    manualActualValue?: number | null
    manualEvidenceNote?: string
  }
): Promise<void> {
  await ensureWorkHubSchema()
  const pAny = prisma as any

  if (params.mode === "CONFIRM_RESULT") {
    if (!actor.isExecutive && !actor.isDepartmentHead && !actor.isCampusHead) {
      throw new WorkHubForbiddenError("Chỉ cấp quản lý / người xác nhận kết quả mới có quyền chốt điểm KPI.")
    }
    if (params.targetScope === "INDIVIDUAL" && params.targetEntityId === actor.userId && !actor.isExecutive) {
      throw new WorkHubForbiddenError("Người được đánh giá không thể tự xác nhận chốt kết quả KPI của chính mình.")
    }
  } else {
    if (
      !canActorAccessTargetScope(actor, {
        targetScope: params.targetScope,
        targetId: params.targetEntityId,
      })
    ) {
      throw new WorkHubForbiddenError()
    }
  }

  const defs = await listWorkHubKpiDefinitions(actor, { activeOnly: false })
  const def = defs.find((d) => d.id === params.kpiId)
  if (!def) throw new WorkHubValidationError("Không tìm thấy cấu hình chỉ số KPI.")

  // Compute current snapshot first
  const currentEval = await evaluateTargetWorkHubKpis(actor, {
    targetScope: params.targetScope,
    targetEntityId: params.targetEntityId,
    periodKey: params.periodKey,
    periodLabel: params.periodLabel,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  })
  const item = currentEval.evaluations.find((e) => e.kpiId === params.kpiId)
  if (item?.status === "CONFIRMED") {
    throw new WorkHubValidationError("Kết quả KPI kỳ này đã được xác nhận chốt và khóa phiên bản.")
  }

  const nowIso = new Date().toISOString()
  let actualVal = item?.actualValue ?? null
  let numVal = item?.numeratorValue ?? null
  let denVal = item?.denominatorValue ?? null
  let evidenceNote = params.manualEvidenceNote?.trim() || item?.manualEvidenceNote || null

  if (params.mode === "SAVE_MANUAL_VALUE") {
    if (def.dataSourceType !== "MANUAL") {
      throw new WorkHubValidationError(
        "Chỉ số KPI này có nguồn dữ liệu tự động từ hệ thống, không cho phép ghi đè số liệu bằng tay."
      )
    }
    if (params.manualActualValue === undefined || params.manualActualValue === null) {
      throw new WorkHubValidationError("Vui lòng nhập giá trị thực tế cho chỉ số KPI nhập tay.")
    }
    if (!evidenceNote) {
      throw new WorkHubValidationError("Số liệu KPI nhập tay bắt buộc phải ghi rõ nguồn / minh chứng đối chiếu.")
    }
    actualVal = Number(params.manualActualValue)
    numVal = actualVal
    denVal = null
  }

  const band = evaluateKpiOutcomeBand({
    actualValue: actualVal,
    direction: def.direction,
    targetValue: def.targetValue,
    passThreshold: def.passThreshold,
    warningThreshold: def.warningThreshold,
    capScorePercent: def.capScorePercent,
    rangeMin: def.formulaConfig.rangeMin,
    rangeMax: def.formulaConfig.rangeMax,
  })

  const finalStatus = params.mode === "CONFIRM_RESULT" ? "CONFIRMED" : "PROVISIONAL"

  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_kpi_evaluations" (
      "id", "kpiId", "kpiVersion", "targetScope", "targetEntityId", "targetEntityName",
      "periodKey", "periodLabel", "numeratorValue", "denominatorValue", "actualValue",
      "achievementScorePercent", "outcomeBand", "formulaSnapshotJson", "sourceRecordIdsJson",
      "manualEvidenceNote", "status", "confirmedByUserId", "confirmedByName", "confirmedAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT("kpiId", "targetScope", "targetEntityId", "periodKey") DO UPDATE SET
      "kpiVersion" = excluded."kpiVersion",
      "numeratorValue" = excluded."numeratorValue",
      "denominatorValue" = excluded."denominatorValue",
      "actualValue" = excluded."actualValue",
      "achievementScorePercent" = excluded."achievementScorePercent",
      "outcomeBand" = excluded."outcomeBand",
      "formulaSnapshotJson" = excluded."formulaSnapshotJson",
      "sourceRecordIdsJson" = excluded."sourceRecordIdsJson",
      "manualEvidenceNote" = excluded."manualEvidenceNote",
      "status" = excluded."status",
      "confirmedByUserId" = excluded."confirmedByUserId",
      "confirmedByName" = excluded."confirmedByName",
      "confirmedAt" = excluded."confirmedAt",
      "updatedAt" = excluded."updatedAt"`,
    makeWorkHubId("whke"),
    def.id,
    def.currentVersion,
    params.targetScope,
    params.targetEntityId,
    item?.targetEntityName || params.targetEntityId,
    params.periodKey,
    params.periodLabel,
    numVal,
    denVal,
    actualVal,
    band.achievementScorePercent,
    band.outcomeBand,
    JSON.stringify({
      name: def.name,
      purpose: def.purpose,
      unit: def.unit,
      direction: def.direction,
      formulaType: def.formulaType,
      formulaConfig: def.formulaConfig,
      dataSourceType: def.dataSourceType,
      targetValue: def.targetValue,
      passThreshold: def.passThreshold,
      warningThreshold: def.warningThreshold,
      weight: def.weight,
      capScorePercent: def.capScorePercent,
    }),
    JSON.stringify(item?.sourceRecordIds || []),
    evidenceNote,
    finalStatus,
    finalStatus === "CONFIRMED" ? actor.userId : null,
    finalStatus === "CONFIRMED" ? actor.userName : null,
    finalStatus === "CONFIRMED" ? nowIso : null,
    nowIso
  )

  await recordWorkHubSystemAudit({
    actor,
    action: finalStatus === "CONFIRMED" ? "KPI_EVALUATION_CONFIRMED" : "KPI_MANUAL_VALUE_SAVED",
    targetTable: "workhub_kpi_evaluations",
    targetId: `${def.id}_${params.targetEntityId}_${params.periodKey}`,
    newValues: {
      kpiCode: def.kpiCode,
      kpiVersion: def.currentVersion,
      actualValue: actualVal,
      outcomeBand: band.outcomeBand,
      status: finalStatus,
    },
  })
}
