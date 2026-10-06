import { generateReportCardHtml } from "../src/app/api/admin/ctqt/report-card/route";
import { CTQT_LEVEL_CONFIGS } from "../src/lib/ctqt/config";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

async function run() {
  console.log("Testing Report Card PDF Generation...");

  const mockPayload = {
    student: {
      id: "test-st-1",
      studentCode: "2024001",
      fullName: "Nguyễn Hoàng Minh",
      englishName: "Minh Nguyen (Leo)",
      dateOfBirth: "2013-05-15",
      gender: "MALE",
      class: {
        id: "class-1",
        className: "6UK",
        level: "THCS",
        campus: {
          campusName: "Sky-Line International Đà Nẵng",
          campusCode: "CS1"
        }
      }
    },
    academicYear: {
      name: "2024 - 2025"
    },
    semester: 2,
    ctqtLevel: "MIDDLE",
    grades: [
      {
        subjectCode: "ENG",
        subjectNameVi: "Tiếng Anh (English)",
        subjectNameEn: "English",
        progressScores: [95, 92, 94, 96],
        midTermScore: 90,
        endTermScore: 95,
        gpaScore: 93.5,
        commentEn: "Minh consistently shows great dedication, insightful critical thinking, and fluent oral communication in all classroom discussions.",
        commentVi: "Minh luôn thể hiện tinh thần học tập xuất sắc, tư duy phản biện nhạy bén và diễn đạt tiếng Anh lưu loát trong mọi giờ học."
      },
      {
        subjectCode: "SCI",
        subjectNameVi: "Khoa học (Science)",
        subjectNameEn: "Science",
        progressScores: [88, 92],
        midTermScore: 85,
        endTermScore: 90,
        gpaScore: 88.8,
        commentEn: "Excellent grasp of scientific inquiry and lab experimentation procedures.",
        commentVi: "Nắm vững phương pháp nghiên cứu khoa học và thực hành thí nghiệm rất chuẩn xác."
      },
      {
        subjectCode: "MATH",
        subjectNameVi: "Toán học (Mathematics)",
        subjectNameEn: "Mathematics",
        progressScores: [98, 100],
        midTermScore: 95,
        endTermScore: 98,
        gpaScore: 97.8,
        commentEn: "Outstanding mathematical intuition and problem-solving skills.",
        commentVi: "Trực giác toán học xuất sắc và kỹ năng giải quyết bài toán phức tạp rất tốt."
      },
      {
        subjectCode: "GLOBAL_STUDIES",
        subjectNameVi: "Nghiên cứu Toàn cầu",
        subjectNameEn: "Global Perspectives",
        progressScores: [],
        midTermScore: null,
        endTermScore: null,
        gpaScore: null,
        commentEn: "Active participation in global debate topics and cultural exchange sessions.",
        commentVi: "Tích cực tham gia tranh biện các chủ đề quốc tế và giao lưu văn hóa."
      }
    ],
    competencies: {
      communication: "E",
      collaboration: "E",
      responsibility: "E",
      criticalThinking: "S",
      creativity: "S",
      problemSolving: "E",
      generalCommentEn: "Minh is a model international student with balanced development in academics and global citizenship.",
      generalCommentVi: "Minh là học sinh tiêu biểu của chương trình Quốc tế, phát triển toàn diện cả về học thuật lẫn phẩm chất công dân toàn cầu."
    }
  };

  try {
    const config = CTQT_LEVEL_CONFIGS.MIDDLE;
    const html = generateReportCardHtml(
      mockPayload.academicYear.name,
      mockPayload.semester,
      mockPayload.student,
      mockPayload.student.class,
      mockPayload.ctqtLevel,
      config,
      mockPayload.grades,
      mockPayload.competencies
    );

    const fullHtml = `<!DOCTYPE html><html><body>${html}</body></html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    const outputPath = path.resolve("./scratch/test_report_card_output.pdf");
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log("✅ PDF Generated successfully! Size:", pdfBuffer.length, "bytes at", outputPath);
  } catch (err) {
    console.error("❌ Failed to generate PDF:", err);
  }
}

run();
