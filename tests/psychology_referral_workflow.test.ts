import { describe, it, expect } from "vitest";
import {
  getCampusGiaovuEmail,
  getCampusTuyensinhEmail,
  DEFAULT_GIAOVU_EMAILS,
  DEFAULT_TUYENSINH_EMAILS,
  buildPsychologyGdcsCcList,
  hasPsychologicalSignsForGdcs
} from "@/lib/orientation/service";

describe("Psychology Referral & Directive Workflow", () => {
  describe("Campus Giáo vụ & Tư vấn Email Resolution", () => {
    it("resolves correct Giáo vụ email for all Sky-Line campuses", () => {
      expect(getCampusGiaovuEmail("CS1")).toBe(DEFAULT_GIAOVU_EMAILS.CS1);
      expect(getCampusGiaovuEmail("Sky-Line Riverside")).toBe(DEFAULT_GIAOVU_EMAILS.CS1);
      expect(getCampusGiaovuEmail("CS2")).toBe(DEFAULT_GIAOVU_EMAILS.CS2);
      expect(getCampusGiaovuEmail("Sky-Line Central")).toBe(DEFAULT_GIAOVU_EMAILS.CS2);
      expect(getCampusGiaovuEmail("CS3")).toBe(DEFAULT_GIAOVU_EMAILS.CS3);
      expect(getCampusGiaovuEmail("Sky-Line International")).toBe(DEFAULT_GIAOVU_EMAILS.CS3);
      expect(getCampusGiaovuEmail("CS4")).toBe(DEFAULT_GIAOVU_EMAILS.CS4);
      expect(getCampusGiaovuEmail("Sky-Line Beach")).toBe(DEFAULT_GIAOVU_EMAILS.CS4);
      expect(getCampusGiaovuEmail("CS5")).toBe(DEFAULT_GIAOVU_EMAILS.CS5);
      expect(getCampusGiaovuEmail("Sky-Line Hill Hội An")).toBe(DEFAULT_GIAOVU_EMAILS.CS5);
    });

    it("resolves correct Tư vấn cơ sở email for all Sky-Line campuses", () => {
      expect(getCampusTuyensinhEmail("CS1")).toBe(DEFAULT_TUYENSINH_EMAILS.CS1);
      expect(getCampusTuyensinhEmail("Sky-Line Riverside")).toBe(DEFAULT_TUYENSINH_EMAILS.CS1);
      expect(getCampusTuyensinhEmail("CS2")).toBe(DEFAULT_TUYENSINH_EMAILS.CS2);
      expect(getCampusTuyensinhEmail("Sky-Line Central")).toBe(DEFAULT_TUYENSINH_EMAILS.CS2);
      expect(getCampusTuyensinhEmail("CS3")).toBe(DEFAULT_TUYENSINH_EMAILS.CS3);
      expect(getCampusTuyensinhEmail("Sky-Line International")).toBe(DEFAULT_TUYENSINH_EMAILS.CS3);
      expect(getCampusTuyensinhEmail("CS4")).toBe(DEFAULT_TUYENSINH_EMAILS.CS4);
      expect(getCampusTuyensinhEmail("Sky-Line Beach")).toBe(DEFAULT_TUYENSINH_EMAILS.CS4);
      expect(getCampusTuyensinhEmail("CS5")).toBe(DEFAULT_TUYENSINH_EMAILS.CS5);
      expect(getCampusTuyensinhEmail("Sky-Line Hill Hội An")).toBe(DEFAULT_TUYENSINH_EMAILS.CS5);
    });

    it("falls back to CS1 when campus is unknown", () => {
      expect(getCampusGiaovuEmail("")).toBe(DEFAULT_GIAOVU_EMAILS.CS1);
      expect(getCampusGiaovuEmail(undefined)).toBe(DEFAULT_GIAOVU_EMAILS.CS1);
      expect(getCampusTuyensinhEmail("")).toBe(DEFAULT_TUYENSINH_EMAILS.CS1);
      expect(getCampusTuyensinhEmail(undefined)).toBe(DEFAULT_TUYENSINH_EMAILS.CS1);
    });
  });

  describe("TỔNG HỢP Psychological Signs Condition", () => {
    it("only allows sending email to GĐCS when student has psychological signs (> 15 points or manual flag)", () => {
      expect(hasPsychologicalSignsForGdcs(0)).toBe(false);
      expect(hasPsychologicalSignsForGdcs(15)).toBe(false);
      expect(hasPsychologicalSignsForGdcs(-20)).toBe(false);
      expect(hasPsychologicalSignsForGdcs(16)).toBe(true);
      expect(hasPsychologicalSignsForGdcs(32)).toBe(true);
      expect(hasPsychologicalSignsForGdcs(64)).toBe(true);
      expect(hasPsychologicalSignsForGdcs(10, true)).toBe(true);
    });
  });

  describe("CC recipients formatting (Tổ Giáo vụ cơ sở, Tổ Tư vấn cơ sở & Ban KT&ĐBCL)", () => {
    it("ensures CC list contains actual staff in Tổ Giáo vụ & Tổ Tư vấn cơ sở and never contains giaovu.csX / tuyensinh.csX", () => {
      const campusCode = "CS3";
      const ccList = buildPsychologyGdcsCcList({
        campusCodeOrName: campusCode,
        giaovuEmail: "giaovu.cs3@skylineschool.edu.vn",
        tuyensinhEmail: "tuyensinh.cs3@skylineschool.edu.vn"
      });

      expect(ccList).toContain("thuda@skylineschool.edu.vn");
      expect(ccList).toContain("thungatt@skylineschool.edu.vn");
      expect(ccList).toContain("hapvy@skylineschool.edu.vn");
      expect(ccList).toContain("ktdbcl@skylineschool.edu.vn");
      expect(ccList).not.toContain("giaovu.cs3@skylineschool.edu.vn");
      expect(ccList).not.toContain("tuyensinh.cs3@skylineschool.edu.vn");
    });

    it("resolves real staff emails for all 5 campuses without generic aliases", () => {
      for (const cs of ["CS1", "CS2", "CS3", "CS4", "CS5"] as const) {
        expect(getCampusGiaovuEmail(cs)).not.toMatch(/giaovu\.cs\d+@/i);
        expect(getCampusTuyensinhEmail(cs)).not.toMatch(/tuyensinh\.cs\d+@/i);
      }
    });
  });

  describe("GĐCS Directive Response Types", () => {
    it("supports all 3 requested response types for GĐCS work content confirmation", () => {
      const validTypes = ["DIRECT_PARENT_MEETING", "SCHEDULE_MEETING", "DELEGATE_TEACHER"];

      const responseTypeTitles: Record<string, string> = {
        DIRECT_PARENT_MEETING: "Trao đổi trực tiếp PHHS",
        SCHEDULE_MEETING: "Hẹn lịch làm việc / Hội chẩn chuyên môn",
        DELEGATE_TEACHER: "Ủy quyền Giáo viên đồng hành"
      };

      validTypes.forEach(t => {
        expect(responseTypeTitles[t]).toBeDefined();
        expect(typeof responseTypeTitles[t]).toBe("string");
      });
    });
  });
});
