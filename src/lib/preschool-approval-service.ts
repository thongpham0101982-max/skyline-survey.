import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

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
  targetRole?: "BGH_MN" | "GDCS";
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
    targetRole = "GDCS",
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
  if (bghStatus === "DE_XUAT_DAT" || bghStatus === "DAT_MIEN_HOC_THU" || bghStatus === "DAT") {
    bghStatusText = "ĐỀ XUẤT ĐẠT → TRÌNH B10";
    bghStatusBg = "#D1FAE5";
    bghStatusColor = "#065F46";
  } else if (bghStatus === "HEN_TRAI_NGHIEM" || bghStatus === "DAT_HOC_THU") {
    bghStatusText = "HẸN TRẢI NGHIỆM (B7B)";
    bghStatusBg = "#CCFBF1";
    bghStatusColor = "#005854";
  } else if (bghStatus === "DE_XUAT_CHUA_DAT" || bghStatus === "KHONG_DAT") {
    bghStatusText = "ĐỀ XUẤT CHƯA ĐẠT → B10";
    bghStatusBg = "#FEE2E2";
    bghStatusColor = "#991B1B";
  } else if (bghStatus === "Y_KIEN_KHAC") {
    bghStatusText = "Ý KIẾN KHÁC";
    bghStatusBg = "#FEF3C7";
    bghStatusColor = "#92400E";
  }

  const bghUser = student.bghApprovalUser || "Ban Giám Hiệu Mầm non";
  const bghDate = student.bghApprovalDate ? new Date(student.bghApprovalDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN");

  // Generate Direct Action Links (safe confirmation page, no GET side-effect)
  const isBghMnEmail = targetRole === "BGH_MN";
  const tokenBghDat = generatePreschoolApprovalToken(student.id, "BGH_DE_XUAT_DAT", recipientEmail);
  const tokenBghChuaDat = generatePreschoolApprovalToken(student.id, "BGH_DE_XUAT_CHUA_DAT", recipientEmail);
  const tokenBghHenTn = generatePreschoolApprovalToken(student.id, "BGH_HEN_TRAI_NGHIEM", recipientEmail);
  const tokenGdcsDat = generatePreschoolApprovalToken(student.id, "APPROVE_MIEN_HT", recipientEmail);
  const tokenGdcsChuaDat = generatePreschoolApprovalToken(student.id, "KHONG_DAT", recipientEmail);

  const bghDatUrl = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=BGH_DE_XUAT_DAT&email=${encodeURIComponent(recipientEmail)}&token=${tokenBghDat}`;
  const bghChuaDatUrl = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=BGH_DE_XUAT_CHUA_DAT&email=${encodeURIComponent(recipientEmail)}&token=${tokenBghChuaDat}`;
  const bghHenTnUrl = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=BGH_HEN_TRAI_NGHIEM&email=${encodeURIComponent(recipientEmail)}&token=${tokenBghHenTn}`;
  const gdcsDatUrl = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=APPROVE_MIEN_HT&email=${encodeURIComponent(recipientEmail)}&token=${tokenGdcsDat}`;
  const gdcsChuaDatUrl = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=KHONG_DAT&email=${encodeURIComponent(recipientEmail)}&token=${tokenGdcsChuaDat}`;
  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=preschool`;

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

          <!-- B5 Area Table (for BGH_MN) OR B6/B9A Routing Summary Table (for GDCS) -->
          <tr>
            <td style="padding: 6px 28px 18px 28px;">
              ${
                isBghMnEmail
                  ? `
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #CBD5E1; border-radius: 12px; border-collapse: separate; overflow: hidden;">
                <tr bgcolor="#003B3A" style="background-color: #003B3A; color: #FFFFFF;">
                  <th align="left" style="padding: 10px 14px; font-size: 11px; font-weight: 700; width: 55%;">
                    Lĩnh vực phát triển mầm non
                  </th>
                  <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 700; width: 22%; text-align: center;">
                    Tiêu chí Đạt
                  </th>
                  <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 700; width: 23%; text-align: center;">
                    Tỷ lệ
                  </th>
                </tr>
                ${devTableHtml}
                ${devSummary && devSummary.totalCriteria > 0 ? `
                  <tr bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-top: 2px solid #CBD5E1;">
                    <td style="padding: 10px 14px; font-size: 12px; font-weight: 800; color: #003B3A;">
                      Tổng hợp năng lực đầu vào (B5/B4B)
                    </td>
                    <td align="center" style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #059669; text-align: center;">
                      ${devSummary.totalPassed}/${devSummary.totalCriteria} tiêu chí
                    </td>
                    <td align="center" style="padding: 10px 14px; text-align: center;">
                      <span style="display: inline-block; padding: 4px 12px; border-radius: 8px; font-size: 13px; font-weight: 800; background-color: #D1FAE5; color: #065F46; border: 1px solid #059669;">
                        ${devSummary.overallPercentage}% Đạt
                      </span>
                    </td>
                  </tr>
                ` : ""}
              </table>
                  `
                  : (() => {
                      const hasTrialInfo = Boolean(
                        student.probationaryClass ||
                          student.probationaryTeacher ||
                          student.probationaryPeriod ||
                          student.probationaryResult ||
                          student.probationaryBghStatus ||
                          bghStatus === "HEN_TRAI_NGHIEM" ||
                          bghStatus === "DAT_HOC_THU"
                      );
                      const trialBadge = !hasTrialInfo
                        ? { text: "Không KS", bg: "#F1F5F9", color: "#475569" }
                        : student.probationaryBghStatus
                          ? { text: "✓ Hoàn thành", bg: "#D1FAE5", color: "#065F46" }
                          : { text: "● Đợi", bg: "#FEF3C7", color: "#92400E" };
                      const trialDetail = !hasTrialInfo
                        ? "Không phát sinh học trải nghiệm"
                        : [
                            student.probationaryResult
                              ? `GV ĐG: ${student.probationaryResult === "DAT" ? "Đạt" : "Chưa đạt"}`
                              : null,
                            student.probationaryBghStatus
                              ? `BGH duyệt: ${
                                  student.probationaryBghStatus === "DAT"
                                    ? "Đạt"
                                    : student.probationaryBghStatus === "KHONG_DAT"
                                      ? "Không đạt"
                                      : "Ý kiến khác"
                                }`
                              : "Chờ BGH MN duyệt",
                            student.probationaryClass ? `Lớp: ${student.probationaryClass}` : null,
                            student.probationaryTeacher ? `GV: ${student.probationaryTeacher}` : null,
                          ]
                            .filter(Boolean)
                            .join(" &bull; ");

                      const hasPsyInfo = Boolean(
                        Number(student.trialPsychologyScreening || 0) === 1 ||
                          student.trialPsychologistName ||
                          student.trialPsychologyStatus ||
                          student.trialPsychologyConclusion
                      );
                      const psyDone =
                        student.trialPsychologyStatus === "COMPLETED" ||
                        student.trialPsychologyStatus === "EVALUATED";
                      const psyBadge = !hasPsyInfo
                        ? { text: "Không KS", bg: "#F1F5F9", color: "#475569" }
                        : psyDone
                          ? { text: "✓ Hoàn thành", bg: "#D1FAE5", color: "#065F46" }
                          : { text: "● Đợi", bg: "#FEF3C7", color: "#92400E" };
                      const psyConclusionText =
                        student.trialPsychologyConclusion === "BINH_THUONG"
                          ? "Phát triển tâm lý bình thường"
                          : student.trialPsychologyConclusion === "CAN_THEO_DOI"
                            ? "Cần theo dõi thêm"
                            : student.trialPsychologyConclusion === "CAN_CAN_THIEP"
                              ? "Cần hỗ trợ / can thiệp chuyên sâu"
                              : psyDone
                                ? "Đã hoàn thành đánh giá"
                                : student.trialPsychologyStatus === "CONFIRMED"
                                  ? "GV Tâm lý đã xác nhận"
                                  : "Chờ GV Tâm lý đánh giá";
                      const psyDetail = !hasPsyInfo
                        ? "Không phát sinh khảo sát tâm lý"
                        : `${psyConclusionText}${student.trialPsychologistName ? ` &bull; GV phụ trách: <strong>${student.trialPsychologistName}</strong>` : ""}`;

                      const bghDone = Boolean(student.bghApprovalStatus);
                      const bghBadge = bghDone
                        ? { text: "✓ Hoàn thành", bg: "#D1FAE5", color: "#065F46" }
                        : { text: "● Đợi", bg: "#FEF3C7", color: "#92400E" };

                      return `
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #CBD5E1; border-radius: 12px; border-collapse: separate; overflow: hidden;">
                <tr bgcolor="#003B3A" style="background-color: #003B3A; color: #FFFFFF;">
                  <th colspan="3" align="left" style="padding: 10px 14px; font-size: 12px; font-weight: 700;">
                    Kết quả rà soát &amp; định tuyến B6 / B9A (NT Mầm non / BGH &bull; Học trải nghiệm &bull; Tâm lý)
                  </th>
                </tr>
                <tr bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
                  <th align="left" style="padding: 8px 14px; font-size: 11px; font-weight: 700; color: #475569; width: 28%;">Hạng mục</th>
                  <th align="center" style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; width: 20%; text-align: center;">Trạng thái</th>
                  <th align="left" style="padding: 8px 14px; font-size: 11px; font-weight: 700; color: #475569; width: 52%;">Kết quả chi tiết</th>
                </tr>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #003B3A;">NT Mầm non / BGH</td>
                  <td align="center" style="padding: 10px 10px; text-align: center;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background-color: ${bghBadge.bg}; color: ${bghBadge.color};">
                      ${bghBadge.text}
                    </span>
                  </td>
                  <td style="padding: 10px 14px; font-size: 12px; color: #1E293B; line-height: 1.5;">
                    <strong style="color: ${bghStatusColor};">${bghStatusText}</strong>
                    ${bghDone ? `<div style="font-size: 11px; color: #64748B; margin-top: 2px;">Người rà soát: ${bghUser} &bull; ${bghDate}</div>` : ""}
                    ${student.bghApprovalComment ? `<div style="font-size: 11px; color: #334155; font-style: italic; margin-top: 2px;">&ldquo;${student.bghApprovalComment}&rdquo;</div>` : ""}
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #003B3A;">B6 Học trải nghiệm</td>
                  <td align="center" style="padding: 10px 10px; text-align: center;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background-color: ${trialBadge.bg}; color: ${trialBadge.color};">
                      ${trialBadge.text}
                    </span>
                  </td>
                  <td style="padding: 10px 14px; font-size: 12px; color: #334155; line-height: 1.5;">
                    ${trialDetail}
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #003B3A;">B7 Khảo sát tâm lý</td>
                  <td align="center" style="padding: 10px 10px; text-align: center;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background-color: ${psyBadge.bg}; color: ${psyBadge.color};">
                      ${psyBadge.text}
                    </span>
                  </td>
                  <td style="padding: 10px 14px; font-size: 12px; color: #334155; line-height: 1.5;">
                    ${psyDetail}
                  </td>
                </tr>
                ${devSummary && devSummary.totalCriteria > 0 ? `
                <tr bgcolor="#F0FDFA" style="background-color: #F0FDFA;">
                  <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; color: #003B3A;">B5/B4B Đánh giá đầu vào</td>
                  <td align="center" style="padding: 9px 10px; text-align: center;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; background-color: #D1FAE5; color: #065F46;">
                      ${devSummary.overallPercentage}% Đạt
                    </span>
                  </td>
                  <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; color: #059669;">
                    ${devSummary.totalPassed}/${devSummary.totalCriteria} tiêu chí Đạt
                  </td>
                </tr>
                ` : ""}
              </table>
                      `;
                    })()
              }
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
                    ${
                      isBghMnEmail
                        ? `⚠️ <strong>Kính đề xuất Nhóm trưởng / BGH Mầm non tiến hành rà soát &amp; định tuyến trực tuyến (Bước 1 — B6 / B9A)</strong> để chuyển trình Giám Đốc Cơ sở (B10) hoặc bố trí Hẹn trải nghiệm kết hợp quan sát tâm lý (B7B).`
                        : `⚠️ <strong>Kính đề xuất Giám Đốc Cơ sở tiến hành xem xét phê duyệt trực tuyến (Bước 2 — B10)</strong> để Bộ phận Tuyển sinh có thể kịp thời xuất báo cáo kết quả chính thức gửi Quý Phụ huynh.`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIRECT ACTION BUTTONS (BULLETPROOF OUTLOOK & MOBILE COMPATIBLE) -->
          <tr>
            <td align="center" style="padding: 6px 28px 28px 28px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              
              <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                ${
                  isBghMnEmail
                    ? "⚡ THAO TÁC RÀ SOÁT &amp; ĐỊNH TUYẾN B6 / B9A — NT MẦM NON / BGH"
                    : "⚡ THAO TÁC PHÊ DUYỆT B10 TRỰC TIẾP DÀNH CHO GĐCS"
                }
              </div>

              ${
                isBghMnEmail
                  ? `
              <!-- BGH Button 1: Đề xuất Đạt -> B10 -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 10px auto; width: 100%; max-width: 480px;">
                <tr>
                  <td align="center" bgcolor="#059669" style="background-color: #059669; border-radius: 10px;">
                    <a href="${bghDatUrl}" target="_blank" style="display: block; padding: 13px 24px; font-size: 14px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      ✓ Đề xuất Đạt &rarr; B10
                    </a>
                  </td>
                </tr>
              </table>

              <!-- BGH Button 2: Đề xuất Chưa đạt -> B10 -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 10px auto; width: 100%; max-width: 480px;">
                <tr>
                  <td align="center" bgcolor="#E11D48" style="background-color: #E11D48; border-radius: 10px;">
                    <a href="${bghChuaDatUrl}" target="_blank" style="display: block; padding: 13px 24px; font-size: 14px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      ✕ Đề xuất Chưa đạt &rarr; B10
                    </a>
                  </td>
                </tr>
              </table>

              <!-- BGH Button 3: Hẹn trải nghiệm (B7B) -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 12px auto; width: 100%; max-width: 480px;">
                <tr>
                  <td align="center" bgcolor="#008B85" style="background-color: #008B85; border-radius: 10px;">
                    <a href="${bghHenTnUrl}" target="_blank" style="display: block; padding: 13px 24px; font-size: 13px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      📅 Hẹn trải nghiệm (B7B) — Chọn Khối, Lớp, GV &amp; lịch hẹn (&ge; 2 ngày làm việc)
                    </a>
                  </td>
                </tr>
              </table>
                  `
                  : `
              <!-- GDCS Button 1: Phê duyệt Đạt -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 10px auto; width: 100%; max-width: 480px;">
                <tr>
                  <td align="center" bgcolor="#059669" style="background-color: #059669; border-radius: 10px;">
                    <a href="${gdcsDatUrl}" target="_blank" style="display: block; padding: 14px 24px; font-size: 14px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      ✓ Phê duyệt Đạt (B10) &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- GDCS Button 2: Phê duyệt Chưa đạt -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 12px auto; width: 100%; max-width: 480px;">
                <tr>
                  <td align="center" bgcolor="#E11D48" style="background-color: #E11D48; border-radius: 10px;">
                    <a href="${gdcsChuaDatUrl}" target="_blank" style="display: block; padding: 13px 24px; font-size: 14px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      ✕ Phê duyệt Chưa đạt (B10)
                    </a>
                  </td>
                </tr>
              </table>
                  `
              }

              <!-- Portal link -->
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
                * Thầy/Cô có thể bấm thao tác trực tiếp ngay trên email bằng các nút phía trên mà không cần đăng nhập lại.
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
                Ban KT&amp;ĐBCL
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

export interface PreschoolWorkflowQuickApprovePayload {
  v: 2;
  studentId?: string;
  studentIds?: string[];
  roundId?: string;
  step: "B6_B9A" | "B10" | "B10_BATCH";
  decision: "DAT" | "CHUA_DAT" | "DE_XUAT_DAT" | "DE_XUAT_CHUA_DAT" | "CAN_TAM_LY";
  approverEmail: string;
  approverName?: string;
  exp: number; // unix ms
}

/**
 * Tạo token ký HMAC-SHA256 có thời hạn (mặc định 7 ngày) cho phê duyệt 1 chạm qua Email (B6/B9A & B10).
 */
export function createWorkflowQuickApproveToken(
  payload: Omit<PreschoolWorkflowQuickApprovePayload, "v" | "exp">,
  ttlMs = 7 * 24 * 60 * 60 * 1000
): string {
  const fullPayload: PreschoolWorkflowQuickApprovePayload = {
    ...payload,
    approverEmail: (payload.approverEmail || "").trim().toLowerCase(),
    v: 2,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * Xác thực token phê duyệt 1 chạm qua Email (kiểm tra chữ ký HMAC + thời hạn).
 */
export function verifyWorkflowQuickApproveToken(
  token: string
): { valid: true; payload: PreschoolWorkflowQuickApprovePayload } | { valid: false; reason: string } {
  if (!token || !token.includes(".")) {
    return { valid: false, reason: "Token không hợp lệ." };
  }
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) {
    return { valid: false, reason: "Token bị thiếu thành phần." };
  }
  const expectedSig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: "Chữ ký xác thực không hợp lệ." };
    }
  } catch {
    return { valid: false, reason: "Lỗi kiểm tra chữ ký." };
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PreschoolWorkflowQuickApprovePayload;
    if (parsed.v !== 2 || !parsed.exp || Date.now() > parsed.exp) {
      return { valid: false, reason: "Liên kết phê duyệt đã hết hạn (quá 7 ngày). Vui lòng thao tác trực tiếp trên SSM." };
    }
    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, reason: "Dữ liệu token bị lỗi." };
  }
}

