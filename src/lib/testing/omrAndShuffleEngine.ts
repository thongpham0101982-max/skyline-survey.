/**
 * OMR Recognition, Controlled Paper Shuffling & Printable Generator Engine
 * Implements Requirements 3.E (Kiểm tra trên giấy & trộn đề có kiểm soát)
 * and 3.G (Chấm bài trắc nghiệm OMR & phát hiện bất thường).
 */

export interface ShuffleQuestionInput {
  id: string;
  questionCode: string;
  sectionCode: string; // PART_I_MCQ, PART_II_TF, PART_III_SHORT, ESSAY
  topicName: string;
  cognitiveLevel: string; // NB, TH, VD, VDC
  questionType: string; // MCQ, TRUE_FALSE, SHORT_ANSWER, ESSAY
  stemContent: string;
  optionsJson?: string | null; // JSON array of { id: "A"|"B"|"C"|"D", content: string, isCorrect?: boolean }
  correctAnswer: string;
  points: number;
  allowShuffleOpts: boolean;
  questionGroupId?: string | null;
}

export interface GeneratedVariantPayload {
  variantCode: string;
  seedValue: number;
  questionOrderJson: string; // JSON array of QuestionOrderEntry
  answerKeyMapJson: string; // JSON object mapping questionNumber -> { correctAnswer, points, questionId, questionType, sectionCode }
  printableQuestions: Array<{
    displayNumber: number;
    originalQuestionId: string;
    questionCode: string;
    sectionCode: string;
    cognitiveLevel: string;
    questionType: string;
    stemContent: string;
    points: number;
    options: Array<{
      displayLabel: string; // A, B, C, D
      originalOptionId: string;
      content: string;
    }>;
    mappedCorrectAnswer: string;
  }>;
}

export interface OmrBubbleDetection {
  questionNumber: number;
  detectedOption: string | null; // "A", "B", "C", "D", "A,B" (multi-mark), or "" (blank)
  confidence: number; // 0.0 -> 1.0
  status: "VALID" | "BLANK" | "MULTI_MARK" | "LOW_CONF";
}

export interface OmrRecognitionResult {
  candidateNumber: string;
  variantCode: string;
  confidenceScore: number;
  recognitionStatus: "RECOGNIZED" | "NEEDS_REVIEW" | "ANOMALY" | "VERIFIED";
  anomalyFlags: string[]; // MULTI_MARK, BLANK, LOW_CONF, MISSING_SBD, INVALID_VARIANT, DUPLICATE_STUDENT
  rawBubbleMap: Record<string, OmrBubbleDetection>;
  mcqScore: number;
  correctCount: number;
  totalQuestions: number;
  questionBreakdown: Array<{
    questionNumber: number;
    detectedOption: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
    status: string;
  }>;
}

/**
 * Deterministic seeded PRNG (Mulberry32) so every exam variant seed is 100% reproducible
 */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

const COGNITIVE_ORDER: Record<string, number> = {
  NB: 1,
  TH: 2,
  VD: 3,
  VDC: 4,
};

const SECTION_ORDER: Record<string, number> = {
  PART_I_MCQ: 1,
  PART_II_TF: 2,
  PART_III_SHORT: 3,
  ESSAY: 4,
};

/**
 * Generates controlled exam variants (e.g. 101, 102, 103, 104) while:
 * 1. Keeping sections ordered (Part I -> Part II -> Part III -> Essay)
 * 2. Preserving reading comprehension blocks (`questionGroupId`) together
 * 3. Ordering by cognitive difficulty (NB -> TH -> VD -> VDC) while shuffling within each tier
 * 4. Shuffling options A/B/C/D when `allowShuffleOpts === true` and recalculating the answer key map
 */
