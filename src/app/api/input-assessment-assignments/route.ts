// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");
    
    if (!periodId) {
       return NextResponse.json({ error: "Missing periodId" }, { status: 400 });
    }
    
    const assignments = await prisma.inputAssessmentTeacherAssignment.findMany({
      where: { periodId },
      include: {
        batch: true,
        user: true,
        subject: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, periodId, batchId, assignments } = body;
    
    if (action === "BULK_ASSIGN") {
       if (!Array.isArray(assignments)) {
           return NextResponse.json({ error: "assignments must be an array" }, { status: 400 });
       }
       let successCount = 0;
       
       // Override mode: delete existing assignments for the specific teacher in this period & batch
       if (assignments.length > 0) {
          const firstTeacher = assignments[0].teacherId;
          const isSingleTeacher = assignments.every(a => a.teacherId === firstTeacher);
          if (isSingleTeacher) {
              await prisma.inputAssessmentTeacherAssignment.deleteMany({
                  where: {
                      periodId,
                      batchId: batchId || null,
                      userId: firstTeacher
                  }
              });
          }
       }

       for (const a of assignments) {
          try {
             const existing = await prisma.inputAssessmentTeacherAssignment.findFirst({
                where: {
                   periodId,
                   batchId: batchId || null,
                   userId: a.teacherId,
                   subjectId: a.subjectId,
                   grade: a.grade,
                   educationSystem: a.educationSystem
                }
             });
             if (!existing) {
                await prisma.inputAssessmentTeacherAssignment.create({
                   data: {
                      periodId,
                      batchId: batchId || null,
                      userId: a.teacherId,
                      subjectId: a.subjectId,
                      grade: a.grade,
                      educationSystem: a.educationSystem
                   }
                });
             }
             successCount++;
          } catch(err) {
             console.error("Assignment err", err);
             return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
          }
       }
       

       return NextResponse.json({ success: true, count: successCount });
    }
    
    if (action === "NOTIFY_SINGLE" || action === "NOTIFY_ALL") {
       let targetAssignments = [];
       
       if (action === "NOTIFY_SINGLE") {
          const { userId, periodId, batchId } = body;
          if (!userId || !periodId) {
             return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
          }
          
          targetAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
             where: {
                userId,
                periodId,
                batchId: batchId || null
             },
             include: {
                user: {
                   include: {
                      teacher: true
                   }
                },
                period: true,
                batch: true,
                subject: true
             }
          });
       } else {
          // NOTIFY_ALL
          const { periodId, batchId } = body;
          if (!periodId) {
             return NextResponse.json({ error: "Missing periodId" }, { status: 400 });
          }
          
          targetAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
             where: {
                periodId,
                batchId: batchId || null
             },
             include: {
                user: {
                   include: {
                      teacher: true
                   }
                },
                period: true,
                batch: true,
                subject: true
             }
          });
       }

       if (targetAssignments.length === 0) {
          return NextResponse.json({ success: true, sentCount: 0, message: "No assignments found to notify" });
       }

       // Group assignments by teacher
       const teacherGroups = {};
       
       for (const a of targetAssignments) {
          const key = a.userId;
          if (!teacherGroups[key]) {
             teacherGroups[key] = {
                user: a.user,
                periodName: a.period?.name || "Kỳ khảo sát",
                batchName: a.batch?.name || "Tất cả các đợt",
                items: {}
              };
           }
           
           const subjectName = a.subject?.name || "Môn khảo sát";
           const grade = a.grade;
           const system = a.educationSystem;
           const itemKey = `${subjectName}_${grade}`;
           
           if (!teacherGroups[key].items[itemKey]) {
              teacherGroups[key].items[itemKey] = {
                 subjectName,
                 grade,
                 systems: []
              };
           }
           
           if (!teacherGroups[key].items[itemKey].systems.includes(system)) {
              teacherGroups[key].items[itemKey].systems.push(system);
           }
        }

       const host = req.headers.get("host") || "skyline-survey.vercel.app";
       const protocol = req.headers.get("x-forwarded-proto") || "https";
       const baseUrl = `${protocol}://${host}`;
       
       let sentCount = 0;
       let failedCount = 0;
       const errors = [];
       
       for (const [userId, group] of Object.entries(teacherGroups)) {
          const user = group.user;
          const teacher = user?.teacher;
          const targetEmail = teacher?.email || user?.email;
          
          if (!targetEmail || !targetEmail.includes("@")) {
             failedCount++;
             errors.push(`Teacher ${user?.fullName || "Unknown"} has invalid email: ${targetEmail || "none"}`);
             continue;
          }
          
          const itemsArray = Object.values(group.items);
          const itemsHtml = itemsArray.map((item, idx) => {
             const systemsStr = item.systems.join(", ");
             const bgRow = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
             return `
                <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${bgRow};">
                   <td style="padding: 12px 14px; font-size: 13.5px; color: #1E1B4B; font-weight: 700;">${item.subjectName}</td>
                   <td style="padding: 12px 14px; font-size: 13px; color: #334155; text-align: center; font-weight: 600;">Khối ${item.grade}</td>
                   <td style="padding: 12px 14px; text-align: center;">
                     <span style="display: inline-block; padding: 3px 10px; background-color: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; border-radius: 50px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${systemsStr || "Tiêu chuẩn"}</span>
                   </td>
                </tr>
             `;
          }).join("");
          
          const emailHtml = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Thông báo Phân công Khảo sát Năng lực Học sinh Phổ thông</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
                <tr>
                  <td align="center">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 660px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 166, 169, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                      <!-- Header -->
                      <tr>
                        <td style="background: #ffffff; padding: 32px 28px 24px; text-align: center; border-bottom: 3px solid #00A6A9;">
                          <div style="display: inline-block; background: rgba(0, 166, 169, 0.08); padding: 5px 16px; border-radius: 50px; margin-bottom: 12px; border: 1px solid rgba(0, 166, 169, 0.25);">
                            <span style="color: #00A6A9; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                          </div>
                          <h1 style="margin: 0; color: #1E1B4B; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.3px; line-height: 1.3;">THÔNG BÁO PHÂN CÔNG KHẢO SÁT</h1>
                          <p style="margin: 8px 0 0 0; color: #007A87; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">HỆ PHỔ THÔNG • KHẢO SÁT NĂNG LỰC ĐẦU VÀO</p>
                        </td>
                      </tr>
                      <!-- Greetings -->
                      <tr>
                        <td style="padding: 28px 32px 16px 32px;">
                          <p style="margin: 0; font-size: 15px; font-weight: 800; color: #1E1B4B;">Kính gửi Thầy/Cô ${user.fullName},</p>
                          <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Ban Khảo thí xin trân trọng thông báo Thầy/Cô đã được phân công thực hiện chấm/khảo sát năng lực đầu vào cho học sinh bậc Phổ thông. Chi tiết thông tin phân công như sau:
                          </p>
                        </td>
                      </tr>
                      <!-- Info Card -->
                      <tr>
                        <td style="padding: 0 32px 20px 32px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdfa; border-radius: 14px; border: 1px solid #ccfbf1; padding: 18px 20px;">
                            <tr>
                              <td style="padding-bottom: 8px; width: 32%; font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">KỲ KHẢO SÁT:</td>
                              <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #1E1B4B;">${group.periodName}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">ĐỢT KHẢO SÁT:</td>
                              <td style="font-size: 14px; font-weight: 800; color: #1E1B4B;">${group.batchName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Assignment Table -->
                      <tr>
                        <td style="padding: 0 32px 24px 32px;">
                          <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                              <thead>
                                <tr style="background: linear-gradient(135deg, #00A6A9 0%, #48BFE3 100%);">
                                  <th style="padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Môn học</th>
                                  <th style="padding: 12px 14px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; width: 25%;">Khối</th>
                                  <th style="padding: 12px 14px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; width: 30%;">Hệ học</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${itemsHtml}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                      <!-- Action CTA -->
                      <tr>
                        <td style="padding: 0 32px 30px 32px; text-align: center;">
                          <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; font-style: italic; line-height: 1.5;">
                            Vui lòng truy cập cổng thông tin khảo sát để cập nhật điểm thi và đánh giá năng lực của học sinh.
                          </p>
                          <a href="${baseUrl}/teacher/input-assessments" target="_blank" style="display: inline-block; padding: 13px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #00A6A9 0%, #48BFE3 100%); text-decoration: none; box-shadow: 0 4px 14px rgba(0, 166, 169, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
                            Truy cập Cổng Khảo Sát
                          </a>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                          <img src="${baseUrl}/images/logo.png" alt="Sky-Line" style="height: 32px; margin-bottom: 10px;" onerror="this.style.display='none'">
                          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #1E1B4B; text-transform: uppercase; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Nơi học sinh học cách yêu thương, chia sẻ, tự lập &amp; có trách nhiệm.</p>
                          <p style="margin: 6px 0 0 0; font-size: 10px; color: #94a3b8;">Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.</p>
                          <p style="margin: 8px 0 0 0; font-size: 11px; color: #00A6A9; font-weight: 600;">
                            Mọi thắc mắc vui lòng liên hệ Ban Khảo thí qua email: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #00A6A9; font-weight: bold; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a>
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
          
          try {
             await sendEmail({
                to: targetEmail,
                subject: `[Sky-Line] Thông báo Phân công Khảo sát Năng lực Học sinh Phổ thông`,
                html: emailHtml,
                replyTo: "bankhaothi@skylineschool.edu.vn"
             });
             sentCount++;
          } catch(err) {
             failedCount++;
             errors.push(`Failed sending to ${user.fullName} (${targetEmail}): ${err.message}`);
          }
       }
       
       return NextResponse.json({
          success: true,
          sentCount,
          failedCount,
          errors
       });
     }

     return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    
    if (ids) {
      const idArr = ids.split(",");
      await prisma.inputAssessmentTeacherAssignment.deleteMany({ where: { id: { in: idArr } } });
      return NextResponse.json({ success: true, count: idArr.length });
    }
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await prisma.inputAssessmentTeacherAssignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { action, id, status } = body;
    
    if (action === "RESOLVE_UNLOCK") {
       await prisma.inputAssessmentTeacherAssignment.update({
          where: { id },
          data: { unlockRequestStatus: status }
       });
       return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
