"use client";
import React, { useState, useEffect, useMemo } from "react";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  ArrowRight, 
  BookOpen, 
  RefreshCcw,
  Sparkles,
  Heart,
  Compass,
  Shield,
  Coins,
  FileSpreadsheet,
  Check,
  Target,
  Percent,
  TrendingUp,
  BrainCircuit
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SpecialSubjectsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState("FIN_EDU");
  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("ALL");

  const subjects = [
    { code: "FIN_EDU", name: "Giáo dục tài chính (1–9)", icon: Coins, color: "#059669", targetGrades: "Khối 1 - 9", totalLessons: 115, criteria: 240 },
    { code: "GDGT", name: "Giáo dục giới tính (6–9)", icon: Shield, color: "#E11D48", targetGrades: "Khối 6 - 9", totalLessons: 40, criteria: 160 },
    { code: "GDHN", name: "Giáo dục hướng nghiệp (6–12)", icon: Compass, color: "#D97706", targetGrades: "Khối 6 - 12", totalLessons: 70, criteria: 278 },
    { code: "CXXH", name: "Giáo dục Cảm xúc (1–9)", icon: Heart, color: "#0D9488", targetGrades: "Khối 1 - 9", totalLessons: 295, criteria: 979 },
  ];

  const currentSubject = subjects.find(s => s.code === selectedSubject) || subjects[0];

  const campuses = [
    { code: "ALL", name: "Tất cả cơ sở" },
    { code: "cmnofie5n0000uhvs2ifqj6pr", name: "CS1 - Sky-Line Riverside" },
    { code: "cmnofie7a0001uhvsl131y7yv", name: "CS2 - Sky-Line Central" },
    { code: "cmnofie7v0002uhvscd5jqp58", name: "CS3 - Sky-Line Global" },
    { code: "cmnofie8h0003uhvsggzaehkk", name: "CS4 - Sky-Line Hill" },
    { code: "cmnofie960004uhvsu7ez21gj", name: "CS5 - Sky-Line Beach" },
  ];

  // Dynamic available grades based on selected subject
  const availableGrades = useMemo(() => {
    switch (selectedSubject) {
      case "GDGT":
        return ["6", "7", "8", "9"];
      case "GDHN":
        return ["6", "7", "8", "9", "10", "11", "12"];
      case "CXXH":
      case "FIN_EDU":
        return ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
      default:
        return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    }
  }, [selectedSubject]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/special-subjects/dashboard?subjectCode=${selectedSubject}&campusId=${selectedCampus}&grade=${selectedGrade}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        toast.error(json.error || "Không thể tải số liệu thống kê");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedSubject, selectedCampus, selectedGrade]);

  const totalAssessed = (data?.distribution?.TOT || 0) + (data?.distribution?.DAT || 0) + (data?.distribution?.CAN_CO_GANG || 0);
  const totPct = totalAssessed > 0 ? Math.round(((data?.distribution?.TOT || 0) / totalAssessed) * 100) : 0;
  const datPct = totalAssessed > 0 ? Math.round(((data?.distribution?.DAT || 0) / totalAssessed) * 100) : 0;
  const ccgPct = totalAssessed > 0 ? Math.round(((data?.distribution?.CAN_CO_GANG || 0) / totalAssessed) * 100) : 0;

  // Dynamic Subject Description
  const getSubjectDescription = () => {
    switch (selectedSubject) {
      case "FIN_EDU":
        return "Chương trình Giáo dục Tài chính cá nhân chuẩn hóa từ Khối 2 đến Khối 9 (Khối 2S gồm 15 bài/55 tiêu chuẩn; Khối 3S gồm 15 bài/45 tiêu chuẩn; Khối 4S gồm 12 bài/57 tiêu chuẩn; Khối 5S gồm 12 bài/65 tiêu chuẩn; Khối 6-9 THCS gồm 40 bài/118 tiêu chuẩn). Đánh giá định tính 3 mức theo từng tiêu chuẩn năng lực Hiểu, Biết, Vận dụng.";
      case "GDGT":
        return "Chương trình Giáo dục Giới tính THCS (Khối 6–9) chuẩn hóa 40 bài học và 160 tiêu chuẩn đánh giá. GVCN trực tiếp giảng dạy và đánh giá định tính 3 mức theo từng bài học.";
      case "GDHN":
        return "Chương trình Giáo dục Hướng nghiệp (Khối 6–12) chuẩn hóa 70 bài học và 278 tiêu chuẩn. Hệ thống bám sát khung năng lực nghề nghiệp, định hướng phát triển bản thân và tự động tích hợp dữ liệu vào Hồ sơ học sinh.";
      case "CXXH":
        return "Chương trình Giáo dục Cảm xúc - Xã hội (SEL Khối 1–9) chuẩn hóa 295 bài học và 979 tiêu chuẩn đánh giá theo 5 nhóm năng lực chuẩn CASEL.";
      default:
        return "Chương trình môn học đặc thù chuẩn hóa Sky-Line Curricula.";
    }
  };

  const SubjectIcon = currentSubject.icon;

  return (
    <div className="p-3 md:p-4 w-full max-w-[1600px] mx-auto space-y-3.5">
      {/* Top Banner Navigation */}
      <SpecialSubjectNav 
        title="Dashboard Môn học đặc thù Sky-Line"
        subtitle="Theo dõi tiến độ giảng dạy PPCT, độ phủ đánh giá, chất lượng năng lực học sinh và phát hiện kịp thời học sinh cần hỗ trợ"
      />

      {/* Control bar: Filters - High Density & Compact */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-2xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Môn học đặc thù</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedGrade("ALL");
              }}
              className="text-xs font-bold border border-teal-200 rounded-lg px-3 py-1.5 bg-teal-50/70 text-teal-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {subjects.map(s => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cơ sở</label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {campuses.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Khối lớp</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Tất cả các khối ({currentSubject.targetGrades})</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all text-xs"
            title="Làm mới số liệu"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/admin/special-subjects/curriculums"
            className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <span>Quản lý Khung CT</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards - 6 Columns, Balanced & Highly Informative */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lớp phân công</span>
            <Building2 className="w-3.5 h-3.5 text-teal-700" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-black text-slate-900 tracking-tight">
              {loading ? "..." : (data?.totalClasses || 0)} <span className="text-xs font-semibold text-slate-500">lớp</span>
            </div>
            <p className="text-[10px] text-slate-500">Hệ S toàn trường</p>
          </div>
          <div style={{ backgroundColor: currentSubject.color }} className="absolute bottom-0 left-0 right-0 h-1" />
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Học sinh theo học</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-black text-slate-900 tracking-tight">
              {loading ? "..." : (data?.totalStudents || 0)} <span className="text-xs font-semibold text-slate-500">HS</span>
            </div>
            <p className="text-[10px] text-slate-500">{currentSubject.targetGrades}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiến độ PPCT</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-black text-emerald-700 tracking-tight">
              {loading ? "..." : `${data?.overallPpctRate || 0}%`}
            </div>
            <p className="text-[10px] text-slate-500">Hoàn thành bài học</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Độ phủ đánh giá</span>
            <Percent className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-black text-teal-700 tracking-tight">
              {loading ? "..." : `${data?.overallCoverageRate || 0}%`}
            </div>
            <p className="text-[10px] text-slate-500">Học sinh đã đánh giá</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500" />
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lượt đánh giá</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-black text-indigo-700 tracking-tight">
              {loading ? "..." : (data?.totalGradeEntries || 0)}
            </div>
            <p className="text-[10px] text-slate-500">Hoàn tất: {data?.totalCompletedEntries || 0}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cần hỗ trợ</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-black text-amber-600 tracking-tight">
              {loading ? "..." : (data?.alerts?.length || 0)} <span className="text-xs font-semibold text-slate-500">HS</span>
            </div>
            <p className="text-[10px] text-slate-500">Tiêu chí cần cố gắng</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>
      </div>

      {/* Competency Distribution Breakdown (Hiểu / Biết / Vận dụng) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BrainCircuit className="w-4 h-4 text-teal-600" />
              <span>Phân bố kết quả theo 3 Nhóm Năng lực đánh giá ({currentSubject.name})</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tỷ lệ đạt chuẩn Tốt / Đạt / Cần cố gắng phân bổ theo các nhóm năng lực Hiểu, Biết và Vận dụng
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
            Tổng lượt đánh giá: {totalAssessed}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Năng lực Hiểu */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-900 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span>Năng lực Hiểu</span>
              </span>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                {data?.competencyStats?.hieu?.total || 0} lượt
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-600">
                <span>Tốt (Hoàn thành tốt):</span>
                <span className="font-bold text-emerald-700">{data?.competencyStats?.hieu?.tot || 0} ({data?.competencyStats?.hieu?.totRate || 0}%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Đạt (Hoàn thành):</span>
                <span className="font-bold text-teal-700">{data?.competencyStats?.hieu?.hoanThanh || 0} ({data?.competencyStats?.hieu?.datRate || 0}%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Cần cố gắng:</span>
                <span className="font-bold text-amber-700">{data?.competencyStats?.hieu?.canCoGang || 0} ({data?.competencyStats?.hieu?.ccgRate || 0}%)</span>
              </div>
            </div>
          </div>

          {/* Năng lực Biết */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-900 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                <span>Năng lực Biết</span>
              </span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                {data?.competencyStats?.biet?.total || 0} lượt
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-600">
                <span>Tốt (Hoàn thành tốt):</span>
                <span className="font-bold text-emerald-700">{data?.competencyStats?.biet?.tot || 0} ({data?.competencyStats?.biet?.totRate || 0}%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Đạt (Hoàn thành):</span>
                <span className="font-bold text-teal-700">{data?.competencyStats?.biet?.hoanThanh || 0} ({data?.competencyStats?.biet?.datRate || 0}%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Cần cố gắng:</span>
                <span className="font-bold text-amber-700">{data?.competencyStats?.biet?.canCoGang || 0} ({data?.competencyStats?.biet?.ccgRate || 0}%)</span>
              </div>
            </div>
          </div>

          {/* Năng lực Vận dụng */}
          <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-purple-900 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                <span>Năng lực Vận dụng</span>
              </span>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                {data?.competencyStats?.vanDung?.total || 0} lượt
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-600">
                <span>Tốt (Hoàn thành tốt):</span>
                <span className="font-bold text-emerald-700">{data?.competencyStats?.vanDung?.tot || 0} ({data?.competencyStats?.vanDung?.totRate || 0}%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Đạt (Hoàn thành):</span>
                <span className="font-bold text-teal-700">{data?.competencyStats?.vanDung?.hoanThanh || 0} ({data?.competencyStats?.vanDung?.datRate || 0}%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Cần cố gắng:</span>
                <span className="font-bold text-amber-700">{data?.competencyStats?.vanDung?.canCoGang || 0} ({data?.competencyStats?.vanDung?.ccgRate || 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Side Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Left 2 Cols: Distribution bar & info */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Phổ kết quả tổng hợp môn {currentSubject.name.split("(")[0].trim()}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Thang chuẩn định tính 3 mức Sky-Line ({currentSubject.totalLessons} bài học • {currentSubject.criteria} chỉ số)
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                Tổng lượt: {totalAssessed}
              </span>
            </div>

            {/* Progress bar visual */}
            <div className="space-y-2.5">
              <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  style={{ width: `${totPct}%` }} 
                  className="bg-emerald-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                >
                  {totPct > 5 && `${totPct}%`}
                </div>
                <div 
                  style={{ width: `${datPct}%` }} 
                  className="bg-teal-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                >
                  {datPct > 5 && `${datPct}%`}
                </div>
                <div 
                  style={{ width: `${ccgPct}%` }} 
                  className="bg-amber-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                >
                  {ccgPct > 5 && `${ccgPct}%`}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">Tốt (Hoàn thành tốt)</span>
                  </div>
                  <div className="text-lg font-black text-emerald-800 mt-1">
                    {data?.distribution?.TOT || 0}
                  </div>
                  <div className="text-[10px] text-emerald-700/80 font-medium">{totPct}% tổng số</div>
                </div>

                <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-100">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span className="text-xs font-bold text-teal-900">Đạt (Hoàn thành)</span>
                  </div>
                  <div className="text-lg font-black text-teal-800 mt-1">
                    {data?.distribution?.DAT || 0}
                  </div>
                  <div className="text-[10px] text-teal-700/80 font-medium">{datPct}% tổng số</div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-900">Cần cố gắng</span>
                  </div>
                  <div className="text-lg font-black text-amber-800 mt-1">
                    {data?.distribution?.CAN_CO_GANG || 0}
                  </div>
                  <div className="text-[10px] text-amber-700/80 font-medium">{ccgPct}% tổng số</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Subject Metadata Box */}
          <div className="rounded-xl p-3 bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start space-x-3 mt-2">
            <div 
              style={{ backgroundColor: `${currentSubject.color}18`, color: currentSubject.color }}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold mt-0.5"
            >
              <SubjectIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                <span>Khung chuẩn hóa {currentSubject.name}</span>
                <span className="text-[9px] font-semibold px-2 py-0.2 bg-teal-100/70 text-teal-800 rounded">
                  {currentSubject.targetGrades}
                </span>
              </p>
              <p className="mt-1 text-slate-600 text-[11px] leading-relaxed">
                {getSubjectDescription()}
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Alerts List & Support Status */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-slate-900">Học sinh cần hỗ trợ ({currentSubject.name.split("(")[0].trim()})</h2>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                (data?.alerts?.length || 0) > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {data?.alerts?.length || 0} HS
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {data?.alerts && data.alerts.length > 0 ? (
                data.alerts.map((st: any, sIdx: number) => (
                  <div key={st.id || `alert-${sIdx}`} className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/70 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{st.studentName}</div>
                      <div className="text-[10px] text-slate-500">{st.studentCode} • Lớp {st.className} ({st.campusName})</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {st.needSupportCount} bài CCG
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs space-y-2 bg-slate-50/60 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">100% Học sinh đạt yêu cầu trở lên</span>
                    <span className="text-[11px] text-slate-500">Chưa ghi nhận trường hợp cần hỗ trợ đặc biệt</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/admin/special-subjects/gradebook"
              className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
            >
              <span>Xem chi tiết sổ điểm các lớp</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>
          </div>
        </div>
      </div>

      {/* Class Level Assessment Progress Table */}
      {data?.classStats && data.classStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <span>Tiến độ giảng dạy & Đánh giá chi tiết từng lớp ({data.classStats.length} lớp)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Theo dõi tỷ lệ hoàn thành PPCT và độ phủ đánh giá thực tế của Giáo viên theo từng cơ sở
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Niên khóa 2026-2027
            </span>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200">
                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Lớp học</th>
                  <th className="py-2.5 px-3.5">Cơ sở</th>
                  <th className="py-2.5 px-3.5">Khối</th>
                  <th className="py-2.5 px-3.5">Giáo viên phụ trách</th>
                  <th className="py-2.5 px-3.5 text-center">Sĩ số</th>
                  <th className="py-2.5 px-3.5 text-center">Tiến độ PPCT</th>
                  <th className="py-2.5 px-3.5 text-center">Độ phủ đánh giá</th>
                  <th className="py-2.5 px-3.5 text-center">Kết quả (Tốt / Đạt / CCG)</th>
                  <th className="py-2.5 px-3.5 text-right">Sổ điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.classStats.map((c: any, idx: number) => (
                  <tr key={c.assignmentId || c.classId || `class-stat-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{c.className}</td>
                    <td className="py-2.5 px-3.5 text-slate-600">{c.campusName}</td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-700">Khối {c.grade}</td>
                    <td className="py-2.5 px-3.5 text-slate-700">{c.teacherName}</td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-slate-800">{c.studentCount} HS</td>
                    
                    {/* PPCT Completion Rate */}
                    <td className="py-2.5 px-3.5 w-36 text-center">
                      <div className="flex items-center space-x-1.5">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            style={{ width: `${Math.min(100, c.ppctCompletionRate || 0)}%` }}
                            className="bg-emerald-600 h-full rounded-full transition-all"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 w-8 text-right">
                          {c.ppctCompletionRate || 0}%
                        </span>
                      </div>
                    </td>

                    {/* Assessment Coverage */}
                    <td className="py-2.5 px-3.5 w-36 text-center">
                      <div className="flex items-center space-x-1.5">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            style={{ width: `${Math.min(100, c.coverageRate || 0)}%` }}
                            className="bg-teal-600 h-full rounded-full transition-all"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 w-8 text-right">
                          {c.coverageRate || 0}%
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <span className="text-emerald-700 font-bold">{c.totCount || 0}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-teal-700 font-bold">{c.datCount || 0}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-amber-700 font-bold">{c.canCoGangCount || 0}</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <Link
                        href={`/admin/special-subjects/gradebook?assignmentId=${c.assignmentId}`}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline inline-flex items-center space-x-1"
                      >
                        <span>Vào sổ</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
