import { prisma } from "@/lib/db"
import { SSMTask, TaskSummaryCounts, SourceModule } from "./types"

export async function aggregateUserTasks(userId: string, userRole: string = "TEACHER"): Promise<{
  tasks: SSMTask[]
  counts: TaskSummaryCounts
}> {
  const normRole = (userRole || "TEACHER").toUpperCase().trim()
  const isTTCM = ["TTCM", "TPCM", "TO_TRUONG", "TO_PHO"].some(r => normRole.includes(r))
  const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GIAM_DOC_CO_SO"].some(r => normRole.includes(r))
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"].some(r => normRole.includes(r))

  // 1. Get Teacher record & assigned homeroom classes
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      campus: true,
      departmentRel: true,
    }
  }).catch(() => null)

  const teacherId = teacher?.id

  let homeroomClassIds: string[] = []
  let homeroomClassNames: string[] = []

  if (teacherId) {
    const homeroomClasses = await prisma.class.findMany({
      where: {
        OR: [
          { homeroomTeacherId: teacherId },
          { homeroomTeacherId: { contains: teacherId } }
        ]
      },
      select: { id: true, name: true }
    }).catch(() => [])

    homeroomClassIds = homeroomClasses.map(c => c.id)
    homeroomClassNames = homeroomClasses.map(c => c.name)
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000)

  const tasks: SSMTask[] = []

  // 2. CONCURRENT DATA EXTRACTION

  // MODULE A: DỰ GIỜ (Observation)
  if (teacherId) {
    try {
      // 1. Host teaching slots coming up
      const upcomingHostSlots = await prisma.observationSlot.findMany({
        where: {
          teacherId: teacherId,
          date: { gte: startOfToday, lte: endOfWeek },
          status: { notIn: ["CANCELLED", "COMPLETED"] }
        },
        orderBy: { date: "asc" },
        take: 5
      })

      upcomingHostSlots.forEach(slot => {
        const slotDate = new Date(slot.date)
        const isToday = slotDate >= startOfToday && slotDate <= endOfToday
        tasks.push({
          taskId: `host-slot-${slot.id}`,
          taskType: "HOST_OBSERVATION",
          sourceModule: "DU_GIO",
          sourceId: slot.id,
          title: `Tiết dạy thao giảng: ${slot.subjectName || "Chuyên môn"} (${slot.className || "Lớp"})`,
          description: `Tiết ${slot.period || 1} - Ngày ${slotDate.toLocaleDateString("vi-VN")}`,
          priority: isToday ? "URGENT" : "HIGH",
          status: "IN_PROGRESS",
          deadline: isToday ? "Hôm nay" : slotDate.toLocaleDateString("vi-VN"),
          deadlineDate: slotDate.toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/du-gio?tab=my_schedule&slotId=${slot.id}`,
          createdAt: slot.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Dự giờ",
            badgeColor: "orange",
            className: slot.className || undefined,
            subjectName: slot.subjectName || undefined
          }
        })
      })

      // 2. Observer registrations approved/confirmed
      const upcomingObserverRegs = await prisma.observationRegistration.findMany({
        where: {
          teacherId: teacherId,
          slot: {
            date: { gte: startOfToday, lte: endOfWeek }
          }
        },
        include: { slot: true },
        orderBy: { slot: { date: "asc" } },
        take: 5
      })

      upcomingObserverRegs.forEach(reg => {
        const slotDate = new Date(reg.slot.date)
        const isToday = slotDate >= startOfToday && slotDate <= endOfToday
        const regDate = reg.registeredAt ? new Date(reg.registeredAt) : new Date()
        tasks.push({
          taskId: `observer-reg-${reg.id}`,
          taskType: "OBSERVE_LESSON",
          sourceModule: "DU_GIO",
          sourceId: reg.id,
          title: `Tham dự dự giờ: ${reg.slot.subjectName || "Tiết dạy"} (${reg.slot.className || "Lớp"})`,
          description: `Tiết ${reg.slot.period || 1} - Ngày ${slotDate.toLocaleDateString("vi-VN")}`,
          priority: isToday ? "HIGH" : "NORMAL",
          status: "IN_PROGRESS",
          deadline: isToday ? "Hôm nay" : slotDate.toLocaleDateString("vi-VN"),
          deadlineDate: slotDate.toISOString(),
          assignedUserId: userId,
          deepLink: `/teacher/du-gio?tab=observation_list&slotId=${reg.slotId}`,
          createdAt: regDate.toISOString(),
          metadata: {
            moduleLabel: "Dự giờ",
            badgeColor: "orange",
            className: reg.slot.className || undefined,
            subjectName: reg.slot.subjectName || undefined
          }
        })
      })

      // 3. Attended observation slots needing evaluation
      const pendingEvaluations = await prisma.observationRegistration.findMany({
        where: {
          teacherId: teacherId,
          evaluation: null,
          slot: {
            date: { lte: endOfToday }
          }
        },
        include: { slot: true },
        take: 5
      })

      pendingEvaluations.forEach(reg => {
        const regDate = reg.registeredAt ? new Date(reg.registeredAt) : new Date()
        tasks.push({
          taskId: `eval-pending-${reg.id}`,
          taskType: "SUBMIT_EVALUATION",
          sourceModule: "DU_GIO",
          sourceId: reg.id,
          title: `Chưa hoàn thành phiếu đánh giá dự giờ: ${reg.slot.subjectName || "Tiết dạy"}`,
          description: `Cần hoàn thành nhận xét và chấm điểm cho tiết dạy ngày ${new Date(reg.slot.date).toLocaleDateString("vi-VN")}`,
          priority: "URGENT",
          status: "OVERDUE",
          deadline: "Cần xử lý ngay",
          assignedUserId: userId,
          deepLink: `/teacher/du-gio?tab=overview_slots&slotId=${reg.slotId}&action=evaluate`,
          createdAt: regDate.toISOString(),
          metadata: {
            moduleLabel: "Dự giờ",
            badgeColor: "red"
          }
        })
      })

      // 4. If TTCM: Pending registration approvals
      if (isTTCM) {
        const pendingApprovals = await prisma.observationRegistration.findMany({
          where: {
            isApproved: false,
            slot: {
              date: { gte: startOfToday }
            }
          },
          include: {
            slot: true,
            teacher: true
          },
          take: 5
        })

        pendingApprovals.forEach(reg => {
          const regDate = reg.registeredAt ? new Date(reg.registeredAt) : new Date()
          tasks.push({
            taskId: `approval-reg-${reg.id}`,
            taskType: "APPROVE_OBSERVATION",
            sourceModule: "DU_GIO",
            sourceId: reg.id,
            title: `Duyệt đăng ký dự giờ: ${reg.teacher?.teacherName || "Giáo viên"}`,
            description: `Đăng ký tiết ${reg.slot.period} - Môn ${reg.slot.subjectName} (${reg.slot.className})`,
            priority: "URGENT",
            status: "WAITING",
            deadline: "Trước khi tiết học bắt đầu",
            assignedUserId: userId,
            deepLink: `/teacher/du-gio?tab=approval_list&regId=${reg.id}`,
            createdAt: regDate.toISOString(),
            metadata: {
              moduleLabel: "Tổ chuyên môn",
              badgeColor: "purple"
            }
          })
        })
      }
    } catch (err) {
      console.error("[TaskEngine] Observation tasks error:", err)
    }
  }

  // MODULE B: CỐ VẤN HỌC TẬP (Advisory)
  if (homeroomClassIds.length > 0) {
    try {
      // 1. Goal Unlock Requests
      const pendingUnlocks = await prisma.studentGoalUnlock.findMany({
        where: {
          status: "PENDING",
          goal: {
            student: { classId: { in: homeroomClassIds } }
          }
        },
        include: {
          goal: {
            include: {
              student: { include: { class: true } }
            }
          }
        },
        take: 5
      })

      pendingUnlocks.forEach(unlock => {
        const stName = unlock.goal?.student?.studentName || "Học sinh"
        const clsName = unlock.goal?.student?.class?.className || "Lớp"
        tasks.push({
          taskId: `goal-unlock-${unlock.id}`,
          taskType: "UNLOCK_GOAL",
          sourceModule: "CO_VAN",
          sourceId: unlock.id,
          title: `Yêu cầu mở khóa mục tiêu: ${stName} (${clsName})`,
          description: unlock.reason ? `Lý do: ${unlock.reason}` : "Học sinh gửi yêu cầu điều chỉnh mục tiêu học tập",
          priority: "URGENT",
          status: "WAITING",
          deadline: "Hôm nay",
          assignedUserId: userId,
          deepLink: `/teacher/co-van-hoc-tap?tab=unlock-requests&studentId=${unlock.goal?.studentId}`,
          createdAt: unlock.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Cố vấn",
            badgeColor: "red",
            studentName: stName,
            className: clsName
          }
        })
      })

      // 2. Student Help Requests
      const openHelpRequests = await prisma.studentHelpRequest.findMany({
        where: {
          status: "OPEN",
          student: { classId: { in: homeroomClassIds } }
        },
        include: {
          student: { include: { class: true } }
        },
        take: 5
      })

      openHelpRequests.forEach(req => {
        const stName = req.student?.studentName || "Học sinh"
        const clsName = req.student?.class?.className || "Lớp"
        tasks.push({
          taskId: `help-request-${req.id}`,
          taskType: "STUDENT_HELP_REQUEST",
          sourceModule: "CO_VAN",
          sourceId: req.id,
          title: `Học sinh cần trợ giúp: ${stName} (${clsName})`,
          description: req.content ? (req.content.length > 50 ? req.content.slice(0, 50) + "..." : req.content) : "Yêu cầu hỗ trợ học tập",
          priority: "HIGH",
          status: "IN_PROGRESS",
          deadline: "Tuần này",
          assignedUserId: userId,
          deepLink: `/teacher/co-van-hoc-tap?tab=help-requests&studentId=${req.studentId}`,
          createdAt: req.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Cố vấn",
            badgeColor: "amber",
            studentName: stName,
            className: clsName
          }
        })
      })
    } catch (err) {
      console.error("[TaskEngine] Advisory tasks error:", err)
    }
  }

  // MODULE C: HỖ TRỢ HỌC TẬP (Learning Support)
  if (teacherId) {
    try {
      const supportAssignments = await prisma.learningSupportAssignment.findMany({
        where: {
          teacherId: teacherId,
          target: { status: "ACTIVE" }
        },
        include: {
          target: {
            include: {
              student: { include: { class: true } }
            }
          }
        },
        take: 5
      })

      supportAssignments.forEach(assign => {
        const stName = assign.target?.student?.studentName || "Học sinh"
        const clsName = assign.target?.student?.class?.className || "Lớp"
        tasks.push({
          taskId: `support-assign-${assign.id}`,
          taskType: "LEARNING_SUPPORT",
          sourceModule: "HO_TRO",
          sourceId: assign.id,
          title: `Theo dõi hỗ trợ học tập: ${stName} (${clsName})`,
          description: assign.target?.targetOutcome || "Kế hoạch can thiệp nâng cao kết quả học tập",
          priority: "NORMAL",
          status: "IN_PROGRESS",
          deadline: "Định kỳ tháng",
          assignedUserId: userId,
          deepLink: `/teacher/ho-tro-hoc-tap?studentId=${assign.target?.studentId}`,
          createdAt: assign.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Hỗ trợ HS",
            badgeColor: "blue",
            studentName: stName,
            className: clsName
          }
        })
      })
    } catch (err) {
      console.error("[TaskEngine] Learning support tasks error:", err)
    }
  }

  // MODULE D: HOẠT ĐỘNG TRẢI NGHIỆM (Experiential Activities)
  if (teacherId) {
    try {
      const draftActivities = await prisma.activityRecord.findMany({
        where: {
          teacherId: teacherId,
          status: "DRAFT"
        },
        take: 3
      })

      draftActivities.forEach(act => {
        tasks.push({
          taskId: `activity-draft-${act.id}`,
          taskType: "ACTIVITY_SUBMISSION",
          sourceModule: "TRAI_NGHIEM",
          sourceId: act.id,
          title: `Hoàn thiện hồ sơ trải nghiệm: ${act.name || "Dự án ngoại khóa"}`,
          description: "Bản ghi hoạt động đang ở trạng thái Nháp, cần cập nhật minh chứng và nộp duyệt",
          priority: "NORMAL",
          status: "NEW",
          deadline: "Tuần này",
          assignedUserId: userId,
          deepLink: `/teacher/experiential-activities/${act.id}`,
          createdAt: act.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Trải nghiệm",
            badgeColor: "emerald"
          }
        })
      })
    } catch (err) {
      console.error("[TaskEngine] Experiential tasks error:", err)
    }
  }

  // MODULE E: KHẢO THÍ & ĐBCL (Gradebook Unlock Requests)
  if (teacherId) {
    try {
      const unlockRequests = await prisma.gradebookUnlockRequest.findMany({
        where: {
          teacherId: teacherId,
          status: "PENDING"
        },
        take: 3
      })

      unlockRequests.forEach(req => {
        tasks.push({
          taskId: `gradebook-unlock-${req.id}`,
          taskType: "GRADEBOOK_UNLOCK",
          sourceModule: "KHAO_THI",
          sourceId: req.id,
          title: `Đơn xin mở khóa sổ điểm: Đang chờ Khảo thí duyệt`,
          description: req.reason ? `Lý do: ${req.reason}` : "Yêu cầu mở khóa nhập điểm bù",
          priority: "HIGH",
          status: "WAITING",
          deadline: "Đang xử lý",
          assignedUserId: userId,
          deepLink: `/teacher/input-assessments`,
          createdAt: req.createdAt.toISOString(),
          metadata: {
            moduleLabel: "Khảo thí",
            badgeColor: "purple"
          }
        })
      })
    } catch (err) {
      console.error("[TaskEngine] Grading tasks error:", err)
    }
  }

  // MODULE F: NHIỆM VỤ NỘI BỘ (WorkTask)
  try {
    const workTasks = await prisma.workTask.findMany({
      where: {
        assignedToUserId: userId,
        progress: { in: ["PENDING", "IN_PROGRESS"] }
      },
      orderBy: { endDate: "asc" },
      take: 10
    })

    workTasks.forEach(task => {
      const endDate = new Date(task.endDate)
      const isOverdue = endDate < startOfToday
      const isToday = endDate >= startOfToday && endDate <= endOfToday

      tasks.push({
        taskId: `work-task-${task.id}`,
        taskType: "DIRECTED_TASK",
        sourceModule: "CONG_TAC",
        sourceId: task.id,
        title: task.title,
        description: task.description || undefined,
        priority: isOverdue ? "URGENT" : isToday ? "HIGH" : task.isImportant ? "HIGH" : "NORMAL",
        status: isOverdue ? "OVERDUE" : "IN_PROGRESS",
        deadline: isOverdue ? `Quá hạn (${endDate.toLocaleDateString("vi-VN")})` : isToday ? "Hôm nay" : endDate.toLocaleDateString("vi-VN"),
        deadlineDate: endDate.toISOString(),
        assignedUserId: userId,
        deepLink: `/teacher/tasks?id=${task.id}`,
        createdAt: task.createdAt.toISOString(),
        metadata: {
          moduleLabel: "Công tác",
          badgeColor: isOverdue ? "red" : "teal"
        }
      })
    })
  } catch (err) {
    console.error("[TaskEngine] WorkTask error:", err)
  }

  // 3. SORT TASKS: URGENT / OVERDUE FIRST
  const priorityWeight: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1
  }

  tasks.sort((a, b) => {
    const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0)
    if (weightDiff !== 0) return weightDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // 4. CALCULATE AGGREGATE SUMMARY COUNTS
  const byModule: Record<SourceModule, number> = {
    DU_GIO: 0,
    CO_VAN: 0,
    PHHS: 0,
    HO_TRO: 0,
    TRAI_NGHIEM: 0,
    KHAO_THI: 0,
    CONG_TAC: 0
  }

  let todayCount = 0
  let thisWeekCount = 0
  let overdueCount = 0
  let completedCount = 0

  tasks.forEach(t => {
    byModule[t.sourceModule] = (byModule[t.sourceModule] || 0) + 1

    if (t.status === "OVERDUE" || t.priority === "URGENT") {
      overdueCount++
    }
    if (t.deadline === "Hôm nay" || t.priority === "URGENT") {
      todayCount++
    }
    if (t.status !== "COMPLETED") {
      thisWeekCount++
    }
  })

  return {
    tasks,
    counts: {
      today: todayCount,
      thisWeek: thisWeekCount,
      overdue: overdueCount,
      completed: completedCount,
      byModule
    }
  }
}
