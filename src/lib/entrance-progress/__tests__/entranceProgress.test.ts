import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ENTRANCE_WORKFLOW_STAGES,
  canUserConfirmStage,
} from "../constants";
import {
  computeDeadlineAlert,
  canIssueCongratulationLetter,
  validateWorkflowActionRules,
  detectStudentExceptionType,
  evaluateStudent8Stages,
  executeEntranceWorkflowAction,
} from "../entranceProgressEngine";

// Bắt buộc Mock DB theo quy tắc GEMINI.md - Tuyệt đối không ghi dữ liệu test vào CSDL thực
const mockExecuteRawUnsafe = vi.fn().mockResolvedValue(1);
const mockQueryRawUnsafe = vi.fn().mockResolvedValue([]);
const mockNotificationCreate = vi.fn().mockResolvedValue({ id: "notif_mock_1" });
const mockStudentUpdate = vi.fn().mockResolvedValue({ id: "stu_mock_1" });
const mockStudentFindMany = vi.fn().mockResolvedValue([
  {
    id: "stu_mock_1",
    studentCode: "KS26-001",
    fullName: "Nguyễn Minh Khôi",
    periodId: "period_1",
    batchId: "batch_1",
    admissionResult: "Chờ duyệt",
    mathScore: "8.5",
    literatureScore: "8.0",
    writtenEnglishScore: "9.0",
    scores: [{ subjectId: "sub_math", scores: "[8.5]" }],
    orientationRecord: { id: "ori_1", status: "COMPLETED" },
  },
]);

