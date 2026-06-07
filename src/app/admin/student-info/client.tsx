"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Users2, 
  Baby, 
  GraduationCap, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  BookOpen, 
  FileText 
} from "lucide-react";

interface StudentInfoClientProps {
  initialGeneralStudents: any[];
  initialPreschoolStudents: any[];
}

export function StudentInfoClient({ 
  initialGeneralStudents = [], 
  initialPreschoolStudents = [] 
}: StudentInfoClientProps) {
  const [activeTab, setActiveTab] = useState<"general" | "preschool">("general");
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedResult, setSelectedResult] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected student for details modal
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reset filters when changing tab
  const handleTabChange = (tab: "general" | "preschool") => {
    setActiveTab(tab);
    setSearchQuery("");
    setSelectedPeriod("");
    setSelectedBatch("");
    setSelectedResult("");
    setSelectedGrade("");
    setCurrentPage(1);
  };

  // Get active dataset
  const currentDataset = useMemo(() => {
    return activeTab === "general" ? initialGeneralStudents : initialPreschoolStudents;
  }, [activeTab, initialGeneralStudents, initialPreschoolStudents]);

  // Extract unique periods, batches, grades for filter options
  const filterOptions = useMemo(() => {
    const periods = new Set<string>();
    const batches = new Set<string>();
    const grades = new Set<string>();
    const results = new Set<string>();

    currentDataset.forEach((student) => {
      if (student.period?.name) periods.add(student.period.name);
      if (student.batch?.name) batches.add(student.batch.name);
      if (student.grade) grades.add(student.grade);
      if (student.admissionResult) results.add(student.admissionResult);
    });

    return {
      periods: Array.from(periods).sort(),
      batches: Array.from(batches).sort(),
      grades: Array.from(grades).sort((a, b) => {
        const na = parseInt(a);
        const nb = parseInt(b);
        if (isNaN(na) || isNaN(nb)) return a.localeCompare(b);
        return na - nb;
      }),
      results: Array.from(results).sort()
    };
  }, [currentDataset]);

  // Filtered dataset
  const filteredStudents = useMemo(() => {
    return currentDataset.filter((student) => {
      // Search text
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = student.fullName?.toLowerCase().includes(query);
        const matchesCode = student.studentCode?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      // Period filter
      if (selectedPeriod && student.period?.name !== selectedPeriod) {
        return false;
      }

      // Batch filter
      if (selectedBatch && student.batch?.name !== selectedBatch) {
        return false;
      }

      // Result filter
      if (selectedResult && student.admissionResult !== selectedResult) {
        return false;
      }

      // Grade filter
      if (selectedGrade && student.grade !== selectedGrade) {
        return false;
      }

      return true;
    });
  }, [currentDataset, searchQuery, selectedPeriod, selectedBatch, selectedResult, selectedGrade]);

  // Statistics
  const statistics = useMemo(() => {
    let total = filteredStudents.length;
    let passed = 0;
    let failed = 0;
    let pending = 0;

    filteredStudents.forEach((s) => {
      const res = s.admissionResult || "";
      if (res === "Đạt" || res === "Đạt cam kết" || res === "Học thử") {
        passed++;
      } else if (res.includes("Không đạt")) {
        failed++;
      } else {
        pending++;
      }
    });

    return { total, passed, failed, pending };
  }, [filteredStudents]);

  // Paginated dataset
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "-";
    try {
      return new Date(dateVal).toLocaleDateString("vi-VN");
    } catch {
      return String(dateVal);
    }
  };

  const getResultBadgeClass = (result: string) => {
    if (!result) return "bg-slate-50 text-slate-500 border border-slate-100";
    if (result === "Đạt") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    if (result === "Đạt cam kết") return "bg-amber-50 text-amber-600 border border-amber-100";
    if (result === "Học thử") return "bg-indigo-50 text-indigo-600 border border-indigo-100";
    if (result.includes("Không đạt")) return "bg-rose-50 text-rose-600 border border-rose-100";
    return "bg-blue-50 text-blue-600 border border-blue-100";
  };

  const handleOpenDetails = (student: any) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => handleTabChange("general")}
          className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
            activeTab === "general"
              ? "border-[#00A6A9] text-[#00A6A9] bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          Phổ thông K-12 (${initialGeneralStudents.length})
        </button>
        <button
          onClick={() => handleTabChange("preschool")}
          className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
            activeTab === "preschool"
              ? "border-[#00A6A9] text-[#00A6A9] bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
          }`}
        >
          <Baby className="w-5 h-5" />
          Mầm non (${initialPreschoolStudents.length})
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tổng số trong bộ lọc</p>
            <p className="text-2xl font-extrabold text-slate-800">{statistics.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-medium">Đạt / Đạt cam kết / Học thử</p>
            <p className="text-2xl font-extrabold text-emerald-600">{statistics.passed}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Không đạt</p>
            <p className="text-2xl font-extrabold text-rose-600">{statistics.failed}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chưa duyệt / Khác</p>
            <p className="text-2xl font-extrabold text-amber-600">{statistics.pending}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Control Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#1E1B4B] font-bold text-sm">
          <Filter className="w-4 h-4 text-[#00A6A9]" />
          Bộ lọc & Tìm kiếm nhanh
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tên hoặc mã HS..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer text-slate-700 font-medium"
          >
            <option value="">Tất cả Kỳ khảo sát</option>
            {filterOptions.periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer text-slate-700 font-medium"
          >
            <option value="">Tất cả Đợt</option>
            {filterOptions.batches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer text-slate-700 font-medium"
          >
            <option value="">Tất cả Khối</option>
            {filterOptions.grades.map((g) => (
              <option key={g} value={g}>Khối {g}</option>
            ))}
          </select>

          {/* Result Filter */}
          <select
            value={selectedResult}
            onChange={(e) => {
              setSelectedResult(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer text-slate-700 font-medium"
          >
            <option value="">Tất cả Kết quả</option>
            {filterOptions.results.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-28">Mã học sinh</th>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4 w-24">Ngày sinh</th>
                <th className="px-6 py-4 w-20">Giới tính</th>
                <th className="px-6 py-4 w-24">{activeTab === "general" ? "Khối/Lớp dự tuyển" : "Khối dự tuyển"}</th>
                <th className="px-6 py-4">Kỳ & Đợt khảo sát</th>
                <th className="px-6 py-4 w-36">Kết quả duyệt</th>
                <th className="px-6 py-4 text-center w-24">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy dữ liệu học sinh phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleOpenDetails(student)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-[#00A6A9]">
                      {student.studentCode}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {student.fullName}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatDate(student.dateOfBirth)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {student.gender === "MALE" || student.gender === "Nam" ? "Nam" : "Nữ"}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {activeTab === "general" ? (
                        student.className ? `${student.className} (Khối ${student.grade || "-"})` : `Khối ${student.grade || "-"}`
                      ) : (
                        `Khối ${student.grade || "-"}`
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-medium text-xs">
                        {student.period?.name || "-"}
                      </div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold mt-0.5">
                        {student.batch?.name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block border ${getResultBadgeClass(student.admissionResult)}`}>
                        {student.admissionResult || "Chưa duyệt"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetails(student)}
                        className="p-1.5 text-slate-400 hover:text-[#00A6A9] hover:bg-slate-100 rounded-lg transition-all"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredStudents.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị {Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)}-
              {Math.min(filteredStudents.length, currentPage * pageSize)} trong tổng số{" "}
              {filteredStudents.length} học sinh
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-2 py-1 text-xs text-slate-400">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-[#00A6A9] text-white border-[#00A6A9]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Dialog Modal */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-full">
                  {activeTab === "general" ? "Học sinh Phổ thông" : "Học sinh Mầm non"}
                </span>
                <h3 className="text-xl font-extrabold text-slate-800 mt-2 flex items-center gap-2">
                  {selectedStudent.fullName}
                  <span className="text-slate-400 font-mono text-sm font-bold">({selectedStudent.studentCode})</span>
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Section: Basic info */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#00A6A9]" />
                  Thông tin hành chính
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{formatDate(selectedStudent.dateOfBirth)}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giới tính</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">
                      {selectedStudent.gender === "MALE" || selectedStudent.gender === "Nam" ? "Nam" : "Nữ"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khối học</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">Khối {selectedStudent.grade || "-"}</span>
                  </div>
                  {activeTab === "general" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp dự tuyển</label>
                      <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{selectedStudent.className || "-"}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kỳ khảo sát</label>
                    <span className="text-sm font-semibold text-[#00A6A9] mt-0.5 block">{selectedStudent.period?.name || "-"}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt khảo sát</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{selectedStudent.batch?.name || "-"}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ đào tạo</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{selectedStudent.surveySystem || "-"}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở dự tuyển</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{selectedStudent.admissionCampus || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Section: Assessment Details */}
              {activeTab === "general" ? (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#00A6A9]" />
                    Kết quả điểm khảo sát năng lực
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm Toán</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.mathScore !== null && selectedStudent.mathScore !== undefined ? selectedStudent.mathScore : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm Ngữ văn</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.literatureScore !== null && selectedStudent.literatureScore !== undefined ? selectedStudent.literatureScore : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiếng Anh viết</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.writtenEnglishScore !== null && selectedStudent.writtenEnglishScore !== undefined ? selectedStudent.writtenEnglishScore : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiếng Anh nói</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.oralEnglishScore !== null && selectedStudent.oralEnglishScore !== undefined ? selectedStudent.oralEnglishScore : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm Tâm lý</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.psychologyScore !== null && selectedStudent.psychologyScore !== undefined ? selectedStudent.psychologyScore : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xếp loại học lực</label>
                      <span className="text-sm font-semibold text-slate-700 mt-1 block">{selectedStudent.academicRating || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xếp loại hạnh kiểm</label>
                      <span className="text-sm font-semibold text-slate-700 mt-1 block">{selectedStudent.conductRating || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diện tuyển sinh</label>
                      <span className="text-sm font-semibold text-slate-700 mt-1 block">{selectedStudent.admissionCriteria || "-"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học bạ tiểu học / THCS</label>
                      <span className="text-sm text-slate-600 mt-1 block">{selectedStudent.kqgdTieuHoc || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hồ sơ chi tiết quốc tế</label>
                      <span className="text-sm text-slate-600 mt-1 block">{selectedStudent.hoSoCtQuocTe || "-"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#00A6A9]" />
                    Đánh giá phát triển mầm non
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá chuyên môn</label>
                      <p className="text-sm text-slate-700 font-medium mt-1">{selectedStudent.devProfessionalComment || "Chưa có nhận xét chuyên môn."}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá tâm lý</label>
                      <p className="text-sm text-slate-700 font-medium mt-1">{selectedStudent.devPsychologyComment || "Chưa có nhận xét tâm lý."}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ghi chú quan trọng</label>
                    <p className="text-sm text-rose-600 font-semibold mt-1">{selectedStudent.devImportantNote || "-"}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả đánh giá chung</label>
                    <p className="text-sm text-slate-800 font-bold mt-1">{selectedStudent.devAssessmentResult || "-"}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-dashed border-slate-200 pt-4">
                    <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/55">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">Ban Giám Hiệu</span>
                      <div className="mt-2 text-sm font-semibold text-slate-700">Trạng thái: <span className="text-emerald-600 font-bold">{selectedStudent.bghApprovalStatus || "Chưa duyệt"}</span></div>
                      <p className="text-xs text-slate-500 mt-1 italic">Ý kiến: {selectedStudent.bghApprovalComment || "Không có ý kiến."}</p>
                    </div>

                    <div className="bg-teal-50/30 p-4 rounded-2xl border border-teal-100/55">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded">GĐCS</span>
                      <div className="mt-2 text-sm font-semibold text-slate-700">Trạng thái: <span className="text-teal-600 font-bold">{selectedStudent.gdcsApprovalStatus || "Chưa duyệt"}</span></div>
                      <p className="text-xs text-slate-500 mt-1 italic">Ý kiến: {selectedStudent.gdcsApprovalComment || "Không có ý kiến."}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-4">
                    <h5 className="text-[11px] font-black uppercase text-indigo-600 tracking-wider mb-3">Thông tin học thử (nếu có)</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/40">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian học thử</label>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedStudent.probationaryPeriod || "-"}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm học thử</label>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedStudent.probationaryScoreText || "-"}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp học thử</label>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedStudent.probationaryClass || "-"}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên phụ trách</label>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedStudent.probationaryTeacher || "-"}</span>
                      </div>
                    </div>
                    <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/40 mt-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học thử</label>
                      <span className="text-xs font-bold text-indigo-700 mt-0.5 block">{selectedStudent.probationaryResult || "-"}</span>
                      <p className="text-xs text-slate-500 mt-1.5 font-medium">Nhận xét chi tiết: {selectedStudent.probationaryComment || "Chưa có nhận xét."}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Final Approval Result */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#00A6A9]" />
                  Quyết định & Ghi chú của Giám đốc tuyển sinh
                </h4>
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kết quả chung cuộc</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block border mt-1 ${getResultBadgeClass(selectedStudent.admissionResult)}`}>
                        {selectedStudent.admissionResult || "Chưa duyệt kết quả tuyển sinh"}
                      </span>
                    </div>
                    {selectedStudent.signatureName && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Người ký duyệt</span>
                        <span className="text-sm font-bold text-slate-700 block mt-1">{selectedStudent.signatureName}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ý kiến chỉ đạo / Ghi chú của Giám đốc</span>
                    <p className="text-sm font-semibold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 mt-1.5 min-h-[4rem]">
                      {selectedStudent.directorNote || "Chưa có ghi chú chỉ đạo."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Đóng thông tin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
