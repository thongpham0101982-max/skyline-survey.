export interface SpecialLessonPortfolioItem {
  id: string;
  periodIndex: number;
  lessonName: string;
  topicName: string;
  evalResult: string | null;
  evalLabel: string;
  teacherFeedback: string;
  evaluatorName: string;
  status: string;
  isEvaluated: boolean;
}

export interface SpecialSubjectPortfolioItem {
  code: string;
  name: string;
  targetGrades: string;
  levelBadge: string;
  studentGrade: string;
  totalLessons: number;
  evaluatedCount: number;
  defaultLessonId: string;
  overallResult: string | null; // "TOT" | "HOAN_THANH" | "DAT" | "CAN_CO_GANG" | null
  overallLabel: string;         // "Tốt" | "Đạt" | "Cần cố gắng" | "Chưa đánh giá"
  teacherFeedback: string;      // Strictly actual feedback from GVBM
  teacherName: string;          // Assigned GVBM / evaluator name
  lessons: SpecialLessonPortfolioItem[];
  evaluatedLessons: SpecialLessonPortfolioItem[];
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
    firstLessonByGrade: Record<string, string>;
  }
> = {
  CXXH: {
    code: "CXXH",
    name: "Giáo dục Cảm xúc - Xã hội",
    targetGrades: "Khối 1 - 9",
    levelBadge: "Tiểu học & THCS",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    sortOrder: 1,
    firstLessonByGrade: {
      "1": "Xây dựng lớp học tử tế",
      "2": "Quy ước về lớp học hạnh phúc",
      "3": "Quy ước về lớp học hạnh phúc",
      "4": "Thỏa thuận lớp học",
      "5": "Giá trị của tập thể",
      "6": "Mạng lưới của tôi",
      "7": "Hệ sinh thái các mối quan hệ",
      "8": "Tôi ảnh hưởng đến hệ thống như thế nào",
      "9": "Tôi trong thế giới kết nối",
    },
  },
  GDHN: {
    code: "GDHN",
    name: "Giáo dục hướng nghiệp",
    targetGrades: "Khối 6 - 12",
    levelBadge: "SECONDARY - HIGH_SCHOOL",
    grades: ["6", "7", "8", "9", "10", "11", "12"],
    sortOrder: 2,
    firstLessonByGrade: {
      "6": "Điều tôi thích",
      "7": "Tính cách và màu sắc",
      "8": "Nghề nghiệp trong mắt tôi",
      "9": "Tôi là ai? Nhìn lại bản thân trước ngưỡng cửa",
      "10": "Tôi là ai sau một năm? Nhìn lại và cập nhật hành trình bản thân",
      "11": "Tôi muốn gì sau khi tốt nghiệp? Xác định mục tiêu ưu tiên",
      "12": "Tôi đã ở đâu, tôi muốn đến đâu?",
    },
  },
  GDGT: {
    code: "GDGT",
    name: "Giáo dục giới tính",
    targetGrades: "Khối 6 - 9",
    levelBadge: "SECONDARY",
    grades: ["6", "7", "8", "9"],
    sortOrder: 3,
    firstLessonByGrade: {
      "6": "Tôi đã lớn rồi! Hành trình dậy thì",
      "7": "Giới tính, giới và sự đa dạng",
      "8": "Làm chủ bản thân tuổi vị thành niên",
      "9": "Trưởng thành về thể chất và cảm xúc",
    },
  },
  FIN_EDU: {
    code: "FIN_EDU",
    name: "Giáo dục tài chính cá nhân",
    targetGrades: "Khối 1 - 9 (Tiểu học & THCS)",
    levelBadge: "Tiểu học • SECONDARY",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    sortOrder: 4,
    firstLessonByGrade: {
      "1": "Tiền quanh em – Tiền đến từ đâu?",
      "2": "Đồng tiền quanh em",
      "3": "Tiền dùng để làm gì?",
      "4": "Những lựa chọn của em",
      "5": "Quyết định mua sắm",
      "6": "Hành trình của đồng tiền",
      "7": "Bản chất của tiền tiêu vặt",
      "8": "Tiền mặt và sự lên ngôi của thanh toán số",
      "9": "Phân tích cấu trúc ngân sách cá nhân",
    },
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

function resolveEntryEvalResult(entry: any): string | null {
  if (!entry) return null;
  if (entry.evalResult && entry.evalResult !== "CHUA_DANH_GIA") {
    return entry.evalResult;
  }
  if (entry.resultText) return entry.resultText;
  if (entry.rubricDetails) {
    try {
      const parsed =
        typeof entry.rubricDetails === "string"
          ? JSON.parse(entry.rubricDetails)
          : entry.rubricDetails;
      const vals = Object.values(parsed || {}).filter(
        (v: any) => Boolean(v) && v !== "CHUA_DANH_GIA"
      ) as string[];
      if (vals.length > 0) {
        let tot = 0,
          ht = 0,
          ccg = 0;
        vals.forEach((v) => {
          if (v === "TOT") tot++;
          else if (v === "HOAN_THANH" || v === "DAT") ht++;
          else if (v === "CAN_CO_GANG") ccg++;
        });
        if (ccg >= vals.length / 2) return "CAN_CO_GANG";
        if (tot >= ht && tot > 0) return "TOT";
        return "HOAN_THANH";
      }
    } catch {}
  }
  return null;
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

  const orderedMetaList = Object.values(SPECIAL_SUBJECTS_CATALOG_META).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const applicableMetas = orderedMetaList.filter((meta) => {
    if (grade && meta.grades.includes(grade)) return true;
    return rawEntries.some((e: any) => {
      const code = (e?.assignment?.subject?.code || e?.subjectCode || "").toUpperCase();
      return code === meta.code;
    });
  });

  if (applicableMetas.length === 0) return [];

  return applicableMetas.map((meta) => {
    const mapKey = `${meta.code}_${grade || "1"}`;
    const dbLessons = lessonsBySubjectAndGrade?.get(mapKey) || [];

    const subjectEntries = rawEntries.filter((e: any) => {
      const code = (e?.assignment?.subject?.code || e?.subjectCode || "").toUpperCase();
      return code === meta.code;
    });

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

    const assignedTeacher =
      subjectEntries.find((e: any) => e?.assignment?.teacher?.teacherName)?.assignment?.teacher?.teacherName ||
      (classId && teacherByClassAndSubject?.get(`${classId}_${meta.code}`)) ||
      homeroomTeacherName ||
      student?.homeroomTeacherName ||
      "";

    const lessons: SpecialLessonPortfolioItem[] = dbLessons.map((l: any) => {
      const matched =
        entryByLessonId.get(l.id) ||
        entryByPeriod.get(Number(l.periodIndex)) ||
        null;
      const evalRes = resolveEntryEvalResult(matched);
      const rawFeedback = matched?.teacherFeedback ? String(matched.teacherFeedback).trim() : "";
      const isEvaluated = Boolean(
        (evalRes && evalRes !== "CHUA_DANH_GIA") || rawFeedback.length > 0
      );
      return {
        id: l.id,
        periodIndex: Number(l.periodIndex),
        lessonName: l.lessonName || `Bài ${l.periodIndex}`,
        topicName: l.topic?.name || l.topicName || "Chủ đề bài học",
        evalResult: evalRes,
        evalLabel: formatSpecialEvalLabel(evalRes),
        teacherFeedback: rawFeedback,
        evaluatorName: matched?.assignment?.teacher?.teacherName || assignedTeacher,
        status: matched?.status || (isEvaluated ? "COMPLETED" : "UNGRADED"),
        isEvaluated,
      };
    });

    // If general entry (without specific lessonId) exists and no lesson matched it, attach to lesson 1 or append
    if (generalEntry && !lessons.some((l) => l.isEvaluated)) {
      const genRes = resolveEntryEvalResult(generalEntry);
      const genFb = generalEntry?.teacherFeedback ? String(generalEntry.teacherFeedback).trim() : "";
      if (lessons.length > 0 && (genRes || genFb)) {
        lessons[0] = {
          ...lessons[0],
          evalResult: genRes,
          evalLabel: formatSpecialEvalLabel(genRes),
          teacherFeedback: genFb,
          evaluatorName: generalEntry?.assignment?.teacher?.teacherName || assignedTeacher,
          status: generalEntry?.status || "COMPLETED",
          isEvaluated: true,
        };
      } else if (lessons.length === 0 && (genRes || genFb)) {
        lessons.push({
          id: generalEntry.id || "general-1",
          periodIndex: 1,
          lessonName: meta.name,
          topicName: "Đánh giá môn đặc thù",
          evalResult: genRes,
          evalLabel: formatSpecialEvalLabel(genRes),
          teacherFeedback: genFb,
          evaluatorName: generalEntry?.assignment?.teacher?.teacherName || assignedTeacher,
          status: generalEntry?.status || "COMPLETED",
          isEvaluated: true,
        });
      }
    }

    // Fallback if dbLessons wasn't loaded but student has subjectEntries
    if (lessons.length === 0 && subjectEntries.length > 0) {
      subjectEntries.forEach((e: any, idx: number) => {
        const evalRes = resolveEntryEvalResult(e);
        const fb = e.teacherFeedback ? String(e.teacherFeedback).trim() : "";
        lessons.push({
          id: e.lessonId || e.id || `entry-${idx}`,
          periodIndex: e.lesson?.periodIndex || idx + 1,
          lessonName:
            e.lesson?.lessonName ||
            meta.firstLessonByGrade[grade || "1"] ||
            meta.name,
          topicName: e.lesson?.topic?.name || "Chuyên đề",
          evalResult: evalRes,
          evalLabel: formatSpecialEvalLabel(evalRes),
          teacherFeedback: fb,
          evaluatorName: e?.assignment?.teacher?.teacherName || assignedTeacher,
          status: e.status || "COMPLETED",
          isEvaluated: Boolean(evalRes || fb),
        });
      });
    }

    // Fallback Lesson 1 of the curriculum if dbLessons wasn't provided
    if (lessons.length === 0) {
      const firstLessonName =
        meta.firstLessonByGrade[grade] ||
        Object.values(meta.firstLessonByGrade)[0] ||
        meta.name;
      lessons.push({
        id: `${meta.code}-g${grade || "1"}-p1`,
        periodIndex: 1,
        lessonName: firstLessonName,
        topicName: "Bài học chuẩn hóa",
        evalResult: null,
        evalLabel: "Chưa đánh giá",
        teacherFeedback: "",
        evaluatorName: assignedTeacher,
        status: "UNGRADED",
        isEvaluated: false,
      });
    }

    const evaluatedLessons = lessons.filter((l) => l.isEvaluated);

    // Overall level across evaluated lessons (only if at least 1 lesson was evaluated by GVBM)
    let overallResult: string | null = null;
    if (evaluatedLessons.length > 0) {
      let tot = 0,
        dat = 0,
        ccg = 0;
      evaluatedLessons.forEach((l) => {
        if (l.evalLabel === "Tốt") tot++;
        else if (l.evalLabel === "Đạt") dat++;
        else if (l.evalLabel === "Cần cố gắng") ccg++;
      });
      if (ccg > 0 && ccg >= evaluatedLessons.length / 2) {
        overallResult = "CAN_CO_GANG";
      } else if (tot >= dat && tot > 0) {
        overallResult = "TOT";
      } else if (dat > 0) {
        overallResult = "DAT";
      }
    }

    // Strictly actual feedback from GVBM (no synthetic/boilerplate text)
    const feedbackList = evaluatedLessons
      .filter((l) => l.teacherFeedback.length > 0)
      .map((l) =>
        evaluatedLessons.length > 1
          ? `Tiết ${l.periodIndex}: ${l.teacherFeedback}`
          : l.teacherFeedback
      );
    const teacherFeedback = feedbackList.join(" | ");

    // Default lesson: latest evaluated lesson by GVBM, or Lesson 1
    const defaultLessonId =
      evaluatedLessons.length > 0
        ? evaluatedLessons[evaluatedLessons.length - 1].id
        : lessons[0]?.id || "";

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
      evaluatedCount: evaluatedLessons.length,
      defaultLessonId,
      overallResult,
      overallLabel: formatSpecialEvalLabel(overallResult),
      teacherFeedback,
      teacherName: assignedTeacher,
      lessons,
      evaluatedLessons,
    };
  });
}
