"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  Heart, 
  Shield, 
  Coins, 
  Compass, 
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
  AlertCircle,
  Mail,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface SpecialSubjectDef {
  code: string;
  name: string;
  shortName: string;
  grades: string[];
  icon: any;
  color: string;
  badge: string;
  ppctInfo: string;
}

const SPECIAL_SUBJECTS: SpecialSubjectDef[] = [
  {
    code: "CXXH",
    name: "Giáo dục Cảm xúc - Xã hội",
    shortName: "GD Cảm xúc (1–9)",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    icon: Heart,
    color: "#0D9488",
    badge: "Khối 1–9",
    ppctInfo: "Khối 1–9 • 295 bài học • 979 tiêu chuẩn năng lực"
  },
  {
    code: "GDGT",
    name: "Giáo dục Giới tính",
    shortName: "GD Giới tính (6–9)",
    grades: ["6", "7", "8", "9"],
    icon: Shield,
    color: "#E11D48",
    badge: "Khối 6–9",
    ppctInfo: "Khối 6–9 • 40 bài học • 160 tiêu chuẩn năng lực"
  },
  {
    code: "FIN_EDU",
    name: "Giáo dục Tài chính cá nhân",
    shortName: "GD Tài chính (2–9)",
    grades: ["2", "3", "4", "5", "6", "7", "8", "9"],
    icon: Coins,
    color: "#059669",
    badge: "Khối 2–9",
    ppctInfo: "Khối 2–9 • Khối 2S (15 bài/55 TC), Khối 3S (15 bài/45 TC), Khối 4S (12 bài/57 TC), Khối 5S (12 bài/65 TC), Khối 6-9 THCS (40 bài/118 TC)"
  },
  {
    code: "GDHN",
    name: "Giáo dục Hướng nghiệp",
    shortName: "GD Hướng nghiệp (6–12)",
    grades: ["6", "7", "8", "9", "10", "11", "12"],
    icon: Compass,
    color: "#D97706",
    badge: "Khối 6–12",
    ppctInfo: "Khối 6–12 • 70 bài học • 278 tiêu chuẩn năng lực"
  }
];

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch (e) {
    return { error: !res.ok ? `Máy chủ phản hồi mã ${res.status}: ${res.statusText || 'Đang kết nối'}` : "Dữ liệu không đúng định dạng" };
  }
}

function SpecialSubjectMonitorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const querySubject = searchParams.get("subject") || "CXXH";
  const activeSubject = SPECIAL_SUBJECTS.find(s => s.code.toUpperCase() === querySubject.toUpperCase()) || SPECIAL_SUBJECTS[0];

  const [loading, setLoading] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");

  // Gradebook data for the selected assignment & lesson
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradebookData, setGradebookData] = useState<any>(null);
  const [locking, setLocking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"MATRIX" | "PROGRESS_LIST">("MATRIX");

  // Switch subject
  const handleSelectSubject = (code: string) => {
    router.push(`/admin/special-subjects/monitor?subject=${code}`);
  };

  // 1. Load assignments for active subject
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/special-subjects/assignments?subjectCode=${activeSubject.code}&campusId=${selectedCampus}&grade=${selectedGrade}`);
      const json = await safeJson(res);
      if (res.ok) {
        const list = json.assignments || [];
        setAssignments(list);
        if (list.length > 0) {
          const exists = list.some((a: any) => a.id === selectedAssignmentId);
          if (!exists) {
            setSelectedAssignmentId(list[0].id);
          }
        } else {
          setSelectedAssignmentId("");
          setGradebookData(null);
        }
      } else {
        toast.error(json.error || "Không thể tải danh sách phân công");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi nạp phân công");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [activeSubject.code, selectedCampus, selectedGrade]);

  // Current active assignment object
  const currentAssignment = useMemo(() => {
    return assignments.find((a: any) => a.id === selectedAssignmentId) || assignments[0] || null;
  }, [assignments, selectedAssignmentId]);

  // 2. Fetch Gradebook and Lessons whenever selectedAssignmentId or selectedLessonId changes
  const fetchGradebook = async () => {
    if (!selectedAssignmentId) return;
    try {
      setGradebookLoading(true);
      const url = `/api/special-subjects/gradebook?assignmentId=${selectedAssignmentId}${selectedLessonId ? `&lessonId=${selectedLessonId}` : ""}`;
      const res = await fetch(url);
      const json = await safeJson(res);
      if (res.ok) {
        setGradebookData(json);
        if (json.lessons && json.lessons.length > 0) {
          setLessons(json.lessons);
          if (!selectedLessonId && json.lesson?.id) {
            setSelectedLessonId(json.lesson.id);
          }
        }
      } else {
        setGradebookData(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGradebookLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssignmentId) {
      fetchGradebook();
    }
  }, [selectedAssignmentId, selectedLessonId]);

  const currentLesson = useMemo(() => {
    return gradebookData?.lesson || lessons.find((l: any) => l.id === selectedLessonId) || lessons[0] || null;
  }, [gradebookData, lessons, selectedLessonId]);

  // Check if session is locked
  const isSessionLocked = useMemo(() => {
    const entries = gradebookData?.gradeEntries || [];
    return entries.length > 0 && entries.every((e: any) => e.status === "LOCKED");
  }, [gradebookData]);

  // Lock / Unlock session handler
  const handleToggleLock = async (targetAction: "LOCK" | "UNLOCK") => {
    if (!selectedAssignmentId || !currentLesson) return;
    const confirmMsg = targetAction === "LOCK" 
      ? `Khóa kỳ đánh giá bài "${currentLesson.lessonName}"? Sau khi khóa, giáo viên sẽ không thể sửa điểm trừ khi được Ban Giám Hiệu mở khóa.`
      : `Mở khóa kỳ đánh giá để giáo viên tiếp tục chỉnh sửa điểm số?`;

    if (!confirm(confirmMsg)) return;

    try {
      setLocking(true);
      const res = await fetch("/api/special-subjects/gradebook/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignmentId,
          lessonId: currentLesson.id,
          action: targetAction
        })
      });

      const json = await safeJson(res);
      if (res.ok) {
        toast.success(json.message);
        fetchGradebook();
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

  // Remind Teacher via Email
  const handleSendReminder = async (assignment: any) => {
    if (!assignment?.teacher?.email) {
      toast.error(`Giáo viên ${assignment?.teacher?.teacherName} chưa có email liên kết`);
      return;
    }

    try {
      toast.loading("Đang gửi email đôn đốc giáo viên...", { id: "remind-toast" });
      const res = await fetch("/api/special-subjects/assignments/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentIds: [assignment.id],
          customMessage: "Đề nghị Thầy/Cô khẩn trương hoàn thiện việc nhập và nộp sổ đánh giá môn học đặc thù theo đúng tiến độ kế hoạch."
        })
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success(`Đã gửi email nhắc nhở thành công đến Thầy/Cô ${assignment.teacher.teacherName}`, { id: "remind-toast" });
      } else {
        toast.error(json.error || "Lỗi gửi email", { id: "remind-toast" });
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message, { id: "remind-toast" });
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (!gradebookData || !currentLesson) {
      toast.error("Chưa có dữ liệu để xuất");
      return;
    }

    try {
      const criteriaList = currentLesson.criteria || [];
      const entriesMap = new Map((gradebookData.gradeEntries || []).map((ge: any) => [ge.studentId, ge]));

      const rows = (gradebookData.students || []).map((s: any, idx: number) => {
        const entry = entriesMap.get(s.id) as any;
        const row: any = {
          "STT": idx + 1,
          "Mã HS": s.studentCode,
          "Họ và tên": s.studentName,
          "Trạng thái": entry?.attendanceStatus === "ABSENT" ? "Vắng mặt" : "Có mặt"
        };

        criteriaList.forEach((c: any, i: number) => {
          let rubricVal = "";
          if (entry?.rubricDetails) {
            try {
              const details = typeof entry.rubricDetails === "string" ? JSON.parse(entry.rubricDetails) : entry.rubricDetails;
              rubricVal = details[c.id] || "";
            } catch (e) {}
          }
          row[`TC ${i + 1} (${c.code})`] = rubricVal === "TOT" ? "Tốt" : rubricVal === "HOAN_THANH" ? "Hoàn thành" : rubricVal === "CAN_CO_GANG" ? "Cần cố gắng" : "Chưa ĐG";
        });

        row["Kết quả chung bài"] = entry?.evalResult === "TOT" ? "Tốt" : entry?.evalResult === "DAT" || entry?.evalResult === "HOAN_THANH" ? "Hoàn thành" : entry?.evalResult === "CAN_CO_GANG" ? "Cần cố gắng" : "Chưa đủ";
        row["Nhận xét GV"] = entry?.teacherFeedback || "";
        row["Trạng thái nộp"] = entry?.status === "COMPLETED" ? "Đã nộp" : entry?.status === "LOCKED" ? "Đã khóa" : entry?.status === "DRAFT" ? "Lưu nháp" : "Chưa nhập";
        return row;
      });

      const XLSX = require("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeSubject.code);
      const className = currentAssignment?.class?.className || "Lop";
      const filename = `GiamSat_${activeSubject.code}_${className}_Tiet${currentLesson.periodIndex}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Đã xuất file ${filename}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi xuất Excel: " + err.message);
    }
  };

  // Filter students for matrix
  const students = gradebookData?.students || [];
  const entriesMap = new Map((gradebookData?.gradeEntries || []).map((ge: any) => [ge.studentId, ge]));

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return s.studentName.toLowerCase().includes(term) || s.studentCode.toLowerCase().includes(term);
    });
  }, [students, searchTerm]);

  // Quick stats for the current lesson
  const lessonStats = useMemo(() => {
    let tot = 0, dat = 0, canCoGang = 0, unassessed = 0, absent = 0;
    students.forEach((s: any) => {
      const entry = entriesMap.get(s.id) as any;
      if (entry?.attendanceStatus === "ABSENT") absent++;
      if (entry?.evalResult === "TOT") tot++;
      else if (entry?.evalResult === "DAT" || entry?.evalResult === "HOAN_THANH") dat++;
      else if (entry?.evalResult === "CAN_CO_GANG") canCoGang++;
      else unassessed++;
    });
    return { tot, dat, canCoGang, unassessed, absent, total: students.length };
  }, [students, entriesMap]);

  const SubjIcon = activeSubject.icon;

  return (
    <div className="p-3 md:p-5 max-w-[1600px] mx-auto space-y-4">
      <SpecialSubjectNav 
        title={`Giám sát Đánh giá ${activeSubject.name}`}
        subtitle={`Theo dõi tiến độ nộp sổ, kiểm duyệt kết quả và đôn đốc giáo viên thực hiện môn đặc thù`}
      />

      {/* 1. 4-Subject Segmented Switcher */}
      <div className="bg-white rounded-2xl p-2 shadow-xs border border-slate-200/90 flex flex-wrap items-center gap-1.5">
        {SPECIAL_SUBJECTS.map((s) => {
          const Icon = s.icon;
          const isActive = s.code === activeSubject.code;
          return (
            <button
              key={s.code}
              onClick={() => handleSelectSubject(s.code)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? "bg-[#003B3A] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-teal-300" : "text-slate-400"}`} />
              <span>{s.shortName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {s.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Top Banner Card with Subject Info */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-4 shadow-sm border border-teal-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-300 shrink-0">
            <SubjIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-400/20 text-teal-200 border border-teal-400/30">
                {activeSubject.code}
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-300">
                Niên khóa 2026-2027
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              Phân hệ Giám sát: {activeSubject.name}
            </h2>
            <p className="text-xs text-teal-100/80 font-normal">
              {activeSubject.ppctInfo}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Link
            href={`/teacher/special-subjects/eval?subject=${activeSubject.code}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/30 transition-all flex items-center space-x-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            <span>Mở Form Đánh giá GV</span>
          </Link>
          <button
            onClick={handleExportExcel}
            disabled={!gradebookData}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center space-x-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Cơ sở */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Cơ sở
            </label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">Tất cả cơ sở</option>
              <option value="cmnofie5n0000uhvs2ifqj6pr">CS1 - Sky-Line Riverside</option>
              <option value="cmnofie7a0001uhvsl131y7yv">CS2 - Sky-Line Central</option>
              <option value="cmnofie7v0002uhvscd5jqp58">CS3 - Sky-Line Global</option>
              <option value="cmnofie8h0003uhvsggzaehkk">CS4 - Sky-Line Hill</option>
              <option value="cmnofie960004uhvsu7ez21gj">CS5 - Sky-Line Beach</option>
            </select>
          </div>

          {/* Khối */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Khối lớp
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">Tất cả khối ({activeSubject.badge})</option>
              {activeSubject.grades.map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          </div>

          {/* Lớp & GV */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Lớp & GV phụ trách ({assignments.length} lớp)
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => {
                setSelectedAssignmentId(e.target.value);
                setSelectedLessonId("");
              }}
              className="font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-sm truncate"
            >
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.class?.className} ({a.class?.campus?.campusCode}) — GV: {a.teacher?.teacherName}
                </option>
              ))}
            </select>
          </div>

          {/* Bài học / Tiết dạy */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Bài học / Tiết dạy ({lessons.length} bài)
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-xs truncate"
            >
              {lessons.map(l => (
                <option key={l.id} value={l.id}>
                  Tiết {l.periodIndex}: {l.lessonName}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                fetchAssignments();
                fetchGradebook();
              }}
              disabled={loading || gradebookLoading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
              title="Làm mới"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${(loading || gradebookLoading) ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("MATRIX")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "MATRIX" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Ma trận Đánh giá Lớp
          </button>
          <button
            onClick={() => setActiveTab("PROGRESS_LIST")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "PROGRESS_LIST" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tiến độ Toàn bộ GV ({assignments.length})
          </button>
        </div>
      </div>

      {/* 4. Mini KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-tight">{lessonStats.total} HS</div>
            <p className="text-[10px] text-slate-500">Sĩ số lớp</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
            ★
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-800 leading-tight">
              {lessonStats.tot} HS <span className="text-[10px] font-normal text-emerald-600">({lessonStats.total > 0 ? Math.round((lessonStats.tot / lessonStats.total) * 100) : 0}%)</span>
            </div>
            <p className="text-[10px] text-slate-500">Hoàn thành tốt</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
            ✓
          </div>
          <div>
            <div className="text-sm font-bold text-teal-800 leading-tight">
              {lessonStats.dat} HS <span className="text-[10px] font-normal text-teal-600">({lessonStats.total > 0 ? Math.round((lessonStats.dat / lessonStats.total) * 100) : 0}%)</span>
            </div>
            <p className="text-[10px] text-slate-500">Hoàn thành</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
            !
          </div>
          <div>
            <div className="text-sm font-bold text-amber-800 leading-tight">{lessonStats.canCoGang} HS</div>
            <p className="text-[10px] text-slate-500">Cần cố gắng</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
            —
          </div>
          <div>
            <div className="text-sm font-bold text-slate-700 leading-tight">{lessonStats.unassessed} HS</div>
            <p className="text-[10px] text-slate-500">Chưa nhập</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
            isSessionLocked ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-700"
          }`}>
            {isSessionLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">
              {isSessionLocked ? (
                <span className="text-rose-700">ĐÃ KHÓA SỔ</span>
              ) : (
                <span className="text-teal-700">ĐANG MỞ</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500">Kiểm duyệt</p>
          </div>
        </div>
      </div>

      {/* 5. Main View: MATRIX or PROGRESS_LIST */}
      {activeTab === "MATRIX" ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center space-x-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <span>
                  Sổ kết quả: {currentAssignment?.class?.className} • Tiết {currentLesson?.periodIndex || 1}: {currentLesson?.lessonName}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                GV Phụ trách: <span className="font-semibold text-slate-800">{currentAssignment?.teacher?.teacherName}</span> ({currentAssignment?.teacher?.email || "Chưa có email"})
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm học sinh..."
                  className="pl-7 pr-3 py-1 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-48"
                />
              </div>

              {/* Lock / Unlock Buttons */}
              {isSessionLocked ? (
                <button
                  onClick={() => handleToggleLock("UNLOCK")}
                  disabled={locking}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center space-x-1.5"
                >
                  <Unlock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Mở khóa cho GV sửa</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleLock("LOCK")}
                  disabled={locking}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all flex items-center space-x-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Khóa kỳ đánh giá</span>
                </button>
              )}

              {/* Remind button */}
              <button
                onClick={() => handleSendReminder(currentAssignment)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all flex items-center space-x-1.5"
                title="Gửi email nhắc nhở giáo viên này"
              >
                <Mail className="w-3.5 h-3.5 text-teal-600" />
                <span>Nhắc nộp điểm</span>
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200">
                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3.5 w-28">Mã HS</th>
                  <th className="py-2.5 px-3.5 w-44">Họ và tên</th>
                  <th className="py-2.5 px-2 w-20 text-center">Điểm danh</th>

                  {/* Dynamic Criteria Headers */}
                  {(currentLesson?.criteria || []).map((crit: any, idx: number) => (
                    <th 
                      key={`crit-hdr-${crit.id || idx}-${idx}`} 
                      className="py-2.5 px-2.5 min-w-[120px] text-center border-l border-slate-200 group relative cursor-help"
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-extrabold text-teal-800">TC {idx + 1}</span>
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[100px] mt-0.5">
                          {crit.code}
                        </span>
                        {crit.programLevel && (
                          <span className="mt-0.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-semibold">
                            {crit.programLevel}
                          </span>
                        )}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute hidden group-hover:block z-50 w-64 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl text-[11px] font-normal leading-relaxed left-1/2 -translate-x-1/2 top-full mt-1 border border-slate-700 pointer-events-none">
                        <p className="font-bold text-teal-300 mb-1">{crit.code} • {crit.programLevel || 'Chuẩn CT'}</p>
                        <p>{crit.description}</p>
                      </div>
                    </th>
                  ))}

                  <th className="py-2.5 px-3.5 w-32 text-center border-l border-slate-200 bg-teal-50/40">
                    Kết quả bài
                  </th>
                  <th className="py-2.5 px-3.5 min-w-[180px] border-l border-slate-200">
                    Nhận xét của Giáo viên
                  </th>
                  <th className="py-2.5 px-3 text-center w-24 border-l border-slate-200">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((st: any, idx: number) => {
                    const entry = entriesMap.get(st.id) as any;
                    const res = entry?.evalResult;
                    const isCompleted = entry?.status === "COMPLETED";
                    const isLocked = entry?.status === "LOCKED";
                    const isAbsent = entry?.attendanceStatus === "ABSENT";

                    let rubricDetails: Record<string, string> = {};
                    if (entry?.rubricDetails) {
                      try {
                        rubricDetails = typeof entry.rubricDetails === "string" ? JSON.parse(entry.rubricDetails) : entry.rubricDetails;
                      } catch (e) {}
                    }

                    return (
                      <tr 
                        key={`student-row-${st.id || idx}-${idx}`} 
                        className={`hover:bg-teal-50/20 transition-colors ${isAbsent ? "bg-slate-50/60 opacity-75" : ""}`}
                      >
                        <td className="py-2 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-2 px-3.5 font-mono font-semibold text-slate-700">
                          {st.studentCode}
                        </td>

                        <td className="py-2 px-3.5 font-bold text-slate-900">
                          {st.studentName}
                        </td>

                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isAbsent ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {isAbsent ? "VẮNG" : "CÓ MẶT"}
                          </span>
                        </td>

                        {/* Criteria Score Values */}
                        {(currentLesson?.criteria || []).map((crit: any, cIdx: number) => {
                          const val = rubricDetails[crit.id] || "";
                          return (
                            <td key={`crit-val-${crit.id || cIdx}-${cIdx}`} className="py-2 px-2 text-center border-l border-slate-100">
                              {val === "TOT" ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded font-extrabold text-[10px] bg-emerald-100 text-emerald-800">
                                  T (Tốt)
                                </span>
                              ) : val === "HOAN_THANH" || val === "DAT" ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded font-extrabold text-[10px] bg-blue-100 text-blue-800">
                                  H (Đạt)
                                </span>
                              ) : val === "CAN_CO_GANG" ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded font-extrabold text-[10px] bg-amber-100 text-amber-800">
                                  C (Cố gắng)
                                </span>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Kết quả chung */}
                        <td className="py-2 px-3.5 text-center border-l border-slate-200 bg-teal-50/20">
                          {res === "TOT" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ★ Tốt
                            </span>
                          ) : res === "DAT" || res === "HOAN_THANH" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                              ✓ Đạt
                            </span>
                          ) : res === "CAN_CO_GANG" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              ! Cần cố gắng
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Chưa đánh giá</span>
                          )}
                        </td>

                        {/* Nhận xét */}
                        <td className="py-2 px-3.5 text-slate-700 border-l border-slate-100">
                          {entry?.teacherFeedback || <span className="text-slate-400 italic">Chưa có nhận xét</span>}
                        </td>

                        {/* Trạng thái sổ */}
                        <td className="py-2 px-3 text-center border-l border-slate-100">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLocked
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : isCompleted
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : entry?.status === "DRAFT"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {isLocked ? "Đã khóa" : isCompleted ? "Đã nộp" : entry?.status === "DRAFT" ? "Lưu nháp" : "Chưa nhập"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr key="empty-students-row">
                    <td colSpan={7 + (currentLesson?.criteria?.length || 0)} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <span>Không có học sinh nào phù hợp</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* PROGRESS_LIST: Bảng theo dõi tiến độ toàn bộ giáo viên và lớp */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Tiến độ thực hiện của Giáo viên môn {activeSubject.name} ({assignments.length} lớp)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rà soát tỷ lệ hoàn thành đánh giá, đôn đốc nộp sổ và phê duyệt khóa điểm
              </p>
            </div>
            <button
              onClick={() => {
                const unsubmitted = assignments.filter((a: any) => (a._count?.gradeEntries || 0) === 0);
                toast.success(`Đã chuẩn bị danh sách ${unsubmitted.length} giáo viên chưa nhập điểm`);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all flex items-center space-x-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-teal-600" />
              <span>Gửi email nhắc nhở toàn bộ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3 w-20">Cơ sở</th>
                  <th className="py-2.5 px-3 w-28">Lớp học</th>
                  <th className="py-2.5 px-3.5">Giáo viên phụ trách</th>
                  <th className="py-2.5 px-3 w-28 text-center">Vai trò</th>
                  <th className="py-2.5 px-3 w-32 text-center">Tiến độ nhập điểm</th>
                  <th className="py-2.5 px-3 w-32 text-center">Trạng thái sổ</th>
                  <th className="py-2.5 px-3 w-36 text-center">Tác vụ giám sát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a: any, idx: number) => {
                  const evalCount = a._count?.gradeEntries || 0;
                  const isCurrent = a.id === selectedAssignmentId;

                  return (
                    <tr 
                      key={`assign-row-${a.id || idx}-${idx}`} 
                      className={`hover:bg-slate-50 transition ${isCurrent ? "bg-teal-50/30" : ""}`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600">
                        {a.class?.campus?.campusCode || "CS"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {a.class?.className}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-800">{a.teacher?.teacherName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{a.teacher?.email || "Chưa có email"}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Đúng GVCN
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          evalCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {evalCount > 0 ? `${evalCount} lượt đã ĐG` : "0 lượt đánh giá"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evalCount > 0 ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-400"
                        }`}>
                          {evalCount > 0 ? "Đang thực hiện" : "Chưa nhập"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedAssignmentId(a.id);
                              setActiveTab("MATRIX");
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-teal-700 font-semibold text-[11px] flex items-center space-x-1"
                            title="Xem chi tiết sổ lớp này"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem sổ</span>
                          </button>
                          <button
                            onClick={() => handleSendReminder(a)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-teal-700"
                            title="Gửi email nhắc nhở GV"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SpecialSubjectMonitorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang nạp phân hệ Giám sát Môn đặc thù...</div>}>
      <SpecialSubjectMonitorContent />
    </Suspense>
  );
}
