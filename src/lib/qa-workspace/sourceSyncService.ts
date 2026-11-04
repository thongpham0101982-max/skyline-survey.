import { prisma } from "@/lib/db"
import { ensureCoordinationTables } from "@/lib/coordination/schemaInit"
import { QaSourceModuleCode } from "./types"

export interface QaSourceModuleStatus {
  code: QaSourceModuleCode
  name: string
  status: "CONNECTED" | "READ_ONLY_LINK" | "LIMITED"
  statusLabel: string
  recordCount: number
  syncedTaskCount: number
  moduleUrl: string
  description: string
  limitationNote?: string
  candidateItems: Array<{
    sourceRecordId: string
    externalSyncKey: string
    title: string
    category: string
    dueDate: string | null
    sourceUrl: string
    suggestedAssigneeId?: string | null
    alreadySynced: boolean
  }>
}

/**
 * Khảo sát và đọc trạng thái kết nối thực tế của 6 phân hệ nghiệp vụ trong SSM Sky-Line (Read-only)
 */
export async function inspectConnectedSourceModules(params: {
  academicYearId?: string
  existingSyncKeys?: Set<string>
}): Promise<QaSourceModuleStatus[]> {
  const { academicYearId, existingSyncKeys = new Set() } = params
  await ensureCoordinationTables().catch(() => {})

  const [
    exams,
    inputPeriods,
    competencyBatches,
    observationSlots,
    surveyPeriods,
    improvementActions,
  ] = await Promise.all([
    prisma.exam
      .findMany({
        where: academicYearId ? { academicYearId } : {},
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .catch(() => []),
    prisma.inputAssessmentPeriod
      .findMany({
        where: academicYearId ? { academicYearId } : {},
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .catch(() => []),
    prisma.importBatch
      .findMany({
        where: academicYearId ? { academicYearId } : {},
        orderBy: { importedAt: "desc" },
        take: 10,
      })
      .catch(() => []),
    prisma.observationSlot
      .findMany({
        where: academicYearId ? { academicYearId } : {},
        orderBy: { date: "desc" },
        take: 10,
      })
      .catch(() => []),
    prisma.surveyPeriod
      .findMany({
        where: academicYearId ? { academicYearId } : {},
        orderBy: { startDate: "desc" },
        take: 10,
      })
      .catch(() => []),
    prisma.qualityImprovementAction
      .findMany({
        where: academicYearId ? { academicYearId } : {},
        orderBy: { updatedAt: "desc" },
        take: 20,
      })
      .catch(() => []),
  ])

  const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const khaoThiCandidates = exams.map((ex: any) => {
    const syncKey = `SYNC:KHAO_THI:${ex.id}`
    return {
      sourceRecordId: ex.id,
      externalSyncKey: syncKey,
      title: `[Khảo thí] Tổ chức & rà soát đề kỳ thi: ${ex.name}`,
      category: "Các kỳ thi/chuẩn đầu ra",
      dueDate: ex.examDate ? new Date(ex.examDate).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/ktdbcl/khao-thi-so",
      suggestedAssigneeId: null,
      alreadySynced: existingSyncKeys.has(syncKey),
    }
  })

  const ksdvCandidates = inputPeriods.map((p: any) => {
    const syncKey = `SYNC:KHAO_SAT_DAU_VAO:${p.id}`
    return {
      sourceRecordId: p.id,
      externalSyncKey: syncKey,
      title: `[KSĐV] Điều phối & xét duyệt kết quả đợt: ${p.name}`,
      category: "Khảo Sát",
      dueDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/dieu-hanh-khao-sat",
      suggestedAssigneeId: p.assignedUserId || null,
      alreadySynced: existingSyncKeys.has(syncKey),
    }
  })

  const dgnlCandidates = competencyBatches.map((b: any) => {
    const syncKey = `SYNC:DGNL:${b.id}`
    return {
      sourceRecordId: b.id,
      externalSyncKey: syncKey,
      title: `[ĐGNL] Rà soát dữ liệu Import ĐGNL (${b.fileName || b.term || "Đợt nhập"})`,
      category: "Khảo Sát",
      dueDate: defaultDue,
      sourceUrl: "/admin/competency-assessment/history",
      suggestedAssigneeId: b.importedById || null,
      alreadySynced: existingSyncKeys.has(syncKey),
    }
  })

  const duGioCandidates = observationSlots.slice(0, 5).map((s: any) => {
    const syncKey = `SYNC:DU_GIO:${s.id}`
    return {
      sourceRecordId: s.id,
      externalSyncKey: syncKey,
      title: `[Dự giờ & PTCM] Tổng hợp kết quả dự giờ môn ${s.subjectName} - Khối ${s.grade}`,
      category: "Đào Tạo",
      dueDate: s.date ? new Date(s.date).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/tong-hop-du-gio",
      suggestedAssigneeId: null,
      alreadySynced: existingSyncKeys.has(syncKey),
    }
  })

  const khaoSatCandidates = surveyPeriods.map((sp: any) => {
    const syncKey = `SYNC:KHAO_SAT_PHAN_HOI:${sp.id}`
    return {
      sourceRecordId: sp.id,
      externalSyncKey: syncKey,
      title: `[Khảo sát & Phản hồi] Phân tích kết quả & NPS kỳ khảo sát: ${sp.name}`,
      category: "Khảo Sát",
      dueDate: sp.endDate ? new Date(sp.endDate).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/surveys",
      suggestedAssigneeId: null,
      alreadySynced: existingSyncKeys.has(syncKey),
    }
  })

  const capaCandidates = improvementActions.map((act: any) => {
    const syncKey = `SYNC:CAI_TIEN_CHAT_LUONG:${act.id}`
    return {
      sourceRecordId: act.id,
      externalSyncKey: syncKey,
      title: `[Cải tiến CL - ${act.issueCode}] ${act.title}`,
      category: "Đảm bảo chất lượng",
      dueDate: act.dueDate ? new Date(act.dueDate).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/ktdbcl/chat-luong-phoi-hop?tab=improvements",
      suggestedAssigneeId: act.assigneeUserId || null,
      alreadySynced: existingSyncKeys.has(syncKey),
    }
  })

  return [
    {
      code: "KHAO_THI",
      name: "Khảo thí, kiểm tra",
      status: "CONNECTED",
      statusLabel: "Đã kết nối (Exam & Khảo thí Số)",
      recordCount: exams.length,
      syncedTaskCount: khaoThiCandidates.filter((c) => c.alreadySynced).length,
      moduleUrl: "/admin/ktdbcl/khao-thi-so",
      description: "Liên thông danh sách kỳ thi, ma trận đề và kết quả khảo thí số OMR/LMS.",
      candidateItems: khaoThiCandidates,
    },
    {
      code: "KHAO_SAT_DAU_VAO",
      name: "Khảo sát đầu vào",
      status: "CONNECTED",
      statusLabel: "Đã kết nối (InputAssessmentPeriod)",
      recordCount: inputPeriods.length,
      syncedTaskCount: ksdvCandidates.filter((c) => c.alreadySynced).length,
      moduleUrl: "/admin/dieu-hanh-khao-sat",
      description: "Liên thông các đợt khảo sát đầu vào K-12 & Mầm non và trạng thái xét duyệt.",
      candidateItems: ksdvCandidates,
    },
    {
      code: "DGNL",
      name: "Đánh giá năng lực",
      status: "READ_ONLY_LINK",
      statusLabel: "Liên kết theo đợt ImportBatch",
      recordCount: competencyBatches.length,
      syncedTaskCount: dgnlCandidates.filter((c) => c.alreadySynced).length,
      moduleUrl: "/admin/competency-assessment/import",
      description: "Theo dõi các đợt import đánh giá năng lực học sinh (Radar) và rà soát sai sót.",
      limitationNote: "Nghiệp vụ chấm & import ĐGNL thực hiện trực tiếp tại phân hệ QL ĐGNL nguồn.",
      candidateItems: dgnlCandidates,
    },
    {
      code: "DU_GIO",
      name: "Dự giờ & PTCM",
      status: "CONNECTED",
      statusLabel: "Đã kết nối (ObservationSlot)",
      recordCount: observationSlots.length,
      syncedTaskCount: duGioCandidates.filter((c) => c.alreadySynced).length,
      moduleUrl: "/admin/tong-hop-du-gio",
      description: "Liên thông kế hoạch dự giờ, ma trận dự giờ TTCM và xét duyệt đánh giá lại.",
      candidateItems: duGioCandidates,
    },
    {
      code: "KHAO_SAT_PHAN_HOI",
      name: "Khảo sát, phản hồi",
      status: "CONNECTED",
      statusLabel: "Đã kết nối (SurveyPeriod & KT&ĐBCL Connect)",
      recordCount: surveyPeriods.length,
      syncedTaskCount: khaoSatCandidates.filter((c) => c.alreadySynced).length,
      moduleUrl: "/admin/surveys",
      description: "Liên thông các kỳ khảo sát PHHS/HS, phân tích NPS và kênh tiếp nhận KT&ĐBCL Connect.",
      candidateItems: khaoSatCandidates,
    },
    {
      code: "CAI_TIEN_CHAT_LUONG",
      name: "Hành động cải tiến chất lượng",
      status: "CONNECTED",
      statusLabel: "Đã kết nối 2 chiều (CAPA Engine)",
      recordCount: improvementActions.length,
      syncedTaskCount: capaCandidates.filter((c) => c.alreadySynced).length,
      moduleUrl: "/admin/ktdbcl/chat-luong-phoi-hop?tab=improvements",
      description:
        "Quản lý vòng đời cải tiến: Ghi nhận vấn đề → Xác minh nguyên nhân → Giao hành động → Kiểm tra kết quả/hiệu quả → Đóng/Bổ sung.",
      candidateItems: capaCandidates,
    },
  ]
}
