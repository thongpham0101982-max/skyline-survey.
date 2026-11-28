// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { buildStudentQuickApproveUrls, generateBatchApprovalToken } from "@/lib/k12-approval-service";
import { requireEntranceOperationsSession } from "@/lib/security-guard";

function extractShortCampus(raw?: string | null): string {
  const s = String(raw || "").trim();
  if (!s) return "Sky-Line";
  const upper = s.toUpperCase();
  if (upper.includes("CS1") || upper.includes("RIVERSIDE")) return "CS1";
  if (upper.includes("CS2") || upper.includes("CENTRAL")) return "CS2";
  if (upper.includes("CS3") || upper.includes("GLOBAL") || upper.includes("INTERNATIONAL")) return "CS3";
  if (upper.includes("CS4") || upper.includes("HILL")) return "CS4";
  if (upper.includes("CS5") || upper.includes("BEACH")) return "CS5";
  return s;
}

function summarizeStudentScoresForEmail(s: any): string {
  const lines: string[] = [];
  if (Array.isArray(s.scores) && s.scores.length > 0) {
    for (const sc of s.scores) {
      const sub = sc?.subject || {};
      const subName = String(sub.name || sc.subjectName || "Môn").trim();
      const sNameLower = subName.toLowerCase().normalize("NFC");
      const sCode = String(sub.code || "").toLowerCase();
      if (sCode.includes("pdh") || sCode.includes("orientation") || sNameLower.includes("định hướng")) continue;

      let vArr: any[] = [];
      try {
        const parsed = Array.isArray(sc.scores) ? sc.scores : JSON.parse(sc.scores || "[]");
        vArr = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        vArr = sc.scores ? [sc.scores] : [];
      }

      if (sCode.includes("tci") || sCode.includes("cpt") || sNameLower.includes("chuẩn phát triển")) {
        const passed = vArr.filter(x => ["3", "Đạt", "DAT"].includes(String(x ?? "").trim())).length;
        const total = vArr.length > 0 ? vArr.length : 16;
        lines.push(`<b>${subName}:</b> ${passed}/${total} Đạt`);
        continue;
      }
      if (sCode.includes("tly") || sNameLower.includes("tâm lý")) {
        const scNum = parseFloat(vArr[6] ?? vArr[20] ?? vArr[0] ?? "0");
        if (!isNaN(scNum)) {
          const lvl = scNum <= 15 ? "Bình thường" : scNum <= 31 ? "Dấu hiệu nhẹ" : scNum <= 47 ? "Dấu hiệu vừa" : "Nguy cơ cao";
          lines.push(`<b>${subName}:</b> ${lvl} (${scNum}đ)`);
        }
        continue;
      }
      if (sCode.includes("nltd") || sNameLower.includes("năng lực tư duy")) {
        const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
        if (pctVal !== undefined && pctVal !== null && String(pctVal).trim() !== "") {
          lines.push(`<b>${subName}:</b> ${pctVal}%`);
        }
        continue;
      }
      const nonEmpty = vArr.filter(x => x !== undefined && x !== null && String(x).trim() !== "");
      if (nonEmpty.length > 0) {
        lines.push(`<b>${subName}:</b> ${nonEmpty[0]}`);
      }
    }
  }
  if (lines.length === 0) {
    if (s.mathScore !== null && s.mathScore !== undefined) lines.push(`<b>Toán:</b> ${s.mathScore}đ`);
    if (s.literatureScore !== null && s.literatureScore !== undefined) lines.push(`<b>TV/Văn:</b> ${s.literatureScore}đ`);
    if (s.writtenEnglishScore !== null && s.writtenEnglishScore !== undefined) lines.push(`<b>TA Viết:</b> ${s.writtenEnglishScore}đ`);
    if (s.oralEnglishScore !== null && s.oralEnglishScore !== undefined) lines.push(`<b>TA Nói:</b> ${s.oralEnglishScore}đ`);
    if (s.psychologyScore !== null && s.psychologyScore !== undefined) lines.push(`<b>Tâm lý:</b> ${s.psychologyScore}đ`);
    if (s.devAssessmentResult) lines.push(`<b>Đánh giá:</b> ${s.devAssessmentResult}`);
  }
  return lines.length > 0 ? lines.join("<br/>") : "—";
}

