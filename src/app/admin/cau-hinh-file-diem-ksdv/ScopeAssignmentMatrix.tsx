"use client"

import React from "react"
import {
  Calendar,
  GraduationCap,
  Layers,
  BookOpen,
  Copy,
  Check,
  Save,
  RefreshCw,
  CheckSquare,
  Square,
  SlidersHorizontal
} from "lucide-react"
import {
  STANDARD_PERIOD_OPTIONS,
  NormalizedSystemOption,
  isSameSystem,
  isSubjectApplicable,
  resolvePeriodInfo,
  sortGradesNaturally
} from "./presets"

interface ScopeAssignmentMatrixProps {
  periodsForYear: any[]
  normalizedSystems: NormalizedSystemOption[]
  grades: string[]
  subjects: any[]
  applicableSubjects: any[]
  applicablePresetCodes: string[]
  savedConfigs: any[]

  selectedPeriodId: string
  onSelectPeriod: (periodId: string) => void

  selectedSystemCode: string
  targetSystemCodes: string[]
  multiSystemMode: boolean
  onToggleMultiSystemMode: () => void
  onSelectSystem: (sysCode: string) => void
  onToggleTargetSystem: (sysCode: string) => void

  selectedGrade: string
  targetGrades: string[]
  multiGradeMode: boolean
  onToggleMultiGradeMode: () => void
  onSelectSingleGrade: (grade: string) => void
  onToggleGradeInMulti: (grade: string) => void
  onSelectGradeGroup: (groupGrades: string[]) => void

  selectedSubjectId: string
  onSelectSubject: (subjectId: string) => void
  onApplyPresetCode: (code: string) => void

  onOpenCloneModal: () => void
  onOpenBatchModal: () => void
  onQuickSave: () => void
  savingConfig: boolean
}

