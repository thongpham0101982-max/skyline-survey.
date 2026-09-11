/**
 * Sky-Line Education System - Standard Email Templates
 * Fully responsive, modern, Outlook & mobile compatible design.
 * Brand Colors: Primary Sky-Line Teal (#008B82), Deep Navy (#003B3A / #004D47), Soft Teal (#E6F4F3 / #F0FDFA), Slate (#1E293B, #475569, #64748B)
 */

export interface EmailDetailRow {
  icon?: string;
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}

export interface EmailNoticeBox {
  type?: "info" | "warning" | "success" | "note";
  title?: string;
  content: string;
}

export interface EmailButton {
  text: string;
  url: string;
  color?: string;
}

export interface SkylineEmailOptions {
  headerBadge?: string;
  headerTitle: string;
  headerSubtitle?: string;
  headerTheme?: "teal" | "emerald" | "amber" | "rose" | "indigo";
  recipientName: string;
  greetingPrefix?: string;
  introMessage: string;
  details?: EmailDetailRow[];
  detailsTitle?: string;
  noticeBox?: EmailNoticeBox;
  extraHtml?: string;
  button?: EmailButton;
  secondaryNote?: string;
}

const THEMES = {
  teal: {
    bg: "#008B82",
    gradientStart: "#004D47",
    gradientEnd: "#008B82",
    accent: "#008B82",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.35)",
    badgeText: "#FFFFFF"
  },
  emerald: {
    bg: "#059669",
    gradientStart: "#064E3B",
    gradientEnd: "#059669",
    accent: "#059669",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.35)",
    badgeText: "#FFFFFF"
  },
  amber: {
    bg: "#D97706",
    gradientStart: "#78350F",
    gradientEnd: "#D97706",
    accent: "#D97706",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.35)",
    badgeText: "#FFFFFF"
  },
  rose: {
    bg: "#E11D48",
    gradientStart: "#881337",
    gradientEnd: "#E11D48",
    accent: "#E11D48",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.35)",
    badgeText: "#FFFFFF"
  },
  indigo: {
    bg: "#4F46E5",
    gradientStart: "#312E81",
    gradientEnd: "#4F46E5",
    accent: "#4F46E5",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.35)",
    badgeText: "#FFFFFF"
  }
};

/**
 * Base Sky-Line Email Layout
 * Renders bulletproof HTML with Outlook fallback support and modern responsive styling.
 */
