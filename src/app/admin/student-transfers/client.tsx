"use client"
import * as XLSX from "xlsx"
import { useRef } from "react"
import { useState, useEffect, useMemo } from "react" 
// import useRef added above
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"
import { PieChart as PieIcon, ArrowRightLeft, ArrowRightToLine, ArrowLeftToLine, Search, Plus, X, Loader2, UserCheck, GraduationCap, Baby, Edit, RotateCcw, BarChart3, ChevronDown, ChevronUp, Eye, EyeOff, Building2, Layers, BookOpen, MapPin, School, Activity, RefreshCw, Sparkles, Clock, CheckCircle2, TrendingUp, Filter } 
import { getDestinationSchoolsAction } from "../truong-lien-ket/actions"
import { 
  getTransferFormOptionsAction, 
  getClassesByCampusAndYearAction, 
  getStudentsByClassAction, 
  createTransferOutAction, 
  updateTransferOutAction,
  importTransfersOutAction,
  getTransfersAction, 
  createChangeClassAction, 
  updateTransferInAction, 
  getInputAssessmentStudentsAction, 
  getInputAssessmentPeriodsAction, 
  getInputAssessmentBatchesAction, 
  getInputAssessmentStudentsByPeriodAction, 
  getPendingEnrollmentsAction, 
  completeEnrollmentAction,
  completeBatchEnrollmentAction,
  getPreschoolInputAssessmentPeriodsAction,
  getPreschoolInputAssessmentBatchesAction,
  getPreschoolInputAssessmentStudentsByPeriodAction,
  revertTransferAction,
  updateBatchTransferOutAction
} from "./actions"

const isClassPreschool = (c: any) => {
  if (!c) return false;
  const lvl = (c.level || "").toLowerCase();
  const name = (c.className || "").toLowerCase();
  return lvl.includes("mam") || lvl.includes("mầm") || lvl.includes("preschool") ||
         name.includes("mam") || name.includes("mầm") || name.includes("preschool") ||
         name.includes("nhóm") || name.includes("nhom") ||
         name.includes("chồi") || name.includes("choi") ||
         name.includes("lá") || name.includes("la");
};

const checkIsPreschoolStudent = (student: any) => {
  if (!student) return false;
  return isClassPreschool(student.class);
};


// --- REALTIME VISUAL DASHBOARD COMPONENT ---
const PIE_COLORS = ["#00A99D", "#10B981", "#F59E0B", "#6366F1", "#0284C7", "#EC4899", "#8B5CF6", "#F43F5E"];

