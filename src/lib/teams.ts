/**
 * Microsoft Teams Notification Utility for Skyline Observation (Dự Giờ) System
 * Guarantees 100% non-blocking async execution and zero page crashes.
 */

export interface ObservationSlotPayload {
  id: string;
  topic: string;
  subjectName: string;
  level: string;
  grade: string;
  className?: string | null;
  date: string | Date;
  startTime: string;
  endTime: string;
  campusName?: string | null;
  room?: string | null;
  teacherName?: string | null;
  teacherCode?: string | null;
  maxSeats?: number | null;
  registeredCount?: number | null;
}

export interface TeacherPayload {
  teacherName: string;
  teacherCode?: string | null;
  email?: string | null;
  teamsWebhookUrl?: string | null;
}

export interface DepartmentPayload {
  name?: string | null;
  teamsWebhookUrl?: string | null;
}

const DEFAULT_TEAMS_WEBHOOK = process.env.MICROSOFT_TEAMS_WEBHOOK_URL || "";
const SENDER_ACCOUNT_EMAIL = "bankhaothi@skylineschool.edu.vn";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://skyline-survey.vercel.app";

/**
 * Core function to send an Adaptive Card message to a Teams Webhook URL.
 * Never throws an error; catches all network/HTTP errors safely.
 */
export async function sendTeamsWebhookMessage(webhookUrl: string, cardContent: any): Promise<boolean> {
  const targetUrl = webhookUrl || DEFAULT_TEAMS_WEBHOOK;
  if (!targetUrl || !targetUrl.startsWith("http")) {
    console.log("[MS Teams] No valid webhook URL provided. Skipping Teams dispatch.");
    return false;
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardContent),
    });

    if (!response.ok) {
      console.error(`[MS Teams] Failed response status: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log("[MS Teams] Notification dispatched successfully.");
    return true;
  } catch (err: any) {
    console.error("[MS Teams] Network or fetch error while sending notification:", err?.message || err);
    return false;
  }
}

/**
 * Format date string to Vietnamese display standard (Thứ ..., dd/mm/yyyy)
 */
function formatDateVi(dateVal: string | Date): string {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = days[d.getDay()];
  const dateFormatted = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${dayName}, ${dateFormatted}`;
}

// 1. EVENT 1: New Slot Created in Tag "GV DẠY TỰ MỞ TIẾT" -> Department Channel
export async function sendTeamsNewSlotDepartmentNotif(
  slot: ObservationSlotPayload,
  dept?: DepartmentPayload | null
): Promise<boolean> {
  const webhookUrl = dept?.teamsWebhookUrl || DEFAULT_TEAMS_WEBHOOK;
  const linkUrl = `${BASE_URL}/teacher/du-gio?tab=dang-ky&slotId=${slot.id}`;

  const card = {
    "type": "message",
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "contentUrl": null,
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": `**${slot.subjectName || "Dự Giờ"} — ${slot.topic || "Tiết dạy đăng ký dự giờ"}**`,
              "weight": "Bolder",
              "size": "Medium",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": `${slot.teacherName || "Giáo viên"} · ${slot.level || ""} (${slot.grade || ""} - ${slot.className || "Lớp học"}) · ${formatDateVi(slot.date)} (${slot.startTime || "Tiết 1"})`,
              "size": "Small",
              "color": "Dark",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": `[Mở trong Hệ thống Dự giờ Skyline](${linkUrl})`,
              "size": "Small",
              "color": "Accent",
              "wrap": true
            }
          ]
        }
      }
    ]
  };

  return await sendTeamsWebhookMessage(webhookUrl, card);
}

