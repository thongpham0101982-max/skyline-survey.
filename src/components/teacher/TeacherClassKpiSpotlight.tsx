"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  ChevronRight,
  Filter,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  Info,
  Layers,
  MessageSquareHeart,
  RefreshCw,
  Sparkles,
  Users
} from "lucide-react";

interface ClassItem {
  id: string;
  className: string;
  grade: string;
  studentCount: number;
  type: "HOMEROOM" | "SUBJECT";
  subjectName?: string | null;
}

interface ParentFeedbackKpi {
  hasData: boolean;
  statusLabel: string;
  reason: string;
  periodName: string | null;
  periodCode: string | null;
  npsScore: number | null;
  averageSatisfactionScore: number | null;
  submittedCount: number;
  totalInvited: number;
  responseRatePercent: number | null;
  promotersCount: number;
  detractorsCount: number;
  passivesCount: number;
  detailUrl: string;
}

interface StudentSurveyKpi {
  hasData: boolean;
  statusLabel: string;
  surveyName: string;
  frameworkCode: string;
  note: string;
  reason: string;
  periodName: string | null;
  npsScore: number | null;
  responsesCount: number;
  totalStudents: number;
  progressPercent: number | null;
  detailUrl: string;
}

interface ClassKpiData {
  success: boolean;
  teacher: {
    id: string;
    name: string;
    isGVCN: boolean;
    isGVBM: boolean;
    isDualRole: boolean;
  };
  academicYear: {
    id: string;
    name: string;
  };
  scope: "HOMEROOM" | "SUBJECT" | "ALL";
  classes: ClassItem[];
  selectedClass: ClassItem | null;
  parentFeedbackKpi: ParentFeedbackKpi;
  studentSurveyKpi: StudentSurveyKpi;
}