function RealtimeTransferDashboard({
  transfers,
  pendingRequests,
  activeTab,
  activeSubTab,
  onRefresh,
  loading = false
}: {
  transfers: any[];
  pendingRequests: any[];
  activeTab: "OUT" | "IN" | "CHANGE_CLASS";
  activeSubTab: "general" | "preschool";
  onRefresh: () => void;
  loading?: boolean;
}) {
  const [showStats, setShowStats] = useState(true);
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>("ALL");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
  }, [transfers, pendingRequests]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredPending = useMemo(() => {
    return pendingRequests.filter(req => 
      activeSubTab === "preschool" ? req.isPreschool : !req.isPreschool
    );
  }, [pendingRequests, activeSubTab]);

  const filteredInTransfers = useMemo(() => transfers.filter(t => t.type === "IN"), [transfers]);
  const filteredOutTransfers = useMemo(() => transfers.filter(t => t.type === "OUT"), [transfers]);
  const filteredChangeClassTransfers = useMemo(() => transfers.filter(t => t.type === "CHANGE_CLASS"), [transfers]);

  const totalPending = filteredPending.length;
  const totalIn = filteredInTransfers.length;
  const totalOut = filteredOutTransfers.length;
  const totalChangeClass = filteredChangeClassTransfers.length;
  const totalTransfersOverall = transfers.length;

  const currentTabTotalRequests = activeTab === "IN" 
    ? (totalPending + totalIn) 
    : activeTab === "OUT" 
    ? totalOut 
    : totalChangeClass;

  const currentTabCompletionRate = currentTabTotalRequests > 0 
    ? Math.round(((activeTab === "IN" ? totalIn : currentTabTotalRequests) / currentTabTotalRequests) * 100) 
    : 100;

  // Campus Chart Data
  const campusChartData = useMemo(() => {
    const map: Record<string, { campus: string; enrolled: number; pending: number; transferOut: number }> = {};
    
    filteredPending.forEach(r => {
      const name = r.admissionCampus || "Khác";
      if (!map[name]) map[name] = { campus: name, enrolled: 0, pending: 0, transferOut: 0 };
      map[name].pending++;
    });

    filteredInTransfers.forEach(t => {
      const name = t.student?.class?.campus?.campusName || "Khác";
      if (!map[name]) map[name] = { campus: name, enrolled: 0, pending: 0, transferOut: 0 };
      map[name].enrolled++;
    });

    filteredOutTransfers.forEach(t => {
      const name = t.student?.class?.campus?.campusName || "Khác";
      if (!map[name]) map[name] = { campus: name, enrolled: 0, pending: 0, transferOut: 0 };
      map[name].transferOut++;
    });

    return Object.values(map).sort((a, b) => (b.enrolled + b.pending) - (a.enrolled + a.pending));
  }, [filteredPending, filteredInTransfers, filteredOutTransfers]);

  const availableCampuses = useMemo(() => {
    const set = new Set<string>();
    campusChartData.forEach(c => set.add(c.campus));
    return Array.from(set);
  }, [campusChartData]);

  // Grade Level Distribution
  const gradeChartData = useMemo(() => {
    const map: Record<string, number> = {};

    if (activeTab === "IN") {
      filteredPending.forEach(r => {
        if (selectedCampusFilter !== "ALL" && (r.admissionCampus || "Khác") !== selectedCampusFilter) return;
        const name = r.isPreschool ? "Mầm non" : "Khối " + (r.grade || "Khác");
        map[name] = (map[name] || 0) + 1;
      });
      filteredInTransfers.forEach(t => {
        const campusName = t.student?.class?.campus?.campusName || "Khác";
        if (selectedCampusFilter !== "ALL" && campusName !== selectedCampusFilter) return;
        const isPre = checkIsPreschoolStudent(t.student);
        const name = isPre ? "Mầm non" : "Khối " + (t.student?.class?.grade || "Khác");
        map[name] = (map[name] || 0) + 1;
      });
    } else {
      const targetTransfers = activeTab === "OUT" ? filteredOutTransfers : filteredChangeClassTransfers;
      targetTransfers.forEach(t => {
        const campusName = t.student?.class?.campus?.campusName || "Khác";
        if (selectedCampusFilter !== "ALL" && campusName !== selectedCampusFilter) return;
        const name = "Khối " + (t.student?.class?.grade || "Khác");
        map[name] = (map[name] || 0) + 1;
      });
    }

    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredPending, filteredInTransfers, filteredOutTransfers, filteredChangeClassTransfers, activeTab, selectedCampusFilter]);

  // Class Breakdown List
  const classBreakdownList = useMemo(() => {
    const map: Record<string, { name: string; campusName: string; count: number }> = {};
    const dataset = activeTab === "IN" ? filteredInTransfers : (activeTab === "OUT" ? filteredOutTransfers : filteredChangeClassTransfers);

    dataset.forEach(t => {
      const className = t.student?.class?.className;
      if (!className) return;
      const campusName = t.student?.class?.campus?.campusName || "Khác";
      if (selectedCampusFilter !== "ALL" && campusName !== selectedCampusFilter) return;

      if (!map[className]) map[className] = { name: className, campusName, count: 0 };
      map[className].count++;
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredInTransfers, filteredOutTransfers, filteredChangeClassTransfers, activeTab, selectedCampusFilter]);

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    const events: Array<{ id: string; name: string; code: string; type: string; campus: string; time: string; color: string }> = [];

    filteredPending.slice(0, 3).forEach((p, idx) => {
      events.push({
        id: "p_" + (p.id || idx),
        name: p.fullName || "Học sinh",
        code: p.studentCode || ("HS00" + (idx + 1)),
        type: "Chờ xếp lớp",
        campus: p.admissionCampus || "Cơ sở",
        time: "Vừa cập nhật",
        color: "amber"
      });
    });

    filteredInTransfers.slice(0, 3).forEach((t, idx) => {
      events.push({
        id: "in_" + (t.id || idx),
        name: t.student?.fullName || "Học sinh",
        code: t.student?.studentCode || "",
        type: "Đã nhập học",
        campus: t.student?.class?.campus?.campusName || "Cơ sở",
        time: "Gần đây",
        color: "emerald"
      });
    });

    filteredOutTransfers.slice(0, 2).forEach((t, idx) => {
      events.push({
        id: "out_" + (t.id || idx),
        name: t.student?.fullName || "Học sinh",
        code: t.student?.studentCode || "",
        type: "Chuyển đi",
        campus: t.student?.class?.campus?.campusName || "Cơ sở",
        time: "Gần đây",
        color: "rose"
      });
    });

    return events.slice(0, 5);
  }, [filteredPending, filteredInTransfers, filteredOutTransfers]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 backdrop-blur-md text-xs font-semibold space-y-1.5 animate-in fade-in duration-150">
          <p className="font-extrabold text-slate-200 border-b border-slate-700/80 pb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#00A99D]" /> {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-extrabold text-white">{entry.value} HS</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden transition-all animate-in fade-in duration-300">
      {/* REALTIME HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 md:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#00A99D]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3.5 z-10">
          <div className="p-3 bg-gradient-to-br from-[#00A99D] to-emerald-600 rounded-2xl shadow-lg text-white">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-black tracking-tight text-white">
                Dashboard Thống Kê &amp; Phân Tích Lưu Chuyển
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                REALTIME LIVE
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2">
              <span>Theo dõi trực quan sự tương quan giữa Cơ sở, Khối lớp, Lớp học và Học sinh</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Cập nhật: {lastUpdated}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 self-end md:self-center">
          <button
            onClick={handleManualRefresh}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-extrabold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#00A99D]" : ""}`} />
            Làm mới Realtime
          </button>
          
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00A99D] hover:bg-[#009187] text-white rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95"
          >
            {showStats ? (
              <>
                <EyeOff className="w-4 h-4" />
                Ẩn Dashboard
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Hiện Dashboard
              </>
            )}
          </button>
        </div>
      </div>

      {showStats && (
        <div className="p-6 space-y-6 bg-slate-50/40">
          
          {/* 1. TOP METRIC CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Requests */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl group-hover:bg-teal-500/10 transition-all"></div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  {activeTab === "IN" ? "Tổng yêu cầu chuyển đến" : activeTab === "OUT" ? "Tổng học sinh chuyển đi" : "Tổng phiếu chuyển lớp"}
                </span>
                <div className="p-2 bg-teal-50 text-[#00A99D] rounded-xl group-hover:scale-110 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">{currentTabTotalRequests}</span>
                  <span className="text-xs font-semibold text-slate-400">học sinh</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Toàn hệ thống:</span>
                  <span className="font-extrabold text-[#00A99D]">{totalTransfersOverall} lượt</span>
                </div>
              </div>
            </div>

            {/* Card 2: Pending Placement */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all"></div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wider">Chờ xếp lớp (Pending)</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-600 tracking-tight">{totalPending}</span>
                  <span className="text-xs font-semibold text-amber-500/80">học sinh</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px]">
                  <span className="text-amber-700 font-medium">Trạng thái:</span>
                  <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                    Cần xử lý ngay
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Enrolled */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">Đã nhập học (Enrolled)</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600 tracking-tight">{totalIn}</span>
                  <span className="text-xs font-semibold text-emerald-500/80">học sinh</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-medium">Phân lớp chính thức</span>
                  <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Đã hoàn tất
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Completion Rate */}
            <div className="bg-white p-5 rounded-2xl border border-sky-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-all"></div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-sky-700 uppercase tracking-wider">Tỷ lệ Hoàn thành</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-sky-600 tracking-tight">{currentTabCompletionRate}%</span>
                  <div className="flex-1 bg-sky-100 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="bg-gradient-to-r from-sky-500 to-[#00A99D] h-full rounded-full transition-all duration-500" 
                      style={{ width: currentTabCompletionRate + "%" }}
                    ></div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-sky-100 flex items-center justify-between text-[11px]">
                  <span className="text-sky-700 font-medium">Tiến độ phân bổ:</span>
                  <span className="font-extrabold text-sky-600">Đạt tiêu chuẩn</span>
                </div>
              </div>
            </div>

          </div>

          {/* 2. INTERRELATED ENTITY FILTER NODES */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                <Filter className="w-4 h-4 text-[#00A99D]" />
              </div>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Lọc Tương Quan Theo Cơ Sở:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setSelectedCampusFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                  selectedCampusFilter === "ALL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🌐 Tất cả Cơ sở ({availableCampuses.length})
              </button>
              
              {availableCampuses.map(campus => (
                <button
                  key={campus}
                  onClick={() => setSelectedCampusFilter(campus)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                    selectedCampusFilter === campus
                      ? "bg-[#00A99D] text-white border-[#00A99D] shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {campus}
                </button>
              ))}
            </div>
          </div>

          {/* 3. RECHARTS VISUALIZATION GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart A: Campus Breakdown Bar Chart (2 columns width) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-50 text-[#00A99D] rounded-xl">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Biểu đồ Phân bổ Học sinh Theo Cơ sở
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">So sánh số lượng Đã nhập học vs Chờ xếp lớp vs Chuyển đi</p>
                  </div>
                </div>
                {selectedCampusFilter !== "ALL" && (
                  <span className="text-[11px] font-extrabold text-[#00A99D] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                    Đang lọc: {selectedCampusFilter}
                  </span>
                )}
              </div>

              {campusChartData.length > 0 ? (
                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="campus" tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 10 }} 
                        iconType="circle"
                      />
                      <Bar dataKey="enrolled" name="Đã nhập học" fill="#00A99D" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="pending" name="Chờ xếp lớp" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="transferOut" name="Chuyển đi" fill="#F43F5E" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-xs font-medium text-slate-400 italic">
                  Chưa có dữ liệu biểu đồ cơ sở
                </div>
              )}
            </div>

            {/* Chart B: Grade Distribution Donut Chart (1 column width) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Cơ cấu Theo Khối Lớp
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">Tỷ lệ phân bổ học sinh theo khối</p>
                  </div>
                </div>
              </div>

              {gradeChartData.length > 0 ? (
                <div className="h-[220px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gradeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {gradeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [`${value} học sinh`, name]}
                        contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: 12, fontSize: 11, color: "#fff", fontWeight: 700 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-slate-800">
                      {gradeChartData.reduce((acc, curr) => acc + curr.value, 0)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Học sinh</span>
                  </div>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-xs font-medium text-slate-400 italic">
                  Chưa có dữ liệu khối lớp
                </div>
              )}

              <div className="max-h-[85px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar text-[11px]">
                {gradeChartData.map((g, idx) => (
                  <div key={g.name} className="flex justify-between items-center font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                      {g.name}
                    </span>
                    <span className="text-slate-800 font-extrabold">{g.value} HS</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 4. INTERRELATED DRILL-DOWN & RECENT ACTIVITY STREAM */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            
            {/* Class Capacity & Allocation Breakdown List (2 cols) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span>Phân bổ Học sinh Theo Lớp học</span>
                      {selectedCampusFilter !== "ALL" && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-extrabold">
                          Cơ sở: {selectedCampusFilter}
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">Danh sách các lớp học đã tiếp nhận học sinh lưu chuyển</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-500">
                  {classBreakdownList.length} lớp học
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {classBreakdownList.length > 0 ? classBreakdownList.map(cl => (
                  <div key={cl.name} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/60 hover:bg-white hover:shadow-xs transition-all flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{cl.name}</span>
                        <span className="text-[10px] font-bold text-[#00A99D] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                          {cl.campusName}
                        </span>
                      </div>
                      <div className="w-32 bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-[#00A99D] h-full rounded-full" style={{ width: Math.min(100, (cl.count * 15)) + "%" }}></div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-600">{cl.count}</span>
                      <span className="text-[10px] font-bold text-slate-400 block">học sinh</span>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-2 text-center py-8 text-xs font-medium text-slate-400 italic">
                    Chưa có dữ liệu lớp học cho cơ sở đã chọn
                  </div>
                )}
              </div>
            </div>

            {/* Live Activity Stream (1 col) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Luồng Hoạt Động Realtime
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">Nhật ký cập nhật học sinh mới nhất</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {recentActivities.map((act) => (
                  <div key={act.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1 hover:bg-slate-100/50 transition-colors text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800 truncate max-w-[140px]">{act.name}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        act.color === "emerald" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : act.color === "amber"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {act.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                      <span>Mã: <strong className="text-slate-700">{act.code}</strong> • {act.campus}</span>
                      <span className="text-slate-400 text-[10px]">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export function StudentTransfersClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [activeTab, setActiveTab] = useState<"OUT" | "IN" | "CHANGE_CLASS">("OUT")
  const [yearId, setYearId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear");
      if (stored) return stored;
    }
    return "";
  });

  useEffect(() => {
    const handleYearChange = () => {
      const stored = localStorage.getItem("selectedAcademicYear");
      if (stored && stored !== yearId) {
        setYearId(stored);
      }
    };
    window.addEventListener("academicYearChanged", handleYearChange);
    return () => window.removeEventListener("academicYearChanged", handleYearChange);
  }, [yearId]);

  const [activeSubTab, setActiveSubTab] = useState<"general" | "preschool">("general")

  const [showOutModal, setShowOutModal] = useState(false)
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [showInModal, setShowInModal] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<any>(null)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  
  const [transfers, setTransfers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [showOutStats, setShowOutStats] = useState(true)
  const [globalSearch, setGlobalSearch] = useState("")
  const [historyFilterClass, setHistoryFilterClass] = useState("")
  const [showBatchEditModal, setShowBatchEditModal] = useState(false)
  const [filterOutClass, setFilterOutClass] = useState("")
  const [filterOutCampus, setFilterOutCampus] = useState("")
  const [filterOutType, setFilterOutType] = useState("")
  const [filterOutCategory, setFilterOutCategory] = useState("")
  const [filterOutProvince, setFilterOutProvince] = useState("")
  const [historyPage, setHistoryPage] = useState(1)
  const [pendingPage, setPendingPage] = useState(1)

  // Filters, search, and selection states for pending requests
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCampus, setFilterCampus] = useState("")
  const [filterGrade, setFilterGrade] = useState("")
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])
  const [selectedOutTransferIds, setSelectedOutTransferIds] = useState<string[]>([])
  const [selectedRequests, setSelectedRequests] = useState<any[] | null>(null)

  useEffect(() => {
    setSelectedOutTransferIds([]);
  }, [activeTab, activeSubTab, yearId]);

  useEffect(() => {
    loadTransfers()
  }, [])

  useEffect(() => {
    setSelectedRequestIds([]);
    setSearchTerm("");
    setFilterCampus("");
    setFilterGrade("");
    setHistoryFilterClass("");
    setHistoryPage(1);
    setPendingPage(1);
  }, [activeSubTab]);

  useEffect(() => {
    setPendingPage(1);
  }, [searchTerm, filterCampus, filterGrade]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilterClass]);

  const handleDownloadTemplate = () => {
    const data = [
      {
        "Mã học sinh": "HS0001",
        "Ngày chuyển": "15/07/2026",
        "Kỳ học": "HK1",
        "Diện chuyển": "DOMESTIC",
        "Trường chuyển đến": "Trường THPT Phan Châu Trinh",
        "Loại hình": "PUBLIC",
        "Tỉnh/TP": "Thành phố Đà Nẵng",
        "Quốc gia theo học": "",
        "Từ ngày": "",
        "Đến ngày": "",
        "Lý do": "Chuyển nhà"
      },
      {
        "Mã học sinh": "HS0002",
        "Ngày chuyển": "20/07/2026",
        "Kỳ học": "SUMMER",
        "Diện chuyển": "ABROAD",
        "Trường chuyển đến": "",
        "Loại hình": "",
        "Tỉnh/TP": "",
        "Quốc gia theo học": "Singapore",
        "Từ ngày": "",
        "Đến ngày": "",
        "Lý do": "Du học học bổng"
      },
      {
        "Mã học sinh": "HS0003",
        "Ngày chuyển": "25/07/2026",
        "Kỳ học": "HK2",
        "Diện chuyển": "RESERVE",
        "Trường chuyển đến": "",
        "Loại hình": "",
        "Tỉnh/TP": "",
        "Quốc gia theo học": "",
        "Từ ngày": "01/08/2026",
        "Đến ngày": "31/12/2026",
        "Lý do": "Bảo lưu điều trị bệnh"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Import_Chuyen_Di");

    // Add note sheet
    const notes = [
      ["Cột", "Mô tả", "Giá trị hợp lệ / Ví dụ"],
      ["Mã học sinh", "Bắt buộc. Mã học sinh đang học tại trường.", "Ví dụ: HS0001"],
      ["Ngày chuyển", "Bắt buộc. Ngày học sinh chính thức chuyển.", "Định dạng dd/mm/yyyy"],
      ["Kỳ học", "Bắt buộc. Kỳ học chuyển đi.", "HK1, HK2, SUMMER"],
      ["Diện chuyển", "Bắt buộc. Diện chuyển đi.", "DOMESTIC (Chuyển trường VN), ABROAD (Du học), RESERVE (Bảo lưu), GRADUATED (Tốt nghiệp THPT)"],
      ["Trường chuyển đến", "Tên trường chuyển đến (chỉ dùng cho diện DOMESTIC).", "Ví dụ: Trường THPT Phan Châu Trinh"],
      ["Loại hình", "Loại hình trường (chỉ dùng cho diện DOMESTIC).", "PRIVATE (Tư thục), PUBLIC (Công lập), OTHER (Khác)"],
      ["Tỉnh/TP", "Tỉnh/Thành phố của trường đến (chỉ dùng cho diện DOMESTIC).", "Ví dụ: Thành phố Đà Nẵng"],
      ["Quốc gia theo học", "Tên quốc gia du học (chỉ dùng cho diện ABROAD).", "Ví dụ: Singapore, Mỹ, Úc..."],
      ["Từ ngày", "Ngày bắt đầu bảo lưu (bắt buộc cho diện RESERVE).", "Định dạng dd/mm/yyyy"],
      ["Đến ngày", "Ngày kết thúc bảo lưu (bắt buộc cho diện RESERVE).", "Định dạng dd/mm/yyyy"],
      ["Lý do", "Lý do chuyển đi (tự do).", "Ví dụ: Chuyển nhà, Học bổng..."]
    ];
    const wsNotes = XLSX.utils.aoa_to_sheet(notes);
    XLSX.utils.book_append_sheet(wb, wsNotes, "Huong_Dan");

    XLSX.writeFile(wb, "Form_Mau_Import_Chuyen_Di.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImporting(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("File Excel trống hoặc không đúng định dạng!");
          setImporting(false);
          return;
        }

        const storedYear = localStorage.getItem("selectedAcademicYear") || "";
        const res = await importTransfersOutAction(data, storedYear);
        if (res.success) {
          let msg = `Đã import thành công ${res.imported} phiếu chuyển đi.`;
          if (res.skipped > 0) {
            msg += `\nBỏ qua ${res.skipped} dòng lỗi. Chi tiết:\n${res.errors.join("\n")}`;
          }
          alert(msg);
          loadTransfers();
        } else {
          alert("Lỗi import: " + res.error);
        }
      } catch (err: any) {
        alert("Lỗi đọc file: " + err.message);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  async function loadTransfers() {
    setLoadingList(true)
    const data = await getTransfersAction()
    setTransfers(data)
    const pendingData = await getPendingEnrollmentsAction()
    setPendingRequests(pendingData)
    setLoadingList(false)
  }

  const handleRevert = async (transferId: string, studentName?: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hoàn trả học sinh ${studentName || ""} và xóa phiếu chuyển đi?`)) {
      return
    }
    setLoadingList(true)
    try {
      const res = await revertTransferAction(transferId)
      if (res.success) {
        alert("Đã hoàn trả học sinh thành công!")
        await loadTransfers()
      } else {
        alert("Lỗi: " + res.error)
      }
    } catch (e: any) {
      alert("Đã xảy ra lỗi: " + e.message)
    } finally {
      setLoadingList(false)
    }
  }

  const handleBatchRevert = async () => {
    if (selectedOutTransferIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn hoàn trả ${selectedOutTransferIds.length} học sinh và xóa các phiếu chuyển đi tương ứng?`)) {
      return;
    }
    setLoadingList(true)
    try {
      let successCount = 0;
      let errorMsgs = [];
      for (const id of selectedOutTransferIds) {
        const res = await revertTransferAction(id);
        if (res.success) {
          successCount++;
        } else {
          errorMsgs.push(res.error);
        }
      }
      if (successCount > 0) {
        alert(`Đã hoàn trả thành công ${successCount} học sinh!`);
        setSelectedOutTransferIds([]);
        await loadTransfers();
      }
      if (errorMsgs.length > 0) {
        alert(`Có lỗi xảy ra khi hoàn trả một số học sinh: \n` + errorMsgs.join('\n'));
      }
    } catch (e: any) {
      alert("Đã xảy ra lỗi: " + e.message)
    } finally {
      setLoadingList(false)
    }
  }


  const filteredTransfers = transfers.filter(t => {
    const studentYear = t.student?.academicYearId || t.student?.class?.academicYearId;
    if (yearId && studentYear && studentYear !== yearId) {
      return false;
    }
    const isPreschool = checkIsPreschoolStudent(t.student);
    return activeSubTab === "preschool" ? isPreschool : !isPreschool;
  });

  const outTransfers = filteredTransfers.filter(t => {
    if (t.type !== "OUT") return false;

    // Search filter
    if (globalSearch) {
      const sMatch = 
        (t.student?.studentName || "").toLowerCase().includes(globalSearch.toLowerCase()) ||
        (t.student?.studentCode || "").toLowerCase().includes(globalSearch.toLowerCase());
      if (!sMatch) return false;
    }

    // Class filter
    if (filterOutClass && t.student?.classId !== filterOutClass) return false;

    // Campus filter
    if (filterOutCampus && t.student?.class?.campusId !== filterOutCampus) return false;

    // School type filter
    if (filterOutType && t.destinationType !== filterOutType) return false;

    // Category filter
    if (filterOutCategory && t.transferCategory !== filterOutCategory) return false;

    // Province filter
    if (filterOutProvince && t.destinationProvince !== filterOutProvince) return false;

    return true;
  });

  const outListForFilters = filteredTransfers.filter(t => t.type === "OUT");
  const uniqueClasses = Array.from(new Set(outListForFilters.filter(t => t.student?.class).map(t => JSON.stringify({ id: t.student.class.id, name: t.student.class.className })))).map(s => JSON.parse(s));
  const uniqueCampuses = Array.from(new Set(outListForFilters.filter(t => t.student?.class?.campus).map(t => JSON.stringify({ id: t.student.class.campus.id, name: t.student.class.campus.campusName })))).map(s => JSON.parse(s));
  const uniqueProvinces = Array.from(new Set(outListForFilters.map(t => t.destinationProvince).filter(Boolean))).sort();
  const changeTransfers = filteredTransfers.filter(t => t.type === "CHANGE_CLASS" && (
    !globalSearch || 
    (t.student?.studentName || "").toLowerCase().includes(globalSearch.toLowerCase()) ||
    (t.student?.studentCode || "").toLowerCase().includes(globalSearch.toLowerCase())
  ))
  const inTransfers = filteredTransfers.filter(t => t.type === "IN" && (
    !globalSearch || 
    (t.student?.studentName || "").toLowerCase().includes(globalSearch.toLowerCase()) ||
    (t.student?.studentCode || "").toLowerCase().includes(globalSearch.toLowerCase())
  ))

  // --- PAGINATED HISTORY ---
  const filteredHistory = inTransfers.filter(t => {
    return !historyFilterClass || t.destinationSchool === historyFilterClass;
  });

  const historyClasses = Array.from(new Set(inTransfers.map(t => t.destinationSchool).filter(Boolean))).sort();
  const historyPageSize = 10;
  const historyTotalPages = Math.ceil(filteredHistory.length / historyPageSize);
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

  // --- ENROLLMENT STATISTICS ---
  const stats = (() => {
    const currentSubTabPending = pendingRequests.filter(req => activeSubTab === "preschool" ? req.isPreschool : !req.isPreschool);
    const currentSubTabEnrolled = inTransfers;

    const totalPending = currentSubTabPending.length;
    const totalEnrolled = currentSubTabEnrolled.length;
    const totalRequests = totalPending + totalEnrolled;
    const completionRate = totalRequests > 0 ? Math.round((totalEnrolled / totalRequests) * 100) : 0;

    // Campus breakdown
    const campusMap = {};
    currentSubTabPending.forEach(r => {
      const name = r.admissionCampus || "Khác";
      if (!campusMap[name]) campusMap[name] = { name, pending: 0, enrolled: 0 };
      campusMap[name].pending++;
    });
    currentSubTabEnrolled.forEach(t => {
      const name = t.student?.class?.campus?.campusName || "Khác";
      if (!campusMap[name]) campusMap[name] = { name, pending: 0, enrolled: 0 };
      campusMap[name].enrolled++;
    });
    const campusStats = Object.values(campusMap).filter(c => c.pending > 0 || c.enrolled > 0);

    // Grade breakdown
    const gradeMap = {};
    currentSubTabPending.forEach(r => {
      const name = r.isPreschool ? "Mầm non" : "Khối " + r.grade;
      if (!gradeMap[name]) gradeMap[name] = { name, pending: 0, enrolled: 0 };
      gradeMap[name].pending++;
    });
    currentSubTabEnrolled.forEach(t => {
      const isPre = checkIsPreschoolStudent(t.student);
      const name = isPre ? "Mầm non" : "Khối " + (t.student?.class?.grade || "Khác");
      if (!gradeMap[name]) gradeMap[name] = { name, pending: 0, enrolled: 0 };
      gradeMap[name].enrolled++;
    });
    const gradeStats = Object.values(gradeMap).sort((a, b) => {
      if (a.name === "Mầm non") return -1;
      if (b.name === "Mầm non") return 1;
      const numA = parseInt(a.name.replace(/\D/g, ""), 10);
      const numB = parseInt(b.name.replace(/\D/g, ""), 10);
      return numA - numB;
    });

    // Class breakdown
    const classMap = {};
    currentSubTabEnrolled.forEach(t => {
      const name = t.student?.class?.className;
      if (!name) return;
      const campusName = t.student?.class?.campus?.campusName || "";
      if (!classMap[name]) classMap[name] = { name, campusName, enrolled: 0 };
      classMap[name].enrolled++;
    });
    const classStats = Object.values(classMap).sort((a, b) => a.name.localeCompare(b.name));

    return {
      totalRequests,
      totalPending,
      totalEnrolled,
      completionRate,
      campusStats,
      gradeStats,
      classStats
    };
  })();

  // --- OUT STATISTICS ---
  const outStats = (() => {
    const baseOutTransfers = filteredTransfers.filter(t => t.type === "OUT");
    const totalOut = baseOutTransfers.length;

    // 1. Thống kê theo Lớp
    const classMap: Record<string, any> = {};
    baseOutTransfers.forEach(t => {
      const name = t.student?.class?.className || "Chưa xếp lớp/Khác";
      const campusName = t.student?.class?.campus?.campusName || "Không rõ";
      const key = name + " - " + campusName;
      if (!classMap[key]) {
        classMap[key] = { name, campusName, count: 0 };
      }
      classMap[key].count++;
    });
    const classStats = Object.values(classMap).sort((a: any, b: any) => b.count - a.count);

    // 2. Thống kê theo Cơ sở
    const campusMap: Record<string, any> = {};
    baseOutTransfers.forEach(t => {
      const name = t.student?.class?.campus?.campusName || "Không rõ";
      if (!campusMap[name]) {
        campusMap[name] = { name, count: 0 };
      }
      campusMap[name].count++;
    });
    const campusStats = Object.values(campusMap).sort((a: any, b: any) => b.count - a.count);

    // 3. Thống kê theo Loại hình
    const typeMap: Record<string, any> = {
      PRIVATE: { code: "PRIVATE", name: "Tư thục", count: 0 },
      PUBLIC: { code: "PUBLIC", name: "Công lập", count: 0 },
      OTHER: { code: "OTHER", name: "Khác", count: 0 },
    };
    let unspecifiedTypeCount = 0;
    baseOutTransfers.forEach(t => {
      const type = t.destinationType;
      if (type && typeMap[type]) {
        typeMap[type].count++;
      } else {
        unspecifiedTypeCount++;
      }
    });
    const typeStats = Object.values(typeMap);
    if (unspecifiedTypeCount > 0) {
      typeStats.push({ code: "UNSPECIFIED", name: "Không xác định", count: unspecifiedTypeCount });
    }

    // 4. Thống kê theo Diện chuyển
    const categoryMap: Record<string, any> = {};
    baseOutTransfers.forEach(t => {
      const cat = t.transferCategory || "OTHER";
      let name = "Khác/Bảo lưu";
      if (cat === "DOMESTIC") name = "Chuyển trường VN";
      else if (cat === "ABROAD") name = "Du học";
      else if (cat === "GRADUATED") name = "Tốt nghiệp THPT";
      
      if (!categoryMap[cat]) {
        categoryMap[cat] = { code: cat, name, count: 0 };
      }
      categoryMap[cat].count++;
    });
    const categoryStats = Object.values(categoryMap).sort((a: any, b: any) => b.count - a.count);

    // 5. Thống kê theo Tỉnh/TP
    const provinceMap: Record<string, any> = {};
    baseOutTransfers.forEach(t => {
      const prov = t.destinationProvince || "Khác / Không xác định";
      if (!provinceMap[prov]) {
        provinceMap[prov] = { name: prov, count: 0 };
      }
      provinceMap[prov].count++;
    });
    const provinceStats = Object.values(provinceMap).sort((a: any, b: any) => b.count - a.count);

    // Thống kê riêng: Học sinh chuyển trường Tư thục trong Tỉnh/Tp: Thành phố Đà Nẵng, có tỷ lệ
    const privateDaNang = baseOutTransfers.filter(t => 
      t.destinationProvince === "Thành phố Đà Nẵng" && t.destinationType === "PRIVATE"
    ).length;

    const totalDaNang = baseOutTransfers.filter(t => 
      t.destinationProvince === "Thành phố Đà Nẵng"
    ).length;

    const pctInDaNang = totalDaNang > 0 ? Math.round((privateDaNang / totalDaNang) * 100) : 0;
    const pctOverall = totalOut > 0 ? Math.round((privateDaNang / totalOut) * 100) : 0;

    const publicDaNang = baseOutTransfers.filter(t => 
      t.destinationProvince === "Thành phố Đà Nẵng" && t.destinationType === "PUBLIC"
    ).length;
    const pctPublicDaNang = totalDaNang > 0 ? Math.round((publicDaNang / totalDaNang) * 100) : 0;

    const otherDaNang = totalDaNang - privateDaNang - publicDaNang;
    const pctOtherDaNang = totalDaNang > 0 ? Math.round((otherDaNang / totalDaNang) * 100) : 0;

    const privateDaNangTransfers = baseOutTransfers.filter(t => 
      t.destinationProvince === "Thành phố Đà Nẵng" && t.destinationType === "PRIVATE"
    );
    const privateDaNangSchoolMap = {};
    privateDaNangTransfers.forEach(t => {
      const school = t.destinationSchool || "Khác / Chưa rõ";
      privateDaNangSchoolMap[school] = (privateDaNangSchoolMap[school] || 0) + 1;
    });
    const privateDaNangSchoolStats = Object.entries(privateDaNangSchoolMap).map(([school, count]) => {
      const pct = privateDaNang > 0 ? Math.round((count / privateDaNang) * 100) : 0;
      return { name: school, count, pct };
    }).sort((a, b) => b.count - a.count);

    return {
      totalOut,
      classStats,
      campusStats,
      typeStats,
      categoryStats,
      provinceStats,
      privateDaNang,
      totalDaNang,
      pctInDaNang,
      pctOverall,
      publicDaNang,
      pctPublicDaNang,
      pctPrivateDaNang: pctInDaNang,
      otherDaNang,
      pctOtherDaNang,
      privateDaNangSchoolStats
    };
  })();

  // Dynamic filter options based on pendingRequests
  const availableCampuses = Array.from(new Set(pendingRequests.map(r => r.admissionCampus).filter(Boolean)));
  
  const availableGrades = Array.from(new Set(pendingRequests
    .filter(r => activeSubTab === "preschool" ? r.isPreschool : !r.isPreschool)
    .map(r => r.isPreschool ? "Mầm non" : `Khối ${r.grade}`)
    .filter(Boolean)
  )).sort((a, b) => {
    if (a === "Mầm non") return -1;
    if (b === "Mầm non") return 1;
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    return numA - numB;
  });

  const filteredPendingRequests = pendingRequests.filter(req => {
    const matchTab = activeSubTab === "preschool" ? req.isPreschool : !req.isPreschool;
    if (!matchTab) return false;
    
    const matchCampus = !filterCampus || req.admissionCampus === filterCampus;
    
    const gradeStr = req.isPreschool ? "Mầm non" : `Khối ${req.grade}`;
    const matchGrade = !filterGrade || gradeStr === filterGrade;
    
    const matchSearch = !searchTerm || 
      req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.studentCode && req.studentCode.toLowerCase().includes(searchTerm.toLowerCase()));
      
    return matchCampus && matchGrade && matchSearch;
  });

  // --- PAGINATED PENDING REQUESTS ---
  const pendingPageSize = 5;
  const pendingTotalPages = Math.ceil(filteredPendingRequests.length / pendingPageSize);
  const paginatedPendingRequests = filteredPendingRequests.slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize);

  return (
    <div className="space-y-6">
      {/* Primary Sub-Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("general")}
          className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
            activeSubTab === "general"
              ? "border-[#00A99D] text-[#00A99D] bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          Phổ thông K-12
        </button>
        <button
          onClick={() => setActiveSubTab("preschool")}
          className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
            activeSubTab === "preschool"
              ? "border-[#00A99D] text-[#00A99D] bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
          }`}
        >
          <Baby className="w-5 h-5" />
          Mầm non
        </button>
      </div>

      {/* UNIFIED REALTIME VISUAL DASHBOARD */}
      <RealtimeTransferDashboard transfers={transfers} pendingRequests={pendingRequests} activeTab={activeTab} activeSubTab={activeSubTab} onRefresh={loadTransfers} loading={loadingList} />
      {/* OLD STATS REMOVED */}
      {activeTab === "IN" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden animate-in fade-in duration-300">
          <div className="bg-slate-50/70 p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Thống kê Tiến độ Nhập học</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Theo dõi chi tiết số liệu phân bổ học sinh theo Lớp, Khối, Cơ sở</p>
              </div>
            </div>
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors"
            >
              {showStats ? (
                <>
                  <EyeOff className="w-4 h-4 text-slate-400" />
                  Ẩn bảng thống kê
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-slate-400" />
                  Hiện bảng thống kê
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </>
              )}
            </button>
          </div>

          {showStats && (
            <div className="p-6 space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng số yêu cầu</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-800">{stats.totalRequests}</span>
                    <span className="text-xs text-slate-400 font-medium">học sinh</span>
                  </div>
                </div>
                <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Chờ xếp lớp (Pending)</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-amber-600">{stats.totalPending}</span>
                    <span className="text-xs text-amber-500/70 font-medium">học sinh</span>
                  </div>
                </div>
                <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Đã nhập học (Enrolled)</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-emerald-600">{stats.totalEnrolled}</span>
                    <span className="text-xs text-emerald-550/70 font-medium">học sinh</span>
                  </div>
                </div>
                <div className="bg-sky-50/40 p-5 rounded-2xl border border-sky-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Tỷ lệ hoàn thành</span>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-2xl font-black text-sky-600">{stats.completionRate}%</span>
                    <div className="flex-1 bg-sky-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: stats.completionRate + "%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown Tables Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                {/* Campus breakdown */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#00A99D]" /> Thống kê theo Cơ sở
                  </h4>
                  <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {stats.campusStats.length > 0 ? stats.campusStats.map(c => (
                      <div key={c.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span>{c.name}</span>
                          <span className="text-slate-500">
                            <span className="text-emerald-600 font-extrabold">{c.enrolled}</span>
                            <span className="mx-1">/</span>
                            <span>{c.enrolled + c.pending}</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: ((c.enrolled / (c.enrolled + c.pending)) * 100) + "%" }}></div>
                          <div className="bg-amber-500 h-full" style={{ width: ((c.pending / (c.enrolled + c.pending)) * 100) + "%" }}></div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs font-medium text-slate-400 italic text-center py-4">Không có số liệu</p>
                    )}
                  </div>
                </div>

                {/* Grade breakdown */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00A99D]" /> Thống kê theo Khối
                  </h4>
                  <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {stats.gradeStats.length > 0 ? stats.gradeStats.map(g => (
                      <div key={g.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span>{g.name}</span>
                          <span className="text-slate-500">
                            <span className="text-emerald-600 font-extrabold">{g.enrolled}</span>
                            <span className="mx-1">/</span>
                            <span>{g.enrolled + g.pending}</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: ((g.enrolled / (g.enrolled + g.pending)) * 100) + "%" }}></div>
                          <div className="bg-amber-500 h-full" style={{ width: ((g.pending / (g.enrolled + g.pending)) * 100) + "%" }}></div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs font-medium text-slate-400 italic text-center py-4">Không có số liệu</p>
                    )}
                  </div>
                </div>

                {/* Class breakdown */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#00A99D]" /> Thống kê theo Lớp (Đã xếp)
                  </h4>
                  <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {stats.classStats.length > 0 ? stats.classStats.map(cl => (
                      <div key={cl.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            {cl.name}
                            <span className="text-[10px] text-slate-400 font-medium">({cl.campusName})</span>
                          </span>
                          <span className="text-emerald-600 font-extrabold">{cl.enrolled} <span className="text-[10px] text-slate-400 font-medium">HS</span></span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs font-medium text-slate-400 italic text-center py-4">Chưa có lớp nào được xếp</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATISTICS DASHBOARD FOR OUT */}
      {activeTab === "OUT" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden animate-in fade-in duration-300">
          <div className="bg-slate-50/70 p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Thống kê Học sinh Chuyển đi</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Theo dõi chi tiết số liệu chuyển đi theo Lớp, Cơ sở, Loại hình, Diện chuyển, Tỉnh/TP</p>
              </div>
            </div>
            <button
              onClick={() => setShowOutStats(!showOutStats)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors"
            >
              {showOutStats ? (
                <>
                  <EyeOff className="w-4 h-4 text-slate-400" />
                  Ẩn bảng thống kê
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-slate-400" />
                  Hiện bảng thống kê
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </>
              )}
            </button>
          </div>

          {showOutStats && (
            <div className="p-6 space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng học sinh chuyển đi</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-800">{outStats.totalOut}</span>
                    <span className="text-xs text-slate-400 font-medium">học sinh</span>
                  </div>
                </div>
                <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Chuyển trường VN</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-amber-600">
                      {outStats.categoryStats.find(c => c.code === "DOMESTIC")?.count || 0}
                    </span>
                    <span className="text-xs text-amber-550/70 font-medium">
                      ({outStats.totalOut > 0 ? Math.round(((outStats.categoryStats.find(c => c.code === "DOMESTIC")?.count || 0) / outStats.totalOut) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="bg-sky-50/40 p-5 rounded-2xl border border-sky-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Du học & Diện khác</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-sky-600">
                      {outStats.totalOut - (outStats.categoryStats.find(c => c.code === "DOMESTIC")?.count || 0)}
                    </span>
                    <span className="text-xs text-sky-550/70 font-medium">
                      ({outStats.totalOut > 0 ? Math.round(((outStats.totalOut - (outStats.categoryStats.find(c => c.code === "DOMESTIC")?.count || 0)) / outStats.totalOut) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Tư thục tại Đà Nẵng</span>
                  <div className="flex flex-col mt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-rose-600">{outStats.privateDaNang}</span>
                      <span className="text-xs text-rose-500/70 font-medium">học sinh</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-1 space-y-0.5">
                      <div>Tỷ lệ tại Đà Nẵng: <span className="text-rose-600 font-bold">{outStats.pctInDaNang}%</span> ({outStats.privateDaNang}/{outStats.totalDaNang})</div>
                      <div>Tỷ lệ toàn hệ thống: <span className="text-rose-600 font-bold">{outStats.pctOverall}%</span> ({outStats.privateDaNang}/{outStats.totalOut})</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown Tables Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                {/* Column 1: Cơ sở & Lớp cũ */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-5">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#00A99D]" /> Theo Cơ sở cũ
                    </h4>
                    <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {outStats.campusStats.length > 0 ? outStats.campusStats.map(c => (
                        <div key={c.name} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{c.name}</span>
                            <span className="text-slate-500">
                              <span className="text-rose-600 font-extrabold">{c.count}</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1">HS</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1">({outStats.totalOut > 0 ? Math.round((c.count / outStats.totalOut) * 100) : 0}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-rose-500 h-full" style={{ width: (outStats.totalOut > 0 ? (c.count / outStats.totalOut) * 100 : 0) + "%" }}></div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs font-medium text-slate-400 italic text-center py-4">Không có số liệu</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#00A99D]" /> Theo Lớp cũ
                    </h4>
                    <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {outStats.classStats.length > 0 ? outStats.classStats.map(cl => (
                        <div key={cl.name + "-" + cl.campusName} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              {cl.name}
                              <span className="text-[10px] text-slate-400 font-medium">({cl.campusName})</span>
                            </span>
                            <span className="text-rose-600 font-extrabold">{cl.count} <span className="text-[10px] text-slate-400 font-medium">HS</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-rose-400 h-full" style={{ width: (outStats.totalOut > 0 ? (cl.count / outStats.totalOut) * 100 : 0) + "%" }}></div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs font-medium text-slate-400 italic text-center py-4">Không có số liệu</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Diện chuyển & Loại hình */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-5">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#00A99D]" /> Theo Diện chuyển
                    </h4>
                    <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {outStats.categoryStats.length > 0 ? outStats.categoryStats.map(cat => (
                        <div key={cat.code} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{cat.name}</span>
                            <span className="text-slate-500">
                              <span className="text-rose-600 font-extrabold">{cat.count}</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1">HS</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1">({outStats.totalOut > 0 ? Math.round((cat.count / outStats.totalOut) * 100) : 0}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-amber-500 h-full" style={{ width: (outStats.totalOut > 0 ? (cat.count / outStats.totalOut) * 100 : 0) + "%" }}></div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs font-medium text-slate-400 italic text-center py-4">Không có số liệu</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <School className="w-4 h-4 text-[#00A99D]" /> Theo Loại hình trường đến
                    </h4>
                    <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {outStats.typeStats.length > 0 ? outStats.typeStats.map(t => (
                        <div key={t.code} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{t.name}</span>
                            <span className="text-slate-500">
                              <span className="text-rose-600 font-extrabold">{t.count}</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1">HS</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1">({outStats.totalOut > 0 ? Math.round((t.count / outStats.totalOut) * 100) : 0}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-full" style={{ width: (outStats.totalOut > 0 ? (t.count / outStats.totalOut) * 100 : 0) + "%" }}></div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs font-medium text-slate-400 italic text-center py-4">Không có số liệu</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 3: Tỉnh/TP đến & Phân tích Đà Nẵng */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#00A99D]" /> Theo Tỉnh/Thành phố đến
                    </h4>
                    <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {outStats.provinceStats.length > 0 ? outStats.provinceStats.map(p => (
                        <div key={p.name} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{p.name}</span>
                            <span className="text-slate-500">
                              <span className="text-rose-600 font-extrabold">{p.count}</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1">HS</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1">({outStats.totalOut > 0 ? Math.round((p.count / outStats.totalOut) * 100) : 0}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-sky-500 h-full" style={{ width: (outStats.totalOut > 0 ? (p.count / outStats.totalOut) * 100 : 0) + "%" }}></div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs font-medium text-slate-400 italic text-center py-4">Không có số liệu</p>
                      )}
                    </div>
                  </div>

                  {/* Drill-down Đà Nẵng analysis */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-4 shadow-xs">
                    <div className="border-b border-slate-50 pb-2">
                      <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        Phân tích tại Đà Nẵng
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Chi tiết trong số {outStats.totalDaNang} HS chuyển đến Đà Nẵng</p>
                    </div>

                    {/* 1. Loại hình Công lập vs Tư thục */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại hình trường đến</h5>
                      
                      {/* Tư thục */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                          <span>Tư thục</span>
                          <span>
                            <span className="font-extrabold text-[#00A99D]">{outStats.privateDaNang}</span> HS ({outStats.pctPrivateDaNang}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-[#00A99D] h-full" style={{ width: outStats.pctPrivateDaNang + "%" }}></div>
                        </div>
                      </div>

                      {/* Công lập */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                          <span>Công lập</span>
                          <span>
                            <span className="font-extrabold text-amber-600">{outStats.publicDaNang}</span> HS ({outStats.pctPublicDaNang}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-amber-500 h-full" style={{ width: outStats.pctPublicDaNang + "%" }}></div>
                        </div>
                      </div>

                      {/* Khác */}
                      {outStats.otherDaNang > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                            <span>Khác / Chưa rõ</span>
                            <span>
                              <span className="font-extrabold text-slate-500">{outStats.otherDaNang}</span> HS ({outStats.pctOtherDaNang}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-slate-400 h-full" style={{ width: outStats.pctOtherDaNang + "%" }}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Trường Tư thục cụ thể */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center justify-between">
                        <span>Biểu đồ tỷ lệ các trường Tư thục</span>
                        <span className="text-[9px] font-semibold text-slate-400 normal-case">(Trong {outStats.privateDaNang} HS chuyển Tư thục)</span>
                      </h5>
                      
                      <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                        {outStats.privateDaNangSchoolStats.length > 0 ? outStats.privateDaNangSchoolStats.map(item => (
                          <div key={item.name} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                              <span className="truncate max-w-[70%]">{item.name}</span>
                              <span className="text-slate-500 font-bold shrink-0">
                                <span>{item.count} HS</span>
                                <span className="text-[10px] font-normal text-slate-400 ml-1">({item.pct}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-indigo-500 h-full" style={{ width: item.pct + "%" }}></div>
                            </div>
                          </div>
                        )) : (
                          <p className="text-[11px] text-slate-400 italic text-center py-2">Không có trường tư thục nào ở Đà Nẵng</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="border-b border-slate-100 p-3 bg-slate-50/50 flex gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("OUT")}
            className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
              activeTab === "OUT"
                ? "bg-rose-50 text-rose-600 border-b-4 border-rose-500 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <ArrowRightToLine className="w-5 h-5 mr-3" />
            Chuyển đi
          </button>
          <button
            onClick={() => setActiveTab("IN")}
            className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
              activeTab === "IN"
                ? "bg-emerald-50 text-emerald-600 border-b-4 border-emerald-500 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <ArrowLeftToLine className="w-5 h-5 mr-3" />
            Chuyển đến
          </button>
          <button
            onClick={() => setActiveTab("CHANGE_CLASS")}
            className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
              activeTab === "CHANGE_CLASS"
                ? "bg-[#00A99D]/10 text-[#00A99D] border-b-4 border-indigo-500 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <ArrowRightLeft className="w-5 h-5 mr-3" />
            Chuyển lớp
          </button>
        </div>

      <div className="p-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
             <div className="relative w-72">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
             <input 
               type="text" 
               placeholder="Tìm kiếm học sinh..." 
               value={globalSearch}
               onChange={(e) => setGlobalSearch(e.target.value)}
               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-[#00A99D] rounded-xl font-medium outline-none transition-all text-xs font-semibold text-slate-800" 
             />
           </div>
           
           {activeTab === "OUT" && (
               <div className="flex gap-2 items-center">
                 {selectedOutTransferIds.length > 0 && (
                    <>
                      <button 
                        onClick={() => setShowBatchEditModal(true)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-2xl hover:bg-indigo-100 transition-all flex items-center shadow-sm text-xs animate-in fade-in slide-in-from-left duration-200 mr-2"
                      >
                        <Edit className="w-4 h-4 mr-1.5" /> Chỉnh sửa hàng loạt ({selectedOutTransferIds.length})
                      </button>
                      <button 
                        onClick={handleBatchRevert}
                        className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-2xl hover:bg-amber-100 transition-all flex items-center shadow-sm text-xs animate-in fade-in slide-in-from-left duration-200"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" /> Hoàn trả hàng loạt ({selectedOutTransferIds.length})
                      </button>
                    </>
                  )}
                 <button 
                   onClick={handleDownloadTemplate} 
                  className="px-4 py-2 bg-white text-slate-700 font-bold border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all flex items-center shadow-sm text-xs"
                >
                  Tải File Mẫu
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={importing}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-2xl hover:bg-indigo-100 transition-all flex items-center shadow-sm text-xs disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : null} Import File Excel
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <button onClick={() => setShowOutModal(true)} className="px-6 py-3 bg-[#00A99D] text-white font-bold rounded-2xl hover:bg-[#009085] transition-all flex items-center shadow-lg shadow-[#00A99D]/20 text-xs">
                  <Plus className="w-5 h-5 mr-2" /> Tạo phiếu Chuyển đi
                </button>
              </div>
            )}
         </div>

         {activeTab === "OUT" && (
           <div className="flex flex-wrap items-center gap-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-205/45 animate-in fade-in duration-200">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2">Bộ lọc:</span>
             
             {/* Lớp */}
             <select 
               value={filterOutClass} 
               onChange={e => setFilterOutClass(e.target.value)}
               className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#00A99D] cursor-pointer"
             >
               <option value="">Tất cả Lớp ({uniqueClasses.length})</option>
               {uniqueClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>

             {/* Cơ sở */}
             <select 
               value={filterOutCampus} 
               onChange={e => setFilterOutCampus(e.target.value)}
               className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#00A99D] cursor-pointer"
             >
               <option value="">Tất cả Cơ sở ({uniqueCampuses.length})</option>
               {uniqueCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>

             {/* Diện chuyển */}
             <select 
               value={filterOutCategory} 
               onChange={e => setFilterOutCategory(e.target.value)}
               className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#00A99D] cursor-pointer"
             >
               <option value="">Tất cả Diện chuyển</option>
               <option value="DOMESTIC">Chuyển trường VN</option>
               <option value="ABROAD">Du học</option>
               <option value="RESERVE">Bảo lưu</option>
               <option value="GRADUATED">Tốt nghiệp THPT</option>
             </select>

             {/* Loại hình */}
             <select 
               value={filterOutType} 
               onChange={e => setFilterOutType(e.target.value)}
               className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#00A99D] cursor-pointer"
             >
               <option value="">Tất cả Loại hình</option>
               <option value="PRIVATE">Tư thục</option>
               <option value="PUBLIC">Công lập</option>
               <option value="OTHER">Khác</option>
             </select>

             {/* Tỉnh/TP */}
             <select 
               value={filterOutProvince} 
               onChange={e => setFilterOutProvince(e.target.value)}
               className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#00A99D] cursor-pointer"
             >
               <option value="">Tất cả Tỉnh/TP ({uniqueProvinces.length})</option>
               {uniqueProvinces.map(p => <option key={p} value={p}>{p}</option>)}
             </select>

             {/* Reset button */}
             {(filterOutClass || filterOutCampus || filterOutType || filterOutCategory || filterOutProvince) && (
               <button 
                 onClick={() => {
                   setFilterOutClass("")
                   setFilterOutCampus("")
                   setFilterOutType("")
                   setFilterOutCategory("")
                   setFilterOutProvince("")
                 }}
                 className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors ml-auto cursor-pointer"
               >
                 Xóa bộ lọc
               </button>
             )}
           </div>
         )}

           {activeTab === "CHANGE_CLASS" && (
             <button onClick={() => setShowChangeModal(true)} className="px-6 py-3 bg-[#00A99D] text-white font-bold rounded-2xl hover:bg-[#009085] transition-all flex items-center shadow-lg shadow-[#00A99D]/20">
               <Plus className="w-5 h-5 mr-2" /> Tạo phiếu Chuyển lớp
             </button>
           )}

           {activeTab === "IN" && (
             <button onClick={() => setShowInModal(true)} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all flex items-center shadow-lg shadow-emerald-100">
               <Plus className="w-5 h-5 mr-2" /> Tạo phiếu Chuyển đến
             </button>
           )}
        </div>

        {activeTab === "OUT" && (
          loadingList ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : outTransfers.length > 0 ? (
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead className="bg-slate-50/75 text-slate-550 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-[#00A99D] border-slate-355 rounded focus:ring-[#00A99D] cursor-pointer"
                        checked={outTransfers.length > 0 && outTransfers.every(t => selectedOutTransferIds.includes(t.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOutTransferIds(outTransfers.map(t => t.id));
                          } else {
                            setSelectedOutTransferIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 font-extrabold">Ngày chuyển</th>
                    <th className="px-4 py-3 font-extrabold">Học sinh</th>
                    <th className="px-4 py-3 font-extrabold">Lớp / Cơ sở cũ</th>
                    <th className="px-4 py-3 font-extrabold">Diện chuyển</th>
                    <th className="px-4 py-3 font-extrabold">Nơi đến</th>
                    <th className="px-4 py-3 text-right font-extrabold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outTransfers.map(t => (
                    <tr key={t.id} className={`hover:bg-slate-50/50 text-xs font-semibold transition-colors ${selectedOutTransferIds.includes(t.id) ? 'bg-[#00A99D]/5 hover:bg-[#00A99D]/10' : ''}`}>
                      <td className="px-4 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-[#00A99D] border-slate-355 rounded focus:ring-[#00A99D] cursor-pointer"
                          checked={selectedOutTransferIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOutTransferIds(prev => [...prev, t.id]);
                            } else {
                              setSelectedOutTransferIds(prev => prev.filter(id => id !== t.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {new Date(t.transferDate).toLocaleDateString('vi-VN')} 
                        <br/>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {t.semester === 'HK1' ? 'Học kỳ 1' : t.semester === 'HK2' ? 'Học kỳ 2' : t.semester === 'SUMMER' ? 'Trong hè' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {t.student?.studentName} 
                        <br/>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {t.student?.studentCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 border border-slate-200/40">
                          {t.student?.class?.className}
                        </span> 
                        <br/>
                        <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">
                          {t.student?.class?.campus?.campusName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${
                          t.transferCategory === 'DOMESTIC' ? 'bg-amber-50 text-amber-700 border-amber-250' : 
                          t.transferCategory === 'ABROAD' ? 'bg-sky-50 text-sky-700 border-sky-250' : 
                          t.transferCategory === 'GRADUATED' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                          'bg-indigo-50 text-indigo-700 border-indigo-250'
                        }`}>
                          {t.transferCategory === "DOMESTIC" ? "Chuyển trường VN" : t.transferCategory === "ABROAD" ? "Du học" : t.transferCategory === "GRADUATED" ? "Tốt nghiệp THPT" : "Bảo lưu"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-650 font-medium">
                        {t.transferCategory === "DOMESTIC" ? t.destinationSchool : t.transferCategory === "ABROAD" ? t.destinationCountry : t.transferCategory === "GRADUATED" ? "Tốt nghiệp (TN)" : t.reserveStartDate ? `Từ ${new Date(t.reserveStartDate).toLocaleDateString('vi-VN')} đến ${new Date(t.reserveEndDate).toLocaleDateString('vi-VN')}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingTransfer(t);
                            setShowOutModal(true);
                          }}
                          className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => handleRevert(t.id, t.student?.studentName)}
                          className="px-3 py-1.5 border border-amber-200 hover:border-amber-300 text-amber-600 hover:bg-amber-50 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Hoàn trả
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-xs font-semibold">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                 <ArrowRightToLine className="w-8 h-8 text-rose-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có dữ liệu chuyển đi</h3>
               <p className="text-slate-500 font-medium">Bấm "Tạo phiếu Chuyển đi" để thêm mới.</p>
            </div>
          )
        )}

        {activeTab === "CHANGE_CLASS" && (
          loadingList ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : changeTransfers.length > 0 ? (
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead className="bg-slate-50/75 text-slate-550 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Ngày chuyển</th>
                    <th className="px-4 py-3 font-extrabold">Học sinh</th>
                    <th className="px-4 py-3 font-extrabold">Lớp chuyển đến</th>
                    <th className="px-4 py-3 font-extrabold">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changeTransfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 text-xs font-semibold transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {new Date(t.transferDate).toLocaleDateString('vi-VN')} 
                        <br/>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {t.semester === 'HK1' ? 'Học kỳ 1' : t.semester === 'HK2' ? 'Học kỳ 2' : t.semester === 'SUMMER' ? 'Trong hè' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {t.student?.studentName} 
                        <br/>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {t.student?.studentCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#00A99D]">{t.destinationSchool}</td>
                      <td className="px-4 py-3.5 text-slate-650 font-medium">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-xs font-semibold">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                 <ArrowRightLeft className="w-8 h-8 text-indigo-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có dữ liệu chuyển lớp</h3>
               <p className="text-slate-500 font-medium">Bấm "Tạo phiếu Chuyển lớp" để thêm mới.</p>
            </div>
          )
        )}
        
        {activeTab === "IN" && (
          loadingList ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-8">
              {/* Pending Enrollment Requests Section */}
              {pendingRequests.filter(req => activeSubTab === "preschool" ? req.isPreschool : !req.isPreschool).length > 0 && (
                <div className="p-6 text-xs font-semibold">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full opacity-75 bg-emerald-400 rounded-full"></span>
                        <span className="relative inline-flex h-2.5 w-2.5 bg-emerald-500 rounded-full"></span>
                      </span>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">
                        Danh sách Yêu cầu Nhập học chờ xử lý ({filteredPendingRequests.length})
                      </h3>
                    </div>
                  </div>

                  {/* Filter controls */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      <div className="relative w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Tìm tên hoặc mã khảo sát..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-[#00A99D] rounded-xl font-medium outline-none transition-all text-xs font-semibold text-slate-800" 
                        />
                      </div>
                      <select 
                        value={filterCampus}
                        onChange={(e) => setFilterCampus(e.target.value)}
                        className="bg-white border border-slate-200 focus:border-[#00A99D] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                      >
                        <option value="">Tất cả Cơ sở dự tuyển</option>
                        {availableCampuses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={filterGrade}
                        onChange={(e) => setFilterGrade(e.target.value)}
                        className="bg-white border border-slate-200 focus:border-[#00A99D] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                      >
                        <option value="">Tất cả Phân hệ / Khối</option>
                        {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {(searchTerm || filterCampus || filterGrade) && (
                        <button 
                          onClick={() => { setSearchTerm(""); setFilterCampus(""); setFilterGrade(""); }}
                          className="text-slate-500 hover:text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                    {selectedRequestIds.length > 0 && (
                      <button 
                        onClick={() => {
                          const selected = filteredPendingRequests.filter(r => selectedRequestIds.includes(r.id));
                          setSelectedRequests(selected);
                          setShowInModal(true);
                        }}
                        className="px-4 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white rounded-xl text-xs font-bold shadow-md shadow-[#00A99D]/20 transition-all flex items-center gap-1.5 cursor-pointer animate-in fade-in slide-in-from-right-3 duration-200"
                      >
                        <UserCheck className="w-4 h-4" />
                        Xếp lớp hàng loạt ({selectedRequestIds.length})
                      </button>
                    )}
                  </div>

                  {paginatedPendingRequests.length > 0 ? (
                    <div className="space-y-4">
                      <div className="border border-slate-200/80 bg-white rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50/75 text-slate-550 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                            <tr>
                              <th className="px-4 py-3 w-12 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={paginatedPendingRequests.length > 0 && paginatedPendingRequests.every(r => selectedRequestIds.includes(r.id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRequestIds(prev => {
                                        const newIds = [...prev];
                                        paginatedPendingRequests.forEach(r => {
                                          if (!newIds.includes(r.id)) newIds.push(r.id);
                                        });
                                        return newIds;
                                      });
                                    } else {
                                      setSelectedRequestIds(prev => prev.filter(id => !paginatedPendingRequests.some(r => r.id === id)));
                                    }
                                  }}
                                  className="rounded border-slate-350 text-[#00A99D] focus:ring-[#00A99D] h-4 w-4 cursor-pointer"
                                />
                              </th>
                            <th className="px-4 py-3 font-extrabold">Ngày yêu cầu</th>
                            <th className="px-4 py-3 font-extrabold">Học sinh</th>
                            <th className="px-4 py-3 font-extrabold">Cơ sở dự tuyển</th>
                            <th className="px-4 py-3 font-extrabold">Phân hệ / Khối</th>
                            <th className="px-4 py-3 font-extrabold">Trạng thái</th>
                            <th className="px-4 py-3 text-right font-extrabold">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedPendingRequests.map(req => (
                            <tr key={req.id} className={`hover:bg-slate-50/50 text-xs font-semibold transition-colors ${selectedRequestIds.includes(req.id) ? 'bg-[#00A99D]/5 hover:bg-[#00A99D]/10' : ''}`}>
                              <td className="px-4 py-3.5 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={selectedRequestIds.includes(req.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRequestIds(prev => [...prev, req.id]);
                                    } else {
                                      setSelectedRequestIds(prev => prev.filter(id => id !== req.id));
                                    }
                                  }}
                                  className="rounded border-slate-350 text-[#00A99D] focus:ring-[#00A99D] h-4 w-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3.5 font-medium text-slate-700">
                                {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                              </td>
                              <td className="px-4 py-3.5 font-bold text-slate-900">
                                {req.fullName} 
                                <br/>
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  Mã KS: {req.studentCode}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-bold text-slate-600">
                                {req.admissionCampus}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  req.isPreschool ? 'bg-pink-50 text-pink-700 border-pink-250' : 'bg-indigo-50 text-indigo-700 border-indigo-250'
                                }`}>
                                  {req.isPreschool ? "Mầm non" : "Khối " + req.grade}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-250 text-[10px] font-bold rounded">
                                  Chờ xếp lớp
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <button 
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setShowInModal(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Xếp lớp
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {pendingTotalPages > 1 && (
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-650">
                        <span>Hiển thị {(pendingPage - 1) * pendingPageSize + 1} - {Math.min(pendingPage * pendingPageSize, filteredPendingRequests.length)} trong tổng số {filteredPendingRequests.length} học sinh</span>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={pendingPage === 1}
                            onClick={() => setPendingPage(prev => Math.max(1, prev - 1))}
                            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Trước
                          </button>
                          <span className="px-3.5 font-bold">Trang {pendingPage} / {pendingTotalPages}</span>
                          <button
                            disabled={pendingPage === pendingTotalPages}
                            onClick={() => setPendingPage(prev => Math.min(pendingTotalPages, prev + 1))}
                            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-16 text-center text-slate-500 font-bold border border-slate-200 rounded-2xl bg-slate-50/50">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc đã chọn!
                  </div>
                )}
                </div>
              )}

              {/* History / Completed Transfers-In */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lịch sử học sinh Chuyển đến</h3>
                  
                  {inTransfers.length > 0 && (
                    <div className="flex items-center gap-3">
                      <select
                        value={historyFilterClass}
                        onChange={(e) => setHistoryFilterClass(e.target.value)}
                        className="bg-white border border-slate-200 focus:border-[#00A99D] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer shadow-sm"
                      >
                        <option value="">Tất cả Lớp chuyển đến</option>
                        {historyClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {historyFilterClass && (
                        <button
                          onClick={() => setHistoryFilterClass("")}
                          className="text-slate-500 hover:text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Xóa lọc lớp
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {paginatedHistory.length > 0 ? (
                  <div className="space-y-4">
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/75 text-slate-550 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                          <tr>
                            <th className="px-4 py-3 font-extrabold">Ngày nhập học</th>
                            <th className="px-4 py-3 font-extrabold">Học sinh</th>
                            <th className="px-4 py-3 font-extrabold">Lớp chuyển đến</th>
                            <th className="px-4 py-3 font-extrabold">Lý do</th>
                            <th className="px-4 py-3 text-right font-extrabold">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedHistory.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50/50 text-xs font-semibold transition-colors">
                              <td className="px-4 py-3.5 font-medium text-slate-700">
                                {new Date(t.transferDate).toLocaleDateString('vi-VN')} 
                                <br/>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {t.semester === 'HK1' ? 'Học kỳ 1' : t.semester === 'HK2' ? 'Học kỳ 2' : t.semester === 'SUMMER' ? 'Trong hè' : ''}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-bold text-slate-900">
                                {t.student?.studentName} 
                                <br/>
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  {t.student?.studentCode}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-bold text-emerald-600">{t.destinationSchool}</td>
                              <td className="px-4 py-3.5 text-slate-650 font-medium">{t.reason}</td>
                              <td className="px-4 py-3.5 text-right">
                                <button 
                                  onClick={() => {
                                    setEditingTransfer(t);
                                    setShowInModal(true);
                                  }}
                                  className="px-3 py-1.5 border border-[#00A99D] hover:bg-[#00A99D]/5 text-[#00A99D] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                  Sửa
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {historyTotalPages > 1 && (
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-650">
                        <span>Hiển thị {(historyPage - 1) * historyPageSize + 1} - {Math.min(historyPage * historyPageSize, filteredHistory.length)} trong tổng số {filteredHistory.length} học sinh</span>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={historyPage === 1}
                            onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Trước
                          </button>
                          <span className="px-3.5 font-bold">Trang {historyPage} / {historyTotalPages}</span>
                          <button
                            disabled={historyPage === historyTotalPages}
                            onClick={() => setHistoryPage(prev => Math.min(historyTotalPages, prev + 1))}
                            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-16 text-center text-xs font-semibold bg-slate-50 border border-slate-200 rounded-2xl">
                    Không tìm thấy học sinh nào phù hợp với lớp chuyển đến đã chọn.
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

{showOutModal && (
        <TransferOutModal 
          activeSubTab={activeSubTab} 
          initialData={editingTransfer}
          onClose={() => {
            setShowOutModal(false);
            setEditingTransfer(null);
          }}
          onSaved={loadTransfers}
        />
      )}
      {showBatchEditModal && (
        <BatchEditOutModal 
          ids={selectedOutTransferIds}
          transfers={transfers}
          onClose={() => setShowBatchEditModal(false)}
          onSaved={() => {
            setShowBatchEditModal(false);
            setSelectedOutTransferIds([]);
            loadTransfers();
          }}
        />
      )}
      {showChangeModal && <ChangeClassModal activeSubTab={activeSubTab} onClose={() => setShowChangeModal(false)} onSaved={loadTransfers} />}
      {showInModal && (
        <TransferInModal 
          activeSubTab={activeSubTab}
          initialData={editingTransfer} 
          enrollmentRequest={selectedRequest}
          batchRequests={selectedRequests || undefined}
          onClose={() => { 
            setShowInModal(false); 
            setEditingTransfer(null); 
            setSelectedRequest(null);
            setSelectedRequests(null);
          }} 
          onSaved={() => {
            setSelectedRequestIds([]);
            loadTransfers();
          }} 
        />
      )}
    </div>
    </div>
  )
}

function TransferOutModal({ activeSubTab, initialData, onClose, onSaved }: { activeSubTab: "general" | "preschool", initialData?: any, onClose: () => void, onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [registeredSchools, setRegisteredSchools] = useState<any[]>([])

  useEffect(() => {
    getDestinationSchoolsAction().then(data => {
      const filtered = data.filter((s: any) => {
        if (activeSubTab === "preschool") return s.level === "MAM_NON";
        return s.level === "PHO_THONG";
      });
      setRegisteredSchools(filtered);
    });
  }, [activeSubTab]);
  
  const [options, setOptions] = useState({ years: [] as any[], campuses: [] as any[] })
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  
  const [form, setForm] = useState({
    academicYearId: initialData?.student?.academicYearId || "",
    campusId: initialData?.student?.campusId || "",
    classId: initialData?.student?.classId || "",
    studentId: initialData?.studentId || "",
    transferDate: initialData?.transferDate ? new Date(initialData.transferDate).toISOString().split('T')[0] : "",
    semester: initialData?.semester || "",
    transferCategory: initialData?.transferCategory || "", // DOMESTIC, ABROAD
    destinationSchool: initialData?.destinationSchool || "",
    destinationType: initialData?.destinationType || "",
    destinationProvince: initialData?.destinationProvince || "",
    destinationCountry: initialData?.destinationCountry || "",
    reserveStartDate: initialData?.reserveStartDate ? new Date(initialData.reserveStartDate).toISOString().split('T')[0] : "",
    reserveEndDate: initialData?.reserveEndDate ? new Date(initialData.reserveEndDate).toISOString().split('T')[0] : "",
    reason: initialData?.reason || ""
  })

  useEffect(() => {
    if (form.transferCategory === "GRADUATED") {
      const selectedClass = classes.find(c => c.id === form.classId);
      if (selectedClass && selectedClass.grade !== "12") {
        setForm(f => ({ ...f, classId: "", studentId: "" }));
      }
    }
  }, [form.transferCategory, classes]);

  useEffect(() => {
    loadOptions()
  }, [])

  async function loadOptions() {
    setLoading(true)
    try {
      const data = await getTransferFormOptionsAction()
      if (data && data.years) {
        setOptions(data)
        const activeYear = data.years.find((y: any) => !y.isOff) || data.years[0];
        if (activeYear && !initialData) setForm(f => ({ ...f, academicYearId: activeYear.id }))
      } else {
        alert("Lỗi tải dữ liệu. Xin thử lại.")
      }
    } catch(e: any) {
      alert("Lỗi tải form: " + e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (form.campusId && form.academicYearId) {
      getClassesByCampusAndYearAction(form.campusId, form.academicYearId).then(data => {
        setClasses(data)
        if (!initialData) setForm(f => ({ ...f, classId: "", studentId: "" }))
      })
    }
  }, [form.campusId, form.academicYearId])

  useEffect(() => {
    if (form.classId) {
      getStudentsByClassAction(form.classId).then(data => {
        setStudents(data)
        if (!initialData) {
          setForm(f => ({ ...f, studentId: "" }))
          setSelectedStudentIds([])
        }
      })
    }
  }, [form.classId])

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!initialData && selectedStudentIds.length === 0) {
      alert("Vui lòng chọn ít nhất một học sinh để tạo phiếu chuyển đi!")
      return
    }
    setSaving(true)
    let res;
    if (initialData) {
      res = await updateTransferOutAction(initialData.id, form)
    } else {
      res = await createTransferOutAction({
        ...form,
        studentIds: selectedStudentIds
      })
    }
    setSaving(false)
    if (res.success) {
      alert(initialData ? "Đã cập nhật thông tin chuyển đi thành công!" : "Đã tạo phiếu lưu chuyển và cập nhật danh sách lớp!")
      onSaved()
      onClose()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const COUNTRIES = ["Mỹ", "Anh", "Úc", "Canada", "Singapore", "Nhật Bản", "Hàn Quốc", "New Zealand", "Trung Quốc", "Đài Loan", "Pháp", "Đức", "Thụy Sĩ", "Hà Lan", "Phần Lan", "Ireland", "Nga", "Khác..."]
  const [provinces, setProvinces] = useState<string[]>([])

  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/")
      .then(res => res.json())
      .then(data => setProvinces(data.map((p: any) => p.name)))
      .catch(e => console.error("Lỗi tải tỉnh thành", e))
  }, [])

  const filteredClasses = classes.filter(c => {
    const isPre = isClassPreschool(c);
    const matchPre = activeSubTab === "preschool" ? isPre : !isPre;
    if (form.transferCategory === "GRADUATED") {
      return matchPre && c.grade === "12";
    }
    return matchPre;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 text-xs font-semibold">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <ArrowRightToLine className="w-5 h-5 mr-3 text-rose-500" /> 
            {initialData ? "Chỉnh sửa phiếu Chuyển đi" : "Tạo phiếu Chuyển đi"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
           <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
                                                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Filter Group */}
            {initialData ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học sinh chuyển đi</div>
                  <div className="text-base font-extrabold text-[#00A99D] mt-1 flex items-center gap-2">
                    {initialData.student?.studentName}
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                      {initialData.student?.studentCode}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">
                    Lớp cũ: <span className="text-slate-700 font-bold">{initialData.student?.class?.className}</span> ({initialData.student?.class?.campus?.campusName})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Năm học</div>
                  <div className="text-sm font-bold text-slate-700 mt-1">
                    {options.years.find((y: any) => y.id === form.academicYearId)?.name || "Năm học hiện tại"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Năm học</label>
                    <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})}>
                      <option value="">Chọn năm học</option>
                      {options.years.filter((y: any) => !y.isOff).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở</label>
                    <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})}>
                      <option value="">Chọn cơ sở</option>
                      {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp học</label>
                    <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                      <option value="">Chọn lớp học</option>
                      {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                    {form.classId && (
                      <div className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-1.5 animate-in fade-in duration-200">
                        <UserCheck className="w-3.5 h-3.5 text-[#00A99D]" />
                        <span>GVCN: <span className="text-slate-800 font-extrabold">{filteredClasses.find(c => c.id === form.classId)?.homeroomTeacher || "Chưa phân công"}</span></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh (Chọn 1 hoặc nhiều)</label>
                  {form.classId ? (
                    students.length > 0 ? (
                      <div className="border border-slate-200 rounded-2xl p-4 max-h-[220px] overflow-y-auto space-y-3 bg-slate-50/50">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                          <input
                            type="checkbox"
                            id="select-all-students"
                            className="w-4 h-4 text-[#00A99D] border-slate-300 rounded focus:ring-[#00A99D] cursor-pointer"
                            checked={students.length > 0 && students.every(s => selectedStudentIds.includes(s.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds(students.map(s => s.id));
                              } else {
                                setSelectedStudentIds([]);
                              }
                            }}
                          />
                          <label htmlFor="select-all-students" className="text-xs font-extrabold text-slate-800 cursor-pointer">Chọn tất cả ({students.length})</label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                          {students.map(s => (
                            <div key={s.id} className="flex items-center gap-2 hover:bg-slate-100/50 p-1.5 rounded-xl transition-all">
                              <input
                                type="checkbox"
                                id={`student-check-${s.id}`}
                                className="w-4 h-4 text-[#00A99D] border-slate-300 rounded focus:ring-[#00A99D] cursor-pointer"
                                checked={selectedStudentIds.includes(s.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentIds(prev => [...prev, s.id]);
                                  } else {
                                    setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                  }
                                }}
                              />
                              <label htmlFor={`student-check-${s.id}`} className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                                <span>{s.studentName}</span>
                                <span className="text-[9px] font-semibold text-slate-400 bg-slate-200/50 px-1 rounded">{s.studentCode}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-slate-400 italic p-6 border border-slate-200 border-dashed rounded-2xl text-center bg-slate-50">
                        Không tìm thấy học sinh hoạt động nào trong lớp này.
                      </div>
                    )
                  ) : (
                    <div className="text-xs font-bold text-slate-400 italic p-6 border border-slate-200 border-dashed rounded-2xl text-center bg-slate-50">
                      Vui lòng chọn Lớp học để hiển thị danh sách học sinh.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="h-px bg-slate-100" />

            {/* Transfer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày chuyển</label>
                <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.transferDate} onChange={e => setForm({...form, transferDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kỳ học</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                  <option value="">Chọn kỳ</option>
                  <option value="HK1">Học kỳ 1</option>
                  <option value="HK2">Học kỳ 2</option>
                  <option value="SUMMER">Trong hè</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Diện chuyển</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.transferCategory} onChange={e => setForm({...form, transferCategory: e.target.value})}>
                  <option value="">Chọn diện</option>
                  <option value="DOMESTIC">Chuyển trường VN</option>
                  <option value="ABROAD">Du học</option>
                  <option value="RESERVE">Bảo lưu</option>
                  <option value="GRADUATED">Tốt nghiệp THPT (TN)</option>
                </select>
              </div>
            </div>

            {form.transferCategory === "DOMESTIC" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/55 p-5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trường chuyển đến</label>
                  <input 
                    type="text" 
                    list="destination-schools-list" 
                    placeholder="Tên trường" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" 
                    value={form.destinationSchool} 
                    onChange={e => {
                      const val = e.target.value;
                      if (form.destinationProvince === "Thành phố Đà Nẵng") {
                        const matched = registeredSchools.find(s => s.name === val);
                        if (matched) {
                          setForm(f => ({
                            ...f,
                            destinationSchool: val,
                            destinationType: matched.schoolType || "PRIVATE"
                          }));
                          return;
                        }
                      }
                      setForm(f => ({ ...f, destinationSchool: val }));
                    }} 
                  />
                  <datalist id="destination-schools-list">
                    {form.destinationProvince === "Thành phố Đà Nẵng" && registeredSchools.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Loại hình</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destinationType} onChange={e => setForm({...form, destinationType: e.target.value})}>
                    <option value="">Chọn loại</option>
                    <option value="PRIVATE">Tư thục</option>
                    <option value="PUBLIC">Công lập</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tỉnh/TP</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destinationProvince} onChange={e => setForm({...form, destinationProvince: e.target.value})}>
                    <option value="">Chọn Tỉnh/TP</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            )}

            {form.transferCategory === "ABROAD" && (
              <div className="p-5 bg-slate-50/55 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quốc gia theo học</label>
                <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destinationCountry} onChange={e => setForm({...form, destinationCountry: e.target.value})}>
                  <option value="">Chọn Quốc gia</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {form.transferCategory === "RESERVE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50/55 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Từ ngày</label>
                  <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reserveStartDate} onChange={e => setForm({...form, reserveStartDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Đến ngày</label>
                  <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reserveEndDate} onChange={e => setForm({...form, reserveEndDate: e.target.value})} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lý do chuyển</label>
              <textarea placeholder="Nhập lý do chi tiết..." rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button disabled={saving} type="submit" className="px-6 py-3 bg-[#00A99D] text-white font-bold rounded-xl hover:bg-[#009085] transition-colors shadow-lg shadow-[#00A99D]/20 flex items-center">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Xác nhận chuyển
              </button>
            </div>
          </form>





        )}
      </div>
    </div>
  )
}

function ChangeClassModal({ activeSubTab, onClose, onSaved }: { activeSubTab: "general" | "preschool", onClose: () => void, onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [options, setOptions] = useState({ years: [] as any[], campuses: [] as any[] })
  const [classes, setClasses] = useState<any[]>([])
  const [destClasses, setDestClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  
  const [form, setForm] = useState({
    academicYearId: "",
    campusId: "",
    classId: "",
    studentId: "",
    destCampusId: "",
    destClassId: "",
    transferDate: "",
    semester: "",
    reason: ""
  })

  useEffect(() => {
    loadOptions()
  }, [])

  async function loadOptions() {
    setLoading(true)
    try {
      const data = await getTransferFormOptionsAction()
      if (data && data.years) {
        setOptions(data)
        const activeYear = data.years.find((y: any) => !y.isOff) || data.years[0];
        if (activeYear) setForm(f => ({ ...f, academicYearId: activeYear.id }))
      }
    } catch(e: any) {
        console.error("Error loading transfer data:", e)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (form.campusId && form.academicYearId) {
      getClassesByCampusAndYearAction(form.campusId, form.academicYearId).then(data => {
        setClasses(data)
        setForm(f => ({ ...f, classId: "", studentId: "" }))
      })
    }
  }, [form.campusId, form.academicYearId])

  useEffect(() => {
    if (form.classId) {
      getStudentsByClassAction(form.classId).then(data => {
        setStudents(data)
        setForm(f => ({ ...f, studentId: "" }))
      })
    }
  }, [form.classId])

  useEffect(() => {
    if (form.destCampusId && form.academicYearId) {
      getClassesByCampusAndYearAction(form.destCampusId, form.academicYearId).then(data => {
        setDestClasses(data)
        setForm(f => ({ ...f, destClassId: "" }))
      })
    }
  }, [form.destCampusId, form.academicYearId])

  async function handleSubmit(e: any) {
    e.preventDefault()
    setSaving(true)
    const res = await createChangeClassAction(form)
    setSaving(false)
    if (res.success) {
      alert("Đã chuyển lớp thành công!")
      onSaved()
      onClose()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const filteredClasses = classes.filter(c => {
    const isPre = isClassPreschool(c);
    return activeSubTab === "preschool" ? isPre : !isPre;
  });

  const filteredDestClasses = destClasses.filter(c => {
    const isPre = isClassPreschool(c);
    return activeSubTab === "preschool" ? isPre : !isPre;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 text-xs font-semibold">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <ArrowRightLeft className="w-5 h-5 mr-3 text-indigo-500" /> 
            Tạo phiếu Chuyển lớp
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
           <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
                              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Filter Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Năm học</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})}>
                  <option value="">Chọn năm học</option>
                  {options.years.filter((y: any) => !y.isOff).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})}>
                  <option value="">Chọn cơ sở</option>
                  {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp hiện tại</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                  <option value="">Chọn lớp hiện tại</option>
                  {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
                {form.classId && (
                  <div className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-1.5 animate-in fade-in duration-200">
                    <UserCheck className="w-3.5 h-3.5 text-[#00A99D]" />
                    <span>GVCN: <span className="text-slate-800 font-extrabold">{filteredClasses.find(c => c.id === form.classId)?.homeroomTeacher || "Chưa phân công"}</span></span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Học sinh</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})}>
                  <option value="">Chọn học sinh</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.studentName} ({s.studentCode})</option>)}
                </select>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="bg-slate-50/55 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#00A99D]" /> Thông tin chuyển lớp
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở chuyển đến</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destCampusId} onChange={e => setForm({...form, destCampusId: e.target.value})}>
                    <option value="">Chọn cơ sở đến</option>
                    {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp chuyển đến</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destClassId} onChange={e => setForm({...form, destClassId: e.target.value})}>
                    <option value="">Chọn lớp đến</option>
                    {filteredDestClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                  {form.destClassId && (
                    <div className="mt-2 text-[10px] font-bold text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 flex items-center gap-1.5 animate-in fade-in duration-200">
                      <UserCheck className="w-3.5 h-3.5 text-[#00A99D]" />
                      <span>GVCN: <span className="text-slate-800 font-extrabold">{filteredDestClasses.find(c => c.id === form.destClassId)?.homeroomTeacher || "Chưa phân công"}</span></span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày chuyển lớp</label>
                  <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.transferDate} onChange={e => setForm({...form, transferDate: e.target.value})} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lý do chuyển lớp</label>
              <textarea placeholder="Nhập lý do chi tiết..." rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button disabled={saving} type="submit" className="px-6 py-3 bg-[#00A99D] text-white font-bold rounded-xl hover:bg-[#009085] transition-colors shadow-lg shadow-[#00A99D]/20 flex items-center">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Xác nhận chuyển lớp
              </button>
            </div>
          </form>


        )}
      </div>
    </div>
  )
}
function TransferInModal({ 
  activeSubTab, 
  onClose, 
  onSaved, 
  initialData, 
  enrollmentRequest,
  batchRequests
}: { 
  activeSubTab: "general" | "preschool", 
  onClose: () => void, 
  onSaved: () => void, 
  initialData?: any, 
  enrollmentRequest?: any,
  batchRequests?: any[]
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [options, setOptions] = useState({ years: [] as any[], campuses: [] as any[] })
  const [classes, setClasses] = useState<any[]>([])
  
  const [periods, setPeriods] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [assessmentStudents, setAssessmentStudents] = useState<any[]>([])
  
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedBatch, setSelectedBatch] = useState("")
  const [selectedAssessmentStudent, setSelectedAssessmentStudent] = useState<any>(null)
  
  const [form, setForm] = useState({
    academicYearId: "",
    campusId: "",
    classId: "",
    assessmentStudentId: "",
    studentCode: "",
    studentName: "",
    transferDate: new Date().toISOString().split("T")[0],
    semester: "HK1",
    reason: ""
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const ops = await getTransferFormOptionsAction()
      let campusId = "";
      if (ops && ops.years) {
        setOptions(ops)
        const activeYear = ops.years.find((y: any) => !y.isOff) || ops.years[0];
        if (!initialData && activeYear) {
          setForm(f => ({ ...f, academicYearId: activeYear.id }))
        }
        if (enrollmentRequest?.admissionCampus && ops.campuses) {
          const campusMatch = ops.campuses.find((c: any) => 
            c.campusName.toLowerCase().trim() === enrollmentRequest.admissionCampus.toLowerCase().trim() ||
            c.campusCode.toLowerCase().trim() === enrollmentRequest.admissionCampus.toLowerCase().trim()
          );
          if (campusMatch) campusId = campusMatch.id;
        }
      }
      
      const isPreTarget = enrollmentRequest ? enrollmentRequest.isPreschool : (activeSubTab === "preschool");
      const pds = await (isPreTarget ? getPreschoolInputAssessmentPeriodsAction() : getInputAssessmentPeriodsAction())
      setPeriods(pds)

      if (enrollmentRequest) {
        const activeYear = ops?.years?.find((y: any) => !y.isOff) || ops?.years?.[0];
        setForm({
          academicYearId: activeYear ? activeYear.id : "",
          campusId: campusId,
          classId: "",
          assessmentStudentId: enrollmentRequest.id,
          studentCode: enrollmentRequest.studentCode || "",
          studentName: enrollmentRequest.fullName || "",
          transferDate: new Date().toISOString().split("T")[0],
          semester: "HK1",
          reason: "Tổ chức nhập học từ kết quả khảo sát"
        });
        setSelectedAssessmentStudent({
          fullName: enrollmentRequest.fullName,
          studentCode: enrollmentRequest.studentCode,
          dateOfBirth: enrollmentRequest.dateOfBirth
        });
      } else if (batchRequests && batchRequests.length > 0) {
        const activeYear = ops?.years?.find((y: any) => !y.isOff) || ops?.years?.[0];
        let batchCampusId = "";
        const firstCampus = batchRequests[0]?.admissionCampus;
        if (firstCampus && ops.campuses) {
          const campusMatch = ops.campuses.find((c: any) => 
            c.campusName.toLowerCase().trim() === firstCampus.toLowerCase().trim() ||
            c.campusCode.toLowerCase().trim() === firstCampus.toLowerCase().trim()
          );
          if (campusMatch) batchCampusId = campusMatch.id;
        }

        setForm({
          academicYearId: activeYear ? activeYear.id : "",
          campusId: batchCampusId,
          classId: "",
          assessmentStudentId: "BATCH",
          studentCode: "BATCH",
          studentName: "BATCH",
          transferDate: new Date().toISOString().split("T")[0],
          semester: "HK1",
          reason: "Xếp lớp hàng loạt từ kết quả khảo sát"
        });
      } else if (initialData) {
        setForm({
          academicYearId: initialData.student?.academicYearId || "",
          campusId: initialData.student?.campusId || "",
          classId: initialData.student?.classId || "",
          assessmentStudentId: "EXISTING",
          studentCode: initialData.student?.studentCode || "",
          studentName: initialData.student?.studentName || "",
          transferDate: new Date(initialData.transferDate).toISOString().split("T")[0],
          semester: initialData.semester || "HK1",
          reason: initialData.reason || ""
        });
        setSelectedAssessmentStudent({
          fullName: initialData.student?.studentName,
          studentCode: initialData.student?.studentCode,
          dateOfBirth: initialData.student?.dateOfBirth
        });
      }
    } catch(e: any) {
        console.error("Error loading transfer data:", e)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedPeriod) {
      const isPreTarget = enrollmentRequest ? enrollmentRequest.isPreschool : (activeSubTab === "preschool");
      if (isPreTarget) {
        getPreschoolInputAssessmentBatchesAction(selectedPeriod).then(setBatches)
      } else {
        getInputAssessmentBatchesAction(selectedPeriod).then(setBatches)
      }
      setAssessmentStudents([])
      setSelectedBatch("")
      loadStudents(selectedPeriod, "")
    }
  }, [selectedPeriod])

  useEffect(() => {
    if (selectedPeriod) {
      loadStudents(selectedPeriod, selectedBatch)
    }
  }, [selectedBatch])

  async function loadStudents(pId: string, bId: string) {
    const isPreTarget = enrollmentRequest ? enrollmentRequest.isPreschool : batchRequests ? batchRequests[0]?.isPreschool : (activeSubTab === "preschool");
    const data = await (isPreTarget ? getPreschoolInputAssessmentStudentsByPeriodAction(pId, bId) : getInputAssessmentStudentsByPeriodAction(pId, bId))
    setAssessmentStudents(data)
  }

  useEffect(() => {
    if (form.campusId && form.academicYearId) {
      getClassesByCampusAndYearAction(form.campusId, form.academicYearId).then(setClasses)
    }
  }, [form.campusId, form.academicYearId])

  function handleSelectStudent(id: string) {
    const s = assessmentStudents.find(x => x.id === id);
    if (s) {
      setForm(f => ({ 
        ...f, 
        assessmentStudentId: id,
        studentCode: s.studentCode || "",
        studentName: s.fullName || ""
      }))
      setSelectedAssessmentStudent(s)
    }
  }

  async function handleSubmit(e: any, notifyGVCN = false) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      let res;
      if (batchRequests && batchRequests.length > 0) {
        res = await completeBatchEnrollmentAction(
          batchRequests.map(r => r.id),
          batchRequests[0]?.isPreschool || false,
          {
            ...form,
            notifyGVCN: notifyGVCN
          }
        );
      } else if (enrollmentRequest) {
        res = await completeEnrollmentAction(enrollmentRequest.id, enrollmentRequest.isPreschool, {
          ...form,
          notifyGVCN: notifyGVCN
        });
      } else if (initialData) {
        res = await updateTransferInAction(initialData.id, {
          ...form,
          notifyGVCN: notifyGVCN
        });
      } else {
        res = await createTransferInAction({
          ...form,
          isPreschool: activeSubTab === "preschool",
          notifyGVCN: notifyGVCN
        });
      }
      
      if (res.success) {
        if (batchRequests && batchRequests.length > 0) {
          let msg = `Đã xếp lớp hàng loạt thành công cho ${res.count} học sinh!`;
          if (res.errors) {
            msg += `\nCác lỗi khi xếp lớp:\n${res.errors.join("\n")}`;
          }
          alert(msg);
        } else {
          alert(enrollmentRequest ? "Đã tổ chức nhập học và xếp lớp thành công!" : initialData ? "Đã cập nhật thông tin thành công!" : (notifyGVCN ? "Đã tiếp nhận và thông báo đến GVCN thành công!" : "Đã lưu thông tin học sinh!"));
        }
        onSaved()
        onClose()
      } else {
        alert("Lỗi: " + res.error)
      }
    } catch (err: any) {
      alert("Lỗi hệ thống: " + err.message)
    }
    setSaving(false)
  }

  const filteredClasses = classes.filter(c => {
    const isPreschoolTarget = enrollmentRequest 
      ? enrollmentRequest.isPreschool 
      : batchRequests 
        ? batchRequests[0]?.isPreschool 
        : (activeSubTab === "preschool");
    const isPre = isClassPreschool(c);
    return isPreschoolTarget ? isPre : !isPre;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 text-xs font-semibold">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <ArrowLeftToLine className="w-5 h-5 mr-3 text-emerald-500" /> 
            {initialData ? "Chỉnh sửa phiếu học sinh chuyển đến" : "Tạo phiếu học sinh chuyển đến"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
           <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
                              <form className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {enrollmentRequest && (
              <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl animate-in fade-in duration-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  Học sinh khảo sát liên kết
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                  <div><span className="text-slate-400 font-medium">Họ và tên:</span> <span className="text-slate-800 font-bold">{enrollmentRequest.fullName}</span></div>
                  <div><span className="text-slate-400 font-medium">Mã khảo sát:</span> <span className="text-slate-800 font-bold text-teal-650">{enrollmentRequest.studentCode}</span></div>
                  <div><span className="text-slate-400 font-medium">Phân hệ / Khối:</span> <span className="text-slate-800 font-bold">{enrollmentRequest.isPreschool ? "Mầm non" : `Khối ${enrollmentRequest.grade}`}</span></div>
                </div>
              </div>
            )}

            {batchRequests && batchRequests.length > 0 && (
              <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl animate-in fade-in duration-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  Học sinh khảo sát liên kết hàng loạt ({batchRequests.length} học sinh)
                </span>
                <div className="max-h-24 overflow-y-auto text-xs font-semibold text-slate-800 space-y-1 custom-scrollbar">
                  {batchRequests.map((r, i) => (
                    <div key={r.id} className="flex justify-between border-b border-slate-100/50 pb-1">
                      <span>{i + 1}. <span className="font-bold">{r.fullName}</span> (Mã KS: {r.studentCode})</span>
                      <span className="text-slate-400">{r.isPreschool ? "Mầm non" : `Khối ${r.grade}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Thông tin tiếp nhận</h4>
              {!batchRequests ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Họ và tên học sinh</label>
                    <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.studentName} onChange={e => setForm({...form, studentName: e.target.value})} placeholder="Nhập họ và tên..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mã KS (Khảo sát)</label>
                    <input disabled type="text" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-semibold outline-none text-slate-550 cursor-not-allowed" value={selectedAssessmentStudent?.studentCode || ""} placeholder="Mã KS từ dữ liệu..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mã HS</label>
                    <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.studentCode} onChange={e => setForm({...form, studentCode: e.target.value})} placeholder="Nhập mã HS mới..." />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-150 font-medium">
                  Ở chế độ xếp lớp hàng loạt, hệ thống sẽ sử dụng <strong>Mã KS</strong> (ví dụ: HS218, HS224) làm <strong>Mã HS</strong> và <strong>Họ tên ứng viên</strong> làm <strong>Tên học sinh chính thức</strong> cho từng học sinh.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Năm học</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.academicYearId} onChange={e => {
                    const yId = e.target.value;
                    setForm({ ...form, academicYearId: yId, classId: "" });
                    const currentPeriodObj = periods.find(p => p.id === selectedPeriod);
                    if (currentPeriodObj && currentPeriodObj.academicYearId !== yId) {
                      setSelectedPeriod("");
                      setBatches([]);
                      setAssessmentStudents([]);
                    }
                  }}>
                    <option value="">Chọn năm học</option>
                    {options.years.filter((y: any) => !y.isOff).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kỳ học</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                    <option value="SUMMER">Trong hè</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})}>
                    <option value="">Chọn cơ sở</option>
                    {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp học</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                    <option value="">Chọn lớp học</option>
                    {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                  {form.classId && (
                    <div className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-1.5 animate-in fade-in duration-200">
                      <UserCheck className="w-3.5 h-3.5 text-[#00A99D]" />
                      <span>GVCN: <span className="text-slate-800 font-extrabold">{filteredClasses.find(c => c.id === form.classId)?.homeroomTeacher || "Chưa phân công"}</span></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày nhập học</label>
                  <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.transferDate} onChange={e => setForm({...form, transferDate: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ghi chú thêm</label>
                <input type="text" placeholder="Nhập ghi chú chi tiết (nếu có)..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button disabled={saving} type="button" onClick={() => handleSubmit(null)} className="px-6 py-3 bg-indigo-50 text-indigo-500 font-bold rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Lưu phiếu
              </button>
              <button disabled={saving} type="button" onClick={() => handleSubmit(null, true)} className="px-6 py-3 bg-[#00A99D] hover:bg-[#009085] text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-100 flex items-center">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Thông báo đến GVCN
              </button>
            </div>
          </form>


        )}
      </div>
    </div>
  )
}

export function BatchEditOutModal({ ids, transfers, onClose, onSaved }: { ids: string[], transfers: any[], onClose: () => void, onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [updateFields, setUpdateFields] = useState<Record<string, boolean>>({
    date: false,
    category: false,
    reason: false
  })
  
  const [form, setForm] = useState({
    transferDate: new Date().toISOString().split('T')[0],
    semester: "HK1",
    transferCategory: "DOMESTIC",
    destinationSchool: "",
    destinationType: "PRIVATE",
    destinationProvince: "",
    destinationCountry: "",
    reserveStartDate: "",
    reserveEndDate: "",
    reason: ""
  })
  
  const [registeredSchools, setRegisteredSchools] = useState<any[]>([])

  useEffect(() => {
    getDestinationSchoolsAction().then(data => {
      setRegisteredSchools(data);
    });
  }, []);

  const selectedStudents = transfers.filter(t => ids.includes(t.id))
  const selectedNames = selectedStudents.map(t => t.student?.studentName || "Học sinh").join(", ")

  const handleSave = async (e: any) => {
    e.preventDefault()
    if (!updateFields.date && !updateFields.category && !updateFields.reason) {
      alert("Vui lòng chọn ít nhất một nhóm thông tin cần cập nhật!")
      return
    }

    const payload: any = {}
    if (updateFields.date) {
      payload.transferDate = form.transferDate
      payload.semester = form.semester
    }
    if (updateFields.category) {
      payload.transferCategory = form.transferCategory
      if (form.transferCategory === "DOMESTIC") {
        payload.destinationSchool = form.destinationSchool
        payload.destinationType = form.destinationType
        payload.destinationProvince = form.destinationProvince
      } else if (form.transferCategory === "ABROAD") {
        payload.destinationCountry = form.destinationCountry
      } else if (form.transferCategory === "RESERVE") {
        payload.reserveStartDate = form.reserveStartDate
        payload.reserveEndDate = form.reserveEndDate
      }
    }
    if (updateFields.reason) {
      payload.reason = form.reason
    }

    setSaving(true)
    const res = await updateBatchTransferOutAction(ids, payload)
    setSaving(false)

    if (res.success) {
      alert(`Đã cập nhật hàng loạt thành công cho ${ids.length} học sinh!`)
      onSaved()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const provinces = [
    "Thành phố Đà Nẵng",
    "Tỉnh Quảng Nam",
    "Tỉnh Thừa Thiên Huế",
    "Thành phố Hà Nội",
    "Thành phố Hồ Chí Minh"
  ]

  const COUNTRIES = [
    "Mỹ (Hoa Kỳ)",
    "Anh Quốc",
    "Úc",
    "Singapore",
    "Canada",
    "New Zealand",
    "Nhật Bản",
    "Hàn Quốc",
    "Khác"
  ]

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden border border-slate-100 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-850 flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-600" />
            Chỉnh sửa phiếu Chuyển đi hàng loạt ({ids.length})
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Target students card list */}
          <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-2xl">
            <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-1.5">Danh sách học sinh được chọn ({ids.length})</label>
            <p className="text-xs font-semibold text-slate-650 leading-relaxed max-h-16 overflow-y-auto custom-scrollbar">
              {selectedNames}
            </p>
          </div>

          {/* Group 1: Ngày chuyển & Kỳ học */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={updateFields.date}
                  onChange={e => setUpdateFields({...updateFields, date: e.target.checked})}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Cập nhật Ngày chuyển & Kỳ học</span>
              </label>
            </div>
            
            {updateFields.date && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ngày chuyển đi</label>
                  <input 
                    type="date" 
                    required 
                    value={form.transferDate}
                    onChange={e => setForm({...form, transferDate: e.target.value})}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kỳ học chuyển đi</label>
                  <select 
                    value={form.semester}
                    onChange={e => setForm({...form, semester: e.target.value})}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                    <option value="SUMMER">Trong hè</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Group 2: Diện chuyển & Nơi đến */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={updateFields.category}
                  onChange={e => setUpdateFields({...updateFields, category: e.target.checked})}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Cập nhật Diện chuyển & Nơi đến</span>
              </label>
            </div>
            
            {updateFields.category && (
              <div className="p-4 space-y-4 bg-white animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Diện chuyển đi</label>
                  <select 
                    value={form.transferCategory}
                    onChange={e => setForm({...form, transferCategory: e.target.value})}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="DOMESTIC">Chuyển trường VN</option>
                    <option value="ABROAD">Du học</option>
                    <option value="RESERVE">Bảo lưu</option>
                    <option value="GRADUATED">Tốt nghiệp THPT (TN)</option>
                  </select>
                </div>

                {form.transferCategory === "DOMESTIC" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tỉnh/TP</label>
                      <select 
                        value={form.destinationProvince} 
                        onChange={e => setForm({...form, destinationProvince: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="">Chọn Tỉnh/TP</option>
                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Trường chuyển đến</label>
                      <input 
                        type="text" 
                        list="batch-destination-schools-list" 
                        placeholder="Tên trường" 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none" 
                        value={form.destinationSchool} 
                        onChange={e => {
                          const val = e.target.value;
                          if (form.destinationProvince === "Thành phố Đà Nẵng") {
                            const matched = registeredSchools.find(s => s.name === val);
                            if (matched) {
                              setForm(f => ({
                                ...f,
                                destinationSchool: val,
                                destinationType: matched.schoolType || "PRIVATE"
                              }));
                              return;
                            }
                          }
                          setForm(f => ({ ...f, destinationSchool: val }));
                        }} 
                      />
                      <datalist id="batch-destination-schools-list">
                        {form.destinationProvince === "Thành phố Đà Nẵng" && registeredSchools.map(s => <option key={s.id} value={s.name} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Loại hình</label>
                      <select 
                        value={form.destinationType} 
                        onChange={e => setForm({...form, destinationType: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="PRIVATE">Tư thục</option>
                        <option value="PUBLIC">Công lập</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>
                  </div>
                )}

                {form.transferCategory === "ABROAD" && (
                  <div className="bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quốc gia du học</label>
                    <select 
                      value={form.destinationCountry} 
                      onChange={e => setForm({...form, destinationCountry: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="">Chọn Quốc gia</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {form.transferCategory === "RESERVE" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bảo lưu Từ ngày</label>
                      <input 
                        type="date" 
                        value={form.reserveStartDate} 
                        onChange={e => setForm({...form, reserveStartDate: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bảo lưu Đến ngày</label>
                      <input 
                        type="date" 
                        value={form.reserveEndDate} 
                        onChange={e => setForm({...form, reserveEndDate: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Group 3: Lý do chuyển */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={updateFields.reason}
                  onChange={e => setUpdateFields({...updateFields, reason: e.target.checked})}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Cập nhật Lý do chuyển trường</span>
              </label>
            </div>
            
            {updateFields.reason && (
              <div className="p-4 bg-white animate-in slide-in-from-top-2 duration-200">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lý do chi tiết</label>
                <textarea 
                  rows={3}
                  value={form.reason}
                  onChange={e => setForm({...form, reason: e.target.value})}
                  placeholder="Nhập lý do chuyển đi chung..."
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 font-bold rounded-xl text-xs text-slate-500 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-sm cursor-pointer disabled:opacity-55"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu thay đổi hàng loạt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
