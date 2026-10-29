"use client";

import React, { useMemo } from "react";
import {
  Sparkles,
  Heart,
  Compass,
  Shield,
  Coins,
} from "lucide-react";
import {
  SpecialSubjectPortfolioItem,
  SPECIAL_SUBJECTS_CATALOG_META,
  buildStudentSpecialSubjectsPortfolio,
} from "@/lib/specialSubjectsPortfolio";

interface StudentSpecialSubjectsSectionProps {
  student: any;
  isPrintMode?: boolean;
}

export function StudentSpecialSubjectsSection({
  student,
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

  const getSubjectVisual = (code: string) => {
    switch (code) {
      case "CXXH":
        return {
          Icon: Heart,
          iconBg: "bg-teal-50 text-teal-600 border-teal-200",
        };
      case "GDHN":
        return {
          Icon: Compass,
          iconBg: "bg-amber-50 text-amber-600 border-amber-200",
        };
      case "GDGT":
        return {
          Icon: Shield,
          iconBg: "bg-rose-50 text-rose-600 border-rose-200",
        };
      case "FIN_EDU":
      default:
        return {
          Icon: Coins,
          iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200",
        };
    }
  };

  const renderLevelBadge = (label?: string | null) => {
    if (!label || label === "Chưa đánh giá") {
      return <span className="text-slate-400 font-normal">—</span>;
    }
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
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
        {label}
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
          Chương trình Bản sắc Sky-Line
        </span>
      </h3>

      {portfolio.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center text-xs text-slate-400 italic">
          Chưa có dữ liệu môn học đặc thù áp dụng cho khối lớp này.
        </div>
      ) : (
        <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5 w-[26%]">Môn học</th>
                <th className="py-2.5 px-3.5 w-[34%]">Bài học</th>
                <th className="py-2.5 px-2.5 text-center w-[15%]">Kết quả bài</th>
                <th className="py-2.5 px-3.5 w-[25%]">Nhận xét của giáo viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {portfolio.map((sub) => {
                const { Icon, iconBg } = getSubjectVisual(sub.code);
                const evaluatedRows =
                  Array.isArray(sub.evaluatedLessons) && sub.evaluatedLessons.length > 0
                    ? sub.evaluatedLessons
                    : Array.isArray(sub.lessons)
                    ? sub.lessons.filter(
                        (l) =>
                          (l.evalResult && l.evalResult !== "CHUA_DANH_GIA") ||
                          Boolean(l.teacherFeedback && l.teacherFeedback.trim())
                      )
                    : [];

                const meta = SPECIAL_SUBJECTS_CATALOG_META[sub.code];
                const fallbackFirstLessonName =
                  meta?.firstLessonByGrade?.[sub.studentGrade || "1"] ||
                  (meta?.firstLessonByGrade
                    ? Object.values(meta.firstLessonByGrade)[0]
                    : "") ||
                  sub.name;

                const displayRows =
                  evaluatedRows.length > 0
                    ? evaluatedRows
                    : Array.isArray(sub.lessons) && sub.lessons.length > 0
                    ? [sub.lessons[0]]
                    : [
                        {
                          id: `${sub.code}-p1`,
                          periodIndex: 1,
                          lessonName: fallbackFirstLessonName,
                          topicName: "",
                          evalResult: null,
                          evalLabel: "Chưa đánh giá",
                          teacherFeedback: "",
                          evaluatorName: "",
                          status: "UNGRADED",
                          isEvaluated: false,
                        },
                      ];

                return displayRows.map((lesson, idx) => (
                  <tr
                    key={`${sub.code}-${lesson.id || idx}`}
                    className="hover:bg-slate-50/70 transition-colors align-top"
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={displayRows.length}
                        className="py-2.5 px-3.5 border-r border-slate-100 align-top"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-900 leading-snug">
                            {sub.name}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="py-2.5 px-3.5 align-middle">
                      <div className="font-semibold text-slate-800 leading-snug">
                        {lesson.periodIndex
                          ? `Bài ${lesson.periodIndex}: ${lesson.lessonName}`
                          : lesson.lessonName}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-center align-middle">
                      {renderLevelBadge(lesson.evalLabel)}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle">
                      {lesson.teacherFeedback && lesson.teacherFeedback.trim() ? (
                        <div className="text-[11px] text-slate-700 font-normal leading-relaxed">
                          {lesson.teacherFeedback.trim()}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
