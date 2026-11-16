import { describe, expect, it } from "vitest";
import {
  buildStudentCtqtPortfolio,
  isBilingualOrCtqtSubject,
} from "../studentProfilePortfolio";

describe("isBilingualOrCtqtSubject", () => {
  it("identifies bilingual / CTQT subjects accurately without false-positives on MOET subjects", () => {
    expect(isBilingualOrCtqtSubject("English", "INT-ENG", "BILINGUAL")).toBe(true);
    expect(isBilingualOrCtqtSubject("Mathematics", "MAT", "BILINGUAL")).toBe(true);
    expect(isBilingualOrCtqtSubject("Mathematics", "INT-MATH", "BILINGUAL")).toBe(true);
    expect(isBilingualOrCtqtSubject("Science", "INT-SCI", "BILINGUAL")).toBe(true);
    expect(isBilingualOrCtqtSubject("Global Studies", "GLOBAL_STUDIES", "")).toBe(true);
    expect(isBilingualOrCtqtSubject("Academic English", "AE", "")).toBe(true);

    // MOET subjects must remain false
    expect(isBilingualOrCtqtSubject("Toán học", "TOAN", "MOET")).toBe(false);
    expect(isBilingualOrCtqtSubject("Ngữ văn", "VAN", "MOET")).toBe(false);
    expect(isBilingualOrCtqtSubject("Khoa học tự nhiên", "KHTN", "MOET")).toBe(false);
    expect(isBilingualOrCtqtSubject("Lịch sử và Địa lí", "LSDL", "MOET")).toBe(false);
  });
});

