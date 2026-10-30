"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Download,
  Printer,
  Eye,
  User,
  Phone,
  MapPin,
  Calendar,
  Building,
  GraduationCap,
  Users,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  BadgeCheck,
  BookMarked,
  Lock,
  Unlock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";

interface Campus {
  id: string;
  name: string;
  code: string;
}

interface ClassItem {
  id: string;
  className: string;
  grade: number | null;
  campusId: string;
  schoolBlock?: string;
}

interface StudentProfile {
  id: string;
  studentId: string;
  vneduCode?: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  status: string;
  campusId: string;
  campusName: string;
  classId: string | null;
  className: string;
  grade: number | null;
  schoolBlock: string;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  address: string | null;
  enrollmentDate: string | null;
  emergencyContact: string | null;
  allergies?: string | null;
  specialGradeEntries?: any[];
}
export default function HoSoClient() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalStudents, setTotalStudents] = useState<number>(0);

  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [parentPortalUnlocked, setParentPortalUnlocked] = useState<boolean>(false);
  const [savingPortalLock, setSavingPortalLock] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/student-profiles/section-config")
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json?.data) {
          const allCfg = json.data["ALL_ALL"] || json.data["DEFAULT"] || {};
          setParentPortalUnlocked(Boolean(allCfg.parentPortalUnlocked));
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleParentPortal = async () => {
    const nextUnlocked = !parentPortalUnlocked;
    setParentPortalUnlocked(nextUnlocked);
    try {
      setSavingPortalLock(true);
      const res = await fetch("/api/admin/student-profiles/section-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: "ALL",
          educationSystem: "ALL",
          toggleParentPortalOnly: true,
          parentPortalUnlocked: nextUnlocked,
        }),
      });
      const json = await res.json();
      if (json?.success && json?.data) {
        const allCfg = json.data["ALL_ALL"] || json.data["DEFAULT"] || {};
        setParentPortalUnlocked(Boolean(allCfg.parentPortalUnlocked));
      }
    } catch (e) {
      console.error("Error toggling parent portal lock:", e);
    } finally {
      setSavingPortalLock(false);
    }
  };

  useEffect(() => {
    async function fetchFilters() {
      try {
        const res = await fetch("/api/admin/tra-cuu-hoc-sinh/filter-options");
        if (res.ok) {
          const data = await res.json();
          setCampuses(data.campuses || []);
          setClasses(data.classes || []);
        }
      } catch (err) {
        console.error("Loi tai bo loc:", err);
      }
    }
    fetchFilters();
  }, []);

  const classesToShow = useMemo(() => {
    return classes.filter((c) => {
      if (selectedCampus !== "all" && c.campusId !== selectedCampus) return false;
      if (selectedGrade !== "all" && c.grade !== Number(selectedGrade)) return false;
      if (selectedBlock !== "all") {
        if (selectedBlock === "MAM_NON" && c.grade !== null && c.grade > 0) return false;
        if (selectedBlock === "TIEU_HOC" && (c.grade === null || c.grade < 1 || c.grade > 5)) return false;
        if (selectedBlock === "THCS" && (c.grade === null || c.grade < 6 || c.grade > 9)) return false;
        if (selectedBlock === "THPT" && (c.grade === null || c.grade < 10 || c.grade > 12)) return false;
      }
      return true;
    });
  }, [classes, selectedCampus, selectedGrade, selectedBlock]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCampus !== "all") params.append("campusId", selectedCampus);
      if (selectedBlock !== "all") params.append("schoolBlock", selectedBlock);
      if (selectedGrade !== "all") params.append("grade", selectedGrade);
      if (selectedClass !== "all") params.append("classId", selectedClass);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const res = await fetch(`/api/admin/tra-cuu-hoc-sinh/profiles?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setTotalPages(data.totalPages || 1);
        setTotalStudents(data.total || 0);
      }
    } catch (err) {
      console.error("Loi tai ho so:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedCampus, selectedBlock, selectedGrade, selectedClass, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleExportExcel = () => {
    if (students.length === 0) {
      alert("KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ xuáº¥t Excel");
      return;
    }
    const dataToExport = students.map((s, idx) => ({
      "STT": idx + 1,
      "MÃ£ há»c sinh": s.studentId,
      "MÃ£ VnEdu (phá»¥)": s.vneduCode || "",
      "Há» vÃ  tÃªn": s.fullName,
      "NgÃ y sinh": s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "",
      "Giá»›i tÃ­nh": s.gender || "",
      "Lá»›p": s.className,
      "Khá»‘i": s.grade ? `Khá»‘i ${s.grade}` : "Máº§m non",
      "CÆ¡ sá»Ÿ": s.campusName,
      "Phá»¥ huynh": s.parentName || "",
      "Sá»‘ Ä‘iá»‡n thoáº¡i": s.parentPhone || "",
      "Email": s.parentEmail || "",
      "Äá»‹a chá»‰": s.address || "",
      "Tráº¡ng thÃ¡i": s.status === "ACTIVE" ? "Äang há»c" : "KhÃ¡c",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sÃ¡ch há»c sinh");
    XLSX.writeFile(wb, `Ho_So_Hoc_Sinh_SkyLine_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const maleCount = useMemo(() => students.filter((s) => s.gender === "Nam" || s.gender === "MALE").length, [students]);
  const femaleCount = useMemo(() => students.filter((s) => s.gender === "Ná»¯" || s.gender === "FEMALE").length, [students]);
  return (
    <div className="space-y-6">
      {/* BANNER MỞ / KHÓA HỒ SƠ HỌC SINH ĐỐI VỚI PHỤ HUYNH */}
      <div
        className={`rounded-2xl p-4 border-2 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          parentPortalUnlocked
            ? "bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border-emerald-300"
            : "bg-gradient-to-r from-amber-50/90 via-white to-orange-50/60 border-amber-300"
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              parentPortalUnlocked ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
            }`}
          >
            {parentPortalUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                QUYỀN TRUY CẬP HỒ SƠ HỌC SINH CỦA PHỤ HUYNH
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                  parentPortalUnlocked
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                {parentPortalUnlocked ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    <span>ĐANG MỞ KHÓA CHO PHỤ HUYNH</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3 h-3 text-amber-700" />
                    <span>ĐANG KHÓA ĐỐI VỚI PHỤ HUYNH</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              {parentPortalUnlocked
                ? "Phụ huynh hiện có thể xem đầy đủ Hồ sơ Năng lực Học sinh 360° (A4) trên cổng Phụ huynh."
                : 'Khi khóa, giao diện Phụ huynh hiển thị: "Hồ sơ đang cập nhật, Hệ thống sẽ mở định kỳ giữa Kỳ 1, Cuối Kỳ 1, Giữa kỳ 2, Cuối kỳ 2 để phụ huynh truy cập".'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleParentPortal}
          disabled={savingPortalLock}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-60 shrink-0 self-end md:self-center ${
            parentPortalUnlocked
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-110 text-white"
          }`}
        >
          {savingPortalLock ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : parentPortalUnlocked ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
          <span>
            {parentPortalUnlocked
              ? "Khóa Hồ sơ HS (Đóng cổng Phụ huynh)"
              : "Mở Khóa Hồ sơ HS (Cho Phụ huynh xem)"}
          </span>
        </button>
      </div>

      {/* FILTER BAR CARD */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="TÃ¬m theo MÃ£ há»c sinh, Há» tÃªn, SÄT phá»¥ huynh..."
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
              <span>TÃ¬m kiáº¿m</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Xuáº¥t Excel</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                CÆ¡ sá»Ÿ
              </label>
              <select
                value={selectedCampus}
                onChange={(e) => { setSelectedCampus(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Táº¥t cáº£ cÆ¡ sá»Ÿ</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Cáº¥p há»c
              </label>
              <select
                value={selectedBlock}
                onChange={(e) => { setSelectedBlock(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Táº¥t cáº£ cáº¥p há»c</option>
                <option value="MAM_NON">Máº§m non (Preschool)</option>
                <option value="TIEU_HOC">Tiá»ƒu há»c (Lá»›p 1-5)</option>
                <option value="THCS">THCS (Lá»›p 6-9)</option>
                <option value="THPT">THPT (Lá»›p 10-12)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Khá»‘i lá»›p
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Táº¥t cáº£ cÃ¡c khá»‘i</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g.toString()}>Khá»‘i {g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Lá»›p há»c
              </label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Táº¥t cáº£ cÃ¡c lá»›p</option>
                {classesToShow.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className} ({cls.grade ? `K${cls.grade}` : "Máº§m non"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tráº¡ng thÃ¡i
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
                <option value="ACTIVE">Äang há»c</option>
                <option value="INACTIVE">Táº¡m nghá»‰ / Báº£o lÆ°u</option>
                <option value="TRANSFERRED">Chuyá»ƒn trÆ°á»ng</option>
                <option value="GRADUATED">ÄÃ£ tá»‘t nghiá»‡p</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-[#00A19A]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{totalStudents}</div>
            <div className="text-xs text-slate-500 font-medium">Há»c sinh trong bá»™ lá»c</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{maleCount}</div>
            <div className="text-xs text-slate-500 font-medium">Nam (trÃªn trang)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{femaleCount}</div>
            <div className="text-xs text-slate-500 font-medium">Ná»¯ (trÃªn trang)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <BadgeCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">
              {students.filter((s) => s.status === "ACTIVE").length}
            </div>
            <div className="text-xs text-slate-500 font-medium">Äang theo há»c</div>
          </div>
        </div>
      </div>
      {/* STUDENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#00A19A]" />
            Danh sÃ¡ch há»“ sÆ¡ há»c sinh ({totalStudents})
          </h2>
          <div className="text-xs text-slate-500">
            Trang {page} / {totalPages || 1}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">STT</th>
                <th className="py-3.5 px-4">MÃ£ HS</th>
                <th className="py-3.5 px-4">Há» vÃ  tÃªn</th>
                <th className="py-3.5 px-4">NgÃ y sinh & Giá»›i tÃ­nh</th>
                <th className="py-3.5 px-4">Lá»›p & CÆ¡ sá»Ÿ</th>
                <th className="py-3.5 px-4">Phá»¥ huynh & LiÃªn há»‡</th>
                <th className="py-3.5 px-4 text-center">Tráº¡ng thÃ¡i</th>
                <th className="py-3.5 px-4 text-center">Thao tÃ¡c</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                    Äang táº£i dá»¯ liá»‡u há»“ sÆ¡ há»c sinh...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    KhÃ´ng tÃ¬m tháº¥y há»c sinh nÃ o phÃ¹ há»£p vá»›i bá»™ lá»c.
                  </td>
                </tr>
              ) : (
                students.map((stu, index) => {
                  const isMale = stu.gender === "Nam" || stu.gender === "MALE";
                  return (
                    <tr key={stu.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-xs text-[#003B3A]">
                          {stu.studentId}
                        </div>
                        {stu.vneduCode && (
                          <div className="text-[11px] font-mono text-slate-500 font-medium mt-1 flex items-center gap-1">
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-semibold tracking-wider">
                              VnEdu
                            </span>
                            <span className="text-slate-600">{stu.vneduCode}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMale ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                            {stu.fullName.split(" ").slice(-1)[0]?.charAt(0) || "S"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 hover:text-[#00A19A] transition cursor-pointer" onClick={() => { setSelectedStudent(stu); setIsModalOpen(true); }}>
                              {stu.fullName}
                            </span>
                            <div className="text-[11px] text-slate-400">
                              {stu.schoolBlock === "MAM_NON" ? "Máº§m non" : stu.grade ? `Khá»‘i ${stu.grade}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{stu.dateOfBirth ? new Date(stu.dateOfBirth).toLocaleDateString("vi-VN") : "---"}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {stu.gender || "---"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#00A19A] border border-teal-200">
                          {stu.className}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[130px]" title={stu.campusName}>
                            {stu.campusName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-slate-700">{stu.parentName || "---"}</div>
                        {stu.parentPhone ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{stu.parentPhone}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            stu.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : stu.status === "GRADUATED"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {stu.status === "ACTIVE" ? "Äang há»c" : stu.status === "GRADUATED" ? "Tá»‘t nghiá»‡p" : "KhÃ¡c"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudent(stu);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-teal-50 text-[#00A19A] hover:bg-[#00A19A] hover:text-white transition"
                            title="Xem há»“ sÆ¡ chi tiáº¿t 360Â°"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`/teacher/ho-so-hoc-sinh/print?type=student&studentId=${stu.id}&mode=cover&autoprint=1`, "_blank");
                            }}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition cursor-pointer"
                            title="In riÃªng BÃ¬a Há»“ sÆ¡ A4 (tá»± Ä‘á»™ng gÃ¡n MÃ£ HS & MÃ£ QR)"
                          >
                            <BookMarked className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`/teacher/ho-so-hoc-sinh/print?type=student&studentId=${stu.id}&mode=all&autoprint=1`, "_blank");
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                            title="In trá»n bá»™ Há»“ sÆ¡ kÃ¨m BÃ¬a A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
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
            Hiá»ƒn thá»‹ {students.length > 0 ? (page - 1) * pageSize + 1 : 0} Ä‘áº¿n{" "}
            {Math.min(page * pageSize, totalStudents)} trong tá»•ng sá»‘ {totalStudents} há»c sinh
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
              Trang {page} / {totalPages || 1}
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
      {/* MODAL 360 PROFILE & PRINT PORTFOLIO */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            <div className="bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-lg font-bold">
                  {selectedStudent.fullName.split(" ").slice(-1)[0]?.charAt(0) || "S"}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedStudent.fullName}</h3>
                  <p className="text-xs text-teal-100 flex flex-wrap items-center gap-2">
                    <span>MÃ£ HS: <strong className="font-mono text-white">{selectedStudent.studentId}</strong></span>
                    {selectedStudent.vneduCode && (
                      <>
                        <span>â€¢</span>
                        <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 px-1.5 py-0.5 rounded text-[11px] font-mono">
                          MÃ£ VnEdu: {selectedStudent.vneduCode}
                        </span>
                      </>
                    )}
                    <span>â€¢</span>
                    <span>Lá»›p: {selectedStudent.className}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedStudent) {
                      window.open(`/teacher/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudent.id}&mode=cover&autoprint=1`, "_blank");
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="In riÃªng BÃ¬a Há»“ sÆ¡ A4 (tá»± Ä‘á»™ng gÃ¡n MÃ£ HS & MÃ£ QR)"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>In BÃ¬a A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedStudent) {
                      window.open(`/teacher/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudent.id}&mode=all&autoprint=1`, "_blank");
                    }
                  }}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="In trá»n bá»™ BÃ¬a vÃ  Há»“ sÆ¡ A4"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Trá»n Bá»™ A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref={printRef} className="p-6 space-y-6 text-slate-700 text-sm">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#00A19A]" />
                  ThÃ´ng tin cÃ¡ nhÃ¢n há»c sinh
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Há» vÃ  tÃªn</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.fullName}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">MÃ£ há»c sinh (MÃ£ chÃ­nh)</span>
                    <span className="font-mono font-bold text-[#003B3A]">{selectedStudent.studentId}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">MÃ£ VnEdu (MÃ£ phá»¥)</span>
                    <span className="font-mono font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                      {selectedStudent.vneduCode || "ChÆ°a cÃ³"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">NgÃ y sinh</span>
                    <span className="font-medium text-slate-700">
                      {selectedStudent.dateOfBirth
                        ? new Date(selectedStudent.dateOfBirth).toLocaleDateString("vi-VN")
                        : "ChÆ°a cáº­p nháº­t"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Giá»›i tÃ­nh</span>
                    <span className="font-medium text-slate-700">{selectedStudent.gender || "ChÆ°a cáº­p nháº­t"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Lá»›p há»c hiá»‡n táº¡i</span>
                    <span className="font-bold text-[#00A19A]">{selectedStudent.className}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">CÆ¡ sá»Ÿ Sky-Line</span>
                    <span className="font-medium text-slate-700">{selectedStudent.campusName}</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="block text-[11px] text-slate-400 font-medium">Äá»‹a chá»‰ thÆ°á»ng trÃº</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {selectedStudent.address || "ChÆ°a cáº­p nháº­t"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#00A19A]" />
                  ThÃ´ng tin phá»¥ huynh & LiÃªn há»‡ kháº©n cáº¥p
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Phá»¥ huynh / NgÆ°á»i giÃ¡m há»™</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.parentName || "ChÆ°a cáº­p nháº­t"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Sá»‘ Ä‘iá»‡n thoáº¡i liÃªn láº¡c</span>
                    <span className="font-mono font-semibold text-[#003B3A]">
                      {selectedStudent.parentPhone || "ChÆ°a cáº­p nháº­t"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Email phá»¥ huynh</span>
                    <span className="text-slate-700">{selectedStudent.parentEmail || "ChÆ°a cáº­p nháº­t"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">LiÃªn há»‡ kháº©n cáº¥p</span>
                    <span className="text-slate-700">{selectedStudent.emergencyContact || "Theo sá»‘ Ä‘iá»‡n thoáº¡i phá»¥ huynh"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#00A19A]" />
                  TÃ¬nh tráº¡ng há»c táº­p & Y táº¿
                </h4>
                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Tráº¡ng thÃ¡i há»“ sÆ¡</span>
                    <span className="font-bold text-emerald-700">
                      {selectedStudent.status === "ACTIVE" ? "Äang theo há»c" : selectedStudent.status}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">NgÃ y nháº­p há»c</span>
                    <span className="font-medium text-slate-700">
                      {selectedStudent.enrollmentDate
                        ? new Date(selectedStudent.enrollmentDate).toLocaleDateString("vi-VN")
                        : "---"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Dá»‹ á»©ng / LÆ°u Ã½ y táº¿</span>
                    <span className="font-medium text-amber-700">
                      {selectedStudent.allergies || "KhÃ´ng cÃ³"}
                    </span>
                  </div>
                </div>
              </div>

              {/* MÃ”N Há»ŒC Äáº¶C THÃ™ SKY-LINE */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-teal-800">
                    <Sparkles className="w-4 h-4 text-[#00A19A]" />
                    MÃ´n há»c Ä‘áº·c thÃ¹ Sky-Line
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    {selectedStudent.specialGradeEntries?.length || 0} bÃ i Ä‘Ã£ Ä‘Ã¡nh giÃ¡
                  </span>
                </h4>
                {selectedStudent.specialGradeEntries && selectedStudent.specialGradeEntries.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedStudent.specialGradeEntries.map((ge: any) => (
                      <div key={ge.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">
                            Tiáº¿t {ge.lesson?.periodIndex || 1}: {ge.lesson?.lessonName || "BÃ i há»c"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {ge.assignment?.subject?.name} â€¢ GV: {ge.assignment?.teacher?.teacherName}
                          </div>
                          {ge.teacherFeedback && (
                            <div className="text-[11px] text-slate-600 mt-1 italic">
                              "{ge.teacherFeedback}"
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ge.evalResult === "TOT"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : ge.evalResult === "HOAN_THANH" || ge.evalResult === "PASS" || ge.evalResult === "DAT"
                              ? "bg-teal-100 text-teal-800 border border-teal-300"
                              : ge.evalResult === "VANG"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}>
                            {ge.evalResult === "TOT" 
                              ? "Tá»‘t" 
                              : ge.evalResult === "HOAN_THANH" 
                              ? "HoÃ n thÃ nh"
                              : ge.evalResult === "PASS" || ge.evalResult === "DAT"
                              ? "Äáº¡t"
                              : ge.evalResult === "VANG"
                              ? "Váº¯ng"
                              : "Cáº§n cá»‘ gáº¯ng"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    ChÆ°a cÃ³ dá»¯ liá»‡u Ä‘Ã¡nh giÃ¡ mÃ´n há»c Ä‘áº·c thÃ¹ cho há»c sinh nÃ y
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                ÄÃ³ng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>In phiáº¿u há»“ sÆ¡ A4</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