export function renderSkylineEmail(options: SkylineEmailOptions): string {
  const {
    headerBadge,
    headerTitle,
    headerSubtitle = "Hệ thống Quản lý Dự giờ Chuyên môn Skyline",
    headerTheme = "teal",
    recipientName,
    greetingPrefix = "Kính gửi Thầy/Cô",
    introMessage,
    details = [],
    detailsTitle,
    noticeBox,
    extraHtml,
    button,
    secondaryNote
  } = options;

  const theme = THEMES[headerTheme] || THEMES.teal;
  const currentYear = new Date().getFullYear();

  // Render Details Table Rows
  const detailsHtml = details.length > 0 ? `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      ${detailsTitle ? `<div style="font-size: 13px; font-weight: 800; color: #008B82; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">${detailsTitle}</div>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; line-height: 1.5; border-collapse: collapse;">
        ${details.map((row, idx) => `
          <tr style="${idx < details.length - 1 ? "border-bottom: 1px solid #EEF2F6;" : ""}">
            <td style="padding: 10px 0; color: #64748B; width: 42%; font-weight: 600; vertical-align: top;">
              ${row.icon ? `<span style="margin-right: 6px;">${row.icon}</span>` : ""}${row.label}:
            </td>
            <td style="padding: 10px 0 10px 10px; color: ${row.color || (row.highlight ? "#008B82" : "#0F172A")}; font-weight: ${row.highlight ? "800" : "600"}; vertical-align: top;">
              ${row.value}
            </td>
          </tr>
        `).join("")}
      </table>
    </div>
  ` : "";

  // Render Notice Box
  let noticeHtml = "";
  if (noticeBox) {
    let boxBg = "#F0FDFA";
    let boxBorder = "#008B82";
    let textColor = "#004D47";
    let icon = "💡";

    if (noticeBox.type === "warning") {
      boxBg = "#FFFBEB";
      boxBorder = "#F59E0B";
      textColor = "#92400E";
      icon = "⚠️";
    } else if (noticeBox.type === "success") {
      boxBg = "#F0FDF4";
      boxBorder = "#10B981";
      textColor = "#14532D";
      icon = "✅";
    } else if (noticeBox.type === "note") {
      boxBg = "#F8FAFC";
      boxBorder = "#64748B";
      textColor = "#334155";
      icon = "📌";
    }

    noticeHtml = `
      <div style="background-color: ${boxBg}; border-left: 4px solid ${boxBorder}; border-radius: 8px; padding: 12px 16px; margin: 18px 0;">
        ${noticeBox.title ? `<div style="font-size: 12px; font-weight: 800; color: ${textColor}; text-transform: uppercase; margin-bottom: 4px;">${icon} ${noticeBox.title}</div>` : ""}
        <div style="font-size: 13px; color: ${textColor}; line-height: 1.5; ${!noticeBox.title ? "font-weight: 500;" : ""}">
          ${!noticeBox.title ? `<span style="margin-right: 4px;">${icon}</span>` : ""}${noticeBox.content}
        </div>
      </div>
    `;
  }

  // Render CTA Button (Bulletproof table button)
  const buttonHtml = button ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto 20px auto; border-collapse: separate;">
      <tr>
        <td align="center" bgcolor="${button.color || theme.accent}" style="border-radius: 10px; background-color: ${button.color || theme.accent};">
          <a href="${button.url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px; border: 1px solid ${button.color || theme.accent};">
            ${button.text}
          </a>
        </td>
      </tr>
    </table>
  ` : "";

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; min-width: 100%; padding: 24px 12px;">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- Top Sky-Line Brand Mini Bar -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin-bottom: 12px;">
          <tr>
            <td align="left" style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #008B82;">
              🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
            </td>
            <td align="right" style="font-size: 11px; font-weight: 600; color: #94A3B8;">
              Khảo Thí & ĐBCL
            </td>
          </tr>
        </table>

        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
          
          <!-- Card Header (Outlook-proof solid bgcolor with gradient overlay) -->
          <tr>
            <td bgcolor="${theme.bg}" align="center" style="background-color: ${theme.bg}; background: linear-gradient(135deg, ${theme.gradientStart} 0%, ${theme.gradientEnd} 100%); padding: 30px 24px; text-align: center; border-bottom: 3px solid rgba(255, 255, 255, 0.2);">
              
              ${headerBadge ? `
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 12px auto;">
                  <tr>
                    <td align="center" style="background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.4); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      ${headerBadge}
                    </td>
                  </tr>
                </table>
              ` : ""}

              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px; line-height: 1.35; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${headerTitle}
              </h1>

              ${headerSubtitle ? `
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #E6F4F3; opacity: 0.95; font-weight: 500;">
                  ${headerSubtitle}
                </p>
              ` : ""}
            </td>
          </tr>

          <!-- Card Body Content -->
          <tr>
            <td style="padding: 28px 28px 24px 28px; background-color: #FFFFFF;">
              
              <!-- Recipient Greeting -->
              <p style="font-size: 15px; color: #0F172A; margin: 0 0 12px 0; line-height: 1.5; font-weight: 500;">
                ${greetingPrefix} <strong style="color: #008B82; font-weight: 800;">${recipientName}</strong>,
              </p>

              <!-- Intro Message -->
              <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                ${introMessage}
              </div>

              <!-- Details Grid -->
              ${detailsHtml}

              <!-- Extra HTML (Scores, comments, etc.) -->
              ${extraHtml || ""}

              <!-- Notice Box -->
              ${noticeHtml}

              <!-- Call To Action Button -->
              ${buttonHtml}

              <!-- Secondary Note -->
              ${secondaryNote ? `
                <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 20px 0 0 0; line-height: 1.5;">
                  ${secondaryNote}
                </p>
              ` : ""}
            </td>
          </tr>

          <!-- Card Footer -->
          <tr>
            <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748B; line-height: 1.6;">
              <div style="font-weight: 800; color: #004D47; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC SKY-LINE
              </div>
              <div>Hệ thống Quản lý Hoạt động & Dự giờ Chuyên môn Skyline</div>
              <div style="margin-top: 6px; color: #94A3B8;">
                Email thông báo tự động từ Ban Khảo thí & ĐBCL Sky-Line (<a href="mailto:dbclskl@gmail.com" style="color: #008B82; text-decoration: none; font-weight: 600;">dbclskl@gmail.com</a> | <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #008B82; text-decoration: none; font-weight: 600;">bankhaothi@skylineschool.edu.vn</a>)
              </div>
              <div style="margin-top: 6px; font-size: 10px; color: #CBD5E1;">
                © ${currentYear} Sky-Line Education System. All rights reserved.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// =========================================================================
// PRESET TEMPLATES FOR DỰ GIỜ
// =========================================================================

/**
 * 1. Email confirmation for Observer (Biên nhận gửi đề xuất xin dự giờ) - The one from user's screenshot!
 */
export function renderObservationRequestSubmittedForObserver(params: {
  observerName: string;
  hostName: string;
  hostCode?: string;
  topic: string;
  subjectName: string;
  level?: string;
  grade?: string;
  className?: string;
  dateStr: string;
  period: string;
  campusName?: string;
  room?: string;
  directLink: string;
}): string {
  return renderSkylineEmail({
    headerBadge: "✅ ĐÃ GỬI ĐỀ XUẤT",
    headerTitle: "XÁC NHẬN ĐÃ GỬI ĐỀ XUẤT DỰ GIỜ",
    headerSubtitle: "Hệ thống Quản lý Dự giờ Chuyên môn Skyline",
    headerTheme: "teal",
    recipientName: params.observerName,
    introMessage: `Thầy/Cô đã gửi thành công đề xuất xin tham gia dự giờ tiết dạy của Thầy/Cô <strong>${params.hostName}</strong>. Dưới đây là thông tin biên nhận chi tiết:`,
    details: [
      { icon: "👨‍🏫", label: "Giáo viên dạy", value: `${params.hostName} ${params.hostCode ? `(${params.hostCode})` : ""}`, highlight: true },
      { icon: "📖", label: "Tên bài dạy / Chủ đề", value: params.topic || "Đề xuất xin dự giờ tiết học", highlight: true },
      { icon: "📚", label: "Môn học & Khối lớp", value: `${params.subjectName} (${params.level || ""} ${params.grade || ""} - ${params.className || "Lớp học"})` },
      { icon: "📅", label: "Ngày dự kiến", value: params.dateStr, highlight: true },
      { icon: "⏰", label: "Tiết dạy", value: params.period || "Tiết 1" },
      { icon: "🏫", label: "Cơ sở & Địa điểm", value: `${params.campusName || "Sky-Line"} - Phòng ${params.room || "học"}` }
    ],
    noticeBox: {
      type: "info",
      title: "Trạng thái tiếp nhận",
      content: "Hệ thống sẽ tự động gửi thông báo đến Thầy/Cô ngay khi Giáo viên dạy xác nhận & phê duyệt yêu cầu này."
    },
    button: {
      text: "👉 Xem Lịch & Danh Sách Tiết Tôi Dự",
      url: params.directLink
    },
    secondaryNote: "Quý Thầy/Cô có thể quản lý và theo dõi tiến độ dự giờ trực tiếp trên hệ thống Skyline."
  });
}

/**
 * 2. Email sent to Host Teacher requesting observation
 */
export function renderObservationRequestForHost(params: {
  hostName: string;
  observerName: string;
  observerCode?: string;
  observerPosition?: string;
  topic: string;
  subjectName: string;
  grade?: string;
  className?: string;
  dateStr: string;
  period: string;
  notes?: string;
  directLink: string;
}): string {
  return renderSkylineEmail({
    headerBadge: "📩 ĐỀ XUẤT MỚI",
    headerTitle: "ĐỀ XUẤT XIN THAM GIA DỰ GIỜ",
    headerSubtitle: "Có giáo viên gửi đề xuất xin tham dự tiết dạy của Thầy/Cô",
    headerTheme: "teal",
    recipientName: params.hostName,
    introMessage: `Thầy/Cô <strong>${params.observerName}</strong> (${params.observerPosition || "Giáo viên"}) vừa gửi đề xuất xin tham gia dự giờ một tiết dạy của Thầy/Cô:`,
    details: [
      { icon: "👨‍🏫", label: "Người xin dự giờ", value: `${params.observerName} ${params.observerCode ? `(${params.observerCode})` : ""}`, highlight: true },
      { icon: "📖", label: "Tên bài dạy / Chủ đề", value: params.topic || "Đề xuất xin dự giờ tiết học", highlight: true },
      { icon: "📚", label: "Môn học & Khối lớp", value: `${params.subjectName} (${params.grade || ""} - ${params.className || "Lớp học"})` },
      { icon: "📅", label: "Ngày dự kiến", value: params.dateStr, highlight: true },
      { icon: "⏰", label: "Tiết dạy", value: params.period || "Tiết 1" },
      ...(params.notes ? [{ icon: "📝", label: "Lời nhắn / Ghi chú", value: params.notes, color: "#475569" }] : [])
    ],
    noticeBox: {
      type: "note",
      title: "Lưu ý quan trọng",
      content: "Sau khi Thầy/Cô bấm phê duyệt trên hệ thống, tiết dạy sẽ được chính thức ghi nhận vào lịch giảng dạy của Thầy/Cô và hệ thống sẽ gửi thông báo xác nhận tới Người dự giờ."
    },
    button: {
      text: "👉 Xem Chi Tiết & Phê Duyệt Tiết Dự Giờ Ngay",
      url: params.directLink
    }
  });
}

/**
 * 3. Email sent to Observer when Host Teacher ACCEPTS or REJECTS
 */
export function renderObservationRequestResponseForObserver(params: {
  observerName: string;
  hostName: string;
  hostCode?: string;
  topic: string;
  subjectName: string;
  grade?: string;
  className?: string;
  dateStr: string;
  period: string;
  accepted: boolean;
  reason?: string;
  directLink: string;
}): string {
  if (params.accepted) {
    return renderSkylineEmail({
      headerBadge: "✅ ĐÃ PHÊ DUYỆT",
      headerTitle: "ĐỀ XUẤT DỰ GIỜ ĐÃ ĐƯỢC ĐỒNG Ý",
      headerSubtitle: "Giáo viên dạy đã xác nhận đề xuất tham dự tiết dạy",
      headerTheme: "teal",
      recipientName: params.observerName,
      introMessage: `Thầy/Cô <strong>${params.hostName}</strong> đã <strong>xác nhận đồng ý</strong> cho Thầy/Cô tham gia dự giờ tiết dạy chuyên môn theo lịch sau:`,
      details: [
        { icon: "👨‍🏫", label: "Giáo viên dạy", value: `${params.hostName} ${params.hostCode ? `(${params.hostCode})` : ""}`, highlight: true },
        { icon: "📖", label: "Bài dạy / Chủ đề", value: params.topic, highlight: true },
        { icon: "📚", label: "Môn & Lớp", value: `${params.subjectName} (${params.grade || ""} - ${params.className || "Lớp"})` },
        { icon: "📅", label: "Ngày dạy", value: params.dateStr, highlight: true },
        { icon: "⏰", label: "Tiết dạy", value: params.period }
      ],
      noticeBox: {
        type: "success",
        title: "Kế hoạch tham dự",
        content: "Kính mời Thầy/Cô sắp xếp thời gian tham dự đúng giờ và hoàn tất phiếu đánh giá sau khi tiết dạy kết thúc."
      },
      button: {
        text: "👉 Xem Lịch & Thông Tin Tiết Dạy Trên Skyline",
        url: params.directLink
      }
    });
  } else {
    return renderSkylineEmail({
      headerBadge: "⚠️ PHẢN HỒI ĐỀ XUẤT",
      headerTitle: "PHẢN HỒI ĐỀ XUẤT DỰ GIỜ",
      headerSubtitle: "Thông tin phản hồi từ Giáo viên dạy",
      headerTheme: "rose",
      recipientName: params.observerName,
      introMessage: `Thầy/Cô <strong>${params.hostName}</strong> chưa thể tiếp nhận đề xuất dự giờ cho tiết dạy <strong>"${params.topic}"</strong> vào ngày <strong>${params.dateStr}</strong>.`,
      noticeBox: {
        type: "warning",
        title: "Lý do phản hồi",
        content: params.reason || "Giáo viên dạy chưa sắp xếp được thời gian phù hợp."
      },
      button: {
        text: "👉 Tìm & Đăng Ký Tiết Dạy Khác",
        url: params.directLink
      },
      secondaryNote: "Thầy/Cô có thể lựa chọn các tiết dạy khác trong Tổ chuyên môn hoặc liên hệ trao đổi trực tiếp."
    });
  }
}

/**
 * 4. New Observation Slot Notification to Department Members
 */
export function renderObservationSlotCreatedForTcm(params: {
  teacherName: string;
  teacherCode?: string;
  topic: string;
  subjectName: string;
  grade?: string;
  className?: string;
  campusName?: string;
  room?: string;
  dateStr: string;
  timeStr: string;
  directLink: string;
}): string {
  return renderSkylineEmail({
    headerBadge: "📢 TIẾT DẠY MỚI",
    headerTitle: "TIẾT DẠY DỰ GIỜ MỚI TRONG TỔ CHUYÊN MÔN",
    headerSubtitle: "Kính mời Quý Thầy/Cô đăng ký tham gia dự giờ",
    headerTheme: "teal",
    recipientName: "Quý Thầy/Cô trong Tổ Chuyên Môn",
    introMessage: `Thầy/Cô <strong>${params.teacherName}</strong> vừa mở một tiết dạy dự giờ mới cho Tổ chuyên môn. Kính mời Thầy/Cô đăng ký tham dự:`,
    details: [
      { icon: "👨‍🏫", label: "Giáo viên dạy", value: `${params.teacherName} ${params.teacherCode ? `(${params.teacherCode})` : ""}`, highlight: true },
      { icon: "📖", label: "Bài dạy / Chủ đề", value: params.topic, highlight: true },
      { icon: "📚", label: "Môn học & Lớp", value: `${params.subjectName} (${params.grade || ""} - ${params.className || "Lớp học"})` },
      { icon: "🏫", label: "Cơ sở & Địa điểm", value: `${params.campusName || "Trường"} - ${params.room || "Phòng học"}` },
      { icon: "📅", label: "Ngày dạy", value: params.dateStr, highlight: true },
      { icon: "⏰", label: "Thời gian / Tiết", value: params.timeStr }
    ],
    noticeBox: {
      type: "info",
      title: "Số lượng tham dự",
      content: "Số lượng giáo viên tham dự mỗi tiết dạy có giới hạn. Kính mời Thầy/Cô đăng ký sớm để hệ thống ghi nhận."
    },
    button: {
      text: "👉 Đăng Ký Dự Giờ Ngay Trực Tiếp",
      url: params.directLink
    }
  });
}

/**
 * 5. Notification to Host Teacher when someone registers for their slot
 */
export function renderObservationSlotRegisteredForHost(params: {
  hostName: string;
  observerName: string;
  observerCode?: string;
  topic: string;
  subjectName: string;
  level?: string;
  grade?: string;
  className?: string;
  dateStr: string;
  timeStr: string;
  directLink: string;
}): string {
  return renderSkylineEmail({
    headerBadge: "📝 ĐĂNG KÝ MỚI",
    headerTitle: "THÔNG BÁO ĐĂNG KÝ TIẾT DỰ GIỜ",
    headerSubtitle: "Có giáo viên vừa đăng ký tham dự tiết dạy của Thầy/Cô",
    headerTheme: "teal",
    recipientName: params.hostName,
    introMessage: `Thầy/Cô <strong>${params.observerName}</strong> vừa đăng ký tham gia dự giờ tiết dạy của Thầy/Cô. Dưới đây là thông tin chi tiết:`,
    details: [
      { icon: "👨‍🏫", label: "Giáo viên xin dự giờ", value: `${params.observerName} ${params.observerCode ? `(${params.observerCode})` : ""}`, highlight: true },
      { icon: "📖", label: "Tên bài dạy / Chủ đề", value: params.topic, highlight: true },
      { icon: "📚", label: "Môn học & Khối lớp", value: `${params.subjectName} (${params.level || ""} ${params.grade || ""} - ${params.className || "Lớp học"})` },
      { icon: "📅", label: "Ngày dạy", value: params.dateStr, highlight: true },
      { icon: "⏰", label: "Tiết dạy", value: params.timeStr }
    ],
    noticeBox: {
      type: "info",
      title: "Xác nhận danh sách",
      content: "Thầy/Cô vui lòng truy cập hệ thống để kiểm tra danh sách người tham dự và chuẩn bị tiết dạy."
    },
    button: {
      text: "👉 Xem Danh Sách Tiết Dạy & Người Dự",
      url: params.directLink
    }
  });
}

/**
 * 6. Observation Evaluation Completed (Sent to Host Teacher)
 */
export function renderObservationEvaluationCompletedForHost(params: {
  hostName: string;
  observerName: string;
  observerCode?: string;
  observerPosition?: string;
  topic: string;
  subjectName: string;
  grade?: string;
  className?: string;
  dateStr: string;
  period: string;
  campusName?: string;
  room?: string;
  totalScore: string;
  rating: string;
  strengths?: string;
  improvements?: string;
  generalComment?: string;
  directLink: string;
}): string {
  const extraHtml = `
    <!-- Score & Ranking Badge -->
    <div style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 16px 20px; margin: 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; letter-spacing: 0.5px;">Tổng điểm đạt được:</div>
            <div style="font-size: 22px; font-weight: 900; color: #004D47; margin-top: 2px;">${params.totalScore}</div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Xếp loại tiết dạy:</div>
            <span style="font-size: 14px; font-weight: 900; color: #047857; background-color: #D1FAE5; border: 1px solid #A7F3D0; padding: 5px 14px; border-radius: 8px; display: inline-block;">
              ${params.rating}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Qualitative Comments -->
    <div style="margin: 20px 0;">
      ${params.strengths ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 4px;">🌟 1. Ưu điểm nổi bật:</div>
        <div style="font-size: 13px; color: #166534; line-height: 1.6; white-space: pre-line;">${params.strengths}</div>
      </div>
      ` : ""}

      ${params.improvements ? `
      <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #B45309; text-transform: uppercase; margin-bottom: 4px;">💡 2. Nội dung cần cải thiện / Góp ý:</div>
        <div style="font-size: 13px; color: #92400E; line-height: 1.6; white-space: pre-line;">${params.improvements}</div>
      </div>
      ` : ""}

      ${params.generalComment ? `
      <div style="background-color: #F8FAFC; border-left: 4px solid #64748B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 4px;">📝 3. Đề xuất & Kiến nghị chuyên môn:</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.6; white-space: pre-line;">${params.generalComment}</div>
      </div>
      ` : ""}
    </div>
  `;

  return renderSkylineEmail({
    headerBadge: "📊 KẾT QUẢ ĐÁNH GIÁ",
    headerTitle: "KẾT QUẢ ĐÁNH GIÁ TIẾT DẠY DỰ GIỜ",
    headerSubtitle: "Phiếu đánh giá tiết dạy chuyên môn đã hoàn tất",
    headerTheme: "teal",
    recipientName: params.hostName,
    introMessage: `Thầy/Cô <strong>${params.observerName}</strong> (${params.observerPosition || "Người dự giờ"}) đã hoàn tất nhập <strong>Phiếu đánh giá dự giờ</strong> cho tiết dạy của Thầy/Cô. Dưới đây là thông tin chi tiết:`,
    details: [
      { icon: "📖", label: "Tên bài dạy / Chủ đề", value: params.topic || "Tiết dạy", highlight: true },
      { icon: "📚", label: "Môn học & Khối lớp", value: `${params.subjectName} (${params.grade || ""} - ${params.className || ""})` },
      { icon: "📅", label: "Thời gian & Tiết", value: `Tiết ${params.period} • ${params.dateStr}`, highlight: true },
      { icon: "🏫", label: "Cơ sở & Địa điểm", value: `${params.campusName || "Sky-Line"} - Phòng ${params.room || "học"}` },
      { icon: "👨‍🏫", label: "Người dự giờ", value: `${params.observerName} ${params.observerCode ? `(${params.observerCode})` : ""}` }
    ],
    extraHtml,
    button: {
      text: "👉 Xem Chi Tiết Phiếu Đánh Giá & Tiếp Thu Góp Ý",
      url: params.directLink
    },
    secondaryNote: "Dữ liệu đánh giá đã được lưu trữ an toàn và tính vào chỉ tiêu chuyên môn của Thầy/Cô."
  });
}

/**
 * 7. Observation Evaluation Confirmation (Sent to Observer)
 */
export function renderObservationEvaluationCompletedForObserver(params: {
  observerName: string;
  hostName: string;
  hostCode?: string;
  topic: string;
  subjectName: string;
  grade?: string;
  className?: string;
  dateStr: string;
  period: string;
  campusName?: string;
  room?: string;
  totalScore: string;
  rating: string;
  strengths?: string;
  improvements?: string;
  generalComment?: string;
  directLink: string;
}): string {
  const extraHtml = `
    <!-- Score & Ranking Badge -->
    <div style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 16px 20px; margin: 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; letter-spacing: 0.5px;">Tổng điểm Thầy/Cô đã chấm:</div>
            <div style="font-size: 22px; font-weight: 900; color: #004D47; margin-top: 2px;">${params.totalScore}</div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Xếp loại:</div>
            <span style="font-size: 14px; font-weight: 900; color: #047857; background-color: #D1FAE5; border: 1px solid #A7F3D0; padding: 5px 14px; border-radius: 8px; display: inline-block;">
              ${params.rating}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Qualitative Comments -->
    <div style="margin: 20px 0;">
      ${params.strengths ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 4px;">🌟 1. Ưu điểm nổi bật:</div>
        <div style="font-size: 13px; color: #166534; line-height: 1.6; white-space: pre-line;">${params.strengths}</div>
      </div>
      ` : ""}

      ${params.improvements ? `
      <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #B45309; text-transform: uppercase; margin-bottom: 4px;">💡 2. Nội dung cần cải thiện / Góp ý:</div>
        <div style="font-size: 13px; color: #92400E; line-height: 1.6; white-space: pre-line;">${params.improvements}</div>
      </div>
      ` : ""}
    </div>
  `;

  return renderSkylineEmail({
    headerBadge: "✅ ĐÃ NỘP ĐÁNH GIÁ",
    headerTitle: "XÁC NHẬN HOÀN TẤT ĐÁNH GIÁ TIẾT DỰ GIỜ",
    headerSubtitle: "Biên bản và phiếu đánh giá đã được lưu vào hệ thống",
    headerTheme: "teal",
    recipientName: `${params.observerName} (Người dự giờ)`,
    introMessage: `Thầy/Cô đã hoàn tất và nộp thành công <strong>Phiếu đánh giá dự giờ</strong> cho tiết dạy của Thầy/Cô <strong>${params.hostName}</strong>. Dưới đây là biên bản và điểm số Thầy/Cô đã ghi nhận:`,
    details: [
      { icon: "📖", label: "Tên bài dạy / Chủ đề", value: params.topic || "Tiết dạy", highlight: true },
      { icon: "👨‍🏫", label: "Giáo viên dạy", value: `${params.hostName} ${params.hostCode ? `(${params.hostCode})` : ""}` },
      { icon: "📚", label: "Môn học & Lớp", value: `${params.subjectName} (${params.grade || ""} - ${params.className || ""})` },
      { icon: "📅", label: "Thời gian & Tiết", value: `Tiết ${params.period} • ${params.dateStr}`, highlight: true },
      { icon: "🏫", label: "Cơ sở & Địa điểm", value: `${params.campusName || "Sky-Line"} - Phòng ${params.room || "học"}` }
    ],
    extraHtml,
    button: {
      text: "👉 Xem Danh Sách Tiết Tôi Dự Trên Skyline",
      url: params.directLink
    },
    secondaryNote: "Tiết dự giờ này đã được tự động cộng vào tiến độ hoàn thành chỉ tiêu dự giờ cá nhân của Thầy/Cô."
  });
}

/**
 * 8. Pending Evaluation Reminder
 */
export function renderObservationPendingEvaluationReminder(params: {
  observerName: string;
  hostName: string;
  hostCode?: string;
  topic: string;
  subjectName: string;
  grade?: string;
  className?: string;
  dateStr: string;
  period: string;
  campusName?: string;
  room?: string;
  directLink: string;
}): string {
  return renderSkylineEmail({
    headerBadge: "⏰ NHẮC NHỞ ĐÁNH GIÁ",
    headerTitle: "NHẮC NHỞ HOÀN TẤT NHẬP ĐÁNH GIÁ TIẾT DỰ GIỜ",
    headerSubtitle: "Vui lòng hoàn tất phiếu đánh giá để hệ thống ghi nhận chỉ tiêu",
    headerTheme: "amber",
    recipientName: params.observerName,
    introMessage: `Để hoàn thành tiết dự, Quý Thầy/Cô vui lòng hoàn tất nhập đánh giá cho tiết dạy <strong>"${params.topic}"</strong> của Thầy/Cô <strong>${params.hostName}</strong>:`,
    details: [
      { icon: "👨‍🏫", label: "Giáo viên dạy", value: `${params.hostName} ${params.hostCode ? `(${params.hostCode})` : ""}`, highlight: true },
      { icon: "📖", label: "Bài dạy / Chủ đề", value: params.topic, highlight: true },
      { icon: "📚", label: "Môn & Lớp", value: `${params.subjectName} (${params.grade || ""} - ${params.className || "Lớp học"})` },
      { icon: "📅", label: "Thời gian & Tiết", value: `Tiết ${params.period} • ${params.dateStr}`, highlight: true },
      { icon: "🏫", label: "Cơ sở & Phòng", value: `${params.campusName || "Sky-Line"} - Phòng ${params.room || "học"}` }
    ],
    noticeBox: {
      type: "warning",
      title: "Lưu ý quan trọng",
      content: "Hệ thống chỉ ghi nhận tiết dạy / tiết dự khi các Thầy/Cô hoàn thành nhập phiếu đánh giá chuyên môn."
    },
    button: {
      text: "✍️ Nhập Phiếu Đánh Giá Ngay Trên Hệ Thống",
      url: params.directLink,
      color: "#008B82"
    }
  });
}

/**
 * 9. Two-way feedback: Teacher Acknowledged & Responded
 */
export function renderObservationTeacherAcknowledged(params: {
  evaluatorName: string;
  hostName: string;
  topic: string;
  feedbackText: string;
  acknowledgedAtStr: string;
  directLink: string;
}): string {
  const extraHtml = `
    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 5px solid #16A34A; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
      <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 6px;">
        💬 Kế hoạch khắc phục & Ý kiến phản hồi của Giáo viên:
      </div>
      <div style="font-size: 14px; color: #14532D; line-height: 1.6; font-style: italic; white-space: pre-line;">
        ${params.feedbackText}
      </div>
      <div style="font-size: 11px; color: #166534; font-weight: bold; margin-top: 10px; border-top: 1px dashed #86EFAC; padding-top: 8px;">
        ⏱ Thời gian xác nhận: ${params.acknowledgedAtStr}
      </div>
    </div>
  `;

  return renderSkylineEmail({
    headerBadge: "💬 PHẢN HỒI 2 CHIỀU",
    headerTitle: "GIÁO VIÊN ĐÃ TIẾP THU GÓP Ý & PHẢN HỒI",
    headerSubtitle: "Phản hồi chuyên môn 2 chiều từ Giáo viên dạy",
    headerTheme: "emerald",
    recipientName: params.evaluatorName,
    introMessage: `Giáo viên dạy <strong>${params.hostName}</strong> đã xem biên bản đánh giá tiết <strong>"${params.topic}"</strong> và gửi phản hồi xác nhận tiếp thu ý kiến chuyên môn:`,
    extraHtml,
    button: {
      text: "👉 Xem Chi Tiết Tiết Dự Giờ Trên Skyline",
      url: params.directLink
    }
  });
}

/**
 * 10. Surprise Observation Evaluation (Đột xuất) Completed
 */
export function renderObservationSurpriseCompletedForHost(params: {
  hostName: string;
  observerName: string;
  observerCode?: string;
  topic: string;
  subjectName: string;
  grade?: string;
  className?: string;
  dateStr: string;
  period: string;
  campusName?: string;
  room?: string;
  totalScore: string;
  rating: string;
  strengths?: string;
  improvements?: string;
  generalComment?: string;
  directLink: string;
}): string {
  const extraHtml = `
    <!-- Score & Ranking Badge -->
    <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 12px; padding: 16px 20px; margin: 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #9F1239; text-transform: uppercase; letter-spacing: 0.5px;">Tổng điểm đạt được:</div>
            <div style="font-size: 22px; font-weight: 900; color: #881337; margin-top: 2px;">${params.totalScore}</div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #9F1239; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Xếp loại tiết dạy:</div>
            <span style="font-size: 14px; font-weight: 900; color: #047857; background-color: #D1FAE5; border: 1px solid #A7F3D0; padding: 5px 14px; border-radius: 8px; display: inline-block;">
              ${params.rating}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Qualitative Comments -->
    <div style="margin: 20px 0;">
      ${params.strengths ? `
      <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 4px;">🌟 1. Ưu điểm nổi bật:</div>
        <div style="font-size: 13px; color: #166534; line-height: 1.6; white-space: pre-line;">${params.strengths}</div>
      </div>
      ` : ""}

      ${params.improvements ? `
      <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #B45309; text-transform: uppercase; margin-bottom: 4px;">💡 2. Nội dung cần cải thiện / Góp ý:</div>
        <div style="font-size: 13px; color: #92400E; line-height: 1.6; white-space: pre-line;">${params.improvements}</div>
      </div>
      ` : ""}

      ${params.generalComment ? `
      <div style="background-color: #F8FAFC; border-left: 4px solid #64748B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 4px;">📝 3. Đề xuất & Kiến nghị chuyên môn:</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.6; white-space: pre-line;">${params.generalComment}</div>
      </div>
      ` : ""}
    </div>
  `;

  return renderSkylineEmail({
    headerBadge: "⚡ DỰ GIỜ ĐỘT XUẤT",
    headerTitle: "KẾT QUẢ ĐÁNH GIÁ DỰ GIỜ ĐỘT XUẤT",
    headerSubtitle: "Biên bản & phiếu đánh giá dự giờ đột xuất",
    headerTheme: "rose",
    recipientName: params.hostName,
    introMessage: `Thầy/Cô <strong>${params.observerName}</strong> đã hoàn tất <strong>Biên bản & Phiếu đánh giá dự giờ đột xuất</strong> cho tiết dạy của Thầy/Cô. Dưới đây là thông tin chi tiết:`,
    details: [
      { icon: "📖", label: "Tên bài dạy / Chủ đề", value: params.topic || "Dự giờ đột xuất", highlight: true },
      { icon: "📚", label: "Môn học & Lớp", value: `${params.subjectName} (${params.grade || ""} - ${params.className || ""})` },
      { icon: "📅", label: "Thời gian & Tiết", value: `Tiết ${params.period} • ${params.dateStr}`, highlight: true },
      { icon: "🏫", label: "Cơ sở & Địa điểm", value: `${params.campusName || "Sky-Line"} - Phòng ${params.room || "học"}` },
      { icon: "👨‍🏫", label: "Người dự giờ", value: `${params.observerName} ${params.observerCode ? `(${params.observerCode})` : ""}` }
    ],
    extraHtml,
    button: {
      text: "👉 Xem Chi Tiết Biên Bản Dự Giờ Trên Skyline",
      url: params.directLink,
      color: "#E11D48"
    }
  });
}

/**
 * 11. Re-Evaluation Approved Email
 */
export function renderObservationReEvaluationApproved(params: {
  teacherName: string;
  hostName?: string;
  topic: string;
  subjectName?: string;
  className?: string;
  dateStr: string;
  period: string;
  reason?: string;
  adminNote?: string;
  directLink: string;
}): string {
  return renderSkylineEmail({
    headerBadge: "🔓 ĐÃ MỞ LẠI PHIẾU",
    headerTitle: "PHÊ DUYỆT MỞ LẠI PHIẾU ĐÁNH GIÁ",
    headerSubtitle: "Yêu cầu đánh giá lại chuyên môn đã được Ban Quản trị phê duyệt",
    headerTheme: "teal",
    recipientName: params.teacherName,
    introMessage: "Hệ thống đã ghi nhận <strong>Admin đã xét duyệt mở lại phiếu đánh giá</strong> theo yêu cầu của Thầy/Cô. Thầy/Cô vui lòng truy cập hệ thống để tiến hành cập nhật lại điểm số và nhận xét cho tiết dự giờ:",
    details: [
      ...(params.hostName ? [{ icon: "👨‍🏫", label: "Giáo viên dạy", value: params.hostName, highlight: true }] : []),
      { icon: "📖", label: "Bài dạy / Chủ đề", value: params.topic || "Tiết dạy chuyên môn", highlight: true },
      ...(params.subjectName ? [{ icon: "📚", label: "Môn học", value: params.subjectName }] : []),
      { icon: "📅", label: "Ngày & Tiết", value: `Tiết ${params.period} • ${params.dateStr}` },
      ...(params.reason ? [{ icon: "📝", label: "Lý do xin mở lại", value: params.reason, color: "#0284C7" }] : []),
      ...(params.adminNote ? [{ icon: "💬", label: "Ghi chú từ Admin", value: params.adminNote, color: "#059669" }] : [])
    ],
    noticeBox: {
      type: "success",
      title: "Chỉnh sửa phiếu",
      content: "Phiếu đánh giá đã được mở khóa. Thầy/Cô có thể chỉnh sửa và cập nhật lại điểm số trực tiếp trên hệ thống."
    },
    button: {
      text: "👉 Mở Phiếu & Đánh Giá Lại Ngay",
      url: params.directLink
    }
  });
}

/**
 * 12. Re-Evaluation Rejected Email
 */
export function renderObservationReEvaluationRejected(params: {
  teacherName: string;
  topic: string;
  adminNote?: string;
}): string {
  return renderSkylineEmail({
    headerBadge: "❌ KHÔNG PHÊ DUYỆT",
    headerTitle: "PHẢN HỒI YÊU CẦU MỞ LẠI PHIẾU",
    headerSubtitle: "Thông báo kết quả xét duyệt từ Ban Quản trị",
    headerTheme: "rose",
    recipientName: params.teacherName,
    introMessage: `Yêu cầu mở lại phiếu đánh giá tiết dạy <strong>"${params.topic}"</strong> chưa được phê duyệt với lý do sau:`,
    noticeBox: {
      type: "warning",
      title: "Lý do phản hồi",
      content: params.adminNote || "Không có ghi chú cụ thể từ Ban Quản trị."
    },
    secondaryNote: "Nếu cần hỗ trợ thêm, Thầy/Cô vui lòng liên hệ trực tiếp Ban Quản trị / Ban Khảo thí & ĐBCL."
  });
}

/**
 * 13. Expired Slot Notification to Host or Observer
 */
export function renderObservationExpiredNotification(params: {
  recipientName: string;
  isHost: boolean;
  hostName: string;
  hostCode?: string;
  topic: string;
  subjectName: string;
  grade?: string;
  className?: string;
  campusName?: string;
  room?: string;
  dateStr: string;
  timeStr: string;
  directLink: string;
}): string {
  return renderSkylineEmail({
    headerBadge: "⏰ NHẮC LỊCH DẠY / DỰ",
    headerTitle: params.isHost ? "HẾT HẠN ĐĂNG KÝ & NHẮC LỊCH TIẾT DẠY" : "NHẮC LỊCH DỰ GIỜ TIẾT HỌC",
    headerSubtitle: "Tiết dạy chuyên môn sắp diễn ra theo kế hoạch",
    headerTheme: "teal",
    recipientName: params.recipientName,
    introMessage: params.isHost
      ? "Tiết dạy dự giờ của Thầy/Cô đã kết thúc thời hạn đăng ký. Kính mời Thầy/Cô kiểm tra danh sách và chuẩn bị thực hiện tiết dạy theo đúng thời gian đã đăng ký:"
      : `Tiết dạy dự giờ bạn đã đăng ký thuộc môn <strong>${params.subjectName}</strong> của Thầy/Cô <strong>${params.hostName}</strong> đã hết hạn đăng ký và sẽ diễn ra theo kế hoạch:`,
    details: [
      { icon: "👨‍🏫", label: "Giáo viên dạy", value: `${params.hostName} ${params.hostCode ? `(${params.hostCode})` : ""}`, highlight: true },
      { icon: "📖", label: "Bài dạy / Chủ đề", value: params.topic, highlight: true },
      { icon: "📚", label: "Môn học & Lớp", value: `${params.subjectName} (${params.grade || ""} - ${params.className || "Lớp học"})` },
      { icon: "🏫", label: "Cơ sở & Địa điểm", value: `${params.campusName || "Trường"} - ${params.room || "Phòng học"}` },
      { icon: "📅", label: "Ngày dạy", value: params.dateStr, highlight: true },
      { icon: "⏰", label: "Thời gian / Tiết", value: params.timeStr }
    ],
    noticeBox: {
      type: "info",
      title: "Thời gian diễn ra",
      content: "Kính mời Quý Thầy/Cô sắp xếp công việc và tham gia đúng giờ theo kế hoạch."
    },
    button: {
      text: "👉 Xem Chi Tiết Tiết Dạy Trên Skyline",
      url: params.directLink
    }
  });
}