/**
 * Tạo nội dung Email trình duyệt 1 chạm theo Quy trình Mầm non 2026 (B10 — GĐCS).
 */
export function generatePreschoolB10ApprovalEmailHtml(params: {
  student: {
    id: string;
    fullName: string;
    studentCode: string;
    grade?: string | null;
    surveySystem?: string | null;
    registeredCampus?: string | null;
    admissionCampus?: string | null;
    intakeMode?: string | null;
  };
  round: {
    id: string;
    roundNumber: number;
    roundType: string;
    formCode?: string | null;
    formVersion?: string | null;
    reviewDecision?: string | null;
    reviewComment?: string | null;
    reviewedByName?: string | null;
    generalComment?: string | null;
    experienceObservation?: string | null;
  };
  recipientEmail: string;
  recipientName: string;
  baseUrl: string;
}): string {
  const { student, round, recipientEmail, recipientName, baseUrl } = params;
  const tokenDat = createWorkflowQuickApproveToken({
    studentId: student.id,
    roundId: round.id,
    step: "B10",
    decision: "DAT",
    approverEmail: recipientEmail,
    approverName: recipientName,
  });
  const tokenChuaDat = createWorkflowQuickApproveToken({
    studentId: student.id,
    roundId: round.id,
    step: "B10",
    decision: "CHUA_DAT",
    approverEmail: recipientEmail,
    approverName: recipientName,
  });

  const urlDat = `${baseUrl}/api/admin/quick-approve/preschool?wt=${encodeURIComponent(tokenDat)}`;
  const urlChuaDat = `${baseUrl}/api/admin/quick-approve/preschool?wt=${encodeURIComponent(tokenChuaDat)}`;
  const portalUrl = `${baseUrl}/admin/khao-sat-mam-non?studentId=${encodeURIComponent(student.id)}`;

  const campusLabel = student.registeredCampus || student.admissionCampus || "Sky-Line";
  const reviewLabel =
    round.reviewDecision === "DE_XUAT_DAT"
      ? "Đề xuất Đạt"
      : round.reviewDecision === "DE_XUAT_CHUA_DAT"
        ? "Đề xuất Chưa đạt"
        : round.reviewDecision || "Chờ kết luận";

  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#003B3A;padding:24px 28px;color:#FFFFFF;">
            <div style="font-size:12px;color:#5EEAD4;font-weight:600;margin-bottom:4px;">Hệ thống Giáo dục Sky-Line · Quy trình Khảo sát Mầm non 2026</div>
            <div style="font-size:20px;font-weight:700;">Trình phê duyệt kết quả khảo sát (Bước B10)</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 14px 0;font-size:14px;">Kính gửi <strong>${recipientName}</strong>,</p>
            <p style="margin:0 0 18px 0;font-size:14px;color:#334155;line-height:1.6;">
              Hồ sơ khảo sát đầu vào Mầm non dưới đây đã hoàn tất rà soát chuyên môn và sẵn sàng trình Giám đốc Điều hành Cơ sở phê duyệt.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:20px;font-size:13px;">
              <tr style="background:#F8FAFC;"><td style="padding:10px 14px;color:#475569;width:38%;">Họ tên trẻ</td><td style="padding:10px 14px;font-weight:700;color:#0F172A;">${student.fullName} (${student.studentCode})</td></tr>
              <tr><td style="padding:10px 14px;color:#475569;border-top:1px solid #F1F5F9;">Cơ sở / Nhóm tuổi / Hệ</td><td style="padding:10px 14px;border-top:1px solid #F1F5F9;">${campusLabel} · ${student.grade || "Mầm non"} · ${student.surveySystem || "Hệ S"}</td></tr>
              <tr style="background:#F8FAFC;"><td style="padding:10px 14px;color:#475569;border-top:1px solid #F1F5F9;">Lần khảo sát / Biểu mẫu</td><td style="padding:10px 14px;border-top:1px solid #F1F5F9;">Lần ${round.roundNumber} (${round.roundType}) · ${round.formCode || "Chưa gắn mẫu"} (v${round.formVersion || "2026.1"})</td></tr>
              <tr><td style="padding:10px 14px;color:#475569;border-top:1px solid #F1F5F9;">Rà soát Nhóm trưởng MN</td><td style="padding:10px 14px;border-top:1px solid #F1F5F9;font-weight:700;color:#00736E;">${reviewLabel} ${round.reviewedByName ? `(${round.reviewedByName})` : ""}</td></tr>
              ${round.reviewComment ? `<tr style="background:#F8FAFC;"><td style="padding:10px 14px;color:#475569;border-top:1px solid #F1F5F9;">Ý kiến rà soát</td><td style="padding:10px 14px;border-top:1px solid #F1F5F9;">${round.reviewComment}</td></tr>` : ""}
              ${(round.generalComment || round.experienceObservation) ? `<tr><td style="padding:10px 14px;color:#475569;border-top:1px solid #F1F5F9;">Nhận xét GV / Quan sát</td><td style="padding:10px 14px;border-top:1px solid #F1F5F9;">${round.generalComment || round.experienceObservation}</td></tr>` : ""}
            </table>

            <div style="font-size:13px;font-weight:700;color:#003B3A;margin-bottom:12px;">Phê duyệt nhanh 1 chạm (tự động cập nhật trạng thái trên SSM):</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
              <tr>
                <td width="50%" style="padding-right:6px;">
                  <a href="${urlDat}" style="display:block;text-align:center;background:#059669;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:12px 16px;border-radius:10px;">
                    ✓ Phê duyệt Đạt
                  </a>
                </td>
                <td width="50%" style="padding-left:6px;">
                  <a href="${urlChuaDat}" style="display:block;text-align:center;background:#E11D48;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:12px 16px;border-radius:10px;">
                    ✕ Phê duyệt Chưa đạt
                  </a>
                </td>
              </tr>
            </table>
            <div style="text-align:center;">
              <a href="${portalUrl}" style="display:inline-block;color:#00736E;font-size:13px;font-weight:600;text-decoration:underline;">
                Mở hồ sơ chi tiết trên SSM →
              </a>
            </div>
            <p style="margin:18px 0 0 0;font-size:11px;color:#64748B;line-height:1.5;">
              Liên kết phê duyệt có hiệu lực trong 7 ngày. Hệ thống tự động cập nhật tiến độ sang <strong>Đã duyệt</strong>, ghi nhật ký phê duyệt và thông báo cho bộ phận Giáo vụ / Tư vấn thực hiện bước tiếp theo.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}

