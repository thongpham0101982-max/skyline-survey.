"use client"
import { useEffect, useMemo, useState } from "react"
import {
  X, Check, RefreshCw, Search, Building2, Users, Briefcase,
  UserCircle2, AlertCircle, Shield
} from "lucide-react"
import { ACADEMIC_DIVISIONS } from "@/config/divisions"

export interface TeacherFormState {
  teacherCode: string
  teacherName: string
  email: string
  phone: string
  dateOfBirth: string
  department: string
  departmentAssignments: Array<{
    departmentId: string
    position: string
    isPrimary?: boolean
  }>
  mainSubject: string
  campusId: string
  additionalCampusIds: string[]
  position: string
  positions: string[]
  divisionCodes: string[]
  status: string
}

interface TeacherFormDrawerProps {
  open: boolean
  mode: "create" | "edit"
  form: TeacherFormState
  setForm: (next: TeacherFormState) => void
  departments: Array<{ id: string; code?: string | null; name: string; blockCM?: string | null }>
  subjects: Array<{ id: string; subjectCode?: string | null; subjectName: string }>
  campuses: Array<{ id: string; campusCode?: string | null; campusName: string }>
  isCampusLocked?: boolean
  saving: boolean
  errorMsg?: string
  onClose: () => void
  onSubmit: () => void
}

const POSITION_OPTIONS = [
  { value: "GV", label: "Giáo viên (GV)" },
  { value: "NV", label: "Nhân viên (NV)" },
  { value: "TTCM", label: "Tổ trưởng chuyên môn (TTCM)" },
  { value: "TPTCM", label: "Tổ phó chuyên môn (TPTCM)" },
  { value: "TBP", label: "Trưởng bộ phận (TBP)" },
  { value: "TB_DHCM", label: "Trưởng ban ĐHCM" },
  { value: "GĐCS", label: "Giám đốc cơ sở (GĐCS)" },
]

const DEPT_ROLE_OPTIONS = ["GV", "NV", "TTCM", "TPTCM", "QLCM", "Ban ĐHCM", "GĐCS"]

