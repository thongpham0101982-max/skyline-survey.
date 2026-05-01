import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

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
       

       // Send email notification to the teacher
       if (successCount > 0 && assignments.length > 0) {
           try {
               const firstTeacherId = assignments[0].teacherId;
               const teacherUser = await prisma.user.findUnique({ where: { id: firstTeacherId } });
               const teacherRecord = await prisma.teacher.findUnique({ where: { userId: firstTeacherId } });
               
               if (teacherUser && teacherRecord && teacherRecord.email) {
                   const period = await prisma.inputAssessmentPeriod.findUnique({ where: { id: periodId } });
                   const batch = batchId ? await prisma.inputAssessmentBatch.findUnique({ where: { id: batchId } }) : null;
                   
                   const subjectIds = [...new Set(assignments.map(a => a.subjectId))];
                   const subjects = await prisma.subject.findMany({ where: { id: { in: subjectIds } } });
                   const subjectMap = new Map(subjects.map(s => [s.id, s.subjectName]));
                   
                   let assignmentsListHtml = "";
                   assignments.forEach(a => {
                       const subName = subjectMap.get(a.subjectId) || "Môn học";
                       assignmentsListHtml += `<li><strong>${subName}</strong> - Khối: ${a.grade || "Tất cả"} - Hệ: ${a.educationSystem || "Tất cả"}</li>`;
                   });
                   
                   const periodStr = `${period?.name || 'Kỳ khảo sát'} ${batch ? '- ' + batch.name : ''}`;
                   
                   const html = `
                   <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                       <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
                           <h2 style="color: white; margin: 0;">Thông Báo Phân Công Khảo Sát</h2>
                       </div>
                       <div style="padding: 24px; color: #334155; line-height: 1.6;">
                           <p>Kính gửi Thầy/Cô <strong>${teacherUser.fullName}</strong>,</p>
                           <p>Ban Giám Hiệu xin thông báo Thầy/Cô vừa được phân công nhập điểm cho đợt khảo sát: <strong>${periodStr}</strong>.</p>
                           <p>Danh sách các môn học được phân công:</p>
                           <ul style="background-color: #f8fafc; padding: 16px 16px 16px 32px; border-radius: 6px; border-left: 4px solid #4f46e5;">
                               ${assignmentsListHtml}
                           </ul>
                           <p>Vui lòng đăng nhập vào hệ thống Portal Đánh giá để tiến hành nhập kết quả cho học sinh.</p>
                           <p>Trân trọng,<br/><strong>Ban Quản Trị Hệ Thống Skyline Survey</strong></p>
                       </div>
                   </div>
                   `;
                   
                   // Send mail and await to prevent serverless execution halt
                   const mailResult = await sendMail(teacherRecord.email, `[Skyline Survey] Phân công đánh giá: ${periodStr}`, html);
                   if (mailResult && !mailResult.success) {
                       return NextResponse.json({ success: true, count: successCount, emailError: mailResult.error });
                   }
               }
           } catch(e) {
               console.error("Failed to send assignment notification email", e);
               return NextResponse.json({ success: true, count: successCount, emailError: e.message || String(e) });
           }
       }
       return NextResponse.json({ success: true, count: successCount });
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
