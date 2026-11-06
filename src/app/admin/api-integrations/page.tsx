"use client"

import { useState, useEffect, useMemo } from "react"
import {
  KeyRound,
  Plus,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Ban,
  Clock,
  Building,
  Layers,
  Activity,
  X,
  Eye,
  Info,
  BookOpen,
  HelpCircle,
  Users,
  Mail,
  Send,
  CheckCircle2,
} from "lucide-react"
import { ALL_API_PERMISSIONS, ApiPermission } from "@/types/api-integration"
import { ApiGuideModal } from "./ApiGuideModal"

interface ApiKeyItem {
  id: string
  keyId: string
  name?: string | null
  keyPrefix: string
  status: "ACTIVE" | "REVOKED" | "EXPIRED"
  expiresAt?: string | null
  lastUsedAt?: string | null
  revokedAt?: string | null
  createdAt: string
}

interface ApiAppItem {
  id: string
  name: string
  description?: string | null
  contactPerson?: string | null
  status: "ACTIVE" | "INACTIVE" | "REVOKED"
  permissions: string
  allowedCampusIds: string
  allowedClassIds: string
  allowedDataScope: string
  expiresAt?: string | null
  rateLimitRpm: number
  lastUsedAt?: string | null
  createdAt: string
  apiKeys: ApiKeyItem[]
}

interface CampusItem {
  id: string
  campusCode: string
  campusName: string
}

interface DepartmentItem {
  id: string
  code: string
  name: string
  blockCM?: string | null
  divisionCode?: string | null
}

interface StaffUserItem {
  id: string
  fullName: string
  email: string
  role: string
  teacher?: {
    id: string
    teacherCode: string
    teacherName: string
    email?: string | null
    departmentId?: string | null
    departmentRel?: {
      id: string
      name: string
      code: string
    } | null
  } | null
}

