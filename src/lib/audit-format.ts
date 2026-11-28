export interface AuditLogSummaryInput {
  action?: string | null
  targetTable?: string | null
  targetId?: string | null
  oldValues?: string | null
  newValues?: string | null
}

export interface AuditLogDetailBadge {
  label: string
  value: string
}

export interface AuditLogFormattedSummary {
  actionLabel: string
  title: string
  subtitle: string | null
  detailLines: string[]
  badges: AuditLogDetailBadge[]
  tableLabel: string
  idSummary: string
  hasStructuredDetails: boolean
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Đăng nhập thành công",
  LOGIN_FAILED: "Đăng nhập thất bại",
  LOGIN_RATE_LIMITED: "Giới hạn tần suất đăng nhập",
  LOGOUT: "Đăng xuất",
  PASSWORD_RESET_SUCCESS: "Đặt lại mật khẩu thành công",
  REVOKE_DEVICE_SESSION: "Thu hồi phiên đăng nhập thiết bị",
  REVOKE_OTHER_DEVICE_SESSIONS: "Thu hồi các phiên đăng nhập khác",

  DELETE_AUDIT_LOGS: "Xóa nhật ký hệ thống",
  AUTO_CLEAR_LOGS: "Tự động dọn dẹp nhật ký hệ thống",
  DELETE_BACKUP: "Xóa bản sao lưu dữ liệu",

  DELETE_INPUT_ASSESSMENT_ASSIGNMENT: "Xóa phân công GV khảo sát đầu vào",
  DELETE_INPUT_ASSESSMENT_STUDENT: "Xóa học sinh khảo sát đầu vào",
  BULK_DELETE_INPUT_ASSESSMENT_STUDENTS: "Xóa hàng loạt học sinh khảo sát đầu vào",
  DELETE_INPUT_ASSESSMENT_BATCH: "Xóa đợt khảo sát đầu vào",
  DELETE_INPUT_ASSESSMENT_PERIOD: "Xóa kỳ khảo sát đầu vào",
  BATCH_APPROVE_INPUT_ASSESSMENT: "Duyệt hàng loạt kết quả khảo sát đầu vào",
  SEND_ASSIGNMENT_EMAIL: "Gửi email phân công khảo sát",
  SYNC_TEACHERS_FROM_ASSIGNMENTS: "Đồng bộ giáo viên từ phân công",

  CREATE_USER: "Tạo tài khoản nhân sự",
  UPDATE_USER: "Cập nhật tài khoản nhân sự",
  DELETE_USER: "Xóa tài khoản nhân sự",
  BULK_DELETE_USERS: "Xóa hàng loạt tài khoản nhân sự",
  TOGGLE_USER_STATUS: "Bật/tắt trạng thái tài khoản",
  CHANGE_USER_ROLES: "Thay đổi nhóm quyền tài khoản",

  CREATE_ROLE: "Tạo nhóm quyền",
  UPDATE_ROLE: "Cập nhật nhóm quyền",
  DELETE_ROLE: "Xóa nhóm quyền",
  UPDATE_ROLE_PERMISSIONS: "Cập nhật phân quyền nhóm",

  UPDATE_SYSTEM_CONFIG: "Cập nhật cấu hình hệ thống",
  UPDATE_APPEARANCE: "Cập nhật giao diện hệ thống",
  UPDATE_STUDENT_PORTAL_CONFIG: "Cập nhật cấu hình cổng học sinh",
  DELETE_STUDENT_PHOTO: "Xóa ảnh học sinh",
  DELETE_EDUCATION_SYSTEM: "Xóa hệ đào tạo",
  DELETE_ASSESSMENT_CONFIG: "Xóa cấu hình khảo sát",
  UPDATE_ASSESSMENT_CONFIG: "Cập nhật cấu hình khảo sát",

  CREATE_TASK: "Tạo công việc",
  ASSIGN_TASK: "Giao công việc",
  TRANSITION_TASK: "Chuyển trạng thái công việc",
  APPROVE_COMPLETE: "Duyệt hoàn thành",
  APPROVE_AND_SYNC_GRADEBOOK: "Duyệt và đồng bộ sổ điểm",
  ROLLBACK_GRADEBOOK_LOCK: "Mở khóa hoàn tác sổ điểm",
  EXPORT_EXCEL_SUMMARY: "Xuất báo cáo Excel tổng hợp",
  EXPORT_THKQ_PERIODIC_REPORT: "Xuất báo cáo định kỳ THKQ",
  BATCH_EXPORT_PDF_ZIP: "Xuất hàng loạt PDF (ZIP)",
}

