"use client";
import React, { useState, useEffect } from "react";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  Users, 
  Building2, 
  BookOpen, 
  Plus, 
  Trash2, 
  RefreshCcw, 
  CheckSquare, 
  Square, 
  GraduationCap, 
  Sparkles,
  ClipboardList,
  ShieldCheck,
  UserCheck,
  Zap,
  Info,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SpecialSubjectsAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [unassignedClasses, setUnassignedClasses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"ASSIGNED" | "UNASSIGNED">("ASSIGNED");

  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [academicYearId, setAcademicYearId] = useState("");

  // Modal allocate state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"AUTO_GVCN" | "SPECIFIC_TEACHER">("AUTO_GVCN");
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [allocSubjectId, setAllocSubjectId] = useState("");
  const [allocTeacherId, setAllocTeacherId] = useState("");
  const [allocCampusId, setAllocCampusId] = useState("ALL");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const campuses = [
    { code: "ALL", name: "Tất cả cơ sở" },
    { code: "cmnofie5n0000uhvs2ifqj6pr", name: "CS1 - Riverside" },
    { code: "cmnofie7a0001uhvsl131y7yv", name: "CS2 - Central" },
    { code: "cmnofie7v0002uhvscd5jqp58", name: "CS3 - International" },
    { code: "cmnofie8h0003uhvsggzaehkk", name: "CS4 - Hillside" },
    { code: "cmnofie960004uhvsu7ez21gj", name: "CS5 - Beachside" },
  ];

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/special-subjects/assignments?campusId=${selectedCampus}&grade=${selectedGrade}`);
      const json = await res.json();
      if (res.ok) {
        setAssignments(json.assignments || []);
        setUnassignedClasses(json.unassignedClasses || []);
        if (json.academicYearId) setAcademicYearId(json.academicYearId);
      } else {
        toast.error(json.error || "Không thể tải danh sách phân công");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedCampus, selectedGrade]);

  const openAllocateModal = async () => {
    setIsModalOpen(true);
    try {
      setOptionsLoading(true);
      const res = await fetch("/api/special-subjects/assignments/options");
      const json = await res.json();
      if (res.ok) {
        setTeachers(json.teachers || []);
        setClasses(json.classes || []);
        setSubjects(json.subjects || []);
        if (json.subjects?.length > 0) setAllocSubjectId(json.subjects[0].id);
        if (json.teachers?.length > 0) setAllocTeacherId(json.teachers[0].id);
        if (json.activeAcademicYear?.id) setAcademicYearId(json.activeAcademicYear.id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi nạp danh sách giáo viên và lớp");
    } finally {
      setOptionsLoading(false);
    }
  };

  // Quick 1-click Auto Assign all classes in current filter to their GVCN
  const handleAutoAssignGvcn = async (specificClassIds?: string[]) => {
    const campusLabel = campuses.find(c => c.code === selectedCampus)?.name || "tất cả cơ sở";
    const gradeLabel = selectedGrade === "ALL" ? "các khối 1-5" : `Khối ${selectedGrade}`;
    const scopeMsg = specificClassIds 
      ? `${specificClassIds.length} lớp được chọn`
      : `${gradeLabel} thuộc ${campusLabel}`;

    if (!confirm(`Bạn có chắc chắn muốn TỰ ĐỘNG PHÂN CÔNG cho Giáo viên Chủ nhiệm (GVCN) của ${scopeMsg}?`)) {
      return;
    }

    try {
      setAutoAssigning(true);
      const res = await fetch("/api/special-subjects/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "AUTO_GVCN",
          subjectId: allocSubjectId || undefined,
          campusId: selectedCampus,
          grade: selectedGrade,
          classIds: specificClassIds,
          academicYearId: academicYearId || undefined,
          semester: 1
        })
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Đã phân công thành công cho GVCN");
        fetchAssignments();
        if (isModalOpen) setIsModalOpen(false);
      } else {
        toast.error(json.error || "Lỗi tự động phân công GVCN");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleToggleClass = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  const handleSelectAllFiltered = (filtered: any[]) => {
    const ids = filtered.map(c => c.id);
    const allSelected = ids.every(id => selectedClassIds.includes(id));
    if (allSelected) {
      setSelectedClassIds(selectedClassIds.filter(id => !ids.includes(id)));
    } else {
      setSelectedClassIds(Array.from(new Set([...selectedClassIds, ...ids])));
    }
  };

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 lớp học");
      return;
    }

    if (modalMode === "AUTO_GVCN") {
      await handleAutoAssignGvcn(selectedClassIds);
      return;
    }

    if (!allocTeacherId) {
      toast.error("Vui lòng chọn giáo viên phụ trách");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/special-subjects/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: allocSubjectId,
          teacherId: allocTeacherId,
          classIds: selectedClassIds,
          academicYearId: academicYearId || undefined,
          semester: 1
        })
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Phân công thành công");
        setIsModalOpen(false);
        setSelectedClassIds([]);
        fetchAssignments();
      } else {
        toast.error(json.error || "Lỗi lưu phân công");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, className: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy phân công lớp ${className}?`)) return;

    try {
      const res = await fetch(`/api/special-subjects/assignments?id=${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Đã hủy phân công");
        fetchAssignments();
      } else {
        toast.error(json.error || "Lỗi khi hủy phân công");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    }
  };

  const modalFilteredClasses = classes.filter(c => {
    if (allocCampusId !== "ALL" && c.campusId !== allocCampusId) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <SpecialSubjectNav 
        title="Phân công Giảng dạy Môn đặc thù"
        subtitle="Quản lý giáo viên phụ trách môn đặc thù theo cơ sở, khối và lớp học"
      />

      {/* Specialty Notice Banner */}
      <div className="bg-gradient-to-r from-[#003B3A]/90 to-[#00524E] text-white rounded-2xl p-4 md:p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md shrink-0">
            <UserCheck className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded-md border border-teal-300/30">
                Quy định đối tượng phân công
              </span>
            </div>
            <h4 className="text-sm font-bold mt-1 text-white">
              Đối tượng giảng dạy & đánh giá là Giáo viên Chủ nhiệm (GVCN) lớp
            </h4>
            <p className="text-xs text-teal-100/90 mt-0.5 max-w-2xl">
              Theo khung chương trình môn Giáo dục tài chính cá nhân cấp Tiểu học, GVCN của từng lớp trực tiếp phụ trách giảng dạy 15 tiết/năm và thực hiện đánh giá học sinh trong lớp mình chủ nhiệm.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleAutoAssignGvcn()}
            disabled={autoAssigning || loading}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${autoAssigning ? "animate-spin" : ""}`} />
            <span>{autoAssigning ? "Đang phân công..." : "⚡ Phân công tự động theo GVCN"}</span>
          </button>

          <button
            onClick={openAllocateModal}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center space-x-2 transition-all border border-white/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tùy chỉnh phân công</span>
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cơ sở</label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Tất cả khối</option>
              <option value="1">Khối 1</option>
              <option value="2">Khối 2</option>
              <option value="3">Khối 3</option>
              <option value="4">Khối 4</option>
              <option value="5">Khối 5</option>
            </select>
          </div>

          <div className="pt-5">
            <button
              onClick={fetchAssignments}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
              title="Làm mới"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tab switch between Assigned and Unassigned */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("ASSIGNED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "ASSIGNED"
                ? "bg-white text-teal-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp đã phân công</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "ASSIGNED" ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-600"
            }`}>
              {assignments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("UNASSIGNED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "UNASSIGNED"
                ? "bg-white text-teal-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp chưa phân công</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              unassignedClasses.length > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
            }`}>
              {unassignedClasses.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content: Assigned Classes Table */}
      {activeTab === "ASSIGNED" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Danh sách Lớp đã phân công ({assignments.length})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Học kỳ 1 • Niên khóa 2026-2027
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-32">Cơ sở</th>
                  <th className="py-3 px-4 w-32">Lớp</th>
                  <th className="py-3 px-4">Môn học đặc thù</th>
                  <th className="py-3 px-4">Giáo viên phụ trách</th>
                  <th className="py-3 px-4 text-center w-36">Vai trò</th>
                  <th className="py-3 px-4 text-center w-36">Tiến độ nhập điểm</th>
                  <th className="py-3 px-4 text-center w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.length > 0 ? (
                  assignments.map((item, idx) => {
                    const entryCount = item._count?.gradeEntries || 0;
                    return (
                      <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {item.class?.campus?.campusCode || "CS"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.class?.className}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-teal-900 flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                            <span>{item.subject?.name}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 flex items-center space-x-2">
                            <span>{item.teacher?.teacherName}</span>
                            {item.isGvcn && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                GVCN lớp
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.teacher?.teacherCode} {item.teacher?.email ? `• ${item.teacher.email}` : ""}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {item.isGvcn ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-800">
                              ✓ Đúng GVCN
                            </span>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                                GV bộ môn
                              </span>
                              {item.homeroomTeacher && (
                                <button
                                  onClick={() => handleAutoAssignGvcn([item.classId])}
                                  className="text-[10px] text-teal-700 hover:underline mt-0.5"
                                  title="Gán lại cho GVCN lớp"
                                >
                                  (GVCN: {item.homeroomTeacher.teacherName})
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entryCount > 0 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {entryCount} lượt đánh giá
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Link
                              href={`/admin/special-subjects/gradebook?assignmentId=${item.id}`}
                              className="p-1.5 hover:bg-teal-50 text-teal-700 rounded-lg transition-colors"
                              title="Mở Sổ đánh giá"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(item.id, item.class?.className)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                              title="Hủy phân công"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <div>Chưa có phân công nào phù hợp với bộ lọc</div>
                      {unassignedClasses.length > 0 && (
                        <button
                          onClick={() => handleAutoAssignGvcn()}
                          className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all inline-flex items-center space-x-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>⚡ Nhấn để phân công tự động {unassignedClasses.length} lớp cho GVCN</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Unassigned Classes Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Danh sách Lớp chưa được phân công môn học ({unassignedClasses.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các lớp đã phát hiện Giáo viên Chủ nhiệm (GVCN) sẵn sàng phân công
              </p>
            </div>
            {unassignedClasses.length > 0 && (
              <button
                onClick={() => handleAutoAssignGvcn()}
                disabled={autoAssigning}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <Zap className="w-4 h-4" />
                <span>Gán toàn bộ {unassignedClasses.length} lớp cho GVCN</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-32">Cơ sở</th>
                  <th className="py-3 px-4 w-32">Lớp</th>
                  <th className="py-3 px-4 w-28">Khối</th>
                  <th className="py-3 px-4">Giáo viên Chủ nhiệm (GVCN) của lớp</th>
                  <th className="py-3 px-4 text-center w-40">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unassignedClasses.length > 0 ? (
                  unassignedClasses.map((cls, idx) => {
                    const gvcn = cls.homeroomTeacher;
                    return (
                      <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {cls.campus?.campusCode || "CS"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {cls.className}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          Khối {cls.grade}
                        </td>
                        <td className="py-3 px-4">
                          {gvcn ? (
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-800">{gvcn.teacherName}</span>
                              <span className="text-[11px] text-slate-500">({gvcn.teacherCode})</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                GVCN
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-600 italic">Chưa xác định GVCN</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {gvcn ? (
                            <button
                              onClick={() => handleAutoAssignGvcn([cls.id])}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 transition-colors inline-flex items-center space-x-1"
                            >
                              <Zap className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Gán cho GVCN</span>
                            </button>
                          ) : (
                            <button
                              onClick={openAllocateModal}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold"
                            >
                              Chỉ định GV
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                      <div className="text-slate-700 font-semibold">Tất cả các lớp trong phạm vi đã được phân công!</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <span>Phân công Giảng dạy Môn đặc thù</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {optionsLoading ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                <span>Đang tải danh sách giáo viên và lớp học...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveAllocation} className="space-y-4">
                {/* Method selector */}
                <div className="p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalMode("AUTO_GVCN")}
                    className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      modalMode === "AUTO_GVCN"
                        ? "bg-white text-teal-900 shadow-xs border border-teal-500/20"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gán theo GVCN của lớp (Khuyến nghị)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMode("SPECIFIC_TEACHER")}
                    className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      modalMode === "SPECIFIC_TEACHER"
                        ? "bg-white text-teal-900 shadow-xs border border-teal-500/20"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    <span>Chỉ định một giáo viên cụ thể</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Môn học đặc thù *</label>
                    <select
                      value={allocSubjectId}
                      onChange={(e) => setAllocSubjectId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                      required
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  {modalMode === "SPECIFIC_TEACHER" ? (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Giáo viên phụ trách *</label>
                      <select
                        value={allocTeacherId}
                        onChange={(e) => setAllocTeacherId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500"
                        required
                      >
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.teacherName} ({t.teacherCode}) - {t.campus?.campusCode || "CS"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center space-x-2.5">
                      <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-[11px] text-emerald-900">
                        <span className="font-bold">Tự động gán GVCN:</span> Mỗi lớp được chọn sẽ tự động được phân công cho chính Giáo viên Chủ nhiệm của lớp đó.
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold text-slate-700">
                      Chọn các lớp học ({selectedClassIds.length} lớp đã chọn)
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={allocCampusId}
                        onChange={(e) => setAllocCampusId(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-slate-50"
                      >
                        <option value="ALL">Tất cả cơ sở</option>
                        {campuses.filter(c => c.code !== "ALL").map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSelectAllFiltered(modalFilteredClasses)}
                        className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Chọn tất cả
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {modalFilteredClasses.map((cls) => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      const gvcn = cls.homeroomTeacher;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleToggleClass(cls.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-start space-x-2 cursor-pointer ${
                            isSelected
                              ? "bg-teal-50 border-teal-500 text-teal-900 shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                          )}
                          <div className="overflow-hidden">
                            <div className="font-bold text-[11px] truncate flex items-center space-x-1">
                              <span>{cls.className}</span>
                              <span className="text-[9px] text-slate-400 font-normal">({cls.campus?.campusCode})</span>
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                              GVCN: <span className="font-semibold text-slate-800">{gvcn?.teacherName || "Chưa có"}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || selectedClassIds.length === 0}
                    className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white font-semibold transition-all shadow-md shadow-[#003B3A]/20 cursor-pointer disabled:opacity-50"
                  >
                    {submitting 
                      ? "Đang lưu..." 
                      : modalMode === "AUTO_GVCN"
                        ? `Xác nhận gán cho GVCN (${selectedClassIds.length} lớp)`
                        : `Xác nhận phân công (${selectedClassIds.length} lớp)`
                    }
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
