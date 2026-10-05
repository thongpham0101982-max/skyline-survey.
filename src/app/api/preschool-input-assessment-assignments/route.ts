// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");
    const batchId = searchParams.get("batchId");
    const grade = searchParams.get("grade");

    if (!periodId) {
      return NextResponse.json({ error: "Missing periodId parameter" }, { status: 400 });
    }

    const where: any = { periodId };
    
    if (batchId && batchId !== "all" && batchId !== "null") {
      where.OR = [
        { batchId: batchId },
        { batchId: null }
      ];
    } else if (batchId === "null") {
      where.batchId = null;
    }

    if (grade && grade !== "all") {
      const parts = grade.split(",").map(x => x.trim()).filter(Boolean);
      const mappedGrades = [];
      for (const p of parts) {
        mappedGrades.push(p);
        if (p === "12 đến 18 tháng" || p === "12-18 tháng") mappedGrades.push("Nhà trẻ 12-18 tháng");
        else if (p === "18 đến 24 tháng" || p === "18-24 tháng") mappedGrades.push("Nhà trẻ 18-24 tháng");
        else if (p === "24 đến 36 tháng" || p === "24-36 tháng") mappedGrades.push("Nhà trẻ 24-36 tháng");
        else if (p === "3 đến 4 tuổi" || p === "3-4 tuổi") mappedGrades.push("Mẫu giáo bé");
        else if (p === "4 đến 5 tuổi" || p === "4-5 tuổi") mappedGrades.push("Mẫu giáo nhỡ");
        else if (p === "5 đến 6 tuổi" || p === "5-6 tuổi") mappedGrades.push("Mẫu giáo lớn");
      }
      where.grade = { in: mappedGrades };
    }

    const assignments = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true }
        },
        delegatedUser: {
          select: { id: true, fullName: true, email: true, role: true }
        },
        period: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Preschool assignments GET error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, periodId, batchId, grade, userIds, assignmentId, delegatedUserId } = body;

    // --- Action: Update Delegation ---
    if (action === "UPDATE_DELEGATION") {
      if (!assignmentId) {
        return NextResponse.json({ error: "Missing assignmentId" }, { status: 400 });
      }

      await (prisma as any).preschoolInputAssessmentTeacherAssignment.update({
        where: { id: assignmentId },
        data: { delegatedUserId: delegatedUserId || null }
      });

      return NextResponse.json({ success: true });
    }

    // --- Action: Save Assignments ---
    if (action === "ASSIGN") {
      if (!periodId || !grade || !Array.isArray(userIds)) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
      }

      const normalizedBatchId = (batchId && batchId !== "all" && batchId !== "null") ? batchId : null;

      const grades = Array.isArray(grade) ? grade : [grade];
      const transactionOperations = [];
      let totalCreated = 0;
      let totalDeleted = 0;

      // Restrict assignment to at most 1 teacher per class/grade
      const finalUserIds = userIds.slice(0, 1);

      for (const g of grades) {
        // Find existing assignments for this period, batch, and grade
        const existing = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
          where: { periodId, batchId: normalizedBatchId, grade: g }
        });
        const existingUserIds = existing.map((a: any) => a.userId);

        const toDelete = existing.filter((a: any) => !finalUserIds.includes(a.userId));
        const toCreate = finalUserIds.filter((id: string) => !existingUserIds.includes(id));

        totalCreated += toCreate.length;
        totalDeleted += toDelete.length;

        if (toDelete.length > 0) {
          transactionOperations.push(
            (prisma as any).preschoolInputAssessmentTeacherAssignment.deleteMany({
              where: { id: { in: toDelete.map((a: any) => a.id) } }
            })
          );
        }

        for (const userId of toCreate) {
          transactionOperations.push(
            (prisma as any).preschoolInputAssessmentTeacherAssignment.create({
              data: { periodId, batchId: normalizedBatchId, userId, grade: g }
            })
          );
        }
      }

      if (transactionOperations.length > 0) {
        await (prisma as any).$transaction(transactionOperations);
      }

      return NextResponse.json({ success: true, createdCount: totalCreated, deletedCount: totalDeleted });
    }

    // --- Action: Notify Single or All ---
    if (action === "NOTIFY_SINGLE" || action === "NOTIFY_ALL") {
      let targetAssignments = [];

      if (action === "NOTIFY_SINGLE") {
        if (!assignmentId) {
          return NextResponse.json({ error: "Missing assignmentId" }, { status: 400 });
        }
        const single = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findUnique({
          where: { id: assignmentId },
          include: {
            user: {
              include: {
                teacher: {
                  include: {
                    departmentRel: true
                  }
                }
              }
            },
            period: true,
            batch: true
          }
        });
        if (single) targetAssignments.push(single);
      } else {
        // NOTIFY_ALL
        if (!periodId || !grade) {
          return NextResponse.json({ error: "Missing periodId or grade" }, { status: 400 });
        }
        const normalizedBatchId = (batchId && batchId !== "all" && batchId !== "null") ? batchId : null;
        
        let gradeQuery: any = grade;
        if (typeof grade === "string" && grade.includes(",")) {
          gradeQuery = { in: grade.split(",") };
        } else if (Array.isArray(grade)) {
          gradeQuery = { in: grade };
        }

        const list = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
          where: { periodId, batchId: normalizedBatchId, grade: gradeQuery },
          include: {
            user: {
              include: {
                teacher: {
                  include: {
                    departmentRel: true
                  }
                }
              }
            },
            period: true,
            batch: true
          }
        });
        targetAssignments = list;
      }

      if (targetAssignments.length === 0) {
        return NextResponse.json({ success: true, sentCount: 0, message: "No assignments found to notify" });
      }

      const host = req.headers.get("host") || "skyline-survey.vercel.app";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || `${protocol}://${host}`;

      let sentCount = 0;
      let failedCount = 0;
      const errors = [];

      for (const assign of targetAssignments) {
        const user = assign.user;
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

        const periodName = assign.period?.name || "Kỳ khảo sát";
        const batchName = assign.batch?.name || "Tất cả các đợt";
        const gradeLabel = assign.grade;

        const emailHtml = `
          <!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thông báo Phân công Khảo sát Năng lực Mầm non</title>
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
                                🏫 BẬC MẦM NON • HỆ THỐNG GIÁO DỤC SKY-LINE
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
                                ĐÁNH GIÁ NĂNG LỰC ĐẦU VÀO TRẺ MẦM NON
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
                          Ban Khảo thí trân trọng thông báo Thầy/Cô đã được phân công thực hiện đánh giá năng lực đầu vào cho các bé bậc Mầm non. Chi tiết thông tin phân công như sau:
                        </p>
                      </td>
                    </tr>

                    <!-- INFO CARD -->
                    <tr>
                      <td style="padding: 0 28px 20px 28px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #CCFBF1; border-left: 4px solid #00A19A; padding: 18px 20px;">
                          <tr>
                            <td style="padding: 6px 0; width: 32%; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">KỲ KHẢO SÁT:</td>
                            <td style="padding: 6px 0; font-size: 14px; font-weight: 800; color: #003B3A;">${periodName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">ĐỢT KHẢO SÁT:</td>
                            <td style="padding: 6px 0; font-size: 14px; font-weight: 800; color: #047857;">${batchName}</td>
                          </tr>
                          ${teacher?.departmentRel?.name ? `
                          <tr>
                            <td style="padding: 6px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">TỔ CHUYÊN MÔN:</td>
                            <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #1E293B;">${teacher.departmentRel.name}</td>
                          </tr>
                          ` : ""}
                          <tr>
                            <td style="padding: 6px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">NHÓM TUỔI / LỚP:</td>
                            <td style="padding: 6px 0; font-size: 14px; font-weight: 800; color: #1E293B;">
                              <span style="display: inline-block; padding: 4px 12px; background-color: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; border-radius: 50px; font-size: 12px; font-weight: 800;">${gradeLabel}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- ACTION CTA -->
                    <tr>
                      <td style="padding: 0 28px 28px 28px; text-align: center;">
                        <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748B; font-style: italic; line-height: 1.5;">
                          Vui lòng truy cập cổng thông tin khảo sát để cập nhật điểm và nhận xét cho các bé.
                        </p>
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                          <tr>
                            <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                              <a href="${baseUrl}/admin/preschool-input-assessments" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
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
            subject: `[Sky-line SMS - Mầm Non] Phân công Khảo sát Năng lực Đầu vào - Bé ${gradeLabel}`,
            html: emailHtml,
            replyTo: "bankhaothi@skylineschool.edu.vn"
          });

          if (mailRes && mailRes.success) {
            sentCount++;
          } else {
            failedCount++;
            errors.push(`Thất bại khi gửi cho ${user.fullName} (${targetEmail}): ${mailRes?.error || "Lỗi SMTP"}`);
          }
        } catch (err) {
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

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
  } catch (error) {
    console.error("Preschool assignments POST error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });
    }

    await (prisma as any).preschoolInputAssessmentTeacherAssignment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Preschool assignments DELETE error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
