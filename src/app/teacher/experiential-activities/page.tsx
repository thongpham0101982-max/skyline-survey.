"use client"
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Plus, Search, Calendar, Users, ChevronRight, Activity, Trash2, Edit3, 
  Tag, CheckCircle2, Clock, List, LayoutGrid, Sparkles, Filter, FileCheck, 
  Layers, ArrowUpRight, CheckCircle, BarChart3, RefreshCw, X, Eye, 
  FileSpreadsheet, Download, Lock, Unlock, Copy, AlertCircle, Building2, 
  GraduationCap, Shield, Compass, Leaf, User, BookOpen, Send, MapPin, 
  Award, FolderKanban, Check, ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { ACTIVITY_STRANDS, SKYLINE_ACTIVITY_TYPES } from "@/lib/experiential/constants";
import { ActivityProgressModal } from "./components/ActivityProgressModal";
import { TLHNDispatchView } from "./components/TLHNDispatchView";
import { ExperientialTabs } from "@/components/ExperientialTabs";

export default function ExperientialActivitiesList() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const basePath = pathname.startsWith("/admin") ? "/admin/experiential-activities" : "/teacher/experiential-activities";
  
  const [rawActivities, setRawActivities] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedCampusId, setSelectedCampusId] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedStrand, setSelectedStrand] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleScope, setRoleScope] = useState("ALL"); // ALL | TLHN | GVBM | GVCN | MY_CREATED
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [progressModalActivity, setProgressModalActivity] = useState<any>(null);

  // Load Initial Academic Years & Campuses
  useEffect(() => {
    Promise.all([
      fetch("/api/academic-years").then(r => r.json()).catch(() => []),
      fetch("/api/campuses").then(r => r.json()).catch(() => [])
    ]).then(([years, camps]) => {
      if (Array.isArray(years) && years.length > 0) {
        setAcademicYears(years);
        const active = years.find(y => y.status === "ACTIVE" && !y.isOff) || years[0];
        setSelectedYearId(active?.id || "");
      }
      if (Array.isArray(camps)) setCampuses(camps);
    });
  }, []);

  // Fetch Activities for Selected Academic Year
  const loadActivities = useCallback(() => {
    if (!selectedYearId) return;
    setLoading(true);
    
    fetch(`/api/experiential-activities?academicYearId=${selectedYearId}`)
      .then(res => res.json())
      .then(allData => {
        const fullList = Array.isArray(allData) ? allData : [];
        setRawActivities(fullList);

        // Apply filters
        let filtered = fullList;
        if (roleScope === 'GVBM') {
          filtered = filtered.filter(a => a.isGVBM || (a.hasTcmOrSubject && (a.isGVCN || a.isMyCreated || a.canManage || a.isAssignedToMe)));
        } else if (roleScope === 'GVCN') {
          filtered = filtered.filter(a => a.isGVCN || a.isMyCreated || a.canManage);
        } else if (roleScope === 'MY_CREATED') {
          filtered = filtered.filter(a => a.isMyCreated);
        }

        if (selectedCampusId !== "ALL") {
          filtered = filtered.filter(a => 
            a.campusId === selectedCampusId || 
            a.campusCode === selectedCampusId || 
            (a.assignedClasses && a.assignedClasses.some((c: any) => c.campusId === selectedCampusId || c.campusCode === selectedCampusId))
          );
        }
        if (selectedLevel !== "ALL") {
          filtered = filtered.filter(a => 
            a.educationLevel === selectedLevel || 
            (a.assignedClasses && a.assignedClasses.some((c: any) => c.level === selectedLevel))
          );
        }
        if (selectedGrade !== "ALL") {
          filtered = filtered.filter(a => 
            (a.grades && (a.grades.includes(selectedGrade) || a.grades.includes(parseInt(selectedGrade, 10)))) || 
            (a.assignedClasses && a.assignedClasses.some((c: any) => String(c.grade) === String(selectedGrade)))
          );
        }
        if (selectedStrand !== "ALL") {
          filtered = filtered.filter(a => a.strand === selectedStrand);
        }
        if (statusFilter !== "ALL") {
          filtered = filtered.filter(a => a.status === statusFilter);
        }
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          filtered = filtered.filter(a => 
            (a.name && a.name.toLowerCase().includes(q)) ||
            (a.code && a.code.toLowerCase().includes(q)) ||
            (a.activityTypeName && a.activityTypeName.toLowerCase().includes(q)) ||
            (a.subjectName && a.subjectName.toLowerCase().includes(q)) ||
            (a.location && a.location.toLowerCase().includes(q)) ||
            (a.tcmOrSubjectLabel && a.tcmOrSubjectLabel.toLowerCase().includes(q)) ||
            (a.campusName && a.campusName.toLowerCase().includes(q))
          );
        }

        setActivities(filtered);
        setLoading(false);
      })
      .catch(() => { 
        setRawActivities([]); 
        setActivities([]); 
        setLoading(false); 
      });
  }, [selectedYearId, selectedCampusId, selectedLevel, selectedGrade, selectedStrand, statusFilter, roleScope, search]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  // Actions
  const handleDelete = async (e: any, id: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa hoạt động trải nghiệm này?")) return;
    try {
      const res = await fetch(`/api/experiential-activities/${id}`, { method: "DELETE" });
      if (res.ok) {
        setActivities(prev => prev.filter(a => a.id !== id));
        toast.success("Đã xóa hoạt động thành công");
      } else {
        const err = await res.json();
        toast.error(err.error || "Lỗi khi xóa");
      }
    } catch { toast.error("Lỗi kết nối máy chủ"); }
  };

  const handleDuplicate = async (e: any, act: any) => {
    e.stopPropagation();
    if (!confirm(`Bạn có muốn nhân bản hoạt động "${act.name}"?`)) return;
    try {
      const res = await fetch(`/api/experiential-activities/${act.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DUPLICATE", academicYearId: selectedYearId })
      });
      if (res.ok) {
        toast.success("Đã nhân bản hoạt động thành công");
        loadActivities();
      } else { toast.error("Lỗi khi nhân bản"); }
    } catch { toast.error("Lỗi kết nối"); }
  };

  const handleToggleLock = async (e: any, act: any) => {
    e.stopPropagation();
    const isLocked = act.status === "LOCKED";
    const actionText = isLocked ? "mở khóa" : "khóa";
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} hoạt động "${act.name}"?`)) return;
    try {
      const res = await fetch(`/api/experiential-activities/${act.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isLocked ? "UNLOCK" : "LOCK" })
      });
      if (res.ok) {
        toast.success(`Đã ${actionText} hoạt động thành công`);
        loadActivities();
      } else { toast.error("Lỗi khi cập nhật"); }
    } catch { toast.error("Lỗi kết nối"); }
  };

  const handleExportExcel = () => {
    if (activities.length === 0) { 
      toast.error("Không có dữ liệu hoạt động để xuất"); 
      return; 
    }
    try {
      const dataToExport = activities.map((act, idx) => ({
        "STT": idx + 1,
        "Mã Hoạt động": act.code || "HDTN",
        "Tên Hoạt động": act.name || "",
        "Chủ đề": act.themeName || "",
        "Môn chủ trì": act.primarySubjectName || act.subjectName || "",
        "Môn phối hợp": act.coopSubjectNames || act.integratedSubjects || "",
        "Cơ sở": getDisplayCampuses(act),
        "Khối áp dụng": getDisplayGrades(act),
        "Thời gian & HK": `${act.timeRange || 'Trong năm'} (HK ${act.semester || 1})`,
        "Địa điểm": act.location || "Theo kế hoạch",
        "Số Lớp tham gia": act.totalClassesCount || 0,
        "Số Lớp hoàn tất vai trò HS": `${act.completedClassesCount || 0}/${act.totalClassesCount || 0}`,
        "Số HS tham gia": act.participantsCount || 0,
        "Người tạo / Phụ trách": act.creatorName || act.teacherName || "BP HĐNGLL - Tổ CTHS",
        "Trạng thái": getStatusBadge(act.status).label
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Quan_Ly_Trien_Khai");
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Quan_Ly_Trien_Khai_Danh_Gia_HDTN_${dateStr}.xlsx`);
      toast.success("Đã xuất file Excel tổng hợp thành công!");
    } catch (err) { toast.error("Lỗi khi xuất file Excel"); }
  };

  // Helper Badge Formatters
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return { 
          label: "Đã hoàn thành", 
          cls: "bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-300/40",
          dot: "bg-emerald-500" 
        };
      case "IN_PROGRESS":
        return { 
          label: "Đang đánh giá", 
          cls: "bg-sky-50 text-sky-800 border-sky-200 ring-1 ring-sky-300/40",
          dot: "bg-sky-500" 
        };
      case "ASSIGNED":
        return { 
          label: "Đã triển khai", 
          cls: "bg-teal-50 text-[#003B3A] border-[#00A19A]/30 ring-1 ring-[#00A19A]/20",
          dot: "bg-[#00A19A]" 
        };
      case "LOCKED":
        return { 
          label: "Đã khóa hồ sơ", 
          cls: "bg-slate-100 text-slate-700 border-slate-300",
          dot: "bg-slate-500" 
        };
      default:
        return { 
          label: "Chờ triển khai", 
          cls: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500" 
        };
    }
  };

  const getStrandBadge = (strandId: string) => {
    const s = ACTIVITY_STRANDS.find(item => item.id === strandId);
    if (!s) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${s.badgeColor}`}>
        {s.name}
      </span>
    );
  };

  const getDisplayCampuses = (act: any) => {
    if (act.assignedClasses && act.assignedClasses.length > 0) {
      const campusCodes = Array.from(new Set(
        act.assignedClasses.map((c: any) => c.campusCode || (c.className?.includes('_') ? c.className.split('_').pop() : '')).filter(Boolean)
      ));
      if (campusCodes.length > 0) return campusCodes.join(', ');
    }
    const code = act.campusCode || '';
    if (code && !code.includes('Toàn')) return code.replace(/Sky-Line\s*/gi, '').trim();
    return 'Toàn trường';
  };

  const getDisplayGrades = (act: any) => {
    let gList = act.grades || [];
    if ((!gList || gList.length === 0) && act.assignedClasses && act.assignedClasses.length > 0) {
      gList = Array.from(new Set(act.assignedClasses.map((c: any) => c.grade).filter(Boolean)));
    }
    if (gList && gList.length > 0) {
      return gList.map((g: any) => String(g).startsWith('Khối') ? g : `Khối ${g}`).join(', ');
    }
    return 'Toàn cấp';
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = rawActivities.length;
    const completed = rawActivities.filter(a => a.status === "COMPLETED").length;
    const deployed = rawActivities.filter(a => (a.totalClassesCount || 0) > 0).length;
    const totalStudents = rawActivities.reduce((acc, curr) => acc + (curr.participantsCount || 0), 0);
    const totalClasses = rawActivities.reduce((acc, curr) => acc + (curr.totalClassesCount || 0), 0);
    const completedClasses = rawActivities.reduce((acc, curr) => acc + (curr.completedClassesCount || 0), 0);
    const roleCompletionRate = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;

    return {
      total,
      completed,
      deployed,
      totalStudents,
      totalClasses,
      completedClasses,
      roleCompletionRate
    };
  }, [rawActivities]);

  // Tab Counts
  const tabCounts = useMemo(() => ({
    ALL: rawActivities.length,
    TLHN: rawActivities.filter(a => a.campusCode || a.campusId || (a.assignedClasses && a.assignedClasses.length > 0)).length,
    GVBM: rawActivities.filter(a => a.isGVBM || (a.hasTcmOrSubject && (a.isGVCN || a.isMyCreated || a.canManage || a.isAssignedToMe))).length,
    GVCN: rawActivities.filter(a => a.isGVCN || a.isMyCreated || a.canManage).length,
    MY_CREATED: rawActivities.filter(a => a.isMyCreated).length
  }), [rawActivities]);

  const tabList = [
    { id: 'ALL', label: 'Tất cả hoạt động', icon: Layers, count: tabCounts.ALL },
    { id: 'TLHN', label: 'Tổ TLHN (Tiếp nhận cơ sở)', icon: Compass, count: tabCounts.TLHN },
    { id: 'GVBM', label: 'TCM / GVBM (Môn phối hợp)', icon: BookOpen, count: tabCounts.GVBM },
    { id: 'GVCN', label: 'GVCN (Nhập vai trò lớp)', icon: Users, count: tabCounts.GVCN },
    { id: 'MY_CREATED', label: 'Hoạt động tôi phụ trách', icon: Sparkles, count: tabCounts.MY_CREATED }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/15 to-emerald-50/10 py-5 sm:py-7 px-3 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* TOP BREADCRUMB & GLOBAL TABS */}
        <ExperientialTabs activeTab="activities" />

        {/* HERO BANNER - PINE & TEAL SKY-LINE SIGNATURE */}
        <div className="relative backdrop-blur-xl bg-white/95 rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003B3A] via-[#00A19A] to-emerald-400" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#003B3A] to-[#00A19A] p-0.5 shadow-lg shadow-[#00A19A]/20 shrink-0">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-[#00A19A]">
                  <Activity className="w-7 h-7" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-[#00A19A]/10 text-[#003B3A] border border-[#00A19A]/20">
                    Hệ thống Giáo dục Sky-Line
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-slate-500">
                    Phân hệ Ngoại khóa & Trải nghiệm
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#003B3A] via-[#005F5E] to-[#00A19A] bg-clip-text text-transparent tracking-tight">
                  Quản lý Triển khai & Đánh giá Hoạt động Trải nghiệm
                </h1>
                <p className="text-slate-500 font-medium text-xs mt-1">
                  Giám sát tiến độ tiếp nhận tại các cơ sở, theo dõi GVCN nhập vai trò học sinh và cập nhật hồ sơ đánh giá năng lực cuối năm.
                </p>
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/90 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
                title="Xuất bảng dữ liệu triển khai ra file Excel"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/admin/experiential-activities/catalogs')}
                className="px-5 py-2.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 text-white text-xs font-black rounded-xl shadow-md shadow-[#00A19A]/25 transition-all flex items-center gap-2 cursor-pointer group"
                title="Đẩy Kế Hoạch Xuống Cơ Sở & Báo Mail GVCN từ Danh mục"
              >
                <Send className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                <span>Đẩy Cơ Sở & Báo Mail GVCN</span>
              </button>
            </div>
          </div>

          {/* 4 MODERN KPI METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
            {/* Metric 1 */}
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng hoạt động</span>
                <span className="text-2xl font-black text-slate-800 mt-0.5 block">{stats.total}</span>
                <span className="text-[10px] text-teal-700 font-semibold">{stats.deployed} đã đẩy cơ sở</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center border border-teal-200/60 shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lớp được phân bổ</span>
                <span className="text-2xl font-black text-slate-800 mt-0.5 block">{stats.totalClasses}</span>
                <span className="text-[10px] text-slate-500 font-medium">Toàn hệ thống Sky-Line</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60 shadow-2xs">
                <SchoolIcon className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Nhập vai trò HS (Hồ sơ)</span>
                <span className="text-2xl font-black text-emerald-700 mt-0.5 block">{stats.roleCompletionRate}%</span>
                <span className="text-[10px] text-emerald-800 font-semibold">{stats.completedClasses}/{stats.totalClasses} lớp hoàn tất</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shadow-2xs">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#00A19A] uppercase tracking-wider block">HS được ghi nhận</span>
                <span className="text-2xl font-black text-[#003B3A] mt-0.5 block">{stats.totalStudents}</span>
                <span className="text-[10px] text-teal-800 font-semibold">Bổ sung hồ sơ cuối năm</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00A19A]/10 text-[#00A19A] flex items-center justify-center border border-[#00A19A]/30 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* ROLE SCOPE TABS WITH REFINED PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabList.map(tab => {
            const isActive = roleScope === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleScope(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white border-transparent shadow-md shadow-[#00A19A]/20'
                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.2 rounded-full text-[10.5px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* FILTER TOOLBAR */}
        <div className="backdrop-blur-xl bg-white/95 p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Filter: Academic Year */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Năm học</label>
              <select
                value={selectedYearId}
                onChange={e => setSelectedYearId(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            {/* Filter: Campus */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cơ sở</label>
              <select
                value={selectedCampusId}
                onChange={e => setSelectedCampusId(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="ALL">Tất cả cơ sở</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.campusName || c.campusCode}</option>
                ))}
              </select>
            </div>

            {/* Filter: Education Level */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cấp học</label>
              <select
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="ALL">Tất cả cấp học</option>
                <option value="Tieu hoc">Tiểu học</option>
                <option value="THCS">THCS</option>
                <option value="THPT">THPT</option>
                <option value="Mam non">Mầm non</option>
              </select>
            </div>

            {/* Filter: Grade */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Khối</label>
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="ALL">Tất cả khối</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                  <option key={g} value={String(g)}>Khối {g}</option>
                ))}
              </select>
            </div>

            {/* Filter: Strand */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Mạch hoạt động</label>
              <select
                value={selectedStrand}
                onChange={e => setSelectedStrand(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="ALL">Tất cả 4 mạch</option>
                {ACTIVITY_STRANDS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Filter: Status */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ASSIGNED">Đã triển khai</option>
                <option value="IN_PROGRESS">Đang đánh giá</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="LOCKED">Đã khóa</option>
                <option value="DRAFT">Chờ triển khai</option>
              </select>
            </div>
          </div>

          {/* Search & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên hoạt động, mã, chủ đề, địa điểm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#00A19A] outline-none transition-all"
              />
              {search && (
                <button 
                  type="button"
                  onClick={() => setSearch('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-bold hidden md:inline">
                Hiển thị: <strong>{activities.length}</strong> / {rawActivities.length} hoạt động
              </span>

              <div className="flex bg-slate-100 p-1 rounded-xl items-center border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'list' 
                      ? 'bg-white text-[#003B3A] shadow-xs font-black' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Dạng Bảng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'grid' 
                      ? 'bg-white text-[#003B3A] shadow-xs font-black' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Dạng Thẻ</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN ACTIVITIES CONTENT OR TLHN VIEW */}
        {roleScope === 'TLHN' ? (
          <TLHNDispatchView selectedYearId={selectedYearId} onRefreshParent={loadActivities} />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/90 rounded-3xl border border-white shadow-xl shadow-slate-200/40 space-y-3">
            <div className="w-9 h-9 border-3 border-[#00A19A]/20 border-t-[#00A19A] rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">Đang tải danh sách triển khai & đánh giá HĐTN...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white/95 rounded-3xl py-16 px-6 text-center border border-slate-200/80 shadow-sm">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#00A19A]/10 mx-auto flex items-center justify-center text-[#00A19A] border border-[#00A19A]/20">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800">
                {search ? 'Không tìm thấy hoạt động phù hợp' : 'Chưa có hoạt động trải nghiệm nào được triển khai'}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                {search 
                  ? `Không có hoạt động nào khớp với từ khóa "${search}". Vui lòng thử lại với tiêu chí lọc khác.`
                  : 'Vào "Danh mục HĐTN & Ngoại khóa" để phân bổ hoạt động xuống các cơ sở & gửi email cho GVCN.'
                }
              </p>
              <button
                type="button"
                onClick={() => router.push('/admin/experiential-activities/catalogs')}
                className="px-5 py-2.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white text-xs font-black rounded-xl shadow-md shadow-[#00A19A]/25 inline-flex items-center gap-2 mt-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Mở Danh mục để Đẩy Cơ sở</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* REDESIGNED ENTERPRISE DATA TABLE */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#00A19A]" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Bảng Quản lý Triển khai & Đánh giá ({activities.length} hoạt động)
                </span>
              </div>
              <span className="text-[11px] text-teal-800 font-bold hidden sm:inline bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
                Nhấn vào hàng để mở trực tiếp Sổ đánh giá & Vai trò Học sinh
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-3 text-center w-10">#</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Mã HĐ</th>
                    <th className="py-3.5 px-5 min-w-[300px]">Kế hoạch Hoạt động & Thông tin triển khai</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Môn chủ trì & Phối hợp</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Phạm vi cơ sở</th>
                    <th className="py-3.5 px-4 text-center min-w-[110px]">Khối áp dụng</th>
                    <th className="py-3.5 px-5 min-w-[180px]">Tiến độ Lớp & Hồ sơ HS</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Đánh giá</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right min-w-[140px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {activities.map((act, index) => {
                    const badge = getStatusBadge(act.status);
                    const totalClasses = act.totalClassesCount || 0;
                    const completedClasses = act.completedClassesCount || 0;
                    const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;
                    const isLocked = act.status === 'LOCKED';
                    const targetCampuses = getDisplayCampuses(act);
                    const targetGrades = getDisplayGrades(act);

                    return (
                      <tr
                        key={act.id}
                        onClick={() => router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`)}
                        className="hover:bg-teal-50/40 cursor-pointer transition-colors group"
                      >
                        {/* 1. STT */}
                        <td className="py-4 px-3 text-center text-slate-400 font-bold">{index + 1}</td>

                        {/* 2. MÃ HĐ */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-block font-mono text-[11px] font-black text-[#003B3A] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl shadow-2xs">
                            {act.code || 'HDTN'}
                          </span>
                        </td>

                        {/* 3. TÊN HOẠT ĐỘNG & THÔNG TIN TRIỂN KHAI */}
                        <td className="py-4 px-5">
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-[#00A19A] transition-colors leading-snug">
                              {act.name}
                            </h4>

                            {/* Tags: Chủ đề, Bậc học, Mạch hoạt động, Hệ học */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {act.themeName && (
                                <span className="text-[10px] font-bold text-teal-900 bg-teal-50/90 px-2 py-0.5 rounded-md border border-teal-200">
                                  {act.themeName}
                                </span>
                              )}
                              {act.educationLevel && (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  {act.educationLevel}
                                </span>
                              )}
                              {getStrandBadge(act.strand)}
                              {act.activityTypeName && (
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  {act.activityTypeName}
                                </span>
                              )}
                            </div>

                            {/* Sub-info: Địa điểm & Thời gian thực hiện */}
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                              {act.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                  <span>{act.location}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#00A19A] shrink-0" />
                                <span>{act.timeRange || 'Trong năm học'} {act.semester ? `(HK ${act.semester})` : ''}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. MÔN CHỦ TRÌ & PHỐI HỢP */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {act.primarySubjectName || act.subjectName ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Chủ trì:</span>
                                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                  {act.primarySubjectName || act.subjectName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Chưa xác định</span>
                            )}

                            {(act.coopSubjectNames || act.integratedSubjects) && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Phối hợp:</span>
                                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {act.coopSubjectNames || act.integratedSubjects}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. PHẠM VI CƠ SỞ */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          {targetCampuses === 'Toàn trường' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-50 text-[#003B3A] border border-teal-200">
                              <Building2 className="w-3.5 h-3.5 text-[#00A19A]" />
                              <span>Toàn hệ thống</span>
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 justify-center max-w-[120px]">
                              {targetCampuses.split(',').map((cCode: string) => (
                                <span key={cCode} className="px-2 py-0.5 rounded-lg text-xs font-black bg-teal-50 text-[#003B3A] border border-teal-200">
                                  {cCode.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 6. KHỐI ÁP DỤNG */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {targetGrades}
                          </span>
                        </td>

                        {/* 7. TIẾN ĐỘ LỚP & HỒ SƠ HS */}
                        <td className="py-4 px-5">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-black">
                              <span className="text-slate-800">
                                {totalClasses > 0 ? `${completedClasses}/${totalClasses} lớp hoàn tất` : 'Chưa phân lớp'}
                              </span>
                              <span className={progressPercent === 100 ? 'text-emerald-600 font-extrabold' : 'text-[#00A19A]'}>
                                {progressPercent}%
                              </span>
                            </div>

                            {/* Dual-tone Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-full rounded-full transition-all ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#003B3A] to-[#00A19A]'}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                              <span>Ghi nhận: <strong>{act.participantsCount || 0} HS</strong></span>
                              <span className="font-semibold text-teal-700">Hồ sơ cuối năm</span>
                            </div>
                          </div>
                        </td>

                        {/* 8. PHƯƠNG THỨC ĐÁNH GIÁ */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold text-[11px] border border-slate-200 block text-center">
                            {act.evalMode === 'ROLE_BASED' ? 'Vai trò thành viên' : 
                             act.evalMode === 'PARTICIPATION_ONLY' ? 'Điểm danh tham gia' : 
                             `${(act.criteria || []).length || 'Rubric'} tiêu chí`}
                          </span>
                        </td>

                        {/* 9. TRẠNG THÁI */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${badge.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        {/* 10. THAO TÁC */}
                        <td className="py-4 px-4 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút hành động chính: Vào sổ đánh giá / nhập vai trò */}
                            <button
                              type="button"
                              onClick={() => router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`)}
                              className="px-3 py-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Mở bảng nhập vai trò học sinh & đánh giá"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Sổ Đánh Giá</span>
                            </button>

                            {/* Nút theo dõi tiến độ chi tiết */}
                            <button
                              type="button"
                              onClick={() => setProgressModalActivity(act)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-[#00A19A] transition-colors border border-slate-200 cursor-pointer"
                              title="Theo dõi tiến độ nộp của từng lớp"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Nút đẩy thêm cơ sở (cho người quản lý) */}
                            {act.canManage && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  const targetId = act.catalogId || act.id;
                                  router.push(`/admin/experiential-activities/catalogs?allocateId=${targetId}`);
                                }}
                                className="p-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#00A19A] transition-colors border border-teal-200 cursor-pointer"
                                title="Đẩy cơ sở & Báo mail GVCN"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Dropdown / Thao tác phụ nếu có quyền quản lý */}
                            {act.canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={e => handleToggleLock(e, act)}
                                  className={`p-1.5 rounded-xl transition-colors border cursor-pointer ${
                                    isLocked 
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  }`}
                                  title={isLocked ? 'Mở khóa hoạt động' : 'Khóa hoạt động'}
                                >
                                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={e => handleDelete(e, act.id)}
                                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border border-slate-200 cursor-pointer"
                                  title="Xóa hoạt động"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* REDESIGNED CARD GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activities.map(act => {
              const badge = getStatusBadge(act.status);
              const totalClasses = act.totalClassesCount || 0;
              const completedClasses = act.completedClassesCount || 0;
              const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;
              const isLocked = act.status === 'LOCKED';
              const targetCampuses = getDisplayCampuses(act);
              const targetGrades = getDisplayGrades(act);

              return (
                <div
                  key={act.id}
                  onClick={() => router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`)}
                  className="group bg-white rounded-3xl border border-slate-200/80 shadow-md shadow-slate-200/30 hover:shadow-xl hover:border-[#00A19A]/50 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
                >
                  <div className="h-1.5 bg-gradient-to-r from-[#003B3A] via-[#00A19A] to-emerald-400" />
                  
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Header: Code & Status */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="font-mono text-[11px] font-black text-[#003B3A] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl">
                          {act.code || 'HDTN'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-extrabold text-slate-900 group-hover:text-[#00A19A] transition-colors leading-snug mb-2">
                        {act.name}
                      </h4>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {act.themeName && (
                          <span className="text-[10px] font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            {act.themeName}
                          </span>
                        )}
                        {act.educationLevel && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {act.educationLevel}
                          </span>
                        )}
                        {getStrandBadge(act.strand)}
                      </div>

                      {/* Key details list */}
                      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Môn chủ trì:</span>
                          <span className="font-extrabold text-indigo-700">{act.primarySubjectName || act.subjectName || 'Toàn trường'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Cơ sở & Khối:</span>
                          <span className="font-bold text-slate-800">{targetCampuses} • {targetGrades}</span>
                        </div>
                        {act.location && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-semibold">Địa điểm:</span>
                            <span className="font-medium text-slate-700 truncate max-w-[180px]">{act.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-slate-700">Tiến độ nhập vai trò HS:</span>
                        <span className={progressPercent === 100 ? 'text-emerald-600' : 'text-[#00A19A]'}>
                          {completedClasses}/{totalClasses} lớp ({progressPercent}%)
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                        <div
                          className={`h-full rounded-full transition-all ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#003B3A] to-[#00A19A]'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {act.participantsCount || 0} HS đã ghi nhận
                        </span>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`);
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 hover:brightness-105 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Vào Sổ Đánh Giá</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* PROGRESS MODAL */}
      {progressModalActivity && (
        <ActivityProgressModal
          isOpen={!!progressModalActivity}
          onClose={() => setProgressModalActivity(null)}
          activity={progressModalActivity}
        />
      )}
    </div>
  );
}

function SchoolIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" />
      <path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" />
      <path d="M18 5v17" />
      <path d="m4 6 8-4 8 4" />
      <path d="M6 5v17" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  );
}