export async function POST(req: Request) {
  const { error } = await requireEntranceOperationsSession();
  if (error) {
    return error;
  }

  try {
    const { periodId, batchId, gdcsEmail, isPreschool, studentIds } = await req.json();
    if (!periodId || !batchId || !gdcsEmail) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    let periodName = "Kỳ khảo sát";
    let batchName = "Tất cả các đợt";
    let students = [];

    if (isPreschool) {
      const periodObj = await prisma.preschoolInputAssessmentPeriod.findUnique({
        where: { id: periodId }
      });
      if (periodObj) periodName = periodObj.name;

      if (batchId !== "all") {
        const batchObj = await prisma.preschoolInputAssessmentBatch.findUnique({
          where: { id: batchId }
        });
        if (batchObj) batchName = batchObj.name;
      }

      const whereClause: any = { periodId };
      if (batchId && batchId !== "all") {
        whereClause.batchId = batchId;
      }
      students = await prisma.preschoolInputAssessmentStudent.findMany({
        where: whereClause,
        include: { batch: true, period: true },
        orderBy: { fullName: "asc" }
      });
    } else {
      const periodObj = await prisma.inputAssessmentPeriod.findUnique({
        where: { id: periodId }
      });
      if (periodObj) periodName = periodObj.name;

      if (batchId !== "all") {
        const batchObj = await prisma.inputAssessmentBatch.findUnique({
          where: { id: batchId }
        });
        if (batchObj) batchName = batchObj.name;
      }

      const whereClause: any = { periodId };
      if (batchId && batchId !== "all") {
        whereClause.batchId = batchId;
      }
      if (Array.isArray(studentIds) && studentIds.length > 0) {
        whereClause.id = { in: studentIds };
      }
      students = await prisma.inputAssessmentStudent.findMany({
        where: whereClause,
        include: {
          batch: true,
          period: true,
          scores: {
            include: { subject: true }
          }
        },
        orderBy: { fullName: "asc" }
      });
    }

    const totalStudents = students.length;
    let passedCount = 0;
    let failedCount = 0;
    let committedCount = 0;
    let pendingCount = 0;

    if (isPreschool) {
      passedCount = students.filter(s => s.admissionResult && (s.admissionResult.toUpperCase().includes("ĐẠT") || s.admissionResult === "Học thử")).length;
      failedCount = students.filter(s => s.admissionResult && s.admissionResult.toUpperCase().includes("KHÔNG")).length;
      pendingCount = totalStudents - passedCount - failedCount;
    } else {
      passedCount = students.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Học thử" || s.admissionResult === "Đạt - Giao lưu").length;
      failedCount = students.filter(s => s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại").length;
      committedCount = students.filter(s => s.admissionResult === "Đạt cam kết").length;
      pendingCount = totalStudents - passedCount - failedCount - committedCount;
    }

    const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const isOpenDay = !isPreschool && (periodName.toLowerCase().includes("open day") || periodName.toLowerCase().includes("openday"));

    const getEmailHtml = (
      studentGroup: any[],
      totalStudentsCount: number,
      passed: number,
      failed: number,
      committed: number,
      pending: number,
      recipientGdcsEmail: string
    ) => {
      const batchToken = generateBatchApprovalToken(periodId, batchId, Boolean(isPreschool), recipientGdcsEmail);
      const batchQuickApproveUrl = `${baseUrl}/api/admin/quick-approve/k12?mode=batch&periodId=${encodeURIComponent(periodId)}&batchId=${encodeURIComponent(batchId)}&isPreschool=${isPreschool ? "1" : "0"}&email=${encodeURIComponent(recipientGdcsEmail)}&token=${batchToken}`;

      const rowsHtml = studentGroup.map((s, idx) => {
        const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
        const gender = s.gender ? (s.gender === "FEMALE" || s.gender === "Nữ" || s.gender === "F" ? "Nữ" : "Nam") : "—";
        const grade = s.grade
          ? (isPreschool ? s.grade : (String(s.grade).toLowerCase().startsWith("khối") ? s.grade : `Khối ${s.grade}`))
          : "—";
        const system = s.surveyFormType || s.surveySystem || "—";
        const shortCampus = extractShortCampus(s.admissionCampus || s.registeredCampus || s.batch?.name || batchName);
        const scoreDetailHtml = summarizeStudentScoresForEmail(s);

        const resultText = s.admissionResult || "Chờ duyệt";
        let resColor = "#D97706", resBg = "#FFFBEB", resBorder = "#FDE68A";

        if (isPreschool) {
          if (resultText.toUpperCase().includes("ĐẠT")) {
            resColor = "#059669"; resBg = "#ECFDF5"; resBorder = "#A7F3D0";
          } else if (resultText.toUpperCase().includes("KHÔNG")) {
            resColor = "#E11D48"; resBg = "#FEF2F2"; resBorder = "#FECACA";
          } else if (resultText === "Học thử") {
            resColor = "#00736E"; resBg = "#F0FDFA"; resBorder = "#CCFBF1";
          }
        } else {
          if (resultText === "Đạt") {
            resColor = "#059669"; resBg = "#ECFDF5"; resBorder = "#A7F3D0";
          } else if (resultText === "Đạt cam kết") {
            resColor = "#D97706"; resBg = "#FEF3C7"; resBorder = "#FDE68A";
          } else if (resultText.includes("Không đạt")) {
            resColor = "#E11D48"; resBg = "#FEF2F2"; resBorder = "#FECACA";
          } else if (resultText === "Học thử") {
            resColor = "#00736E"; resBg = "#F0FDFA"; resBorder = "#CCFBF1";
          }
        }

        const quickUrls = buildStudentQuickApproveUrls({
          studentId: String(s.id || ""),
          isPreschool: Boolean(isPreschool),
          baseUrl,
          recipientEmail: recipientGdcsEmail,
          periodId: s.periodId || periodId,
          batchId: s.batchId || batchId
        });

        return `
          <tr style="border-bottom:1px solid #E2E8F0; background:${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"};">
            <!-- 1. Mã HS -->
            <td style="padding:11px 8px; text-align:left; white-space:nowrap;">
              <span style="font-size:11.5px; font-family:SFMono-Regular, Consolas, monospace; font-weight:700; color:#003B3A; background:#F8FAFC; border:1px solid #E2E8F0; padding:3px 7px; border-radius:5px;">
                ${s.studentCode || "—"}
              </span>
            </td>
            <!-- 2. Học sinh -->
            <td style="padding:11px 10px;">
              <div style="font-size:13px; font-weight:800; color:#0F172A;">${s.fullName || "—"}</div>
              <div style="font-size:10.5px; color:#00736E; font-weight:600; margin-top:2px;">${s.batch?.name || batchName}</div>
            </td>
            <!-- 3. Ngày sinh -->
            <td style="padding:11px 8px; text-align:center; font-size:12px; color:#475569; white-space:nowrap;">${dob}</td>
            <!-- 4. Giới tính -->
            <td style="padding:11px 8px; text-align:center; font-size:12px; color:#475569; white-space:nowrap;">${gender}</td>
            <!-- 5. Khối -->
            <td style="padding:11px 8px; text-align:center; font-size:12px; font-weight:700; color:#003B3A; white-space:nowrap;">${grade}</td>
            <!-- 6. Hệ -->
            <td style="padding:11px 8px; text-align:center; font-size:11.5px; font-weight:600; color:#334155; white-space:nowrap;">${system}</td>
            <!-- 7. Cơ sở -->
            <td style="padding:11px 8px; text-align:center; white-space:nowrap;">
              <span style="display:inline-block; padding:2px 8px; font-size:11px; font-weight:700; color:#00736E; background:#F0FDFA; border:1px solid #CCFBF1; border-radius:5px;">
                ${shortCampus}
              </span>
            </td>
            <!-- 8. Kết quả khảo sát -->
            <td style="padding:11px 10px; font-size:11.5px; color:#334155; line-height:1.45;">${scoreDetailHtml}</td>
            <!-- 9. KQ đã xét duyệt -->
            <td style="padding:11px 8px; text-align:center;">
              <span style="display:inline-block; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; color:${resColor}; background:${resBg}; border:1px solid ${resBorder};">
                ${resultText === "Đạt" ? "Đạt chuẩn" : resultText}
              </span>
            </td>
            <!-- 10. Thao tác (Duyệt trên mail) -->
            <td style="padding:10px 10px; text-align:right; white-space:nowrap;">
              <div style="margin-bottom:4px;">
                <a href="${quickUrls.approveDatUrl}" target="_blank" style="display:inline-block; padding:4px 9px; font-size:10.5px; font-weight:700; color:#FFFFFF; background:#059669; border-radius:5px; text-decoration:none; margin-right:3px;">
                  ${quickUrls.primaryLabel}
                </a>
                <a href="${quickUrls.approveCamKetOrHocThuUrl}" target="_blank" style="display:inline-block; padding:4px 9px; font-size:10.5px; font-weight:700; color:#FFFFFF; background:#D97706; border-radius:5px; text-decoration:none;">
                  ${quickUrls.secondaryLabel}
                </a>
              </div>
              <div>
                <a href="${quickUrls.approveKhongDatUrl}" target="_blank" style="display:inline-block; padding:3px 8px; font-size:10px; font-weight:700; color:#E11D48; background:#FFF1F2; border:1px solid #FECDD3; border-radius:5px; text-decoration:none; margin-right:3px;">
                  ${quickUrls.rejectLabel}
                </a>
                ${!isPreschool && quickUrls.viewPvdhUrl ? `
                <a href="${quickUrls.viewPvdhUrl}" target="_blank" style="display:inline-block; padding:3px 8px; font-size:10px; font-weight:700; color:#00736E; background:#F0FDFA; border:1px solid #99F6E4; border-radius:5px; text-decoration:none; margin-right:3px;">
                  Phiếu PVĐH
                </a>
                ` : ""}
                <a href="${quickUrls.portalUrl}" target="_blank" style="display:inline-block; padding:3px 8px; font-size:10px; font-weight:700; color:#003B3A; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:5px; text-decoration:none;">
                  Chi tiết
                </a>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      return `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Yêu cầu xét duyệt Đợt khảo sát</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9" style="background-color:#F1F5F9; padding:24px 12px;">
  <tr>
    <td align="center">
      <table width="960" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:960px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,59,58,0.12); border:1px solid #CBD5E1;">

        <!-- HEADER -->
        <tr>
          <td bgcolor="#003B3A" style="background-color:#003B3A; background:linear-gradient(135deg, #003B3A 0%, #064E3B 60%, #00A19A 100%); padding:28px 32px; text-align:center; border-bottom:4px solid #00A19A; color:#FFFFFF;">
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px auto;">
              <tr>
                <td bgcolor="#0B4A47" style="background-color:#0B4A47; border:1px solid #00A19A; border-radius:20px; padding:3px 14px; font-size:10.5px; font-weight:800; color:#5EEAD4; letter-spacing:1px; text-transform:uppercase;">
                  <img src="https://ssm.skylineschool.edu.vn/logo.png" alt="Sky-Line" height="16" style="height: 16px; width: auto; vertical-align: middle; margin-right: 6px; display: inline-block; border: 0;" /><span style="vertical-align: middle;">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                </td>
              </tr>
            </table>
            <h1 style="margin:0; font-size:21px; font-weight:900; line-height:1.3; color:#FFFFFF; text-transform:uppercase;">
              YÊU CẦU XÉT DUYỆT KẾT QUẢ KHẢO SÁT
            </h1>
            <div style="font-size:12.5px; color:#E0F2FE; margin-top:6px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
              ${isPreschool ? "BẬC MẦM NON" : "BẬC PHỔ THÔNG (K-12)"} &bull; CỔNG THÔNG TIN KHẢO SÁT
            </div>
          </td>
        </tr>

        <!-- GREETINGS & DESCR -->
        <tr>
          <td style="padding:24px 32px 14px 32px; background-color:#FFFFFF;">
            <p style="margin:0; font-size:14px; font-weight:800; color:#0F172A;">👋 Kính gửi Thầy/Cô Giám đốc Cơ sở,</p>
            <p style="margin:8px 0 0 0; font-size:13.5px; color:#334155; line-height:1.6;">
              Hội đồng Tuyển sinh kính gửi báo cáo kết quả khảo sát năng lực đầu vào và đề xuất Thầy/Cô thực hiện xem xét, phê duyệt trực tiếp ngay trên Email hoặc trên Cổng quản lý cho các học sinh thuộc Đợt khảo sát sau:
            </p>
          </td>
        </tr>

        <!-- KY & DOT INFO -->
        <tr>
          <td style="padding:0 32px 18px 32px; background-color:#FFFFFF;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:16px 20px;">
              <tr>
                <td width="50%" style="vertical-align:middle;">
                  <div style="font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase;">Kỳ khảo sát</div>
                  <div style="font-size:15px; font-weight:800; color:#003B3A; margin-top:2px;">${periodName}</div>
                </td>
                <td width="50%" align="right" style="vertical-align:middle;">
                  <div style="font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase;">Đợt khảo sát</div>
                  <div style="font-size:15px; font-weight:800; color:#003B3A; margin-top:2px;">${batchName}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- STATS CARDS -->
        <tr>
          <td style="padding:0 32px 20px 32px; background-color:#FFFFFF;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="${isPreschool ? "23.5%" : "18.5%"}" bgcolor="#F0FDFA" style="padding:12px 6px; background-color:#F0FDFA; border:1px solid #CCFBF1; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#0F766E; text-transform:uppercase;">Tổng số HS</div>
                  <div style="font-size:20px; font-weight:900; color:#003B3A; margin-top:3px;">${totalStudentsCount}</div>
                  <div style="font-size:9.5px; color:#14B8A6;">học sinh</div>
                </td>
                <td width="1.8%"></td>
                <td width="${isPreschool ? "23.5%" : "18.5%"}" bgcolor="#ECFDF5" style="padding:12px 6px; background-color:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#065F46; text-transform:uppercase;">Đạt / Học thử</div>
                  <div style="font-size:20px; font-weight:900; color:#047857; margin-top:3px;">${passed}</div>
                  <div style="font-size:9.5px; color:#10B981;">học sinh</div>
                </td>
                ${!isPreschool ? `
                <td width="1.8%"></td>
                <td width="18.5%" bgcolor="#FEF3C7" style="padding:12px 6px; background-color:#FEF3C7; border:1px solid #FDE68A; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#92400E; text-transform:uppercase;">Đạt cam kết</div>
                  <div style="font-size:20px; font-weight:900; color:#B45309; margin-top:3px;">${committed}</div>
                  <div style="font-size:9.5px; color:#D97706;">học sinh</div>
                </td>
                ` : ""}
                <td width="1.8%"></td>
                <td width="${isPreschool ? "23.5%" : "18.5%"}" bgcolor="#FEF2F2" style="padding:12px 6px; background-color:#FEF2F2; border:1px solid #FECACA; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#991B1B; text-transform:uppercase;">Không đạt</div>
                  <div style="font-size:20px; font-weight:900; color:#DC2626; margin-top:3px;">${failed}</div>
                  <div style="font-size:9.5px; color:#EF4444;">học sinh</div>
                </td>
                <td width="1.8%"></td>
                <td width="${isPreschool ? "23.5%" : "18.5%"}" bgcolor="#FFFBEB" style="padding:12px 6px; background-color:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#B45309; text-transform:uppercase;">Chưa duyệt</div>
                  <div style="font-size:20px; font-weight:900; color:#D97706; margin-top:3px;">${pending}</div>
                  <div style="font-size:9.5px; color:#F59E0B;">chờ duyệt</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- STUDENT TABLE -->
        <tr>
          <td style="padding:0 32px 24px 32px; background-color:#FFFFFF;">
            <h2 style="font-size:14px; font-weight:800; color:#003B3A; border-left:4px solid #00A19A; padding-left:10px; margin:0 0 14px 0; text-transform:uppercase; letter-spacing:0.5px;">
              Danh sách kết quả khảo sát theo đợt (${totalStudentsCount} học sinh)
            </h2>
            <div style="overflow-x:auto; border:1px solid #CBD5E1; border-radius:10px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; min-width:900px; font-size:12px;">
                <thead>
                  <tr bgcolor="#003B3A" style="background-color:#003B3A; color:#FFFFFF; border-bottom:2px solid #00A19A;">
                    <th style="padding:11px 8px; text-align:left; font-size:11px; font-weight:700; color:#CCFBF1; width:88px; white-space:nowrap;">Mã HS</th>
                    <th style="padding:11px 10px; text-align:left; font-size:11px; font-weight:700; color:#FFFFFF; width:155px;">Học sinh</th>
                    <th style="padding:11px 8px; text-align:center; font-size:11px; font-weight:700; color:#CCFBF1; width:78px; white-space:nowrap;">Ngày sinh</th>
                    <th style="padding:11px 8px; text-align:center; font-size:11px; font-weight:700; color:#CCFBF1; width:62px; white-space:nowrap;">Giới tính</th>
                    <th style="padding:11px 8px; text-align:center; font-size:11px; font-weight:700; color:#CCFBF1; width:64px; white-space:nowrap;">Khối</th>
                    <th style="padding:11px 8px; text-align:center; font-size:11px; font-weight:700; color:#CCFBF1; width:72px; white-space:nowrap;">Hệ</th>
                    <th style="padding:11px 8px; text-align:center; font-size:11px; font-weight:700; color:#CCFBF1; width:64px; white-space:nowrap;">Cơ sở</th>
                    <th style="padding:11px 10px; text-align:left; font-size:11px; font-weight:700; color:#FFFFFF; width:165px;">Kết quả khảo sát</th>
                    <th style="padding:11px 8px; text-align:center; font-size:11px; font-weight:700; color:#5EEAD4; width:120px;">KQ đã xét duyệt</th>
                    <th style="padding:11px 10px; text-align:right; font-size:11px; font-weight:700; color:#FFFFFF; width:145px; white-space:nowrap;">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
            <div style="margin-top:8px; font-size:11.5px; color:#0F766E; font-weight:600;">
              💡 <strong>Duyệt trực tiếp trên Email:</strong> Thầy/Cô bấm vào các nút <strong>✓ Duyệt Đạt</strong>, <strong>⚠ Cam kết</strong> hoặc <strong>✕ Không đạt</strong> ở cột <em>Thao tác</em> rồi bấm <strong>Xác nhận</strong> trên trang mở ra (không cần đăng nhập; an toàn trước trình quét link tự động của Outlook).
            </div>
          </td>
        </tr>

        <!-- ACTION BUTTONS -->
        <tr>
          <td style="padding:0 32px 28px 32px; background-color:#FFFFFF; text-align:center;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px auto; border-collapse:separate;">
              <tr>
                ${pending > 0 ? `
                <td align="center" bgcolor="#059669" style="border-radius:10px; background-color:#059669;">
                  <a href="${batchQuickApproveUrl}" target="_blank" style="display:inline-block; padding:13px 24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size:13px; color:#FFFFFF; font-weight:800; text-decoration:none; border-radius:10px;">
                    ✓ Duyệt Đạt toàn bộ HS chờ duyệt (${pending} HS)
                  </a>
                </td>
                <td width="12"></td>
                ` : ""}
                <td align="center" bgcolor="#003B3A" style="border-radius:10px; background-color:#003B3A;">
                  <a href="${baseUrl}/admin/xet-duyet-ket-qua" target="_blank" style="display:inline-block; padding:13px 28px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size:13px; color:#FFFFFF; font-weight:800; text-decoration:none; border-radius:10px;">
                    🔗 Mở Cổng xét duyệt kết quả &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#003B3A" style="background-color:#003B3A; border-top:3px solid #00A19A; padding:22px 28px; text-align:center; font-size:11px; color:#CCFBF1; line-height:1.6;">
            <div style="font-weight:800; color:#FFFFFF; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
              HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
            </div>
            <div style="color:#99F6E4; font-weight:600; margin-top:3px;">
              BAN ĐÀO TẠO &amp; KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
            </div>
            <div style="color:#5EEAD4; margin-top:6px; font-size:10.5px;">
              Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:700;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:700;">skylineschool.edu.vn</a>
            </div>
            <div style="color:#64748B; margin-top:8px; font-size:10px;">
              &copy; ${new Date().getFullYear()} Sky-Line School System. All rights reserved. &bull; Thư yêu cầu phê duyệt tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
    };

    if (isOpenDay) {
      const campuses = await prisma.campus.findMany({
        include: {
          manager: {
            include: {
              teacher: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      });

      let fallbackCampusId = null;
      if (!isPreschool) {
        if (batchId !== "all") {
          const batchObj = await prisma.inputAssessmentBatch.findUnique({
            where: { id: batchId }
          });
          if (batchObj) fallbackCampusId = batchObj.campusId;
        }
        if (!fallbackCampusId) {
          const periodObj = await prisma.inputAssessmentPeriod.findUnique({
            where: { id: periodId }
          });
          if (periodObj) fallbackCampusId = periodObj.campusId;
        }
      }

      const groupedStudents: Record<string, typeof students> = {};
      for (const s of students) {
        const cId = s.registeredCampus || fallbackCampusId || "DEFAULT";
        if (!groupedStudents[cId]) {
          groupedStudents[cId] = [];
        }
        groupedStudents[cId].push(s);
      }

      const staticEmails: Record<string, string> = {
        CS1: "gdcs.cs1@skylineschool.edu.vn",
        CS2: "gdcs.cs2@skylineschool.edu.vn",
        CS3: "gdcs.cs3@skylineschool.edu.vn",
        CS4: "gdcs.cs4@skylineschool.edu.vn",
        CS5: "gdcs.cs5@skylineschool.edu.vn",
      };

      const sentSummary: Record<string, number> = {};

      for (const [campusId, group] of Object.entries(groupedStudents)) {
        let currentGdcsEmail = null;
        const campusObj = campuses.find(c => c.id === campusId);

        if (campusObj) {
          const managerEmail = campusObj.manager?.teacher?.email || campusObj.manager?.email;
          if (managerEmail && managerEmail.includes("@")) {
            currentGdcsEmail = managerEmail;
          } else {
            const code = campusObj.campusCode?.toUpperCase();
            currentGdcsEmail = staticEmails[code];
          }
        }

        if (!currentGdcsEmail) {
          currentGdcsEmail = gdcsEmail || staticEmails.CS1;
        }

        const totalGroup = group.length;
        let groupPassed = 0;
        let groupFailed = 0;
        let groupCommitted = 0;
        let groupPending = 0;

        if (isPreschool) {
          groupPassed = group.filter(s => s.admissionResult && (s.admissionResult.toUpperCase().includes("ĐẠT") || s.admissionResult === "Học thử")).length;
          groupFailed = group.filter(s => s.admissionResult && s.admissionResult.toUpperCase().includes("KHÔNG")).length;
          groupPending = totalGroup - groupPassed - groupFailed;
        } else {
          groupPassed = group.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Học thử" || s.admissionResult === "Đạt - Giao lưu").length;
          groupFailed = group.filter(s => s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại").length;
          groupCommitted = group.filter(s => s.admissionResult === "Đạt cam kết").length;
          groupPending = totalGroup - groupPassed - groupFailed - groupCommitted;
        }

        const currentHtml = getEmailHtml(group, totalGroup, groupPassed, groupFailed, groupCommitted, groupPending, currentGdcsEmail);

        await sendEmail({
          to: currentGdcsEmail,
          subject: `[Sky-line SMS] Yêu cầu xét duyệt Đợt khảo sát: ${batchName} (${periodName})`,
          html: currentHtml,
          replyTo: "ktdbcl@skylineschool.edu.vn"
        });

        if (!isPreschool && Array.isArray(group) && group.length > 0) {
          try {
            const sentIso = new Date().toISOString();
            await (prisma as any).auditLog.createMany({
              data: group.map((st: any) => ({
                userId: "system",
                userEmail: "ktdbcl@skylineschool.edu.vn",
                action: "GDCS_APPROVAL_EMAIL_SENT",
                targetTable: "InputAssessmentStudent",
                targetId: String(st.id),
                newValues: JSON.stringify({ to: currentGdcsEmail, batchId, sentAt: sentIso })
              }))
            });
          } catch {}
        }

        sentSummary[currentGdcsEmail] = (sentSummary[currentGdcsEmail] || 0) + totalGroup;
      }

      return NextResponse.json({ success: true, groupedSent: sentSummary });
    }

    const emailHtml = getEmailHtml(students, totalStudents, passedCount, failedCount, committedCount, pendingCount, gdcsEmail);

    await sendEmail({
      to: gdcsEmail,
      subject: `[Sky-line SMS] Yêu cầu xét duyệt Đợt khảo sát: ${batchName} (${periodName})`,
      html: emailHtml,
      replyTo: "ktdbcl@skylineschool.edu.vn"
    });

    if (!isPreschool && Array.isArray(students) && students.length > 0) {
      try {
        const sentIso = new Date().toISOString();
        await (prisma as any).auditLog.createMany({
          data: students.map((st: any) => ({
            userId: "system",
            userEmail: "ktdbcl@skylineschool.edu.vn",
            action: "GDCS_APPROVAL_EMAIL_SENT",
            targetTable: "InputAssessmentStudent",
            targetId: String(st.id),
            newValues: JSON.stringify({ to: gdcsEmail, batchId, sentAt: sentIso })
          }))
        });
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Batch email send error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