export interface PreschoolPsychologyConfirmPayload {
  v: 1;
  studentId: string;
  psychologistId?: string;
  psychologistName: string;
  psychologistEmail: string;
  exp: number;
}

/**
 * Tạo token ký HMAC-SHA256 (hiệu lực 14 ngày) để GV Tâm lý xác nhận tiếp nhận & gửi phản hồi sàng lọc tâm lý học trải nghiệm.
 */
export function createPreschoolPsychologyToken(
  payload: Omit<PreschoolPsychologyConfirmPayload, "v" | "exp">,
  ttlMs = 14 * 24 * 60 * 60 * 1000
): string {
  const fullPayload: PreschoolPsychologyConfirmPayload = {
    ...payload,
    psychologistEmail: (payload.psychologistEmail || "").trim().toLowerCase(),
    v: 1,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(`psy:${encoded}`).digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * Xác thực token phản hồi xác nhận sàng lọc tâm lý từ Email.
 */
export function verifyPreschoolPsychologyToken(
  token: string
): { valid: true; payload: PreschoolPsychologyConfirmPayload } | { valid: false; reason: string } {
  if (!token || !token.includes(".")) {
    return { valid: false, reason: "Liên kết xác nhận không hợp lệ." };
  }
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) {
    return { valid: false, reason: "Liên kết xác nhận bị thiếu thành phần." };
  }
  const expectedSig = crypto.createHmac("sha256", SECRET).update(`psy:${encoded}`).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: "Chữ ký xác thực không hợp lệ." };
    }
  } catch {
    return { valid: false, reason: "Lỗi kiểm tra chữ ký xác thực." };
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as PreschoolPsychologyConfirmPayload;
    if (parsed.v !== 1 || !parsed.exp || Date.now() > parsed.exp) {
      return {
        valid: false,
        reason: "Liên kết xác nhận đã hết hạn (quá 14 ngày). Vui lòng liên hệ Giáo vụ / BGH Mầm non để gửi lại.",
      };
    }
    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, reason: "Dữ liệu liên kết xác nhận bị lỗi." };
  }
}

