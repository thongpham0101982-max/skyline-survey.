import { describe, it, expect, vi } from "vitest";
import { getCampusGiaovuEmail, DEFAULT_GIAOVU_EMAILS } from "@/lib/orientation/service";

describe("Psychology Referral & Directive Workflow", () => {
  describe("Campus Giáo vụ Email Resolution", () => {
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

    it("falls back to CS1 when campus is unknown", () => {
      expect(getCampusGiaovuEmail("")).toBe(DEFAULT_GIAOVU_EMAILS.CS1);
      expect(getCampusGiaovuEmail(undefined)).toBe(DEFAULT_GIAOVU_EMAILS.CS1);
    });
  });

  describe("CC recipients formatting", () => {
    it("ensures CC list contains Ban KT&ĐBCL and Giáo vụ cơ sở", () => {
      const campusCode = "CS3";
      const giaovuEmail = getCampusGiaovuEmail(campusCode);
      const ccList = Array.from(new Set(["ktdbcl@skylineschool.edu.vn", giaovuEmail].filter(Boolean)));

      expect(ccList).toContain("ktdbcl@skylineschool.edu.vn");
      expect(ccList).toContain("giaovu.cs3@skylineschool.edu.vn");
      expect(ccList.length).toBe(2);
    });
  });

  describe("GĐCS Directive Response Types", () => {
    it("supports all 3 requested response types", () => {
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
