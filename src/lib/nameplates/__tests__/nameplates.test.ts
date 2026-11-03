import { describe, it, expect } from "vitest";
import {
  NAMEPLATE_TEMPLATES,
  NAMEPLATE_COLOR_THEMES,
  resolveTemplateByGrade,
  resolveColorThemeBySystemAndCampus,
  resolveLevelDisplayLabel,
  getAdaptiveStudentNameStyle,
} from "../config";
import { getStudentVerifyUrl } from "@/lib/student/lifelong-qr";

describe("Student Nameplate System (In bảng tên Họp PHHS Sky-Line)", () => {
  describe("1. 04 Template Groups by Grade (Section 3)", () => {
    it("provides at least 04 template groups corresponding to Grade 1, 2-5, 6-9, 10-12", () => {
      expect(Object.keys(NAMEPLATE_TEMPLATES)).toEqual([
        "MODEL_01_G1",
        "MODEL_02_G2_5",
        "MODEL_03_G6_9",
        "MODEL_04_G10_12",
      ]);
    });

    it("maps Grade 1 to Mẫu 01 (MODEL_01_G1)", () => {
      expect(resolveTemplateByGrade("1")).toBe("MODEL_01_G1");
      expect(resolveTemplateByGrade("Khối 1")).toBe("MODEL_01_G1");
    });

    it("maps Grades 2 to 5 to Mẫu 02 (MODEL_02_G2_5)", () => {
      expect(resolveTemplateByGrade("2/1")).toBe("MODEL_02_G2_5");
      expect(resolveTemplateByGrade("4S")).toBe("MODEL_02_G2_5");
      expect(resolveTemplateByGrade("5A")).toBe("MODEL_02_G2_5");
    });

    it("maps Grades 6 to 9 to Mẫu 03 (MODEL_03_G6_9)", () => {
      expect(resolveTemplateByGrade("6/2")).toBe("MODEL_03_G6_9");
      expect(resolveTemplateByGrade("8G")).toBe("MODEL_03_G6_9");
      expect(resolveTemplateByGrade("9/1")).toBe("MODEL_03_G6_9");
    });

    it("maps Grades 10 to 12 to Mẫu 04 (MODEL_04_G10_12)", () => {
      expect(resolveTemplateByGrade("10GAC")).toBe("MODEL_04_G10_12");
      expect(resolveTemplateByGrade("11A1")).toBe("MODEL_04_G10_12");
      expect(resolveTemplateByGrade("12S")).toBe("MODEL_04_G10_12");
    });

    it("resolves accurate Vietnamese education level labels (Cấp học)", () => {
      expect(resolveLevelDisplayLabel("TIEU_HOC", "4S")).toBe("TIỂU HỌC");
      expect(resolveLevelDisplayLabel("THCS", "7/1")).toBe("THCS");
      expect(resolveLevelDisplayLabel("THPT", "12A")).toBe("THPT");
    });
  });

  describe("2. Color Rules & System Detection (Section 3 & 10)", () => {
    it("uses Purple primary color (#2E1065 / #5B21B6) for Global system", () => {
      const themeId = resolveColorThemeBySystemAndCampus("Global", "Sky-Line Global", "4G");
      expect(themeId).toBe("GLOBAL_PURPLE");
      const theme = NAMEPLATE_COLOR_THEMES[themeId];
      expect(theme.primaryDark).toBe("#35186B");
      expect(theme.primaryMain).toBe("#5B21B6");
      expect(theme.secondaryLight).toBe("#DDD6FE");
    });

    it("resolves official SSM campus/system color themes for non-Global classes", () => {
      expect(resolveColorThemeBySystemAndCampus("MOET", "Sky-Line Riverside", "4/1")).toBe("SKYLINE_TEAL");
      expect(resolveColorThemeBySystemAndCampus("MOET", "Sky-Line Hill", "4/2")).toBe("HILL_GOLD");
      expect(resolveColorThemeBySystemAndCampus("MOET", "Sky-Line Beach", "4/3")).toBe("BEACH_BLUE");
      expect(resolveColorThemeBySystemAndCampus("Song bằng", "Sky-Line Central", "4/4")).toBe("CENTRAL_INDIGO");
    });
  });

  describe("3. Long Vietnamese Name Auto-Scaling (Section 7 & 11.5)", () => {
    it("renders standard names (<=18 chars) on a single prominent line", () => {
      const style = getAdaptiveStudentNameStyle("Nguyễn Khánh Linh", "MODEL_02_G2_5");
      expect(style.allowWrap).toBe(false);
      expect(style.fontSizeMm).toBeGreaterThanOrEqual(7.0);
    });

    it("scales down medium-long names (19-28 chars) without truncation", () => {
      const style = getAdaptiveStudentNameStyle("Nguyễn Phúc Hoàng Bảo Ngân", "MODEL_02_G2_5");
      expect(style.allowWrap).toBe(false);
      expect(style.fontSizeMm).toBeGreaterThanOrEqual(5.4);
      expect(style.fontSizeMm).toBeLessThan(7.4);
    });

    it("wraps very long names (>33 chars, e.g. compound royal/ethnic Vietnamese names) cleanly without overflow", () => {
      const veryLongName = "Công Tằng Tôn Nữ Nguyễn Phúc Huyền Trân";
      const style = getAdaptiveStudentNameStyle(veryLongName, "MODEL_01_G1");
      expect(style.allowWrap).toBe(true);
      expect(style.fontSizeMm).toBeGreaterThanOrEqual(4.6);
    });
  });

  describe("4. QR Code Security & Non-Exposure of Personal Data (Section 5 & 10)", () => {
    it("generates a verification URL containing only the student code and never raw personal data or scores", () => {
      const qrUrl = getStudentVerifyUrl("0701030404");
      expect(qrUrl).toContain("/profile/verify/0701030404");
      expect(qrUrl).not.toContain("Nguyễn");
      expect(qrUrl).not.toContain("gpa");
      expect(qrUrl).not.toContain("score");
    });
  });

  describe("5. Large Class Batch A4 Pagination (Section 2 & 7)", () => {
    it("groups a 45-student class into 23 A4 pages with 2 nameplates per page", () => {
      const students = Array.from({ length: 45 }, (_, idx) => ({
        id: `stu-${idx + 1}`,
        code: `07010304${String(idx + 1).padStart(2, "0")}`,
        fullName: `Học Sinh Thứ ${idx + 1}`,
      }));

      const sheets: Array<[typeof students[0], (typeof students[0]) | null]> = [];
      for (let i = 0; i < students.length; i += 2) {
        sheets.push([students[i], students[i + 1] || null]);
      }

      expect(sheets.length).toBe(23);
      expect(sheets[0][0].code).toBe("0701030401");
      expect(sheets[0][1]?.code).toBe("0701030402");
      expect(sheets[22][0].code).toBe("0701030445");
      expect(sheets[22][1]).toBeNull();
    });
  });
});
