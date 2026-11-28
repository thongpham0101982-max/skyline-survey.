// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";
import { requireStaffSession, requireAdminOrLeadershipSession } from "@/lib/security-guard";
import { 
  getAssignedPsychologyTeachers, 
  getStudentOrientationRecord, 
  upsertStudentOrientationRecord,
  getDepartments,
  getDepartmentTeachers,
  getGdcsCampusList,
  getCampusGiaovuEmail,
  getCampusTuyensinhEmail,
  getCampusGiaovuAndTuvanStaff,
  isGenericCampusAliasEmail,
  normalizeCampusCode,
  buildPsychologyGdcsCcList,
  hasPsychologicalSignsForGdcs,
  getStudentAssignedSurveyTeachers,
  formatMeetingTimeVi
} from "@/lib/orientation/service";
import { questionsData, defaultQuestions } from "@/lib/orientation/psychologyQuestions";

export const dynamic = "force-dynamic";

const GDCS_PROPOSED_ACTION_LABELS: Record<string, string> = {
  DIRECT_PARENT_MEETING: "1. GĐCS Gặp trực tiếp PHHS",
  DELEGATE_TEACHER: "2. Ủy quyền cho NTCM / GV phụ trách",
  SCHEDULE_MEETING: "3. Đặt lịch hẹn với PHHS"
};

