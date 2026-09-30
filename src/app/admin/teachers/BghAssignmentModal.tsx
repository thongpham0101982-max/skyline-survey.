"use client"
// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react"
import {
  Crown, X, ShieldCheck, Check, Trash2, Search,
  Building2, GraduationCap, AlertCircle, RefreshCw,
  Sparkles, UserCheck, ShieldAlert, Baby, BookOpen
} from "lucide-react"
import {
  assignBghLeadershipAction,
  revokeBghLeadershipAction,
  getBghLeadersAction
} from "./actions"

interface BghAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  allTeachers: any[]
  campuses: any[]
  onSuccess?: () => void
}

export default function BghAssignmentModal({
  isOpen,
  onClose,
  allTeachers = [],
  campuses = [],
  onSuccess
}: BghAssignmentModalProps) {
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filterCampus, setFilterCampus] = useState("all")

  // Form State
  const [teacherSearch, setTeacherSearch] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [selectedCampusId, setSelectedCampusId] = useState("")
  const [bghType, setBghType] = useState<"K12" | "PRESCHOOL" | "COMPREHENSIVE" | "QLCM">("K12")
  const [note, setNote] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Load current leaders
  const loadLeaders = async () => {
    setLoading(true)
    try {
      const res = await getBghLeadersAction()
      if (res.success && res.leaders) {
        setLeaders(res.leaders)
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadLeaders()
      setMsg(null)
      setSelectedTeacherId("")
      setTeacherSearch("")
      setNote("")
      if (campuses.length > 0 && !selectedCampusId) {
        // default select CS4 if available, or first
        const cs4 = campuses.find((c: any) => c.campusCode === "CS4" || c.campusName?.includes("Hill"))
        setSelectedCampusId(cs4 ? cs4.id : campuses[0].id)
      }
    }
  }, [isOpen])

  // Filter teachers for autocomplete dropdown
  const filteredTeacherOptions = useMemo(() => {
    if (!teacherSearch.trim()) return []
    const q = teacherSearch.toLowerCase().trim()
    return allTeachers
      .filter((t: any) => {
        const name = (t.teacherName || "").toLowerCase()
        const code = (t.teacherCode || "").toLowerCase()
        const email = (t.email || t.user?.email || "").toLowerCase()
        return name.includes(q) || code.includes(q) || email.includes(q)
      })
      .slice(0, 8)
  }, [allTeachers, teacherSearch])

  const selectedTeacher = useMemo(() => {
    return allTeachers.find((t: any) => t.id === selectedTeacherId)
  }, [allTeachers, selectedTeacherId])

  // Filter existing leaders list
  const filteredLeaders = useMemo(() => {
    if (filterCampus === "all") return leaders
    return leaders.filter((l: any) => l.campusId === filterCampus || l.campus?.id === filterCampus)
  }, [leaders, filterCampus])

  const handleSelectTeacher = (t: any) => {
    setSelectedTeacherId(t.id)
    setTeacherSearch(`${t.teacherName} (${t.teacherCode})`)
    if (t.campusId) {
      setSelectedCampusId(t.campusId)
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeacherId) {
      setMsg({ type: "error", text: "Vui lòng tìm và chọn Giáo viên cần bổ nhiệm BGH!" })
      return
    }
    if (!selectedCampusId) {
      setMsg({ type: "error", text: "Vui lòng chọn Cơ sở phụ trách!" })
      return
    }

    setSubmitting(true)
    setMsg(null)
    try {
      const res = await assignBghLeadershipAction({
        teacherId: selectedTeacherId,
        campusId: selectedCampusId,
        bghType,
        note
      })

      if (res.success) {
        setMsg({ type: "success", text: res.message || "Bổ nhiệm và phân quyền BGH thành công!" })
        setSelectedTeacherId("")
        setTeacherSearch("")
        setNote("")
        await loadLeaders()
        if (onSuccess) onSuccess()
      } else {
        setMsg({ type: "error", text: res.error || "Gặp lỗi khi bổ nhiệm BGH" })
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Lỗi hệ thống" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (teacher: any) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi quyền BGH của Thầy/Cô ${teacher.teacherName}?`)) {
      return
    }

    setRevokingId(teacher.id)
    setMsg(null)
    try {
      const res = await revokeBghLeadershipAction(teacher.id)
      if (res.success) {
        setMsg({ type: "success", text: res.message || "Đã thu hồi quyền BGH thành công!" })
        await loadLeaders()
        if (onSuccess) onSuccess()
      } else {
        setMsg({ type: "error", text: res.error || "Lỗi khi thu hồi quyền" })
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Lỗi hệ thống" })
    } finally {
      setRevokingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] text-white p-5 sm:p-6 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Crown className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Phân Quyền Ban Giám Hiệu Cơ Sở</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  CS4 & Hệ Thống
                </span>
              </div>
              <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                Thiết lập quyền Dự giờ toàn diện cấp Cơ sở & phân định chuẩn xác giữa Khối Phổ thông (K-12) và Khối Mầm non
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Status Message */}
        {msg && (
          <div className={`p-4 shrink-0 flex items-center justify-between gap-3 text-sm font-bold border-b ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}>
            <div className="flex items-center gap-2">
              {msg.type === "success" ? <Check className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form Gán quyền mới (5 Cột) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-50/70 to-indigo-50/20 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                  Bổ Nhiệm BGH Cơ Sở Mới
                </h3>
              </div>

              <form onSubmit={handleAssign} className="space-y-4">
                {/* 1. Tìm chọn giáo viên */}
                <div className="relative">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    1. Chọn Giáo Viên Bổ Nhiệm *
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Gõ tên hoặc mã GV..."
                      value={teacherSearch}
                      onChange={(e) => {
                        setTeacherSearch(e.target.value)
                        if (selectedTeacherId) setSelectedTeacherId("")
                      }}
                      className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/15 outline-none font-bold text-slate-800 transition-all"
                    />
                    {teacherSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherSearch("")
                          setSelectedTeacherId("")
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown gợi ý */}
                  {!selectedTeacherId && filteredTeacherOptions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1">
                      {filteredTeacherOptions.map((t: any) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTeacher(t)}
                          className="w-full px-3.5 py-2 text-left hover:bg-indigo-50/70 transition-all flex items-center justify-between border-b border-slate-50 last:border-b-0 cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-800 text-xs sm:text-sm">{t.teacherName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {t.teacherCode} • {t.campus || t.campus?.campusName || "Chưa có CS"}
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                            {t.position || "GV"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedTeacher && (
                    <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>Đã chọn: {selectedTeacher.teacherName} ({selectedTeacher.teacherCode})</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                        {selectedTeacher.campus || "Chưa gán CS"}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Chọn Cơ sở */}
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    2. Chọn Cơ Sở Trực Thuộc *
                  </label>
                  <select
                    value={selectedCampusId}
                    onChange={(e) => setSelectedCampusId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/15 outline-none font-bold text-slate-800 cursor-pointer transition-all"
                  >
                    <option value="">-- Chọn Cơ sở --</option>
                    {campuses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.campusCode} - {c.campusName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Chọn Loại BGH / Khối Quyền hạn */}
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    3. Loại Ban Giám Hiệu / Khối Quản Lý *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all select-none ${
                      bghType === "K12"
                        ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 text-amber-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" /> BGH Phổ thông
                        </span>
                        <input
                          type="radio"
                          name="bghType"
                          value="K12"
                          checked={bghType === "K12"}
                          onChange={() => setBghType("K12")}
                          className="accent-amber-600"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Dự giờ tất cả GV Tiểu học, THCS, THPT, TA, STEM của cơ sở (phiếu 20đ).
                      </span>
                    </label>

                    <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all select-none ${
                      bghType === "PRESCHOOL"
                        ? "bg-pink-500/10 border-pink-500 ring-2 ring-pink-500/20 text-pink-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <Baby className="w-3.5 h-3.5 text-pink-600" /> BGH Mầm non
                        </span>
                        <input
                          type="radio"
                          name="bghType"
                          value="PRESCHOOL"
                          checked={bghType === "PRESCHOOL"}
                          onChange={() => setBghType("PRESCHOOL")}
                          className="accent-pink-600"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Dự giờ toàn bộ 11+ GV Mầm non của cơ sở (phiếu 10đ Mầm non).
                      </span>
                    </label>

                    <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all select-none ${
                      bghType === "COMPREHENSIVE"
                        ? "bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20 text-rose-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-rose-600" /> Giám đốc Cơ sở
                        </span>
                        <input
                          type="radio"
                          name="bghType"
                          value="COMPREHENSIVE"
                          checked={bghType === "COMPREHENSIVE"}
                          onChange={() => setBghType("COMPREHENSIVE")}
                          className="accent-rose-600"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Toàn diện cả Phổ thông lẫn Mầm non của cơ sở.
                      </span>
                    </label>

                    <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all select-none ${
                      bghType === "QLCM"
                        ? "bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20 text-purple-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> QLCM Cơ sở
                        </span>
                        <input
                          type="radio"
                          name="bghType"
                          value="QLCM"
                          checked={bghType === "QLCM"}
                          onChange={() => setBghType("QLCM")}
                          className="accent-purple-600"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Quản lý Chuyên môn CS (tương đương cô Nguyễn Thị Vân tại CS4).
                      </span>
                    </label>
                  </div>
                </div>

                {/* 4. Ghi chú */}
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    4. Ghi Chú / Quyết Định Bổ Nhiệm
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Quyết định bổ nhiệm BGH CS4 năm học 2025-2026"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#48BFE3] outline-none font-semibold text-slate-700"
                  />
                </div>

                {/* Nút hành động */}
                <button
                  type="submit"
                  disabled={submitting || !selectedTeacherId || !selectedCampusId}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý đồng bộ...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 text-white" />
                      <span>Xác Nhận Bổ Nhiệm BGH</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Note hướng dẫn */}
            <div className="mt-4 p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                <strong>Nguyên tắc phân quyền:</strong> BGH Phổ thông sẽ dự giờ được tất cả GV Phổ thông thuộc CS đó (không bao gồm GV Mầm non). BGH Mầm non chỉ dự giờ GV Mầm non. Hệ thống tự động gán Role <code className="bg-amber-100 px-1 rounded font-bold">BGH</code> và phân quyền module Dự giờ tương ứng.
              </p>
            </div>
          </div>

          {/* Danh sách BGH hiện tại (7 Cột) */}
          <div className="lg:col-span-7 flex flex-col border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
            {/* Header danh sách & Filter */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#48BFE3]" />
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                  Ban Giám Hiệu Đang Phụ Trách ({filteredLeaders.length})
                </h3>
              </div>

              {/* Lọc theo cơ sở */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Cơ sở:</span>
                <select
                  value={filterCampus}
                  onChange={(e) => setFilterCampus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-700 cursor-pointer focus:border-[#48BFE3]"
                >
                  <option value="all">Tất cả Cơ sở</option>
                  {campuses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.campusCode} ({c.campusName})
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadLeaders}
                  disabled={loading}
                  title="Tải lại danh sách"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#48BFE3]" : ""}`} />
                </button>
              </div>
            </div>

            {/* List items */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {loading && leaders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#48BFE3]" />
                  <span>Đang tải danh sách Lãnh đạo BGH...</span>
                </div>
              ) : filteredLeaders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold">
                  Không tìm thấy Lãnh đạo BGH nào phù hợp với bộ lọc.
                </div>
              ) : (
                filteredLeaders.map((leader: any) => {
                  const pos = (leader.position || "").toUpperCase()
                  const role = (leader.user?.role || "").toUpperCase()
                  const isMN = pos.includes("MN") || pos.includes("MẦM NON") || role.includes("MN")
                  const isGDCS = pos.includes("GDCS") || pos.includes("GĐCS") || role.includes("GDCS")
                  const isQLCM = pos === "QLCM" || role === "QLCM"
                  const isK12 = !isMN && !isGDCS

                  return (
                    <div
                      key={leader.id}
                      className="py-3 px-3 hover:bg-slate-50/80 rounded-xl transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar initials */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          isMN
                            ? "bg-pink-100 text-pink-700 border border-pink-200"
                            : isGDCS
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : isQLCM
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {leader.teacherName?.charAt(0) || "G"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">
                              {leader.teacherName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-bold">
                              {leader.teacherCode}
                            </span>
                            {/* Badge Loại BGH */}
                            {isMN && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-50 text-pink-700 border border-pink-200">
                                <Baby className="w-3 h-3" /> BGH Mầm non
                              </span>
                            )}
                            {isGDCS && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                <Crown className="w-3 h-3" /> GĐCS Toàn diện
                              </span>
                            )}
                            {isQLCM && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                                <ShieldCheck className="w-3 h-3" /> QLCM Cơ sở
                              </span>
                            )}
                            {isK12 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                <BookOpen className="w-3 h-3" /> BGH Phổ thông (K-12)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-[#48BFE3]" />
                              {leader.campus?.campusName || leader.campus?.campusCode || "Toàn trường"}
                            </span>
                            {leader.email && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400 truncate max-w-[200px]">{leader.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Nút thu hồi */}
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRevoke(leader)}
                          disabled={revokingId === leader.id}
                          className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {revokingId === leader.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Thu hồi</span>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>Đang hiển thị {filteredLeaders.length} lãnh đạo BGH</span>
              <span className="text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Đồng bộ tức thì với App Dự giờ
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
