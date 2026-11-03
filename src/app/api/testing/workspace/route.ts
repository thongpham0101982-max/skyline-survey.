import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import {
  getDigitalTestingWorkspace,
  ensureDigitalTestingTables,
  checkProctorScheduleConflict,
  syncApprovedResultsToGradebook,
  rollbackExamGradebookSync,
  validateExamMatrix,
  generateExamVariants,
  scoreOmrSheetAgainstVariant,
  generatePrintableOmrSheetHtml,
  verifyMoodleQuizConfiguration,
  fetchMoodleQuizAttempts,
} from "@/lib/testing/digitalTestingService";
import {
  processGrayscaleOmrSheet,
  synthesizeOmrSheetGrayscaleBuffer,
  type ImageStoragePolicy,
  type OmrClientRecognitionPayload,
} from "@/lib/testing/edgeOmrVisionEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureDigitalTestingTables();
    const { searchParams } = new URL(req.url);

    // Printable OMR Sheet HTML preview/export
    if (searchParams.get("omrSheetHtml") === "1") {
      const examId = searchParams.get("examId") || "";
      const exam = await prisma.testingSubjectExam.findUnique({
        where: { id: examId },
        include: { period: true, questions: true },
      });
      const subj = exam
        ? await prisma.subject.findUnique({ where: { id: exam.subjectId } })
        : null;
      const mcqCount =
        exam?.questions.filter((q) => q.questionType !== "ESSAY").length || 40;
      const html = generatePrintableOmrSheetHtml({
        periodName: exam?.period.name || "Kỳ kiểm tra định kỳ",
        subjectName: subj?.subjectName || "Môn học",
        gradeLevel: exam?.gradeLevel || "10",
        examCode: `${exam?.period.code || "KT"}-${subj?.subjectCode || "SUB"}`,
        totalMcqQuestions: mcqCount,
      });
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const periodId = searchParams.get("periodId") || undefined;
    const scope = searchParams.get("scope") || "admin";
    let teacherId = searchParams.get("teacherId") || undefined;

    if (scope === "teacher" && !teacherId) {
      const session = await auth();
      const email = session?.user?.email;
      if (email) {
        const teacher = await prisma.teacher.findFirst({
          where: { email },
        });
        if (teacher) teacherId = teacher.id;
      }
    }

    const workspace = await getDigitalTestingWorkspace({
      periodId,
      teacherId,
      onlyAssignedToTeacher: scope === "teacher" && Boolean(teacherId),
    });

    return NextResponse.json({
      success: true,
      currentTeacherId: teacherId || null,
      ...workspace,
    });
  } catch (err: any) {
    console.error("[GET /api/testing/workspace] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tải dữ liệu Khảo thí Số" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDigitalTestingTables();
    const session = await auth();
    const actorName = session?.user?.name || "Cán bộ Khảo thí";
    const actorEmail = session?.user?.email || "ktdbcl@skyline.edu.vn";

    const body = await req.json();
    const { action } = body;

    switch (action) {
      // =====================================================
      // STEP 1: QUẢN LÝ KỲ KIỂM TRA (CHÍNH KỲ & KIỂM TRA BÙ)
      // =====================================================
      case "CREATE_PERIOD": {
        const {
          code,
          name,
          academicYearId,
          semester,
          examType,
          programType,
          campusId,
          gradeLevels,
          startDate,
          endDate,
          isMakeup,
          parentPeriodId,
          description,
        } = body;

        const targetYear = academicYearId
          ? await prisma.academicYear.findUnique({ where: { id: academicYearId } })
          : await prisma.academicYear.findFirst({
              where: { status: "ACTIVE" },
              orderBy: { startDate: "desc" },
            });

        const yearToken = (targetYear?.name || String(new Date().getFullYear()))
          .replace(/\s+/g, "")
          .toUpperCase();
        const semNum = (semester || "HK1") === "HK2" ? "2" : "1";
        const typePrefix =
          examType === "FINAL"
            ? `CK${semNum}`
            : examType === "REGULAR"
            ? `TX${semNum}`
            : examType === "MAKEUP" || isMakeup
            ? `GK${semNum}-BU`
            : `GK${semNum}`;
        const progToken =
          programType && programType !== "MOET" ? `-${programType}` : "";

        let campusToken = "";
        if (campusId) {
          const cp = await prisma.campus.findUnique({ where: { id: campusId } });
          if (cp?.campusCode) {
            campusToken = `-${cp.campusCode.toUpperCase()}`;
          }
        }

        const baseCode = (
          code?.trim() || `KT-${typePrefix}${progToken}${campusToken}-${yearToken}`
        ).toUpperCase();

        // Ensure unique code by appending -D2, -D3 if collision occurs
        let finalCode = baseCode;
        let suffix = 2;
        while (
          await prisma.testingPeriod.findUnique({ where: { code: finalCode } })
        ) {
          finalCode = `${baseCode}-D${suffix}`;
          suffix++;
        }

        const parsedStart = startDate ? new Date(startDate) : new Date();
        const parsedEnd = endDate
          ? new Date(endDate)
          : new Date(parsedStart.getTime() + 7 * 86400000);

        if (parsedEnd.getTime() < parsedStart.getTime()) {
          throw new Error(
            "Thời gian kết thúc (Đến ngày) phải lớn hơn hoặc bằng thời gian bắt đầu (Từ ngày)."
          );
        }

        const period = await prisma.testingPeriod.create({
          data: {
            code: finalCode,
            name:
              name?.trim() ||
              `Kiểm tra ${
                examType === "FINAL"
                  ? "Cuối kỳ"
                  : examType === "MAKEUP" || isMakeup
                  ? "Bù"
                  : examType === "REGULAR"
                  ? "Định kỳ"
                  : "Giữa kỳ"
              } ${semester === "HK2" ? "II" : "I"} (${
                targetYear?.name || yearToken
              })`,
            academicYearId: targetYear?.id || academicYearId || null,
            semester: semester || "HK1",
            examType: examType || "MIDTERM",
            programType: programType || "MOET",
            campusId: campusId || null,
            gradeLevels: Array.isArray(gradeLevels)
              ? JSON.stringify(gradeLevels)
              : gradeLevels || JSON.stringify(["10", "11", "12"]),
            startDate: parsedStart,
            endDate: parsedEnd,
            isMakeup: Boolean(isMakeup || examType === "MAKEUP"),
            parentPeriodId: parentPeriodId || null,
            status: "PUBLISHED",
            description: description || "",
            createdById: actorEmail,
          },
        });

        await logActivity({
          action: "CREATE_TESTING_PERIOD",
          entityType: "TestingPeriod",
          entityId: period.id,
          actorName,
          actorEmail,
          description: `Khởi tạo kỳ kiểm tra: ${period.name} (${period.code}) [${parsedStart.toLocaleDateString(
            "vi-VN"
          )} - ${parsedEnd.toLocaleDateString("vi-VN")}]`,
        });

        return NextResponse.json({ success: true, period });
      }

      // =====================================================
      // STEP 2: TẠO BÀI KIỂM TRA BỘ MÔN - KHỐI
      // =====================================================
      case "CREATE_SUBJECT_EXAM": {
        const {
          periodId,
          subjectId,
          gradeLevel,
          campusId,
          examFormat,
          durationMinutes,
          maxScore,
          mcqWeight,
          essayWeight,
          moodleCourseId,
          moodleQuizId,
        } = body;

        const exam = await prisma.testingSubjectExam.create({
          data: {
            periodId,
            subjectId,
            gradeLevel: String(gradeLevel || "10"),
            campusId: campusId || null,
            examFormat: examFormat || "HYBRID",
            durationMinutes: Number(durationMinutes || 60),
            maxScore: Number(maxScore || 10),
            mcqWeight: Number(mcqWeight ?? 7),
            essayWeight: Number(essayWeight ?? 3),
            moodleCourseId: moodleCourseId ? Number(moodleCourseId) : null,
            moodleQuizId: moodleQuizId ? Number(moodleQuizId) : null,
            moodleSyncStatus: moodleQuizId ? "LINKED" : "NOT_LINKED",
            workflowStep: 2,
            status: "PLANNING",
          },
        });

        await logActivity({
          action: "CREATE_SUBJECT_EXAM",
          entityType: "TestingSubjectExam",
          entityId: exam.id,
          actorName,
          actorEmail,
          description: `Tạo bài kiểm tra Khối ${gradeLevel} (${exam.examFormat})`,
        });

        return NextResponse.json({ success: true, exam });
      }

      // =====================================================
      // STEP 3: PHÂN CÔNG KHẢO THÍ & LIÊN THÔNG SỔ GIÁO VIÊN
      // =====================================================
      case "ASSIGN_TASK": {
        const {
          subjectExamId,
          teacherId,
          role,
          dueDate,
          approverId,
          reviewNote,
        } = body;

        const task = await prisma.testingTaskAssignment.create({
          data: {
            subjectExamId,
            teacherId,
            role: role || "PAPER_AUTHOR",
            dueDate: dueDate
              ? new Date(dueDate)
              : new Date(Date.now() + 3 * 86400000),
            status: "PENDING",
            approverId: approverId || null,
            reviewNote: reviewNote || null,
          },
        });

        await prisma.testingSubjectExam.update({
          where: { id: subjectExamId },
          data: { workflowStep: 3, status: "ASSIGNED" },
        });

        await logActivity({
          action: "ASSIGN_TESTING_TASK",
          entityType: "TestingTaskAssignment",
          entityId: task.id,
          actorName,
          actorEmail,
          description: `Phân công nhiệm vụ khảo thí [${role}] cho giáo viên ID=${teacherId}`,
        });

        return NextResponse.json({ success: true, task });
      }

      case "REMIND_OVERDUE_TASK": {
        const { taskId } = body;
        const updated = await prisma.testingTaskAssignment.update({
          where: { id: taskId },
          data: {
            remindedCount: { increment: 1 },
            lastRemindedAt: new Date(),
          },
        });

        await logActivity({
          action: "REMIND_TESTING_TASK",
          entityType: "TestingTaskAssignment",
          entityId: taskId,
          actorName,
          actorEmail,
          description: `Gửi nhắc việc khảo thí (Lần ${updated.remindedCount}) tới Sổ Giáo Viên.`,
        });

        return NextResponse.json({ success: true, task: updated });
      }

      // =====================================================
      // STEP 4: NỘP & DUYỆT MA TRẬN - ĐẶC TẢ ĐỀ
      // =====================================================
      case "SUBMIT_MATRIX": {
        const { subjectExamId, title, cells, submittedById, specDocumentUrl } =
          body;

        const parsedCells = Array.isArray(cells) ? cells : [];
        const validation = validateExamMatrix(parsedCells, 10);

        const existingMatrices = await prisma.testingMatrix.findMany({
          where: { subjectExamId },
          orderBy: { version: "desc" },
          take: 1,
        });
        const nextVersion = (existingMatrices[0]?.version || 0) + 1;

        const matrix = await prisma.testingMatrix.create({
          data: {
            subjectExamId,
            version: nextVersion,
            title: title || `Ma trận & Đặc tả phiên bản v${nextVersion}.0`,
            matrixJson: JSON.stringify(parsedCells),
            specDocumentUrl: specDocumentUrl || null,
            totalQuestions: validation.totalQuestions,
            totalPoints: validation.totalPoints,
            nbPercent: validation.byLevel.NB.percent,
            thPercent: validation.byLevel.TH.percent,
            vdPercent: validation.byLevel.VD.percent,
            vdcPercent: validation.byLevel.VDC.percent,
            status: "SUBMITTED",
            submittedById: submittedById || actorName,
            submittedAt: new Date(),
          },
        });

        await prisma.testingSubjectExam.update({
          where: { id: subjectExamId },
          data: { workflowStep: 4, status: "MATRIX_REVIEW" },
        });

        await prisma.testingTaskAssignment.updateMany({
          where: { subjectExamId, role: "MATRIX_AUTHOR" },
          data: { status: "SUBMITTED", completedAt: new Date() },
        });

        return NextResponse.json({ success: true, matrix, validation });
      }

      case "REVIEW_MATRIX": {
        const { matrixId, decision, reviewComment, reviewerId } = body;
        const newStatus =
          decision === "APPROVE" ? "APPROVED" : "REVISION_REQUESTED";

        const matrix = await prisma.testingMatrix.update({
          where: { id: matrixId },
          data: {
            status: newStatus,
            reviewedById: reviewerId || actorName,
            reviewedAt: new Date(),
            reviewComment:
              reviewComment ||
              (newStatus === "APPROVED"
                ? "Ma trận đạt chuẩn quy định."
                : "Yêu cầu điều chỉnh lại tỉ lệ mức độ nhận thức."),
          },
        });

        await prisma.testingTaskAssignment.updateMany({
          where: {
            subjectExamId: matrix.subjectExamId,
            role: "MATRIX_AUTHOR",
          },
          data: {
            status: newStatus,
            reviewNote: matrix.reviewComment,
          },
        });

        if (newStatus === "APPROVED") {
          await prisma.testingSubjectExam.update({
            where: { id: matrix.subjectExamId },
            data: { workflowStep: 5 },
          });
        }

        await logActivity({
          action: "REVIEW_TESTING_MATRIX",
          entityType: "TestingMatrix",
          entityId: matrix.id,
          actorName,
          actorEmail,
          description: `Duyệt ma trận đề (${newStatus}): ${matrix.title}`,
        });

        return NextResponse.json({ success: true, matrix });
      }

      // =====================================================
      // STEP 5 & 6: NGÂN HÀNG CÂU HỎI, TRỘN ĐỀ, LMS & DUYỆT ĐỀ
      // =====================================================
      case "SAVE_QUESTION": {
        const {
          subjectExamId,
          subjectId,
          gradeLevel,
          sectionCode,
          topicName,
          cognitiveLevel,
          questionType,
          questionCode,
          stemContent,
          options,
          correctAnswer,
          points,
          allowShuffleOpts,
        } = body;

        const q = await prisma.testingQuestion.create({
          data: {
            subjectExamId,
            subjectId,
            gradeLevel: String(gradeLevel || "10"),
            sectionCode: sectionCode || "PART_I_MCQ",
            topicName: topicName || "Chủ đề trọng tâm",
            cognitiveLevel: cognitiveLevel || "NB",
            questionType: questionType || "MCQ",
            questionCode:
              questionCode || `Q-${Date.now().toString().slice(-4)}`,
            stemContent: stemContent || "",
            optionsJson: options ? JSON.stringify(options) : null,
            correctAnswer: correctAnswer || "A",
            points: Number(points || 0.25),
            allowShuffleOpts: allowShuffleOpts !== false,
            isApprovedBank: true,
          },
        });

        return NextResponse.json({ success: true, question: q });
      }

      case "VERIFY_LMS_QUIZ": {
        const { subjectExamId, moodleCourseId, moodleQuizId } = body;
        const exam = await prisma.testingSubjectExam.findUnique({
          where: { id: subjectExamId },
        });
        if (!exam) throw new Error("Không tìm thấy bài kiểm tra.");

        const report = await verifyMoodleQuizConfiguration({
          moodleCourseId: Number(moodleCourseId || exam.moodleCourseId || 104),
          moodleQuizId: Number(moodleQuizId || exam.moodleQuizId || 512),
          expectedDurationMinutes: exam.durationMinutes,
          expectedMaxScore: exam.maxScore,
        });

        const updatedExam = await prisma.testingSubjectExam.update({
          where: { id: subjectExamId },
          data: {
            moodleCourseId: Number(moodleCourseId || exam.moodleCourseId || 104),
            moodleQuizId: Number(moodleQuizId || exam.moodleQuizId || 512),
            moodleSyncStatus: report.isValidForOfficialExam ? "VERIFIED" : "LINKED",
            moodleVerifiedAt: new Date(),
            moodleVerifiedBy: actorName,
          },
        });

        return NextResponse.json({
          success: true,
          exam: updatedExam,
          verificationReport: report,
        });
      }

      case "SUBMIT_PAPER": {
        const {
          subjectExamId,
          matrixId,
          submissionMode,
          paperFileUrl,
          answerKeyUrl,
          gradingGuideUrl,
          submittedById,
        } = body;

        const existingPapers = await prisma.testingPaperSubmission.findMany({
          where: { subjectExamId },
          orderBy: { version: "desc" },
          take: 1,
        });
        const nextVer = (existingPapers[0]?.version || 0) + 1;

        const paper = await prisma.testingPaperSubmission.create({
          data: {
            subjectExamId,
            matrixId: matrixId || null,
            version: nextVer,
            submissionMode: submissionMode || "QUESTION_BANK",
            paperFileUrl:
              paperFileUrl ||
              `/api/testing/workspace?omrSheetHtml=1&examId=${subjectExamId}`,
            answerKeyUrl: answerKeyUrl || null,
            gradingGuideUrl: gradingGuideUrl || null,
            isOfficial: false,
            status: "SUBMITTED",
            submittedById: submittedById || actorName,
            submittedAt: new Date(),
          },
        });

        await prisma.testingSubjectExam.update({
          where: { id: subjectExamId },
          data: { workflowStep: 5, status: "PAPER_REVIEW" },
        });

        await prisma.testingTaskAssignment.updateMany({
          where: { subjectExamId, role: "PAPER_AUTHOR" },
          data: { status: "SUBMITTED", completedAt: new Date() },
        });

        return NextResponse.json({ success: true, paper });
      }

      case "REVIEW_PAPER": {
        const { paperId, decision, comment, stage } = body;
        // stage: "PEER_REVIEW" or "FINAL_APPROVE"
        const paper = await prisma.testingPaperSubmission.findUnique({
          where: { id: paperId },
        });
        if (!paper) throw new Error("Không tìm thấy hồ sơ đề.");

        if (stage === "PEER_REVIEW") {
          const updated = await prisma.testingPaperSubmission.update({
            where: { id: paperId },
            data: {
              status:
                decision === "APPROVE" ? "PEER_REVIEWED" : "REVISION_REQUESTED",
              peerReviewerId: actorName,
              peerReviewNote: comment || "Đã phản biện chéo hồ sơ đề.",
              peerReviewedAt: new Date(),
            },
          });
          return NextResponse.json({ success: true, paper: updated });
        }

        const isApproved = decision === "APPROVE";
        if (isApproved) {
          // Ensure only 1 official paper per subjectExamId
          await prisma.testingPaperSubmission.updateMany({
            where: { subjectExamId: paper.subjectExamId },
            data: { isOfficial: false },
          });
        }

        const updatedPaper = await prisma.testingPaperSubmission.update({
          where: { id: paperId },
          data: {
            status: isApproved ? "APPROVED" : "REVISION_REQUESTED",
            isOfficial: isApproved,
            approvedById: actorName,
            approvedAt: new Date(),
            approvalComment:
              comment ||
              (isApproved
                ? "Phê duyệt đề chính thức (isOfficial = true)."
                : "Đề cần chỉnh sửa lại đáp án."),
          },
        });

        if (isApproved) {
          await prisma.testingSubjectExam.update({
            where: { id: paper.subjectExamId },
            data: { workflowStep: 6, status: "PAPER_APPROVED" },
          });

          // Automatically generate 4 controlled variants (101, 102, 103, 104) if questions exist
          const questions = await prisma.testingQuestion.findMany({
            where: { subjectExamId: paper.subjectExamId },
          });
          if (questions.length > 0) {
            await prisma.testingPaperVariant.deleteMany({
              where: { paperId: paper.id },
            });
            const variants = generateExamVariants(
              questions,
              ["101", "102", "103", "104"],
              Date.now() % 1000000
            );
            for (const v of variants) {
              await prisma.testingPaperVariant.create({
                data: {
                  paperId: paper.id,
                  variantCode: v.variantCode,
                  seedValue: v.seedValue,
                  questionOrderJson: v.questionOrderJson,
                  answerKeyMapJson: v.answerKeyMapJson,
                },
              });
            }
          }
        }

        await logActivity({
          action: "APPROVE_TESTING_PAPER",
          entityType: "TestingPaperSubmission",
          entityId: paper.id,
          actorName,
          actorEmail,
          description: `Phê duyệt hồ sơ đề v${paper.version} (${updatedPaper.status}, isOfficial=${updatedPaper.isOfficial})`,
        });

        return NextResponse.json({ success: true, paper: updatedPaper });
      }

      case "GENERATE_VARIANTS": {
        const { subjectExamId, variantCodes } = body;
        const paper = await prisma.testingPaperSubmission.findFirst({
          where: { subjectExamId },
          orderBy: [{ isOfficial: "desc" }, { version: "desc" }],
        });
        if (!paper) {
          throw new Error("Cần có hồ sơ đề trước khi trộn mã đề.");
        }

        const questions = await prisma.testingQuestion.findMany({
          where: { subjectExamId },
        });
        if (questions.length === 0) {
          throw new Error("Chưa có câu hỏi trong ngân hàng của bài kiểm tra này.");
        }

        await prisma.testingPaperVariant.deleteMany({
          where: { paperId: paper.id },
        });

        const codes =
          Array.isArray(variantCodes) && variantCodes.length > 0
            ? variantCodes
            : ["101", "102", "103", "104"];
        const generated = generateExamVariants(
          questions,
          codes,
          Math.floor(Date.now() / 1000)
        );

        for (const v of generated) {
          await prisma.testingPaperVariant.create({
            data: {
              paperId: paper.id,
              variantCode: v.variantCode,
              seedValue: v.seedValue,
              questionOrderJson: v.questionOrderJson,
              answerKeyMapJson: v.answerKeyMapJson,
            },
          });
        }

        return NextResponse.json({
          success: true,
          variantsCount: generated.length,
        });
      }

      // =====================================================
      // STEP 7: LỊCH THI, PHÂN CÔNG GIÁM THỊ & BIÊN BẢN COI THI
      // =====================================================
      case "SCHEDULE_SESSION": {
        const {
          subjectExamId,
          classId,
          roomName,
          examDate,
          startTime,
          endTime,
          slotNumber,
          proctorTeacherId,
        } = body;

        const parsedDate = examDate ? new Date(examDate) : new Date();
        const classStudents = await prisma.student.findMany({
          where: { classId },
          take: 50,
        });

        const testingSession = await prisma.testingSession.create({
          data: {
            subjectExamId,
            classId,
            roomName: roomName || "Phòng thi tiêu chuẩn",
            examDate: parsedDate,
            startTime: startTime || "08:00",
            endTime: endTime || "09:30",
            slotNumber: slotNumber ? Number(slotNumber) : 1,
            totalRegistered: classStudents.length,
            presentCount: classStudents.length,
            absentCount: 0,
            collectedPapers: classStudents.length,
            minutesStatus: "PENDING",
          },
        });

        let conflictWarning: string | null = null;
        if (proctorTeacherId) {
          conflictWarning = await checkProctorScheduleConflict({
            teacherId: proctorTeacherId,
            examDate: parsedDate,
            startTime: startTime || "08:00",
            endTime: endTime || "09:30",
            slotNumber: slotNumber ? Number(slotNumber) : 1,
            excludeSessionId: testingSession.id,
          });

          await prisma.testingSessionProctor.create({
            data: {
              sessionId: testingSession.id,
              teacherId: proctorTeacherId,
              proctorRole: "PROCTOR_1",
              conflictWarning,
            },
          });
        }

        // Populate session roster with 6-digit candidateNumber (SBD)
        for (let i = 0; i < classStudents.length; i++) {
          const stu = classStudents[i];
          if (!stu) continue;
          await prisma.testingSessionRoster.create({
            data: {
              sessionId: testingSession.id,
              studentId: stu.id,
              candidateNumber: String(200001 + i),
              seatNumber: `B-${String(i + 1).padStart(2, "0")}`,
              variantCode: ["101", "102", "103", "104"][i % 4],
              attendanceStatus: "PRESENT",
              paperSubmitted: true,
              needsMakeup: false,
            },
          });
        }

        await prisma.testingSubjectExam.update({
          where: { id: subjectExamId },
          data: { workflowStep: 7, status: "IN_EXAM" },
        });

        return NextResponse.json({
          success: true,
          session: testingSession,
          conflictWarning,
        });
      }

      case "SAVE_PROCTOR_MINUTES": {
        const {
          sessionId,
          incidentSummary,
          collectedPapers,
          rosterUpdates,
        } = body;

        if (Array.isArray(rosterUpdates)) {
          for (const item of rosterUpdates) {
            await prisma.testingSessionRoster.update({
              where: { id: item.id },
              data: {
                attendanceStatus: item.attendanceStatus,
                paperSubmitted: item.attendanceStatus === "PRESENT",
                needsMakeup: item.attendanceStatus === "ABSENT_EXCUSED",
                violationLevel: item.violationLevel || null,
                violationNote: item.violationNote || null,
              },
            });
          }
        }

        const allRoster = await prisma.testingSessionRoster.findMany({
          where: { sessionId },
        });
        const presentCnt = allRoster.filter(
          (r) => r.attendanceStatus === "PRESENT" || r.attendanceStatus === "LATE"
        ).length;
        const absentCnt = allRoster.length - presentCnt;

        const updatedSession = await prisma.testingSession.update({
          where: { id: sessionId },
          data: {
            presentCount: presentCnt,
            absentCount: absentCnt,
            collectedPapers:
              collectedPapers !== undefined
                ? Number(collectedPapers)
                : presentCnt,
            incidentSummary:
              incidentSummary || "Ca kiểm tra diễn ra nghiêm túc, đúng quy chế.",
            minutesStatus: "SIGNED",
            signedByProctorId: actorName,
            signedAt: new Date(),
          },
        });

        await logActivity({
          action: "SIGN_PROCTOR_MINUTES",
          entityType: "TestingSession",
          entityId: sessionId,
          actorName,
          actorEmail,
          description: `Ký biên bản coi kiểm tra điện tử phòng ${updatedSession.roomName}: Có mặt ${presentCnt}/${allRoster.length}, Thu ${updatedSession.collectedPapers} bài.`,
        });

        return NextResponse.json({ success: true, session: updatedSession });
      }

      // =====================================================
      // STEP 8: CHẤM BÀI OMR / ĐỒNG BỘ LMS / CHẤM TỰ LUẬN
      // =====================================================
      case "SYNC_OMR_RECOGNITION_BATCH": {
        const {
          subjectExamId,
          sessionId,
          batchName,
          imageStoragePolicy = "ANOMALY_CROPS_ONLY",
          items,
        } = body as {
          subjectExamId: string;
          sessionId?: string;
          batchName?: string;
          imageStoragePolicy?: ImageStoragePolicy;
          items: OmrClientRecognitionPayload[];
        };

        if (!subjectExamId || !Array.isArray(items) || items.length === 0) {
          throw new Error("Dữ liệu lô nhận dạng OMR không hợp lệ hoặc rỗng.");
        }

        const exam = await prisma.testingSubjectExam.findUnique({
          where: { id: subjectExamId },
          include: {
            papers: {
              include: { variants: true },
              orderBy: [{ isOfficial: "desc" }, { version: "desc" }],
            },
            sessions: {
              include: { roster: true },
            },
          },
        });

        if (!exam) {
          throw new Error("Không tìm thấy Bài kiểm tra bộ môn.");
        }
        if (exam.status === "LOCKED") {
          throw new Error(
            "Bài kiểm tra đã khóa điểm. Không thể đồng bộ thêm phiếu OMR."
          );
        }

        // Load official paper variants on server (Zero-Trust Client: Server owns Answer Key)
        const officialPaper = exam.papers[0] || null;
        const variantMap = new Map<string, string>();
        if (officialPaper?.variants?.length) {
          for (const v of officialPaper.variants) {
            variantMap.set(v.variantCode, v.answerKeyMapJson);
          }
        }

        // Fallback deterministic answer key if exam hasn't generated variants yet
        const buildDefaultAnswerKeyJson = (totalQ: number, maxMcqWeight: number) => {
          const ptsPerQ = Math.round((maxMcqWeight / Math.max(totalQ, 1)) * 1000) / 1000;
          const opts = ["A", "B", "C", "D"];
          const map: Record<string, any> = {};
          for (let q = 1; q <= totalQ; q++) {
            map[String(q)] = {
              correctAnswer: opts[(q - 1) % 4],
              points: ptsPerQ,
              questionId: `AUTO-Q-${q}`,
              questionType: "MCQ",
            };
          }
          return JSON.stringify(map);
        };

        // Map SBD (candidateNumber) -> studentId from TestingSessionRoster
        const sbdToStudentMap = new Map<string, string>();
        for (const sess of exam.sessions) {
          for (const r of sess.roster) {
            if (r.candidateNumber && r.studentId) {
              sbdToStudentMap.set(r.candidateNumber.trim(), r.studentId);
            }
          }
        }

        // Find or create an active OMR batch for this exam
        let omrBatch = await prisma.testingOmrBatch.findFirst({
          where: { subjectExamId },
          orderBy: { createdAt: "desc" },
        });
        if (!omrBatch) {
          omrBatch = await prisma.testingOmrBatch.create({
            data: {
              subjectExamId,
              sessionId: sessionId || exam.sessions[0]?.id || null,
              batchName:
                batchName ||
                `Lô Edge OMR JSON (${imageStoragePolicy}) - ${new Date().toLocaleDateString(
                  "vi-VN"
                )}`,
              sourceDevice: "CLIENT_EDGE_CV_WORKER",
              totalSheets: 0,
              recognizedSheets: 0,
              flaggedSheets: 0,
              status: "COMPLETED",
              uploadedById: actorName,
            },
          });
        }

        const existingSheetsInExam = await prisma.testingOmrSheet.findMany({
          where: { batch: { subjectExamId } },
        });
        const existingStudentIds = new Set<string>(
          existingSheetsInExam
            .map((s) => s.studentId)
            .filter(Boolean) as string[]
        );

        const ackItems: Array<{
          idempotencyKey: string;
          sheetId: string;
          recognitionStatus: string;
          mcqScore: number;
          correctCount: number;
          anomalyFlags: string[];
        }> = [];

        let newlyScored = 0;
        let deduplicatedCount = 0;

        for (const item of items) {
          const sbd = (item.candidateNumber || "").trim();
          const vCode = (item.variantCode || "101").trim();

          // Idempotency check: look up existing sheet by (batchId, candidateNumber) or reviewReason idempotency tag
          const existingSheet = existingSheetsInExam.find(
            (sh) =>
              (sh.reviewReason &&
                sh.reviewReason.includes(item.idempotencyKey)) ||
              (sbd && sh.candidateNumber === sbd && sh.variantCode === vCode)
          );

          if (existingSheet) {
            deduplicatedCount += 1;
            let flags: string[] = [];
            try {
              flags = JSON.parse(existingSheet.anomalyFlagsJson || "[]");
            } catch {
              flags = [];
            }
            ackItems.push({
              idempotencyKey: item.idempotencyKey,
              sheetId: existingSheet.id,
              recognitionStatus: existingSheet.recognitionStatus,
              mcqScore: existingSheet.mcqScore || 0,
              correctCount: existingSheet.correctCount || 0,
              anomalyFlags: flags,
            });
            continue;
          }

          const matchedStudentId = sbdToStudentMap.get(sbd) || null;
          const totalQ = Math.max(
            Object.keys(item.rawBubbleMap || {}).length,
            10
          );
          const answerKeyJson =
            variantMap.get(vCode) ||
            Array.from(variantMap.values())[0] ||
            buildDefaultAnswerKeyJson(totalQ, exam.mcqWeight || 7);

          const scored = scoreOmrSheetAgainstVariant({
            candidateNumber: sbd,
            variantCode: vCode,
            rawBubbleMap: item.rawBubbleMap || {},
            answerKeyMapJson: answerKeyJson,
            existingStudentIdsInBatch: existingStudentIds,
            matchedStudentId,
          });

          // Merge client CV flags (e.g. FAINT_MARK, SKEWED_IMAGE, LOW_LIGHT_CONTRAST)
          const mergedFlags = Array.from(
            new Set([...scored.anomalyFlags, ...(item.anomalyFlags || [])])
          );

          let finalStatus = scored.recognitionStatus;
          if (
            mergedFlags.includes("FAINT_MARK") ||
            mergedFlags.includes("MULTI_MARK") ||
            mergedFlags.includes("LOW_CONF")
          ) {
            if (finalStatus === "RECOGNIZED") finalStatus = "NEEDS_REVIEW";
          }

          // Enforce image storage policy: never store raw image, only store tiny crop if policy allows
          const storedImageUrl =
            imageStoragePolicy === "NONE_JSON_ONLY"
              ? `edge-json://${item.idempotencyKey}`
              : imageStoragePolicy === "ANOMALY_CROPS_ONLY"
              ? mergedFlags.length > 0 && item.evidenceCropDataUrl
                ? item.evidenceCropDataUrl
                : `edge-json-clean://${item.idempotencyKey}`
              : item.evidenceCropDataUrl || `edge-compressed://${item.idempotencyKey}`;

          const createdSheet = await prisma.testingOmrSheet.create({
            data: {
              batchId: omrBatch.id,
              imageUrl: storedImageUrl,
              candidateNumber: sbd,
              studentId: matchedStudentId,
              variantCode: vCode,
              confidenceScore: item.confidenceScore || scored.confidenceScore,
              recognitionStatus: finalStatus,
              rawBubbleMapJson: JSON.stringify(item.rawBubbleMap || {}),
              anomalyFlagsJson: JSON.stringify(mergedFlags),
              mcqScore: scored.mcqScore,
              correctCount: scored.correctCount,
              totalQuestions: scored.totalQuestions,
              reviewReason: `[IDEMP:${item.idempotencyKey}] EdgeCV skew=${
                item.skewAngleDeg ?? 0
              }° lum=${item.brightnessMean ?? 180}`,
            },
          });

          if (matchedStudentId) {
            existingStudentIds.add(matchedStudentId);
            const existingResult =
              await prisma.testingCandidateResult.findUnique({
                where: {
                  subjectExamId_studentId: {
                    subjectExamId,
                    studentId: matchedStudentId,
                  },
                },
              });

            const essayVal = existingResult?.essayScore || 0;
            const finalVal = Math.min(
              exam.maxScore || 10,
              Math.round((scored.mcqScore + essayVal) * 100) / 100
            );
            const reconFlag =
              finalStatus === "RECOGNIZED" ? "MATCHED" : "DISCREPANCY";

            if (existingResult) {
              if (!existingResult.isLocked) {
                await prisma.testingCandidateResult.update({
                  where: { id: existingResult.id },
                  data: {
                    candidateNumber: sbd,
                    variantCode: vCode,
                    sourceType:
                      exam.examFormat === "HYBRID" ? "HYBRID" : "OMR",
                    mcqScore: scored.mcqScore,
                    finalScore: finalVal,
                    reconciliationFlag: reconFlag,
                  },
                });
              }
            } else {
              await prisma.testingCandidateResult.create({
                data: {
                  subjectExamId,
                  studentId: matchedStudentId,
                  candidateNumber: sbd,
                  variantCode: vCode,
                  sourceType: exam.examFormat === "HYBRID" ? "HYBRID" : "OMR",
                  mcqScore: scored.mcqScore,
                  essayScore: 0,
                  finalScore: scored.mcqScore,
                  reconciliationFlag: reconFlag,
                  approvalStatus: "DRAFT",
                },
              });
            }
          }

          newlyScored += 1;
          ackItems.push({
            idempotencyKey: item.idempotencyKey,
            sheetId: createdSheet.id,
            recognitionStatus: finalStatus,
            mcqScore: scored.mcqScore,
            correctCount: scored.correctCount,
            anomalyFlags: mergedFlags,
          });
        }

        // Recount batch statistics
        const allBatchSheets = await prisma.testingOmrSheet.findMany({
          where: { batchId: omrBatch.id },
        });
        const recCnt = allBatchSheets.filter(
          (s) =>
            s.recognitionStatus === "RECOGNIZED" ||
            s.recognitionStatus === "VERIFIED"
        ).length;
        const flagCnt = allBatchSheets.length - recCnt;

        await prisma.testingOmrBatch.update({
          where: { id: omrBatch.id },
          data: {
            totalSheets: allBatchSheets.length,
            recognizedSheets: recCnt,
            flaggedSheets: flagCnt,
            status: flagCnt > 0 ? "NEEDS_REVIEW" : "COMPLETED",
          },
        });

        await prisma.testingSubjectExam.update({
          where: { id: subjectExamId },
          data: { workflowStep: Math.max(exam.workflowStep, 8), status: "GRADING" },
        });

        await logActivity({
          action: "SYNC_OMR_RECOGNITION_BATCH",
          entityType: "TestingOmrBatch",
          entityId: omrBatch.id,
          actorName,
          actorEmail,
          description: `Đồng bộ lô OMR Edge JSON (${imageStoragePolicy}): Chấm mới ${newlyScored} phiếu, chống trùng ${deduplicatedCount} phiếu.`,
        });

        return NextResponse.json({
          success: true,
          batchId: omrBatch.id,
          newlyScored,
          deduplicatedCount,
          ackItems,
        });
      }

      case "HYBRID_SERVER_OMR_FALLBACK": {
        const {
          subjectExamId,
          candidateNumber,
          variantCode,
          answers,
          condition = "LOW_LIGHT",
          imageStoragePolicy = "ANOMALY_CROPS_ONLY",
        } = body;

        const synth = synthesizeOmrSheetGrayscaleBuffer({
          candidateNumber: candidateNumber || "200001",
          variantCode: variantCode || "101",
          answers: answers || { 1: "A", 2: "B", 3: "C", 4: "D" },
          condition,
        });

        const serverRecognized = processGrayscaleOmrSheet({
          gray: synth.gray,
          width: synth.width,
          height: synth.height,
          subjectExamId,
          totalQuestions: 20,
          rawImageBytes: 48_000, // Pre-compressed grayscale fallback image
          imageStoragePolicy,
          sourceCondition: condition,
        });

        return NextResponse.json({
          success: true,
          mode: "HYBRID_SERVER_OMR_FALLBACK",
          recognizedPayload: serverRecognized,
        });
      }

      case "SYNC_MOODLE_LMS_ATTEMPTS": {
        const { subjectExamId } = body;
        const exam = await prisma.testingSubjectExam.findUnique({
          where: { id: subjectExamId },
          include: {
            sessions: { include: { roster: true } },
          },
        });
        if (!exam) throw new Error("Không tìm thấy bài kiểm tra.");

        const rosterItems = exam.sessions.flatMap((s) => s.roster);
        const studentIds = Array.from(
          new Set(rosterItems.map((r) => r.studentId))
        );
        const students = studentIds.length
          ? await prisma.student.findMany({
              where: { id: { in: studentIds } },
            })
          : [];

        const lmsSync = await fetchMoodleQuizAttempts({
          moodleQuizId: exam.moodleQuizId || 512,
          expectedMaxScore: exam.mcqWeight || 7,
          candidateStudents: students.map((st, idx) => ({
            studentId: st.id,
            studentCode: st.studentCode,
            fullName: st.studentName,
            email: `${st.studentCode.toLowerCase()}@skyline.edu.vn`,
            candidateNumber:
              rosterItems.find((r) => r.studentId === st.id)?.candidateNumber ||
              String(200001 + idx),
          })),
        });

        let syncedCount = 0;
        for (const att of lmsSync.attempts) {
          const existing = await prisma.testingCandidateResult.findUnique({
            where: {
              subjectExamId_studentId: {
                subjectExamId,
                studentId: att.studentId,
              },
            },
          });
          const essayScore = existing?.essayScore || 0;
          const finalScore = Math.min(
            exam.maxScore || 10,
            Math.round((att.normalizedScore10 + essayScore) * 100) / 100
          );

          if (existing) {
            if (!existing.isLocked) {
              await prisma.testingCandidateResult.update({
                where: { id: existing.id },
                data: {
                  mcqScore: att.normalizedScore10,
                  finalScore,
                  sourceType:
                    exam.examFormat === "LMS_MOODLE" ? "LMS" : "HYBRID",
                  reconciliationFlag: "MATCHED",
                },
              });
            }
          } else {
            await prisma.testingCandidateResult.create({
              data: {
                subjectExamId,
                studentId: att.studentId,
                candidateNumber: att.candidateNumber,
                variantCode: "LMS",
                sourceType: exam.examFormat === "LMS_MOODLE" ? "LMS" : "HYBRID",
                mcqScore: att.normalizedScore10,
                essayScore: 0,
                finalScore: att.normalizedScore10,
                reconciliationFlag: "MATCHED",
                approvalStatus: "DRAFT",
              },
            });
          }
          syncedCount += 1;
        }

        await prisma.testingSubjectExam.update({
          where: { id: subjectExamId },
          data: {
            workflowStep: Math.max(exam.workflowStep, 8),
            moodleSyncStatus: "SYNCED",
          },
        });

        return NextResponse.json({
          success: true,
          syncedCount,
          mode: lmsSync.mode,
        });
      }

      case "OVERRIDE_OMR_SHEET": {
        const {
          sheetId,
          candidateNumber,
          variantCode,
          questionNumber,
          newOption,
          reviewReason,
        } = body;

        const sheet = await prisma.testingOmrSheet.findUnique({
          where: { id: sheetId },
          include: { batch: true },
        });
        if (!sheet) throw new Error("Không tìm thấy phiếu trả lời OMR.");

        const rawMap = JSON.parse(sheet.rawBubbleMapJson || "{}");
        if (questionNumber && newOption !== undefined) {
          rawMap[String(questionNumber)] = {
            questionNumber: Number(questionNumber),
            detectedOption: String(newOption).toUpperCase(),
            confidence: 1.0,
            status: "VALID",
          };
        }

        const finalVariantCode = variantCode || sheet.variantCode || "101";
        const officialPaper = await prisma.testingPaperSubmission.findFirst({
          where: { subjectExamId: sheet.batch.subjectExamId, isOfficial: true },
          include: { variants: true },
        });
        const matchedVariant = officialPaper?.variants.find(
          (v) => v.variantCode === finalVariantCode
        );

        const scored = scoreOmrSheetAgainstVariant({
          candidateNumber: candidateNumber || sheet.candidateNumber || "",
          variantCode: finalVariantCode,
          rawBubbleMap: rawMap,
          answerKeyMapJson: matchedVariant?.answerKeyMapJson || null,
          matchedStudentId: sheet.studentId,
        });

        const updatedSheet = await prisma.testingOmrSheet.update({
          where: { id: sheetId },
          data: {
            candidateNumber: candidateNumber || sheet.candidateNumber,
            variantCode: finalVariantCode,
            rawBubbleMapJson: JSON.stringify(rawMap),
            verifiedMapJson: JSON.stringify(rawMap),
            anomalyFlagsJson: JSON.stringify([]),
            mcqScore: scored.mcqScore,
            correctCount: scored.correctCount,
            recognitionStatus: "VERIFIED",
            reviewedById: actorName,
            reviewedAt: new Date(),
            reviewReason:
              reviewReason || "Giáo viên rà soát và xác nhận kết quả nhận diện OMR.",
          },
        });

        // Update linked TestingCandidateResult
        if (sheet.studentId) {
          const existingRes = await prisma.testingCandidateResult.findUnique({
            where: {
              subjectExamId_studentId: {
                subjectExamId: sheet.batch.subjectExamId,
                studentId: sheet.studentId,
              },
            },
          });

          if (existingRes && !existingRes.isLocked) {
            const newFinal = Math.min(
              10,
              Math.round(
                (scored.mcqScore + (existingRes.essayScore || 0)) * 100
              ) / 100
            );
            await prisma.testingCandidateResult.update({
              where: { id: existingRes.id },
              data: {
                mcqScore: scored.mcqScore,
                finalScore: newFinal,
                reconciliationFlag: "MATCHED",
              },
            });
          }
        }

        await logActivity({
          action: "OVERRIDE_OMR_SHEET",
          entityType: "TestingOmrSheet",
          entityId: sheet.id,
          actorName,
          actorEmail,
          description: `Rà soát & cập nhật phiếu OMR SBD=${updatedSheet.candidateNumber} (Mã đề ${finalVariantCode}) -> Điểm TN mới: ${scored.mcqScore}. Lý do: ${updatedSheet.reviewReason}`,
        });

        return NextResponse.json({ success: true, sheet: updatedSheet });
      }

      case "SAVE_ESSAY_SCORE": {
        const { resultId, essayScore, essayComment } = body;
        const existing = await prisma.testingCandidateResult.findUnique({
          where: { id: resultId },
        });
        if (!existing) throw new Error("Không tìm thấy bản ghi điểm học sinh.");
        if (existing.isLocked) {
          throw new Error(
            "Bảng điểm đã khóa sau phê duyệt. Không thể chỉnh sửa khi chưa mở khóa."
          );
        }

        const parsedEssay = Math.max(0, Number(essayScore || 0));
        const newFinal = Math.min(
          10,
          Math.round(((existing.mcqScore || 0) + parsedEssay) * 100) / 100
        );

        const updated = await prisma.testingCandidateResult.update({
          where: { id: resultId },
          data: {
            essayScore: parsedEssay,
            finalScore: newFinal,
            essayComment: essayComment ?? existing.essayComment,
            essayGradedById: actorName,
          },
        });

        await logActivity({
          action: "UPDATE_ESSAY_SCORE",
          entityType: "TestingCandidateResult",
          entityId: resultId,
          actorName,
          actorEmail,
          description: `Cập nhật điểm tự luận SBD=${existing.candidateNumber}: TL=${parsedEssay}, Tổng=${newFinal}`,
        });

        return NextResponse.json({ success: true, result: updated });
      }

      // =====================================================
      // STEP 9 & 10: ĐỐI SOÁT 3 CHIỀU, KHÓA & ĐỒNG BỘ SỔ ĐIỂM
      // =====================================================
      case "APPROVE_AND_SYNC_GRADEBOOK": {
        const { subjectExamId } = body;
        const syncOutcome = await syncApprovedResultsToGradebook({
          subjectExamId,
          actorName,
          actorEmail,
        });

        return NextResponse.json({
          success: true,
          ...syncOutcome,
        });
      }

      case "ROLLBACK_GRADEBOOK_LOCK": {
        const { subjectExamId, reason } = body;
        const res = await rollbackExamGradebookSync({
          subjectExamId,
          reason: reason || "Mở khóa theo yêu cầu điều chỉnh của Ban Khảo thí",
          actorName,
          actorEmail,
        });
        return NextResponse.json({ success: true, ...res });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Action không hợp lệ: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[POST /api/testing/workspace] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xử lý nghiệp vụ Khảo thí Số" },
      { status: 500 }
    );
  }
}