export default function ApiIntegrationsPage() {
  const [apps, setApps] = useState<ApiAppItem[]>([])
  const [campuses, setCampuses] = useState<CampusItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // App Modal state
  const [isAppModalOpen, setIsAppModalOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<ApiAppItem | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contactPerson: "",
    departmentId: "",
    departmentName: "",
    teacherId: "",
    teacherName: "",
    recipientEmail: "",
    sendNotificationEmail: true,
    permissions: [] as ApiPermission[],
    allowedCampusIds: ["*"] as string[],
    expiresAt: "",
    rateLimitRpm: 60,
  })

  // New Key Modal state (One-time secret display)
  const [newKeyData, setNewKeyData] = useState<{
    appName: string
    keyId: string
    rawKey: string
    name: string
    emailSent?: boolean
    recipientEmail?: string | null
    deliveryPasscode?: string | null
    handoverUrl?: string | null
  } | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedPasscode, setCopiedPasscode] = useState(false)

  // Create Key Input Modal
  const [keyModalAppId, setKeyModalAppId] = useState<string | null>(null)
  const [newKeyLabel, setNewKeyLabel] = useState("")
  const [sendKeyEmail, setSendKeyEmail] = useState(true)
  const [keyTargetEmail, setKeyTargetEmail] = useState("")
  const [requirePasscode, setRequirePasscode] = useState(true)
  const [deliveryPasscode, setDeliveryPasscode] = useState("")

  // Log drawer state
  const [selectedAppLogs, setSelectedAppLogs] = useState<{ appId: string; appName: string } | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // API Guide Modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [resApps, resCampuses] = await Promise.all([
        fetch("/api/admin/api-integrations"),
        fetch("/api/campuses"),
      ])

      const dataApps = await resApps.json()
      if (dataApps.success) {
        setApps(dataApps.applications || [])
        if (dataApps.departments) setDepartments(dataApps.departments)
        if (dataApps.staffUsers) setStaffUsers(dataApps.staffUsers)
      } else {
        setError(dataApps.error || "Không thể tải danh sách ứng dụng")
      }

      const dataCampuses = await resCampuses.json()
      if (Array.isArray(dataCampuses)) {
        setCampuses(dataCampuses)
      }
    } catch {
      setError("Lỗi kết nối máy chủ khi tải dữ liệu API")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter staff by department
  const filteredStaff = useMemo(() => {
    if (!formData.departmentId || formData.departmentId === "EXTERNAL") {
      return staffUsers
    }
    return staffUsers.filter((u) => {
      const deptId = u.teacher?.departmentId || u.teacher?.departmentRel?.id
      return deptId === formData.departmentId
    })
  }, [staffUsers, formData.departmentId])

  // Open Create/Edit App Modal
  const handleOpenAppModal = (app?: ApiAppItem) => {
    if (app) {
      setEditingApp(app)
      let parsedPerms: ApiPermission[] = []
      try {
        parsedPerms = JSON.parse(app.permissions)
      } catch {}

      let parsedCampuses: string[] = ["*"]
      try {
        parsedCampuses = JSON.parse(app.allowedCampusIds)
      } catch {}

      let deptId = ""
      let deptName = ""
      let tId = ""
      let tName = ""
      let recEmail = ""

      if (app.allowedDataScope) {
        try {
          const parsedScope = JSON.parse(app.allowedDataScope)
          if (parsedScope.departmentId) deptId = parsedScope.departmentId
          if (parsedScope.departmentName) deptName = parsedScope.departmentName
          if (parsedScope.teacherId) tId = parsedScope.teacherId
          if (parsedScope.teacherName) tName = parsedScope.teacherName
          if (parsedScope.recipientEmail) recEmail = parsedScope.recipientEmail
        } catch (_) {}
      }

      if (!recEmail && app.contactPerson && app.contactPerson.includes("@")) {
        const match = app.contactPerson.match(/[\w.-]+@[\w.-]+\.\w+/)
        if (match) recEmail = match[0]
      }

      setFormData({
        name: app.name,
        description: app.description || "",
        contactPerson: app.contactPerson || "",
        departmentId: deptId,
        departmentName: deptName,
        teacherId: tId,
        teacherName: tName,
        recipientEmail: recEmail,
        sendNotificationEmail: true,
        permissions: parsedPerms,
        allowedCampusIds: parsedCampuses,
        expiresAt: app.expiresAt ? app.expiresAt.slice(0, 10) : "",
        rateLimitRpm: app.rateLimitRpm || 60,
      })
    } else {
      setEditingApp(null)
      setFormData({
        name: "",
        description: "",
        contactPerson: "",
        departmentId: "",
        departmentName: "",
        teacherId: "",
        teacherName: "",
        recipientEmail: "",
        sendNotificationEmail: true,
        permissions: ["students:read", "grades:read"],
        allowedCampusIds: ["*"],
        expiresAt: "",
        rateLimitRpm: 60,
      })
    }
    setIsAppModalOpen(true)
  }

  // Save Application
  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      }

      let res
      if (editingApp) {
        res = await fetch(`/api/admin/api-integrations/${editingApp.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/admin/api-integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      const result = await res.json()
      if (result.success) {
        setIsAppModalOpen(false)
        if (result.emailSent) {
          alert(`Đã lưu ứng dụng và gửi email bàn giao thành công đến: ${formData.recipientEmail}`)
        } else if (formData.recipientEmail && formData.sendNotificationEmail) {
          alert(`Đã lưu ứng dụng thành công! Thông báo gửi mail: ${result.emailError || "Chưa gửi được mail. Bạn có thể bấm 'Gửi email bàn giao' tại danh sách để gửi lại."}`)
        }
        fetchData()
      } else {
        alert(result.error || "Không thể lưu ứng dụng")
      }
    } catch {
      alert("Lỗi khi gửi dữ liệu ứng dụng")
    }
  }

  // Send / Resend Handover Email
  const handleSendEmail = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/api-integrations/${id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.success) {
        alert(`Đã gửi email bàn giao API "${name}" thành công đến: ${data.recipientEmail}`)
      } else {
        alert(data.error || "Không thể gửi email bàn giao")
      }
    } catch {
      alert("Lỗi kết nối khi gửi yêu cầu gửi email")
    }
  }

  // Revoke entire App
  const handleRevokeApp = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi toàn bộ quyền kết nối của ứng dụng "${name}"? Tất cả khóa API đang hoạt động của ứng dụng này sẽ bị vô hiệu hóa ngay lập tức.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/api-integrations/${id}`, { method: "DELETE" })
      const result = await res.json()
      if (result.success) {
        fetchData()
      } else {
        alert(result.error || "Không thể thu hồi ứng dụng")
      }
    } catch {
      alert("Lỗi kết nối máy chủ")
    }
  }

  // Open Create Key Modal
  const handleOpenCreateKeyModal = (app: ApiAppItem) => {
    setKeyModalAppId(app.id)
    setNewKeyLabel(`Khóa ${app.name} (${new Date().toLocaleDateString("vi-VN")})`)
    setSendKeyEmail(true)
    setRequirePasscode(true)
    const digits = Math.floor(100000 + Math.random() * 900000).toString()
    setDeliveryPasscode(`SL-${digits}`)

    let targetEmail = ""
    if (app.allowedDataScope) {
      try {
        const parsed = JSON.parse(app.allowedDataScope)
        if (parsed.recipientEmail) targetEmail = parsed.recipientEmail
      } catch (_) {}
    }
    if (!targetEmail && app.contactPerson && app.contactPerson.includes("@")) {
      const match = application?.contactPerson?.match?.(/[\w.-]+@[\w.-]+\.\w+/) || app.contactPerson.match(/[\w.-]+@[\w.-]+\.\w+/)
      if (match) targetEmail = match[0]
    }
    setKeyTargetEmail(targetEmail)
  }

  // Create Key
  const handleCreateKey = async (appId: string) => {
    const app = apps.find((a) => a.id === appId)
    if (!app) return

    try {
      const res = await fetch(`/api/admin/api-integrations/${appId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyLabel || "Khóa chính",
          sendEmail: sendKeyEmail,
          recipientEmail: keyTargetEmail,
          requirePasscode,
          deliveryPasscode: requirePasscode ? deliveryPasscode : undefined,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setKeyModalAppId(null)
        setNewKeyLabel("")
        setNewKeyData({
          appName: app.name,
          keyId: result.key.keyId,
          rawKey: result.rawKey,
          name: result.key.name,
          emailSent: result.emailSent,
          recipientEmail: result.recipientEmail,
          deliveryPasscode: result.deliveryPasscode,
          handoverUrl: result.handoverUrl,
        })
        fetchData()
      } else {
        alert(result.error || "Không thể tạo khóa")
      }
    } catch {
      alert("Lỗi kết nối khi tạo khóa")
    }
  }

  // Revoke Key
  const handleRevokeKey = async (keyId: string, keyPrefix: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi khóa API "${keyPrefix}"? Các yêu cầu sử dụng khóa này sẽ bị từ chối ngay lập tức.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/api-integrations/keys/${keyId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Quản trị viên thu hồi qua giao diện" }),
      })
      const result = await res.json()
      if (result.success) {
        fetchData()
      } else {
        alert(result.error || "Không thể thu hồi khóa")
      }
    } catch {
      alert("Lỗi khi thu hồi khóa")
    }
  }

  // View Logs
  const handleViewLogs = async (appId: string, appName: string) => {
    setSelectedAppLogs({ appId, appName })
    setLoadingLogs(true)
    try {
      const res = await fetch(`/api/admin/api-integrations/${appId}/logs`)
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs || [])
      }
    } catch {
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  // Copy Key to Clipboard
  const handleCopyRawKey = () => {
    if (newKeyData?.rawKey) {
      navigator.clipboard.writeText(newKeyData.rawKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Masthead */}
      <div className="bg-white border-l-4 border-[#003B3A] border-y border-r border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-[#003B3A]/10 text-[#003B3A]">
              <KeyRound className="w-5 h-5 text-[#003B3A]" />
            </span>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Quản lý kết nối API & Hệ thống tích hợp
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Quản trị các ứng dụng kết nối ngoài, gán theo Giáo viên / Tổ chuyên môn, tự động gửi email bàn giao và phân quyền học sinh, điểm số, khảo sát.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#00A19A]" />
            Hướng dẫn sử dụng API
          </button>
          <button
            onClick={() => handleOpenAppModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#003B3A] hover:bg-[#002B2A] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm ứng dụng mới
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Danh sách ứng dụng kết nối</h2>
            <p className="text-xs text-slate-500">
              Tổng số: <span className="tabular-nums font-bold text-slate-800">{apps.length}</span> ứng dụng
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Đang tải dữ liệu ứng dụng kết nối...
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-rose-600 font-medium">
            {error}
          </div>
        ) : apps.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Chưa có ứng dụng kết nối nào. Nhấn "Thêm ứng dụng mới" để bắt đầu cấp quyền tích hợp.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {apps.map((app) => {
              let perms: string[] = []
              try {
                perms = JSON.parse(app.permissions)
              } catch {}

              let campusesAllowed: string[] = []
              try {
                campusesAllowed = JSON.parse(app.allowedCampusIds)
              } catch {}

              let deptName = ""
              let teacherName = ""
              let recEmail = ""
              if (app.allowedDataScope) {
                try {
                  const parsed = JSON.parse(app.allowedDataScope)
                  if (parsed.departmentName) deptName = parsed.departmentName
                  if (parsed.teacherName) teacherName = parsed.teacherName
                  if (parsed.recipientEmail) recEmail = parsed.recipientEmail
                } catch (_) {}
              }

              const isAllCampuses = campusesAllowed.includes("*")
              const activeKeys = (app.apiKeys || []).filter((k) => k.status === "ACTIVE")

              return (
                <div key={app.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                  {/* Top line: Name, Status, Department & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{app.name}</span>
                        {app.status === "ACTIVE" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang hoạt động
                          </span>
                        ) : app.status === "INACTIVE" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Tạm dừng
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            Đã thu hồi
                          </span>
                        )}

                        {deptName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {deptName}
                          </span>
                        )}

                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Phụ trách: <strong className="text-slate-800 font-semibold">{app.contactPerson || "Chưa gắn"}</strong>
                        </span>
                      </div>
                      {app.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl">{app.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => handleSendEmail(app.id, app.name)}
                        className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Gửi email thông tin kết nối và tài liệu bàn giao API đến GV / Tổ chuyên môn"
                      >
                        <Send className="w-3.5 h-3.5 text-[#00A19A]" />
                        Gửi email bàn giao
                      </button>
                      <button
                        onClick={() => handleViewLogs(app.id, app.name)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        Nhật ký truy cập
                      </button>
                      <button
                        onClick={() => handleOpenAppModal(app)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        Sửa thông tin
                      </button>
                      {app.status !== "REVOKED" && (
                        <button
                          onClick={() => handleRevokeApp(app.id, app.name)}
                          className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 cursor-pointer"
                        >
                          Thu hồi ứng dụng
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Badges strip: Permissions & Scope */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500 block mb-1">Phạm vi cơ sở:</span>
                      {isAllCampuses ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-medium text-[11px]">
                          Toàn bộ hệ thống trường
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {campusesAllowed.map((cid) => {
                            const c = campuses.find((x) => x.id === cid)
                            return (
                              <span
                                key={cid}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]"
                              >
                                {c?.campusName || cid}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="font-semibold text-slate-500 block mb-1">Quyền truy cập:</span>
                      <div className="flex flex-wrap gap-1">
                        {perms.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">Chưa cấp quyền</span>
                        ) : (
                          perms.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono font-medium"
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-500 block mb-1">Giới hạn & Thời hạn:</span>
                      <div className="text-slate-600 text-[11px] space-y-0.5 tabular-nums">
                        <div>Tần suất: <strong>{app.rateLimitRpm}</strong> rpm</div>
                        <div>
                          Hết hạn:{" "}
                          {app.expiresAt
                            ? new Date(app.expiresAt).toLocaleDateString("vi-VN")
                            : "Vô thời hạn"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: API Keys */}
                  <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/60 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-800">
                          Danh sách khóa API ({activeKeys.length} đang hoạt động)
                        </span>
                      </div>
                      {app.status === "ACTIVE" && (
                        <button
                          onClick={() => handleOpenCreateKeyModal(app)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#00A19A] hover:bg-[#008B85] rounded transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Tạo khóa mới
                        </button>
                      )}
                    </div>

                    {app.apiKeys && app.apiKeys.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                              <th className="py-1 px-2">Tên khóa</th>
                              <th className="py-1 px-2">Mã nhận diện (Key ID)</th>
                              <th className="py-1 px-2">Tiền tố hiển thị</th>
                              <th className="py-1 px-2">Trạng thái</th>
                              <th className="py-1 px-2">Ngày tạo</th>
                              <th className="py-1 px-2">Lần dùng gần nhất</th>
                              <th className="py-1 px-2 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {app.apiKeys.map((k) => (
                              <tr key={k.id} className="hover:bg-slate-100/50">
                                <td className="py-1.5 px-2 font-medium">{k.name || "Khóa API"}</td>
                                <td className="py-1.5 px-2 font-mono text-slate-600">{k.keyId}</td>
                                <td className="py-1.5 px-2 font-mono text-slate-800">{k.keyPrefix}</td>
                                <td className="py-1.5 px-2">
                                  {k.status === "ACTIVE" ? (
                                    <span className="text-emerald-700 font-medium">Hoạt động</span>
                                  ) : (
                                    <span className="text-rose-600 font-medium">Đã thu hồi</span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 tabular-nums text-slate-500">
                                  {new Date(k.createdAt).toLocaleDateString("vi-VN")}
                                </td>
                                <td className="py-1.5 px-2 tabular-nums text-slate-500">
                                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("vi-VN") : "—"}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  {k.status === "ACTIVE" && (
                                    <button
                                      onClick={() => handleRevokeKey(k.keyId, k.keyPrefix)}
                                      className="text-rose-600 hover:text-rose-800 font-medium text-[11px] cursor-pointer"
                                    >
                                      Thu hồi khóa
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 py-2">
                        Chưa có khóa nào được cấp cho ứng dụng này. Hãy bấm "Tạo khóa mới".
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Create / Edit Application with Teacher / Department Assignment */}
      {isAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingApp ? "Cập nhật ứng dụng kết nối" : "Đăng ký ứng dụng kết nối mới"}
              </h3>
              <button
                onClick={() => setIsAppModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveApp} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Tên ứng dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Hồ sơ GV, Hệ thống Thi trắc nghiệm, LMS Moodle..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#00A19A] focus:outline-hidden"
                />
              </div>

              {/* Phân công theo Tổ chuyên môn & Giáo viên phụ trách */}
              <div className="p-4 rounded-xl border border-teal-200/90 bg-teal-50/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#003B3A] flex items-center gap-1.5 text-xs">
                    <Users className="w-4 h-4 text-[#00A19A]" />
                    Gán theo Tổ chuyên môn & Giáo viên phụ trách
                  </label>
                  <span className="text-[10px] text-teal-800 font-semibold bg-teal-100/80 px-2 py-0.5 rounded border border-teal-200">
                    Gửi mail tự động
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      1. Tổ chuyên môn / Phòng ban
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => {
                        const deptId = e.target.value
                        const dept = departments.find((d) => d.id === deptId)
                        setFormData({
                          ...formData,
                          departmentId: deptId,
                          departmentName: dept?.name || (deptId === "EXTERNAL" ? "Đối tác ngoài" : ""),
                          teacherId: "",
                          teacherName: "",
                        })
                      }}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-xs focus:border-[#00A19A] focus:outline-hidden"
                    >
                      <option value="">-- Chọn Tổ chuyên môn / Phòng ban --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                      <option value="EXTERNAL">Khác / Đối tác phần mềm bên ngoài</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      2. Giáo viên / Cán bộ phụ trách
                    </label>
                    <select
                      value={formData.teacherId}
                      onChange={(e) => {
                        const uid = e.target.value
                        const user = staffUsers.find((u) => u.id === uid)
                        const tEmail = user?.teacher?.email || user?.email || ""
                        const tName = user?.fullName || user?.teacher?.teacherName || ""
                        const deptName = formData.departmentName || user?.teacher?.departmentRel?.name || ""
                        setFormData({
                          ...formData,
                          teacherId: uid,
                          teacherName: tName,
                          departmentName: deptName,
                          recipientEmail: tEmail || formData.recipientEmail,
                          contactPerson: tName
                            ? `${tName}${deptName ? ` (${deptName})` : ""}${tEmail ? ` - ${tEmail}` : ""}`
                            : formData.contactPerson,
                        })
                      }}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-xs focus:border-[#00A19A] focus:outline-hidden"
                    >
                      <option value="">-- Chọn Giáo viên / Cán bộ ({filteredStaff.length}) --</option>
                      {filteredStaff.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.teacher?.teacherCode || u.role} - {u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#00A19A]" />
                      Email nhận thông báo kết nối & bàn giao API <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Tự động điền theo GV đã chọn</span>
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                    placeholder="vidu: giaovien@skylineschool.edu.vn"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-xs focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.sendNotificationEmail}
                      onChange={(e) => setFormData({ ...formData, sendNotificationEmail: e.target.checked })}
                      className="rounded border-slate-300 text-[#003B3A] focus:ring-[#003B3A]"
                    />
                    <span className="text-[11px] font-medium text-slate-800">
                      Gửi email thông báo cấp quyền & hướng dẫn kết nối API đến địa chỉ trên
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500 ml-5 mt-0.5">
                    Hệ thống sẽ gửi email tự động với tiêu chuẩn nhận diện thương hiệu Sky-Line SMS kèm thông số kết nối và link tài liệu OpenAPI.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Mô tả mục đích kết nối</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn gọn luồng dữ liệu cần tích hợp..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#00A19A] focus:outline-hidden"
                />
              </div>

              {/* Permissions Checklist - Categorized Ledger Style */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div>
                    <label className="block font-bold text-slate-800 text-xs">
                      Phân quyền API Endpoint & Dữ liệu
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Cấp quyền chi tiết theo nguyên tắc Quyền tối thiểu (Principle of Least Privilege).
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#003B3A] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full tabular-nums">
                    Đã chọn: {formData.permissions.length} / {ALL_API_PERMISSIONS.length} quyền
                  </span>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {(
                    [
                      {
                        category: "HỌC SINH" as const,
                        title: "Dữ liệu & Hồ sơ Học sinh",
                        icon: "🎓",
                        note: "Hỗ trợ lọc theo khối, lớp, cơ sở. Số điện thoại và email phụ huynh được tự động che giấu (Masked PII) trừ khi được cấp quyền liên hệ.",
                      },
                      {
                        category: "GIÁO VIÊN" as const,
                        title: "Dữ liệu & Phân công Giáo viên",
                        icon: "👨‍🏫",
                        note: "Hỗ trợ danh bạ nhân sự, tổ chuyên môn, số tiết và lịch dạy. SĐT cá nhân được tự động che giấu.",
                      },
                      {
                        category: "ĐIỂM SỐ & CHUYÊN MÔN" as const,
                        title: "Điểm số, Đánh giá & Phân công trường",
                        icon: "📊",
                        note: "Tra cứu sổ điểm, nạp điểm thường xuyên/học kỳ kèm kiểm tra khóa sổ điểm tự động (GradebookLock).",
                      },
                      {
                        category: "KHẢO SÁT & ĐBCL" as const,
                        title: "Khảo sát, ĐBCL & Kiểm định",
                        icon: "📋",
                        note: "Thu thập ý kiến khảo sát PHHS/HS/GV và báo cáo ĐBCL định kỳ.",
                      },
                    ]
                  ).map((group) => {
                    const groupPerms = ALL_API_PERMISSIONS.filter((p) => p.category === group.category)
                    const selectedCount = groupPerms.filter((p) => formData.permissions.includes(p.code)).length
                    const allSelected = selectedCount === groupPerms.length

                    const toggleAll = (select: boolean) => {
                      const groupCodes = groupPerms.map((p) => p.code)
                      if (select) {
                        const newPerms = Array.from(new Set([...formData.permissions, ...groupCodes]))
                        setFormData({ ...formData, permissions: newPerms })
                      } else {
                        setFormData({
                          ...formData,
                          permissions: formData.permissions.filter((p) => !groupCodes.includes(p)),
                        })
                      }
                    }

                    return (
                      <div
                        key={group.category}
                        className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs"
                      >
                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{group.icon}</span>
                            <div>
                              <span className="font-bold text-slate-800 text-xs">{group.title}</span>
                              <span className="ml-2 text-[10px] text-slate-500 font-medium tabular-nums">
                                ({selectedCount}/{groupPerms.length})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => toggleAll(!allSelected)}
                              className="text-[#003B3A] font-semibold hover:underline px-1.5 py-0.5"
                            >
                              {allSelected ? "Bỏ chọn nhóm" : "Chọn cả nhóm"}
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50/30">
                          <p className="text-[10px] text-slate-500 mb-2 italic">
                            {group.note}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {groupPerms.map((perm) => {
                              const checked = formData.permissions.includes(perm.code)
                              return (
                                <label
                                  key={perm.code}
                                  className={`flex items-start gap-2 p-2 rounded border cursor-pointer select-none transition-colors ${
                                    checked
                                      ? "border-teal-300 bg-teal-50/40 text-slate-900"
                                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          permissions: [...formData.permissions, perm.code],
                                        })
                                      } else {
                                        setFormData({
                                          ...formData,
                                          permissions: formData.permissions.filter((p) => p !== perm.code),
                                        })
                                      }
                                    }}
                                    className="mt-0.5 rounded border-slate-300 text-[#003B3A] focus:ring-[#003B3A]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[11px] font-bold text-[#003B3A]">
                                        {perm.code}
                                      </span>
                                      {perm.isSensitive && (
                                        <span className="inline-flex items-center text-[9px] font-bold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-300">
                                          PII NĐ 13/2023
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-800 mt-0.5">
                                      {perm.label}
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                                      {perm.description}
                                    </div>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Campus Scope */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Phạm vi cơ sở được phép truy cập</label>
                <div className="border border-slate-200 rounded p-3 space-y-2 bg-slate-50/50">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.allowedCampusIds.includes("*")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, allowedCampusIds: ["*"] })
                        } else {
                          setFormData({ ...formData, allowedCampusIds: [] })
                        }
                      }}
                      className="rounded border-slate-300 text-[#003B3A]"
                    />
                    <span>Toàn bộ hệ thống trường Sky-Line (Tất cả cơ sở)</span>
                  </label>

                  {!formData.allowedCampusIds.includes("*") && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      {campuses.map((c) => {
                        const checked = formData.allowedCampusIds.includes(c.id)
                        return (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    allowedCampusIds: [...formData.allowedCampusIds, c.id],
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    allowedCampusIds: formData.allowedCampusIds.filter((id) => id !== c.id),
                                  })
                                }
                              }}
                              className="rounded border-slate-300 text-[#003B3A]"
                            />
                            <span>{c.campusName}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Rate limit & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giới hạn tần suất (Requests/phút)</label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={formData.rateLimitRpm}
                    onChange={(e) => setFormData({ ...formData, rateLimitRpm: parseInt(e.target.value, 10) || 60 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#00A19A]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Ngày hết hạn ứng dụng (Để trống nếu vô thời hạn)</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#00A19A]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAppModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#003B3A] text-white rounded hover:bg-[#002B2A] font-semibold cursor-pointer"
                >
                  {editingApp ? "Lưu thay đổi" : "Đăng ký ứng dụng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE API KEY INPUT MODAL WITH EMAIL OPTION */}
      {keyModalAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Khởi tạo khóa API mới</h3>
            <p className="text-xs text-slate-500">
              Khóa API sẽ được tạo bằng bộ sinh số ngẫu nhiên mật mã của Node.js. Bản băm SHA-256 sẽ được lưu trên máy chủ.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tên nhãn của khóa</label>
              <input
                type="text"
                placeholder="Ví dụ: Khóa chính thức 2026, Sync n8n..."
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:border-[#00A19A]"
              />
            </div>

            {/* Email Dispatch Box */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg space-y-2 text-xs">
              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendKeyEmail}
                  onChange={(e) => setSendKeyEmail(e.target.checked)}
                  className="rounded border-slate-300 text-[#003B3A]"
                />
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#00A19A]" />
                  Gửi email bàn giao khóa đến GV / Tổ CM
                </span>
              </label>
              {sendKeyEmail && (
                <input
                  type="email"
                  value={keyTargetEmail}
                  onChange={(e) => setKeyTargetEmail(e.target.value)}
                  placeholder="Email người nhận khóa..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              )}
            </div>

            {/* Delivery Passcode Box (Đặt thêm pass khi giao) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePasscode}
                    onChange={(e) => setRequirePasscode(e.target.checked)}
                    className="rounded border-slate-300 text-[#003B3A]"
                  />
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[#00A19A]" />
                    Đặt mật khẩu bảo vệ khi giao (Passcode)
                  </span>
                </label>
                {requirePasscode && (
                  <button
                    type="button"
                    onClick={() => {
                      const digits = Math.floor(100000 + Math.random() * 900000).toString()
                      setDeliveryPasscode(`SL-${digits}`)
                    }}
                    className="text-[11px] text-[#003B3A] font-semibold hover:underline cursor-pointer"
                  >
                    Tạo mã ngẫu nhiên
                  </button>
                )}
              </div>

              {requirePasscode && (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={deliveryPasscode}
                    onChange={(e) => setDeliveryPasscode(e.target.value)}
                    placeholder="Ví dụ: SL-849201 (để trống hệ thống tự sinh)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-xs font-bold text-slate-800 uppercase focus:border-[#00A19A]"
                  />
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Khóa trong email sẽ được bảo vệ 2 lớp. Người nhận bắt buộc phải nhập mật khẩu này để mở khóa. Quản trị viên gửi mật khẩu cho cán bộ qua <strong>SMS / Zalo / Trực tiếp</strong>.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setKeyModalAppId(null)}
                className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => handleCreateKey(keyModalAppId)}
                className="px-3 py-1.5 bg-[#003B3A] text-white rounded hover:bg-[#002B2A] font-semibold cursor-pointer"
              >
                Sinh khóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ONE-TIME API KEY DISPLAY (Crucial Security UX) */}
      {newKeyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Khởi tạo khóa API thành công</h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý bảo mật quan trọng:</strong> Khóa API đầy đủ này chỉ được hiển thị <strong>DUY NHẤT MỘT LẦN</strong>. Máy chủ chỉ lưu trữ bản băm mật mã SHA-256 và không thể khôi phục lại khóa nguyên bản. Vui lòng sao chép và lưu trữ an toàn ngay bây giờ.
              </div>
            </div>

            {newKeyData.emailSent && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-md text-xs text-teal-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00A19A] shrink-0" />
                <span>
                  Đã tự động gửi thông tin bàn giao khóa API đến email:{" "}
                  <strong>{newKeyData.recipientEmail}</strong>
                </span>
              </div>
            )}

            {/* Delivery Passcode Box if set */}
            {newKeyData.deliveryPasscode && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-700" />
                    Mật khẩu bảo vệ khi bàn giao (Passcode):
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newKeyData.deliveryPasscode!)
                      setCopiedPasscode(true)
                      setTimeout(() => setCopiedPasscode(false), 2500)
                    }}
                    className="text-[11px] text-[#003B3A] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPasscode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPasscode ? "Đã chép mật khẩu" : "Sao chép mật khẩu"}
                  </button>
                </div>
                <div className="font-mono text-base font-bold text-slate-900 bg-white border border-amber-300 px-3 py-1.5 rounded text-center tracking-widest tabular-nums">
                  {newKeyData.deliveryPasscode}
                </div>
                <div className="text-[11px] text-amber-800 leading-snug">
                  🔒 <strong>Quy trình bàn giao 2 kênh:</strong> Email đã gửi liên kết mở khóa đến Thầy/Cô. Quản trị viên hãy gửi mật khẩu <strong className="font-mono font-bold">{newKeyData.deliveryPasscode}</strong> cho Thầy/Cô qua tin nhắn riêng (SMS / Zalo) để mở khóa theo Nghị định 13/2023/NĐ-CP.
                </div>
              </div>
            )}

            <div className="space-y-1 text-xs">
              <div className="text-slate-500 font-medium">Ứng dụng: <strong>{newKeyData.appName}</strong> ({newKeyData.name})</div>
              <div className="text-slate-500 font-mono">Mã định danh (Key ID): {newKeyData.keyId}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Khóa bí mật (API Secret Key):</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newKeyData.rawKey}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded font-mono text-xs text-slate-900 select-all"
                />
                <button
                  onClick={handleCopyRawKey}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                    copiedKey
                      ? "bg-emerald-600 text-white"
                      : "bg-[#003B3A] hover:bg-[#002B2A] text-white"
                  }`}
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? "Đã sao chép!" : "Sao chép"}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setNewKeyData(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded cursor-pointer"
              >
                Tôi đã lưu khóa an toàn, đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: Access Logs & Telemetry */}
      {selectedAppLogs && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-2xs">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Nhật ký truy cập & Telemetry</h3>
                <p className="text-xs text-slate-500">Ứng dụng: {selectedAppLogs.appName}</p>
              </div>
              <button
                onClick={() => setSelectedAppLogs(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {loadingLogs ? (
                <div className="py-12 text-center text-xs text-slate-500">Đang tải nhật ký...</div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chưa có lịch sử truy cập nào được ghi nhận cho ứng dụng này.
                </div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="p-3 border border-slate-200 rounded-lg text-xs space-y-1.5 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{l.method}</span>
                        <span className="font-mono text-slate-600">{l.endpoint}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-nums ${
                          l.statusCode < 300
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : l.statusCode < 400
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {l.statusCode}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                      <span>Request ID: <span className="font-mono">{l.requestId}</span></span>
                      <span>{new Date(l.createdAt).toLocaleString("vi-VN")} ({l.durationMs || 0}ms)</span>
                    </div>

                    {l.errorMessage && (
                      <p className="text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-100">
                        {l.errorMessage}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Sổ tay Hướng dẫn Tích hợp API */}
      <ApiGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  )
}
