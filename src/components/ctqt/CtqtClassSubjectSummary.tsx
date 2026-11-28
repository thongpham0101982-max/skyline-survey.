"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  Download,
  Printer,
  Eye,
  X,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Users,
  BarChart3,
  Award,
  Layers,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  CORE_COMPETENCIES_DEF,
  CORE_COMPETENCY_RATINGS,
  CtqtLevel,
  CtqtSubjectDef,
} from "@/lib/ctqt/config";

export interface CtqtConsolidatedPayload {
  class: {
    id: string;
    className: string;
    campusName?: string;
    level?: CtqtLevel;
  };
  config: {
    level: CtqtLevel;
    levelNameVi: string;
    levelNameEn: string;
    subjects: CtqtSubjectDef[];
  };
  students: {
    id: string;
    studentCode: string;
    studentName: string;
    englishName?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
  }[];
  grades: any[];
  competencies: any[];
  assignments: any[];
}

interface CtqtClassSubjectSummaryProps {
  data: CtqtConsolidatedPayload | null;
  loading?: boolean;
  semester: number;
  mode?: "admin" | "gvcn";
  onOpenSubjectGradebook?: (subjectCode: string) => void;
  onExportPdf?: (studentId?: string) => void;
  generatingPdf?: boolean;
}

function parseProgressScores(raw?: string | null): (number | null)[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(v => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    });
  } catch {
    return [];
  }
}