export function generateExamVariants(
  questions: ShuffleQuestionInput[],
  variantCodes: string[] = ["101", "102", "103", "104"],
  baseSeed: number = 20261030
): GeneratedVariantPayload[] {
  const LABELS = ["A", "B", "C", "D", "E", "F"];

  return variantCodes.map((code, idx) => {
    const numericCode = parseInt(code.replace(/\D/g, ""), 10) || idx + 101;
    const seedValue = baseSeed + numericCode * 997;
    const rng = createSeededRng(seedValue);

    // Group by section first
    const sections = new Map<string, ShuffleQuestionInput[]>();
    for (const q of questions) {
      const sec = q.sectionCode || "PART_I_MCQ";
      if (!sections.has(sec)) sections.set(sec, []);
      sections.get(sec)!.push(q);
    }

    const sortedSectionKeys = Array.from(sections.keys()).sort(
      (a, b) => (SECTION_ORDER[a] ?? 99) - (SECTION_ORDER[b] ?? 99)
    );

    const orderedQuestions: ShuffleQuestionInput[] = [];

    for (const secKey of sortedSectionKeys) {
      const secQuestions = sections.get(secKey)!;

      // Group by cognitive level inside each section
      const tiers = new Map<string, ShuffleQuestionInput[]>();
      for (const q of secQuestions) {
        const tier = q.cognitiveLevel || "NB";
        if (!tiers.has(tier)) tiers.set(tier, []);
        tiers.get(tier)!.push(q);
      }

      const sortedTiers = Array.from(tiers.keys()).sort(
        (a, b) => (COGNITIVE_ORDER[a] ?? 99) - (COGNITIVE_ORDER[b] ?? 99)
      );

      for (const tierKey of sortedTiers) {
        const tierItems = tiers.get(tierKey)!;
        // Group items that share questionGroupId so reading passages stay intact
        const blocks: ShuffleQuestionInput[][] = [];
        const groupMap = new Map<string, ShuffleQuestionInput[]>();

        for (const item of tierItems) {
          if (item.questionGroupId) {
            if (!groupMap.has(item.questionGroupId)) {
              const grp: ShuffleQuestionInput[] = [];
              groupMap.set(item.questionGroupId, grp);
              blocks.push(grp);
            }
            groupMap.get(item.questionGroupId)!.push(item);
          } else {
            blocks.push([item]);
          }
        }

        const shuffledBlocks = seededShuffle(blocks, rng);
        for (const blk of shuffledBlocks) {
          orderedQuestions.push(...blk);
        }
      }
    }

    const printableQuestions: GeneratedVariantPayload["printableQuestions"] = [];
    const answerKeyMap: Record<
      string,
      {
        correctAnswer: string;
        points: number;
        questionId: string;
        questionCode: string;
        questionType: string;
        sectionCode: string;
        cognitiveLevel: string;
      }
    > = {};

    orderedQuestions.forEach((q, index) => {
      const displayNumber = index + 1;
      let parsedOptions: Array<{ id: string; content: string; isCorrect?: boolean }> = [];
      if (q.optionsJson) {
        try {
          const raw = JSON.parse(q.optionsJson);
          if (Array.isArray(raw)) {
            parsedOptions = raw.map((o, oIdx) => ({
              id: String(o.id || LABELS[oIdx] || oIdx + 1),
              content: String(o.content || o.text || ""),
              isCorrect: Boolean(o.isCorrect),
            }));
          }
        } catch {
          parsedOptions = [];
        }
      }

      let finalOptions = parsedOptions;
      let mappedCorrect = (q.correctAnswer || "A").trim().toUpperCase();

      if (q.questionType === "MCQ" && parsedOptions.length >= 2) {
        if (q.allowShuffleOpts) {
          // Avoid shuffling if options contain "Tất cả đều đúng" or "Cả A và B"
          const hasPositionalRef = parsedOptions.some((o) =>
            /tất cả|cả a|cả b|đáp án khác/i.test(o.content)
          );
          if (!hasPositionalRef) {
            finalOptions = seededShuffle(parsedOptions, rng);
          }
        }

        const displayOpts = finalOptions.map((opt, optIdx) => {
          const newLabel = LABELS[optIdx] || String(optIdx + 1);
          if (
            opt.isCorrect ||
            opt.id.toUpperCase() === (q.correctAnswer || "").trim().toUpperCase()
          ) {
            mappedCorrect = newLabel;
          }
          return {
            displayLabel: newLabel,
            originalOptionId: opt.id,
            content: opt.content,
          };
        });

        printableQuestions.push({
          displayNumber,
          originalQuestionId: q.id,
          questionCode: q.questionCode,
          sectionCode: q.sectionCode,
          cognitiveLevel: q.cognitiveLevel,
          questionType: q.questionType,
          stemContent: q.stemContent,
          points: q.points,
          options: displayOpts,
          mappedCorrectAnswer: mappedCorrect,
        });
      } else {
        printableQuestions.push({
          displayNumber,
          originalQuestionId: q.id,
          questionCode: q.questionCode,
          sectionCode: q.sectionCode,
          cognitiveLevel: q.cognitiveLevel,
          questionType: q.questionType,
          stemContent: q.stemContent,
          points: q.points,
          options: parsedOptions.map((opt, optIdx) => ({
            displayLabel: LABELS[optIdx] || opt.id,
            originalOptionId: opt.id,
            content: opt.content,
          })),
          mappedCorrectAnswer: mappedCorrect,
        });
      }

      answerKeyMap[String(displayNumber)] = {
        correctAnswer: mappedCorrect,
        points: q.points,
        questionId: q.id,
        questionCode: q.questionCode,
        questionType: q.questionType,
        sectionCode: q.sectionCode,
        cognitiveLevel: q.cognitiveLevel,
      };
    });

    return {
      variantCode: code,
      seedValue,
      questionOrderJson: JSON.stringify(printableQuestions),
      answerKeyMapJson: JSON.stringify(answerKeyMap),
      printableQuestions,
    };
  });
}