/**
 * Tạo nội dung Email mời GV Tâm lý đánh giá sàng lọc tâm lý & phản hồi xác nhận (giai đoạn Học trải nghiệm Mầm non).
 */
export function renderPreschoolPsychologyScreeningEmailHtml(params: {
  student: {
    id: string;
    fullName: string;
    studentCode: string;
    grade?: string | null;
    admissionCampus?: string | null;
    probationaryClass?: string | null;
    probationaryTeacher?: string | null;
    probationaryPeriod?: string | null;
  };
  psychologistId?: string;
  psychologistName: string;
  psychologistEmail: string;
  flaggedCriteriaNames?: string[];
  note?: string;
  assignedByName?: string;
  baseUrl: string;
}): string {
  const {
    student,
    psychologistId,
    psychologistName,
    psychologistEmail,
    flaggedCriteriaNames = [],
    note = "",
    assignedByName = "Ban Giám Hiệu Mầm non",
    baseUrl,
  } = params;

  const token = createPreschoolPsychologyToken({
    studentId: student.id,
    psychologistId,
    psychologistName,
    psychologistEmail,
  });

  const confirmUrl = `${baseUrl}/api/admin/quick-approve/preschool?pt=${encodeURIComponent(token)}`;
  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=preschool`;

  const criteriaHtml =
    flaggedCriteriaNames.length > 0
      ? `<div style="margin:14px 0;padding:12px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;">
           <div style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:6px;">Tiêu chí cần lưu ý sàng lọc tâm lý:</div>
           <ul style="margin:0;padding-left:18px;font-size:12.5px;color:#78350F;line-height:1.5;">
             ${flaggedCriteriaNames.map(c => `<li>${c}</li>`).join("")}
           </ul>
         </div>`
      : "";

  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#003B3A;padding:22px 28px;color:#FFFFFF;border-bottom:4px solid #00A19A;">
            <div style="font-size:12px;color:#5EEAD4;font-weight:600;margin-bottom:4px;">Hệ thống Giáo dục Sky-Line · Khảo sát &amp; Học trải nghiệm Mầm non</div>
            <div style="font-size:19px;font-weight:700;">Yêu cầu Sàng lọc tâm lý &amp; Phản hồi xác nhận</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 12px 0;font-size:14px;">Kính gửi Cô/Thầy <strong>${psychologistName}</strong>,</p>
            <p style="margin:0 0 16px 0;font-size:13.5px;color:#334155;line-height:1.6;">
              Trong quá trình phân công học trải nghiệm Mầm non, bộ phận chuyên môn (${assignedByName}) ghi nhận trẻ dưới đây cần được <strong>Sàng lọc tâm lý</strong> và phân công Cô/Thầy thực hiện đánh giá, đồng thời phản hồi xác nhận trên hệ thống SSM.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:16px;font-size:13px;">
              <tr style="background:#F8FAFC;"><td style="padding:9px 14px;color:#475569;width:38%;">Họ và tên trẻ</td><td style="padding:9px 14px;font-weight:700;color:#0F172A;">${student.fullName} (${student.studentCode})</td></tr>
              <tr><td style="padding:9px 14px;color:#475569;border-top:1px solid #F1F5F9;">Nhóm tuổi / Cơ sở</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;">${student.grade || "Mầm non"} · ${student.admissionCampus || "Sky-Line"}</td></tr>
              <tr style="background:#F8FAFC;"><td style="padding:9px 14px;color:#475569;border-top:1px solid #F1F5F9;">Lớp học trải nghiệm</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;font-weight:600;color:#003B3A;">${student.probationaryClass || "Đang sắp xếp"}</td></tr>
              <tr><td style="padding:9px 14px;color:#475569;border-top:1px solid #F1F5F9;">GV đánh giá học trải nghiệm</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;">${student.probationaryTeacher || "Chưa phân công"}</td></tr>
              ${student.probationaryPeriod ? `<tr style="background:#F8FAFC;"><td style="padding:9px 14px;color:#475569;border-top:1px solid #F1F5F9;">Thời gian học trải nghiệm</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;">${student.probationaryPeriod}</td></tr>` : ""}
              ${note ? `<tr><td style="padding:9px 14px;color:#475569;border-top:1px solid #F1F5F9;">Ghi chú chuyên môn</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;color:#334155;">${note}</td></tr>` : ""}
            </table>

            ${criteriaHtml}

            <div style="text-align:center;margin:20px 0 14px 0;">
              <a href="${confirmUrl}" style="display:inline-block;background:#003B3A;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:13px 26px;border-radius:10px;">
                Xác nhận tiếp nhận &amp; Gửi phản hồi đánh giá tâm lý
              </a>
            </div>

            <div style="text-align:center;">
              <a href="${portalUrl}" style="display:inline-block;color:#00736E;font-size:12.5px;font-weight:600;text-decoration:underline;">
                Mở trang Xét duyệt kết quả Mầm non trên SSM →
              </a>
            </div>
            <p style="margin:18px 0 0 0;font-size:11px;color:#64748B;line-height:1.5;">
              Liên kết xác nhận có hiệu lực trong 14 ngày. Sau khi Cô/Thầy gửi phản hồi xác nhận, kết quả sẽ tự động đồng bộ trực tiếp vào phiếu Phân công học trải nghiệm &amp; Xét duyệt trên hệ thống SSM.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}

