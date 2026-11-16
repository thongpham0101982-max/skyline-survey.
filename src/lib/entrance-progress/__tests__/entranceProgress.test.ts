import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ENTRANCE_WORKFLOW_STAGES,
  canUserConfirmStage,
  canApproveEntranceConclusion,
  isKtdbclEntranceRole,
  isGdcsOrBghEntranceRole,
  isGiaoVuEntranceRole,
  isTuVanEntranceRole,
  resolveEntranceStageHref,
} from "../constants";
import { APP_CATEGORIES } from "@/config/modules";
import { getRoleReadableModules } from "@/lib/permissions";
import {
  computeDeadlineAlert,
  canIssueCongratulationLetter,
  validateWorkflowActionRules,
  detectStudentExceptionType,
  evaluateStudent8Stages,
  executeEntranceWorkflowAction,
  matchesEducationSystemCodeOrName,
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
    permission: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
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

  describe("1. Cấu hình chuẩn 7 công đoạn & Phân quyền vai trò chịu trách nhiệm", () => {
    it("Định nghĩa đầy đủ 7 công đoạn liên thông với vai trò, nút xác nhận và liên kết màn hình xử lý", () => {
      expect(ENTRANCE_WORKFLOW_STAGES).toHaveLength(7);
      expect(ENTRANCE_WORKFLOW_STAGES.map((s) => s.code)).toEqual([
        "STAGE_1_BATCH",
        "STAGE_2_ROSTER",
        "STAGE_3_ASSIGNMENT",
        "STAGE_4_EVALUATION",
        "STAGE_5_ORIENTATION",
        "STAGE_6_APPROVAL",
        "STAGE_7_HANDOVER",
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
      expect(canUserConfirmStage("BGH_MN", 6)).toBe(true);

      // Tách bạch Giáo vụ Cơ sở (GIAO_VU_CS) và Tư vấn (TVAN) khỏi quyền phê duyệt Bước 6
      expect(isGdcsOrBghEntranceRole("GIAO_VU_CS")).toBe(false);
      expect(isGiaoVuEntranceRole("GIAO_VU_CS")).toBe(true);
      expect(canUserConfirmStage("GIAO_VU_CS", 6)).toBe(false);
      expect(canApproveEntranceConclusion("GIAO_VU_CS")).toBe(false);
      expect(canApproveEntranceConclusion("TVAN")).toBe(false);
      expect(canUserConfirmStage("TVAN", 2)).toBe(true);
      expect(canUserConfirmStage("TVAN", 6)).toBe(false);
      expect(canUserConfirmStage("TVAN", 7)).toBe(true);

      // Đồng bộ mã vai trò thực tế CSDL: KHAO_THI & TB_DHCM
      expect(isKtdbclEntranceRole("KHAO_THI")).toBe(true);
      expect(isKtdbclEntranceRole("TB_DHCM")).toBe(true);
      expect(isTuVanEntranceRole("TVAN")).toBe(true);
      expect(canUserConfirmStage("KHAO_THI", 6)).toBe(true);
      expect(canApproveEntranceConclusion("KHAO_THI")).toBe(true);
    });

    it("Định tuyến liên kết xử lý trực tiếp theo vai trò và giữ nguyên bộ lọc ngữ cảnh", () => {
      // Bước 1 trỏ thẳng tới Tab Đợt khảo sát thay vì Cấu hình hệ thống
      const hrefStage1 = resolveEntranceStageHref({
        stageNumber: 1,
        isPreschool: false,
        userRole: "GIAO_VU",
        periodId: "p_2026",
        campusCode: "CS1",
      });
      expect(hrefStage1).toContain("/admin/student-info?");
      expect(hrefStage1).toContain("subTab=periods");
      expect(hrefStage1).toContain("periodId=p_2026");
      expect(hrefStage1).toContain("campusCode=CS1");

      // Bước 4: Giáo viên vào cổng /teacher, Giáo vụ/KT&ĐBCL vào /admin/ket-qua-khao-sat
      expect(
        resolveEntranceStageHref({
          stageNumber: 4,
          isPreschool: false,
          userRole: "TEACHER",
          periodId: "p_2026",
        })
      ).toContain("/teacher/input-assessments?type=general");
      expect(
        resolveEntranceStageHref({
          stageNumber: 4,
          isPreschool: false,
          userRole: "KHAO_THI",
          periodId: "p_2026",
        })
      ).toContain("/admin/ket-qua-khao-sat?tab=general&subTab=batch");

      // Bước 7: KT&ĐBCL / Giáo vụ vào Xuất văn bản, Tư vấn vào Kết quả & thông báo HS
      expect(
        resolveEntranceStageHref({
          stageNumber: 7,
          isPreschool: false,
          userRole: "GIAO_VU",
          batchId: "b_1",
        })
      ).toContain("/admin/input-assessments/reports?tab=k12&batchId=b_1");
      expect(
        resolveEntranceStageHref({
          stageNumber: 7,
          isPreschool: false,
          userRole: "TVAN",
          batchId: "b_1",
        })
      ).toContain("/admin/ket-qua-khao-sat?tab=general&subTab=result&batchId=b_1");
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

    it("Khi hoàn thành Bước 7 (Bàn giao kết quả, văn bản cho Tư vấn) -> Ghi nhận hoàn tất quy trình 7 bước", () => {
      const confirmationsHandover = new Map<string, any>([
        [
          "STUDENT_stu_3_7",
          { stageNumber: 7, status: "COMPLETED", confirmedByName: "Giáo vụ CS1" },
        ],
      ]);

      const rowHandover = evaluateStudent8Stages({
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
        confirmationsMap: confirmationsHandover,
        studentCodeCountMap: new Map([["KS26-003", 1]]),
      });

      expect(rowHandover.stages).toHaveLength(7);
      expect(rowHandover.stages[6].status).toBe("COMPLETED");
      expect(rowHandover.completionMilestone).toBe("NOTIFICATION_COMPLETED");
    });

    it("Đồng bộ logic phễu cho hồ sơ lịch sử/xét thẳng đã có kết luận phê duyệt chính thức ở Bước 6", () => {
      const approvedDirectRow = evaluateStudent8Stages({
        student: {
          id: "stu_hist_1",
          studentCode: "KS26-HIST",
          fullName: "Đặng Minh Châu",
          grade: "6",
          admissionResult: "Đạt",
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
        studentCodeCountMap: new Map([["KS26-HIST", 1]]),
      });

      expect(approvedDirectRow.isApprovalCompleted).toBe(true);
      expect(approvedDirectRow.isWorkCompleted).toBe(true);
      // Bottleneck tiếp theo phải là Bước 7 (Xuất văn bản & bàn giao Tư vấn), không bị kẹt giả ở Bước 3
      expect(approvedDirectRow.currentStageNumber).toBe(7);
      expect(approvedDirectRow.stages[6].actionHref).toContain("/admin/input-assessments/reports");
    });
  });

  describe("3. Kiểm soát nghiệp vụ tại Backend (Chặn phát hành thư sai quy định & Hồ sơ ngoại lệ)", () => {
    it("Chặn phát hành Thư chúc mừng khi học sinh Chờ duyệt hoặc Không đạt", () => {
      expect(canIssueCongratulationLetter("Chờ duyệt", "IN_PROGRESS")).toBe(false);
      expect(canIssueCongratulationLetter("Không đạt", "COMPLETED")).toBe(false);
      expect(canIssueCongratulationLetter("Đạt", "COMPLETED")).toBe(true);
      expect(canIssueCongratulationLetter("Đạt có cam kết", "COMPLETED")).toBe(true);

      const ruleValidation = validateWorkflowActionRules({
        stageNumber: 7,
        action: "CONFIRM",
        userRole: "GIAO_VU",
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

  describe("6. Cấu trúc Danh mục Sidebar Khảo sát đầu vào & Ma trận phân quyền 4 bộ phận", () => {
    it("Sắp xếp danh mục Khảo sát đầu vào đúng 8 mục theo trình tự công việc và tách Hồ sơ học sinh sang Tra cứu Học sinh", () => {
      const assessmentCat = APP_CATEGORIES.find((c) => c.id === "ASSESSMENT");
      const studentLookupCat = APP_CATEGORIES.find((c) => c.id === "STUDENT_LOOKUP");

      expect(assessmentCat).toBeDefined();
      expect(assessmentCat?.modules.map((m) => m.code)).toEqual([
        "DIEU_HANH_KHAO_SAT",
        "STUDENT_INFO",
        "PHAN_CONG_KHAO_SAT",
        "KET_QUA_KHAO_SAT",
        "XET_DUYET_KET_QUA",
        "INPUT_ASSESSMENT_REPORTS",
        "CAU_HINH_KHAO_SAT",
        "CAU_HINH_FILE_DIEM_KSDV",
      ]);
      expect(
        studentLookupCat?.modules.some((m) => m.code === "ADMIN_STUDENT_PROFILES")
      ).toBe(true);
    });

    it("Tách danh mục QL ĐG Năng lực thành danh mục chính độc lập khỏi Khảo thí & ĐBCL", () => {
      const ktdbclCat = APP_CATEGORIES.find((c) => c.id === "KTDBCL");
      const competencyCat = APP_CATEGORIES.find((c) => c.id === "COMPETENCY_ASSESSMENT");

      expect(ktdbclCat).toBeDefined();
      expect(ktdbclCat?.modules.some((m) => m.code === "QL_DGNL")).toBe(false);

      expect(competencyCat).toBeDefined();
      expect(competencyCat?.name).toBe("QL ĐG Năng lực");
      expect(competencyCat?.modules.map((m) => m.code)).toEqual([
        "COMPETENCY_IMPORT",
        "COMPETENCY_SUBJECTS",
        "COMPETENCY_ALIASES",
        "COMPETENCY_HISTORY",
      ]);
    });

    it("Phân quyền hiển thị menu đúng theo vai trò KHAO_THI, GIAO_VU, TVAN, GDCS, BGH_MN", async () => {
      const ktModules = await getRoleReadableModules("KHAO_THI");
      expect(ktModules).toContain("CAU_HINH_KHAO_SAT");
      expect(ktModules).toContain("CAU_HINH_FILE_DIEM_KSDV");
      expect(ktModules).toContain("XET_DUYET_KET_QUA");

      const giaoVuModules = await getRoleReadableModules("GIAO_VU");
      expect(giaoVuModules).toContain("DIEU_HANH_KHAO_SAT");
      expect(giaoVuModules).toContain("PHAN_CONG_KHAO_SAT");
      expect(giaoVuModules).toContain("XET_DUYET_KET_QUA");
      expect(giaoVuModules).not.toContain("CAU_HINH_KHAO_SAT");
      expect(giaoVuModules).not.toContain("CAU_HINH_FILE_DIEM_KSDV");

      const tuVanModules = await getRoleReadableModules("TVAN");
      expect(tuVanModules).toContain("DIEU_HANH_KHAO_SAT");
      expect(tuVanModules).toContain("STUDENT_INFO");
      expect(tuVanModules).toContain("KET_QUA_KHAO_SAT");
      expect(tuVanModules).toContain("INPUT_ASSESSMENT_REPORTS");
      expect(tuVanModules).not.toContain("PHAN_CONG_KHAO_SAT");
      expect(tuVanModules).not.toContain("XET_DUYET_KET_QUA");
      expect(tuVanModules).not.toContain("CAU_HINH_KHAO_SAT");

      const gdcsModules = await getRoleReadableModules("GDCS");
      expect(gdcsModules).toContain("DIEU_HANH_KHAO_SAT");
      expect(gdcsModules).toContain("XET_DUYET_KET_QUA");
      expect(gdcsModules).not.toContain("CAU_HINH_KHAO_SAT");

      const bghMnModules = await getRoleReadableModules("BGH_MN");
      expect(bghMnModules).toContain("XDKQ_MAM_NON");
      expect(bghMnModules).not.toContain("XDKQ_K12");
    });
  });

  describe("7. Hiển thị Họ tên GV / Nhân sự đang phụ trách theo phân công gán trên 7 bước", () => {
    it("Gán đúng Họ tên GV và người phụ trách cho từng bước (Bước 1 -> Bước 7) đối với học sinh K-12", () => {
      const row = evaluateStudent8Stages({
        student: {
          id: "stu_asg_k12",
          studentCode: "HS701020241",
          fullName: "Trần Lan Chi",
          grade: "1",
          surveyFormType: "Hội nhập chuẩn",
          admissionResult: "Chờ duyệt",
          signatureName: "Nguyễn Thị Lan", // Chữ ký B4 không được nhận nhầm sang người duyệt B6 khi chưa duyệt
          scores: [
            {
              subjectId: "sub_math",
              scores: "[9.0]",
              teacherName: "Nguyễn Thị Lan",
              subject: { id: "sub_math", code: "MATH", name: "Toán" },
            },
          ],
        },
        isPreschool: false,
        period: {
          id: "p_k12",
          name: "Khảo sát lẻ",
          assignedUser: { fullName: "Lê Thu Hà" },
        },
        batch: {
          id: "b_k12",
          name: "CS4 _ KSL _ Đợt 128",
          assignedUser: { fullName: "Trần Thanh Tùng" },
        },
        campusName: "Sky-Line Hill (CS4)",
        campusCode: "CS4",
        matchedAssignments: [
          {
            id: "asg_math",
            userId: "u_lan",
            subjectId: "sub_math",
            batchId: "b_k12",
            user: { fullName: "Nguyễn Thị Lan" },
            subject: { id: "sub_math", code: "MATH", name: "Toán" },
          },
          {
            id: "asg_eng",
            userId: "u_minh",
            subjectId: "sub_eng",
            batchId: "b_k12",
            user: { fullName: "Phạm Quốc Minh" },
            subject: { id: "sub_eng", code: "ENG", name: "Tiếng Anh" },
          },
          {
            id: "asg_ori",
            userId: "u_huong",
            subjectId: "sub_ori",
            batchId: "b_k12",
            user: { fullName: "Đỗ Mai Hương" },
            subject: { id: "sub_ori", code: "DH", name: "Định hướng" },
          },
        ],
        orientationRecord: {
          id: "ori_k12",
          status: "IN_PROGRESS",
          psychologyReferralStatus: "REQUESTED",
          psychologyTeacherName: "ThS. Vũ Tâm Lý",
        },
        preschoolDevScoresCount: 0,
        confirmationsMap: new Map(),
        studentCodeCountMap: new Map([["HS701020241", 1]]),
        stageAssigneesContext: {
          campusGdcsNames: ["ThS. Hoàng Giám Đốc"],
          campusGiaoVuNames: ["Nguyễn Giáo Vụ CS4"],
          campusTuVanNames: ["Phạm Tư Vấn CS4"],
        },
      });

      // Bước 1: Tạo đợt KS -> Người phụ trách đợt / kỳ
      expect(row.stages[0].assignedSummary).toContain("Trần Thanh Tùng");
      // Bước 2: Nhập & Bàn giao DS -> Tư vấn / Giáo vụ / Điều phối đợt
      expect(row.stages[1].assignedNames).toContain("Phạm Tư Vấn CS4");
      // Bước 3: Phân công GV -> Giáo vụ Cơ sở / Điều phối đợt
      expect(row.stages[2].assignedNames).toContain("Trần Thanh Tùng");
      expect(row.stages[2].assignedTooltip).toContain("GV đã gán:");
      // Bước 4: GV đánh giá -> Chỉ hiển thị GV các môn khảo sát (tách riêng GV Định hướng sang Bước 5)
      expect(row.stages[3].assignedNames).toEqual([
        "Nguyễn Thị Lan",
        "Phạm Quốc Minh",
      ]);
      expect(row.stages[3].assignedSummary).toBe("Nguyễn Thị Lan (+1)");
      expect(row.stages[3].assignedTooltip).toContain("Nguyễn Thị Lan (Toán - Đã chấm)");
      expect(row.stages[3].assignedTooltip).toContain("Phạm Quốc Minh (Tiếng Anh - Chưa chấm)");
      // Bước 5: Bản định hướng -> Ưu tiên GV Tâm lý khi REQUESTED + GV Định hướng được phân công
      expect(row.stages[4].assignedNames?.[0]).toBe("ThS. Vũ Tâm Lý");
      expect(row.stages[4].assignedNames).toContain("Đỗ Mai Hương");
      // Bước 6: Thẩm định & Duyệt -> Hiển thị GĐCS Cơ sở (không bị dính signatureName của B4)
      expect(row.stages[5].assignedNames).toEqual(["ThS. Hoàng Giám Đốc"]);
      expect(row.stages[5].assignedSummary).toBe("ThS. Hoàng Giám Đốc");
      // Bước 7: Văn bản & Bàn giao -> Giáo vụ / Tư vấn
      expect(row.stages[6].assignedNames).toContain("Nguyễn Giáo Vụ CS4");
      expect(row.stages[6].assignedNames).toContain("Phạm Tư Vấn CS4");
    });

    it("Hỗ trợ GV nhận ủy quyền (delegatedUser) ở Mầm non, Giám khảo buổi KS lẻ và khớp mã hệ đào tạo HNS <-> Hội nhập chuẩn", () => {
      const aliasMap = new Map<string, string[]>([
        ["hns", ["hns", "hội nhập chuẩn"]],
        ["hội nhập chuẩn", ["hội nhập chuẩn", "hns"]],
      ]);
      expect(matchesEducationSystemCodeOrName("Hội nhập chuẩn", "HNS", aliasMap)).toBe(true);
      expect(matchesEducationSystemCodeOrName("Song bằng", "HNS", aliasMap)).toBe(false);

      const mnRow = evaluateStudent8Stages({
        student: {
          id: "stu_mn_1",
          studentCode: "MN26-009",
          fullName: "Bé Nguyễn An Nhiên",
          grade: "Mẫu giáo nhỡ (4-5 tuổi)",
          admissionResult: "Chờ duyệt",
        },
        isPreschool: true,
        period: { id: "p_mn", name: "KS Mầm non" },
        batch: { id: "b_mn", name: "Đợt lẻ MN" },
        campusName: "Sky-Line Central (CS2)",
        campusCode: "CS2",
        matchedAssignments: [
          {
            id: "asg_mn_1",
            userId: "u_goc",
            delegatedUserId: "u_uyquyen",
            user: { fullName: "Cô Mai (GV gốc)" },
            delegatedUser: { fullName: "Cô Trâm (Nhận ủy quyền)" },
          },
        ],
        orientationRecord: null,
        preschoolDevScoresCount: 3,
        confirmationsMap: new Map(),
        studentCodeCountMap: new Map([["MN26-009", 1]]),
        stageAssigneesContext: {
          campusBghPreschoolNames: ["Cô Hiệu Trưởng MN"],
          sessionExaminerItems: [
            {
              userId: "u_ex_1",
              fullName: "Cô Thảo (Giám khảo buổi KS)",
              subjectName: "Quan sát phát triển",
            },
          ],
        },
      });

      expect(mnRow.assignedTeachersCount).toBe(2);
      expect(mnRow.stages[3].assignedNames?.[0]).toBe("Cô Trâm (Nhận ủy quyền)");
      expect(mnRow.stages[3].assignedNames).toContain("Cô Thảo (Giám khảo buổi KS)");
      expect(mnRow.stages[3].assignedTooltip).toContain(
        "Cô Trâm (Nhận ủy quyền) (Nhận ủy quyền từ Cô Mai (GV gốc))"
      );
      expect(mnRow.stages[5].assignedSummary).toBe("Cô Hiệu Trưởng MN");
    });
  });
});