/**
 * Scores an OMR sheet against the approved variant's answerKeyMapJson and detects anomalies
 */
export function scoreOmrSheetAgainstVariant(params: {
  candidateNumber: string;
  variantCode: string;
  rawBubbleMap: Record<string, OmrBubbleDetection>;
  answerKeyMapJson: string | null;
  existingStudentIdsInBatch?: Set<string>;
  matchedStudentId?: string | null;
}): OmrRecognitionResult {
  const anomalyFlags: string[] = [];

  if (!params.candidateNumber || !/^\d{4,8}$/.test(params.candidateNumber.trim())) {
    anomalyFlags.push("MISSING_SBD");
  }

  if (!params.matchedStudentId) {
    anomalyFlags.push("UNMATCHED_STUDENT");
  } else if (params.existingStudentIdsInBatch?.has(params.matchedStudentId)) {
    anomalyFlags.push("DUPLICATE_STUDENT");
  }

  let answerKeyMap: Record<
    string,
    {
      correctAnswer: string;
      points: number;
      questionId: string;
      questionType: string;
    }
  > = {};

  if (!params.answerKeyMapJson) {
    anomalyFlags.push("INVALID_VARIANT");
  } else {
    try {
      answerKeyMap = JSON.parse(params.answerKeyMapJson);
    } catch {
      anomalyFlags.push("INVALID_VARIANT");
    }
  }

  const questionNumbers = Object.keys(answerKeyMap)
    .filter((k) => answerKeyMap[k].questionType !== "ESSAY")
    .sort((a, b) => Number(a) - Number(b));

  let mcqScore = 0;
  let correctCount = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  const questionBreakdown: OmrRecognitionResult["questionBreakdown"] = [];

  for (const qNumStr of questionNumbers) {
    const qNum = Number(qNumStr);
    const keyItem = answerKeyMap[qNumStr];
    const detection = params.rawBubbleMap[qNumStr] || {
      questionNumber: qNum,
      detectedOption: "",
      confidence: 0.95,
      status: "BLANK" as const,
    };

    const detected = (detection.detectedOption || "").trim().toUpperCase();
    const expected = (keyItem.correctAnswer || "").trim().toUpperCase();

    confidenceSum += detection.confidence ?? 0.9;
    confidenceCount += 1;

    if (!detected) {
      if (!anomalyFlags.includes("BLANK")) anomalyFlags.push("BLANK");
    } else if (detected.includes(",") || detected.length > 1 && keyItem.questionType === "MCQ") {
      if (!anomalyFlags.includes("MULTI_MARK")) anomalyFlags.push("MULTI_MARK");
    }

    if ((detection.confidence ?? 1) < 0.72) {
      if (!anomalyFlags.includes("LOW_CONF")) anomalyFlags.push("LOW_CONF");
    }

    const isMulti = detected.includes(",") || (detected.length > 1 && keyItem.questionType === "MCQ");
    const isCorrect = !isMulti && detected !== "" && detected === expected;
    const pointsEarned = isCorrect ? Number(keyItem.points || 0) : 0;

    if (isCorrect) {
      mcqScore += pointsEarned;
      correctCount += 1;
    }

    questionBreakdown.push({
      questionNumber: qNum,
      detectedOption: detected || null,
      correctAnswer: expected,
      isCorrect,
      pointsEarned: Math.round(pointsEarned * 100) / 100,
      maxPoints: Number(keyItem.points || 0),
      status: isMulti
        ? "MULTI_MARK"
        : !detected
        ? "BLANK"
        : (detection.confidence ?? 1) < 0.72
        ? "LOW_CONF"
        : "VALID",
    });
  }

  const avgConfidence =
    confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 1000) / 1000 : 0.95;

  let recognitionStatus: OmrRecognitionResult["recognitionStatus"] = "RECOGNIZED";
  if (
    anomalyFlags.includes("MISSING_SBD") ||
    anomalyFlags.includes("INVALID_VARIANT") ||
    anomalyFlags.includes("DUPLICATE_STUDENT") ||
    anomalyFlags.includes("UNMATCHED_STUDENT")
  ) {
    recognitionStatus = "ANOMALY";
  } else if (
    anomalyFlags.includes("MULTI_MARK") ||
    anomalyFlags.includes("LOW_CONF") ||
    anomalyFlags.includes("BLANK")
  ) {
    recognitionStatus = "NEEDS_REVIEW";
  }

  return {
    candidateNumber: params.candidateNumber,
    variantCode: params.variantCode,
    confidenceScore: avgConfidence,
    recognitionStatus,
    anomalyFlags,
    rawBubbleMap: params.rawBubbleMap,
    mcqScore: Math.round(mcqScore * 100) / 100,
    correctCount,
    totalQuestions: questionNumbers.length,
    questionBreakdown,
  };
}

