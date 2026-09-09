// @ts-nocheck
"use client"

import React from "react"
import {
  X, Plus, Sparkles, Zap, ShieldCheck, Info, BookOpen, Calendar, Clock,
  MapPin, User, Users, CheckCircle2, AlertCircle, FileText
} from "lucide-react"

interface CreateObservationModalProps {
  isOpen: boolean
  onClose: () => void
  creationMode: "TEACHER_OPEN" | "OBSERVER_REQUEST" | "SURPRISE"
  setCreationMode: (mode: "TEACHER_OPEN" | "OBSERVER_REQUEST" | "SURPRISE") => void
  isMamNonTeacher: boolean
  isAdminUser: boolean
  isTTCM: boolean
  canCreateSurprise: boolean
  currentTeacher: any
  monthlyLimitCount: number
  // Surprise form props
  surpriseDeptId: string
  setSurpriseDeptId: (v: string) => void
  surpriseTeacherId: string
  setSurpriseTeacherId: (v: string) => void
  surpriseCampusId: string
  setSurpriseCampusId: (v: string) => void
  surpriseClassId: string
  setSurpriseClassId: (v: string) => void
  surpriseClassName: string
  setSurpriseClassName: (v: string) => void
  surpriseSubjectId: string
  setSurpriseSubjectId: (v: string) => void
  surpriseSubjectName: string
  setSurpriseSubjectName: (v: string) => void
  surpriseLevel: string
  setSurpriseLevel: (v: string) => void
  surpriseGrade: string
  setSurpriseGrade: (v: string) => void
  surpriseTopic: string
  setSurpriseTopic: (v: string) => void
  surpriseDate: string
  setSurpriseDate: (v: string) => void
  surprisePeriod: string
  setSurprisePeriod: (v: string) => void
  surpriseRoom: string
  setSurpriseRoom: (v: string) => void
  surpriseScoresK12: number[]
  setSurpriseScoresK12: React.Dispatch<React.SetStateAction<number[]>>
  surpriseScoresMN: number[]
  setSurpriseScoresMN: React.Dispatch<React.SetStateAction<number[]>>
  surpriseStrengths: string
  setSurpriseStrengths: (v: string) => void
  surpriseImprovements: string
  setSurpriseImprovements: (v: string) => void
  surpriseGeneral: string
  setSurpriseGeneral: (v: string) => void
  surpriseOverall: string
  setSurpriseOverall: (v: string) => void
  surpriseSubmitting: boolean
  handleSurpriseSubmit: (isDraft?: boolean) => void
  ttcmAllowedDepartments: any[]
  filteredTeachersForSurprise: any[]
  filteredClassesForSurprise: any[]
  // Request form props
  reqCampusId: string
  setReqCampusId: (v: string) => void
  reqDeptId: string
  setReqDeptId: (v: string) => void
  reqTeacherId: string
  setReqTeacherId: (v: string) => void
  reqSubjectId: string
  setReqSubjectId: (v: string) => void
  reqLevel: string
  setReqLevel: (v: string) => void
  reqGrade: string
  setReqGrade: (v: string) => void
  reqClassId: string
  setReqClassId: (v: string) => void
  reqDate: string
  setReqDate: (v: string) => void
  reqPeriod: string
  setReqPeriod: (v: string) => void
  reqTopic: string
  setReqTopic: (v: string) => void
  reqNotes: string
  setReqNotes: (v: string) => void
  handleRequestSubmit: (e: React.FormEvent) => void
  filteredTeachersForRequest: any[]
  filteredReqClasses: any[]
  // Teacher open form props
  openDeptId: string
  setOpenDeptId: (v: string) => void
  openSubjectId: string
  setOpenSubjectId: (v: string) => void
  openSubjectName: string
  setOpenSubjectName: (v: string) => void
  openCampusId: string
  setOpenCampusId: (v: string) => void
  openClassId: string
  setOpenClassId: (v: string) => void
  openClassName: string
  setOpenClassName: (v: string) => void
  openLevel: string
  setOpenLevel: (v: string) => void
  openGrade: string
  setOpenGrade: (v: string) => void
  openTopic: string
  setOpenTopic: (v: string) => void
  openDate: string
  setOpenDate: (v: string) => void
  openPeriod: string
  setOpenPeriod: (v: string) => void
  openRoom: string
  setOpenRoom: (v: string) => void
  openMaxSeats: number
  setOpenMaxSeats: (v: number) => void
  openLessonPlanUrl: string
  setOpenLessonPlanUrl: (v: string) => void
  openLessonPlanFile: any
  setOpenLessonPlanFile: (v: any) => void
  openNotes: string
  setOpenNotes: (v: string) => void
  sendEmailNotif: boolean
  setSendEmailNotif: (v: boolean) => void
  selectedEmailTeacherIds: string[]
  setSelectedEmailTeacherIds: React.Dispatch<React.SetStateAction<string[]>>
  myDeptTeachers: any[]
  isSubmittingOpen: boolean
  handleOpenSlotSubmit: (e: React.FormEvent) => void
  // Shared data
  subjects: any[]
  departments: any[]
  teachers: any[]
  campuses: any[]
  classes: any[]
  periodOptions: string[]
  getGradesForLevel: (lvl: string) => string[]
  getKhacChuyenDeSubjectId: (subs: any[]) => string
  isPreschoolDepartment: (d: string) => boolean
  k12Labels: string[]
  maxScoresK12: number[]
  getK12RankingDetails: (scores: number[]) => { rating: string; reason: string; color: string }
  getMamNonRankingDetails: (scores: number[]) => { rating: string; reason: string; color: string }
  evaluationCriteriaPreschool: any[]
}

