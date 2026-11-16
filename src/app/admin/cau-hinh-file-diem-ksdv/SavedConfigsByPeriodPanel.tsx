"use client"

import React, { useState, useMemo } from "react"
import {
  BookOpen,
  Calendar,
  Layers,
  Table,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  Download,
  Edit2,
  Trash2,
  CheckSquare,
  Info
} from "lucide-react"
import {
  NormalizedSystemOption,
  isSameSystem,
  resolvePeriodInfo,
  resolveSystemInfo,
  sortGradesNaturally
} from "./presets"

interface SavedConfigsByPeriodPanelProps {
  savedConfigs: any[]
  loadingConfigs: boolean
  subjects: any[]
  grades: string[]
  periods: any[]
  normalizedSystems: NormalizedSystemOption[]

  selectedPeriodId: string
  selectedSystemCode: string
  selectedGrade: string
  targetGrades: string[]
  selectedSubjectId: string

  listFilterSubjectId: string
  onChangeFilterSubjectId: (id: string) => void
  listFilterPeriod: string
  onChangeFilterPeriod: (periodId: string) => void
  listFilterSystemCode: string
  onChangeFilterSystemCode: (sysCode: string) => void
  listFilterGrade: string
  onChangeFilterGrade: (grade: string) => void

  onRefresh: () => void
  onLoadConfig: (cfg: any) => void
  onLoadGroupGrades: (firstCfg: any, groupGrades: string[]) => void
  onExportExcel: (cfg: any) => void
  onDeleteConfig: (id: string, label: string) => void
}

