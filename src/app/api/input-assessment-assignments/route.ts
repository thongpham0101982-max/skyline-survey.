// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { auth } from "@/lib/auth";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";
import { getCampusGiaovuEmail } from "@/lib/orientation/service";

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
        batch: {
          include: {
            sessions: {
              select: { id: true, sessionCode: true, name: true, sessionDate: true, startTime: true, endTime: true, room: true, status: true }
            }
          }
        },
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
    const { action, periodId, batchId, sessionId, assignments } = body;
    
    if (action === "BULK_ASSIGN") {
       if (!Array.isArray(assignments)) {
           return NextResponse.json({ error: "assignments must be an array" }, { status: 400 });
       }
       let resolvedPeriodId = periodId || null;
       let resolvedBatchId = batchId || null;

       // Nếu phân công theo Phiên / Lịch ca thi (sessionId), tự động đồng bộ/khởi tạo Đợt khảo sát tương ứng
       if (sessionId) {
          const sessionObj = await (prisma as any).inputAssessmentSession.findUnique({
             where: { id: sessionId },
             include: {
                studentSessions: {
                   include: { student: true }
                }
             }
          });
          if (sessionObj) {
             if (!resolvedPeriodId) {
                if (sessionObj.periodId) {
                   resolvedPeriodId = sessionObj.periodId;
                } else {
                   const lePeriod = await prisma.inputAssessmentPeriod.findFirst({
                      where: {
                         academicYearId: sessionObj.academicYearId,
                         OR: [
                            { name: { contains: "Khảo sát lẻ" } },
                            { name: { contains: "lẻ" } }
                         ]
                      }
                   });
                   if (lePeriod) resolvedPeriodId = lePeriod.id;
                }
             }
             if (!resolvedBatchId) {
                if (sessionObj.batchId) {
                   resolvedBatchId = sessionObj.batchId;
                } else if (resolvedPeriodId) {
                   const existingBatch = await prisma.inputAssessmentBatch.findFirst({
                      where: {
                         periodId: resolvedPeriodId,
                         name: sessionObj.name
                      }
                   });
                   if (existingBatch) {
                      resolvedBatchId = existingBatch.id;
                   } else {
                      const maxBatch = await prisma.inputAssessmentBatch.aggregate({
                         where: { periodId: resolvedPeriodId },
                         _max: { batchNumber: true }
                      });
                      const nextBatchNum = (maxBatch._max?.batchNumber || 0) + 1;
                      const sDate = sessionObj.sessionDate ? new Date(sessionObj.sessionDate) : new Date();
                      const createdBatch = await prisma.inputAssessmentBatch.create({
                         data: {
                            periodId: resolvedPeriodId,
                            batchNumber: nextBatchNum,
                            name: sessionObj.name,
                            campusId: sessionObj.campusId || null,
                            startDate: sDate,
                            endDate: sDate,
                            status: "ACTIVE"
                         }
                      });
                      resolvedBatchId = createdBatch.id;
                   }
                }
             }

             // Cập nhật lại periodId & batchId cho Phiên / Lịch ca thi nếu chưa có
             if ((resolvedPeriodId && sessionObj.periodId !== resolvedPeriodId) || (resolvedBatchId && sessionObj.batchId !== resolvedBatchId)) {
                await (prisma as any).inputAssessmentSession.update({
                   where: { id: sessionObj.id },
                   data: {
                      periodId: resolvedPeriodId || sessionObj.periodId,
                      batchId: resolvedBatchId || sessionObj.batchId
                   }
                });
             }

             // Đồng bộ các học sinh đang nằm trong Phiên (nếu chưa có batchId) vào Đợt của phiên để GV thấy ngay danh sách học sinh
             if (resolvedBatchId && Array.isArray(sessionObj.studentSessions) && sessionObj.studentSessions.length > 0) {
                const studentIdsToLink = sessionObj.studentSessions
                   .map((ss: any) => ss.student)
                   .filter((st: any) => st && (!st.batchId || st.batchId !== resolvedBatchId))
                   .map((st: any) => st.id);
                if (studentIdsToLink.length > 0) {
                   await prisma.inputAssessmentStudent.updateMany({
                      where: { id: { in: studentIdsToLink } },
                      data: {
                         batchId: resolvedBatchId,
                         ...(resolvedPeriodId ? { periodId: resolvedPeriodId } : {})
                      }
                   });
                }
             }
          }
       }

       if (!resolvedPeriodId) {
          return NextResponse.json({ error: "Missing periodId" }, { status: 400 });
       }

       let successCount = 0;

       // Tự động bổ sung Khối & Hệ thực tế của học sinh trong Đợt khảo sát (nếu Đợt có học sinh nhưng phạm vi chọn bị lệch khối mặc định)
       const assignmentsToProcess: any[] = [...assignments];
       if (resolvedBatchId && assignments.length > 0) {
          try {
             const batchStudents = await prisma.inputAssessmentStudent.findMany({
                where: { batchId: resolvedBatchId },
                select: { grade: true, surveyFormType: true }
             });
             if (batchStudents.length > 0) {
                const normalizeG = (g: any) => String(g || "").toLowerCase().replace("khối", "").trim();
                const batchGradeSysPairs = new Map<string, { grade: string; educationSystem: string }>();
                batchStudents.forEach((st: any) => {
                   const g = String(st.grade || "").replace(/^Khối\s+/i, "").trim();
                   const sys = String(st.surveyFormType || "HNS").trim() || "HNS";
                   if (g) {
                      batchGradeSysPairs.set(`${g}__${sys}`, { grade: g, educationSystem: sys });
                   }
                });

                // Với mỗi cặp (teacherId, subjectId), kiểm tra xem đã khớp ít nhất 1 học sinh trong đợt chưa
                const teacherSubjectPairs = new Map<string, { teacherId: string; subjectId: string }>();
                assignments.forEach((a: any) => {
                   if (a.teacherId && a.subjectId) {
                      teacherSubjectPairs.set(`${a.teacherId}__${a.subjectId}`, {
                         teacherId: a.teacherId,
                         subjectId: a.subjectId
                      });
                   }
                });

                teacherSubjectPairs.forEach(({ teacherId, subjectId }) => {
                   const subAssigns = assignments.filter(
                      (a: any) => a.teacherId === teacherId && a.subjectId === subjectId
                   );
                   const matchesAnyBatchStudent = batchStudents.some((st: any) => {
                      const stG = normalizeG(st.grade);
                      return subAssigns.some((a: any) => {
                         const aG = normalizeG(a.grade);
                         return !aG || aG === "tất cả" || aG === stG;
                      });
                   });

                   if (!matchesAnyBatchStudent) {
                      batchGradeSysPairs.forEach(({ grade, educationSystem }) => {
                         assignmentsToProcess.push({
                            teacherId,
                            subjectId,
                            grade,
                            educationSystem
                         });
                      });
                   }
                });
             }
          } catch (batchCheckErr) {
             console.error("Auto-sync batch student grade/system error:", batchCheckErr);
          }
       }

       for (const a of assignmentsToProcess) {
          try {
             const existing = await prisma.inputAssessmentTeacherAssignment.findFirst({
                where: {
                   periodId: resolvedPeriodId,
                   batchId: resolvedBatchId || null,
                   userId: a.teacherId,
                   subjectId: a.subjectId,
                   grade: a.grade,
                   educationSystem: a.educationSystem
                }
             });
             if (!existing) {
                await prisma.inputAssessmentTeacherAssignment.create({
                   data: {
                      periodId: resolvedPeriodId,
                      batchId: resolvedBatchId || null,
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

       // Đồng bộ Giáo viên được phân công sang danh sách Cán bộ khảo sát (Examiners) của Phiên / Lịch ca thi liên quan
       try {
          const uniqueTeacherIds = Array.from(new Set(assignments.map((a: any) => a.teacherId).filter(Boolean)));
          const sessionWhereOr: any[] = [];
          if (sessionId) sessionWhereOr.push({ id: sessionId });
          if (resolvedBatchId) sessionWhereOr.push({ batchId: resolvedBatchId });

          if (uniqueTeacherIds.length > 0 && sessionWhereOr.length > 0) {
             const linkedSessions = await (prisma as any).inputAssessmentSession.findMany({
                where: { OR: sessionWhereOr },
                select: { id: true }
             });
             for (const ls of linkedSessions) {
                for (const tId of uniqueTeacherIds) {
                   const existingEx = await (prisma as any).inputAssessmentSessionExaminer.findFirst({
                      where: { sessionId: ls.id, userId: tId }
                   });
                   if (!existingEx) {
                      await (prisma as any).inputAssessmentSessionExaminer.create({
                         data: {
                            sessionId: ls.id,
                            userId: tId,
                            role: "EXAMINER",
                            subjectCode: null
                         }
                      });
                   }
                }
             }
          }
       } catch (syncErr) {
          console.error("Sync session examiner error:", syncErr);
       }

       return NextResponse.json({
          success: true,
          count: successCount,
          periodId: resolvedPeriodId,
          batchId: resolvedBatchId,
          sessionId: sessionId || null
       });
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
          
          const whereClause: any = { periodId };
          if (batchId && batchId !== "all") {
             if (batchId === "none") {
                whereClause.batchId = null;
             } else {
                whereClause.batchId = batchId;
             }
          }
          targetAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
             where: whereClause,
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
       const teacherGroups: Record<string, any> = {};
       
       for (const a of targetAssignments) {
          const key = a.userId;
          if (!teacherGroups[key]) {
             teacherGroups[key] = {
                user: a.user,
                periodId: a.periodId,
                batchId: a.batchId,
                periodName: a.period?.name || "Kỳ khảo sát",
                batchName: a.batch?.name || "Tất cả các đợt",
                grades: new Set<string>(),
                educationSystems: new Set<string>(),
                items: {}
              };
           }
           
           const subjectName = a.subject?.name || "Môn khảo sát";
            const subjectCode = a.subject?.code || "";
            const grade = a.grade;
            const system = a.educationSystem;
            const itemKey = `${subjectName}_${grade}`;
            
            if (grade) teacherGroups[key].grades.add(grade);
            if (system) teacherGroups[key].educationSystems.add(system);

            if (!teacherGroups[key].items[itemKey]) {
               teacherGroups[key].items[itemKey] = {
                  subjectId: a.subjectId,
                  subjectName,
                  subjectCode,
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

          // Query danh sách học sinh theo đợt & phạm vi phân công của giáo viên
          const gradeList = Array.from(group.grades as Set<string>);
          const studentWhere: any = {
             periodId: group.periodId
          };
          if (group.batchId) {
             studentWhere.batchId = group.batchId;
          }
          if (gradeList.length > 0) {
              const gradeConditions = new Set<string>();
              for (const g of gradeList) {
                 gradeConditions.add(String(g));
                 gradeConditions.add(`Khối ${g}`);
                 gradeConditions.add(`K${g}`);
                 if (String(g).startsWith("Khối ")) {
                    gradeConditions.add(String(g).replace("Khối ", "").trim());
                 }
              }
              studentWhere.grade = { in: Array.from(gradeConditions) };
           }

          const rawStudents = await (prisma as any).inputAssessmentStudent.findMany({
             where: studentWhere,
             select: {
                id: true,
                studentCode: true,
                fullName: true,
                grade: true,
                surveySystem: true,
                surveyFormType: true,
                className: true
             },
             orderBy: [
                { grade: "asc" },
                { studentCode: "asc" }
             ]
          });

          const eduSystemList = Array.from(group.educationSystems as Set<string>);
          const matchedStudents = rawStudents.filter((st: any) => {
             if (eduSystemList.length === 0) return true;
             const sSys = (st.surveySystem || st.surveyFormType || "").toUpperCase();
             if (!sSys) return true;
             return eduSystemList.some((sys: string) => sSys.includes(sys.toUpperCase()) || sys.toUpperCase().includes(sSys));
          });
          
          const itemsArray = Object.values(group.items);
          const hasOrientation = itemsArray.some((item: any) => {
             const name = (item.subjectName || "").toLowerCase();
             const code = (item.subjectCode || "").toLowerCase();
             return name.includes("định hướng") || code.includes("pdhdv") || code.includes("pvdh") || name.includes("phỏng vấn");
          });

          const isOnlyOrientation = hasOrientation && itemsArray.every((item: any) => {
             const name = (item.subjectName || "").toLowerCase();
             const code = (item.subjectCode || "").toLowerCase();
             return name.includes("định hướng") || code.includes("pdhdv") || code.includes("pvdh") || name.includes("phỏng vấn");
          });

          const emailSubject = isOnlyOrientation
             ? `[Sky-line SMS] Thông báo Phân công Phỏng vấn Định hướng Học sinh Phổ thông`
             : hasOrientation
             ? `[Sky-line SMS] Thông báo Phân công Khảo sát & Phỏng vấn Định hướng Học sinh Phổ thông`
             : `[Sky-line SMS] Thông báo Phân công Khảo sát Năng lực Học sinh Phổ thông`;

          const headerTitle = isOnlyOrientation
             ? "THÔNG BÁO PHÂN CÔNG PHỎNG VẤN ĐỊNH HƯỚNG"
             : hasOrientation
             ? "THÔNG BÁO PHÂN CÔNG KHẢO SÁT & PHỎNG VẤN ĐỊNH HƯỚNG"
             : "THÔNG BÁO PHÂN CÔNG KHẢO SÁT";

          const headerSubtitle = isOnlyOrientation
             ? "HỆ PHỔ THÔNG • PHỎNG VẤN & NHẬN DIỆN ĐỊNH HƯỚNG ĐẦU VÀO"
             : hasOrientation
             ? "HỆ PHỔ THÔNG • KHẢO SÁT NĂNG LỰC & PHỎNG VẤN ĐỊNH HƯỚNG"
             : "HỆ PHỔ THÔNG • KHẢO SÁT NĂNG LỰC ĐẦU VÀO";

          const introLead = isOnlyOrientation
             ? `Ban Khảo thí trân trọng thông báo Thầy/Cô đã được phân công thực hiện <strong>phỏng vấn định hướng học sinh và trao đổi phối hợp giáo dục với phụ huynh (Phiếu định hướng 2 Tab)</strong> cho học sinh bậc Phổ thông. Chi tiết thông tin phân công như sau:`
             : hasOrientation
             ? `Ban Khảo thí trân trọng thông báo Thầy/Cô đã được phân công thực hiện khảo sát năng lực và phỏng vấn định hướng đầu vào cho học sinh bậc Phổ thông. Chi tiết thông tin phân công như sau:`
             : `Ban Khảo thí trân trọng thông báo Thầy/Cô đã được phân công thực hiện chấm/khảo sát năng lực đầu vào cho học sinh bậc Phổ thông. Chi tiết thông tin phân công như sau:`;

          const studentCountBadge = isOnlyOrientation
             ? `${matchedStudents.length} học sinh cần phỏng vấn định hướng`
             : `${matchedStudents.length} học sinh cần khảo sát`;

          const studentListHeader = isOnlyOrientation
             ? `📋 DANH SÁCH HỌC SINH PHỎNG VẤN ĐỊNH HƯỚNG (${matchedStudents.length} HS)`
             : `📋 DANH SÁCH HỌC SINH KHẢO SÁT (${matchedStudents.length} HS)`;

          const studentActionBtn = isOnlyOrientation
             ? `🌟 Mở phiếu định hướng`
             : `📝 Nhập kết quả`;

          const ctaHint = isOnlyOrientation
              ? `Thầy/Cô có thể bấm trực tiếp nút <strong>[Mở phiếu định hướng]</strong> của từng học sinh ở trên hoặc truy cập thẳng vào đợt phỏng vấn định hướng bên dưới.`
              : hasOrientation
              ? `Thầy/Cô có thể bấm trực tiếp nút thao tác của từng học sinh ở trên hoặc truy cập thẳng vào đợt làm việc bên dưới.`
              : `Thầy/Cô có thể bấm trực tiếp nút <strong>[Nhập kết quả]</strong> của từng học sinh ở trên hoặc truy cập thẳng vào đợt khảo sát bên dưới.`;

          const ctaBtnText = isOnlyOrientation
              ? `TRUY CẬP TRỰC TIẾP ĐỢT PHỎNG VẤN ĐỊNH HƯỚNG &rarr;`
              : hasOrientation
              ? `TRUY CẬP TRỰC TIẾP ĐỢT KHẢO SÁT & PHỎNG VẤN &rarr;`
              : `TRUY CẬP TRỰC TIẾP ĐỢT KHẢO SÁT &rarr;`;

          const itemsHtml = itemsArray.map((item: any, idx) => {
             const systemsStr = item.systems.join(", ");
             const bgRow = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
             return `
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${bgRow};">
                   <td style="padding: 10px 14px; font-size: 13.5px; color: #003B3A; font-weight: 700;">${item.subjectName}</td>
                   <td style="padding: 10px 14px; font-size: 13px; color: #334155; text-align: center; font-weight: 600;">Khối ${item.grade}</td>
                   <td style="padding: 10px 14px; text-align: center;">
                     <span style="display: inline-block; padding: 3px 10px; background-color: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; border-radius: 50px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${systemsStr || "Tiêu chuẩn"}</span>
                   </td>
                </tr>
             `;
          }).join("");

          // Render danh sách học sinh (tối đa 35 học sinh đầu tiên để email gọn gàng)
          const MAX_DISPLAY_STUDENTS = 35;
          const displayStudents = matchedStudents.slice(0, MAX_DISPLAY_STUDENTS);
          const hasMoreStudents = matchedStudents.length > MAX_DISPLAY_STUDENTS;

          const emptyStudentsMsg = isOnlyOrientation
              ? "Hiện chưa có học sinh trong đợt thỏa điều kiện khối/hệ cần phỏng vấn định hướng."
              : "Hiện chưa có học sinh trong đợt thỏa điều kiện khối/hệ được phân công.";

           const studentsRowsHtml = displayStudents.length === 0 ? `
              <tr>
                <td colspan="5" style="padding: 16px; text-align: center; font-size: 12px; color: #94A3B8; font-style: italic;">
                  ${emptyStudentsMsg}
                </td>
              </tr>
           ` : displayStudents.map((st: any, sIdx: number) => {
             const bgRow = sIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
             const sysCode = st.surveySystem || st.surveyFormType || "TC";
             const studentDirectLink = `${baseUrl}/teacher/input-assessments?periodId=${group.periodId}&batchId=${group.batchId || ""}&grade=${encodeURIComponent(st.grade || "")}&studentCode=${encodeURIComponent(st.studentCode)}&studentId=${st.id}&autoOpen=true`;
             return `
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${bgRow};">
                   <td style="padding: 8px 10px; font-size: 12px; color: #64748B; text-align: center; font-weight: 600;">${sIdx + 1}</td>
                   <td style="padding: 8px 10px; font-size: 12px; color: #003B3A; font-family: monospace; font-weight: 700;">${st.studentCode}</td>
                   <td style="padding: 8px 10px; font-size: 12.5px; color: #1E293B; font-weight: 700;">${st.fullName}</td>
                   <td style="padding: 8px 10px; font-size: 11.5px; color: #475569; text-align: center;">Khối ${st.grade || "—"} • <span style="font-weight: 700; color: #B45309;">${sysCode}</span></td>
                   <td style="padding: 8px 10px; text-align: center;">
                      <a href="${studentDirectLink}" target="_blank" style="display: inline-block; padding: 5px 10px; background-color: #00A19A; color: #FFFFFF; font-size: 10.5px; font-weight: 700; text-decoration: none; border-radius: 6px; letter-spacing: 0.3px; white-space: nowrap;">
                         ${studentActionBtn}
                      </a>
                   </td>
                </tr>
             `;
          }).join("");

          const moreStudentsNotice = hasMoreStudents ? `
             <tr>
               <td colspan="5" style="padding: 10px 14px; text-align: center; font-size: 11.5px; color: #007A87; background-color: #F0FDFA; font-weight: 600;">
                 ... và còn ${matchedStudents.length - MAX_DISPLAY_STUDENTS} học sinh khác. Vui lòng bấm nút bên dưới để mở toàn bộ danh sách.
               </td>
             </tr>
          ` : "";

          const batchDirectLink = `${baseUrl}/teacher/input-assessments?periodId=${group.periodId}&batchId=${group.batchId || ""}`;
          
          const emailHtml = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${emailSubject}</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
                <tr>
                  <td align="center" style="padding: 24px 10px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
                      
                      <!-- HEADER BANNER -->
                      <tr>
                        <td bgcolor="#003B3A" style="padding: 26px 20px; text-align: center; background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%);">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                            <tr>
                              <td align="center" style="padding-bottom: 6px;">
                                <span style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                                  🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td align="center">
                                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                                  ${headerTitle}
                                </h1>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding-top: 5px;">
                                <div style="font-size: 12px; font-weight: 600; color: #CCFBF1; letter-spacing: 0.5px;">
                                  ${headerSubtitle}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- GREETINGS -->
                      <tr>
                        <td style="padding: 24px 24px 12px 24px; color: #1E293B;">
                          <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                            Kính gửi Thầy/Cô ${user.fullName},
                          </p>
                          <p style="margin: 0 0 14px 0; font-size: 13.5px; color: #475569; line-height: 1.6;">
                            ${introLead}
                          </p>
                        </td>
                      </tr>

                      <!-- INFO CARD -->
                      <tr>
                        <td style="padding: 0 24px 18px 24px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #CCFBF1; border-left: 4px solid #00A19A; padding: 14px 18px;">
                            <tr>
                              <td style="padding: 4px 0; width: 32%; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">${periodLabel}</td>
                              <td style="padding: 4px 0; font-size: 13.5px; font-weight: 800; color: #003B3A;">${group.periodName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">${batchLabel}</td>
                              <td style="padding: 4px 0; font-size: 13.5px; font-weight: 800; color: #047857;">${group.batchName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">SỐ LƯỢNG HS:</td>
                              <td style="padding: 4px 0; font-size: 13px; font-weight: 800; color: #B45309;">${studentCountBadge}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- ASSIGNMENT TABLE -->
                      <tr>
                        <td style="padding: 0 24px 20px 24px;">
                          <div style="font-size: 11.5px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            ${scopeSectionTitle}
                          </div>
                          <div style="border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                              <thead>
                                <tr bgcolor="#003B3A" style="background-color: #003B3A;">
                                  <th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px;">${subjectColHeader}</th>
                                  <th style="padding: 10px 14px; text-align: center; font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; width: 25%;">Khối</th>
                                  <th style="padding: 10px 14px; text-align: center; font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; width: 30%;">Hệ học</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${itemsHtml}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>

                      <!-- STUDENT LIST TABLE -->
                      <tr>
                        <td style="padding: 0 24px 24px 24px;">
                          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 11.5px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px;">
                              ${studentListHeader}
                            </span>
                          </div>
                          <div style="border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                              <thead>
                                <tr bgcolor="#0F766E" style="background-color: #0F766E;">
                                  <th style="padding: 9px 8px; text-align: center; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 32px;">#</th>
                                  <th style="padding: 9px 8px; text-align: left; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 80px;">Mã HS</th>
                                  <th style="padding: 9px 10px; text-align: left; font-size: 10.5px; font-weight: 800; color: #FFFFFF;">Họ và tên</th>
                                  <th style="padding: 9px 8px; text-align: center; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 95px;">Khối • Hệ</th>
                                  <th style="padding: 9px 10px; text-align: center; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 115px;">Thao tác</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${studentsRowsHtml}
                                ${moreStudentsNotice}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>

                      <!-- ACTION CTA -->
                      <tr>
                        <td style="padding: 0 24px 28px 24px; text-align: center;">
                          <p style="margin: 0 0 14px 0; font-size: 12.5px; color: #64748B; font-style: italic; line-height: 1.5;">
                            ${ctaHint}
                          </p>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                            <tr>
                              <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                                <a href="${batchDirectLink}" target="_blank" style="display: inline-block; padding: 13px 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                                  ${ctaBtnText}
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
                            Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">ktdbcl@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
                          </p>
                          <p style="margin: 6px 0 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.4);">
                            ${isOnlyOrientation ? "Email gửi tự động từ Phân hệ Phỏng vấn Định hướng & Tuyển sinh Sky-Line." : "Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line."}
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
             const campusHint = group.batchName || group.periodName || "";
             const giaovuCcEmail = getCampusGiaovuEmail(campusHint);
             const ccList = Array.from(new Set(["ktdbcl@skylineschool.edu.vn", giaovuCcEmail].filter(Boolean)));

             const mailRes = await sendEmail({
                to: targetEmail,
                cc: ccList,
                subject: emailSubject,
                html: emailHtml,
                replyTo: "ktdbcl@skylineschool.edu.vn"
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
       
       try {
          const session = await auth();
          const actorUser = (session?.user as any) || {
             id: "system_giaovu",
             fullName: "Giáo vụ / Ban KT&ĐBCL",
             role: "GIAO_VU",
          };
          for (const [userId, group] of Object.entries(teacherGroups)) {
             await executeEntranceWorkflowAction({
                action: "CONFIRM",
                targetScope: group.batchId ? "BATCH" : "PERIOD",
                periodId: group.periodId,
                batchId: group.batchId || null,
                stageNumber: 3,
                status: "COMPLETED",
                note: `Công bố & thông báo phân công khảo sát cho GV ${group.user?.fullName || ""}`,
                actor: {
                   id: actorUser.id || "system_giaovu",
                   fullName: actorUser.fullName || actorUser.name || "Giáo vụ",
                   role: actorUser.role || "GIAO_VU",
                   isSuperAdmin: Boolean(actorUser.isSuperAdmin || actorUser.role === "ADMIN"),
                },
             });
          }
       } catch (wfErr) {
          console.warn("Workflow stage 3 sync warning:", wfErr);
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
