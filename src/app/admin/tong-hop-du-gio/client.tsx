"use client"

import { useState, useMemo } from "react"
import { 
  ClipboardList, CheckCircle, PieChart, FileText, Calendar, Layers,
  ChevronDown, ChevronUp, AlertCircle, Plus, Search, X, Check,
  BookOpen, User, Award, ThumbsUp, MessageSquare
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

const maxScoresK12 = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
const k12Labels = [
  "Y1: Chuẩn bị giáo án, bám sát kiến thức kỹ năng",
  "Y2: Sử dụng đồ dùng, thiết bị dạy học phù hợp",
  "Y3: Nội dung bài giảng chính xác, khoa học",
  "Y4: Đảm bảo tính hệ thống, trọng tâm bài dạy",
  "Y5: Liên hệ thực tế đời sống, tính giáo dục",
  "Y6: Không đọc chép, hỗ trợ kịp thời học sinh",
  "Y7: Tổ chức học tập chủ động, hợp tác nhóm",
  "Y8: Linh hoạt các khâu, phân phối thời gian hợp lý",
  "Y9: Kết hợp các phương pháp, khuyến khích tư duy",
  "Y10: Đánh giá quá trình học, học sinh nắm vững bài",
  "Y11: Tiết dạy nhuần nhuyễn, sinh động, sáng tạo"
];

const preschoolLabels = [
  "T1: Nội dung bài dạy phù hợp, chính xác",
  "T2: Phương pháp giảng dạy hiệu quả, sáng tạo",
  "T3: Tổ chức hoạt động học tập tích cực",
  "T4: Sử dụng CNTT và phương tiện dạy học",
  "T5: Kết quả học tập và tương tác của học sinh"
];

export function AdminTongHopClient({
  initialSlots, currentTeacher, subjects, departments, teachers, campuses, classes, initialFilters, isTTCM, isSuperAdmin
}: AdminTongHopClientProps) {
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
  const [activeDetailTab, setActiveDetailTab] = useState("to-cm")
  
  // Search & Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("")
  const [searchSlotQuery, setSearchSlotQuery] = useState("")
  const [filterLevel, setFilterLevel] = useState("all")
  const [filterGrade, setFilterGrade] = useState("all")

  // Extract all unique months from initialSlots
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    initialSlots.forEach(s => {
      if (s.date) {
        const d = new Date(s.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}-${mm}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [initialSlots]);

  // 1. Compute taught and observed slot counts for all teachers in the system
  const allTeacherStats = useMemo(() => {
    const statsMap: Record<string, { 
      taughtCount: number; 
      observedCount: number;
      taughtMamNon: number;
      taughtPhoThong: number;
      observedMamNon: number;
      observedPhoThong: number;
    }> = {};
    
    // Initialize stats for each teacher
    teachers.forEach((t: any) => {
      statsMap[t.id] = { 
        taughtCount: 0, 
        observedCount: 0,
        taughtMamNon: 0,
        taughtPhoThong: 0,
        observedMamNon: 0,
        observedPhoThong: 0
      };
    });

    // Loop through all slots to calculate counts
    initialSlots.forEach((slot: any) => {
      // Filter by month
      if (selectedMonth !== "all") {
        const d = new Date(slot.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        if (`${yyyy}-${mm}` !== selectedMonth) {
          return;
        }
      }

      const isMamNon = slot.level === "Mầm non" || 
                       (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");

      // Taught count (Host)
      if (statsMap[slot.teacherId]) {
        const hasEvaluations = slot.registrations.some((r: any) => r.evaluation !== null);
        if (hasEvaluations) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[slot.teacherId].taughtCount += increment;
          if (isMamNon) {
            statsMap[slot.teacherId].taughtMamNon += increment;
          } else {
            statsMap[slot.teacherId].taughtPhoThong += increment;
          }
        }
      }

      // Observed count (Observer)
      slot.registrations.forEach((reg: any) => {
        if (reg.isApproved && reg.evaluation && statsMap[reg.teacherId]) {
          const increment = slot.isDoublePeriod ? 2 : 1;
          statsMap[reg.teacherId].observedCount += increment;
          if (isMamNon) {
            statsMap[reg.teacherId].observedMamNon += increment;
          } else {
            statsMap[reg.teacherId].observedPhoThong += increment;
          }
        }
      });
    });

    return statsMap;
  }, [teachers, initialSlots, selectedMonth]);

  const handleTabChange = (tab: string) => {
    setActiveBlockTab(tab);
    setSelectedTeacherId(null);
    setActiveDetailTab("to-cm");
    searchTeacherQuery !== "" && setSearchTeacherQuery("");
    
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
    const statsMap: Record<string, { 
      taughtCount: number; 
      observedCount: number;
      taughtMamNon: number;
      taughtPhoThong: number;
      observedMamNon: number;
      observedPhoThong: number;
    }> = {};
    deptTeachers.forEach((t: any) => {
      statsMap[t.id] = allTeacherStats[t.id] || { 
        taughtCount: 0, 
        observedCount: 0,
        taughtMamNon: 0,
        taughtPhoThong: 0,
        observedMamNon: 0,
        observedPhoThong: 0
      };
    });
    return statsMap;
  }, [deptTeachers, allTeacherStats]);

  const departmentSummary = useMemo(() => {
    let taughtMamNon = 0;
    let taughtPhoThong = 0;
    let observedMamNon = 0;
    let observedPhoThong = 0;

    deptTeachers.forEach((t: any) => {
      const stats = teacherStats[t.id] || { taughtMamNon: 0, taughtPhoThong: 0, observedMamNon: 0, observedPhoThong: 0 };
      taughtMamNon += stats.taughtMamNon || 0;
      taughtPhoThong += stats.taughtPhoThong || 0;
      observedMamNon += stats.observedMamNon || 0;
      observedPhoThong += stats.observedPhoThong || 0;
    });

    return {
      taughtMamNon,
      taughtPhoThong,
      observedMamNon,
      observedPhoThong
    };
  }, [deptTeachers, teacherStats]);

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-[#00A19A] rounded-xl border border-teal-100">
              <PieChart className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-[#0A3230] tracking-tight">Tổng hợp kết quả dự giờ</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1.5 ml-1">
            {isTTCM 
              ? "Quyền hạn Tổ trưởng chuyên môn: Xem báo cáo Tổ " + selectedDeptName
              : "Quyền hạn Quản trị viên: Xem báo cáo tổng hợp toàn hệ thống chuyên môn"
            }
          </p>
        </div>

        {/* Horizontal Statistics Summary */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 text-xs shrink-0 shadow-sm backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-slate-400"/> Tổng tiết dạy:
            </span>
            <span className="px-2.5 py-1 bg-amber-50/60 text-amber-700 border border-amber-200 rounded-lg font-black text-[10px] tracking-wide shadow-2xs">
              MẦM NON: {departmentSummary.taughtMamNon}
            </span>
            <span className="px-2.5 py-1 bg-indigo-50/60 text-indigo-700 border border-indigo-200 rounded-lg font-black text-[10px] tracking-wide shadow-2xs">
              PHỔ THÔNG: {departmentSummary.taughtPhoThong}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-slate-400"/> Tổng tiết dự:
            </span>
            <span className="px-2.5 py-1 bg-amber-50/60 text-amber-700 border border-amber-200 rounded-lg font-black text-[10px] tracking-wide shadow-2xs">
              MẦM NON: {departmentSummary.observedMamNon}
            </span>
            <span className="px-2.5 py-1 bg-violet-50/60 text-violet-700 border border-violet-200 rounded-lg font-black text-[10px] tracking-wide shadow-2xs">
              PHỔ THÔNG: {departmentSummary.observedPhoThong}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Teachers List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Tabs / Tags with gorgeous gradient hover effects */}
          <div className="bg-slate-100/80 border border-slate-200/60 rounded-2xl p-1.5 shadow-xs flex flex-wrap gap-1 shrink-0">
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
                if (tab === "Phổ thông K-12") tabStyle = "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-100/50 scale-[1.01]";
                if (tab === "Mầm non") tabStyle = "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-100/50 scale-[1.01]";
                if (tab === "Điều hành") tabStyle = "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-100/50 scale-[1.01]";
              } else {
                if (tab === "Phổ thông K-12") tabStyle = "bg-white/80 hover:bg-white text-indigo-600 border border-slate-200 hover:border-indigo-300 hover:shadow-2xs";
                if (tab === "Mầm non") tabStyle = "bg-white/80 hover:bg-white text-amber-600 border border-slate-200 hover:border-amber-300 hover:shadow-2xs";
                if (tab === "Điều hành") tabStyle = "bg-white/80 hover:bg-white text-teal-600 border border-slate-200 hover:border-teal-300 hover:shadow-2xs";
              }

              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={"flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all duration-300 " + tabStyle}
                >
                  <span>{tab}</span>
                  <span className={"px-2 py-0.5 rounded-full text-[9px] font-black leading-none transition-colors duration-300 " + (isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500 border border-slate-200/50")}>
                    {deptCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Department Selector & Teacher Search Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md shadow-slate-100/30 space-y-4 relative overflow-hidden border-t-4 border-t-[#00A19A]">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổ chuyên môn</label>
              {isTTCM ? (
                <div className="w-full text-sm font-bold rounded-xl border border-slate-200 p-3.5 bg-slate-50 text-slate-700 flex items-center justify-between">
                  <span>{selectedDeptName}</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-150 rounded text-[9px] font-black uppercase">TTCM</span>
                </div>
              ) : (
                <select 
                  value={selectedDeptId} 
                  onChange={e => { setSelectedDeptId(e.target.value); setSelectedTeacherId(null); setSearchTeacherQuery(""); setActiveDetailTab("to-cm"); }}
                  className="w-full text-sm font-semibold rounded-xl border border-slate-250 p-3 bg-slate-50/50 hover:bg-slate-50 text-slate-800 focus:bg-white focus:border-[#00A19A] focus:ring-4 focus:ring-[#00A19A]/10 transition-all outline-none appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2523475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_1rem_center] bg-no-repeat pr-8"
                >
                  {activeDepartments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Month Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lọc theo Tháng</label>
              <select 
                value={selectedMonth} 
                onChange={e => { setSelectedMonth(e.target.value); setSelectedTeacherId(null); setActiveDetailTab("to-cm"); }}
                className="w-full text-sm font-semibold rounded-xl border border-slate-250 p-3 bg-slate-50/50 hover:bg-slate-50 text-slate-800 focus:bg-white focus:border-[#00A19A] focus:ring-4 focus:ring-[#00A19A]/10 transition-all outline-none appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2523475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_1rem_center] bg-no-repeat pr-8"
              >
                <option value="all">Tất cả các tháng</option>
                {availableMonths.map(m => {
                  const [year, month] = m.split("-");
                  return <option key={m} value={m}>{"Tháng " + month + "/" + year}</option>;
                })}
              </select>
            </div>

            {/* Teacher Search Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tìm kiếm giáo viên</label>
              <div className="relative group/search">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within/search:text-[#00A19A] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tìm tên hoặc mã giáo viên..."
                  value={searchTeacherQuery}
                  onChange={e => { setSearchTeacherQuery(e.target.value); setSelectedTeacherId(null); setActiveDetailTab("to-cm"); }}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 pl-9 pr-8 py-3 bg-slate-50/50 text-slate-850 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-[#00A19A]/10 focus:border-[#00A19A] transition-all outline-none"
                />
                {searchTeacherQuery && (
                  <button onClick={() => { setSearchTeacherQuery(""); setSelectedTeacherId(null); setActiveDetailTab("to-cm"); }} className="absolute right-3 top-3.5 text-slate-450 hover:text-slate-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Teachers Statistics List Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md shadow-slate-100/30 flex-1 flex flex-col min-h-[400px]">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-3.5 border-b border-slate-100 flex items-center justify-between mb-4">
              <span>Thành viên ({filteredDeptTeachers.length})</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-550 border border-slate-200 text-[10px] rounded-lg font-extrabold uppercase">TỔ CM</span>
            </h3>

            {filteredDeptTeachers.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400">
                <ClipboardList className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-center">Không tìm thấy giáo viên nào.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredDeptTeachers.map(teacher => {
                  const stats = teacherStats[teacher.id] || { 
                    taughtCount: 0, 
                    observedCount: 0,
                    taughtMamNon: 0,
                    taughtPhoThong: 0,
                    observedMamNon: 0,
                    observedPhoThong: 0
                  };
                  const isSelected = selectedTeacherId === teacher.id;
                  return (
                    <button 
                      key={teacher.id} 
                      onClick={() => { setSelectedTeacherId(teacher.id); setSearchSlotQuery(""); setFilterLevel("all"); setFilterGrade("all"); setActiveDetailTab("lich-su"); }}
                      className={"w-full text-left p-3.5 rounded-2xl border transition-all duration-305 flex items-center justify-between gap-3 " + (
                        isSelected
                          ? "bg-gradient-to-r from-teal-50/70 to-emerald-50/20 border-[#00A19A] shadow-xs shadow-teal-50 scale-[1.01]"
                          : "bg-slate-50/30 border-slate-150 hover:bg-slate-50/80 hover:border-slate-300 hover:scale-[1.005]"
                      )}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className={"w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 " + (
                          isSelected ? "bg-[#00A19A] text-white" : "bg-slate-150 text-slate-650"
                        )}>
                          {teacher.teacherName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className={"text-xs font-extrabold truncate " + (isSelected ? "text-[#00A19A]" : "text-slate-800")}>
                            {teacher.teacherName}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            Mã GV: {teacher.teacherCode}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider">
                          <span className="text-slate-450 font-bold text-[7px]">Dạy:</span>
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded font-bold">{stats.taughtCount} tiết</span>
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider">
                          <span className="text-slate-450 font-bold text-[7px]">Dự:</span>
                          <span className="px-1.5 py-0.2 bg-violet-50 text-violet-700 border border-violet-200/60 rounded font-bold">{stats.observedCount} tiết</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Teacher Details */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md shadow-slate-100/30 min-h-[500px] flex flex-col border-t-4 border-t-[#0A3230]">
          {/* Tab Switcher */}
          <div className="flex gap-4 border-b border-slate-100 pb-2 shrink-0 text-xs mb-4">
            <button 
              onClick={() => setActiveDetailTab("lich-su")}
              className={"pb-2 px-1 font-extrabold border-b-2 transition-all duration-200 " + (activeDetailTab === "lich-su" ? "border-[#00A19A] text-[#00A19A]" : "border-transparent text-slate-400 hover:text-slate-650")}
            >
              Lịch sử tiết dạy
            </button>
            <button 
              onClick={() => setActiveDetailTab("phan-tich")}
              className={"pb-2 px-1 font-extrabold border-b-2 transition-all duration-200 " + (activeDetailTab === "phan-tich" ? "border-[#00A19A] text-[#00A19A]" : "border-transparent text-slate-400 hover:text-slate-650")}
            >
              Phân tích Năng lực & Điểm yếu
            </button>
            <button
              onClick={() => setActiveDetailTab("to-cm")}
              className={"pb-2 px-1 font-extrabold border-b-2 transition-all duration-200 " + (activeDetailTab === "to-cm" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-400 hover:text-slate-650")}
            >
              🏫 Năng lực Tổ CM
            </button>
          </div>

          {/* Tab Content */}
          {activeDetailTab === "to-cm" ? (
            (() => {
              const dep = []; const ids = new Set(deptTeachers.map(t => t.id));
              initialSlots.forEach(sl => {
                if (!ids.has(sl.teacherId)) return;
                if (selectedMonth !== "all") {
                  const d2 = new Date(sl.date);
                  const mm2 = String(d2.getMonth() + 1).padStart(2, "0");
                  if (d2.getFullYear() + "-" + mm2 !== selectedMonth) return;
                }
                sl.registrations.forEach(r => { if (r.evaluation) dep.push({ ev: r.evaluation, lv: sl.level }); });
              });
              const di = activeDepartments.find(d => d.id === selectedDeptId);
              const dmn = di ? di.blockCM === "Mầm Non" : false;
              const dc = [], dw = [];
              if (dep.length > 0) {
                if (!dmn) {
                  for (let i = 1; i <= 11; i++) {
                    const sk = "score" + i, mx = maxScoresK12[i - 1];
                    const sm = dep.reduce((a, x) => a + (x.ev[sk] || 0), 0), av = sm / dep.length, pt = Math.round((av / mx) * 100);
                    const lc = dep.filter(x => { const v = x.ev[sk] !== null ? Number(x.ev[sk]) : 0; return v < mx * 0.7; }).length, lp = Math.round((lc / dep.length) * 100);
                    dc.push({ id: "Y" + i, lb: k12Labels[i - 1], av, mx, pt, std: i <= 2 ? 1 : i <= 5 ? 2 : i <= 9 ? 3 : 4 });
                    dw.push({ id: "Y" + i, lb: k12Labels[i - 1], lc, lp, pt });
                  }
                } else {
                  for (let i = 1; i <= 5; i++) {
                    const ck = "criterion" + i;
                    const sm = dep.reduce((a, x) => a + (x.ev[ck] || 0), 0), av = sm / dep.length, pt = Math.round((av / 4) * 100);
                    const lc = dep.filter(x => (x.ev[ck] || 0) <= 2).length, lp = Math.round((lc / dep.length) * 100);
                    dc.push({ id: "T" + i, lb: preschoolLabels[i - 1], av, mx: 4, pt, std: 1 });
                    dw.push({ id: "T" + i, lb: preschoolLabels[i - 1], lc, lp, pt });
                  }
                }
              }
              const dsw = [...dw].sort((a, b) => b.lp - a.lp);
              const tp2 = dmn ? 5 : 11, as2 = (2 * Math.PI) / tp2, ce = 150, rd = 100;
              const gl2 = [25, 50, 75, 100];
              const gp2 = gl2.map(lv => {
                const pts = [];
                for (let i = 0; i < tp2; i++) { const a = i * as2, rv = rd * (lv / 100); pts.push((ce + rv * Math.sin(a)) + "," + (ce - rv * Math.cos(a))); }
                return pts.join(" ");
              });
              const al2 = [];
              for (let i = 0; i < tp2; i++) { const a = i * as2; al2.push({ x1: ce, y1: ce, x2: ce + rd * Math.sin(a), y2: ce - rd * Math.cos(a), lb: (dmn ? "T" : "Y") + (i + 1), lx: ce + (rd + 20) * Math.sin(a), ly: ce - (rd + 20) * Math.cos(a) }); }
              const dvp = dc.map((d, i) => { const a = i * as2, rv = rd * (d.pt / 100); return (ce + rv * Math.sin(a)) + "," + (ce - rv * Math.cos(a)); });
              const dvpath = dvp.join(" ");
              return (
                <div className="space-y-6 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                  <div className="bg-gradient-to-r from-violet-50/60 to-indigo-50/30 border border-violet-200/60 rounded-2xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-white text-violet-600 rounded-xl border border-violet-200 shrink-0"><Layers className="w-5 h-5" /></div>
                    <div><h4 className="font-black text-sm text-[#0A3230]">{selectedDeptName}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Tổng hợp toàn Tổ · {dep.length} phiếu · {deptTeachers.length} GV</p></div>
                  </div>
                  {dep.length === 0 ? (
                    <div className="flex flex-col items-center py-16"><PieChart className="w-10 h-10 stroke-1 text-slate-300 mb-3" />
                      <p className="text-xs font-black text-slate-400">Chưa có dữ liệu đánh giá</p></div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        <div className="md:col-span-5 flex justify-center">
                          <div className="flex flex-col items-center bg-slate-50/50 p-4 rounded-3xl border border-slate-200/60">
                            <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-2">Bản đồ Năng lực Tổ CM</span>
                            <svg width="250" height="250" viewBox="0 0 300 300" className="overflow-visible">
                              {gl2.map((lv, ix) => <polygon key={lv} points={gp2[ix]} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray={lv === 100 ? "none" : "3,3"} />)}
                              {gl2.map(lv => <text key={lv} x={ce} y={ce - rd * (lv / 100) + 4} textAnchor="middle" className="text-[8px] fill-slate-400">{lv}%</text>)}
                              {al2.map((ax, ix) => <g key={ix}><line x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2} stroke="#e2e8f0" strokeWidth="1" /><text x={ax.lx} y={ax.ly + 4} textAnchor="middle" className="text-[10px] font-extrabold fill-[#0A3230]">{ax.lb}</text></g>)}
                              {dvp.length > 0 && <polygon points={dvpath} fill="rgba(124,58,237,0.12)" stroke="#7c3aed" strokeWidth="2.5" />}
                              {dc.map((d, i) => { const a = i * as2, rv = rd * (d.pt / 100), px = ce + rv * Math.sin(a), py = ce - rv * Math.cos(a); return <circle key={i} cx={px} cy={py} r="4" fill="#fff" stroke="#7c3aed" strokeWidth="2.5" />; })}
                            </svg>
                          </div>
                        </div>
                        <div className="md:col-span-7 space-y-3 bg-slate-50/30 p-4 rounded-3xl border border-slate-200/60">
                          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Award className="w-4 h-4 text-violet-600" /><span>Năng lực dạy học toàn Tổ</span></h4>
                          <div className="space-y-3">{dc.map(item => {
                            let cl2 = "from-violet-500 to-indigo-500";
                            if (item.std === 1) cl2 = "from-teal-500 to-emerald-500";
                            else if (item.std === 2) cl2 = "from-sky-500 to-blue-500";
                            else if (item.std === 3) cl2 = "from-indigo-500 to-violet-500";
                            else cl2 = "from-amber-500 to-orange-500";
                            return (<div key={item.id} className="space-y-1"><div className="flex justify-between text-xs"><span className="font-bold text-slate-700 text-[10px] truncate max-w-[200px]">{item.id}. {item.lb.split(":")[1] || item.lb}</span><span className="font-black text-slate-500 text-[10px]">{item.av.toFixed(2)}/{item.mx.toFixed(1)}đ ({item.pt}%)</span></div><div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className={"h-full rounded-full bg-gradient-to-r " + cl2} style={{ width: item.pt + "%" }} /></div></div>);
                          })}</div>
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 space-y-4">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-3"><AlertCircle className="w-4 h-4 text-rose-500" /><span>Điểm yếu toàn Tổ CM</span></h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{dsw.slice(0, 6).map((w, ix) => {
                          const isH = w.lp >= 40, isM = w.lp >= 15 && w.lp < 40;
                          let bc = "border-slate-200", bg = "bg-slate-50/50", bdg = "bg-slate-100 text-slate-550 border-slate-200";
                          if (isH) { bc = "border-rose-200 border-l-4 border-l-rose-500"; bg = "bg-rose-50/30"; bdg = "bg-rose-50 text-rose-700 border-rose-250"; }
                          else if (isM) { bc = "border-amber-200 border-l-4 border-l-amber-500"; bg = "bg-amber-50/30"; bdg = "bg-amber-50 text-amber-700 border-amber-250"; }
                          return (<div key={w.id} className={"p-3.5 border rounded-2xl flex items-center justify-between gap-3 " + bg + " " + bc}><div className="min-w-0"><span className="text-[9px] font-black text-slate-400 block uppercase">Ưu tiên {ix + 1}</span><h5 className="font-extrabold text-xs truncate mt-0.5">{w.id}. {w.lb.split(":")[1] || w.lb}</h5><p className="text-[9px] text-slate-400 mt-0.5">TB: {w.pt}%</p></div><div className="shrink-0 text-right"><span className={"px-2 py-0.5 rounded-lg text-[10px] font-black border " + bdg}>{w.lp}% Điểm yếu</span><span className="block text-[8px] text-slate-400 mt-1">{w.lc}/{dep.length} phiếu</span></div></div>);
                        })}</div>
                        {dsw[0] && dsw[0].lp > 0 && (<div className="bg-gradient-to-r from-violet-50/40 to-indigo-50/20 border border-violet-200 rounded-2xl p-4 flex gap-3 items-start mt-3"><div className="p-2 bg-white text-violet-600 rounded-xl border border-violet-200 shrink-0"><MessageSquare className="w-4 h-4" /></div><div><h6 className="font-black text-xs text-[#0A3230] uppercase">Đề xuất phát triển Tổ CM</h6><p className="text-[10.5px] text-slate-600 mt-1">Tỷ lệ điểm yếu cao nhất: <span className="font-black text-rose-700">{dsw[0].id} ({dsw[0].lp}%)</span>. Đề xuất sinh hoạt chuyên môn tập trung vào các năng lực này.</p></div></div>)}
                      </div>
                    </>
                  )}
                </div>
              );
            })()
          ) : !selectedTeacherId ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-16">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-350 mb-4 shadow-2xs">
                <User className="w-8 h-8 stroke-1" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Chọn giáo viên để xem chi tiết tiết dạy</p>
              <p className="text-[11px] text-slate-400 mt-1.5 text-center max-w-sm leading-relaxed">Danh sách tiết dạy, điểm trung bình chung và các phiếu đánh giá chi tiết của giáo viên sẽ xuất hiện tại đây.</p>
            </div>
          ) : (() => {
            const selTeacher = teachers.find(t => t.id === selectedTeacherId);
            const selTeacherSlots = initialSlots.filter(s => {
              if (s.teacherId !== selectedTeacherId) return false;
              if (selectedMonth !== "all") {
                const d = new Date(s.date);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                return yyyy + "-" + mm === selectedMonth;
              }
              return true;
            });
            
            const filteredSlots = selTeacherSlots.filter(slot => {
              const matchQuery = !searchSlotQuery || 
                slot.topic.toLowerCase().includes(searchSlotQuery.toLowerCase()) ||
                (slot.className && slot.className.toLowerCase().includes(searchSlotQuery.toLowerCase()));
              const matchLevel = filterLevel === "all" || slot.level === filterLevel;
              const matchGrade = filterGrade === "all" || slot.grade === filterGrade;
              return matchQuery && matchLevel && matchGrade;
            });

            // Prepare evaluations data
            const evaluations = [];
            selTeacherSlots.forEach(slot => {
              slot.registrations.forEach(reg => {
                if (reg.evaluation) {
                  evaluations.push({
                    evaluation: reg.evaluation,
                    level: slot.level,
                    topic: slot.topic,
                    date: slot.date
                  });
                }
              });
            });

            const isPreschool = selTeacherSlots.length > 0
              ? selTeacherSlots.every(s => ["Mầm non"].includes(s.level))
              : (selTeacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non");

            const competencyData = [];
            const weaknessData = [];

            if (evaluations.length > 0) {
              if (!isPreschool) {
                for (let i = 1; i <= 11; i++) {
                  const scoreKey = "score" + i;
                  const maxVal = maxScoresK12[i - 1];
                  const sum = evaluations.reduce((acc, curr) => acc + (curr.evaluation[scoreKey] || 0), 0);
                  const avg = sum / evaluations.length;
                  const pct = Math.round((avg / maxVal) * 100);

                  const lowCount = evaluations.filter(curr => {
                    const val = curr.evaluation[scoreKey] !== null ? Number(curr.evaluation[scoreKey]) : 0;
                    return val < maxVal * 0.70;
                  }).length;
                  const lowPct = Math.round((lowCount / evaluations.length) * 100);

                  competencyData.push({
                    id: "Y" + i,
                    label: k12Labels[i - 1],
                    avg: avg,
                    max: maxVal,
                    pct: pct,
                    standard: i <= 2 ? 1 : i <= 5 ? 2 : i <= 9 ? 3 : 4
                  });

                  weaknessData.push({
                    id: "Y" + i,
                    label: k12Labels[i - 1],
                    lowCount: lowCount,
                    lowPct: lowPct,
                    avgPct: pct
                  });
                }
              } else {
                for (let i = 1; i <= 5; i++) {
                  const critKey = "criterion" + i;
                  const sum = evaluations.reduce((acc, curr) => acc + (curr.evaluation[critKey] || 0), 0);
                  const avg = sum / evaluations.length;
                  const pct = Math.round((avg / 4) * 100);

                  const lowCount = evaluations.filter(curr => (curr.evaluation[critKey] || 0) <= 2).length;
                  const lowPct = Math.round((lowCount / evaluations.length) * 100);

                  competencyData.push({
                    id: "T" + i,
                    label: preschoolLabels[i - 1],
                    avg: avg,
                    max: 4,
                    pct: pct,
                    standard: 1
                  });

                  weaknessData.push({
                    id: "T" + i,
                    label: preschoolLabels[i - 1],
                    lowCount: lowCount,
                    lowPct: lowPct,
                    avgPct: pct
                  });
                }
              }
            }

            const sortedWeaknesses = [...weaknessData].sort((a, b) => b.lowPct - a.lowPct);

            const renderRadarChart = () => {
              const size = 300;
              const center = size / 2;
              const radius = 100;
              const totalPoints = isPreschool ? 5 : 11;
              const angleStep = (2 * Math.PI) / totalPoints;

              const gridLayers = [25, 50, 75, 100];
              const gridPaths = gridLayers.map(level => {
                const points = [];
                for (let i = 0; i < totalPoints; i++) {
                  const angle = i * angleStep;
                  const r = radius * (level / 100);
                  const x = center + r * Math.sin(angle);
                  const y = center - r * Math.cos(angle);
                  points.push(x + "," + y);
                }
                return points.join(" ");
              });

              const axisLines = [];
              for (let i = 0; i < totalPoints; i++) {
                const angle = i * angleStep;
                const x = center + radius * Math.sin(angle);
                const y = center - radius * Math.cos(angle);
                axisLines.push({ 
                  x1: center, 
                  y1: center, 
                  x2: x, 
                  y2: y, 
                  label: isPreschool ? "T" + (i + 1) : "Y" + (i + 1), 
                  lx: center + (radius + 20) * Math.sin(angle), 
                  ly: center - (radius + 20) * Math.cos(angle) 
                });
              }

              const valuePoints = [];
              competencyData.forEach((d, i) => {
                const angle = i * angleStep;
                const r = radius * (d.pct / 100);
                const x = center + r * Math.sin(angle);
                const y = center - r * Math.cos(angle);
                valuePoints.push(x + "," + y);
              });
              const valuePath = valuePoints.join(" ");

              return (
                <div className="flex flex-col items-center justify-center bg-slate-50/50 p-4 rounded-3xl border border-slate-200/60 shadow-xs relative">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Bản đồ Năng lực dạy học</span>
                  <svg width="250" height="250" viewBox="0 0 300 300" className="overflow-visible">
                    {gridLayers.map((level, idx) => (
                      <polygon
                        key={level}
                        points={gridPaths[idx]}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray={level === 100 ? "none" : "3,3"}
                      />
                    ))}
                    
                    {gridLayers.map((level) => (
                      <text
                        key={level}
                        x={center}
                        y={center - radius * (level / 100) + 4}
                        textAnchor="middle"
                        className="text-[8px] fill-slate-400 font-bold"
                      >
                        {level}%
                      </text>
                    ))}

                    {axisLines.map((axis, idx) => (
                      <g key={idx}>
                        <line
                          x1={axis.x1}
                          y1={axis.y1}
                          x2={axis.x2}
                          y2={axis.y2}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                        />
                        <text
                          x={axis.lx}
                          y={axis.ly + 4}
                          textAnchor="middle"
                          className="text-[10px] font-extrabold fill-[#0A3230]"
                        >
                          {axis.label}
                        </text>
                      </g>
                    ))}

                    {valuePoints.length > 0 && (
                      <polygon
                        points={valuePath}
                        fill="rgba(0, 161, 154, 0.15)"
                        stroke="#00A19A"
                        strokeWidth="2.5"
                      />
                    )}

                    {competencyData.map((d, i) => {
                      const angle = i * angleStep;
                      const r = radius * (d.pct / 100);
                      const x = center + r * Math.sin(angle);
                      const y = center - r * Math.cos(angle);
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#ffffff"
                          stroke="#00A19A"
                          strokeWidth="2.5"
                        />
                      );
                    })}
                  </svg>
                </div>
              );
            };

            return (
              <div className="space-y-5 flex-1 flex flex-col text-slate-800">
                <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold text-sm shadow-2xs border border-teal-100">
                      {selTeacher ? selTeacher.teacherName.charAt(0) : "G"}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#0A3230]">{selTeacher ? selTeacher.teacherName : ""}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Mã GV: {selTeacher ? selTeacher.teacherCode : ""}</p>
                    </div>
                  </div>
                  <span className="px-3.5 py-1.5 bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-2xs">
                    {filteredSlots.length} / {selTeacherSlots.length} tiết dạy
                  </span>
                </div>

                {activeDetailTab === "lich-su" ? (
                  <>
                    {/* Slot Search & Filter controls */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 shrink-0">
                      <div className="md:col-span-6 relative">
                        <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm chủ đề, lớp học..."
                          value={searchSlotQuery}
                          onChange={e => setSearchSlotQuery(e.target.value)}
                          className="w-full text-xs font-semibold rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 bg-white text-slate-800 focus:border-[#00A19A] focus:ring-4 focus:ring-[#00A19A]/10 outline-none transition-all"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <select 
                          value={filterLevel} 
                          onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all"); }}
                          className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:border-[#00A19A] focus:ring-4 focus:ring-[#00A19A]/10 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2523475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.55rem_auto] bg-[right_0.75rem_center] bg-no-repeat pr-6"
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
                          className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:border-[#00A19A] focus:ring-4 focus:ring-[#00A19A]/10 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2523475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.55rem_auto] bg-[right_0.75rem_center] bg-no-repeat pr-6"
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
                      <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredSlots.map(slot => {
                          const avgScore = getSlotAverageScore(slot);
                          const slotDate = new Date(slot.date);
                          const evals = slot.registrations.filter((r: any) => r.evaluation !== null);
                          const isMamNonBlock = slot.level === "Mầm non" || 
                                                (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non");

                          return (
                            <div key={slot.id} className={"p-5 bg-white border border-slate-200/80 rounded-2xl space-y-4 hover:shadow-md transition-all duration-300 border-l-4 " + (
                              isMamNonBlock ? "border-l-amber-500" : "border-l-indigo-500"
                            )}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={"px-2 py-0.5 text-[8px] font-extrabold rounded uppercase tracking-wider " + (
                                      isMamNonBlock ? "bg-amber-50 text-amber-700 border border-amber-250/60" : "bg-indigo-50 text-indigo-700 border border-indigo-250/60"
                                    )}>{slot.level}</span>
                                    <span className="px-2 py-0.5 text-[8px] font-extrabold bg-slate-50 text-slate-655 border border-slate-200 rounded uppercase tracking-wider">{slot.grade}</span>
                                    <span className="px-2 py-0.5 text-[8px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 rounded uppercase tracking-wider">{slot.startTime}</span>
                                    <span className="text-[10px] font-bold text-slate-450">{slotDate.toLocaleDateString("vi-VN")}</span>
                                    {slot.className && <span className="px-2 py-0.5 text-[8px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded">Lớp: {slot.className}</span>}
                                  </div>
                                  <h4 className="font-black text-[15px] text-[#0A3230] mt-2 tracking-tight">{slot.topic}</h4>
                                </div>
                                <div className="shrink-0 text-right">
                                  {avgScore !== null ? (
                                    <span className="px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border border-teal-200 rounded-xl font-black text-xs shadow-2xs">
                                      ĐTB chung: {typeof avgScore === "number" ? avgScore.toFixed(2) + "/20.00đ" : avgScore}
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl font-bold text-xs">
                                      ĐTB chung: --
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-slate-350" />
                                  <span>Đánh giá của giáo viên dự ({evals.length})</span>
                                </h5>
                                {evals.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">Chưa nhận được phiếu đánh giá nào.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {evals.map((reg: any) => {
                                      const evalData = reg.evaluation;
                                      const passed = isK12
                                        ? (evalData.totalScore !== null && evalData.totalScore !== undefined ? evalData.totalScore >= 14 : (evalData.overallRating === "Giỏi" || evalData.overallRating === "Khá"))
                                        : (evalData.overallRating === "Tốt" || evalData.overallRating === "Khá");

                                      return (
                                        <div key={reg.id} className="p-4 bg-slate-50/50 border border-slate-200/60 rounded-xl space-y-3 hover:bg-slate-50 hover:shadow-2xs transition-all duration-200">
                                          <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 pb-2.5">
                                            <div className="min-w-0 flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-655 flex items-center justify-center font-bold text-[10px]">
                                                {reg.teacher?.teacherName.charAt(0) || "U"}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-800">{reg.teacher?.teacherName}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">Mã GV: {reg.teacher?.teacherCode}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-lg bg-violet-50 text-violet-755 border border-violet-200">
                                                {evalData.totalScore !== null && evalData.totalScore !== undefined
                                                  ? evalData.totalScore.toFixed(2) + "đ"
                                                  : evalData.overallRating}
                                              </span>
                                              {passed ? (
                                                <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-250 uppercase tracking-widest">ĐẠT</span>
                                              ) : (
                                                <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-rose-50 text-rose-700 border border-rose-250 uppercase tracking-widest">CHƯA ĐẠT</span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex flex-wrap gap-1.5">
                                            {isK12 ? (
                                              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => {
                                                const scoreKey = "score" + num;
                                                const scoreVal = evalData[scoreKey] !== null && evalData[scoreKey] !== undefined
                                                  ? Number(evalData[scoreKey])
                                                  : 0;
                                                const maxVal = maxScoresK12[num - 1];
                                                const isPassed = scoreVal >= maxVal * 0.5;

                                                let stdClass = "";
                                                let labelTextClass = "";
                                                if (isPassed) {
                                                  if (num <= 2) {
                                                    stdClass = "bg-teal-50 text-teal-700 border-teal-200/80";
                                                    labelTextClass = "text-teal-700/60 font-bold";
                                                  } else if (num <= 5) {
                                                    stdClass = "bg-sky-50 text-sky-700 border-sky-200/80";
                                                    labelTextClass = "text-sky-700/60 font-bold";
                                                  } else if (num <= 9) {
                                                    stdClass = "bg-indigo-50 text-indigo-700 border-indigo-200/80";
                                                    labelTextClass = "text-indigo-700/60 font-bold";
                                                  } else {
                                                    stdClass = "bg-amber-50 text-amber-700 border-amber-200/80";
                                                    labelTextClass = "text-amber-700/60 font-bold";
                                                  }
                                                } else {
                                                  stdClass = "bg-rose-50/70 text-rose-550 border-rose-150";
                                                  labelTextClass = "text-rose-400 font-bold";
                                                }

                                                return (
                                                  <span key={num} className={"inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-extrabold border rounded-md shadow-2xs " + stdClass}>
                                                    <span className={labelTextClass}>Y{num}:</span>
                                                    <span>{scoreVal.toFixed(1)}</span>
                                                  </span>
                                                );
                                              })
                                            ) : (
                                              [1, 2, 3, 4, 5].map((num) => {
                                                const critKey = "criterion" + num;
                                                const ratingLabels = { 4: "Tốt", 3: "Khá", 2: "Tr.bình", 1: "Yếu" };
                                                const critVal = evalData[critKey] !== null && evalData[critKey] !== undefined
                                                  ? evalData[critKey]
                                                  : 0;
                                                const critLabel = ratingLabels[critVal] || "-";
                                                const isPassed = critVal >= 3;
                                                return (
                                                  <span key={num} className={"inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-extrabold border rounded-md shadow-2xs " + (
                                                    isPassed 
                                                      ? "bg-teal-50 text-teal-700 border-teal-200/80" 
                                                      : "bg-rose-50/70 text-rose-550 border-rose-150"
                                                  )}>
                                                    <span className={isPassed ? "text-teal-700/60 font-bold" : "text-rose-455 font-bold"}>T{num}:</span>
                                                    <span>{critLabel}</span>
                                                  </span>
                                                );
                                              })
                                            )}
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] border-t border-slate-200/50 pt-2.5">
                                            {evalData.strengths && (
                                              <div className="bg-emerald-50/30 border border-emerald-100/60 p-2.5 rounded-xl text-emerald-800">
                                                <span className="font-extrabold flex items-center gap-1 mb-0.5">
                                                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                                                  <span>Ưu điểm:</span>
                                                </span>
                                                <span className="italic block leading-relaxed">{evalData.strengths}</span>
                                              </div>
                                            )}
                                            {evalData.improvements && (
                                              <div className="bg-amber-50/30 border border-amber-100/60 p-2.5 rounded-xl text-amber-800">
                                                <span className="font-extrabold flex items-center gap-1 mb-0.5">
                                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                  <span>Góp ý phát triển:</span>
                                                </span>
                                                <span className="italic block leading-relaxed">{evalData.improvements}</span>
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
                  </>
                ) : (
                  evaluations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-16">
                      <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-350 mb-4 shadow-2xs">
                        <PieChart className="w-8 h-8 stroke-1" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Chưa có dữ liệu đánh giá</p>
                      <p className="text-[11px] text-slate-400 mt-1.5 text-center max-w-sm leading-relaxed">Giáo viên này chưa nhận được phiếu đánh giá nào từ giáo viên dự giờ trong tháng/kỳ học này để phân tích.</p>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        <div className="md:col-span-5 flex justify-center">
                          {renderRadarChart()}
                        </div>
                        <div className="md:col-span-7 space-y-3 bg-slate-50/30 p-4 rounded-3xl border border-slate-200/60 shadow-xs">
                          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-teal-655" />
                            <span>Biểu đồ năng lực dạy học</span>
                          </h4>
                          <div className="space-y-3">
                            {competencyData.map((item) => {
                              let colorClass = "from-teal-500 to-emerald-500";
                              if (item.standard === 1) colorClass = "from-teal-500 to-emerald-500";
                              else if (item.standard === 2) colorClass = "from-sky-500 to-blue-500";
                              else if (item.standard === 3) colorClass = "from-indigo-500 to-violet-500";
                              else colorClass = "from-amber-500 to-orange-500";

                              return (
                                <div key={item.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700 text-[10px] truncate max-w-[200px]">
                                      {item.id}. {item.label.split(":")[1] || item.label}
                                    </span>
                                    <span className="font-black text-slate-500 text-[10px]">
                                      {item.avg.toFixed(2)}/{item.max.toFixed(1)}đ ({item.pct}%)
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                    <div 
                                      className={"h-full rounded-full bg-gradient-to-r " + colorClass}
                                      style={{ width: item.pct + "%" }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                        <div>
                          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <span>Theo dõi điểm yếu dạy học (% Số lần điểm thấp hơn 70% quy định)</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                            Chỉ số này thống kê phần trăm số phiếu đánh giá mà tiêu chí của giáo viên ở mức yếu/cần cải thiện. Tiêu chí có tỷ lệ % cao nhất đại diện cho những điểm yếu cần ưu tiên khắc phục và đào tạo phát triển.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {sortedWeaknesses.slice(0, 4).map((weakness, idx) => {
                            const isHighRisk = weakness.lowPct >= 40;
                            const isMediumRisk = weakness.lowPct >= 15 && weakness.lowPct < 40;

                            let borderClass = "border-slate-200";
                            let bgClass = "bg-slate-50/50";
                            let badgeClass = "bg-slate-100 text-slate-550 border-slate-200";
                            
                            if (isHighRisk) {
                              borderClass = "border-rose-200 border-l-4 border-l-rose-500";
                              bgClass = "bg-rose-50/30";
                              badgeClass = "bg-rose-50 text-rose-700 border-rose-250";
                            } else if (isMediumRisk) {
                              borderClass = "border-amber-200 border-l-4 border-l-amber-500";
                              bgClass = "bg-amber-50/30";
                              badgeClass = "bg-amber-50 text-amber-700 border-amber-250";
                            }

                            return (
                              <div key={weakness.id} className={"p-3.5 border rounded-2xl flex items-center justify-between gap-3 " + bgClass + " " + borderClass}>
                                <div className="min-w-0">
                                  <span className="text-[9px] font-black text-slate-450 block tracking-widest uppercase">ƯƯ TIÊN {idx + 1}</span>
                                  <h5 className="font-extrabold text-xs text-slate-750 truncate mt-0.5">{weakness.id}. {weakness.label.split(":")[1] || weakness.label}</h5>
                                  <p className="text-[9px] font-medium text-slate-400 mt-0.5">Hiệu suất trung bình: {weakness.avgPct}%</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className={"px-2 py-0.5 rounded-lg text-[10px] font-black border shadow-2xs " + badgeClass}>
                                    {weakness.lowPct}% Điểm yếu
                                  </span>
                                  <span className="block text-[8px] text-slate-455 mt-1 font-bold">{weakness.lowCount} / {evaluations.length} phiếu</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {sortedWeaknesses[0] && sortedWeaknesses[0].lowPct > 0 && (
                          <div className="bg-gradient-to-r from-teal-50/40 to-emerald-50/20 border border-teal-200 rounded-2xl p-4 flex gap-3.5 items-start mt-3">
                            <div className="p-2 bg-white text-[#00A19A] rounded-xl border border-teal-250 shrink-0 shadow-2xs">
                              <MessageSquare className="w-5 h-5" />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <h6 className="font-black text-xs text-[#0A3230] uppercase tracking-wider">Đề xuất phát triển chuyên môn (Chăm sóc & Đào tạo)</h6>
                              <p className="text-[10.5px] text-slate-655 leading-relaxed">
                                Dựa trên phân tích điểm yếu, giáo viên có tỷ lệ điểm thấp cao nhất ở <span className="font-black text-red-650">{sortedWeaknesses[0].id} ({sortedWeaknesses[0].lowPct}%)</span> và <span className="font-bold text-amber-650">{sortedWeaknesses[1] ? sortedWeaknesses[1].id + " (" + sortedWeaknesses[1].lowPct + "%)" : ""}</span>. Tổ chuyên môn khuyến nghị cần tổ chức dự giờ chuyên đề bổ sung hoặc cặp đôi kèm cặp (coaching) tập trung vào các năng lực này.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
