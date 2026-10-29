export interface SpecialLessonPortfolioItem {
  id: string;
  periodIndex: number;
  lessonName: string;
  topicName: string;
  evalResult: string | null;
  evalLabel: string;
  teacherFeedback: string;
  status: string;
}

export interface SpecialSubjectPortfolioItem {
  code: string;
  name: string;
  targetGrades: string;
  levelBadge: string;
  studentGrade: string;
  totalLessons: number;
  evaluatedCount: number;
  overallResult: string | null; // "TOT" | "HOAN_THANH" | "DAT" | "CAN_CO_GANG" | null
  overallLabel: string;         // "Tốt" | "Đạt" | "Cần cố gắng" | "Chưa đánh giá"
  teacherFeedback: string;
  teacherName: string;
  lessons: SpecialLessonPortfolioItem[];
}

export const SPECIAL_SUBJECTS_CATALOG_META: Record<
  string,
  {
    code: string;
    name: string;
    targetGrades: string;
    levelBadge: string;
    grades: string[];
    sortOrder: number;
  }
> = {
  CXXH: {
    code: "CXXH",
    name: "Giáo dục Cảm xúc - Xã hội",
    targetGrades: "Khối 1 - 9",
    levelBadge: "Tiểu học & THCS",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    sortOrder: 1,
  },
  GDHN: {
    code: "GDHN",
    name: "Giáo dục hướng nghiệp",
    targetGrades: "Khối 6 - 12",
    levelBadge: "SECONDARY - HIGH_SCHOOL",
    grades: ["6", "7", "8", "9", "10", "11", "12"],
    sortOrder: 2,
  },
  GDGT: {
    code: "GDGT",
    name: "Giáo dục giới tính",
    targetGrades: "Khối 6 - 9",
    levelBadge: "SECONDARY",
    grades: ["6", "7", "8", "9"],
    sortOrder: 3,
  },
  FIN_EDU: {
    code: "FIN_EDU",
    name: "Giáo dục tài chính cá nhân",
    targetGrades: "Khối 1 - 9 (Tiểu học & THCS)",
    levelBadge: "Tiểu học • SECONDARY",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    sortOrder: 4,
  },
};

export function formatSpecialEvalLabel(rawResult?: string | null): string {
  if (!rawResult) return "Chưa đánh giá";
  const norm = String(rawResult).toUpperCase().trim();
  if (norm === "TOT" || norm === "TỐT" || norm === "T" || norm === "EXCELLENT" || norm === "GOOD") {
    return "Tốt";
  }
  if (
    norm === "HOAN_THANH" ||
    norm === "DAT" ||
    norm === "ĐẠT" ||
    norm === "HOÀN THÀNH" ||
    norm === "PASS" ||
    norm === "H" ||
    norm === "Đ"
  ) {
    return "Đạt";
  }
  if (norm === "CAN_CO_GANG" || norm === "CẦN CỐ GẮNG" || norm === "CCG" || norm === "C") {
    return "Cần cố gắng";
  }
  if (norm === "VANG" || norm === "ABSENT") {
    return "Vắng";
  }
  if (norm === "CHUA_DANH_GIA") {
    return "Chưa đánh giá";
  }
  return rawResult;
}

export function extractStudentGradeNumber(student: any): string {
  const rawGrade =
    student?.class?.grade ||
    student?.student?.class?.grade ||
    student?.grade ||
    "";
  const mGrade = String(rawGrade).match(/\d+/);
  if (mGrade) return mGrade[0];

  const rawClassName =
    student?.className ||
    student?.class?.className ||
    student?.student?.class?.className ||
    "";
  const mClass = String(rawClassName).match(/^(\d{1,2})/);
  if (mClass) return mClass[1];

  return "";
}