function escapeHtmlSafe(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildGdcsReportEmailHtml(params: {
  student: any;
  gdcsName: string;
  gdcsEmail: string;
  normalizedCampusCode: string;
  reporterName: string;
  nowStr: string;
  giaovuStaffDisplay: string;
  tuvanStaffDisplay: string;
  resolvedGiaovuEmail: string;
  resolvedTuyensinhEmail: string;
  computedTotal: number;
  levelTitle: string;
  levelBadgeBg: string;
  levelBadgeColor: string;
  levelBadgeBorder: string;
  evaluation: any;
  sectionScores: number[];
  psychologicalSections: Array<{ no: number; title: string; max: number }>;
  conclusion: string;
  recommendation: string;
  orientationRecord: any;
  proposedAction: string;
  messageToGdcs: string;
  effectiveTopic: string;
  directOrientationLink: string;
  directPsychFormLink: string;
  assignedSurveyTeachers: any[];
}) {
  const {
    student,
    gdcsName,
    gdcsEmail,
    normalizedCampusCode,
    reporterName,
    nowStr,
    giaovuStaffDisplay,
    tuvanStaffDisplay,
    resolvedGiaovuEmail,
    resolvedTuyensinhEmail,
    computedTotal,
    levelTitle,
    levelBadgeBg,
    levelBadgeColor,
    levelBadgeBorder,
    evaluation,
    sectionScores,
    psychologicalSections,
    conclusion,
    recommendation,
    orientationRecord,
    proposedAction,
    messageToGdcs,
    effectiveTopic,
    directOrientationLink,
    directPsychFormLink,
    assignedSurveyTeachers
  } = params;

  const dobFormatted = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
    : "—";

  const surveyTeacherListHtml =
    Array.isArray(assignedSurveyTeachers) && assignedSurveyTeachers.length > 0
      ? `<div style="margin-top: 6px; padding: 8px 10px; background-color: #ffffff; border: 1px dashed #cbd5e1; border-radius: 5px; font-size: 11px; color: #334155;">
          <div style="font-weight: 700; color: #003B3A; margin-bottom: 4px;">Danh sách GV khảo sát học sinh có thể ủy quyền:</div>
          ${assignedSurveyTeachers
            .slice(0, 8)
            .map(
              (t: any) =>
                `<div style="margin-bottom: 2px;">&bull; <strong>${escapeHtmlSafe(t.teacherName)}</strong> — <span style="color: #00736E; font-weight: 600;">${escapeHtmlSafe(t.roleBadge || t.subjectLabel || "GV khảo sát")}</span>${t.email ? ` <span style="color: #64748b;">(${escapeHtmlSafe(t.email)})</span>` : ""}</div>`
            )
            .join("")}
        </div>`
      : `<div style="margin-top: 4px; font-size: 11px; color: #64748b; font-style: italic;">Chọn từ danh sách GV phỏng vấn định hướng, GV Tâm lý theo phân công hoặc NTCM trên hệ thống SSM.</div>`;

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>[Sky-line SMS] Báo cáo tổng hợp học sinh có dấu hiệu tâm lý &amp; Xin chỉ đạo GĐCS - HS ${escapeHtmlSafe(student.fullName)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 24px 0;">
        <tr>
          <td align="center" style="padding: 0 12px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <tr>
                <td height="4" bgcolor="#00A19A" style="background-color: #00A19A; font-size: 0; line-height: 0;">&nbsp;</td>
              </tr>
              <tr>
                <td bgcolor="#003B3A" style="background-color: #003B3A; color: #ffffff; padding: 22px 28px; text-align: left;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <div style="font-size: 11px; font-weight: 700; color: #a7f3d0; letter-spacing: 0.4px; margin-bottom: 6px;">
                          Hệ thống Giáo dục Sky-Line &bull; Tổ Tâm lý Học đường &amp; Ban KT&amp;ĐBCL
                        </div>
                        <h1 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: #ffffff; line-height: 1.35;">
                          Báo cáo Tổng hợp Học sinh có dấu hiệu Tâm lý &amp; Xin chỉ đạo GĐCS
                        </h1>
                        <div style="font-size: 12.5px; color: #e2e8f0; font-weight: 500;">
                          Kính gửi Giám đốc Cơ sở: <strong style="color: #ffffff;">${escapeHtmlSafe(gdcsName || "Thầy/Cô GĐCS")}</strong> &bull; Cơ sở ${escapeHtmlSafe(normalizedCampusCode)} (${escapeHtmlSafe(student.admissionCampus || student.registeredCampus || normalizedCampusCode)})
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 24px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11.5px; color: #475569; line-height: 1.55;">
                    <tr>
                      <td style="width: 46%; vertical-align: top; padding-right: 10px;">
                        <span style="color: #64748b; font-weight: 600;">Người lập báo cáo:</span> <strong style="color: #0f172a;">${escapeHtmlSafe(reporterName)}</strong> (GV Tâm lý)<br/>
                        <span style="color: #64748b; font-weight: 600;">Thời gian gửi:</span> <span style="color: #0f172a; font-variant-numeric: tabular-nums;">${escapeHtmlSafe(nowStr)}</span>
                      </td>
                      <td style="width: 54%; vertical-align: top; padding-left: 10px; border-left: 1px solid #e2e8f0;">
                        <span style="color: #64748b; font-weight: 600;">Gửi đến (To):</span> <strong style="color: #003B3A;">GĐCS ${escapeHtmlSafe(gdcsName)}</strong> (${escapeHtmlSafe(gdcsEmail)})<br/>
                        <span style="color: #64748b; font-weight: 600;">CC Tổ Giáo vụ CS (${escapeHtmlSafe(normalizedCampusCode)}):</span> <strong>${escapeHtmlSafe(giaovuStaffDisplay)}</strong><br/>
                        <span style="color: #64748b; font-weight: 600;">CC Tổ Tư vấn CS (${escapeHtmlSafe(normalizedCampusCode)}):</span> <strong>${escapeHtmlSafe(tuvanStaffDisplay)}</strong>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding: 24px 28px; color: #1e293b;">
                  <p style="margin: 0 0 18px 0; font-size: 13px; line-height: 1.6; color: #334155;">
                    Kính gửi <strong>Thầy/Cô ${escapeHtmlSafe(gdcsName || "Giám Đốc Cơ Sở")}</strong>,<br/>
                    Đồng kính gửi <strong>Bộ phận Giáo vụ Cơ sở</strong>, <strong>Bộ phận Tư vấn Cơ sở (${escapeHtmlSafe(normalizedCampusCode)})</strong> và <strong>Ban Khảo thí &amp; ĐBCL</strong>,<br/>
                    Qua kết quả <strong>TỔNG HỢP</strong> sàng lọc tâm lý đầu vào, học sinh <strong>${escapeHtmlSafe(student.fullName)}</strong> ghi nhận có <strong>dấu hiệu tâm lý cần lưu ý (${escapeHtmlSafe(levelTitle)} — ${computedTotal}/80 điểm)</strong>. Giáo viên Tâm lý (<strong>${escapeHtmlSafe(reporterName)}</strong>) trân trọng báo cáo chi tiết và kính trình Giám Đốc Cơ Sở xem xét, <strong>chỉ đạo phương án làm việc</strong> để các bộ phận phối hợp triển khai.
                  </p>

                  <!-- MỤC 1: HỒ SƠ HỌC SINH ĐẦU VÀO -->
                  <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; font-size: 12px; font-weight: 800; color: #003B3A;">
                      1. Hồ sơ học sinh khảo sát đầu vào
                    </div>
                    <div style="padding: 14px 16px; background-color: #ffffff;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12.5px; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 5px 0; color: #64748b; width: 26%;">Họ và tên học sinh:</td>
                          <td style="padding: 5px 0; font-weight: 800; color: #0f172a; font-size: 13.5px; width: 34%;">${escapeHtmlSafe(student.fullName)}</td>
                          <td style="padding: 5px 0; color: #64748b; width: 20%;">Mã học sinh:</td>
                          <td style="padding: 5px 0; font-weight: 700; color: #003B3A; font-family: monospace; font-size: 12.5px; width: 20%;">${escapeHtmlSafe(student.studentCode || "—")}</td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Ngày sinh &bull; Giới tính:</td>
                          <td style="padding: 5px 0; font-weight: 600; color: #1e293b; font-variant-numeric: tabular-nums;">${escapeHtmlSafe(dobFormatted)} &bull; ${escapeHtmlSafe(student.gender || "—")}</td>
                          <td style="padding: 5px 0; color: #64748b;">Khối đăng ký:</td>
                          <td style="padding: 5px 0; font-weight: 700; color: #1e293b;">Khối ${escapeHtmlSafe(student.grade || "1")}</td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Hệ khảo sát:</td>
                          <td style="padding: 5px 0; font-weight: 600; color: #1e293b;">${escapeHtmlSafe(student.surveyFormType || student.surveySystem || "Chất lượng cao")}</td>
                          <td style="padding: 5px 0; color: #64748b;">Cơ sở tiếp nhận:</td>
                          <td style="padding: 5px 0; font-weight: 700; color: #00A19A;">${escapeHtmlSafe(student.admissionCampus || student.registeredCampus || normalizedCampusCode)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Trường trước đây:</td>
                          <td style="padding: 5px 0; font-weight: 500; color: #334155;" colspan="3">${escapeHtmlSafe(student.oldSchoolName || "Chưa ghi nhận")}</td>
                        </tr>
                      </table>
                      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 12px; line-height: 1.55; color: #334155;">
                        <div style="margin-bottom: 4px;">
                          <strong style="color: #059669;">&bull; Điểm mạnh &amp; Tiềm năng học sinh:</strong>
                          <span>${escapeHtmlSafe(orientationRecord?.studentStrengths?.trim() || "Đang cập nhật từ phiếu định hướng.")}</span>
                        </div>
                        <div>
                          <strong style="color: #d97706;">&bull; Nhu cầu cần hỗ trợ bước đầu:</strong>
                          <span>${escapeHtmlSafe(orientationRecord?.studentNeedsSupport?.trim() || conclusion || "Cần chú ý đồng hành tâm lý và thích ứng môi trường học tập.")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- MỤC 2: TỔNG HỢP KẾT QUẢ KHẢO SÁT TÂM LÝ -->
                  <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; font-size: 12px; font-weight: 800; color: #003B3A;">
                      2. Tổng hợp kết quả sàng lọc tâm lý (Học sinh có dấu hiệu tâm lý)
                    </div>
                    <div style="padding: 16px; background-color: #ffffff;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 14px;">
                        <tr>
                          <td style="width: 50%; padding: 12px 16px; border-right: 1px solid #e2e8f0; vertical-align: middle;">
                            <span style="font-size: 11px; font-weight: 700; color: #64748b; display: block; margin-bottom: 2px;">Tổng điểm sàng lọc tâm lý:</span>
                            <div style="font-size: 24px; font-weight: 800; color: #003B3A; font-variant-numeric: tabular-nums;">
                              ${computedTotal} <span style="font-size: 13px; font-weight: 600; color: #64748b;">/ 80 điểm</span>
                            </div>
                            <div style="font-size: 11px; color: #00A19A; font-weight: 600; margin-top: 2px;">
                              Thang đo 20 tiêu chí chuyên sâu (Khối ${escapeHtmlSafe(student.grade || "1")})
                            </div>
                          </td>
                          <td style="width: 50%; padding: 12px 16px; vertical-align: middle;">
                            <span style="font-size: 11px; font-weight: 700; color: #64748b; display: block; margin-bottom: 4px;">Mức độ dấu hiệu tâm lý:</span>
                            <span style="display: inline-block; padding: 4px 10px; background-color: ${levelBadgeBg}; color: ${levelBadgeColor}; border: 1px solid ${levelBadgeBorder}; border-radius: 4px; font-size: 11.5px; font-weight: 800;">
                              ${escapeHtmlSafe(levelTitle)}
                            </span>
                            <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4;">
                              ${escapeHtmlSafe(evaluation?.suggestion || "Theo dõi và xây dựng kế hoạch hỗ trợ tâm lý học đường.")}
                            </div>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-bottom: 14px;">
                        <div style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 6px;">Điểm tổng hợp 6 phần thành phần:</div>
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11.5px; border: 1px solid #e2e8f0; border-collapse: collapse;">
                          <thead>
                            <tr style="background-color: #003B3A; color: #ffffff; font-weight: 600; border-bottom: 1px solid #003B3A; text-align: left;">
                              <th style="padding: 7px 10px; width: 52px; text-align: center; color: #ffffff;">Mục</th>
                              <th style="padding: 7px 10px; color: #ccfbf1;">Nội dung thang đo thành phần</th>
                              <th style="padding: 7px 10px; width: 95px; text-align: center; color: #ffffff;">Điểm số</th>
                              <th style="padding: 7px 10px; width: 115px; text-align: center; color: #5eead4;">Mức biểu hiện</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${psychologicalSections
                              .map((sec: any, idx: number) => {
                                const sScore =
                                  Array.isArray(sectionScores) && sectionScores[idx] !== undefined
                                    ? Math.max(0, Number(sectionScores[idx]) || 0)
                                    : 0;
                                const sRate = sec.max > 0 ? sScore / sec.max : 0;
                                const isHigh = sRate > 0.5;
                                const isMed = sRate > 0.25;
                                const statusText = isHigh ? "Biểu hiện rõ" : isMed ? "Cần lưu ý" : "Bình thường";
                                const statusColor = isHigh ? "#e11d48" : isMed ? "#d97706" : "#059669";
                                return `
                                  <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                                    <td style="padding: 6px 10px; text-align: center; font-weight: 700; color: #003B3A;">Mục ${sec.no}</td>
                                    <td style="padding: 6px 10px;"><strong style="color: #0f172a; font-size: 12px;">${escapeHtmlSafe(sec.title)}</strong></td>
                                    <td style="padding: 6px 10px; text-align: center; font-weight: 800; font-size: 12.5px; color: #003B3A; font-variant-numeric: tabular-nums;">
                                      ${sScore} <span style="font-size: 10px; font-weight: normal; color: #64748b;">/ ${sec.max}đ</span>
                                    </td>
                                    <td style="padding: 6px 10px; text-align: center;">
                                      <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 10.5px; color: ${statusColor}; background-color: ${isHigh ? "#fff1f2" : isMed ? "#fffbeb" : "#f0fdf4"}; border: 1px solid ${isHigh ? "#fecdd3" : isMed ? "#fde68a" : "#bbf7d0"};">
                                        ${statusText}
                                      </span>
                                    </td>
                                  </tr>
                                `;
                              })
                              .join("")}
                          </tbody>
                        </table>
                      </div>

                      <div style="margin-top: 12px;">
                        <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-left: 3px solid #00A19A; border-radius: 4px; padding: 10px 12px; margin-bottom: 8px;">
                          <strong style="color: #003B3A; font-size: 11px; display: block; margin-bottom: 3px;">Kết luận sơ bộ của Giáo viên Tâm lý:</strong>
                          <div style="font-size: 12px; color: #134e4a; line-height: 1.5; font-style: italic;">
                            &quot;${escapeHtmlSafe(conclusion || evaluation?.suggestion || "Học sinh có biểu hiện tâm lý cần được theo dõi và đồng hành hỗ trợ thích nghi.")}&quot;
                          </div>
                        </div>
                        <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-left: 3px solid #059669; border-radius: 4px; padding: 10px 12px;">
                          <strong style="color: #065f46; font-size: 11px; display: block; margin-bottom: 3px;">Khuyến nghị dành cho Phụ huynh &amp; Nhà trường:</strong>
                          <div style="font-size: 12px; color: #064e3b; line-height: 1.5;">
                            ${escapeHtmlSafe(recommendation || "Phối hợp chặt chẽ giữa Gia đình, GVCN và Bộ phận Tâm lý học đường trong giai đoạn đầu nhập học.")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- MỤC 3: ĐỀ XUẤT TRÌNH GĐCS -->
                  <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; border-radius: 6px; padding: 12px 14px; margin-bottom: 20px; font-size: 12px;">
                    <div style="font-weight: 800; color: #92400e; font-size: 12px; margin-bottom: 6px;">
                      3. Đề xuất phương án làm việc kính trình Giám đốc Cơ sở chỉ đạo
                    </div>
                    <div style="color: #78350f; line-height: 1.55;">
                      <div style="margin-bottom: 4px;">&bull; <strong>Phương án đề xuất từ GV Tâm lý:</strong> <span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: 800; border: 1px solid #fde68a;">${escapeHtmlSafe(GDCS_PROPOSED_ACTION_LABELS[proposedAction] || "1. GĐCS Gặp trực tiếp PHHS")}</span></div>
                      <div>&bull; <strong>Nội dung báo cáo &amp; đề xuất làm việc:</strong> ${escapeHtmlSafe(messageToGdcs || effectiveTopic)}</div>
                    </div>
                  </div>

                  <!-- MỤC 4: 3 PHƯƠNG ÁN CHỈ ĐẠO CỦA GĐCS -->
                  <div style="margin-bottom: 22px; border: 1px solid #e2e8f0; border-top: 3px solid #003B3A; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
                    <div style="padding: 12px 16px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 800; color: #003B3A;">
                      4. Chỉ đạo phương án làm việc (Dành cho Giám đốc Cơ sở)
                    </div>
                    <div style="padding: 14px 16px; font-size: 12px;">
                      <p style="margin: 0 0 10px 0; color: #334155; line-height: 1.5;">
                        Kính đề nghị Giám Đốc Cơ Sở xem xét báo cáo và <strong>chọn 1 trong 3 phương án chỉ đạo</strong> trên hệ thống SSM (trạng thái sẽ tự động cập nhật vào <strong>Hồ sơ định hướng &mdash; mục Tâm lý</strong> và gửi email điều phối):
                      </p>

                      <div style="margin-bottom: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
                        <div style="font-weight: 800; color: #003B3A; font-size: 12px; margin-bottom: 3px;">
                          1. GĐCS Gặp trực tiếp PHHS:
                        </div>
                        <div style="color: #475569; font-size: 11.5px; line-height: 1.45;">
                          &bull; GĐCS trực tiếp gặp gỡ, trao đổi với Phụ huynh học sinh về kết quả sàng lọc tâm lý.<br/>
                          &bull; Thống nhất lộ trình đồng hành và cam kết phối hợp giữa Gia đình &amp; Nhà trường.
                        </div>
                      </div>

                      <div style="margin-bottom: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
                        <div style="font-weight: 800; color: #003B3A; font-size: 12px; margin-bottom: 3px;">
                          2. Ủy quyền cho NTCM / GV phụ trách:
                        </div>
                        <div style="color: #475569; font-size: 11.5px; line-height: 1.45;">
                          &bull; Chọn NTCM hoặc GV phụ trách từ danh sách GV khảo sát học sinh (GV phỏng vấn định hướng, GV Tâm lý theo phân công) để trao đổi với PHHS &amp; đồng hành cùng học sinh.
                        </div>
                        ${surveyTeacherListHtml}
                      </div>

                      <div style="margin-bottom: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
                        <div style="font-weight: 800; color: #003B3A; font-size: 12px; margin-bottom: 3px;">
                          3. Đặt lịch hẹn với PHHS:
                        </div>
                        <div style="color: #475569; font-size: 11.5px; line-height: 1.45;">
                          &bull; GĐCS chọn thời gian, địa điểm cụ thể để đặt lịch hẹn làm việc với Phụ huynh học sinh.<br/>
                          &bull; Tư vấn cơ sở &amp; Giáo vụ cơ sở nhận thông báo tự động để liên hệ mời PHHS và chuẩn bị hồ sơ.
                        </div>
                      </div>

                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 18px auto 8px auto;">
                        <tr>
                          <td align="center" bgcolor="#003B3A" style="background-color: #003B3A; border-radius: 6px; padding: 0;">
                            <a href="${directOrientationLink}" target="_blank" style="display: inline-block; padding: 13px 24px; background-color: #003B3A; border: 1px solid #003B3A; border-radius: 6px; color: #ffffff !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12.5px; font-weight: 800; text-decoration: none; text-align: center;">
                              <span style="color: #ffffff !important; font-weight: 800;">XÁC NHẬN CHỈ ĐẠO GĐCS TRÊN TRANG XÉT DUYỆT &rarr;</span>
                            </a>
                          </td>
                        </tr>
                      </table>

                      <div style="text-align: center; margin-top: 8px;">
                        <a href="${directPsychFormLink}" target="_blank" style="font-size: 11.5px; color: #00736E; font-weight: 700; text-decoration: underline;">
                          Hoặc mở trực tiếp Phiếu Đánh Giá Tâm Lý Chi Tiết của học sinh &rarr;
                        </a>
                      </div>
                    </div>
                  </div>

                  <p style="margin: 0; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                    Ngay sau khi Giám Đốc Cơ Sở xác nhận chỉ đạo, hệ thống sẽ tự động cập nhật trạng thái vào <strong>Hồ sơ định hướng (mục Tâm lý)</strong> và gửi Email thông báo đến <strong>Tư vấn Cơ sở</strong> (${escapeHtmlSafe(resolvedTuyensinhEmail)}), <strong>Giáo vụ Cơ sở</strong> (${escapeHtmlSafe(resolvedGiaovuEmail)}), <strong>Ban Khảo thí</strong> (ktdbcl@skylineschool.edu.vn), <strong>GV phỏng vấn định hướng</strong> và <strong>GV Tâm lý / NTCM được ủy quyền</strong>.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
                  Email thông báo tự động từ <strong>Phân hệ Khảo sát &amp; Định hướng Học sinh Đầu vào &bull; Sky-Line SSM</strong>.<br/>
                  Ban Khảo thí &amp; Đảm bảo Chất lượng Giáo dục &bull; Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #003B3A; font-weight: 700; text-decoration: none;">ktdbcl@skylineschool.edu.vn</a>
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

/**
 * Đồng bộ việc gán GV Tâm lý từ Phiếu Định Hướng vào bảng phân công khảo sát (InputAssessmentTeacherAssignment)
 * và tạo Thông báo hệ thống (Notification) để GV Tâm lý thấy ngay học sinh trong danh sách Khảo sát: Tâm lý
 */
async function ensurePsychTeacherSurveyAssignment(params: {
  student: any;
  teacherId?: string | null;
  teacherName?: string | null;
  actorName?: string | null;
  reason?: string | null;
  createNotification?: boolean;
}) {
  const { student, teacherId, teacherName, actorName, reason, createNotification = true } = params;
  if (!student?.id || !student?.periodId) return { assignedUserId: teacherId || null, syncedAssignment: false };

  const pAny = prisma as any;
  let targetUserId: string | null = null;
  let resolvedTeacherName = teacherName || "Giáo viên Tâm lý";
  let resolvedEmail = "";

  try {
    if (teacherId) {
      const u = await pAny.user.findUnique({
        where: { id: teacherId },
        include: { teacher: true }
      });
      if (u) {
        targetUserId = u.id;
        resolvedTeacherName = u.fullName || u.name || u.teacher?.teacherName || resolvedTeacherName;
        resolvedEmail = u.teacher?.email || u.email || "";
      } else {
        const t = await pAny.teacher.findUnique({
          where: { id: teacherId },
          include: { user: true }
        });
        if (t) {
          targetUserId = t.userId || null;
          resolvedTeacherName = t.teacherName || t.user?.fullName || resolvedTeacherName;
          resolvedEmail = t.email || t.user?.email || "";
        }
      }
    }

    if (!targetUserId && teacherName) {
      const uByName = await pAny.user.findFirst({
        where: {
          OR: [
            { fullName: teacherName },
            { name: teacherName }
          ]
        },
        include: { teacher: true }
      });
      if (uByName) {
        targetUserId = uByName.id;
        resolvedEmail = uByName.teacher?.email || uByName.email || "";
      }
    }

    if (!targetUserId) {
      return { assignedUserId: teacherId || null, resolvedTeacherName, resolvedEmail, syncedAssignment: false };
    }

    // Tìm môn Tâm lý (TLY)
    const tlySubject = await pAny.inputAssessmentSubject.findFirst({
      where: {
        OR: [
          { code: "TLY" },
          { name: { contains: "Tâm lý" } },
          { name: { contains: "tâm lý" } }
        ]
      }
    });

    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim() || "1";
    const eduSys = student.surveyFormType || student.surveySystem || "HNS";

    let syncedAssignment = false;
    if (tlySubject) {
      const existingAss = await pAny.inputAssessmentTeacherAssignment.findFirst({
        where: {
          periodId: student.periodId,
          batchId: student.batchId || null,
          userId: targetUserId,
          subjectId: tlySubject.id,
          grade: rawGrade
        }
      });

      if (!existingAss) {
        await pAny.inputAssessmentTeacherAssignment.create({
          data: {
            periodId: student.periodId,
            batchId: student.batchId || null,
            userId: targetUserId,
            subjectId: tlySubject.id,
            grade: rawGrade,
            educationSystem: eduSys
          }
        });
      }
      syncedAssignment = true;
    }

    // Tạo thông báo trên chuông hệ thống cho GV Tâm lý được gán
    if (createNotification && targetUserId) {
      const link = `/teacher/input-assessments?periodId=${student.periodId}&batchId=${student.batchId || ""}&studentCode=${encodeURIComponent(student.studentCode || "")}&autoOpen=true`;
      await pAny.notification.create({
        data: {
          userId: targetUserId,
          title: `[Phân công Khảo sát Tâm lý] HS ${student.fullName} (Khối ${rawGrade})`,
          message: `${actorName || "GV Định hướng"} đã gán Thầy/Cô thực hiện khảo sát & đánh giá tâm lý cho học sinh ${student.fullName} (${student.studentCode || ""}).${reason ? ` Lưu ý: ${reason}` : ""}`,
          link,
          type: "TASK",
          category: "ASSESSMENT",
          priority: "HIGH",
          sourceModule: "ORIENTATION_PSYCHOLOGY",
          sourceId: student.id
        }
      });
    }

    return {
      assignedUserId: targetUserId,
      resolvedTeacherName,
      resolvedEmail,
      syncedAssignment
    };
  } catch (err) {
    console.error("ensurePsychTeacherSurveyAssignment error:", err);
    return {
      assignedUserId: targetUserId || teacherId || null,
      resolvedTeacherName,
      resolvedEmail,
      syncedAssignment: false
    };
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await requireStaffSession();
    if (!ctx) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const departmentCodeOrId = searchParams.get("departmentId") || searchParams.get("departmentCode") || "TO_TLHN";
    const action = searchParams.get("action");

    // Lấy danh sách GĐCS
    const gdcsList = await getGdcsCampusList();

    if (action === "getGdcsList") {
      return NextResponse.json({ success: true, gdcsList });
    }

    if (action === "getDepartmentTeachers") {
      const teachers = await getDepartmentTeachers(departmentCodeOrId);
      return NextResponse.json({ success: true, teachers, departmentCode: departmentCodeOrId });
    }

    if (!studentId) {
      return NextResponse.json({ success: true, gdcsList });
    }

    const student = await (prisma as any).inputAssessmentStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        grade: true,
        surveySystem: true,
        surveyFormType: true,
        admissionCampus: true,
        registeredCampus: true,
        periodId: true,
        batchId: true,
        batch: {
          select: {
            id: true,
            name: true,
            campus: {
              select: {
                id: true,
                campusCode: true,
                campusName: true
              }
            }
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh", gdcsList }, { status: 404 });
    }

    const effectiveCampus =
      student.admissionCampus ||
      student.registeredCampus ||
      student.batch?.campus?.campusCode ||
      student.batch?.campus?.campusName ||
      "CS1";

    // 1. Lấy danh sách các Tổ / Bộ phận (ưu tiên đưa Tổ TLHN lên đầu)
    const departments = await getDepartments();

    // 2. Lấy danh sách GV thuộc Tổ được chọn (mặc định Tổ TLHN)
    const tlhnTeachers = await getDepartmentTeachers(departmentCodeOrId);

    // 3. Lấy phân công môn Tâm lý theo đợt khảo sát (nếu có)
    const rawAssigned = await getAssignedPsychologyTeachers(studentId);
    const assignedInPeriod = (rawAssigned || []).map((t: any) => ({
      teacherId: t.userId || t.teacherId || "",
      teacherName: t.fullName || t.teacherName || "GV Tâm lý",
      teacherEmail: t.email || t.teacherEmail || "",
      teacherPhone: t.phone || t.teacherPhone || "",
      assignmentRole: t.isBatchAssigned ? "Đã phân công đúng đợt KS" : "Đã phân công kỳ KS",
      grade: t.grade || "",
      batchId: t.batchId || null,
      isBatchAssigned: Boolean(t.isBatchAssigned),
      subjectName: t.subjectName || "Tâm lý",
      isPeriodAssigned: true
    }));

    // 4. Lấy bộ câu hỏi Tâm lý theo khối
    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
    const currentGrade = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGrade) ? rawGrade : "default";
    const psychQuestions = questionsData[currentGrade] || defaultQuestions;

    // 5. Lấy thông tin bản ghi định hướng hiện tại nếu có
    const orientationRecord = await getStudentOrientationRecord(studentId);

    // Kiểm tra GV Tâm lý đã được gán trên Phiếu Định Hướng (nếu có)
    const recordTeacherId = orientationRecord?.psychologyTeacherId || "";
    const recordTeacherName = orientationRecord?.psychologyTeacherName || "";

    // Hợp nhất danh sách GV: Đưa GV đã gán trên hồ sơ HS và GV phân công đợt lên đầu, kết hợp toàn bộ GV Tổ TLHN
    const combinedMap = new Map<string, any>();

    if (recordTeacherId || recordTeacherName) {
      const matchedFromPeriod = assignedInPeriod.find(
        (ap: any) => (recordTeacherId && ap.teacherId === recordTeacherId) || (recordTeacherName && ap.teacherName === recordTeacherName)
      );
      const matchedFromDept = tlhnTeachers.find(
        (tt: any) => (recordTeacherId && (tt.teacherId === recordTeacherId || tt.realTeacherId === recordTeacherId)) || (recordTeacherName && tt.teacherName === recordTeacherName)
      );
      const key = matchedFromPeriod?.teacherId || matchedFromDept?.teacherId || recordTeacherId || recordTeacherName;
      combinedMap.set(key, {
        teacherId: matchedFromPeriod?.teacherId || matchedFromDept?.teacherId || recordTeacherId,
        teacherName: recordTeacherName || matchedFromPeriod?.teacherName || matchedFromDept?.teacherName || "GV Tâm lý",
        teacherEmail: matchedFromPeriod?.teacherEmail || matchedFromDept?.teacherEmail || "",
        teacherPhone: matchedFromPeriod?.teacherPhone || matchedFromDept?.teacherPhone || "",
        assignmentRole: matchedFromPeriod
          ? "Đã phân công đợt KS & Gán cho HS"
          : "Đã gán trực tiếp từ Phiếu định hướng",
        grade: matchedFromPeriod?.grade || student.grade || "",
        subjectName: "Tâm lý",
        isPeriodAssigned: Boolean(matchedFromPeriod),
        isStudentAssigned: true
      });
    }

    assignedInPeriod.forEach((ap: any) => {
      if (ap.teacherId && !combinedMap.has(ap.teacherId)) {
        combinedMap.set(ap.teacherId, {
          ...ap,
          isStudentAssigned: false
        });
      }
    });

    tlhnTeachers.forEach((tt: any) => {
      if (tt.teacherId && !combinedMap.has(tt.teacherId)) {
        combinedMap.set(tt.teacherId, {
          ...tt,
          isPeriodAssigned: false,
          isStudentAssigned: false
        });
      }
    });

    const assignedTeachers = Array.from(combinedMap.values());

    // Phân loại rõ trường hợp ĐÃ ĐƯỢC PHÂN CÔNG vs CHƯA ĐƯỢC PHÂN CÔNG
    let assignmentSource: "PERIOD_ASSIGNED" | "ORIENTATION_ASSIGNED" | "UNASSIGNED" = "UNASSIGNED";
    let activeAssignedTeacher: any = null;

    if (recordTeacherId || recordTeacherName) {
      const isAlsoInPeriod = assignedInPeriod.some(
        (ap: any) => (recordTeacherId && ap.teacherId === recordTeacherId) || (recordTeacherName && ap.teacherName === recordTeacherName)
      );
      assignmentSource = isAlsoInPeriod ? "PERIOD_ASSIGNED" : "ORIENTATION_ASSIGNED";
      activeAssignedTeacher = assignedTeachers[0] || {
        teacherId: recordTeacherId,
        teacherName: recordTeacherName
      };
    } else if (assignedInPeriod.length > 0) {
      assignmentSource = "PERIOD_ASSIGNED";
      activeAssignedTeacher = assignedInPeriod[0];
    }

    let parsedPsychData: any = null;
    if (orientationRecord?.psychologyData) {
      try {
        parsedPsychData = typeof orientationRecord.psychologyData === "string"
          ? JSON.parse(orientationRecord.psychologyData)
          : orientationRecord.psychologyData;
      } catch (e) {}
    }

    // Fallback: Nếu chưa có psychologyData trên phiếu định hướng nhưng đã có điểm môn TLY trong InputAssessmentScore
    if (!parsedPsychData && orientationRecord?.student?.scores) {
      const tlyScoreRec = orientationRecord.student.scores.find(
        (sc: any) => sc.subject?.code === "TLY" || String(sc.subject?.name || "").toLowerCase().includes("tâm lý")
      );
      if (tlyScoreRec) {
        try {
          const arrScores = JSON.parse(tlyScoreRec.scores || "[]");
          const arrComments = JSON.parse(tlyScoreRec.comments || "[]");
          const raw20 = arrScores.length >= 27 ? arrScores.slice(7, 27).map(Number) : arrScores.slice(0, 20).map(Number);
          const secScores = arrScores.length >= 7 ? arrScores.slice(0, 6).map(Number) : [];
          const tot = arrScores.length >= 7 ? Number(arrScores[6]) : raw20.reduce((s: number, v: number) => s + (Number(v) || 0), 0);
          parsedPsychData = {
            scores: raw20,
            sectionScores: secScores,
            totalScore: tot,
            conclusion: arrComments[0] || "",
            recommendation: arrComments[1] || "",
            notes: arrComments.slice(2, 22)
          };
        } catch (e) {}
      }
    }

    const assignedSurveyTeachers = await getStudentAssignedSurveyTeachers(studentId);
    const campusStaffInfo = await getCampusGiaovuAndTuvanStaff(
      effectiveCampus,
      student.batch?.campus?.id || null
    );

    return NextResponse.json({
      success: true,
      departments,
      selectedDepartmentCode: departmentCodeOrId,
      assignedTeachers,
      assignedSurveyTeachers,
      assignedInPeriodCount: assignedInPeriod.length,
      assignmentSource,
      isAlreadyAssigned: assignmentSource !== "UNASSIGNED",
      activeAssignedTeacher,
      tlhnTeachers,
      psychologyQuestions: psychQuestions,
      gdcsList,
      referralStatus: orientationRecord?.psychologyReferralStatus || (parsedPsychData ? "COMPLETED" : (assignmentSource !== "UNASSIGNED" ? "ASSIGNED" : "NONE")),
      referralReason: orientationRecord?.psychologyReferralReason || "",
      referralTeacherId: activeAssignedTeacher?.teacherId || orientationRecord?.psychologyTeacherId || "",
      referralTeacherName: activeAssignedTeacher?.teacherName || orientationRecord?.psychologyTeacherName || "",
      defaultGiaovuEmail: campusStaffInfo.giaovuEmail,
      defaultTuyensinhEmail: campusStaffInfo.tuyensinhEmail,
      giaovuStaff: campusStaffInfo.giaovuStaff,
      tuvanStaff: campusStaffInfo.tuvanStaff,
      effectiveCampusCode: campusStaffInfo.campusCode,
      campusTeachers: await (prisma as any).teacher.findMany({
        where: {
          OR: [
            { campus: { campusCode: { contains: String(effectiveCampus || "").slice(0, 3) } } },
            { campus: { campusName: { contains: String(effectiveCampus || "") } } }
          ]
        },
        select: { id: true, teacherName: true, email: true, userId: true, position: true },
        orderBy: { teacherName: "asc" },
        take: 100
      }).catch(() => []),
      psychologyData: parsedPsychData,
      data: {
        student,
        departments,
        assignedTeachers,
        assignmentSource,
        isAlreadyAssigned: assignmentSource !== "UNASSIGNED",
        activeAssignedTeacher,
        tlhnTeachers,
        psychQuestions,
        gdcsList,
        giaovuStaff: campusStaffInfo.giaovuStaff,
        tuvanStaff: campusStaffInfo.tuvanStaff,
        defaultGiaovuEmail: campusStaffInfo.giaovuEmail,
        defaultTuyensinhEmail: campusStaffInfo.tuyensinhEmail,
        psychologyData: parsedPsychData,
        currentReferral: {
          status: orientationRecord?.psychologyReferralStatus || (parsedPsychData ? "COMPLETED" : "NONE"),
          reason: orientationRecord?.psychologyReferralReason || "",
          teacherId: activeAssignedTeacher?.teacherId || orientationRecord?.psychologyTeacherId || "",
          teacherName: activeAssignedTeacher?.teacherName || orientationRecord?.psychologyTeacherName || ""
        }
      }
    });
  } catch (error: any) {
    console.error("GET /api/admin/orientation/psychology-referral error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const actorName = (session.user as any)?.fullName || session.user?.name || "Giáo viên Định hướng";

    // NHÁNH A-ASSIGN: KHI GV ĐỊNH HƯỚNG CHỌN GÁN GV TÂM LÝ TRỰC TIẾP TRÊN PHIẾU
    if (body.action === "assignPsychTeacher") {
      const { studentId, teacherId, teacherName, reason } = body;
      if (!studentId || (!teacherId && !teacherName)) {
        return NextResponse.json({ success: false, error: "Vui lòng chọn Giáo viên Tâm lý để gán." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy học sinh." }, { status: 404 });
      }

      const existingRecord = await getStudentOrientationRecord(studentId);
      const syncResult = await ensurePsychTeacherSurveyAssignment({
        student,
        teacherId,
        teacherName,
        actorName,
        reason: reason || existingRecord?.psychologyReferralReason || "Gán từ Phiếu định hướng đầu vào",
        createNotification: true
      });

      const finalStatus =
        existingRecord?.psychologyReferralStatus === "COMPLETED"
          ? "COMPLETED"
          : "REQUESTED";

      const updatedRecord = await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: finalStatus,
        psychologyTeacherId: syncResult.assignedUserId || teacherId || null,
        psychologyTeacherName: syncResult.resolvedTeacherName || teacherName || null,
        psychologyReferralReason:
          reason || existingRecord?.psychologyReferralReason || "Phân công GV Tâm lý khảo sát từ Phiếu định hướng"
      });

      return NextResponse.json({
        success: true,
        message: `Đã gán GV Tâm lý ${syncResult.resolvedTeacherName || teacherName} phụ trách khảo sát & đánh giá tâm lý cho học sinh ${student.fullName}!`,
        data: {
          record: updatedRecord,
          teacherId: syncResult.assignedUserId || teacherId,
          teacherName: syncResult.resolvedTeacherName || teacherName,
          assignmentSource: "ORIENTATION_ASSIGNED",
          syncedSurveyAssignment: syncResult.syncedAssignment
        }
      });
    }

    // NHÁNH A0: LƯU TRỰC TIẾP KẾT QUẢ ĐÁNH GIÁ TÂM LÝ THEO FORM TÂM LÝ
    if (body.action === "savePsychologyAssessment") {
      const {
        studentId,
        teacherId,
        teacherName,
        reason,
        scores = [],
        sectionScores = [],
        totalScore = 0,
        evaluation = {},
        conclusion = "",
        recommendation = "",
        notes = []
      } = body;

      if (!studentId) {
        return NextResponse.json({ success: false, error: "Thiếu studentId." }, { status: 400 });
      }

      const studentForSync = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId }
      });

      const assessorName =
        teacherName ||
        (session.user as any)?.fullName ||
        session.user?.name ||
        "Giáo viên Tâm lý";
      const assessorId = teacherId || (session.user as any)?.id || null;

      // Đồng bộ phân công khảo sát nếu GV Tâm lý được chọn chưa có trong đợt
      let resolvedAssessorId = assessorId;
      let resolvedAssessorName = assessorName;
      if (studentForSync) {
        const syncRes = await ensurePsychTeacherSurveyAssignment({
          student: studentForSync,
          teacherId: assessorId,
          teacherName: assessorName,
          actorName,
          reason: reason || conclusion,
          createNotification: false
        });
        if (syncRes.assignedUserId) resolvedAssessorId = syncRes.assignedUserId;
        if (syncRes.resolvedTeacherName) resolvedAssessorName = syncRes.resolvedTeacherName;
      }

      const nowStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

      const psychDataObj = {
        scores,
        sectionScores,
        totalScore,
        evaluation,
        conclusion,
        recommendation,
        notes,
        assessedBy: resolvedAssessorName,
        assessedById: resolvedAssessorId,
        assessedAt: new Date().toISOString(),
        assessedAtFormatted: nowStr,
        digitalSignature: {
          isSigned: true,
          signedBy: resolvedAssessorName,
          signerId: resolvedAssessorId,
          signerRole: "Giáo viên Tâm lý học đường",
          signedAt: new Date().toISOString(),
          signedAtFormatted: nowStr,
          signatureHash: `SQMS-SIGN-TLY-${studentForSync?.studentCode || studentId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
          status: "VERIFIED",
          stage: "STAGE_4_EVALUATED"
        }
      };

      const updatedRecord = await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: "COMPLETED",
        psychologyTeacherId: resolvedAssessorId,
        psychologyTeacherName: resolvedAssessorName,
        psychologyReferralReason:
          reason || conclusion || evaluation?.suggestion || "Đã hoàn thành đánh giá tâm lý theo Form chuẩn",
        psychologyData: JSON.stringify(psychDataObj)
      });

      // Đồng bộ điểm psychologyScore sang InputAssessmentStudent & InputAssessmentScore (môn TLY)
      try {
        await (prisma as any).inputAssessmentStudent.update({
          where: { id: studentId },
          data: { psychologyScore: Number(totalScore) || 0 }
        });

        const tlySubject = await (prisma as any).inputAssessmentSubject.findFirst({
          where: {
            OR: [
              { code: "TLY" },
              { name: { contains: "Tâm lý" } },
              { name: { contains: "tâm lý" } }
            ]
          }
        });

        if (tlySubject) {
          const finalScoresArr = [...sectionScores, totalScore, ...scores];
          const finalCommentsArr = [conclusion, recommendation, ...notes];
          const existingScore = await (prisma as any).inputAssessmentScore.findFirst({
            where: { studentId, subjectId: tlySubject.id }
          });

          if (existingScore) {
            await (prisma as any).inputAssessmentScore.update({
              where: { id: existingScore.id },
              data: {
                scores: JSON.stringify(finalScoresArr),
                comments: JSON.stringify(finalCommentsArr),
                status: "COMPLETED"
              }
            });
          } else {
            await (prisma as any).inputAssessmentScore.create({
              data: {
                studentId,
                subjectId: tlySubject.id,
                scores: JSON.stringify(finalScoresArr),
                comments: JSON.stringify(finalCommentsArr),
                status: "COMPLETED"
              }
            });
          }
        }
      } catch (syncErr) {
        console.error("Lỗi đồng bộ điểm Tâm lý:", syncErr);
      }

      return NextResponse.json({
        success: true,
        message: "Đã lưu kết quả khảo sát & đánh giá tâm lý thành công!",
        data: {
          record: updatedRecord,
          psychologyData: psychDataObj,
          teacherId: resolvedAssessorId,
          teacherName: resolvedAssessorName
        }
      });
    }

    // NHÁNH A & A-PREVIEW: XEM TRƯỚC HOẶC GỬI BÁO CÁO KẾT QUẢ ĐÁNH GIÁ TÂM LÝ ĐẾN GĐCS (KHI TỔNG HỢP HS CÓ DẤU HIỆU TÂM LÝ)
    if (body.action === "reportToGdcs" || body.action === "previewReportToGdcs") {
      const isPreviewOnly = body.action === "previewReportToGdcs";
      const {
        studentId,
        gdcsName,
        gdcsEmail,
        campusCode,
        giaovuEmail: inputGiaovuEmail,
        tuyensinhEmail: inputTuyensinhEmail,
        tuvanEmail: inputTuvanEmail,
        hasPsychologySigns = false,
        needGdcsDirective = true,
        directiveTopic = "",
        proposedAction = "DIRECT_PARENT_MEETING",
        scores = [],
        sectionScores = [],
        totalScore = 0,
        evaluation = {},
        conclusion = "",
        recommendation = "",
        notes = [],
        messageToGdcs = ""
      } = body;

      if (!studentId || !gdcsEmail) {
        return NextResponse.json({ success: false, error: "Thiếu studentId hoặc email GĐCS tiếp nhận." }, { status: 400 });
      }

      const normalizedScores = Array.isArray(scores)
        ? scores.map((s: any) => {
            const n = Number(s);
            return !isNaN(n) && n >= 0 ? n : 0;
          })
        : [];
      const computedTotal =
        Number(totalScore) >= 0
          ? Number(totalScore)
          : normalizedScores.reduce((acc: number, v: number) => acc + v, 0);

      // Ràng buộc nghiệp vụ: Trường hợp TỔNG HỢP, Học sinh có dấu hiệu Tâm lý (> 15 điểm hoặc xác nhận có dấu hiệu tâm lý) mới gửi mail GĐCS
      if (!hasPsychologicalSignsForGdcs(computedTotal, Boolean(hasPsychologySigns))) {
        return NextResponse.json(
          {
            success: false,
            error: "Trường hợp TỔNG HỢP học sinh ở mức Bình thường (≤ 15 điểm, không có dấu hiệu tâm lý) thì chỉ lưu kết quả, không gửi email báo cáo GĐCS."
          },
          { status: 400 }
        );
      }

      // 1. Tìm thông tin học sinh
      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: {
          period: true,
          batch: {
            include: { campus: true }
          }
        }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const reporterName = (session.user as any)?.fullName || session.user?.name || "Giáo viên Tâm lý";
      const reporterId = (session.user as any)?.id || "";
      let reporterEmail = String(session.user?.email || "").trim();
      if (reporterId && (!reporterEmail.includes("@") || /^\d+@/.test(reporterEmail))) {
        try {
          const uRec = await (prisma as any).user.findUnique({
            where: { id: reporterId },
            include: { teacher: true }
          });
          const cand = uRec?.teacher?.email || uRec?.email || "";
          if (cand && cand.includes("@") && !/^\d+@/.test(cand)) {
            reporterEmail = cand.trim();
          } else {
            reporterEmail = "";
          }
        } catch {}
      }

      const nowStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const effectiveCampus =
        campusCode ||
        student.admissionCampus ||
        student.registeredCampus ||
        student.batch?.campus?.campusCode ||
        student.batch?.campus?.campusName ||
        "CS1";
      const normalizedCampusCode = normalizeCampusCode(effectiveCampus);

      // Lấy đúng danh sách nhân sự Tổ Giáo vụ & Tổ Tư vấn cơ sở theo cơ sở (tuyệt đối không dùng giaovu.csX@...)
      const [campusStaffInfo, existingRecordForPrev, assignedSurveyTeachers] = await Promise.all([
        getCampusGiaovuAndTuvanStaff(effectiveCampus, student.batch?.campus?.id || null),
        getStudentOrientationRecord(studentId),
        getStudentAssignedSurveyTeachers(studentId).catch(() => [])
      ]);

      const cleanInputGiaovu = String(inputGiaovuEmail || "")
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@") && !/^\d+@/.test(e) && !isGenericCampusAliasEmail(e))
        .join(", ");
      const cleanInputTuvan = String(inputTuyensinhEmail || inputTuvanEmail || "")
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@") && !/^\d+@/.test(e) && !isGenericCampusAliasEmail(e))
        .join(", ");

      const resolvedGiaovuEmail = cleanInputGiaovu || campusStaffInfo.giaovuEmail;
      const resolvedTuyensinhEmail = cleanInputTuvan || campusStaffInfo.tuyensinhEmail;
      const giaovuStaffDisplay = campusStaffInfo.giaovuStaff.length > 0
        ? campusStaffInfo.giaovuStaff.map((s) => `${s.fullName} (${s.email})`).join(", ")
        : resolvedGiaovuEmail;
      const tuvanStaffDisplay = campusStaffInfo.tuvanStaff.length > 0
        ? campusStaffInfo.tuvanStaff.map((s) => `${s.fullName} (${s.email})`).join(", ")
        : resolvedTuyensinhEmail;

      let prevPsychData: any = {};
      try {
        if (existingRecordForPrev?.psychologyData) {
          prevPsychData = typeof existingRecordForPrev.psychologyData === "string"
            ? JSON.parse(existingRecordForPrev.psychologyData)
            : existingRecordForPrev.psychologyData;
        }
      } catch (e) {}

      const proposedActionLabels = GDCS_PROPOSED_ACTION_LABELS;

      const effectiveNeedDirective = needGdcsDirective !== false;
      const effectiveTopic =
        directiveTopic ||
        messageToGdcs ||
        conclusion ||
        evaluation?.suggestion ||
        "Học sinh có dấu hiệu tâm lý qua kết quả TỔNG HỢP, kính trình GĐCS chỉ đạo phương án làm việc";

      const ccList = buildPsychologyGdcsCcList({
        campusCodeOrName: effectiveCampus,
        giaovuEmail: resolvedGiaovuEmail,
        tuyensinhEmail: resolvedTuyensinhEmail,
        extraCc: [
          reporterEmail,
          ...campusStaffInfo.giaovuStaff.map((s) => s.email),
          ...campusStaffInfo.tuvanStaff.map((s) => s.email)
        ]
      });

      // Chuẩn bị dữ liệu Email (dùng chung cho cả Xem trước và Gửi thật)
      const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;
      const periodQuery = student.periodId ? `&periodId=${encodeURIComponent(student.periodId)}` : "";
      const directOrientationLink = `${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&studentId=${studentId}${periodQuery}`;
      const directPsychFormLink = `${baseUrl}/teacher/input-assessments?type=general&periodId=${student.periodId || ""}&batchId=${student.batchId || ""}&studentCode=${encodeURIComponent(student.studentCode || "")}&autoOpen=true`;

      const rawGradeStr = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
      const gradeKey = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGradeStr) ? rawGradeStr : "default";
      const gradeSectionsConfig = questionsData[gradeKey] || defaultQuestions;
      const psychologicalSections = gradeSectionsConfig.map((sec: any, idx: number) => ({
        no: idx + 1,
        title: String(sec.title || `Mục ${idx + 1}`).replace(/^[IVX]+\.\s*/, "").replace(/\s*\(\d+\s*mục\)\s*$/i, ""),
        max: (Array.isArray(sec.questions) ? sec.questions.length : 3) * 4
      }));

      const levelTitle = evaluation?.level || (
        computedTotal > 63 ? "Nguy cơ rất cao" :
        computedTotal > 47 ? "Nguy cơ cao" :
        computedTotal > 31 ? "Dấu hiệu vừa" :
        computedTotal > 15 ? "Dấu hiệu nhẹ" : "Có dấu hiệu cần lưu ý"
      );

      const levelBadgeColor = computedTotal > 47 ? "#b91c1c" : computedTotal > 31 ? "#c2410c" : computedTotal > 15 ? "#b45309" : "#047857";
      const levelBadgeBg = computedTotal > 47 ? "#fef2f2" : computedTotal > 31 ? "#fff7ed" : computedTotal > 15 ? "#fffbeb" : "#ecfdf5";
      const levelBadgeBorder = computedTotal > 47 ? "#fecaca" : computedTotal > 31 ? "#ffedd5" : computedTotal > 15 ? "#fde68a" : "#a7f3d0";

      const emailSubject = `[Báo cáo Tâm lý - ${levelTitle}] Trình GĐCS chỉ đạo phương án làm việc - HS ${student.fullName} (Khối ${student.grade || "1"} - ${normalizedCampusCode})`;
      const emailHtml = buildGdcsReportEmailHtml({
        student,
        gdcsName: gdcsName || "Giám đốc Cơ sở",
        gdcsEmail,
        normalizedCampusCode,
        reporterName,
        nowStr,
        giaovuStaffDisplay,
        tuvanStaffDisplay,
        resolvedGiaovuEmail,
        resolvedTuyensinhEmail,
        computedTotal,
        levelTitle,
        levelBadgeBg,
        levelBadgeColor,
        levelBadgeBorder,
        evaluation,
        sectionScores,
        psychologicalSections,
        conclusion,
        recommendation,
        orientationRecord: existingRecordForPrev,
        proposedAction,
        messageToGdcs,
        effectiveTopic,
        directOrientationLink,
        directPsychFormLink,
        assignedSurveyTeachers
      });

      // Nếu chỉ Xem trước Email trước khi gửi: trả về ngay mà KHÔNG ghi DB hay gửi SMTP
      if (isPreviewOnly) {
        return NextResponse.json({
          success: true,
          preview: true,
          subject: emailSubject,
          to: gdcsEmail,
          gdcsName: gdcsName || "Giám đốc Cơ sở",
          campusCode: normalizedCampusCode,
          cc: ccList,
          giaovuEmail: resolvedGiaovuEmail,
          tuyensinhEmail: resolvedTuyensinhEmail,
          giaovuStaff: campusStaffInfo.giaovuStaff,
          tuvanStaff: campusStaffInfo.tuvanStaff,
          assignedSurveyTeachers,
          html: emailHtml
        });
      }

      const psychDataObj = {
        scores: normalizedScores.length > 0 ? normalizedScores : scores,
        sectionScores,
        totalScore: computedTotal,
        evaluation,
        conclusion,
        recommendation,
        notes,
        hasPsychologySigns: true,
        digitalSignature: prevPsychData?.digitalSignature || {
          isSigned: true,
          signedBy: reporterName,
          signerId: reporterId || undefined,
          signerRole: "Giáo viên Tâm lý học đường",
          signedAt: new Date().toISOString(),
          signedAtFormatted: nowStr,
          signatureHash: `SQMS-SIGN-TLY-${student.studentCode || studentId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
          status: "VERIFIED",
          stage: "STAGE_4_EVALUATED"
        },
        reportedToGdcs: {
          gdcsName: gdcsName || "Giám đốc Cơ sở",
          gdcsEmail,
          campusCode: normalizedCampusCode,
          giaovuEmail: resolvedGiaovuEmail,
          tuyensinhEmail: resolvedTuyensinhEmail,
          giaovuStaff: campusStaffInfo.giaovuStaff,
          tuvanStaff: campusStaffInfo.tuvanStaff,
          ccList,
          reportedAt: new Date().toISOString(),
          reportedAtFormatted: nowStr,
          reporterName,
          reporterId,
          reporterEmail,
          proposedAction: proposedAction || "DIRECT_PARENT_MEETING",
          proposedActionLabel: proposedActionLabels[proposedAction] || proposedAction,
          messageToGdcs: messageToGdcs || effectiveTopic
        },
        gdcsDirectiveRequest: effectiveNeedDirective ? {
          requested: true,
          needGdcsDirective: true,
          topic: effectiveTopic,
          directiveTopic: effectiveTopic,
          proposedAction: proposedAction || "DIRECT_PARENT_MEETING",
          proposedActionLabel: proposedActionLabels[proposedAction] || proposedAction,
          requestedAt: new Date().toISOString(),
          requestedAtFormatted: nowStr,
          requesterName: reporterName,
          status: "PENDING"
        } : (prevPsychData?.gdcsDirectiveRequest || null),
        gdcsResponse: prevPsychData?.gdcsResponse || null
      };

      // 2. Cập nhật vào StudentOrientationRecord
      const nextStatus = effectiveNeedDirective ? "REQUESTED_DIRECTIVE" : "COMPLETED";
      await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: nextStatus,
        psychologyTeacherId: reporterId || undefined,
        psychologyTeacherName: reporterName,
        psychologyReferralReason: conclusion || evaluation?.suggestion || "Học sinh có dấu hiệu tâm lý — Chờ GĐCS chỉ đạo phương án làm việc",
        psychologyData: JSON.stringify(psychDataObj)
      });

      // 3. Cập nhật trực tiếp điểm psychologyScore vào InputAssessmentStudent & InputAssessmentScore (môn TLY)
      try {
        await (prisma as any).inputAssessmentStudent.update({
          where: { id: studentId },
          data: { psychologyScore: computedTotal }
        });

        const tlySubject = await (prisma as any).inputAssessmentSubject.findFirst({
          where: {
            OR: [
              { code: "TLY" },
              { name: { contains: "Tâm lý" } },
              { name: { contains: "tâm lý" } }
            ]
          }
        });

        if (tlySubject && Array.isArray(sectionScores) && sectionScores.length > 0) {
          const finalScoresArr = [...sectionScores, computedTotal, ...(normalizedScores.length > 0 ? normalizedScores : scores)];
          const finalCommentsArr = [conclusion, recommendation, ...(Array.isArray(notes) ? notes : [])];
          const existingScore = await (prisma as any).inputAssessmentScore.findFirst({
            where: { studentId, subjectId: tlySubject.id }
          });

          if (existingScore) {
            await (prisma as any).inputAssessmentScore.update({
              where: { id: existingScore.id },
              data: {
                scores: JSON.stringify(finalScoresArr),
                comments: JSON.stringify(finalCommentsArr),
                status: "COMPLETED"
              }
            });
          } else {
            await (prisma as any).inputAssessmentScore.create({
              data: {
                studentId,
                subjectId: tlySubject.id,
                scores: JSON.stringify(finalScoresArr),
                comments: JSON.stringify(finalCommentsArr),
                status: "COMPLETED"
              }
            });
          }
        }
      } catch (errUpd) {}

      // 4. Gửi Email thông báo chuyên nghiệp đến GĐCS (CC Giáo vụ cơ sở, Tư vấn cơ sở, Ban KT&ĐBCL)
      let emailSuccess = false;
      let emailError = "";
      try {
        const sendRes = await sendEmail({
          to: gdcsEmail,
          cc: ccList,
          subject: emailSubject,
          html: emailHtml
        });
        emailSuccess = Boolean(sendRes && sendRes.success !== false);
        if (!emailSuccess) {
          emailError = sendRes?.error || "Không thể gửi email qua máy chủ SMTP";
        }
      } catch (errMail: any) {
        console.error("Lỗi khi gửi email đến GĐCS:", errMail);
        emailError = errMail.message || "Lỗi gửi email";
      }

      // 5. Tạo thông báo chuông hệ thống (In-App Notification) cho GĐCS, Tổ Giáo vụ CS và Tổ Tư vấn CS
      try {
        const gdcsListForNotif = await getGdcsCampusList();
        const matchedGdcs = gdcsListForNotif.find(
          (g) => g.campusCode === normalizedCampusCode || g.managerEmail.toLowerCase() === String(gdcsEmail || "").toLowerCase()
        );
        const notifLink = `/admin/xet-duyet-ket-qua?tab=k12&studentId=${studentId}${student.periodId ? `&periodId=${encodeURIComponent(student.periodId)}` : ""}`;
        const propLabel = proposedActionLabels[proposedAction] || "1. Trao đổi trực tiếp PHHS";

        if (matchedGdcs?.managerUserId) {
          await (prisma as any).notification.create({
            data: {
              userId: matchedGdcs.managerUserId,
              title: `[Trình GĐCS xác nhận] Hồ sơ tâm lý HS ${student.fullName} (${normalizedCampusCode})`,
              message: `GV Tâm lý ${reporterName} báo cáo HS ${student.fullName} (Khối ${student.grade || "1"}) có dấu hiệu tâm lý (${computedTotal}/80đ - ${levelTitle}). Đề xuất: "${propLabel}". Kính trình GĐCS xác nhận nội dung làm việc.`,
              link: notifLink,
              type: "TASK",
              category: "ASSESSMENT",
              priority: "HIGH",
              sourceModule: "ORIENTATION_PSYCHOLOGY",
              sourceId: student.id
            }
          });
        }

        const staffUserIdsToNotify = (campusStaffInfo.allStaffUserIds || []).filter(
          (uid: string) => uid && uid !== reporterId && uid !== matchedGdcs?.managerUserId
        );
        for (const staffUserId of staffUserIdsToNotify) {
          await (prisma as any).notification.create({
            data: {
              userId: staffUserId,
              title: `[Thông tin Giáo vụ & Tư vấn ${normalizedCampusCode}] Báo cáo tâm lý HS ${student.fullName}`,
              message: `GV Tâm lý ${reporterName} đã trình GĐCS ${gdcsName || normalizedCampusCode} hồ sơ tâm lý HS ${student.fullName} (${computedTotal}/80đ - ${levelTitle}) với đề xuất: "${propLabel}".`,
              link: notifLink,
              type: "INFO",
              category: "ASSESSMENT",
              priority: "HIGH",
              sourceModule: "ORIENTATION_PSYCHOLOGY",
              sourceId: student.id
            }
          });
        }
      } catch (notifErr) {
        console.error("Lỗi tạo notification báo cáo GĐCS:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: `Đã lưu kết quả TỔNG HỢP Tâm lý và ${emailSuccess ? `gửi Email báo cáo đến GĐCS ${gdcsName} (CC Tổ Giáo vụ CS: ${resolvedGiaovuEmail}, Tổ Tư vấn CS: ${resolvedTuyensinhEmail})` : 'lưu trữ báo cáo (chưa gửi được email)'}.`,
        emailSuccess,
        emailError: emailError || null,
        ccList,
        giaovuEmail: resolvedGiaovuEmail,
        tuyensinhEmail: resolvedTuyensinhEmail,
        giaovuStaff: campusStaffInfo.giaovuStaff,
        tuvanStaff: campusStaffInfo.tuvanStaff,
        data: psychDataObj
      });
    }

    // NHÁNH A-DIRECTIVE: GĐCS XÁC NHẬN NỘI DUNG LÀM VIỆC LIÊN QUAN & PHẢN HỒI CHỈ ĐẠO
    if (body.action === "respondGdcsDirective") {
      const gdcsCtx = await requireAdminOrLeadershipSession();
      if (!gdcsCtx) {
        return NextResponse.json(
          { success: false, error: "Chỉ Ban Giám đốc Cơ sở (GĐCS), BGH hoặc KT&ĐBCL mới có thẩm quyền xác nhận phương án làm việc tâm lý." },
          { status: 403 }
        );
      }
      const {
        studentId,
        responseType = "DIRECT_PARENT_MEETING", // "DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER"
        meetingTime = "",
        meetingLocation = "",
        parentMeetingContent = "",
        meetingParticipants = "",
        meetingAgenda = "",
        delegatedTeacherId = "",
        delegatedTeacherName = "",
        delegatedTeacherEmail = "",
        delegationDuration = "",
        delegationNote = "",
        generalDirectiveNote = "",
        directorName = "",
        directorEmail = ""
      } = body;

      if (!studentId) {
        return NextResponse.json({ success: false, error: "Thiếu studentId." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: { include: { campus: true } } }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const orientationRecord = await getStudentOrientationRecord(studentId);
      const nowStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const currentDirectorName = directorName || (session.user as any)?.fullName || session.user?.name || "Giám Đốc Cơ Sở";
      const rawDirectorEmail = directorEmail || session.user?.email || "";
      const currentDirectorEmail = rawDirectorEmail.includes("@") && !/^\d+@/.test(rawDirectorEmail) ? rawDirectorEmail : "";

      let currentPsychData: any = {};
      try {
        if (orientationRecord?.psychologyData) {
          currentPsychData = typeof orientationRecord.psychologyData === "string"
            ? JSON.parse(orientationRecord.psychologyData)
            : orientationRecord.psychologyData;
        }
      } catch (e) {}

      const campusCodeNorm = normalizeCampusCode(
        currentPsychData.reportedToGdcs?.campusCode ||
        student.admissionCampus ||
        student.registeredCampus ||
        student.batch?.campus?.campusCode ||
        student.batch?.campus?.campusName ||
        "CS1"
      );

      // Lấy đúng nhân sự Tổ Giáo vụ & Tổ Tư vấn cơ sở theo cơ sở (loại bỏ triệt để giaovu.csX@...)
      const campusStaffInfo = await getCampusGiaovuAndTuvanStaff(
        campusCodeNorm,
        student.batch?.campus?.id || null
      );

      const cleanPrevGiaovu = String(currentPsychData.reportedToGdcs?.giaovuEmail || "")
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@") && !/^\d+@/.test(e) && !isGenericCampusAliasEmail(e))
        .join(", ");
      const cleanPrevTuvan = String(currentPsychData.reportedToGdcs?.tuyensinhEmail || "")
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@") && !/^\d+@/.test(e) && !isGenericCampusAliasEmail(e))
        .join(", ");

      const giaovuEmail = campusStaffInfo.giaovuEmail || cleanPrevGiaovu || getCampusGiaovuEmail(campusCodeNorm);
      const tuyensinhEmail = campusStaffInfo.tuyensinhEmail || cleanPrevTuvan || getCampusTuyensinhEmail(campusCodeNorm);
      const giaovuStaffDisplay = campusStaffInfo.giaovuStaff.length > 0
        ? campusStaffInfo.giaovuStaff.map((s) => `${s.fullName} (${s.email})`).join(", ")
        : giaovuEmail;
      const tuvanStaffDisplay = campusStaffInfo.tuvanStaff.length > 0
        ? campusStaffInfo.tuvanStaff.map((s) => `${s.fullName} (${s.email})`).join(", ")
        : tuyensinhEmail;

      const responseTypeTitles = GDCS_PROPOSED_ACTION_LABELS;
      const chosenTitle = responseTypeTitles[responseType] || responseType;

      // Định dạng thời gian hẹn gặp PHHS sang tiếng Việt dễ đọc
      const formattedMeetingTime = formatMeetingTimeVi(meetingTime);

      // Lấy danh sách GV khảo sát học sinh (GV phỏng vấn định hướng, GV Tâm lý theo phân công...)
      const assignedSurveyTeachers = await getStudentAssignedSurveyTeachers(studentId).catch(() => []);

      // Giải mã email & tên GV được ủy quyền nếu chỉ truyền ID
      let resolvedDelegatedTeacherId = delegatedTeacherId;
      let resolvedDelegatedTeacherName = delegatedTeacherName;
      let resolvedDelegatedTeacherEmail = String(delegatedTeacherEmail || "").trim();
      let resolvedDelegatedTeacherRole = "";

      if (responseType === "DELEGATE_TEACHER") {
        const matchedSurvey = assignedSurveyTeachers.find(
          (t: any) =>
            (delegatedTeacherId && t.teacherId === delegatedTeacherId) ||
            (delegatedTeacherName && t.teacherName?.toLowerCase() === String(delegatedTeacherName).toLowerCase())
        );
        if (matchedSurvey) {
          resolvedDelegatedTeacherId = resolvedDelegatedTeacherId || matchedSurvey.teacherId || "";
          resolvedDelegatedTeacherName = resolvedDelegatedTeacherName || matchedSurvey.teacherName || "";
          if (!resolvedDelegatedTeacherEmail && matchedSurvey.email) {
            resolvedDelegatedTeacherEmail = matchedSurvey.email;
          }
          resolvedDelegatedTeacherRole = matchedSurvey.roleBadge || matchedSurvey.subjectLabel || "";
        }

        if ((!resolvedDelegatedTeacherEmail || !resolvedDelegatedTeacherName) && resolvedDelegatedTeacherId) {
          try {
            const u = await (prisma as any).user.findUnique({
              where: { id: resolvedDelegatedTeacherId },
              include: { teacher: true }
            });
            if (u) {
              if (!resolvedDelegatedTeacherName) resolvedDelegatedTeacherName = u.fullName || u.name || u.teacher?.teacherName || "";
              const em = u.teacher?.email || u.email || "";
              if (!resolvedDelegatedTeacherEmail && em.includes("@") && !/^\d+@/.test(em)) resolvedDelegatedTeacherEmail = em.trim();
            } else {
              const tRec = await (prisma as any).teacher.findUnique({
                where: { id: resolvedDelegatedTeacherId },
                include: { user: true }
              });
              if (tRec) {
                if (!resolvedDelegatedTeacherName) resolvedDelegatedTeacherName = tRec.teacherName || tRec.user?.fullName || "";
                const em = tRec.email || tRec.user?.email || "";
                if (!resolvedDelegatedTeacherEmail && em.includes("@") && !/^\d+@/.test(em)) resolvedDelegatedTeacherEmail = em.trim();
              }
            }
          } catch {}
        }
      }

      // Xác định email của GV phỏng vấn định hướng & GV Tâm lý phân công
      const orientationInterviewerEmails = assignedSurveyTeachers
        .filter((t: any) => t.roleCategory === "ORIENTATION" && t.email)
        .map((t: any) => t.email);
      const orientationInterviewerIds = assignedSurveyTeachers
        .filter((t: any) => t.roleCategory === "ORIENTATION" && t.teacherId)
        .map((t: any) => t.teacherId);
      const psychAssignedEmails = assignedSurveyTeachers
        .filter((t: any) => t.roleCategory === "PSYCHOLOGY" && t.email)
        .map((t: any) => t.email);

      const rawReporterEmail = String(currentPsychData.reportedToGdcs?.reporterEmail || "").trim();
      const reporterEmail = rawReporterEmail.includes("@") && !/^\d+@/.test(rawReporterEmail) ? rawReporterEmail : "";

      const toList = Array.from(
        new Set(
          [
            ...campusStaffInfo.giaovuStaff.map((s) => s.email),
            ...campusStaffInfo.tuvanStaff.map((s) => s.email),
            giaovuEmail,
            tuyensinhEmail,
            "ktdbcl@skylineschool.edu.vn",
            reporterEmail,
            ...psychAssignedEmails,
            ...orientationInterviewerEmails,
            responseType === "DELEGATE_TEACHER" ? resolvedDelegatedTeacherEmail : ""
          ]
            .flatMap((item) => String(item || "").split(/[,;]/))
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e && e.includes("@") && !/^\d+@/.test(e) && !isGenericCampusAliasEmail(e))
        )
      );

      const ccList = Array.from(
        new Set(
          buildPsychologyGdcsCcList({
            campusCodeOrName: campusCodeNorm,
            giaovuEmail,
            tuyensinhEmail,
            extraCc: [currentDirectorEmail]
          }).filter((e) => !toList.includes(e.toLowerCase()))
        )
      );

      const gdcsResponseObj = {
        confirmed: true,
        responseType,
        responseTypeName: chosenTitle,
        respondedAt: new Date().toISOString(),
        respondedAtFormatted: nowStr,
        directorName: currentDirectorName,
        directorEmail: currentDirectorEmail,
        campusCode: campusCodeNorm,
        giaovuEmail,
        tuyensinhEmail,
        giaovuStaff: campusStaffInfo.giaovuStaff,
        tuvanStaff: campusStaffInfo.tuvanStaff,
        notifiedRecipients: toList,
        generalDirectiveNote,
        details: {
          meetingTime: formattedMeetingTime || meetingTime,
          meetingTimeRaw: meetingTime,
          meetingLocation,
          parentMeetingContent,
          meetingParticipants,
          meetingAgenda,
          delegatedTeacherId: resolvedDelegatedTeacherId,
          delegatedTeacherName: resolvedDelegatedTeacherName,
          delegatedTeacherEmail: resolvedDelegatedTeacherEmail,
          delegatedTeacherRole: resolvedDelegatedTeacherRole,
          delegationDuration,
          delegationNote
        }
      };

      currentPsychData.gdcsResponse = gdcsResponseObj;
      if (currentPsychData.reportedToGdcs) {
        currentPsychData.reportedToGdcs.giaovuEmail = giaovuEmail;
        currentPsychData.reportedToGdcs.tuyensinhEmail = tuyensinhEmail;
        currentPsychData.reportedToGdcs.giaovuStaff = campusStaffInfo.giaovuStaff;
        currentPsychData.reportedToGdcs.tuvanStaff = campusStaffInfo.tuvanStaff;
      }
      if (currentPsychData.gdcsDirectiveRequest) {
        currentPsychData.gdcsDirectiveRequest.status = "RESPONDED";
        currentPsychData.gdcsDirectiveRequest.respondedAt = new Date().toISOString();
      }

      // Cập nhật StudentOrientationRecord & đồng bộ vào admissionConsultantNote để Giáo vụ và Tư vấn cơ sở nắm rõ trên mọi màn hình
      let prevConsultantNoteObj: any = {};
      try {
        if (orientationRecord?.admissionConsultantNote && orientationRecord.admissionConsultantNote.trim().startsWith("{")) {
          prevConsultantNoteObj = JSON.parse(orientationRecord.admissionConsultantNote);
        }
      } catch (e) {}

      const legacyNotePayload = JSON.stringify({
        ...prevConsultantNoteObj,
        gdcsDecision: prevConsultantNoteObj.gdcsDecision || "TIEP_NHAN_DONG_HANH",
        gdcsGeneralNote: generalDirectiveNote || prevConsultantNoteObj.gdcsGeneralNote || "",
        gdcsPsychConfirmed: true,
        gdcsPsychResponseType: responseType,
        gdcsPsychResponseTypeName: chosenTitle,
        gdcsPsychRespondedAt: nowStr,
        gdcsPsychDirectorName: currentDirectorName,
        campusCode: campusCodeNorm,
        giaovuEmail,
        tuyensinhEmail,
        giaovuStaff: campusStaffInfo.giaovuStaff,
        tuvanStaff: campusStaffInfo.tuvanStaff,
        directParentMeeting: responseType === "DIRECT_PARENT_MEETING",
        parentMeetingTime: meetingTime,
        parentMeetingLocation: meetingLocation,
        parentMeetingContent,
        scheduleMeeting: responseType === "SCHEDULE_MEETING",
        meetingTime,
        meetingLocation,
        meetingParticipants,
        meetingAgenda,
        delegateTeacher: responseType === "DELEGATE_TEACHER",
        delegatedTeacherId: resolvedDelegatedTeacherId,
        delegatedTeacherName: resolvedDelegatedTeacherName,
        delegatedTeacherEmail: resolvedDelegatedTeacherEmail,
        delegationDuration,
        delegationNote
      });

      await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: "DIRECTED",
        psychologyData: JSON.stringify(currentPsychData),
        admissionConsultantNote: legacyNotePayload
      });

      // Đồng bộ tóm tắt phương án làm việc GĐCS đã xác nhận vào hồ sơ học sinh để bảng Giáo vụ / Tư vấn hiển thị tức thì
      const actionDetailSummary =
        responseType === "DIRECT_PARENT_MEETING"
          ? `${formattedMeetingTime ? `Lịch gặp PHHS: ${formattedMeetingTime}. ` : ""}${meetingLocation ? `Tại: ${meetingLocation}. ` : ""}${parentMeetingContent || generalDirectiveNote || ""}`
          : responseType === "SCHEDULE_MEETING"
          ? `${formattedMeetingTime ? `Lịch hẹn PHHS: ${formattedMeetingTime}. ` : ""}${meetingLocation ? `Tại: ${meetingLocation}. ` : ""}${meetingParticipants ? `TP: ${meetingParticipants}. ` : ""}${meetingAgenda || parentMeetingContent || generalDirectiveNote || ""}`
          : `${resolvedDelegatedTeacherName ? `NTCM/GV phụ trách: ${resolvedDelegatedTeacherName}${resolvedDelegatedTeacherRole ? ` (${resolvedDelegatedTeacherRole})` : ""}. ` : ""}${delegationDuration ? `Thời hạn: ${delegationDuration}. ` : ""}${delegationNote || generalDirectiveNote || ""}`;

      const notifLinkForStaff = `/admin/xet-duyet-ket-qua?tab=k12&studentId=${studentId}${student.periodId ? `&periodId=${encodeURIComponent(student.periodId)}` : ""}`;
      const delegationFeedbackPath = `/teacher/orientation/delegation-feedback?studentId=${student.id}`;

      // Tạo thông báo chuông hệ thống cho Tổ Giáo vụ CS, Tổ Tư vấn CS, GV Tâm lý, GV phỏng vấn định hướng & GV được ủy quyền
      try {
        const notifiedIds = new Set<string>();
        const targetTeacherUserId = orientationRecord?.psychologyTeacherId || currentPsychData.reportedToGdcs?.reporterId;

        if (targetTeacherUserId) {
          notifiedIds.add(targetTeacherUserId);
          await (prisma as any).notification.create({
            data: {
              userId: targetTeacherUserId,
              title: `[Chỉ đạo GĐCS] Hồ sơ tâm lý HS ${student.fullName}`,
              message: `GĐCS ${currentDirectorName} đã chỉ đạo phương án: "${chosenTitle}". ${actionDetailSummary}`.trim(),
              link: `/teacher/input-assessments?periodId=${student.periodId}&batchId=${student.batchId || ""}&studentCode=${encodeURIComponent(student.studentCode)}&autoOpen=true`,
              type: "TASK",
              category: "ASSESSMENT",
              priority: "HIGH",
              sourceModule: "ORIENTATION_PSYCHOLOGY",
              sourceId: student.id
            }
          });
        }

        // Nếu là Ủy quyền, tạo thông báo cho NTCM / Giáo viên được ủy quyền kèm link nhập phản hồi trao đổi PHHS
        if (responseType === "DELEGATE_TEACHER" && resolvedDelegatedTeacherId) {
          const tRec = await (prisma as any).teacher.findFirst({
            where: {
              OR: [{ id: resolvedDelegatedTeacherId }, { userId: resolvedDelegatedTeacherId }]
            },
            include: { user: true }
          });
          const targetUId = tRec?.userId || tRec?.user?.id || resolvedDelegatedTeacherId;
          if (targetUId && !notifiedIds.has(targetUId)) {
            notifiedIds.add(targetUId);
            await (prisma as any).notification.create({
              data: {
                userId: targetUId,
                title: `[Ủy quyền GĐCS] Phụ trách trao đổi PHHS & đồng hành HS ${student.fullName}`,
                message: `GĐCS ${currentDirectorName} đã ủy quyền Thầy/Cô phụ trách trao đổi PHHS & đồng hành hỗ trợ tâm lý cho HS ${student.fullName} (Khối ${student.grade || "1"}). ${actionDetailSummary}`.trim(),
                link: delegationFeedbackPath,
                type: "TASK",
                category: "ASSESSMENT",
                priority: "HIGH",
                sourceModule: "ORIENTATION_PSYCHOLOGY",
                sourceId: student.id
              }
            });
          }
        }

        // Thông báo cho GV phỏng vấn định hướng
        for (const oriUserId of orientationInterviewerIds) {
          if (oriUserId && !notifiedIds.has(oriUserId)) {
            notifiedIds.add(oriUserId);
            await (prisma as any).notification.create({
              data: {
                userId: oriUserId,
                title: `[Chỉ đạo GĐCS] Hồ sơ tâm lý HS ${student.fullName}`,
                message: `GĐCS ${currentDirectorName} đã chỉ đạo phương án "${chosenTitle}" cho HS ${student.fullName} (Khối ${student.grade || "1"}). ${actionDetailSummary}`.trim(),
                link: notifLinkForStaff,
                type: "INFO",
                category: "ASSESSMENT",
                priority: "HIGH",
                sourceModule: "ORIENTATION_PSYCHOLOGY",
                sourceId: student.id
              }
            });
          }
        }

        // Gửi thông báo chuông hệ thống cho toàn bộ nhân sự Tổ Giáo vụ cơ sở & Tổ Tư vấn cơ sở
        for (const staffUserId of campusStaffInfo.allStaffUserIds || []) {
          if (staffUserId && !notifiedIds.has(staffUserId)) {
            notifiedIds.add(staffUserId);
            await (prisma as any).notification.create({
              data: {
                userId: staffUserId,
                title: `[GĐCS ${campusCodeNorm} chỉ đạo] Hồ sơ tâm lý HS ${student.fullName}`,
                message: `GĐCS ${currentDirectorName} đã xác nhận phương án "${chosenTitle}" đối với hồ sơ tâm lý HS ${student.fullName} (Khối ${student.grade || "1"}). ${actionDetailSummary}`.trim(),
                link: notifLinkForStaff,
                type: "TASK",
                category: "ASSESSMENT",
                priority: "HIGH",
                sourceModule: "ORIENTATION_PSYCHOLOGY",
                sourceId: student.id
              }
            });
          }
        }
      } catch (nErr) {
        console.error("Lỗi tạo notification khi GĐCS xác nhận:", nErr);
      }

      // Gửi Email xác nhận chỉ đạo của GĐCS đến Tư vấn cơ sở, Giáo vụ cơ sở, Ban Khảo thí, GV phỏng vấn định hướng & GV Tâm lý / NTCM được ủy quyền
      let emailSuccess = false;
      const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;
      const directApprovalUrl = `${baseUrl}${notifLinkForStaff}`;
      const directFeedbackUrl = `${baseUrl}${delegationFeedbackPath}`;

      try {
        const confirmEmailHtml = `
          <!DOCTYPE html>
          <html lang="vi">
          <head><meta charset="utf-8"><title>[Sky-line SMS] Chỉ đạo của GĐCS về hồ sơ tâm lý - HS ${escapeHtmlSafe(student.fullName)}</title></head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
              <tr>
                <td align="center" style="padding: 24px 12px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <tr>
                      <td height="4" bgcolor="#00A19A" style="background-color: #00A19A; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    <tr>
                      <td bgcolor="#003B3A" style="background-color: #003B3A; color: #ffffff; padding: 22px 26px;">
                        <span style="font-size: 11px; font-weight: 700; color: #a7f3d0;">Hệ thống Giáo dục Sky-Line &bull; Ban Giám đốc Cơ sở (${escapeHtmlSafe(campusCodeNorm)})</span>
                        <h2 style="margin: 6px 0 4px 0; font-size: 18px; font-weight: 800; color: #ffffff;">Xác nhận chỉ đạo phương án làm việc — Hồ sơ Tâm lý</h2>
                        <div style="font-size: 12px; color: #e2e8f0;">Học sinh: <strong style="color:#ffffff;">${escapeHtmlSafe(student.fullName)}</strong> (Mã HS: ${escapeHtmlSafe(student.studentCode || "—")} &bull; Khối ${escapeHtmlSafe(student.grade || "1")})</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 26px; font-size: 11.5px; color: #475569; line-height: 1.55;">
                        <strong>Người chỉ đạo:</strong> GĐCS ${escapeHtmlSafe(currentDirectorName)} &bull; <strong>Thời gian:</strong> ${escapeHtmlSafe(nowStr)}<br/>
                        <strong>Tổ Tư vấn Cơ sở (${escapeHtmlSafe(campusCodeNorm)}):</strong> ${escapeHtmlSafe(tuvanStaffDisplay)}<br/>
                        <strong>Tổ Giáo vụ Cơ sở (${escapeHtmlSafe(campusCodeNorm)}):</strong> ${escapeHtmlSafe(giaovuStaffDisplay)}<br/>
                        <strong>Ban Khảo thí &amp; ĐBCL:</strong> ktdbcl@skylineschool.edu.vn
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 22px 26px; color: #1e293b; font-size: 13px; line-height: 1.6;">
                        <p style="margin: 0 0 12px 0;">Kính gửi <strong>Tư vấn Cơ sở (${escapeHtmlSafe(campusCodeNorm)})</strong>, <strong>Giáo vụ Cơ sở (${escapeHtmlSafe(campusCodeNorm)})</strong>, <strong>Ban Khảo thí</strong> và <strong>Thầy/Cô phụ trách (GV phỏng vấn định hướng / GV Tâm lý / NTCM)</strong>,</p>
                        <p style="margin: 0 0 14px 0;">Giám Đốc Cơ Sở (<strong>${escapeHtmlSafe(currentDirectorName)}</strong>) đã xem xét báo cáo dấu hiệu tâm lý của học sinh <strong>${escapeHtmlSafe(student.fullName)}</strong> và xác nhận chỉ đạo phương án làm việc dưới đây (trạng thái đã tự động cập nhật vào <strong>Hồ sơ định hướng &mdash; mục Tâm lý</strong>):</p>

                        <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-left: 4px solid #00a19a; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
                          <div style="font-size: 11px; font-weight: 800; color: #00736e; margin-bottom: 4px;">Phương án làm việc đã được GĐCS xác nhận:</div>
                          <div style="font-size: 15px; font-weight: 800; color: #003b3a; margin-bottom: 8px;">${escapeHtmlSafe(chosenTitle)}</div>
                          ${responseType === "DIRECT_PARENT_MEETING" ? `
                            <div style="font-size: 12px; color: #334155; line-height: 1.6;">
                              &bull; <strong>Thời gian gặp PHHS:</strong> ${escapeHtmlSafe(formattedMeetingTime || "Theo lịch hẹn điều phối của Tư vấn & Giáo vụ cơ sở")}<br/>
                              &bull; <strong>Địa điểm làm việc:</strong> ${escapeHtmlSafe(meetingLocation || "Phòng Giám đốc Cơ sở")}<br/>
                              &bull; <strong>Nội dung trao đổi với PHHS:</strong> ${escapeHtmlSafe(parentMeetingContent || generalDirectiveNote || "Trao đổi kế hoạch phối hợp giáo dục & cam kết đồng hành cùng học sinh")}<br/>
                              &bull; <strong>Phối hợp triển khai:</strong> Tư vấn cơ sở liên hệ mời PHHS; Giáo vụ cơ sở chuẩn bị hồ sơ khảo sát &amp; biên bản làm việc.
                            </div>
                          ` : ""}
                          ${responseType === "DELEGATE_TEACHER" ? `
                            <div style="font-size: 12px; color: #334155; line-height: 1.6;">
                              &bull; <strong>NTCM / GV phụ trách được ủy quyền:</strong> <strong>${escapeHtmlSafe(resolvedDelegatedTeacherName || "Giáo viên phụ trách")}</strong>${resolvedDelegatedTeacherRole ? ` — <span style="color:#00736e;">${escapeHtmlSafe(resolvedDelegatedTeacherRole)}</span>` : ""} ${resolvedDelegatedTeacherEmail ? `(${escapeHtmlSafe(resolvedDelegatedTeacherEmail)})` : ""}<br/>
                              &bull; <strong>Thời hạn đồng hành:</strong> ${escapeHtmlSafe(delegationDuration || "4 tuần đầu năm học")}<br/>
                              &bull; <strong>Nhiệm vụ ủy quyền:</strong> ${escapeHtmlSafe(delegationNote || generalDirectiveNote || "Trao đổi với PHHS, theo dõi hành vi, hỗ trợ học sinh thích nghi và báo cáo định kỳ")}<br/>
                              &bull; <strong>Phối hợp triển khai:</strong> Giáo vụ cơ sở cập nhật phân công; Tư vấn cơ sở cung cấp đầu mối liên hệ PHHS cho giáo viên được ủy quyền.
                            </div>
                          ` : ""}
                          ${responseType === "SCHEDULE_MEETING" ? `
                            <div style="font-size: 12px; color: #334155; line-height: 1.6;">
                              &bull; <strong>Thời gian đặt lịch hẹn với PHHS:</strong> <strong style="color:#003B3A;">${escapeHtmlSafe(formattedMeetingTime || "Theo lịch điều phối của Tư vấn & Giáo vụ cơ sở")}</strong><br/>
                              &bull; <strong>Địa điểm hẹn PHHS:</strong> ${escapeHtmlSafe(meetingLocation || "Phòng Tiếp phụ huynh / Phòng Giám đốc Cơ sở")}<br/>
                              &bull; <strong>Thành phần tham dự:</strong> ${escapeHtmlSafe(meetingParticipants || "GĐCS, Tư vấn cơ sở, Giáo vụ cơ sở, GV phỏng vấn định hướng, GV Tâm lý")}<br/>
                              &bull; <strong>Nội dung hẹn làm việc với PHHS:</strong> ${escapeHtmlSafe(meetingAgenda || parentMeetingContent || generalDirectiveNote || "Trao đổi kết quả sàng lọc tâm lý và thống nhất lộ trình hỗ trợ học sinh")}<br/>
                              &bull; <strong>Phối hợp triển khai:</strong> Tư vấn cơ sở xác nhận lịch hẹn với PHHS; Giáo vụ cơ sở chuẩn bị phòng và hồ sơ học sinh.
                            </div>
                          ` : ""}
                        </div>

                        ${generalDirectiveNote ? `
                          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px;">
                            <strong style="font-size: 11px; color: #92400e; display: block; margin-bottom: 4px;">Ý kiến chỉ đạo của GĐCS:</strong>
                            <div style="font-style: italic; color: #78350f;">&quot;${escapeHtmlSafe(generalDirectiveNote)}&quot;</div>
                          </div>
                        ` : ""}

                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 18px auto 12px auto;">
                          <tr>
                            <td align="center" bgcolor="#003B3A" style="background-color: #003B3A; border-radius: 8px; padding: 0;">
                              <a href="${directApprovalUrl}" target="_blank" style="display: inline-block; padding: 12px 22px; background-color: #003B3A; border: 1px solid #003B3A; border-radius: 8px; color: #ffffff !important; font-size: 12.5px; font-weight: 800; text-decoration: none;">
                                <span style="color: #ffffff !important; font-weight: 800;">XEM HỒ SƠ ĐỊNH HƯỚNG TRÊN SSM &rarr;</span>
                              </a>
                            </td>
                            ${responseType === "DELEGATE_TEACHER" ? `
                            <td style="width: 10px;"></td>
                            <td align="center" bgcolor="#008B85" style="background-color: #008B85; border-radius: 8px; padding: 0;">
                              <a href="${directFeedbackUrl}" target="_blank" style="display: inline-block; padding: 12px 20px; background-color: #008B85; border: 1px solid #008B85; border-radius: 8px; color: #ffffff !important; font-size: 12.5px; font-weight: 800; text-decoration: none;">
                                <span style="color: #ffffff !important; font-weight: 800;">CẬP NHẬT KẾT QUẢ TRAO ĐỔI PHHS &rarr;</span>
                              </a>
                            </td>
                            ` : ""}
                          </tr>
                        </table>

                        <p style="margin: 0; font-size: 12px; color: #64748b;">
                          Đề nghị Bộ phận Tư vấn Cơ sở, Giáo vụ Cơ sở, Ban Khảo thí và Thầy/Cô được phân công phối hợp triển khai nội dung chỉ đạo của GĐCS.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #003b3a; color: rgba(255,255,255,0.75); padding: 16px 26px; text-align: center; font-size: 11px;">
                        Hệ thống Giáo dục Sky-Line &bull; Ban KT&amp;ĐBCL<br/>
                        Email gửi tự động từ Hệ thống Quản trị Khảo sát &amp; Định hướng Đầu vào (Sky-Line SSM)
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const targetTo = toList.length > 0 ? toList : [giaovuEmail, tuyensinhEmail, "ktdbcl@skylineschool.edu.vn"].filter(Boolean);
        const sendRes = await sendEmail({
          to: targetTo,
          cc: ccList,
          subject: `[Chỉ đạo GĐCS - ${campusCodeNorm}] Hồ sơ tâm lý HS ${student.fullName} — ${chosenTitle}`,
          html: confirmEmailHtml
        });
        emailSuccess = Boolean(sendRes && sendRes.success !== false);
      } catch (emErr) {
        console.error("Lỗi gửi email xác nhận chỉ đạo GĐCS:", emErr);
      }

      return NextResponse.json({
        success: true,
        message: `GĐCS đã xác nhận phương án "${chosenTitle}", cập nhật vào Hồ sơ định hướng (mục Tâm lý) và gửi Email đến Tư vấn CS, Giáo vụ CS, Ban Khảo thí${responseType === "DELEGATE_TEACHER" && resolvedDelegatedTeacherName ? ` & ${resolvedDelegatedTeacherName}` : " & GV khảo sát"} thành công!`,
        emailSuccess,
        giaovuEmail,
        tuyensinhEmail,
        giaovuStaff: campusStaffInfo.giaovuStaff,
        tuvanStaff: campusStaffInfo.tuvanStaff,
        notifiedRecipients: toList,
        data: gdcsResponseObj
      });
    }

    // NHÁNH C-DELEGATION-EMAIL: GĐCS GỬI EMAIL ỦY QUYỀN CHO GIÁO VIÊN ĐỒNG HÀNH
    if (body.action === "sendDelegationEmail") {
      const {
        studentId,
        teacherId,
        teacherName,
        teacherEmail,
        delegationDuration = "4 tuần đầu năm học",
        delegationNote = "",
        parentRepresentative = "",
        parentPhone = "",
        directorName = "",
        directorEmail = ""
      } = body;

      if (!studentId || (!teacherEmail && !teacherId)) {
        return NextResponse.json({ success: false, error: "Thiếu studentId hoặc thông tin Giáo viên được ủy quyền." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const orientationRecord = await getStudentOrientationRecord(studentId);
      const curDirectorName = directorName || session.user?.name || (session.user as any)?.fullName || "Giám Đốc Cơ Sở";
      const curDirectorEmail = directorEmail || session.user?.email || "";
      const campusCodeNorm = student.admissionCampus || student.registeredCampus || "";
      const campusStaffInfo = await getCampusGiaovuAndTuvanStaff(campusCodeNorm);
      const giaovuEmail = campusStaffInfo.giaovuEmail || getCampusGiaovuEmail(campusCodeNorm);
      const tuyensinhEmail = campusStaffInfo.tuyensinhEmail || getCampusTuyensinhEmail(campusCodeNorm);
      const resolvedParentRep = parentRepresentative || orientationRecord?.parentRepresentativeName || "Phụ huynh học sinh";
      const resolvedParentPhone = parentPhone || orientationRecord?.parentPhone || "Đang cập nhật";

      let resolvedTeacherEmail = teacherEmail;
      let targetUserId = teacherId;
      if (!resolvedTeacherEmail && teacherId) {
        try {
          const u = await (prisma as any).user.findFirst({
            where: { id: teacherId },
            include: { teacher: true }
          });
          if (u) {
            resolvedTeacherEmail = u.teacher?.email || u.email || "";
          }
        } catch (e) {}
      }

      if (!resolvedTeacherEmail) {
        return NextResponse.json({ success: false, error: "Không tìm thấy địa chỉ email của Giáo viên được ủy quyền." }, { status: 400 });
      }

      let currentConsultantNote: any = {};
      try {
        if (orientationRecord?.admissionConsultantNote && orientationRecord.admissionConsultantNote.trim().startsWith("{")) {
          currentConsultantNote = JSON.parse(orientationRecord.admissionConsultantNote);
        }
      } catch (e) {}

      currentConsultantNote.delegateTeacher = true;
      currentConsultantNote.delegatedTeacherId = teacherId || "";
      currentConsultantNote.delegatedTeacherName = teacherName || "";
      currentConsultantNote.delegatedTeacherEmail = resolvedTeacherEmail;
      currentConsultantNote.delegationDuration = delegationDuration;
      currentConsultantNote.delegationNote = delegationNote;
      currentConsultantNote.delegatedAt = new Date().toISOString();
      currentConsultantNote.delegatedBy = curDirectorName;
      currentConsultantNote.giaovuStaff = campusStaffInfo.giaovuStaff;
      currentConsultantNote.tuvanStaff = campusStaffInfo.tuvanStaff;

      await upsertStudentOrientationRecord({
        studentId,
        parentRepresentativeName: resolvedParentRep,
        parentPhone: resolvedParentPhone,
        admissionConsultantNote: JSON.stringify(currentConsultantNote)
      });

      // Tạo thông báo chuông cho Giáo viên & Tổ Giáo vụ / Tư vấn cơ sở
      try {
        const notifiedIds = new Set<string>();
        if (targetUserId) {
          notifiedIds.add(targetUserId);
          await (prisma as any).notification.create({
            data: {
              userId: targetUserId,
              title: `[Ủy quyền GĐCS] Đồng hành & Phối hợp PHHS ${student.fullName}`,
              message: `${curDirectorName} đã ủy quyền Thầy/Cô trực tiếp làm việc, trao đổi với PHHS ${student.fullName} (Khối ${student.grade || '1'}). Nhiệm vụ: "${delegationNote || 'Trao đổi định hướng & phối hợp giáo dục'}"`,
              link: `/teacher/orientation/delegation-feedback?studentId=${student.id}`,
              type: "TASK",
              category: "ASSESSMENT",
              priority: "HIGH",
              sourceModule: "ORIENTATION_DELEGATION",
              sourceId: student.id
            }
          });
        }
        for (const staffUserId of campusStaffInfo.allStaffUserIds || []) {
          if (staffUserId && !notifiedIds.has(staffUserId)) {
            notifiedIds.add(staffUserId);
            await (prisma as any).notification.create({
              data: {
                userId: staffUserId,
                title: `[Ủy quyền GĐCS ${campusStaffInfo.campusCode}] GV ${teacherName || "đồng hành"} phụ trách HS ${student.fullName}`,
                message: `GĐCS ${curDirectorName} đã ủy quyền GV ${teacherName || "chuyên trách"} đồng hành cùng HS ${student.fullName} (Khối ${student.grade || "1"}). Thời hạn: ${delegationDuration}.`,
                link: `/admin/xet-duyet-ket-qua?tab=k12&studentId=${student.id}`,
                type: "INFO",
                category: "ASSESSMENT",
                priority: "HIGH",
                sourceModule: "ORIENTATION_DELEGATION",
                sourceId: student.id
              }
            });
          }
        }
      } catch (nErr) {}

      const baseUrl = process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
      const feedbackUrl = `${baseUrl}/teacher/orientation/delegation-feedback?studentId=${student.id}`;
      const ccList = buildPsychologyGdcsCcList({
        campusCodeOrName: campusCodeNorm,
        giaovuEmail,
        tuyensinhEmail,
        extraCc: [
          curDirectorEmail,
          ...campusStaffInfo.giaovuStaff.map((s) => s.email),
          ...campusStaffInfo.tuvanStaff.map((s) => s.email)
        ]
      });

      const delegationEmailHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>[Sky-line SMS] Thư ủy quyền đồng hành & Phối hợp PHHS - ${student.fullName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08);">
          <tr>
            <td height="5" style="background-color: #00A19A; line-height: 5px; font-size: 5px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; background-color: #003B3A; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #5eead4; margin-bottom: 4px;">
                      HỆ THỐNG GIÁO DỤC SKY-LINE • BAN GIÁM ĐỐC CƠ SỞ
                    </div>
                    <h1 style="margin: 0; font-size: 19px; font-weight: 800; line-height: 1.35; color: #ffffff;">
                      THƯ ỦY QUYỀN ĐỒNG HÀNH & PHỐI HỢP PHỤ HUYNH
                    </h1>
                    <div style="font-size: 12.5px; color: #ccfbf1; margin-top: 6px;">
                      Kính gửi Thầy/Cô: <strong style="color: #ffffff;">${teacherName || "Giáo viên"}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; background-color: #ffffff; color: #1e293b; font-size: 13.5px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0;">
                Kính gửi <strong>Thầy/Cô ${teacherName || "Giáo viên"}</strong>,<br/>
                Ban Giám Đốc Cơ Sở (GĐCS <strong>${curDirectorName}</strong>) trân trọng thông báo quyết định <strong>Ủy quyền Thầy/Cô phụ trách đồng hành và làm việc trực tiếp với Phụ huynh học sinh</strong> đối với trường hợp khảo sát tiếp nhận đầu vào dưới đây:
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                <tr>
                  <td colspan="2" style="padding: 10px 14px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #003B3A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    📋 Thông tin học sinh khảo sát đầu vào
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #64748b; width: 38%; border-bottom: 1px dashed #e2e8f0;">Họ và tên học sinh:</td>
                  <td style="padding: 8px 14px; font-size: 13px; font-weight: 700; color: #003B3A; border-bottom: 1px dashed #e2e8f0;">${student.fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #64748b; border-bottom: 1px dashed #e2e8f0;">Mã hồ sơ / Khối:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; font-family: monospace; font-weight: 600; color: #334155; border-bottom: 1px dashed #e2e8f0;">${student.studentCode} • Khối ${student.grade || '1'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #64748b; border-bottom: 1px dashed #e2e8f0;">Cơ sở tiếp nhận:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #003B3A; border-bottom: 1px dashed #e2e8f0;">${student.admissionCampus || "Cơ sở Sky-Line"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #64748b;">Hệ đào tạo khảo sát:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #334155;">${student.surveyFormType || student.surveySystem || "Chất lượng cao (CLC)"}</td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border-radius: 10px; border: 1px solid #a7f3d0; margin-bottom: 16px;">
                <tr>
                  <td colspan="2" style="padding: 10px 14px; background-color: #d1fae5; border-bottom: 1px solid #a7f3d0; font-weight: 700; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    📞 Thông tin liên hệ Phụ huynh học sinh (PHHS)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #047857; width: 38%; border-bottom: 1px dashed #a7f3d0;">Người đại diện PHHS:</td>
                  <td style="padding: 8px 14px; font-size: 13px; font-weight: 700; color: #065f46; border-bottom: 1px dashed #a7f3d0;">${resolvedParentRep}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #047857;">Số điện thoại liên hệ:</td>
                  <td style="padding: 8px 14px; font-size: 14px; font-weight: 800; color: #003B3A; font-family: monospace;">${resolvedParentPhone}</td>
                </tr>
              </table>

              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin-bottom: 22px;">
                <div style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 6px;">
                  🎯 Nhiệm vụ ủy quyền từ Ban Giám Đốc Cơ Sở
                </div>
                <div style="font-size: 12.5px; color: #78350f; margin-bottom: 6px;">
                  • <strong>Thời hạn ủy quyền:</strong> ${delegationDuration}
                </div>
                <div style="font-size: 13px; color: #451a03; line-height: 1.5; background-color: #ffffff; padding: 10px 12px; border-radius: 6px; border: 1px solid #fef3c7;">
                  &quot;${delegationNote || "Thầy/Cô chủ động liên hệ PHHS, trao đổi cởi mở về kết quả khảo sát, thống nhất kế hoạch đồng hành và nề nếp thích ứng cho học sinh trong giai đoạn đầu nhập học."}&quot;
                </div>
              </div>

              <!-- BULLETPROOF BUTTON CTA CHO OUTLOOK VÀ MỌI EMAIL CLIENT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 24px auto 14px auto;">
                <tr>
                  <td align="center" bgcolor="#003B3A" style="background-color: #003B3A; border-radius: 8px; padding: 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${feedbackUrl}" style="height:46px;v-text-anchor:middle;width:360px;" arcsize="14%" stroke="f" fillcolor="#003B3A">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:13.5px;font-weight:bold;">
                        MỞ FORM NHẬP KẾT QUẢ TRAO ĐỔI PHHS &rarr;
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${feedbackUrl}" target="_blank" style="mso-hide:all; display: inline-block; padding: 13px 28px; font-size: 13.5px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 8px; background-color: #003B3A; border: 1px solid #003B3A; letter-spacing: 0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      <span style="color: #ffffff !important; font-weight: 700;">MỞ FORM NHẬP KẾT QUẢ TRAO ĐỔI PHHS &rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 11.5px; color: #64748b; text-align: center;">
                Sau khi hoàn tất trao đổi với Phụ huynh, Thầy/Cô vui lòng cập nhật kết quả vào biểu mẫu trên hệ thống để Ban Giám Đốc Cơ Sở và Ban KT&ĐBCL theo dõi tiến độ.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11.5px; color: #64748b;">
              Email thông báo từ <strong>Hệ thống Quản lý Khảo sát & Định hướng Học sinh Đầu vào — Sky-Line SSM</strong><br/>
              Người phê duyệt ủy quyền: <strong>${curDirectorName}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      let emailSuccess = false;
      try {
        const sendRes = await sendEmail({
          to: resolvedTeacherEmail,
          cc: ccList,
          subject: `[Sky-line SMS] Thư ủy quyền đồng hành & Phối hợp PHHS - HS ${student.fullName}`,
          html: delegationEmailHtml
        });
        emailSuccess = Boolean(sendRes && (sendRes as any).success !== false);
      } catch (mErr) {
        console.error("sendDelegationEmail error:", mErr);
      }

      return NextResponse.json({
        success: true,
        message: emailSuccess
          ? `Đã gửi Email ủy quyền thành công đến GV ${teacherName} (${resolvedTeacherEmail})!`
          : `Đã lưu thông tin ủy quyền cho GV ${teacherName}. (Email đang chờ xử lý)`,
        emailSuccess,
        teacherEmail: resolvedTeacherEmail
      });
    }

    // NHÁNH D-MEETING-EMAIL: GĐCS GỬI EMAIL THÔNG BÁO LỊCH LÀM VIỆC / HỘI CHẨN CHO BAN TƯ VẤN & GIÁO VỤ CƠ SỞ
    if (body.action === "sendMeetingScheduleEmail") {
      const {
        studentId,
        meetingTime = "",
        meetingLocation = "",
        meetingParticipants = "",
        meetingAgenda = "",
        directorName = "",
        directorEmail = ""
      } = body;

      if (!studentId || !meetingTime) {
        return NextResponse.json({ success: false, error: "Thiếu studentId hoặc thời gian làm việc." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const orientationRecord = await getStudentOrientationRecord(studentId);
      const curDirectorName = directorName || session.user?.name || (session.user as any)?.fullName || "Giám Đốc Cơ Sở";
      const curDirectorEmail = directorEmail || session.user?.email || "";
      const campusCodeNorm = student.admissionCampus || student.registeredCampus || "";
      const campusStaffInfo = await getCampusGiaovuAndTuvanStaff(campusCodeNorm);
      const giaovuEmail = campusStaffInfo.giaovuEmail || getCampusGiaovuEmail(campusCodeNorm);
      const tuyensinhEmail = campusStaffInfo.tuyensinhEmail || getCampusTuyensinhEmail(campusCodeNorm);

      let currentConsultantNote: any = {};
      try {
        if (orientationRecord?.admissionConsultantNote && orientationRecord.admissionConsultantNote.trim().startsWith("{")) {
          currentConsultantNote = JSON.parse(orientationRecord.admissionConsultantNote);
        }
      } catch (e) {}

      currentConsultantNote.scheduleMeeting = true;
      currentConsultantNote.meetingTime = meetingTime;
      currentConsultantNote.meetingLocation = meetingLocation;
      currentConsultantNote.meetingParticipants = meetingParticipants;
      currentConsultantNote.meetingAgenda = meetingAgenda;
      currentConsultantNote.meetingScheduledAt = new Date().toISOString();
      currentConsultantNote.meetingScheduledBy = curDirectorName;
      currentConsultantNote.giaovuStaff = campusStaffInfo.giaovuStaff;
      currentConsultantNote.tuvanStaff = campusStaffInfo.tuvanStaff;

      await upsertStudentOrientationRecord({
        studentId,
        admissionConsultantNote: JSON.stringify(currentConsultantNote)
      });

      // Tạo thông báo chuông hệ thống cho Tổ Giáo vụ & Tổ Tư vấn cơ sở
      try {
        for (const staffUserId of campusStaffInfo.allStaffUserIds || []) {
          await (prisma as any).notification.create({
            data: {
              userId: staffUserId,
              title: `[Lịch hội chẩn GĐCS ${campusStaffInfo.campusCode}] HS ${student.fullName}`,
              message: `GĐCS ${curDirectorName} thông báo lịch làm việc / hội chẩn chuyên môn đối với HS ${student.fullName} (Khối ${student.grade || "1"}) vào lúc ${meetingTime}${meetingLocation ? ` tại ${meetingLocation}` : ""}.`,
              link: `/admin/xet-duyet-ket-qua?tab=k12&studentId=${student.id}`,
              type: "TASK",
              category: "ASSESSMENT",
              priority: "HIGH",
              sourceModule: "ORIENTATION_MEETING",
              sourceId: student.id
            }
          });
        }
      } catch (nErr) {}

      const baseUrl = process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
      const studentUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&studentId=${student.id}`;
      const toRecipients = Array.from(
        new Set(
          [
            ...campusStaffInfo.giaovuStaff.map((s) => s.email),
            ...campusStaffInfo.tuvanStaff.map((s) => s.email),
            tuyensinhEmail,
            giaovuEmail
          ]
            .flatMap((item) => String(item || "").split(/[,;]/))
            .map((e) => e.trim())
            .filter((e) => e && e.includes("@") && !/^\d+@/.test(e) && !isGenericCampusAliasEmail(e))
        )
      );
      const ccList = Array.from(new Set(["ktdbcl@skylineschool.edu.vn", curDirectorEmail].filter((e) => e && e.includes("@") && !/^\d+@/.test(e))));

      const meetingEmailHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>[Sky-line SMS] Thông báo lịch làm việc & Hội chẩn chuyên môn - HS ${student.fullName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08);">
          <tr>
            <td height="5" style="background-color: #00A19A; line-height: 5px; font-size: 5px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; background-color: #003B3A; color: #ffffff;">
              <div style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #5eead4; margin-bottom: 4px;">
                HỆ THỐNG GIÁO DỤC SKY-LINE • BAN GIÁM ĐỐC CƠ SỞ
              </div>
              <h1 style="margin: 0; font-size: 19px; font-weight: 800; line-height: 1.35; color: #ffffff;">
                THÔNG BÁO LỊCH LÀM VIỆC / HỘI CHẨN CHUYÊN MÔN
              </h1>
              <div style="font-size: 12.5px; color: #ccfbf1; margin-top: 6px;">
                Kính gửi: <strong>Ban Tư Vấn Tuyển Sinh & Bộ Phận Giáo Vụ Cơ Sở</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; background-color: #ffffff; color: #1e293b; font-size: 13.5px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0;">
                Kính gửi <strong>Ban Tư Vấn Tuyển Sinh & Bộ Phận Giáo Vụ Cơ Sở</strong>,<br/>
                Ban Giám Đốc Cơ Sở (GĐCS <strong>${curDirectorName}</strong>) trân trọng thông báo lịch tổ chức buổi <strong>Làm việc & Hội chẩn chuyên môn tiếp nhận</strong> đối với học sinh:
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdfa; border-radius: 10px; border: 1px solid #99f6e4; margin-bottom: 16px;">
                <tr>
                  <td colspan="2" style="padding: 10px 14px; background-color: #ccfbf1; border-bottom: 1px solid #99f6e4; font-weight: 700; color: #0f766e; font-size: 12px; text-transform: uppercase;">
                    📅 Thông tin chi tiết buổi làm việc
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #0f766e; width: 35%; border-bottom: 1px dashed #99f6e4;">Thời gian làm việc:</td>
                  <td style="padding: 8px 14px; font-size: 13.5px; font-weight: 800; color: #003B3A; border-bottom: 1px dashed #99f6e4;">${meetingTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #0f766e; border-bottom: 1px dashed #99f6e4;">Địa điểm:</td>
                  <td style="padding: 8px 14px; font-size: 13px; font-weight: 700; color: #134e4a; border-bottom: 1px dashed #99f6e4;">${meetingLocation || "Phòng Hội đồng Chuyên môn Cơ sở"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #0f766e; border-bottom: 1px dashed #99f6e4;">Thành phần tham gia:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #003B3A; border-bottom: 1px dashed #99f6e4;">${meetingParticipants || "GĐCS, Ban KT&ĐBCL, Ban Tư vấn Tuyển sinh, Giáo vụ cơ sở, GV Tâm lý"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #0f766e;">Nội dung & Mục tiêu:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #1e293b;">${meetingAgenda || "Hội chẩn kết quả khảo sát đầu vào, định hướng tiếp nhận và thỏa thuận kế hoạch đồng hành cùng học sinh."}</td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 22px;">
                <tr>
                  <td colspan="2" style="padding: 10px 14px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #003B3A; font-size: 12px; text-transform: uppercase;">
                    👤 Tóm tắt hồ sơ học sinh
                  </td>
                </tr>
                <tr>
                  <td style="padding: 7px 14px; font-size: 12.5px; color: #64748b; width: 35%; border-bottom: 1px dashed #e2e8f0;">Họ tên / Mã HS:</td>
                  <td style="padding: 7px 14px; font-size: 13px; font-weight: 700; color: #003B3A; border-bottom: 1px dashed #e2e8f0;">${student.fullName} (${student.studentCode})</td>
                </tr>
                <tr>
                  <td style="padding: 7px 14px; font-size: 12.5px; color: #64748b; border-bottom: 1px dashed #e2e8f0;">Khối / Cơ sở:</td>
                  <td style="padding: 7px 14px; font-size: 12.5px; color: #334155; border-bottom: 1px dashed #e2e8f0;">Khối ${student.grade || '1'} • ${student.admissionCampus || "Cơ sở Sky-Line"}</td>
                </tr>
                <tr>
                  <td style="padding: 7px 14px; font-size: 12.5px; color: #64748b;">Đại diện PHHS & SĐT:</td>
                  <td style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: #003B3A;">${orientationRecord?.parentRepresentativeName || "Phụ huynh"} • ${orientationRecord?.parentPhone || "Đang cập nhật"}</td>
                </tr>
              </table>

              <!-- CTA BUTTON CHO OUTLOOK VÀ MỌI EMAIL CLIENT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 24px auto 14px auto;">
                <tr>
                  <td align="center" bgcolor="#003B3A" style="background-color: #003B3A; border-radius: 8px; padding: 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${studentUrl}" style="height:46px;v-text-anchor:middle;width:360px;" arcsize="14%" stroke="f" fillcolor="#003B3A">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:13.5px;font-weight:bold;">
                        XEM PHIẾU ĐỊNH HƯỚNG CỦA HỌC SINH
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${studentUrl}" target="_blank" style="mso-hide:all; display: inline-block; padding: 13px 28px; font-size: 13.5px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 8px; background-color: #003B3A; border: 1px solid #003B3A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      <span style="color: #ffffff !important; font-weight: 700;">XEM PHIẾU ĐỊNH HƯỚNG CỦA HỌC SINH &rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 11.5px; color: #64748b; text-align: center;">
                Kính đề nghị các bộ phận liên quan sắp xếp tham gia đúng giờ để buổi hội chẩn đạt kết quả tốt nhất.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11.5px; color: #64748b;">
              Email thông báo tự động từ <strong>Hệ thống Quản lý Khảo sát & Định hướng — Sky-Line SSM</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      let emailSuccess = false;
      try {
        const sendRes = await sendEmail({
          to: toRecipients,
          cc: ccList,
          subject: `[Sky-line SMS] Thông báo lịch làm việc & Hội chẩn chuyên môn tiếp nhận - HS ${student.fullName}`,
          html: meetingEmailHtml
        });
        emailSuccess = Boolean(sendRes && (sendRes as any).success !== false);
      } catch (mErr) {
        console.error("sendMeetingScheduleEmail error:", mErr);
      }

      return NextResponse.json({
        success: true,
        message: emailSuccess
          ? `Đã gửi Email thông báo lịch làm việc thành công đến Ban Tư vấn & Giáo vụ (${toRecipients.join(", ")})!`
          : `Đã lưu lịch làm việc thành công. (Email đang chờ xử lý)`,
        emailSuccess
      });
    }

    // NHÁNH E-FEEDBACK: GIÁO VIÊN ĐƯỢC ỦY QUYỀN (HOẶC GĐCS) NHẬP KẾT QUẢ TRAO ĐỔI VỚI PHHS
    if (body.action === "saveDelegationFeedback") {
      const {
        studentId,
        feedbackDate = new Date().toISOString(),
        meetingType = "DIRECT",
        parentRepresentative = "",
        parentPhone = "",
        agreementContent = "",
        parentConsentLevel = "HIGH",
        followUpPlan = "",
        additionalNote = "",
        reporterName = ""
      } = body;

      if (!studentId || !agreementContent) {
        return NextResponse.json({ success: false, error: "Thiếu studentId hoặc nội dung cam kết thỏa thuận với PHHS." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const orientationRecord = await getStudentOrientationRecord(studentId);
      const curUserName = reporterName || session.user?.name || (session.user as any)?.fullName || "Giáo viên ủy quyền";

      let currentConsultantNote: any = {};
      try {
        if (orientationRecord?.admissionConsultantNote && orientationRecord.admissionConsultantNote.trim().startsWith("{")) {
          currentConsultantNote = JSON.parse(orientationRecord.admissionConsultantNote);
        }
      } catch (e) {}

      const feedbackObj = {
        feedbackDate,
        meetingType,
        parentRepresentative: parentRepresentative || orientationRecord?.parentRepresentativeName || "",
        parentPhone: parentPhone || orientationRecord?.parentPhone || "",
        agreementContent,
        parentConsentLevel,
        followUpPlan,
        additionalNote,
        updatedAt: new Date().toISOString(),
        updatedBy: curUserName
      };

      currentConsultantNote.delegationFeedback = feedbackObj;

      let currentPsychData: any = {};
      try {
        if (orientationRecord?.psychologyData) {
          currentPsychData = typeof orientationRecord.psychologyData === "string"
            ? JSON.parse(orientationRecord.psychologyData)
            : orientationRecord.psychologyData;
          if (!currentPsychData.gdcsResponse) currentPsychData.gdcsResponse = {};
          currentPsychData.gdcsResponse.delegationFeedback = feedbackObj;
        }
      } catch (e) {}

      await upsertStudentOrientationRecord({
        studentId,
        parentRepresentativeName: feedbackObj.parentRepresentative || undefined,
        parentPhone: feedbackObj.parentPhone || undefined,
        admissionConsultantNote: JSON.stringify(currentConsultantNote),
        psychologyData: Object.keys(currentPsychData).length > 0 ? JSON.stringify(currentPsychData) : undefined
      });

      return NextResponse.json({
        success: true,
        message: "Đã lưu kết quả trao đổi và cam kết với PHHS thành công!",
        data: feedbackObj
      });
    }

    // NHÁNH B: ĐỀ XUẤT KHẢO SÁT TÂM LÝ TỪ HỘI ĐỒNG TUYỂN SINH CHO GV TÂM LÝ
    const { studentId, reason, teacherId, teacherName, notifyEmail = true } = body;

    if (!studentId || !reason) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập lý do/dấu hiệu đề xuất khảo sát tâm lý." }, { status: 400 });
    }

    // 1. Lấy thông tin học sinh & bản ghi định hướng
    const student = await (prisma as any).inputAssessmentStudent.findUnique({
      where: { id: studentId },
      include: {
        period: true,
        batch: true
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh" }, { status: 404 });
    }

    const record = await getStudentOrientationRecord(studentId);

    // Đồng bộ phân công khảo sát môn Tâm lý & thông báo hệ thống cho GV Tâm lý được chọn
    const syncRefResult = await ensurePsychTeacherSurveyAssignment({
      student,
      teacherId,
      teacherName,
      actorName,
      reason,
      createNotification: true
    });

    // 2. Cập nhật trạng thái chuyển tiếp trong StudentOrientationRecord
    const updatedRecord = await upsertStudentOrientationRecord({
      studentId,
      psychologyReferralStatus: "REQUESTED",
      psychologyReferralReason: reason,
      psychologyTeacherId: syncRefResult.assignedUserId || teacherId || null,
      psychologyTeacherName: syncRefResult.resolvedTeacherName || teacherName || null
    });

    // 3. Gửi email thông báo cho GV Tâm lý nếu có
    let emailSent = false;
    let targetTeacherEmail = "";

    if (body.teacherEmail) {
      targetTeacherEmail = String(body.teacherEmail).trim();
    }

    if (!targetTeacherEmail && teacherId) {
      const teacherUser = await (prisma as any).user.findUnique({
        where: { id: teacherId },
        include: { teacher: true }
      });
      if (teacherUser) {
        targetTeacherEmail = (teacherUser?.teacher?.email || teacherUser?.email || "").trim();
      } else {
        const teacherRec = await (prisma as any).teacher.findUnique({
          where: { id: teacherId },
          include: { user: true }
        });
        if (teacherRec) {
          targetTeacherEmail = (teacherRec.email || teacherRec.user?.email || "").trim();
        }
      }
    }

    if (targetTeacherEmail) {
      if (targetTeacherEmail.includes("0201000094") || targetTeacherEmail.includes("thongpn") || teacherName?.includes("Phạm Nguyên Thông")) {
        targetTeacherEmail = "thongpn@skylineschool.edu.vn";
      } else if (!targetTeacherEmail.includes("@")) {
        targetTeacherEmail = `${targetTeacherEmail}@skylineschool.edu.vn`;
      }
    }


    // Lấy bộ câu hỏi Tâm lý theo khối để đưa vào email
    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
    const currentGrade = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGrade) ? rawGrade : "default";
    const psychSections = questionsData[currentGrade] || defaultQuestions;

    const host = req.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;
    const directAssessmentLink = `${baseUrl}/teacher/input-assessments?periodId=${student.periodId}&batchId=${student.batchId || ""}&studentCode=${encodeURIComponent(student.studentCode)}&autoOpen=true`;

    if (notifyEmail && targetTeacherEmail && targetTeacherEmail.includes("@")) {
      const psychSectionsHtml = psychSections.map((sec: any, sIdx: number) => {
        const qListHtml = sec.questions.slice(0, 3).map((q: any) => `<li style="margin-bottom: 4px; color: #475569; font-size: 11.5px;">${q.text}</li>`).join("");
        return `
          <div style="margin-bottom: 10px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 12px; font-weight: 800; color: #4338CA; margin-bottom: 6px;">${sec.title}</div>
            <ul style="margin: 0; padding-left: 18px;">
              ${qListHtml}
            </ul>
          </div>
        `;
      }).join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>[Sky-line SMS] Chuyển tiếp Khảo sát Tâm lý Học sinh: ${student.fullName}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9">
            <tr>
              <td align="center" style="padding: 24px 10px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(67, 56, 202, 0.08); border: 1px solid #E2E8F0;">
                  
                  <!-- HEADER BANNER -->
                  <tr>
                    <td bgcolor="#4338CA" style="padding: 24px 20px; text-align: center; background: linear-gradient(135deg, #312E81 0%, #4338CA 60%, #6366F1 100%);">
                      <span style="display: inline-block; padding: 3px 12px; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 10.5px; font-weight: 700; color: #FFFFFF; text-transform: uppercase;">
                        🧠 PHÂN HỆ TÂM LÝ HỌC ĐƯỜNG • SKY-LINE
                      </span>
                      <h1 style="margin: 8px 0 2px 0; font-size: 19px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
                        THÔNG BÁO CHUYỂN TIẾP KHẢO SÁT TÂM LÝ
                      </h1>
                      <div style="font-size: 12px; color: #E0E7FF; font-weight: 600;">
                        Tiếp nhận hồ sơ học sinh cần hỗ trợ & đánh giá tâm lý chuyên sâu
                      </div>
                    </td>
                  </tr>

                  <!-- BODY -->
                  <tr>
                    <td style="padding: 22px 24px; color: #1E293B;">
                      <p style="margin: 0 0 12px 0; font-size: 14.5px; font-weight: 700; color: #312E81;">
                        Kính gửi Thầy/Cô ${teacherName || "Chuyên viên Tâm lý"},
                      </p>
                      <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569; line-height: 1.6;">
                        Trong quá trình thực hiện <strong>Phiếu định hướng đầu vào</strong>, Giáo viên tiếp nhận nhận thấy học sinh có một số biểu hiện tâm lý cần được chuyên viên tâm lý hỗ trợ và đánh giá chuyên biệt. Dưới đây là thông tin chi tiết:
                      </p>

                      <!-- STUDENT CARD -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #EEF2FF; border-radius: 12px; border: 1px solid #C7D2FE; border-left: 4px solid #4F46E5; padding: 14px 16px; margin-bottom: 18px;">
                        <tr>
                          <td style="padding: 3px 0; width: 35%; font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase;">HỌC SINH:</td>
                          <td style="padding: 3px 0; font-size: 14px; font-weight: 800; color: #1E1B4B;">${student.fullName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase;">MÃ HỌC SINH:</td>
                          <td style="padding: 3px 0; font-size: 12.5px; font-weight: 700; color: #312E81; font-family: monospace;">${student.studentCode}</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase;">KHỐI & HỆ:</td>
                          <td style="padding: 3px 0; font-size: 12.5px; font-weight: 700; color: #4338CA;">Khối ${student.grade || "—"} • ${student.surveySystem || student.surveyFormType || "Tiêu chuẩn"}</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; font-size: 11px; font-weight: 800; color: #DC2626; text-transform: uppercase;">LÝ DO ĐỀ XUẤT:</td>
                          <td style="padding: 3px 0; font-size: 13px; font-weight: 700; color: #B91C1C; line-height: 1.5;">${reason}</td>
                        </tr>
                      </table>

                      <!-- ORIENTATION RESULTS SUMMARY -->
                      <div style="font-size: 12px; font-weight: 800; color: #312E81; text-transform: uppercase; margin-bottom: 8px;">
                        📋 KẾT QUẢ ĐỊNH HƯỚNG ĐẦU VÀO ĐÃ GHI NHẬN
                      </div>
                      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; font-size: 12px; margin-bottom: 18px; line-height: 1.6;">
                        <p style="margin: 0 0 6px 0;"><strong>• Điểm mạnh & Tiềm năng:</strong> ${record?.studentStrengths || "Chưa có ghi nhận"}</p>
                        <p style="margin: 0 0 6px 0;"><strong>• Nhu cầu cần hỗ trợ sớm:</strong> ${record?.studentNeedsSupport || "Chưa có ghi nhận"}</p>
                        <p style="margin: 0 0 6px 0;"><strong>• Nhận xét GV phỏng vấn:</strong> <em>${record?.interviewerGeneralRemark || "Chưa có ghi nhận"}</em></p>
                        <p style="margin: 0 0 6px 0;"><strong>• Nguyện vọng & Kỳ vọng PHHS:</strong> ${record?.parentExpectations || "Chưa có ghi nhận"}</p>
                        <p style="margin: 0 0 6px 0;"><strong>• Thói quen & Tính cách (từ PHHS):</strong> ${record?.parentPersonalityNotes || "Chưa có ghi nhận"}</p>
                        <p style="margin: 0;"><strong>• Đề xuất từ PHHS:</strong> ${record?.parentSpecialRequests || "Chưa có ghi nhận"}</p>
                      </div>

                      <!-- PSYCHOLOGY QUESTION SECTIONS -->
                      <div style="font-size: 12px; font-weight: 800; color: #312E81; text-transform: uppercase; margin-bottom: 8px;">
                        🧠 BỘ CÔNG CỤ ĐÁNH GIÁ TÂM LÝ THEO KHỐI (${student.grade ? `KHỐI ${student.grade}` : "MẪU CHUẨN"})
                      </div>
                      <div style="margin-bottom: 20px;">
                        ${psychSectionsHtml}
                      </div>

                      <!-- CTA BUTTON -->
                      <div style="text-align: center; padding: 10px 0 20px 0;">
                        <a href="${directAssessmentLink}" target="_blank" style="display: inline-block; padding: 13px 28px; background-color: #4F46E5; color: #FFFFFF; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                          TRUY CẬP ĐÁNH GIÁ TÂM LÝ HỌC SINH &rarr;
                        </a>
                      </div>

                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td bgcolor="#312E81" style="padding: 16px 20px; text-align: center; color: rgba(255, 255, 255, 0.7); font-size: 10.5px;">
                      Email gửi tự động từ Phân hệ Định hướng & Tư vấn Tâm lý Học đường Sky-Line.
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const mailRes = await sendEmail({
          to: targetTeacherEmail,
          subject: `[Sky-line SMS] Chuyển tiếp Khảo sát Tâm lý Học sinh: ${student.fullName} (Khối ${student.grade})`,
          html: emailHtml,
          replyTo: "ktdbcl@skylineschool.edu.vn"
        });
        emailSent = !!mailRes?.success;
      } catch (mErr) {
        console.error("Lỗi gửi email cho GV Tâm lý:", mErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã đề xuất chuyển tiếp khảo sát tâm lý thành công!",
      data: {
        record: updatedRecord,
        teacherName: teacherName || null,
        targetEmail: targetTeacherEmail || null,
        emailSent
      }
    });
  } catch (error: any) {
    console.error("POST /api/admin/orientation/psychology-referral error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
