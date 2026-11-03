"use client";
import React, { useState, useEffect } from "react";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  Heart, 
  Smile, 
  Sparkles, 
  Lock, 
  Unlock, 
  Download, 
  RefreshCcw, 
  Search, 
  ShieldCheck, 
  Users, 
  ClipboardList,
  Eye,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminCxxhMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("1");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);

  // Gradebook data
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradebookData, setGradebookData] = useState<any>(null);
  const [locking, setLocking] = useState(false);

  // Load assignments for CXXH
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/special-subjects/assignments?campusId=${selectedCampus}&grade=${selectedGrade}`);
        const json = await res.json();
        if (res.ok) {
          const list = json.assignments || [];
          setAssignments(list);
          if (list.length > 0) {
            setSelectedAssignmentId(list[0].id);
          } else {
            setSelectedAssignmentId("");
            setGradebookData(null);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Lỗi nạp phân công");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCampus, selectedGrade]);

  // Load curriculum lessons for the selected grade
  useEffect(() => {
    async function loadCurriculum() {
      try {
        const res = await fetch(`/api/special-subjects/cxxh/structure?grade=${selectedGrade}`);
        const json = await res.json();
        if (res.ok) {
          const list = json.lessons || [];
          setLessons(list);
          if (list.length > 0) {
            setSelectedLessonIndex(0);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadCurriculum();
  }, [selectedGrade]);

  // Load gradebook when assignment or lesson changes
  const currentLesson = lessons[selectedLessonIndex] || null;

  useEffect(() => {
    if (!selectedAssignmentId || !currentLesson) return;

    async function fetchGradebook() {
      try {
        setGradebookLoading(true);
        const res = await fetch(`/api/special-subjects/cxxh/gradebook?assignmentId=${selectedAssignmentId}&lessonId=${currentLesson.id}`);
        const json = await res.json();
        if (res.ok) {
          setGradebookData(json);
        } else {
          setGradebookData(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setGradebookLoading(false);
      }
    }
    fetchGradebook();
  }, [selectedAssignmentId, currentLesson]);

  // Lock / Unlock session
  const handleToggleLock = async (targetAction: "LOCK" | "UNLOCK") => {
    if (!selectedAssignmentId || !currentLesson) return;
    const confirmMsg = targetAction === "LOCK" 
      ? "Khóa kỳ đánh giá bài học này? Sau khi khóa, giáo viên sẽ không thể chỉnh sửa điểm trừ khi được mở khóa."
      : "Mở khóa kỳ đánh giá để giáo viên có thể tiếp tục chỉnh sửa điểm số?";

    if (!confirm(confirmMsg)) return;

    try {
      setLocking(true);
      const res = await fetch("/api/special-subjects/cxxh/gradebook/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignmentId,
          lessonId: currentLesson.id,
          action: targetAction
        })
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message);
        // Refresh gradebook
        const refreshRes = await fetch(`/api/special-subjects/cxxh/gradebook?assignmentId=${selectedAssignmentId}&lessonId=${currentLesson.id}`);
        const refreshJson = await refreshRes.json();
        if (refreshRes.ok) setGradebookData(refreshJson);
      } else {
        toast.error(json.error || "Lỗi thao tác khóa");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setLocking(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!gradebookData || !currentLesson) {
      toast.error("Chưa có dữ liệu để xuất");
      return;
    }

    try {
      const rows = (gradebookData.students || []).map((s: any, idx: number) => {
        const row: any = {
          "STT": idx + 1,
          "Mã HS": s.studentCode,
          "Họ và tên": s.studentName,
          "Trạng thái": s.attendanceStatus === "ABSENT" ? "Vắng mặt" : "Có mặt"
        };

        currentLesson.criteria.forEach((c: any, i: number) => {
          const val = s.rubricDetails[c.id];
          row[`TC ${i + 1} (${c.code})`] = val === "TOT" ? "Tốt" : val === "HOAN_THANH" ? "Hoàn thành" : val === "CAN_CO_GANG" ? "Cần cố gắng" : "Chưa đánh giá";
        });

        row["Kết quả chung bài"] = s.evalResult === "TOT" ? "Tốt" : s.evalResult === "HOAN_THANH" ? "Hoàn thành" : s.evalResult === "CAN_CO_GANG" ? "Cần cố gắng" : "Chưa đủ";
        row["Nhận xét GV"] = s.teacherFeedback || "";
        return row;
      });

      // Dynamic import xlsx
      const XLSX = require("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DanhGia_CXXH");
      const filename = `DanhGia_CXXH_${gradebookData.assignment?.class?.className}_Bai${currentLesson.periodIndex}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Đã xuất file ${filename}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi xuất Excel: " + err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <SpecialSubjectNav 
        title="Giám sát Đánh giá Giáo dục Cảm xúc (CXXH 1–9)"
        subtitle="Theo dõi tiến độ, khóa/mở khóa kỳ đánh giá và xuất báo cáo kết quả rèn luyện cảm xúc"
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Khối lớp (1–9)</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lớp học ({assignments.length} lớp)</label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500 min-w-[200px]"
              disabled={assignments.length === 0}
            >
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.class?.className} ({a.class?.campus?.campusCode || "CS"}) • GV: {a.teacher?.teacherName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bài học ({lessons.length} bài)</label>
            <select
              value={selectedLessonIndex}
              onChange={(e) => setSelectedLessonIndex(parseInt(e.target.value, 10))}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500 min-w-[280px]"
              disabled={lessons.length === 0}
            >
              {lessons.map((l, i) => (
                <option key={l.id} value={i}>
                  Bài {l.periodIndex}: {l.lessonName} ({l.criteriaCount} TC)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lock/Unlock and Export Actions */}
        <div className="flex items-center space-x-2">
          {gradebookData && (
            <>
              {gradebookData.isLocked ? (
                <button
                  onClick={() => handleToggleLock("UNLOCK")}
                  disabled={locking}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở khóa kỳ đánh giá</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleLock("LOCK")}
                  disabled={locking}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Khóa kỳ đánh giá</span>
                </button>
              )}

              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Monitoring View */}
      {gradebookLoading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center">
          <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
          <p className="text-xs font-bold text-slate-600">Đang tải bảng điểm giám sát...</p>
        </div>
      ) : !gradebookData || !currentLesson ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Chưa có dữ liệu lớp học phù hợp với bộ lọc</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
            <div>
              <span className="font-extrabold text-sm text-[#003B3A]">
                Lớp {gradebookData.assignment?.class?.className} • Bài {currentLesson.periodIndex}: {currentLesson.lessonName}
              </span>
              <div className="text-slate-500 mt-0.5">
                GV phụ trách: <span className="font-bold text-slate-700">{gradebookData.assignment?.teacher?.teacherName}</span> • Sĩ số: {gradebookData.students?.length} học sinh
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                gradebookData.isLocked 
                  ? "bg-rose-50 text-rose-700 border-rose-200" 
                  : gradebookData.sessionStatus === "COMPLETED" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                    : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {gradebookData.isLocked ? "🔒 Đã khóa sổ" : gradebookData.sessionStatus === "COMPLETED" ? "✓ Đã hoàn tất" : "📝 Đang nhập nháp"}
              </span>
            </div>
          </div>

          {/* Readonly Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 w-28">Mã HS</th>
                  <th className="py-2.5 px-4 w-44">Họ và tên</th>
                  {currentLesson.criteria.map((c: any, i: number) => (
                    <th key={c.id} className="py-2.5 px-3 min-w-[150px] border-r border-slate-200 bg-teal-50/40">
                      <div className="font-bold text-teal-950">TC {i + 1}</div>
                      <div className="text-[10px] text-teal-700">{c.competencyGroup} {c.programLevel ? `• ${c.programLevel}` : ""}</div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 w-32 text-center bg-slate-100">Kết quả bài</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Nhận xét GV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradebookData.students?.map((s: any, idx: number) => (
                  <tr key={s.studentId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{s.studentCode}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{s.studentName}</td>
                    {currentLesson.criteria.map((c: any) => {
                      const val = s.rubricDetails[c.id];
                      return (
                        <td key={c.id} className="py-2.5 px-3 border-r border-slate-200 text-center">
                          {s.attendanceStatus === "ABSENT" ? (
                            <span className="text-[10px] text-slate-400 italic">Vắng</span>
                          ) : val === "TOT" ? (
                            <span className="font-bold text-emerald-700">Tốt</span>
                          ) : val === "HOAN_THANH" ? (
                            <span className="font-bold text-teal-700">Hoàn thành</span>
                          ) : val === "CAN_CO_GANG" ? (
                            <span className="font-bold text-amber-700">Cần cố gắng</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center">
                      {s.attendanceStatus === "ABSENT" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">VẮNG</span>
                      ) : s.evalResult === "TOT" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">TỐT</span>
                      ) : s.evalResult === "HOAN_THANH" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">HOÀN THÀNH</span>
                      ) : s.evalResult === "CAN_CO_GANG" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">CỐ GẮNG</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 italic text-[11px]">
                      {s.teacherFeedback || "—"}
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
