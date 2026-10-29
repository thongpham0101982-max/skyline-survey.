"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Heart,
  Compass,
  Shield,
  Coins,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  SpecialSubjectPortfolioItem,
  buildStudentSpecialSubjectsPortfolio,
} from "@/lib/specialSubjectsPortfolio";

interface StudentSpecialSubjectsSectionProps {
  student: any;
  isPrintMode?: boolean;
}

export function StudentSpecialSubjectsSection({
  student,
  isPrintMode = false,
}: StudentSpecialSubjectsSectionProps) {
  const portfolio: SpecialSubjectPortfolioItem[] = useMemo(() => {
    if (
      Array.isArray(student?.specialSubjectsPortfolio) &&
      student.specialSubjectsPortfolio.length > 0
    ) {
      return student.specialSubjectsPortfolio;
    }
    if (
      Array.isArray(student?.student?.specialSubjectsPortfolio) &&
      student.student.specialSubjectsPortfolio.length > 0
    ) {
      return student.student.specialSubjectsPortfolio;
    }
    return buildStudentSpecialSubjectsPortfolio({ student });
  }, [student]);

  const [selectedLessonBySubject, setSelectedLessonBySubject] = useState<
    Record<string, string>
  >({});
  const [expandedSubjectCode, setExpandedSubjectCode] = useState<string | null>(
    null
  );

  const getSubjectVisual = (code: string) => {
    switch (code) {
      case "CXXH":
        return {
          Icon: Heart,
          iconBg: "bg-teal-50 text-teal-600 border-teal-200",
          badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
        };
      case "GDHN":
        return {
          Icon: Compass,
          iconBg: "bg-amber-50 text-amber-600 border-amber-200",
          badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "GDGT":
        return {
          Icon: Shield,
          iconBg: "bg-rose-50 text-rose-600 border-rose-200",
          badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
        };
      case "FIN_EDU":
      default:
        return {
          Icon: Coins,
          iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200",
          badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        };
    }
  };

  const renderLevelBadge = (label: string) => {
    if (label === "Tốt") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
          ★ Tốt
        </span>
      );
    }
    if (label === "Đạt") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300 whitespace-nowrap">
          ✓ Đạt
        </span>
      );
    }
    if (label === "Cần cố gắng") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
          ! Cần cố gắng
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
        {label || "Chưa đánh giá"}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>MÔN HỌC ĐẶC THÙ SKY-LINE (SKL)</span>
        </div>
        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
          Khung Chương trình Bản sắc Sky-Line • Định tính 3 mức (Tốt / Đạt / CCG)
        </span>
      </h3>

      {portfolio.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center text-xs text-slate-400 italic">
          Chưa có danh mục môn học đặc thù áp dụng cho khối lớp này.
        </div>
      ) : (
        <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-[23%]">Mã &amp; Môn học</th>
                <th className="py-2.5 px-3 w-[17%]">Cấp học &amp; Đối tượng</th>
                <th className="py-2.5 px-3 w-[29%]">Hồ sơ Bài học / Tiết dạy</th>
                <th className="py-2.5 px-2 text-center w-[11%]">Mức</th>
                <th className="py-2.5 px-3 w-[20%]">Nhận xét của Giáo viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {portfolio.map((sub) => {
                const { Icon, iconBg, badgeBg } = getSubjectVisual(sub.code);
                const selectedLessonId =
                  selectedLessonBySubject[sub.code] ||
                  sub.defaultLessonId ||
                  sub.lessons[0]?.id ||
                  "";

                const activeLesson =
                  sub.lessons.find((l) => l.id === selectedLessonId) ||
                  sub.lessons[0] ||
                  null;

                const displayLevel = activeLesson
                  ? activeLesson.evalLabel
                  : sub.overallLabel;

                // Strictly actual teacher feedback from GVBM — no synthetic fallback
                const actualLessonFeedback = activeLesson?.teacherFeedback?.trim() || "";
                const actualOverallFeedback = sub.teacherFeedback?.trim() || "";
                const displayFeedback = actualLessonFeedback || actualOverallFeedback;

                const evaluatorName =
                  activeLesson?.evaluatorName || sub.teacherName || "";

                const isExpanded = expandedSubjectCode === sub.code;

                return (
                  <React.Fragment key={sub.code}>
                    <tr className="hover:bg-slate-50/70 transition-colors align-top">
                      {/* 1. Mã & Môn học */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 leading-snug">
                              {sub.name}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-0.5">
                              {sub.code}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Cấp học & Đối tượng */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 text-[11px]">
                          {sub.targetGrades}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase ${badgeBg}`}
                          >
                            {sub.levelBadge}
                          </span>
                          {sub.studentGrade && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              Khối {sub.studentGrade}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Hồ sơ Bài học / Tiết dạy */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="text-[10px] font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-teal-600 shrink-0" />
                            <span>
                              Bài học / Tiết dạy ({sub.totalLessons} bài)
                            </span>
                          </span>
                          {!isPrintMode && sub.lessons.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSubjectCode(
                                  isExpanded ? null : sub.code
                                )
                              }
                              className="no-print text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded border border-teal-200 inline-flex items-center gap-0.5 transition cursor-pointer"
                            >
                              <span>
                                {isExpanded
                                  ? "Thu gọn"
                                  : `DS (${sub.evaluatedCount}/${sub.totalLessons})`}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {!isPrintMode && sub.lessons.length > 0 ? (
                          <select
                            value={selectedLessonId}
                            onChange={(e) =>
                              setSelectedLessonBySubject((prev) => ({
                                ...prev,
                                [sub.code]: e.target.value,
                              }))
                            }
                            className="no-print w-full text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800 truncate"
                          >
                            {sub.lessons.map((l) => (
                              <option key={l.id} value={l.id}>
                                Tiết {l.periodIndex}: {l.lessonName}
                                {l.isEvaluated ? ` • [${l.evalLabel}]` : ""}
                              </option>
                            ))}
                          </select>
                        ) : null}

                        {/* Subtitle: actual lesson & GVBM evaluated count */}
                        <div className="text-[10px] text-slate-500 font-medium mt-1 leading-snug">
                          {activeLesson ? (
                            <div>
                              <span className="font-bold text-slate-700">
                                Tiết {activeLesson.periodIndex}:{" "}
                                {activeLesson.lessonName}
                              </span>
                              {activeLesson.topicName && (
                                <span className="text-slate-400">
                                  {" "}
                                  ({activeLesson.topicName})
                                </span>
                              )}
                            </div>
                          ) : null}
                          <div className="mt-0.5">
                            {sub.evaluatedCount > 0 ? (
                              <span className="text-teal-700 font-bold">
                                GVBM đã chấm: {sub.evaluatedCount}/
                                {sub.totalLessons} bài
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                Chưa có bài học được GVBM đánh giá (0/
                                {sub.totalLessons} bài)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Mức */}
                      <td className="py-2.5 px-2 text-center align-middle">
                        {renderLevelBadge(displayLevel)}
                      </td>

                      {/* 5. Nhận xét của Giáo viên */}
                      <td className="py-2.5 px-3">
                        {displayFeedback ? (
                          <div className="text-[11px] text-slate-800 font-medium leading-relaxed">
                            {displayFeedback}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 font-normal italic">
                            Chưa có nhận xét từ GVBM
                          </div>
                        )}
                        {evaluatorName && (
                          <div className="text-[9px] text-slate-400 font-bold mt-1">
                            GV phụ trách: {evaluatorName}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expanded lesson portfolio table */}
                    {!isPrintMode && isExpanded && sub.lessons.length > 0 && (
                      <tr className="bg-slate-50/70 no-print">
                        <td colSpan={5} className="p-3 border-t border-slate-200">
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <div className="px-3 py-2 bg-teal-50/60 border-b border-slate-200 flex items-center justify-between">
                              <span className="text-[11px] font-black text-[#003B3A] uppercase">
                                Hồ sơ Bài học / Tiết dạy môn {sub.name} (
                                {sub.code}) — Khối {sub.studentGrade} (
                                {sub.totalLessons} bài)
                              </span>
                              <span className="text-[10px] font-bold text-teal-800">
                                Đã chấm thực tế: {sub.evaluatedCount}/
                                {sub.totalLessons} tiết
                              </span>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase sticky top-0 border-b border-slate-200">
                                  <tr>
                                    <th className="py-1.5 px-2.5 w-16 text-center">
                                      Tiết
                                    </th>
                                    <th className="py-1.5 px-2.5 w-1/3">
                                      Bài học / Tiết dạy
                                    </th>
                                    <th className="py-1.5 px-2.5 w-1/4">
                                      Chủ đề
                                    </th>
                                    <th className="py-1.5 px-2 text-center w-28">
                                      Mức
                                    </th>
                                    <th className="py-1.5 px-2.5">
                                      Nhận xét của Giáo viên (GVBM)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sub.lessons.map((lesson) => (
                                    <tr
                                      key={lesson.id}
                                      className="hover:bg-teal-50/20"
                                    >
                                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-teal-700">
                                        Tiết {lesson.periodIndex}
                                      </td>
                                      <td className="py-1.5 px-2.5 font-bold text-slate-800">
                                        {lesson.lessonName}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-slate-500">
                                        {lesson.topicName}
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        {renderLevelBadge(lesson.evalLabel)}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-slate-600 italic">
                                        {lesson.teacherFeedback || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
