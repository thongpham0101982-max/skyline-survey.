// @ts-nocheck
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/db";
import {
  extractCommittedSubjectsListFromNote,
  renderEntranceLetterA4Html,
  resolveCampusDisplayInfo,
  sanitizeVietnameseFileNamePart,
  verifyEntranceLetterDownloadToken,
  type EntranceLetterDocType,
  type EntranceLetterLevel,
} from "@/lib/entrance-letter-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "").trim();
    const rawDocType = String(searchParams.get("docType") || "thu_chuc_mung").trim();
    const rawLevel = String(searchParams.get("level") || "high").trim();
    const token = String(searchParams.get("token") || "").trim();

    const docType: EntranceLetterDocType =
      rawDocType === "cam_ket_hoc_tap" ? "cam_ket_hoc_tap" : "thu_chuc_mung";
    const level: EntranceLetterLevel =
      rawLevel === "preschool" ? "preschool" : "high";

    if (!studentId || !token) {
      return NextResponse.json(
        { error: "Thiếu thông tin xác thực tài liệu." },
        { status: 400 }
      );
    }

    if (!verifyEntranceLetterDownloadToken(studentId, docType, level, token)) {
      return NextResponse.json(
        { error: "Liên kết tải văn bản không hợp lệ hoặc đã hết hiệu lực." },
        { status: 403 }
      );
    }

    // 1. Tải hồ sơ học sinh từ CSDL (hỗ trợ cả id và studentCode)
    let student: any = null;
    if (level === "preschool") {
      student = await (prisma as any).preschoolInputAssessmentStudent.findFirst({
        where: { OR: [{ id: studentId }, { studentCode: studentId }] },
        include: {
          period: true,
          batch: true,
        },
      });
    } else {
      student = await (prisma as any).inputAssessmentStudent.findFirst({
        where: { OR: [{ id: studentId }, { studentCode: studentId }] },
        include: {
          period: true,
          batch: true,
        },
      });
    }

    if (!student) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ học sinh tương ứng." },
        { status: 404 }
      );
    }

    // 2. Tra cứu Giám đốc Cơ sở & Chữ ký số (nếu có) theo cơ sở tiếp nhận
    const rawCampus =
      student.admissionCampus ||
      student.registeredCampus ||
      student.batch?.name ||
      "";
    const { campusCode } = resolveCampusDisplayInfo(rawCampus);

    let directorName: string = String(student.signatureName || "").trim();
    let directorSignatureUrl: string = "";

    try {
      const campusObj = await prisma.campus.findFirst({
        where: {
          OR: [
            { campusCode: campusCode },
            ...(student.campusId ? [{ id: student.campusId }] : []),
          ],
        },
        include: {
          manager: {
            include: { teacher: true },
          },
        },
      });

      if (!directorName) {
        directorName =
          campusObj?.manager?.teacher?.fullName ||
          campusObj?.manager?.fullName ||
          "";
      }
      if ((campusObj?.manager?.teacher as any)?.digitalSignatureUrl) {
        directorSignatureUrl = (campusObj.manager.teacher as any).digitalSignatureUrl;
      }
    } catch {}

    // 3. Tách danh sách Môn cam kết
    const committedSubjects = extractCommittedSubjectsListFromNote(
      student.directorNote || student.notes || student.comment
    );

    const academicYear =
      student.academicYear ||
      student.period?.academicYear ||
      "";

    const html = renderEntranceLetterA4Html({
      docType,
      level,
      fullName: student.fullName || "Học sinh",
      studentCode: student.studentCode,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      grade: student.grade,
      surveyFormType: student.surveyFormType || student.surveySystem,
      academicYear,
      admissionCampus: rawCampus,
      batchName: student.batch?.name,
      committedSubjects,
      directorName: directorName || "Giám đốc Cơ sở",
      directorSignatureUrl,
    });

    const docPrefix = docType === "cam_ket_hoc_tap" ? "Ban_Cam_Ket" : "Thu_Chuc_Mung";
    const namePart = sanitizeVietnameseFileNamePart(student.fullName || student.studentCode || "HocSinh");
    const safePdfFilename = `${docPrefix}_${namePart}.pdf`;

    // 4. Xuất PDF trực tiếp bằng Puppeteer để tải về ngay khi click trong email
    let browser: any = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
      await page.emulateMediaType("print");
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfUint8 = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        scale: 1,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      await browser.close();
      browser = null;

      return new NextResponse(Buffer.from(pdfUint8), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safePdfFilename}"`,
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    } catch (pdfErr) {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      console.error("Entrance letter direct PDF error, falling back to print HTML:", pdfErr);
      const fallbackHtml = html.replace(
        "<body>",
        `<body>
          <div class="no-print" style="background:#003B3A;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;font-family:Segoe UI,Arial,sans-serif;font-size:13px;">
            <span><strong>Sky-Line SSM</strong> — ${docPrefix.replace(/_/g, " ")}: ${student.fullName || ""}</span>
            <button onclick="window.print()" style="background:#00A19A;color:#fff;border:none;padding:7px 14px;border-radius:6px;font-weight:700;cursor:pointer;">🖨 In / Lưu PDF</button>
          </div>
          <style>@media print { .no-print { display: none !important; } }</style>`
      );
      return new NextResponse(fallbackHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }
  } catch (error: any) {
    console.error("API /api/public/entrance-letter-download error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi máy chủ khi tạo văn bản PDF." },
      { status: 500 }
    );
  }
}