/**
 * Generates an A4 Standard Printable OMR Sheet HTML with 4 corner Fiducial Markers + QR Identifier
 */
export function generatePrintableOmrSheetHtml(params: {
  periodName: string;
  subjectName: string;
  gradeLevel: string;
  examCode: string;
  totalMcqQuestions: number;
}): string {
  const count = Math.min(Math.max(params.totalMcqQuestions || 40, 10), 60);
  const rowsPerCol = Math.ceil(count / 4);

  const renderBubbleColumns = () => {
    const cols: string[] = [];
    for (let c = 0; c < 4; c++) {
      const start = c * rowsPerCol + 1;
      const end = Math.min((c + 1) * rowsPerCol, count);
      let rowsHtml = "";
      for (let q = start; q <= end; q++) {
        rowsHtml += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;border-bottom:1px dashed #cbd5e1;font-size:11px;">
            <strong style="width:24px;">${q}.</strong>
            <span style="display:inline-flex;gap:8px;">
              ${["A", "B", "C", "D"]
                .map(
                  (opt) =>
                    `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:1.5px solid #0f172a;border-radius:999px;font-size:10px;font-weight:600;">${opt}</span>`
                )
                .join("")}
            </span>
          </div>`;
      }
      cols.push(
        `<div style="flex:1;border:1px solid #0f172a;border-radius:4px;overflow:hidden;">${rowsHtml}</div>`
      );
    }
    return cols.join("");
  };

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Phiếu Trả Lời Trắc Nghiệm OMR - ${params.examCode}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: "Times New Roman", serif; color: #0f172a; margin: 0; padding: 16px; position: relative; }
    .fiducial { width: 18px; height: 18px; background: #000; position: absolute; }
    .tl { top: 8px; left: 8px; }
    .tr { top: 8px; right: 8px; }
    .bl { bottom: 8px; left: 8px; }
    .br { bottom: 8px; right: 8px; }
  </style>
</head>
<body>
  <div class="fiducial tl"></div>
  <div class="fiducial tr"></div>
  <div class="fiducial bl"></div>
  <div class="fiducial br"></div>
  <div style="border:2px solid #000;padding:14px 20px;margin:12px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #000;padding-bottom:10px;margin-bottom:12px;">
      <div>
        <div style="font-weight:bold;font-size:13px;text-transform:uppercase;">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
        <div style="font-weight:bold;font-size:16px;margin-top:4px;">PHIẾU TRẢ LỜI TRẮC NGHIỆM (OMR CHUẨN A4)</div>
        <div style="font-size:12px;margin-top:4px;">Kỳ kiểm tra: <strong>${params.periodName}</strong> | Môn: <strong>${params.subjectName} (Khối ${params.gradeLevel})</strong></div>
      </div>
      <div style="border:1.5px solid #000;padding:6px 10px;font-size:10px;text-align:center;">
        <div style="font-weight:bold;">QR ĐỊNH DANH CA THI</div>
        <div style="font-family:monospace;margin-top:4px;">${params.examCode}</div>
      </div>
    </div>

    <div style="display:flex;gap:16px;margin-bottom:14px;font-size:12px;">
      <div style="flex:2;border:1px solid #000;padding:8px;">
        <div>Họ và tên học sinh: ........................................................................</div>
        <div style="margin-top:6px;">Lớp: .......................... Phòng thi: .......................... Ngày thi: ..../..../2026</div>
        <div style="margin-top:6px;">Chữ ký thí sinh: ............................... Chữ ký Giám thị: ...............................</div>
      </div>
      <div style="flex:1;border:1px solid #000;padding:8px;text-align:center;">
        <div style="font-weight:bold;">SỐ BÁO DANH (6 chữ số)</div>
        <div style="display:flex;justify-content:center;gap:4px;margin-top:6px;">
          ${Array.from({ length: 6 })
            .map(() => `<span style="width:20px;height:24px;border:1px solid #000;display:inline-block;"></span>`)
            .join("")}
        </div>
      </div>
      <div style="flex:0.7;border:1px solid #000;padding:8px;text-align:center;">
        <div style="font-weight:bold;">MÃ ĐỀ (3 số)</div>
        <div style="display:flex;justify-content:center;gap:4px;margin-top:6px;">
          ${Array.from({ length: 3 })
            .map(() => `<span style="width:22px;height:24px;border:1px solid #000;display:inline-block;"></span>`)
            .join("")}
        </div>
      </div>
    </div>

    <div style="font-weight:bold;font-size:12px;margin-bottom:6px;">PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (${count} CÂU - TÔ KÍN BẰNG BÚT CHÌ ĐEN 2B)</div>
    <div style="display:flex;gap:10px;">
      ${renderBubbleColumns()}
    </div>

    <div style="margin-top:14px;border:1px solid #000;padding:10px;min-height:110px;font-size:12px;">
      <div style="font-weight:bold;margin-bottom:6px;">PHẦN TỰ LUẬN / ĐIỂM CHẤM TỰ LUẬN CỦA GIÁO VIÊN:</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span>Điểm Trắc nghiệm (Máy chấm): ............</span>
        <span>Điểm Tự luận: ............</span>
        <span><strong>TỔNG ĐIỂM: ............</strong></span>
        <span>Giáo viên chấm ký tên: ........................</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}
