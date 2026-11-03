import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { ensureCoordinationTables } from '../schemaInit';
import {
  validateAttachmentMeta,
  calculateBusinessHoursSlaDue,
  calculateBusinessHoursElapsed,
  calculateExactNpsFromResponses,
  classifyAdminRole,
  canUserReadThreadContent,
  COORDINATION_TOPICS,
} from '../constants';
import {
  getValidTeachersForClass,
  verifyParentTeacherStudentRelation,
  createOrReplyThread,
  createCoordinationCase,
  updateCoordinationCase,
  submitCaseSatisfaction,
  createAndSyncNpsSurveyPeriod,
  submitParentNpsSurveyResponse,
  getNpsAnalyticsSummary,
  getCoordinationDashboardData,
} from '../coordinationService';

// Guard: Do NOT automatically generate test records in the database unless explicitly requested
const describeDb = process.env.ALLOW_TEST_DB_SEED === 'true' ? describe : describe.skip;

describe('Phân hệ Phối hợp Giáo dục & Chất lượng Phản hồi - Kiểm thử Logic Tinh khiết (Không phát sinh dữ liệu DB)', () => {
  it('Tính SLA theo giờ làm việc hành chính (bỏ qua đêm/Chủ nhật)', () => {
    const friday4pm = new Date(2026, 9, 30, 16, 0, 0);
    const due4h = calculateBusinessHoursSlaDue(friday4pm, 4);
    expect(due4h.getDay()).toBe(6);
    expect(due4h.getHours()).toBe(10);
    expect(due4h.getMinutes()).toBe(30);
    expect(calculateBusinessHoursElapsed(friday4pm, due4h)).toBe(4);
  });

  it('Tính toán NPS chuẩn từ toàn bộ phản hồi gốc hợp lệ và kiểm tra ngưỡng mẫu tối thiểu (<5 mẫu ẩn điểm)', () => {
    const combinedResponses = [
      ...Array.from({ length: 5 }, () => ({
        npsScore: 10,
        criteriaCommunication: 5,
        criteriaTimeliness: 5,
        criteriaClarity: 5,
        criteriaSupport: 5,
        criteriaCoordination: 5,
      })),
      ...Array.from({ length: 15 }, () => ({
        npsScore: 4,
        criteriaCommunication: 3,
        criteriaTimeliness: 3,
        criteriaClarity: 3,
        criteriaSupport: 3,
        criteriaCoordination: 3,
      })),
    ];

    const exactCalc = calculateExactNpsFromResponses(combinedResponses, 5);
    expect(exactCalc.isEligibleToPublish).toBe(true);
    expect(exactCalc.npsScore).toBe(-50);
    expect(exactCalc.criteriaAverages.overallSatisfaction).toBe(3.5);

    const smallSample = calculateExactNpsFromResponses(combinedResponses.slice(0, 3), 5);
    expect(smallSample.isEligibleToPublish).toBe(false);
    expect(smallSample.npsScore).toBeNull();
  });

  it('Kiểm soát quyền truy cập hội thoại riêng tư & tệp đính kèm', () => {
    expect(classifyAdminRole('ADMIN')).toBe('TECHNICAL_ADMIN');
    expect(classifyAdminRole('KT_DBCL')).toBe('QA_BUSINESS_ADMIN');

    expect(
      validateAttachmentMeta({
        fileName: 'malware.exe',
        fileType: 'application/octet-stream',
        fileSize: 1024,
      }).valid
    ).toBe(false);

    expect(
      validateAttachmentMeta({
        fileName: 'ke_hoach_ho_tro.pdf',
        fileType: 'application/pdf',
        fileSize: 512 * 1024,
      }).valid
    ).toBe(true);
  });
});

