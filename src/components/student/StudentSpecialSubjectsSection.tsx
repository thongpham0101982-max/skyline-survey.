"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Heart,
  Compass,
  Shield,
  Coins,
} from "lucide-react";
import {
  SpecialLessonPortfolioItem,
  SpecialSubjectPortfolioItem,
  SPECIAL_SUBJECTS_CATALOG_META,
  buildStudentSpecialSubjectsPortfolio,
  formatSpecialEvalLabel,
} from "@/lib/specialSubjectsPortfolio";

interface StudentSpecialSubjectsSectionProps {
  student: any;
  isPrintMode?: boolean;
}

export function StudentSpecialSubjectsSection({
  student,
}: StudentSpecialSubjectsSectionProps) {
  const basePortfolio: SpecialSubjectPortfolioItem[] = useMemo(() => {
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

  const [fetchedLessonsMap, setFetchedLessonsMap] = useState<
    Record<string, SpecialLessonPortfolioItem[]>
  >({});

  useEffect(() => {
    let cancelled = false;
    const subjectsNeedingFetch = basePortfolio.filter(
      (sub) => !Array.isArray(sub.lessons) || sub.lessons.length <= 1
    );
    if (subjectsNeedingFetch.length === 0) return;

    const rawEntries: any[] = Array.isArray(student?.specialGradeEntries)
      ? student.specialGradeEntries
      : Array.isArray(student?.student?.specialGradeEntries)
      ? student.student.specialGradeEntries
      : [];

    subjectsNeedingFetch.forEach(async (sub) => {
      const grade = sub.studentGrade || "1";
      const key = `${sub.code}_${grade}`;
      if (fetchedLessonsMap[key]) return;
      try {
        const res = await fetch(
          `/api/special-subjects/structure?subjectCode=${encodeURIComponent(
            sub.code
          )}&grade=${encodeURIComponent(grade)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data?.lessons) || data.lessons.length === 0) {
          return;
        }
        const subjectEntries = rawEntries.filter((e: any) => {
          const code = (
            e?.assignment?.subject?.code ||
            e?.subjectCode ||
            ""
          ).toUpperCase();
          return code === sub.code;
        });

        const mapped: SpecialLessonPortfolioItem[] = data.lessons.map(
          (l: any) => {
            const matched =
              subjectEntries.find(
                (e: any) =>
                  e.lessonId === l.id ||
                  Number(e?.lesson?.periodIndex) === Number(l.periodIndex)
              ) || null;
            const evalRes =
              matched?.evalResult && matched.evalResult !== "CHUA_DANH_GIA"
                ? matched.evalResult
                : matched?.resultText || null;
            const rawFb = matched?.teacherFeedback
              ? String(matched.teacherFeedback).trim()
              : "";
            return {
              id: l.id,
              periodIndex: Number(l.periodIndex),
              lessonName: l.lessonName || `Bài ${l.periodIndex}`,
              topicName: l.topicName || l.topic?.name || "Chủ đề bài học",
              evalResult: evalRes,
              evalLabel: formatSpecialEvalLabel(evalRes),
              teacherFeedback: rawFb,
              evaluatorName: "",
              status: evalRes || rawFb ? "COMPLETED" : "UNGRADED",
              isEvaluated: Boolean(evalRes || rawFb),
            };
          }
        );

        if (!cancelled) {
          setFetchedLessonsMap((prev) => ({ ...prev, [key]: mapped }));
        }
      } catch {}
    });

    return () => {
      cancelled = true;
    };
  }, [basePortfolio, student, fetchedLessonsMap]);

  const portfolio = useMemo(() => {
    return basePortfolio.map((sub) => {
      const key = `${sub.code}_${sub.studentGrade || "1"}`;
      const fetched = fetchedLessonsMap[key];
      if (
        fetched &&
        fetched.length > (Array.isArray(sub.lessons) ? sub.lessons.length : 0)
      ) {
        return {
          ...sub,
          lessons: fetched,
        };
      }
      return sub;
    });
  }, [basePortfolio, fetchedLessonsMap]);

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
                <th className="py-2.5 px-3 w-[18%]">Môn học</th>
                <th className="py-2.5 px-3 w-[22%]">Chủ đề</th>
                <th className="py-2.5 px-3 w-[28%]">Bài học</th>
                <th className="py-2.5 px-2 text-center w-[12%]">Kết quả bài</th>
                <th className="py-2.5 px-3 w-[20%]">Nhận xét của giáo viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {portfolio.map((sub) => {
                const { Icon, iconBg } = getSubjectVisual(sub.code);
                const meta = SPECIAL_SUBJECTS_CATALOG_META[sub.code];
                const fallbackFirstLessonName =
                  meta?.firstLessonByGrade?.[sub.studentGrade || "1"] ||
                  (meta?.firstLessonByGrade
                    ? Object.values(meta.firstLessonByGrade)[0]
                    : "") ||
                  sub.name;

                // Hiển thị đầy đủ danh sách tất cả chủ đề và bài học của môn học theo khối lớp
                const displayRows: SpecialLessonPortfolioItem[] =
                  Array.isArray(sub.lessons) && sub.lessons.length > 0
                    ? sub.lessons
                    : Array.isArray(sub.evaluatedLessons) &&
                      sub.evaluatedLessons.length > 0
                    ? sub.evaluatedLessons
                    : [
                        {
                          id: `${sub.code}-p1`,
                          periodIndex: 1,
                          lessonName: fallbackFirstLessonName,
                          topicName: "Chủ đề 1",
                          evalResult: null,
                          evalLabel: "Chưa đánh giá",
                          teacherFeedback: "",
                          evaluatorName: "",
                          status: "UNGRADED",
                          isEvaluated: false,
                        },
                      ];

                return displayRows.map((lesson, idx) => {
                  const currTopic = (lesson.topicName || "—").trim();
                  const prevTopic =
                    idx > 0
                      ? (displayRows[idx - 1].topicName || "—").trim()
                      : null;
                  const isFirstOfTopic = idx === 0 || currTopic !== prevTopic;

                  let topicSpan = 1;
                  if (isFirstOfTopic) {
                    for (let j = idx + 1; j < displayRows.length; j++) {
                      const nextTopic = (
                        displayRows[j].topicName || "—"
                      ).trim();
                      if (nextTopic === currTopic) {
                        topicSpan++;
                      } else {
                        break;
                      }
                    }
                  }

                  return (
                    <tr
                      key={`${sub.code}-${lesson.id || idx}`}
                      className="hover:bg-slate-50/70 transition-colors align-top"
                    >
                      {idx === 0 && (
                        <td
                          rowSpan={displayRows.length}
                          className="py-2.5 px-3 border-r border-slate-100 align-top bg-white"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-slate-900 leading-snug">
                              {sub.name}
                            </span>
                          </div>
                        </td>
                      )}
                      {isFirstOfTopic && (
                        <td
                          rowSpan={topicSpan}
                          className="py-2 px-3 border-r border-slate-100 align-top text-slate-700 font-semibold leading-snug bg-slate-50/30"
                        >
                          {currTopic}
                        </td>
                      )}
                      <td className="py-2 px-3 align-middle">
                        <div className="font-semibold text-slate-800 leading-snug">
                          {lesson.periodIndex
                            ? `Bài ${lesson.periodIndex}: ${lesson.lessonName}`
                            : lesson.lessonName}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center align-middle">
                        {renderLevelBadge(lesson.evalLabel)}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        {lesson.teacherFeedback &&
                        lesson.teacherFeedback.trim() ? (
                          <div className="text-[11px] text-slate-700 font-normal leading-relaxed">
                            {lesson.teacherFeedback.trim()}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
