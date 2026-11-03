import crypto from "crypto";
import { prisma } from "@/lib/db";

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "skyline-preschool-approval-secret-key-2026";

/**
 * Generate secure HMAC token for 1-click email approval
 */
export function generatePreschoolApprovalToken(studentId: string, action: string, email: string): string {
  const normalizedEmail = (email || "").trim().toLowerCase();
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${studentId}:${action}:${normalizedEmail}`)
    .digest("hex");
}

/**
 * Verify HMAC token
 */
export function verifyPreschoolApprovalToken(studentId: string, action: string, email: string, token: string): boolean {
  if (!token || !studentId || !action) return false;
  const expectedToken = generatePreschoolApprovalToken(studentId, action, email);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}

/**
 * Fetch and summarize developmental assessment scores for a preschool student
 */
export async function getPreschoolDevelopmentSummary(studentId: string) {
  try {
    const scores = await (prisma as any).preschoolDevScore.findMany({
      where: { studentId },
      include: {
        criteria: {
          include: { area: true }
        }
      }
    });

    const areasMap = new Map<string, {
      code: string;
      name: string;
      total: number;
      passed: number;
      notPassed: number;
      criteriaList: Array<{ name: string; result: string }>;
    }>();

    let totalCriteria = 0;
    let totalPassed = 0;

    for (const s of scores) {
      const area = s.criteria?.area;
      const areaCode = area?.code || "KHAC";
      const areaName = area?.name || "Lĩnh vực khác";

      if (!areasMap.has(areaCode)) {
        areasMap.set(areaCode, {
          code: areaCode,
          name: areaName,
          total: 0,
          passed: 0,
          notPassed: 0,
          criteriaList: []
        });
      }

      const areaStat = areasMap.get(areaCode)!;
      areaStat.total += 1;
      totalCriteria += 1;

      const isDat = s.result === "DAT" || s.result === "Đạt";
      if (isDat) {
        areaStat.passed += 1;
        totalPassed += 1;
      } else {
        areaStat.notPassed += 1;
      }

      areaStat.criteriaList.push({
        name: s.criteria?.name || "Tiêu chí",
        result: isDat ? "Đạt" : "Chưa thể hiện"
      });
    }

    const areas = Array.from(areasMap.values()).map(a => ({
      ...a,
      percentage: a.total > 0 ? Math.round((a.passed / a.total) * 100) : 0
    }));

    const overallPercentage = totalCriteria > 0 ? Math.round((totalPassed / totalCriteria) * 100) : 0;

    return {
      totalCriteria,
      totalPassed,
      overallPercentage,
      areas
    };
  } catch (err) {
    console.error("[getPreschoolDevelopmentSummary Error]:", err);
    return {
      totalCriteria: 0,
      totalPassed: 0,
      overallPercentage: 0,
      areas: []
    };
  }
}

/**
 * Standard Sky-Line Executive Email Generator for Preschool Approval
 * Fully Outlook-bulletproof, responsive, brand compliant.
 */
export function renderPreschoolApprovalEmailHtml(params: {
  student: any;
  campusName: string;
  recipientName: string;
  recipientEmail: string;
  isArchiveCopy?: boolean;
  devSummary?: {
    totalCriteria: number;
    totalPassed: number;
    overallPercentage: number;
    areas: Array<{
      code: string;
      name: string;
      total: number;
      passed: number;
      percentage: number;
    }>;
  };
  baseUrl: string;
}): string {
  const {
    student,
    campusName,
    recipientName,
    recipientEmail,
    isArchiveCopy = false,
    devSummary,
    baseUrl
  } = params;

  // Format Date of Birth & Age
  let dobStr = "—";
  let ageStr = "";
  if (student.dateOfBirth) {
    const dob = new Date(student.dateOfBirth);
    dobStr = dob.toLocaleDateString("vi-VN");
    const diffMonths = Math.max(0, Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
    if (diffMonths < 36) {
      ageStr = ` (~${diffMonths} tháng tuổi)`;
    } else {
      const years = Math.floor(diffMonths / 12);
      const remMonths = diffMonths % 12;
      ageStr = ` (~${years} tuổi${remMonths > 0 ? ` ${remMonths} tháng` : ""})`;
    }
  }

  // Gender
  const genderStr = student.gender === "MALE" || student.gender === "Nam" ? "Nam" : (student.gender === "FEMALE" || student.gender === "Nữ" ? "Nữ" : "—");

  // Grade / Age Group
  const gradeStr = student.grade || "12 đến 18 tháng (Nhà trẻ)";

  // System
  const systemStr = student.surveyFormType === "MNS" ? "Mầm non Song ngữ (MNS)" : (student.surveyFormType || "Mầm non Chất lượng cao");

  // Teacher comment
  const teacherComment = student.devProfessionalComment?.trim() || "Chưa có ghi chú nhận xét từ giáo viên chuyên môn.";

  // BGH Approval Status
  const bghStatus = student.bghApprovalStatus || "CHUA_DUYET";
  let bghStatusText = "Chưa phê duyệt";
  let bghStatusBg = "#F1F5F9";
  let bghStatusColor = "#475569";
  if (bghStatus === "DAT_MIEN_HOC_THU" || bghStatus === "DAT") {
    bghStatusText = "ĐẠT - MIỄN HỌC THỬ (HỌC CHÍNH THỨC)";
    bghStatusBg = "#D1FAE5";
    bghStatusColor = "#065F46";
  } else if (bghStatus === "DAT_HOC_THU") {
    bghStatusText = "ĐẠT - HỌC THỬ";
    bghStatusBg = "#E0E7FF";
    bghStatusColor = "#3730A3";
  } else if (bghStatus === "KHONG_DAT") {
    bghStatusText = "KHÔNG ĐẠT";
    bghStatusBg = "#FEE2E2";
    bghStatusColor = "#991B1B";
  } else if (bghStatus === "Y_KIEN_KHAC") {
    bghStatusText = "Ý KIẾN KHÁC";
    bghStatusBg = "#FEF3C7";
    bghStatusColor = "#92400E";
  }

  const bghUser = student.bghApprovalUser || "Ban Giám Hiệu Mầm non";
  const bghDate = student.bghApprovalDate ? new Date(student.bghApprovalDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN");

  // Generate Direct Action Links
  const tokenMienHt = generatePreschoolApprovalToken(student.id, "APPROVE_MIEN_HT", recipientEmail);
  const tokenHocThu = generatePreschoolApprovalToken(student.id, "APPROVE_HOC_THU", recipientEmail);

  const approveMienHtUrl = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=APPROVE_MIEN_HT&email=${encodeURIComponent(recipientEmail)}&token=${tokenMienHt}&confirm=1`;
  const approveHocThuUrl = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=APPROVE_HOC_THU&email=${encodeURIComponent(recipientEmail)}&token=${tokenHocThu}&confirm=1`;
  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=mam-non&periodId=${student.periodId}&batchId=${student.batchId || ""}&studentId=${student.id}&autoOpen=true`;

  // Render Development Summary Table Rows
  let devTableHtml = "";
  if (devSummary && devSummary.areas.length > 0) {
    devTableHtml = devSummary.areas.map(a => {
      let icon = "🏃‍♂️";
      if (a.code === "NHAN_THUC") icon = "🧠";
      else if (a.code === "NGON_NGU") icon = "🗣️";
      else if (a.code === "TINH_CAM_XH_TM") icon = "🎨";

      const pctColor = a.percentage >= 70 ? "#059669" : (a.percentage >= 50 ? "#0284C7" : "#D97706");
      const pctBg = a.percentage >= 70 ? "#ECFDF5" : (a.percentage >= 50 ? "#F0F9FF" : "#FFFBEB");

      return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #0F172A;">
            ${icon} ${a.name}
          </td>
          <td align="center" style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #334155; text-align: center;">
            ${a.passed}/${a.total}
          </td>
          <td align="center" style="padding: 10px 14px; text-align: center;">
            <span style="display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; background-color: ${pctBg}; color: ${pctColor}; border: 1px solid ${pctColor}30;">
              ${a.percentage}%
            </span>
          </td>
        </tr>
      `;
    }).join("");
  } else {
    devTableHtml = `
      <tr>
        <td colspan="3" align="center" style="padding: 14px; font-size: 13px; color: #64748B; text-align: center;">
          Chưa có dữ liệu tiêu chí phát triển chi tiết.
        </td>
      </tr>
    `;
  }

  const archiveBadgeHtml = isArchiveCopy ? `
    <div style="display: inline-block; padding: 4px 12px; background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; color: #92400E; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px;">
      📋 BẢN SAO LƯU TRỮ - BAN KHẢO THÍ & ĐBCL
    </div>
  ` : "";

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yêu Cầu Phê Duyệt Khảo Sát Mầm Non - ${student.fullName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 25px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container (640px) -->
        <table role="presentation" width="640" border="0" cellspacing="0" cellpadding="0" style="max-width: 640px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #CBD5E1; border-collapse: separate;">
          
          <!-- Top Header Brand -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 28px 24px 24px 24px; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 5px 16px; background-color: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </div>
                    ${archiveBadgeHtml}
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 21px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.35;">
                      YÊU CẦU PHÊ DUYỆT KHẢO SÁT ĐẦU VÀO
                    </h1>
                    <p style="margin: 6px 0 0 0; color: #99F6E4; font-size: 13px; font-weight: 600;">
                      Bậc Mầm non &bull; Cơ sở ${campusName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting & Executive Summary -->
          <tr>
            <td style="padding: 24px 28px 12px 28px;">
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                Kính gửi ${recipientName ? `Thầy/Cô <strong>${recipientName}</strong>` : "Ban Giám Hiệu và Giám Đốc Cơ sở"},
              </p>
              <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Học sinh <strong>${student.fullName}</strong> (Mã HS: <strong>${student.studentCode}</strong>) thuộc <strong>Cơ sở ${campusName}</strong> đã hoàn thành bài khảo sát năng lực đầu vào và có đầy đủ đánh giá từ giáo viên chuyên môn cùng ý kiến đề xuất của Ban Giám Hiệu.
              </p>
            </td>
          </tr>

          <!-- Student Profile Card -->
          <tr>
            <td style="padding: 6px 28px 18px 28px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; border-collapse: separate; overflow: hidden;">
                <tr bgcolor="#00A19A" style="background-color: #00A19A;">
                  <td colspan="4" style="padding: 8px 14px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px;">
                    📌 THÔNG TIN HỌC SINH KHẢO SÁT
                  </td>
                </tr>
                <tr>
                  <td width="22%" style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">Họ và tên:</td>
                  <td width="28%" style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #003B3A; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">${student.fullName}</td>
                  <td width="22%" style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">Mã số HS:</td>
                  <td width="28%" style="padding: 10px 14px; font-size: 13px; font-weight: 800; color: #0284C7; border-bottom: 1px solid #F1F5F9;">${student.studentCode}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">Ngày sinh:</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1E293B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">${dobStr}<span style="color: #64748B; font-weight: 500;">${ageStr}</span></td>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">Giới tính:</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1E293B; border-bottom: 1px solid #F1F5F9;">${genderStr}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748B; border-right: 1px solid #F1F5F9;">Độ tuổi / Hệ:</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1E293B; border-right: 1px solid #F1F5F9;">${gradeStr} &bull; ${systemStr}</td>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748B; border-right: 1px solid #F1F5F9;">Cơ sở tiếp nhận:</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #00A19A;">${campusName}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Developmental Criteria Summary Table -->
          <tr>
            <td style="padding: 6px 28px 18px 28px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #CBD5E1; border-radius: 12px; border-collapse: separate; overflow: hidden;">
                <tr bgcolor="#003B3A" style="background-color: #003B3A; color: #FFFFFF;">
                  <th align="left" style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 55%;">
                    Lĩnh vực phát triển mầm non
                  </th>
                  <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 22%; text-align: center;">
                    Tiêu chí Đạt
                  </th>
                  <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 23%; text-align: center;">
                    Tỷ lệ
                  </th>
                </tr>
                ${devTableHtml}
                ${devSummary && devSummary.totalCriteria > 0 ? `
                  <tr bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-top: 2px solid #CBD5E1;">
                    <td style="padding: 10px 14px; font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase;">
                      TỔNG HỢP NĂNG LỰC ĐẦU VÀO
                    </td>
                    <td align="center" style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #059669; text-align: center;">
                      ${devSummary.totalPassed}/${devSummary.totalCriteria} tiêu chí
                    </td>
                    <td align="center" style="padding: 10px 14px; text-align: center;">
                      <span style="display: inline-block; padding: 4px 12px; border-radius: 8px; font-size: 13px; font-weight: 800; background-color: #D1FAE5; color: #065F46; border: 1px solid #059669;">
                        ${devSummary.overallPercentage}% ĐẠT
                      </span>
                    </td>
                  </tr>
                ` : ""}
              </table>
            </td>
          </tr>

          <!-- Teacher Evaluation Comment Quote -->
          <tr>
            <td style="padding: 4px 28px 16px 28px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-left: 4px solid #00A19A; border-radius: 0 10px 10px 0; border-top: 1px solid #CCFBF1; border-right: 1px solid #CCFBF1; border-bottom: 1px solid #CCFBF1;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 11px; font-weight: 800; color: #00A19A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                      💬 NHẬN XÉT CỦA GIÁO VIÊN CHUYÊN MÔN
                    </div>
                    <div style="font-size: 13px; color: #0F172A; line-height: 1.6; font-style: italic; font-weight: 500;">
                      &ldquo;${teacherComment}&rdquo;
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BGH Recommendation Status Box -->
          <tr>
            <td style="padding: 4px 28px 18px 28px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 18px;">
                <tr>
                  <td>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="35%" style="font-size: 12px; font-weight: 700; color: #92400E; text-transform: uppercase;">
                          Đề xuất từ Ban Giám Hiệu:
                        </td>
                        <td style="font-size: 13px; font-weight: 800;">
                          <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; background-color: ${bghStatusBg}; color: ${bghStatusColor}; border: 1px solid ${bghStatusColor}40;">
                            ${bghStatusText}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 6px; font-size: 11px; font-weight: 600; color: #B45309;">
                          Cán bộ chuyên môn duyệt:
                        </td>
                        <td style="padding-top: 6px; font-size: 12px; font-weight: 600; color: #78350F;">
                          ${bghUser} &bull; Ngày duyệt: ${bghDate}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Important Alert Notice -->
          <tr>
            <td style="padding: 0 28px 20px 28px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 0 8px 8px 0; border-top: 1px solid #FEE2E2; border-right: 1px solid #FEE2E2; border-bottom: 1px solid #FEE2E2;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #991B1B; line-height: 1.5; font-weight: 600;">
                    ⚠️ <strong>Kính đề xuất Giám Đốc Cơ sở tiến hành xem xét phê duyệt trực tuyến</strong> để Bộ phận Tuyển sinh có thể kịp thời xuất báo cáo kết quả chính thức gửi Quý Phụ huynh.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIRECT ACTION BUTTONS (BULLETPROOF OUTLOOK & MOBILE COMPATIBLE) -->
          <tr>
            <td align="center" style="padding: 6px 28px 28px 28px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              
              <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                ⚡ THAO TÁC XÉT DUYỆT TRỰC TIẾP DÀNH CHO GĐCS
              </div>

              <!-- Button 1: Đồng thuận duyệt Miễn học thử -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 12px auto; width: 100%; max-width: 480px;">
                <tr>
                  <td align="center" bgcolor="#059669" style="background-color: #059669; border-radius: 10px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.25);">
                    <a href="${approveMienHtUrl}" target="_blank" style="display: block; padding: 14px 24px; font-size: 14px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px; text-transform: uppercase;">
                      ✓ ĐỒNG THUẬN PHÊ DUYỆT: MIỄN HỌC THỬ &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Button 2: Duyệt Học Thử -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 12px auto; width: 100%; max-width: 480px;">
                <tr>
                  <td align="center" bgcolor="#0284C7" style="background-color: #0284C7; border-radius: 10px;">
                    <a href="${approveHocThuUrl}" target="_blank" style="display: block; padding: 12px 24px; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                      ✦ PHÊ DUYỆT: ĐẠT - HỌC THỬ
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Button 3: Xem chi tiết trên SSM Portal -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; width: 100%; max-width: 480px;">
                <tr>
                  <td align="center" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border-radius: 10px; border: 2px solid #003B3A;">
                    <a href="${portalUrl}" target="_blank" style="display: block; padding: 11px 24px; font-size: 13px; font-weight: 700; color: #003B3A; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                      🔍 Mở hồ sơ chi tiết trên SSM Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 14px 0 0 0; font-size: 11px; color: #64748B;">
                * Thầy/Cô có thể bấm duyệt trực tiếp ngay trên email bằng các nút phía trên mà không cần đăng nhập lại.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 24px; text-align: center; border-top: 3px solid #00A19A;">
              <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
              </p>
              <p style="margin: 6px 0 0 0; font-size: 10px; color: #64748B;">
                Email được gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line (SSM).
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
