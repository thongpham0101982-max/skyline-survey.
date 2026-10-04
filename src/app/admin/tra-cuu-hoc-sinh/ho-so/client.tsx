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
  const printRef = useRef<HTMLDivElement>(null);

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
      alert("Không có dữ liệu để xuất Excel");
      return;
    }
    const dataToExport = students.map((s, idx) => ({
      "STT": idx + 1,
      "Mã học sinh": s.studentId,
      "Họ và tên": s.fullName,
      "Ngày sinh": s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "",
      "Giới tính": s.gender || "",
      "Lớp": s.className,
      "Khối": s.grade ? `Khối ${s.grade}` : "Mầm non",
      "Cơ sở": s.campusName,
      "Phụ huynh": s.parentName || "",
      "Số điện thoại": s.parentPhone || "",
      "Email": s.parentEmail || "",
      "Địa chỉ": s.address || "",
      "Trạng thái": s.status === "ACTIVE" ? "Đang học" : "Khác",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách học sinh");
    XLSX.writeFile(wb, `Ho_So_Hoc_Sinh_SkyLine_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const maleCount = useMemo(() => students.filter((s) => s.gender === "Nam" || s.gender === "MALE").length, [students]);
  const femaleCount = useMemo(() => students.filter((s) => s.gender === "Nữ" || s.gender === "FEMALE").length, [students]);
  return (
    <div className="space-y-6">
      {/* FILTER BAR CARD */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo Mã học sinh, Họ tên, SĐT phụ huynh..."
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
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
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
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Cấp học
              </label>
              <select
                value={selectedBlock}
                onChange={(e) => { setSelectedBlock(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Tất cả cấp học</option>
                <option value="MAM_NON">Mầm non (Preschool)</option>
                <option value="TIEU_HOC">Tiểu học (Lớp 1-5)</option>
                <option value="THCS">THCS (Lớp 6-9)</option>
                <option value="THPT">THPT (Lớp 10-12)</option>
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
                {classesToShow.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className} ({cls.grade ? `K${cls.grade}` : "Mầm non"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang học</option>
                <option value="INACTIVE">Tạm nghỉ / Bảo lưu</option>
                <option value="TRANSFERRED">Chuyển trường</option>
                <option value="GRADUATED">Đã tốt nghiệp</option>
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
            <div className="text-xs text-slate-500 font-medium">Học sinh trong bộ lọc</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{maleCount}</div>
            <div className="text-xs text-slate-500 font-medium">Nam (trên trang)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{femaleCount}</div>
            <div className="text-xs text-slate-500 font-medium">Nữ (trên trang)</div>
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
            <div className="text-xs text-slate-500 font-medium">Đang theo học</div>
          </div>
        </div>
      </div>
      {/* STUDENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#00A19A]" />
            Danh sách hồ sơ học sinh ({totalStudents})
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
                <th className="py-3.5 px-4">Mã HS</th>
                <th className="py-3.5 px-4">Họ và tên</th>
                <th className="py-3.5 px-4">Ngày sinh & Giới tính</th>
                <th className="py-3.5 px-4">Lớp & Cơ sở</th>
                <th className="py-3.5 px-4">Phụ huynh & Liên hệ</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                    Đang tải dữ liệu hồ sơ học sinh...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy học sinh nào phù hợp với bộ lọc.
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
                      <td className="py-3 px-4 font-mono font-bold text-xs text-[#003B3A]">
                        {stu.studentId}
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
                              {stu.schoolBlock === "MAM_NON" ? "Mầm non" : stu.grade ? `Khối ${stu.grade}` : ""}
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
                          {stu.status === "ACTIVE" ? "Đang học" : stu.status === "GRADUATED" ? "Tốt nghiệp" : "Khác"}
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
                            title="Xem hồ sơ chi tiết 360°"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudent(stu);
                              setIsModalOpen(true);
                              setTimeout(() => window.print(), 300);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                            title="In phiếu hồ sơ A4"
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
            Hiển thị {students.length > 0 ? (page - 1) * pageSize + 1 : 0} đến{" "}
            {Math.min(page * pageSize, totalStudents)} trong tổng số {totalStudents} học sinh
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
                  <p className="text-xs text-teal-100 flex items-center gap-2">
                    <span>Mã HS: {selectedStudent.studentId}</span>
                    <span>•</span>
                    <span>Lớp: {selectedStudent.className}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In A4</span>
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
                  Thông tin cá nhân học sinh
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Họ và tên</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.fullName}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Mã học sinh</span>
                    <span className="font-mono font-bold text-[#003B3A]">{selectedStudent.studentId}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Ngày sinh</span>
                    <span className="font-medium text-slate-700">
                      {selectedStudent.dateOfBirth
                        ? new Date(selectedStudent.dateOfBirth).toLocaleDateString("vi-VN")
                        : "Chưa cập nhật"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Giới tính</span>
                    <span className="font-medium text-slate-700">{selectedStudent.gender || "Chưa cập nhật"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Lớp học hiện tại</span>
                    <span className="font-bold text-[#00A19A]">{selectedStudent.className}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Cơ sở Sky-Line</span>
                    <span className="font-medium text-slate-700">{selectedStudent.campusName}</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="block text-[11px] text-slate-400 font-medium">Địa chỉ thường trú</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {selectedStudent.address || "Chưa cập nhật"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#00A19A]" />
                  Thông tin phụ huynh & Liên hệ khẩn cấp
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Phụ huynh / Người giám hộ</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.parentName || "Chưa cập nhật"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Số điện thoại liên lạc</span>
                    <span className="font-mono font-semibold text-[#003B3A]">
                      {selectedStudent.parentPhone || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Email phụ huynh</span>
                    <span className="text-slate-700">{selectedStudent.parentEmail || "Chưa cập nhật"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Liên hệ khẩn cấp</span>
                    <span className="text-slate-700">{selectedStudent.emergencyContact || "Theo số điện thoại phụ huynh"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#00A19A]" />
                  Tình trạng học tập & Y tế
                </h4>
                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Trạng thái hồ sơ</span>
                    <span className="font-bold text-emerald-700">
                      {selectedStudent.status === "ACTIVE" ? "Đang theo học" : selectedStudent.status}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Ngày nhập học</span>
                    <span className="font-medium text-slate-700">
                      {selectedStudent.enrollmentDate
                        ? new Date(selectedStudent.enrollmentDate).toLocaleDateString("vi-VN")
                        : "---"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-medium">Dị ứng / Lưu ý y tế</span>
                    <span className="font-medium text-amber-700">
                      {selectedStudent.allergies || "Không có"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>In phiếu hồ sơ A4</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
