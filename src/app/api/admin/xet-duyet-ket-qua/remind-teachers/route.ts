import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { requireEntranceOperationsSession } from "@/lib/security-guard";

interface TeacherReminderItem {
  teacherUserId?: string;
  teacherName: string;
  teacherEmail: string;
  subjects: string[];
  students: {
    studentCode?: string;
    fullName: string;
    grade?: string;
    campus?: string;
    missingSubjects: string[];
  }[];
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireEntranceOperationsSession();
  if (error || !ctx) {
    return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      reminders,
      periodName,
      batchName,
      deadlineNote,
      ccEmails = [],
    }: {
      reminders: TeacherReminderItem[];
      periodName?: string;
      batchName?: string;
      deadlineNote?: string;
      ccEmails?: string[];
    } = body || {};

    if (!Array.isArray(reminders) || reminders.length === 0) {
      return NextResponse.json(
        { error: "Danh sách giáo viên cần nhắc nhở đang trống." },
        { status: 400 }
      );
    }

    const portalUrl = `${process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn"}/teacher/input-assessments`;
    const senderName = ctx.fullName || "Ban Khảo thí & Giáo vụ";
    const normalizedCc = Array.from(
      new Set(
        (Array.isArray(ccEmails) ? ccEmails : [])
          .map((e) => String(e || "").trim().toLowerCase())
          .filter((e) => e.includes("@"))
      )
    );

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const item of reminders) {
      const targetEmail = String(item.teacherEmail || "").trim();
      if (!targetEmail || !targetEmail.includes("@")) {
        failedCount++;
        errors.push(`${item.teacherName || "Giáo viên"}: Thiếu địa chỉ email hợp lệ.`);
        continue;
      }

      const studentRowsHtml = (item.students || [])
        .map(
          (st, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"};">
            <td style="padding: 8px 10px; border: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #475569;">${idx + 1}</td>
            <td style="padding: 8px 10px; border: 1px solid #E2E8F0; font-size: 12.5px; font-weight: 700; color: #003B3A;">${st.fullName}${st.studentCode ? ` <span style="font-weight:500; color:#64748B;">(${st.studentCode})</span>` : ""}</td>
            <td style="padding: 8px 10px; border: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #334155;">${st.grade ? `Khối ${String(st.grade).replace(/^Khối\s*/i, "")}` : "—"}</td>
            <td style="padding: 8px 10px; border: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #334155;">${st.campus || "—"}</td>
            <td style="padding: 8px 10px; border: 1px solid #E2E8F0; font-size: 12px; font-weight: 600; color: #B45309;">${(st.missingSubjects || []).join(", ")}</td>
          </tr>
        `
        )
        .join("");

      const subjectListStr = (item.subjects || []).join(", ");
      const emailSubject = `[Sky-Line SSM] Nhắc hoàn thành nhập điểm khảo sát đầu vào (${item.students.length} HS) — ${batchName || periodName || "Khảo sát đầu vào"}`;

      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; background-color: #F8FAFC; padding: 20px;">
          <div style="background-color: #FFFFFF; border-radius: 14px; border: 1px solid #E2E8F0; overflow: hidden;">
            <div style="background-color: #003B3A; padding: 20px 24px; color: #FFFFFF;">
              <div style="font-size: 11px; color: #5EEAD4; font-weight: 700; letter-spacing: 0.4px;">HỆ THỐNG GIÁO DỤC SKY-LINE • KHẢO SÁT ĐẦU VÀO</div>
              <div style="font-size: 18px; font-weight: 700; margin-top: 4px;">Yêu cầu hoàn thành nhập điểm &amp; nhận xét khảo sát</div>
            </div>
            <div style="padding: 22px 24px; color: #1E293B; font-size: 13.5px; line-height: 1.6;">
              <p style="margin: 0 0 12px 0;">Kính gửi Thầy/Cô <strong>${item.teacherName}</strong>,</p>
              <p style="margin: 0 0 14px 0;">
                Qua rà soát tiến độ <strong>${batchName || periodName || "Đợt khảo sát đầu vào"}</strong>, hiện còn <strong>${item.students.length} học sinh</strong> chưa có đủ kết quả ở nội dung khảo sát do Thầy/Cô phụ trách (${subjectListStr || "môn khảo sát"}).
              </p>
              ${
                deadlineNote
                  ? `<div style="margin: 0 0 16px 0; padding: 10px 14px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #D97706; border-radius: 8px; font-size: 12.5px; color: #92400E;">
                      <strong>Lưu ý / Thời hạn hoàn thành:</strong> ${deadlineNote}
                    </div>`
                  : ""
              }
              <table style="width: 100%; border-collapse: collapse; margin: 14px 0;">
                <thead>
                  <tr style="background-color: #003B3A; color: #FFFFFF;">
                    <th style="padding: 8px 10px; border: 1px solid #003B3A; font-size: 11.5px; text-align: center;">STT</th>
                    <th style="padding: 8px 10px; border: 1px solid #003B3A; font-size: 11.5px; text-align: left;">Học sinh</th>
                    <th style="padding: 8px 10px; border: 1px solid #003B3A; font-size: 11.5px; text-align: center;">Khối</th>
                    <th style="padding: 8px 10px; border: 1px solid #003B3A; font-size: 11.5px; text-align: center;">Cơ sở</th>
                    <th style="padding: 8px 10px; border: 1px solid #003B3A; font-size: 11.5px; text-align: left;">Nội dung còn thiếu</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentRowsHtml}
                </tbody>
              </table>
              <p style="margin: 14px 0 18px 0; font-size: 13px; color: #475569;">
                Kính đề nghị Thầy/Cô truy cập Cổng Giáo viên để hoàn thiện điểm số, nhận xét chuyên môn và bấm <strong>Xác nhận hoàn thành khảo sát</strong> để Giáo vụ kịp tổng hợp trình Giám đốc Cơ sở xét duyệt.
              </p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${portalUrl}" style="display: inline-block; background-color: #003B3A; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 10px; font-weight: 700; font-size: 13px;">
                  Mở Cổng nhập điểm khảo sát
                </a>
              </div>
              <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
                Người gửi: <strong>${senderName}</strong> • Hệ thống Quản trị Trường học Sky-Line (SSM)
              </div>
            </div>
          </div>
        </div>
      `;

      const mailRes = await sendEmail({
        to: targetEmail,
        cc: normalizedCc.length > 0 ? normalizedCc : undefined,
        subject: emailSubject,
        html,
        replyTo: "ktdbcl@skylineschool.edu.vn",
      });

      if (mailRes?.success) {
        sentCount++;
        if (item.teacherUserId) {
          await (prisma as any).notification
            .create({
              data: {
                userId: item.teacherUserId,
                title: `Nhắc hoàn thành điểm khảo sát (${item.students.length} HS)`,
                message: `Còn ${item.students.length} HS thiếu điểm ${subjectListStr} tại ${batchName || periodName || "đợt khảo sát"}. Vui lòng hoàn thành để kịp trình GĐCS xét duyệt.`,
                link: "/teacher/input-assessments",
                type: "REMINDER",
                category: "INPUT_ASSESSMENT",
                priority: "HIGH",
                sourceModule: "XET_DUYET_KET_QUA",
              },
            })
            .catch(() => {});
        }
      } else {
        failedCount++;
        errors.push(`${item.teacherName} (${targetEmail}): ${mailRes?.error || "Lỗi gửi email"}`);
      }
    }

    return NextResponse.json({
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors,
    });
  } catch (err: any) {
    console.error("POST /api/admin/xet-duyet-ket-qua/remind-teachers error:", err);
    return NextResponse.json(
      { error: err?.message || "Lỗi hệ thống khi gửi email nhắc giáo viên." },
      { status: 500 }
    );
  }
}
