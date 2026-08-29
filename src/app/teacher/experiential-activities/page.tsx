"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Calendar, Users, ChevronRight, Activity, Trash2, Edit3, Tag, CheckCircle2, Clock, List, LayoutGrid, Sparkles, Filter, FileCheck, Layers, ArrowUpRight, CheckCircle, BarChart3, RefreshCw, X, Eye, FileSpreadsheet, Download, Lock, Unlock, Copy, AlertCircle, Building2, GraduationCap, Shield, Compass, Leaf, User, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { ACTIVITY_STRANDS, SKYLINE_ACTIVITY_TYPES } from "@/lib/experiential/constants";
import { ActivityProgressModal } from "./components/ActivityProgressModal";
import { ExperientialTabs } from "@/components/ExperientialTabs";

export default function ExperientialActivitiesList() {
  const router = useRouter();
  const [rawActivities, setRawActivities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedCampusId, setSelectedCampusId] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedStrand, setSelectedStrand] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState("ALL"); // ALL | ASSIGNED | MY_CREATED
  const [roleScope, setRoleScope] = useState("ALL"); // ALL | GVBM | GVCN | MY_CREATED
  const [viewMode, setViewMode] = useState("list");
  const [progressModalActivity, setProgressModalActivity] = useState(null);
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

  const loadActivities = useCallback(() => {
    if (!selectedYearId) return;
    setLoading(true);
    
    // Fetch all for current year to calculate exact tab counts
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
          filtered = filtered.filter(a => a.campusId === selectedCampusId || a.campusCode === selectedCampusId || (a.assignedClasses && a.assignedClasses.some(c => c.campusId === selectedCampusId || c.campusCode === selectedCampusId)));
        }
        if (selectedLevel !== "ALL") {
          filtered = filtered.filter(a => a.educationLevel === selectedLevel || (a.assignedClasses && a.assignedClasses.some(c => c.level === selectedLevel)));
        }
        if (selectedGrade !== "ALL") {
          filtered = filtered.filter(a => (a.grades && a.grades.includes(selectedGrade)) || (a.assignedClasses && a.assignedClasses.some(c => c.grade === selectedGrade)));
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
            (a.location && a.location.toLowerCase().includes(q))
          );
        }

        setActivities(filtered);
        setLoading(false);
      })
      .catch(() => { setRawActivities([]); setActivities([]); setLoading(false); });
  }, [selectedYearId, selectedCampusId, selectedLevel, selectedGrade, selectedStrand, statusFilter, scopeFilter, roleScope, search]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const handleDelete = async (e, id) => {
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

  const handleDuplicate = async (e, act) => {
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

  const handleToggleLock = async (e, act) => {
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
    if (activities.length === 0) { toast.error("Không có dữ liệu hoạt động để xuất"); return; }
    try {
      const dataToExport = activities.map((act, idx) => ({
        "STT": idx + 1,
        "Mã Hoạt động": act.code || "Tự động",
        "Tên Hoạt động": act.name || "",
        "Mạch Hoạt động": ACTIVITY_STRANDS.find(s => s.id === act.strand)?.name || act.strand || "",
        "Loại Hoạt động": act.activityTypeName || act.catalogName || "",
        "Tổ CM Phụ Trách": act.tcmOrSubjectLabel || act.departmentName || act.subjectName || "Chung",
        "Cơ Sở": getCleanCampusCode(act),
        "Khối": getCleanGrades(act),
        "Ngày Tổ Chức": act.date ? new Date(act.date).toLocaleDateString("vi-VN") : "",
        "Số Lớp Tham Gia": act.totalClassesCount || 0,
        "Số HS Tham Gia": act.participantsCount || 0,
        "Số Tiêu Chí": (act.criteria || []).length,
        "Tiến độ Đánh Giá": `${act.completedClassesCount || 0}/${act.totalClassesCount || 0} lớp`,
        "Trạng Thái": getStatusBadge(act.status).label
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_HDTN");
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Danh_Sach_Hoat_Dong_Trai_Nghiem_${dateStr}.xlsx`);
      toast.success("Đã xuất file Excel thành công!");
    } catch (err) { toast.error("Lỗi khi xuất file Excel"); }
  };
  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED": return { label: "Hoàn thành", containerCls: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500 ring-2 ring-emerald-300" };
      case "IN_PROGRESS": return { label: "Đang đánh giá", containerCls: "bg-sky-50 text-sky-700 border-sky-200/80", dot: "bg-sky-500 ring-2 ring-sky-300" };
      case "ASSIGNED": return { label: "Đã giao", containerCls: "bg-indigo-50 text-indigo-700 border-indigo-200/80", dot: "bg-indigo-500 ring-2 ring-indigo-300" };
      case "LOCKED": return { label: "Đã khóa", containerCls: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-500 ring-2 ring-slate-300" };
      default: return { label: "Nháp", containerCls: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500 ring-2 ring-amber-300" };
    }
  };

  const getStrandBadge = (strandId) => {
    const s = ACTIVITY_STRANDS.find(item => item.id === strandId);
    if (!s) return null;
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black border ${s.badgeColor}`}>
        {s.name}
      </span>
    );
  };


  const getCleanCampusCode = (act) => {
    const code = act.campusCode || '';
    if (code) {
      const clean = code.replace(/Sky-Line\s*/gi, '').trim();
      if (clean) return clean;
    }
    if (act.assignedClasses && act.assignedClasses.length > 0) {
      const extracted = Array.from(new Set(
        act.assignedClasses.map((c) => c.campusCode || (c.className?.includes('_') ? c.className.split('_').pop() : '')).filter(Boolean)
      ));
      if (extracted.length > 0) return extracted.join(', ');
    }
    return 'CS';
  };

  const getCleanGrades = (act) => {
    let gList = act.grades || [];
    if ((!gList || gList.length === 0) && act.assignedClasses && act.assignedClasses.length > 0) {
      gList = Array.from(new Set(act.assignedClasses.map((c) => c.grade).filter(Boolean)));
    }
    if (gList && gList.length > 0) {
      return gList.map((g) => String(g).startsWith('Khối') ? g : `Khối ${g}`).join(', ');
    }
    return 'Toàn trường';
  };

  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.status === "COMPLETED").length;
  const activeActivities = activities.filter(a => a.status === "ASSIGNED" || a.status === "IN_PROGRESS").length;
  const totalStudents = activities.reduce((acc, curr) => acc + (curr.participantsCount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/15 to-sky-50/20 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <ExperientialTabs activeTab="activities" />

        {/* HERO BANNER - SKYLINE TEAL BRANDING */}
        <div className="relative backdrop-blur-xl bg-white/90 rounded-3xl p-6 sm:p-8 border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003B3A] via-[#00A99D] via-[#48BFE3] to-[#6366F1]" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#003B3A] via-[#00A99D] to-[#48BFE3] p-0.5 shadow-lg shadow-[#00A99D]/20 shrink-0 transform hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <Activity className="w-8 h-8 text-[#00A99D]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#00A99D]/10 text-[#003B3A] border border-[#00A99D]/20">
                    Sky-Line Education System
                  </span>
                  <span className="text-slate-300 text-xs"></span>
                  <span className="text-xs font-bold text-slate-500">Quản trị chất lượng giáo dục</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#003B3A] via-[#005F5E] to-[#00A99D] bg-clip-text text-transparent tracking-tight">
                  Quản lý Hoạt động Trải nghiệm Học sinh
                </h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                  Khởi tạo, cấu hình tiêu chí, phân công GVCN và theo dõi đánh giá năng lực học sinh toàn diện
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                onClick={handleExportExcel}
                className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black rounded-2xl border border-slate-200/80 shadow-2xs transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={() => router.push('/teacher/experiential-activities/create')}
                className="px-6 py-3 bg-gradient-to-r from-[#003B3A] via-[#00A99D] to-[#48BFE3] hover:from-[#002B2A] hover:to-[#008F85] text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-[#00A99D]/25 transition-all flex items-center gap-2.5 group transform active:scale-95"
                title="Khởi tạo hoạt động trải nghiệm mới cho lớp chủ nhiệm hoặc bộ môn"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </div>
                <span>+ Tạo hoạt động</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng hoạt động</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{totalActivities}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã hoàn thành</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{completedActivities}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Đang triển khai</p>
                <p className="text-2xl font-black text-sky-700 mt-1">{activeActivities}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#00A99D] uppercase tracking-wider">Lượt học sinh tham gia</p>
                <p className="text-2xl font-black text-[#003B3A] mt-1">{totalStudents}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#00A99D]/10 text-[#00A99D] flex items-center justify-center border border-[#00A99D]/30">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* SCOPE TABS WITH VIBRANT COLORED COUNT BADGES */}
        {(() => {
          const tabCounts = {
            ALL: rawActivities.length,
            GVBM: rawActivities.filter(a => a.isGVBM || (a.hasTcmOrSubject && (a.isGVCN || a.isMyCreated || a.canManage || a.isAssignedToMe))).length,
            GVCN: rawActivities.filter(a => a.isGVCN || a.isMyCreated || a.canManage).length,
            MY_CREATED: rawActivities.filter(a => a.isMyCreated).length
          };

          const tabList = [
            { 
              id: 'ALL', 
              label: 'Tất cả hoạt động', 
              icon: Layers, 
              count: tabCounts.ALL,
              pillActive: 'bg-white/30 text-white border border-white/40 shadow-xs',
              pillInactive: 'bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-200'
            },
            { 
              id: 'GVBM', 
              label: '🎯 Dành cho TCM / GVBM (Môn được gán)', 
              icon: BookOpen, 
              count: tabCounts.GVBM,
              pillActive: 'bg-amber-300 text-amber-950 border border-amber-200 shadow-xs font-black',
              pillInactive: 'bg-amber-100/90 text-amber-900 border border-amber-300 group-hover:bg-amber-200'
            },
            { 
              id: 'GVCN', 
              label: '👥 Dành cho GVCN (Chủ nhiệm)', 
              icon: Users, 
              count: tabCounts.GVCN,
              pillActive: 'bg-indigo-300 text-indigo-950 border border-indigo-200 shadow-xs font-black',
              pillInactive: 'bg-indigo-100/90 text-indigo-900 border border-indigo-300 group-hover:bg-indigo-200'
            },
            { 
              id: 'MY_CREATED', 
              label: '✨ Hoạt động do tôi tạo', 
              icon: Sparkles, 
              count: tabCounts.MY_CREATED,
              pillActive: 'bg-teal-300 text-teal-950 border border-teal-200 shadow-xs font-black',
              pillInactive: 'bg-teal-100/90 text-teal-900 border border-teal-300 group-hover:bg-teal-200'
            }
          ];

          return (
            <div className="flex items-center gap-2.5 flex-wrap">
              {tabList.map(tab => {
                const isActive = roleScope === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRoleScope(tab.id)}
                    className={`group px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white border-transparent shadow-md shadow-[#00A99D]/20 scale-[1.02]'
                        : 'bg-white/90 text-slate-700 border-slate-200/80 hover:bg-white hover:text-slate-900 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#00A99D]'}`} />
                    <span>{tab.label}</span>
                    <span className={`ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all ${
                      isActive ? tab.pillActive : tab.pillInactive
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* MULTI-LEVEL FILTER & CONTROL TOOLBAR */}
        <div className="backdrop-blur-xl bg-white/90 p-4 rounded-3xl border border-white shadow-md shadow-slate-200/40 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Năm học</label>
              <select
                value={selectedYearId}
                onChange={e => setSelectedYearId(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cơ sở</label>
              <select
                value={selectedCampusId}
                onChange={e => setSelectedCampusId(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
              >
                <option value="ALL">Tất cả cơ sở</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.campusName || c.campusCode}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cấp học</label>
              <select
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
              >
                <option value="ALL">Tất cả cấp học</option>
                <option value="Tieu hoc">Tiểu học</option>
                <option value="THCS">THCS</option>
                <option value="THPT">THPT</option>
                <option value="Mam non">Mầm non</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Khối</label>
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
              >
                <option value="ALL">Tất cả khối</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                  <option key={g} value={String(g)}>Khối {g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Mạch hoạt động</label>
              <select
                value={selectedStrand}
                onChange={e => setSelectedStrand(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
              >
                <option value="ALL">Tất cả 4 mạch</option>
                {ACTIVITY_STRANDS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="ASSIGNED">Đã giao lớp</option>
                <option value="IN_PROGRESS">Đang chấm</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="LOCKED">Đã khóa</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên hoạt động, mã, địa điểm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex bg-slate-100 p-1 rounded-xl items-center border border-slate-200">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'list' ? 'bg-white text-[#003B3A] shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Dạng Hàng Cột</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'grid' ? 'bg-white text-[#003B3A] shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Dạng Thẻ</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN ACTIVITIES CONTENT */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/80 rounded-3xl border border-white shadow-xl shadow-slate-200/40 space-y-4">
            <div className="w-10 h-10 border-4 border-[#00A99D]/20 border-t-[#00A99D] rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">Đang tải danh sách hoạt động trải nghiệm Sky-Line...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white/85 rounded-3xl py-16 px-6 text-center border border-white shadow-xl shadow-slate-200/40">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-[#00A99D]/10 mx-auto flex items-center justify-center border border-[#00A99D]/20">
                <Sparkles className="w-10 h-10 text-[#00A99D]" />
              </div>
              <h3 className="text-xl font-black text-slate-800">
                {search ? 'Không tìm thấy hoạt động phù hợp' : 'Chưa có hoạt động trải nghiệm nào'}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                {search 
                  ? `Không có hoạt động nào khớp với từ khóa "${search}". Vui lòng thử lại với từ khóa khác.`
                  : 'Bắt đầu tạo hoạt động trải nghiệm mới với tiêu chí đánh giá và gán lớp cho GVCN.'
                }
              </p>
              <button
                onClick={() => router.push('/teacher/experiential-activities/create')}
                className="px-6 py-3 bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white text-xs font-black rounded-2xl shadow-lg shadow-[#00A99D]/25 inline-flex items-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo hoạt động mới ngay</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white/90 rounded-3xl border border-white shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#00A99D]" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Danh sách Hoạt động ({activities.length} hoạt động)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                Nhấn vào hàng để mở sổ đánh giá của GVCN hoặc theo dõi tiến độ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-4 text-center w-12">#</th>
                    <th className="py-4 px-5 min-w-[120px]">Mã HĐ</th>
                    <th className="py-4 px-5 min-w-[260px]">Tên Hoạt động & Mạch</th>
                    <th className="py-4 px-4 text-center min-w-[140px]">Tổ CM phụ trách</th>
                    <th className="py-4 px-4 text-center min-w-[90px]">Cơ sở</th>
                    <th className="py-4 px-4 text-center min-w-[110px]">Khối</th>
                    <th className="py-4 px-5 min-w-[120px]">Ngày tổ chức</th>
                    <th className="py-4 px-5 text-center min-w-[100px]">Lớp / HS</th>
                    <th className="py-4 px-5 min-w-[100px]">Số tiêu chí</th>
                    <th className="py-4 px-5 min-w-[160px]">Tiến độ đánh giá</th>
                    <th className="py-4 px-5 min-w-[130px]">Trạng thái</th>
                    <th className="py-4 px-5 text-right min-w-[180px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {activities.map((act, index) => {
                    const badge = getStatusBadge(act.status);
                    const totalClasses = act.totalClassesCount || 0;
                    const completedClasses = act.completedClassesCount || 0;
                    const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;
                    const isLocked = act.status === 'LOCKED';

                    return (
                      <tr
                        key={act.id}
                        onClick={() => router.push(act.myAssignedClass?.classId ? `/teacher/experiential-activities/${act.id}?classId=${act.myAssignedClass.classId}` : `/teacher/experiential-activities/${act.id}`)}
                        className="hover:bg-teal-50/30 cursor-pointer transition-colors group"
                      >
                        <td className="py-4 px-4 text-center text-slate-400 font-bold">{index + 1}</td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="inline-block text-[11px] font-black text-[#003B3A] bg-[#00A99D]/10 border border-[#00A99D]/20 px-2.5 py-1 rounded-xl">
                            {act.code || 'HDTN'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-black text-slate-800 group-hover:text-[#00A99D] transition-colors line-clamp-1">
                              {act.name}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {act.assignedRole === 'GVBM' && (
                                <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-2xs">
                                  {act.roleBadgeLabel?.replace(/[🎯👥🌟✨]/g, '').trim() || `Dành cho GVBM Môn ${act.subjectName || ''}`}
                                </span>
                              )}
                              {act.assignedRole === 'GVCN' && (
                                <span className="text-[10px] font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-300 shadow-2xs">
                                  {act.roleBadgeLabel?.replace(/[🎯👥🌟✨]/g, '').trim() || 'Dành cho GVCN'}
                                </span>
                              )}
                              {act.assignedRole === 'GVCN_GVBM' && (
                                <span className="text-[10px] font-black text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-300 shadow-2xs">
                                  {act.roleBadgeLabel?.replace(/[🎯👥🌟✨]/g, '').trim()}
                                </span>
                              )}
                              {act.assignedRole === 'CREATOR' && (
                                <span className="text-[10px] font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-300 shadow-2xs">
                                  Tôi tự tạo
                                </span>
                              )}
                              {getStrandBadge(act.strand)}
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {act.activityTypeName || 'Sự kiện'}
                              </span>
                              {act.subjectName && act.assignedRole !== 'GVBM' && (
                                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Môn: {act.subjectName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* CỘT TỔ CM PHỤ TRÁCH */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          {act.tcmOrSubjectLabel || act.departmentName || act.subjectName ? (
                            <span className="inline-block text-xs font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-300 shadow-2xs">
                              {act.tcmOrSubjectLabel || act.departmentName || act.subjectName}
                            </span>
                          ) : (
                            <span className="inline-block text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                              Chung
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-black bg-teal-50 text-[#003B3A] border border-[#00A99D]/30 shadow-2xs">
                            {getCleanCampusCode(act)}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {getCleanGrades(act)}
                          </span>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="text-slate-700 font-bold">{act.date ? new Date(act.date).toLocaleDateString('vi-VN') : '-'}</span>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap text-center">
                          <div className="font-black text-slate-800">{totalClasses} lớp</div>
                          <div className="text-[11px] text-slate-400 font-bold">{act.participantsCount || 0} HS</div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-bold text-xs border border-slate-200">
                            {act.evalMode === 'PARTICIPATION_ONLY' ? 'Chỉ tham gia' : `${(act.criteria || []).length} tiêu chí`}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-black">
                              <span className="text-slate-700">{completedClasses}/{totalClasses} lớp</span>
                              <span className={progressPercent === 100 ? 'text-emerald-600' : 'text-[#00A99D]'}>
                                {progressPercent}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-[#00A99D]'}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className={`inline-block text-[11px] font-black px-2.5 py-1 rounded-full border ${badge.containerCls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                          {act.canManage ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setProgressModalActivity(act)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-[#00A99D]/10 text-slate-600 hover:text-[#003B3A] transition-colors"
                                title="Theo dõi tiến độ nộp của các lớp"
                              >
                                <BarChart3 className="w-4 h-4 text-[#00A99D]" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  router.push(`/teacher/experiential-activities/create?editId=${act.id}`);
                                }}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-[#00A99D] transition-colors"
                                title="Hiệu chỉnh kế hoạch hoạt động"
                              >
                                <Edit3 className="w-4 h-4 text-[#00A99D]" />
                              </button>
                              <button
                                onClick={e => handleDuplicate(e, act)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
                                title="Nhân bản hoạt động"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={e => handleToggleLock(e, act)}
                                className={`p-2 rounded-xl transition-colors ${
                                  isLocked 
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={isLocked ? 'Mở khóa hoạt động' : 'Khóa hoạt động'}
                              >
                                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={e => handleDelete(e, act.id)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Xóa hoạt động"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => router.push(act.myAssignedClass?.classId ? `/teacher/experiential-activities/${act.id}?classId=${act.myAssignedClass.classId}` : `/teacher/experiential-activities/${act.id}`)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A99D] hover:from-[#002B2A] hover:to-[#008F85] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Tiến hành nhập</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activities.map(act => {
              const badge = getStatusBadge(act.status);
              const totalClasses = act.totalClassesCount || 0;
              const completedClasses = act.completedClassesCount || 0;
              const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;
              const isLocked = act.status === 'LOCKED';

              return (
                <div
                  key={act.id}
                  onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
                  className="group bg-white/90 rounded-3xl border border-white shadow-md shadow-slate-200/40 hover:shadow-xl hover:border-[#00A99D]/40 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
                >
                  <div className="h-1.5 bg-gradient-to-r from-[#003B3A] via-[#00A99D] to-[#48BFE3]" />
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-black text-[#003B3A] bg-[#00A99D]/10 border border-[#00A99D]/20 px-2.5 py-1 rounded-xl">
                          {act.code || 'HDTN'}
                        </span>
                        {act.canManage ? (
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setProgressModalActivity(act)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#00A99D]/10 flex items-center justify-center text-[#00A99D]"
                            title="Theo dõi tiến độ"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              router.push(`/teacher/experiential-activities/create?editId=${act.id}`);
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-teal-50 flex items-center justify-center text-[#00A99D]"
                            title="Hiệu chỉnh kế hoạch"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => handleDuplicate(e, act)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-50 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                            title="Nhân bản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => handleDelete(e, act.id)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        act.myAssignedClass && (
                          <span className="text-[11px] font-black text-[#003B3A] bg-teal-50 border border-[#00A99D]/30 px-2.5 py-0.5 rounded-lg">
                            Lớp {act.myAssignedClass.className}
                          </span>
                        )
                      )}
                      </div>

                      <h3 className="text-base font-black text-slate-800 group-hover:text-[#00A99D] transition-colors line-clamp-2 leading-snug">
                        {act.name}
                      </h3>

                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {act.assignedRole === 'GVBM' && (
                          <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <BookOpen className="w-3 h-3 text-amber-600" />
                            {act.roleBadgeLabel || `Dành cho GVBM Môn ${act.subjectName || ''}`}
                          </span>
                        )}
                        {act.assignedRole === 'GVCN' && (
                          <span className="text-[10px] font-black text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-300 flex items-center gap-1 shadow-2xs">
                            <Users className="w-3 h-3 text-indigo-600" />
                            {act.roleBadgeLabel || 'Dành cho GVCN'}
                          </span>
                        )}
                        {act.assignedRole === 'GVCN_GVBM' && (
                          <span className="text-[10px] font-black text-purple-800 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-300 flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            {act.roleBadgeLabel}
                          </span>
                        )}
                        {act.assignedRole === 'CREATOR' && (
                          <span className="text-[10px] font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-300 flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-teal-600" /> Tôi tự tạo
                          </span>
                        )}
                        {getStrandBadge(act.strand)}
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {act.activityTypeName}
                        </span>
                        {act.subjectName && act.assignedRole !== 'GVBM' && (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Môn: {act.subjectName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#00A99D]" />
                          <span>{act.date ? new Date(act.date).toLocaleDateString('vi-VN') : '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-black text-slate-800">{act.participantsCount || 0}</span> HS
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Tiến độ: {completedClasses}/{totalClasses} lớp</span>
                          <span className="font-black text-[#00A99D]">{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={"h-full rounded-full " + (progressPercent === 100 ? "bg-emerald-500" : "bg-[#00A99D]")} style={{ width: progressPercent + "%" }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badge.containerCls}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-black text-[#00A99D] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          Xem & Chấm điểm <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ActivityProgressModal
          activity={progressModalActivity}
          isOpen={!!progressModalActivity}
          onClose={() => setProgressModalActivity(null)}
        />

      </div>
    </div>
  );
}

