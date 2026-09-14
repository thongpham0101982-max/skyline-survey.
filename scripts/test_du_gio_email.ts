import "dotenv/config";
import { sendEmail } from "../src/lib/mail";
import { renderObservationRequestForHost } from "../src/lib/email-templates";

async function main() {
  const targetEmail = "anhnt@skylineschool.edu.vn";
  console.log(`[Test] Chuẩn bị gửi email kiểm thử chức năng Dự giờ đến: ${targetEmail}`);

  const formattedDate = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skyline-survey.vercel.app";
  const directLink = `${baseUrl}/teacher/du-gio?tab=my_schedule`;

  const emailHtml = renderObservationRequestForHost({
    hostName: "Thầy/Cô Nguyễn Thị Ánh",
    observerName: "Phạm Nguyên Thông",
    observerCode: "0201000094",
    observerPosition: "Giáo viên / Ban Khảo thí",
    topic: "[Kiểm thử] Đề xuất tham gia dự giờ tiết dạy Toán học - Ứng dụng thực tế",
    subjectName: "Toán học",
    grade: "Khối 10",
    className: "Lớp 10A1",
    dateStr: formattedDate,
    period: "Tiết 2 (08:15 - 09:00)",
    notes: "Email gửi kiểm thử tự động từ Hệ thống Khảo sát & Dự giờ Skyline qua máy chủ Microsoft 365 Exchange Online.",
    directLink
  });

  const emailSubject = `[Skyline - Dự Giờ] Đề xuất xin dự giờ tiết dạy môn Toán học - Thầy/Cô Nguyễn Thị Ánh`;

  const result = await sendEmail({
    from: "HỆ THỐNG DỰ GIỜ SKY-LINE",
    to: targetEmail,
    subject: emailSubject,
    html: emailHtml,
    replyTo: "bankhaothi@skylineschool.edu.vn"
  });

  console.log("[Test Result]:", result);

  if (result.success) {
    console.log(`\n GỬI EMAIL THÀNH CÔNG ĐẾN: ${targetEmail}`);
    console.log(` MessageId: ${result.messageId}`);
  } else {
    console.error(`\n GỬI EMAIL THẤT BẠI: ${result.error}`);
  }
}

main().catch(console.error);
