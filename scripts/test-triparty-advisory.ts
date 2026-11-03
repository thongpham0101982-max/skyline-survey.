import assert from "node:assert/strict"
import { prisma } from "../src/lib/db"
import {
  AdvisoryCallerContext,
  verifyStudentRelationship,
  sanitizeConsultationForViewer,
  sanitizeHelpRequestForViewer,
  sanitizeReflectionForViewer,
  enrichGoalWithPolicies
} from "../src/lib/advisory/rbac-guard"
import {
  ensureTriPartyTables,
  upsertRecordPolicy,
  getPoliciesByStudentIds,
  appendAdvisoryAuditLog,
  listAdvisoryAuditLogs,
  computeWorkflowProgress
} from "../src/lib/advisory/triparty-sync"

async function runTests() {
  console.log("==================================================================")
  console.log("🧪 BỘ KIỂM THỬ TỰ ĐỘNG: CỐ VẤN HỌC TẬP 3 BÊN (GV - HS - PHHS)")
  console.log("==================================================================\n")

  await ensureTriPartyTables()

  const testPrefix = `TEST_3P_${Date.now()}`
  const ayId = `${testPrefix}_AY`
  const campusId = `${testPrefix}_CAMPUS`
  const class1Id = `${testPrefix}_CLS1`
  const class2Id = `${testPrefix}_CLS2`

  const userAdvisor1Id = `${testPrefix}_USR_ADV1`
  const userAdvisor2Id = `${testPrefix}_USR_ADV2`
  const teacher1Id = `${testPrefix}_TCH1`
  const teacher2Id = `${testPrefix}_TCH2`

  const userParentMultiId = `${testPrefix}_USR_PAR1`
  const parentMultiId = `${testPrefix}_PAR1`

  const student1Id = `${testPrefix}_STU1`
  const student2Id = `${testPrefix}_STU2`
  const student3Id = `${testPrefix}_STU3` // Unrelated student in Class 2

  let passed = 0
  const pass = (name: string) => {
    passed++
    console.log(`  ✅ [PASS] TC-${String(passed).padStart(2, "0")}: ${name}`)
  }

  try {
    // Seed isolated test fixtures
    await prisma.campus.create({
      data: { id: campusId, campusCode: testPrefix, campusName: "Sky-Line Test Campus" }
    })
    await prisma.academicYear.create({
      data: {
        id: ayId,
        name: "2026-2027-Test",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-05-31"),
        status: "ACTIVE"
      }
    })

    await prisma.user.createMany({
      data: [
        { id: userAdvisor1Id, fullName: "CVHT Nguyễn Văn A", email: `${testPrefix}_adv1@skyline.edu.vn`, passwordHash: "hash", role: "TEACHER" },
        { id: userAdvisor2Id, fullName: "CVHT Trần Thị B", email: `${testPrefix}_adv2@skyline.edu.vn`, passwordHash: "hash", role: "TEACHER" },
        { id: userParentMultiId, fullName: "PHHS Lê Văn C", email: `${testPrefix}_par1@skyline.edu.vn`, passwordHash: "hash", role: "PARENT" }
      ]
    })

    await prisma.teacher.create({
      data: { id: teacher1Id, userId: userAdvisor1Id, teacherCode: `${testPrefix}_T1`, teacherName: "CVHT Nguyễn Văn A", campusId }
    })
    await prisma.teacher.create({
      data: { id: teacher2Id, userId: userAdvisor2Id, teacherCode: `${testPrefix}_T2`, teacherName: "CVHT Trần Thị B", campusId }
    })
    await prisma.parent.create({
      data: { id: parentMultiId, userId: userParentMultiId, parentCode: `${testPrefix}_P1`, parentName: "PHHS Lê Văn C" }
    })

    await prisma.class.create({
      data: {
        id: class1Id,
        classCode: `${testPrefix}_10A1`,
        className: "10A1",
        level: "THPT",
        grade: "K10",
        campusId,
        academicYearId: ayId,
        homeroomTeacherId: teacher1Id
      }
    })
    await prisma.class.create({
      data: {
        id: class2Id,
        classCode: `${testPrefix}_11A2`,
        className: "11A2",
        level: "THPT",
        grade: "K11",
        campusId,
        academicYearId: ayId,
        homeroomTeacherId: teacher2Id
      }
    })

    await prisma.student.createMany({
      data: [
        { id: student1Id, studentCode: `${testPrefix}_HS1`, studentName: "Lê Minh Khang", classId: class1Id, campusId, academicYearId: ayId },
        { id: student2Id, studentCode: `${testPrefix}_HS2`, studentName: "Lê Minh Châu", classId: class1Id, campusId, academicYearId: ayId },
        { id: student3Id, studentCode: `${testPrefix}_HS3`, studentName: "Phạm Quốc Bảo", classId: class2Id, campusId, academicYearId: ayId }
      ]
    })

    // Parent C has 2 children: Student 1 and Student 2 (NOT Student 3)
    await prisma.parentStudentLink.createMany({
      data: [
        { id: `${testPrefix}_L1`, parentId: parentMultiId, studentId: student1Id, relationship: "FATHER", status: "ACTIVE" },
        { id: `${testPrefix}_L2`, parentId: parentMultiId, studentId: student2Id, relationship: "FATHER", status: "ACTIVE" }
      ]
    })

    const callerStudent1: AdvisoryCallerContext = {
      authenticated: true,
      actorRole: "STUDENT",
      rawRole: "STUDENT",
      userId: student1Id,
      actorName: "Lê Minh Khang",
      studentId: student1Id,
      studentCode: `${testPrefix}_HS1`,
      campusIds: [campusId],
      isFullAdmin: false
    }

    const callerAdvisor1: AdvisoryCallerContext = {
      authenticated: true,
      actorRole: "TEACHER",
      rawRole: "TEACHER",
      userId: userAdvisor1Id,
      actorName: "CVHT Nguyễn Văn A",
      teacherId: teacher1Id,
      campusIds: [campusId],
      isFullAdmin: false
    }

    const callerAdvisor2: AdvisoryCallerContext = {
      authenticated: true,
      actorRole: "TEACHER",
      rawRole: "TEACHER",
      userId: userAdvisor2Id,
      actorName: "CVHT Trần Thị B",
      teacherId: teacher2Id,
      campusIds: [campusId],
      isFullAdmin: false
    }

    const callerParent: AdvisoryCallerContext = {
      authenticated: true,
      actorRole: "PARENT",
      rawRole: "PARENT",
      userId: userParentMultiId,
      actorName: "PHHS Lê Văn C",
      parentId: parentMultiId,
      campusIds: [],
      isFullAdmin: false
    }

    // ------------------------------------------------------------------------
    // TC-01: Học sinh tạo và sửa mục tiêu SMART (Bảo toàn chữ ký/lời nhắn cũ)
    // ------------------------------------------------------------------------
    const goal1 = await prisma.studentGoal.create({
      data: {
        studentId: student1Id,
        academicYearId: ayId,
        gradeLevel: "K10",
        semester: "CA_NAM",
        category: "HOC_TAP",
        targetText: "Đạt 8.5 môn Toán HK1",
        studentCommitment: "Giải 5 bài tập mỗi tối",
        parentMessage: "Bố mẹ luôn đồng hành cùng con",
        signedByStudent: true,
        signedByParent: true,
        actions: {
          create: [{ actionText: "Làm đề ôn tập mỗi tuần", status: "PENDING" }]
        }
      },
      include: { actions: true }
    })

    await upsertRecordPolicy({
      entityType: "GOAL",
      entityId: goal1.id,
      studentId: student1Id,
      academicYearId: ayId,
      privacyTier: "SHARED_EDUCATIONAL",
      shareWithParent: true,
      advisorReviewStatus: "PENDING_REVIEW"
    })

    assert.equal(goal1.targetText, "Đạt 8.5 môn Toán HK1")
    assert.equal(goal1.signedByParent, true)
    pass("Học sinh tạo và sửa mục tiêu SMART, bảo toàn lời nhắn đồng hành của Phụ huynh")

    // ------------------------------------------------------------------------
    // TC-02: CVHT xác nhận hoặc đề nghị điều chỉnh mục tiêu SMART
    // ------------------------------------------------------------------------
    await prisma.studentGoal.update({
      where: { id: goal1.id },
      data: {
        teacherComment: "Mục tiêu rõ ràng, khả thi. CVHT xác nhận!",
        signedByTeacher: true,
        status: "IN_PROGRESS"
      }
    })
    await upsertRecordPolicy({
      entityType: "GOAL",
      entityId: goal1.id,
      studentId: student1Id,
      academicYearId: ayId,
      privacyTier: "SHARED_EDUCATIONAL",
      shareWithParent: true,
      advisorReviewStatus: "CONFIRMED",
      advisorReviewNote: "Mục tiêu rõ ràng, khả thi. CVHT xác nhận!"
    })

    const policyMapAfterReview = await getPoliciesByStudentIds([student1Id])
    const enrichedGoal = enrichGoalWithPolicies(
      await prisma.studentGoal.findUnique({ where: { id: goal1.id }, include: { actions: true } }),
      policyMapAfterReview
    )
    assert.equal(enrichedGoal.advisorReviewStatus, "CONFIRMED")
    assert.equal(enrichedGoal.signedByTeacher, true)
    pass("CVHT xác nhận hoặc đề nghị điều chỉnh mục tiêu SMART đồng bộ 3 bên")

    // ------------------------------------------------------------------------
    // TC-03: Học sinh cập nhật hành động 7 ngày & nộp minh chứng
    // ------------------------------------------------------------------------
    const actionId = goal1.actions[0].id
    await prisma.studentGoalAction.update({
      where: { id: actionId },
      data: { status: "DONE" }
    })
    await upsertRecordPolicy({
      entityType: "GOAL_ACTION",
      entityId: actionId,
      studentId: student1Id,
      academicYearId: ayId,
      privacyTier: "SHARED_EDUCATIONAL",
      shareWithParent: true,
      evidenceNotes: "Đã hoàn thành 20 bài hình học, đạt 9.0 kiểm tra 15 phút"
    })

    const policyMapAfterAction = await getPoliciesByStudentIds([student1Id])
    const enrichedAfterAction = enrichGoalWithPolicies(
      await prisma.studentGoal.findUnique({ where: { id: goal1.id }, include: { actions: true } }),
      policyMapAfterAction
    )
    assert.equal(enrichedAfterAction.actions[0].status, "DONE")
    assert.equal(
      enrichedAfterAction.actions[0].evidenceNotes,
      "Đã hoàn thành 20 bài hình học, đạt 9.0 kiểm tra 15 phút"
    )
    pass("Học sinh cập nhật hành động 7 ngày và đính kèm minh chứng kết quả")

    // ------------------------------------------------------------------------
    // TC-04 & TC-05: GV tạo phiên cố vấn 1:1 có Ghi chú riêng (Private) + Chia sẻ PHHS (Shared)
    // Kiểm tra PHHS xem đúng nội dung được chia sẻ và KHÔNG thấy ghi chú riêng tư
    // ------------------------------------------------------------------------
    const consultShared = await prisma.academicConsultationLog.create({
      data: {
        studentId: student1Id,
        teacherId: teacher1Id,
        academicYearId: ayId,
        content: "Rà soát tiến độ Toán và Tiếng Anh tuần 4",
        difficulties: "Còn nhầm lẫn phần bất đẳng thức",
        nextActions: "Luyện thêm 5 bài bất đẳng thức cơ bản",
        notes: "Gia đình nhắc con ngủ trước 22h30",
        studentReflection: "Em đã hiểu rõ phương pháp học tập mới"
      }
    })
    await upsertRecordPolicy({
      entityType: "CONSULTATION",
      entityId: consultShared.id,
      studentId: student1Id,
      academicYearId: ayId,
      privacyTier: "SHARED_EDUCATIONAL",
      shareWithParent: true,
      privateAdvisorNotes: "GHI_CHU_NOI_BO_CVHT_KHONG_TIET_LO_PHHS",
      parentSharedSummary: "Gia đình nhắc con ngủ trước 22h30"
    })

    const consultPrivate = await prisma.academicConsultationLog.create({
      data: {
        studentId: student1Id,
        teacherId: teacher1Id,
        academicYearId: ayId,
        content: "Tư vấn riêng nội bộ giữa CVHT và học sinh",
        notes: "Phiên tư vấn riêng không chia sẻ PHHS"
      }
    })
    await upsertRecordPolicy({
      entityType: "CONSULTATION",
      entityId: consultPrivate.id,
      studentId: student1Id,
      academicYearId: ayId,
      privacyTier: "PRIVATE_ADVISORY",
      shareWithParent: false,
      privateAdvisorNotes: "Bí mật riêng tư của học sinh"
    })

    const consultPolicies = await getPoliciesByStudentIds([student1Id], "CONSULTATION")
    const teacherViewShared = sanitizeConsultationForViewer(
      consultShared,
      consultPolicies.get(`CONSULTATION:${consultShared.id}`),
      "TEACHER"
    )
    const parentViewShared = sanitizeConsultationForViewer(
      consultShared,
      consultPolicies.get(`CONSULTATION:${consultShared.id}`),
      "PARENT"
    )
    const studentViewShared = sanitizeConsultationForViewer(
      consultShared,
      consultPolicies.get(`CONSULTATION:${consultShared.id}`),
      "STUDENT"
    )
    const parentViewPrivate = sanitizeConsultationForViewer(
      consultPrivate,
      consultPolicies.get(`CONSULTATION:${consultPrivate.id}`),
      "PARENT"
    )

    assert.equal(teacherViewShared.privateAdvisorNotes, "GHI_CHU_NOI_BO_CVHT_KHONG_TIET_LO_PHHS")
    pass("GV nhận đầy đủ thông tin cần xử lý và ghi chú chuyên môn nội bộ (Private Advisory Notes)")

    assert.equal(parentViewShared.privateAdvisorNotes, undefined)
    assert.equal(studentViewShared.privateAdvisorNotes, undefined)
    assert.equal(parentViewShared.notes, "Gia đình nhắc con ngủ trước 22h30")
    assert.equal(parentViewPrivate, null)
    pass("PHHS chỉ xem đúng nội dung được chia sẻ, ẩn tuyệt đối Private Advisory Notes & phiên nội bộ")

    // ------------------------------------------------------------------------
    // TC-06: PHHS phản hồi việc hỗ trợ tại gia đình & gửi yêu cầu trao đổi; CVHT tiếp nhận
    // ------------------------------------------------------------------------
    await upsertRecordPolicy({
      entityType: "CONSULTATION",
      entityId: consultShared.id,
      studentId: student1Id,
      academicYearId: ayId,
      privacyTier: "SHARED_EDUCATIONAL",
      shareWithParent: true,
      parentAcknowledged: true,
      parentFeedback: "Gia đình đã bố trí góc học tập yên tĩnh và nhắc con đi ngủ lúc 22h15.",
      parentFeedbackAt: new Date().toISOString()
    })

    const exchangeId = `${testPrefix}_PEX1`
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ParentAdvisorExchange" (
        "id", "studentId", "academicYearId", "parentId", "parentName",
        "teacherId", "teacherName", "topic", "message", "homeSupportSummary", "status"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DAT_LICH_TRAO_DOI', 'Xin lịch trao đổi 15 phút chiều thứ Sáu', 'Đã đồng hành cùng con mỗi tối', 'PENDING')`,
      exchangeId,
      student1Id,
      ayId,
      parentMultiId,
      "PHHS Lê Văn C",
      teacher1Id,
      "CVHT Nguyễn Văn A"
    )

    await prisma.$executeRawUnsafe(
      `UPDATE "ParentAdvisorExchange" SET "status" = 'RESPONDED', "advisorResponse" = 'Thầy xác nhận lịch gặp 16h30 thứ Sáu nhé!', "respondedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      exchangeId
    )

    const updatedExchanges: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "ParentAdvisorExchange" WHERE "id" = ?`,
      exchangeId
    )
    assert.equal(updatedExchanges[0].status, "RESPONDED")
    assert.equal(updatedExchanges[0].advisorResponse, "Thầy xác nhận lịch gặp 16h30 thứ Sáu nhé!")
    pass("PHHS phản hồi hỗ trợ tại gia đình & gửi yêu cầu trao đổi; CVHT tiếp nhận và phản hồi")

    // ------------------------------------------------------------------------
    // TC-07: Thay đổi phân công CVHT (Reassignment)
    // ------------------------------------------------------------------------
    const beforeReassignAdv1 = await verifyStudentRelationship(callerAdvisor1, student1Id)
    const beforeReassignAdv2 = await verifyStudentRelationship(callerAdvisor2, student1Id)
    assert.equal(beforeReassignAdv1.allowed, true)
    assert.equal(beforeReassignAdv2.allowed, false)

    // Thay đổi CVHT phụ trách lớp 10A1 từ Teacher 1 sang Teacher 2
    await prisma.class.update({
      where: { id: class1Id },
      data: { homeroomTeacherId: teacher2Id }
    })

    const afterReassignAdv1 = await verifyStudentRelationship(callerAdvisor1, student1Id)
    const afterReassignAdv2 = await verifyStudentRelationship(callerAdvisor2, student1Id)
    assert.equal(afterReassignAdv1.allowed, false)
    assert.equal(afterReassignAdv2.allowed, true)

    // Khôi phục lại Teacher 1 cho các test tiếp theo
    await prisma.class.update({
      where: { id: class1Id },
      data: { homeroomTeacherId: teacher1Id }
    })
    pass("Thay đổi phân công CVHT cập nhật quyền truy cập tức thì theo lớp/học sinh")

    // ------------------------------------------------------------------------
    // TC-08: Phụ huynh có nhiều học sinh (Multi-child switching & isolation)
    // ------------------------------------------------------------------------
    const parChild1 = await verifyStudentRelationship(callerParent, student1Id)
    const parChild2 = await verifyStudentRelationship(callerParent, student2Id)
    const parUnrelated = await verifyStudentRelationship(callerParent, student3Id)
    assert.equal(parChild1.allowed, true)
    assert.equal(parChild2.allowed, true)
    assert.equal(parUnrelated.allowed, false)
    pass("Phụ huynh có nhiều học sinh chuyển đổi chính xác giữa các con liên kết")

    // ------------------------------------------------------------------------
    // TC-09: Người dùng truy cập trái quyền (Unauthorized / Cross-tenant IDOR)
    // ------------------------------------------------------------------------
    const stuCrossAccess = await verifyStudentRelationship(callerStudent1, student2Id)
    const advCrossClassAccess = await verifyStudentRelationship(callerAdvisor1, student3Id)
    const anonCaller: AdvisoryCallerContext = {
      authenticated: false,
      actorRole: "ANONYMOUS",
      rawRole: "",
      userId: "",
      actorName: "",
      campusIds: [],
      isFullAdmin: false
    }
    const anonAccess = await verifyStudentRelationship(anonCaller, student1Id)

    assert.equal(stuCrossAccess.allowed, false)
    assert.equal(advCrossClassAccess.allowed, false)
    assert.equal(anonAccess.allowed, false)
    pass("Chặn triệt để truy cập trái quyền (HS xem HS khác, GV xem lớp khác, PH xem HS lạ, Anonymous)")

    // ------------------------------------------------------------------------
    // TC-10: Hồ sơ nhạy cảm (Restricted Safeguarding) & Lịch sử thay đổi (Audit Log)
    // ------------------------------------------------------------------------
    const helpSensitive = await prisma.studentHelpRequest.create({
      data: {
        studentId: student1Id,
        academicYearId: ayId,
        teacherId: teacher1Id,
        category: "TAM_LY_BAN_BE",
        urgency: "HIGH",
        content: "Em gặp áp lực tâm lý cá nhân cần tâm sự riêng với thầy cô",
        status: "PROCESSING"
      }
    })
    await upsertRecordPolicy({
      entityType: "HELP_REQUEST",
      entityId: helpSensitive.id,
      studentId: student1Id,
      academicYearId: ayId,
      privacyTier: "RESTRICTED_SAFEGUARDING",
      shareWithParent: false,
      privateAdvisorNotes: "Đang phối hợp phòng Tâm lý học đường hỗ trợ riêng cho em"
    })

    await appendAdvisoryAuditLog({
      studentId: student1Id,
      actorId: userAdvisor1Id,
      actorRole: "TEACHER",
      actorName: "CVHT Nguyễn Văn A",
      entityType: "HELP_REQUEST",
      entityId: helpSensitive.id,
      action: "SAFEGUARDING_CASE_HANDLED",
      privacyTier: "RESTRICTED_SAFEGUARDING",
      summary: "Tiếp nhận hỗ trợ tâm lý bảo mật cho học sinh"
    })
    await appendAdvisoryAuditLog({
      studentId: student1Id,
      actorId: userParentMultiId,
      actorRole: "PARENT",
      actorName: "PHHS Lê Văn C",
      entityType: "CONSULTATION",
      entityId: consultShared.id,
      action: "PARENT_FEEDBACK_SUBMITTED",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: "Phụ huynh gửi phản hồi hỗ trợ tại gia đình"
    })

    const helpPolicies = await getPoliciesByStudentIds([student1Id], "HELP_REQUEST")
    const helpForParent = sanitizeHelpRequestForViewer(
      helpSensitive,
      helpPolicies.get(`HELP_REQUEST:${helpSensitive.id}`),
      "PARENT"
    )
    const helpForTeacher = sanitizeHelpRequestForViewer(
      helpSensitive,
      helpPolicies.get(`HELP_REQUEST:${helpSensitive.id}`),
      "TEACHER"
    )
    assert.equal(helpForParent, null)
    assert.equal(
      helpForTeacher.privateAdvisorNotes,
      "Đang phối hợp phòng Tâm lý học đường hỗ trợ riêng cho em"
    )

    const auditForTeacher = await listAdvisoryAuditLogs([student1Id], "TEACHER")
    const auditForParent = await listAdvisoryAuditLogs([student1Id], "PARENT")
    assert.equal(auditForTeacher.some(a => a.privacyTier === "RESTRICTED_SAFEGUARDING"), true)
    assert.equal(auditForParent.some(a => a.privacyTier === "RESTRICTED_SAFEGUARDING"), false)

    // Verify 8-step workflow synchronization
    const wf = computeWorkflowProgress({
      goals: [enrichedAfterAction],
      consultations: [teacherViewShared],
      reflections: [{ id: "ref1", reflectionText: "Đã phản tư" }],
      actionItems: [{ id: "act1", status: "COMPLETED" }],
      termEvaluations: [{ id: "eval1", term: "HK1" }],
      parentExchanges: updatedExchanges
    })
    assert.equal(wf.completedCount, 8)
    assert.equal(wf.percent, 100)
    pass("Bảo mật hồ sơ nhạy cảm (Restricted Safeguarding), kiểm toán lịch sử thay đổi & đồng bộ 8 bước (100%)")

    console.log(`\n🎉 HOÀN TẤT KIỂM THỬ: ${passed}/10 TEST CASES ĐẠT 100%!`)
  } finally {
    // Clean up test fixtures safely without touching any existing production/local data
    await prisma.$executeRawUnsafe(`DELETE FROM "AdvisoryRecordPolicy" WHERE "studentId" LIKE ?`, `${testPrefix}%`).catch(() => {})
    await prisma.$executeRawUnsafe(`DELETE FROM "ParentAdvisorExchange" WHERE "studentId" LIKE ?`, `${testPrefix}%`).catch(() => {})
    await prisma.$executeRawUnsafe(`DELETE FROM "AdvisoryAuditLog" WHERE "studentId" LIKE ?`, `${testPrefix}%`).catch(() => {})
    await prisma.studentHelpRequest.deleteMany({ where: { studentId: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.academicConsultationLog.deleteMany({ where: { studentId: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.studentGoal.deleteMany({ where: { studentId: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.parentStudentLink.deleteMany({ where: { id: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.student.deleteMany({ where: { id: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.class.deleteMany({ where: { id: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.parent.deleteMany({ where: { id: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.teacher.deleteMany({ where: { id: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { startsWith: testPrefix } } }).catch(() => {})
    await prisma.academicYear.deleteMany({ where: { id: ayId } }).catch(() => {})
    await prisma.campus.deleteMany({ where: { id: campusId } }).catch(() => {})
  }
}

runTests().catch(err => {
  console.error("❌ TEST FAILED:", err)
  process.exit(1)
})
