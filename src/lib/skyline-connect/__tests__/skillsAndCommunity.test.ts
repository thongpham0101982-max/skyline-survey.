import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";

// Strictly mock @/lib/db and schema-init so NO test ever touches local.db / dev.db / Turso (GEMINI.md Rule #1)
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    academicYear: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    teacher: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    class: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    subject: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    specialSubject: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    specialTopic: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    teachingAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    ctqtTeachingAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    specialTeachingAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    teacherClassAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    student: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    subjectGradeEntry: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    subjectBenchmarkConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    studentCompetencyAssessment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ctqtGradeEntry: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    testingCandidateResult: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    specialGradeEntry: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    learningSupportTarget: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    academicConsultationLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    specialLesson: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    slcSkillEvidenceBrief: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    slcSkill: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    slcSkillVersion: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    slcSkillRun: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    slcSavedItem: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    slcAppliedConfirmation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    slcPost: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    slcAuditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit_1" }),
    },
  } as any,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/skyline-connect/schema-init", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../schema-init")>();
  return {
    ...actual,
    ensureSlcSchema: vi.fn().mockResolvedValue(undefined),
    getSlcDb: vi.fn(() => mockPrisma),
  };
});

import {
  validateArchiveEntryPath,
  inspectAndValidateSkillPackage,
  detectAndRedactStudentPii,
} from "../security";
import { canViewSkill, canReviewSkill, SlcUserContext } from "../permissions";
import { computeDiscussionHotScore } from "../scoring";
import {
  verifyTeacherClassSubjectAccess,
  getTeacherAuthorizedScopeCatalog,
  reviewScopeDataAndBuildEvidenceBrief,
} from "../ssm-skill-data-engine";
import {
  getSlcSkillDetail,
  createOrUpdateSlcSkill,
  executeSlcSkillRun,
  buildSafeSkillDownloadPackage,
} from "../skills-service";

const teacherA: SlcUserContext = {
  userId: "user_teacher_a",
  teacherId: "teacher_a",
  fullName: "Nguyễn Thị Lan (GV Toán CS1)",
  email: "lan@skyline.edu.vn",
  systemRole: "TEACHER",
  campusId: "campus_1",
  campusName: "Sky-Line Riverside",
  campusIds: ["campus_1"],
  departmentId: "dept_math",
  departmentName: "Tổ Toán - Tin",
  mainSubjectCode: "TOAN",
  mainSubjectName: "Toán",
  isDepartmentHead: false,
  isKtdbclOfficer: false,
  approvedGroupIds: [],
  ownedGroupIds: [],
  moderatedGroupIds: [],
  roleAssignments: [],
};

const teacherB: SlcUserContext = {
  userId: "user_teacher_b",
  teacherId: "teacher_b",
  fullName: "Trần Minh Tuấn (GV Ngữ văn CS2)",
  email: "tuan@skyline.edu.vn",
  systemRole: "TEACHER",
  campusId: "campus_2",
  campusName: "Sky-Line Hill",
  campusIds: ["campus_2"],
  departmentId: "dept_lit",
  departmentName: "Tổ Ngữ văn",
  mainSubjectCode: "NGU_VAN",
  mainSubjectName: "Ngữ văn",
  isDepartmentHead: false,
  isKtdbclOfficer: false,
  approvedGroupIds: [],
  ownedGroupIds: [],
  moderatedGroupIds: [],
  roleAssignments: [],
};

const hodReviewer: SlcUserContext = {
  ...teacherA,
  userId: "user_hod_math",
  teacherId: "hod_math",
  fullName: "Lê Hoàng Nam (TTCM Tổ Toán)",
  isDepartmentHead: true,
};

