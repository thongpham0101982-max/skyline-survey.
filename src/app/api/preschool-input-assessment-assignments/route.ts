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
          <html>
          <head>
            <meta charset="utf-8">
            <title>Phân công Khảo sát Năng lực Mầm non</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 20px 0;" className="border border-slate-200 border-collapse">
              <tr>
                <td align="center" className="p-2 border border-slate-200">
                  <table width="650" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" className="border border-slate-200 border-collapse">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); padding: 35px 30px; text-align: center;" className="p-2 border border-slate-200">
                        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">THÔNG BÁO PHÂN CÔNG KHẢO SÁT</h1>
                        <p style="margin: 5px 0 0 0; color: #fdf2f8; font-size: 13px; font-weight: 500; text-transform: uppercase; tracking-wider: 1px;">Bậc Mầm non - Hệ thống Trường Sky-Line</p>
                      </td>
                    </tr>
                    <!-- Greetings -->
                    <tr>
                      <td style="padding: 30px 30px 15px 30px;" className="p-2 border border-slate-200">
                        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">Kính gửi Thầy/Cô ${user.fullName},</p>
                        <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                          Ban Khảo thí xin thông báo Thầy/Cô đã được phân công thực hiện đánh giá năng lực đầu vào cho các bé bậc Mầm non. Chi tiết thông tin phân công như sau:
                        </p>
                      </td>
                    </tr>
                    <!-- Assignment Card -->
                    <tr>
                      <td style="padding: 0 30px;" className="p-2 border border-slate-200">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f5f3ff; border-radius: 12px; border: 1px solid #ddd6fe; padding: 20px;" className="border border-slate-200 border-collapse">
                          <tr>
                            <td style="padding-bottom: 10px; border-bottom: 1px dashed #c084fc;">
                              <span style="font-size: 11px; font-weight: bold; color: #7c3aed; text-transform: uppercase;">Kỳ Khảo sát</span>
                              <div style="font-size: 14px; font-weight: bold; color: #1e1b4b; margin-top: 2px;">${periodName}</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0; border-bottom: 1px dashed #c084fc;">
                              <span style="font-size: 11px; font-weight: bold; color: #7c3aed; text-transform: uppercase;">Đợt Khảo sát</span>
                              <div style="font-size: 14px; font-weight: bold; color: #1e1b4b; margin-top: 2px;">${batchName}</div>
                            </td>
                          </tr>
                          ${teacher?.departmentRel?.name ? `
                          <tr>
                            <td style="padding: 10px 0; border-bottom: 1px dashed #c084fc;">
                              <span style="font-size: 11px; font-weight: bold; color: #7c3aed; text-transform: uppercase;">Tổ Chuyên môn</span>
                              <div style="font-size: 14px; font-weight: bold; color: #1e1b4b; margin-top: 2px;">${teacher.departmentRel.name}</div>
                            </td>
                          </tr>
                          ` : ""}
                          <tr>
                            <td style="padding-top: 10px;" className="p-2 border border-slate-200">
                              <span style="font-size: 11px; font-weight: bold; color: #7c3aed; text-transform: uppercase;">Nhóm tuổi được phân công</span>
                              <div style="font-size: 14px; font-weight: bold; color: #1e1b4b; margin-top: 2px;">${gradeLabel}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Action Link -->
                    <tr>
                      <td style="padding: 25px 30px; text-align: center;" className="p-2 border border-slate-200">
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #64748b; font-style: italic;">
                          Vui lòng truy cập cổng thông tin khảo sát để cập nhật điểm và nhận xét cho các bé.
                        </p>
                        <a href="${baseUrl}/admin/preschool-input-assessments" style="display: inline-block; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; color: #ffffff; background-color: #7c3aed; text-decoration: none; border: 1px solid #6d28d9; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2);">
                          Truy cập Cổng Khảo Sát
                        </a>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
                        <p style="margin: 0;">Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.</p>
                        <p style="margin: 4px 0 0 0; font-weight: bold; color: #475569;">HỘI ĐỒNG TUYỂN SINH - HỆ THỐNG GIÁO DỤC SKY-LINE</p>
                        <p style="margin: 8px 0 0 0; color: #7c3aed; font-weight: 600;">Mọi thắc mắc vui lòng liên hệ Ban Khảo thí qua email: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #7c3aed; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a></p>
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
