import { describe, expect, it } from "vitest";
import { buildQuickReportEmailHtml, escapeHtml } from "@/lib/quick-report-email";

describe("quick-report-email responsive HTML builder", () => {
  it("builds responsive desktop + mobile HTML for K12 without 1020px overflow", () => {
    const html = buildQuickReportEmailHtml({
      level: "high",
      subject: "[Báo cáo nhanh] Kết quả Khảo sát đầu vào KSNL",
      periodName: "Tuyển sinh 2026-2027",
      batchName: "Đợt 1 - OPENDAY | CS3 (13/06/2026 - 13/06/2026)",
      batchDateRange: "13/06/2026",
      campusName: "Sky-Line Global (CS3)",
      originUrl: "https://ssm.skylineschool.edu.vn",
      students: [
        {
          id: "stu-1",
          studentCode: "SKL26001",
          fullName: "Nguyễn Minh An",
          gender: "F",
          grade: "9",
          surveyFormType: "HNS",
          dateOfBirth: "2012-05-14",
          admissionCampus: "CS3",
          admissionResult: "Đạt cam kết",
          committedSubjectsList: ["Môn Toán", "Tiếng Anh (vấn đáp)", "Tiếng Anh (viết)"],
        },
        {
          id: "stu-2",
          studentCode: "SKL26002",
          fullName: "Trần Gia Bảo",
          gender: "M",
          grade: "K7",
          surveyFormType: "HNS",
          admissionResult: "Đạt",
        },
        {
          id: "stu-3",
          studentCode: "SKL26003",
          fullName: "Lê Hoàng <Test>",
          gender: "M",
          grade: "10",
          surveyFormType: "HNI",
          admissionResult: "Không đạt",
        },
      ],
    });

    expect(html).toContain("max-width:780px");
    expect(html).not.toContain('width="1020"');
    expect(html).toContain("@media only screen and (max-width: 640px)");
    expect(html).toContain('class="desktop-only"');
    expect(html).toContain('class="mobile-only"');
    expect(html).toContain("Tỷ lệ 67%");
    expect(html).toContain("Môn Toán, Tiếng Anh (vấn đáp), Tiếng Anh (viết)");
    expect(html).toContain("Thư chúc mừng");
    expect(html).toContain("Bản cam kết");
    expect(html).toContain("Lê Hoàng &lt;Test&gt;");
    expect(html).not.toContain("Lê Hoàng <Test>");
  });

  it("builds preschool variant with preschool labels and download links", () => {
    const html = buildQuickReportEmailHtml({
      level: "preschool",
      subject: "[Báo cáo nhanh] Mầm non",
      periodName: "Tuyển sinh Mầm non 2026-2027",
      batchName: "Đợt 1",
      batchDateRange: "13/06/2026",
      campusName: "CS1",
      originUrl: "https://ssm.skylineschool.edu.vn",
      students: [
        {
          id: "mn-1",
          studentCode: "MN26001",
          fullName: "Phạm Bảo Ngọc",
          gender: "Nữ",
          grade: "Chồi",
          surveyFormType: "Hội nhập",
          admissionResult: "Đạt",
        },
      ],
    });

    expect(html).toContain("Báo cáo kết quả khảo sát đầu vào Mầm non theo đợt");
    expect(html).toContain("Tổng số bé");
    expect(html).toContain("Tỷ lệ 100%");
    expect(html).toContain("level=preschool");
  });

  it("escapes HTML special characters safely", () => {
    expect(escapeHtml(`<script>"a"&'b'</script>`)).toBe("&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;");
  });
});
