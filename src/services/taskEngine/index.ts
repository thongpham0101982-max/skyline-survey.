import { prisma } from "@/lib/db"
import { SSMTask, TaskPriority, TaskStatus, SourceModule, TaskSummaryCounts } from "./types"
import { resolveTeacherAssignmentProfile } from "./assignmentMapper"

export interface TaskFilterOptions {
  academicYearId?: string
  campusId?: string
  classId?: string
  subjectId?: string
  module?: SourceModule | "ALL"
  status?: TaskStatus | "ALL" | "TODAY" | "OVERDUE" | "WAITING" | "COMPLETED"
  timeRange?: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL"
  search?: string
  includeCompleted?: boolean
}

function createEmptyModuleCounts(): Record<SourceModule, number> {
  return {
    KHAO_SAT_DAU_VAO: 0,
    LOP_CHU_NHIEM: 0,
    MON_DAC_THU: 0,
    CHAT_LUONG_GIANG_DAY: 0,
    NPS_PHHS: 0,
    Y_KIEN_PHHS: 0,
    TRAI_NGHIEM: 0,
    DU_GIO: 0,
    CO_VAN: 0,
    PHHS: 0,
    HO_TRO: 0,
    KHAO_THI: 0,
    CONG_TAC: 0,
  }
}

/**
 * Task Aggregation Service
 * Tự động tổng hợp, chuẩn hóa và khử trùng lặp nhiệm vụ của giáo viên từ toàn bộ 9 phân hệ nghiệp vụ Sky-Line.
 */