// 2. EVENT 2: Request Submitted in Tag "GVBM XIN DỰ GIỜ" -> Direct Host Teacher
export async function sendTeamsRequestApprovalNotif(
  slot: ObservationSlotPayload,
  hostTeacher: TeacherPayload,
  observerTeacher: TeacherPayload
): Promise<boolean> {
  const webhookUrl = hostTeacher.teamsWebhookUrl || DEFAULT_TEAMS_WEBHOOK;
  const linkUrl = `${BASE_URL}/teacher/du-gio?tab=duoc-xin-du&slotId=${slot.id}`;

  const card = {
    "type": "message",
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "contentUrl": null,
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": "📢 YÊU CẦU DỰ GIỜ CẦN XÁC NHẬN",
              "weight": "Bolder",
              "size": "Medium",
              "color": "Warning"
            },
            {
              "type": "TextBlock",
              "text": `Kính gửi Thầy/Cô **${hostTeacher.teacherName}**,\n\nThầy/Cô **${observerTeacher.teacherName}** (${observerTeacher.teacherCode || ""}) vừa đăng ký / đề xuất xin dự giờ tiết học của bạn. Vui lòng đăng nhập hệ thống để xác nhận.`,
              "wrap": true,
              "spacing": "Medium"
            },
            {
              "type": "FactSet",
              "facts": [
                { "title": "👤 Giáo viên xin dự:", "value": observerTeacher.teacherName },
                { "title": "📚 Nội dung bài dạy:", "value": slot.topic || "Đề xuất xin dự giờ" },
                { "title": "📖 Môn học:", "value": slot.subjectName },
                { "title": "🏫 Khối & Lớp:", "value": `${slot.grade} - ${slot.className || ""}` },
                { "title": "📅 Ngày & Tiết dạy:", "value": `${formatDateVi(slot.date)} (${slot.startTime})` }
              ]
            }
          ],
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "✅ Phê Duyệt / Xác Nhận Ngay",
              "url": linkUrl
            }
          ]
        }
      }
    ]
  };

  return await sendTeamsWebhookMessage(webhookUrl, card);
}

// 3. EVENT 3: Approval Confirmed -> Send to Observer WITH Evaluation Form Link
export async function sendTeamsApprovalWithEvalFormNotif(
  slot: ObservationSlotPayload,
  observerTeacher: TeacherPayload,
  hostTeacherName: string
): Promise<boolean> {
  const webhookUrl = observerTeacher.teamsWebhookUrl || DEFAULT_TEAMS_WEBHOOK;
  const evalLinkUrl = `${BASE_URL}/teacher/du-gio?tab=da-dang-ky&evalSlotId=${slot.id}`;

  const isMN = slot.level === "Mầm non";
  const evalSummaryText = isMN
    ? "Bộ tiêu chuẩn Mầm non: 4 tiêu chuẩn / 18 yêu cầu (Chuẩn bị, Nội dung, Phương pháp, Kết quả trên trẻ)."
    : "Bộ tiêu chuẩn Phổ thông K12: 4 tiêu chuẩn / 11 yêu cầu (Phương tiện, Nội dung, Phương pháp, Kết quả).";

  const card = {
    "type": "message",
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "contentUrl": null,
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": "🎉 XÁC NHẬN DỰ GIỜ THÀNH CÔNG",
              "weight": "Bolder",
              "size": "Medium",
              "color": "Good"
            },
            {
              "type": "TextBlock",
              "text": `Thầy/Cô **${hostTeacherName}** đã xác nhận yêu cầu dự giờ của bạn! Bên dưới là Form đánh giá kết quả tiết dạy được đính kèm.`,
              "wrap": true,
              "spacing": "Medium"
            },
            {
              "type": "FactSet",
              "facts": [
                { "title": "👨‍🏫 Giáo viên dạy:", "value": hostTeacherName },
                { "title": "📚 Bài dạy:", "value": slot.topic || "Tiết dạy dự giờ" },
                { "title": "📖 Môn & Lớp:", "value": `${slot.subjectName} (${slot.grade} - ${slot.className || ""})` },
                { "title": "📅 Thời gian:", "value": `${formatDateVi(slot.date)} - ${slot.startTime}` },
                { "title": "📋 Tiêu chí đánh giá:", "value": evalSummaryText }
              ]
            }
          ],
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "📝 Điền Phiếu Đánh Giá Tiết Dạy",
              "url": evalLinkUrl
            }
          ]
        }
      }
    ]
  };

  return await sendTeamsWebhookMessage(webhookUrl, card);
}

// 4. EVENT 4: Declined / Cancelled Notification
export async function sendTeamsDeclineNotif(
  slot: ObservationSlotPayload,
  targetTeacher: TeacherPayload,
  reason?: string
): Promise<boolean> {
  const webhookUrl = targetTeacher.teamsWebhookUrl || DEFAULT_TEAMS_WEBHOOK;

  const card = {
    "type": "message",
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "contentUrl": null,
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": "⚠️ THÔNG BÁO TỪ CHỐI / HỦY ĐĂNG KÝ DỰ GIỜ",
              "weight": "Bolder",
              "size": "Medium",
              "color": "Attention"
            },
            {
              "type": "TextBlock",
              "text": `Thông báo về tiết dạy dự giờ môn **${slot.subjectName}** (${slot.topic}) vào ngày **${formatDateVi(slot.date)}** đã bị từ chối hoặc hủy.`,
              "wrap": true
            },
            {
              "type": "FactSet",
              "facts": [
                { "title": "Lý do:", "value": reason || "Lịch học thay đổi hoặc tiết dạy đã bị hủy." }
              ]
            }
          ]
        }
      }
    ]
  };

  return await sendTeamsWebhookMessage(webhookUrl, card);
}

