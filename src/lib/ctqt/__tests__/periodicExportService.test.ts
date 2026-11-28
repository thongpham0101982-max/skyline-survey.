import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  generateCtqtPeriodicWorkbook,
  getUniqueCtqtSubjectsForLevels,
} from "../periodicExportService";

describe("CTQT Periodic Export Service", () => {
  const mockClasses = [
    { id: "c1", className: "1.1INT_CS3", grade: "1", level: "Tiểu học", campusName: "Cơ sở 3", campusCode: "CS3" },
    { id: "c6", className: "6.1INT_CS1", grade: "6", level: "THCS", campusName: "Cơ sở 1", campusCode: "CS1" },
    { id: "c10", className: "10.1INT_CS1", grade: "10", level: "THPT", campusName: "Cơ sở 1", campusCode: "CS1" },
  ];

  const mockStudents = [
    { id: "s1", classId: "c1", studentCode: "HS001", studentName: "Nguyễn An", englishName: "Andy", gender: "Nam" },
    { id: "s2", classId: "c6", studentCode: "HS002", studentName: "Trần Bình", englishName: "Ben", gender: "Nam" },
    { id: "s3", classId: "c10", studentCode: "HS003", studentName: "Lê Chi", englishName: "Chloe", gender: "Nữ" },
  ];

  const mockGrades = [
    {
      classId: "c1",
      studentId: "s1",
      subjectCode: "ENG",
      progressScores: JSON.stringify([92]),
      midTermScore: 88,
      endTermScore: 95,
      commentEn: "Great progress",
      commentVi: "Tiến bộ tốt",
      reviewStatus: "APPROVED",
    },
    {
      classId: "c1",
      studentId: "s1",
      subjectCode: "MATH", // Legacy code normalized to MAT
      midTermScore: 90,
      endTermScore: 94,
      reviewStatus: "DRAFT",
    },
    {
      classId: "c6",
      studentId: "s2",
      subjectCode: "ENG",
      progressScores: JSON.stringify([80, 85, 88, 90]),
      midTermScore: 84,
      endTermScore: 89,
      gpaScore: 86.5,
      reviewStatus: "PENDING_REVIEW",
    },
    {
      classId: "c10",
      studentId: "s3",
      subjectCode: "IELTS",
      ieltsScore: 7.5,
      commentEn: "Strong writing",
      commentVi: "Kỹ năng viết tốt",
      reviewStatus: "APPROVED",
    },
  ];

  const mockAssignments = [
    { classId: "c1", subjectCode: "ENG", primaryTeacherName: "Ms. Sarah" },
    { classId: "c6", subjectCode: "ENG", primaryTeacherName: "Mr. John" },
  ];

  it("aggregates unique subjects for selected educational levels", () => {
    const primarySubs = getUniqueCtqtSubjectsForLevels(["PRIMARY"]);
    expect(primarySubs.map(s => s.code)).toEqual(["ENG", "SCI", "MAT"]);

    const allSubs = getUniqueCtqtSubjectsForLevels(["PRIMARY", "MIDDLE", "HIGH"]);
    expect(allSubs.map(s => s.code)).toEqual(["ENG", "SCI", "MAT", "GLOBAL_STUDIES", "AE", "IELTS", "AR"]);
  });

  it("generates GK1 workbook with Overview, Summary, and selected subject sheets", () => {
    const buffer = generateCtqtPeriodicWorkbook({
      academicYearName: "2026-2027",
      campusLabel: "Tất cả Cơ sở",
      periodCode: "GK1",
      selectedGrades: [1, 6, 10],
      selectedSubjectCodes: ["ENG", "MAT", "IELTS"],
      classes: mockClasses,
      students: mockStudents,
      grades: mockGrades,
      competencies: [],
      assignments: mockAssignments,
      options: {
        includeOverview: true,
        includeSummary: true,
        includeComments: true,
        includeCompetencies: false,
      },
    });

    const wb = XLSX.read(buffer, { type: "buffer" });
    expect(wb.SheetNames).toEqual([
      "Tổng quan",
      "TỔNG HỢP",
      "ENG - Tiếng Anh",
      "MAT - Toán quốc tế",
      "IELTS - IELTS",
    ]);

    // Check ENG sheet content (only PRIMARY & MIDDLE students)
    const engRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets["ENG - Tiếng Anh"], { header: 1 });
    // Row index 3 is header, rows 4 and 5 are s1 (c1) and s2 (c6)
    expect(engRows[3]).toContain("Điểm GK1 (Giữa kỳ)");
    expect(engRows[3]).toContain("GV giảng dạy");
    expect(engRows[4]).toContain("HS001");
    expect(engRows[4]).toContain("Ms. Sarah");
    expect(engRows[4]).toContain(88);
    expect(engRows[4]).toContain("Đã duyệt");
    expect(engRows[5]).toContain("HS002");
    expect(engRows[5]).toContain(84);

    // Check MAT sheet normalizes MATH -> MAT
    const matRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets["MAT - Toán quốc tế"], { header: 1 });
    expect(matRows[4]).toContain("HS001");
    expect(matRows[4]).toContain(90);

    // Check IELTS sheet (only HIGH student)
    const ieltsRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets["IELTS - IELTS"], { header: 1 });
    expect(ieltsRows.length).toBe(5); // 3 meta rows + 1 header + 1 student
    expect(ieltsRows[4]).toContain("HS003");
    expect(ieltsRows[4]).toContain(7.5);
  });

  it("respects CK2 mode (includes EndTerm and Middle GPA) and optional flags", () => {
    const buffer = generateCtqtPeriodicWorkbook({
      academicYearName: "2026-2027",
      campusLabel: "Cơ sở 1",
      periodCode: "CK2",
      selectedGrades: [6],
      selectedSubjectCodes: ["ENG"],
      classes: [mockClasses[1]],
      students: [mockStudents[1]],
      grades: [mockGrades[2]],
      competencies: [
        {
          classId: "c6",
          studentId: "s2",
          communication: "E",
          collaboration: "S",
          responsibility: "E",
          criticalThinking: "E",
          creativity: "S",
          problemSolving: "E",
        },
      ],
      assignments: mockAssignments,
      options: {
        includeOverview: false,
        includeSummary: false,
        includeComments: false,
        includeCompetencies: true,
      },
    });

    const wb = XLSX.read(buffer, { type: "buffer" });
    expect(wb.SheetNames).toEqual(["ENG - Tiếng Anh", "Core Competencies"]);

    const engRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets["ENG - Tiếng Anh"], { header: 1 });
    expect(engRows[3]).toContain("Điểm CK2 (Cuối kỳ)");
    expect(engRows[3]).toContain("ĐTB Môn (HK2)");
    expect(engRows[3]).not.toContain("Nhận xét tiếng Anh (Comment EN)");
    expect(engRows[4]).toContain(89);
    expect(engRows[4]).toContain(86.5);
  });
});