export function TeacherClassKpiSpotlight() {
  const [data, setData] = useState<ClassKpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedScope, setSelectedScope] = useState<"HOMEROOM" | "SUBJECT">("HOMEROOM");

  const loadKpis = async (scopeParam?: string, classIdParam?: string, isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const yearId =
        typeof window !== "undefined"
          ? localStorage.getItem("selectedAcademicYear") || localStorage.getItem("academicYearId") || ""
          : "";
      const params = new URLSearchParams();
      if (yearId) params.set("academicYearId", yearId);
      if (scopeParam) params.set("scope", scopeParam);
      if (classIdParam) params.set("classId", classIdParam);

      const res = await fetch(`/api/teacher/class-kpi?${params.toString()}`);
      if (res.ok) {
        const json: ClassKpiData = await res.json();
        setData(json);
        if (json.selectedClass?.id) {
          setSelectedClassId(json.selectedClass.id);
        }
        if (json.scope === "HOMEROOM" || json.scope === "SUBJECT") {
          setSelectedScope(json.scope);
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải KPIs lớp phụ trách:", err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    loadKpis();
  }, []);

  const handleScopeChange = (newScope: "HOMEROOM" | "SUBJECT") => {
    setSelectedScope(newScope);
    loadKpis(newScope, undefined, true);
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    loadKpis(selectedScope, classId, true);
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data || !data.classes || data.classes.length === 0) {
    return null; // Không được phân công lớp phụ trách thì không hiển thị
  }

  const { isDualRole, isGVCN, isGVBM } = data.teacher;
  const currentClass = data.selectedClass || data.classes[0];
  const parentKpi = data.parentFeedbackKpi;
  const studentKpi = data.studentSurveyKpi;

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs border-l-4 border-l-[#003B3A]">
      {/* Header bar: Tiêu đề khối & Bộ lọc ngữ cảnh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#003B3A] text-[#5EEAD4] flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#003B3A] tracking-tight truncate">
              Chỉ số chất lượng lớp phụ trách
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              Tín nhiệm Phụ huynh & Khảo sát Tự hào Học sinh Sky-Line
            </p>
          </div>
        </div>

        {/* Filter Controls: Kiêm nhiệm role switch & Class Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDualRole && (
            <div className="inline-flex items-center bg-white p-0.5 rounded-xl border border-[#E2E8F0] text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => handleScopeChange("HOMEROOM")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedScope === "HOMEROOM"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Lớp chủ nhiệm
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange("SUBJECT")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedScope === "SUBJECT"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Lớp giảng dạy
              </button>
            </div>
          )}

          {data.classes.length > 1 ? (
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={handleClassChange}
                aria-label="Chọn lớp phụ trách"
                className="bg-white border border-[#E2E8F0] text-[#003B3A] text-xs font-semibold rounded-xl px-3 py-1.5 pr-7 focus:ring-2 focus:ring-[#00A19A]/30 focus:border-[#00A19A] outline-none cursor-pointer appearance-none tabular-nums"
              >
                {data.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.type === "HOMEROOM" ? "CN: " : "BM: "}
                    {cls.className} ({cls.studentCount} HS)
                    {cls.subjectName ? ` - ${cls.subjectName}` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <Filter className="w-3 h-3" />
              </div>
            </div>
          ) : (
            <span className="text-xs font-semibold text-[#003B3A] bg-white px-3 py-1.5 rounded-xl border border-[#E2E8F0] flex items-center gap-1.5 tabular-nums">
              <GraduationCap className="w-3.5 h-3.5 text-[#00A19A]" />
              {currentClass.className} ({currentClass.studentCount} HS)
            </span>
          )}

          <button
            type="button"
            onClick={() => loadKpis(selectedScope, selectedClassId, true)}
            disabled={refreshing}
            className="p-1.5 text-slate-500 hover:text-[#003B3A] bg-white hover:bg-[#F0FDFA] rounded-xl transition-colors border border-[#E2E8F0] cursor-pointer"
            title="Cập nhật số liệu mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#00A19A]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2 Cột Sổ cái: Tín nhiệm PHHS & Khảo sát Học sinh */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] bg-white">
        {/* CỘT A: TÍN NHIỆM PHHS */}
        <div className="p-4 sm:px-5 flex flex-col justify-between gap-3">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] text-[#00736E] flex items-center justify-center shrink-0">
                  <MessageSquareHeart className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[#003B3A]">
                    Tín nhiệm Phụ huynh
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {parentKpi.periodName || "Khảo sát ý kiến Phụ huynh"}
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border shrink-0 ${
                  parentKpi.hasData
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-500 border-[#E2E8F0]"
                }`}
              >
                {parentKpi.hasData ? "Đã có kết quả" : "Chưa có dữ liệu"}
              </span>
            </div>

            {parentKpi.hasData ? (
              <div className="grid grid-cols-3 divide-x divide-[#E2E8F0] border border-[#E2E8F0] bg-[#F8FAFC] rounded-xl py-2.5 px-1 tabular-nums">
                <div className="px-3">
                  <span className="text-[11px] text-slate-500 block">Điểm NPS</span>
                  <span className="text-lg font-bold text-[#003B3A]">
                    {parentKpi.npsScore !== null ? `${parentKpi.npsScore > 0 ? "+" : ""}${parentKpi.npsScore}` : "—"}
                  </span>
                </div>
                <div className="px-3">
                  <span className="text-[11px] text-slate-500 block">Phản hồi</span>
                  <span className="text-lg font-bold text-[#003B3A]">
                    {parentKpi.submittedCount}
                    <span className="text-xs font-medium text-slate-400">/{parentKpi.totalInvited}</span>
                  </span>
                </div>
                <div className="px-3">
                  <span className="text-[11px] text-slate-500 block">Tỷ lệ nộp</span>
                  <span className="text-lg font-bold text-[#00736E]">
                    {parentKpi.responseRatePercent !== null ? `${parentKpi.responseRatePercent}%` : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 px-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-2.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  {parentKpi.reason || "Kỳ khảo sát PHHS chưa mở hoặc lớp chưa ghi nhận lượt phản hồi."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2.5 flex items-center justify-between text-xs border-t border-[#F1F5F9]">
            <span className="text-[11px] text-slate-500">
              Phạm vi: {currentClass.type === "HOMEROOM" ? "Lớp chủ nhiệm" : "Lớp giảng dạy"}
            </span>
            <Link
              href={parentKpi.detailUrl}
              className="inline-flex items-center gap-1 font-semibold text-[#00736E] hover:text-[#003B3A] transition-colors"
            >
              <span>Xem chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CỘT B: KHẢO SÁT HỌC SINH */}
        <div className="p-4 sm:px-5 flex flex-col justify-between gap-3">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 text-[#D97706] flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-[#003B3A]">
                      Khảo sát Học sinh
                    </h3>
                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.2 rounded tabular-nums">
                      {studentKpi.frameworkCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {studentKpi.surveyName}
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border shrink-0 ${
                  studentKpi.hasData
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-500 border-[#E2E8F0]"
                }`}
              >
                {studentKpi.hasData ? "Đã có kết quả" : "Chưa có dữ liệu"}
              </span>
            </div>

            {studentKpi.hasData ? (
              <div className="grid grid-cols-3 divide-x divide-[#E2E8F0] border border-[#E2E8F0] bg-[#F8FAFC] rounded-xl py-2.5 px-1 tabular-nums">
                <div className="px-3">
                  <span className="text-[11px] text-slate-500 block">NPS Tự hào</span>
                  <span className="text-lg font-bold text-[#D97706]">
                    {studentKpi.npsScore !== null ? `${studentKpi.npsScore > 0 ? "+" : ""}${studentKpi.npsScore}` : "—"}
                  </span>
                </div>
                <div className="px-3">
                  <span className="text-[11px] text-slate-500 block">Phản hồi</span>
                  <span className="text-lg font-bold text-[#003B3A]">
                    {studentKpi.responsesCount}
                    <span className="text-xs font-medium text-slate-400">/{studentKpi.totalStudents}</span>
                  </span>
                </div>
                <div className="px-3">
                  <span className="text-[11px] text-slate-500 block">Hoàn thành</span>
                  <span className="text-lg font-bold text-[#00736E]">
                    {studentKpi.progressPercent !== null ? `${studentKpi.progressPercent}%` : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 px-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-2.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  {studentKpi.reason || "Kỳ khảo sát Tự hào Học sinh sẽ hiển thị khi có kết quả công bố."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2.5 flex items-center justify-between gap-3 text-xs border-t border-[#F1F5F9]">
            <span className="text-[11px] text-slate-500 truncate" title={studentKpi.note}>
              {studentKpi.note || "Chỉ số trải nghiệm học đường — không dùng đánh giá cá nhân GV."}
            </span>
            <Link
              href={studentKpi.detailUrl}
              className="inline-flex items-center gap-1 font-semibold text-[#00736E] hover:text-[#003B3A] transition-colors shrink-0"
            >
              <span>Xem báo cáo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