describe("Cộng đồng sáng tạo & Skills môn học — 9 Kịch bản Nghiệm thu (Phần XII)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Giáo viên truy cập dữ liệu lớp hoặc cơ sở không được phân công
  it("1. Chặn giáo viên truy cập dữ liệu lớp hoặc cơ sở không thuộc phân công giảng dạy", async () => {
    mockPrisma.class.findUnique.mockResolvedValue({
      id: "class_8a1_cs1",
      className: "8A1",
      grade: 8,
      level: "THCS",
      campusId: "campus_1",
      academicYearId: "ay_2025",
      homeroomTeacherId: "teacher_a",
    });
    mockPrisma.teachingAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.ctqtTeachingAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.specialTeachingAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.teacherClassAssignment.findFirst.mockResolvedValue(null);

    // Teacher B (at Campus 2, not assigned to class_8a1_cs1) tries to access class_8a1_cs1
    const accessB = await verifyTeacherClassSubjectAccess(teacherB, {
      classId: "class_8a1_cs1",
      subjectCode: "TOAN",
    });
    expect(accessB.allowed).toBe(false);
    expect(accessB.reason).toContain("PERMISSION_DENIED");

    // Teacher A (assigned homeroom of class_8a1_cs1) is allowed
    const accessA = await verifyTeacherClassSubjectAccess(teacherA, {
      classId: "class_8a1_cs1",
      subjectCode: "TOAN",
    });
    expect(accessA.allowed).toBe(true);

    // Verify getTeacherAuthorizedScopeCatalog returns flat `assignments`, `dataSources` & auto-picks year with assignments
    mockPrisma.academicYear.findMany.mockResolvedValue([
      { id: "ay_2026", name: "2026 - 2027", status: "UPCOMING", startDate: new Date("2026-08-01") },
      { id: "ay_2025", name: "2025 - 2026", status: "ACTIVE", startDate: new Date("2025-08-01") },
    ]);
    mockPrisma.teachingAssignment.findMany.mockResolvedValue([
      {
        id: "ta_1",
        teacherId: "teacher_a",
        classId: "class_8a1_cs1",
        subjectId: "sub_math",
        academicYearId: "ay_2025",
        class: { id: "class_8a1_cs1", className: "8A1", grade: 8, campusId: "campus_1", academicYearId: "ay_2025" },
        subject: { id: "sub_math", subjectCode: "TOAN", subjectName: "Toán", category: "MOET" },
      },
    ]);
    const scopeCatalog = await getTeacherAuthorizedScopeCatalog(teacherA);
    expect(scopeCatalog.selectedAcademicYearId).toBe("ay_2025");
    expect(scopeCatalog.assignments.length).toBeGreaterThan(0);
    expect(scopeCatalog.assignments[0]).toMatchObject({
      classId: "class_8a1_cs1",
      className: "8A1",
      subjectCode: "TOAN",
      subjectName: "Toán",
    });
    expect(scopeCatalog.dataSources.length).toBe(6);
  });

  // 2. Tải file hoặc skill qua đường dẫn trực tiếp khi không đủ quyền
  it("2. Chặn xem chi tiết hoặc tải gói Skill qua đường dẫn trực tiếp khi không đủ quyền phạm vi", async () => {
    const deptOnlySkill = {
      id: "skill_dept_math_1",
      authorId: teacherA.userId,
      status: "PUBLISHED",
      visibility: "DEPARTMENT",
      campusId: "campus_1",
      departmentId: "dept_math",
      groupId: null,
      subjectCode: "TOAN",
      collaboratorsJson: "[]",
    };

    expect(
      canViewSkill(teacherB, {
        id: deptOnlySkill.id,
        authorId: deptOnlySkill.authorId,
        status: deptOnlySkill.status,
        visibility: deptOnlySkill.visibility,
        campusId: deptOnlySkill.campusId,
        departmentId: deptOnlySkill.departmentId,
        subjectCode: deptOnlySkill.subjectCode,
      })
    ).toBe(false);

    mockPrisma.slcSkill.findUnique.mockResolvedValue(deptOnlySkill);
    await expect(getSlcSkillDetail(teacherB, deptOnlySkill.id)).rejects.toThrow(
      /PERMISSION_DENIED/
    );
    await expect(buildSafeSkillDownloadPackage(teacherB, deptOnlySkill.id)).rejects.toThrow(
      /PERMISSION_DENIED/
    );
  });

  // 3. Dữ liệu thiếu, dữ liệu cũ, hoặc chỉ có điểm tổng hợp
  it("3. Không biến dữ liệu thiếu (null) thành điểm 0, cảnh báo dữ liệu cũ và không suy diễn lỗi kiến thức chỉ từ điểm tổng", async () => {
    mockPrisma.class.findUnique.mockResolvedValue({
      id: "class_8a1",
      className: "8A1",
      grade: 8,
      level: "THCS",
      campusId: "campus_1",
      academicYearId: "ay_2025",
      homeroomTeacherId: "teacher_a",
    });
    mockPrisma.subject.findFirst.mockResolvedValue({
      id: "sub_math",
      subjectCode: "TOAN",
      subjectName: "Toán",
    });
    mockPrisma.student.findMany.mockResolvedValue([
      { id: "stu_1" },
      { id: "stu_2" },
      { id: "stu_3" },
    ]);

    // 2 students have valid composite scores (8.0 and 6.0), 1 student has null (missing score)
    // Stale timestamp (90 days ago)
    const staleDate = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
      { id: "ge_1", studentId: "stu_1", evaluationPeriod: "HK1", compositeScore: 8.0, remark: null, updatedAt: staleDate },
      { id: "ge_2", studentId: "stu_2", evaluationPeriod: "HK1", compositeScore: 6.0, remark: null, updatedAt: staleDate },
      { id: "ge_3", studentId: "stu_3", evaluationPeriod: "HK1", compositeScore: null, remark: null, updatedAt: staleDate },
    ]);
    mockPrisma.subjectBenchmarkConfig.findFirst.mockResolvedValue(null);
    mockPrisma.studentCompetencyAssessment.findMany.mockResolvedValue([]);
    mockPrisma.ctqtGradeEntry.findMany.mockResolvedValue([]);
    mockPrisma.testingCandidateResult.findMany.mockResolvedValue([]);
    mockPrisma.specialGradeEntry.findMany.mockResolvedValue([]);
    mockPrisma.learningSupportTarget.findMany.mockResolvedValue([]);
    mockPrisma.academicConsultationLog.findMany.mockResolvedValue([]);
    mockPrisma.specialLesson.findMany.mockResolvedValue([]);
    mockPrisma.slcSkillEvidenceBrief.create.mockResolvedValue({ id: "brief_test_1" });

    const brief = await reviewScopeDataAndBuildEvidenceBrief(teacherA, {
      academicYearId: "ay_2025",
      classId: "class_8a1",
      subjectCode: "TOAN",
      subjectName: "Toán",
      evaluationPeriod: "HK1",
    });

    // Mean of [8.0, 6.0] MUST be 7.0 (NOT (8+6+0)/3 = 4.67!)
    expect(brief.deterministicMetrics.scoreDistribution.averageScore).toBe(7);
    expect(brief.deterministicMetrics.scoreDistribution.missingCount).toBe(1);
    expect(brief.dataQualityAudit.missingScoreCount).toBe(1);
    expect(brief.dataQualityAudit.isStaleData).toBe(true);

    // Guardrail: Only composite scores exist -> specificKnowledgeErrorsAllowed MUST be false
    expect(brief.dataQualityAudit.specificKnowledgeErrorsAllowed).toBe(false);
    expect(brief.dataQualityAudit.guardrailNotice).toContain("CHỈ CÓ ĐIỂM TỔNG HỢP");
  });

  // 4. Gửi lặp thao tác chạy thử, like, lưu hoặc gửi duyệt + dự phòng khi chưa cấu hình AI
  it("4. Chặn gửi trùng lần chạy thử AI qua clientRequestId (Idempotency) và xử lý an toàn khi chưa có khóa AI", async () => {
    const existingCompletedRun = {
      id: "run_existing_1",
      skillId: "skill_1",
      skillVersion: "1.0",
      status: "COMPLETED",
      outputText: "Kết quả đã tạo trước đó",
    };
    mockPrisma.slcSkillRun.findUnique.mockResolvedValue(existingCompletedRun);

    const dedupRes = await executeSlcSkillRun(teacherA, {
      skillId: "skill_1",
      clientRequestId: "req_unique_123",
      inputValues: { lessonTopic: "Phân số" },
    });
    expect(dedupRes.deduplicated).toBe(true);
    expect(dedupRes.run.id).toBe("run_existing_1");
    expect(mockPrisma.slcSkillRun.create).not.toHaveBeenCalled();

    // When GEMINI_API_KEY is absent, sandbox preview executes cleanly without leaking keys or crashing
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      mockPrisma.slcSkillRun.findUnique.mockResolvedValue(null);
      mockPrisma.slcSkill.findUnique.mockResolvedValue({
        id: "skill_1",
        name: "Skill Thiết kế khởi động Toán 8",
        authorId: teacherA.userId,
        authorName: teacherA.fullName,
        status: "PUBLISHED",
        visibility: "SYSTEM",
        campusId: "campus_1",
        departmentId: "dept_math",
        subjectCode: "TOAN",
        subjectName: "Toán",
        collaboratorsJson: "[]",
        aiSystemPrompt: "Thiết kế hoạt động bài {{lessonTopic}}",
        outputStructure: "3 bước khởi động",
        currentVersion: "1.0",
      });
      mockPrisma.slcSkill.update.mockResolvedValue({});
      mockPrisma.slcSkillRun.create.mockImplementation(async ({ data }: any) => ({
        id: "run_sandbox_1",
        ...data,
      }));

      const fallbackRes = await executeSlcSkillRun(teacherA, {
        skillId: "skill_1",
        clientRequestId: "req_unique_456",
        inputValues: { lessonTopic: "Định lý Thalès" },
      });
      expect(fallbackRes.aiConfigured).toBe(false);
      expect(fallbackRes.run.status).toBe("COMPLETED");
      expect(fallbackRes.run.outputText).toContain("Định lý Thalès");
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    }
  });

  // 5. Sắp xếp "Đang thảo luận": suy giảm theo thời gian, chống tự tương tác, lặp & bỏ thích không cộng điểm
  it("5. Công thức 'Đang thảo luận' có suy giảm thời gian, chặn tự tương tác/spam lặp và bỏ thích tuyệt đối không tạo thêm điểm", () => {
    const nowMs = Date.now();
    const pubAt = new Date(nowMs - 2 * 3600_000);

    const baseScore = computeDiscussionHotScore({
      authorId: "author_1",
      publishedAt: pubAt,
      bumpEvents: [],
      nowMs,
    });

    // Self-interactions by post author must NOT increase score over baseScore
    const selfScore = computeDiscussionHotScore({
      authorId: "author_1",
      publishedAt: pubAt,
      bumpEvents: [
        { actorId: "author_1", sourceType: "REACTION", createdAt: new Date(nowMs - 600_000), isActive: true },
        { actorId: "author_1", sourceType: "COMMENT", createdAt: new Date(nowMs - 300_000), isActive: true },
      ],
      nowMs,
    });
    expect(selfScore).toBe(baseScore);

    // Peer likes post -> gets higher score; when peer unlikes (isActive: false), score drops back to baseScore (never adds points!)
    const likedScore = computeDiscussionHotScore({
      authorId: "author_1",
      publishedAt: pubAt,
      bumpEvents: [
        { actorId: "peer_1", sourceType: "REACTION", createdAt: new Date(nowMs - 600_000), isActive: true },
      ],
      nowMs,
    });
    const unlikedScore = computeDiscussionHotScore({
      authorId: "author_1",
      publishedAt: pubAt,
      bumpEvents: [
        { actorId: "peer_1", sourceType: "REACTION", createdAt: new Date(nowMs - 600_000), isActive: false },
      ],
      nowMs,
    });
    expect(likedScore).toBeGreaterThan(baseScore);
    expect(unlikedScore).toBe(baseScore);

    // Spam 10 comments from same peer_1 -> capped at max 2 counted events per user
    const spamEvents = Array.from({ length: 10 }, (_, i) => ({
      actorId: "peer_1",
      sourceType: "COMMENT" as const,
      createdAt: new Date(nowMs - i * 1000),
      isActive: true,
    }));
    const spamScore = computeDiscussionHotScore({
      authorId: "author_1",
      publishedAt: pubAt,
      bumpEvents: spamEvents,
      nowMs,
    });
    const twoEventsScore = computeDiscussionHotScore({
      authorId: "author_1",
      publishedAt: pubAt,
      bumpEvents: spamEvents.slice(0, 2),
      nowMs,
    });
    expect(spamScore).toBe(twoEventsScore);
  });

  // 6. Skill đang chờ duyệt hoặc cập nhật phiên bản: giữ bản đang phát hành hoạt động
  it("6. Khi cập nhật Skill đã phát hành, phiên bản đang phát hành (publishedVersionId) vẫn tiếp tục hoạt động cho đến khi bản mới được duyệt", async () => {
    const publishedSkill = {
      id: "skill_pub_1",
      code: "SKL-TOAN-001",
      name: "Skill Toán 8 — Bản đang phát hành v1.0",
      summary: "Mô tả v1.0",
      purpose: "Mục đích v1.0",
      workCategory: "ACTIVITY_DESIGN",
      authorId: teacherA.userId,
      authorName: teacherA.fullName,
      campusId: "campus_1",
      campusName: "Sky-Line Riverside",
      departmentId: "dept_math",
      departmentName: "Tổ Toán - Tin",
      subjectCode: "TOAN",
      subjectName: "Toán",
      gradeLevelsJson: '["K8"]',
      collaboratorsJson: "[]",
      aiSystemPrompt: "Instruction v1.0",
      currentVersion: "1.0",
      publishedVersionId: "ver_1_0",
      status: "PUBLISHED",
      visibility: "SYSTEM",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.slcSkill.findUnique.mockResolvedValue(publishedSkill);
    mockPrisma.slcSkillVersion.create.mockResolvedValue({
      id: "ver_1_1_pending",
      skillId: "skill_pub_1",
      version: "1.1",
      status: "PENDING_REVIEW",
    });
    mockPrisma.slcSkill.update.mockImplementation(async ({ data }: any) => ({
      ...publishedSkill,
      ...data,
    }));

    // Author updates published skill and submits v1.1 for review
    await createOrUpdateSlcSkill(teacherA, {
      id: "skill_pub_1",
      name: "Skill Toán 8 — Bản cập nhật v1.1",
      purpose: "Mục đích cải tiến v1.1",
      aiSystemPrompt: "Instruction v1.1 mới",
      targetStatus: "PENDING_REVIEW",
    });

    // Verify publishedVersionId="ver_1_0" is preserved so other teachers continue seeing & running v1.0!
    expect(mockPrisma.slcSkill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "skill_pub_1" },
        data: expect.objectContaining({
          currentVersion: "1.1",
          status: "PENDING_REVIEW",
          publishedVersionId: "ver_1_0",
        }),
      })
    );

    // Other teachers (Teacher B) can still view the skill because publishedVersionId is active
    expect(
      canViewSkill(teacherB, {
        id: "skill_pub_1",
        authorId: teacherA.userId,
        status: "PENDING_REVIEW",
        publishedVersionId: "ver_1_0",
        visibility: "SYSTEM",
      })
    ).toBe(true);

    // HOD Reviewer in dept_math has permission to review
    expect(
      canReviewSkill(hodReviewer, {
        id: "skill_pub_1",
        authorId: teacherA.userId,
        status: "PENDING_REVIEW",
        visibility: "SYSTEM",
        campusId: "campus_1",
        departmentId: "dept_math",
        subjectCode: "TOAN",
      }).allowed
    ).toBe(true);
  });

  // 7. Giáo viên B dùng skill do giáo viên A tạo: kiểm tra lại quyền GV B và không kế thừa dữ liệu lớp của GV A
  it("7. Giáo viên B chạy Skill của Giáo viên A: kiểm tra lại quyền của GV B và tuyệt đối không kế thừa dữ liệu học sinh của GV A", async () => {
    mockPrisma.slcSkillRun.findUnique.mockResolvedValue(null);
    mockPrisma.slcSkill.findUnique.mockResolvedValue({
      id: "skill_by_teacher_a",
      name: "Skill Phân hóa Toán 8",
      authorId: teacherA.userId,
      authorName: teacherA.fullName,
      status: "PUBLISHED",
      visibility: "SYSTEM",
      campusId: "campus_1",
      departmentId: "dept_math",
      subjectCode: "TOAN",
      subjectName: "Toán",
      gradeLevelsJson: '["K8"]',
      collaboratorsJson: "[]",
      evidenceBriefId: "brief_of_teacher_a_secret_class",
      aiSystemPrompt: "Thiết kế bài tập phân hóa 3 mức độ cho {{lessonTopic}}",
      outputStructure: "3 mức độ",
      principlesAndLimits: "Không chứa PII",
      currentVersion: "1.0",
    });

    // Teacher B tries to bind Teacher A's class (class_8a1_cs1) -> MUST BE REJECTED
    mockPrisma.class.findUnique.mockResolvedValue({
      id: "class_8a1_cs1",
      className: "8A1",
      grade: 8,
      level: "THCS",
      campusId: "campus_1",
      academicYearId: "ay_2025",
      homeroomTeacherId: "teacher_a",
    });
    mockPrisma.teachingAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.ctqtTeachingAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.specialTeachingAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.teacherClassAssignment.findFirst.mockResolvedValue(null);

    await expect(
      executeSlcSkillRun(teacherB, {
        skillId: "skill_by_teacher_a",
        inputValues: { lessonTopic: "Phương trình bậc nhất" },
        bindClassScope: {
          academicYearId: "ay_2025",
          classId: "class_8a1_cs1",
          subjectCode: "TOAN",
        },
      })
    ).rejects.toThrow(/PERMISSION_DENIED/);
  });

  // 8. Gói skill không hợp lệ hoặc chứa đường dẫn ngoài thư mục cho phép (Zip Slip / Script)
  it("8. Chặn gói Skill chứa đường dẫn leo thang (../) hoặc tệp script thực thi (.sh, .js, package.json có scripts)", async () => {
    expect(validateArchiveEntryPath("../../etc/passwd").valid).toBe(false);
    expect(validateArchiveEntryPath("/absolute/path.md").valid).toBe(false);
    expect(validateArchiveEntryPath("C:\\Windows\\system32\\cmd.exe").valid).toBe(false);
    expect(validateArchiveEntryPath("prompts/lesson_guide.md").valid).toBe(true);

    // Build a malicious zip with a script file
    const maliciousZip = new JSZip();
    maliciousZip.file("SKILL.md", "# Skill hợp lệ");
    maliciousZip.file("install.sh", "rm -rf /");
    const zipBuffer = await maliciousZip.generateAsync({ type: "nodebuffer" });

    const inspection = await inspectAndValidateSkillPackage({
      fileName: "malicious_skill.zip",
      mimeType: "application/zip",
      sizeBytes: zipBuffer.length,
      buffer: zipBuffer,
    });
    expect(inspection.valid).toBe(false);
    expect(inspection.error).toContain("install.sh");
  });

  // 9. Bài công khai nội bộ hoặc gói tải xuống có nguy cơ chứa thông tin học sinh (PII)
  it("9. Phát hiện và ẩn danh thông tin định danh học sinh (Mã HS, Họ tên HS, SĐT) trong bài đăng và gói tải xuống", () => {
    const rawSampleWithPii =
      "Ví dụ nhận xét cho Học sinh: Nguyễn Văn An (MSHS: HS2025019, SĐT PH: 0905123456) cần ôn tập phần phân số.";
    const piiCheck = detectAndRedactStudentPii(rawSampleWithPii);

    expect(piiCheck.hasPii).toBe(true);
    expect(piiCheck.redactedText).not.toContain("HS2025019");
    expect(piiCheck.redactedText).not.toContain("Nguyễn Văn An");
    expect(piiCheck.redactedText).not.toContain("0905123456");
    expect(piiCheck.redactedText).toContain("[MÃ_HỌC_SINH_ĐÃ_ẨN]");
    expect(piiCheck.redactedText).toContain("Học sinh [ĐÃ_ẨN_DANH]");
    expect(piiCheck.redactedText).toContain("[SĐT_ĐÃ_ẨN]");
  });

  // 10. Runtime SQLite delegate fallback khi PrismaClient đang chạy trên server chưa kịp reload model mới
  it("10. Runtime SQLite delegate hoạt động đầy đủ cho slcSkillEvidenceBrief và slcSkill khi PrismaClient chưa reload", async () => {
    const { createSqliteTableDelegate } = await import("../schema-init");
    const executedSql: Array<{ sql: string; params: any[] }> = [];
    const fakeClient = {
      $executeRawUnsafe: vi.fn(async (sql: string, ...params: any[]) => {
        executedSql.push({ sql, params });
        return 1;
      }),
      $queryRawUnsafe: vi.fn(async (sql: string, ...params: any[]) => {
        if (sql.includes("SELECT *")) {
          return [
            {
              id: params[0] || "slc_brief_runtime_1",
              userId: "user_teacher_a",
              classId: "class_11_1",
              subjectCode: "HOA",
              topicOrLesson: "Saccharose và maltose",
              status: "REVIEWED",
            },
          ];
        }
        return [];
      }),
    };

    const briefDelegate = createSqliteTableDelegate(fakeClient, {
      tableName: "slc_skill_evidence_briefs",
      hasUpdatedAt: true,
      defaults: { status: "REVIEWED" },
    });

    const created = await briefDelegate.create({
      data: {
        userId: "user_teacher_a",
        userName: "Thầy Thông",
        academicYearId: "ay_2026",
        evaluationPeriod: "HK1",
        classId: "class_11_1",
        className: "11.1_CS1",
        gradeLevel: "K11",
        subjectCode: "HOA",
        subjectName: "Hóa học",
        topicOrLesson: "Saccharose và maltose",
      },
    });

    expect(created.id).toBeTruthy();
    expect(created.topicOrLesson).toBe("Saccharose và maltose");
    expect(executedSql[0].sql).toContain('INSERT INTO "slc_skill_evidence_briefs"');
  });

  // 11. Quá trình cập nhật & nâng cấp Skill từ các phiên làm việc của GV Tổ chuyên môn
  it("11. Cập nhật Skill từ phiên làm việc của GV Tổ chuyên môn: tự động nâng lên v1.1, gộp đồng đóng góp, ẩn danh PII và giữ nguyên publishedVersionId", async () => {
    const { submitDepartmentSessionSkillUpdate } = await import("../skills-service");

    const deptColleague = {
      ...teacherA,
      userId: "user_teacher_chem_2",
      teacherId: "teacher_chem_2",
      fullName: "Cô Trần Thị Minh (GV Tổ Hóa)",
      departmentId: "dept_math", // cùng tổ chuyên môn với skill
      mainSubjectCode: "TOAN",
    };

    mockPrisma.slcSkill.findUnique.mockResolvedValue({
      id: "skill_dept_1",
      code: "SKL-TOAN-01",
      name: "Skill Phân hóa bài tập Phương trình",
      summary: "Phân hóa 3 mức độ",
      description: "Mô tả",
      purpose: "Hỗ trợ phân hóa",
      workCategory: "TASK_DIFFERENTIATION",
      subjectCode: "TOAN",
      subjectName: "Toán",
      gradeLevelsJson: '["K8"]',
      topicOrLesson: "Phương trình bậc nhất",
      tagsJson: "[]",
      authorId: teacherA.userId,
      authorName: teacherA.fullName,
      collaboratorsJson: "[]",
      campusId: "campus_1",
      departmentId: "dept_math",
      visibility: "DEPARTMENT",
      status: "PUBLISHED",
      currentVersion: "1.0",
      publishedVersionId: "ver_pub_1_0",
      aiSystemPrompt: "Hướng dẫn AI gốc v1.0",
      workflowStepsJson: '["Bước 1: Nhập bài học"]',
      outputStructure: "1. Mục tiêu\n2. Phiếu bài tập",
      isExecutableOnSsm: true,
    });

    mockPrisma.slcSkillVersion.create.mockImplementation(async ({ data }: any) => ({
      id: "ver_dept_1_1",
      ...data,
    }));
    mockPrisma.slcSkill.update.mockImplementation(async ({ data }: any) => ({
      id: "skill_dept_1",
      ...data,
    }));

    const res = await submitDepartmentSessionSkillUpdate(deptColleague, {
      skillId: "skill_dept_1",
      sessionType: "DAY_THU_NGHIEM",
      sessionTitle: "SHCM Tổ Toán tuần 12 — Rút kinh nghiệm tiết dạy thử nghiệm",
      testedClassesSummary: "Lớp 8A1, 8A2 (Học sinh: Nguyễn Văn Nam MSHS: HS2025999)",
      classroomObservations: "Nhóm trung bình cần thêm gợi ý bước chuyển vế.",
      agreedAdjustments: "Bổ sung gợi ý bậc thang 3 bước cho nhóm HS cần hỗ trợ.",
      participatingTeachers: [
        { userId: "user_teacher_chem_3", name: "Thầy Lê Văn Hùng" },
      ],
      submitMode: "PENDING_REVIEW",
    });

    expect(res.versionRecord.version).toBe("1.1");
    expect(res.skill.currentVersion).toBe("1.1");
    // Phiên bản đang phát hành (ver_pub_1_0) vẫn được giữ nguyên khi bản v1.1 đang chờ duyệt
    expect(res.skill.publishedVersionId).toBe("ver_pub_1_0");
    // Đã tích hợp điều chỉnh của Tổ chuyên môn vào AI System Prompt
    expect(res.skill.aiSystemPrompt).toContain(
      "Bổ sung gợi ý bậc thang 3 bước cho nhóm HS cần hỗ trợ"
    );
    // Đã tự động gộp GV cùng Tổ chuyên môn vào danh sách đồng đóng góp
    const collabs = JSON.parse(res.skill.collaboratorsJson);
    expect(collabs.some((c: any) => c.userId === "user_teacher_chem_2")).toBe(true);
    expect(collabs.some((c: any) => c.userId === "user_teacher_chem_3")).toBe(true);
    // Đã ẩn danh PII học sinh trong biên bản lớp thực nghiệm
    expect(res.departmentSessionMeta.testedClassesSummary).not.toContain("HS2025999");
    expect(res.departmentSessionMeta.testedClassesSummary).toContain("[MÃ_HỌC_SINH_ĐÃ_ẨN]");
  });
});