export function ScopeAssignmentMatrix({
  periodsForYear,
  normalizedSystems,
  grades,
  subjects,
  applicableSubjects,
  applicablePresetCodes,
  savedConfigs,
  selectedPeriodId,
  onSelectPeriod,
  selectedSystemCode,
  targetSystemCodes,
  multiSystemMode,
  onToggleMultiSystemMode,
  onSelectSystem,
  onToggleTargetSystem,
  selectedGrade,
  targetGrades,
  multiGradeMode,
  onToggleMultiGradeMode,
  onSelectSingleGrade,
  onToggleGradeInMulti,
  onSelectGradeGroup,
  selectedSubjectId,
  onSelectSubject,
  onApplyPresetCode,
  onOpenCloneModal,
  onOpenBatchModal,
  onQuickSave,
  savingConfig
}: ScopeAssignmentMatrixProps) {
  const currentSubject = subjects.find(s => s.id === selectedSubjectId)

  // Đếm số mẫu đã lưu theo từng mốc thời gian
  const countByPeriod = (pId: string) => {
    return savedConfigs.filter(c => (c.periodId || "ALL") === pId).length
  }

  // Đếm số mẫu đã lưu theo hệ học (trong mốc thời gian đang chọn hoặc toàn bộ)
  const countBySystem = (sysCode: string) => {
    return savedConfigs.filter(c => {
      const pMatch = selectedPeriodId === "ALL" ? true : (c.periodId || "ALL") === selectedPeriodId
      return pMatch && isSameSystem(c.educationSystemId, sysCode, normalizedSystems)
    }).length
  }

  // Kiểm tra trạng thái cấu hình của 1 khối đối với Môn + Kỳ + Hệ đang chọn
  const getGradeConfigStatus = (grade: string): "EXACT" | "INHERITED" | "NONE" => {
    if (!selectedSubjectId) return "NONE"
    const exact = savedConfigs.some(
      c =>
        c.subjectId === selectedSubjectId &&
        c.grade === grade &&
        (c.periodId || "ALL") === selectedPeriodId &&
        isSameSystem(c.educationSystemId, selectedSystemCode, normalizedSystems)
    )
    if (exact) return "EXACT"

    const inherited = savedConfigs.some(
      c =>
        c.subjectId === selectedSubjectId &&
        (c.grade === grade || c.grade === "ALL") &&
        ((c.periodId || "ALL") === selectedPeriodId || (c.periodId || "ALL") === "ALL") &&
        (isSameSystem(c.educationSystemId, selectedSystemCode, normalizedSystems) ||
          (c.educationSystemId || "ALL") === "ALL")
    )
    if (inherited) return "INHERITED"
    return "NONE"
  }

  const activePeriodInfo = resolvePeriodInfo(selectedPeriodId, periodsForYear)
  const sortedTargetGrades = sortGradesNaturally(targetGrades)
  const totalCombinations = sortedTargetGrades.length * targetSystemCodes.length

  const applicableGradesForCurrentSubject = currentSubject
    ? grades.filter(g => isSubjectApplicable(currentSubject, g, selectedPeriodId))
    : grades

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs overflow-hidden tabular-nums">
      {/* TOP HEADER STRIP */}
      <div className="px-4 md:px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#003B3A] text-white flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#003B3A]">
              Phạm vi áp dụng & gán cấu hình trực quan
            </h2>
            <p className="text-xs text-slate-500">
              Chọn Mốc thời gian / Kỳ khảo sát, Hệ học (HNG...), một hoặc nhiều Khối lớp và Môn khảo sát để thiết lập mẫu điểm
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCloneModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-[#E2E8F0]"
            title="Sao chép cấu trúc cột điểm từ mẫu đã lưu khác"
          >
            <Copy className="w-3.5 h-3.5 text-[#008B85]" />
            <span>Sao chép từ mẫu khác</span>
          </button>

          <button
            type="button"
            onClick={onOpenBatchModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003B3A] hover:bg-[#004d4b] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Gán hàng loạt đa môn / đa khối</span>
          </button>
        </div>
      </div>

      {/* BODY ZONES */}
      <div className="p-4 md:p-5 space-y-5">
        {/* ROW 1: MỐC THỜI GIAN / KỲ KS & HỆ HỌC (CHƯƠNG TRÌNH) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* 1A. Mốc thời gian / Kỳ KS (6 cột) */}
          <div className="xl:col-span-6 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#008B85]" />
                <span>1. Mốc thời gian / Kỳ khảo sát</span>
              </label>
              <span className="text-[11px] font-medium text-slate-500">
                Đang chọn: <strong className="text-[#00736E]">{activePeriodInfo.shortLabel}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STANDARD_PERIOD_OPTIONS.map(opt => {
                const isSelected = selectedPeriodId === opt.id
                const count = countByPeriod(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectPeriod(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "bg-[#F0FDFA] border-[#00A19A] ring-1 ring-[#00A19A]/40 shadow-2xs"
                        : "bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold leading-tight ${
                          isSelected ? "text-[#003B3A]" : "text-slate-700"
                        }`}
                      >
                        {opt.shortLabel}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          isSelected
                            ? "bg-[#003B3A] text-white"
                            : count > 0
                              ? "bg-teal-50 text-[#00736E] border border-teal-200/70"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-1">
                      {opt.id === "ALL"
                        ? "Mặc định chung"
                        : opt.id === "DAU_NAM"
                          ? "Tuyển sinh mới"
                          : opt.id === "HK1"
                            ? "Bổ sung HK1"
                            : "Bổ sung HK2"}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Kỳ khảo sát cụ thể trong năm học (nếu nhà trường đã khởi tạo kỳ khảo sát) */}
            {periodsForYear.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 mr-1">
                  Kỳ khảo sát cụ thể:
                </span>
                {periodsForYear.map((p: any) => {
                  const isSelected = selectedPeriodId === p.id
                  const pCount = countByPeriod(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPeriod(p.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                          : "bg-[#F8FAFC] hover:bg-white text-slate-700 border-[#E2E8F0] hover:border-[#00A19A]"
                      }`}
                    >
                      <span className="truncate max-w-[180px]">{p.name}</span>
                      {pCount > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-teal-50 text-[#00736E]"
                          }`}
                        >
                          {pCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 1B. Hệ học (Chương trình đào tạo — nổi bật Hội nhập Quốc tế HNG) (6 cột) */}
          <div className="xl:col-span-6 space-y-2.5 xl:border-l xl:border-[#E2E8F0] xl:pl-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#008B85]" />
                <span>2. Hệ học (Chương trình đào tạo)</span>
              </label>

              <button
                type="button"
                onClick={onToggleMultiSystemMode}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  multiSystemMode
                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                    : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-slate-300"
                }`}
              >
                {multiSystemMode ? (
                  <CheckSquare className="w-3 h-3 text-[#5EEAD4]" />
                ) : (
                  <Square className="w-3 h-3 text-slate-400" />
                )}
                <span>Gán nhiều hệ học</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Chip Mẫu chung tất cả hệ */}
              {(() => {
                const isSelected = multiSystemMode
                  ? targetSystemCodes.includes("ALL")
                  : selectedSystemCode === "ALL"
                const allSysCount = countBySystem("ALL")
                return (
                  <button
                    type="button"
                    onClick={() =>
                      multiSystemMode ? onToggleTargetSystem("ALL") : onSelectSystem("ALL")
                    }
                    className={`px-3 py-2 rounded-xl border text-xs transition-all inline-flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#003B3A] text-white border-[#003B3A] font-bold shadow-2xs"
                        : "bg-white hover:bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] font-semibold"
                    }`}
                  >
                    {multiSystemMode && (
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isSelected ? "bg-[#00A19A] border-[#00A19A] text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </span>
                    )}
                    <span>Tất cả hệ học (Mẫu chung)</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {allSysCount}
                    </span>
                  </button>
                )
              })()}

              {/* Danh sách các Hệ học cụ thể (Hội nhập Quốc tế HNG, CLC, HNS...) */}
              {normalizedSystems.map(sys => {
                const isSelected = multiSystemMode
                  ? targetSystemCodes.some(c => c.toUpperCase() === sys.code.toUpperCase())
                  : selectedSystemCode.toUpperCase() === sys.code.toUpperCase()
                const sysCount = countBySystem(sys.code)
                const isHNG = sys.code.toUpperCase() === "HNG"

                return (
                  <button
                    key={sys.code}
                    type="button"
                    onClick={() =>
                      multiSystemMode ? onToggleTargetSystem(sys.code) : onSelectSystem(sys.code)
                    }
                    className={`px-3 py-2 rounded-xl border text-xs transition-all inline-flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#F0FDFA] text-[#003B3A] border-[#00A19A] ring-1 ring-[#00A19A]/40 font-bold shadow-2xs"
                        : isHNG
                          ? "bg-white hover:bg-[#F0FDFA]/60 text-slate-800 border-teal-300/80 font-semibold"
                          : "bg-white hover:bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] font-semibold"
                    }`}
                  >
                    {multiSystemMode && (
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isSelected ? "bg-[#00A19A] border-[#00A19A] text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isSelected
                          ? "bg-[#003B3A] text-[#5EEAD4]"
                          : isHNG
                            ? "bg-teal-50 text-[#00736E] border border-teal-200"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {sys.code}
                    </span>
                    <span>{sys.name}</span>
                    {sysCount > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                          isSelected
                            ? "bg-[#00A19A] text-white"
                            : "bg-teal-50 text-[#00736E]"
                        }`}
                      >
                        {sysCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-[#F1F5F9]" />

        {/* ROW 2: KHỐI LỚP ÁP DỤNG (CÓ THỂ CHỌN 1 KHỐI HOẶC GÁN NHIỀU KHỐI LỚP) */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#008B85]" />
                <span>3. Khối lớp áp dụng</span>
              </label>

              {/* Toggle Single vs Multi-Grade */}
              <div className="inline-flex items-center p-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    if (multiGradeMode) onToggleMultiGradeMode()
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    !multiGradeMode
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Chọn 1 khối
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!multiGradeMode) onToggleMultiGradeMode()
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1 ${
                    multiGradeMode
                      ? "bg-[#00A19A] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>Gán nhiều khối ({sortedTargetGrades.length})</span>
                </button>
              </div>
            </div>

            {/* Quick Grade Group Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 mr-0.5">Chọn nhanh cấp học:</span>
              {[
                { label: "Khối 1", list: ["Khối 1"] },
                { label: "Tiểu học (K2–K5)", list: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
                { label: "THCS (K6–K9)", list: ["Khối 6", "Khối 7", "Khối 8", "Khối 9"] },
                { label: "THPT (K10–K12)", list: ["Khối 10", "Khối 11", "Khối 12"] },
                {
                  label: `Tất cả khối phù hợp (${applicableGradesForCurrentSubject.length})`,
                  list: applicableGradesForCurrentSubject
                }
              ].map(grp => {
                const isExactGroup =
                  grp.list.length > 0 &&
                  grp.list.length === sortedTargetGrades.length &&
                  grp.list.every(g => sortedTargetGrades.includes(g))
                return (
                  <button
                    key={grp.label}
                    type="button"
                    onClick={() => onSelectGradeGroup(grp.list)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      isExactGroup
                        ? "bg-[#F0FDFA] text-[#00736E] border-[#00A19A]"
                        : "bg-white hover:bg-[#F8FAFC] text-slate-600 border-[#E2E8F0]"
                    }`}
                  >
                    {grp.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 12 GRADE INTERACTIVE CHIPS */}
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
            {grades.map(g => {
              const isChecked = sortedTargetGrades.includes(g)
              const isPrimary = selectedGrade === g
              const status = getGradeConfigStatus(g)
              const isApplicableToCurrentSub = currentSubject
                ? isSubjectApplicable(currentSubject, g, selectedPeriodId)
                : true

              return (
                <div
                  key={g}
                  className={`relative rounded-xl border transition-all flex items-center justify-between px-2.5 py-2 cursor-pointer select-none ${
                    isChecked
                      ? isPrimary
                        ? "bg-[#003B3A] text-white border-[#003B3A] shadow-xs"
                        : "bg-[#F0FDFA] text-[#003B3A] border-[#00A19A] ring-1 ring-[#00A19A]/30"
                      : isApplicableToCurrentSub
                        ? "bg-white hover:bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:border-slate-300"
                        : "bg-slate-50/70 hover:bg-slate-100/80 text-slate-400 border-slate-200/70"
                  }`}
                  onClick={() => {
                    if (multiGradeMode) {
                      onToggleGradeInMulti(g)
                    } else {
                      onSelectSingleGrade(g)
                    }
                  }}
                  title={
                    status === "EXACT"
                      ? `${g}: Đã có cấu hình riêng cho kỳ & hệ đang chọn`
                      : status === "INHERITED"
                        ? `${g}: Đang kế thừa từ Mẫu chung`
                        : `${g}: Chưa lưu cấu hình cho môn này`
                  }
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Nút tích chọn nhanh đa khối ngay trên từng thẻ khối */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onToggleGradeInMulti(g)
                      }}
                      title={isChecked ? `Bỏ chọn ${g}` : `Chọn thêm ${g} để gán cùng lúc`}
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                        isChecked
                          ? isPrimary
                            ? "bg-[#00A19A] border-[#00A19A] text-white"
                            : "bg-[#00A19A] border-[#00A19A] text-white"
                          : "border-slate-300 bg-white hover:border-[#00A19A]"
                      }`}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5" />}
                    </button>
                    <span className="text-xs font-bold whitespace-nowrap">{g}</span>
                  </div>

                  {/* Dấu trạng thái đã cấu hình hay chưa */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      status === "EXACT"
                        ? isPrimary && isChecked
                          ? "bg-[#5EEAD4]"
                          : "bg-[#059669]"
                        : status === "INHERITED"
                          ? "bg-amber-400"
                          : isPrimary && isChecked
                            ? "bg-white/30"
                            : "bg-slate-200"
                    }`}
                  />
                </div>
              )
            })}
          </div>

          {/* Chú thích ngắn gọn trạng thái chấm màu */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#059669]" />
                <span>Đã có mẫu đúng kỳ & hệ</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Đang kế thừa mẫu chung</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                <span>Chưa thiết lập</span>
              </span>
            </div>
            <span className="text-slate-500">
              Mẹo: Bấm vào ô vuông nhỏ trên từng khối hoặc chọn nhóm cấp học để gán nhiều khối lớp cùng lúc.
            </span>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-[#F1F5F9]" />

        {/* ROW 3: MÔN KHẢO SÁT TRỰC QUAN */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#008B85]" />
              <span>4. Môn khảo sát đầu vào ({applicableSubjects.length} môn phù hợp với {selectedGrade})</span>
            </label>

            {/* Nút nạp nhanh mẫu chuẩn Sky-Line */}
            {applicablePresetCodes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] font-medium text-slate-500 mr-1">Nạp nhanh mẫu chuẩn:</span>
                {applicablePresetCodes.map(code => {
                  const isActivePreset =
                    currentSubject?.code === code ||
                    (code === "PDHDV" && (currentSubject?.code === "PDHDV" || currentSubject?.code === "PDH"))
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onApplyPresetCode(code)}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-colors ${
                        isActivePreset
                          ? "bg-[#F0FDFA] text-[#00736E] border-[#00A19A]"
                          : "bg-[#F8FAFC] hover:bg-white text-slate-600 border-[#E2E8F0]"
                      }`}
                    >
                      {code === "TOA"
                        ? "Toán"
                        : code === "TVI"
                          ? "Tiếng Việt"
                          : code === "NVA"
                            ? "Ngữ văn"
                            : code === "PDHDV"
                              ? "Phiếu định hướng"
                              : code}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {applicableSubjects.map(sub => {
              const isSelected = sub.id === selectedSubjectId
              const configuredCountInScope = sortedTargetGrades.filter(g =>
                savedConfigs.some(
                  c =>
                    c.subjectId === sub.id &&
                    c.grade === g &&
                    (c.periodId || "ALL") === selectedPeriodId &&
                    isSameSystem(c.educationSystemId, selectedSystemCode, normalizedSystems)
                )
              ).length

              const isExtraG1 =
                (selectedGrade === "Khối 1" || selectedGrade === "1") &&
                (selectedPeriodId === "HK1" || selectedPeriodId === "HK2") &&
                ["TOA", "TVI", "TAv"].includes(sub.code)

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubject(sub.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-[#F0FDFA] border-[#00A19A] ring-1 ring-[#00A19A]/40 shadow-2xs"
                      : "bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                        isSelected
                          ? "bg-[#003B3A] text-[#5EEAD4]"
                          : "bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]"
                      }`}
                    >
                      {sub.code}
                    </span>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-bold truncate ${
                          isSelected ? "text-[#003B3A]" : "text-slate-800"
                        }`}
                      >
                        {sub.code === "TCI" ? "Bộ chuẩn trẻ 5–6 tuổi" : sub.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {isExtraG1
                          ? "Bổ sung HK1 / HK2"
                          : sub.subjectType || "Môn khảo sát đầu vào"}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      configuredCountInScope === sortedTargetGrades.length && sortedTargetGrades.length > 0
                        ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                        : configuredCountInScope > 0
                          ? "bg-amber-50 text-[#D97706] border border-amber-200"
                          : "bg-slate-100 text-slate-400"
                    }`}
                    title={`Đã lưu ${configuredCountInScope}/${sortedTargetGrades.length} khối đang chọn`}
                  >
                    {configuredCountInScope}/{sortedTargetGrades.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM SUMMARY & QUICK ASSIGN ACTION STRIP */}
      <div className="px-4 md:px-5 py-3 bg-[#003B3A] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-teal-200 font-medium">Đang thiết lập gán cho:</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-semibold border border-white/15">
            {activePeriodInfo.shortLabel}
          </span>
          <span className="text-teal-300">•</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-[#5EEAD4] font-semibold border border-white/15">
            {targetSystemCodes.length > 1
              ? `${targetSystemCodes.length} hệ học (${targetSystemCodes.join(", ")})`
              : targetSystemCodes[0] === "ALL"
                ? "Tất cả hệ học (Mẫu chung)"
                : normalizedSystems.find(s => s.code.toUpperCase() === targetSystemCodes[0]?.toUpperCase())
                    ?.displayLabel || targetSystemCodes[0]}
          </span>
          <span className="text-teal-300">•</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-semibold border border-white/15">
            {sortedTargetGrades.length === 1
              ? sortedTargetGrades[0]
              : `${sortedTargetGrades.length} khối (${sortedTargetGrades.join(", ")})`}
          </span>
          <span className="text-teal-300">•</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#00A19A]/30 text-white font-bold border border-[#5EEAD4]/40">
            Môn: {currentSubject ? `${currentSubject.name} (${currentSubject.code})` : "Chưa chọn"}
          </span>
        </div>

        <button
          type="button"
          onClick={onQuickSave}
          disabled={savingConfig || !currentSubject}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {savingConfig ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang lưu cấu hình...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>
                {totalCombinations > 1
                  ? `Lưu & gán cho ${sortedTargetGrades.length} khối${
                      targetSystemCodes.length > 1 ? ` × ${targetSystemCodes.length} hệ` : ""
                    }`
                  : `Lưu cấu hình (${selectedGrade})`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
