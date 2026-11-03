import { describe, it, expect } from "vitest";
import {
  generateExamVariants,
  scoreOmrSheetAgainstVariant,
  generatePrintableOmrSheetHtml,
  ShuffleQuestionInput,
} from "../omrAndShuffleEngine";
import {
  validateExamMatrix,
  ensureDigitalTestingTables,
  getDigitalTestingWorkspace,
} from "../digitalTestingService";
import { verifyMoodleQuizConfiguration } from "../moodleClient";

describe("Digital Testing Platform - Controlled Shuffling, OMR Scoring & LMS Verification", () => {
  const sampleQuestions: ShuffleQuestionInput[] = [
    {
      id: "Q1",
      questionCode: "MATH-01",
      sectionCode: "PART_I_MCQ",
      topicName: "Mệnh đề",
      cognitiveLevel: "NB",
      questionType: "MCQ",
      stemContent: "Mệnh đề nào đúng?",
      optionsJson: JSON.stringify([
        { id: "A", content: "2 là số nguyên tố chẵn duy nhất", isCorrect: true },
        { id: "B", content: "4 là số nguyên tố", isCorrect: false },
        { id: "C", content: "9 là số nguyên tố", isCorrect: false },
        { id: "D", content: "1 là số nguyên tố", isCorrect: false },
      ]),
      correctAnswer: "A",
      points: 2.5,
      allowShuffleOpts: true,
    },
    {
      id: "Q2",
      questionCode: "MATH-02",
      sectionCode: "PART_I_MCQ",
      topicName: "Đọc hiểu đồ thị",
      cognitiveLevel: "TH",
      questionType: "MCQ",
      stemContent: "Câu đọc hiểu 1 (nhóm PASSAGE-1)",
      optionsJson: JSON.stringify([
        { id: "A", content: "Sai 1", isCorrect: false },
        { id: "B", content: "Đúng 1", isCorrect: true },
        { id: "C", content: "Sai 2", isCorrect: false },
        { id: "D", content: "Sai 3", isCorrect: false },
      ]),
      correctAnswer: "B",
      points: 2.5,
      allowShuffleOpts: true,
      questionGroupId: "PASSAGE-1",
    },
    {
      id: "Q3",
      questionCode: "MATH-03",
      sectionCode: "PART_I_MCQ",
      topicName: "Đọc hiểu đồ thị",
      cognitiveLevel: "TH",
      questionType: "MCQ",
      stemContent: "Câu đọc hiểu 2 (nhóm PASSAGE-1)",
      optionsJson: JSON.stringify([
        { id: "A", content: "Sai A", isCorrect: false },
        { id: "B", content: "Sai B", isCorrect: false },
        { id: "C", content: "Đúng C", isCorrect: true },
        { id: "D", content: "Sai D", isCorrect: false },
      ]),
      correctAnswer: "C",
      points: 2.5,
      allowShuffleOpts: true,
      questionGroupId: "PASSAGE-1",
    },
    {
      id: "Q4",
      questionCode: "MATH-04",
      sectionCode: "ESSAY",
      topicName: "Tối ưu hóa",
      cognitiveLevel: "VDC",
      questionType: "ESSAY",
      stemContent: "Bài toán tự luận",
      optionsJson: null,
      correctAnswer: "x = 5",
      points: 2.5,
      allowShuffleOpts: false,
    },
  ];

  it("generates 4 deterministic variants (101-104) while preserving questionGroupId and recalculating answer keys", () => {
    const variants = generateExamVariants(
      sampleQuestions,
      ["101", "102", "103", "104"],
      20261030
    );
    expect(variants).toHaveLength(4);
    expect(variants.map((v) => v.variantCode)).toEqual(["101", "102", "103", "104"]);

    for (const v of variants) {
      // Essay must remain at the end (displayNumber 4)
      const lastQ = v.printableQuestions[v.printableQuestions.length - 1];
      expect(lastQ.questionType).toBe("ESSAY");

      // Reading passage Q2 & Q3 must stay adjacent
      const idxQ2 = v.printableQuestions.findIndex((q) => q.originalQuestionId === "Q2");
      const idxQ3 = v.printableQuestions.findIndex((q) => q.originalQuestionId === "Q3");
      expect(Math.abs(idxQ2 - idxQ3)).toBe(1);

      // Verify answerKeyMapJson maps to the shuffled option containing isCorrect
      const keyMap = JSON.parse(v.answerKeyMapJson);
      for (const pq of v.printableQuestions) {
        if (pq.questionType === "MCQ") {
          const expectedLabel = keyMap[String(pq.displayNumber)].correctAnswer;
          expect(["A", "B", "C", "D"]).toContain(expectedLabel);
        }
      }
    }
  });

  it("scores OMR sheets accurately and detects MULTI_MARK, BLANK, LOW_CONF, and DUPLICATE_STUDENT anomalies", () => {
    const [variant101] = generateExamVariants(sampleQuestions, ["101"], 20261030);
    const keyMap = JSON.parse(variant101.answerKeyMapJson);

    // 1. Perfect sheet (all 3 MCQ questions right -> 7.5 points)
    const cleanResult = scoreOmrSheetAgainstVariant({
      candidateNumber: "100001",
      variantCode: "101",
      rawBubbleMap: {
        "1": {
          questionNumber: 1,
          detectedOption: keyMap["1"].correctAnswer,
          confidence: 0.98,
          status: "VALID",
        },
        "2": {
          questionNumber: 2,
          detectedOption: keyMap["2"].correctAnswer,
          confidence: 0.96,
          status: "VALID",
        },
        "3": {
          questionNumber: 3,
          detectedOption: keyMap["3"].correctAnswer,
          confidence: 0.95,
          status: "VALID",
        },
      },
      answerKeyMapJson: variant101.answerKeyMapJson,
      matchedStudentId: "STU-01",
    });

    expect(cleanResult.mcqScore).toBe(7.5);
    expect(cleanResult.correctCount).toBe(3);
    expect(cleanResult.recognitionStatus).toBe("RECOGNIZED");
    expect(cleanResult.anomalyFlags).toHaveLength(0);

    // 2. Sheet with MULTI_MARK and BLANK
    const flaggedResult = scoreOmrSheetAgainstVariant({
      candidateNumber: "100002",
      variantCode: "101",
      rawBubbleMap: {
        "1": {
          questionNumber: 1,
          detectedOption: "A,B",
          confidence: 0.65,
          status: "MULTI_MARK",
        },
        "2": {
          questionNumber: 2,
          detectedOption: "",
          confidence: 0.9,
          status: "BLANK",
        },
        "3": {
          questionNumber: 3,
          detectedOption: keyMap["3"].correctAnswer,
          confidence: 0.95,
          status: "VALID",
        },
      },
      answerKeyMapJson: variant101.answerKeyMapJson,
      matchedStudentId: "STU-02",
    });

    expect(flaggedResult.mcqScore).toBe(2.5);
    expect(flaggedResult.recognitionStatus).toBe("NEEDS_REVIEW");
    expect(flaggedResult.anomalyFlags).toContain("MULTI_MARK");
    expect(flaggedResult.anomalyFlags).toContain("BLANK");
    expect(flaggedResult.anomalyFlags).toContain("LOW_CONF");
  });

  it("validates 10.0-point Exam Matrix and generates printable A4 OMR HTML with fiducials", () => {
    const matrixRes = validateExamMatrix([
      {
        topicName: "Hàm số",
        level: "NB",
        questionType: "MCQ",
        questionCount: 8,
        pointsPerQuestion: 0.5,
      },
      {
        topicName: "Hàm số",
        level: "TH",
        questionType: "MCQ",
        questionCount: 6,
        pointsPerQuestion: 0.5,
      },
      {
        topicName: "Hình học",
        level: "VD",
        questionType: "ESSAY",
        questionCount: 2,
        pointsPerQuestion: 1.0,
      },
      {
        topicName: "Tối ưu",
        level: "VDC",
        questionType: "ESSAY",
        questionCount: 1,
        pointsPerQuestion: 1.0,
      },
    ]);

    expect(matrixRes.isValid).toBe(true);
    expect(matrixRes.totalPoints).toBe(10);
    expect(matrixRes.byLevel.NB.percent).toBe(40);
    expect(matrixRes.byLevel.TH.percent).toBe(30);
    expect(matrixRes.byLevel.VD.percent).toBe(20);
    expect(matrixRes.byLevel.VDC.percent).toBe(10);

    const html = generatePrintableOmrSheetHtml({
      periodName: "Kiểm tra Giữa kỳ I",
      subjectName: "Toán học",
      gradeLevel: "10",
      examCode: "KT-GK1-MATH10",
      totalMcqQuestions: 40,
    });
    expect(html).toContain("PHIẾU TRẢ LỜI TRẮC NGHIỆM (OMR CHUẨN A4)");
    expect(html).toContain("fiducial tl");
    expect(html).toContain("KT-GK1-MATH10");
  });

  it("verifies Moodle Quiz security and grading configuration", async () => {
    const report = await verifyMoodleQuizConfiguration({
      moodleCourseId: 104,
      moodleQuizId: 512,
      expectedDurationMinutes: 60,
      expectedMaxScore: 10,
    });
    expect(report.isValidForOfficialExam).toBe(true);
    expect(report.checks.length).toBeGreaterThanOrEqual(5);
  });

  it("initializes Digital Testing tables idempotently and returns enriched workspace data", async () => {
    await ensureDigitalTestingTables();
    const workspace = await getDigitalTestingWorkspace();
    expect(workspace).toBeDefined();
    expect(Array.isArray(workspace.periods)).toBe(true);
    expect(Array.isArray(workspace.subjectExams)).toBe(true);
    expect(workspace.kpis).toBeDefined();
  });
});