// 5. EVENT 5: Reminder - Lacking Observers -> Broadcast to Department
export async function sendTeamsLackingObserversReminder(
  slot: ObservationSlotPayload,
  dept?: DepartmentPayload | null
): Promise<boolean> {
  const webhookUrl = dept?.teamsWebhookUrl || DEFAULT_TEAMS_WEBHOOK;
  const linkUrl = `${BASE_URL}/teacher/du-gio?tab=dang-ky&slotId=${slot.id}`;
  const remaining = 4 - (slot.registeredCount || 0);

  const card = {
    "type": "message",
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "contentUrl": null,
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": "⚠️ TIẾT DẠY CẦN THÊM GIÁO VIÊN DỰ GIỜ",
              "weight": "Bolder",
              "size": "Medium",
              "color": "Warning"
            },
            {
              "type": "TextBlock",
              "text": `Kính gửi quý Thầy/Cô trong **Tổ chuyên môn**,\n\nTiết dạy dự giờ của Thầy/Cô **${slot.teacherName || ""}** hiện vẫn còn **${remaining}/4 suất** đăng ký. Kính mời Thầy/Cô đăng ký tham dự.`,
              "wrap": true,
              "spacing": "Medium"
            },
            {
              "type": "FactSet",
              "facts": [
                { "title": "📚 Bài dạy:", "value": slot.topic || "Tiết dạy dự giờ" },
                { "title": "📖 Môn & Lớp:", "value": `${slot.subjectName} (${slot.grade} - ${slot.className || ""})` },
                { "title": "📅 Thời gian:", "value": `${formatDateVi(slot.date)} - ${slot.startTime}` },
                { "title": "👥 Số suất còn lại:", "value": `${remaining} suất trống` }
              ]
            }
          ],
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "👉 Đăng Ký Dự Giờ Ngay",
              "url": linkUrl
            }
          ]
        }
      }
    ]
  };

  return await sendTeamsWebhookMessage(webhookUrl, card);
}

// 6. EVENT 6: Reminder - Upcoming Lesson & Post-Lesson Pending Evaluation
export async function sendTeamsUpcomingAndEvalReminder(
  slot: ObservationSlotPayload,
  targetTeacher: TeacherPayload,
  reminderType: "UPCOMING" | "PENDING_EVALUATION"
): Promise<boolean> {
  const webhookUrl = targetTeacher.teamsWebhookUrl || DEFAULT_TEAMS_WEBHOOK;
  const linkUrl = `${BASE_URL}/teacher/du-gio?tab=da-dang-ky&evalSlotId=${slot.id}`;

  const isUpcoming = reminderType === "UPCOMING";
  const title = isUpcoming ? "⏰ NHẮC LỊCH DỰ GIỜ SẮP DIỄN RA" : "📝 NHẮC NỘP PHIẾU ĐÁNH GIÁ TIẾT DẠY";
  const bodyText = isUpcoming
    ? `Tiết dạy dự giờ môn **${slot.subjectName}** (${slot.topic}) sẽ diễn ra vào ngày **${formatDateVi(slot.date)}** (${slot.startTime}). Kính mời Thầy/Cô chuẩn bị tham dự đúng giờ.`
    : `Tiết dạy dự giờ môn **${slot.subjectName}** (${slot.topic}) vào ngày **${formatDateVi(slot.date)}** đã kết thúc. Kính mời Thầy/Cô hoàn tất phiếu đánh giá kết quả tiết dạy.`;

  const card = {
    "type": "message",
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "contentUrl": null,
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": title,
              "weight": "Bolder",
              "size": "Medium",
              "color": isUpcoming ? "Accent" : "Attention"
            },
            {
              "type": "TextBlock",
              "text": bodyText,
              "wrap": true,
              "spacing": "Medium"
            },
            {
              "type": "FactSet",
              "facts": [
                { "title": "📖 Môn & Lớp:", "value": `${slot.subjectName} (${slot.grade} - ${slot.className || ""})` },
                { "title": "📍 Địa điểm:", "value": `${slot.campusName || ""} - ${slot.room || ""}` },
                { "title": "📅 Ngày dạy:", "value": formatDateVi(slot.date) }
              ]
            }
          ],
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": isUpcoming ? "🔗 Xem Chi Tiết Tiết Dạy" : "📝 Hoàn Tất Đánh Giá Ngay",
              "url": linkUrl
            }
          ]
        }
      }
    ]
  };

  return await sendTeamsWebhookMessage(webhookUrl, card);
}