export function TeacherFormDrawer({
  open,
  mode,
  form,
  setForm,
  departments,
  subjects,
  campuses,
  isCampusLocked = false,
  saving,
  errorMsg,
  onClose,
  onSubmit,
}: TeacherFormDrawerProps) {
  const [deptSearch, setDeptSearch] = useState("")

  useEffect(() => {
    if (!open) return
    setDeptSearch("")
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, saving, onClose])

  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase()
    const assignedIds = new Set((form.departmentAssignments || []).map((a) => a.departmentId))
    const list = (departments || []).filter((d) =>
      !q || d.name.toLowerCase().includes(q) || (d.blockCM || "").toLowerCase().includes(q)
    )
    // Show assigned departments first so admin immediately sees current memberships
    return [...list].sort((a, b) => {
      const aIn = assignedIds.has(a.id) ? 0 : 1
      const bIn = assignedIds.has(b.id) ? 0 : 1
      if (aIn !== bIn) return aIn - bIn
      return a.name.localeCompare(b.name, "vi")
    })
  }, [departments, deptSearch, form.departmentAssignments])

  if (!open) return null

  const otherCampuses = (campuses || []).filter((c) => c.id !== form.campusId)

  const handleToggleDepartment = (dept: { id: string; name: string }, checked: boolean) => {
    const cur = form.departmentAssignments || []
    if (checked) {
      const next = [...cur, { departmentId: dept.id, position: "GV", isPrimary: cur.length === 0 }]
      const primaryDeptName = next[0]
        ? (departments || []).find((dx) => dx.id === next[0].departmentId)?.name || dept.name
        : dept.name
      setForm({ ...form, departmentAssignments: next, department: primaryDeptName })
    } else {
      const next = cur.filter((x) => x.departmentId !== dept.id)
      const primaryDeptName = next[0]
        ? (departments || []).find((dx) => dx.id === next[0].departmentId)?.name || ""
        : ""
      setForm({ ...form, departmentAssignments: next, department: primaryDeptName })
    }
  }

  const handleDeptPositionChange = (deptId: string, newDeptPos: string) => {
    const cur = form.departmentAssignments || []
    const next = cur.map((x) => (x.departmentId === deptId ? { ...x, position: newDeptPos } : x))
    const hasTTCM = next.some((x) => x.position === "TTCM")
    setForm({
      ...form,
      departmentAssignments: next,
      position: hasTTCM ? "TTCM" : form.position || "GV",
    })
  }

  const handleMainPositionChange = (newPos: string) => {
    let nextDeptAssignments = form.departmentAssignments || []
    if (newPos === "TTCM" && nextDeptAssignments.length > 0) {
      nextDeptAssignments = nextDeptAssignments.map((da, idx) =>
        idx === 0 ? { ...da, position: "TTCM" } : da
      )
    } else if (newPos === "GV" && nextDeptAssignments.length > 0) {
      nextDeptAssignments = nextDeptAssignments.map((da) =>
        da.position === "TTCM" ? { ...da, position: "GV" } : da
      )
    }
    setForm({ ...form, position: newPos, departmentAssignments: nextDeptAssignments })
  }

  const handleToggleDivision = (divCode: string, checked: boolean) => {
    const cur = form.divisionCodes || []
    const next = checked ? [...cur, divCode] : cur.filter((x) => x !== divCode)
    const autoPos = next.length > 0 && form.position === "GV" ? "TBP" : form.position
    setForm({ ...form, divisionCodes: next, position: autoPos })
  }

  const handleToggleAdditionalCampus = (cid: string) => {
    const cur = form.additionalCampusIds || []
    const next = cur.includes(cid) ? cur.filter((x) => x !== cid) : [...cur, cid]
    setForm({ ...form, additionalCampusIds: next })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity"
        onClick={() => !saving && onClose()}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "Thêm giáo viên mới" : "Chỉnh sửa thông tin giáo viên"}
        className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-4 border-l-4 border-l-[#003B3A]">
          <div>
            <h2 className="text-lg font-bold text-[#003B3A] leading-snug">
              {mode === "create" ? "Thêm giáo viên mới" : "Chỉnh sửa hồ sơ giáo viên"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === "create"
                ? "Tài khoản đăng nhập sẽ tự động khởi tạo theo Mã GV."
                : `Mã giáo viên: ${form.teacherCode}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="whitespace-pre-line">{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Thông tin cơ bản */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
              <UserCircle2 className="w-4 h-4 text-[#00736E]" />
              <h3 className="text-sm font-semibold text-slate-800">Thông tin cơ bản</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Mã giáo viên <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.teacherCode}
                  disabled={mode === "edit"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      teacherCode: e.target.value.replace(/-/g, "").trim().toUpperCase(),
                    })
                  }
                  placeholder="Ví dụ: 0201000801"
                  className={`w-full border rounded-xl px-3 py-2 text-sm tabular-nums font-medium outline-none transition-colors ${
                    mode === "edit"
                      ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-white border-[#CBD5E1] text-slate-900 focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Họ và tên <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.teacherName}
                  onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm font-medium text-slate-900 bg-white outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email nhận thông báo
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value.trim() })}
                  placeholder="ten.gv@skylineschool.edu.vn"
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Môn giảng dạy chính
                </label>
                <select
                  value={form.mainSubject}
                  onChange={(e) => setForm({ ...form, mainSubject: e.target.value })}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-colors cursor-pointer"
                >
                  <option value="">Chưa phân môn</option>
                  {(subjects || []).map((s) => (
                    <option key={s.id} value={s.subjectName}>
                      {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-colors tabular-nums"
                />
              </div>

              {mode === "edit" && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Trạng thái tài khoản
                  </label>
                  <div className="inline-flex p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: "ACTIVE" })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        form.status === "ACTIVE"
                          ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Đang hoạt động (On)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: "INACTIVE" })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        form.status === "INACTIVE"
                          ? "bg-white text-rose-700 shadow-xs border border-rose-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Ngừng hoạt động (Off)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Cơ sở công tác */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
              <Building2 className="w-4 h-4 text-[#00736E]" />
              <h3 className="text-sm font-semibold text-slate-800">Cơ sở công tác</h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Cơ sở chính
              </label>
              <select
                value={form.campusId}
                disabled={isCampusLocked}
                onChange={(e) => {
                  const nid = e.target.value
                  setForm({
                    ...form,
                    campusId: nid,
                    additionalCampusIds: (form.additionalCampusIds || []).filter((x) => x !== nid),
                  })
                }}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition-colors ${
                  isCampusLocked
                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-white border-[#CBD5E1] text-slate-800 focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 cursor-pointer"
                }`}
              >
                <option value="">-- Chọn cơ sở chính --</option>
                {(campuses || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>
            </div>

            {otherCampuses.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Cơ sở kiêm nhiệm (nếu dạy liên cơ sở)
                </label>
                <div className="flex flex-wrap gap-2">
                  {otherCampuses.map((c) => {
                    const checked = (form.additionalCampusIds || []).includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleAdditionalCampus(c.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          checked
                            ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A]"
                            : "bg-white border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            checked
                              ? "bg-[#003B3A] border-[#003B3A] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {checked && <Check className="w-2.5 h-2.5" />}
                        </span>
                        {c.campusName}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Section 3: Chức vụ & Tổ chuyên môn */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
              <Users className="w-4 h-4 text-[#00736E]" />
              <h3 className="text-sm font-semibold text-slate-800">Chức vụ và Tổ chuyên môn</h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Chức vụ chính
              </label>
              <select
                value={form.position || "GV"}
                onChange={(e) => handleMainPositionChange(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-colors cursor-pointer"
              >
                {POSITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Phân công Tổ chuyên môn
                  {(form.departmentAssignments || []).length > 0 && (
                    <span className="ml-1.5 text-[#00736E] font-semibold tabular-nums">
                      (Đã chọn {form.departmentAssignments.length})
                    </span>
                  )}
                </label>
              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
                <div className="relative border-b border-[#F1F5F9] bg-[#F8FAFC]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    placeholder="Tìm nhanh tổ chuyên môn..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-[#F1F5F9]">
                  {filteredDepartments.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      Không tìm thấy tổ chuyên môn phù hợp
                    </p>
                  ) : (
                    filteredDepartments.map((d) => {
                      const assigned = (form.departmentAssignments || []).find(
                        (a) => a.departmentId === d.id
                      )
                      const isChecked = !!assigned
                      return (
                        <div
                          key={d.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                            isChecked ? "bg-[#F0FDFA]/70" : "hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleDepartment(d, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A] cursor-pointer"
                            />
                            <span className="text-xs font-medium text-slate-800 truncate">
                              {d.name}
                            </span>
                            {d.blockCM && (
                              <span className="text-[11px] text-slate-400 flex-shrink-0">
                                ({d.blockCM})
                              </span>
                            )}
                          </label>
                          {isChecked && (
                            <select
                              value={assigned.position || "GV"}
                              onChange={(e) => handleDeptPositionChange(d.id, e.target.value)}
                              className="text-xs font-semibold px-2 py-1 border border-[#00A19A]/40 rounded-lg bg-white text-[#003B3A] outline-none cursor-pointer"
                            >
                              {DEPT_ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Bộ phận phụ trách (TBP) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
              <Briefcase className="w-4 h-4 text-[#00736E]" />
              <h3 className="text-sm font-semibold text-slate-800">Bộ phận phụ trách (TBP)</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {ACADEMIC_DIVISIONS.map((div) => {
                const isChecked = (form.divisionCodes || []).includes(div.code)
                return (
                  <button
                    key={div.code}
                    type="button"
                    onClick={() => handleToggleDivision(div.code, !isChecked)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      isChecked
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-white border-[#E2E8F0] text-slate-700 hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 opacity-80" />
                    {div.name}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-60 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                {mode === "create" ? "Lưu giáo viên" : "Lưu thay đổi"}
              </>
            )}
          </button>
        </div>
      </aside>
    </div>
  )
}