describe("buildStudentCtqtPortfolio", () => {
  it("maps Middle School (Khối 6–9) subjects, auto-GPA fallback, teacher assignment, and HK2 defaultViewMode", () => {
    const portfolio = buildStudentCtqtPortfolio({
      student: {
        id: "stu-7int",
        academicYearId: "ay-current",
        classId: "cls-7int",
        class: {
          id: "cls-7int",
          className: "7INT_CS3",
          grade: "7",
          educationSystem: "HNG",
          ctqtTeachingAssignments: [
            {
              semester: 2,
              subjectCode: "MATH",
              primaryTeacher: { teacherName: "Đồng Hương Trà" },
            },
          ],
        },
        ctqtGradeEntries: [
          {
            academicYearId: "ay-current",
            classId: "cls-7int",
            semester: 2,
            subjectCode: "MATH",
            progressScores: null,
            midTermScore: 96,
            endTermScore: null,
            gpaScore: 96,
            commentEn: "Excellent problem-solving skills.",
            commentVi: "Kỹ năng giải toán xuất sắc.",
            reviewStatus: "PENDING_REVIEW",
          },
          {
            academicYearId: "ay-current",
            classId: "cls-7int",
            semester: 2,
            subjectCode: "SCI",
            progressScores: "[80, 90]",
            midTermScore: 95,
            endTermScore: null,
            gpaScore: null, // Should auto-compute: (80 + 90 + 95*2) / 4 = 90
            reviewStatus: "DRAFT",
          },
        ],
        ctqtCompetencyEntries: [],
      },
    });

    expect(portfolio.isEligible).toBe(true);
    expect(portfolio.level).toBe("MIDDLE");
    expect(portfolio.gradeNumber).toBe(7);
    expect(portfolio.defaultViewMode).toBe("HK2");
    expect(portfolio.subjects.map((s) => s.code)).toEqual([
      "ENG",
      "SCI",
      "MAT",
      "GLOBAL_STUDIES",
    ]);

    const mathRow = portfolio.subjects.find((s) => s.code === "MAT")!;
    expect(mathRow.sem2.midTermScore).toBe(96);
    expect(mathRow.sem2.gpaScore).toBe(96);
    expect(mathRow.sem2.teacherName).toBe("Đồng Hương Trà");
    expect(mathRow.sem2.reviewStatus).toBe("PENDING_REVIEW");
    expect(mathRow.sem2.statusLabel).toBe("Chờ duyệt");

    const sciRow = portfolio.subjects.find((s) => s.code === "SCI")!;
    expect(sciRow.sem2.progressDisplay).toBe("80 • 90");
    expect(sciRow.sem2.gpaScore).toBe(90);

    const gsRow = portfolio.subjects.find((s) => s.code === "GLOBAL_STUDIES")!;
    expect(gsRow.isQualitative).toBe(true);
  });

  it("maps Primary School (Khối 1–5) subjects and Core Competencies", () => {
    const portfolio = buildStudentCtqtPortfolio({
      student: {
        id: "stu-4uk",
        academicYearId: "ay-current",
        classId: "cls-4uk",
        class: {
          id: "cls-4uk",
          className: "4UK_CS3",
          grade: "4",
          educationSystem: "SB",
        },
        ctqtGradeEntries: [
          {
            academicYearId: "ay-current",
            classId: "cls-4uk",
            semester: 1,
            subjectCode: "ENG",
            progressScores: "[88]",
            midTermScore: 90,
            endTermScore: 94,
            reviewStatus: "APPROVED",
          },
        ],
        ctqtCompetencyEntries: [
          {
            academicYearId: "ay-current",
            classId: "cls-4uk",
            semester: 1,
            criticalThinking: "E",
            communication: "S",
          },
        ],
      },
    });

    expect(portfolio.level).toBe("PRIMARY");
    expect(portfolio.defaultViewMode).toBe("HK1");
    expect(portfolio.subjects.map((s) => s.code)).toEqual(["ENG", "SCI", "MAT"]);

    const engRow = portfolio.subjects[0];
    expect(engRow.sem1.midTermScore).toBe(90);
    expect(engRow.sem1.endTermScore).toBe(94);
    expect(engRow.sem1.representativeScore).toBe(92);
    expect(engRow.sem1.reviewStatus).toBe("APPROVED");

    expect(portfolio.competenciesSem1).not.toBeNull();
    expect(portfolio.competenciesSem1?.find((c) => c.key === "criticalThinking")?.code).toBe("E");
  });

  it("maps High School (Khối 10–12) GAC / IELTS / AR subjects and ALL view mode when both semesters exist", () => {
    const portfolio = buildStudentCtqtPortfolio({
      student: {
        id: "stu-10gac",
        academicYearId: "ay-current",
        classId: "cls-10gac",
        class: {
          id: "cls-10gac",
          className: "10GAC_CS1",
          grade: "10",
          educationSystem: "SB",
        },
        ctqtGradeEntries: [
          {
            academicYearId: "ay-current",
            classId: "cls-10gac",
            semester: 1,
            subjectCode: "AE",
            assessmentContentEn: "GAC001 Academic English I",
            gpaScore: 84,
            reviewStatus: "APPROVED",
          },
          {
            academicYearId: "ay-current",
            classId: "cls-10gac",
            semester: 2,
            subjectCode: "IELTS",
            ieltsScore: 6.5,
            reviewStatus: "APPROVED",
          },
        ],
      },
    });

    expect(portfolio.level).toBe("HIGH");
    expect(portfolio.defaultViewMode).toBe("ALL");
    expect(portfolio.subjects.map((s) => s.code)).toEqual([
      "AE",
      "MAT",
      "SCI",
      "IELTS",
      "AR",
    ]);

    const ieltsRow = portfolio.subjects.find((s) => s.code === "IELTS")!;
    expect(ieltsRow.isIelts).toBe(true);
    expect(ieltsRow.sem2.ieltsScore).toBe(6.5);
    expect(ieltsRow.annualScore).toBe(6.5);
  });

  it("isolates academicYearId so prior-year cross-records do not leak into current year", () => {
    const portfolio = buildStudentCtqtPortfolio({
      student: {
        id: "stu-7int",
        academicYearId: "ay-2026-2027",
        classId: "cls-7int",
        class: {
          id: "cls-7int",
          className: "7INT_CS3",
          grade: "7",
          educationSystem: "HNG",
        },
        ctqtGradeEntries: [
          // Stale entry from previous school year (6INT_CS3)
          {
            academicYearId: "ay-2025-2026",
            classId: "cls-6int",
            semester: 1,
            subjectCode: "ENG",
            gpaScore: 71,
            reviewStatus: "APPROVED",
          },
          // Current school year entry
          {
            academicYearId: "ay-2026-2027",
            classId: "cls-7int",
            semester: 2,
            subjectCode: "MATH",
            gpaScore: 96,
            reviewStatus: "PENDING_REVIEW",
          },
        ],
      },
    });

    const engRow = portfolio.subjects.find((s) => s.code === "ENG")!;
    expect(engRow.sem1.hasAnyData).toBe(false);
    expect(engRow.sem1.gpaScore).toBeNull();

    const mathRow = portfolio.subjects.find((s) => s.code === "MAT")!;
    expect(mathRow.sem2.gpaScore).toBe(96);
    expect(portfolio.defaultViewMode).toBe("HK2");
  });

  it("marks non-CTQT standard classes without CTQT grades as ineligible", () => {
    const portfolio = buildStudentCtqtPortfolio({
      student: {
        id: "stu-7a1",
        academicYearId: "ay-current",
        classId: "cls-7a1",
        class: {
          id: "cls-7a1",
          className: "7A1_CS1",
          grade: "7",
          educationSystem: "HNS",
        },
        ctqtGradeEntries: [],
        ctqtCompetencyEntries: [],
      },
    });

    expect(portfolio.isEligible).toBe(false);
  });
});