export function getAuditActionLabel(action?: string | null): string {
  if (!action) return "Thao tác hệ thống"
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]

  const upper = action.toUpperCase()
  if (upper.startsWith("BULK_DELETE_")) return `Xóa hàng loạt (${action})`
  if (upper.startsWith("DELETE_")) return `Xóa dữ liệu (${action})`
  if (upper.startsWith("BULK_UPDATE_")) return `Cập nhật hàng loạt (${action})`
  if (upper.startsWith("UPDATE_")) return `Cập nhật (${action})`
  if (upper.startsWith("CREATE_")) return `Tạo mới (${action})`
  if (upper.startsWith("SEND_")) return `Gửi thông báo/email (${action})`
  if (upper.startsWith("EXPORT_")) return `Xuất dữ liệu (${action})`
  if (upper.startsWith("APPROVE_")) return `Phê duyệt (${action})`
  return action
}

const TABLE_LABELS: Record<string, string> = {
  AuditLog: "Nhật ký hệ thống",
  InputAssessmentTeacherAssignment: "Phân công GV khảo sát đầu vào",
  InputAssessmentPeriod: "Kỳ khảo sát đầu vào",
  InputAssessmentBatch: "Đợt khảo sát đầu vào",
  InputAssessmentResult: "Kết quả khảo sát đầu vào",
  InputAssessmentSession: "Ca khảo sát đầu vào",
  User: "Tài khoản nhân sự",
  Role: "Nhóm quyền",
  Student: "Học sinh",
  Class: "Lớp học",
  Campus: "Cơ sở",
  Teacher: "Giáo viên",
  Survey: "Khảo sát",
  AcademicYear: "Năm học",
  System: "Hệ thống",
}

const FIELD_LABELS: Record<string, string> = {
  deletedCount: "Số lượng đã xóa",
  count: "Số lượng",
  mode: "Chế độ",
  days: "Số ngày",
  date: "Mốc ngày",
  summary: "Tóm tắt",
  message: "Nội dung",
  description: "Mô tả",
  reason: "Lý do",
  status: "Trạng thái",
  teacherName: "Giáo viên",
  teacherEmail: "Tài khoản GV",
  subjectName: "Môn học",
  subjectCode: "Mã môn",
  grade: "Khối",
  educationSystem: "Hệ đào tạo",
  periodName: "Kỳ khảo sát",
  batchName: "Đợt khảo sát",
  campusName: "Cơ sở",
  className: "Lớp",
  studentName: "Học sinh",
  fullName: "Họ và tên",
  name: "Tên",
  title: "Tiêu đề",
  email: "Email",
  role: "Nhóm quyền",
  roleName: "Nhóm quyền",
  code: "Mã",
}

const MODE_LABELS: Record<string, string> = {
  all: "Xóa toàn bộ",
  before_days: "Theo số ngày",
  before_date: "Trước ngày",
}

const PRIORITY_KEYS = [
  "summary",
  "message",
  "description",
  "reason",
  "deletedCount",
  "count",
  "teacherName",
  "subjectName",
  "grade",
  "educationSystem",
  "batchName",
  "periodName",
  "studentName",
  "className",
  "campusName",
  "fullName",
  "name",
  "title",
  "email",
  "roleName",
  "role",
  "status",
  "mode",
  "days",
  "date",
  "code",
]