// 7. EVENT 7: Broadcast to ALL individual members of a Department
export async function sendTeamsToAllDepartmentMembers(
  slot: ObservationSlotPayload,
  members: TeacherPayload[],
  deptWebhookUrl?: string | null
): Promise<{ success: boolean; sentCount: number }> {
  let sentCount = 0;
  
  // 1. Send to department channel webhook if configured
  if (deptWebhookUrl) {
    const ok = await sendTeamsNewSlotDepartmentNotif(slot, { teamsWebhookUrl: deptWebhookUrl });
    if (ok) sentCount++;
  }

  // 2. Send Teams message directly to EACH individual member's Teams account via Office 365 Email
  for (const member of members) {
    const memberEmail = member.email;
    if (memberEmail && memberEmail.includes("@")) {
      const ok = await sendTeamsDirectToUserEmail(memberEmail, slot, slot.teacherName || "Giáo viên");
      if (ok) sentCount++;
    }
  }

  return { success: true, sentCount };
}


/**
 * Send a 1:1 Teams message to an individual teacher's Teams account via their Office 365 Email address.
 */
export async function sendTeamsDirectToUserEmail(
  userEmail: string,
  slot: ObservationSlotPayload,
  senderTeacherName: string
): Promise<boolean> {
  if (!userEmail || !userEmail.includes("@")) return false;

  const linkUrl = `${BASE_URL}/teacher/du-gio?tab=dang-ky&slotId=${slot.id}`;
  const teamsChatDeepLink = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(userEmail)}&message=${encodeURIComponent(`[Skyline Dự Giờ] Thầy/Cô ${senderTeacherName} vừa mở tiết dạy dự giờ mới: ${slot.subjectName} - ${slot.topic}. Đăng ký tại: ${linkUrl}`)}`;

  const card = {
    "type": "message",
    "recipientEmail": userEmail,
    "attachments": [
      {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "contentUrl": null,
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": "📌 TIẾT DẠY DỰ GIỜ MỚI - GỬI ĐẾN TÀI KHOẢN TEAMS CỦA BẠN",
              "weight": "Bolder",
              "size": "Medium",
              "color": "Good"
            },
            {
              "type": "TextBlock",
              "text": `Kính gửi Thầy/Cô (${userEmail}),\n\nThầy/Cô **${senderTeacherName}** trong Tổ chuyên môn vừa mở tiết dạy dự giờ mới. Kính mời Thầy/Cô đăng ký tham dự.`,
              "wrap": true,
              "spacing": "Medium"
            },
            {
              "type": "FactSet",
              "facts": [
                { "title": "📚 Bài dạy / Chủ đề:", "value": slot.topic || "Tiết dạy dự giờ" },
                { "title": "📖 Môn học:", "value": slot.subjectName },
                { "title": "🏫 Cấp & Khối lớp:", "value": `${slot.level} - ${slot.grade} (${slot.className || "Lớp học"})` },
                { "title": "📍 Cơ sở & Phòng:", "value": `${slot.campusName || "Trường"} - ${slot.room || "Phòng học"}` },
                { "title": "📅 Ngày dạy:", "value": formatDateVi(slot.date) },
                { "title": "⏰ Tiết dạy:", "value": `${slot.startTime} - ${slot.endTime}` }
              ]
            }
          ],
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "🔗 Đăng Ký Dự Giờ Ngay",
              "url": linkUrl
            },
            {
              "type": "Action.OpenUrl",
              "title": "💬 Trò Chuyện Trực Tiếp Trên MS Teams",
              "url": teamsChatDeepLink
            }
          ]
        }
      }
    ]
  };

  const webhookUrl = process.env.MICROSOFT_TEAMS_POWER_AUTOMATE_URL || DEFAULT_TEAMS_WEBHOOK;
  if (webhookUrl) {
    return await sendTeamsWebhookMessage(webhookUrl, card);
  }
  return false;
}
