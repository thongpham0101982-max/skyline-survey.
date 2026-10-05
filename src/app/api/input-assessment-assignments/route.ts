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
          // Robust email resolution
          let targetEmail = (teacher?.email || user?.email || "").trim();
          if (teacher?.teacherCode === "0201000094" || teacher?.teacherCode === "020100094" || user?.fullName?.includes("Phạm Nguyên Thông")) {
            targetEmail = "thongpn@skylineschool.edu.vn";
          } else if (targetEmail && !targetEmail.includes("@")) {
            targetEmail = `${targetEmail}@skylineschool.edu.vn`;
          }
          
          if (!targetEmail || !targetEmail.includes("@")) {
             failedCount++;
             errors.push(`Giáo viên ${user?.fullName || "Chưa xác định"} không có email hợp lệ: ${targetEmail || "Không có"}`);
             continue;
          }
          
          const itemsArray = Object.values(group.items);
          const itemsHtml = itemsArray.map((item, idx) => {
             const systemsStr = item.systems.join(", ");
             const bgRow = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
             return `
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${bgRow};">
                   <td style="padding: 12px 14px; font-size: 13.5px; color: #003B3A; font-weight: 700;">${item.subjectName}</td>
                   <td style="padding: 12px 14px; font-size: 13px; color: #334155; text-align: center; font-weight: 600;">Khối ${item.grade}</td>
                   <td style="padding: 12px 14px; text-align: center;">
                     <span style="display: inline-block; padding: 3px 10px; background-color: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; border-radius: 50px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${systemsStr || "Tiêu chuẩn"}</span>
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
            <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 28px 12px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
                      
                      <!-- HEADER BANNER -->
                      <tr>
                        <td bgcolor="#003B3A" style="padding: 30px 24px; text-align: center; background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%);">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                            <tr>
                              <td align="center" style="padding-bottom: 8px;">
                                <span style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                                  🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td align="center">
                                <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                                  THÔNG BÁO PHÂN CÔNG KHẢO SÁT
                                </h1>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding-top: 6px;">
                                <div style="font-size: 12.5px; font-weight: 600; color: #CCFBF1; letter-spacing: 0.5px;">
                                  HỆ PHỔ THÔNG • KHẢO SÁT NĂNG LỰC ĐẦU VÀO
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- GREETINGS -->
                      <tr>
                        <td style="padding: 28px 28px 16px 28px; color: #1E293B;">
                          <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                            Kính gửi Thầy/Cô ${user.fullName},
                          </p>
                          <p style="margin: 0 0 18px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Ban Khảo thí trân trọng thông báo Thầy/Cô đã được phân công thực hiện chấm/khảo sát năng lực đầu vào cho học sinh bậc Phổ thông. Chi tiết thông tin phân công như sau:
                          </p>
                        </td>
                      </tr>

                      <!-- INFO CARD -->
                      <tr>
                        <td style="padding: 0 28px 20px 28px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #CCFBF1; border-left: 4px solid #00A19A; padding: 18px 20px;">
                            <tr>
                              <td style="padding: 6px 0; width: 32%; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">KỲ KHẢO SÁT:</td>
                              <td style="padding: 6px 0; font-size: 14px; font-weight: 800; color: #003B3A;">${group.periodName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">ĐỢT KHẢO SÁT:</td>
                              <td style="padding: 6px 0; font-size: 14px; font-weight: 800; color: #047857;">${group.batchName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- ASSIGNMENT TABLE -->
                      <tr>
                        <td style="padding: 0 28px 24px 28px;">
                          <div style="border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                              <thead>
                                <tr bgcolor="#003B3A" style="background-color: #003B3A;">
                                  <th style="padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px;">Môn học</th>
                                  <th style="padding: 12px 14px; text-align: center; font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; width: 25%;">Khối</th>
                                  <th style="padding: 12px 14px; text-align: center; font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; width: 30%;">Hệ học</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${itemsHtml}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>

                      <!-- ACTION CTA -->
                      <tr>
                        <td style="padding: 0 28px 28px 28px; text-align: center;">
                          <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748B; font-style: italic; line-height: 1.5;">
                            Vui lòng truy cập cổng thông tin khảo sát để cập nhật điểm thi và đánh giá năng lực của học sinh.
                          </p>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                            <tr>
                              <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                                <a href="${baseUrl}/teacher/input-assessments" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                                  TRUY CẬP CỔNG KHẢO SÁT &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- OFFICIAL BRAND FOOTER -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 24px; text-align: center; border-top: 3px solid #00A19A;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                          </p>
                          <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                            BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                          </p>
                          <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                            Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">bankhaothi@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
                          </p>
                          <p style="margin: 6px 0 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.4);">
                            Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.
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
             const mailRes = await sendEmail({
                to: targetEmail,
                subject: `[Sky-line SMS] Thông báo Phân công Khảo sát Năng lực Học sinh Phổ thông`,
                html: emailHtml,
                replyTo: "bankhaothi@skylineschool.edu.vn"
             });

             if (mailRes && mailRes.success) {
                sentCount++;
             } else {
                failedCount++;
                errors.push(`Thất bại khi gửi cho ${user.fullName} (${targetEmail}): ${mailRes?.error || "Lỗi SMTP"}`);
             }
          } catch(err) {
             failedCount++;
             errors.push(`Lỗi khi gửi cho ${user.fullName} (${targetEmail}): ${err.message}`);
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
