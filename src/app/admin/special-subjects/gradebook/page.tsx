"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  ClipboardList, 
  Search, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Download, 
  Users, 
  RefreshCcw,
  Sparkles,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

function SpecialAdminGradebookContent() {
  const searchParams = useSearchParams();
  const initialAssignmentId = searchParams?.get("assignmentId") || "";

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(initialAssignmentId);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  
  const [gradebookData, setGradebookData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch available assignments list
  useEffect(() => {
    async function loadAssignments() {
      try {
        const res = await fetch("/api/special-subjects/assignments");
        const json = await res.json();
        if (res.ok) {
          const list = json.assignments || [];
          setAssignments(list);
          if (list.length > 0 && !selectedAssignmentId) {
            setSelectedAssignmentId(list[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadAssignments();
  }, []);

  // 2. Fetch gradebook data when assignment or lesson changes
  const fetchGradebook = async () => {
    if (!selectedAssignmentId) return;
    try {
      setLoading(true);
      const url = `/api/special-subjects/gradebook?assignmentId=${selectedAssignmentId}${selectedLessonId ? `&lessonId=${selectedLessonId}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setGradebookData(json);
        if (!selectedLessonId && json.selectedLessonId) {
          setSelectedLessonId(json.selectedLessonId);
        }
      } else {
        toast.error(json.error || "Không thể tải sổ đánh giá");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssignmentId) {
      fetchGradebook();
    }
  }, [selectedAssignmentId, selectedLessonId]);

  const students = gradebookData?.students || [];
  const lessons = gradebookData?.lessons || [];
  const entriesMap = new Map((gradebookData?.gradeEntries || []).map((ge: any) => [ge.studentId, ge]));

  const filteredStudents = students.filter((s: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return s.studentName.toLowerCase().includes(term) || s.studentCode.toLowerCase().includes(term);
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <SpecialSubjectNav 
        title="Sổ Đánh giá Môn đặc thù (Ban Giám Hiệu & Quản trị)"
        subtitle="Giám sát kết quả đánh giá năng lực, nhận xét quá trình và sản phẩm học sinh toàn hệ thống"
      />

      {/* Control bar: Selector for Class and Lesson */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Lớp học & Giáo viên
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => {
                setSelectedAssignmentId(e.target.value);
                setSelectedLessonId("");
              }}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.class?.className} ({a.class?.campus?.campusCode}) — GV: {a.teacher?.teacherName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tiết học / Bài dạy
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-xs truncate"
            >
              {lessons.map((l: any) => (
                <option key={l.id} value={l.id}>
                  Tiết {l.periodIndex}: {l.lessonName}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-5">
            <button
              onClick={fetchGradebook}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
              title="Làm mới"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => toast.success("Đang kết xuất danh sách sang Excel...")}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-2 transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-teal-600" />
              <span>
                Sổ kết quả: {gradebookData?.assignment?.class?.className} • Tiết {lessons.find((l: any) => l.id === selectedLessonId)?.periodIndex || 1}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Môn: {gradebookData?.assignment?.subject?.name} • GV: {gradebookData?.assignment?.teacher?.teacherName}
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm học sinh theo tên/mã..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 w-32">Mã học sinh</th>
                <th className="py-3 px-4 w-48">Họ và tên</th>
                <th className="py-3 px-4 w-36 text-center">Kết quả đánh giá</th>
                <th className="py-3 px-4">Nhận xét của Giáo viên</th>
                <th className="py-3 px-4 w-36">Sản phẩm học sinh</th>
                <th className="py-3 px-4 text-center w-28">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st: any, idx: number) => {
                  const entry = entriesMap.get(st.id) as any;
                  const res = entry?.evalResult;
                  const isCompleted = entry?.status === "COMPLETED";

                  return (
                    <tr key={st.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {st.studentCode}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {st.studentName}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {res === "TOT" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ★ Tốt (Hoàn thành tốt)
                          </span>
                        ) : res === "DAT" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                            ✓ Đạt (Hoàn thành)
                          </span>
                        ) : res === "CAN_CO_GANG" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            ! Cần cố gắng
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Chưa đánh giá</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {entry?.teacherFeedback || <span className="text-slate-400 italic">Chưa có nhận xét</span>}
                      </td>

                      <td className="py-3 px-4">
                        {entry?.studentProductUrl ? (
                          <a
                            href={entry.studentProductUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-teal-700 hover:text-teal-900 font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Xem sản phẩm</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Không đính kèm</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : entry?.status === "DRAFT"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-400"
                        }`}>
                          {isCompleted ? "Đã duyệt" : entry?.status === "DRAFT" ? "Lưu nháp" : "Chưa nhập"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>Không có học sinh nào</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SpecialAdminGradebookPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải sổ đánh giá...</div>}>
      <SpecialAdminGradebookContent />
    </Suspense>
  );
}
