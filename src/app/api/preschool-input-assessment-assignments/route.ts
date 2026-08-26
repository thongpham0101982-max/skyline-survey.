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

      const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;

      let sentCount = 0;
      let failedCount = 0;
      const errors = [];

      for (const assign of targetAssignments) {
        const user = assign.user;
        const teacher = user?.teacher;
        const targetEmail = teacher?.email || user?.email;

        if (!targetEmail || !targetEmail.includes("@")) {
          failedCount++;
          errors.push(`Teacher ${user?.fullName || "Unknown"} has invalid email: ${targetEmail || "none"}`);
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
                        <p style="margin: 8px 0 0 0; color: #007A87; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">BẬC MẦM NON • ĐÁNH GIÁ NĂNG LỰC ĐẦU VÀO</p>
                      </td>
                    </tr>
                    <!-- Greetings -->
                    <tr>
                      <td style="padding: 28px 32px 16px 32px;">
                        <p style="margin: 0; font-size: 15px; font-weight: 800; color: #1E1B4B;">Kính gửi Thầy/Cô ${user.fullName},</p>
                        <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                          Ban Khảo thí xin trân trọng thông báo Thầy/Cô đã được phân công thực hiện đánh giá năng lực đầu vào cho các bé bậc Mầm non. Chi tiết thông tin phân công như sau:
                        </p>
                      </td>
                    </tr>
                    <!-- Assignment Card -->
                    <tr>
                      <td style="padding: 0 32px 20px 32px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdfa; border-radius: 14px; border: 1px solid #ccfbf1; padding: 18px 20px;">
                          <tr>
                            <td style="padding-bottom: 10px; width: 35%; font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">KỲ KHẢO SÁT:</td>
                            <td style="padding-bottom: 10px; font-size: 14px; font-weight: 800; color: #1E1B4B;">${periodName}</td>
                          </tr>
                          <tr>
                            <td style="padding-bottom: 10px; font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">ĐỢT KHẢO SÁT:</td>
                            <td style="padding-bottom: 10px; font-size: 14px; font-weight: 800; color: #1E1B4B;">${batchName}</td>
                          </tr>
                          ${teacher?.departmentRel?.name ? `
                          <tr>
                            <td style="padding-bottom: 10px; font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">TỔ CHUYÊN MÔN:</td>
                            <td style="padding-bottom: 10px; font-size: 14px; font-weight: 800; color: #1E1B4B;">${teacher.departmentRel.name}</td>
                          </tr>
                          ` : ""}
                          <tr>
                            <td style="font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">NHÓM TUỔI / LỚP:</td>
                            <td style="font-size: 14px; font-weight: 800; color: #1E1B4B;">
                              <span style="display: inline-block; padding: 4px 12px; background-color: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; border-radius: 50px; font-size: 12px; font-weight: 800;">${gradeLabel}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Action Link -->
                    <tr>
                      <td style="padding: 0 32px 30px 32px; text-align: center;">
                        <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; font-style: italic; line-height: 1.5;">
                          Vui lòng truy cập cổng thông tin khảo sát để cập nhật điểm và nhận xét cho các bé.
                        </p>
                        <a href="${baseUrl}/admin/preschool-input-assessments" target="_blank" style="display: inline-block; padding: 13px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #00A6A9 0%, #48BFE3 100%); text-decoration: none; box-shadow: 0 4px 14px rgba(0, 166, 169, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
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
            subject: `[Sky-Line Preschool] Phân công Khảo sát Năng lực Đầu vào - Bé ${gradeLabel}`,
            html: emailHtml,
            replyTo: "bankhaothi@skylineschool.edu.vn"
          });
          sentCount++;
        } catch (err) {
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
