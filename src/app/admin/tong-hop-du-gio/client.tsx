"use client"

import { useState, useMemo } from "react"
import { 
  ClipboardList, CheckCircle, PieChart, FileText, Calendar, Layers,
  ChevronDown, ChevronUp, AlertCircle, Plus, Search, X, Check
} from "lucide-react"

interface TeacherInfo { id: string; teacherName: string; teacherCode: string; email: string | null; departmentId: string | null; campusId: string; position?: string }
interface SubjectInfo { id: string; subjectCode: string; subjectName: string }
interface DeptInfo { id: string; code: string; name: string; blockCM?: string | null }
interface CampusInfo { id: string; campusCode: string; campusName: string }
interface ClassInfo { id: string; classCode: string; className: string; level: string; grade: string; campusId: string }

interface AdminTongHopClientProps {
  initialSlots: any[]
  currentTeacher: TeacherInfo | null
  subjects: SubjectInfo[]
  departments: DeptInfo[]
  teachers: any[]
  campuses: CampusInfo[]
  classes: ClassInfo[]
  initialFilters: { level: string; period: string; grade: string; date: string; campusId: string; deptId: string }
  isTTCM: boolean
  isSuperAdmin: boolean
}

export function AdminTongHopClient({
  initialSlots, currentTeacher, subjects, departments, teachers, campuses, classes, initialFilters, isTTCM, isSuperAdmin
}: AdminTongHopClientProps) {
  // 1. Compute taught and observed slot counts for all teachers in the system
  const allTeacherStats = useMemo(() => {
    const statsMap: Record<string, { taughtCount: number; observedCount: number }> = {};
    
    // Initialize stats for each teacher
    teachers.forEach((t: any) => {
      statsMap[t.id] = { taughtCount: 0, observedCount: 0 };
    });

    // Loop through all slots to calculate counts
    initialSlots.forEach((slot: any) => {
      // Taught count (Host)
      if (statsMap[slot.teacherId]) {
        const hasEvaluations = slot.registrations.some((r: any) => r.evaluation !== null);
        if (hasEvaluations) {
          statsMap[slot.teacherId].taughtCount += (slot.isDoublePeriod ? 2 : 1);
        }
      }

      // Observed count (Observer)
      slot.registrations.forEach((reg: any) => {
        if (reg.isApproved && reg.evaluation && statsMap[reg.teacherId]) {
          statsMap[reg.teacherId].observedCount += (slot.isDoublePeriod ? 2 : 1);
        }
      });
    });

    return statsMap;
  }, [teachers, initialSlots]);

  const [activeBlockTab, setActiveBlockTab] = useState("Phổ thông K-12")

  // 2. Only show departments that belong to the active blockCM, excluding "Hỗ trợ người học"
  const activeDepartments = useMemo(() => {
    return departments.filter(dept => {
      if (!dept.blockCM || dept.blockCM === "" || dept.blockCM === "Hỗ trợ người học") {
        return false;
      }
      if (activeBlockTab === "Phổ thông K-12" && dept.blockCM !== "Phổ thông") {
        return false;
      }
      if (activeBlockTab === "Mầm non" && dept.blockCM !== "Mầm Non") {
        return false;
      }
      if (activeBlockTab === "Điều hành" && dept.blockCM !== "Điều hành") {
        return false;
      }
      return true;
    });
  }, [departments, activeBlockTab]);

  // If user is TTCM, preselect and lock to their department. Otherwise, select the first active department.
  const initialDeptId = isTTCM 
    ? (currentTeacher?.departmentId || "") 
    : (activeDepartments.find(d => d.id === initialFilters.deptId)?.id || activeDepartments[0]?.id || "");

  const [selectedDeptId, setSelectedDeptId] = useState(initialDeptId)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  
  // Search & Filter states
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("")
  const [searchSlotQuery, setSearchSlotQuery] = useState("")
  const [filterLevel, setFilterLevel] = useState("all")
  const [filterGrade, setFilterGrade] = useState("all")

  const handleTabChange = (tab: string) => {
    setActiveBlockTab(tab);
    setSelectedTeacherId(null);
    setSearchTeacherQuery("");
    
    const newActiveDepts = departments.filter(dept => {
      if (!dept.blockCM || dept.blockCM === "" || dept.blockCM === "Hỗ trợ người học") {
        return false;
      }
      if (tab === "Phổ thông K-12" && dept.blockCM !== "Phổ thông") return false;
      if (tab === "Mầm non" && dept.blockCM !== "Mầm Non") return false;
      if (tab === "Điều hành" && dept.blockCM !== "Điều hành") return false;
      return true;
    });
    setSelectedDeptId(newActiveDepts[0]?.id || "");
  };

  // Get all teachers in the selected department
  const deptTeachers = useMemo(() => {
    return teachers.filter((t: any) => t.departmentId === selectedDeptId);
  }, [teachers, selectedDeptId]);

  // Filter department teachers by search query
  const filteredDeptTeachers = useMemo(() => {
    return deptTeachers.filter((t: any) => 
      t.teacherName.toLowerCase().includes(searchTeacherQuery.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(searchTeacherQuery.toLowerCase())
    );
  }, [deptTeachers, searchTeacherQuery]);

  // Get taught and observed slot counts for each teacher in the selected department
  const teacherStats = useMemo(() => {
    const statsMap: Record<string, { taughtCount: number; observedCount: number }> = {};
    deptTeachers.forEach((t: any) => {
      statsMap[t.id] = allTeacherStats[t.id] || { taughtCount: 0, observedCount: 0 };
    });
    return statsMap;
  }, [deptTeachers, allTeacherStats]);

  const getSlotAverageScore = (slot: any) => {
    const isK12 = !["Mầm non"].includes(slot.level);
    const passedEvals = slot.registrations.filter((r: any) => {
      if (!r.evaluation) return false;
      const passed = isK12
        ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined ? r.evaluation.totalScore >= 14 : (r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá"))
        : (r.evaluation.overallRating === "Tốt" || r.evaluation.overallRating === "Khá");
      return passed;
    });
    
    if (passedEvals.length === 0) return null;
    if (!isK12) return "Mầm non";
    
    const sum = passedEvals.reduce((acc: number, curr: any) => acc + (curr.evaluation.totalScore || 0), 0);
    return sum / passedEvals.length;
  };

  const selectedDeptName = departments.find(d => d.id === selectedDeptId)?.name || "Chưa xác định";

  // activeDepartments is defined above


  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-black text-[#0A3230] tracking-tight">Tổng hợp kết quả dự giờ</h1>
        <p className="text-slate-500 text-sm font-medium mt-0.5">
          {isTTCM 
            ? `Quyền hạn Tổ trưởng chuyên môn: Xem báo cáo Tổ ${selectedDeptName}`
            : "Quyền hạn Quản trị viên: Xem báo cáo tổng hợp toàn hệ thống chuyên môn"
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Teachers List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Tabs / Tags */}
          <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm flex flex-wrap gap-1.5 shrink-0">
            {["Phổ thông K-12", "Mầm non", "Điều hành"].map(tab => {
              const isActive = activeBlockTab === tab;
              
              // Count departments belonging to this block
              const deptCount = departments.filter(dept => {
                if (tab === "Phổ thông K-12" && dept.blockCM === "Phổ thông") return true;
                if (tab === "Mầm non" && dept.blockCM === "Mầm Non") return true;
                if (tab === "Điều hành" && dept.blockCM === "Điều hành") return true;
                return false;
              }).length;

              let tabStyle = "";
              if (isActive) {
                if (tab === "Phổ thông K-12") tabStyle = "bg-indigo-600 text-white shadow-md shadow-indigo-100";
                if (tab === "Mầm non") tabStyle = "bg-amber-500 text-white shadow-md shadow-amber-100";
                if (tab === "Điều hành") tabStyle = "bg-teal-600 text-white shadow-md shadow-teal-100";
              } else {
                if (tab === "Phổ thông K-12") tabStyle = "bg-indigo-50/70 text-indigo-600 border border-indigo-100 hover:shadow-xs";
                if (tab === "Mầm non") tabStyle = "bg-amber-50/70 text-amber-600 border border-amber-100 hover:shadow-xs";
                if (tab === "Điều hành") tabStyle = "bg-teal-50/70 text-teal-600 border border-teal-100 hover:shadow-xs";
              }

              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${tabStyle}`}
                >
                  <span>{tab}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {deptCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Department Selector & Teacher Search Card */}
          <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Tổ chuyên môn</label>
              {isTTCM ? (
                <div className="w-full text-sm font-semibold rounded-xl border border-slate-200 p-3.5 bg-slate-50 text-slate-600 flex items-center justify-between">
                  <span>{selectedDeptName}</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-150 rounded text-[9px] font-black uppercase">TTCM</span>
                </div>
              ) : (
                <select 
                  value={selectedDeptId} 
                  onChange={e => { setSelectedDeptId(e.target.value); setSelectedTeacherId(null); setSearchTeacherQuery(""); }}
                  className="w-full text-sm font-semibold rounded-xl border border-slate-200 p-3 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                >
                  {activeDepartments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Teacher Search Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Tìm kiếm giáo viên</label>
              <div className="relative group/search">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within/search:text-[#00A19A] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tìm tên hoặc mã giáo viên..."
                  value={searchTeacherQuery}
                  onChange={e => { setSearchTeacherQuery(e.target.value); setSelectedTeacherId(null); }}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 pl-9 pr-8 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] transition-all outline-none"
                />
                {searchTeacherQuery && (
                  <button onClick={() => { setSearchTeacherQuery(""); setSelectedTeacherId(null); }} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Teachers Statistics List Card */}
          <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm flex-1 flex flex-col min-h-[400px]">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between mb-4">
              <span>Thống kê thành viên ({filteredDeptTeachers.length})</span>
            </h3>
            
            {filteredDeptTeachers.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400">
                <ClipboardList className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-center">Không tìm thấy giáo viên nào.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredDeptTeachers.map(teacher => {
                  const stats = teacherStats[teacher.id] || { taughtCount: 0, observedCount: 0 };
                  const isSelected = selectedTeacherId === teacher.id;
                  return (
                    <button 
                      key={teacher.id} 
                      onClick={() => { setSelectedTeacherId(teacher.id); setSearchSlotQuery(""); setFilterLevel("all"); setFilterGrade("all"); }}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-teal-50/50 border-[#00A19A] shadow-sm"
                          : "bg-slate-50/50 border-slate-150 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-xs font-black truncate ${isSelected ? "text-[#00A19A]" : "text-slate-800"}`}>
                          {teacher.teacherName}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          Mã GV: {teacher.teacherCode}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg text-[9px] font-black uppercase">
                          Dạy: {stats.taughtCount}
                        </span>
                        <span className="px-2 py-0.5 bg-violet-50 border border-violet-100 text-violet-600 rounded-lg text-[9px] font-black uppercase">
                          Dự: {stats.observedCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Teacher Details */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm min-h-[500px] flex flex-col">
          {!selectedTeacherId ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-12">
              <ClipboardList className="w-16 h-16 stroke-1 text-slate-200 mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider">Chọn giáo viên để xem chi tiết tiết dạy</p>
              <p className="text-[10px] text-slate-400 mt-1">Danh sách tiết dạy, ĐTB chung và các phiếu đánh giá chi tiết của giáo viên sẽ xuất hiện tại đây.</p>
            </div>
          ) : (() => {
            const selTeacher = teachers.find(t => t.id === selectedTeacherId);
            const selTeacherSlots = initialSlots.filter(s => s.teacherId === selectedTeacherId);
            
            // Local filter logic for slots
            const filteredSlots = selTeacherSlots.filter(slot => {
              const matchQuery = !searchSlotQuery || 
                slot.topic.toLowerCase().includes(searchSlotQuery.toLowerCase()) ||
                (slot.className && slot.className.toLowerCase().includes(searchSlotQuery.toLowerCase()));
              const matchLevel = filterLevel === "all" || slot.level === filterLevel;
              const matchGrade = filterGrade === "all" || slot.grade === filterGrade;
              return matchQuery && matchLevel && matchGrade;
            });

            return (
              <div className="space-y-4 flex-1 flex flex-col text-slate-800">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-slate-800">{selTeacher?.teacherName}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Mã GV: {selTeacher?.teacherCode}</p>
                  </div>
                  <span className="px-3 py-1 bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20 rounded-xl text-xs font-black">
                    {filteredSlots.length} / {selTeacherSlots.length} tiết dạy
                  </span>
                </div>

                {/* Slot Search & Filter controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-150 shrink-0">
                  <div className="md:col-span-6 relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm chủ đề, lớp học..."
                      value={searchSlotQuery}
                      onChange={e => setSearchSlotQuery(e.target.value)}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-200 pl-9 pr-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select 
                      value={filterLevel} 
                      onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all"); }}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                    >
                      <option value="all">Mọi cấp học</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="THCS">THCS</option>
                      <option value="THPT">THPT</option>
                      <option value="Mầm non">Mầm non</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <select 
                      value={filterGrade} 
                      onChange={e => setFilterGrade(e.target.value)}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                    >
                      <option value="all">Mọi khối</option>
                      {Array.from(new Set(selTeacherSlots.map(s => s.grade))).sort().map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400">
                    <ClipboardList className="w-12 h-12 stroke-1 text-slate-200 mb-2" />
                    <p className="text-xs font-bold">Không tìm thấy tiết dạy tương ứng.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredSlots.map(slot => {
                      const avgScore = getSlotAverageScore(slot);
                      const slotDate = new Date(slot.date);
                      const isK12 = !["Mầm non"].includes(slot.level);
                      const evals = slot.registrations.filter((r: any) => r.evaluation !== null);

                      return (
                        <div key={slot.id} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-4">
                          {/* Slot Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 pb-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-1.5 py-0.2 text-[8px] font-extrabold bg-sky-50 text-sky-600 border border-sky-200 rounded uppercase tracking-wider">{slot.level}</span>
                                <span className="px-1.5 py-0.2 text-[8px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 rounded uppercase tracking-wider">{slot.grade}</span>
                                <span className="px-1.5 py-0.2 text-[8px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 rounded uppercase tracking-wider">{slot.startTime}</span>
                                <span className="text-[10px] font-bold text-slate-400">{slotDate.toLocaleDateString("vi-VN")}</span>
                                {slot.className && <span className="px-1.5 py-0.2 text-[8px] font-bold bg-slate-200/50 text-slate-600 border border-slate-300/30 rounded">Lớp: {slot.className}</span>}
                              </div>
                              <h4 className="font-black text-[15px] text-[#00A19A] mt-1.5 tracking-tight">{slot.topic}</h4>
                            </div>
                            <div className="shrink-0 text-right">
                              {avgScore !== null ? (
                                <span className="px-2.5 py-1 bg-[#00A19A]/10 text-[#00A19A] border-[#00A19A]/20 rounded-lg font-black text-xs">
                                  ĐTB chung: {typeof avgScore === "number" ? `${avgScore.toFixed(2)}/20.00đ` : avgScore}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg font-bold text-xs">
                                  ĐTB chung: --
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Observers Evaluations Detail */}
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Chi tiết đánh giá của từng Giáo viên dự ({evals.length})</h5>
                            {evals.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Chưa nhận được phiếu đánh giá nào.</p>
                            ) : (
                              <div className="space-y-3">
                                {evals.map((reg: any) => {
                                  const evalData = reg.evaluation;
                                  const passed = isK12
                                    ? (evalData.totalScore !== null && evalData.totalScore !== undefined ? evalData.totalScore >= 14 : (evalData.overallRating === "Giỏi" || evalData.overallRating === "Khá"))
                                    : (evalData.overallRating === "Tốt" || evalData.overallRating === "Khá");

                                  return (
                                    <div key={reg.id} className="p-3 bg-white border border-slate-200/60 rounded-xl space-y-2.5">
                                      {/* Observer Header */}
                                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                        <div className="min-w-0">
                                          <p className="text-xs font-black text-slate-800">{reg.teacher?.teacherName}</p>
                                          <p className="text-[9px] text-slate-400 font-bold">Mã GV: {reg.teacher?.teacherCode}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-violet-50 text-violet-600 border border-violet-150">
                                            {evalData.totalScore !== null && evalData.totalScore !== undefined
                                              ? `${evalData.totalScore.toFixed(2)}đ`
                                              : evalData.overallRating}
                                          </span>
                                          {passed ? (
                                            <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-emerald-50 text-emerald-600 border border-emerald-150 uppercase tracking-wider">ĐẠT</span>
                                          ) : (
                                            <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-rose-50 text-rose-600 border border-rose-150 uppercase tracking-wider">CHƯA ĐẠT</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Requirement Scores badges */}
                                      <div className="flex flex-wrap gap-1">
                                        {isK12 ? (
                                          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => {
                                            const scoreKey = `score${num}`;
                                            const scoreVal = evalData[scoreKey] !== null && evalData[scoreKey] !== undefined
                                              ? Number(evalData[scoreKey])
                                              : 0;
                                            const maxScores = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
                                            const maxVal = maxScores[num - 1];
                                            const isPassed = scoreVal >= maxVal * 0.5;

                                            let stdClass = "";
                                            let labelTextClass = "";
                                            if (isPassed) {
                                              if (num <= 2) {
                                                stdClass = "bg-teal-50 text-teal-600 border-teal-150";
                                                labelTextClass = "text-teal-600/60 font-bold";
                                              } else if (num <= 5) {
                                                stdClass = "bg-sky-50 text-sky-600 border-sky-150";
                                                labelTextClass = "text-sky-600/60 font-bold";
                                              } else if (num <= 9) {
                                                stdClass = "bg-indigo-50 text-indigo-600 border-indigo-150";
                                                labelTextClass = "text-indigo-600/60 font-bold";
                                              } else {
                                                stdClass = "bg-amber-50 text-amber-600 border-amber-150";
                                                labelTextClass = "text-amber-600/60 font-bold";
                                              }
                                            } else {
                                              stdClass = "bg-rose-50/70 text-rose-500 border-rose-100";
                                              labelTextClass = "text-rose-300 font-bold";
                                            }

                                            return (
                                              <span key={num} className={`inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-extrabold border rounded ${stdClass}`}>
                                                <span className={labelTextClass}>Y{num}:</span>
                                                <span>{scoreVal.toFixed(1)}</span>
                                              </span>
                                            );
                                          })
                                        ) : (
                                          [1, 2, 3, 4, 5].map((num) => {
                                            const critKey = `criterion${num}`;
                                            const ratingLabels: Record<number, string> = { 4: "Tốt", 3: "Khá", 2: "Tr.bình", 1: "Yếu" };
                                            const critVal = evalData[critKey] !== null && evalData[critKey] !== undefined
                                              ? evalData[critKey]
                                              : 0;
                                            const critLabel = ratingLabels[critVal] || "-";
                                            const isPassed = critVal >= 3;
                                            return (
                                              <span key={num} className={`inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-extrabold border rounded ${
                                                isPassed 
                                                  ? "bg-[#00A19A]/5 text-[#00A19A] border-[#00A19A]/15" 
                                                  : "bg-rose-50/70 text-rose-500 border-rose-100"
                                              }`}>
                                                <span className={isPassed ? "text-[#00A19A]/60 font-bold" : "text-rose-300 font-bold"}>T{num}:</span>
                                                <span>{critLabel}</span>
                                              </span>
                                            );
                                          })
                                        )}
                                      </div>

                                      {/* Strengths & Improvements */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-600 border-t border-slate-100 pt-2 font-medium">
                                        {evalData.strengths && (
                                          <div>
                                            <span className="font-extrabold text-slate-800 block">✓ Ưu điểm:</span>
                                            <span className="italic block mt-0.5">{evalData.strengths}</span>
                                          </div>
                                        )}
                                        {evalData.improvements && (
                                          <div>
                                            <span className="font-extrabold text-slate-800 block">⚠ Góp ý:</span>
                                            <span className="italic block mt-0.5">{evalData.improvements}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  )
}