export function SavedConfigsByPeriodPanel({
  savedConfigs,
  loadingConfigs,
  subjects,
  grades,
  periods,
  normalizedSystems,
  selectedPeriodId,
  selectedSystemCode,
  selectedGrade,
  targetGrades,
  selectedSubjectId,
  listFilterSubjectId,
  onChangeFilterSubjectId,
  listFilterPeriod,
  onChangeFilterPeriod,
  listFilterSystemCode,
  onChangeFilterSystemCode,
  listFilterGrade,
  onChangeFilterGrade,
  onRefresh,
  onLoadConfig,
  onLoadGroupGrades,
  onExportExcel,
  onDeleteConfig
}: SavedConfigsByPeriodPanelProps) {
  const [viewMode, setViewMode] = useState<"BY_PERIOD" | "BY_SUBJECT" | "LEDGER_TABLE">("BY_PERIOD")
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({})
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({})

  const currentSubject = subjects.find(s => s.id === selectedSubjectId)

  // Danh sách các tab Mốc thời gian / Kỳ KS có trong hệ thống + dữ liệu đã lưu
  const periodTabs = useMemo(() => {
    const baseIds = ["DAU_NAM", "HK1", "HK2", "ALL"]
    const extraIds = Array.from(
      new Set(
        savedConfigs
          .map(c => (c.periodId || "ALL").trim() || "ALL")
          .filter(id => !baseIds.includes(id))
      )
    )
    const allIds = ["DAU_NAM", "HK1", "HK2", ...extraIds, "ALL"]

    return allIds.map(pId => {
      const info = resolvePeriodInfo(pId, periods)
      const count = savedConfigs.filter(c => {
        const subOk = listFilterSubjectId === "ALL" || c.subjectId === listFilterSubjectId
        return subOk && ((c.periodId || "ALL").trim() || "ALL") === pId
      }).length
      return {
        id: pId,
        shortLabel: info.shortLabel,
        fullLabel: info.fullLabel,
        count
      }
    })
  }, [savedConfigs, periods, listFilterSubjectId])

  // Lọc danh sách cấu hình đã lưu
  const filteredConfigs = useMemo(() => {
    return savedConfigs.filter(c => {
      if (listFilterSubjectId !== "ALL" && c.subjectId !== listFilterSubjectId) return false
      if (listFilterPeriod !== "ALL_TABS") {
        const cP = (c.periodId || "ALL").trim() || "ALL"
        if (cP !== listFilterPeriod) return false
      }
      if (listFilterSystemCode !== "ALL_SYSTEMS") {
        if (!isSameSystem(c.educationSystemId, listFilterSystemCode, normalizedSystems)) return false
      }
      if (listFilterGrade !== "ALL" && c.grade !== listFilterGrade && c.grade !== "ALL") return false

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase().trim()
        const sName = (c.subject?.name || "").toLowerCase()
        const sCode = (c.subject?.code || "").toLowerCase()
        const sysInfo = resolveSystemInfo(c.educationSystemId, normalizedSystems, c.educationSystemName)
        const pInfo = resolvePeriodInfo(c.periodId, periods)
        const gradeStr = (c.grade || "").toLowerCase()
        const formulaStr = (c.formula || "").toLowerCase()
        if (
          !sName.includes(kw) &&
          !sCode.includes(kw) &&
          !sysInfo.fullLabel.toLowerCase().includes(kw) &&
          !pInfo.fullLabel.toLowerCase().includes(kw) &&
          !gradeStr.includes(kw) &&
          !formulaStr.includes(kw)
        ) {
          return false
        }
      }
      return true
    })
  }, [
    savedConfigs,
    listFilterSubjectId,
    listFilterPeriod,
    listFilterSystemCode,
    listFilterGrade,
    searchTerm,
    normalizedSystems,
    periods
  ])

  // Nhóm cấu hình theo Mốc thời gian / Kỳ KS -> bên trong nhóm theo (Môn + Hệ học)
  const groupedByPeriod = useMemo(() => {
    const periodMap = new Map<
      string,
      {
        periodId: string
        info: ReturnType<typeof resolvePeriodInfo>
        configs: any[]
        subSystemGroups: Array<{
          key: string
          subject: any
          systemInfo: ReturnType<typeof resolveSystemInfo>
          configs: any[]
        }>
      }
    >()

    filteredConfigs.forEach(cfg => {
      const pId = (cfg.periodId || "ALL").trim() || "ALL"
      if (!periodMap.has(pId)) {
        periodMap.set(pId, {
          periodId: pId,
          info: resolvePeriodInfo(pId, periods),
          configs: [],
          subSystemGroups: []
        })
      }
      periodMap.get(pId)!.configs.push(cfg)
    })

    // Trong mỗi mốc thời gian, nhóm tiếp theo Môn học + Hệ học và sắp xếp Khối lớp tăng dần
    periodMap.forEach(pGroup => {
      const subSysMap = new Map<
        string,
        {
          key: string
          subject: any
          systemInfo: ReturnType<typeof resolveSystemInfo>
          configs: any[]
        }
      >()

      pGroup.configs.forEach(cfg => {
        const sub =
          cfg.subject ||
          subjects.find(s => s.id === cfg.subjectId) || {
            id: cfg.subjectId,
            name: "Môn khảo sát",
            code: "KSDV"
          }
        const sysInfo = resolveSystemInfo(cfg.educationSystemId, normalizedSystems, cfg.educationSystemName)
        const key = `${sub.id}__${sysInfo.code.toUpperCase()}`
        if (!subSysMap.has(key)) {
          subSysMap.set(key, {
            key,
            subject: sub,
            systemInfo: sysInfo,
            configs: []
          })
        }
        subSysMap.get(key)!.configs.push(cfg)
      })

      subSysMap.forEach(sg => {
        sg.configs.sort((a, b) => {
          const na = parseInt((a.grade || "").replace(/\D/g, ""), 10) || 0
          const nb = parseInt((b.grade || "").replace(/\D/g, ""), 10) || 0
          return na - nb
        })
      })

      pGroup.subSystemGroups = Array.from(subSysMap.values()).sort((a, b) => {
        // Ưu tiên môn đang chọn trên form lên đầu
        const aSelected = a.subject?.id === selectedSubjectId ? 0 : 1
        const bSelected = b.subject?.id === selectedSubjectId ? 0 : 1
        if (aSelected !== bSelected) return aSelected - bSelected
        // Ưu tiên hệ cụ thể (HNG...) trước hệ ALL
        if (a.systemInfo.isAll !== b.systemInfo.isAll) return a.systemInfo.isAll ? 1 : -1
        return (a.subject?.name || "").localeCompare(b.subject?.name || "", "vi")
      })
    })

    return Array.from(periodMap.values()).sort((a, b) => {
      // Đưa mốc thời gian đang chọn lên đầu nếu không phải ALL
      if (selectedPeriodId !== "ALL") {
        if (a.periodId === selectedPeriodId && b.periodId !== selectedPeriodId) return -1
        if (b.periodId === selectedPeriodId && a.periodId !== selectedPeriodId) return 1
      }
      return a.info.sortRank - b.info.sortRank
    })
  }, [filteredConfigs, periods, subjects, normalizedSystems, selectedSubjectId, selectedPeriodId])

  // Nhóm cấu hình theo Môn học (chế độ xem phụ)
  const groupedBySubject = useMemo(() => {
    const map = new Map<string, { subject: any; configs: any[] }>()
    filteredConfigs.forEach(cfg => {
      const sub =
        cfg.subject ||
        subjects.find(s => s.id === cfg.subjectId) || {
          id: cfg.subjectId,
          name: "Môn khảo sát",
          code: "KSDV"
        }
      if (!map.has(sub.id)) {
        map.set(sub.id, { subject: sub, configs: [] })
      }
      map.get(sub.id)!.configs.push(cfg)
    })

    map.forEach(group => {
      group.configs.sort((a, b) => {
        const pa = resolvePeriodInfo(a.periodId, periods).sortRank
        const pb = resolvePeriodInfo(b.periodId, periods).sortRank
        if (pa !== pb) return pa - pb
        const na = parseInt((a.grade || "").replace(/\D/g, ""), 10) || 0
        const nb = parseInt((b.grade || "").replace(/\D/g, ""), 10) || 0
        return na - nb
      })
    })

    return Array.from(map.values()).sort((a, b) =>
      (a.subject?.name || "").localeCompare(b.subject?.name || "", "vi")
    )
  }, [filteredConfigs, subjects, periods])

  // Kiểm tra tổ hợp đang chọn trên bảng điều phối bên trái đã có mẫu riêng chưa
  const exactActiveScopeCount = useMemo(() => {
    if (!selectedSubjectId) return 0
    return savedConfigs.filter(
      c =>
        c.subjectId === selectedSubjectId &&
        (c.periodId || "ALL") === selectedPeriodId &&
        isSameSystem(c.educationSystemId, selectedSystemCode, normalizedSystems)
    ).length
  }, [savedConfigs, selectedSubjectId, selectedPeriodId, selectedSystemCode, normalizedSystems])

  const activePeriodLabel = resolvePeriodInfo(selectedPeriodId, periods).shortLabel
  const activeSystemLabel = resolveSystemInfo(selectedSystemCode, normalizedSystems).fullLabel

  const hasActiveFilters =
    listFilterSubjectId !== "ALL" ||
    listFilterPeriod !== "ALL_TABS" ||
    listFilterSystemCode !== "ALL_SYSTEMS" ||
    listFilterGrade !== "ALL" ||
    Boolean(searchTerm.trim())

  const getPeriodBadgeStyle = (pId: string) => {
    if (pId === "DAU_NAM") return "bg-[#F0FDFA] text-[#00736E] border-teal-200"
    if (pId === "HK1") return "bg-amber-50 text-[#D97706] border-amber-200"
    if (pId === "HK2") return "bg-emerald-50 text-[#059669] border-emerald-200"
    if (pId === "ALL") return "bg-slate-100 text-slate-600 border-slate-200"
    return "bg-teal-50 text-[#003B3A] border-teal-200"
  }

  return (
    <div className="lg:col-span-5 bg-white rounded-2xl p-4 md:p-5 border border-[#E2E8F0] shadow-xs space-y-3.5 tabular-nums">
      {/* HEADER & VIEW MODE SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#003B3A] text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">Cấu hình mẫu đã lưu</h3>
            <span className="text-[11px] font-semibold text-[#00736E]">
              Hiển thị {filteredConfigs.length} / {savedConfigs.length} mẫu cấu hình
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center p-0.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setViewMode("BY_PERIOD")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                viewMode === "BY_PERIOD"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Theo Kỳ KS</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("BY_SUBJECT")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                viewMode === "BY_SUBJECT"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Theo môn</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LEDGER_TABLE")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                viewMode === "LEDGER_TABLE"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Bảng sổ cái</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loadingConfigs}
            title="Tải lại danh sách cấu hình"
            className="p-1.5 text-slate-400 hover:text-[#00736E] hover:bg-[#F0FDFA] rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingConfigs ? "animate-spin text-[#00A19A]" : ""}`} />
          </button>
        </div>
      </div>

      {/* PRIMARY TABS: LỌC NHANH THEO MỐC THỜI GIAN / KỲ KS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-600">Mốc thời gian / Kỳ khảo sát:</span>
          {selectedPeriodId !== "ALL" && listFilterPeriod !== selectedPeriodId && (
            <button
              type="button"
              onClick={() => onChangeFilterPeriod(selectedPeriodId)}
              className="text-[#00736E] hover:underline font-semibold"
            >
              Chỉ xem kỳ đang gán ({activePeriodLabel})
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => onChangeFilterPeriod("ALL_TABS")}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 border transition-all inline-flex items-center gap-1.5 ${
              listFilterPeriod === "ALL_TABS"
                ? "bg-[#003B3A] text-white border-[#003B3A]"
                : "bg-[#F8FAFC] hover:bg-white text-slate-700 border-[#E2E8F0]"
            }`}
          >
            <span>Tất cả kỳ</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                listFilterPeriod === "ALL_TABS" ? "bg-white/20 text-white" : "bg-white text-slate-500"
              }`}
            >
              {
                savedConfigs.filter(
                  c => listFilterSubjectId === "ALL" || c.subjectId === listFilterSubjectId
                ).length
              }
            </span>
          </button>

          {periodTabs.map(tab => {
            const isTabActive = listFilterPeriod === tab.id
            const isBeingConfigured = selectedPeriodId === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeFilterPeriod(isTabActive ? "ALL_TABS" : tab.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 border transition-all inline-flex items-center gap-1.5 ${
                  isTabActive
                    ? "bg-[#00A19A] text-white border-[#00A19A] shadow-2xs"
                    : isBeingConfigured
                      ? "bg-[#F0FDFA] text-[#003B3A] border-[#00A19A]/60"
                      : "bg-[#F8FAFC] hover:bg-white text-slate-700 border-[#E2E8F0]"
                }`}
              >
                <span>{tab.shortLabel}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isTabActive
                      ? "bg-white/25 text-white"
                      : tab.count > 0
                        ? "bg-white text-[#00736E] border border-teal-200/70"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* SUBJECT QUICK FILTER PILLS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => onChangeFilterSubjectId("ALL")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 border transition-all ${
            listFilterSubjectId === "ALL"
              ? "bg-[#F0FDFA] text-[#00736E] border-[#00A19A]"
              : "bg-white hover:bg-[#F8FAFC] text-slate-600 border-[#E2E8F0]"
          }`}
        >
          Tất cả môn ({savedConfigs.length})
        </button>
        {subjects.map(s => {
          const cnt = savedConfigs.filter(c => c.subjectId === s.id).length
          const isSelected = listFilterSubjectId === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChangeFilterSubjectId(isSelected ? "ALL" : s.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 border transition-all inline-flex items-center gap-1 ${
                isSelected
                  ? "bg-[#F0FDFA] text-[#003B3A] border-[#00A19A] font-bold"
                  : "bg-white hover:bg-[#F8FAFC] text-slate-600 border-[#E2E8F0]"
              }`}
            >
              <span>{s.code}</span>
              <span className="text-[10px] text-slate-400">({cnt})</span>
            </button>
          )
        })}
      </div>

      {/* SEARCH & SECONDARY FILTERS (HỆ HỌC HNG & KHỐI LỚP) */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
          <div className="sm:col-span-6 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm môn, hệ HNG, khối, công thức..."
              className="w-full h-8 pl-8 pr-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-slate-800 outline-none focus:border-[#00A19A] focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={listFilterSystemCode}
            onChange={e => onChangeFilterSystemCode(e.target.value)}
            className="sm:col-span-3 h-8 px-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-slate-700 outline-none focus:border-[#00A19A] truncate"
          >
            <option value="ALL_SYSTEMS">Mọi hệ học</option>
            <option value="ALL">Mẫu chung hệ</option>
            {normalizedSystems.map(sys => (
              <option key={sys.code} value={sys.code}>
                {sys.code} — {sys.name}
              </option>
            ))}
          </select>

          <select
            value={listFilterGrade}
            onChange={e => onChangeFilterGrade(e.target.value)}
            className="sm:col-span-3 h-8 px-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-slate-700 outline-none focus:border-[#00A19A] truncate"
          >
            <option value="ALL">Mọi khối lớp</option>
            {grades.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between px-0.5 text-[11px]">
            <span className="text-slate-500">
              Kết quả lọc: <strong className="text-[#003B3A]">{filteredConfigs.length}</strong> mẫu
            </span>
            <button
              type="button"
              onClick={() => {
                onChangeFilterSubjectId("ALL")
                onChangeFilterPeriod("ALL_TABS")
                onChangeFilterSystemCode("ALL_SYSTEMS")
                onChangeFilterGrade("ALL")
                setSearchTerm("")
              }}
              className="text-[#E11D48] hover:underline font-semibold inline-flex items-center gap-0.5"
            >
              <X className="w-3 h-3" />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* CALLOUT TRẠNG THÁI CHO TỔ HỢP ĐANG THIẾT LẬP (GIÚP HIỂU RÕ KHI CHỌN ĐẦU NĂM + HNG MÀ CHƯA LƯU MẪU RIÊNG) */}
      {currentSubject && (selectedPeriodId !== "ALL" || selectedSystemCode !== "ALL") && exactActiveScopeCount === 0 && (
        <div className="p-3 rounded-xl bg-[#F0FDFA] border border-[#00A19A]/40 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-[#008B85] shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-slate-700 leading-relaxed">
            <div className="font-bold text-[#003B3A]">
              Chưa có mẫu riêng cho {activePeriodLabel} • {activeSystemLabel}
            </div>
            <p className="text-[11px] text-slate-600">
              Môn <strong>{currentSubject.code}</strong> hiện đang kế thừa từ <strong>Mẫu chung</strong>. Bấm{" "}
              <strong>Lưu cấu hình</strong> để tạo mẫu riêng cho mốc <strong>{activePeriodLabel}</strong> (
              {targetGrades.length > 1 ? `${targetGrades.length} khối` : selectedGrade}).
            </p>
          </div>
        </div>
      )}

      {/* MAIN SAVED CONFIGS CONTENT */}
      <div className="max-h-[660px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {loadingConfigs ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00A19A]" />
            Đang tải cấu hình mẫu đã lưu...
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="py-8 px-4 text-center border border-dashed border-[#E2E8F0] bg-[#F8FAFC] rounded-2xl space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] text-[#00736E] flex items-center justify-center mx-auto">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#003B3A]">
                Chưa có mẫu đã lưu khớp với bộ lọc hiện tại
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[290px] mx-auto leading-relaxed">
                Thiết lập cột điểm ở bảng bên trái và bấm <strong>Lưu cấu hình</strong> để ghi nhận mẫu cho mốc thời gian và khối lớp đang chọn.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  onChangeFilterSubjectId("ALL")
                  onChangeFilterPeriod("ALL_TABS")
                  onChangeFilterSystemCode("ALL_SYSTEMS")
                  onChangeFilterGrade("ALL")
                  setSearchTerm("")
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#00A19A] text-[#003B3A] rounded-xl text-[11px] font-semibold transition-colors"
              >
                <span>Xem toàn bộ {savedConfigs.length} mẫu đã lưu</span>
              </button>
            )}
          </div>
        ) : viewMode === "BY_PERIOD" ? (
          /* CHẾ ĐỘ 1 (MẶC ĐỊNH): HIỂN THỊ THEO MỐC THỜI GIAN / KỲ KHẢO SÁT */
          <div className="space-y-3">
            {groupedByPeriod.map(pGroup => {
              const isExpanded =
                expandedPeriods[pGroup.periodId] !== undefined
                  ? expandedPeriods[pGroup.periodId]
                  : true
              const isPeriodBeingEdited = selectedPeriodId === pGroup.periodId

              return (
                <div
                  key={pGroup.periodId}
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    isPeriodBeingEdited
                      ? "border-[#00A19A] shadow-xs"
                      : "border-[#E2E8F0] bg-white"
                  }`}
                >
                  {/* HEADER CỦA MỐC THỜI GIAN / KỲ KHẢO SÁT */}
                  <div
                    onClick={() =>
                      setExpandedPeriods(prev => ({
                        ...prev,
                        [pGroup.periodId]: !isExpanded
                      }))
                    }
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none ${
                      isPeriodBeingEdited
                        ? "bg-[#003B3A] text-white"
                        : "bg-[#F8FAFC] hover:bg-slate-100/80 text-[#003B3A] border-b border-[#E2E8F0]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar
                        className={`w-4 h-4 shrink-0 ${
                          isPeriodBeingEdited ? "text-[#5EEAD4]" : "text-[#008B85]"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate">
                            {pGroup.info.fullLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPeriodBeingEdited
                            ? "bg-[#00A19A] text-white"
                            : "bg-white text-[#00736E] border border-[#E2E8F0]"
                        }`}
                      >
                        {pGroup.configs.length} mẫu
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        } ${isPeriodBeingEdited ? "text-teal-200" : "text-slate-400"}`}
                      />
                    </div>
                  </div>

                  {/* NỘI DUNG CÁC NHÓM MÔN + HỆ HỌC BÊN TRONG KỲ KHẢO SÁT */}
                  {isExpanded && (
                    <div className="p-2.5 space-y-2.5 bg-white">
                      {pGroup.subSystemGroups.map(sg => {
                        const groupGradeList = sortGradesNaturally(
                          Array.from(new Set(sg.configs.map(c => c.grade).filter(Boolean)))
                        )

                        return (
                          <div
                            key={sg.key}
                            className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white"
                          >
                            {/* Sub-header: Môn khảo sát + Hệ học (HNG / Mẫu chung) + Nút nạp cả nhóm khối */}
                            <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <span className="px-1.5 py-0.5 rounded bg-[#003B3A] text-white text-[10px] font-bold">
                                  {sg.subject?.code || "KSDV"}
                                </span>
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {sg.subject?.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                    sg.systemInfo.isAll
                                      ? "bg-white text-slate-600 border-slate-200"
                                      : "bg-[#F0FDFA] text-[#00736E] border-teal-200"
                                  }`}
                                >
                                  {sg.systemInfo.isAll ? "Hệ chung" : sg.systemInfo.fullLabel}
                                </span>
                              </div>

                              {groupGradeList.length > 1 && sg.configs[0] && (
                                <button
                                  type="button"
                                  onClick={() => onLoadGroupGrades(sg.configs[0], groupGradeList)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white hover:bg-[#F0FDFA] text-[#00736E] border border-[#E2E8F0] hover:border-[#00A19A] text-[10px] font-semibold transition-colors"
                                  title="Nạp cấu hình này và chọn đồng loạt các khối trong nhóm để chỉnh sửa cùng lúc"
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  <span>Chọn cả {groupGradeList.length} khối</span>
                                </button>
                              )}
                            </div>

                            {/* Danh sách từng khối trong nhóm Môn + Hệ + Kỳ */}
                            <div className="divide-y divide-[#F1F5F9]">
                              {sg.configs.map(cfg => {
                                const isActiveRow =
                                  cfg.subjectId === selectedSubjectId &&
                                  (cfg.periodId || "ALL") === selectedPeriodId &&
                                  isSameSystem(cfg.educationSystemId, selectedSystemCode, normalizedSystems) &&
                                  (targetGrades.includes(cfg.grade) || cfg.grade === selectedGrade)

                                let colNamesList: string[] = []
                                try {
                                  colNamesList = JSON.parse(cfg.columnNames || "[]")
                                } catch (_) {}

                                return (
                                  <div
                                    key={cfg.id}
                                    onClick={() => onLoadConfig(cfg)}
                                    className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                      isActiveRow
                                        ? "bg-[#F0FDFA]/80 hover:bg-[#F0FDFA]"
                                        : "hover:bg-[#F8FAFC]"
                                    }`}
                                    title={`Các cột: ${colNamesList.join(" • ")}\nBấm để nạp lên biểu mẫu chỉnh sửa`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
                                          isActiveRow
                                            ? "bg-[#003B3A] text-white"
                                            : "bg-slate-100 text-slate-800"
                                        }`}
                                      >
                                        {cfg.grade || "Toàn khối"}
                                      </span>

                                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                                        <span className="font-semibold text-slate-700">
                                          {cfg.columnCount} cột
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="font-semibold text-[#00736E]">
                                          {cfg.formula || "AVERAGE"}
                                        </span>
                                        {cfg.passScore != null && (
                                          <>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-[#059669] font-semibold">
                                              Đạt ≥ {cfg.passScore}đ
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div
                                      className="flex items-center gap-0.5 shrink-0"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => onExportExcel(cfg)}
                                        title="Tải file Excel mẫu"
                                        className="p-1.5 text-slate-400 hover:text-[#059669] hover:bg-emerald-50 rounded-lg transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onLoadConfig(cfg)}
                                        title="Nạp cấu hình lên biểu mẫu"
                                        className="p-1.5 text-slate-400 hover:text-[#00736E] hover:bg-[#F0FDFA] rounded-lg transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onDeleteConfig(
                                            cfg.id,
                                            `${sg.subject?.name || ""} - ${cfg.grade} (${pGroup.info.shortLabel})`
                                          )
                                        }
                                        title="Xóa cấu hình này"
                                        className="p-1.5 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : viewMode === "BY_SUBJECT" ? (
          /* CHẾ ĐỘ 2: NHÓM THEO MÔN HỌC (HIỂN THỊ KÈM HUY HIỆU KỲ KS & HỆ HNG) */
          <div className="space-y-2.5">
            {groupedBySubject.map(group => {
              const subId = group.subject?.id || "UNKNOWN"
              const isExpanded = expandedSubjects[subId] !== undefined ? expandedSubjects[subId] : true

              return (
                <div
                  key={subId}
                  className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white"
                >
                  <div
                    onClick={() =>
                      setExpandedSubjects(prev => ({ ...prev, [subId]: !isExpanded }))
                    }
                    className="px-3.5 py-2.5 bg-[#F8FAFC] hover:bg-slate-100/70 flex items-center justify-between gap-2 cursor-pointer select-none border-b border-[#F1F5F9]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-[#003B3A] text-white text-[10px] font-bold">
                        {group.subject?.code}
                      </span>
                      <span className="text-xs font-bold text-[#003B3A] truncate">
                        {group.subject?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#00736E] text-[10px] font-bold">
                        {group.configs.length} mẫu
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-[#F1F5F9]">
                      {group.configs.map(cfg => {
                        const pInfo = resolvePeriodInfo(cfg.periodId, periods)
                        const sysInfo = resolveSystemInfo(
                          cfg.educationSystemId,
                          normalizedSystems,
                          cfg.educationSystemName
                        )
                        return (
                          <div
                            key={cfg.id}
                            onClick={() => onLoadConfig(cfg)}
                            className="px-3 py-2 hover:bg-[#F8FAFC] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPeriodBadgeStyle(
                                  pInfo.id
                                )}`}
                              >
                                {pInfo.shortLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-bold">
                                {cfg.grade}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  sysInfo.isAll
                                    ? "bg-white text-slate-500 border-slate-200"
                                    : "bg-[#F0FDFA] text-[#00736E] border-teal-200"
                                }`}
                              >
                                {sysInfo.isAll ? "Hệ chung" : sysInfo.code}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {cfg.columnCount} cột • {cfg.formula}
                              </span>
                            </div>

                            <div
                              className="flex items-center gap-0.5 shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => onExportExcel(cfg)}
                                className="p-1 text-slate-400 hover:text-[#059669] rounded-lg"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onDeleteConfig(
                                    cfg.id,
                                    `${group.subject?.name || ""} - ${cfg.grade}`
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-[#E11D48] rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* CHẾ ĐỘ 3: BẢNG SỔ CÁI HỌC THUẬT (SKY-LINE ACADEMIC LEDGER TABLE) */
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-white">Kỳ khảo sát</th>
                  <th className="py-2.5 px-2.5 text-teal-100">Hệ học</th>
                  <th className="py-2.5 px-2.5 text-white">Môn & khối</th>
                  <th className="py-2.5 px-2.5 text-[#5EEAD4]">Cấu trúc</th>
                  <th className="py-2.5 px-2.5 text-right text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {filteredConfigs.map(cfg => {
                  const pInfo = resolvePeriodInfo(cfg.periodId, periods)
                  const sysInfo = resolveSystemInfo(
                    cfg.educationSystemId,
                    normalizedSystems,
                    cfg.educationSystemName
                  )
                  const isSelectedRow =
                    cfg.subjectId === selectedSubjectId &&
                    (cfg.periodId || "ALL") === selectedPeriodId &&
                    cfg.grade === selectedGrade

                  return (
                    <tr
                      key={cfg.id}
                      onClick={() => onLoadConfig(cfg)}
                      className={`transition-colors align-middle cursor-pointer ${
                        isSelectedRow
                          ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getPeriodBadgeStyle(
                            pInfo.id
                          )}`}
                        >
                          {pInfo.shortLabel}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 align-middle whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            sysInfo.isAll
                              ? "bg-slate-50 text-slate-600 border-slate-200"
                              : "bg-[#F0FDFA] text-[#00736E] border-teal-200"
                          }`}
                        >
                          {sysInfo.isAll ? "Hệ chung" : sysInfo.code}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 align-middle whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {cfg.subject?.code} • {cfg.grade}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 align-middle whitespace-nowrap text-[11px] text-slate-600">
                        {cfg.columnCount} cột • {cfg.formula}
                        {cfg.passScore != null ? ` • ≥${cfg.passScore}đ` : ""}
                      </td>
                      <td
                        className="py-3 px-2.5 align-middle text-right whitespace-nowrap"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onExportExcel(cfg)}
                            className="p-1 text-slate-400 hover:text-[#059669] rounded"
                            title="Tải Excel mẫu"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteConfig(
                                cfg.id,
                                `${cfg.subject?.name || ""} - ${cfg.grade}`
                              )
                            }
                            className="p-1 text-slate-400 hover:text-[#E11D48] rounded"
                            title="Xóa mẫu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