/**
 * Render batch email for Preschool Approval by Batch:
 * - targetRole === "BGH_MN": lists all B5/B4B-completed students with per-student 1-tap B6/B9A links
 *   (Đề xuất Đạt → B10, Đề xuất Chưa đạt → B10, Hẹn trải nghiệm B7B)
 * - targetRole === "GDCS": lists all BGH-reviewed students with B6/B9A summary (NT MN/BGH · Trial · Psych)
 *   and per-student 1-tap B10 buttons (Phê duyệt Đạt / Chưa đạt)
 */
export function renderPreschoolBatchApprovalEmailHtml(params: {
  students: Array<{
    student: any;
    devSummary?: { totalCriteria: number; totalPassed: number; overallPercentage: number };
  }>;
  batchName: string;
  campusName: string;
  recipientName: string;
  recipientEmail: string;
  targetRole: "BGH_MN" | "GDCS";
  isArchiveCopy?: boolean;
  baseUrl: string;
}): string {
  const {
    students,
    batchName,
    campusName,
    recipientName,
    recipientEmail,
    targetRole,
    isArchiveCopy = false,
    baseUrl,
  } = params;

  const isBghMn = targetRole === "BGH_MN";
  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=preschool`;

  const rowsHtml = students
    .map(({ student, devSummary }, idx) => {
      const scoreText =
        devSummary && devSummary.totalCriteria > 0
          ? `${devSummary.totalPassed}/${devSummary.totalCriteria} Đạt (${devSummary.overallPercentage}%)`
          : "Đã đánh giá";

      if (isBghMn) {
        const tDat = generatePreschoolApprovalToken(student.id, "BGH_DE_XUAT_DAT", recipientEmail);
        const tChuaDat = generatePreschoolApprovalToken(student.id, "BGH_DE_XUAT_CHUA_DAT", recipientEmail);
        const tHenTn = generatePreschoolApprovalToken(student.id, "BGH_HEN_TRAI_NGHIEM", recipientEmail);
        const uDat = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=BGH_DE_XUAT_DAT&email=${encodeURIComponent(recipientEmail)}&token=${tDat}`;
        const uChuaDat = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=BGH_DE_XUAT_CHUA_DAT&email=${encodeURIComponent(recipientEmail)}&token=${tChuaDat}`;
        const uHenTn = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=BGH_HEN_TRAI_NGHIEM&email=${encodeURIComponent(recipientEmail)}&token=${tHenTn}`;

        return `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 10px; font-size: 12px; color: #64748B; text-align: center;">${idx + 1}</td>
            <td style="padding: 10px 10px; font-size: 12px;">
              <div style="font-weight: 700; color: #003B3A;">${student.fullName}</div>
              <div style="font-size: 11px; color: #64748B;">${student.studentCode} &bull; ${student.grade || "Mầm non"}</div>
            </td>
            <td style="padding: 10px 10px; font-size: 12px;">
              <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#ECFDF5;color:#065F46;font-weight:700;font-size:11px;">${scoreText}</span>
              ${student.devProfessionalComment ? `<div style="font-size:11px;color:#475569;margin-top:3px;font-style:italic;">&ldquo;${String(student.devProfessionalComment).slice(0, 90)}&rdquo;</div>` : ""}
            </td>
            <td style="padding: 10px 10px; font-size: 11px; white-space: nowrap;">
              <a href="${uDat}" target="_blank" style="display:inline-block;padding:5px 9px;margin:2px;border-radius:6px;background:#059669;color:#FFFFFF;font-weight:700;text-decoration:none;">✓ Đạt → B10</a>
              <a href="${uChuaDat}" target="_blank" style="display:inline-block;padding:5px 9px;margin:2px;border-radius:6px;background:#E11D48;color:#FFFFFF;font-weight:700;text-decoration:none;">✕ Chưa đạt</a>
              <a href="${uHenTn}" target="_blank" style="display:inline-block;padding:5px 9px;margin:2px;border-radius:6px;background:#008B85;color:#FFFFFF;font-weight:700;text-decoration:none;">📅 Hẹn TN (B7B)</a>
            </td>
          </tr>
        `;
      } else {
        const tDat = generatePreschoolApprovalToken(student.id, "APPROVE_MIEN_HT", recipientEmail);
        const tChuaDat = generatePreschoolApprovalToken(student.id, "KHONG_DAT", recipientEmail);
        const uDat = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=APPROVE_MIEN_HT&email=${encodeURIComponent(recipientEmail)}&token=${tDat}`;
        const uChuaDat = `${baseUrl}/api/admin/quick-approve/preschool?studentId=${student.id}&action=KHONG_DAT&email=${encodeURIComponent(recipientEmail)}&token=${tChuaDat}`;

        const bghRaw = String(student.bghApprovalStatus || "").toUpperCase();
        const bghText =
          bghRaw === "DE_XUAT_DAT" || bghRaw === "DAT" || bghRaw === "DAT_MIEN_HOC_THU"
            ? "Đề xuất Đạt"
            : bghRaw === "DE_XUAT_CHUA_DAT" || bghRaw === "KHONG_DAT"
              ? "Đề xuất Chưa đạt"
              : bghRaw === "HEN_TRAI_NGHIEM" || bghRaw === "DAT_HOC_THU"
                ? "Hẹn trải nghiệm"
                : "Chưa rà soát";
        const trialText = student.probationaryBghStatus
          ? `HTN: BGH duyệt ${student.probationaryBghStatus === "DAT" ? "Đạt" : "Không đạt"}`
          : "HTN: Không KS";
        const psyText =
          Number(student.trialPsychologyScreening || 0) === 1 || student.trialPsychologistName
            ? `Tâm lý: ${student.trialPsychologyConclusion || student.trialPsychologyStatus || "Đã đánh giá"}${student.trialPsychologistName ? ` (${student.trialPsychologistName})` : ""}`
            : "Tâm lý: Không KS";

        return `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 10px; font-size: 12px; color: #64748B; text-align: center;">${idx + 1}</td>
            <td style="padding: 10px 10px; font-size: 12px;">
              <div style="font-weight: 700; color: #003B3A;">${student.fullName}</div>
              <div style="font-size: 11px; color: #64748B;">${student.studentCode} &bull; ${student.grade || "Mầm non"}</div>
            </td>
            <td style="padding: 10px 10px; font-size: 11px; color: #334155; line-height: 1.5;">
              <div><strong>NT MN/BGH:</strong> ${bghText} (${scoreText})</div>
              <div>${trialText} &bull; ${psyText}</div>
            </td>
            <td style="padding: 10px 10px; font-size: 11px; white-space: nowrap;">
              <a href="${uDat}" target="_blank" style="display:inline-block;padding:6px 10px;margin:2px;border-radius:6px;background:#059669;color:#FFFFFF;font-weight:700;text-decoration:none;">✓ Duyệt Đạt (B10)</a>
              <a href="${uChuaDat}" target="_blank" style="display:inline-block;padding:6px 10px;margin:2px;border-radius:6px;background:#E11D48;color:#FFFFFF;font-weight:700;text-decoration:none;">✕ Chưa đạt</a>
            </td>
          </tr>
        `;
      }
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;">
    <tr><td align="center">
      <table role="presentation" width="700" cellpadding="0" cellspacing="0" style="max-width:700px;width:100%;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:16px;overflow:hidden;">
        <tr>
          <td bgcolor="#003B3A" style="background:#003B3A;padding:22px 26px;color:#FFFFFF;border-bottom:4px solid #00A19A;">
            <div style="font-size:11px;color:#5EEAD4;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
              Hệ thống Giáo dục Sky-Line &bull; Khảo sát Mầm non ${campusName}
            </div>
            ${isArchiveCopy ? `<div style="display:inline-block;margin-top:6px;padding:3px 10px;border-radius:6px;background:#FEF3C7;color:#92400E;font-size:11px;font-weight:700;">Bản sao lưu trữ KT&amp;ĐBCL</div>` : ""}
            <h1 style="margin:6px 0 0 0;font-size:18px;font-weight:800;">
              ${
                isBghMn
                  ? `Yêu cầu NT Mầm non / BGH rà soát &amp; định tuyến theo đợt (${students.length} HS)`
                  : `Yêu cầu Giám đốc Cơ sở phê duyệt B10 theo đợt (${students.length} HS)`
              }
            </h1>
            <div style="margin-top:4px;font-size:12px;color:#CCFBF1;">Đợt khảo sát: <strong>${batchName}</strong></div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 26px;">
            <p style="margin:0 0 10px 0;font-size:14px;">Kính gửi Thầy/Cô <strong>${recipientName}</strong>,</p>
            <p style="margin:0 0 16px 0;font-size:13px;color:#334155;line-height:1.6;">
              ${
                isBghMn
                  ? `Tất cả <strong>${students.length} học sinh</strong> trong đợt <strong>${batchName}</strong> đã hoàn thành đánh giá <strong>B5/B4B</strong>. Kính đề xuất Thầy/Cô thực hiện rà soát &amp; định tuyến (Bước 1 — B6/B9A) trực tiếp ngay trên bảng bên dưới:`
                  : `Tất cả <strong>${students.length} học sinh</strong> trong đợt <strong>${batchName}</strong> đã hoàn tất rà soát <strong>Bước 1 (NT Mầm non / BGH)</strong>. Kính đề xuất Giám đốc Cơ sở phê duyệt kết quả chính thức (Bước 2 — B10) trực tiếp ngay trên bảng bên dưới:`
              }
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;border-collapse:collapse;">
              <tr bgcolor="#003B3A" style="background:#003B3A;color:#FFFFFF;font-size:11px;font-weight:700;">
                <th style="padding:9px 8px;width:32px;text-align:center;">#</th>
                <th style="padding:9px 10px;text-align:left;">Học sinh</th>
                <th style="padding:9px 10px;text-align:left;">${isBghMn ? "Kết quả B5/B4B" : "Kết quả rà soát B6/B9A"}</th>
                <th style="padding:9px 10px;text-align:left;color:#5EEAD4;">Thao tác trực tiếp</th>
              </tr>
              ${rowsHtml}
            </table>
            <div style="text-align:center;margin-top:18px;">
              <a href="${portalUrl}" target="_blank" style="display:inline-block;padding:10px 22px;border-radius:10px;border:2px solid #003B3A;color:#003B3A;font-size:13px;font-weight:700;text-decoration:none;">
                🔍 Mở bảng Xét duyệt Mầm non trên SSM Portal &rarr;
              </a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}

/**
 * Lấy danh sách email Tư vấn tuyển sinh, Giáo vụ cơ sở, và BGH / Nhóm trưởng Mầm non cơ sở.
 */
export async function resolvePreschoolStakeholderRecipients(student: any): Promise<{
  campusStr: string;
  campusCode: string;
  recipients: Array<{ fullName: string; email: string; role: string; isArchiveCopy: boolean }>;
}> {
  const campusStr = String(student?.admissionCampus || student?.registeredCampus || "").trim();
  const cUp = campusStr.toUpperCase();
  const campusCode =
    cUp.includes("CS1") || cUp.includes("RIVERSIDE") ? "CS1"
    : cUp.includes("CS2") || cUp.includes("CENTRAL") ? "CS2"
    : cUp.includes("CS3") || cUp.includes("GLOBAL") ? "CS3"
    : cUp.includes("CS4") || cUp.includes("HILL") ? "CS4"
    : cUp.includes("CS5") || cUp.includes("BEACH") ? "CS5"
    : "";

  const recMap = new Map<string, { fullName: string; email: string; role: string; isArchiveCopy: boolean }>();
  const addEmails = (raw?: string | null, roleLabel = "Cán bộ cơ sở", isArchiveCopy = false) => {
    if (!raw) return;
    for (const part of String(raw).split(/[,;\n]+/)) {
      const e = part.trim().toLowerCase();
      if (e.includes("@") && e !== "admin@skyline.edu" && !recMap.has(e)) {
        recMap.set(e, {
          fullName: e.split("@")[0],
          email: e,
          role: roleLabel,
          isArchiveCopy,
        });
      }
    }
  };

  // 1. Load configured PRESCHOOL_APPROVAL_ROUTING_V1 (BGH MN) & EMAIL_ROUTING_V1 (Tư vấn, Giáo vụ, BGH)
  try {
    const configs = await (prisma as any).assessmentConfig.findMany({
      where: { categoryType: "APPROVAL_EMAIL_CONFIG", name: { in: ["PRESCHOOL_APPROVAL_ROUTING_V1", "EMAIL_ROUTING_V1"] } },
    });
    for (const cfg of configs || []) {
      try {
        const parsed = JSON.parse(cfg.content || "{}");
        if (cfg.name === "PRESCHOOL_APPROVAL_ROUTING_V1" && campusCode) {
          addEmails(parsed?.campuses?.[campusCode]?.bghmn, `BGH / NT Mầm non ${campusCode}`);
        }
        if (cfg.name === "EMAIL_ROUTING_V1" && campusCode) {
          const cObj = parsed?.campuses?.[campusCode];
          addEmails(cObj?.tuVan, `Tư vấn tuyển sinh ${campusCode}`);
          addEmails(cObj?.giaoVu, `Giáo vụ ${campusCode}`);
          addEmails(cObj?.bgh, `BGH ${campusCode}`);
        }
      } catch {}
    }
  } catch {}

  // 2. Fallback DB users for that campus (TU_VAN, GIAO_VU, BGH_MN, NHOM_TRUONG_MN)
  try {
    const campusObj = campusCode
      ? await (prisma as any).campus.findFirst({ where: { OR: [{ campusCode }, { campusName: campusStr }] } })
      : null;
    if (campusObj) {
      addEmails(campusObj.admissionEmail, `Tư vấn tuyển sinh ${campusCode}`);
      const staff = await (prisma as any).user.findMany({
        where: {
          isActive: true,
          role: { in: ["TU_VAN", "TU_VAN_CS", "GIAO_VU", "GIAO_VU_CS", "BGH_MN", "NHOM_TRUONG_MN", "BGH_CS"] },
          OR: [{ campusId: campusObj.id }, { teacher: { campusId: campusObj.id } }],
        },
        select: { email: true, fullName: true, role: true },
      });
      for (const u of staff || []) {
        const e = String(u.email || "").trim().toLowerCase();
        if (e.includes("@") && e !== "admin@skyline.edu") {
          const existing = recMap.get(e);
          recMap.set(e, {
            fullName: u.fullName || existing?.fullName || e.split("@")[0],
            email: e,
            role: existing?.role || u.role || `Nhân sự ${campusCode}`,
            isArchiveCopy: existing?.isArchiveCopy || false,
          });
        }
      }
    }
  } catch {}

  // 3. Default BGH MN fallback by campus if empty
  const DEFAULT_BGH_MN: Record<string, string> = {
    CS1: "yenlth@skylineschool.edu.vn, yendhb@skylineschool.edu.vn",
    CS2: "yenlth@skylineschool.edu.vn, thanhmaitt@skylineschool.edu.vn",
    CS3: "yenlth@skylineschool.edu.vn, yendhb@skylineschool.edu.vn",
    CS4: "quyenlth@skylineschool.edu.vn, chault@skylineschool.edu.vn",
    CS5: "monghatn@skylineschool.edu.vn, ngocltb@skylineschool.edu.vn",
  };
  if (campusCode && DEFAULT_BGH_MN[campusCode]) {
    addEmails(DEFAULT_BGH_MN[campusCode], `BGH / NT Mầm non ${campusCode}`);
  }

  return { campusStr, campusCode, recipients: Array.from(recMap.values()) };
}

/**
 * Render HTML email thông báo kết quả phê duyệt GĐCS (B10) gửi Tư vấn, Giáo vụ, BGH / Nhóm trưởng cơ sở.
 */
export function renderPreschoolGdcsResultNotificationEmailHtml(params: {
  student: any;
  outcome: "DAT" | "CHUA_DAT";
  admissionResult: string;
  approverName: string;
  comment?: string | null;
  campusStr?: string;
  campusCode?: string;
  baseUrl?: string;
}): { subject: string; html: string } {
  const {
    student,
    outcome,
    admissionResult,
    approverName,
    comment,
    campusStr = String(student?.admissionCampus || student?.registeredCampus || "").trim(),
    campusCode = "",
    baseUrl = "https://ssm.skylineschool.edu.vn",
  } = params;
  const isPass = outcome === "DAT";
  const badgeBg = isPass ? "#D1FAE5" : "#FFE4E6";
  const badgeColor = isPass ? "#065F46" : "#9F1239";
  const subject = `[Sky-Line SSM · Mầm non] Kết quả phê duyệt GĐCS (${admissionResult}) — Bé ${student.fullName} (${student.studentCode})`;
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#003B3A;padding:20px 26px;color:#FFFFFF;border-bottom:4px solid ${isPass ? "#059669" : "#E11D48"};">
            <div style="font-size:11px;color:#5EEAD4;font-weight:700;">Hệ thống Giáo dục Sky-Line · Thông báo kết quả phê duyệt B10</div>
            <div style="font-size:18px;font-weight:800;margin-top:4px;">GĐCS đã phê duyệt kết quả Khảo sát Mầm non</div>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 26px;font-size:13.5px;line-height:1.6;">
            <p style="margin:0 0 12px 0;">Kính gửi Bộ phận <strong>Tư vấn tuyển sinh</strong>, <strong>Giáo vụ cơ sở</strong> và <strong>BGH / Nhóm trưởng Mầm non ${campusStr || campusCode}</strong>,</p>
            <p style="margin:0 0 14px 0;color:#334155;">Giám đốc Điều hành Cơ sở đã hoàn tất phê duyệt kết quả khảo sát đầu vào cho học sinh dưới đây:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;font-size:13px;margin-bottom:16px;">
              <tr style="background:#F8FAFC;"><td style="padding:9px 14px;color:#64748B;width:36%;">Học sinh</td><td style="padding:9px 14px;font-weight:700;color:#003B3A;">${student.fullName} (${student.studentCode})</td></tr>
              <tr><td style="padding:9px 14px;color:#64748B;border-top:1px solid #F1F5F9;">Nhóm tuổi / Cơ sở</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;">${student.grade || "Mầm non"} &bull; ${campusStr || campusCode}</td></tr>
              <tr style="background:#F8FAFC;"><td style="padding:9px 14px;color:#64748B;border-top:1px solid #F1F5F9;">Kết quả GĐCS duyệt</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;font-weight:700;background:${badgeBg};color:${badgeColor};">${admissionResult}</span></td></tr>
              <tr><td style="padding:9px 14px;color:#64748B;border-top:1px solid #F1F5F9;">Người phê duyệt</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;font-weight:600;">${approverName}</td></tr>
              ${comment ? `<tr style="background:#F8FAFC;"><td style="padding:9px 14px;color:#64748B;border-top:1px solid #F1F5F9;">Ý kiến GĐCS</td><td style="padding:9px 14px;border-top:1px solid #F1F5F9;font-style:italic;">&ldquo;${comment}&rdquo;</td></tr>` : ""}
            </table>
            <p style="margin:0 0 16px 0;font-size:13px;color:#334155;">
              ${
                isPass
                  ? "Bộ phận <strong>Giáo vụ / Tư vấn</strong> vui lòng tiến hành xuất <strong>Thư chúc mừng (BM.KTĐBCL.17)</strong> và trả kết quả chính thức cho Quý Phụ huynh."
                  : "Bộ phận <strong>Tư vấn / Giáo vụ</strong> vui lòng phối hợp trao đổi với Quý Phụ huynh và xuất <strong>Thư cảm ơn (BM.KTĐBCL.04)</strong> theo quy trình."
              }
            </p>
            <div style="text-align:center;">
              <a href="${baseUrl}/admin/xet-duyet-ket-qua?tab=preschool" style="display:inline-block;padding:10px 22px;border-radius:10px;background:#003B3A;color:#FFFFFF;font-size:13px;font-weight:700;text-decoration:none;">
                Mở bảng Xét duyệt Mầm non trên SSM &rarr;
              </a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
  return { subject, html };
}

/**
 * Tự động gửi email thông báo kết quả phê duyệt GĐCS (B10) đến:
 * Tư vấn tuyển sinh cơ sở, Giáo vụ cơ sở, và BGH / Nhóm trưởng Mầm non cơ sở.
 */
export async function notifyPreschoolGdcsResultToStakeholders(params: {
  student: any;
  outcome: "DAT" | "CHUA_DAT";
  admissionResult: string;
  approverName: string;
  comment?: string | null;
  baseUrl?: string;
}): Promise<{ emailsSent: number; recipients: string[] }> {
  const { student, outcome, admissionResult, approverName, comment, baseUrl = "https://ssm.skylineschool.edu.vn" } = params;
  const { campusStr, campusCode, recipients } = await resolvePreschoolStakeholderRecipients(student);
  const list = recipients.map((r) => r.email);
  if (list.length === 0) return { emailsSent: 0, recipients: [] };

  const { subject, html } = renderPreschoolGdcsResultNotificationEmailHtml({
    student,
    outcome,
    admissionResult,
    approverName,
    comment,
    campusStr,
    campusCode,
    baseUrl,
  });

  let sent = 0;
  for (const to of list) {
    try {
      await sendEmail({ to, subject, html, replyTo: "ktdbcl@skylineschool.edu.vn" });
      sent++;
    } catch {}
  }
  return { emailsSent: sent, recipients: list };
}
