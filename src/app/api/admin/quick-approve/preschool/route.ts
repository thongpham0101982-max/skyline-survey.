import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPreschoolApprovalToken } from "@/lib/preschool-approval-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") || "";
  const action = searchParams.get("action") || "";
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const confirm = searchParams.get("confirm") === "1";

  const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  // 1. Verify token
  const isValid = verifyPreschoolApprovalToken(studentId, action, email, token);
  if (!isValid) {
    return new NextResponse(
      renderResultPage({
        success: false,
        title: "XÁC THỰC KHÔNG HỢP LỆ",
        message: "Liên kết phê duyệt không hợp lệ hoặc đã bị thay đổi vì lý do an toàn thông tin.",
        subMessage: "Kính đề nghị Thầy/Cô đăng nhập trực tiếp vào hệ thống SSM Portal để thực hiện xét duyệt.",
        baseUrl,
        studentId
      }),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // 2. Fetch student
  const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    return new NextResponse(
      renderResultPage({
        success: false,
        title: "KHÔNG TÌM THẤY HỌC SINH",
        message: "Hồ sơ học sinh không tồn tại hoặc đã được chuyển khỏi hệ thống.",
        baseUrl,
        studentId
      }),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // 3. If confirm === '1', perform approval update
  if (confirm) {
    const targetStatus = action === "APPROVE_MIEN_HT" ? "DAT_MIEN_HOC_THU" : (action === "APPROVE_HOC_THU" ? "DAT_HOC_THU" : "KHONG_DAT");
    const bgh = student.bghApprovalStatus || "";

    let finalAdmissionResult = "Đạt - Miễn Học Thử";
    if (targetStatus === "KHONG_DAT" || bgh === "KHONG_DAT") {
      finalAdmissionResult = "Không đạt";
    } else if (targetStatus === "DAT_HOC_THU" || bgh === "DAT_HOC_THU") {
      finalAdmissionResult = "Đạt - Học Thử";
    } else {
      finalAdmissionResult = "Đạt - Miễn Học Thử";
    }

    // Resolve approver display name
    let approverName = "Giám Đốc Cơ sở (Qua Email)";
    if (email) {
      const u = await (prisma as any).user.findFirst({
        where: {
          OR: [
            { email: email.trim().toLowerCase() },
            { email: email.trim() }
          ]
        }
      });
      if (u?.fullName) {
        approverName = `${u.fullName} (GĐCS)`;
      }
    }

    // Update database
    await (prisma as any).preschoolInputAssessmentStudent.update({
      where: { id: studentId },
      data: {
        gdcsApprovalStatus: targetStatus,
        gdcsApprovalUser: approverName,
        gdcsApprovalDate: new Date(),
        admissionResult: finalAdmissionResult
      }
    });

    const statusLabel = targetStatus === "DAT_MIEN_HOC_THU"
      ? "ĐẠT - MIỄN HỌC THỬ (CHÍNH THỨC)"
      : (targetStatus === "DAT_HOC_THU" ? "ĐẠT - HỌC THỬ" : "KHÔNG ĐẠT");

    return new NextResponse(
      renderResultPage({
        success: true,
        title: "PHÊ DUYỆT THÀNH CÔNG!",
        message: `Đã hoàn tất phê duyệt kết quả khảo sát cho học sinh <strong>${student.fullName}</strong>.`,
        studentName: student.fullName,
        studentCode: student.studentCode,
        campus: student.admissionCampus || "CS2",
        statusLabel,
        admissionResult: finalAdmissionResult,
        approverName,
        approvedAt: new Date().toLocaleString("vi-VN"),
        baseUrl,
        studentId: student.id,
        periodId: student.periodId,
        batchId: student.batchId
      }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Fallback: If not confirmed yet, show confirmation card
  const confirmUrl = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${studentId}&action=${action}&email=${encodeURIComponent(email)}&token=${token}&confirm=1`;

  const targetLabel = action === "APPROVE_MIEN_HT" ? "ĐẠT - MIỄN HỌC THỬ (HỌC CHÍNH THỨC)" : (action === "APPROVE_HOC_THU" ? "ĐẠT - HỌC THỬ" : "KHÔNG ĐẠT");

  return new NextResponse(
    renderConfirmationPage({
      studentName: student.fullName,
      studentCode: student.studentCode,
      campus: student.admissionCampus || "CS2",
      grade: student.grade || "12 đến 18 tháng",
      targetLabel,
      confirmUrl,
      baseUrl,
      studentId: student.id
    }),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function renderResultPage(p: {
  success: boolean;
  title: string;
  message: string;
  subMessage?: string;
  studentName?: string;
  studentCode?: string;
  campus?: string;
  statusLabel?: string;
  admissionResult?: string;
  approverName?: string;
  approvedAt?: string;
  baseUrl: string;
  studentId?: string;
  periodId?: string;
  batchId?: string;
}) {
  const portalUrl = `${p.baseUrl}/admin/xet-duyet-ket-qua?tab=mam-non&studentId=${p.studentId || ""}&autoOpen=true`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${p.title} - Sky-Line SSM</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px 16px; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 540px; width: 100%; background: #FFFFFF; border-radius: 20px; box-shadow: 0 15px 35px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; overflow: hidden; text-align: center; }
    .header { background-color: #003B3A; padding: 26px 20px; color: #FFFFFF; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
    .body { padding: 32px 28px; }
    .icon-box { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px auto; font-size: 34px; }
    .icon-success { background-color: #D1FAE5; color: #059669; border: 3px solid #A7F3D0; }
    .icon-error { background-color: #FEE2E2; color: #DC2626; border: 3px solid #FECDD3; }
    .title { margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #003B3A; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 22px 0; }
    .info-table { width: 100%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px; font-size: 13px; text-align: left; border-collapse: collapse; overflow: hidden; }
    .info-table td { padding: 10px 14px; border-bottom: 1px solid #EEF2F6; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-label { color: #64748B; font-weight: 600; width: 40%; }
    .info-val { color: #0F172A; font-weight: 700; }
    .alert-ready { background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #065F46; font-weight: 600; margin-bottom: 24px; text-align: left; }
    .btn-portal { display: block; width: 100%; padding: 13px 20px; background-color: #00A19A; color: #FFFFFF; font-weight: 800; font-size: 14px; text-decoration: none; border-radius: 10px; margin-bottom: 10px; transition: background-color 0.2s; }
    .btn-portal:hover { background-color: #008781; }
    .btn-close { display: block; width: 100%; padding: 10px 20px; background: transparent; color: #64748B; font-weight: 600; font-size: 13px; text-decoration: none; border: none; cursor: pointer; }
    .footer { background-color: #F8FAFC; padding: 14px 20px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">🏫 Hệ Thống Giáo Dục Sky-Line</div>
      <h2 style="margin: 0; font-size: 17px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">XÉT DUYỆT ĐẦU VÀO MẦM NON</h2>
    </div>
    <div class="body">
      <div class="icon-box ${p.success ? "icon-success" : "icon-error"}">
        ${p.success ? "✓" : "✕"}
      </div>
      <h3 class="title">${p.title}</h3>
      <div class="message">${p.message}</div>

      ${p.success && p.studentName ? `
        <table class="info-table">
          <tr>
            <td class="info-label">Học sinh:</td>
            <td class="info-val" style="color: #003B3A; font-size: 14px;">${p.studentName}</td>
          </tr>
          <tr>
            <td class="info-label">Mã học sinh:</td>
            <td class="info-val" style="color: #0284C7;">${p.studentCode}</td>
          </tr>
          <tr>
            <td class="info-label">Cơ sở tiếp nhận:</td>
            <td class="info-val">${p.campus}</td>
          </tr>
          <tr>
            <td class="info-label">Quyết định GĐCS:</td>
            <td class="info-val" style="color: #059669;">${p.statusLabel}</td>
          </tr>
          <tr>
            <td class="info-label">Kết quả Tuyển sinh:</td>
            <td class="info-val" style="color: #047857; font-weight: 800;">${p.admissionResult}</td>
          </tr>
          <tr>
            <td class="info-label">Cán bộ duyệt:</td>
            <td class="info-val">${p.approverName} &bull; ${p.approvedAt}</td>
          </tr>
        </table>

        <div class="alert-ready">
          ✅ <strong>Hồ sơ hoàn tất:</strong> Bộ phận Tuyển sinh hiện đã có thể xuất báo cáo kết quả chính thức gửi Quý Phụ huynh.
        </div>
      ` : ""}

      <a href="${portalUrl}" class="btn-portal">
        Mở Hồ Sơ Trên Hệ Thống Portal SSM &rarr;
      </a>
      <button class="btn-close" onclick="window.close()">Đóng cửa sổ này</button>
    </div>
    <div class="footer">
      Sky-Line School Management System (SSM) &bull; Ban Khảo Thí &amp; ĐBCL
    </div>
  </div>
</body>
</html>
  `;
}

function renderConfirmationPage(p: {
  studentName: string;
  studentCode: string;
  campus: string;
  grade: string;
  targetLabel: string;
  confirmUrl: string;
  baseUrl: string;
  studentId: string;
}) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận Phê duyệt - ${p.studentName}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px 16px; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 520px; width: 100%; background: #FFFFFF; border-radius: 20px; box-shadow: 0 15px 35px rgba(0, 59, 58, 0.08); border: 1px solid #CBD5E1; overflow: hidden; text-align: center; }
    .header { background-color: #003B3A; padding: 24px 20px; color: #FFFFFF; }
    .body { padding: 32px 28px; }
    .info-table { width: 100%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px; font-size: 13px; text-align: left; border-collapse: collapse; overflow: hidden; }
    .info-table td { padding: 10px 14px; border-bottom: 1px solid #EEF2F6; }
    .info-label { color: #64748B; font-weight: 600; width: 40%; }
    .info-val { color: #0F172A; font-weight: 700; }
    .btn-confirm { display: block; width: 100%; padding: 15px 24px; background-color: #059669; color: #FFFFFF; font-weight: 800; font-size: 15px; text-decoration: none; border-radius: 12px; margin-bottom: 12px; text-transform: uppercase; box-shadow: 0 4px 6px rgba(5,150,105,0.25); }
    .footer { background-color: #F8FAFC; padding: 14px 20px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 11px; font-weight: 700; color: #99F6E4; text-transform: uppercase; margin-bottom: 6px;">🏫 Hệ Thống Giáo Dục Sky-Line</div>
      <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase;">XÁC NHẬN PHÊ DUYỆT KHẢO SÁT</h2>
    </div>
    <div class="body">
      <p style="margin: 0 0 18px 0; font-size: 14px; color: #475569; line-height: 1.5;">
        Kính gửi Thầy/Cô Giám Đốc Cơ sở, Thầy/Cô đang tiến hành xác nhận phê duyệt kết quả khảo sát đầu vào:
      </p>

      <table class="info-table">
        <tr>
          <td class="info-label">Họ và tên bé:</td>
          <td class="info-val" style="color: #003B3A; font-size: 14px;">${p.studentName}</td>
        </tr>
        <tr>
          <td class="info-label">Mã số HS:</td>
          <td class="info-val" style="color: #0284C7;">${p.studentCode}</td>
        </tr>
        <tr>
          <td class="info-label">Cơ sở:</td>
          <td class="info-val">${p.campus}</td>
        </tr>
        <tr>
          <td class="info-label">Lớp / Độ tuổi:</td>
          <td class="info-val">${p.grade}</td>
        </tr>
        <tr>
          <td class="info-label">Hành động duyệt:</td>
          <td class="info-val" style="color: #059669; font-weight: 800;">${p.targetLabel}</td>
        </tr>
      </table>

      <a href="${p.confirmUrl}" class="btn-confirm">
        ✓ Bấm Để Xác Nhận Phê Duyệt Ngay &rarr;
      </a>
      <button style="background: none; border: none; color: #64748B; font-size: 13px; cursor: pointer;" onclick="window.close()">Hủy bỏ</button>
    </div>
    <div class="footer">
      Sky-Line School Management System (SSM)
    </div>
  </div>
</body>
</html>
  `;
}
