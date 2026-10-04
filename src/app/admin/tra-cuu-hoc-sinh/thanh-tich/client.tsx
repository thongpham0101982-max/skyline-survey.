"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Search,
  Filter,
  Download,
  Printer,
  Sparkles,
  Building,
  GraduationCap,
  Calendar,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Flame,
  Globe,
} from "lucide-react";
import * as XLSX from "xlsx";

interface AchievementStudent {
  id: string;
  studentCode: string;
  studentName: string;
  className: string;
  campusName: string;
}

interface AchievementItem {
  id: string;
  name: string;
  type: string;
  category: string;
  level: string;
  academicYear: { id: string; name: string };
  students: {
    student: {
      id: string;
      studentCode: string;
      studentName: string;
      class: { id: string; className: string; grade: string | null } | null;
      campus: { id: string; campusName: string } | null;
    };
  }[];
}

interface SummaryCounts {
  quocTe: number;
  quocGia: number;
  thanhPho: number;
  quan: number;
  truong: number;
  total: number;
}

export default function ThanhTichClient() {
  const [displayView, setDisplayView] = useState<"hall_of_fame" | "table">("hall_of_fame");
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [summary, setSummary] = useState<SummaryCounts>({
    quocTe: 0,
    quocGia: 0,
    thanhPho: 0,
    quan: 0,
    truong: 0,
    total: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  // Load filter options
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch("/api/admin/tra-cuu-hoc-sinh/filter-options");
        if (res.ok) {
          const json = await res.json();
          const d = json.data || json;
          setAcademicYears(d.academicYears || []);
        }
      } catch (err) {
        console.error("Loi tai bo loc thanh tich:", err);
      }
    }
    loadFilters();
  }, []);

  // Fetch achievements
  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear !== "all") params.append("academicYearId", selectedYear);
      if (selectedLevel !== "all") params.append("level", selectedLevel);
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/tra-cuu-hoc-sinh/achievements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        setAchievements(d.achievements || []);
        if (d.summary) setSummary(d.summary);
      }
    } catch (err) {
      console.error("Loi tai thanh tich:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [selectedYear, selectedLevel, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAchievements();
  };
  const totalPages = Math.ceil(achievements.length / pageSize) || 1;
  const paginatedAchievements = useMemo(() => {
    const start = (page - 1) * pageSize;
    return achievements.slice(start, start + pageSize);
  }, [achievements, page]);

  const handleExportExcel = () => {
    if (achievements.length === 0) {
      alert("Không có dữ liệu thành tích để xuất Excel");
      return;
    }
    const dataToExport = achievements.map((ach, idx) => {
      const studentNames = ach.students.map((s) => s.student.studentName).join(", ");
      const studentCodes = ach.students.map((s) => s.student.studentCode).join(", ");
      const classNames = ach.students.map((s) => s.student.class?.className || "").filter(Boolean).join(", ");
      const campusNames = ach.students.map((s) => s.student.campus?.campusName || "").filter(Boolean).join(", ");

      return {
        "STT": idx + 1,
        "Tên giải thưởng / Thành tích": ach.name,
        "Cấp thi": ach.level,
        "Loại giải": ach.category,
        "Hình thức": ach.type === "CA_NHAN" ? "Cá nhân" : "Đồng đội",
        "Học sinh đạt giải": studentNames,
        "Mã học sinh": studentCodes,
        "Lớp": classNames,
        "Cơ sở": campusNames,
        "Năm học": ach.academicYear?.name || "---",
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bang_vang_thanh_tich");
    XLSX.writeFile(wb, `Bang_Vang_Thanh_Tich_SkyLine_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getLevelBadge = (level: string) => {
    const lvl = (level || "").toUpperCase();
    if (lvl.includes("QUOC_TE") || lvl.includes("VANG") || lvl === "5") {
      return {
        label: "Cấp Quốc tế",
        color: "bg-amber-100 text-amber-900 border-amber-300",
        icon: Globe,
      };
    }
    if (lvl.includes("QUOC_GIA") || lvl.includes("BAC") || lvl === "4") {
      return {
        label: "Cấp Quốc gia",
        color: "bg-red-100 text-red-800 border-red-300",
        icon: Flame,
      };
    }
    if (lvl.includes("THANH_PHO") || lvl.includes("TINH") || lvl === "3") {
      return {
        label: "Cấp Thành phố",
        color: "bg-purple-100 text-purple-800 border-purple-300",
        icon: Trophy,
      };
    }
    if (lvl.includes("QUAN") || lvl.includes("HUYEN") || lvl === "2") {
      return {
        label: "Cấp Quận / Huyện",
        color: "bg-blue-100 text-blue-800 border-blue-300",
        icon: Medal,
      };
    }
    return {
      label: "Cấp Trường",
      color: "bg-teal-100 text-teal-800 border-teal-300",
      icon: Award,
    };
  };

  return (
    <div className="space-y-6">
      {/* KPI MEDAL COUNT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => { setSelectedLevel(selectedLevel === "QUOC_TE" ? "all" : "QUOC_TE"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedLevel === "QUOC_TE"
              ? "bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/30"
              : "bg-white border-slate-200/80 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wider">Cấp Quốc tế</span>
            <Globe className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{summary.quocTe}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Huy chương & Giải thưởng</div>
        </div>

        <div
          onClick={() => { setSelectedLevel(selectedLevel === "QUOC_GIA" ? "all" : "QUOC_GIA"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedLevel === "QUOC_GIA"
              ? "bg-rose-500/10 border-rose-400 ring-2 ring-rose-400/30"
              : "bg-white border-slate-200/80 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">Cấp Quốc gia</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{summary.quocGia}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Huy chương & Giải thưởng</div>
        </div>

        <div
          onClick={() => { setSelectedLevel(selectedLevel === "THANH_PHO" ? "all" : "THANH_PHO"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedLevel === "THANH_PHO"
              ? "bg-purple-500/10 border-purple-400 ring-2 ring-purple-400/30"
              : "bg-white border-slate-200/80 hover:border-purple-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider">Cấp Tỉnh / TP</span>
            <Trophy className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{summary.thanhPho}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Giải thưởng vinh danh</div>
        </div>

        <div
          onClick={() => { setSelectedLevel(selectedLevel === "QUAN" ? "all" : "QUAN"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedLevel === "QUAN"
              ? "bg-blue-500/10 border-blue-400 ring-2 ring-blue-400/30"
              : "bg-white border-slate-200/80 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">Cấp Quận / Huyện</span>
            <Medal className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{summary.quan}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Giải thưởng vinh danh</div>
        </div>

        <div
          onClick={() => { setSelectedLevel(selectedLevel === "TRUONG" ? "all" : "TRUONG"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedLevel === "TRUONG"
              ? "bg-teal-500/10 border-[#00A19A] ring-2 ring-[#00A19A]/30"
              : "bg-white border-slate-200/80 hover:border-teal-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-[#003B3A] uppercase tracking-wider">Cấp Trường</span>
            <Award className="w-4 h-4 text-[#00A19A]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{summary.truong}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Khen thưởng cấp trường</div>
        </div>
      </div>

      {/* FILTER BAR CARD & VIEW SWITCHER */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDisplayView("hall_of_fame")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                displayView === "hall_of_fame"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Bảng vàng Vinh danh</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayView("table")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                displayView === "table"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh sách tra cứu chi tiết</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>In Bảng vàng</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên học sinh, mã HS, tên cuộc thi/kỳ thi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#00A19A] text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#00A19A] hover:bg-[#008B85] text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Tìm kiếm</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Năm học
              </label>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Tất cả các năm học</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Cấp độ cuộc thi
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => { setSelectedLevel(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Tất cả các cấp</option>
                <option value="QUOC_TE">Cấp Quốc tế</option>
                <option value="QUOC_GIA">Cấp Quốc gia</option>
                <option value="THANH_PHO">Cấp Tỉnh / Thành phố</option>
                <option value="QUAN">Cấp Quận / Huyện</option>
                <option value="TRUONG">Cấp Trường</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Lĩnh vực / Loại giải
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Tất cả lĩnh vực</option>
                <option value="OLYMPIC">Olympic Toán / Tiếng Anh / Tin học</option>
                <option value="KHKT">Nghiên cứu KHKT / STEM</option>
                <option value="THE_THAO">Thể dục thể thao</option>
                <option value="NGHE_THUAT">Văn nghệ / Năng khiếu</option>
                <option value="CHUNG_CHI">Chứng chỉ quốc tế (IELTS/Cambridge)</option>
              </select>
            </div>
          </div>
        </form>
      </div>
      {/* VIEW 1: HALL OF FAME CARD GRID */}
      {displayView === "hall_of_fame" && (
        <div>
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#00A19A]" />
              Đang tải bảng vàng thành tích học sinh...
            </div>
          ) : paginatedAchievements.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Không tìm thấy thành tích nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedAchievements.map((ach) => {
                const badge = getLevelBadge(ach.level);
                const BadgeIcon = badge.icon;
                const student = ach.students[0]?.student;

                return (
                  <div
                    key={ach.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#00A19A] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: Level badge & year */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {ach.academicYear?.name || "Năm học hiện tại"}
                        </span>
                      </div>

                      {/* Achievement Title */}
                      <h4 className="text-base font-extrabold text-[#003B3A] line-clamp-2">
                        {ach.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        Hình thức: {ach.type === "CA_NHAN" ? "Cá nhân" : "Đồng đội"} • {ach.category}
                      </p>
                    </div>

                    {/* Student Info Footer */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      {student ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-xs font-bold text-[#003B3A]">
                            {student.studentName.split(" ").slice(-1)[0]?.charAt(0) || "S"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              {student.studentName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {student.class?.className || "Sky-Line"} • {student.studentCode}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Đang cập nhật danh sách HS</span>
                      )}

                      <span className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <Crown className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SEARCH TABLE */}
      {displayView === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#00A19A]" />
              Bảng tra cứu danh sách thành tích học sinh ({achievements.length})
            </h3>
            <div className="text-xs text-slate-500">
              Trang {page} / {totalPages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Tên giải thưởng / Kỳ thi</th>
                  <th className="py-3.5 px-4 text-center">Cấp độ</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Học sinh đạt giải</th>
                  <th className="py-3.5 px-4">Lớp & Cơ sở</th>
                  <th className="py-3.5 px-4 text-center">Năm học</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                      Đang tải danh sách thành tích...
                    </td>
                  </tr>
                ) : paginatedAchievements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Không tìm thấy thành tích nào.
                    </td>
                  </tr>
                ) : (
                  paginatedAchievements.map((ach, idx) => {
                    const badge = getLevelBadge(ach.level);
                    const studentNames = ach.students.map((s) => s.student.studentName).join(", ");
                    const studentCodes = ach.students.map((s) => s.student.studentCode).join(", ");
                    const classesStr = ach.students.map((s) => s.student.class?.className || "").filter(Boolean).join(", ");
                    const campusStr = ach.students[0]?.student.campus?.campusName || "Sky-Line";

                    return (
                      <tr key={ach.id} className="hover:bg-teal-50/30 transition-colors">
                        <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{ach.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {ach.category} • {ach.type === "CA_NHAN" ? "Cá nhân" : "Đồng đội"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#003B3A]">{studentNames || "Đang cập nhật"}</div>
                          {studentCodes ? (
                            <div className="text-[11px] font-mono text-slate-400">{studentCodes}</div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700">{classesStr || "---"}</div>
                          <div className="text-[11px] text-slate-400">{campusStr}</div>
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-slate-600 font-medium">
                          {ach.academicYear?.name || "---"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Hiển thị {paginatedAchievements.length} trong tổng số {achievements.length} thành tích
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2 text-slate-700">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
