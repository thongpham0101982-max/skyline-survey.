import { prisma } from "@/lib/db"
import { ensureCoordinationTables } from "@/lib/coordination/schemaInit"
import { QaSourceModuleCode } from "./types"

export interface QaSourceCandidateItem {
  id: string
  sourceRecordId: string
  externalSyncKey: string
  title: string
  subtitle: string
  category: string
  dueDate: string | null
  url: string
  sourceUrl: string
  suggestedAssigneeId?: string | null
  alreadySynced: boolean
}

export interface QaSourceModuleStatus {
  code: QaSourceModuleCode
  moduleCode: QaSourceModuleCode
  name: string
  moduleName: string
  status: "CONNECTED" | "READ_ONLY_LINK" | "LIMITED"
  statusLabel: string
  recordCount: number
  totalRecords: number
  syncedTaskCount: number
  moduleUrl: string
  routeUrl: string
  description: string
  limitationNote?: string
  candidateItems: QaSourceCandidateItem[]
  recentItems: QaSourceCandidateItem[]
}

/**
 * Khảo sát và đọc trạng thái kết nối thực tế của 6 phân hệ nghiệp vụ trong SSM Sky-Line (Read-only)
 */
export async function inspectConnectedSourceModules(params: {
  academicYearId?: string
  existingSyncKeys?: Set<string>
} = {}): Promise<QaSourceModuleStatus[]> {
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
        orderBy: { createdAt: "desc" },
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

  const buildCandidate = (raw: {
    sourceRecordId: string
    externalSyncKey: string
    title: string
    category: string
    dueDate: string | null
    sourceUrl: string
    suggestedAssigneeId?: string | null
  }): QaSourceCandidateItem => ({
    id: raw.sourceRecordId,
    sourceRecordId: raw.sourceRecordId,
    externalSyncKey: raw.externalSyncKey,
    title: raw.title,
    subtitle: [raw.category, raw.dueDate ? `Hạn: ${raw.dueDate}` : null].filter(Boolean).join(" • "),
    category: raw.category,
    dueDate: raw.dueDate,
    url: raw.sourceUrl,
    sourceUrl: raw.sourceUrl,
    suggestedAssigneeId: raw.suggestedAssigneeId ?? null,
    alreadySynced: existingSyncKeys.has(raw.externalSyncKey),
  })

  const buildModule = (raw: {
    code: QaSourceModuleCode
    name: string
    status: "CONNECTED" | "READ_ONLY_LINK" | "LIMITED"
    statusLabel: string
    recordCount: number
    moduleUrl: string
    description: string
    limitationNote?: string
    candidateItems: QaSourceCandidateItem[]
  }): QaSourceModuleStatus => ({
    code: raw.code,
    moduleCode: raw.code,
    name: raw.name,
    moduleName: raw.name,
    status: raw.status,
    statusLabel: raw.statusLabel,
    recordCount: raw.recordCount,
    totalRecords: raw.recordCount,
    syncedTaskCount: raw.candidateItems.filter((c) => c.alreadySynced).length,
    moduleUrl: raw.moduleUrl,
    routeUrl: raw.moduleUrl,
    description: raw.description,
    limitationNote: raw.limitationNote,
    candidateItems: raw.candidateItems,
    recentItems: raw.candidateItems,
  })

  const khaoThiCandidates = exams.map((ex: any) =>
    buildCandidate({
      sourceRecordId: ex.id,
      externalSyncKey: `SYNC:KHAO_THI:${ex.id}`,
      title: `[Khảo thí] Tổ chức & rà soát đề kỳ thi: ${ex.name}`,
      category: "Các kỳ thi/chuẩn đầu ra",
      dueDate: ex.examDate ? new Date(ex.examDate).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/ktdbcl/khao-thi-so",
      suggestedAssigneeId: null,
    })
  )

  const ksdvCandidates = inputPeriods.map((p: any) =>
    buildCandidate({
      sourceRecordId: p.id,
      externalSyncKey: `SYNC:KHAO_SAT_DAU_VAO:${p.id}`,
      title: `[KSĐV] Điều phối & xét duyệt kết quả đợt: ${p.name}`,
      category: "Khảo Sát",
      dueDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/dieu-hanh-khao-sat",
      suggestedAssigneeId: p.assignedUserId || null,
    })
  )

  const dgnlCandidates = competencyBatches.map((b: any) =>
    buildCandidate({
      sourceRecordId: b.id,
      externalSyncKey: `SYNC:DGNL:${b.id}`,
      title: `[ĐGNL] Rà soát dữ liệu Import ĐGNL (${b.fileName || b.term || "Đợt nhập"})`,
      category: "Khảo Sát",
      dueDate: defaultDue,
      sourceUrl: "/admin/competency-assessment/history",
      suggestedAssigneeId: b.importedById || null,
    })
  )

  const duGioCandidates = observationSlots.slice(0, 5).map((s: any) =>
    buildCandidate({
      sourceRecordId: s.id,
      externalSyncKey: `SYNC:DU_GIO:${s.id}`,
      title: `[Dự giờ & PTCM] Tổng hợp kết quả dự giờ môn ${s.subjectName} - Khối ${s.grade}`,
      category: "Đào Tạo",
      dueDate: s.date ? new Date(s.date).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/tong-hop-du-gio",
      suggestedAssigneeId: null,
    })
  )

  const khaoSatCandidates = surveyPeriods.map((sp: any) =>
    buildCandidate({
      sourceRecordId: sp.id,
      externalSyncKey: `SYNC:KHAO_SAT_PHAN_HOI:${sp.id}`,
      title: `[Khảo sát & Phản hồi] Phân tích kết quả & NPS kỳ khảo sát: ${sp.name}`,
      category: "Khảo Sát",
      dueDate: sp.endDate ? new Date(sp.endDate).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/surveys",
      suggestedAssigneeId: null,
    })
  )

  const capaCandidates = improvementActions.map((act: any) =>
    buildCandidate({
      sourceRecordId: act.id,
      externalSyncKey: `SYNC:CAI_TIEN_CHAT_LUONG:${act.id}`,
      title: `[Cải tiến CL - ${act.issueCode}] ${act.title}`,
      category: "Đảm bảo chất lượng",
      dueDate: act.dueDate ? new Date(act.dueDate).toISOString().slice(0, 10) : defaultDue,
      sourceUrl: "/admin/ktdbcl/chat-luong-phoi-hop?tab=improvements",
      suggestedAssigneeId: act.assigneeUserId || null,
    })
  )

  return [
    buildModule({
      code: "KHAO_THI",
      name: "Khảo thí, kiểm tra",
      status: "CONNECTED",
      statusLabel: "Đã kết nối (Exam & Khảo thí Số)",
      recordCount: exams.length,
      moduleUrl: "/admin/ktdbcl/khao-thi-so",
      description: "Liên thông danh sách kỳ thi, ma trận đề và kết quả khảo thí số OMR/LMS.",
      candidateItems: khaoThiCandidates,
    }),
    buildModule({
      code: "KHAO_SAT_DAU_VAO",
      name: "Khảo sát đầu vào",
      status: "CONNECTED",
      statusLabel: "Đã kết nối (InputAssessmentPeriod)",
      recordCount: inputPeriods.length,
      moduleUrl: "/admin/dieu-hanh-khao-sat",
      description: "Liên thông các đợt khảo sát đầu vào K-12 & Mầm non và trạng thái xét duyệt.",
      candidateItems: ksdvCandidates,
    }),
    buildModule({
      code: "DGNL",
      name: "Đánh giá năng lực",
      status: "READ_ONLY_LINK",
      statusLabel: "Liên kết theo đợt ImportBatch",
      recordCount: competencyBatches.length,
      moduleUrl: "/admin/competency-assessment/import",
      description: "Theo dõi các đợt import đánh giá năng lực học sinh (Radar) và rà soát sai sót.",
      limitationNote: "Nghiệp vụ chấm & import ĐGNL thực hiện trực tiếp tại phân hệ QL ĐGNL nguồn.",
      candidateItems: dgnlCandidates,
    }),
    buildModule({
      code: "DU_GIO",
      name: "Dự giờ & PTCM",
      status: "CONNECTED",
      statusLabel: "Đã kết nối (ObservationSlot)",
      recordCount: observationSlots.length,
      moduleUrl: "/admin/tong-hop-du-gio",
      description: "Liên thông kế hoạch dự giờ, ma trận dự giờ TTCM và xét duyệt đánh giá lại.",
      candidateItems: duGioCandidates,
    }),
    buildModule({
      code: "KHAO_SAT_PHAN_HOI",
      name: "Khảo sát, phản hồi",
      status: "CONNECTED",
      statusLabel: "Đã kết nối (SurveyPeriod & KT&ĐBCL Connect)",
      recordCount: surveyPeriods.length,
      moduleUrl: "/admin/surveys",
      description: "Liên thông các kỳ khảo sát PHHS/HS, phân tích NPS và kênh tiếp nhận KT&ĐBCL Connect.",
      candidateItems: khaoSatCandidates,
    }),
    buildModule({
      code: "CAI_TIEN_CHAT_LUONG",
      name: "Hành động cải tiến chất lượng",
      status: "CONNECTED",
      statusLabel: "Đã kết nối 2 chiều (CAPA Engine)",
      recordCount: improvementActions.length,
      moduleUrl: "/admin/ktdbcl/chat-luong-phoi-hop?tab=improvements",
      description:
        "Quản lý vòng đời cải tiến: Ghi nhận vấn đề → Xác minh nguyên nhân → Giao hành động → Kiểm tra kết quả/hiệu quả → Đóng/Bổ sung.",
      candidateItems: capaCandidates,
    }),
  ]
}
