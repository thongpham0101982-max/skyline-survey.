import * as XLSX from "xlsx";
import {
  CTQT_LEVEL_CONFIGS,
  CORE_COMPETENCIES_DEF,
  detectCtqtLevel,
  CtqtLevel,
} from "./config";

export interface StudentForExcel {
  id: string;
  studentCode: string;
  studentName: string;
  englishName?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  className?: string;
}

export interface ExistingCtqtData {
  grades: {
    studentId: string;
    subjectCode: string;
    progressScores?: string | null;
    midTermScore?: number | null;
    endTermScore?: number | null;
    gpaScore?: number | null;
    assessmentContentEn?: string | null;
    assessmentContentVi?: string | null;
    ieltsScore?: number | null;
    commentEn?: string | null;
    commentVi?: string | null;
  }[];
  competencies: {
    studentId: string;
    communication?: string | null;
    collaboration?: string | null;
    responsibility?: string | null;
    criticalThinking?: string | null;
    creativity?: string | null;
    problemSolving?: string | null;
  }[];
}

/**
 * Format date to DD/MM/YYYY
 */
function formatDate(d: any): string {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(d);
  }
}

/**
 * Generate Excel Template Workbook according to class level
 */
export function generateCtqtTemplate(
  className: string,
  grade: string,
  level: string,
  students: StudentForExcel[],
  existingData?: ExistingCtqtData
): Buffer {
  const ctqtLevel = detectCtqtLevel(className, grade, level);
  const config = CTQT_LEVEL_CONFIGS[ctqtLevel];
  const wb = XLSX.utils.book_new();

  const gradeMap = new Map<string, any>();
  if (existingData?.grades) {
    for (const g of existingData.grades) {
      gradeMap.set(`${g.studentId}_${g.subjectCode}`, g);
    }
  }

  const compMap = new Map<string, any>();
  if (existingData?.competencies) {
    for (const c of existingData.competencies) {
      compMap.set(c.studentId, c);
    }
  }

  // 1. Generate Individual Subject Sheets
  for (const sub of config.subjects) {
    const headers: string[] = [
      "STT",
      "Student name\nHọ tên",
      "English name",
      "Birthday\nNgày sinh",
      "Gender\nGiới tính",
      "Student ID\nMã học sinh",
    ];

    if (ctqtLevel === "HIGH") {
      headers.push("Class\nLớp");
      if (sub.code === "AE" || sub.code === "SCI" || sub.code === "MATH") {
        headers.push("Content", "Nội dung", "Mark\nĐiểm");
      } else if (sub.code === "IELTS") {
        headers.push("Content", "Nội dung", "Mark\nĐiểm");
      }
    } else {
      for (const col of sub.scoreColumns) {
        headers.push(`${col.labelEn}\n${col.labelVi}`);
      }
    }

    headers.push("COMMENTS", "NHẬN XÉT");

    const rows: any[][] = [headers];

    students.forEach((st, idx) => {
      const g = gradeMap.get(`${st.id}_${sub.code}`) || {};
      const row: any[] = [
        idx + 1,
        st.studentName,
        st.englishName || "",
        formatDate(st.dateOfBirth),
        st.gender === "Nu" || st.gender === "Nữ" ? "F" : "M",
        st.studentCode,
      ];

      if (ctqtLevel === "HIGH") {
        row.push(className);
        if (sub.code === "AE" || sub.code === "SCI" || sub.code === "MATH") {
          row.push(
            g.assessmentContentEn || "",
            g.assessmentContentVi || "",
            g.midTermScore !== undefined && g.midTermScore !== null ? g.midTermScore : ""
          );
        } else if (sub.code === "IELTS") {
          row.push("", "Điểm thi HK2", g.ieltsScore !== undefined && g.ieltsScore !== null ? g.ieltsScore : "");
        }
      } else {
        // Primary or Middle
        let progressArr: any[] = [];
        if (g.progressScores) {
          try {
            progressArr = JSON.parse(g.progressScores);
          } catch {
            progressArr = [];
          }
        }

        for (const col of sub.scoreColumns) {
          if (col.key.startsWith("progressScores_")) {
            const pIdx = parseInt(col.key.replace("progressScores_", ""), 10);
            row.push(progressArr[pIdx] !== undefined ? progressArr[pIdx] : "");
          } else if (col.key === "midTermScore") {
            row.push(g.midTermScore !== undefined && g.midTermScore !== null ? g.midTermScore : "");
          } else if (col.key === "endTermScore") {
            row.push(g.endTermScore !== undefined && g.endTermScore !== null ? g.endTermScore : "");
          } else if (col.key === "gpaScore") {
            row.push(g.gpaScore !== undefined && g.gpaScore !== null ? g.gpaScore : "");
          } else {
            row.push("");
          }
        }
      }

      row.push(g.commentEn || "", g.commentVi || "");
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sub.sheetName);
  }

  // 2. Generate Core Competencies Sheet
  const compHeaders = [
    "STT",
    "Student name\nHọ tên",
    ...(ctqtLevel === "PRIMARY" ? ["English name"] : []),
    "Birthday\nNgày sinh",
    "Gender\nGiới tính",
    "Student ID\nMã học sinh",
    ...(ctqtLevel === "HIGH" ? ["Class\nLớp"] : []),
    "Communication\nGiao tiếp",
    "Collaboration\nHợp tác",
    "Responsibility\nCó trách nhiệm",
    "Critical Thinking\nTư duy phản biện",
    "Creativity\nSáng tạo",
    "Problem Solving\nGiải quyết vấn đề",
  ];

  const compRows: any[][] = [compHeaders];
  students.forEach((st, idx) => {
    const c = compMap.get(st.id) || {};
    const r: any[] = [
      idx + 1,
      st.studentName,
      ...(ctqtLevel === "PRIMARY" ? [st.englishName || ""] : []),
      formatDate(st.dateOfBirth),
      st.gender === "Nu" || st.gender === "Nữ" ? "F" : "M",
      st.studentCode,
      ...(ctqtLevel === "HIGH" ? [className] : []),
      c.communication || "E",
      c.collaboration || "E",
      c.responsibility || "E",
      c.criticalThinking || "E",
      c.creativity || "E",
      c.problemSolving || "E",
    ];
    compRows.push(r);
  });

  // Add legend rows at bottom
  compRows.push([]);
  compRows.push(["", "", "E = Excellent / Tốt"]);
  compRows.push(["", "", "S = Satisfactory / Đạt yêu cầu"]);
  compRows.push(["", "", "N = Needs improvement / Cần cải thiện"]);
  compRows.push(["", "", "U = Unsatisfactory / Chưa đạt"]);

  const wsComp = XLSX.utils.aoa_to_sheet(compRows);
  XLSX.utils.book_append_sheet(wb, wsComp, "Core Competencies");

  // 3. Generate TỔNG HỢP Sheet (Consolidated Sheet)
  const tongHopHeaders: string[] = [
    "STT",
    "Lớp",
    "Họ và tên",
    ...(ctqtLevel === "PRIMARY" ? ["English Name"] : []),
    "Ngày sinh",
    "Giới tính",
    "Mã học sinh",
  ];

  for (const sub of config.subjects) {
    if (ctqtLevel === "PRIMARY") {
      for (const col of sub.scoreColumns) {
        tongHopHeaders.push(col.shortLabel);
      }
      tongHopHeaders.push(`${sub.code[0]}4 (CMT)`, `${sub.code[0]}5 (NX)`);
    } else if (ctqtLevel === "MIDDLE") {
      for (const col of sub.scoreColumns) {
        tongHopHeaders.push(col.shortLabel);
      }
      tongHopHeaders.push("CMT", "NX");
    } else if (ctqtLevel === "HIGH") {
      if (sub.code === "AE") {
        tongHopHeaders.push("A1 (Content)", "A2 (Nội dung)", "A3 (Điểm)", "CMT A", "NX A");
      } else if (sub.code === "MATH") {
        tongHopHeaders.push("M1 (Content)", "M2 (Nội dung)", "M3 (Điểm)", "CMT M", "NX M");
      } else if (sub.code === "SCI") {
        tongHopHeaders.push("S1 (Content)", "S2 (Nội dung)", "S3 (Điểm)", "CMT S", "NX S");
      } else if (sub.code === "IELTS") {
        tongHopHeaders.push("I1 (Content)", "I2 (Nội dung)", "I3 (Điểm)", "CMT I", "NX I");
      } else if (sub.code === "AR") {
        tongHopHeaders.push("CMT R", "NX R");
      }
    }
  }

  // Append Core Competencies columns to TỔNG HỢP
  for (const cc of CORE_COMPETENCIES_DEF) {
    tongHopHeaders.push(cc.labelVi);
  }

  const tongHopRows: any[][] = [tongHopHeaders];
  students.forEach((st, idx) => {
    const c = compMap.get(st.id) || {};
    const r: any[] = [
      idx + 1,
      className,
      st.studentName,
      ...(ctqtLevel === "PRIMARY" ? [st.englishName || ""] : []),
      formatDate(st.dateOfBirth),
      st.gender === "Nu" || st.gender === "Nữ" ? "F" : "M",
      st.studentCode,
    ];

    for (const sub of config.subjects) {
      const g = gradeMap.get(`${st.id}_${sub.code}`) || {};
      let progressArr: any[] = [];
      if (g.progressScores) {
        try {
          progressArr = JSON.parse(g.progressScores);
        } catch {
          progressArr = [];
        }
      }

      if (ctqtLevel === "PRIMARY") {
        for (const col of sub.scoreColumns) {
          if (col.key.startsWith("progressScores_")) {
            const pIdx = parseInt(col.key.replace("progressScores_", ""), 10);
            r.push(progressArr[pIdx] !== undefined ? progressArr[pIdx] : "");
          } else if (col.key === "midTermScore") {
            r.push(g.midTermScore !== undefined && g.midTermScore !== null ? g.midTermScore : "");
          } else if (col.key === "endTermScore") {
            r.push(g.endTermScore !== undefined && g.endTermScore !== null ? g.endTermScore : "");
          }
        }
        r.push(g.commentEn || "", g.commentVi || "");
      } else if (ctqtLevel === "MIDDLE") {
        for (const col of sub.scoreColumns) {
          if (col.key.startsWith("progressScores_")) {
            const pIdx = parseInt(col.key.replace("progressScores_", ""), 10);
            r.push(progressArr[pIdx] !== undefined ? progressArr[pIdx] : "");
          } else if (col.key === "midTermScore") {
            r.push(g.midTermScore !== undefined && g.midTermScore !== null ? g.midTermScore : "");
          } else if (col.key === "endTermScore") {
            r.push(g.endTermScore !== undefined && g.endTermScore !== null ? g.endTermScore : "");
          } else if (col.key === "gpaScore") {
            r.push(g.gpaScore !== undefined && g.gpaScore !== null ? g.gpaScore : "");
          }
        }
        r.push(g.commentEn || "", g.commentVi || "");
      } else if (ctqtLevel === "HIGH") {
        if (sub.code === "AE") {
          r.push(
            g.assessmentContentEn || "50% test, 50% speaking",
            g.assessmentContentVi || "50% bài thi, 50% nói",
            g.midTermScore !== undefined && g.midTermScore !== null ? g.midTermScore : "",
            g.commentEn || "",
            g.commentVi || ""
          );
        } else if (sub.code === "MATH") {
          r.push(
            g.assessmentContentEn || "Assessment Event: Project",
            g.assessmentContentVi || "Báo cáo Dự án",
            g.midTermScore !== undefined && g.midTermScore !== null ? g.midTermScore : "",
            g.commentEn || "",
            g.commentVi || ""
          );
        } else if (sub.code === "SCI") {
          r.push(
            g.assessmentContentEn || "Average score",
            g.assessmentContentVi || "Điểm trung bình HK2",
            g.midTermScore !== undefined && g.midTermScore !== null ? g.midTermScore : "",
            g.commentEn || "",
            g.commentVi || ""
          );
        } else if (sub.code === "IELTS") {
          r.push(
            "",
            "Điểm thi HK2",
            g.ieltsScore !== undefined && g.ieltsScore !== null ? g.ieltsScore : "",
            g.commentEn || "",
            g.commentVi || ""
          );
        } else if (sub.code === "AR") {
          r.push(g.commentEn || "", g.commentVi || "");
        }
      }
    }

    // Core competencies
    r.push(
      c.communication || "E",
      c.collaboration || "E",
      c.responsibility || "E",
      c.criticalThinking || "E",
      c.creativity || "E",
      c.problemSolving || "E"
    );

    tongHopRows.push(r);
  });

  const wsTongHop = XLSX.utils.aoa_to_sheet(tongHopRows);
  XLSX.utils.book_append_sheet(wb, wsTongHop, "TỔNG HỢP");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Parse an uploaded Excel workbook to extract CTQT grades and competencies
 */
export function parseCtqtExcel(buffer: Buffer): {
  grades: {
    studentCode: string;
    studentName: string;
    englishName?: string;
    subjectCode: string;
    progressScores?: string;
    midTermScore?: number | null;
    endTermScore?: number | null;
    gpaScore?: number | null;
    assessmentContentEn?: string;
    assessmentContentVi?: string;
    ieltsScore?: number | null;
    commentEn?: string;
    commentVi?: string;
  }[];
  competencies: {
    studentCode: string;
    communication?: string;
    collaboration?: string;
    responsibility?: string;
    criticalThinking?: string;
    creativity?: string;
    problemSolving?: string;
  }[];
  englishNames: {
    studentCode: string;
    englishName: string;
  }[];
} {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const result: ReturnType<typeof parseCtqtExcel> = {
    grades: [],
    competencies: [],
    englishNames: [],
  };

  const codeSubjectMap: Record<string, string> = {
    eng: "ENG",
    english: "ENG",
    science: "SCI",
    sci: "SCI",
    maths: "MATH",
    math: "MATH",
    "global studies": "GLOBAL_STUDIES",
    globalstudies: "GLOBAL_STUDIES",
    "a.e": "AE",
    ae: "AE",
    ielts: "IELTS",
    "a.r": "AR",
    ar: "AR",
  };

  for (const sheetName of wb.SheetNames) {
    const normSheet = sheetName.trim().toLowerCase();
    const ws = wb.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (!rawRows || rawRows.length < 2) continue;

    // Detect header row (usually row 0 or row 1)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const row = (rawRows[i] || []).map((c: any) => String(c || "").toLowerCase());
      if (row.some(c => c.includes("mã") || c.includes("student id") || c.includes("họ tên") || c.includes("student name"))) {
        headerIdx = i;
        break;
      }
    }

    const headers = (rawRows[headerIdx] || []).map((h: any) => String(h || "").trim().toLowerCase());
    const dataRows = rawRows.slice(headerIdx + 1);

    // Find column indexes
    const idIdx = headers.findIndex(h => h.includes("student id") || h.includes("mã học sinh") || h.includes("mã hs"));
    const nameIdx = headers.findIndex(h => h.includes("student name") || h.includes("họ tên") || h.includes("họ và tên"));
    const enNameIdx = headers.findIndex(h => h.includes("english name") || h.includes("tên tiếng anh"));

    // Sheet Core Competencies
    if (normSheet.includes("core") || normSheet.includes("năng lực") || normSheet.includes("competenc")) {
      const commIdx = headers.findIndex(h => h.includes("communication") || h.includes("giao tiếp"));
      const collabIdx = headers.findIndex(h => h.includes("collaboration") || h.includes("hợp tác"));
      const respIdx = headers.findIndex(h => h.includes("responsibility") || h.includes("trách nhiệm"));
      const critIdx = headers.findIndex(h => h.includes("critical") || h.includes("phản biện"));
      const creatIdx = headers.findIndex(h => h.includes("creativity") || h.includes("sáng tạo"));
      const probIdx = headers.findIndex(h => h.includes("problem") || h.includes("giải quyết"));

      for (const row of dataRows) {
        const studentCode = String(row[idIdx] || "").trim();
        if (!studentCode) continue;

        const val = (idx: number) => {
          if (idx < 0 || row[idx] === undefined || row[idx] === null) return "E";
          const s = String(row[idx]).trim().toUpperCase();
          return ["E", "S", "N", "U"].includes(s) ? s : "E";
        };

        result.competencies.push({
          studentCode,
          communication: val(commIdx),
          collaboration: val(collabIdx),
          responsibility: val(respIdx),
          criticalThinking: val(critIdx),
          creativity: val(creatIdx),
          problemSolving: val(probIdx),
        });

        if (enNameIdx >= 0 && row[enNameIdx]) {
          const enName = String(row[enNameIdx]).trim();
          if (enName) result.englishNames.push({ studentCode, englishName: enName });
        }
      }
      continue;
    }

    // Individual Subject Sheet (Eng, Science, Maths, Global Studies, A.E, IELTS, A.R)
    const subjectCode = codeSubjectMap[normSheet];
    if (subjectCode && idIdx >= 0) {
      const cmtIdx = headers.findIndex(h => h === "comments" || h.includes("comments") || h === "cmt");
      const nxIdx = headers.findIndex(h => h === "nhận xét" || h.includes("nhận xét") || h === "nx");
      const markIdx = headers.findIndex(h => h.includes("mark") || h.includes("điểm") || h === "gk" || h.includes("mid term"));
      const eotIdx = headers.findIndex(h => h.includes("eot") || h.includes("cuối kỳ") || h.includes("end term") || h === "ck");
      const gpaIdx = headers.findIndex(h => h.includes("gpa") || h.includes("tbm") || h.includes("đtb"));

      // Collect progress test columns
      const progressIndexes: number[] = [];
      headers.forEach((h, colI) => {
        if (h.includes("progress") || h.includes("kttx")) {
          progressIndexes.push(colI);
        }
      });

      for (const row of dataRows) {
        const studentCode = String(row[idIdx] || "").trim();
        const studentName = String(row[nameIdx] || "").trim();
        if (!studentCode) continue;

        if (enNameIdx >= 0 && row[enNameIdx]) {
          const enName = String(row[enNameIdx]).trim();
          if (enName) result.englishNames.push({ studentCode, englishName: enName });
        }

        const toNum = (val: any) => {
          if (val === undefined || val === null || val === "") return null;
          const n = parseFloat(String(val).replace(",", "."));
          return isNaN(n) ? null : n;
        };

        const progressScoresArr = progressIndexes.map(pI => toNum(row[pI])).filter(n => n !== null);

        result.grades.push({
          studentCode,
          studentName,
          subjectCode,
          progressScores: progressScoresArr.length > 0 ? JSON.stringify(progressScoresArr) : undefined,
          midTermScore: toNum(row[markIdx]),
          endTermScore: toNum(row[eotIdx]),
          gpaScore: toNum(row[gpaIdx]),
          ieltsScore: subjectCode === "IELTS" ? toNum(row[markIdx]) : undefined,
          commentEn: cmtIdx >= 0 && row[cmtIdx] ? String(row[cmtIdx]).trim() : undefined,
          commentVi: nxIdx >= 0 && row[nxIdx] ? String(row[nxIdx]).trim() : undefined,
        });
      }
    }
  }

  return result;
}