export function buildStudentSpecialSubjectsPortfolio(params: {
  student: any;
  lessonsBySubjectAndGrade?: Map<string, any[]>;
  teacherByClassAndSubject?: Map<string, string>;
  homeroomTeacherName?: string;
}): SpecialSubjectPortfolioItem[] {
  const { student, lessonsBySubjectAndGrade, teacherByClassAndSubject, homeroomTeacherName } = params;
  const grade = extractStudentGradeNumber(student);
  const rawEntries: any[] = Array.isArray(student?.specialGradeEntries)
    ? student.specialGradeEntries
    : Array.isArray(student?.student?.specialGradeEntries)
    ? student.student.specialGradeEntries
    : [];

  const classId = student?.classId || student?.class?.id || student?.student?.classId || "";

  // Determine which special subjects apply to this student's grade
  const orderedMetaList = Object.values(SPECIAL_SUBJECTS_CATALOG_META).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const applicableMetas = orderedMetaList.filter((meta) => {
    if (grade && meta.grades.includes(grade)) return true;
    // Also include if student already has grade entries for this subject
    return rawEntries.some((e: any) => {
      const code = (e?.assignment?.subject?.code || e?.subjectCode || "").toUpperCase();
      return code === meta.code;
    });
  });

  // Fallback for preschool or unknown grade if no subject matched: return empty
  if (applicableMetas.length === 0) return [];

  return applicableMetas.map((meta) => {
    const mapKey = `${meta.code}_${grade || "1"}`;
    const dbLessons = lessonsBySubjectAndGrade?.get(mapKey) || [];

    // Filter student's grade entries belonging to this subject
    const subjectEntries = rawEntries.filter((e: any) => {
      const code = (e?.assignment?.subject?.code || e?.subjectCode || "").toUpperCase();
      return code === meta.code;
    });

    // Map entries by lessonId and periodIndex
    const entryByLessonId = new Map<string, any>();
    const entryByPeriod = new Map<number, any>();
    let generalEntry: any = null;

    for (const entry of subjectEntries) {
      if (entry.lessonId) {
        entryByLessonId.set(entry.lessonId, entry);
      }
      if (entry.lesson?.periodIndex !== undefined && entry.lesson?.periodIndex !== null) {
        entryByPeriod.set(Number(entry.lesson.periodIndex), entry);
      }
      if (!entry.lessonId && !generalEntry) {
        generalEntry = entry;
      }
    }

    const lessons: SpecialLessonPortfolioItem[] = dbLessons.map((l: any) => {
      const matched =
        entryByLessonId.get(l.id) ||
        entryByPeriod.get(Number(l.periodIndex)) ||
        null;
      const evalRes = matched?.evalResult || null;
      return {
        id: l.id,
        periodIndex: Number(l.periodIndex),
        lessonName: l.lessonName || `Bài ${l.periodIndex}`,
        topicName: l.topic?.name || l.topicName || "Chủ đề bài học",
        evalResult: evalRes,
        evalLabel: formatSpecialEvalLabel(evalRes),
        teacherFeedback: matched?.teacherFeedback || "",
        status: matched?.status || (evalRes ? "COMPLETED" : "UNGRADED"),
      };
    });

    // If dbLessons wasn't preloaded on client but student has subjectEntries with lessons, include them
    if (lessons.length === 0 && subjectEntries.length > 0) {
      subjectEntries.forEach((e: any, idx: number) => {
        lessons.push({
          id: e.lessonId || e.id || `entry-${idx}`,
          periodIndex: e.lesson?.periodIndex || idx + 1,
          lessonName: e.lesson?.lessonName || meta.name,
          topicName: e.lesson?.topic?.name || "Chuyên đề thực hành",
          evalResult: e.evalResult || e.resultText || null,
          evalLabel: formatSpecialEvalLabel(e.evalResult || e.resultText),
          teacherFeedback: e.teacherFeedback || "",
          status: e.status || "COMPLETED",
        });
      });
    }

    // Compute overall result using Sky-Line Most-Frequent rule across evaluated lessons
    const evaluatedEntries = subjectEntries.filter(
      (e: any) =>
        e.evalResult &&
        e.evalResult !== "CHUA_DANH_GIA" &&
        e.evalResult !== "VANG"
    );

    let overallResult: string | null = null;
    if (evaluatedEntries.length > 0) {
      let tot = 0;
      let dat = 0;
      let ccg = 0;
      evaluatedEntries.forEach((e: any) => {
        const lbl = formatSpecialEvalLabel(e.evalResult);
        if (lbl === "Tốt") tot++;
        else if (lbl === "Đạt") dat++;
        else if (lbl === "Cần cố gắng") ccg++;
      });
      if (ccg > 0 && ccg >= evaluatedEntries.length / 2) {
        overallResult = "CAN_CO_GANG";
      } else if (tot >= dat && tot > 0) {
        overallResult = "TOT";
      } else {
        overallResult = "DAT";
      }
    } else if (generalEntry?.evalResult) {
      overallResult = generalEntry.evalResult;
    }

    // Aggregate teacher feedback from latest evaluated entries
    const feedbackList = subjectEntries
      .map((e: any) => {
        if (!e.teacherFeedback || !String(e.teacherFeedback).trim()) return "";
        const prefix = e.lesson?.periodIndex ? `Tiết ${e.lesson.periodIndex}: ` : "";
        return `${prefix}${String(e.teacherFeedback).trim()}`;
      })
      .filter(Boolean);

    const teacherFeedback = feedbackList.join(" | ");

    // Resolve teacher name
    const assignedTeacher =
      (classId && teacherByClassAndSubject?.get(`${classId}_${meta.code}`)) ||
      subjectEntries.find((e: any) => e?.assignment?.teacher?.teacherName)?.assignment?.teacher?.teacherName ||
      homeroomTeacherName ||
      student?.homeroomTeacherName ||
      "Giáo viên Chủ nhiệm";

    // Level badge refined for CXXH by grade
    let levelBadge = meta.levelBadge;
    if (meta.code === "CXXH") {
      const gNum = parseInt(grade, 10);
      levelBadge = gNum >= 6 ? "THCS • SECONDARY" : "Tiểu học";
    }

    return {
      code: meta.code,
      name: meta.name,
      targetGrades: meta.targetGrades,
      levelBadge,
      studentGrade: grade,
      totalLessons: lessons.length,
      evaluatedCount: evaluatedEntries.length,
      overallResult,
      overallLabel: formatSpecialEvalLabel(overallResult),
      teacherFeedback,
      teacherName: assignedTeacher,
      lessons,
    };
  });
}