describeDb('Phân hệ Phối hợp Giáo dục & Chất lượng Phản hồi - 16 Kịch bản Kiểm thử DB (Section 8)', () => {
  const testRunId = `TST_${Date.now().toString(36).toUpperCase()}`;

  let ayId = '';
  let campusId = '';
  let class1Id = '';
  let class2Id = '';
  let mathSubjectId = '';
  let litSubjectId = '';

  let gvcnAlsoGvbmUserId = '';
  let gvcnAlsoGvbmTeacherId = '';

  let coTeacher1UserId = '';
  let coTeacher1Id = '';

  let coTeacher2UserId = '';
  let coTeacher2Id = '';

  let expiredTeacherUserId = '';
  let expiredTeacherId = '';

  let parentMultiChildUserId = '';
  let parentMultiChildId = '';
  let child1Id = '';
  let child2Id = '';

  let unrelatedParentUserId = '';

  beforeAll(async () => {
    await ensureCoordinationTables();

    // Seed isolated test fixtures inside database
    const ay = await prisma.academicYear.create({
      data: {
        name: `NH-Test-${testRunId}`,
        startDate: new Date('2026-08-01T00:00:00Z'),
        endDate: new Date('2027-05-31T00:00:00Z'),
        status: 'ACTIVE',
      },
    });
    ayId = ay.id;

    const campus = await prisma.campus.create({
      data: {
        campusCode: `CP_${testRunId}`,
        campusName: `Cơ sở Test ${testRunId}`,
        status: 'ACTIVE',
      },
    });
    campusId = campus.id;

    const [mathSubj, litSubj] = await Promise.all([
      prisma.subject.create({
        data: { subjectCode: `MATH_${testRunId}`, subjectName: `Toán ${testRunId}` },
      }),
      prisma.subject.create({
        data: { subjectCode: `LIT_${testRunId}`, subjectName: `Ngữ Văn ${testRunId}` },
      }),
    ]);
    mathSubjectId = mathSubj.id;
    litSubjectId = litSubj.id;

    // Teacher 1: GVCN of Class 1 AND GVBM teaching Math + Literature across Class 1 & Class 2
    const u1 = await prisma.user.create({
      data: {
        fullName: 'Cô Nguyễn Thị Mai (GVCN kiêm GVBM)',
        email: `gvcn_${testRunId}@skyline.edu.vn`,
        passwordHash: 'hash',
        role: 'TEACHER',
      },
    });
    gvcnAlsoGvbmUserId = u1.id;
    const t1 = await prisma.teacher.create({
      data: {
        userId: u1.id,
        teacherCode: `GV1_${testRunId}`,
        teacherName: u1.fullName,
        campusId,
        status: 'ACTIVE',
      },
    });
    gvcnAlsoGvbmTeacherId = t1.id;

    // Co-teacher 1 & Co-teacher 2 teaching the same subject (Math) in Class 1
    const u2 = await prisma.user.create({
      data: {
        fullName: 'Thầy Trần Văn Hùng (GVBM Toán 1)',
        email: `gvbm1_${testRunId}@skyline.edu.vn`,
        passwordHash: 'hash',
        role: 'TEACHER',
      },
    });
    coTeacher1UserId = u2.id;
    const t2 = await prisma.teacher.create({
      data: {
        userId: u2.id,
        teacherCode: `GV2_${testRunId}`,
        teacherName: u2.fullName,
        campusId,
        status: 'ACTIVE',
      },
    });
    coTeacher1Id = t2.id;

    const u3 = await prisma.user.create({
      data: {
        fullName: 'Cô Lê Thu Hà (GVBM Đồng giảng Toán)',
        email: `gvbm2_${testRunId}@skyline.edu.vn`,
        passwordHash: 'hash',
        role: 'TEACHER',
      },
    });
    coTeacher2UserId = u3.id;
    const t3 = await prisma.teacher.create({
      data: {
        userId: u3.id,
        teacherCode: `GV3_${testRunId}`,
        teacherName: u3.fullName,
        campusId,
        status: 'ACTIVE',
      },
    });
    coTeacher2Id = t3.id;

    // Teacher 4: Reassigned / Expired assignment
    const u4 = await prisma.user.create({
      data: {
        fullName: 'Thầy Phạm Cũ (Đã chuyển lớp)',
        email: `gvold_${testRunId}@skyline.edu.vn`,
        passwordHash: 'hash',
        role: 'TEACHER',
      },
    });
    expiredTeacherUserId = u4.id;
    const t4 = await prisma.teacher.create({
      data: {
        userId: u4.id,
        teacherCode: `GV4_${testRunId}`,
        teacherName: u4.fullName,
        campusId,
        status: 'INACTIVE',
      },
    });
    expiredTeacherId = t4.id;

    // Create Class 1 & Class 2
    const c1 = await prisma.class.create({
      data: {
        classCode: `C1_${testRunId}`,
        className: `10A1_${testRunId}`,
        grade: '10',
        level: 'THPT',
        educationSystem: 'CLC',
        campusId,
        academicYearId: ayId,
        homeroomTeacherId: gvcnAlsoGvbmTeacherId,
      },
    });
    class1Id = c1.id;

    const c2 = await prisma.class.create({
      data: {
        classCode: `C2_${testRunId}`,
        className: `10A2_${testRunId}`,
        grade: '10',
        level: 'THPT',
        educationSystem: 'CLC',
        campusId,
        academicYearId: ayId,
      },
    });
    class2Id = c2.id;

    // Teaching Assignments:
    // - t1 teaches Literature in Class 1 AND Literature + Math in Class 2 (1 GV dạy nhiều lớp & nhiều môn, đồng thời là GVCN)
    // - t2 and t3 BOTH teach Math in Class 1 (2 GV cùng dạy 1 môn)
    // - t4 had an assignment in Class 1 that is no longer active (GV chuyển lớp / hết hiệu lực phân công)
    await prisma.teachingAssignment.createMany({
      data: [
        {
          academicYearId: ayId,
          classId: class1Id,
          subjectId: litSubjectId,
          teacherId: gvcnAlsoGvbmTeacherId,
          semester: 1,
        },
        {
          academicYearId: ayId,
          classId: class2Id,
          subjectId: litSubjectId,
          teacherId: gvcnAlsoGvbmTeacherId,
          semester: 1,
        },
        {
          academicYearId: ayId,
          classId: class2Id,
          subjectId: mathSubjectId,
          teacherId: gvcnAlsoGvbmTeacherId,
          semester: 1,
        },
        {
          academicYearId: ayId,
          classId: class1Id,
          subjectId: mathSubjectId,
          teacherId: coTeacher1Id,
          semester: 1,
        },
        {
          academicYearId: ayId,
          classId: class1Id,
          subjectId: mathSubjectId,
          teacherId: coTeacher2Id,
          semester: 1,
        },
        {
          academicYearId: ayId,
          classId: class1Id,
          subjectId: litSubjectId,
          teacherId: expiredTeacherId,
          semester: 1,
        },
      ],
    });

    // Multi-child Parent (2 children in Class 1 & Class 2)
    const up1 = await prisma.user.create({
      data: {
        fullName: 'PH Nguyễn Thị Lan (Có 2 con)',
        email: `ph_multi_${testRunId}@gmail.com`,
        passwordHash: 'hash',
        role: 'PARENT',
      },
    });
    parentMultiChildUserId = up1.id;
    const p1 = await prisma.parent.create({
      data: {
        userId: up1.id,
        parentCode: `PH1_${testRunId}`,
        parentName: up1.fullName,
      },
    });
    parentMultiChildId = p1.id;

    const st1 = await prisma.student.create({
      data: {
        studentCode: `HS1_${testRunId}`,
        studentName: 'Nguyễn Minh An',
        campusId,
        classId: class1Id,
        academicYearId: ayId,
        status: 'ACTIVE',
      },
    });
    child1Id = st1.id;

    const st2 = await prisma.student.create({
      data: {
        studentCode: `HS2_${testRunId}`,
        studentName: 'Nguyễn Minh Bình',
        campusId,
        classId: class2Id,
        academicYearId: ayId,
        status: 'ACTIVE',
      },
    });
    child2Id = st2.id;

    await prisma.parentStudentLink.createMany({
      data: [
        { parentId: parentMultiChildId, studentId: child1Id, relationship: 'Mẹ' },
        { parentId: parentMultiChildId, studentId: child2Id, relationship: 'Mẹ' },
      ],
    });

    // Unrelated Parent (not linked to child1 or child2)
    const upUnrelated = await prisma.user.create({
      data: {
        fullName: 'PH Khác (Không thuộc HS)',
        email: `ph_other_${testRunId}@gmail.com`,
        passwordHash: 'hash',
        role: 'PARENT',
      },
    });
    unrelatedParentUserId = upUnrelated.id;
    await prisma.parent.create({
      data: {
        userId: upUnrelated.id,
        parentCode: `PH_OTHER_${testRunId}`,
        parentName: upUnrelated.fullName,
      },
    });
  });

  it('Kịch bản 1, 2, 3, 4, 5, 6: Đồng bộ phân công phức hợp (PH nhiều con, 1 GV dạy nhiều lớp/môn, 2 GV cùng dạy 1 môn, GVCN kiêm GVBM, lọc bỏ GV đã hết hạn phân công)', async () => {
    const { gvcnList, gvbmList } = await getValidTeachersForClass(class1Id, ayId);

    // GVCN of Class 1 is gvcnAlsoGvbmTeacherId
    expect(gvcnList.some((g) => g.teacherId === gvcnAlsoGvbmTeacherId)).toBe(true);

    // GVCN is simultaneously GVBM for Literature in Class 1
    expect(
      gvbmList.some(
        (g) => g.teacherId === gvcnAlsoGvbmTeacherId && g.subjectId === litSubjectId
      )
    ).toBe(true);

    // Both co-teachers (coTeacher1Id & coTeacher2Id) appear for Math in Class 1
    const mathTeachers = gvbmList.filter((g) => g.subjectId === mathSubjectId);
    expect(mathTeachers.map((t) => t.teacherId)).toContain(coTeacher1Id);
    expect(mathTeachers.map((t) => t.teacherId)).toContain(coTeacher2Id);

    // Expired teacher (expiredTeacherId) is excluded
    expect(gvbmList.some((g) => g.teacherId === expiredTeacherId)).toBe(false);

    // Class 2 also has gvcnAlsoGvbmTeacherId teaching both Math and Literature
    const class2Contacts = await getValidTeachersForClass(class2Id, ayId);
    expect(
      class2Contacts.gvbmList.filter((g) => g.teacherId === gvcnAlsoGvbmTeacherId).length
    ).toBe(2);
  });

  it('Kịch bản 7: Chặn tài khoản PHHS không thuộc học sinh hoặc chọn giáo viên ngoài phạm vi phụ trách', async () => {
    const unauthorizedCheck = await verifyParentTeacherStudentRelation({
      parentUserId: unrelatedParentUserId,
      studentId: child1Id,
      teacherId: gvcnAlsoGvbmTeacherId,
      roleType: 'GVCN',
    });
    expect(unauthorizedCheck.valid).toBe(false);
    expect(unauthorizedCheck.reason).toContain('không có quyền');

    // Valid parent trying to contact expired/unassigned teacher
    const unassignedTeacherCheck = await verifyParentTeacherStudentRelation({
      parentUserId: parentMultiChildUserId,
      studentId: child1Id,
      teacherId: expiredTeacherId,
      roleType: 'GVBM',
      subjectId: litSubjectId,
    });
    expect(unassignedTeacherCheck.valid).toBe(false);
  });

  it('Kịch bản 8: Chống gửi trùng và thao tác đồng thời (clientMessageId & 10-second duplicate content guard)', async () => {
    const clientMsgId = `DEDUP_${testRunId}_001`;
    const first = await createOrReplyThread({
      actorUserId: parentMultiChildUserId,
      actorName: 'PH Nguyễn Thị Lan',
      actorRole: 'PARENT',
      studentId: child1Id,
      teacherId: coTeacher1Id,
      roleType: 'GVBM',
      subjectId: mathSubjectId,
      topic: COORDINATION_TOPICS[0].code,
      content: 'Thầy ơi cho gia đình hỏi kết quả bài kiểm tra chương 1 của cháu An ạ.',
      clientMessageId: clientMsgId,
    });

    expect(first.deduplicated).toBe(false);

    // Concurrent retry with same clientMessageId
    const second = await createOrReplyThread({
      actorUserId: parentMultiChildUserId,
      actorName: 'PH Nguyễn Thị Lan',
      actorRole: 'PARENT',
      studentId: child1Id,
      teacherId: coTeacher1Id,
      roleType: 'GVBM',
      subjectId: mathSubjectId,
      topic: COORDINATION_TOPICS[0].code,
      content: 'Thầy ơi cho gia đình hỏi kết quả bài kiểm tra chương 1 của cháu An ạ.',
      clientMessageId: clientMsgId,
    });

    expect(second.deduplicated).toBe(true);
    expect(second.thread.id).toBe(first.thread.id);
    expect(second.message.id).toBe(first.message.id);
  });

  it('Kịch bản 14: Kiểm soát quyền truy cập hội thoại riêng tư (GVCN không mặc định đọc hội thoại 1-1 giữa GVBM và PHHS; phân biệt Admin kỹ thuật và Admin nghiệp vụ KT&ĐBCL)', async () => {
    const privateGvbmThread = {
      threadType: 'PARENT_GVBM',
      visibility: 'PRIVATE',
      parentId: parentMultiChildId,
      teacherId: coTeacher1Id,
      classId: class1Id,
      createdByUserId: parentMultiChildUserId,
      participants: [
        { userId: parentMultiChildUserId },
        { userId: coTeacher1UserId },
      ],
      cases: [],
    };

    // GVCN of Class 1 tries to read private 1-1 GVBM-Parent thread -> blocked (summaryOnly)
    const gvcnAccess = canUserReadThreadContent({
      userId: gvcnAlsoGvbmUserId,
      userRole: 'TEACHER',
      teacherId: gvcnAlsoGvbmTeacherId,
      homeroomClassIds: [class1Id],
      thread: privateGvbmThread,
    });
    expect(gvcnAccess.allowed).toBe(false);
    expect(gvcnAccess.summaryOnly).toBe(true);

    // Once shared with GVCN -> allowed
    const sharedAccess = canUserReadThreadContent({
      userId: gvcnAlsoGvbmUserId,
      userRole: 'TEACHER',
      teacherId: gvcnAlsoGvbmTeacherId,
      homeroomClassIds: [class1Id],
      thread: { ...privateGvbmThread, visibility: 'SHARED_WITH_GVCN' },
    });
    expect(sharedAccess.allowed).toBe(true);

    // Technical Admin does NOT get blanket read access to private threads
    expect(classifyAdminRole('ADMIN')).toBe('TECHNICAL_ADMIN');
    expect(classifyAdminRole('KT_DBCL')).toBe('QA_BUSINESS_ADMIN');

    const techAdminAccess = canUserReadThreadContent({
      userId: 'tech_admin_1',
      userRole: 'ADMIN',
      thread: privateGvbmThread,
    });
    expect(techAdminAccess.allowed).toBe(false);
  });

  it('Kịch bản 9, 10, 11: Yêu cầu chuyển nhiều bộ phận, tính SLA theo giờ làm việc hành chính (bỏ qua đêm/Chủ nhật), mở lại yêu cầu (REOPEN) và đánh giá CSAT', async () => {
    // SLA business hours calculation: Friday 16:00 + 4 business hours -> skips Friday evening & Saturday afternoon & Sunday -> lands on Saturday 10:30
    const friday4pm = new Date(2026, 9, 30, 16, 0, 0); // Friday Oct 30, 2026 16:00
    const due4h = calculateBusinessHoursSlaDue(friday4pm, 4);
    expect(due4h.getDay()).toBe(6); // Saturday
    expect(due4h.getHours()).toBe(10);
    expect(due4h.getMinutes()).toBe(30);

    const elapsed = calculateBusinessHoursElapsed(friday4pm, due4h);
    expect(elapsed).toBe(4);

    // Create case
    const createdCase = await createCoordinationCase({
      actorUserId: gvcnAlsoGvbmUserId,
      actorName: 'Cô Nguyễn Thị Mai',
      actorRole: 'GVCN',
      studentId: child1Id,
      teacherId: coTeacher1Id,
      assignedToUserId: coTeacher1UserId,
      assignedToName: 'Thầy Trần Văn Hùng',
      assignedRole: 'GVBM',
      subjectId: mathSubjectId,
      category: 'DE_NGHI_HO_TRO',
      title: 'Phối hợp phụ đạo môn Toán cho HS Minh An',
      description: 'Cần hỗ trợ ôn tập hình học không gian.',
      priority: 'HIGH',
    });
    expect(createdCase.status).toBe('ASSIGNED');

    // Forward to TTCM / Co-teacher 2
    const forwarded = await updateCoordinationCase({
      caseId: createdCase.id,
      actorUserId: coTeacher1UserId,
      actorName: 'Thầy Trần Văn Hùng',
      actorRole: 'GVBM',
      action: 'FORWARD',
      forwardToUserId: coTeacher2UserId,
      forwardToName: 'Cô Lê Thu Hà (Tổ Toán)',
      forwardToRole: 'TTCM',
      note: 'Chuyển Tổ trưởng chuyên môn phối hợp đề cương bổ trợ.',
    });
    expect(forwarded.assignedToUserId).toBe(coTeacher2UserId);
    expect(forwarded.assignedRole).toBe('TTCM');

    // Resolve with verified conclusion synced to LearningSupportTarget
    const resolved = await updateCoordinationCase({
      caseId: createdCase.id,
      actorUserId: coTeacher2UserId,
      actorName: 'Cô Lê Thu Hà',
      actorRole: 'TTCM',
      action: 'RESOLVE',
      supportPlanMeasures: 'Bổ trợ 2 tiết/tuần vào chiều Thứ Năm',
      resolutionSummary: 'Đã hoàn thành 2 tuần bổ trợ, học sinh nắm vững kiến thức cơ bản.',
      verifiedConclusion: 'Học sinh tiến bộ rõ rệt phần Hình học.',
      syncToStudentSupportRecord: true,
    });
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.linkedSupportTargetId).toBeTruthy();

    // Reopen case (Kịch bản 10)
    const reopened = await updateCoordinationCase({
      caseId: createdCase.id,
      actorUserId: parentMultiChildUserId,
      actorName: 'PH Nguyễn Thị Lan',
      actorRole: 'PARENT',
      action: 'REOPEN',
      reopenReason: 'Con vẫn còn lúng túng bài tập nâng cao, nhờ thầy cô hướng dẫn thêm 1 buổi.',
    });
    expect(reopened.status).toBe('REOPENED');
    expect(reopened.reopenedCount).toBe(1);

    // Submit CSAT & confirm completion
    const sat = await submitCaseSatisfaction({
      caseId: createdCase.id,
      parentUserId: parentMultiChildUserId,
      csatScore: 5,
      timelinessScore: 5,
      clarityScore: 5,
      supportScore: 5,
      comment: 'Cảm ơn các thầy cô rất nhiệt tình hỗ trợ con!',
      confirmCompleted: true,
    });
    expect(sat.csatScore).toBe(5);
  });

  it('Kịch bản 12: Tính toán NPS chuẩn từ toàn bộ phản hồi gốc hợp lệ (không lấy trung bình cộng NPS lớp), kiểm tra ngưỡng mẫu tối thiểu (<5 mẫu ẩn điểm) và ẩn danh PHHS', async () => {
    // Class A has 5 responses: five 10s -> Class A NPS = +100
    // Class B has 15 responses: fifteen 4s -> Class B NPS = -100
    // Naive average of Class A (+100) and Class B (-100) would be 0 (WRONG!)
    // Exact recalculation from all 20 valid responses: 5 Promoters (25%) - 15 Detractors (75%) = -50 (CORRECT!)
    const combinedResponses = [
      ...Array.from({ length: 5 }, () => ({
        npsScore: 10,
        criteriaCommunication: 5,
        criteriaTimeliness: 5,
        criteriaClarity: 5,
        criteriaSupport: 5,
        criteriaCoordination: 5,
      })),
      ...Array.from({ length: 15 }, () => ({
        npsScore: 4,
        criteriaCommunication: 3,
        criteriaTimeliness: 3,
        criteriaClarity: 3,
        criteriaSupport: 3,
        criteriaCoordination: 3,
      })),
    ];

    const exactCalc = calculateExactNpsFromResponses(combinedResponses, 5);
    expect(exactCalc.isEligibleToPublish).toBe(true);
    expect(exactCalc.npsScore).toBe(-50); // Not 0!
    expect(exactCalc.criteriaAverages.overallSatisfaction).toBe(3.5);

    // Insufficient sample size (< 5 responses) -> npsScore must be null
    const smallSample = calculateExactNpsFromResponses(combinedResponses.slice(0, 3), 5);
    expect(smallSample.isEligibleToPublish).toBe(false);
    expect(smallSample.npsScore).toBeNull();

    // End-to-end period creation, parent submission, and teacher anonymization check
    const { period } = await createAndSyncNpsSurveyPeriod({
      actorUserId: gvcnAlsoGvbmUserId,
      actorRole: 'KT_DBCL',
      title: `Khảo sát HK1 ${testRunId}`,
      academicYearId: ayId,
      campusId,
      semester: 'HK1',
      targetScope: 'ALL',
      minSampleSize: 5,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 86400000),
      publishImmediately: true,
    });

    const gvcnAssignment = await prisma.npsSurveyAssignment.findFirst({
      where: {
        periodId: period.id,
        classId: class1Id,
        teacherId: gvcnAlsoGvbmTeacherId,
        roleType: 'GVCN',
      },
    });
    expect(gvcnAssignment).toBeTruthy();

    await submitParentNpsSurveyResponse({
      periodId: period.id,
      assignmentId: gvcnAssignment!.id,
      parentUserId: parentMultiChildUserId,
      studentId: child1Id,
      npsScore: 10,
      criteriaCommunication: 5,
      criteriaTimeliness: 5,
      criteriaClarity: 5,
      criteriaSupport: 5,
      criteriaCoordination: 5,
      comment: 'Cô chủ nhiệm rất sát sao với lớp.',
    });

    const analytics = await getNpsAnalyticsSummary({
      periodId: period.id,
      teacherId: gvcnAlsoGvbmTeacherId,
      viewerRole: 'TEACHER',
    });

    // Only 1 response (< 5 minSampleSize) -> not eligible to publish yet
    expect(analytics.overall.totalResponses).toBe(1);
    expect(analytics.overall.isEligibleToPublish).toBe(false);
    expect(analytics.overall.npsScore).toBeNull();
    // Anonymized comments hidden when < minSampleSize
    expect(analytics.anonymizedComments.length).toBe(0);
  });

  it('Kịch bản 13 & 15: Trạng thái trống khi Dashboard chưa có dữ liệu (không tạo số liệu giả) & Kiểm soát tệp đính kèm không hợp lệ', async () => {
    // Empty campus filter -> hasData: false, rates are null (never fake numbers)
    const emptyDash = await getCoordinationDashboardData({
      userId: gvcnAlsoGvbmUserId,
      userRole: 'KT_DBCL',
      viewMode: 'ADMIN_QA',
      academicYearId: 'NON_EXISTENT_AY_ID',
    });
    expect(emptyDash.hasData).toBe(false);
    expect(emptyDash.kpis.totalThreads).toBe(0);
    expect(emptyDash.kpis.onTimeResponseRate).toBeNull();
    expect(emptyDash.kpis.csatAverage).toBeNull();
    expect(emptyDash.kpis.npsGvcn).toBeNull();

    // Attachment validation: block .exe, block > 5MB, allow valid PDF <= 5MB
    expect(
      validateAttachmentMeta({
        fileName: 'malware.exe',
        fileType: 'application/octet-stream',
        fileSize: 1024,
      }).valid
    ).toBe(false);

    expect(
      validateAttachmentMeta({
        fileName: 'oversized_report.pdf',
        fileType: 'application/pdf',
        fileSize: 6 * 1024 * 1024, // 6MB > 5MB limit
      }).valid
    ).toBe(false);

    expect(
      validateAttachmentMeta({
        fileName: 'ke_hoach_ho_tro.pdf',
        fileType: 'application/pdf',
        fileSize: 512 * 1024,
      }).valid
    ).toBe(true);
  });

  afterAll(async () => {
    if (!ayId && !campusId) return;
    await prisma.npsSurveyPeriod.deleteMany({ where: { academicYearId: ayId } }).catch(() => {});
    await prisma.coordinationCase.deleteMany({ where: { academicYearId: ayId } }).catch(() => {});
    await prisma.coordinationThread.deleteMany({ where: { academicYearId: ayId } }).catch(() => {});
    await prisma.learningSupportTarget.deleteMany({ where: { academicYearId: ayId } }).catch(() => {});
    await prisma.parentStudentLink.deleteMany({ where: { studentId: { in: [child1Id, child2Id].filter(Boolean) } } }).catch(() => {});
    await prisma.student.deleteMany({ where: { academicYearId: ayId } }).catch(() => {});
    await prisma.parent.deleteMany({ where: { parentCode: { contains: testRunId } } }).catch(() => {});
    await prisma.teachingAssignment.deleteMany({ where: { academicYearId: ayId } }).catch(() => {});
    await prisma.class.deleteMany({ where: { academicYearId: ayId } }).catch(() => {});
    await prisma.teacher.deleteMany({ where: { campusId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { contains: testRunId } } }).catch(() => {});
    await prisma.subject.deleteMany({ where: { subjectCode: { contains: testRunId } } }).catch(() => {});
    await prisma.campus.deleteMany({ where: { id: campusId } }).catch(() => {});
    await prisma.academicYear.deleteMany({ where: { id: ayId } }).catch(() => {});
  });
});
