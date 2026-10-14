"use client";
import React, { useState, useEffect } from "react";
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
  Sparkles
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SpecialSubjectsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("ALL");

  const campuses = [
    { code: "ALL", name: "Tất cả cơ sở" },
    { code: "cmnofie5n0000uhvs2ifqj6pr", name: "CS1 - Riverside" },
    { code: "cmnofie7a0001uhvsl131y7yv", name: "CS2 - Central" },
    { code: "cmnofie7v0002uhvscd5jqp58", name: "CS3 - International" },
    { code: "cmnofie8h0003uhvsggzaehkk", name: "CS4 - Hillside" },
    { code: "cmnofie960004uhvsu7ez21gj", name: "CS5 - Beachside" },
  ];

  const grades = [
    { code: "ALL", name: "Tất cả khối" },
    { code: "1", name: "Khối 1" },
    { code: "2", name: "Khối 2" },
    { code: "3", name: "Khối 3" },
    { code: "4", name: "Khối 4" },
    { code: "5", name: "Khối 5" },
  ];

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/special-subjects/dashboard?campusId=${selectedCampus}&grade=${selectedGrade}`);
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
  }, [selectedCampus, selectedGrade]);

  const totalAssessed = (data?.distribution?.TOT || 0) + (data?.distribution?.DAT || 0) + (data?.distribution?.CAN_CO_GANG || 0);
  const totPct = totalAssessed > 0 ? Math.round(((data?.distribution?.TOT || 0) / totalAssessed) * 100) : 0;
  const datPct = totalAssessed > 0 ? Math.round(((data?.distribution?.DAT || 0) / totalAssessed) * 100) : 0;
  const ccgPct = totalAssessed > 0 ? Math.round(((data?.distribution?.CAN_CO_GANG || 0) / totalAssessed) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <SpecialSubjectNav 
        title="Dashboard Môn học đặc thù Sky-Line"
        subtitle="Theo dõi tiến độ giảng dạy, tỷ lệ hoàn tất đánh giá và chất lượng đầu ra học sinh"
      />

      {/* Control bar: Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cơ sở</label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {grades.map(g => (
                <option key={g.code} value={g.code}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-5">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/admin/special-subjects/curriculums"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/60 hover:bg-teal-100 flex items-center space-x-1.5 transition-all"
          >
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span>Xem Khung 75 Tiết</span>
          </Link>
          <Link
            href="/admin/special-subjects/gradebook"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#002827] flex items-center space-x-1.5 transition-all shadow-md shadow-[#003B3A]/20"
          >
            <span>Vào Sổ đánh giá</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp được phân công</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? "..." : (data?.totalClasses || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center">
              <span>Đang triển khai môn GDTC K-12</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500" />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh theo học</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? "..." : (data?.totalStudents || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              <span>Học sinh trong danh sách phân công</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã hoàn tất đánh giá</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-700 tracking-tight">
              {loading ? "..." : (data?.totalCompletedEntries || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
              <span>Lưu nháp: {data?.totalDraftEntries || 0}</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cần hỗ trợ học tập</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
              {loading ? "..." : (data?.alerts?.length || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              <span>Học sinh có kết quả cần cố gắng</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Distribution bar & info */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Phổ kết quả đánh giá năng lực</h2>
              <p className="text-xs text-slate-500">Phân loại định tính theo thang chuẩn Sky-Line</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
              Tổng lượt: {totalAssessed}
            </span>
          </div>

          {/* Progress bar visual */}
          <div className="space-y-3">
            <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
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

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">Tốt (Hoàn thành tốt)</span>
                </div>
                <div className="text-xl font-black text-emerald-800 mt-1.5">
                  {data?.distribution?.TOT || 0}
                </div>
                <div className="text-[11px] text-emerald-700/80 font-medium">{totPct}% tổng số</div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-100">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-teal-500" />
                  <span className="text-xs font-bold text-teal-900">Đạt (Hoàn thành)</span>
                </div>
                <div className="text-xl font-black text-teal-800 mt-1.5">
                  {data?.distribution?.DAT || 0}
                </div>
                <div className="text-[11px] text-teal-700/80 font-medium">{datPct}% tổng số</div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-amber-900">Cần cố gắng</span>
                </div>
                <div className="text-xl font-black text-amber-800 mt-1.5">
                  {data?.distribution?.CAN_CO_GANG || 0}
                </div>
                <div className="text-[11px] text-amber-700/80 font-medium">{ccgPct}% tổng số</div>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="rounded-xl p-4 bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Khung chương trình Giáo dục tài chính cá nhân</p>
              <p className="mt-1 text-slate-600 leading-relaxed">
                Đã chuẩn hóa hoàn tất 75 tiết dạy cho 5 khối Tiểu học (15 tiết/khối), bao gồm đầy đủ mục tiêu, yêu cầu cần đạt, hoạt động và sản phẩm đầu ra. Dự án nhóm được tích hợp ở các tiết cuối khóa (tiết 12–15).
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Alerts List */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Học sinh cần hỗ trợ</h2>
              <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                {data?.alerts?.length || 0} HS
              </span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {data?.alerts && data.alerts.length > 0 ? (
                data.alerts.map((st: any) => (
                  <div key={st.id} className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{st.studentName}</div>
                      <div className="text-[11px] text-slate-500">{st.studentCode} • Lớp {st.className}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {st.needSupportCount} bài CCG
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <span>Không có học sinh nào cần hỗ trợ đặc biệt</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              href="/admin/special-subjects/gradebook"
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
            >
              <span>Xem chi tiết sổ điểm các lớp</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
