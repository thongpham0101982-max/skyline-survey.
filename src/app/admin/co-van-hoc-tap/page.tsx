"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Compass,
  Calendar, 
  Users, 
  Layers, 
  ShieldAlert, 
  BarChart3, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Award, 
  BookOpen, 
  Clock, 
  Heart, 
  Rocket, 
  Building2, 
  Eye, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  X, 
  Loader2,
  Check
} from "lucide-react"

export default function AdminAdvisoryDashboard() {
  const [activeTab, setActiveTab] = useState<"presets" | "dashboard">("presets")

  // --- TAB 1: PRESETS STATE ---
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<string>("K6_K8")
  const [presets, setPresets] = useState<any[]>([])
  const [loadingPresets, setLoadingPresets] = useState<boolean>(true)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingPreset, setEditingPreset] = useState<any>(null)
  const [savingPreset, setSavingPreset] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string>("")

  const [presetRows, setPresetRows] = useState<Array<{ goalText: string; actionPreset: string }>>([{ goalText: "", actionPreset: "" }])
  const [presetForm, setPresetForm] = useState({
    gradeGroup: "K6_K8",
    category: "HOC_TAP",
    goalText: "",
    actionPreset: "",
    sortOrder: 1,
    status: "ACTIVE"
  })

  // --- TAB 2: DASHBOARD STATE ---
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("")
  const [campuses, setCampuses] = useState<any[]>([])
  const [selectedCampusId, setSelectedCampusId] = useState<string>("")
  const [selectedStatusColor, setSelectedStatusColor] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(false)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"CLASS" | "STUDENT">("CLASS")
  const [selectedClassDetail, setSelectedClassDetail] = useState<any>(null)
  const [classStudentSearch, setClassStudentSearch] = useState<string>("")

  const GRADE_GROUPS = [
    { key: "K2", label: "Khối 2 ✏️", desc: "Rèn chữ viết, tự giác hoàn thành bài tập" },
    { key: "K3", label: "Khối 3 📚", desc: "Nâng cao năng lực tự học, tự tin giao tiếp" },
    { key: "K4_K5", label: "Khối 4 - 5 🏆", desc: "Chuẩn bị hành trang chuyển cấp THCS" },
    { key: "K6_K8", label: "Khối 6 - 8 🚀", desc: "Tự chủ phương pháp học & Định hướng bản thân" },
    { key: "K9_K12", label: "Khối 9 - 12 🎓", desc: "Bứt phá thi cử, săn học bổng & Hướng nghiệp" }
  ]

  const CATEGORIES = [
    { key: "HOC_TAP", label: "1. Mục tiêu học tập 📚", icon: BookOpen, color: "text-sky-600 bg-sky-50 border-sky-200" },
    { key: "THOI_QUEN", label: "2. Mục tiêu thói quen ⏰", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { key: "KY_NANG_CAM_XUC", label: "3. Mục tiêu kỹ năng, cảm xúc 🎨", icon: Heart, color: "text-rose-600 bg-rose-50 border-rose-200" },
    { key: "DINH_HUONG", label: "4. Mục tiêu định hướng 🚀", icon: Rocket, color: "text-purple-600 bg-purple-50 border-purple-200" }
  ]

  // Load Presets
  useEffect(() => {
    loadPresets()
  }, [selectedGradeGroup])

  // Load Dashboard & Master Data
  useEffect(() => {
    if (activeTab === "dashboard") {
      loadAcademicYears()
      loadCampuses()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadDashboard()
    }
  }, [activeTab, selectedCampusId, selectedAcademicYearId, selectedStatusColor])

  async function loadAcademicYears() {
    try {
      const res = await fetch("/api/academic-years?all=true")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setAcademicYears(data)
          if (!selectedAcademicYearId) {
            const active = data.find((y: any) => y.status === "ACTIVE" && !y.isOff) || data[0]
            if (active) {
              setSelectedAcademicYearId(active.id)
            }
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(""), 4000)
  }

  async function loadPresets() {
    setLoadingPresets(true)
    try {
      const res = await fetch("/api/admin/advisory/presets?gradeGroup=" + selectedGradeGroup + "&_t=" + Date.now(), { cache: "no-store" })
      if (res.ok) {
        setPresets(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPresets(false)
    }
  }

  async function handleSeedDefaults() {
    if (!confirm("Bạn có chắc chắn muốn khôi phục danh mục Mục tiêu mẫu mặc định cho toàn bộ các khối?")) return
    setLoadingPresets(true)
    try {
      const res = await fetch("/api/admin/advisory/presets?seed=true", { cache: "no-store" })
      if (res.ok) {
        showToast("Đã khôi phục thành công danh mục mục tiêu mẫu hệ thống!")
        loadPresets()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPresets(false)
    }
  }

  async function loadCampuses() {
    try {
      const res = await fetch("/api/campuses")
      if (res.ok) {
        setCampuses(await res.json())
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function loadDashboard(overrideYearId?: string) {
    const yearId = overrideYearId !== undefined ? overrideYearId : selectedAcademicYearId
    setLoadingDashboard(true)
    try {
      const url = "/api/admin/advisory/dashboard?campusId=" + selectedCampusId + "&academicYearId=" + yearId + "&statusColor=" + selectedStatusColor + "&search=" + encodeURIComponent(searchQuery) + "&_t=" + Date.now()
      const res = await fetch(url, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setDashboardData(data)
        if (data.currentAcademicYearId && !selectedAcademicYearId) {
          setSelectedAcademicYearId(data.currentAcademicYearId)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDashboard(false)
    }
  }

  function handleOpenCreateModal(categoryKey = "HOC_TAP") {
    setEditingPreset(null)
    setPresetForm({
      gradeGroup: selectedGradeGroup,
      category: categoryKey,
      goalText: "",
      actionPreset: "",
      sortOrder: (presets.filter(p => p.category === categoryKey).length || 0) + 1,
      status: "ACTIVE"
    })
    setIsModalOpen(true)
  }

  function handleOpenEditModal(item: any) {
    setEditingPreset(item)
    setPresetForm({
      gradeGroup: item.gradeGroup,
      category: item.category,
      goalText: item.goalText || "",
      actionPreset: item.actionPreset || "",
      sortOrder: item.sortOrder || 1,
      status: item.status || "ACTIVE"
    })
    setIsModalOpen(true)
  }

  async function handleSavePreset(e: React.FormEvent) {
    e.preventDefault()
    if (!presetForm.goalText.trim()) return alert("Vui lòng nhập nội dung mục tiêu mẫu")

    setSavingPreset(true)
    try {
      const method = editingPreset ? "PUT" : "POST"
      const payload = editingPreset ? { ...presetForm, id: editingPreset.id } : presetForm

      const res = await fetch("/api/admin/advisory/presets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showToast(editingPreset ? "Đã cập nhật mục tiêu mẫu!" : "Đã thêm mới mục tiêu mẫu!")
        setIsModalOpen(false)
        loadPresets()
      } else {
        const err = await res.json()
        alert(err.error || "Có lỗi xảy ra")
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSavingPreset(false)
    }
  }

  async function handleDeletePreset(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa mục tiêu mẫu này?")) return
    try {
      const res = await fetch("/api/admin/advisory/presets?id=" + id, { method: "DELETE" })
      if (res.ok) {
        showToast("Đã xóa mục tiêu mẫu!")
        loadPresets()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans text-slate-800">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#48BFE3] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 border border-white/20 text-teal-100 uppercase tracking-wider">
            <Compass className="w-4 h-4 text-teal-300 animate-spin-slow" />
            <span>BAN GIÁM HIỆU • BỘ PHẬN ĐÀO TẠO SKY-LINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span>Quản Lý Cố Vấn Học Tập 360°</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-400 text-emerald-950 uppercase">LIVE</span>
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/90 font-medium">
            Quản lý thư viện Phiếu Mẫu Mục Tiêu Khối 2 đến Khối 12 • Tự động đồng bộ Học sinh, GVCN, Phụ huynh • Giám sát 360° toàn hệ thống.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-black/20 p-1.5 rounded-2xl flex items-center gap-1 border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab("presets")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "presets"
                ? "bg-white text-[#003B3A] shadow-lg"
                : "text-teal-100 hover:bg-white/10"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📋 QL PHIẾU MẪU MỤC TIÊU</span>
          </button>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "dashboard"
                ? "bg-white text-[#003B3A] shadow-lg"
                : "text-teal-100 hover:bg-white/10"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 DASHBOARD GIÁM SÁT 360°</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: QUẢN LÝ PHIẾU MẪU MỤC TIÊU (K1, K2, K3, K4-5, K6-8, K9-12) */}
      {/* ========================================================================= */}
      {activeTab === "presets" && (
        <div className="space-y-6">
          
          {/* Grade Level Group Selector Tabs */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>CHỌN KHỐI HỌC CẤU HÌNH PHIẾU MỤC TIÊU MẪU (ÁP DỤNG KHỐI 2 - KHỐI 12):</span>
              </span>
              <button
                onClick={handleSeedDefaults}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 border border-slate-300 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Khôi phục mẫu hệ thống</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
              {GRADE_GROUPS.map(grp => {
                const isSelected = grp.key === selectedGradeGroup
                return (
                  <button
                    key={grp.key}
                    onClick={() => setSelectedGradeGroup(grp.key)}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-gradient-to-b from-[#003B3A] to-[#004D4A] text-white border-[#003B3A] shadow-md ring-2 ring-[#48BFE3]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <span className="font-black text-sm block">{grp.label}</span>
                      <span className={`text-[10px] font-medium leading-tight block mt-1 line-clamp-2 ${
                        isSelected ? "text-teal-200" : "text-slate-500"
                      }`}>
                        {grp.desc}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="mt-2 text-[9px] font-black uppercase bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full inline-block w-fit">
                        Đang chọn
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preset Categories & Items Grid */}
          {loadingPresets ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs font-extrabold">Đang tải danh mục mục tiêu mẫu BGH...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATEGORIES.map(cat => {
                const CategoryIcon = cat.icon
                const catPresets = presets.filter(p => p.category === cat.key)

                return (
                  <div key={cat.key} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* Category Header */}
                      <div className={`p-4 border-b flex items-center justify-between ${cat.color}`}>
                        <div className="flex items-center gap-2.5">
                          <CategoryIcon className="w-5 h-5" />
                          <h3 className="font-black text-sm">{cat.label}</h3>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60">
                            {catPresets.length} gợi ý
                          </span>
                        </div>

                        <button
                          onClick={() => handleOpenCreateModal(cat.key)}
                          className="px-3 py-1.5 rounded-xl bg-white text-slate-800 hover:bg-slate-100 text-xs font-black shadow-xs flex items-center gap-1 border border-slate-300"
                        >
                          <Plus className="w-3.5 h-3.5 text-teal-600" />
                          <span>Thêm mới</span>
                        </button>
                      </div>

                      {/* Presets List */}
                      <div className="p-4 space-y-3">
                        {catPresets.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-2xl">
                            Chưa có mục tiêu mẫu nào trong nhóm này cho {selectedGradeGroup}.
                          </div>
                        ) : (
                          catPresets.map((item, idx) => (
                            <div key={item.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all flex items-start justify-between gap-3 group">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-teal-100 text-[#003B3A] text-[10px] font-black flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <p className="text-xs font-extrabold text-slate-900 leading-snug">
                                    {item.goalText}
                                  </p>
                                </div>
                                {item.actionPreset && (
                                  <p className="text-[11px] text-teal-800 font-medium pl-7 bg-teal-50/60 py-1 px-2 rounded-lg border border-teal-100/60">
                                    ⚡ <strong>Hành động gợi ý:</strong> {item.actionPreset}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1.5 rounded-lg hover:bg-teal-100 text-teal-700 transition-all"
                                  title="Chỉnh sửa"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePreset(item.id)}
                                  className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition-all"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DASHBOARD GIÁM SÁT 360° TOÀN TRƯỜNG */}
      {/* ========================================================================= */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-600" />
                <span>BỘ LỌC PHÂN TÍCH TIẾN ĐỘ CỐ VẤN TOÀN HỆ THỐNG:</span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* Academic Year Filter */}
                <select
                  value={selectedAcademicYearId}
                  onChange={e => {
                    const newYearId = e.target.value
                    setSelectedAcademicYearId(newYearId)
                    loadDashboard(newYearId)
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-black border border-slate-300 outline-none"
                >
                  <option value="">📅 Năm học hiện tại</option>
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>
                      📅 {y.name} {y.status === "ACTIVE" ? "(Hiện tại)" : ""}
                    </option>
                  ))}
                </select>

                {/* Campus Filter */}
                <select
                  value={selectedCampusId}
                  onChange={e => setSelectedCampusId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-black border border-slate-300 outline-none"
                >
                  <option value="">🏫 Tất cả Cơ sở</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.campusName}</option>
                  ))}
                </select>

                {/* Status Color Filter */}
                <select
                  value={selectedStatusColor}
                  onChange={e => setSelectedStatusColor(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-black border border-slate-300 outline-none"
                >
                  <option value="ALL">🚥 Tất cả Trạng thái Cảnh báo</option>
                  <option value="GREEN">🟢 Bình thường & Phát triển</option>
                  <option value="YELLOW">🟡 Cần theo dõi thêm</option>
                  <option value="RED">🔴 Cần hỗ trợ đặc biệt</option>
                </select>

                {/* Search */}
                <div className="relative min-w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo Tên hoặc Mã HS..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadDashboard()}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 outline-none"
                  />
                </div>

                <button
                  onClick={loadDashboard}
                  className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-black hover:bg-[#004D4A] transition-all shadow-xs"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>
          </div>

          {/* Executive Metrics Cards */}
          {dashboardData?.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">TỔNG SỐ HỌC SINH</span>
                <p className="text-2xl font-black text-[#003B3A]">{dashboardData.metrics.totalStudents} HS</p>
                <p className="text-[11px] text-slate-500 font-medium">Toàn hệ thống Sky-Line</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-600">ĐÃ NỘP PHIẾU MỤC TIÊU</span>
                <p className="text-2xl font-black text-emerald-600">
                  {dashboardData.metrics.submittedCount} HS <span className="text-sm font-bold">({dashboardData.metrics.submissionPercent}%)</span>
                </p>
                <p className="text-[11px] text-emerald-700 font-bold">Chưa nộp: {dashboardData.metrics.unsubmittedCount} HS</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-black uppercase text-rose-600">PHÂN LOẠI CẢNH BÁO</span>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-black text-emerald-600">🟢 {dashboardData.metrics.greenCount}</span>
                  <span className="text-xs font-black text-amber-600">🟡 {dashboardData.metrics.yellowCount}</span>
                  <span className="text-xs font-black text-rose-600">🔴 {dashboardData.metrics.redCount}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Theo tiêu chí BGH</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-black uppercase text-purple-600">GVCN ĐÁNH GIÁ & PHHS KÝ</span>
                <p className="text-2xl font-black text-purple-700">
                  {dashboardData.metrics.reviewedByTeacherCount} <span className="text-xs font-normal text-slate-500">Đã nhận xét</span>
                </p>
                <p className="text-[11px] text-purple-800 font-bold">PHHS đã ký: {dashboardData.metrics.parentSignedCount} gia đình</p>
              </div>
            </div>
          )}

          {/* Class & Student Goal Sheets Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="font-black text-sm text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                <span>DANH SÁCH PHIẾU MỤC TIÊU HỌC SINH CHI TIẾT</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {viewMode === "CLASS" ? `${dashboardData?.classes?.length || 0} Lớp` : `${dashboardData?.students?.length || 0} HS`}
                </span>
              </h3>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("CLASS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    viewMode === "CLASS"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Xem theo Lớp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("STUDENT")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    viewMode === "STUDENT"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Xem theo Học sinh</span>
                </button>
              </div>
            </div>

            {loadingDashboard ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                <p className="text-xs font-extrabold">Đang tổng hợp dữ liệu toàn trường...</p>
              </div>
            ) : viewMode === "CLASS" ? (
              /* CLASS VIEW TABLE */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase border-b border-slate-200">
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3">Cơ sở</th>
                      <th className="p-3">Lớp</th>
                      <th className="p-3">GVCN</th>
                      <th className="p-3 text-center">Sỹ số</th>
                      <th className="p-3 text-center">Số phiếu đã nộp</th>
                      <th className="p-3 text-center">Xem chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {(!dashboardData?.classes || dashboardData.classes.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Không tìm thấy lớp học nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      dashboardData.classes.map((cls: any, idx: number) => (
                        <tr key={cls.classId || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-extrabold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <span className="text-slate-800 font-extrabold">{cls.campusName}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-black text-[#003B3A] text-sm">{cls.className}</span>
                            {cls.gradeLevel && (
                              <span className="ml-2 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-black border border-teal-200">
                                {cls.gradeLevel}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 text-slate-800 font-extrabold">
                              <span className="text-sm">👨‍🏫</span>
                              <span>{cls.homeroomTeacherName}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-black text-xs">
                              {cls.totalStudents} HS
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${
                                cls.submissionPercent === 100
                                  ? "bg-emerald-100 text-emerald-800"
                                  : cls.submissionPercent > 0
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                <span>{cls.submittedCount} / {cls.totalStudents} HS</span>
                                <span className="text-[10px] font-bold opacity-80">({cls.submissionPercent}%)</span>
                              </span>
                              <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    cls.submissionPercent === 100 ? "bg-emerald-500" : cls.submissionPercent > 0 ? "bg-amber-500" : "bg-slate-300"
                                  }`}
                                  style={{ width: `${cls.submissionPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedClassDetail(cls)
                                setClassStudentSearch("")
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-black transition-all border border-teal-200 flex items-center gap-1.5 mx-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* STUDENT VIEW TABLE */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase border-b border-slate-200">
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3">Mã HS & Họ Tên</th>
                      <th className="p-3">Lớp & Cơ sở</th>
                      <th className="p-3">Khối</th>
                      <th className="p-3 text-center">Trạng thái Phiếu</th>
                      <th className="p-3 text-center">Mức Cảnh báo</th>
                      <th className="p-3 text-center">GVCN / PHHS</th>
                      <th className="p-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {dashboardData?.students?.map((st: any, idx: number) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-extrabold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900">{st.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{st.studentCode}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-slate-800 font-extrabold">{st.className}</p>
                          <p className="text-[10px] text-teal-700 font-medium">{st.campusName}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black">
                            {st.gradeLevel}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {st.hasSubmitted ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                              🟢 Đã nộp ({st.goalCount} mục tiêu)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold inline-flex items-center gap-1">
                              ⚪ Chưa điền
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {st.statusColor === "RED" && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                              🔴 Cần hỗ trợ đặc biệt
                            </span>
                          )}
                          {st.statusColor === "YELLOW" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                              🟡 Cần theo dõi thêm
                            </span>
                          )}
                          {st.statusColor === "GREEN" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              🟢 Bình thường
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center space-y-0.5">
                          <p className={`text-[10px] font-black ${st.hasTeacherNotes ? "text-emerald-700" : "text-slate-400"}`}>
                            {st.hasTeacherNotes ? "✓ GVCN đã nhận xét" : "• Chưa có nhận xét"}
                          </p>
                          <p className={`text-[10px] font-black ${st.parentSigned ? "text-purple-700" : "text-slate-400"}`}>
                            {st.parentSigned ? "✍️ Gia đình đã ký" : "• Gia đình chưa ký"}
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedStudentDetail(st)}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-black transition-all border border-teal-200"
                          >
                            👁️ Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DANH SÁCH HỌC SINH CHI TIẾT THEO LỚP (BGH) */}
      {/* ========================================================================= */}
      {selectedClassDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#003B3A] to-teal-800 text-white flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase tracking-wide">
                    CHI TIẾT LỚP {selectedClassDetail.className}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                    {selectedClassDetail.campusName}
                  </span>
                </div>
                <p className="text-xs text-teal-100 font-medium flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>👨‍🏫 GVCN: <strong>{selectedClassDetail.homeroomTeacherName}</strong></span>
                  <span>👥 Sỹ số: <strong>{selectedClassDetail.totalStudents} HS</strong></span>
                  <span>📝 Đã nộp phiếu: <strong>{selectedClassDetail.submittedCount} / {selectedClassDetail.totalStudents} ({selectedClassDetail.submissionPercent}%)</strong></span>
                </p>
              </div>

              <button
                onClick={() => setSelectedClassDetail(null)}
                className="p-2 rounded-full hover:bg-white/20 text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Search & Summary in modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative min-w-64 flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm kiếm học sinh trong lớp theo tên hoặc mã HS..."
                  value={classStudentSearch}
                  onChange={e => setClassStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white text-slate-800 text-xs font-bold border border-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                  🟢 Bình thường: {selectedClassDetail.greenCount || 0}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800">
                  🟡 Cần theo dõi: {selectedClassDetail.yellowCount || 0}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800">
                  🔴 Cần hỗ trợ: {selectedClassDetail.redCount || 0}
                </span>
              </div>
            </div>

            {/* Student list table inside modal */}
            <div className="p-5 overflow-y-auto flex-1">
              {(() => {
                const searchLow = classStudentSearch.trim().toLowerCase()
                const filtered = (selectedClassDetail.students || []).filter((st: any) =>
                  !searchLow ||
                  st.studentName.toLowerCase().includes(searchLow) ||
                  st.studentCode.toLowerCase().includes(searchLow)
                )

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">
                      Không tìm thấy học sinh nào phù hợp trong lớp {selectedClassDetail.className}.
                    </div>
                  )
                }

                return (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase border-b border-slate-200">
                        <th className="p-2.5 text-center w-10">STT</th>
                        <th className="p-2.5">Mã HS & Họ Tên</th>
                        <th className="p-2.5 text-center">Trạng thái Phiếu</th>
                        <th className="p-2.5 text-center">Mức Cảnh Báo</th>
                        <th className="p-2.5 text-center">GVCN / PHHS</th>
                        <th className="p-2.5 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold">
                      {filtered.map((st: any, idx: number) => (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-center text-slate-400 font-extrabold">
                            {idx + 1}
                          </td>
                          <td className="p-2.5">
                            <p className="font-extrabold text-slate-900">{st.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{st.studentCode}</p>
                          </td>
                          <td className="p-2.5 text-center">
                            {st.hasSubmitted ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                🟢 Đã nộp ({st.goalCount} mục tiêu)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                ⚪ Chưa điền
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {st.statusColor === "RED" && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                🔴 Cần hỗ trợ
                              </span>
                            )}
                            {st.statusColor === "YELLOW" && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                                🟡 Cần theo dõi
                              </span>
                            )}
                            {st.statusColor === "GREEN" && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                🟢 Bình thường
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center space-y-0.5">
                            <p className={`text-[10px] font-black ${st.hasTeacherNotes ? "text-emerald-700" : "text-slate-400"}`}>
                              {st.hasTeacherNotes ? "✓ Đã nhận xét" : "• Chưa nhận xét"}
                            </p>
                            <p className={`text-[10px] font-black ${st.parentSigned ? "text-purple-700" : "text-slate-400"}`}>
                              {st.parentSigned ? "✍️ Đã ký" : "• Chưa ký"}
                            </p>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => setSelectedStudentDetail(st)}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-black transition-all border border-teal-200"
                            >
                              👁️ Xem phiếu
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedClassDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black transition-all"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM / SỬA MỤC TIÊU MẪU (BGH) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-base font-black text-[#003B3A] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <span>{editingPreset ? "Chỉnh Sửa Mục Tiêu Mẫu" : "Thêm Mục Tiêu Mẫu Mới (BGH)"}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="space-y-4 text-xs font-bold">
              {/* Dynamic Design Banner Notice */}
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
                <p className="font-black flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-teal-800">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>CẤU HÌNH MỤC TIÊU MẪU LINH ĐỘNG (MULTI-SELECT)</span>
                </p>
                <p className="text-[11px] text-teal-800 font-medium leading-relaxed">
                  Mục tiêu mẫu tạo tại đây cho phép Học sinh <strong>chọn 1 hoặc nhiều mục tiêu</strong> trong cùng một nhóm. Phần <strong>Hành động gợi ý cho học sinh</strong> sẽ tự động ghép và hiện tương ứng khi học sinh tick chọn.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Khối học áp dụng:</label>
                  <select
                    value={presetForm.gradeGroup}
                    onChange={e => setPresetForm(p => ({ ...p, gradeGroup: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 font-extrabold outline-none"
                  >
                    {GRADE_GROUPS.map(g => (
                      <option key={g.key} value={g.key}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Nhóm mục tiêu:</label>
                  <select
                    value={presetForm.category}
                    onChange={e => setPresetForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 font-extrabold outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Rows: Multi Goal Content & Action Pairs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 font-black text-xs uppercase tracking-wider">
                    DANH SÁCH MỤC TIÊU CÓ THỂ CHỌN & HÀNH ĐỘNG GỢI Ý TƯƠNG ỨNG:
                  </label>
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {presetRows.length} mục tiêu mẫu
                  </span>
                </div>

                {presetRows.map((row, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-teal-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>Mục tiêu mẫu #{idx + 1}</span>
                      </span>

                      {presetRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPresetRows(rows => rows.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-rose-50 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa dòng này</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-700 font-extrabold mb-1">
                        Nội dung mục tiêu gợi ý mẫu: <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Nhập nội dung mục tiêu chuẩn để học sinh tham khảo chọn..."
                        value={row.goalText}
                        onChange={e => {
                          const val = e.target.value
                          setPresetRows(rows => rows.map((r, i) => i === idx ? { ...r, goalText: val } : r))
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium outline-none text-xs focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-teal-900 font-extrabold mb-1">
                        Hành động gợi ý tương ứng cho học sinh:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Gợi ý các bước hành động cụ thể khi học sinh chọn mục tiêu này..."
                        value={row.actionPreset}
                        onChange={e => {
                          const val = e.target.value
                          setPresetRows(rows => rows.map((r, i) => i === idx ? { ...r, actionPreset: val } : r))
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium outline-none text-xs focus:border-amber-500"
                      />
                    </div>
                  </div>
                ))}

                {!editingPreset && (
                  <button
                    type="button"
                    onClick={() => setPresetRows(rows => [...rows, { goalText: "", actionPreset: "" }])}
                    className="w-full py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-black border border-dashed border-teal-300 flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4 text-teal-600" />
                    <span>Thêm 1 dòng mục tiêu chọn & hành động gợi ý mới</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Thứ tự sắp xếp:</label>
                  <input
                    type="number"
                    value={presetForm.sortOrder}
                    onChange={e => setPresetForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Trạng thái:</label>
                  <select
                    value={presetForm.status}
                    onChange={e => setPresetForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 font-bold outline-none"
                  >
                    <option value="ACTIVE">🟢 Đang hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">⚪ Tạm ẩn (INACTIVE)</option>
                  </select>
                </div>
              </div>

              
              {/* Live Preview Box */}
              {presetRows.some(r => r.goalText) && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider flex items-center justify-between">
                    <span>👁️ XEM TRƯỚC HỌC SINH CHỌN MỤC TIÊU (LIVE PREVIEW)</span>
                    <span className="text-teal-700 font-bold">Tự động hiện hành động gợi ý</span>
                  </span>
                  <div className="space-y-2">
                    {presetRows.filter(r => r.goalText).map((r, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white border border-teal-200 space-y-1 shadow-xs">
                        <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-md bg-teal-600 text-white flex items-center justify-center text-[10px]">✓</span>
                          <span>{r.goalText}</span>
                        </p>
                        {r.actionPreset && (
                          <p className="text-[11px] text-teal-800 font-semibold bg-teal-50 p-1.5 rounded-lg border border-teal-100 pl-6">
                            ⚡ <strong>Hành động gợi ý:</strong> {r.actionPreset}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black hover:bg-slate-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingPreset}
                  className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white font-black hover:bg-[#004D4A] flex items-center gap-2"
                >
                  {savingPreset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingPreset ? "Cập nhật" : "Thêm mới"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DRAWER: XEM CHI TIẾT PHIẾU MỤC TIÊU HỌC SINH */}
      {/* ========================================================================= */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-[#003B3A]">
                  Chi Tiết Phiếu Mục Tiêu 360°: {selectedStudentDetail.studentName}
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  Mã HS: {selectedStudentDetail.studentCode} • Lớp: {selectedStudentDetail.className} • {selectedStudentDetail.campusName}
                </p>
              </div>
              <button onClick={() => setSelectedStudentDetail(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Goals details */}
            <div className="space-y-4">
              {selectedStudentDetail.goals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                  Học sinh chưa điền nội dung mục tiêu.
                </div>
              ) : (
                selectedStudentDetail.goals.map((g: any, idx: number) => (
                  <div key={g.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[10px] font-black">
                        {g.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Mức đạt: {g.achievementLevel}</span>
                    </div>

                    <p className="text-xs font-extrabold text-slate-900">📌 Mục tiêu: {g.targetText}</p>

                    {g.actions?.length > 0 && (
                      <p className="text-xs text-teal-800 font-medium bg-teal-50 p-2 rounded-xl border border-teal-100">
                        ⚡ <strong>Hành động:</strong> {g.actions[0]?.actionText}
                      </p>
                    )}

                    {g.teacherSupportRequest && (
                      <p className="text-[11px] text-slate-600 font-medium">
                        💬 <strong>Mong muốn Thầy Cô hỗ trợ:</strong> {g.teacherSupportRequest}
                      </p>
                    )}
                  </div>
                ))
              )}

              {/* Commitment & Parent info */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs font-bold text-amber-900">
                <p>💬 <strong>Lời cam kết của học sinh:</strong> {selectedStudentDetail.studentCommitment || "Chưa nhập"}</p>
                <p>✍️ <strong>Gia đình xác nhận chữ ký:</strong> {selectedStudentDetail.parentSigned ? "🟢 ĐÃ KÝ CAM KẾT ĐỒNG HÀNH" : "⚪ CHƯA KÝ"}</p>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-black hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