export function safeParseAuditJson(raw?: string | null): unknown {
  if (!raw || typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

export function getAuditTableLabel(targetTable?: string | null): string {
  if (!targetTable) return "Hệ thống"
  return TABLE_LABELS[targetTable] || targetTable
}

export function getAuditFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
}

export function formatAuditPrimitive(key: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "—"
  if (key === "mode" && typeof val === "string" && MODE_LABELS[val]) {
    return MODE_LABELS[val]
  }
  if (typeof val === "boolean") return val ? "Có" : "Không"
  if (typeof val === "number") return val.toLocaleString("vi-VN")
  if (typeof val === "string") return val
  if (Array.isArray(val)) return `${val.length} mục`
  return JSON.stringify(val)
}

function summarizeAssignmentItem(item: Record<string, unknown>): string {
  const parts: string[] = []
  if (item.teacherName) parts.push(String(item.teacherName))
  else if (item.teacherEmail) parts.push(String(item.teacherEmail))

  const meta: string[] = []
  if (item.subjectName) meta.push(String(item.subjectName))
  if (item.grade) meta.push(`Khối ${item.grade}`)
  if (item.educationSystem) meta.push(`Hệ ${item.educationSystem}`)
  if (item.batchName) meta.push(String(item.batchName))

  if (meta.length > 0) {
    parts.push(`(${meta.join(" · ")})`)
  }
  return parts.join(" ").trim()
}

export function formatAuditTargetRef(targetTable?: string | null, targetId?: string | null): {
  tableLabel: string
  idSummary: string
  idCount: number
} {
  const tableLabel = getAuditTableLabel(targetTable)
  if (!targetId) {
    return { tableLabel, idSummary: "", idCount: 0 }
  }
  const cleanId = targetId.trim()
  if (!cleanId || cleanId === "SYSTEM" || cleanId === "BULK") {
    return { tableLabel, idSummary: cleanId === "BULK" ? "Hàng loạt" : "", idCount: 0 }
  }
  const parts = cleanId.split(",").map(s => s.trim()).filter(Boolean)
  if (parts.length > 1) {
    return {
      tableLabel,
      idSummary: `${parts.length} mã bản ghi`,
      idCount: parts.length,
    }
  }
  const single = parts[0]
  const idSummary = single.length > 18 ? `${single.slice(0, 12)}…` : single
  return { tableLabel, idSummary, idCount: 1 }
}

function extractBadgesFromObject(obj: Record<string, unknown>, maxBadges = 4): AuditLogDetailBadge[] {
  const badges: AuditLogDetailBadge[] = []
  const seen = new Set<string>()

  const pushKey = (k: string) => {
    if (badges.length >= maxBadges || seen.has(k)) return
    const v = obj[k]
    if (v === null || v === undefined || v === "" || typeof v === "object") return
    seen.add(k)
    badges.push({
      label: getAuditFieldLabel(k),
      value: formatAuditPrimitive(k, v),
    })
  }

  for (const k of PRIORITY_KEYS) {
    if (k in obj) pushKey(k)
  }
  for (const k of Object.keys(obj)) {
    if (badges.length >= maxBadges) break
    pushKey(k)
  }
  return badges
}

export function formatAuditLogSummary(log: AuditLogSummaryInput): AuditLogFormattedSummary {
  const action = log.action || ""
  const actionLabel = getAuditActionLabel(action)
  const { tableLabel, idSummary, idCount } = formatAuditTargetRef(log.targetTable, log.targetId)

  const parsedNew = safeParseAuditJson(log.newValues)
  const parsedOld = safeParseAuditJson(log.oldValues)
  const hasStructuredDetails = Boolean(parsedNew || parsedOld || (log.targetId && log.targetId.length > 18))

  // 1. Plain-text newValues (e.g. login messages, error reasons)
  if (log.newValues && !parsedNew) {
    return {
      actionLabel,
      title: log.newValues,
      subtitle: idSummary ? `${tableLabel} · ${idSummary}` : null,
      detailLines: [],
      badges: [],
      tableLabel,
      idSummary,
      hasStructuredDetails: Boolean(log.oldValues || (log.targetId && log.targetId.length > 18)),
    }
  }

  const newObj = parsedNew && typeof parsedNew === "object" && !Array.isArray(parsedNew)
    ? (parsedNew as Record<string, unknown>)
    : null
  const oldObj = parsedOld && typeof parsedOld === "object" && !Array.isArray(parsedOld)
    ? (parsedOld as Record<string, unknown>)
    : null

  // 2. Specialized handler: DELETE_AUDIT_LOGS
  if (action === "DELETE_AUDIT_LOGS" && newObj) {
    const count = typeof newObj.deletedCount === "number" ? newObj.deletedCount : Number(newObj.deletedCount || 0)
    const mode = String(newObj.mode || "")
    let scopeText = ""
    if (mode === "all") scopeText = "toàn bộ nhật ký"
    else if (mode === "before_days" && newObj.days) scopeText = `nhật ký cũ hơn ${newObj.days} ngày`
    else if (mode === "before_date" && newObj.date) scopeText = `nhật ký trước ngày ${newObj.date}`

    return {
      actionLabel,
      title: `Đã xóa ${count.toLocaleString("vi-VN")} bản ghi${scopeText ? ` (${scopeText})` : ""}`,
      subtitle: `${tableLabel}${idSummary ? ` · ${idSummary}` : ""}`,
      detailLines: [],
      badges: extractBadgesFromObject(newObj, 3),
      tableLabel,
      idSummary,
      hasStructuredDetails: true,
    }
  }

  // 3. Specialized handler: DELETE_INPUT_ASSESSMENT_ASSIGNMENT
  if (action === "DELETE_INPUT_ASSESSMENT_ASSIGNMENT") {
    const countFromNew = newObj && typeof newObj.deletedCount === "number" ? newObj.deletedCount : null
    const items = oldObj && Array.isArray(oldObj.items)
      ? (oldObj.items as Array<Record<string, unknown>>)
      : Array.isArray(parsedOld)
        ? (parsedOld as Array<Record<string, unknown>>)
        : null

    if (items && items.length > 0) {
      const detailLines = items.slice(0, 3).map(summarizeAssignmentItem).filter(Boolean)
      const remaining = items.length - detailLines.length
      if (remaining > 0) {
        detailLines.push(`+${remaining} phân công khác (bấm Xem để xem đủ)`)
      }
      const count = countFromNew ?? items.length
      return {
        actionLabel,
        title: `Đã xóa ${count} phân công GV chấm khảo sát đầu vào`,
        subtitle: null,
        detailLines,
        badges: [{ label: "Số lượng đã xóa", value: String(count) }],
        tableLabel,
        idSummary,
        hasStructuredDetails: true,
      }
    }

    if (oldObj && (oldObj.teacherName || oldObj.subjectName || oldObj.grade)) {
      const detail = summarizeAssignmentItem(oldObj)
      return {
        actionLabel,
        title: `Đã xóa phân công GV chấm khảo sát đầu vào`,
        subtitle: oldObj.periodName ? `Kỳ: ${oldObj.periodName}` : null,
        detailLines: detail ? [detail] : [],
        badges: extractBadgesFromObject(oldObj, 3),
        tableLabel,
        idSummary,
        hasStructuredDetails: true,
      }
    }

    const fallbackCount = countFromNew ?? (idCount > 0 ? idCount : 1)
    return {
      actionLabel,
      title: `Đã xóa ${fallbackCount} phân công GV chấm khảo sát đầu vào`,
      subtitle: `${tableLabel}${idSummary ? ` · ${idSummary}` : ""} (bản ghi cũ chưa lưu tên GV/môn trước khi xóa)`,
      detailLines: [],
      badges: newObj ? extractBadgesFromObject(newObj, 2) : [],
      tableLabel,
      idSummary,
      hasStructuredDetails,
    }
  }

  // 4. Generic structured JSON summary
  const primaryObj = newObj || oldObj
  if (primaryObj) {
    const explicitSummary =
      primaryObj.summary || primaryObj.message || primaryObj.description || primaryObj.reason

    const badges = extractBadgesFromObject(primaryObj, 4)

    if (typeof explicitSummary === "string" && explicitSummary.trim()) {
      return {
        actionLabel,
        title: explicitSummary.trim(),
        subtitle: `${tableLabel}${idSummary ? ` · ${idSummary}` : ""}`,
        detailLines: [],
        badges: badges.filter(b => b.value !== explicitSummary.trim()).slice(0, 3),
        tableLabel,
        idSummary,
        hasStructuredDetails: true,
      }
    }

    if (badges.length > 0) {
      const compactTitle = badges
        .slice(0, 2)
        .map(b => `${b.label}: ${b.value}`)
        .join(" · ")
      return {
        actionLabel,
        title: compactTitle,
        subtitle: `${tableLabel}${idSummary ? ` · ${idSummary}` : ""}`,
        detailLines: [],
        badges: badges.slice(2),
        tableLabel,
        idSummary,
        hasStructuredDetails: true,
      }
    }
  }

  // 5. Fallback when no oldValues/newValues exist
  return {
    actionLabel,
    title: `${tableLabel}${idSummary ? ` (${idSummary})` : ""}`,
    subtitle: null,
    detailLines: [],
    badges: [],
    tableLabel,
    idSummary,
    hasStructuredDetails,
  }
}
