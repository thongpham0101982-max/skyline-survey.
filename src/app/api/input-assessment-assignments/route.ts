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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, periodId, batchId, assignments } = body;
    
    if (action === "BULK_ASSIGN") {
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
          const itemsHtml = itemsArray.map(item => {
             const systemsStr = item.systems.join(", ");
             return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                   <td style="padding: 10px; font-size: 14px; color: #1e293b; font-weight: 600;">${item.subjectName}</td>
                   <td style="padding: 10px; font-size: 14px; color: #475569; text-align: center;">Khối ${item.grade}</td>
                   <td style="padding: 10px; font-size: 14px; text-align: center;"><span style="display: inline-block; padding: 2px 8px; background-color: #fef3c7; color: #d97706; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${systemsStr}</span></td>
                </tr>
             `;
          }).join("");
          
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Phân công Khảo sát Năng lực Phổ thông</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 20px 0;">
                <tr>
                  <td align="center">
                    <table width="650" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); padding: 35px 30px; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">THÔNG BÁO PHÂN CÔNG KHẢO SÁT</h1>
                          <p style="margin: 5px 0 0 0; color: #e0f7fa; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Hệ Phổ thông - Hệ thống Trường Sky-Line</p>
                        </td>
                      </tr>
                      <!-- Greetings -->
                      <tr>
                        <td style="padding: 30px 30px 15px 30px;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">Kính gửi Thầy/Cô ${user.fullName},</p>
                          <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Ban Khảo thí xin thông báo Thầy/Cô đã được phân công thực hiện chấm/khảo sát năng lực đầu vào cho học sinh bậc Phổ thông. Chi tiết thông tin phân công như sau:
                          </p>
                        </td>
                      </tr>
                      <!-- Info Table -->
                      <tr>
                        <td style="padding: 0 30px 15px 30px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 20px;">
                            <tr>
                              <td style="padding-bottom: 5px; width: 30%; font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Kỳ Khảo sát:</td>
                              <td style="padding-bottom: 5px; font-size: 14px; font-weight: bold; color: #1e293b;">${group.periodName}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Đợt Khảo sát:</td>
                              <td style="font-size: 14px; font-weight: bold; color: #1e293b;">${group.batchName}</td>
                            </tr>
                          </table>
                          
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            <thead>
                              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 12px 10px; text-align: left; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Môn học</th>
                                <th style="padding: 12px 10px; text-align: center; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 25%;">Khối</th>
                                <th style="padding: 12px 10px; text-align: center; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 25%;">Hệ học</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${itemsHtml}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <!-- Action Link -->
                      <tr>
                        <td style="padding: 15px 30px 30px 30px; text-align: center;">
                          <p style="margin: 0 0 15px 0; font-size: 13px; color: #64748b; font-style: italic;">
                            Vui lòng truy cập cổng thông tin khảo sát để cập nhật điểm thi và đánh giá năng lực của học sinh.
                          </p>
                          <a href="${baseUrl}/teacher/input-assessments" style="display: inline-block; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; color: #ffffff; background-color: #4f46e5; text-decoration: none; border: 1px solid #4338ca; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                            Truy cập Cổng Khảo Sát
                          </a>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
                          <p style="margin: 0;">Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.</p>
                          <p style="margin: 4px 0 0 0; font-weight: bold; color: #475569;">HỘI ĐỒNG TUYỂN SINH - HỆ THỐNG GIÁO DỤC SKY-LINE</p>
                          <p style="margin: 8px 0 0 0; color: #4f46e5; font-weight: 600;">Mọi thắc mắc vui lòng liên hệ Ban Khảo thí qua email: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #4f46e5; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a></p>
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
