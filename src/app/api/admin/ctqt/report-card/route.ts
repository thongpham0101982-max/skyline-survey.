import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CTQT_LEVEL_CONFIGS, detectCtqtLevel, CORE_COMPETENCIES_DEF, CORE_COMPETENCY_RATINGS } from "@/lib/ctqt/config";
import puppeteer from "puppeteer";

export function generateReportCardHtml(
  schoolYear: string,
  semester: number,
  student: any,
  cls: any,
  level: any,
  config: any,
  grades: any[],
  competency: any
): string {
  const gradeMap = new Map<string, any>();
  grades.forEach(g => gradeMap.set(g.subjectCode, g));

  const dobStr = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
    : "";

  let subjectsHtml = "";

  for (const sub of config.subjects) {
    const g = gradeMap.get(sub.code) || {};
    let scoresHtml = "";

    if (level === "PRIMARY") {
      let progArr: any[] = [];
      try {
        progArr = JSON.parse(g.progressScores || "[]");
      } catch {
        progArr = [];
      }
      scoresHtml = `
        <td style="text-align: center; font-weight: 600;">${progArr[0] !== undefined ? progArr[0] : "-"}</td>
        <td style="text-align: center; font-weight: 600;">${g.midTermScore !== null && g.midTermScore !== undefined ? g.midTermScore : "-"}</td>
        <td style="text-align: center; font-weight: 600;">${g.endTermScore !== null && g.endTermScore !== undefined ? g.endTermScore : "-"}</td>
      `;
    } else if (level === "MIDDLE") {
      let progArr: any[] = [];
      try {
        progArr = JSON.parse(g.progressScores || "[]");
      } catch {
        progArr = [];
      }
      if (sub.isQualitative) {
        scoresHtml = `<td colspan="4" style="text-align: center; color: #64748b; font-style: italic;">Đánh giá nhận xét định tính</td>`;
      } else {
        scoresHtml = `
          <td style="text-align: center;">${progArr.slice(0, 2).join(", ") || "-"}</td>
          <td style="text-align: center;">${g.midTermScore !== null && g.midTermScore !== undefined ? g.midTermScore : "-"}</td>
          <td style="text-align: center;">${g.endTermScore !== null && g.endTermScore !== undefined ? g.endTermScore : "-"}</td>
          <td style="text-align: center; font-weight: bold; color: #0284c7;">${g.gpaScore !== null && g.gpaScore !== undefined ? g.gpaScore : "-"}</td>
        `;
      }
    } else if (level === "HIGH") {
      if (sub.isQualitative) {
        scoresHtml = `<td colspan="3" style="text-align: center; color: #64748b; font-style: italic;">Đánh giá nghiên cứu học thuật</td>`;
      } else if (sub.code === "IELTS") {
        scoresHtml = `
          <td colspan="2" style="font-size: 11px;">Điểm thi Học kỳ 2</td>
          <td style="text-align: center; font-weight: bold; color: #6366f1; font-size: 14px;">${g.ieltsScore !== null && g.ieltsScore !== undefined ? g.ieltsScore : "-"}</td>
        `;
      } else {
        scoresHtml = `
          <td colspan="2" style="font-size: 11px;">${g.assessmentContentVi || g.assessmentContentEn || "Bài kiểm tra định kỳ"}</td>
          <td style="text-align: center; font-weight: bold; color: #0f766e;">${g.midTermScore !== null && g.midTermScore !== undefined ? g.midTermScore : "-"}</td>
        `;
      }
    }

    subjectsHtml += `
      <tr>
        <td style="font-weight: 700; color: #0f172a; width: 140px;">
          ${sub.nameEn}
          <div style="font-size: 11px; font-weight: normal; color: #64748b;">${sub.nameVi}</div>
        </td>
        ${scoresHtml}
        <td style="padding: 8px 10px; font-size: 11px; line-height: 1.45;">
          ${g.commentEn ? `<div style="color: #1e293b; margin-bottom: 4px;">${g.commentEn}</div>` : ""}
          ${g.commentVi ? `<div style="color: #475569; font-style: italic;">${g.commentVi}</div>` : ""}
          ${!g.commentEn && !g.commentVi ? `<span style="color: #94a3b8;">Chưa có nhận xét</span>` : ""}
        </td>
      </tr>
    `;
  }

  // Core Competencies
  let ccRows = "";
  CORE_COMPETENCIES_DEF.forEach(cc => {
    const val = (competency && (competency as any)[cc.key]) || "E";
    const ratingObj = CORE_COMPETENCY_RATINGS.find(r => r.code === val) || CORE_COMPETENCY_RATINGS[0];
    ccRows += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 6px; border: 1px solid #e2e8f0;">
        <div>
          <span style="font-weight: 600; color: #1e293b; font-size: 12px;">${cc.labelEn}</span>
          <span style="font-size: 11px; color: #64748b; margin-left: 6px;">(${cc.labelVi})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 800; font-size: 13px; color: #0284c7; background: #e0f2fe; padding: 2px 10px; border-radius: 12px; border: 1px solid #bae6fd;">${val}</span>
          <span style="font-size: 11px; color: #475569;">${ratingObj.labelEn}</span>
        </div>
      </div>
    `;
  });

  // Table header according to level
  let subHeaderHtml = "";
  if (level === "PRIMARY") {
    subHeaderHtml = `
      <th style="width: 140px;">Subject / Môn</th>
      <th style="width: 65px; text-align: center;">KTTX<br><span style="font-size: 9px; font-weight: normal;">Progress</span></th>
      <th style="width: 65px; text-align: center;">GK<br><span style="font-size: 9px; font-weight: normal;">Mid Term</span></th>
      <th style="width: 65px; text-align: center;">CK<br><span style="font-size: 9px; font-weight: normal;">End Term</span></th>
      <th>Comments & Evaluation / Nhận xét đánh giá</th>
    `;
  } else if (level === "MIDDLE") {
    subHeaderHtml = `
      <th style="width: 140px;">Subject / Môn</th>
      <th style="width: 75px; text-align: center;">KTTX<br><span style="font-size: 9px; font-weight: normal;">Progress</span></th>
      <th style="width: 55px; text-align: center;">GK<br><span style="font-size: 9px; font-weight: normal;">Mid Term</span></th>
      <th style="width: 55px; text-align: center;">CK<br><span style="font-size: 9px; font-weight: normal;">End Term</span></th>
      <th style="width: 55px; text-align: center; color: #0284c7;">ĐTB<br><span style="font-size: 9px; font-weight: normal;">GPA</span></th>
      <th>Comments & Evaluation / Nhận xét đánh giá</th>
    `;
  } else {
    subHeaderHtml = `
      <th style="width: 140px;">Subject / Môn</th>
      <th colspan="2" style="width: 160px;">Assessment Event / Nội dung</th>
      <th style="width: 70px; text-align: center;">Score<br><span style="font-size: 9px; font-weight: normal;">Điểm / Band</span></th>
      <th>Comments & Evaluation / Nhận xét đánh giá</th>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Report Card - ${student.studentName}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          font-size: 12px;
          background: #fff;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #003B3A;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .school-title {
          font-size: 16px;
          font-weight: 800;
          color: #003B3A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .report-title {
          font-size: 18px;
          font-weight: 900;
          color: #0284C7;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .report-sub {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px 16px;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 16px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }
        .info-val {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        .section-header {
          font-size: 13px;
          font-weight: 800;
          color: #003B3A;
          text-transform: uppercase;
          margin: 14px 0 8px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
        }
        th {
          background: #f1f5f9;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
        }
        .signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          text-align: center;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sign-title {
          font-weight: 700;
          font-size: 11px;
          color: #334155;
          text-transform: uppercase;
        }
        .sign-sub {
          font-size: 10px;
          color: #64748b;
          margin-bottom: 45px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="school-title">Sky-Line International Education System</div>
          <div class="report-title">Academic Report Card</div>
          <div class="report-sub">Báo cáo Kết quả Học tập Chương trình Quốc tế</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 14px; color: #0f172a;">Học kỳ ${semester}</div>
          <div style="font-size: 11px; color: #64748b;">Năm học: ${schoolYear}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Họ và tên / Student Name</span>
          <span class="info-val">${student.studentName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">English Name</span>
          <span class="info-val" style="color: #0284c7;">${student.englishName || "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Mã học sinh / Student ID</span>
          <span class="info-val">${student.studentCode}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Lớp / Class</span>
          <span class="info-val">${cls.className}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Ngày sinh / Date of Birth</span>
          <span class="info-val">${dobStr || "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Giới tính / Gender</span>
          <span class="info-val">${student.gender === "Nu" || student.gender === "Nữ" ? "Nữ (Female)" : "Nam (Male)"}</span>
        </div>
      </div>

      <div class="section-header">I. Academic Performance / Kết quả Môn học thuật</div>
      <table>
        <thead>
          <tr>${subHeaderHtml}</tr>
        </thead>
        <tbody>
          ${subjectsHtml}
        </tbody>
      </table>

      <div class="section-header">II. Core Competencies / Năng lực Cốt lõi</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px;">
        <div>${ccRows.split("</div>").slice(0, 3).join("</div>")}</div>
        <div>${ccRows.split("</div>").slice(3).join("</div>")}</div>
      </div>
      <div style="font-size: 10px; color: #64748b; margin-top: 4px; text-align: center;">
        * Thang đánh giá: <strong>E</strong> (Excellent / Tốt) | <strong>S</strong> (Satisfactory / Đạt yêu cầu) | <strong>N</strong> (Needs improvement / Cần cải thiện) | <strong>U</strong> (Unsatisfactory / Chưa đạt)
      </div>

      <div class="signatures">
        <div>
          <div class="sign-title">English Teacher</div>
          <div class="sign-sub">Giáo viên Tiếng Anh</div>
        </div>
        <div>
          <div class="sign-title">Homeroom Teacher</div>
          <div class="sign-sub">Giáo viên Chủ nhiệm</div>
        </div>
        <div>
          <div class="sign-title">Head of Academic Affairs</div>
          <div class="sign-sub">Giám đốc Học thuật / Hiệu trưởng</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { classId, studentId, academicYearId, semester } = body;

    if (!classId || !academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu classId hoặc academicYearId" }, { status: 400 });
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      include: { campus: true },
    });
    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Không tìm thấy lớp" }, { status: 404 });
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    const level = detectCtqtLevel(targetClass.className, targetClass.grade, targetClass.level);
    const config = CTQT_LEVEL_CONFIGS[level];

    // Fetch student(s)
    const studentWhere: any = { classId, status: "ACTIVE" };
    if (studentId) studentWhere.id = studentId;

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: { studentName: "asc" },
    });

    if (students.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh nào" }, { status: 404 });
    }

    const studentIds = students.map(s => s.id);

    const grades = await prisma.ctqtGradeEntry.findMany({
      where: {
        classId,
        academicYearId,
        semester: parseInt(semester || "1", 10),
        studentId: { in: studentIds },
      },
    });

    const competencies = await prisma.ctqtCompetencyEntry.findMany({
      where: {
        classId,
        academicYearId,
        semester: parseInt(semester || "1", 10),
        studentId: { in: studentIds },
      },
    });

    const compMap = new Map<string, any>();
    competencies.forEach(c => compMap.set(c.studentId, c));

    // Generate combined HTML pages
    const pagesHtml = students
      .map((st, i) => {
        const stGrades = grades.filter(g => g.studentId === st.id);
        const stComp = compMap.get(st.id);
        const html = generateReportCardHtml(
          academicYear?.name || "2025 - 2026",
          parseInt(semester || "1", 10),
          st,
          targetClass,
          level,
          config,
          stGrades,
          stComp
        );
        return `<div style="${i > 0 ? "page-break-before: always;" : ""}">${html}</div>`;
      })
      .join("\n");

    const fullHtml = `<!DOCTYPE html><html><body>${pagesHtml}</body></html>`;

    // Render PDF with Puppeteer
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

    const fileName = studentId && students.length === 1
      ? `ReportCard_${students[0].studentCode}_${students[0].studentName.replace(/\s+/g, "_")}.pdf`
      : `ReportCard_${targetClass.className.replace(/\s+/g, "_")}_HK${semester}.pdf`;

    const asciiFileName = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    const encodedFileName = encodeURIComponent(fileName);

    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error: any) {
    console.error("Error in CTQT Report Card POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
