"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  Trophy,
  Star,
  AlertCircle,
  Search,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building,
  GraduationCap,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";

interface Campus {
  id: string;
  campusName: string;
}

interface ClassItem {
  id: string;
  className: string;
  grade: string | null;
  campusId: string;
}

interface RankedStudent {
  id: string;
  studentId: string;
  fullName: string;
  gender: string | null;
  className: string;
  grade: string | null;
  campusName: string;
  term: string;
  gpa: number | null;
  academicRating: string;
  conductRating: string;
  absences: number;
  feedback: string | null;
}

interface RatingDistribution {
  XUAT_SAC: number;
  GIOI: number;
  KHA: number;
  DAT: number;
  CHUA_DAT: number;
}

export default function XepLoaiClient() {
  const [selectedTerm, setSelectedTerm] = useState<string>("HK1"); // HK1, HK2, CN
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "honor" | "support">("all");

  const [students, setStudents] = useState<RankedStudent[]>([]);
  const [distribution, setDistribution] = useState<RatingDistribution>({
    XUAT_SAC: 0,
    GIOI: 0,
    KHA: 0,
    DAT: 0,
    CHUA_DAT: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Load filter options
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch("/api/admin/tra-cuu-hoc-sinh/filter-options");
        if (res.ok) {
          const json = await res.json();
          const d = json.data || json;
          setCampuses(d.campuses || []);
          setClasses(d.classes || []);
        }
      } catch (err) {
        console.error("Loi tai bo loc xep loai:", err);
      }
    }
    loadFilters();
  }, []);

  // Fetch rankings
  const fetchRankings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("term", selectedTerm);
      if (selectedCampus !== "all") params.append("campusId", selectedCampus);
      if (selectedGrade !== "all") params.append("grade", selectedGrade);
      if (selectedClass !== "all") params.append("classId", selectedClass);
      if (selectedRating !== "all") params.append("rating", selectedRating);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/admin/tra-cuu-hoc-sinh/rankings?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        setStudents(d.students || []);
        if (d.distribution) {
          setDistribution(d.distribution);
        }
      }
    } catch (err) {
      console.error("Loi tai bang xep loai:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [selectedTerm, selectedCampus, selectedGrade, selectedClass, selectedRating]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRankings();
  };
  // Tab-based filtering
  const displayedStudents = useMemo(() => {
    if (activeTab === "honor") {
      return students.filter(
        (s) => s.academicRating.includes("Xuất sắc") || s.academicRating.includes("Giỏi")
      );
    }
    if (activeTab === "support") {
      return students.filter(
        (s) => s.academicRating.includes("Chưa đạt") || s.academicRating === "Đạt"
      );
    }
    return students;
  }, [students, activeTab]);

  const totalPages = Math.ceil(displayedStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayedStudents.slice(start, start + pageSize);
  }, [displayedStudents, page]);

  const handleExportExcel = () => {
    if (displayedStudents.length === 0) {
      alert("Không có dữ liệu để xuất Excel");
      return;
    }
    const dataToExport = displayedStudents.map((s, idx) => ({
      "STT": idx + 1,
      "Mã học sinh": s.studentId,
      "Họ và tên": s.fullName,
      "Lớp": s.className,
      "Cơ sở": s.campusName,
      "Học kỳ": s.term === "HK1" ? "Học kỳ 1" : s.term === "HK2" ? "Học kỳ 2" : "Cả năm",
      "Điểm trung bình (GPA)": s.gpa !== null ? s.gpa : "---",
      "Xếp loại học lực": s.academicRating,
      "Rèn luyện / Hạnh kiểm": s.conductRating,
      "Số ngày nghỉ": s.absences,
      "Ghi chú": s.feedback || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Xep_loai_hoc_sinh");
    XLSX.writeFile(wb, `Bang_Xep_Loai_SkyLine_${selectedTerm}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* SEMESTER SWITCHER & ACTION BUTTONS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Kỳ đánh giá:
          </span>
          {[
            { key: "HK1", label: "Học kỳ 1" },
            { key: "HK2", label: "Học kỳ 2" },
            { key: "CN", label: "Cả năm học" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setSelectedTerm(t.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedTerm === t.key
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
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
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* 5 RATING DISTRIBUTION CARDS (TT22 / TT27) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => { setSelectedRating(selectedRating === "XUAT_SAC" ? "all" : "XUAT_SAC"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedRating === "XUAT_SAC"
              ? "bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/30"
              : "bg-white border-slate-200/80 hover:border-purple-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider">Xuất sắc</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{distribution.XUAT_SAC}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Học sinh đạt chuẩn</div>
        </div>

        <div
          onClick={() => { setSelectedRating(selectedRating === "GIOI" ? "all" : "GIOI"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedRating === "GIOI"
              ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/30"
              : "bg-white border-slate-200/80 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">Giỏi</span>
            <Trophy className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{distribution.GIOI}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Học sinh đạt chuẩn</div>
        </div>

        <div
          onClick={() => { setSelectedRating(selectedRating === "KHA" ? "all" : "KHA"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedRating === "KHA"
              ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-400/30"
              : "bg-white border-slate-200/80 hover:border-teal-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-teal-700 uppercase tracking-wider">Khá</span>
            <CheckCircle2 className="w-4 h-4 text-[#00A19A]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{distribution.KHA}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Học sinh đạt chuẩn</div>
        </div>

        <div
          onClick={() => { setSelectedRating(selectedRating === "DAT" ? "all" : "DAT"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedRating === "DAT"
              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30"
              : "bg-white border-slate-200/80 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wider">Đạt</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{distribution.DAT}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Hoàn thành cơ bản</div>
        </div>

        <div
          onClick={() => { setSelectedRating(selectedRating === "CHUA_DAT" ? "all" : "CHUA_DAT"); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
            selectedRating === "CHUA_DAT"
              ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/30"
              : "bg-white border-slate-200/80 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">Cần hỗ trợ</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{distribution.CHUA_DAT}</div>
          <div className="text-[11px] text-rose-500 mt-1 font-semibold">Chưa đạt chuẩn</div>
        </div>
      </div>

      {/* FILTER BAR CARD */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Mã học sinh hoặc Họ tên..."
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
                Cơ sở
              </label>
              <select
                value={selectedCampus}
                onChange={(e) => { setSelectedCampus(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Tất cả cơ sở</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.campusName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Khối lớp
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Tất cả các khối</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g.toString()}>Khối {g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Lớp học
              </label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Tất cả các lớp</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className} {cls.grade ? `(K${cls.grade})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>
      {/* RANKING LIST & SUB-TABS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab("all"); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "all"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả bảng điểm ({students.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("honor"); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "honor"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Bảng vinh danh (Xuất sắc & Giỏi)</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("support"); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "support"
                  ? "bg-rose-700 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Học sinh cần bồi dưỡng</span>
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Hiển thị {paginatedStudents.length} / {displayedStudents.length} học sinh
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">STT</th>
                <th className="py-3.5 px-4">Mã HS</th>
                <th className="py-3.5 px-4">Họ và tên</th>
                <th className="py-3.5 px-4">Lớp & Cơ sở</th>
                <th className="py-3.5 px-4 text-center">Điểm TB (GPA)</th>
                <th className="py-3.5 px-4 text-center">Xếp loại học lực</th>
                <th className="py-3.5 px-4 text-center">Rèn luyện</th>
                <th className="py-3.5 px-4 text-center">Nghỉ học</th>
                <th className="py-3.5 px-4">Đánh giá chung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                    Đang tải danh sách xếp loại học sinh...
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Không tìm thấy học sinh nào phù hợp trong danh sách này.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const isTop = s.academicRating.includes("Xuất sắc");
                  const isGood = s.academicRating.includes("Giỏi");
                  const isPass = s.academicRating === "Đạt";
                  const isLow = s.academicRating.includes("Chưa đạt");

                  return (
                    <tr key={s.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-xs text-[#003B3A]">
                        {s.studentId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {s.fullName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">{s.className}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{s.campusName}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-sm text-[#003B3A]">
                        {s.gpa !== null ? s.gpa.toFixed(1) : "---"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            isTop
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : isGood
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isLow
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : isPass
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-teal-100 text-teal-800 border border-teal-200"
                          }`}
                        >
                          {s.academicRating}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {s.conductRating || "Tốt"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-mono text-slate-600">
                        {s.absences > 0 ? (
                          <span className="text-amber-600 font-bold">{s.absences} buổi</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 italic">
                        {s.feedback || (isTop ? "Học lực vượt trội, tích cực phát biểu" : isLow ? "Cần phụ đạo thêm các môn tự nhiên" : "Hoàn thành tốt nhiệm vụ học tập")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Trang {page} / {totalPages}
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
    </div>
  );
}