export async function aggregateTeacherTasks(
  userId: string,
  options?: TaskFilterOptions
): Promise<{
  tasks: SSMTask[]
  counts: TaskSummaryCounts
}> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Map để khử trùng lặp tuyệt đối theo taskId
  const taskMap = new Map<string, SSMTask>()
  const addTask = (task: SSMTask) => {
    if (!taskMap.has(task.taskId)) {
      taskMap.set(task.taskId, task)
    }
  }

  // 1. Giải quyết hồ sơ phân công đa vai trò của giáo viên
  const profile = await resolveTeacherAssignmentProfile(userId, options?.academicYearId)
  const teacherId = profile?.teacherId || null
  const homeroomClasses = profile?.homeroomClasses || []
  const homeroomClassIds = homeroomClasses.map((c) => c.id)

  // ============================================================================
  // PHÂN HỆ 1: KHẢO SÁT ĐỊNH HƯỚNG ĐẦU VÀO (KHAO_SAT_DAU_VAO)
  // ============================================================================
  try {
    const [orientationRecords, generalInputAssigns, preschoolInputAssigns, examinerSessions] = await Promise.all([
      prisma.studentOrientationRecord.findMany({
        where: {
          OR: [
            { interviewerId: userId },
            { psychologyTeacherId: userId },
            ...(teacherId ? [{ interviewerId: teacherId }, { psychologyTeacherId: teacherId }] : []),
          ],
          status: { in: ["DRAFT", "SUBMITTED"] },
        },
        include: { student: true },
        take: 25,
      }).catch(() => []),

      prisma.inputAssessmentTeacherAssignment.findMany({
        where: { userId },
        include: {
          subject: true,
          period: true,
          batch: true,
        },
      }).catch(() => []),

      prisma.preschoolInputAssessmentTeacherAssignment.findMany({
        where: {
          OR: [{ userId }, { delegatedUserId: userId }],
        },
        include: {
          period: true,
          batch: true,
        },
      }).catch(() => []),

      prisma.inputAssessmentSessionExaminer.findMany({
        where: {
          userId,
        },
        include: { session: true },
        take: 15,
      }).catch(() => []),
    ])

    // 1.1. Hồ sơ phỏng vấn định hướng đầu vào
    for (const rec of orientationRecords) {
      const isPsych =
        rec.psychologyReferralStatus === "REQUESTED" &&
        (rec.psychologyTeacherId === userId || rec.psychologyTeacherId === teacherId)
      const isWaiting = rec.status === "SUBMITTED" && !isPsych
      const studentAny = rec.student as any
      const gradeApplying = studentAny?.gradeApplying || rec.student?.grade || "K-12"

      addTask({
        taskId: `ksdv-orient-${rec.id}`,
        taskType: isPsych ? "ORIENTATION_PSYCHOLOGY" : "ORIENTATION_INTERVIEW",
        sourceModule: "KHAO_SAT_DAU_VAO",
        sourceId: rec.id,
        title: isPsych
          ? `Tham vấn tâm lý đầu vào: HS ${rec.student?.fullName || "Học sinh mới"}`
          : `Hoàn thiện hồ sơ phỏng vấn định hướng: ${rec.student?.fullName || "Học sinh mới"}`,
        description: isWaiting
          ? `Hồ sơ phỏng vấn khối ${gradeApplying} đã nộp và đang chờ Hội đồng tuyển sinh phê duyệt.`
          : `Cập nhật nhận xét phỏng vấn, định hướng lộ trình học tập và kết luận đầu vào (Khối ${gradeApplying}).`,
        priority: isPsych ? "URGENT" : "HIGH",
        status: isWaiting ? "WAITING" : "IN_PROGRESS",
        deadline: "Trong tuần",
        deadlineDate: weekEnd.toISOString(),
        assignedUserId: userId,
        deepLink: "/teacher/input-assessments?type=general",
        createdAt: rec.createdAt.toISOString(),
        updatedAt: rec.updatedAt.toISOString(),
        metadata: {
          moduleLabel: "Khảo sát đầu vào",
          badgeColor: "sky",
          studentName: rec.student?.fullName,
          approvalStatus: isWaiting ? "PENDING_APPROVAL" : "DRAFT",
          approverRole: "Hội đồng Tuyển sinh",
          completionConditions: [
            {
              code: "INTERVIEW_CONTENT",
              label: "Điền đầy đủ nhận xét năng lực & định hướng",
              currentValue: rec.status === "SUBMITTED" ? 1 : 0,
              targetValue: 1,
              isMet: rec.status === "SUBMITTED",
            },
          ],
        },
      })
    }

    // 1.2. Chấm khảo sát môn đầu vào phổ thông K-12
    if (generalInputAssigns.length > 0) {
      const gradesAssigned = Array.from(
        new Set(generalInputAssigns.map((a) => a.grade).filter(Boolean))
      )
      const subjectIdsAssigned = Array.from(
        new Set(generalInputAssigns.map((a: any) => a.subjectId).filter(Boolean))
      )
      const subjectNamesAssigned = Array.from(
        new Set(
          generalInputAssigns
            .map((a: any) => a.subject?.name || a.subject?.subjectName || a.subjectCode || a.subjectId)
            .filter(Boolean)
        )
      )
      const periodIdsAssigned = Array.from(
        new Set(generalInputAssigns.map((a: any) => a.periodId).filter(Boolean))
      )

      let totalExpected = 0
      let ungradedCount = 0

      // Ưu tiên truy vấn bảng thực tế InputAssessmentStudent
      if (periodIdsAssigned.length > 0 && prisma.inputAssessmentStudent) {
        const k12Students = await prisma.inputAssessmentStudent
          .findMany({
            where: {
              periodId: { in: periodIdsAssigned },
            },
            include: {
              scores: {
                where:
                  subjectIdsAssigned.length > 0
                    ? { subjectId: { in: subjectIdsAssigned } }
                    : undefined,
              },
            },
            take: 200,
          })
          .catch(() => [])

        const matchingStudents = k12Students.filter((st: any) => {
          const stGradeClean = String(st.grade || "")
            .toLowerCase()
            .replace("khối", "")
            .trim()
          return generalInputAssigns.some((a: any) => {
            if (a.periodId && st.periodId !== a.periodId) return false
            if (a.batchId && st.batchId && st.batchId !== a.batchId) return false
            const aGradeClean = String(a.grade || "")
              .toLowerCase()
              .replace("khối", "")
              .trim()
            return !aGradeClean || aGradeClean === "tất cả" || stGradeClean === aGradeClean
          })
        })

        totalExpected = matchingStudents.length
        ungradedCount = matchingStudents.filter((st: any) => {
          const scores = st.scores || []
          if (scores.length === 0) return true
          return scores.every((sc: any) => {
            const emptyScore = !sc.scores || sc.scores === "[]" || sc.scores === "{}"
            const emptyComment = !sc.comments || sc.comments === "[]" || sc.comments === "{}"
            return emptyScore && emptyComment
          })
        }).length
      }

      // Fallback tương thích unit test mock (studentApplicant)
      if (totalExpected === 0 && (prisma as any).studentApplicant) {
        const subjectsAssigned = Array.from(
          new Set(generalInputAssigns.map((a: any) => a.subjectCode || a.subjectId))
        )
        const pendingApplicants =
          (await (prisma as any).studentApplicant
            ?.findMany({
              where: {
                gradeApplying: { in: gradesAssigned },
                overallStatus: { in: ["PENDING", "IN_PROGRESS"] },
              },
              include: {
                scores: {
                  where: { subjectCode: { in: subjectsAssigned } },
                },
              },
              take: 50,
            })
            ?.catch(() => [])) ?? []

        totalExpected = pendingApplicants.length
        ungradedCount = pendingApplicants.filter((app: any) => {
          return subjectsAssigned.some((subj) => {
            const found = app.scores?.find((s: any) => s.subjectCode === subj)
            return !found || (found.score === null && !found.comment)
          })
        }).length
      }

      if (ungradedCount > 0) {
        const completedCount = Math.max(0, totalExpected - ungradedCount)
        addTask({
          taskId: `ksdv-k12-grading-${userId}`,
          taskType: "INPUT_ASSESSMENT_GRADING",
          sourceModule: "KHAO_SAT_DAU_VAO",
          sourceId: generalInputAssigns[0].id,
          title: `Chấm khảo sát đầu vào K-12 (${ungradedCount} hồ sơ chờ nhập điểm)`,
          description: `Phân công chấm môn ${subjectNamesAssigned.join(", ")} (Khối ${gradesAssigned.join(", ")}). Đã hoàn thành ${completedCount}/${totalExpected} hồ sơ.`,
          priority: "HIGH",
          status: completedCount > 0 ? "IN_PROGRESS" : "NEW",
          deadline: "Hạn chấm khảo sát",
          deadlineDate: weekEnd.toISOString(),
          assignedUserId: userId,
          deepLink: "/teacher/input-assessments?type=general",
          createdAt: generalInputAssigns[0].createdAt.toISOString(),
          metadata: {
            moduleLabel: "Khảo sát đầu vào",
            badgeColor: "sky",
            subjectName: subjectNamesAssigned.join(", "),
            progressCurrent: completedCount,
            progressTotal: totalExpected,
            progressPercent:
              totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100) : 0,
            completionConditions: [
              {
                code: "SCORE_AND_COMMENT",
                label: "Nhập điểm và nhận xét năng lực đầu vào cho học sinh",
                currentValue: completedCount,
                targetValue: totalExpected,
                isMet: ungradedCount === 0,
              },
            ],
          },
        })
      }
    }

    // 1.3. Khảo sát đầu vào Mầm non
    if (preschoolInputAssigns.length > 0) {
      const ageGroups = Array.from(
        new Set(preschoolInputAssigns.map((a: any) => a.ageGroup || a.grade).filter(Boolean))
      )
      const preschoolPeriodIds = Array.from(
        new Set(preschoolInputAssigns.map((a: any) => a.periodId).filter(Boolean))
      )

      let pendingPreschoolers = 0
      if (preschoolPeriodIds.length > 0 && prisma.preschoolInputAssessmentStudent) {
        pendingPreschoolers = await prisma.preschoolInputAssessmentStudent
          .count({
            where: {
              periodId: { in: preschoolPeriodIds },
              OR: [{ admissionResult: null }, { admissionResult: "" }],
            },
          })
          .catch(() => 0)
      }

      if (pendingPreschoolers === 0 && (prisma as any).preschoolApplicant) {
        pendingPreschoolers =
          (await (prisma as any).preschoolApplicant
            ?.count({
              where: {
                ageGroup: { in: ageGroups },
                overallStatus: { in: ["PENDING", "IN_PROGRESS"] },
              },
            })
            ?.catch(() => 0)) ?? 0
      }

      if (pendingPreschoolers > 0) {
        addTask({
          taskId: `ksdv-preschool-${userId}`,
          taskType: "PRESCHOOL_INPUT_ASSESSMENT",
          sourceModule: "KHAO_SAT_DAU_VAO",
          sourceId: preschoolInputAssigns[0].id,
          title: `Đánh giá trải nghiệm đầu vào Mầm non (${pendingPreschoolers} bé)`,
          description: `Hoàn thiện phiếu quan sát phát triển cho trẻ nhóm tuổi ${ageGroups.join(", ")}.`,
          priority: "HIGH",
          status: "IN_PROGRESS",
          deadline: "Trong tuần",
          deadlineDate: weekEnd.toISOString(),
          assignedUserId: userId,
          deepLink: "/teacher/input-assessments?type=preschool",
          createdAt: preschoolInputAssigns[0].createdAt.toISOString(),
          metadata: {
            moduleLabel: "Khảo sát đầu vào MN",
            badgeColor: "sky",
          },
        })
      }
    }

    // 1.4. Lịch coi khảo sát đầu vào
    for (const ex of examinerSessions) {
      const exAny = ex as any
      if (!exAny.session) continue
      const sessionDate = new Date(exAny.session.sessionDate || exAny.session.date || now)
      if (sessionDate < todayStart || sessionDate > weekEnd) continue
      const isToday = sessionDate >= todayStart && sessionDate <= todayEnd
      addTask({
        taskId: `ksdv-session-${ex.id}`,
        taskType: "INPUT_EXAMINER_SESSION",
        sourceModule: "KHAO_SAT_DAU_VAO",
        sourceId: ex.id,
        title: `Coi & Phỏng vấn đợt khảo sát: ${exAny.session.sessionName || exAny.session.name || "Đợt khảo sát"}`,
        description: `Thời gian: ${exAny.session.startTime || "08:00"} - ${exAny.session.endTime || "11:00"} tại ${exAny.room || exAny.session.location || "Phòng khảo sát"}`,
        priority: isToday ? "URGENT" : "HIGH",
        status: "NEW",
        deadline: isToday ? "Hôm nay" : sessionDate.toLocaleDateString("vi-VN"),
        deadlineDate: sessionDate.toISOString(),
        assignedUserId: userId,
        deepLink: "/teacher/input-assessments?type=general",
        createdAt: ex.createdAt.toISOString(),
        metadata: {
          moduleLabel: "Khảo sát đầu vào",
          badgeColor: "sky",
        },
      })
    }
  } catch (err) {
    console.warn("[TaskEngine] Module 1 (KHAO_SAT_DAU_VAO) warning:", err)
  }

  // ============================================================================
  // PHÂN HỆ 2: LỚP CHỦ NHIỆM & ĐÁNH GIÁ NĂNG LỰC (LOP_CHU_NHIEM)
  // ============================================================================
  if (homeroomClassIds.length > 0) {
    try {
      for (const hrClass of homeroomClasses) {
        const [evaluatedCompStudents, mockCompCount, termSummariesCount] = await Promise.all([
          prisma.studentSubjectCompetencySummary
            ?.findMany({
              where: {
                student: { classId: hrClass.id, status: "ACTIVE" },
              },
              select: { studentId: true },
              distinct: ["studentId"],
            })
            ?.catch(() => []) ?? Promise.resolve([]),

          (prisma as any).studentCompetencySummary
            ?.count({
              where: {
                student: { classId: hrClass.id, status: "ACTIVE" },
              },
            })
            ?.catch(() => 0) ?? Promise.resolve(0),

          prisma.studentTermSummary
            .count({
              where: {
                student: { classId: hrClass.id, status: "ACTIVE" },
              },
            })
            .catch(() => 0),
        ])

        const totalStudents = hrClass.studentCount
        const compCount =
          evaluatedCompStudents.length > 0 ? evaluatedCompStudents.length : mockCompCount
        const missingComp = Math.max(0, totalStudents - compCount)

        if (totalStudents > 0 && missingComp > 0) {
          addTask({
            taskId: `lcn-dgnl-${hrClass.id}`,
            taskType: "HOMEROOM_COMPETENCY_ASSESSMENT",
            sourceModule: "LOP_CHU_NHIEM",
            sourceId: hrClass.id,
            title: `Đánh giá năng lực (ĐGNL) lớp chủ nhiệm ${hrClass.className} (Còn ${missingComp}/${totalStudents} HS)`,
            description: `Rà soát và hoàn thiện đánh giá các chỉ số năng lực cốt lõi cho học sinh lớp ${hrClass.className}.`,
            priority: missingComp > totalStudents * 0.5 ? "HIGH" : "NORMAL",
            status: compCount > 0 ? "IN_PROGRESS" : "NEW",
            deadline: "Trong học kỳ",
            deadlineDate: monthEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `/teacher/ho-so-nang-luc?classId=${hrClass.id}`,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Lớp chủ nhiệm • ĐGNL",
              badgeColor: "teal",
              campusId: hrClass.campusId,
              campusName: hrClass.campusName,
              classId: hrClass.id,
              className: hrClass.className,
              progressCurrent: compCount,
              progressTotal: totalStudents,
              progressPercent: Math.round((compCount / totalStudents) * 100),
              completionConditions: [
                {
                  code: "DGNL_COVERAGE",
                  label: `Hoàn thành đánh giá năng lực cho ${totalStudents} học sinh lớp ${hrClass.className}`,
                  currentValue: compCount,
                  targetValue: totalStudents,
                  isMet: missingComp === 0,
                },
              ],
            },
          })
        }

        const missingSummaries = Math.max(0, totalStudents - termSummariesCount)
        if (totalStudents > 0 && missingSummaries > 0) {
          addTask({
            taskId: `lcn-profile-${hrClass.id}`,
            taskType: "HOMEROOM_STUDENT_PROFILE",
            sourceModule: "LOP_CHU_NHIEM",
            sourceId: hrClass.id,
            title: `Cập nhật nhận xét & hồ sơ học tập lớp ${hrClass.className} (${termSummariesCount}/${totalStudents} HS)`,
            description: `Hoàn thiện nhận xét tổng hợp, điểm mạnh nổi bật và cam kết học tập cho học sinh lớp chủ nhiệm ${hrClass.className}.`,
            priority: "NORMAL",
            status: termSummariesCount > 0 ? "IN_PROGRESS" : "NEW",
            deadline: "Cuối đợt đánh giá",
            deadlineDate: monthEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `/teacher/classes?classId=${hrClass.id}`,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Lớp chủ nhiệm",
              badgeColor: "teal",
              campusId: hrClass.campusId,
              campusName: hrClass.campusName,
              classId: hrClass.id,
              className: hrClass.className,
              progressCurrent: termSummariesCount,
              progressTotal: totalStudents,
              progressPercent: Math.round((termSummariesCount / totalStudents) * 100),
              completionConditions: [
                {
                  code: "TERM_SUMMARY",
                  label: "Hoàn thiện nhận xét hồ sơ học tập học sinh",
                  currentValue: termSummariesCount,
                  targetValue: totalStudents,
                  isMet: missingSummaries === 0,
                },
              ],
            },
          })
        }

        // 2.3. Sổ theo dõi Hướng nghiệp (Khối 6-12) cho GVCN
        const gradeNumForCareer = parseInt(String(hrClass.grade || "").replace(/[^0-9]/g, ""), 10)
        if (!isNaN(gradeNumForCareer) && gradeNumForCareer >= 6 && totalStudents > 0) {
          const careerEntries = await (prisma as any).studentCareerOrientation
            ?.findMany({
              where: {
                student: { classId: hrClass.id, status: "ACTIVE" },
                ...(profile?.academicYearId ? { academicYearId: profile.academicYearId } : {}),
              },
              select: { studentId: true, gvcnRemark: true, initialOrientation: true, surveyResult: true },
            })
            .catch(() => []) || []

          const evaluatedCareerCount = new Set(
            careerEntries
              .filter((c: any) => c.gvcnRemark || c.initialOrientation || c.surveyResult)
              .map((c: any) => c.studentId)
          ).size
          const missingCareer = Math.max(0, totalStudents - evaluatedCareerCount)

          if (missingCareer > 0) {
            addTask({
              taskId: `lcn-career-${hrClass.id}`,
              taskType: "CAREER_PROFILE_UPDATE",
              sourceModule: "LOP_CHU_NHIEM",
              sourceId: hrClass.id,
              title: `Cập nhật Sổ theo dõi Hướng nghiệp lớp ${hrClass.className} (Còn ${missingCareer}/${totalStudents} HS)`,
              description: `Ghi nhận kết quả khảo sát, định hướng ban đầu và nhận xét hướng nghiệp của GVCN cho học sinh lớp ${hrClass.className} (Đã cập nhật ${evaluatedCareerCount}/${totalStudents} HS).`,
              priority: "NORMAL",
              status: evaluatedCareerCount > 0 ? "IN_PROGRESS" : "NEW",
              deadline: "Trong học kỳ",
              deadlineDate: monthEnd.toISOString(),
              assignedUserId: userId,
              deepLink: `/teacher/special-subjects/career-profile?classId=${hrClass.id}`,
              createdAt: now.toISOString(),
              metadata: {
                moduleLabel: "Sổ hướng nghiệp",
                badgeColor: "indigo",
                campusId: hrClass.campusId,
                campusName: hrClass.campusName,
                classId: hrClass.id,
                className: hrClass.className,
                progressCurrent: evaluatedCareerCount,
                progressTotal: totalStudents,
                progressPercent: Math.round((evaluatedCareerCount / totalStudents) * 100),
                completionConditions: [
                  {
                    code: "CAREER_ORIENTATION_LOG",
                    label: `Cập nhật hồ sơ định hướng nghề nghiệp cho ${totalStudents} học sinh lớp ${hrClass.className}`,
                    currentValue: evaluatedCareerCount,
                    targetValue: totalStudents,
                    isMet: missingCareer === 0,
                  },
                ],
              },
            })
          }
        }
      }
    } catch (err) {
      console.warn("[TaskEngine] Module 2 (LOP_CHU_NHIEM) warning:", err)
    }
  }

  // ============================================================================
  // PHÂN HỆ 3: ĐÁNH GIÁ MÔN ĐẶC THÙ (MON_DAC_THU)
  // ============================================================================
  if (profile && profile.specialAssignments.length > 0 && teacherId) {
    try {
      for (const spec of profile.specialAssignments) {
        const [gradeEntriesByAssign, classStudentCount] = await Promise.all([
          prisma.specialGradeEntry
            .findMany({
              where: {
                assignmentId: spec.assignmentId,
              },
              select: { id: true, status: true, studentId: true },
            })
            .catch(() => []),

          spec.classId
            ? prisma.student
                .count({
                  where: { classId: spec.classId, status: "ACTIVE" },
                })
                .catch(() => 0)
            : Promise.resolve(0),
        ])

        const gradeEntries: Array<{ id: string; status: string; studentId?: string }> =
          gradeEntriesByAssign

        const draftCount = gradeEntries.filter((g) => g.status === "DRAFT").length
        const submittedCount = gradeEntries.filter((g) => g.status === "SUBMITTED").length
        const completedOrApprovedCount = gradeEntries.filter(
          (g) => g.status === "APPROVED" || g.status === "COMPLETED"
        ).length
        const uniqueEvaluatedStudents = new Set(
          gradeEntries.map((g) => g.studentId).filter(Boolean)
        ).size
        const evaluatedCount =
          uniqueEvaluatedStudents > 0
            ? uniqueEvaluatedStudents
            : completedOrApprovedCount + submittedCount
        const targetCount = Math.max(1, classStudentCount || gradeEntries.length || 1)
        const missingStudents = Math.max(0, targetCount - evaluatedCount)
        const deepLinkUrl = `/teacher/special-subjects/eval?subject=${spec.subjectCode}${spec.classId ? `&classId=${spec.classId}` : ""}`

        if (submittedCount > 0 && draftCount === 0) {
          // Đang chờ duyệt -> WAITING để không nhắc sai trách nhiệm giáo viên
          addTask({
            taskId: `mdt-wait-${spec.assignmentId}`,
            taskType: "SPECIAL_SUBJECT_WAITING_APPROVAL",
            sourceModule: "MON_DAC_THU",
            sourceId: spec.assignmentId,
            title: `[Chờ duyệt] Kết quả môn đặc thù ${spec.subjectName} (${submittedCount} học sinh)`,
            description: `Đã gửi kết quả đánh giá môn ${spec.subjectName}, đang chờ Tổ trưởng / BGH phê duyệt.`,
            priority: "LOW",
            status: "WAITING",
            deadline: "Đang chờ phê duyệt",
            deadlineDate: monthEnd.toISOString(),
            assignedUserId: userId,
            deepLink: deepLinkUrl,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Môn đặc thù",
              badgeColor: "purple",
              className: spec.className || `Khối ${spec.grade}`,
              subjectId: spec.subjectCode,
              subjectName: spec.subjectName,
              approvalStatus: "PENDING_APPROVAL",
              approverRole: "TTCM / BGH",
            },
          })
        } else if (draftCount > 0 || gradeEntries.length === 0 || (classStudentCount > 0 && missingStudents > 0)) {
          addTask({
            taskId: `mdt-eval-${spec.assignmentId}`,
            taskType: "SPECIAL_SUBJECT_EVALUATION",
            sourceModule: "MON_DAC_THU",
            sourceId: spec.assignmentId,
            title: `Đánh giá môn đặc thù ${spec.subjectName} - ${spec.className || `Khối ${spec.grade}`}${classStudentCount > 0 ? ` (Còn ${missingStudents}/${classStudentCount} HS)` : ""}`,
            description:
              draftCount > 0
                ? `Còn ${draftCount} bản ghi đánh giá ở trạng thái Nháp cần hoàn thiện và gửi duyệt.`
                : classStudentCount > 0
                ? `Thực hiện đánh giá năng lực môn ${spec.subjectName} cho lớp ${spec.className} (Đã hoàn thành ${evaluatedCount}/${classStudentCount} học sinh).`
                : `Thực hiện nhập kết quả đánh giá năng lực môn ${spec.subjectName} và nhật ký giảng dạy.`,
            priority: missingStudents > 0 ? "HIGH" : "NORMAL",
            status: evaluatedCount > 0 || draftCount > 0 ? "IN_PROGRESS" : "NEW",
            deadline: "Trong đợt đánh giá",
            deadlineDate: monthEnd.toISOString(),
            assignedUserId: userId,
            deepLink: deepLinkUrl,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Môn đặc thù",
              badgeColor: "purple",
              campusId: spec.campusId || undefined,
              campusName: spec.campusName || undefined,
              classId: spec.classId || undefined,
              className: spec.className || `Khối ${spec.grade}`,
              subjectId: spec.subjectCode,
              subjectName: spec.subjectName,
              educationSystem: spec.educationSystem,
              approvalStatus: "DRAFT",
              progressCurrent: evaluatedCount,
              progressTotal: targetCount,
              progressPercent: Math.round((evaluatedCount / targetCount) * 100),
              completionConditions: [
                {
                  code: "SPECIAL_GRADE_SUBMIT",
                  label: `Hoàn thành đánh giá môn ${spec.subjectName} cho học sinh lớp phụ trách`,
                  currentValue: evaluatedCount,
                  targetValue: targetCount,
                  isMet: draftCount === 0 && evaluatedCount >= targetCount,
                },
              ],
            },
          })
        }
      }
    } catch (err) {
      console.warn("[TaskEngine] Module 3 (MON_DAC_THU) warning:", err)
    }
  }

  // ============================================================================
  // PHÂN HỆ 4: CHẤT LƯỢNG MÔN GIẢNG DẠY & SỔ ĐIỂM (CHAT_LUONG_GIANG_DAY)
  // ============================================================================
  if (profile && (profile.teachingAssignments.length > 0 || profile.ctqtAssignments.length > 0)) {
    try {
      // 4.1. Các lớp giảng dạy MOET
      for (const assign of profile.teachingAssignments) {
        const [totalStudents, gradeEntries, benchmarkCfg] = await Promise.all([
          prisma.student.count({
            where: { classId: assign.classId, status: "ACTIVE" },
          }).catch(() => 0),

          prisma.subjectGradeEntry.findMany({
            where: { classId: assign.classId, subjectId: assign.subjectId },
            select: { compositeScore: true, remark: true, studentId: true },
          }).catch(() => []),

          prisma.subjectBenchmarkConfig.findFirst({
            where: {
              OR: [{ grade: assign.grade }, { grade: "ALL" }],
            },
          }).catch(() => null),
        ])

        if (totalStudents === 0) continue

        // Deduplicate by studentId for current completion check
        const scoredStudentIds = new Set(
          gradeEntries
            .filter((g: any) => g.compositeScore !== null || g.remark || g.teacherRemark)
            .map((g) => g.studentId)
        )
        const enteredCount = scoredStudentIds.size
        const missingCount = Math.max(0, totalStudents - enteredCount)

        if (missingCount > 0) {
          addTask({
            taskId: `clgd-gradebook-${assign.classId}-${assign.subjectId}`,
            taskType: "SUBJECT_GRADEBOOK_ENTRY",
            sourceModule: "CHAT_LUONG_GIANG_DAY",
            sourceId: assign.assignmentId,
            title: `Hoàn thiện Sổ điểm & Nhận xét môn ${assign.subjectName} - Lớp ${assign.className} (Còn ${missingCount}/${totalStudents} HS)`,
            description: `Đã nhập điểm/nhận xét cho ${enteredCount}/${totalStudents} học sinh lớp ${assign.className}. Vui lòng hoàn tất trước hạn khóa sổ.`,
            priority: missingCount > totalStudents * 0.3 ? "HIGH" : "NORMAL",
            status: enteredCount > 0 ? "IN_PROGRESS" : "NEW",
            deadline: "Trước hạn khóa sổ",
            deadlineDate: weekEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `/teacher/so-diem-nhan-xet?classId=${assign.classId}&subjectId=${assign.subjectId}`,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Chất lượng giảng dạy",
              badgeColor: "emerald",
              campusId: assign.campusId,
              campusName: assign.campusName,
              classId: assign.classId,
              className: assign.className,
              subjectId: assign.subjectId,
              subjectName: assign.subjectName,
              progressCurrent: enteredCount,
              progressTotal: totalStudents,
              progressPercent: Math.round((enteredCount / totalStudents) * 100),
              completionConditions: [
                {
                  code: "GRADEBOOK_100",
                  label: `Nhập đủ điểm và nhận xét cho ${totalStudents} học sinh`,
                  currentValue: enteredCount,
                  targetValue: totalStudents,
                  isMet: missingCount === 0,
                },
              ],
            },
          })
        }

        // Kiểm tra học sinh dưới chuẩn Benchmark
        const gradeNum = parseInt(assign.grade, 10)
        const defaultBenchmark = !isNaN(gradeNum) && gradeNum <= 5 ? 7.0 : 6.0
        const benchmarkScore = benchmarkCfg?.benchmarkScore ?? defaultBenchmark

        const latestScoreByStudent = new Map<string, number>()
        for (const g of gradeEntries) {
          if (typeof g.compositeScore === "number" && !isNaN(g.compositeScore)) {
            latestScoreByStudent.set(g.studentId, g.compositeScore)
          }
        }
        let underBenchmarkCount = 0
        latestScoreByStudent.forEach((score) => {
          if (score < benchmarkScore) underBenchmarkCount++
        })

        if (underBenchmarkCount > 0) {
          addTask({
            taskId: `clgd-benchmark-${assign.classId}-${assign.subjectId}`,
            taskType: "SUBJECT_BENCHMARK_REMEDIAL",
            sourceModule: "CHAT_LUONG_GIANG_DAY",
            sourceId: assign.assignmentId,
            title: `Hỗ trợ ${underBenchmarkCount} học sinh dưới chuẩn Benchmark môn ${assign.subjectName} (${assign.className})`,
            description: `Có ${underBenchmarkCount} học sinh đạt điểm dưới chuẩn ${benchmarkScore} môn ${assign.subjectName}. Cần lập giải pháp bồi dưỡng và theo dõi sự tiến bộ.`,
            priority: "HIGH",
            status: "IN_PROGRESS",
            deadline: "Theo dõi định kỳ",
            deadlineDate: monthEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `/teacher/phan-tich-chat-luong?classId=${assign.classId}&subjectId=${assign.subjectId}`,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Chất lượng giảng dạy",
              badgeColor: "amber",
              campusId: assign.campusId,
              campusName: assign.campusName,
              classId: assign.classId,
              className: assign.className,
              subjectId: assign.subjectId,
              subjectName: assign.subjectName,
              underBenchmarkCount,
              benchmarkScore,
              completionConditions: [
                {
                  code: "REMEDIAL_PLAN",
                  label: "Rà soát danh sách HS dưới chuẩn & cập nhật giải pháp hỗ trợ",
                  currentValue: latestScoreByStudent.size - underBenchmarkCount,
                  targetValue: latestScoreByStudent.size,
                  isMet: false,
                },
              ],
            },
          })
        }
      }

      // 4.2. Các lớp Chương trình Quốc tế (CTQT)
      for (const ctqt of profile.ctqtAssignments) {
        const ctqtEntries = await prisma.ctqtGradeEntry.findMany({
          where: { classId: ctqt.classId, subjectCode: ctqt.subjectCode },
        }).catch(() => [])

        const resolveCtqtStatus = (e: any) =>
          e.status || e.endTermApprovalStatus || e.midTermApprovalStatus || "DRAFT"

        const changesRequested = ctqtEntries.filter(
          (e) => resolveCtqtStatus(e) === "CHANGES_REQUESTED" || resolveCtqtStatus(e) === "REJECTED"
        ).length
        const pendingReview = ctqtEntries.filter(
          (e) => resolveCtqtStatus(e) === "PENDING_REVIEW" || resolveCtqtStatus(e) === "SUBMITTED"
        ).length
        const draftEntries = ctqtEntries.filter(
          (e) => resolveCtqtStatus(e) === "DRAFT"
        ).length

        if (changesRequested > 0 || draftEntries > 0) {
          addTask({
            taskId: `clgd-ctqt-${ctqt.classId}-${ctqt.subjectId}`,
            taskType: "CTQT_GRADEBOOK_ACTION",
            sourceModule: "CHAT_LUONG_GIANG_DAY",
            sourceId: ctqt.assignmentId,
            title:
              changesRequested > 0
                ? `Điều chỉnh sổ điểm CTQT theo góp ý duyệt: ${ctqt.subjectName} (${ctqt.className})`
                : `Hoàn thiện sổ điểm CTQT: ${ctqt.subjectName} - Lớp ${ctqt.className}`,
            description:
              changesRequested > 0
                ? `Có ${changesRequested} bản ghi điểm CTQT được yêu cầu chỉnh sửa/bổ sung nhận xét.`
                : `Còn ${draftEntries} bản ghi điểm CTQT ở trạng thái Nháp chưa gửi phê duyệt.`,
            priority: changesRequested > 0 ? "URGENT" : "HIGH",
            status: "IN_PROGRESS",
            deadline: "Trong tuần",
            deadlineDate: weekEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `/teacher/ctqt-grades?classId=${ctqt.classId}&subjectId=${ctqt.subjectId}`,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Chất lượng CTQT",
              badgeColor: "indigo",
              campusId: ctqt.campusId,
              campusName: ctqt.campusName,
              classId: ctqt.classId,
              className: ctqt.className,
              subjectId: ctqt.subjectId,
              subjectName: ctqt.subjectName,
              approvalStatus: changesRequested > 0 ? "CHANGES_REQUESTED" : "DRAFT",
            },
          })
        } else if (pendingReview > 0) {
          addTask({
            taskId: `clgd-ctqt-wait-${ctqt.classId}-${ctqt.subjectId}`,
            taskType: "CTQT_GRADEBOOK_WAITING",
            sourceModule: "CHAT_LUONG_GIANG_DAY",
            sourceId: ctqt.assignmentId,
            title: `[Chờ duyệt] Bảng điểm CTQT môn ${ctqt.subjectName} - Lớp ${ctqt.className}`,
            description: `Đã gửi ${pendingReview} kết quả đánh giá CTQT, đang chờ Quản lý CTQT phê duyệt.`,
            priority: "LOW",
            status: "WAITING",
            deadline: "Đang chờ duyệt",
            deadlineDate: weekEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `/teacher/ctqt-grades?classId=${ctqt.classId}&subjectId=${ctqt.subjectId}`,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Chất lượng CTQT",
              badgeColor: "indigo",
              classId: ctqt.classId,
              className: ctqt.className,
              subjectId: ctqt.subjectId,
              subjectName: ctqt.subjectName,
              approvalStatus: "PENDING_APPROVAL",
              approverRole: "Quản lý CTQT",
            },
          })
        }
      }
    } catch (err) {
      console.warn("[TaskEngine] Module 4 (CHAT_LUONG_GIANG_DAY) warning:", err)
    }
  }

  // ============================================================================
  // PHÂN HỆ 5: NPS PHỤ HUYNH (NPS_PHHS)
  // ============================================================================
  if (homeroomClasses.length > 0) {
    try {
      const openSurveyPeriod = await prisma.surveyPeriod.findFirst({
        where: {
          status: "OPEN",
          targetAudience: "PHHS",
        },
        orderBy: { startDate: "desc" },
      }).catch(() => null)

      if (openSurveyPeriod) {
        const classSummaries = await prisma.summaryByClass.findMany({
          where: {
            surveyPeriodId: openSurveyPeriod.id,
            classId: { in: homeroomClassIds },
          },
        }).catch(() => [])

        for (const sum of classSummaries) {
          const sumAny = sum as any
          const hrClass = homeroomClasses.find(
            (c) => c.id === sum.classId || c.className === sumAny.className
          )
          const resolvedClassName = hrClass?.className || sumAny.className || sum.classId
          const participationRate =
            typeof sumAny.participationRate === "number"
              ? sumAny.participationRate
              : (sum.completionRate || 0) / 100
          const npsScore =
            typeof sumAny.npsScore === "number"
              ? sumAny.npsScore
              : sum.npsValue ?? 0
          const periodLabel = (openSurveyPeriod as any).periodName || openSurveyPeriod.name

          if (sum.notSurveyedStudents > 0) {
            addTask({
              taskId: `nps-survey-${openSurveyPeriod.id}-${resolvedClassName}`,
              taskType: "NPS_PARENT_FOLLOWUP",
              sourceModule: "NPS_PHHS",
              sourceId: sum.id,
              title: `Đôn đốc khảo sát NPS Phụ huynh lớp ${resolvedClassName} (Còn ${sum.notSurveyedStudents} PHHS chưa thực hiện)`,
              description: `Kỳ khảo sát "${periodLabel}": Đã thực hiện ${sum.surveyedStudents}/${sum.totalStudents} PHHS (${Math.round(participationRate * 100)}%). Điểm NPS hiện tại: ${Number(npsScore).toFixed(1)}.`,
              priority: participationRate < 0.7 ? "HIGH" : "NORMAL",
              status: "IN_PROGRESS",
              deadline: openSurveyPeriod.endDate.toLocaleDateString("vi-VN"),
              deadlineDate: openSurveyPeriod.endDate.toISOString(),
              assignedUserId: userId,
              deepLink: `/teacher/classes?classId=${hrClass?.id || sum.classId}`,
              createdAt: openSurveyPeriod.startDate.toISOString(),
              metadata: {
                moduleLabel: "NPS Phụ huynh",
                badgeColor: "teal",
                campusId: hrClass?.campusId,
                campusName: hrClass?.campusName,
                classId: hrClass?.id || sum.classId,
                className: resolvedClassName,
                progressCurrent: sum.surveyedStudents,
                progressTotal: sum.totalStudents,
                progressPercent: Math.round(participationRate * 100),
                npsScore,
              },
            })
          }
        }
      }
    } catch (err) {
      console.warn("[TaskEngine] Module 5 (NPS_PHHS) warning:", err)
    }
  }

  // ============================================================================
  // PHÂN HỆ 6: Ý KIẾN PHHS & KẾT NỐI PHẢN HỒI (Y_KIEN_PHHS)
  // ============================================================================
  try {
    // 6.1. Ý kiến PHHS gửi qua Sổ điểm / Sổ liên lạc (AcademicConsultationLog)
    const parentOpinionLogs = await prisma.academicConsultationLog.findMany({
      where: {
        difficulties: { contains: "Ý KIẾN PHHS:" },
        OR: [
          ...(homeroomClassIds.length > 0 ? [{ student: { classId: { in: homeroomClassIds } } }] : []),
          ...(teacherId ? [{ teacherId }] : []),
        ],
      },
      include: {
        student: { include: { class: true } },
      },
      orderBy: { meetingDate: "desc" },
      take: 30,
    }).catch(() => [])

    for (const log of parentOpinionLogs) {
      const content = log.content || ""
      const nextActions = log.nextActions || ""
      const hasGvcnReply = content.includes("Ý KIẾN GVCN:")
      const isAcknowledged = nextActions.includes("[ACKNOWLEDGED]")
      const hasForward = nextActions.includes("[GVBM_FORWARD:")
      const hasGvbmReply = nextActions.includes("[GVBM_RESPONSE:")

      const isHomeroomTeacherForStudent =
        log.student?.classId && homeroomClassIds.includes(log.student.classId)
      const isForwardedToThisTeacher =
        teacherId && log.teacherId === teacherId && hasForward && !hasGvbmReply

      // Trường hợp 1: GVCN chưa phản hồi hoặc chưa xác nhận hoàn thành
      if (isHomeroomTeacherForStudent && !hasGvcnReply && !isAcknowledged) {
        const cleanParentText = (log.difficulties || "")
          .replace(/\[GradePeriod:[^\]]+\]\s*/g, "")
          .replace("Ý KIẾN PHHS:", "")
          .trim()

        addTask({
          taskId: `ykph-gvcn-${log.id}`,
          taskType: "PARENT_OPINION_GVCN_REPLY",
          sourceModule: "Y_KIEN_PHHS",
          sourceId: log.id,
          title: `Phản hồi ý kiến Phụ huynh em ${log.student?.studentName || "Học sinh"} (${log.student?.class?.className || ""})`,
          description: cleanParentText || "Phụ huynh gửi ý kiến trao đổi cần GVCN tiếp nhận và phản hồi.",
          priority: "URGENT",
          status: hasForward && !hasGvbmReply ? "WAITING" : "NEW",
          deadline: "Trong 24h",
          deadlineDate: todayEnd.toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/diem-lop-chu-nhiem?classId=${log.student?.classId || ""}`,
          createdAt: log.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Ý kiến PHHS",
            badgeColor: "rose",
            classId: log.student?.classId,
            className: log.student?.class?.className,
            studentId: log.studentId,
            studentName: log.student?.studentName,
            approvalStatus: hasForward && !hasGvbmReply ? "PENDING_APPROVAL" : "DRAFT",
            approverRole: hasForward && !hasGvbmReply ? "Giáo viên bộ môn" : undefined,
            completionConditions: [
              {
                code: "PARENT_REPLY",
                label: "Gửi phản hồi chính thức hoặc xác nhận đã giải quyết ý kiến PHHS",
                currentValue: 0,
                targetValue: 1,
                isMet: false,
              },
            ],
          },
        })
      }

      // Trường hợp 2: GVCN chuyển tiếp ý kiến PHHS sang cho GVBM xử lý chuyên môn
      if (isForwardedToThisTeacher) {
        const forwardMatch = nextActions.match(/\[GVBM_FORWARD:[^:]*:([^\]]+)\]/)
        const forwardNote = forwardMatch ? forwardMatch[1] : "Cần GVBM phối hợp giải đáp chuyên môn môn học."

        addTask({
          taskId: `ykph-gvbm-${log.id}`,
          taskType: "PARENT_OPINION_GVBM_RESPONSE",
          sourceModule: "Y_KIEN_PHHS",
          sourceId: log.id,
          title: `Phối hợp trả lời ý kiến PHHS em ${log.student?.studentName || "Học sinh"} (${log.student?.class?.className || ""})`,
          description: `Chuyển tiếp từ GVCN: "${forwardNote}"`,
          priority: "HIGH",
          status: "NEW",
          deadline: "Hôm nay",
          deadlineDate: todayEnd.toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/so-diem-nhan-xet?classId=${log.student?.classId || ""}`,
          createdAt: log.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Ý kiến PHHS (GVBM)",
            badgeColor: "rose",
            classId: log.student?.classId,
            className: log.student?.class?.className,
            studentId: log.studentId,
            studentName: log.student?.studentName,
          },
        })
      }
    }
  } catch (err) {
    console.warn("[TaskEngine] Module 6 (Y_KIEN_PHHS) warning:", err)
  }

  // ============================================================================
  // PHÂN HỆ 7: HOẠT ĐỘNG TRẢI NGHIỆM (TRAI_NGHIEM)
  // Đồng bộ 100% logic phân công kép (Creator + GVCN + GVBM + Tổ CM) như /api/experiential-activities
  // ============================================================================
  try {
    const expWhere: any = {}
    if (profile?.academicYearId && profile.academicYearId !== "default-year") {
      expWhere.academicYearId = profile.academicYearId
    }

    const expRecords = await prisma.activityRecord
      .findMany({
        where: expWhere,
        include: {
          participants: {
            select: {
              id: true,
              studentId: true,
              evalLevelId: true,
              roleId: true,
              note: true,
              student: {
                select: {
                  id: true,
                  classId: true,
                  class: { select: { id: true, className: true, campusId: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 60,
      })
      .catch(() => [])

    const hrClassIdSet = new Set(homeroomClassIds)
    const teachingAssignList = profile?.teachingAssignments || []
    const managedDeptIdSet = new Set(profile?.managedDepartmentIds || [])

    const isParticipantEvaluated = (p: any): boolean => {
      if (p.evalLevelId) return true
      try {
        if (p.note && typeof p.note === "string" && p.note.startsWith("{")) {
          const parsed = JSON.parse(p.note)
          return Boolean(
            parsed.isCompleted ||
              (parsed.finalResult && parsed.finalResult !== "CAN_HO_TRO") ||
              (parsed.calculatedPercent !== null &&
                parsed.calculatedPercent !== undefined &&
                Number(parsed.calculatedPercent) > 0)
          )
        }
      } catch {}
      return false
    }

    for (const rec of expRecords) {
      const recAny = rec as any
      let extraData: any = {}
      try {
        if (rec.locationId && typeof rec.locationId === "string" && rec.locationId.startsWith("{")) {
          extraData = JSON.parse(rec.locationId)
        }
      } catch {}

      const assignedClasses: any[] = Array.isArray(extraData.assignedClasses)
        ? extraData.assignedClasses
        : []

      const isMyCreated = Boolean(
        rec.teacherId === userId || (teacherId && rec.teacherId === teacherId)
      )

      let isGVCNMatch = false
      let isGVBMMatch = false
      let myAssignedClass: any = null

      // 1. Kiểm tra phân công theo GVCN
      const matchedGvcnClass = assignedClasses.find(
        (c: any) =>
          (c.classId && hrClassIdSet.has(c.classId)) ||
          (teacherId && c.homeroomTeacherId === teacherId) ||
          (profile?.email &&
            c.homeroomTeacherEmail &&
            String(c.homeroomTeacherEmail).toLowerCase() === profile.email.toLowerCase())
      )
      if (matchedGvcnClass) {
        isGVCNMatch = true
        myAssignedClass = matchedGvcnClass
      } else if (recAny.classId && hrClassIdSet.has(recAny.classId)) {
        isGVCNMatch = true
        const hrObj = homeroomClasses.find((c) => c.id === recAny.classId)
        myAssignedClass = {
          classId: recAny.classId,
          className: recAny.class?.className || hrObj?.className || "Lớp chủ nhiệm",
          status: rec.status || "DRAFT",
        }
      }

      // 2. Kiểm tra phân công theo GVBM / Tổ CM
      const explicitGvbmMatch = assignedClasses.find(
        (c: any) =>
          (teacherId && c.subjectTeacherId === teacherId) ||
          (profile?.teacherName &&
            c.subjectTeacherName &&
            c.subjectTeacherName === profile.teacherName) ||
          (profile?.email &&
            c.subjectTeacherEmail &&
            String(c.subjectTeacherEmail).toLowerCase() === profile.email.toLowerCase())
      )
      if (explicitGvbmMatch) {
        isGVBMMatch = true
        if (!myAssignedClass) myAssignedClass = explicitGvbmMatch
      }

      if (extraData.departmentId && managedDeptIdSet.has(extraData.departmentId)) {
        if (assignedClasses.length === 0) {
          const teacherCampusIds = new Set((profile?.campuses || []).map((c) => c.id))
          if (
            !extraData.campusId ||
            teacherCampusIds.size === 0 ||
            teacherCampusIds.has(extraData.campusId)
          ) {
            isGVBMMatch = true
          }
        } else {
          const matchedDeptClass = assignedClasses.find(
            (c: any) =>
              c.classId &&
              (hrClassIdSet.has(c.classId) ||
                teachingAssignList.some((ta) => ta.classId === c.classId))
          )
          if (matchedDeptClass) {
            isGVBMMatch = true
            if (!myAssignedClass) myAssignedClass = matchedDeptClass
          }
        }
      }

      if (teachingAssignList.length > 0) {
        const matchedTeaching = teachingAssignList.find((ta) => {
          const matchClass = assignedClasses.some((c: any) => c.classId === ta.classId)
          if (!matchClass) return false
          if (extraData.subjectId) return ta.subjectId === extraData.subjectId
          if (extraData.integratedSubjects && typeof extraData.integratedSubjects === "string") {
            return extraData.integratedSubjects
              .toLowerCase()
              .includes(ta.subjectName.toLowerCase())
          }
          return true
        })
        if (matchedTeaching) {
          isGVBMMatch = true
          const matchedClassObj = assignedClasses.find(
            (c: any) => c.classId === matchedTeaching.classId
          )
          if (matchedClassObj && !myAssignedClass) {
            myAssignedClass = matchedClassObj
          }
        }
      }

      // 3. Kiểm tra theo danh sách học sinh tham gia (participants) thuộc lớp chủ nhiệm
      if (!myAssignedClass && hrClassIdSet.size > 0) {
        const matchParticipant = (rec.participants || []).find(
          (p: any) => p.student?.classId && hrClassIdSet.has(p.student.classId)
        )
        if (matchParticipant) {
          isGVCNMatch = true
          const pClassId = matchParticipant.student.classId
          const hrObj = homeroomClasses.find((c) => c.id === pClassId)
          myAssignedClass = {
            classId: pClassId,
            className:
              matchParticipant.student?.class?.className || hrObj?.className || "Lớp chủ nhiệm",
            status: "DRAFT",
          }
        }
      }

      if (!isMyCreated && !isGVCNMatch && !isGVBMMatch) {
        continue
      }

      // Tính tiến độ học sinh của đúng lớp được gán (hoặc toàn bộ hoạt động nếu là người tạo)
      const targetClassId = myAssignedClass?.classId || recAny.classId
      const targetParticipants = targetClassId
        ? (rec.participants || []).filter(
            (p: any) => !p.student?.classId || p.student.classId === targetClassId
          )
        : rec.participants || []

      const totalParticipants =
        targetParticipants.length || myAssignedClass?.totalStudents || 0
      const evaluatedParticipants = targetParticipants.filter(isParticipantEvaluated).length

      const classAssignedStatus = myAssignedClass?.status || rec.status
      const isFullyEvaluated =
        totalParticipants > 0 && evaluatedParticipants >= totalParticipants

      if (classAssignedStatus === "APPROVED") {
        continue
      }

      // Chỉ chuyển sang WAITING khi đã đánh giá xong 100% học sinh (hoặc hồ sơ mẫu không có HS nhưng status="SUBMITTED")
      const isSubmittedWaiting =
        (isFullyEvaluated && (rec.status === "SUBMITTED" || classAssignedStatus === "COMPLETED")) ||
        (totalParticipants === 0 && rec.status === "SUBMITTED" && !myAssignedClass)

      const actName = recAny.activity?.name || rec.name || "Hoạt động trải nghiệm"
      const className =
        myAssignedClass?.className ||
        recAny.class?.className ||
        (homeroomClasses[0]?.className ?? "Lớp phụ trách")
      const roleTag = isMyCreated
        ? "Người tạo"
        : isGVCNMatch && isGVBMMatch
        ? "GVCN & GVBM"
        : isGVCNMatch
        ? "GVCN"
        : "GVBM"

      addTask({
        taskId: `exp-${rec.id}-${targetClassId || "all"}`,
        taskType: isSubmittedWaiting ? "EXPERIENTIAL_WAITING_APPROVAL" : "EXPERIENTIAL_EVALUATION",
        sourceModule: "TRAI_NGHIEM",
        sourceId: rec.id,
        title: isSubmittedWaiting
          ? `[Chờ duyệt] Đánh giá HĐ Trải nghiệm: ${actName}`
          : `Đánh giá HĐ Trải nghiệm: ${actName}`,
        description: isSubmittedWaiting
          ? `Hồ sơ đánh giá hoạt động trải nghiệm lớp ${className} đã hoàn tất và đang chờ phê duyệt.`
          : `Ghi nhận vai trò tham gia và đánh giá mức độ hoàn thành cho học sinh lớp ${className} (Vai trò phân công: ${roleTag}).`,
        priority: isSubmittedWaiting ? "LOW" : "HIGH",
        status: isSubmittedWaiting
          ? "WAITING"
          : evaluatedParticipants > 0
          ? "IN_PROGRESS"
          : "NEW",
        deadline: isSubmittedWaiting ? "Đang chờ duyệt" : "Trong học kỳ",
        deadlineDate: weekEnd.toISOString(),
        assignedUserId: userId,
        deepLink: `/teacher/experiential-activities/${rec.id}`,
        createdAt: rec.createdAt.toISOString(),
        updatedAt: rec.updatedAt.toISOString(),
        metadata: {
          moduleLabel: `Trải nghiệm (${roleTag})`,
          badgeColor: "purple",
          classId: targetClassId || undefined,
          className,
          approvalStatus: isSubmittedWaiting ? "PENDING_APPROVAL" : "DRAFT",
          approverRole: "BGH / Quản lý HĐTN",
          progressCurrent: evaluatedParticipants,
          progressTotal: totalParticipants,
          progressPercent:
            totalParticipants > 0
              ? Math.round((evaluatedParticipants / totalParticipants) * 100)
              : 0,
          completionConditions: [
            {
              code: "PARTICIPANT_EVAL",
              label: `Đánh giá vai trò & mức độ đạt cho ${totalParticipants} học sinh tham gia (${className})`,
              currentValue: evaluatedParticipants,
              targetValue: Math.max(1, totalParticipants),
              isMet: isSubmittedWaiting || isFullyEvaluated,
            },
          ],
        },
      })
    }
  } catch (err) {
    console.warn("[TaskEngine] Module 7 (TRAI_NGHIEM) warning:", err)
  }

  // ============================================================================
  // PHÂN HỆ 8: DỰ GIỜ & KPI CHUYÊN MÔN (DU_GIO)
  // ============================================================================
  if (teacherId) {
    try {
      const [registrations, taughtSlots, yearTarget, monthValidObservedRegs] = await Promise.all([
        prisma.observationRegistration.findMany({
          where: {
            teacherId,
          },
          include: {
            slot: { include: { teacher: true } },
            evaluation: true,
          },
          take: 30,
        }).catch(() => []),

        prisma.observationSlot.findMany({
          where: {
            teacherId,
            date: { gte: todayStart, lte: monthEnd },
          },
          include: {
            registrations: { include: { teacher: true } },
          },
          take: 20,
        }).catch(() => []),

        prisma.teacherAcademicYearTarget.findFirst({
          where: {
            teacherId,
            ...(profile?.academicYearId && profile.academicYearId !== "default-year"
              ? { academicYearId: profile.academicYearId }
              : {}),
          },
        }).catch(() => null),

        prisma.observationRegistration.findMany({
          where: {
            teacherId,
            isApproved: true,
            evaluation: { isNot: null },
            slot: { date: { gte: monthStart, lte: monthEnd } },
          },
          include: { slot: true },
        }).catch(() => []),
      ])

      // Đường dẫn Sổ dự giờ theo phân quyền cấp học / loại GV (Mầm non, GVNN, Phổ thông)
      const obsBaseRoute = profile?.rolesDetected.isPreschoolTeacher
        ? "/teacher/du-gio-mam-non"
        : profile?.rolesDetected.isForeignTeacher
        ? "/teacher/du-gio-gvnn"
        : "/teacher/du-gio"

      // 8.1. Các lượt đăng ký đi dự giờ
      for (const reg of registrations) {
        if (!reg.slot) continue
        const regAny = reg as any
        const slotDate = new Date(reg.slot.date)
        const isPast = slotDate < todayStart
        const isToday = slotDate >= todayStart && slotDate <= todayEnd
        const hasEval = Boolean(reg.evaluation)
        const timeRangeLabel = `${reg.slot.startTime || "07:30"} - ${reg.slot.endTime || "08:15"}`
        const regCreatedAt = regAny.createdAt ? new Date(regAny.createdAt).toISOString() : slotDate.toISOString()

        if (hasEval) {
          addTask({
            taskId: `obs-done-${reg.id}`,
            taskType: "OBSERVATION_EVAL",
            sourceModule: "DU_GIO",
            sourceId: reg.id,
            title: `Đã hoàn thiện phiếu dự giờ lớp ${reg.slot.className || "Chuyên môn"} - Môn ${reg.slot.subjectName || ""}`,
            description: `GV giảng dạy: ${reg.slot.teacher?.teacherName || "Đồng nghiệp"} • Khung giờ ${timeRangeLabel} (${slotDate.toLocaleDateString("vi-VN")})`,
            priority: "LOW",
            status: "COMPLETED",
            deadline: slotDate.toLocaleDateString("vi-VN"),
            deadlineDate: slotDate.toISOString(),
            assignedUserId: userId,
            deepLink: `${obsBaseRoute}?slotId=${reg.slotId}`,
            createdAt: regCreatedAt,
            completedAt: (reg.evaluation as any)?.updatedAt
              ? new Date((reg.evaluation as any).updatedAt).toISOString()
              : slotDate.toISOString(),
            metadata: {
              moduleLabel: "Dự giờ & PTCM",
              badgeColor: "emerald",
              className: reg.slot.className || undefined,
              subjectName: reg.slot.subjectName || undefined,
              approvalStatus: reg.isApproved ? "APPROVED" : "PENDING_APPROVAL",
              progressCurrent: 1,
              progressTotal: 1,
              progressPercent: 100,
              completionConditions: [
                {
                  code: "OBS_EVAL_FORM",
                  label: "Chấm điểm 11 tiêu chí sư phạm và nhập nhận xét góp ý",
                  currentValue: 1,
                  targetValue: 1,
                  isMet: true,
                },
              ],
            },
          })
          continue
        }

        // Nếu đăng ký chưa được TTCM duyệt -> trạng thái WAITING
        if (!reg.isApproved) {
          addTask({
            taskId: `obs-wait-${reg.id}`,
            taskType: "OBSERVATION_WAITING_APPROVAL",
            sourceModule: "DU_GIO",
            sourceId: reg.id,
            title: `[Chờ duyệt] Đăng ký dự giờ lớp ${reg.slot.className || ""} (${reg.slot.subjectName || ""})`,
            description: `Tiết dạy của GV ${reg.slot.teacher?.teacherName || ""} (${timeRangeLabel} ngày ${slotDate.toLocaleDateString("vi-VN")}) đang chờ Tổ trưởng phê duyệt.`,
            priority: "LOW",
            status: "WAITING",
            deadline: "Chờ TTCM duyệt",
            deadlineDate: slotDate.toISOString(),
            assignedUserId: userId,
            deepLink: `${obsBaseRoute}?slotId=${reg.slotId}`,
            createdAt: regCreatedAt,
            metadata: {
              moduleLabel: "Dự giờ & KPI",
              badgeColor: "teal",
              className: reg.slot.className || undefined,
              subjectName: reg.slot.subjectName || undefined,
              approvalStatus: "PENDING_APPROVAL",
              approverRole: "Tổ trưởng chuyên môn",
            },
          })
          continue
        }

        const priority: TaskPriority = isPast ? "URGENT" : isToday ? "HIGH" : "NORMAL"
        const status: TaskStatus = isPast ? "OVERDUE" : "NEW"

        addTask({
          taskId: `obs-reg-${reg.id}`,
          taskType: "OBSERVATION_EVAL",
          sourceModule: "DU_GIO",
          sourceId: reg.id,
          title: `Hoàn thiện phiếu dự giờ lớp ${reg.slot.className || "Chuyên môn"} - Môn ${reg.slot.subjectName || ""}`,
          description: `GV giảng dạy: ${reg.slot.teacher?.teacherName || "Đồng nghiệp"} • Khung giờ ${timeRangeLabel} (${slotDate.toLocaleDateString("vi-VN")})`,
          priority,
          status,
          deadline: isToday ? `Hôm nay (${reg.slot.startTime || "Trong ngày"})` : slotDate.toLocaleDateString("vi-VN"),
          deadlineDate: slotDate.toISOString(),
          assignedUserId: userId,
          deepLink: `${obsBaseRoute}?slotId=${reg.slotId}`,
          createdAt: regCreatedAt,
          metadata: {
            moduleLabel: "Dự giờ & KPI",
            badgeColor: "teal",
            className: reg.slot.className || undefined,
            subjectName: reg.slot.subjectName || undefined,
            approvalStatus: "APPROVED",
            completionConditions: [
              {
                code: "OBS_EVAL_FORM",
                label: "Chấm điểm 11 tiêu chí sư phạm và nhập nhận xét góp ý",
                currentValue: 0,
                targetValue: 1,
                isMet: false,
              },
            ],
          },
        })
      }

      // 8.2. Các tiết dạy thao giảng của chính giáo viên
      for (const slot of taughtSlots) {
        const slotDate = new Date(slot.date)
        const isToday = slotDate >= todayStart && slotDate <= todayEnd
        const observerCount = slot.registrations?.length || 0
        const timeRangeLabel = `${slot.startTime || "07:30"} - ${slot.endTime || "08:15"}`

        addTask({
          taskId: `obs-teach-${slot.id}`,
          taskType: "OBSERVATION_TEACH",
          sourceModule: "DU_GIO",
          sourceId: slot.id,
          title: `Tiết dạy thao giảng lớp ${slot.className || ""} (${slot.subjectName || ""})`,
          description: `Chủ đề: "${slot.topic || "Bài dạy chuyên môn"}" • Giờ dạy: ${timeRangeLabel} (${observerCount} GV đăng ký dự)`,
          priority: isToday ? "URGENT" : "HIGH",
          status: "NEW",
          deadline: isToday ? `Hôm nay (${slot.startTime || ""})` : slotDate.toLocaleDateString("vi-VN"),
          deadlineDate: slotDate.toISOString(),
          assignedUserId: userId,
          deepLink: `${obsBaseRoute}?slotId=${slot.id}`,
          createdAt: slot.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Dự giờ & KPI",
            badgeColor: "emerald",
            className: slot.className || undefined,
            subjectName: slot.subjectName || undefined,
          },
        })
      }

      // 8.3. Kiểm tra định mức KPI dự giờ tháng
      let monthObservedCount = 0
      for (const r of monthValidObservedRegs) {
        monthObservedCount += r.slot?.isDoublePeriod ? 2 : 1
      }
      const monthlyQuota = 2
      if (monthObservedCount < monthlyQuota) {
        const deficit = monthlyQuota - monthObservedCount
        addTask({
          taskId: `obs-kpi-month-${now.getFullYear()}-${now.getMonth() + 1}-${teacherId}`,
          taskType: "OBSERVATION_MONTHLY_KPI_DEFICIT",
          sourceModule: "DU_GIO",
          sourceId: teacherId,
          title: `Hoàn thành định mức KPI dự giờ tháng ${now.getMonth() + 1}/${now.getFullYear()} (Còn thiếu ${deficit}/${monthlyQuota} tiết)`,
          description: `Thầy/Cô đã hoàn thành ${monthObservedCount}/${monthlyQuota} tiết dự giờ hợp lệ (đã duyệt & có phiếu đánh giá) trong tháng ${now.getMonth() + 1}.`,
          priority: now.getDate() >= 22 ? "HIGH" : "NORMAL",
          status: monthObservedCount > 0 ? "IN_PROGRESS" : "NEW",
          deadline: monthEnd.toLocaleDateString("vi-VN"),
          deadlineDate: monthEnd.toISOString(),
          assignedUserId: userId,
          deepLink: obsBaseRoute,
          createdAt: monthStart.toISOString(),
          metadata: {
            moduleLabel: "Dự giờ & KPI",
            badgeColor: "amber",
            progressCurrent: monthObservedCount,
            progressTotal: monthlyQuota,
            progressPercent: Math.round((monthObservedCount / monthlyQuota) * 100),
            completionConditions: [
              {
                code: "MONTHLY_OBS_KPI",
                label: `Đạt tối thiểu ${monthlyQuota} tiết dự giờ hợp lệ có phiếu đánh giá trong tháng`,
                currentValue: monthObservedCount,
                targetValue: monthlyQuota,
                isMet: false,
              },
            ],
          },
        })
      }

      // 8.4. Xác nhận chỉ tiêu dự giờ năm học nếu đang chờ xác nhận
      // Quy tắc SSM (đồng bộ với TeacherLayout): Chỉ áp dụng cho GV không giữ chức vụ quản lý (TTCM/TBP/GDCS/BGH) và có chỉ tiêu > 0
      const yearTargetAny = yearTarget as any
      const hasValidYearQuota =
        yearTarget &&
        (Number(yearTarget.requiredObserved || 0) > 0 || Number(yearTarget.requiredTaught || 0) > 0)
      if (
        yearTarget &&
        hasValidYearQuota &&
        !profile?.rolesDetected.hasLeadershipPosition &&
        (!yearTarget.confirmed || yearTargetAny.status === "PENDING_CONFIRMATION")
      ) {
        addTask({
          taskId: `obs-target-confirm-${yearTarget.id}`,
          taskType: "OBSERVATION_TARGET_CONFIRM",
          sourceModule: "DU_GIO",
          sourceId: yearTarget.id,
          title: `Xác nhận định mức chỉ tiêu Dự giờ & Thao giảng năm học`,
          description: `Định mức được giao: Dự giờ ${yearTarget.requiredObserved} tiết/năm • Dạy thao giảng ${yearTarget.requiredTaught} tiết/năm.`,
          priority: "HIGH",
          status: "NEW",
          deadline: "Trong tuần",
          deadlineDate: weekEnd.toISOString(),
          assignedUserId: userId,
          deepLink: obsBaseRoute,
          createdAt: yearTargetAny.createdAt
            ? new Date(yearTargetAny.createdAt).toISOString()
            : now.toISOString(),
          metadata: {
            moduleLabel: "Dự giờ & KPI",
            badgeColor: "teal",
          },
        })
      }

      // 8.5. Nếu là Tổ trưởng chuyên môn (TTCM): Duyệt đăng ký dự giờ của GV trong tổ
      if (profile && profile.managedDepartmentIds.length > 0) {
        const pendingDeptApprovals = await prisma.observationRegistration.count({
          where: {
            isApproved: false,
            teacher: {
              departmentId: { in: profile.managedDepartmentIds },
            },
          },
        }).catch(() => 0)

        if (pendingDeptApprovals > 0) {
          addTask({
            taskId: `obs-ttcm-approve-${teacherId}`,
            taskType: "TTCM_APPROVE_OBSERVATION",
            sourceModule: "DU_GIO",
            sourceId: teacherId,
            title: `[TTCM] Phê duyệt ${pendingDeptApprovals} đăng ký dự giờ của giáo viên trong Tổ`,
            description: `Có ${pendingDeptApprovals} lượt đăng ký dự giờ chuyên môn trong ${profile.managedDepartmentNames.join(", ")} đang chờ Thầy/Cô phê duyệt.`,
            priority: "HIGH",
            status: "NEW",
            deadline: "Hôm nay",
            deadlineDate: todayEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `${obsBaseRoute}?tab=overview_slots`,
            createdAt: now.toISOString(),
            metadata: {
              moduleLabel: "Điều hành Tổ CM",
              badgeColor: "teal",
            },
          })
        }
      }
    } catch (err) {
      console.warn("[TaskEngine] Module 8 (DU_GIO) warning:", err)
    }
  }

  // ============================================================================
  // PHÂN HỆ 9: CỐ VẤN HỌC TẬP & HỖ TRỢ HỌC SINH (CO_VAN)
  // ============================================================================
  try {
    if (homeroomClassIds.length > 0) {
      const [unsignedGoals, pendingUnlocks, helpRequests, redYellowAdvisories] = await Promise.all([
        prisma.studentGoal.findMany({
          where: {
            student: { classId: { in: homeroomClassIds }, status: "ACTIVE" },
            signedByTeacher: false,
          },
          include: { student: { include: { class: true } } },
          take: 25,
        }).catch(() => []),

        // Fix Bug 3: StudentGoalUnlock dùng supportStatus="PENDING" / status="IN_PROGRESS" và barriers / sevenDayAction
        prisma.studentGoalUnlock.findMany({
          where: {
            goal: { student: { classId: { in: homeroomClassIds } } },
            OR: [{ supportStatus: "PENDING" }, { status: "IN_PROGRESS" }],
          },
          include: { goal: { include: { student: { include: { class: true } } } } },
          take: 20,
        }).catch(() => []),

        // Fix Bug 4: StudentHelpRequest dùng status IN ["PENDING", "PROCESSING"]
        prisma.studentHelpRequest.findMany({
          where: {
            student: { classId: { in: homeroomClassIds } },
            status: { in: ["PENDING", "PROCESSING"] },
          },
          include: { student: { include: { class: true } } },
          take: 20,
        }).catch(() => []),

        prisma.studentAdvisoryStatus.findMany({
          where: {
            student: { classId: { in: homeroomClassIds }, status: "ACTIVE" },
            statusColor: { in: ["RED", "YELLOW"] },
          },
          include: { student: { include: { class: true } } },
          take: 20,
        }).catch(() => []),
      ])

      // 9.1. Ký duyệt mục tiêu SMART của học sinh (gộp thông minh theo lớp nếu có nhiều HS để tránh ngập thẻ)
      const unsignedGoalsByStudent = new Map<string, any[]>()
      for (const goal of unsignedGoals) {
        const key = goal.studentId || goal.id
        const list = unsignedGoalsByStudent.get(key) || []
        list.push(goal)
        unsignedGoalsByStudent.set(key, list)
      }

      const studentsByClass = new Map<string, Array<{ firstGoal: any; goalCount: number }>>()
      for (const [, studentGoals] of unsignedGoalsByStudent.entries()) {
        const firstGoal = studentGoals[0]
        const clsKey = firstGoal.student?.classId || "default-class"
        const list = studentsByClass.get(clsKey) || []
        list.push({ firstGoal, goalCount: studentGoals.length })
        studentsByClass.set(clsKey, list)
      }

      for (const [clsKey, classItems] of studentsByClass.entries()) {
        if (classItems.length === 1) {
          const { firstGoal: goal, goalCount } = classItems[0]
          const goalAny = goal as any
          addTask({
            taskId: `covan-goal-${goal.id}`,
            taskType: "GOAL_SIGN",
            sourceModule: "CO_VAN",
            sourceId: goal.id,
            title: `Ký xác nhận mục tiêu SMART cho em ${goal.student?.studentName || "Học sinh"} (${goal.student?.class?.className || ""})`,
            description:
              goalAny.generalGoal ||
              goalAny.habitGoal ||
              `Học sinh đã lập ${goalCount} mục tiêu SMART và chờ GVCN định hướng, ký xác nhận.`,
            priority: "NORMAL",
            status: "NEW",
            deadline: "Trong tuần",
            deadlineDate: weekEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `/teacher/co-van-hoc-tap/${goal.studentId}`,
            createdAt: goal.createdAt.toISOString(),
            metadata: {
              moduleLabel: "Cố vấn học tập",
              badgeColor: "amber",
              classId: goal.student?.classId,
              className: goal.student?.class?.className,
              studentId: goal.studentId,
              studentName: goal.student?.studentName,
              progressCurrent: 0,
              progressTotal: goalCount,
              progressPercent: 0,
              completionConditions: [
                {
                  code: "SIGN_SMART_GOAL",
                  label: `Nhận xét định hướng và ký xác nhận mục tiêu SMART`,
                  currentValue: 0,
                  targetValue: goalCount,
                  isMet: false,
                },
              ],
            },
          })
        } else {
          const sampleGoal = classItems[0].firstGoal
          const className = sampleGoal.student?.class?.className || "Lớp chủ nhiệm"
          const hrObj = homeroomClasses.find((c) => c.id === clsKey)
          const totalStudentsInClass = Math.max(
            hrObj?.studentCount || classItems.length,
            classItems.length
          )
          const signedStudentsCount = Math.max(0, totalStudentsInClass - classItems.length)
          const studentNamesPreview = classItems
            .slice(0, 4)
            .map((it) => it.firstGoal.student?.studentName)
            .filter(Boolean)
            .join(", ")

          addTask({
            taskId: `covan-goal-${sampleGoal.id}`,
            taskType: "GOAL_SIGN",
            sourceModule: "CO_VAN",
            sourceId: clsKey,
            title: `Định hướng & ký xác nhận mục tiêu SMART lớp ${className}`,
            description: `Có ${classItems.length} học sinh (${studentNamesPreview}${classItems.length > 4 ? ` và ${classItems.length - 4} HS khác` : ""}) đã lập sổ mục tiêu SMART đang chờ GVCN đồng hành và xác nhận.`,
            priority: "NORMAL",
            status: signedStudentsCount > 0 ? "IN_PROGRESS" : "NEW",
            deadline: "Trong tuần",
            deadlineDate: weekEnd.toISOString(),
            assignedUserId: userId,
            deepLink: `/teacher/co-van-hoc-tap`,
            createdAt: sampleGoal.createdAt.toISOString(),
            metadata: {
              moduleLabel: "Cố vấn học tập",
              badgeColor: "amber",
              classId: sampleGoal.student?.classId,
              className,
              progressCurrent: signedStudentsCount,
              progressTotal: totalStudentsInClass,
              progressPercent:
                totalStudentsInClass > 0
                  ? Math.round((signedStudentsCount / totalStudentsInClass) * 100)
                  : 0,
              completionConditions: [
                {
                  code: "SIGN_SMART_GOAL",
                  label: `Nhận xét định hướng và ký xác nhận mục tiêu SMART cho ${totalStudentsInClass} học sinh lớp ${className}`,
                  currentValue: signedStudentsCount,
                  targetValue: totalStudentsInClass,
                  isMet: false,
                },
              ],
            },
          })
        }
      }

      // 9.2. Kế hoạch 7 ngày gỡ rào cản (StudentGoalUnlock)
      for (const unlock of pendingUnlocks) {
        const student = unlock.goal?.student
        const barrierText = [unlock.barriers, unlock.sevenDayAction, unlock.needSupport]
          .filter(Boolean)
          .join(" • ")

        addTask({
          taskId: `covan-unlock-${unlock.id}`,
          taskType: "GOAL_UNLOCK",
          sourceModule: "CO_VAN",
          sourceId: unlock.id,
          title: `Hỗ trợ kế hoạch 7 ngày gỡ khó cho em ${student?.studentName || "Học sinh"} (${student?.class?.className || ""})`,
          description: barrierText || "Học sinh đề xuất kế hoạch 7 ngày vượt rào cản học tập, cần Thầy/Cô cố vấn đồng hành.",
          priority: "HIGH",
          status: unlock.supportStatus === "PENDING" ? "NEW" : "IN_PROGRESS",
          deadline: "Hôm nay",
          deadlineDate: todayEnd.toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/co-van-hoc-tap/${ unlock.goal?.studentId || "" }`,
          createdAt: unlock.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Cố vấn học tập",
            badgeColor: "orange",
            classId: student?.classId,
            className: student?.class?.className,
            studentId: unlock.goal?.studentId,
            studentName: student?.studentName,
          },
        })
      }

      // 9.3. Yêu cầu trợ giúp từ học sinh (StudentHelpRequest)
      for (const req of helpRequests) {
        addTask({
          taskId: `covan-help-${req.id}`,
          taskType: "HELP_REQUEST",
          sourceModule: "CO_VAN",
          sourceId: req.id,
          title: `Phản hồi yêu cầu trợ giúp từ em ${req.student?.studentName || "Học sinh"} (${req.student?.class?.className || ""})`,
          description: req.content || "Học sinh gửi tín hiệu cần hỗ trợ học tập / tâm lý tới giáo viên cố vấn.",
          priority: req.urgency === "HIGH" ? "URGENT" : "HIGH",
          status: req.status === "PROCESSING" ? "IN_PROGRESS" : "NEW",
          deadline: "Cần xử lý ngay",
          deadlineDate: todayEnd.toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/co-van-hoc-tap/${req.studentId}`,
          createdAt: req.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Cố vấn học tập",
            badgeColor: "red",
            classId: req.student?.classId,
            className: req.student?.class?.className,
            studentId: req.studentId,
            studentName: req.student?.studentName,
          },
        })
      }

      // 9.4. Học sinh diện cảnh báo Đỏ / Vàng (StudentAdvisoryStatus)
      for (const adv of redYellowAdvisories) {
        const isRed = adv.statusColor === "RED"
        addTask({
          taskId: `covan-risk-${adv.id}`,
          taskType: "ADVISORY_AT_RISK_FOLLOWUP",
          sourceModule: "CO_VAN",
          sourceId: adv.id,
          title: `Cập nhật nhật ký cố vấn học sinh mức ${isRed ? "ĐỎ (Nguy cơ cao)" : "VÀNG (Cần lưu ý)"}: ${adv.student?.studentName || ""}`,
          description: `${adv.reasonCategory || "Cảnh báo học tập"}: ${adv.reasonDetail || "Cần theo dõi sát sao và ghi nhật ký hành động hỗ trợ."}`,
          priority: isRed ? "URGENT" : "HIGH",
          status: "IN_PROGRESS",
          deadline: isRed ? "Hôm nay" : "Trong tuần",
          deadlineDate: (isRed ? todayEnd : weekEnd).toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/co-van-hoc-tap/${adv.studentId}`,
          createdAt: adv.updatedAt.toISOString(),
          metadata: {
            moduleLabel: "Cố vấn học tập",
            badgeColor: isRed ? "red" : "amber",
            classId: adv.student?.classId,
            className: adv.student?.class?.className,
            studentId: adv.studentId,
            studentName: adv.student?.studentName,
          },
        })
      }
    }

    // 9.5. Đánh giá học sinh cần bồi dưỡng / phụ đạo (Fix Bug 5: dùng target.outcome / target.reason)
    if (teacherId) {
      const supportTargets = await prisma.learningSupportTarget.findMany({
        where: {
          OR: [
            { assignments: { some: { teacherId } } },
            ...(homeroomClassIds.length > 0
              ? [{ student: { classId: { in: homeroomClassIds } } }]
              : []),
          ],
          status: "ACTIVE",
        },
        include: {
          student: { include: { class: true } },
          assignments: {
            include: {
              subject: true,
              evaluations: {
                where: {
                  createdAt: { gte: monthStart },
                },
              },
            },
          },
        },
        take: 20,
      }).catch(() => [])

      for (const target of supportTargets) {
        const targetAny = target as any
        const hasEvaluatedThisMonth =
          (Array.isArray(targetAny.evaluations) && targetAny.evaluations.length > 0) ||
          (Array.isArray(target.assignments) &&
            target.assignments.some(
              (a: any) => Array.isArray(a.evaluations) && a.evaluations.length > 0
            ))
        if (hasEvaluatedThisMonth) continue

        const firstAssignment = target.assignments?.[0] as any
        const subjName =
          targetAny.subject?.name ||
          targetAny.subject?.subjectName ||
          firstAssignment?.subject?.subjectName ||
          "Môn học"
        const subjId = targetAny.subjectId || firstAssignment?.subjectId
        const clsId = targetAny.classId || target.student?.classId
        const clsName = targetAny.class?.className || target.student?.class?.className

        addTask({
          taskId: `covan-support-${target.id}`,
          taskType: "LEARNING_SUPPORT_EVAL",
          sourceModule: "CO_VAN",
          sourceId: target.id,
          title: `Đánh giá tiến bộ bồi dưỡng: ${target.student?.studentName || "Học sinh"} (${subjName})`,
          description:
            target.outcome ||
            target.reason ||
            target.academicTopic ||
            "Cập nhật đánh giá tiến độ phụ đạo & hỗ trợ học sinh trong tháng.",
          priority: "NORMAL",
          status: "IN_PROGRESS",
          deadline: "Trong tháng",
          deadlineDate: monthEnd.toISOString(),
          assignedUserId: userId,
          deepLink: "/teacher/ho-tro-hoc-tap",
          createdAt: target.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Cố vấn & Hỗ trợ HS",
            badgeColor: "blue",
            classId: clsId,
            className: clsName,
            subjectId: subjId,
            subjectName: subjName,
            studentId: target.studentId,
            studentName: target.student?.studentName,
          },
        })
      }
    }
  } catch (err) {
    console.warn("[TaskEngine] Module 9 (CO_VAN) warning:", err)
  }

  // ============================================================================
  // PHÂN HỆ BỔ SUNG: CÔNG VIỆC ĐƯỢC GIAO TRỰC TIẾP (WorkTask - CONG_TAC)
  // ============================================================================
  try {
    const workTasks = await prisma.workTask.findMany({
      where: {
        assignedToUserId: userId,
      },
      orderBy: { endDate: "asc" },
      take: 30,
    }).catch(() => [])

    for (const wt of workTasks) {
      const wtAny = wt as any
      const wtStatus = wtAny.status || (wt.progress >= 100 || wt.completedAt ? "COMPLETED" : wt.progress > 0 ? "IN_PROGRESS" : "NEW")
      if (wtStatus === "CANCELLED") continue
      const isCompleted = wtStatus === "COMPLETED"
      if (isCompleted && !options?.includeCompleted && options?.status !== "COMPLETED") {
        continue
      }

      const rawDueDate = wtAny.dueDate || wt.endDate
      const dueDate = rawDueDate ? new Date(rawDueDate) : null
      const isPast = Boolean(dueDate && dueDate < todayStart && !isCompleted)
      const isToday = Boolean(dueDate && dueDate >= todayStart && dueDate <= todayEnd)

      let priority: TaskPriority = "NORMAL"
      if (wt.priority === "URGENT" || isPast) priority = "URGENT"
      else if (wt.priority === "HIGH" || isToday) priority = "HIGH"

      const status: TaskStatus = isCompleted
        ? "COMPLETED"
        : isPast
        ? "OVERDUE"
        : wtStatus === "IN_PROGRESS"
        ? "IN_PROGRESS"
        : "NEW"

      addTask({
        taskId: `work-${wt.id}`,
        taskType: "WORK_TASK",
        sourceModule: "CONG_TAC",
        sourceId: wt.id,
        title: wt.title,
        description: wt.description || undefined,
        priority,
        status,
        deadline: dueDate ? (isToday ? "Hôm nay" : dueDate.toLocaleDateString("vi-VN")) : "Không thời hạn",
        deadlineDate: dueDate?.toISOString(),
        assignedUserId: userId,
        deepLink: `/teacher/tasks?highlight=${wt.id}`,
        createdAt: wt.createdAt.toISOString(),
        completedAt: wt.completedAt?.toISOString() || null,
        metadata: {
          moduleLabel: "Công tác",
          badgeColor: "slate",
        },
      })
    }

    // Kiểm tra yêu cầu kết nối 2 chiều KT&ĐBCL Connect (KtdbclRequest đã có phản hồi chờ xác nhận)
    const ktdbclAnsweredReqs = await (prisma as any).ktdbclRequest
      ?.findMany({
        where: {
          senderId: userId,
          status: "ANSWERED",
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      })
      .catch(() => []) || []

    for (const kReq of ktdbclAnsweredReqs) {
      addTask({
        taskId: `ktdbcl-req-${kReq.id}`,
        taskType: "KTDBCL_CONNECT_REPLY",
        sourceModule: "CONG_TAC",
        sourceId: kReq.id,
        title: `Phản hồi mới từ Ban KT&ĐBCL: "${kReq.title}"`,
        description: `Yêu cầu mã ${kReq.requestCode || ""} của Thầy/Cô đã được Ban KT&ĐBCL phản hồi. Vui lòng xem nội dung và xác nhận hoàn tất.`,
        priority: "HIGH",
        status: "IN_PROGRESS",
        deadline: "Trong tuần",
        deadlineDate: weekEnd.toISOString(),
        assignedUserId: userId,
        deepLink: `/teacher/ktdbcl-connect`,
        createdAt: kReq.updatedAt ? new Date(kReq.updatedAt).toISOString() : now.toISOString(),
        metadata: {
          moduleLabel: "KT&ĐBCL Connect",
          badgeColor: "teal",
        },
      })
    }

    // Nhiệm vụ sau họp Phụ huynh số (ParentMeetingTask)
    const pmTasks =
      (await (prisma as any).parentMeetingTask
        ?.findMany({
          where: {
            assigneeUserId: userId,
            status: { notIn: ["CANCELLED"] },
          },
          orderBy: { dueAt: "asc" },
          take: 25,
        })
        .catch(() => [])) || []

    for (const pmt of pmTasks) {
      const isDone = pmt.status === "COMPLETED"
      if (isDone && !options?.includeCompleted && options?.status !== "COMPLETED") {
        continue
      }
      const due = new Date(pmt.dueAt)
      const isPast = !isDone && due < todayStart
      const isToday = !isDone && due >= todayStart && due <= todayEnd

      addTask({
        taskId: `pm-task-${pmt.id}`,
        taskType: "PARENT_MEETING_TASK",
        sourceModule: "Y_KIEN_PHHS",
        sourceId: pmt.id,
        title: `[Họp PHHS] ${pmt.title}`,
        description: pmt.description || `Nhiệm vụ sau họp phụ huynh (${pmt.taskCode})`,
        priority: isPast || pmt.priority === "URGENT" ? "URGENT" : isToday || pmt.priority === "HIGH" ? "HIGH" : "NORMAL",
        status: isDone ? "COMPLETED" : isPast ? "OVERDUE" : pmt.status === "IN_PROGRESS" ? "IN_PROGRESS" : "NEW",
        deadline: isToday ? "Hôm nay" : due.toLocaleDateString("vi-VN"),
        deadlineDate: due.toISOString(),
        assignedUserId: userId,
        deepLink: `/teacher/hop-phu-huynh?meetingId=${pmt.meetingId}&tab=tasks`,
        createdAt: new Date(pmt.createdAt).toISOString(),
        completedAt: pmt.completedAt ? new Date(pmt.completedAt).toISOString() : null,
        metadata: {
          moduleLabel: "Họp Phụ huynh số",
          badgeColor: "teal",
          campusId: pmt.campusId,
          classId: pmt.classId,
          studentId: pmt.studentId || undefined,
          studentName: pmt.studentName || undefined,
        },
      })
    }
  } catch (err) {
    console.warn("[TaskEngine] WorkTask query skipped:", err)
  }

  // ============================================================================
  // PHÂN HỆ 10: KHẢO THÍ SỐ ĐỊNH KỲ (KHAO_THI)
  // ============================================================================
  if (teacherId) {
    try {
      const [testingTasks, proctorSessions] = await Promise.all([
        prisma.testingTaskAssignment
          .findMany({
            where: { teacherId },
            include: {
              subjectExam: {
                include: { period: true },
              },
            },
            orderBy: { dueDate: "asc" },
            take: 30,
          })
          .catch(() => []),
        prisma.testingSessionProctor
          .findMany({
            where: { teacherId },
            include: {
              session: {
                include: {
                  subjectExam: { include: { period: true } },
                },
              },
            },
            take: 20,
          })
          .catch(() => []),
      ])

      const roleLabelMap: Record<string, string> = {
        MATRIX_AUTHOR: "Biên soạn Ma trận & Đặc tả đề",
        PAPER_AUTHOR: "Ra đề & Nộp hồ sơ đề kiểm tra",
        PEER_REVIEWER: "Phản biện chéo hồ sơ đề",
        APPROVER: "Thẩm định & Phê duyệt đề chính thức",
        PROCTOR: "Coi kiểm tra & Lập biên bản",
        GRADER: "Chấm bài (Rà soát OMR & Tự luận)",
      }

      for (const tt of testingTasks) {
        const isDone = tt.status === "APPROVED"
        if (isDone && !options?.includeCompleted && options?.status !== "COMPLETED") {
          continue
        }
        const due = new Date(tt.dueDate)
        const isPast = !isDone && due < todayStart
        const isToday = !isDone && due >= todayStart && due <= todayEnd

        const status: TaskStatus = isDone
          ? "COMPLETED"
          : isPast || tt.status === "OVERDUE"
          ? "OVERDUE"
          : tt.status === "SUBMITTED"
          ? "WAITING"
          : tt.status === "IN_PROGRESS" || tt.status === "REVISION_REQUESTED"
          ? "IN_PROGRESS"
          : "NEW"

        const priority: TaskPriority =
          isPast || tt.status === "REVISION_REQUESTED"
            ? "URGENT"
            : isToday
            ? "HIGH"
            : "NORMAL"

        const roleTitle = roleLabelMap[tt.role] || tt.role
        const periodName = tt.subjectExam?.period?.name || "Kỳ kiểm tra định kỳ"
        const gradeStr = tt.subjectExam?.gradeLevel ? `Khối ${tt.subjectExam.gradeLevel}` : ""

        addTask({
          taskId: `khaothi-task-${tt.id}`,
          taskType: `KHAO_THI_${tt.role}`,
          sourceModule: "KHAO_THI",
          sourceId: tt.id,
          title: `[Khảo thí Số] ${roleTitle} - ${gradeStr} (${periodName})`,
          description:
            tt.reviewNote ||
            `Nhiệm vụ khảo thí định kỳ (${roleTitle}). Hạn hoàn thành: ${due.toLocaleDateString("vi-VN")}.`,
          priority,
          status,
          deadline: isToday ? "Hôm nay" : due.toLocaleDateString("vi-VN"),
          deadlineDate: due.toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/khao-thi-so?examId=${tt.subjectExamId}`,
          createdAt: tt.createdAt.toISOString(),
          completedAt: tt.completedAt?.toISOString() || null,
          metadata: {
            moduleLabel: "Khảo thí Số",
            badgeColor: "purple",
            subjectId: tt.subjectExam?.subjectId,
            approvalStatus:
              tt.status === "APPROVED"
                ? "APPROVED"
                : tt.status === "REVISION_REQUESTED"
                ? "RETURNED"
                : tt.status === "SUBMITTED"
                ? "PENDING_APPROVAL"
                : "DRAFT",
          },
        })
      }

      for (const ps of proctorSessions) {
        const sess = ps.session
        if (!sess) continue
        const isSigned = sess.minutesStatus === "SIGNED"
        if (isSigned && !options?.includeCompleted && options?.status !== "COMPLETED") {
          continue
        }
        const examDate = new Date(sess.examDate)
        const isToday = examDate >= todayStart && examDate <= todayEnd

        addTask({
          taskId: `khaothi-proctor-${ps.id}`,
          taskType: "KHAO_THI_PROCTORING",
          sourceModule: "KHAO_THI",
          sourceId: sess.id,
          title: `[Coi kiểm tra] ${sess.roomName} (${sess.startTime} - ${sess.endTime})`,
          description: ps.conflictWarning
            ? `Cảnh báo lịch: ${ps.conflictWarning}. Vui lòng điểm danh, ghi nhận số bài thu và ký biên bản coi kiểm tra.`
            : `Điểm danh thí sinh, thu bài và ký biên bản điện tử tại ${sess.roomName}.`,
          priority: ps.conflictWarning ? "URGENT" : isToday ? "HIGH" : "NORMAL",
          status: isSigned ? "COMPLETED" : "IN_PROGRESS",
          deadline: isToday ? "Hôm nay" : examDate.toLocaleDateString("vi-VN"),
          deadlineDate: examDate.toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/khao-thi-so?tab=proctoring&sessionId=${sess.id}`,
          createdAt: ps.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Coi kiểm tra",
            badgeColor: "purple",
          },
        })
      }
    } catch (err) {
      console.warn("[TaskEngine] Module 10 (KHAO_THI) warning:", err)
    }
  }

  // ============================================================================
  // TÍNH TOÁN THỐNG KÊ TỔNG HỢP & SẮP XẾP ĐỘ ƯU TIÊN
  // ============================================================================
  const allTasks = Array.from(taskMap.values())

  const priorityOrder: Record<TaskPriority, number> = {
    URGENT: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
  }

  const statusOrder: Record<TaskStatus, number> = {
    OVERDUE: 0,
    NEW: 1,
    IN_PROGRESS: 2,
    WAITING: 3,
    COMPLETED: 4,
    CANCELLED: 5,
  }

  allTasks.sort((a, b) => {
    const sDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
    if (sDiff !== 0) return sDiff
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const counts: TaskSummaryCounts = {
    total: allTasks.length,
    today: 0,
    thisWeek: 0,
    inProgress: 0,
    waitingApproval: 0,
    overdue: 0,
    completed: 0,
    byModule: createEmptyModuleCounts(),
  }

  for (const t of allTasks) {
    if (t.status === "COMPLETED") {
      counts.completed++
      continue
    }

    counts.byModule[t.sourceModule] = (counts.byModule[t.sourceModule] || 0) + 1
    // Tương thích ngược cho bộ đếm cũ
    if (t.sourceModule === "Y_KIEN_PHHS" || t.sourceModule === "NPS_PHHS") {
      counts.byModule.PHHS = (counts.byModule.PHHS || 0) + 1
    }
    if (t.sourceModule === "KHAO_SAT_DAU_VAO" || t.sourceModule === "CHAT_LUONG_GIANG_DAY") {
      counts.byModule.KHAO_THI = (counts.byModule.KHAO_THI || 0) + 1
    }
    if (t.status === "WAITING") {
      counts.waitingApproval++
    }
    if (t.status === "IN_PROGRESS") {
      counts.inProgress++
    }
    if (t.status === "OVERDUE") {
      counts.overdue++
      counts.today++
      counts.thisWeek++
      continue
    }

    if (
      t.deadline.includes("Hôm nay") ||
      t.deadline.includes("24h") ||
      t.deadline === "Cần xử lý ngay" ||
      t.priority === "URGENT"
    ) {
      counts.today++
    }
    counts.thisWeek++
  }

  // Áp dụng bộ lọc đa chiều nếu người dùng truyền vào
  let filtered = allTasks

  if (options?.campusId && options.campusId !== "ALL") {
    filtered = filtered.filter((t) => !t.metadata?.campusId || t.metadata.campusId === options.campusId)
  }

  if (options?.classId && options.classId !== "ALL") {
    filtered = filtered.filter(
      (t) => t.metadata?.classId === options.classId || t.metadata?.className === options.classId
    )
  }

  if (options?.subjectId && options.subjectId !== "ALL") {
    filtered = filtered.filter(
      (t) => t.metadata?.subjectId === options.subjectId || t.metadata?.subjectName === options.subjectId
    )
  }

  if (options?.module && options.module !== "ALL") {
    const m = options.module
    filtered = filtered.filter((t) => {
      if (t.sourceModule === m) return true
      if (m === "PHHS" && (t.sourceModule === "Y_KIEN_PHHS" || t.sourceModule === "NPS_PHHS")) return true
      if (m === "HO_TRO" && t.sourceModule === "CO_VAN") return true
      if (m === "KHAO_THI" && (t.sourceModule === "KHAO_SAT_DAU_VAO" || t.sourceModule === "CHAT_LUONG_GIANG_DAY"))
        return true
      return false
    })
  }

  if (options?.status && options.status !== "ALL") {
    const st = options.status
    if (st === "TODAY") {
      filtered = filtered.filter(
        (t) =>
          t.status === "OVERDUE" ||
          t.deadline.includes("Hôm nay") ||
          t.deadline.includes("24h") ||
          t.deadline === "Cần xử lý ngay" ||
          t.priority === "URGENT"
      )
    } else {
      filtered = filtered.filter((t) => t.status === st)
    }
  }

  if (options?.timeRange && options.timeRange !== "ALL") {
    if (options.timeRange === "TODAY") {
      filtered = filtered.filter(
        (t) =>
          t.status === "OVERDUE" ||
          t.deadline.includes("Hôm nay") ||
          t.deadline.includes("24h") ||
          t.deadline === "Cần xử lý ngay" ||
          t.priority === "URGENT"
      )
    } else if (options.timeRange === "THIS_WEEK") {
      filtered = filtered.filter((t) => {
        if (!t.deadlineDate) return true
        return new Date(t.deadlineDate) <= weekEnd
      })
    }
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim()
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.metadata?.className && t.metadata.className.toLowerCase().includes(q)) ||
        (t.metadata?.subjectName && t.metadata.subjectName.toLowerCase().includes(q)) ||
        (t.metadata?.studentName && t.metadata.studentName.toLowerCase().includes(q))
    )
  }

  return {
    tasks: filtered,
    counts,
  }
}

/**
 * Alias tương thích ngược cho PWA API và các thành phần gọi aggregateUserTasks(userId, role)
 */
export async function aggregateUserTasks(
  userId: string,
  _userRole?: string,
  options?: TaskFilterOptions
): Promise<{
  tasks: SSMTask[]
  counts: TaskSummaryCounts
}> {
  return aggregateTeacherTasks(userId, options)
}

export { resolveTeacherAssignmentProfile } from "./assignmentMapper"
export { calculateTeacherProgressAndKPI } from "./kpiRulesEngine"
export { evaluateAndDispatchTeacherReminders, getTeacherReminderHistory } from "./reminderEngine"
export { answerTeacherTaskAssistantQuery, detectTaskAssistantQuestionType } from "./taskAssistantEngine"


