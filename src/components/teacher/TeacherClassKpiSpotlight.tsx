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
    <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 border-l-4 border-l-[#003B3A]">
      {/* Header bar: Tiêu đề khối & Bộ lọc ngữ cảnh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#003B3A]/10 text-[#003B3A] flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4 text-[#00A19A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                KPIs lớp phụ trách
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#00A19A]/15 text-[#00736E] border border-[#00A19A]/30">
                Thước đo thực tế
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Chỉ số tín nhiệm Phụ huynh và khảo sát Tự hào Học sinh Sky-Line
            </p>
          </div>
        </div>

        {/* Filter Controls: Kiêm nhiệm role switch & Class Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Giáo viên kiêm nhiệm: Tab chuyển đổi Chủ nhiệm / Bộ môn */}
          {isDualRole && (
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handleScopeChange("HOMEROOM")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedScope === "HOMEROOM"
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                Lớp chủ nhiệm
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange("SUBJECT")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedScope === "SUBJECT"
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                Lớp giảng dạy
              </button>
            </div>
          )}

          {/* Dropdown chọn lớp nếu có từ 2 lớp trở lên */}
          {data.classes.length > 1 ? (
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={handleClassChange}
                aria-label="Chọn lớp phụ trách"
                className="bg-slate-50 border border-slate-200/90 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 pr-7 focus:ring-2 focus:ring-[#00A19A] focus:border-transparent outline-none cursor-pointer appearance-none shadow-2xs"
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
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#00A19A]" />
              {currentClass.className} ({currentClass.studentCount} HS)
            </span>
          )}

          {/* Nút làm mới */}
          <button
            type="button"
            onClick={() => loadKpis(selectedScope, selectedClassId, true)}
            disabled={refreshing}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
            title="Cập nhật số liệu mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#00A19A]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2 Thẻ Trọng tâm: Tín nhiệm PHHS & Khảo sát Học sinh */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* THẺ A: TÍN NHIỆM PHHS */}
        <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-[#00A19A]/40 shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#00A19A]">
                  <MessageSquareHeart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    Tín nhiệm PHHS
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {parentKpi.periodName || "Khảo sát ý kiến Phụ huynh"}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  parentKpi.hasData
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {parentKpi.hasData ? "Đã có kết quả" : "Chưa có kết quả"}
              </span>
            </div>

            {/* Nội dung kết quả số liệu */}
            {parentKpi.hasData ? (
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200/70 bg-white rounded-lg p-2.5">
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Điểm NPS</span>
                  <span className="text-lg font-black text-slate-900 tabular-nums">
                    {parentKpi.npsScore !== null ? `${parentKpi.npsScore > 0 ? "+" : ""}${parentKpi.npsScore}` : "—"}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-medium">thang đo chuẩn</span>
                </div>

                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Số phản hồi</span>
                  <span className="text-lg font-black text-[#003B3A] tabular-nums">
                    {parentKpi.submittedCount}
                  </span>
                  <span className="text-[9px] text-slate-500 block font-medium tabular-nums">
                    / {parentKpi.totalInvited} PHHS
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Tỷ lệ tham gia</span>
                  <span className="text-lg font-black text-[#00A19A] tabular-nums">
                    {parentKpi.responseRatePercent !== null ? `${parentKpi.responseRatePercent}%` : "—"}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-medium">tiến độ nộp</span>
                </div>
              </div>
            ) : (
              <div className="py-4 px-3 bg-white/70 border border-dashed border-slate-200 rounded-lg text-center space-y-1">
                <span className="text-xs font-semibold text-slate-600 block">
                  Chưa có dữ liệu phản hồi khảo sát
                </span>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {parentKpi.reason || "Kỳ khảo sát PHHS chưa mở hoặc lớp chưa ghi nhận lượt phản hồi nào."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-2 flex items-center justify-between text-xs border-t border-slate-200/60">
            <span className="text-[11px] text-slate-400 font-medium">
              Đối tượng: {currentClass.type === "HOMEROOM" ? "Lớp chủ nhiệm" : "Lớp giảng dạy"}
            </span>
            <Link
              href={parentKpi.detailUrl}
              className="inline-flex items-center gap-1 font-bold text-[#00A19A] hover:text-[#003B3A] transition-colors"
            >
              <span>Xem chi tiết khảo sát</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* THẺ B: KHẢO SÁT HỌC SINH */}
        <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-[#00A19A]/40 shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                      Khảo sát Học sinh
                    </h3>
                    <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                      {studentKpi.frameworkCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {studentKpi.surveyName}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  studentKpi.hasData
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {studentKpi.hasData ? "Đã có kết quả" : "Chưa có kết quả"}
              </span>
            </div>

            {/* Nội dung kết quả số liệu */}
            {studentKpi.hasData ? (
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200/70 bg-white rounded-lg p-2.5">
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">NPS Tự hào</span>
                  <span className="text-lg font-black text-amber-700 tabular-nums">
                    {studentKpi.npsScore !== null ? `${studentKpi.npsScore > 0 ? "+" : ""}${studentKpi.npsScore}` : "—"}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-medium">chỉ số trải nghiệm</span>
                </div>

                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Lượt phản hồi</span>
                  <span className="text-lg font-black text-[#003B3A] tabular-nums">
                    {studentKpi.responsesCount}
                  </span>
                  <span className="text-[9px] text-slate-500 block font-medium tabular-nums">
                    / {studentKpi.totalStudents} HS
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Tiến độ hoàn thành</span>
                  <span className="text-lg font-black text-[#00A19A] tabular-nums">
                    {studentKpi.progressPercent !== null ? `${studentKpi.progressPercent}%` : "—"}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-medium">đã tham gia</span>
                </div>
              </div>
            ) : (
              <div className="py-4 px-3 bg-white/70 border border-dashed border-slate-200 rounded-lg text-center space-y-1">
                <span className="text-xs font-semibold text-slate-600 block">
                  Chưa có đợt khảo sát nào được công bố
                </span>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {studentKpi.reason || "Kỳ khảo sát Tự hào Học sinh (IP2.1) sẽ được tự động hiển thị khi mở đợt khảo sát."}
                </p>
              </div>
            )}

            {/* Ghi chú bảo mật & tôn trọng bản chất khảo sát */}
            <div className="flex items-start gap-1.5 text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="leading-tight">
                {studentKpi.note}
              </span>
            </div>
          </div>

          <div className="pt-3 mt-2 flex items-center justify-between text-xs border-t border-slate-200/60">
            <span className="text-[11px] text-slate-400 font-medium">
              Chỉ số tự hào & trải nghiệm học sinh
            </span>
            <Link
              href={studentKpi.detailUrl}
              className="inline-flex items-center gap-1 font-bold text-[#00A19A] hover:text-[#003B3A] transition-colors"
            >
              <span>Xem báo cáo chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