export function CreateObservationModal(props: CreateObservationModalProps) {
  if (!props.isOpen) return null

  const {
    onClose,
    creationMode,
    setCreationMode,
    isMamNonTeacher,
    isAdminUser,
    isTTCM,
    canCreateSurprise,
    currentTeacher,
    monthlyLimitCount,
    // Surprise
    surpriseDeptId, setSurpriseDeptId,
    surpriseTeacherId, setSurpriseTeacherId,
    surpriseCampusId, setSurpriseCampusId,
    surpriseClassId, setSurpriseClassId,
    surpriseClassName, setSurpriseClassName,
    surpriseSubjectId, setSurpriseSubjectId,
    surpriseSubjectName, setSurpriseSubjectName,
    surpriseLevel, setSurpriseLevel,
    surpriseGrade, setSurpriseGrade,
    surpriseTopic, setSurpriseTopic,
    surpriseDate, setSurpriseDate,
    surprisePeriod, setSurprisePeriod,
    surpriseRoom, setSurpriseRoom,
    surpriseScoresK12, setSurpriseScoresK12,
    surpriseScoresMN, setSurpriseScoresMN,
    surpriseStrengths, setSurpriseStrengths,
    surpriseImprovements, setSurpriseImprovements,
    surpriseGeneral, setSurpriseGeneral,
    surpriseOverall, setSurpriseOverall,
    surpriseSubmitting, handleSurpriseSubmit,
    ttcmAllowedDepartments, filteredTeachersForSurprise, filteredClassesForSurprise,
    // Request
    reqCampusId, setReqCampusId,
    reqDeptId, setReqDeptId,
    reqTeacherId, setReqTeacherId,
    reqSubjectId, setReqSubjectId,
    reqLevel, setReqLevel,
    reqGrade, setReqGrade,
    reqClassId, setReqClassId,
    reqDate, setReqDate,
    reqPeriod, setReqPeriod,
    reqTopic, setReqTopic,
    reqNotes, setReqNotes,
    handleRequestSubmit,
    filteredTeachersForRequest, filteredReqClasses,
    // Open slot
    openDeptId, setOpenDeptId,
    openSubjectId, setOpenSubjectId,
    openSubjectName, setOpenSubjectName,
    openCampusId, setOpenCampusId,
    openClassId, setOpenClassId,
    openClassName, setOpenClassName,
    openLevel, setOpenLevel,
    openGrade, setOpenGrade,
    openTopic, setOpenTopic,
    openDate, setOpenDate,
    openPeriod, setOpenPeriod,
    openRoom, setOpenRoom,
    openMaxSeats, setOpenMaxSeats,
    openLessonPlanUrl, setOpenLessonPlanUrl,
    openLessonPlanFile, setOpenLessonPlanFile,
    openNotes, setOpenNotes,
    sendEmailNotif, setSendEmailNotif,
    selectedEmailTeacherIds, setSelectedEmailTeacherIds,
    myDeptTeachers, isSubmittingOpen, handleOpenSlotSubmit,
    // Shared
    subjects, departments, teachers, campuses, classes,
    periodOptions, getGradesForLevel, getKhacChuyenDeSubjectId, isPreschoolDepartment,
    k12Labels, maxScoresK12, getK12RankingDetails, getMamNonRankingDetails,
    evaluationCriteriaPreschool
  } = props

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#003B3A] via-[#004D47] to-[#007068] text-white flex items-center justify-between gap-4 border-b border-teal-700/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-teal-200 border border-white/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {creationMode === "TEACHER_OPEN"
                  ? "Mở Tiết Dạy Dự Giờ Mới"
                  : creationMode === "OBSERVER_REQUEST"
                  ? "Gửi Yêu Cầu Xin Dự Giờ"
                  : "Lập Biên Bản Dự Giờ Đột Xuất"}
              </h3>
              <p className="text-xs text-teal-100/80 font-medium">
                Khởi tạo và thiết lập thông tin tiết dạy chuyên môn trên hệ thống Sky-Line
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-2xl w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setCreationMode("TEACHER_OPEN")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                creationMode === "TEACHER_OPEN"
                  ? "bg-gradient-to-r from-[#008B82] to-[#006059] text-white shadow-md shadow-teal-800/25"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <Plus className="w-4 h-4" />
              1. GV Dạy Tự Mở Tiết
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("OBSERVER_REQUEST")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                creationMode === "OBSERVER_REQUEST"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-800/25"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              2. GVBM Xin Dự Giờ
            </button>
            {canCreateSurprise && (
              <button
                type="button"
                onClick={() => setCreationMode("SURPRISE")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  creationMode === "SURPRISE"
                    ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-800/25"
                    : "text-rose-900 hover:bg-rose-100/60"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                3. Dự Giờ Đột Xuất ⚡
              </button>
            )}
          </div>

          {creationMode === "TEACHER_OPEN" && (
            <span className={`hidden sm:inline-flex text-xs font-black px-3 py-1.5 rounded-xl border ${isMamNonTeacher ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-teal-50 text-[#008B82] border-teal-200"}`}>
              Tháng {new Date().getMonth() + 1}: {monthlyLimitCount}/2 tiết đã tạo
            </span>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* ================= MODE 1: TEACHER OPEN FORM ================= */}
          {creationMode === "TEACHER_OPEN" && (
            <form onSubmit={handleOpenSlotSubmit} className="flex flex-col gap-5 text-xs font-semibold">
              <div className="bg-teal-500/10 border border-teal-200/70 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-teal-950 leading-relaxed">
                  <strong className="text-teal-900">Quy định tự mở tiết:</strong> Giáo viên trực tiếp lên lịch tiết dạy của mình để đồng nghiệp và TTCM đăng ký dự giờ. Giới hạn tối đa 2 tiết/tháng.
                </p>
              </div>

              {/* Group 1: Cơ sở & Tổ chuyên môn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">1. Cơ sở giảng dạy *</label>
                  <select
                    value={openCampusId}
                    onChange={e => { setOpenCampusId(e.target.value); setOpenClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {campuses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.campusName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">2. Môn học / Chủ đề *</label>
                  <select
                    value={openSubjectId}
                    onChange={e => {
                      const selId = e.target.value;
                      setOpenSubjectId(selId);
                      const sObj = subjects.find((s: any) => s.id === selId);
                      if (sObj) setOpenSubjectName(sObj.subjectName);
                    }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.subjectName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Tên bài dạy */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">3. Tên bài dạy / Chủ đề dự giờ *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Định luật II Newton, Chủ đề Bản thân & Gia đình..."
                  value={openTopic}
                  onChange={e => setOpenTopic(e.target.value)}
                  required
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800"
                />
              </div>

              {/* Group 3: Cấp học & Khối & Lớp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">4. Cấp học *</label>
                  <select
                    value={openLevel}
                    onChange={e => { setOpenLevel(e.target.value); setOpenGrade(""); setOpenClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn cấp học --</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">5. Khối lớp *</label>
                  <select
                    value={openGrade}
                    onChange={e => { setOpenGrade(e.target.value); setOpenClassId(""); }}
                    required
                    disabled={!openLevel}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn khối --</option>
                    {getGradesForLevel(openLevel).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">6. Lớp học *</label>
                  <select
                    value={openClassId}
                    onChange={e => {
                      const selId = e.target.value;
                      setOpenClassId(selId);
                      const cObj = classes.find((c: any) => c.id === selId);
                      if (cObj) {
                        setOpenClassName(cObj.className);
                        if (cObj.campusId && !openCampusId) setOpenCampusId(cObj.campusId);
                      }
                    }}
                    required
                    disabled={!openGrade}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {classes
                      .filter((c: any) => (!openCampusId || c.campusId === openCampusId) && (!openGrade || c.grade === openGrade || c.level === openLevel))
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>{c.className}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Group 4: Thời gian & Phòng & Chỗ */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">7. Ngày dạy *</label>
                  <input
                    type="date"
                    value={openDate}
                    onChange={e => setOpenDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">8. Tiết dạy *</label>
                  <select
                    value={openPeriod}
                    onChange={e => setOpenPeriod(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  >
                    {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">9. Phòng học</label>
                  <input
                    type="text"
                    placeholder="Phòng học"
                    value={openRoom}
                    onChange={e => setOpenRoom(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">10. Số chỗ dự tối đa</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={openMaxSeats}
                    onChange={e => setOpenMaxSeats(parseInt(e.target.value) || 4)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              {/* Group 5: Kế hoạch bài dạy / Giáo án */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">11. Link kế hoạch bài dạy / KHDH</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={openLessonPlanUrl}
                  onChange={e => setOpenLessonPlanUrl(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOpen}
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#008B82] to-[#006059] hover:from-[#007068] hover:to-[#004f4a] text-white font-black text-xs transition-all shadow-md shadow-teal-800/25 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-200" />
                  {isSubmittingOpen ? "Đang lưu tiết dạy..." : "Xác nhận mở tiết dạy"}
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 2: OBSERVER REQUEST FORM ================= */}
          {creationMode === "OBSERVER_REQUEST" && (
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-5 text-xs font-semibold">
              <div className="bg-indigo-500/10 border border-indigo-200/70 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-indigo-950 leading-relaxed">
                  <strong className="text-indigo-900">Đề xuất xin dự giờ:</strong> Chọn Tổ chuyên môn & Giáo viên dạy, cùng Cơ sở, Khối lớp và Tiết học mong muốn. Yêu cầu sẽ được gửi tới Giáo viên dạy để xem xét phê duyệt.
                </p>
              </div>

              {/* Group 1: Tổ & Giáo viên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">1. Chọn Tổ chuyên môn</label>
                  <select
                    value={reqDeptId}
                    onChange={e => {
                      const newDeptId = e.target.value;
                      setReqDeptId(newDeptId);
                      setReqTeacherId("");
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">Tất cả các Tổ chuyên môn</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">2. Chọn Giáo viên dạy *</label>
                  <select
                    value={reqTeacherId}
                    onChange={e => setReqTeacherId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn Giáo viên dạy --</option>
                    {filteredTeachersForRequest.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} {t.departmentRel?.name ? `(${t.departmentRel.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Môn học & Chủ đề */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">3. Chọn Môn học *</label>
                  <select
                    value={reqSubjectId}
                    onChange={e => setReqSubjectId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.subjectName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">4. Tên bài dạy / Chủ đề *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Cấp số cộng, Sự nảy mầm của hạt..."
                    value={reqTopic}
                    onChange={e => setReqTopic(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Group 3: Cơ sở & Cấp học & Khối & Lớp */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">5. Cơ sở *</label>
                  <select
                    value={reqCampusId}
                    onChange={e => { setReqCampusId(e.target.value); setReqClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {campuses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.campusName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">6. Cấp học *</label>
                  <select
                    value={reqLevel}
                    onChange={e => { setReqLevel(e.target.value); setReqGrade(""); setReqClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Cấp học --</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">7. Khối lớp *</label>
                  <select
                    value={reqGrade}
                    onChange={e => { setReqGrade(e.target.value); setReqClassId(""); }}
                    required
                    disabled={!reqLevel}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Khối --</option>
                    {getGradesForLevel(reqLevel).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">8. Lớp học *</label>
                  <select
                    value={reqClassId}
                    onChange={e => setReqClassId(e.target.value)}
                    required
                    disabled={!reqGrade}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {filteredReqClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 4: Thời gian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">9. Tiết học dự *</label>
                  <select
                    value={reqPeriod}
                    onChange={e => setReqPeriod(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">10. Ngày dự *</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={e => setReqDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs transition-all shadow-md shadow-indigo-700/25 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  Gửi đề xuất xin dự giờ
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 3: SURPRISE OBSERVATION FORM ================= */}
          {creationMode === "SURPRISE" && canCreateSurprise && (
            <div className="flex flex-col gap-6 text-xs font-semibold">
              <div className="bg-rose-500/10 border border-rose-200/70 rounded-2xl p-4 flex items-start gap-3">
                <Zap className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-rose-950 leading-relaxed">
                  <strong className="text-rose-900">Dự giờ đột xuất:</strong> Dành cho TTCM / Ban Giám hiệu / Ban ĐHCM. Dữ liệu đánh giá được ghi nhận trực tiếp vào hệ thống ngay sau khi chấm điểm.
                </p>
              </div>

              {/* Step 1: Thông tin giáo viên & Tiết học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Tổ chuyên môn *</label>
                  <select
                    value={surpriseDeptId}
                    onChange={e => {
                      const newDeptId = e.target.value;
                      setSurpriseDeptId(newDeptId);
                      setSurpriseTeacherId("");
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-slate-800"
                  >
                    {(isAdminUser || isMamNonTeacher) && <option value="">-- Tất cả Tổ --</option>}
                    {ttcmAllowedDepartments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Giáo viên được dự *</label>
                  <select
                    value={surpriseTeacherId}
                    onChange={e => {
                      const tId = e.target.value;
                      setSurpriseTeacherId(tId);
                      if (tId) {
                        const tObj = teachers.find((t: any) => t.id === tId);
                        if (tObj?.campusId) setSurpriseCampusId(tObj.campusId);
                        if (tObj?.mainSubjectRel?.subjectName) {
                          setSurpriseSubjectName(tObj.mainSubjectRel.subjectName);
                          if (tObj.mainSubjectId) setSurpriseSubjectId(tObj.mainSubjectId);
                        }
                      }
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {filteredTeachersForSurprise.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.teacherName} ({t.campus?.campusName || "Cơ sở"})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Môn học *</label>
                  <select
                    value={surpriseSubjectId}
                    onChange={e => {
                      const sId = e.target.value;
                      setSurpriseSubjectId(sId);
                      const sObj = subjects.find((s: any) => s.id === sId);
                      if (sObj) setSurpriseSubjectName(sObj.subjectName);
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.subjectName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Tên bài dạy & Lớp & Thời gian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Tên bài dạy / Hoạt động *</label>
                  <input
                    type="text"
                    value={surpriseTopic}
                    onChange={e => setSurpriseTopic(e.target.value)}
                    placeholder="Nhập tên bài dạy..."
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-white text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Lớp học *</label>
                  <select
                    value={surpriseClassId}
                    onChange={e => {
                      const cId = e.target.value;
                      setSurpriseClassId(cId);
                      const cObj = classes.find((c: any) => c.id === cId);
                      if (cObj) setSurpriseClassName(cObj.className);
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {filteredClassesForSurprise.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Ngày & Tiết dạy *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={surpriseDate}
                      onChange={e => setSurpriseDate(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                    />
                    <select
                      value={surprisePeriod}
                      onChange={e => setSurprisePeriod(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                    >
                      {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Nhận xét & Đánh giá */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-emerald-800 uppercase tracking-wide">Ưu điểm chính</label>
                  <textarea
                    rows={3}
                    value={surpriseStrengths}
                    onChange={e => setSurpriseStrengths(e.target.value)}
                    placeholder="Nhận xét các điểm mạnh của tiết dạy..."
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-amber-800 uppercase tracking-wide">Góp ý & Cần cải thiện</label>
                  <textarea
                    rows={3}
                    value={surpriseImprovements}
                    onChange={e => setSurpriseImprovements(e.target.value)}
                    placeholder="Các điểm cần lưu ý cải thiện..."
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={surpriseSubmitting}
                  onClick={() => handleSurpriseSubmit(false)}
                  className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-black text-xs transition-all shadow-md shadow-rose-700/25 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-200" />
                  {surpriseSubmitting ? "Đang xử lý..." : "Lưu & Hoàn thành biên bản"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
