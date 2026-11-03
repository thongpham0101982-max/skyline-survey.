"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
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
  AlertCircle,
  FileSpreadsheet,
  Check,
  Heart,
  Compass,
  Shield,
  Coins
} from "lucide-react";
import toast from "react-hot-toast";

function SpecialAdminGradebookContent() {
  const searchParams = useSearchParams();
  const initialAssignmentId = searchParams?.get("assignmentId") || "";

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(initialAssignmentId);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  
  const [gradebookData, setGradebookData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch available subjects & assignments list
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [subRes, assignRes] = await Promise.all([
          fetch("/api/special-subjects"),
          fetch("/api/special-subjects/assignments")
        ]);
        const subJson = await subRes.json();
        const assignJson = await assignRes.json();

        if (subJson.subjects) setAvailableSubjects(subJson.subjects);
        if (assignJson.assignments) {
          const list = assignJson.assignments;
          setAssignments(list);
          if (list.length > 0 && !selectedAssignmentId) {
            setSelectedAssignmentId(list[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInitialData();
  }, []);

  // Filter assignments by subject
  const filteredAssignments = useMemo(() => {
    if (selectedSubjectId === "ALL") return assignments;
    return assignments.filter(a => a.subjectId === selectedSubjectId || a.subject?.id === selectedSubjectId);
  }, [assignments, selectedSubjectId]);

  // When selectedSubjectId changes, auto-select first matching assignment if current is not in filtered
  useEffect(() => {
    if (filteredAssignments.length > 0) {
      const exists = filteredAssignments.some(a => a.id === selectedAssignmentId);
      if (!exists) {
        setSelectedAssignmentId(filteredAssignments[0].id);
        setSelectedLessonId("");
      }
    }
  }, [filteredAssignments, selectedAssignmentId]);

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

  // Calculate live stats for the active lesson
  const liveStats = useMemo(() => {
    let tot = 0, dat = 0, canCoGang = 0, unassessed = 0;
    students.forEach((st: any) => {
      const entry = entriesMap.get(st.id) as any;
      if (entry?.evalResult === "TOT") tot++;
      else if (entry?.evalResult === "DAT") dat++;
      else if (entry?.evalResult === "CAN_CO_GANG") canCoGang++;
      else unassessed++;
    });
    return { tot, dat, canCoGang, unassessed, total: students.length };
  }, [students, entriesMap]);

  return (
    <div className="p-3 md:p-4 w-full max-w-[1600px] mx-auto space-y-3.5">
      {/* Top Banner Navigation */}
      <SpecialSubjectNav 
        title="Sổ Đánh giá Môn đặc thù (Ban Giám Hiệu & Quản trị)"
        subtitle="Giám sát kết quả đánh giá năng lực, nhận xét quá trình và sản phẩm học sinh toàn hệ thống"
      />

      {/* Control bar: High Density Filters */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-2xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Môn học đặc thù
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedLessonId("");
              }}
              className="text-xs font-bold border border-teal-200 rounded-lg px-3 py-1.5 bg-teal-50/70 text-teal-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Tất cả môn đặc thù</option>
              {availableSubjects.map((s, idx) => (
                <option key={`sub-${s.id || idx}-${idx}`} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Lớp học & GVCN phụ trách ({filteredAssignments.length} lớp)
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => {
                setSelectedAssignmentId(e.target.value);
                setSelectedLessonId("");
              }}
              className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-sm truncate"
            >
              {filteredAssignments.map((a, idx) => (
                <option key={`assign-${a.id || idx}-${idx}`} value={a.id}>
                  [{a.subject?.code}] {a.class?.className} ({a.class?.campus?.campusCode}) — GV: {a.teacher?.teacherName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tiết học / Bài dạy ({lessons.length} bài)
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-xs truncate"
            >
              {lessons.map((l: any, idx: number) => (
                <option key={`lesson-${l.id || idx}-${idx}`} value={l.id}>
                  Tiết {l.periodIndex}: {l.lessonName}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-5">
            <button
              onClick={fetchGradebook}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all text-xs"
              title="Làm mới"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => toast.success("Đang kết xuất danh sách sang Excel...")}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Strip - Zero Empty Void */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-tight">{liveStats.total} HS</div>
            <p className="text-[10px] text-slate-500">Sĩ số lớp học</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
            ★
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-800 leading-tight">
              {liveStats.tot} HS <span className="text-[10px] text-emerald-600 font-normal">({liveStats.total > 0 ? Math.round((liveStats.tot / liveStats.total) * 100) : 0}%)</span>
            </div>
            <p className="text-[10px] text-slate-500">Hoàn thành tốt</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
            ✓
          </div>
          <div>
            <div className="text-sm font-bold text-teal-800 leading-tight">
              {liveStats.dat} HS <span className="text-[10px] text-teal-600 font-normal">({liveStats.total > 0 ? Math.round((liveStats.dat / liveStats.total) * 100) : 0}%)</span>
            </div>
            <p className="text-[10px] text-slate-500">Hoàn thành</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
            !
          </div>
          <div>
            <div className="text-sm font-bold text-amber-800 leading-tight">
              {liveStats.canCoGang} HS
            </div>
            <p className="text-[10px] text-slate-500">Cần cố gắng</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
            —
          </div>
          <div>
            <div className="text-sm font-bold text-slate-700 leading-tight">
              {liveStats.unassessed} HS
            </div>
            <p className="text-[10px] text-slate-500">Chưa nhập điểm</p>
          </div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-teal-600" />
              <span>
                Sổ kết quả: {gradebookData?.assignment?.class?.className} • Tiết {lessons.find((l: any) => l.id === selectedLessonId)?.periodIndex || 1}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Môn: <span className="font-semibold text-slate-800">{gradebookData?.assignment?.subject?.name}</span> • GV: <span className="font-semibold text-slate-800">{gradebookData?.assignment?.teacher?.teacherName}</span>
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm học sinh theo tên/mã..."
              className="pl-7 pr-3 py-1 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200">
              <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">STT</th>
                <th className="py-2.5 px-3.5 w-28">Mã HS</th>
                <th className="py-2.5 px-3.5 w-48">Họ và tên</th>
                <th className="py-2.5 px-3.5 w-36 text-center">Kết quả đánh giá</th>
                <th className="py-2.5 px-3.5">Nhận xét của Giáo viên</th>
                <th className="py-2.5 px-3.5 w-32">Sản phẩm học sinh</th>
                <th className="py-2.5 px-3.5 text-center w-24">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st: any, idx: number) => {
                  const entry = entriesMap.get(st.id) as any;
                  const res = entry?.evalResult;
                  const isCompleted = entry?.status === "COMPLETED";

                  return (
                    <tr key={`student-row-${st.id || idx}-${idx}`} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-700">
                        {st.studentCode}
                      </td>

                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        {st.studentName}
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        {res === "TOT" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ★ Tốt (Hoàn thành tốt)
                          </span>
                        ) : res === "DAT" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                            ✓ Đạt (Hoàn thành)
                          </span>
                        ) : res === "CAN_CO_GANG" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            ! Cần cố gắng
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Chưa đánh giá</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-slate-700">
                        {entry?.teacherFeedback || <span className="text-slate-400 italic">Chưa có nhận xét</span>}
                      </td>

                      <td className="py-2.5 px-3.5">
                        {entry?.studentProductUrl ? (
                          <a
                            href={entry.studentProductUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-teal-700 hover:text-teal-900 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Xem file</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Không đính kèm</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
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
                <tr key="empty-students-row">
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Users className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <span>Không có học sinh nào phù hợp</span>
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
