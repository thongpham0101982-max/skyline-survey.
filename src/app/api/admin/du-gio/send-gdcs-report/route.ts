// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleCode = (session.user as any)?.role || "";
    const isAdmin = [
      "ADMIN",
      "ADMINISTRATOR",
      "KT_DBCL",
      "GDCS",
      "GĐCS",
      "GD_CS",
      "GĐ_CS",
      "GIAO_VU_CS",
      "SUPER_ADMIN",
      "BGH"
    ].includes(roleCode);

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true, position: true, departmentAssignments: true }
    }).catch(() => null);

    const isTTCM =
      currentTeacher?.position === "TTCM" ||
      (currentTeacher?.departmentAssignments || []).some(
        (da: any) => da.position === "TTCM"
      );

    if (!isAdmin && !isTTCM) {
      return NextResponse.json(
        { error: "Bạn không có quyền gửi báo cáo tiến độ Giám đốc Cơ sở" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      mode = "single", // "single" | "batch" | "summary"
      gdcs,
      gdcsList,
      overallStats,
      toEmail,
      customCc,
      month = "all",
      notes = ""
    } = body;

    const monthLabel = month === "all" ? "Toàn bộ năm học" : `Tháng ${month.split("-")[1]}/${month.split("-")[0]}`;

    const host = req.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || `${protocol}://${host}`;

    // Helper: Parse CC list
    const parseCc = (rawCc?: string): string[] => {
      if (!rawCc) return [];
      return rawCc
        .split(",")
        .map(e => e.trim())
        .filter(e => e.includes("@"));
    };

    // Helper: Build single GĐCS Email HTML (Sky-Line Brand Standard & Outlook Bulletproof)
    const buildSingleGdcsHtml = (item: any, customNote?: string, appUrl?: string) => {
      const directLink = `${appUrl || baseUrl}/admin/tong-hop-du-gio`;
      const progressColor = item.progressPct >= 100 ? "#059669" : (item.progressPct > 0 ? "#00A19A" : "#DC2626");
      const crossPct = item.totalAttended > 0 ? Math.round(((item.crossCount || 0) / item.totalAttended) * 100) : 0;

      const detailsRows = (item.details || []).map((d: any, idx: number) => {
        const isCross = d.isCross;
        const isSurprise = d.isSurprise;
        const scoreText = d.evalScore !== null && d.evalScore !== undefined ? `${d.evalScore}/20đ` : "—";
        const ratingBadge = d.evalRating 
          ? `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700;background-color:#F0FDF4;color:#166534;border:1px solid #BBF7D0;margin-top:2px;">${d.evalRating}</span>` 
          : `<span style="color:#94A3B8;">—</span>`;
        const originBadge = isCross 
          ? `<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;background-color:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;">Dự chéo CS</span>`
          : `<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;background-color:#F0FDFA;color:#00736E;border:1px solid #99F6E4;">Nội bộ CS</span>`;
        const surpriseBadge = isSurprise
          ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background-color:#FEF3C7;color:#92400E;border:1px solid #FDE68A;margin-top:2px;">⚡ Đột xuất</span>`
          : "";

        const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

        return `
          <tr bgcolor="${rowBg}" style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0; font-size: 12px;">
            <td align="center" style="padding: 10px 6px; color: #64748B; font-weight: 700;">${idx + 1}</td>
            <td style="padding: 10px 8px;">
              <strong style="color: #0F172A;">${d.date || "—"}</strong><br/>
              <span style="color: #64748B; font-size: 11px;">Tiết ${d.period || "—"}</span>
            </td>
            <td style="padding: 10px 8px;">
              <strong style="color: #003B3A;">${d.hostTeacherName || "—"}</strong><br/>
              <span style="color: #64748B; font-size: 11px; font-family: monospace;">${d.hostTeacherCode || ""}</span>
            </td>
            <td style="padding: 10px 8px;">
              <span style="font-weight: 700; color: #1E293B;">${d.subjectName || "—"}</span><br/>
              <span style="color: #64748B; font-size: 11px;">Lớp ${d.className || "—"}</span>
            </td>
            <td align="center" style="padding: 10px 6px; color: #003B3A; font-weight: 700;">
              ${d.campusName || "—"}
            </td>
            <td align="center" style="padding: 10px 6px;">
              ${originBadge} ${surpriseBadge ? `<br/>${surpriseBadge}` : ""}
            </td>
            <td align="center" style="padding: 10px 6px;">
              <strong style="color: #0F172A; font-size: 12px;">${scoreText}</strong><br/>
              ${ratingBadge}
            </td>
            <td align="center" style="padding: 10px 6px;">
              ${d.evalStatus === "FINAL" || d.evalStatus === "COMPLETED" 
                ? '<span style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:10.5px;font-weight:800;background-color:#ECFDF5;color:#047857;border:1px solid #A7F3D0;">✓ Đã nộp</span>' 
                : '<span style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:10.5px;font-weight:800;background-color:#FFFBEB;color:#B45309;border:1px solid #FDE68A;">⏳ Chờ nộp</span>'}
            </td>
          </tr>
        `;
      }).join("");

      return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Báo Cáo Tiến Độ Dự Giờ & Dạy - Giám Đốc Cơ Sở</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span, h1, h2, h3 { font-family: 'Segoe UI', Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Open Sans', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; color: #1E293B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 12px;">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 760px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 10px 28px rgba(0, 59, 58, 0.08);">
          
          <!-- Brand Header Banner (Solid bgcolor for Outlook + Gradient for modern clients) -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #002625 0%, #003B3A 50%, #005E59 100%); padding: 32px 32px 28px 32px; border-bottom: 4px solid #00A19A; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Pill Tag -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
                      <tr>
                        <td bgcolor="#005854" style="background-color: #005854; border: 1px solid rgba(72, 191, 227, 0.45); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 800; color: #48BFE3; letter-spacing: 1.2px; text-transform: uppercase;">
                          🏫 HỆ THỐNG GIÁO DỤC SKY-LINE &bull; BAN ĐIỀU HÀNH CHUYÊN MÔN
                        </td>
                      </tr>
                    </table>

                    <h1 style="margin: 0; font-size: 21px; font-weight: 900; line-height: 1.35; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.3px;">
                      BÁO CÁO TIẾN ĐỘ DỰ GIỜ & DẠY &mdash; GIÁM ĐỐC CƠ SỞ
                    </h1>

                    <div style="font-size: 13px; color: #CCFBF1; margin-top: 8px; font-weight: 500;">
                      Kỳ báo cáo: <strong style="color: #FDE047;">${monthLabel}</strong> &bull; Đơn vị: <strong style="color: #FDE047;">${item.campus || "Cơ sở"}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card Body Content -->
          <tr>
            <td style="padding: 28px 32px; background-color: #FFFFFF;">
              
              <!-- Greeting & Info Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8FAFC" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 5px solid #00A19A; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" align="left">
                          <div style="font-size: 16px; font-weight: 900; color: #003B3A;">
                            Kính gửi: Thầy/Cô ${item.name}
                          </div>
                          <div style="font-size: 12.5px; color: #475569; margin-top: 4px; line-height: 1.4;">
                            Chức vụ: <strong style="color: #005854;">${item.position || "Giám đốc Cơ sở"}</strong> &bull; 
                            Mã NV: <strong style="color: #1E293B; font-family: monospace;">${item.teacherCode || "—"}</strong> &bull; 
                            Cơ sở: <strong style="color: #003B3A;">${item.campus || "—"}</strong>
                          </div>
                        </td>
                        <td valign="middle" align="right" style="padding-left: 12px;">
                          <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 800; text-transform: uppercase; background-color: ${item.progressPct >= 100 ? '#ECFDF5' : '#FFFBEB'}; color: ${item.progressPct >= 100 ? '#047857' : '#B45309'}; border: 1px solid ${item.progressPct >= 100 ? '#A7F3D0' : '#FDE68A'};">
                            ${item.statusLabel || (item.progressPct >= 100 ? "Đạt chỉ tiêu" : "Đang thực hiện")}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Custom Notes / Notice Box -->
              ${customNote ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFBEB" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #F59E0B; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 13px; color: #92400E; line-height: 1.6;">
                    <div style="font-weight: 800; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                      🔔 Ghi chú / Nhắc nhở từ Ban Đào tạo & Khảo thí ĐBCL:
                    </div>
                    ${customNote.replace(/\n/g, '<br/>')}
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- 4 KPI Stat Boxes (Bulletproof Outlook 4-columns) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 26px;">
                <tr>
                  <!-- Card 1: Tiết dự giờ -->
                  <td width="23.5%" valign="top" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border: 1px solid #99F6E4; border-radius: 12px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0D9488;">Tiết đã dự</div>
                    <div style="font-size: 24px; font-weight: 900; color: #003B3A; margin: 4px 0 2px 0;">
                      ${item.totalAttended} <span style="font-size: 12px; font-weight: 600; color: #64748B;">/ ${item.reqObserved} tiết</span>
                    </div>
                    <table role="presentation" width="100%" height="5" cellpadding="0" cellspacing="0" border="0" bgcolor="#E2E8F0" style="background-color: #E2E8F0; border-radius: 3px; overflow: hidden; margin: 6px auto;">
                      <tr>
                        <td width="${Math.min(item.progressPct, 100)}%" bgcolor="${progressColor}" style="background-color: ${progressColor}; font-size: 1px; line-height: 1px;">&nbsp;</td>
                        <td width="${100 - Math.min(item.progressPct, 100)}%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </table>
                    <div style="font-size: 11px; font-weight: 800; color: ${progressColor};">
                      Đạt ${item.progressPct}% chỉ tiêu
                    </div>
                  </td>

                  <td width="2%"></td>

                  <!-- Card 2: Tiết dạy -->
                  <td width="23.5%" valign="top" bgcolor="#F8FAFC" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B;">Tiết đã dạy</div>
                    <div style="font-size: 24px; font-weight: 900; color: #0F172A; margin: 4px 0 2px 0;">
                      ${item.totalTaught || 0} <span style="font-size: 12px; font-weight: 600; color: #64748B;">tiết</span>
                    </div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 10px;">
                      ${item.reqTaught ? `Chỉ tiêu: ${item.reqTaught} tiết` : "Hoàn thành nhiệm vụ"}
                    </div>
                  </td>

                  <td width="2%"></td>

                  <!-- Card 3: Phân bổ dự chéo -->
                  <td width="23.5%" valign="top" bgcolor="#EEF2FF" style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 12px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #4338CA;">Dự chéo cơ sở</div>
                    <div style="font-size: 24px; font-weight: 900; color: #3730A3; margin: 4px 0 2px 0;">
                      ${item.crossCount || 0} <span style="font-size: 12px; font-weight: 600; color: #64748B;">/ ${item.totalAttended} tiết</span>
                    </div>
                    <div style="font-size: 10.5px; font-weight: 700; color: #4338CA; margin-top: 10px;">
                      Nội bộ: ${item.internalCount || 0} &bull; Chéo: ${crossPct}%
                    </div>
                  </td>

                  <td width="2%"></td>

                  <!-- Card 4: Phiếu đánh giá -->
                  <td width="23.5%" valign="top" bgcolor="${item.pendingCount > 0 ? '#FFFBEB' : '#F0FDF4'}" style="background-color: ${item.pendingCount > 0 ? '#FFFBEB' : '#F0FDF4'}; border: 1px solid ${item.pendingCount > 0 ? '#FDE68A' : '#BBF7D0'}; border-radius: 12px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${item.pendingCount > 0 ? '#B45309' : '#15803D'};">Phiếu đánh giá</div>
                    <div style="font-size: 24px; font-weight: 900; color: ${item.pendingCount > 0 ? '#B45309' : '#15803D'}; margin: 4px 0 2px 0;">
                      ${item.evaluatedCount || 0} <span style="font-size: 12px; font-weight: 600; color: #64748B;">đã nộp</span>
                    </div>
                    <div style="font-size: 10.5px; font-weight: 800; color: ${item.pendingCount > 0 ? '#DC2626' : '#15803D'}; margin-top: 10px;">
                      ${item.pendingCount > 0 ? `⚠️ Còn ${item.pendingCount} phiếu chờ` : (item.avgScore ? `ĐTB: ${item.avgScore}/20đ` : "100% hoàn tất")}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Detailed Observation Table -->
              <div style="margin-bottom: 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
                  <tr>
                    <td>
                      <div style="font-size: 13.5px; font-weight: 900; text-transform: uppercase; color: #003B3A; letter-spacing: 0.5px;">
                        📋 BẢNG CHI TIẾT CÁC TIẾT DỰ GIỜ (${(item.details || []).length} TIẾT)
                      </div>
                    </td>
                  </tr>
                </table>

                ${(item.details || []).length === 0 ? `
                  <div style="padding: 28px; text-align: center; background-color: #F8FAFC; border-radius: 12px; border: 1px dashed #CBD5E1; color: #64748B; font-size: 12.5px;">
                    Chưa ghi nhận tiết dự giờ nào của Giám đốc Cơ sở trong kỳ báo cáo này.
                  </div>
                ` : `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border: 1px solid #CBD5E1; border-radius: 10px; overflow: hidden;">
                    <thead>
                      <tr bgcolor="#003B3A" style="background-color: #003B3A; color: #FFFFFF; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                        <th style="padding: 11px 6px; text-align: center; width: 34px; border-bottom: 2px solid #005854;">STT</th>
                        <th style="padding: 11px 8px; text-align: left; width: 85px; border-bottom: 2px solid #005854;">Ngày & Tiết</th>
                        <th style="padding: 11px 8px; text-align: left; border-bottom: 2px solid #005854;">Giáo viên được dự</th>
                        <th style="padding: 11px 8px; text-align: left; border-bottom: 2px solid #005854;">Môn & Lớp</th>
                        <th style="padding: 11px 6px; text-align: center; width: 55px; border-bottom: 2px solid #005854;">Cơ sở</th>
                        <th style="padding: 11px 6px; text-align: center; width: 95px; border-bottom: 2px solid #005854;">Hình thức</th>
                        <th style="padding: 11px 6px; text-align: center; width: 85px; border-bottom: 2px solid #005854;">Điểm / Xếp loại</th>
                        <th style="padding: 11px 6px; text-align: center; width: 80px; border-bottom: 2px solid #005854;">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${detailsRows}
                    </tbody>
                  </table>
                `}
              </div>

              <!-- Regulations / Guidance Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border: 1px solid #99F6E4; border-left: 4px solid #00A19A; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; font-size: 12px; color: #004D47; line-height: 1.6;">
                    <div style="font-weight: 800; text-transform: uppercase; color: #003B3A; letter-spacing: 0.5px; margin-bottom: 6px; font-size: 12.5px;">
                      📋 Quy chế dự giờ cấp Giám đốc Cơ sở:
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top" style="width: 18px; color: #00A19A; font-weight: bold;">✔</td>
                        <td style="padding-bottom: 4px; color: #004D47;">
                          Định mức dự giờ tối thiểu đối với GĐCS là <strong>4 tiết/tháng</strong> (hoặc tương đương 36 tiết/năm học).
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="width: 18px; color: #00A19A; font-weight: bold;">✔</td>
                        <td style="padding-bottom: 4px; color: #004D47;">
                          Khuyến khích kết hợp giữa dự giờ nội bộ tại cơ sở và <strong>dự giờ chéo liên cơ sở</strong> để tăng cường học hỏi, chuẩn hóa chất lượng chuyên môn toàn trường.
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="width: 18px; color: #00A19A; font-weight: bold;">✔</td>
                        <td style="color: #004D47;">
                          Phiếu dự giờ cần được hoàn thiện đánh giá và nộp trên hệ thống trong vòng <strong>48 giờ</strong> sau khi tiết dạy kết thúc.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Button (Truy cập hệ thống) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 20px auto 10px auto;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${directLink}" target="_blank" style="display: inline-block; padding: 13px 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; letter-spacing: 0.5px; text-transform: uppercase;">
                      👉 TRUY CẬP CỔNG DỰ GIỜ SKY-LINE SMS
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Official Brand Footer -->
          <tr>
            <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 22px 32px; font-size: 11px; color: #64748B; text-align: center; line-height: 1.6;">
              <div style="font-weight: 900; color: #003B3A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </div>
              <div style="color: #00736E; font-weight: 700; margin-bottom: 6px;">
                BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
              </div>
              <div style="color: #475569;">
                Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #00A19A; font-weight: 700; text-decoration: none;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" style="color: #00A19A; font-weight: 700; text-decoration: none;" target="_blank">skylineschool.edu.vn</a>
              </div>
              <div style="margin-top: 6px; color: #94A3B8; font-size: 10.5px;">
                Email này được gửi tự động từ <strong>Hệ thống Quản trị Giáo dục Sky-line SMS</strong> phục vụ công tác điều hành chuyên môn.
              </div>
              <div style="margin-top: 4px; font-size: 10px; color: #CBD5E1;">
                &copy; 2026 Sky-Line Education System. All rights reserved.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
      `;
    };

    // Helper: Build Summary Email of All 5 GĐCS to Leadership (Sky-Line Brand Standard & Outlook Bulletproof)
    const buildSummaryHtml = (list: any[], overall: any, customNote?: string, appUrl?: string) => {
      const directLink = `${appUrl || baseUrl}/admin/tong-hop-du-gio`;
      const rows = list.map((g: any, idx: number) => {
        const progressColor = g.progressPct >= 100 ? "#059669" : (g.progressPct > 0 ? "#00A19A" : "#DC2626");
        const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        return `
          <tr bgcolor="${rowBg}" style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0; font-size: 12px;">
            <td align="center" style="padding: 10px 6px; color: #64748B; font-weight: 700;">${idx + 1}</td>
            <td style="padding: 10px 8px;">
              <strong style="color: #003B3A; font-size: 13px;">${g.name}</strong><br/>
              <span style="color: #64748B; font-size: 11px;">Mã NV: <strong>${g.teacherCode || "—"}</strong> &bull; ${g.email || ""}</span>
            </td>
            <td align="center" style="padding: 10px 6px; font-weight: 800; color: #005854;">
              ${g.campus}
            </td>
            <td align="center" style="padding: 10px 6px; font-weight: 700; color: #334155;">
              ${g.reqObserved} tiết
            </td>
            <td align="center" style="padding: 10px 6px;">
              <strong style="font-size: 13px; color: #003B3A;">${g.totalAttended} tiết</strong><br/>
              <span style="font-size: 10.5px; color: #64748B;">NB: ${g.internalCount} | Chéo: ${g.crossCount}</span>
            </td>
            <td align="center" style="padding: 10px 6px;">
              <strong style="color: #059669;">${g.evaluatedCount} tiết</strong><br/>
              <span style="font-size: 10.5px; color: #64748B;">${g.avgScore ? `ĐTB: ${g.avgScore}đ` : "Đạt chuẩn"}</span>
            </td>
            <td align="center" style="padding: 10px 6px;">
              ${g.pendingCount > 0 
                ? `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:800;background-color:#FEF2F2;color:#DC2626;border:1px solid #FECACA;">⚠️ ${g.pendingCount} phiếu</span>`
                : `<span style="color:#059669;font-weight:800;font-size:11.5px;">✓ 0</span>`}
            </td>
            <td align="center" style="padding: 10px 8px; width: 95px;">
              <div style="font-size: 12px; font-weight: 800; color: ${progressColor}; margin-bottom: 3px;">${g.progressPct}%</div>
              <table role="presentation" width="100%" height="5" cellpadding="0" cellspacing="0" border="0" bgcolor="#E2E8F0" style="background-color: #E2E8F0; border-radius: 3px; overflow: hidden; margin: 0 auto;">
                <tr>
                  <td width="${Math.min(g.progressPct, 100)}%" bgcolor="${progressColor}" style="background-color: ${progressColor}; font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td width="${100 - Math.min(g.progressPct, 100)}%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
            <td align="center" style="padding: 10px 6px;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 10.5px; font-weight: 800; background-color: ${g.progressPct >= 100 ? '#ECFDF5' : '#FFFBEB'}; color: ${g.progressPct >= 100 ? '#047857' : '#B45309'}; border: 1px solid ${g.progressPct >= 100 ? '#A7F3D0' : '#FDE68A'};">
                ${g.statusLabel}
              </span>
            </td>
          </tr>
        `;
      }).join("");

      return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Báo Cáo Tổng Hợp Tiến Độ Dự Giờ 5 Giám Đốc Cơ Sở</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span, h1, h2, h3 { font-family: 'Segoe UI', Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Open Sans', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; color: #1E293B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 12px;">
    <tr>
      <td align="center" style="padding: 0;">
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 860px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 10px 28px rgba(0, 59, 58, 0.08);">
          
          <!-- Banner Header -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #002625 0%, #003B3A 50%, #005E59 100%); padding: 32px 32px 28px 32px; border-bottom: 4px solid #00A19A; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Pill Tag -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
                      <tr>
                        <td bgcolor="#005854" style="background-color: #005854; border: 1px solid rgba(72, 191, 227, 0.45); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 800; color: #48BFE3; letter-spacing: 1.2px; text-transform: uppercase;">
                          🏫 HỆ THỐNG GIÁO DỤC SKY-LINE &bull; TRUNG TÂM ĐIỀU HÀNH DỰ GIỜ
                        </td>
                      </tr>
                    </table>

                    <h1 style="margin: 0; font-size: 21px; font-weight: 900; line-height: 1.35; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.3px;">
                      BÁO CÁO TỔNG HỢP TIẾN ĐỘ DỰ GIỜ 5 GIÁM ĐỐC CƠ SỞ (GĐCS)
                    </h1>

                    <div style="font-size: 13px; color: #CCFBF1; margin-top: 8px; font-weight: 500;">
                      Kỳ báo cáo: <strong style="color: #FDE047;">${monthLabel}</strong> &bull; Quy mô: <strong style="color: #FDE047;">5 Cơ sở toàn hệ thống</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px; background-color: #FFFFFF;">
              
              ${customNote ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFBEB" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #F59E0B; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 13px; color: #92400E; line-height: 1.6;">
                    <div style="font-weight: 800; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                      🔔 Ghi chú / Chỉ đạo từ Lãnh đạo:
                    </div>
                    ${customNote.replace(/\n/g, '<br/>')}
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- Summary KPI Boxes -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 26px;">
                <tr>
                  <td width="23.5%" valign="top" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border: 1px solid #99F6E4; border-radius: 12px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0D9488;">Tổng tiết đã dự</div>
                    <div style="font-size: 24px; font-weight: 900; color: #003B3A; margin: 4px 0 2px 0;">
                      ${overall.totalAttended} <span style="font-size: 12px; font-weight: 600; color: #64748B;">/ ${overall.totalTarget} tiết</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 800; color: ${overall.overallProgress >= 100 ? '#059669' : '#D97706'}; margin-top: 6px;">
                      Đạt ${overall.overallProgress}% toàn khối
                    </div>
                  </td>

                  <td width="2%"></td>

                  <td width="23.5%" valign="top" bgcolor="#EEF2FF" style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 12px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #4338CA;">Dự chéo cơ sở</div>
                    <div style="font-size: 24px; font-weight: 900; color: #3730A3; margin: 4px 0 2px 0;">
                      ${overall.totalCross} <span style="font-size: 12px; font-weight: 600; color: #64748B;">/ ${overall.totalAttended} tiết</span>
                    </div>
                    <div style="font-size: 10.5px; font-weight: 700; color: #4338CA; margin-top: 6px;">
                      Tỷ lệ chéo: ${overall.crossRate}%
                    </div>
                  </td>

                  <td width="2%"></td>

                  <td width="23.5%" valign="top" bgcolor="#F0FDF4" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #15803D;">Đã đánh giá</div>
                    <div style="font-size: 24px; font-weight: 900; color: #166534; margin: 4px 0 2px 0;">
                      ${overall.totalEvaluated} <span style="font-size: 12px; font-weight: 600; color: #64748B;">tiết</span>
                    </div>
                    <div style="font-size: 10.5px; font-weight: 800; color: #15803D; margin-top: 6px;">
                      ${overall.avgScore ? `ĐTB: ${overall.avgScore}/20đ` : "Đạt chuẩn"}
                    </div>
                  </td>

                  <td width="2%"></td>

                  <td width="23.5%" valign="top" bgcolor="${overall.totalPending > 0 ? '#FEF2F2' : '#F0FDF4'}" style="background-color: ${overall.totalPending > 0 ? '#FEF2F2' : '#F0FDF4'}; border: 1px solid ${overall.totalPending > 0 ? '#FECACA' : '#BBF7D0'}; border-radius: 12px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${overall.totalPending > 0 ? '#DC2626' : '#15803D'};">Phiếu chờ hoàn tất</div>
                    <div style="font-size: 24px; font-weight: 900; color: ${overall.totalPending > 0 ? '#DC2626' : '#15803D'}; margin: 4px 0 2px 0;">
                      ${overall.totalPending} <span style="font-size: 12px; font-weight: 600; color: #64748B;">phiếu</span>
                    </div>
                    <div style="font-size: 10.5px; font-weight: 800; color: ${overall.totalPending > 0 ? '#DC2626' : '#15803D'}; margin-top: 6px;">
                      ${overall.totalPending > 0 ? "Cần hoàn tất chấm" : "100% hoàn thành"}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Table of 5 GDCS -->
              <div style="margin-bottom: 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
                  <tr>
                    <td>
                      <div style="font-size: 13.5px; font-weight: 900; text-transform: uppercase; color: #003B3A; letter-spacing: 0.5px;">
                        👥 TIẾN ĐỘ CHI TIẾT 5 GIÁM ĐỐC CƠ SỞ
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border: 1px solid #CBD5E1; border-radius: 10px; overflow: hidden;">
                  <thead>
                    <tr bgcolor="#003B3A" style="background-color: #003B3A; color: #FFFFFF; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                      <th style="padding: 11px 6px; text-align: center; width: 34px; border-bottom: 2px solid #005854;">STT</th>
                      <th style="padding: 11px 8px; text-align: left; border-bottom: 2px solid #005854;">Giám đốc Cơ sở</th>
                      <th style="padding: 11px 6px; text-align: center; width: 65px; border-bottom: 2px solid #005854;">Cơ sở</th>
                      <th style="padding: 11px 6px; text-align: center; width: 65px; border-bottom: 2px solid #005854;">Chỉ tiêu</th>
                      <th style="padding: 11px 6px; text-align: center; width: 85px; border-bottom: 2px solid #005854;">Đã tham gia</th>
                      <th style="padding: 11px 6px; text-align: center; width: 85px; border-bottom: 2px solid #005854;">Đã đánh giá</th>
                      <th style="padding: 11px 6px; text-align: center; width: 85px; border-bottom: 2px solid #005854;">Phiếu chưa nộp</th>
                      <th style="padding: 11px 8px; text-align: center; width: 95px; border-bottom: 2px solid #005854;">Tiến độ</th>
                      <th style="padding: 11px 6px; text-align: center; width: 100px; border-bottom: 2px solid #005854;">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                  </tbody>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 20px auto 10px auto;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${directLink}" target="_blank" style="display: inline-block; padding: 13px 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; letter-spacing: 0.5px; text-transform: uppercase;">
                      👉 TRUY CẬP TRUNG TÂM ĐIỀU HÀNH DỰ GIỜ
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 22px 32px; font-size: 11px; color: #64748B; text-align: center; line-height: 1.6;">
              <div style="font-weight: 900; color: #003B3A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </div>
              <div style="color: #00736E; font-weight: 700; margin-bottom: 6px;">
                BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
              </div>
              <div style="color: #475569;">
                Email: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #00A19A; font-weight: 700; text-decoration: none;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" style="color: #00A19A; font-weight: 700; text-decoration: none;" target="_blank">skylineschool.edu.vn</a>
              </div>
              <div style="margin-top: 6px; color: #94A3B8; font-size: 10.5px;">
                Email này được gửi tự động từ <strong>Hệ thống Quản trị Giáo dục Sky-line SMS</strong> phục vụ công tác điều hành chuyên môn.
              </div>
              <div style="margin-top: 4px; font-size: 10px; color: #CBD5E1;">
                &copy; 2026 Sky-Line Education System. All rights reserved.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
      `;
    };

    // MODE 1: SINGLE GĐCS
    if (mode === "single") {
      if (!gdcs) {
        return NextResponse.json({ error: "Thiếu dữ liệu Giám đốc Cơ sở" }, { status: 400 });
      }

      const recipient = toEmail || gdcs.email;
      if (!recipient || !recipient.includes("@")) {
        return NextResponse.json(
          { error: `Giám đốc Cơ sở "${gdcs.name}" chưa có địa chỉ email hợp lệ` },
          { status: 400 }
        );
      }

      const html = buildSingleGdcsHtml(gdcs, notes, baseUrl);
      const subject = `[Sky-line SMS - Dự Giờ] Báo cáo tiến độ dự giờ & dạy - GĐCS ${gdcs.name} (${gdcs.campus}) - ${monthLabel}`;

      const mailRes = await sendEmail({
        to: recipient,
        cc: parseCc(customCc),
        subject,
        html
      });

      if (!mailRes.success) {
        return NextResponse.json(
          { error: mailRes.error || "Gửi email thất bại" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã gửi email báo cáo thành công đến GĐCS ${gdcs.name} (${recipient})`
      });
    }

    // MODE 2: BATCH SEND TO ALL 5 GDCS INDIVIDUALLY
    if (mode === "batch") {
      if (!gdcsList || !Array.isArray(gdcsList) || gdcsList.length === 0) {
        return NextResponse.json({ error: "Danh sách GĐCS trống" }, { status: 400 });
      }

      const results = [];
      const errors = [];

      for (const item of gdcsList) {
        const recipient = item.email;
        if (!recipient || !recipient.includes("@")) {
          errors.push(`${item.name} (${item.campus}): Chưa có email`);
          continue;
        }

        const html = buildSingleGdcsHtml(item, notes, baseUrl);
        const subject = `[Sky-line SMS - Dự Giờ] Báo cáo tiến độ dự giờ & dạy - GĐCS ${item.name} (${item.campus}) - ${monthLabel}`;

        try {
          const res = await sendEmail({
            to: recipient,
            cc: parseCc(customCc),
            subject,
            html
          });

          if (res.success) {
            results.push(`${item.name} (${recipient})`);
          } else {
            errors.push(`${item.name}: ${res.error || "Lỗi gửi mail"}`);
          }
        } catch (err: any) {
          errors.push(`${item.name}: ${err.message || "Lỗi ngoại lệ"}`);
        }
      }

      return NextResponse.json({
        success: results.length > 0,
        sentCount: results.length,
        totalCount: gdcsList.length,
        results,
        errors,
        message: `Đã gửi email thành công cho ${results.length}/${gdcsList.length} Giám đốc Cơ sở.`
      });
    }

    // MODE 3: SUMMARY REPORT TO LEADERSHIP
    if (mode === "summary") {
      if (!toEmail || !toEmail.includes("@")) {
        return NextResponse.json({ error: "Địa chỉ email người nhận báo cáo tổng hợp không hợp lệ" }, { status: 400 });
      }

      const list = gdcsList || [];
      const stats = overallStats || {
        totalAttended: 0,
        totalTarget: 20,
        totalCross: 0,
        crossRate: 0,
        totalEvaluated: 0,
        totalPending: 0,
        overallProgress: 0,
        avgScore: null
      };

      const html = buildSummaryHtml(list, stats, notes, baseUrl);
      const subject = `[Sky-line SMS - Dự Giờ] Báo cáo tổng hợp tiến độ dự giờ 5 Giám đốc Cơ sở - ${monthLabel}`;

      const mailRes = await sendEmail({
        to: toEmail,
        cc: parseCc(customCc),
        subject,
        html
      });

      if (!mailRes.success) {
        return NextResponse.json(
          { error: mailRes.error || "Gửi email tổng hợp thất bại" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã gửi email báo cáo tổng hợp thành công đến ${toEmail}`
      });
    }

    return NextResponse.json({ error: "Chế độ gửi không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in send-gdcs-report route:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
