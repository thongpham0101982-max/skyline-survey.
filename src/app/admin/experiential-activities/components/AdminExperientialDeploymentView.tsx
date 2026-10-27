"use client"
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Plus, Search, Calendar, Users, ChevronRight, Activity, Trash2, Edit3, 
  Tag, CheckCircle2, Clock, List, LayoutGrid, Sparkles, Filter, FileCheck, 
  Layers, ArrowUpRight, CheckCircle, BarChart3, RefreshCw, X, Eye, 
  FileSpreadsheet, Download, Lock, Unlock, Copy, AlertCircle, Building2, 
  GraduationCap, Shield, Leaf, User, BookOpen, Send, MapPin, 
  Award, FolderKanban, Check, ChevronDown, Sliders, Printer
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { ACTIVITY_STRANDS, SKYLINE_ACTIVITY_TYPES } from "@/lib/experiential/constants";
import { getEducationalThemeInfo } from "@/lib/experiential/catalog-types";
import { formatTimeFrameAndSemester } from "@/lib/experiential/timeframe-helper";
import { ActivityProgressModal } from "@/app/teacher/experiential-activities/components/ActivityProgressModal";
import { TeacherProfessionalConfigModal } from "@/app/teacher/experiential-activities/components/TeacherProfessionalConfigModal";
import ClassEventEvaluationBookModal from "@/components/experiential/ClassEventEvaluationBookModal";
import { ExperientialTabs } from "@/components/ExperientialTabs";

