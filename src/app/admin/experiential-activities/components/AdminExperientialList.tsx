// src/app/admin/experiential-activities/components/AdminExperientialList.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { ACTIVITY_STRANDS } from "@/lib/experiential/constants";
import { ExperientialTabs } from "@/components/ExperientialTabs";

export default function AdminExperientialList() {
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
  const [roleScope, setRoleScope] = useState("ALL");
  const [viewMode, setViewMode] = useState("list");

  // Load supporting data
  useEffect(() => {
    Promise.all([
      fetch("/api/academic-years").then(r => r.json()).catch(() => []),
      fetch("/api/campuses").then(r => r.json()).catch(() => [])
    ]).then(([years, camps]) => {
      if (Array.isArray(years) && years.length) {
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
    fetch(`/api/experiential-activities?academicYearId=${selectedYearId}`)
      .then(r => r.json())
      .then(data => {
        const fullList = Array.isArray(data) ? data : [];
        setRawActivities(fullList);
        let filtered = fullList;
        // role scope
        if (roleScope === "GVBM") {
          filtered = filtered.filter(a => a.isGVBM || (a.hasTcmOrSubject && (a.isGVCN || a.isMyCreated || a.canManage || a.isAssignedToMe)));
        } else if (roleScope === "GVCN") {
          filtered = filtered.filter(a => a.isGVCN || a.isMyCreated || a.canManage);
        } else if (roleScope === "MY_CREATED") {
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
  }, [selectedYearId, selectedCampusId, selectedLevel, selectedGrade, selectedStrand, statusFilter, roleScope, search]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const handleDelete = async (e: any, id: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa hoạt động?")) return;
    try {
      const res = await fetch(`/api/experiential-activities/${id}`, { method: "DELETE" });
      if (res.ok) { setActivities(prev => prev.filter(a => a.id !== id)); toast.success("Xóa thành công"); }
      else { const err = await res.json(); toast.error(err.error || "Lỗi xóa"); }
    } catch { toast.error("Lỗi kết nối"); }
  };

  const handleDuplicate = async (e: any, act: any) => {
    e.stopPropagation();
    if (!confirm(`Nhân bản "${act.name}"?`)) return;
    try {
      const res = await fetch(`/api/experiential-activities/${act.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DUPLICATE", academicYearId: selectedYearId })
      });
      if (res.ok) { toast.success("Nhân bản thành công"); loadActivities(); } else toast.error("Lỗi nhân bản");
    } catch { toast.error("Lỗi kết nối"); }
  };

  const handleToggleLock = async (e: any, act: any) => {
    e.stopPropagation();
    const locked = act.status === "LOCKED";
    const verb = locked ? "mở khóa" : "khóa";
    if (!confirm(`Bạn có muốn ${verb} hoạt động "${act.name}"?`)) return;
    try {
      const res = await fetch(`/api/experiential-activities/${act.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: locked ? "UNLOCK" : "LOCK" })
      });
      if (res.ok) { toast.success(`${verb} thành công`); loadActivities(); } else toast.error("Lỗi cập nhật");
    } catch { toast.error("Lỗi kết nối"); }
  };

  const handleExportExcel = () => {
    if (!activities.length) { toast.error("Không có dữ liệu"); return; }
    try {
      const data = activities.map((a, i) => ({
        STT: i + 1,
        "Mã Hoạt động": a.code || "Tự động",
        "Tên Hoạt động": a.name || "",
        "Mạch": ACTIVITY_STRANDS.find(s => s.id === a.strand)?.name || a.strand || "",
        "Loại": a.activityTypeName || a.catalogName || "",
        "Tổ CM": a.tcmOrSubjectLabel || a.departmentName || a.subjectName || "Chung",
        "Cơ sở": getCleanCampusCode(a),
        "Khối": getCleanGrades(a),
        "Ngày": a.date ? new Date(a.date).toLocaleDateString("vi-VN") : "",
        "Lớp": a.totalClassesCount || 0,
        "HS": a.participantsCount || 0,
        "Tiêu chí": (a.criteria || []).length,
        "Tiến độ": `${a.completedClassesCount || 0}/${a.totalClassesCount || 0}`,
        "Trạng thái": getStatusBadge(a.status).label
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "HS");
      const date = new Date().toISOString().slice(0,10);
      XLSX.writeFile(wb, `HDTN_${date}.xlsx`);
      toast.success("Export OK");
    } catch { toast.error("Export lỗi"); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED": return { label: "Hoàn thành", containerCls: "bg-emerald-50 text-emerald-700 border-emerald-200/80" };
      case "IN_PROGRESS": return { label: "Đang đánh giá", containerCls: "bg-sky-50 text-sky-700 border-sky-200/80" };
      case "ASSIGNED": return { label: "Đã giao", containerCls: "bg-indigo-50 text-indigo-700 border-indigo-200/80" };
      case "LOCKED": return { label: "Đã khóa", containerCls: "bg-slate-100 text-slate-700 border-slate-300" };
      default: return { label: "Nháp", containerCls: "bg-amber-50 text-amber-700 border-amber-200/80" };
    }
  };

  const getCleanCampusCode = (act: any) => {
    const code = act.campusCode || "";
    if (code) {
      const clean = code.replace(/Sky-Line\s*/gi, "").trim();
      if (clean) return clean;
    }
    if (act.assignedClasses && act.assignedClasses.length) {
      const list = Array.from(new Set(act.assignedClasses.map((c:any) => c.campusCode || (c.className?.includes('_') ? c.className.split('_').pop() : "")).filter(Boolean)));
      if (list.length) return list.join(", ");
    }
    return "CS";
  };

  const getCleanGrades = (act: any) => {
    let g = act.grades || [];
    if (!g.length && act.assignedClasses && act.assignedClasses.length) {
      g = Array.from(new Set(act.assignedClasses.map((c:any) => c.grade).filter(Boolean)));
    }
    if (g.length) return g.map((v:any) => String(v).startsWith("Khối") ? v : `Khối ${v}`).join(", ");
    return "Toàn trường";
  };

  const totalActivities = activities.length;
  const completed = activities.filter(a => a.status === "COMPLETED").length;
  const inProg = activities.filter(a => a.status === "ASSIGNED" || a.status === "IN_PROGRESS").length;
  const totalStudents = activities.reduce((s,a) => s + (a.participantsCount||0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/15 to-sky-50/20 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <ExperientialTabs activeTab="activities" />
        {/* Header */}
        <div className="relative backdrop-blur-xl bg-white/90 rounded-3xl p-6 sm:p-8 border border-white shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003B3A] via-[#00A99D] via-[#48BFE3] to-[#6366F1]" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#003B3A] via-[#00A99D] to-[#48BFE3] p-0.5 shadow-lg shadow-[#00A99D]/20 shrink-0 transform hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <span className="text-[#00A99D] font-bold">EXP</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#00A99D]/10 text-[#003B3A] border border-[#00A99D]/20">Sky-Line Education System</span>
                  <span className="text-slate-300 text-xs" />
                  <span className="text-xs font-bold text-slate-500">Quản trị chất lượng giáo dục</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#003B3A] via-[#005F5E] to-[#00A99D] bg-clip-text text-transparent tracking-tight">Quản lý Hoạt động Trải nghiệm Học sinh</h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                  Khởi tạo, cấu hình tiêu chí, phân công GVCN và theo dõi đánh giá năng lực học sinh toàn diện
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button onClick={handleExportExcel} className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black rounded-2xl border border-slate-200/80 shadow-2xs transition-all">Xuất Excel</button>
              <button onClick={() => router.push(`${basePath}/create`)} className="px-6 py-3 bg-gradient-to-r from-[#003B3A] via-[#00A99D] to-[#48BFE3] hover:from-[#002B2A] hover:to-[#008F85] text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-[#00A99D]/25 transition-all flex items-center gap-2.5 group transform active:scale-95" title="Tạo hoạt động mới">
                + Tạo hoạt động
              </button>
            </div>
          </div>
          {/* Quick metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng hoạt động</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{totalActivities}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">#</div>
            </div>
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã hoàn thành</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{completed}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">✓</div>
            </div>
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Đang triển khai</p>
                <p className="text-2xl font-black text-sky-700 mt-1">{inProg}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">⧖</div>
            </div>
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#00A99D] uppercase tracking-wider">Lượt học sinh tham gia</p>
                <p className="text-2xl font-black text-[#003B3A] mt-1">{totalStudents}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#00A99D]/10 text-[#00A99D] flex items-center justify-center border border-[#00A99D]/30">👥</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="backdrop-blur-xl bg-white/90 p-4 rounded-3xl border border-white shadow-md space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Năm học</label>
              <select value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)} className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none">
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cơ sở</label>
              <select value={selectedCampusId} onChange={e => setSelectedCampusId(e.target.value)} className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none">
                <option value="ALL">Tất cả cơ sở</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName || c.campusCode}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cấp học</label>
              <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none">
                <option value="ALL">Tất cả cấp học</option>
                <option value="Tieu hoc">Tiểu học</option>
                <option value="THCS">THCS</option>
                <option value="THPT">THPT</option>
                <option value="Mam non">Mầm non</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Khối</label>
              <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none">
                <option value="ALL">Tất cả khối</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={String(g)}>Khối {g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Mạch hoạt động</label>
              <select value={selectedStrand} onChange={e => setSelectedStrand(e.target.value)} className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none">
                <option value="ALL">Tất cả 4 mạch</option>
                {ACTIVITY_STRANDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="relative w-full sm:max-w-md">
              <input type="text" placeholder="Tìm tên, mã, địa điểm..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex bg-slate-100 p-1 rounded-xl items-center border border-slate-200">
                <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white text-[#003B3A] shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}>Bảng</button>
                <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-white text-[#003B3A] shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}>Thẻ</button>
              </div>
            </div>
          </div>
        </div>

        {/* Main list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/80 rounded-3xl border border-white shadow-xl space-y-4">
            <div className="w-10 h-10 border-4 border-[#00A99D]/20 border-t-[#00A99D] rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">Đang tải...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white/85 rounded-3xl py-16 px-6 text-center border border-white shadow-xl">
            <h3 className="text-xl font-black text-slate-800">{search ? 'Không tìm thấy' : 'Chưa có hoạt động'}</h3>
            <button onClick={() => router.push(`${basePath}/create`)} className="px-6 py-3 bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white text-xs font-black rounded-2xl shadow-lg mt-4">+ Tạo hoạt động</button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white/90 rounded-3xl border border-white shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700">Danh sách ({activities.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase">
                  <tr className="border-b border-slate-200">
                    <th className="py-4 px-4 w-12 text-center">#</th>
                    <th className="py-4 px-5 min-w-[120px]">Mã HĐ</th>
                    <th className="py-4 px-5 min-w-[260px]">Tên &amp; Mạch</th>
                    <th className="py-4 px-4 min-w-[140px] text-center">Tổ CM</th>
                    <th className="py-4 px-4 min-w-[90px] text-center">Cơ sở</th>
                    <th className="py-4 px-4 min-w-[110px] text-center">Khối</th>
                    <th className="py-4 px-5 min-w-[120px]">Ngày</th>
                    <th className="py-4 px-5 min-w-[100px] text-center">Lớp / HS</th>
                    <th className="py-4 px-5 min-w-[100px]">Tiêu chí</th>
                    <th className="py-4 px-5 min-w-[160px]">Tiến độ</th>
                    <th className="py-4 px-5 min-w-[130px]">Trạng thái</th>
                    <th className="py-4 px-5 text-right min-w-[180px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {activities.map((act, i) => {
                    const badge = getStatusBadge(act.status);
                    const totalClasses = act.totalClassesCount || 0;
                    const completedClasses = act.completedClassesCount || 0;
                    const prog = totalClasses ? Math.round((completedClasses / totalClasses) * 100) : 0;
                    const locked = act.status === 'LOCKED';
                    return (
                      <tr key={act.id} onClick={() => router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`)} className="hover:bg-teal-50/30 cursor-pointer transition-colors">
                        <td className="py-4 px-4 text-center text-slate-400 font-bold">{i+1}</td>
                        <td className="py-4 px-5"><span className="inline-block text-[11px] font-black text-[#003B3A] bg-[#00A99D]/10 border border-[#00A99D]/20 px-2.5 py-1 rounded-xl">{act.code || 'HDTN'}</span></td>
                        <td className="py-4 px-5">
                          <h4 className="text-sm font-black text-slate-800 group-hover:text-[#00A99D] transition-colors line-clamp-1">{act.name}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {act.strand && <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{act.strand}</span>}
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{act.activityTypeName || 'Sự kiện'}</span>
                            {act.subjectName && act.assignedRole !== 'GVBM' && <span className="text-[10px] font-black bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Môn: {act.subjectName}</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {act.tcmOrSubjectLabel || act.departmentName || act.subjectName ? (
                            <span className="inline-block text-xs font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-300">{act.tcmOrSubjectLabel || act.departmentName || act.subjectName}</span>
                          ) : (
                            <span className="inline-block text-[11px] font-semibold bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">Chung</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center"><span className="inline-block px-2.5 py-1 rounded-xl bg-teal-50 text-[#003B3A] border border-[#00A99D]/30">{getCleanCampusCode(act)}</span></td>
                        <td className="py-4 px-4 text-center"><span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">{getCleanGrades(act)}</span></td>
                        <td className="py-4 px-5"><span className="font-bold text-slate-700">{act.date ? new Date(act.date).toLocaleDateString('vi-VN') : '-'}</span></td>
                        <td className="py-4 px-5 text-center"><div className="font-black text-slate-800">{totalClasses} lớp</div><div className="text-[11px] text-slate-400">{act.participantsCount || 0} HS</div></td>
                        <td className="py-4 px-5"><span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-bold text-xs border border-slate-200">{act.evalMode === 'PARTICIPATION_ONLY' ? 'Chỉ tham gia' : `${(act.criteria||[]).length} tiêu chí`}</span></td>
                        <td className="py-4 px-5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-black"><span>{completedClasses}/{totalClasses} lớp</span><span className={prog===100?'text-emerald-600':'text-[#00A99D]'}>{prog}%</span></div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5"><div className={`h-full rounded-full ${prog===100?'bg-emerald-500':'bg-[#00A99D]'}`} style={{width:`${prog}%`}}></div></div>
                          </div>
                        </td>
                        <td className="py-4 px-5"><span className={`inline-block text-[11px] font-black px-2.5 py-1 rounded-full border ${badge.containerCls}`}>{badge.label}</span></td>
                        <td className="py-4 px-5 text-right" onClick={e=>e.stopPropagation()}>
                          {act.canManage ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setProgressModalActivity(act)} className="p-2 rounded-xl bg-slate-100 hover:bg-[#00A99D]/10 text-slate-600 hover:text-[#003B3A]" title="Tiến độ">Tiến độ</button>
                              <button onClick={e=>{e.stopPropagation(); router.push(`${basePath}/create?editId=${act.id}`);}} className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-[#00A99D]" title="Sửa">Sửa</button>
                              <button onClick={e=>handleDuplicate(e, act)} className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600" title="Nhân bản">Nhân bản</button>
                              <button onClick={e=>handleToggleLock(e, act)} className={`p-2 rounded-xl ${locked?'bg-amber-50 text-amber-700 hover:bg-amber-100':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title={locked?'Mở khóa':'Khóa'}>{locked?'Mở khóa':'Khóa'}</button>
                              <button onClick={e=>handleDelete(e, act.id)} className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600" title="Xóa">Xóa</button>
                            </div>
                          ) : (
                            <button onClick={() => router.push(act.myAssignedClass?.classId ? `${basePath}/${act.id}?classId=${act.myAssignedClass.classId}` : `${basePath}/${act.id}`)} className="px-3.5 py-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white text-xs font-black rounded-xl shadow-xs">Xem</button>
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
          <div>Grid view placeholder</div>
        )}
      </div>
    </div>
  );
}