vi.mock("@/lib/db", () => ({
  prisma: {
    $executeRawUnsafe: (...args: any[]) => mockExecuteRawUnsafe(...args),
    $queryRawUnsafe: (...args: any[]) => mockQueryRawUnsafe(...args),
    notification: {
      create: (...args: any[]) => mockNotificationCreate(...args),
    },
    inputAssessmentStudent: {
      findMany: (...args: any[]) => mockStudentFindMany(...args),
      update: (...args: any[]) => mockStudentUpdate(...args),
    },
    preschoolInputAssessmentStudent: {
      findMany: vi.fn().mockResolvedValue([]),
      update: (...args: any[]) => mockStudentUpdate(...args),
    },
    studentOrientationRecord: {
      update: vi.fn().mockResolvedValue({ id: "ori_1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    inputAssessmentTeacherAssignment: {
      count: vi.fn().mockResolvedValue(2),
      findMany: vi.fn().mockResolvedValue([
        {
          id: "asg_1",
          userId: "teacher_1",
          periodId: "period_1",
          batchId: "batch_1",
          period: { name: "Kỳ KSĐV Năm học 2026-2027" },
          batch: { name: "Đợt 1" },
          subject: { name: "Toán" },
        },
      ]),
    },
  },
}));

describe("Luồng Điều hành & Tiến độ Khảo sát Đầu vào 8 Công đoạn (SSM Sky-Line)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Cấu hình chuẩn 8 công đoạn & Phân quyền vai trò chịu trách nhiệm", () => {
    it("Định nghĩa đầy đủ 8 công đoạn liên thông với vai trò, nút xác nhận và liên kết màn hình xử lý", () => {
      expect(ENTRANCE_WORKFLOW_STAGES).toHaveLength(8);
      expect(ENTRANCE_WORKFLOW_STAGES.map((s) => s.code)).toEqual([
        "STAGE_1_BATCH",
        "STAGE_2_ROSTER",
        "STAGE_3_ASSIGNMENT",
        "STAGE_4_EVALUATION",
        "STAGE_5_ORIENTATION",
        "STAGE_6_APPROVAL",
        "STAGE_7_HANDOVER",
        "STAGE_8_NOTIFICATION",
      ]);

      for (const stage of ENTRANCE_WORKFLOW_STAGES) {
        expect(stage.confirmButtonLabel.length).toBeGreaterThan(5);
        expect(stage.defaultHrefK12).toMatch(/^\/(admin|teacher)\//);
        expect(stage.defaultHrefPreschool).toMatch(/^\/(admin|teacher)\//);
        expect(stage.responsibleRoles.length).toBeGreaterThan(0);
      }
    });

    it("Kiểm tra phân quyền xác nhận theo từng công đoạn (Backend Role Guard)", () => {
      // Giáo vụ được xác nhận Bước 1, 2, 3, 7 nhưng KHÔNG được phê duyệt kết luận Bước 6
      expect(canUserConfirmStage("GIAO_VU", 3)).toBe(true);
      expect(canUserConfirmStage("GIAO_VU", 7)).toBe(true);
      expect(canUserConfirmStage("GIAO_VU", 6)).toBe(false);

      // Giáo viên được xác nhận Bước 4 (Đánh giá) và Bước 5 (Định hướng), KHÔNG được duyệt Bước 6
      expect(canUserConfirmStage("TEACHER", 4)).toBe(true);
      expect(canUserConfirmStage("TEACHER", 5)).toBe(true);
      expect(canUserConfirmStage("TEACHER", 6)).toBe(false);

      // Giám đốc Cơ sở (GDCS) được thẩm định & phê duyệt Bước 6 và bàn giao Bước 7
      expect(canUserConfirmStage("GDCS", 6)).toBe(true);
      expect(canUserConfirmStage("GDCS", 7)).toBe(true);

      // Tư vấn tuyển sinh được xác nhận Bước 8 (Gửi thông báo/thư chúc mừng cho PHHS)
      expect(canUserConfirmStage("TU_VAN", 8)).toBe(true);
      expect(canUserConfirmStage("TU_VAN", 6)).toBe(false);
    });
  });

  describe("2. Đồng bộ trạng thái 8 bước & Phân biệt Hoàn thành công việc / Xét duyệt / Thông báo", () => {
    it("Không tự động phê duyệt Bước 6 chỉ vì Giáo viên đã nhập đủ điểm và hoàn thành bản định hướng", () => {
      const row = evaluateStudent8Stages({
        student: {
          id: "stu_1",
          studentCode: "KS26-001",
          fullName: "Nguyễn Minh Khôi",
          grade: "6",
          surveyFormType: "Hội nhập (HNS)",
          admissionResult: "Chờ duyệt",
          mathScore: "8.5",
          literatureScore: "8.0",
          writtenEnglishScore: "9.0",
          scores: [
            { subjectId: "sub_1", scores: "[8.5]" },
            { subjectId: "sub_2", scores: "[8.0]" },
          ],
        },
        isPreschool: false,
        period: { id: "p_1", name: "Kỳ KSĐV 2026-2027", startDate: "2026-03-01" },
        batch: { id: "b_1", name: "Đợt 1", startDate: "2026-03-01", endDate: "2026-03-20" },
        campusName: "Cơ sở 1",
        campusCode: "CS1",
        matchedAssignments: [
          { id: "a_1", userId: "gv_1", subjectId: "sub_1", user: { fullName: "Cô Lan" } },
          { id: "a_2", userId: "gv_2", subjectId: "sub_2", user: { fullName: "Thầy Minh" } },
        ],
        orientationRecord: {
          id: "ori_1",
          status: "COMPLETED",
          interviewerName: "Cô Hương",
          studentStrengths: "Tư duy logic tốt",
          proposedEduSystem: "HNS",
        },
        preschoolDevScoresCount: 0,
        confirmationsMap: new Map(),
        studentCodeCountMap: new Map([["KS26-001", 1]]),
      });

      // Bước 1, 2, 3, 4, 5 đã COMPLETED (Hoàn thành công việc chuyên môn)
      expect(row.stages[0].status).toBe("COMPLETED");
      expect(row.stages[1].status).toBe("COMPLETED");
      expect(row.stages[2].status).toBe("COMPLETED");
      expect(row.stages[3].status).toBe("COMPLETED");
      expect(row.stages[4].status).toBe("COMPLETED");

      // Bước 6 chuyển sang IN_PROGRESS (Chờ thẩm định), TUYỆT ĐỐI KHÔNG tự động COMPLETED
      expect(row.stages[5].status).toBe("IN_PROGRESS");
      // Bước 7 chưa mở khóa bàn giao khi Bước 6 chưa duyệt
      expect(row.stages[6].status).toBe("NOT_STARTED");
      // Mốc hoàn thành là WORK_COMPLETED (Hoàn thành công việc chuyên môn, chưa hoàn thành xét duyệt)
      expect(row.completionMilestone).toBe("WORK_COMPLETED");
    });

    it("Khi GĐCS phê duyệt kết luận Đạt -> Mở khóa Bước 7 (Bàn giao) và cho phép phát hành Thư chúc mừng ở Bước 8", () => {
      const row = evaluateStudent8Stages({
        student: {
          id: "stu_2",
          studentCode: "KS26-002",
          fullName: "Trần Bảo Ngọc",
          grade: "1",
          surveyFormType: "HNS",
          admissionResult: "Đạt",
          directorNote: "Đồng ý tiếp nhận",
          mathScore: "9.0",
          scores: [{ subjectId: "sub_1", scores: "[9.0]" }],
        },
        isPreschool: false,
        period: { id: "p_1", name: "Kỳ KSĐV 2026-2027", startDate: "2026-03-01" },
        batch: { id: "b_1", name: "Đợt 1", startDate: "2026-03-01", endDate: "2026-03-20" },
        campusName: "Cơ sở 1",
        campusCode: "CS1",
        matchedAssignments: [
          { id: "a_1", userId: "gv_1", subjectId: "sub_1", user: { fullName: "Cô Lan" } },
        ],
        orientationRecord: {
          id: "ori_2",
          status: "COMPLETED",
          studentStrengths: "Tự tin, giao tiếp tốt",
        },
        preschoolDevScoresCount: 0,
        confirmationsMap: new Map(),
        studentCodeCountMap: new Map([["KS26-002", 1]]),
      });

      // Bước 6 đã COMPLETED
      expect(row.stages[5].status).toBe("COMPLETED");
      // Bước 7 tự động chuyển sang IN_PROGRESS (Cho phép chuẩn bị, bàn giao văn bản phù hợp)
      expect(row.stages[6].status).toBe("IN_PROGRESS");
      expect(row.completionMilestone).toBe("APPROVAL_COMPLETED");
      expect(row.canIssueCongratulation).toBe(true);
    });

    it("Tách biệt trạng thái Tư vấn đã gửi (SENT) với PHHS đã nhận/đọc (READ/CONFIRMED)", () => {
      const confirmationsSentOnly = new Map<string, any>([
        [
          "STUDENT_stu_3_7",
          { stageNumber: 7, status: "COMPLETED", confirmedByName: "Giáo vụ CS1" },
        ],
        [
          "STUDENT_stu_3_8",
          {
            stageNumber: 8,
            status: "COMPLETED",
            deliveryStatus: "SENT",
            confirmedByName: "Tư vấn CS1",
            confirmedAt: "2026-03-05T10:00:00.000Z",
          },
        ],
      ]);

      const rowSent = evaluateStudent8Stages({
        student: {
          id: "stu_3",
          studentCode: "KS26-003",
          fullName: "Lê Hoàng Nam",
          grade: "2",
          admissionResult: "Đạt",
          mathScore: "8.0",
        },
        isPreschool: false,
        period: { id: "p_1", name: "Kỳ KSĐV", startDate: "2026-03-01" },
        batch: { id: "b_1", name: "Đợt 1" },
        campusName: "Cơ sở 1",
        campusCode: "CS1",
        matchedAssignments: [{ id: "a_1", userId: "gv_1", subjectId: "sub_1" }],
        orientationRecord: { id: "ori_3", status: "COMPLETED", studentStrengths: "Tốt" },
        preschoolDevScoresCount: 0,
        confirmationsMap: confirmationsSentOnly,
        studentCodeCountMap: new Map([["KS26-003", 1]]),
      });

      expect(rowSent.stages[7].status).toBe("COMPLETED");
      expect(rowSent.deliveryStatus).toBe("SENT");
      expect(rowSent.isNotificationSent).toBe(true);
      expect(rowSent.isParentRead).toBe(false);
      expect(rowSent.completionMilestone).toBe("NOTIFICATION_COMPLETED");

      // Khi cập nhật trạng thái PHHS đã đọc/xác nhận (READ)
      const confirmationsRead = new Map<string, any>([
        [
          "STUDENT_stu_3_8",
          {
            stageNumber: 8,
            status: "COMPLETED",
            deliveryStatus: "READ",
            parentReadAt: "2026-03-05T14:00:00.000Z",
          },
        ],
      ]);

      const rowRead = evaluateStudent8Stages({
        student: {
          id: "stu_3",
          studentCode: "KS26-003",
          fullName: "Lê Hoàng Nam",
          grade: "2",
          admissionResult: "Đạt",
          mathScore: "8.0",
        },
        isPreschool: false,
        period: { id: "p_1", name: "Kỳ KSĐV", startDate: "2026-03-01" },
        batch: { id: "b_1", name: "Đợt 1" },
        campusName: "Cơ sở 1",
        campusCode: "CS1",
        matchedAssignments: [{ id: "a_1", userId: "gv_1", subjectId: "sub_1" }],
        orientationRecord: { id: "ori_3", status: "COMPLETED", studentStrengths: "Tốt" },
        preschoolDevScoresCount: 0,
        confirmationsMap: confirmationsRead,
        studentCodeCountMap: new Map([["KS26-003", 1]]),
      });

      expect(rowRead.deliveryStatus).toBe("READ");
      expect(rowRead.isParentRead).toBe(true);
    });
  });

  describe("3. Kiểm soát nghiệp vụ tại Backend (Chặn phát hành thư sai quy định & Hồ sơ ngoại lệ)", () => {
    it("Chặn phát hành Thư chúc mừng khi học sinh Chờ duyệt hoặc Không đạt", () => {
      expect(canIssueCongratulationLetter("Chờ duyệt", "IN_PROGRESS")).toBe(false);
      expect(canIssueCongratulationLetter("Không đạt", "COMPLETED")).toBe(false);
      expect(canIssueCongratulationLetter("Đạt", "COMPLETED")).toBe(true);
      expect(canIssueCongratulationLetter("Đạt có cam kết", "COMPLETED")).toBe(true);

      const ruleValidation = validateWorkflowActionRules({
        stageNumber: 8,
        action: "CONFIRM",
        userRole: "TU_VAN",
        admissionResult: "Không đạt",
        stage6Status: "COMPLETED",
        documentTypes: ["CONGRATULATION_LETTER"],
      });
      expect(ruleValidation.valid).toBe(false);
      expect(ruleValidation.error).toContain("Không được phép phát hành Thư chúc mừng");
    });

    it("Hỗ trợ hồ sơ Miễn khảo sát (EXEMPT), Khảo sát lại (RETEST), Chỉnh sửa (AMENDMENT)", () => {
      const exemptRes = detectStudentExceptionType(
        { id: "s1", studentCode: "KS01", admissionResult: "Miễn khảo sát" },
        new Map(),
        new Map([["KS01", 1]]),
        false
      );
      expect(exemptRes.exceptionType).toBe("EXEMPT");

      const retestRes = detectStudentExceptionType(
        { id: "s2", studentCode: "KS02", admissionResult: "Đạt" },
        new Map(),
        new Map([["KS02", 2]]),
        false
      );
      expect(retestRes.exceptionType).toBe("RETEST");
      expect(retestRes.isRetest).toBe(true);

      const amendmentRes = detectStudentExceptionType(
        { id: "s3", studentCode: "KS03", admissionResult: "Chờ duyệt" },
        new Map(),
        new Map([["KS03", 1]]),
        true
      );
      expect(amendmentRes.exceptionType).toBe("AMENDMENT");

      // Hồ sơ Miễn khảo sát tự động đánh dấu Bước 3, 4, 5 là NOT_APPLICABLE (Không áp dụng)
      const exemptRow = evaluateStudent8Stages({
        student: {
          id: "stu_ex",
          studentCode: "KS26-EX",
          fullName: "Phạm Gia Hân",
          grade: "10",
          admissionCriteria: "Miễn khảo sát",
          admissionResult: "Miễn khảo sát",
        },
        isPreschool: false,
        period: { id: "p_1", name: "Kỳ KSĐV", startDate: "2026-03-01" },
        batch: { id: "b_1", name: "Đợt 1" },
        campusName: "Cơ sở 1",
        campusCode: "CS1",
        matchedAssignments: [],
        orientationRecord: null,
        preschoolDevScoresCount: 0,
        confirmationsMap: new Map(),
        studentCodeCountMap: new Map([["KS26-EX", 1]]),
      });

      expect(exemptRow.stages[2].status).toBe("NOT_APPLICABLE");
      expect(exemptRow.stages[3].status).toBe("NOT_APPLICABLE");
      expect(exemptRow.stages[4].status).toBe("NOT_APPLICABLE");
      expect(exemptRow.stages[5].status).toBe("COMPLETED");
    });
  });

  describe("4. Cảnh báo công việc gần hạn (DUE_SOON) và quá hạn (OVERDUE)", () => {
    it("Tính toán chính xác mức cảnh báo hạn hoàn thành", () => {
      const now = new Date("2026-03-10T10:00:00.000Z");

      // Công việc đã hoàn thành -> COMPLETED
      expect(
        computeDeadlineAlert("2026-03-01T00:00:00.000Z", "2026-03-08T10:00:00.000Z", true, now).level
      ).toBe("COMPLETED");

      // Quá hạn 2 ngày -> OVERDUE
      const overdue = computeDeadlineAlert("2026-03-01T00:00:00.000Z", "2026-03-08T10:00:00.000Z", false, now);
      expect(overdue.level).toBe("OVERDUE");
      expect(overdue.hoursRemaining).toBeLessThan(0);

      // Còn 24 giờ (<= 48h) -> DUE_SOON
      const dueSoon = computeDeadlineAlert("2026-03-01T00:00:00.000Z", "2026-03-11T10:00:00.000Z", false, now);
      expect(dueSoon.level).toBe("DUE_SOON");
      expect(dueSoon.hoursRemaining).toBe(24);

      // Còn 5 ngày (> 48h) -> ON_TRACK
      const onTrack = computeDeadlineAlert("2026-03-01T00:00:00.000Z", "2026-03-15T10:00:00.000Z", false, now);
      expect(onTrack.level).toBe("ON_TRACK");
    });
  });

  describe("5. Lưu vết người xác nhận, thời gian và lịch sử thay đổi (Audit Trail)", () => {
    it("Ghi nhận bản ghi xác nhận, công bố thông báo và Audit Log tại Backend khi thực hiện thao tác hợp lệ", async () => {
      // 1. Giáo vụ xác nhận hoàn thành phân công (Bước 3) -> Công bố nhiệm vụ cho GV
      const stage3Res = await executeEntranceWorkflowAction({
        action: "CONFIRM",
        targetScope: "BATCH",
        periodId: "period_1",
        batchId: "batch_1",
        stageNumber: 3,
        status: "COMPLETED",
        note: "Đã hoàn tất phân công khảo sát Đợt 1",
        actor: {
          id: "user_gv_1",
          fullName: "Nguyễn Thị Giáo Vụ",
          role: "GIAO_VU",
        },
      });
      expect(stage3Res.success).toBe(true);
      expect(mockNotificationCreate).toHaveBeenCalled();

      // 2. GĐCS phê duyệt kết luận Bước 6 -> Cập nhật hồ sơ và ghi Audit Log
      const stage6Res = await executeEntranceWorkflowAction({
        action: "CONFIRM",
        targetScope: "STUDENT",
        periodId: "period_1",
        batchId: "batch_1",
        studentIds: ["stu_mock_1"],
        stageNumber: 6,
        status: "COMPLETED",
        admissionResult: "Đạt",
        note: "Hội đồng xét duyệt thống nhất tiếp nhận chuẩn",
        actor: {
          id: "user_gdcs_1",
          fullName: "ThS. Trần Văn Long",
          role: "GDCS",
        },
      });

      expect(stage6Res.success).toBe(true);
      expect(mockExecuteRawUnsafe).toHaveBeenCalled();
      expect(mockStudentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stu_mock_1" },
          data: expect.objectContaining({
            admissionResult: "Đạt",
            signatureName: "ThS. Trần Văn Long",
          }),
        })
      );
    });
  });
});
