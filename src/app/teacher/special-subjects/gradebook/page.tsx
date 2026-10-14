"use client";
import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Save, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Link as LinkIcon, 
  ChevronRight, 
  BookOpen, 
  Package, 
  ShieldCheck, 
  RefreshCcw,
  Zap,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function TeacherSpecialGradebookPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");

  const [gradebookData, setGradebookData] = useState<any>(null);
  const [formEntries, setFormEntries] = useState<Record<string, { evalResult: string; teacherFeedback: string; studentProductUrl: string }>>({});

  // 1. Fetch teacher assignments
  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        const res = await fetch("/api/special-subjects/assignments");
        const json = await res.json();
        if (res.ok) {
          const list = json.assignments || [];
          setAssignments(list);
          if (list.length > 0) {
            setSelectedAssignmentId(list[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi nạp danh sách lớp");
      } finally {
        setLoading(false);
      }
    }
    loadAssignments();
  }, []);

  // 2. Fetch gradebook entries when class or lesson changes
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

        // Initialize form state
        const initialForm: Record<string, any> = {};
        for (const st of json.students || []) {
          const existing = (json.gradeEntries || []).find((ge: any) => ge.studentId === st.id);
          initialForm[st.id] = {
            evalResult: existing?.evalResult || "",
            teacherFeedback: existing?.teacherFeedback || "",
            studentProductUrl: existing?.studentProductUrl || ""
          };
        }
        setFormEntries(initialForm);
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

  const activeLesson = (gradebookData?.lessons || []).find((l: any) => l.id === selectedLessonId) || gradebookData?.lessons?.[0];
  const students = gradebookData?.students || [];

  const handleResultChange = (studentId: string, result: string) => {
    setFormEntries(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { teacherFeedback: "", studentProductUrl: "" }),
        evalResult: result
      }
    }));
  };

  const handleFeedbackChange = (studentId: string, feedback: string) => {
    setFormEntries(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { evalResult: "", studentProductUrl: "" }),
        teacherFeedback: feedback
      }
    }));
  };

  const handleProductUrlChange = (studentId: string, url: string) => {
    setFormEntries(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { evalResult: "", teacherFeedback: "" }),
        studentProductUrl: url
      }
    }));
  };

  const handleQuickAllPass = () => {
    const next: Record<string, any> = { ...formEntries };
    students.forEach((st: any) => {
      if (!next[st.id]?.evalResult) {
        next[st.id] = {
          ...(next[st.id] || { teacherFeedback: "", studentProductUrl: "" }),
          evalResult: "DAT"
        };
      }
    });
    setFormEntries(next);
    toast.success("Đã gán nhanh 'Đạt' cho các học sinh chưa có điểm");
  };

  const handleSave = async (isFinal: boolean) => {
    if (!selectedAssignmentId || !selectedLessonId) return;

    try {
      setSaving(true);
      const entries = students.map((st: any) => {
        const item = formEntries[st.id] || {};
        return {
          studentId: st.id,
          evalResult: item.evalResult || null,
          teacherFeedback: item.teacherFeedback || null,
          studentProductUrl: item.studentProductUrl || null
        };
      }).filter((e: any) => e.evalResult || e.teacherFeedback || e.studentProductUrl);

      const res = await fetch("/api/special-subjects/gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignmentId,
          lessonId: selectedLessonId,
          isFinalSubmit: isFinal,
          entries
        })
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Lưu sổ đánh giá thành công");
        fetchGradebook();
      } else {
        toast.error(json.error || "Lỗi lưu dữ liệu");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] text-white p-5 shadow-lg border border-teal-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/teacher"
              className="text-[11px] font-semibold text-teal-200 hover:text-white flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về Cổng Giáo viên</span>
            </Link>
            <span className="text-teal-400">•</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 uppercase tracking-wider">
              Sổ đánh giá Môn đặc thù
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold mt-1 text-white tracking-tight">
            Đánh giá Môn học đặc thù Sky-Line
          </h1>
          <p className="text-xs text-teal-100/80 mt-0.5">
            Giáo viên phụ trách: {gradebookData?.assignment?.teacher?.teacherName || "Giáo viên"}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Lưu nháp (Draft)</span>
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-900/30"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Hoàn tất đánh giá</span>
          </button>
        </div>
      </div>

      {/* Class & Lesson Selectors */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Lớp phụ trách
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
                  {a.class?.className} ({a.class?.campus?.campusCode}) — {a.subject?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tiết học đánh giá
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-sm truncate"
            >
              {(gradebookData?.lessons || []).map((l: any) => (
                <option key={l.id} value={l.id}>
                  Tiết {l.periodIndex}: {l.lessonName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleQuickAllPass}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 flex items-center space-x-1.5 transition-all shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 text-teal-600" />
          <span>Gán nhanh: Tất cả Đạt</span>
        </button>
      </div>

      {/* Lesson Details Card */}
      {activeLesson && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                {activeLesson.periodIndex}
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                {activeLesson.lessonName}
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-100">
                Chủ đề: {activeLesson.topic?.name || "Chung"}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Sỹ số: <span className="font-bold text-slate-800">{students.length}</span> học sinh
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="font-bold text-slate-700 flex items-center space-x-1 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                <span>Yêu cầu cần đạt (YCCĐ):</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {activeLesson.requirements || activeLesson.objectives || "Đạt mục tiêu bài học đề ra."}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100">
              <div className="font-bold text-teal-900 flex items-center space-x-1 mb-1">
                <Package className="w-3.5 h-3.5 text-teal-700" />
                <span>Sản phẩm kỳ vọng:</span>
              </div>
              <p className="text-teal-900 font-semibold leading-relaxed">
                {activeLesson.expectedProduct || "Phiếu học tập / Bảng nhóm"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grade Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th className="py-3 px-3 w-28">Mã HS</th>
                <th className="py-3 px-3 w-44">Họ và tên</th>
                <th className="py-3 px-3 w-72 text-center">Mức đạt năng lực</th>
                <th className="py-3 px-3">Nhận xét của Giáo viên</th>
                <th className="py-3 px-3 w-56">Link Sản phẩm / Minh chứng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((st: any, idx: number) => {
                const entry = formEntries[st.id] || { evalResult: "", teacherFeedback: "", studentProductUrl: "" };
                const res = entry.evalResult;

                return (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                      {st.studentCode}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-900">
                      {st.studentName}
                    </td>

                    {/* Radio group for 3 levels */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 space-x-1">
                        <button
                          type="button"
                          onClick={() => handleResultChange(st.id, "TOT")}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                            res === "TOT"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                        >
                          Tốt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResultChange(st.id, "DAT")}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                            res === "DAT"
                              ? "bg-teal-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                        >
                          Đạt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResultChange(st.id, "CAN_CO_GANG")}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                            res === "CAN_CO_GANG"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                        >
                          Cần cố gắng
                        </button>
                      </div>
                    </td>

                    {/* Feedback input */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={entry.teacherFeedback}
                        onChange={(e) => handleFeedbackChange(st.id, e.target.value)}
                        placeholder="Nhận xét sự tiến bộ hoặc điểm cần cải thiện..."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </td>

                    {/* Product URL */}
                    <td className="py-3 px-3">
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={entry.studentProductUrl}
                          onChange={(e) => handleProductUrlChange(st.id, e.target.value)}
                          placeholder="https://..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono text-[11px]"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            * Dữ liệu lưu nháp chỉ hiển thị nội bộ giáo viên. Nhấn <strong>Hoàn tất đánh giá</strong> để ghi nhận chính thức vào Hồ sơ học sinh 360.
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition-all text-xs"
            >
              Lưu nháp
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white font-bold transition-all text-xs shadow-md shadow-[#003B3A]/20"
            >
              {saving ? "Đang lưu..." : "Hoàn tất đánh giá"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
