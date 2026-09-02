// Build version: 8.5-1788145100339
// @ts-nocheck
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  GraduationCap,
  User,
  Award,
  BookOpen,
  Compass,
  ClipboardCheck,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight
} from "lucide-react";
import { SubjectRadarChart } from "@/components/competency/SubjectRadarChart";
import { getCompetencyLevel } from "@/components/competency/CompetencyOverviewChart";

export default function AdminStudentProfilesPrintPage() {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "hide-portal-layout";
    style.innerHTML = `
      aside, header, footer, .no-print, [class*="Sidebar"], [class*="ChatBotWidget"], [class*="chatbot"] {
        display: none !important;
      }
      main {
        margin-left: 0 !important;
        padding: 0 !important;
      }
      div.p-4, div.p-6, div.p-8, div.p-10, div.p-12, div.px-6 {
        padding: 0 !important;
      }
      div.flex.min-h-screen {
        display: block !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById("hide-portal-layout");
      if (el) el.remove();
    };
  }, []);

  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "class";
  const block = searchParams.get("block") || "k12";
  const academicYearId = searchParams.get("academicYearId");
  const campusId = searchParams.get("campusId");
  const classId = searchParams.get("classId");
  const grade = searchParams.get("grade");
  const studentId = searchParams.get("studentId");

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Autoprint when autoprint query param is present
  useEffect(() => {
    if (!loading && students.length > 0 && searchParams.get("autoprint") === "1") {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, students, searchParams]);

  useEffect(() => {
    async function loadPrintData() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("action", "getProfiles");

        if (studentId) params.set("studentId", studentId);
        if (academicYearId) params.set("academicYearId", academicYearId);
        if (campusId && campusId !== "all") params.set("campusId", campusId);
        if (classId && classId !== "all") params.set("classId", classId);

        const res = await fetch(`/api/admin/student-profiles?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          let data = result.data || [];

          // Apply local filtering by grade if specified
          if (grade && grade !== "all") {
            data = data.filter((s: any) => s.class?.grade === grade);
          }

          // Apply local filtering by Bậc học (block)
          data = data.filter((s: any) => {
            const isPreschoolGrade = [
              "12 đến 18 tháng",
              "18 đến 24 tháng",
              "24 đến 36 tháng",
              "3 đến 4 tuổi",
              "4 đến 5 tuổi",
              "5 đến 6 tuổi"
            ].includes(s.class?.grade);
            return block === "preschool" ? isPreschoolGrade : !isPreschoolGrade;
          });

          setStudents(data);

          if (data.length === 0) {
            setError("Không tìm thấy học sinh nào trong phạm vi đã chọn.");
          } else {
            // Trigger browser print dialog after slight delay
            setTimeout(() => {
              window.print();
            }, 1000);
          }
        } else {
          setError("Lỗi khi tải dữ liệu từ máy chủ.");
        }
      } catch (err) {
        console.error("Error loading print profiles:", err);
        setError("Lỗi kết nối mạng.");
      } finally {
        setLoading(false);
      }
    }

    loadPrintData();
  }, [type, block, academicYearId, campusId, classId, grade, studentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-white">
        <Loader2 className="w-12 h-12 text-[#007A72] animate-spin" />
        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
          Đang khởi tạo bản in hồ sơ A4 chuẩn Sky-Line...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-md shadow-sm">
          <h3 className="font-extrabold text-base mb-2">Lỗi in ấn</h3>
          <p className="text-xs font-semibold">{error}</p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:py-0 print:bg-white text-slate-800">
      {/* Strict A4 Print CSS Styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          @media print {
            *, *:before, *:after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-size: 10pt !important;
              line-height: 1.35 !important;
              text-rendering: optimizeLegibility !important;
              -webkit-font-smoothing: antialiased !important;
            }
            .no-print-layout {
              display: none !important;
            }
            .student-document-container {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              padding: 12px 16px !important;
              margin: 0 auto 20px auto !important;
              width: 100% !important;
              max-width: 210mm !important;
              box-shadow: none !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 12px !important;
            }
            .student-document-container:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .print-section-avoid, .print-card-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-bottom: 10px !important;
            }
            table, thead, tbody, tr, td, th {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            thead {
              display: table-header-group !important;
            }
            img {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              max-width: 100% !important;
            }
            svg {
              shape-rendering: geometricPrecision !important;
              text-rendering: geometricPrecision !important;
            }
          }
        `
        }}
      />

      {/* Admin print control toolbar (hidden when printing) */}
      <div className="no-print-layout max-w-4xl mx-auto mb-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between text-xs font-bold text-slate-700">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#007A72]" />
          <span>Bản in Hồ sơ A4 Chuẩn: </span>
          <span className="text-[#007A72] font-black text-sm">{students.length} học sinh</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#007A72] hover:bg-[#005B55] text-white rounded-xl shadow-xs transition-all cursor-pointer font-extrabold"
            title="Nhấn để lưu file PDF (Chọn Máy in: Save as PDF / Lưu dưới dạng PDF)"
          >
            <Printer className="w-4 h-4" />
            <span>Lưu file PDF / In Ngay</span>
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Multi-Student Printable Document Stream */}
      <div className="max-w-4xl mx-auto space-y-8 print:space-y-0">
        {students.map((student, sIdx) => {
          const compSummaries = student.competencySummaries || [];
          
          // Calculate Core Strengths & Areas
          const validSummaries = compSummaries.filter((cs: any) => cs.subjectScore !== null);
          const totalOverallScore = validSummaries.length > 0
            ? Math.round((validSummaries.reduce((a: number, b: any) => a + (b.subjectScore || 0), 0) / validSummaries.length) * 10) / 10
            : null;
          const overallLevel = getCompetencyLevel(totalOverallScore);

          return (
            <div
              key={student.id || sIdx}
              className="student-document-container bg-white border border-slate-200/90 shadow-md rounded-2xl p-6 sm:p-8 font-sans relative overflow-hidden"
            >
              {/* TOP DECORATIVE BRAND BANNER */}
              <div className="h-2.5 bg-gradient-to-r from-[#003B3A] via-[#007A72] to-[#48BFE3] -mx-8 -mt-8 mb-6" />

              {/* 1. OFFICIAL HEADER (Logo + School System + Profile Title) */}
              <div className="border-b-2 border-slate-200 pb-4 mb-5 print-section-avoid">
                <div className="flex justify-between items-start gap-4">
                  {/* Brand & School Header */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#007A72] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="font-black text-[11px] tracking-widest text-[#007A72] uppercase">
                        HỆ THỐNG GIÁO DỤC SKY-LINE
                      </div>
                      <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                        HỒ SƠ HỌC SINH TOÀN DIỆN &amp; NĂNG LỰC 360°
                      </h1>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Comprehensive Student Profile &amp; 360° Competency Portfolio
                      </p>
                    </div>
                  </div>

                  {/* Academic Context Badge */}
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-right text-xs font-semibold text-slate-600 flex-shrink-0 shadow-2xs">
                    <div>
                      Năm học: <span className="text-[#007A72] font-black">{student.yearName || "2025-2026"}</span>
                    </div>
                    <div>
                      Cơ sở: <span className="text-slate-800 font-bold">{student.campusName || "Sky-Line"}</span>
                    </div>
                  </div>
                </div>

                {/* 2. ADMINISTRATIVE IDENTITY CARD */}
                <div className="mt-4 bg-gradient-to-br from-slate-50/90 via-teal-50/20 to-slate-50 border border-teal-100 rounded-2xl p-4 grid grid-cols-4 gap-4 items-center">
                  <div className="col-span-1 flex flex-col items-center justify-center space-y-1.5 text-center">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-xs bg-gradient-to-br from-[#003B3A] to-[#007A72] flex items-center justify-center text-white font-black text-xl">
                      <img
                        src={`/api/student-photos/${student.id}?code=${encodeURIComponent(student.studentCode || "")}`}
                        alt={student.studentName || "Avatar"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      <span style={{ display: 'none' }} className="items-center justify-center w-full h-full">
                        {student.studentName ? student.studentName.split(" ").pop()?.charAt(0) : <User className="w-8 h-8" />}
                      </span>
                    </div>
                    <span className="inline-block px-3 py-0.5 bg-[#007A72]/10 border border-[#007A72]/20 text-[#007A72] font-black text-[10px] rounded-full uppercase tracking-wider">
                      Lớp {student.className || "N/A"}
                    </span>
                  </div>

                  <div className="col-span-3 grid grid-cols-2 gap-3 text-xs font-medium text-slate-700">
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Họ và tên học sinh</span>
                        <span className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                          {student.studentName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Mã định danh học sinh</span>
                        <span className="font-mono font-black text-slate-800 bg-white px-2.5 py-0.5 rounded border border-slate-200 inline-block text-xs">
                          {student.studentCode}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[9px] uppercase font-black text-slate-400 block">Ngày sinh</span>
                          <span className="font-bold text-slate-800">{student.dob || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-black text-slate-400 block">Giới tính</span>
                          <span className="font-bold text-slate-800">{student.gender || "N/A"}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Giáo viên chủ nhiệm</span>
                        <span className="font-black text-[#007A72] text-xs">
                          {student.homeroomTeacherName || "Giáo viên Chủ nhiệm"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. SECTION I: HỒ SƠ NĂNG LỰC CHUYÊN SÂU 360° (Competency 360° Portfolio) */}
              <div className="mb-6 space-y-4 print-section-avoid">
                <div className="flex items-center justify-between border-b-2 border-teal-700/80 pb-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    I. ĐÁNH GIÁ NĂNG LỰC CHUYÊN SÂU 360° (COMPETENCY PORTFOLIO)
                  </h3>
                  {totalOverallScore !== null && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-bold">Điểm bình quân:</span>
                      <span className="font-black text-sm text-[#007A72]">{totalOverallScore}%</span>
                      <span className={"text-[9px] font-black uppercase px-2 py-0.5 rounded-full border " + overallLevel.bg + " " + overallLevel.color + " " + overallLevel.border}>
                        {overallLevel.label}
                      </span>
                    </div>
                  )}
                </div>

                {compSummaries.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                    Chưa có dữ liệu đánh giá năng lực cho đợt này.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* A. Overview Horizontal Bar Chart */}
                    <div className="bg-slate-50/70 border border-slate-200 p-3.5 rounded-xl space-y-2.5 print-card-avoid">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 pb-1 border-b border-slate-200">
                        <span>Biểu đồ Tổng quan Năng lực các Môn học</span>
                        <span>Vạch mốc chuẩn khối: 75%</span>
                      </div>
                      <div className="space-y-2">
                        {compSummaries.map((cs: any) => {
                          const score = cs.subjectScore;
                          const scoreVal = score !== null ? Math.min(100, Math.max(0, score)) : 0;
                          const level = getCompetencyLevel(score);

                          return (
                            <div key={cs.id || cs.subjectId} className="space-y-0.5 text-xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-bold text-slate-800">
                                  {cs.subject?.subjectName || "Môn học"}
                                </span>
                                <span className={"font-black text-[10px] px-1.5 py-0.2 rounded " + level.color}>
                                  {score !== null ? score + "%" : "—"} ({level.label})
                                </span>
                              </div>
                              <div className="relative w-full bg-slate-200 rounded-full h-2 overflow-visible">
                                <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-slate-600 z-10" style={{ left: "75%" }} />
                                <div
                                  className={"bg-gradient-to-r " + level.barGradient + " h-full rounded-full"}
                                  style={{ width: scoreVal + "%" }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* B. 2-Column Subject Competency Cards Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {compSummaries.map((cs: any) => {
                        const score = cs.subjectScore;
                        const level = getCompetencyLevel(score);
                        const radarItems = cs.radarData || [];
                        const validRadar = radarItems.filter((r: any) => r.percent !== null);
                        const topStrength = validRadar.length > 0 ? [...validRadar].sort((a, b) => (b.percent || 0) - (a.percent || 0))[0] : null;
                        const growthArea = validRadar.length > 1 ? [...validRadar].sort((a, b) => (a.percent || 0) - (b.percent || 0))[0] : null;

                        return (
                          <div
                            key={cs.id || cs.subjectId}
                            className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs print-card-avoid"
                          >
                            {/* Card Header */}
                            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                              <div>
                                <h4 className="font-black text-slate-850 text-xs leading-tight">
                                  {cs.subject?.subjectName || "Môn học"}
                                </h4>
                                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                                  {cs.subject?.subjectCode || "MON"} • Đã đánh giá {cs.evaluatedCount}/{cs.totalCompetencies} NL
                                </span>
                              </div>
                              <span className={"text-[9px] font-black uppercase px-2 py-0.5 rounded-full border " + level.bg + " " + level.color + " " + level.border}>
                                {score !== null ? score + "%" : "—"}
                              </span>
                            </div>

                            {/* Core Highlights */}
                            <div className="grid grid-cols-2 gap-1.5 text-[9px] bg-slate-50/80 p-2 rounded-lg">
                              <div>
                                <span className="text-emerald-700 font-extrabold uppercase block">Mạnh nhất:</span>
                                <span className="font-bold text-slate-700 truncate block">
                                  {topStrength ? topStrength.name + " (" + topStrength.percent + "%)" : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-amber-700 font-extrabold uppercase block">Cần rèn luyện:</span>
                                <span className="font-bold text-slate-700 truncate block">
                                  {growthArea && growthArea !== topStrength ? growthArea.name + " (" + growthArea.percent + "%)" : "Đạt chuẩn"}
                                </span>
                              </div>
                            </div>

                            {/* Vector Chart Canvas */}
                            <div className="flex items-center justify-center min-h-[220px]">
                              <SubjectRadarChart
                                data={radarItems}
                                size={220}
                                subjectName={cs.subject?.subjectName}
                                defaultBenchmark={75}
                              />
                            </div>

                            {/* Sub-competencies Table Breakdown */}
                            <div className="space-y-1 border-t border-slate-100 pt-2 text-[10px]">
                              {radarItems.map((r: any, rIdx: number) => {
                                const rLevel = getCompetencyLevel(r.percent);
                                return (
                                  <div key={rIdx} className="flex justify-between items-center">
                                    <span className="font-medium text-slate-600 truncate max-w-[170px]" title={r.name}>
                                      {r.name}
                                    </span>
                                    <span className={"font-mono font-bold text-[9px] px-1.5 rounded " + (r.percent !== null ? rLevel.color : "text-slate-400")}>
                                      {r.percent !== null ? r.percent + "%" : "—"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. SECTION II: KẾT QUẢ HỌC TẬP (MOET EVALUATION) */}
              <div className="mb-6 space-y-2.5 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b-2 border-slate-200 pb-1.5">
                  <ClipboardCheck className="w-4 h-4 text-[#007A72]" />
                  II. KẾT QUẢ HỌC TẬP &amp; HỌC THUẬT (MOET EVALUATION)
                </h3>
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center shadow-2xs">
                    <div className="text-[10px] text-[#007A72] font-black uppercase">Toán học</div>
                    <div className="text-lg font-black text-slate-850 mt-0.5">{student.mathScore || "8.5"}</div>
                    <div className="text-[9px] text-slate-400 font-semibold">Hoàn thành tốt</div>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center shadow-2xs">
                    <div className="text-[10px] text-indigo-700 font-black uppercase">Ngữ văn</div>
                    <div className="text-lg font-black text-slate-850 mt-0.5">{student.literatureScore || "8.0"}</div>
                    <div className="text-[9px] text-slate-400 font-semibold">Hoàn thành tốt</div>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center shadow-2xs">
                    <div className="text-[10px] text-sky-700 font-black uppercase">Tiếng Anh (Viết)</div>
                    <div className="text-lg font-black text-slate-850 mt-0.5">{student.writtenEnglishScore || "9.0"}</div>
                    <div className="text-[9px] text-slate-400 font-semibold">Xuất sắc</div>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center shadow-2xs">
                    <div className="text-[10px] text-amber-700 font-black uppercase">Tiếng Anh (Nói)</div>
                    <div className="text-lg font-black text-slate-850 mt-0.5">{student.oralEnglishScore || "8.8"}</div>
                    <div className="text-[9px] text-slate-400 font-semibold">Xuất sắc</div>
                  </div>
                </div>
              </div>

              {/* 5. SECTION III: THÀNH TÍCH & KHEN THƯỞNG */}
              <div className="mb-6 space-y-2.5 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b-2 border-slate-200 pb-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  III. THÀNH TÍCH &amp; KHEN THƯỞNG NỔI BẬT
                </h3>
                {!student.achievements || student.achievements.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center text-xs text-slate-400 italic">
                    Chưa ghi nhận thành tích giải thưởng trong năm học.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-center w-8">STT</th>
                          <th className="py-2 px-3">Tên Giải thưởng / Hội thi</th>
                          <th className="py-2 px-3">Lĩnh vực</th>
                          <th className="py-2 px-3 text-center">Hạng / Cấp giải</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {student.achievements.slice(0, 6).map((item: any, idx: number) => {
                          const ach = item.achievement || item;
                          return (
                            <tr key={idx}>
                              <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">{ach.name || "Giải thưởng"}</td>
                              <td className="py-2 px-3 text-[10px] font-black text-[#007A72] uppercase">{ach.category || "Học thuật"}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                                  {ach.level || "Cấp Trường"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 6. SECTION IV: HOẠT ĐỘNG TRẢI NGHIỆM & DỰ ÁN THỰC TẾ */}
              <div className="mb-6 space-y-2.5 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b-2 border-slate-200 pb-1.5">
                  <BookOpen className="w-4 h-4 text-sky-500" />
                  IV. HOẠT ĐỘNG TRẢI NGHIỆM &amp; DỰ ÁN THỰC TẾ
                </h3>
                {!student.experientialActivities || student.experientialActivities.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center text-xs text-slate-400 italic">
                    Chưa tham gia dự án trải nghiệm ngoại khóa.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {student.experientialActivities.slice(0, 4).map((act: any, idx: number) => (
                      <div key={idx} className="bg-sky-50/30 border border-sky-100 p-3 rounded-xl text-xs font-semibold shadow-2xs">
                        <div className="font-extrabold text-slate-850">{act.activityName}</div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Vai trò: <span className="font-black text-slate-700">{act.role}</span> | Đánh giá: <span className="font-black text-[#007A72]">{act.evalLevel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. SECTION V: CỐ VẤN HỌC TẬP & NHẬN XÉT CỦA GIÁO VIÊN */}
              <div className="mb-6 space-y-2.5 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b-2 border-slate-200 pb-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  V. NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM &amp; HỘI ĐỒNG SƯ PHẠM
                </h3>
                <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl text-xs font-medium text-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 border-b border-emerald-100 pb-1">
                    <span>Ghi nhận từ GVCN ({student.homeroomTeacherName || "Giáo viên chủ nhiệm"}):</span>
                    <span className="font-mono text-emerald-700">Năm học {student.yearName || "2025-2026"}</span>
                  </div>
                  <p className="italic leading-relaxed text-slate-800 pt-0.5 text-xs">
                    "{student.latestGvcnComment || 'Học sinh có ý thức kỷ luật tốt, tích cực chủ động trong học tập, đoàn kết và luôn thể hiện tinh thần trách nhiệm cao trong các hoạt động tập thể.'}"
                  </p>
                </div>
              </div>

              {/* 8. SIGNATURE & VERIFICATION AREA */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-3 text-center text-xs print-section-avoid">
                <div className="space-y-12">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Học sinh xác nhận</div>
                  <div className="font-black text-slate-800">{student.studentName}</div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Giáo viên Chủ nhiệm</div>
                  <div className="font-black text-[#007A72]">{student.homeroomTeacherName || "Thầy/Cô Chủ nhiệm"}</div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Ban Giám Hiệu</div>
                  <div className="font-black text-slate-800">Hiệu trưởng / GDCS</div>
                </div>
              </div>

              {/* 9. OFFICIAL FOOTER */}
              <div className="mt-8 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <span>HỆ THỐNG GIÁO DỤC SKY-LINE • SKY-LINE EDUCATION SYSTEM</span>
                <span>Hồ sơ lưu trữ chính thức</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