function formatGradesDisplay(grades: any): { label: string; fullText: string; isAll: boolean; count: number } {
  if (!grades) return { label: '—', fullText: '', isAll: false, count: 0 };
  let arr: string[] = [];
  if (Array.isArray(grades)) {
    arr = grades;
  } else if (typeof grades === 'string') {
    arr = grades.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (arr.length === 0) return { label: '—', fullText: '', isAll: false, count: 0 };

  const cleanNums: number[] = [];
  const otherLabels: string[] = [];

  for (const item of arr) {
    const raw = String(item).trim();
    const numMatch = raw.match(/\d+/);
    if (numMatch) {
      cleanNums.push(parseInt(numMatch[0], 10));
    } else if (raw) {
      otherLabels.push(raw);
    }
  }

  cleanNums.sort((a, b) => a - b);
  const uniqueNums = Array.from(new Set(cleanNums));
  const fullText = [...uniqueNums.map(n => `K${n}`), ...otherLabels].join(', ');
  const totalCount = uniqueNums.length + otherLabels.length;

  if (uniqueNums.length >= 10 && uniqueNums[0] === 1 && uniqueNums[uniqueNums.length - 1] === 12) {
    return { label: 'Toàn trường (K1 - K12)', fullText, isAll: true, count: totalCount };
  }

  if (uniqueNums.length >= 3 && otherLabels.length === 0) {
    const isConsecutive = uniqueNums.every((val, idx) => idx === 0 || val === uniqueNums[idx - 1] + 1);
    if (isConsecutive) {
      return { label: `K${uniqueNums[0]} - K${uniqueNums[uniqueNums.length - 1]}`, fullText, isAll: false, count: totalCount };
    }
  }

  if (uniqueNums.length > 0 && uniqueNums.length <= 3 && otherLabels.length === 0) {
    return { label: uniqueNums.map(n => `K${n}`).join(', '), fullText, isAll: false, count: totalCount };
  }

  if (uniqueNums.length > 3) {
    const preview = uniqueNums.slice(0, 2).map(n => `K${n}`).join(', ');
    return { label: `${preview} (+${uniqueNums.length - 2})`, fullText, isAll: false, count: totalCount };
  }

  if (otherLabels.length > 0 && uniqueNums.length === 0) {
    return { label: otherLabels.join(', '), fullText, isAll: false, count: totalCount };
  }

  return { label: arr.join(', '), fullText, isAll: false, count: totalCount };
}

function formatEduLevelName(lvl: string): string {
  switch (lvl) {
    case 'MN': return 'Mầm non';
    case 'TIEU_HOC': return 'Tiểu học';
    case 'THCS': return 'THCS';
    case 'THPT': return 'THPT';
    case 'PHO_THONG': return 'Phổ thông';
    default: return lvl || 'Toàn cấp';
  }
}

function formatProgTypeName(prog: string): string {
  switch (prog) {
    case 'HE_S':
    case 'HI_S': return 'Hệ S';
    case 'SONG_NGU': return 'Song ngữ';
    case 'QUOC_TE': return 'Quốc tế';
    default: return prog || 'Song ngữ';
  }
}

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
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | '1' | '2'>('ALL');
  const [roleScope, setRoleScope] = useState("ALL"); // ALL | GVBM | GVCN | MY_CREATED | PENDING_CONFIG
  const [showPendingConfigOnly, setShowPendingConfigOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [progressModalActivity, setProgressModalActivity] = useState<any>(null);
  const [configModalActivity, setConfigModalActivity] = useState<any>(null);
  const [isEvaluationBookOpen, setIsEvaluationBookOpen] = useState(false);
  const [evaluationBookActivity, setEvaluationBookActivity] = useState<any>(null);

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
        } else if (roleScope === 'PENDING_CONFIG') {
          filtered = filtered.filter(a => !a.isProfessionalConfigured);
        }

        if (showPendingConfigOnly) {
          filtered = filtered.filter(a => !a.isProfessionalConfigured);
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
        if (semesterFilter !== "ALL") {
          filtered = filtered.filter(a => String(a.semester) === String(semesterFilter));
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
        // Sắp xếp theo Thời gian & HK giảm dần (mặc định)
        const getTimeSortValue = (item: any): number => {
          const timeInfo = formatTimeFrameAndSemester(item.timeRange || item.timeFrame, '2026-2027', item.semester);
          const year = timeInfo.year || 2026;
          const month = timeInfo.month !== null ? timeInfo.month : (timeInfo.semester === 2 ? 6 : 9);
          const sem = timeInfo.semester || 1;
          return year * 1000 + month * 10 + sem;
        };

        filtered.sort((a, b) => {
          const valA = getTimeSortValue(a);
          const valB = getTimeSortValue(b);
          if (valA !== valB) return valB - valA; // Giảm dần
          return (a.code || '').localeCompare(b.code || '');
        });

        setActivities(filtered);
        setLoading(false);
      })
      .catch(() => { 
        setRawActivities([]); 
        setActivities([]); 
        setLoading(false); 
      });
  }, [selectedYearId, selectedCampusId, selectedLevel, selectedGrade, selectedStrand, statusFilter, semesterFilter, roleScope, showPendingConfigOnly, search]);

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
        "Kế hoạch Hoạt động": act.name || "",
        "Chủ đề giáo dục": act.themeName || "",
        "Danh mục HĐ": act.activityTypeName || act.catalogName || "Trải nghiệm / Dự án",
        "Bậc học": act.educationLevel || "Toàn cấp",
        "Thời gian & Học kỳ": `${act.timeRange || 'Trong năm'} (HK ${act.semester || 1})`,
        "Địa điểm": act.location || "Theo kế hoạch",
        "Số Lớp tham gia": act.totalClassesCount || 0,
        "Số Lớp hoàn tất vai trò HS": `${act.completedClassesCount || 0}/${act.totalClassesCount || 0}`,
        "Số HS tham gia": act.participantsCount || 0,
        "Phương thức đánh giá": act.evalMode === 'ROLE_BASED' ? 'Vai trò thành viên' : `${(act.criteria || []).length || 'Rubric'} tiêu chí`,
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
  const getStatusBadge = (status: string, act?: any) => {
    let effectiveStatus = status;
    const totalClasses = act?.totalClassesCount || (act?.assignedClasses ? act.assignedClasses.length : 0);
    const completedClasses = act?.completedClassesCount || 0;
    const inProgressClasses = act?.inProgressClassesCount || 0;

    if (effectiveStatus !== 'COMPLETED' && effectiveStatus !== 'LOCKED') {
      if (completedClasses > 0 && totalClasses > 0 && completedClasses === totalClasses) {
        effectiveStatus = 'COMPLETED';
      } else if (inProgressClasses > 0 || completedClasses > 0) {
        effectiveStatus = 'IN_PROGRESS';
      } else if (totalClasses > 0) {
        // Các lớp nào đã triển khai: Đã Gán lớp thì: Đã triển khai
        effectiveStatus = 'ASSIGNED';
      }
    }

    switch (effectiveStatus) {
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
    GVBM: rawActivities.filter(a => a.isGVBM || (a.hasTcmOrSubject && (a.isGVCN || a.isMyCreated || a.canManage || a.isAssignedToMe))).length,
    GVCN: rawActivities.filter(a => a.isGVCN || a.isMyCreated || a.canManage).length,
    MY_CREATED: rawActivities.filter(a => a.isMyCreated).length,
    PENDING_CONFIG: rawActivities.filter(a => !a.isProfessionalConfigured).length
  }), [rawActivities]);

  const tabList = [
    { id: 'ALL', label: 'Tất cả hoạt động', icon: Layers, count: tabCounts.ALL },
    { id: 'GVBM', label: 'TCM / GVBM (Môn phối hợp)', icon: BookOpen, count: tabCounts.GVBM },
    { id: 'GVCN', label: 'GVCN (Nhập vai trò lớp)', icon: Users, count: tabCounts.GVCN },
    { id: 'MY_CREATED', label: 'Hoạt động tôi phụ trách', icon: Sparkles, count: tabCounts.MY_CREATED },
    { id: 'PENDING_CONFIG', label: 'Chưa bổ sung CM', icon: AlertCircle, count: tabCounts.PENDING_CONFIG, isWarning: true }
  ];

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12 font-sans px-4 sm:px-6">
      
      {/* Page Title & Main Actions - ĐỒNG NHẤT VỚI DANH MỤC */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-50 text-[#00A19A] border border-teal-200">
              Tổ CTHS Phụ trách
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              Ban ĐHCM & BP NK&HĐNGLL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#003B3A]" />
            Quản lý Triển khai & Đánh giá Hoạt động Trải nghiệm
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Giám sát tiến độ tiếp nhận tại các cơ sở, theo dõi GVCN nhập vai trò học sinh và cập nhật hồ sơ đánh giá năng lực cuối năm
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            title="Xuất bảng dữ liệu triển khai ra file Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/admin/experiential-activities/catalogs')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-md shadow-[#00A19A]/20 transition-all cursor-pointer"
            title="Đẩy Kế Hoạch Xuống Cơ Sở & Báo Mail GVCN từ Danh mục"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Đẩy Cơ Sở & Báo Mail GVCN</span>
          </button>
        </div>
      </div>

      {/* Experiential Navigation Tabs */}
      <ExperientialTabs activeTab="activities" />

      {/* 4 MODERN KPI METRICS - CHUẨN DESIGN SYSTEM DANH MỤC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tổng hoạt động */}
        <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Tổng hoạt động</span>
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.total}</span>
            <span className="text-xs font-bold text-slate-400">hoạt động</span>
          </div>
          <p className="text-[11px] text-teal-700 font-semibold mt-1 line-clamp-1">
            {stats.deployed} đã đẩy cơ sở
          </p>
        </div>

        {/* Card 2: Lớp được phân bổ */}
        <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Lớp được phân bổ</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.totalClasses}</span>
            <span className="text-xs font-bold text-slate-400">lớp</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Toàn hệ thống Sky-Line
          </p>
        </div>

        {/* Card 3: Nhập vai trò HS */}
        <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Nhập vai trò HS (Hồ sơ)</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{stats.roleCompletionRate}%</span>
          </div>
          <p className="text-[11px] text-emerald-800 font-semibold mt-1 line-clamp-1">
            {stats.completedClasses}/{stats.totalClasses} lớp hoàn tất
          </p>
        </div>

        {/* Card 4: HS được ghi nhận */}
        <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#00A19A]">HS được ghi nhận</span>
            <div className="w-7 h-7 rounded-xl bg-[#00A19A]/10 text-[#00A19A] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#003B3A]">{stats.totalStudents}</span>
            <span className="text-xs font-bold text-slate-400">học sinh</span>
          </div>
          <p className="text-[11px] text-teal-800 font-semibold mt-1 line-clamp-1">
            Bổ sung hồ sơ cuối năm
          </p>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? tab.isWarning
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-transparent shadow-md shadow-amber-500/20'
                    : 'bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white border-transparent shadow-md shadow-[#00A19A]/20'
                  : tab.isWarning
                  ? 'bg-amber-50/80 text-amber-950 border-amber-300 hover:bg-amber-100 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.isWarning ? 'text-amber-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-black ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : tab.isWarning
                  ? 'bg-amber-200 text-amber-950 border border-amber-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TOOLBAR LỌC NÂNG CAO - ĐỒNG NHẤT VỚI BẢNG DANH MỤC */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Năm học */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Năm học:</span>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Cơ sở */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCampusId}
              onChange={e => setSelectedCampusId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả cơ sở</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.campusName || c.campusCode}</option>
              ))}
            </select>
          </div>

          {/* Bậc học */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả bậc học</option>
              <option value="MN">Mầm non</option>
              <option value="TIEU_HOC">Tiểu học</option>
              <option value="THCS">THCS</option>
              <option value="THPT">THPT</option>
            </select>
          </div>

          {/* Khối */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả khối</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                <option key={g} value={String(g)}>Khối {g}</option>
              ))}
            </select>
          </div>

          {/* Mạch hoạt động */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStrand}
              onChange={e => setSelectedStrand(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer max-w-[170px]"
            >
              <option value="ALL">Tất cả 4 mạch</option>
              {ACTIVITY_STRANDS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Học kỳ */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSemesterFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                semesterFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cả năm
            </button>
            <button
              onClick={() => setSemesterFilter('1')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                semesterFilter === '1' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HK 1
            </button>
            <button
              onClick={() => setSemesterFilter('2')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                semesterFilter === '2' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HK 2
            </button>
          </div>

          {/* Trạng thái */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('ASSIGNED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ASSIGNED' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã triển khai
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'DRAFT' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chờ triển khai
            </button>
          </div>

          {/* Tìm kiếm */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên HĐ, chủ đề, môn..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs pl-8.5 pr-7 py-1.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] bg-slate-50/60"
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
        </div>

        {/* Nút làm mới, Đếm số, Bổ sung CM & Chuyển chế độ hiển thị */}
        <div className="flex items-center gap-2.5 ml-auto flex-wrap">
          <span className="text-xs text-slate-500 font-medium">
            Hiển thị <span className="font-bold text-slate-800">{activities.length}</span> / {rawActivities.length} hoạt động
          </span>

          <button
            onClick={loadActivities}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00A19A]' : ''}`} />
            <span>Làm mới</span>
          </button>

          {/* Quick toggle: Chỉ xem Chưa bổ sung CM */}
          <button
            type="button"
            onClick={() => setShowPendingConfigOnly(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border ${
              showPendingConfigOnly
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
            }`}
            title="Lọc nhanh các hoạt động mà TCM / GVBM chưa hoàn tất cấu hình chuyên môn"
          >
            <AlertCircle className={`w-3.5 h-3.5 ${showPendingConfigOnly ? 'text-white' : 'text-amber-600'}`} />
            <span>Chưa bổ sung CM</span>
            {tabCounts.PENDING_CONFIG > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                showPendingConfigOnly ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-950 border border-amber-300'
              }`}>
                {tabCounts.PENDING_CONFIG}
              </span>
            )}
          </button>

          <div className="flex bg-slate-100 p-0.5 rounded-xl items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
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

      {/* MAIN ACTIVITIES CONTENT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-8 h-8 border-3 border-[#00A19A]/20 border-t-[#00A19A] rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Đang tải danh sách triển khai & đánh giá HĐTN...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-3xl py-16 px-6 text-center border border-slate-200 shadow-2xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 mx-auto flex items-center justify-center text-[#00A19A] border border-teal-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800">
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
              className="px-4 py-2 bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 mt-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mở Danh mục để Đẩy Cơ sở</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* BẢNG DỮ LIỆU TRIỂN KHAI & ĐÁNH GIÁ - ĐỒNG NHẤT UX DANH MỤC */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-2 text-center w-12 text-slate-500 font-bold">STT</th>
                  <th className="py-3 px-3 w-28 whitespace-nowrap">Khối áp dụng</th>
                  <th className="py-3 px-4 min-w-[220px]">Kế hoạch Hoạt động</th>
                  <th className="py-3 px-3 min-w-[95px] whitespace-nowrap">Bậc học</th>
                  <th className="py-3 px-3 min-w-[100px] whitespace-nowrap">Hệ học</th>
                  <th className="py-3 px-3 min-w-[140px]">Chủ đề giáo dục</th>
                  <th className="py-3 px-3 min-w-[220px]">Nội dung giáo dục</th>
                  <th className="py-3 px-3 min-w-[130px]">Môn phối hợp</th>
                  <th className="py-3 px-3 min-w-[110px] whitespace-nowrap">Thời gian & HK</th>
                  <th className="py-3 px-3 min-w-[160px]">Tiến độ Lớp & Hồ sơ HS</th>
                  <th className="py-3 px-3 min-w-[110px] text-center">Đánh giá</th>
                  <th className="py-3 px-3 min-w-[120px] text-center">Trạng thái</th>
                  <th className="py-3 px-3 text-center min-w-[130px] sticky right-0 bg-slate-50 border-l border-slate-200/80 shadow-xs">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {activities.map((act, index) => {
                  const badge = getStatusBadge(act.status, act);
                  const totalClasses = act.totalClassesCount || 0;
                  const completedClasses = act.completedClassesCount || 0;
                  const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;
                  const isLocked = act.status === 'LOCKED';
                  const gradesInfo = formatGradesDisplay(act.grades || (act.meta && act.meta.grades));

                  return (
                    <tr
                      key={act.id}
                      onClick={() => router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* 1. STT */}
                      <td className="py-2.5 px-2 text-center text-slate-400 font-semibold align-middle">{index + 1}</td>

                      {/* 2. Khối áp dụng */}
                      <td className="py-2.5 px-3 align-middle">
                        <span 
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap ${
                            gradesInfo.isAll 
                              ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                          title={`Danh sách khối: ${gradesInfo.fullText || gradesInfo.label}`}
                        >
                          {gradesInfo.label}
                        </span>
                      </td>

                      {/* 3. Kế hoạch Hoạt động */}
                      <td className="py-2.5 px-4 align-middle">
                        <div>
                          <div className="font-bold text-[13px] text-slate-900 group-hover:text-[#00A19A] transition-colors leading-snug">
                            {act.name}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="text-[10px] font-mono text-slate-400">{act.code || 'HDTN'}</span>
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-teal-100/80 text-[#003B3A] border border-teal-200">
                              {act.activityTypeName || act.catalogName || 'Trải nghiệm / Dự án'}
                            </span>
                            {act.isProfessionalConfigured ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Đã cấu hình CM</span>
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-black text-amber-900 bg-amber-50 border border-amber-300"
                                title={`Chưa bổ sung: ${act.missingProfessionalFields?.join(', ') || 'Yêu cầu cần đạt, Hình thức, Sản phẩm, Rubric'}`}
                              >
                                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                <span>Chưa bổ sung CM</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Bậc học */}
                      <td className="py-2.5 px-3 align-middle">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
                          {formatEduLevelName(act.educationLevel || (act.meta && act.meta.educationLevel) || '')}
                        </span>
                      </td>

                      {/* 5. Hệ học */}
                      <td className="py-2.5 px-3 align-middle">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                          {formatProgTypeName(act.programType || (act.meta && act.meta.programType) || 'SONG_NGU')}
                        </span>
                      </td>

                      {/* 6. Chủ đề giáo dục */}
                      <td className="py-2.5 px-3 align-middle">
                        {act.themeName ? (
                          (() => {
                            const themeInfo = getEducationalThemeInfo(act.themeName);
                            return themeInfo ? (
                              <span 
                                className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold border leading-snug ${themeInfo.badgeCls}`}
                                title={themeInfo.description}
                              >
                                {act.themeName}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {act.themeName}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-slate-400 font-normal italic">—</span>
                        )}
                      </td>

                      {/* 7. Nội dung giáo dục */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="space-y-1 max-w-[240px]">
                          <div className="line-clamp-2 text-slate-700 font-medium text-[11px] leading-relaxed" title={act.educationalContent || act.description || ''}>
                            {act.educationalContent || act.description || <span className="text-slate-400 font-normal italic">—</span>}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {act.learningOutcomes && (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200" title={`YCCĐ: ${act.learningOutcomes}`}>
                                <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                                <span>YCCĐ</span>
                              </span>
                            )}
                            {act.deliverables && (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200" title={`Sản phẩm: ${act.deliverables}`}>
                                <span>Sản phẩm</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 8. Môn phối hợp */}
                      <td className="py-2.5 px-3 align-middle">
                        {act.primarySubjectName || act.subjectName ? (
                          <div className="mb-0.5">
                            <span className="font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-1.5 py-0.2 rounded text-[10px] inline-block">
                              Chủ trì: {act.primarySubjectName || act.subjectName}
                            </span>
                          </div>
                        ) : null}
                        <div className="text-slate-600 text-[11px] line-clamp-1" title={act.coopSubjectNames || ''}>
                          {act.coopSubjectNames ? `Phối hợp: ${act.coopSubjectNames}` : (act.subjectTeacherName ? `GV: ${act.subjectTeacherName}` : <span className="text-slate-400 font-normal italic">—</span>)}
                        </div>
                      </td>

                      {/* 9. Thời gian & HK */}
                      <td className="py-2.5 px-3 text-slate-600 align-middle whitespace-nowrap">
                        {(() => {
                          const timeInfo = formatTimeFrameAndSemester(act.timeRange || act.timeFrame, '2026-2027', act.semester);
                          return (
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-[12px] text-slate-800 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#00A19A] shrink-0" />
                                <span>{timeInfo.formattedTime}</span>
                              </div>
                              <div>
                                {timeInfo.semester === 1 ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
                                    Học kỳ 1
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                    Học kỳ 2
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 10. Tiến độ Lớp & Hồ sơ HS */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-black">
                            <span className="text-slate-800">
                              {totalClasses > 0 ? `${completedClasses}/${totalClasses} lớp hoàn tất` : 'Chưa phân lớp'}
                            </span>
                            <span className={progressPercent === 100 ? 'text-emerald-600 font-extrabold' : 'text-[#00A19A]'}>
                              {progressPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                            <div
                              className={`h-full rounded-full transition-all ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#003B3A] to-[#00A19A]'}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Ghi nhận: <strong className="text-slate-700">{act.participantsCount || 0} HS</strong></span>
                            <span className="text-teal-700 font-semibold">Hồ sơ cuối</span>
                          </div>
                        </div>
                      </td>

                      {/* 11. Đánh giá */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center align-middle">
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold text-[11px] border border-slate-200 inline-block">
                          {act.evalMode === 'ROLE_BASED' ? 'Vai trò thành viên' : 
                           act.evalMode === 'PARTICIPATION_ONLY' ? 'Điểm danh tham gia' : 
                           `${(act.criteria || []).length || 'Rubric'} tiêu chí`}
                        </span>
                      </td>

                      {/* 12. Trạng thái */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center align-middle">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* 13. Thao tác */}
                      <td className="py-2.5 px-3 text-center min-w-[130px] sticky right-0 bg-white group-hover:bg-slate-50/80 border-l border-slate-200/80 shadow-xs align-middle" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Nút Cấu hình Chuyên môn dành cho GV Phụ trách / TCM / QLCM */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfigModalActivity(act);
                            }}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              !act.isProfessionalConfigured 
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300' 
                                : 'bg-teal-50 hover:bg-teal-100 text-[#003B3A] border-teal-200'
                            }`}
                            title={
                              !act.isProfessionalConfigured
                                ? `Bổ sung chuyên môn: ${act.missingProfessionalFields?.join(', ') || 'Yêu cầu cần đạt, Hình thức, Sản phẩm, Rubric'}`
                                : 'Xem & hiệu chỉnh Cấu hình Chuyên môn'
                            }
                          >
                            <Sliders className={`w-3.5 h-3.5 ${!act.isProfessionalConfigured ? 'text-amber-600' : 'text-[#00A19A]'}`} />
                          </button>

                          {/* Nút hành động chính: Vào sổ đánh giá / nhập vai trò */}
                          <button
                            type="button"
                            onClick={() => router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="Mở bảng nhập vai trò học sinh & đánh giá"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sổ ĐG</span>
                          </button>

                          {/* Nút Xuất Sổ Kế hoạch chi tiết & Đánh giá theo lớp (PDF / In ấn) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEvaluationBookActivity(act);
                              setIsEvaluationBookOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                            title="Xuất Sổ Kế hoạch chi tiết & Đánh giá sự kiện theo lớp (PDF / In ấn)"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          {/* Nút theo dõi tiến độ chi tiết */}
                          <button
                            type="button"
                            onClick={() => setProgressModalActivity(act)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200 cursor-pointer"
                            title="Theo dõi tiến độ nộp của từng lớp"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
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
              const badge = getStatusBadge(act.status, act);
              const totalClasses = act.totalClassesCount || 0;
              const completedClasses = act.completedClassesCount || 0;
              const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;

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
                        {(act.departmentName || act.primarySubjectName || act.subjectName) && (
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            TCM: {act.departmentName || act.primarySubjectName || act.subjectName}
                          </span>
                        )}
                        {act.subjectTeacherName && (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            GVBM: {act.subjectTeacherName}
                          </span>
                        )}

                        {/* Status CM */}
                        {act.isProfessionalConfigured ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã cấu hình CM</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>Chưa bổ sung CM</span>
                          </span>
                        )}
                      </div>

                      {/* Key details list */}
                      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Danh mục HĐ:</span>
                          <span className="font-extrabold text-[#003B3A]">{act.activityTypeName || act.catalogName || 'Trải nghiệm / Dự án'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Bậc học:</span>
                          <span className="font-bold text-slate-800">{act.educationLevel || 'Toàn cấp'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Thời gian & HK:</span>
                          <span className="font-bold text-amber-800">{act.timeRange || 'Trong năm'} (HK {act.semester || 1})</span>
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

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setConfigModalActivity(act);
                            }}
                            className={`p-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              !act.isProfessionalConfigured 
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300' 
                                : 'bg-teal-50 hover:bg-teal-100 text-[#003B3A] border-teal-200'
                            }`}
                            title="Cấu hình Chuyên môn (TCM / GVBM)"
                          >
                            <Sliders className={`w-3.5 h-3.5 ${!act.isProfessionalConfigured ? 'text-amber-600' : 'text-[#00A19A]'}`} />
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setEvaluationBookActivity(act);
                              setIsEvaluationBookOpen(true);
                            }}
                            className="p-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Xuất Sổ Kế hoạch & Đánh giá theo lớp (PDF / In ấn)"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`);
                            }}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 hover:brightness-105 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Vào Sổ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* PROGRESS MODAL */}
      {progressModalActivity && (
        <ActivityProgressModal
          isOpen={!!progressModalActivity}
          onClose={() => setProgressModalActivity(null)}
          activity={progressModalActivity}
        />
      )}

      {/* TEACHER PROFESSIONAL CONFIG MODAL */}
      {configModalActivity && (
        <TeacherProfessionalConfigModal
          isOpen={!!configModalActivity}
          onClose={() => setConfigModalActivity(null)}
          onSaved={() => {
            loadActivities();
            setConfigModalActivity(null);
          }}
          activityId={configModalActivity.id}
          initialData={configModalActivity}
        />
      )}

      {/* CLASS EVENT EVALUATION BOOK MODAL */}
      {isEvaluationBookOpen && evaluationBookActivity && (
        <ClassEventEvaluationBookModal
          isOpen={isEvaluationBookOpen}
          onClose={() => {
            setIsEvaluationBookOpen(false);
            setEvaluationBookActivity(null);
          }}
          activity={evaluationBookActivity}
          currentClassId={evaluationBookActivity.myAssignedClass?.classId}
          classes={evaluationBookActivity.assignedClasses || []}
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