function toFiniteNumber(val: unknown): number | null {
  if (val === null || val === undefined || String(val).trim() === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function getReviewBadge(rawStatus?: string | null) {
  const s = (rawStatus || "DRAFT").toUpperCase();
  if (s === "APPROVED") {
    return {
      label: "Đã duyệt",
      className: "bg-emerald-50 text-[#059669] border-emerald-200",
    };
  }
  if (s === "PENDING_REVIEW" || s === "SUBMITTED") {
    return {
      label: "Chờ duyệt",
      className: "bg-amber-50 text-[#D97706] border-amber-200",
    };
  }
  if (s === "CHANGES_REQUESTED" || s === "REVISION_REQUESTED") {
    return {
      label: "Cần chỉnh sửa",
      className: "bg-rose-50 text-[#E11D48] border-rose-200",
    };
  }
  return {
    label: "Bản nháp",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };
}

/**
 * Extract the representative score (0-100 or 0-9 for IELTS) of a student in a subject
 */
function resolveRepresentativeScore(
  grade: any,
  sub: CtqtSubjectDef,
  level: CtqtLevel
): { value: number | null; isIelts: boolean; scaleLabel: string } {
  if (!grade || sub.isQualitative) {
    return { value: null, isIelts: false, scaleLabel: "Định tính" };
  }

  if (sub.code === "IELTS") {
    return {
      value: toFiniteNumber(grade.ieltsScore),
      isIelts: true,
      scaleLabel: "Band 0–9",
    };
  }

  if (level === "HIGH") {
    return {
      value: toFiniteNumber(grade.midTermScore),
      isIelts: false,
      scaleLabel: "Thang 100",
    };
  }

  // MIDDLE has explicit gpaScore; fallback to endTerm / midTerm / progress average
  const gpa = toFiniteNumber(grade.gpaScore);
  if (gpa !== null) {
    return { value: gpa, isIelts: false, scaleLabel: "ĐTB Môn" };
  }

  const end = toFiniteNumber(grade.endTermScore);
  const mid = toFiniteNumber(grade.midTermScore);
  const progs = parseProgressScores(grade.progressScores).filter(
    (x): x is number => x !== null
  );

  // PRIMARY: average of available numeric components (or endTerm/midTerm)
  const nums: number[] = [];
  if (progs.length > 0) nums.push(...progs);
  if (mid !== null) nums.push(mid);
  if (end !== null) nums.push(end);

  if (nums.length === 0) {
    return { value: null, isIelts: false, scaleLabel: "Thang 100" };
  }

  const avg = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
  return { value: avg, isIelts: false, scaleLabel: "TB các cột" };
}

function getScoreBadgeClass(score: number | null, isIelts = false): string {
  if (score === null) {
    return "bg-slate-50 text-slate-400 border-slate-200";
  }
  if (isIelts) {
    if (score >= 6.5) return "bg-emerald-50 text-[#059669] border-emerald-200";
    if (score >= 5.5) return "bg-teal-50 text-[#00736E] border-teal-200";
    if (score >= 4.5) return "bg-amber-50 text-[#D97706] border-amber-200";
    return "bg-rose-50 text-[#E11D48] border-rose-200";
  }
  if (score >= 90) return "bg-emerald-50 text-[#059669] border-emerald-200";
  if (score >= 80) return "bg-teal-50 text-[#00736E] border-teal-200";
  if (score >= 65) return "bg-amber-50 text-[#D97706] border-amber-200";
  return "bg-rose-50 text-[#E11D48] border-rose-200";
}

function getCompetencyColor(code: string): string {
  if (code === "E") return "bg-emerald-50 text-[#059669] border-emerald-200";
  if (code === "S") return "bg-teal-50 text-[#00736E] border-teal-200";
  if (code === "N") return "bg-amber-50 text-[#D97706] border-amber-200";
  return "bg-rose-50 text-[#E11D48] border-rose-200";
}

export function CtqtClassSubjectSummary({
  data,
  loading = false,
  semester,
  mode = "admin",
  onOpenSubjectGradebook,
  onExportPdf,
  generatingPdf = false,
}: CtqtClassSubjectSummaryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<
    "ALL" | "COMPLETE" | "INCOMPLETE" | "NEEDS_ATTENTION"
  >("ALL");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);

  const level: CtqtLevel = data?.config?.level || data?.class?.level || "PRIMARY";
  const subjects: CtqtSubjectDef[] = data?.config?.subjects || [];
  const students = data?.students || [];
  const grades = data?.grades || [];
  const competencies = data?.competencies || [];
  const assignments = data?.assignments || [];

  // Index grades by studentId -> subjectCode
  const gradeLookup = useMemo(() => {
    const map = new Map<string, Map<string, any>>();
    for (const g of grades) {
      if (!map.has(g.studentId)) map.set(g.studentId, new Map());
      map.get(g.studentId)!.set(g.subjectCode, g);
    }
    return map;
  }, [grades]);

  const competencyLookup = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of competencies) {
      map.set(c.studentId, c);
    }
    return map;
  }, [competencies]);

  const assignmentLookup = useMemo(() => {
    const map = new Map<string, any>();
    for (const a of assignments) {
      map.set(a.subjectCode, a);
    }
    return map;
  }, [assignments]);

  // Compute per-subject analytics
  const subjectStats = useMemo(() => {
    const totalStudents = students.length;

    return subjects.map(sub => {
      const assignment = assignmentLookup.get(sub.code);
      const isIelts = sub.code === "IELTS";
      const scores: number[] = [];
      let gradedCount = 0;
      let commentEnCount = 0;
      let commentViCount = 0;

      // Distribution buckets
      let tierExcellent = 0; // >= 90 or IELTS >= 6.5
      let tierGood = 0; // 80-89.9 or IELTS 5.5-6.4
      let tierAverage = 0; // 65-79.9 or IELTS 4.5-5.4
      let tierSupport = 0; // < 65 or IELTS < 4.5

      for (const st of students) {
        const g = gradeLookup.get(st.id)?.get(sub.code);
        const hasEn = Boolean(g?.commentEn && String(g.commentEn).trim());
        const hasVi = Boolean(g?.commentVi && String(g.commentVi).trim());
        if (hasEn) commentEnCount++;
        if (hasVi) commentViCount++;

        if (sub.isQualitative) {
          const hasText =
            hasEn ||
            hasVi ||
            Boolean(g?.assessmentContentEn && String(g.assessmentContentEn).trim()) ||
            Boolean(g?.assessmentContentVi && String(g.assessmentContentVi).trim());
          if (hasText) gradedCount++;
        } else {
          const rep = resolveRepresentativeScore(g, sub, level);
          if (rep.value !== null) {
            gradedCount++;
            scores.push(rep.value);
            if (isIelts) {
              if (rep.value >= 6.5) tierExcellent++;
              else if (rep.value >= 5.5) tierGood++;
              else if (rep.value >= 4.5) tierAverage++;
              else tierSupport++;
            } else {
              if (rep.value >= 90) tierExcellent++;
              else if (rep.value >= 80) tierGood++;
              else if (rep.value >= 65) tierAverage++;
              else tierSupport++;
            }
          }
        }
      }

      const avg =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;
      const max = scores.length > 0 ? Math.max(...scores) : null;
      const min = scores.length > 0 ? Math.min(...scores) : null;
      const completionRate =
        totalStudents > 0 ? Math.round((gradedCount / totalStudents) * 100) : 0;

      return {
        subject: sub,
        isIelts,
        teacherName: assignment?.primaryTeacher?.teacherName || null,
        reviewStatus: assignment?.status || "DRAFT",
        totalStudents,
        gradedCount,
        completionRate,
        commentEnCount,
        commentViCount,
        avg,
        max,
        min,
        tierExcellent,
        tierGood,
        tierAverage,
        tierSupport,
      };
    });
  }, [subjects, students, gradeLookup, assignmentLookup, level]);

  // Compute per-student summary rows
  const studentRows = useMemo(() => {
    return students.map((st, idx) => {
      const stGrades = gradeLookup.get(st.id) || new Map<string, any>();
      const comp = competencyLookup.get(st.id) || {};

      const perSubject: Record<
        string,
        {
          raw: any;
          score: number | null;
          isIelts: boolean;
          hasCommentEn: boolean;
          hasCommentVi: boolean;
          isFilled: boolean;
          isLow: boolean;
        }
      > = {};

      const standardScores: number[] = [];
      let filledSubjectsCount = 0;
      let needsAttention = false;

      for (const sub of subjects) {
        const g = stGrades.get(sub.code) || null;
        const hasEn = Boolean(g?.commentEn && String(g.commentEn).trim());
        const hasVi = Boolean(g?.commentVi && String(g.commentVi).trim());
        const rep = resolveRepresentativeScore(g, sub, level);

        const isFilled = sub.isQualitative
          ? hasEn ||
            hasVi ||
            Boolean(g?.assessmentContentEn && String(g.assessmentContentEn).trim()) ||
            Boolean(g?.assessmentContentVi && String(g.assessmentContentVi).trim())
          : rep.value !== null;

        if (isFilled) filledSubjectsCount++;

        const isLow =
          rep.value !== null && (rep.isIelts ? rep.value < 5.0 : rep.value < 65);
        if (isLow) needsAttention = true;

        if (rep.value !== null && !rep.isIelts) {
          standardScores.push(rep.value);
        }

        perSubject[sub.code] = {
          raw: g,
          score: rep.value,
          isIelts: rep.isIelts,
          hasCommentEn: hasEn,
          hasCommentVi: hasVi,
          isFilled,
          isLow,
        };
      }

      const overallAvg =
        standardScores.length > 0
          ? Math.round(
              (standardScores.reduce((a, b) => a + b, 0) / standardScores.length) * 10
            ) / 10
          : null;

      return {
        index: idx + 1,
        student: st,
        competency: comp,
        perSubject,
        overallAvg,
        filledSubjectsCount,
        totalSubjectsCount: subjects.length,
        isComplete: subjects.length > 0 && filledSubjectsCount === subjects.length,
        needsAttention,
      };
    });
  }, [students, subjects, gradeLookup, competencyLookup, level]);

  // Overall class KPI strip
  const classSummary = useMemo(() => {
    const totalSlots = students.length * subjects.length;
    const filledSlots = studentRows.reduce((acc, r) => acc + r.filledSubjectsCount, 0);
    const completionPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    const validAvgs = studentRows
      .map(r => r.overallAvg)
      .filter((v): v is number => v !== null);
    const classAvg =
      validAvgs.length > 0
        ? Math.round((validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length) * 10) / 10
        : null;

    const approvedSubjects = subjectStats.filter(
      s => (s.reviewStatus || "").toUpperCase() === "APPROVED"
    ).length;

    const attentionCount = studentRows.filter(r => r.needsAttention).length;

    return {
      totalStudents: students.length,
      totalSubjects: subjects.length,
      completionPct,
      classAvg,
      approvedSubjects,
      attentionCount,
    };
  }, [students.length, subjects.length, studentRows, subjectStats]);

  // Filtered student rows
  const filteredStudentRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return studentRows.filter(row => {
      if (q) {
        const matchName = (row.student.studentName || "").toLowerCase().includes(q);
        const matchCode = (row.student.studentCode || "").toLowerCase().includes(q);
        const matchEn = (row.student.englishName || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEn) return false;
      }

      if (studentFilter === "COMPLETE" && !row.isComplete) return false;
      if (studentFilter === "INCOMPLETE" && row.isComplete) return false;
      if (studentFilter === "NEEDS_ATTENTION" && !row.needsAttention) return false;

      if (selectedSubjectFilter !== "ALL") {
        const subCell = row.perSubject[selectedSubjectFilter];
        if (!subCell) return false;
      }

      return true;
    });
  }, [studentRows, searchQuery, studentFilter, selectedSubjectFilter]);

  const visibleSubjects = useMemo(() => {
    if (selectedSubjectFilter === "ALL") return subjects;
    return subjects.filter(s => s.code === selectedSubjectFilter);
  }, [subjects, selectedSubjectFilter]);

  const detailRow = useMemo(() => {
    if (!detailStudentId) return null;
    return studentRows.find(r => r.student.id === detailStudentId) || null;
  }, [detailStudentId, studentRows]);

  const handleExportSummaryExcel = () => {
    if (!data || students.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng quan theo môn
    const subRows = subjectStats.map((s, i) => ({
      STT: i + 1,
      "Mã môn": s.subject.code,
      "Tên môn (VI)": s.subject.nameVi,
      "Tên môn (EN)": s.subject.nameEn,
      "GVBM phụ trách": s.teacherName || "Chưa phân công",
      "Đã nhập điểm": `${s.gradedCount}/${s.totalStudents}`,
      "Tỷ lệ hoàn thành (%)": s.completionRate,
      "Điểm TB lớp": s.avg ?? "-",
      "Cao nhất": s.max ?? "-",
      "Thấp nhất": s.min ?? "-",
      "Xuất sắc": s.subject.isQualitative ? "-" : s.tierExcellent,
      "Tốt": s.subject.isQualitative ? "-" : s.tierGood,
      "Khá / Đạt": s.subject.isQualitative ? "-" : s.tierAverage,
      "Cần hỗ trợ": s.subject.isQualitative ? "-" : s.tierSupport,
      "Nhận xét EN": `${s.commentEnCount}/${s.totalStudents}`,
      "Nhận xét VI": `${s.commentViCount}/${s.totalStudents}`,
      "Trạng thái duyệt": getReviewBadge(s.reviewStatus).label,
    }));
    const wsSub = XLSX.utils.json_to_sheet(subRows);
    XLSX.utils.book_append_sheet(wb, wsSub, "TongQuanMonHoc");

    // Sheet 2: Kết quả từng học sinh theo môn
    const stRows = studentRows.map(r => {
      const obj: Record<string, any> = {
        STT: r.index,
        "Mã HS": r.student.studentCode,
        "Họ và tên": r.student.studentName,
        "English Name": r.student.englishName || "",
      };
      for (const sub of subjects) {
        const cell = r.perSubject[sub.code];
        if (sub.isQualitative) {
          obj[`${sub.nameVi} (${sub.code})`] = cell?.isFilled ? "Đã nhận xét" : "Chưa có";
        } else {
          obj[`${sub.nameVi} (${sub.code})`] = cell?.score ?? "-";
        }
      }
      obj["ĐTB chung CTQT"] = r.overallAvg ?? "-";
      obj["Đủ môn"] = `${r.filledSubjectsCount}/${r.totalSubjectsCount}`;
      for (const cc of CORE_COMPETENCIES_DEF) {
        obj[cc.labelVi] = r.competency?.[cc.key] || "-";
      }
      return obj;
    });
    const wsSt = XLSX.utils.json_to_sheet(stRows);
    XLSX.utils.book_append_sheet(wb, wsSt, "KetQuaHocSinh");

    const safeClassName = (data.class?.className || "Lop").replace(/[^\w.-]+/g, "_");
    XLSX.writeFile(wb, `TongHop_MonHoc_CTQT_${safeClassName}_HK${semester}.xlsx`);
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-14 text-center space-y-2.5">
        <div className="w-7 h-7 border-2 border-[#00736E] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">
          Đang tổng hợp kết quả các môn học CTQT theo lớp...
        </p>
      </div>
    );
  }

  if (!data || students.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-14 text-center space-y-2">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">
          Chưa có dữ liệu điểm CTQT cho lớp này ở Học kỳ {semester}
        </p>
        <p className="text-xs text-slate-500">
          Vui lòng chọn lớp khác hoặc kiểm tra tiến độ nhập điểm của giáo viên bộ môn.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. UNIFIED ACADEMIC LEDGER STRIP */}
      <div className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#003B3A] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#F1F5F9]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#003B3A]">
                Tổng hợp môn học CTQT · Lớp {data.class?.className}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                Học kỳ {semester}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {data.config?.levelNameVi}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {mode === "gvcn"
                ? "Theo dõi toàn cảnh kết quả học tập, tỷ lệ hoàn thành nhập điểm và nhận xét song ngữ các môn CTQT của lớp chủ nhiệm."
                : "Báo cáo phân tích kết quả từng môn học, phổ điểm và bảng điểm tóm tắt toàn lớp theo chương trình quốc tế."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportSummaryExcel}
              className="text-xs font-semibold px-3.5 py-2 bg-white hover:bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#00736E]" />
              Xuất Excel tổng hợp
            </button>

            {onExportPdf && (
              <button
                type="button"
                onClick={() => onExportPdf()}
                disabled={generatingPdf}
                className="text-xs font-semibold px-3.5 py-2 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#5EEAD4]" />
                {generatingPdf ? "Đang xuất PDF..." : "Xuất Report Card lớp"}
              </button>
            )}
          </div>
        </div>

        {/* Ledger metrics strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#F1F5F9] bg-[#F8FAFC]/60 tabular-nums">
          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500 font-medium">Sĩ số lớp</div>
            <div className="text-lg font-bold text-[#003B3A] mt-0.5 flex items-baseline gap-1.5">
              {classSummary.totalStudents}
              <span className="text-xs font-normal text-slate-500">học sinh</span>
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500 font-medium">Số môn CTQT</div>
            <div className="text-lg font-bold text-[#003B3A] mt-0.5 flex items-baseline gap-1.5">
              {classSummary.totalSubjects}
              <span className="text-xs font-normal text-slate-500">
                ({classSummary.approvedSubjects} đã duyệt)
              </span>
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500 font-medium">Tiến độ nhập điểm</div>
            <div className="text-lg font-bold text-[#00736E] mt-0.5 flex items-center gap-2">
              <span>{classSummary.completionPct}%</span>
              <div className="flex-1 max-w-[72px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#008B85] rounded-full"
                  style={{ width: `${classSummary.completionPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500 font-medium">Điểm TB chung lớp</div>
            <div className="text-lg font-bold text-[#003B3A] mt-0.5">
              {classSummary.classAvg !== null ? classSummary.classAvg.toFixed(1) : "—"}
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500 font-medium">HS cần lưu ý (&lt;65)</div>
            <div
              className={`text-lg font-bold mt-0.5 ${
                classSummary.attentionCount > 0 ? "text-[#E11D48]" : "text-[#059669]"
              }`}
            >
              {classSummary.attentionCount}
              <span className="text-xs font-normal text-slate-500 ml-1">học sinh</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUBJECT PERFORMANCE & COMPLETION TABLE (SKY-LINE ACADEMIC LEDGER) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00736E]" />
            <h3 className="text-sm font-bold text-[#003B3A]">
              1. Thống kê chất lượng & tiến độ theo từng môn học
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" /> Xuất sắc (≥90)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#008B85]" /> Tốt (80–89)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#D97706]" /> Khá (65–79)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#E11D48]" /> Cần hỗ trợ (&lt;65)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse tabular-nums">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-white">Môn học</th>
                <th className="py-3 px-3 text-teal-100">Giáo viên phụ trách</th>
                <th className="py-3 px-3 text-teal-100 text-center">Tiến độ nhập điểm</th>
                <th className="py-3 px-3 text-[#5EEAD4] text-center">Điểm TB lớp</th>
                <th className="py-3 px-3 text-teal-100 text-center">Cao nhất / Thấp nhất</th>
                <th className="py-3 px-3 text-teal-100 min-w-[200px]">Phân bố mức điểm</th>
                <th className="py-3 px-3 text-teal-100 text-center">Nhận xét (EN / VI)</th>
                <th className="py-3 px-3 text-[#5EEAD4] text-center">Trạng thái</th>
                {onOpenSubjectGradebook && (
                  <th className="py-3 px-3 text-white text-right">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {subjectStats.map(stat => {
                const badge = getReviewBadge(stat.reviewStatus);
                const totalScored =
                  stat.tierExcellent + stat.tierGood + stat.tierAverage + stat.tierSupport;

                return (
                  <tr
                    key={stat.subject.code}
                    className="transition-colors align-middle hover:bg-[#F8FAFC]"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                          {stat.subject.code}
                        </span>
                        <div>
                          <div className="font-semibold text-[#003B3A]">
                            {stat.subject.nameVi}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {stat.subject.nameEn}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                      {stat.teacherName || (
                        <span className="text-slate-400 italic font-normal">
                          Chưa phân công
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center gap-1 min-w-[96px]">
                        <span className="font-semibold text-slate-700">
                          {stat.gradedCount}/{stat.totalStudents} ({stat.completionRate}%)
                        </span>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stat.completionRate >= 100
                                ? "bg-[#059669]"
                                : stat.completionRate > 0
                                ? "bg-[#008B85]"
                                : "bg-slate-300"
                            }`}
                            style={{ width: `${stat.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {stat.subject.isQualitative ? (
                        <span className="text-[11px] text-slate-500 italic">Định tính</span>
                      ) : stat.avg !== null ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg border font-bold ${getScoreBadgeClass(
                            stat.avg,
                            stat.isIelts
                          )}`}
                        >
                          {stat.avg.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center text-slate-600 whitespace-nowrap">
                      {stat.subject.isQualitative || stat.max === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span>
                          <strong className="text-[#059669]">{stat.max}</strong>
                          <span className="text-slate-300 mx-1">/</span>
                          <strong
                            className={
                              (stat.isIelts ? (stat.min ?? 0) < 5 : (stat.min ?? 0) < 65)
                                ? "text-[#E11D48]"
                                : "text-slate-700"
                            }
                          >
                            {stat.min}
                          </strong>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {stat.subject.isQualitative ? (
                        <span className="text-[11px] text-slate-500">
                          Đánh giá nhận xét song ngữ
                        </span>
                      ) : totalScored === 0 ? (
                        <span className="text-[11px] text-slate-400">Chưa có dữ liệu điểm</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100">
                            {stat.tierExcellent > 0 && (
                              <div
                                className="bg-[#059669]"
                                style={{
                                  width: `${(stat.tierExcellent / totalScored) * 100}%`,
                                }}
                                title={`Xuất sắc: ${stat.tierExcellent} HS`}
                              />
                            )}
                            {stat.tierGood > 0 && (
                              <div
                                className="bg-[#008B85]"
                                style={{ width: `${(stat.tierGood / totalScored) * 100}%` }}
                                title={`Tốt: ${stat.tierGood} HS`}
                              />
                            )}
                            {stat.tierAverage > 0 && (
                              <div
                                className="bg-[#D97706]"
                                style={{
                                  width: `${(stat.tierAverage / totalScored) * 100}%`,
                                }}
                                title={`Khá: ${stat.tierAverage} HS`}
                              />
                            )}
                            {stat.tierSupport > 0 && (
                              <div
                                className="bg-[#E11D48]"
                                style={{
                                  width: `${(stat.tierSupport / totalScored) * 100}%`,
                                }}
                                title={`Cần hỗ trợ: ${stat.tierSupport} HS`}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-600">
                            <span className="text-[#059669] font-semibold">
                              {stat.tierExcellent}
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[#00736E] font-semibold">{stat.tierGood}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[#D97706] font-semibold">
                              {stat.tierAverage}
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[#E11D48] font-semibold">
                              {stat.tierSupport}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap text-slate-600">
                      <span className="font-semibold text-[#003B3A]">{stat.commentEnCount}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="font-semibold text-[#00736E]">{stat.commentViCount}</span>
                      <span className="text-slate-400 text-[11px]"> ({stat.totalStudents})</span>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    {onOpenSubjectGradebook && (
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenSubjectGradebook(stat.subject.code)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] hover:bg-teal-100 text-[#003B3A] border border-teal-200 transition-colors cursor-pointer"
                        >
                          Sổ môn
                          <ArrowUpRight className="w-3 h-3 text-[#00736E]" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. STUDENT × SUBJECT SUMMARY LEDGER */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00736E]" />
            <h3 className="text-sm font-bold text-[#003B3A]">
              2. Bảng tổng hợp kết quả các môn theo học sinh ({filteredStudentRows.length}/
              {students.length} HS)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, mã HS, English name..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A19A]/30 focus:border-[#008B85] w-56"
              />
            </div>

            {/* Subject filter */}
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-[#003B3A] focus:outline-[#008B85]"
            >
              <option value="ALL">Tất cả môn ({subjects.length})</option>
              {subjects.map(s => (
                <option key={s.code} value={s.code}>
                  {s.nameVi} ({s.code})
                </option>
              ))}
            </select>

            {/* Student status segmented filter */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-[#E2E8F0]">
              {(
                [
                  { id: "ALL", label: "Tất cả" },
                  { id: "COMPLETE", label: "Đủ môn" },
                  { id: "INCOMPLETE", label: "Còn thiếu" },
                  { id: "NEEDS_ATTENTION", label: "Cần lưu ý" },
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStudentFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    studentFilter === opt.id
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "text-slate-600 hover:text-[#003B3A]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs text-left border-collapse tabular-nums">
            <thead className="bg-[#003B3A] border-b border-[#003B3A] sticky top-0 z-10">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-white text-center w-12">STT</th>
                <th className="py-3 px-3 text-white text-center w-28">Mã HS</th>
                <th className="py-3 px-3 text-white min-w-[165px]">Họ và tên</th>
                <th className="py-3 px-3 text-[#5EEAD4] min-w-[115px]">English Name</th>

                {visibleSubjects.map(sub => (
                  <th key={sub.code} className="py-3 px-3 text-teal-100 text-center min-w-[105px]">
                    <div>{sub.nameVi}</div>
                    <div className="text-[10px] font-normal text-teal-200/80">{sub.code}</div>
                  </th>
                ))}

                <th className="py-3 px-3 text-[#5EEAD4] text-center min-w-[90px]">ĐTB chung</th>
                <th className="py-3 px-3 text-teal-100 text-center min-w-[130px]">
                  6 Năng lực cốt lõi
                </th>
                <th className="py-3 px-3 text-white text-right min-w-[105px]">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filteredStudentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleSubjects.length + 7}
                    className="py-10 text-center text-slate-500 text-xs"
                  >
                    Không tìm thấy học sinh phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredStudentRows.map(row => (
                  <tr
                    key={row.student.id}
                    className={`transition-colors align-middle ${
                      row.needsAttention
                        ? "bg-rose-50/30 hover:bg-rose-50/60"
                        : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <td className="py-3 px-3 text-center text-slate-500 font-semibold">
                      {row.index}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {row.student.studentCode}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#003B3A] whitespace-nowrap">
                      {row.student.studentName}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#00736E] whitespace-nowrap">
                      {row.student.englishName || "—"}
                    </td>

                    {visibleSubjects.map(sub => {
                      const cell = row.perSubject[sub.code];
                      if (!cell) {
                        return (
                          <td key={sub.code} className="py-3 px-3 text-center text-slate-400">
                            —
                          </td>
                        );
                      }

                      if (sub.isQualitative) {
                        return (
                          <td key={sub.code} className="py-3 px-3 text-center">
                            {cell.isFilled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Đã NX
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Chưa có</span>
                            )}
                          </td>
                        );
                      }

                      return (
                        <td key={sub.code} className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span
                              className={`inline-block min-w-[44px] px-2 py-0.5 rounded-lg border font-bold text-xs ${getScoreBadgeClass(
                                cell.score,
                                cell.isIelts
                              )}`}
                            >
                              {cell.score !== null ? cell.score : "—"}
                            </span>
                            {(cell.hasCommentEn || cell.hasCommentVi) && (
                              <span className="text-[10px] text-slate-400">
                                {cell.hasCommentEn && cell.hasCommentVi
                                  ? "EN·VI"
                                  : cell.hasCommentEn
                                  ? "EN"
                                  : "VI"}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-3 px-3 text-center">
                      {row.overallAvg !== null ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg border font-bold ${getScoreBadgeClass(
                            row.overallAvg,
                            false
                          )}`}
                        >
                          {row.overallAvg.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        {CORE_COMPETENCIES_DEF.map(cc => {
                          const rating = row.competency?.[cc.key] || "";
                          return (
                            <span
                              key={cc.key}
                              title={`${cc.labelVi} (${cc.labelEn}): ${rating || "Chưa đánh giá"}`}
                              className={`w-5 h-5 rounded inline-flex items-center justify-center text-[10px] font-bold border ${
                                rating
                                  ? getCompetencyColor(rating)
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}
                            >
                              {rating || "·"}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailStudentId(row.student.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-[#F0FDFA] text-[#003B3A] border border-[#E2E8F0] hover:border-[#008B85] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#00736E]" />
                          Chi tiết
                        </button>
                        {onExportPdf && (
                          <button
                            type="button"
                            onClick={() => onExportPdf(row.student.id)}
                            disabled={generatingPdf}
                            title="Xuất Report Card PDF cá nhân"
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-[#F0FDFA] text-[#003B3A] border border-[#E2E8F0] transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#00736E]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. STUDENT DETAIL MODAL (FULL SCORES + BILINGUAL COMMENTS + COMPETENCIES) */}
      {detailRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>{detailRow.student.studentName}</span>
                  {detailRow.student.englishName && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/15 text-[#5EEAD4]">
                      {detailRow.student.englishName}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-teal-100 mt-0.5 tabular-nums">
                  Mã HS: {detailRow.student.studentCode} · Lớp {data.class?.className} · Học kỳ{" "}
                  {semester}
                  {detailRow.overallAvg !== null
                    ? ` · ĐTB chung CTQT: ${detailRow.overallAvg.toFixed(1)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onExportPdf && (
                  <button
                    type="button"
                    onClick={() => onExportPdf(detailRow.student.id)}
                    disabled={generatingPdf}
                    className="text-xs font-semibold px-3 py-1.5 bg-[#00736E] hover:bg-[#008B85] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Xuất Report Card
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailStudentId(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 tabular-nums">
              {/* Subject Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#00736E]" />
                  Chi tiết điểm số & nhận xét song ngữ các môn CTQT
                </h4>

                <div className="space-y-3">
                  {subjects.map(sub => {
                    const cell = detailRow.perSubject[sub.code];
                    const g = cell?.raw || {};
                    const progArr = parseProgressScores(g.progressScores);

                    return (
                      <div
                        key={sub.code}
                        className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white"
                      >
                        <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#003B3A] text-white">
                              {sub.code}
                            </span>
                            <span className="text-xs font-bold text-[#003B3A]">
                              {sub.nameVi} ({sub.nameEn})
                            </span>
                          </div>
                          {!sub.isQualitative && (
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${getScoreBadgeClass(
                                cell?.score ?? null,
                                cell?.isIelts
                              )}`}
                            >
                              {cell?.isIelts ? "IELTS Band: " : "Điểm tổng hợp: "}
                              {cell?.score !== null && cell?.score !== undefined
                                ? cell.score
                                : "—"}
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Score columns breakdown */}
                          {!sub.isQualitative && sub.scoreColumns.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {sub.scoreColumns.map(col => {
                                let val: any = "—";
                                if (col.key.startsWith("progressScores_")) {
                                  const pIdx = parseInt(col.key.split("_")[1], 10);
                                  val =
                                    progArr[pIdx] !== null && progArr[pIdx] !== undefined
                                      ? progArr[pIdx]
                                      : "—";
                                } else if (col.key === "midTermScore") {
                                  val = g.midTermScore ?? "—";
                                } else if (col.key === "endTermScore") {
                                  val = g.endTermScore ?? "—";
                                } else if (col.key === "gpaScore") {
                                  val = g.gpaScore ?? "—";
                                } else if (col.key === "ieltsScore") {
                                  val = g.ieltsScore ?? "—";
                                }
                                return (
                                  <div
                                    key={col.key}
                                    className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-center min-w-[84px]"
                                  >
                                    <div className="text-[10px] text-slate-500 font-medium">
                                      {col.labelVi}
                                    </div>
                                    <div className="text-xs font-bold text-[#003B3A] mt-0.5">
                                      {val}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Bilingual Comments */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]">
                              <div className="text-[11px] font-semibold text-[#00736E] mb-1">
                                Nhận xét tiếng Anh (Comment EN)
                              </div>
                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {g.commentEn || (
                                  <span className="text-slate-400 italic">Chưa có nhận xét</span>
                                )}
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]">
                              <div className="text-[11px] font-semibold text-[#00736E] mb-1">
                                Nhận xét tiếng Việt (Nhận xét VI)
                              </div>
                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {g.commentVi || (
                                  <span className="text-slate-400 italic">Chưa có nhận xét</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Core Competencies */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#00736E]" />
                  Đánh giá 6 Năng lực cốt lõi (Core Competencies)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {CORE_COMPETENCIES_DEF.map(cc => {
                    const code = detailRow.competency?.[cc.key] || "";
                    const meta = CORE_COMPETENCY_RATINGS.find(r => r.code === code);
                    return (
                      <div
                        key={cc.key}
                        className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#003B3A]">{cc.labelVi}</div>
                          <div className="text-[10px] text-slate-500">{cc.labelEn}</div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            code
                              ? getCompetencyColor(code)
                              : "bg-white text-slate-400 border-slate-200"
                          }`}
                          title={meta ? `${meta.labelVi} (${meta.labelEn})` : "Chưa đánh giá"}
                        >
                          {code || "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
