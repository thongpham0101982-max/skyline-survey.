/**
 * BỘ CẤU HÌNH MẪU ĐỀ XUẤT PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HS & PHHS (KHỐI 1–12)
 * VÀ PHÂN LOẠI NỘI DUNG KHẢO SÁT ĐẦU VÀO TRONG SSM SKY-LINE
 *
 * Lưu ý nghiệp vụ:
 * - Bộ 5 mẫu PVDH-01..PVDH-05 là mẫu đề xuất phục vụ triển khai (không gọi là biểu mẫu đã ban hành).
 * - Ghi nhận định tính thuần túy; KHÔNG quy đổi thành điểm số, xếp loại đạt/trượt hay tự quyết định tiếp nhận.
 * - Tách biệt hoàn toàn khỏi khảo sát 16 tiêu chí TCI (Khối 1) và điểm các môn khảo sát đầu vào.
 */

export type ContentCategoryType =
  | "SUBJECT_SCORE"
  | "SUBJECT_RUBRIC"
  | "SUBJECT_CRITERIA"
  | "ORIENTATION_INTERVIEW";

export type ResultStatusCode =
  | "NOT_ENTERED"     // Chưa nhập kết quả (không tự biến thành 0 hoặc Không đạt)
  | "NOT_TAKEN"       // Không làm
  | "NOT_APPLICABLE"  // Không áp dụng
  | "EXEMPT"          // Được miễn (theo cấu hình/quy chế kiểm chứng)
  | "NOT_PASSED"      // Không đạt
  | "PASSED";         // Đạt

export const RESULT_STATUS_LABELS: Record<ResultStatusCode, string> = {
  NOT_ENTERED: "Chưa nhập kết quả",
  NOT_TAKEN: "Không làm",
  NOT_APPLICABLE: "Không áp dụng",
  EXEMPT: "Được miễn",
  NOT_PASSED: "Không đạt",
  PASSED: "Đạt",
};

export type PvdhTemplateCode =
  | "BM.KTĐBCL.31"
  | "BM.KTĐBCL.32"
  | "BM.KTĐBCL.33"
  | "BM.KTĐBCL.34"
  | "BM.KTĐBCL.35"
  | "BM.KTĐBCL.36"
  | "BM.KTĐBCL.37"
  | "BM.KTĐBCL.38"
  | "BM.KTĐBCL.39"
  | "BM.KTĐBCL.40"
  | "BM.KTĐBCL.41"
  | "BM.KTĐBCL.42"
  | "PVDH-01"
  | "PVDH-02"
  | "PVDH-03"
  | "PVDH-04"
  | "PVDH-05"
  | string;

export type PvdhGradeGroup =
  | "KHOI_1"
  | "KHOI_2"
  | "KHOI_3"
  | "KHOI_4"
  | "KHOI_5"
  | "KHOI_6"
  | "KHOI_7"
  | "KHOI_8"
  | "KHOI_9"
  | "KHOI_10"
  | "KHOI_11"
  | "KHOI_12"
  | "KHOI_2_3"
  | "KHOI_3_5"
  | "KHOI_4_5"
  | "KHOI_6_9"
  | "KHOI_7_9"
  | "KHOI_10_12";

export type PvdhSectionCode =
  | "I_GENERAL"
  | "II_STUDENT"
  | "III_TEACHER"
  | "IV_PARENT"
  | "V_ORIENTATION"
  | "C_PARENT_GRADE"
  | "D_TEACHER_SUMMARY";

export type PvdhFieldDataType =
  | "READONLY_PROFILE"
  | "TEXT"
  | "TEXTAREA"
  | "DATE"
  | "CHECKBOX_GROUP"
  | "RADIO_STATUS"
  | "BOOLEAN_CHECKBOX"
  | "ACTION_LIST"
  | "INTERVIEW_GROUP";

export type BmSheetStatusCode =
  | "HOAN_THANH"
  | "CAN_BO_SUNG_THONG_TIN"
  | "CAN_TRAO_DOI_CHUYEN_MON";

export const BM_SHEET_STATUS_OPTIONS: Array<{
  code: BmSheetStatusCode;
  label: string;
}> = [
  { code: "HOAN_THANH", label: "Hoàn thành" },
  { code: "CAN_BO_SUNG_THONG_TIN", label: "Cần bổ sung thông tin" },
  { code: "CAN_TRAO_DOI_CHUYEN_MON", label: "Cần trao đổi chuyên môn" },
];

export interface PvdhTeacherSummaryD {
  d01: string;
  d02: string;
  d03: string;
  d04: string;
  sheetStatus: BmSheetStatusCode | "";
  psychInterviewRequested: boolean;
  psychReferralNote?: string;
  psychAssignedTeacherId?: string;
  psychAssignedTeacherName?: string;
  psychAssignedTeacherEmail?: string;
  psychEmailSentAt?: string;
  psychEmailRecipients?: string[];
}

export type PvdhWorkflowStatus =
  | "DRAFT"
  | "PARTIAL_COMPLETED"
  | "COMPLETED"
  | "SUBMITTED"
  | "RETURNED"
  | "VERIFIED_LOCKED"
  | "REOPENED"
  | "HANDED_OVER";

export const PVDH_WORKFLOW_STATUS_LABELS: Record<
  PvdhWorkflowStatus,
  { label: string; shortLabel: string; iconType: "draft" | "partial" | "done" | "returned" | "locked" | "reopened" | "handover" }
> = {
  DRAFT: { label: "Bản nháp (Đang nhập)", shortLabel: "Bản nháp", iconType: "draft" },
  PARTIAL_COMPLETED: { label: "Đã hoàn tất 1 phần", shortLabel: "Hoàn tất 1 phần", iconType: "partial" },
  COMPLETED: { label: "Đã hoàn tất nhập phiếu", shortLabel: "Đã hoàn tất", iconType: "done" },
  SUBMITTED: { label: "Chờ kiểm tra / xác nhận", shortLabel: "Chờ kiểm tra", iconType: "done" },
  RETURNED: { label: "Trả lại yêu cầu bổ sung", shortLabel: "Cần bổ sung", iconType: "returned" },
  VERIFIED_LOCKED: { label: "Đã xác nhận & khóa phiếu", shortLabel: "Đã xác nhận", iconType: "locked" },
  REOPENED: { label: "Đã mở lại (Cần xác nhận lại)", shortLabel: "Đã mở lại", iconType: "reopened" },
  HANDED_OVER: { label: "Đã bàn giao cho GVCN", shortLabel: "Đã bàn giao", iconType: "handover" },
};

export type FurtherInquiryTopicCode =
  | "KHONG"
  | "HOC_TAP"
  | "TIENG_ANH"
  | "THICH_NGHI"
  | "TAM_LY_THEO_DE_NGHI"
  | "KHAC";

export const FURTHER_INQUIRY_OPTIONS: Array<{
  code: FurtherInquiryTopicCode;
  label: string;
  exclusive?: boolean;
}> = [
  { code: "KHONG", label: "Không", exclusive: true },
  { code: "HOC_TAP", label: "Học tập" },
  { code: "TIENG_ANH", label: "Tiếng Anh" },
  { code: "THICH_NGHI", label: "Thích nghi" },
  { code: "TAM_LY_THEO_DE_NGHI", label: "Trao đổi với bộ phận tâm lý theo đề nghị" },
  { code: "KHAC", label: "Khác" },
];

export interface PvdhVisibilityCondition {
  gradeIn?: string[];
  gradeEmphasisNote?: Record<string, string>;
  whenTopicIncludes?: FurtherInquiryTopicCode[];
  whenHasFollowUpOrInquiry?: boolean;
}

export interface PvdhFieldConfig {
  fieldKey: string;
  sectionCode: PvdhSectionCode;
  itemNumber?: number;
  label: string;
  promptQuestion?: string;
  guideline?: string;
  dataType: PvdhFieldDataType;
  sortOrder: number;
  requiredOnComplete: boolean;
  allowNotRecorded?: boolean;
  maxLength?: number;
  options?: Array<{ value: string; label: string }>;
  visibilityCondition?: PvdhVisibilityCondition | null;
  viewRoles: string[];   // ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"]
  editRoles: string[];   // ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "BOTH_INTERVIEWERS", "REVIEWER"]
  sensitivityTier: "SHARED" | "INTERNAL_HANDOVER" | "SENSITIVE_HEALTH_PSYCH";
  exportMappingKey: string;
}

export interface PvdhSectionConfig {
  sectionCode: PvdhSectionCode;
  romanNumeral: string;
  title: string;
  partNumber: 1 | 2;
  guideline?: string;
  footerNote?: string;
  sortOrder: number;
}

export interface PvdhExportLayoutConfig {
  paperSize: "A4";
  orientation: "PORTRAIT";
  layoutVariant?: "BM_KTDBCL_ABCD" | "PROPOSED_PVDH";
  formCodeBox?: string;
  ownerUnit?: string;
  headerSubtitle?: string;
  headerGuideLine?: string;
  internalFooterText?: string;
  part1Title: string;
  part1Subtitle: string;
  part2Title: string;
  part2Subtitle: string;
  purposeLine: string;
  privacyDisclaimer: string;
  showDraftBadgeWhenUnlocked: boolean;
  signatureColumns: Array<{
    key: "interviewer" | "parent" | "student" | string;
    title: string;
    subtitle: string;
  }>;
}

export interface PvdhSeedTemplateDefinition {
  code: PvdhTemplateCode;
  name: string;
  description: string;
  gradeGroup: PvdhGradeGroup;
  gradeDisplayLabel: string;
  grades: string[];
  priorityOrder: number;
  sections: PvdhSectionConfig[];
  fields: PvdhFieldConfig[];
  exportLayout: PvdhExportLayoutConfig;
}

export interface PvdhInterviewItemValue {
  responseText: string;
  notRecorded: boolean;
  notRecordedReason: string;
  updatedByUserId?: string;
  updatedByName?: string;
  updatedAt?: string;
}

export interface PvdhFollowUpActionItem {
  id: string;
  actionContent: string;
  owner: string;
  dueDate: string;
  progressIndicator: string;
}

export const COMMON_STUDENT_SECTION_GUIDELINE =
  "Câu hỏi gợi mở; linh hoạt theo độ tuổi. Ghi ý chính và ví dụ; nếu chưa có thông tin, ghi rõ chưa ghi nhận. Không quy đổi thành điểm.";

export const COMMON_PRIVACY_DISCLAIMER =
  "Thông tin sức khỏe/cá nhân cần hỗ trợ chỉ trao đổi với người có trách nhiệm. Nhận xét ở phiếu này là ghi nhận ban đầu, không phải chẩn đoán hay quyết định tiếp nhận.";

export const DEFAULT_SIGNATURE_COLUMNS: PvdhExportLayoutConfig["signatureColumns"] = [
  {
    key: "interviewer",
    title: "Người phỏng vấn",
    subtitle: "Ký và ghi rõ họ tên",
  },
  {
    key: "parent",
    title: "PHHS",
    subtitle: "Ký và ghi rõ họ tên",
  },
  {
    key: "student",
    title: "Học sinh nếu phù hợp",
    subtitle: "Ký hoặc ghi họ tên",
  },
];

function buildSectionsForTemplate(isGrade1: boolean): PvdhSectionConfig[] {
  return [
    {
      sectionCode: "I_GENERAL",
      romanNumeral: "I",
      title: "Thông tin chung",
      partNumber: 1,
      guideline: "Thông tin hồ sơ gốc được đồng bộ tự động từ hồ sơ khảo sát đầu vào.",
      sortOrder: 1,
    },
    {
      sectionCode: "II_STUDENT",
      romanNumeral: "II",
      title: "Trao đổi với học sinh",
      partNumber: 1,
      guideline: COMMON_STUDENT_SECTION_GUIDELINE,
      sortOrder: 2,
    },
    {
      sectionCode: "III_TEACHER",
      romanNumeral: "III",
      title: "Ghi nhận của người phỏng vấn",
      partNumber: 1,
      guideline: "Điểm mạnh/sở thích nổi bật; cách giao tiếp; mức độ tham gia và nhu cầu hỗ trợ:",
      footerNote: isGrade1
        ? "Nội dung này thực hiện riêng với phiếu khảo sát 16 tiêu chí; không dùng câu trả lời tại đây để thay kết quả khảo sát."
        : "Kết quả khảo sát môn học và Tiếng Anh vấn đáp được ghi tại biểu mẫu tương ứng; đối chiếu khi tổng hợp định hướng.",
      sortOrder: 3,
    },
    {
      sectionCode: "IV_PARENT",
      romanNumeral: "IV",
      title: "Hiểu học sinh qua góc nhìn PHHS",
      partNumber: 2,
      guideline: "Ghi nhận chia sẻ từ gia đình theo từng nhóm nội dung; chọn Chưa ghi nhận kèm lý do nếu chưa trao đổi được.",
      sortOrder: 4,
    },
    {
      sectionCode: "V_ORIENTATION",
      romanNumeral: "V",
      title: "Thống nhất định hướng và hỗ trợ",
      partNumber: 2,
      guideline: "Tổng hợp thống nhất ban đầu với HS, PHHS và nội dung bàn giao sau nhập học.",
      footerNote: COMMON_PRIVACY_DISCLAIMER,
      sortOrder: 5,
    },
  ];
}

export function buildFieldsForTemplate(params: {
  studentQuestions: Array<{
    num: number;
    label: string;
    prompt: string;
    visibilityCondition?: PvdhVisibilityCondition | null;
  }>;
  parentQuestions: Array<{
    num: number;
    label: string;
    prompt: string;
    sensitive?: boolean;
    visibilityCondition?: PvdhVisibilityCondition | null;
  }>;
}): PvdhFieldConfig[] {
  const fields: PvdhFieldConfig[] = [
    // I. Thông tin chung (Part 1 & Part 2 header fields)
    {
      fieldKey: "gen_student_name",
      sectionCode: "I_GENERAL",
      label: "Họ tên học sinh",
      dataType: "READONLY_PROFILE",
      sortOrder: 1,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.student.fullName",
    },
    {
      fieldKey: "gen_dob",
      sectionCode: "I_GENERAL",
      label: "Ngày sinh",
      dataType: "READONLY_PROFILE",
      sortOrder: 2,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.student.dateOfBirth",
    },
    {
      fieldKey: "gen_student_code",
      sectionCode: "I_GENERAL",
      label: "Mã hồ sơ",
      dataType: "READONLY_PROFILE",
      sortOrder: 3,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.student.studentCode",
    },
    {
      fieldKey: "gen_grade",
      sectionCode: "I_GENERAL",
      label: "Khối dự kiến",
      dataType: "READONLY_PROFILE",
      sortOrder: 4,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.student.grade",
    },
    {
      fieldKey: "gen_program",
      sectionCode: "I_GENERAL",
      label: "Hệ/chương trình",
      dataType: "READONLY_PROFILE",
      sortOrder: 5,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.student.program",
    },
    {
      fieldKey: "gen_current_school",
      sectionCode: "I_GENERAL",
      label: "Trường/lớp đang học",
      dataType: "READONLY_PROFILE",
      sortOrder: 6,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.student.oldSchoolClass",
    },
    {
      fieldKey: "gen_registered_campus",
      sectionCode: "I_GENERAL",
      label: "Cơ sở đăng ký",
      dataType: "READONLY_PROFILE",
      sortOrder: 7,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.student.registeredCampus",
    },
    {
      fieldKey: "gen_interview_date",
      sectionCode: "I_GENERAL",
      label: "Ngày phỏng vấn",
      dataType: "DATE",
      sortOrder: 8,
      requiredOnComplete: true,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.meta.interviewDate",
    },
    {
      fieldKey: "gen_interviewer_name",
      sectionCode: "I_GENERAL",
      label: "Người phỏng vấn",
      dataType: "READONLY_PROFILE",
      sortOrder: 9,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.meta.interviewerName",
    },
    {
      fieldKey: "gen_interviewer_title",
      sectionCode: "I_GENERAL",
      label: "Chức danh",
      dataType: "TEXT",
      sortOrder: 10,
      requiredOnComplete: false,
      maxLength: 120,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.meta.interviewerTitle",
    },
    {
      fieldKey: "gen_parent_name",
      sectionCode: "I_GENERAL",
      label: "Họ tên PHHS",
      dataType: "TEXT",
      sortOrder: 11,
      requiredOnComplete: true,
      maxLength: 150,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["PARENT_INTERVIEWER", "STUDENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.parent.fullName",
    },
    {
      fieldKey: "gen_parent_relationship",
      sectionCode: "I_GENERAL",
      label: "Quan hệ với HS",
      dataType: "TEXT",
      sortOrder: 12,
      requiredOnComplete: true,
      maxLength: 80,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["PARENT_INTERVIEWER", "STUDENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.parent.relationship",
    },
    {
      fieldKey: "gen_parent_contact",
      sectionCode: "I_GENERAL",
      label: "Điện thoại/kênh liên hệ",
      dataType: "TEXT",
      sortOrder: 13,
      requiredOnComplete: false,
      maxLength: 160,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["PARENT_INTERVIEWER", "STUDENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "INTERNAL_HANDOVER",
      exportMappingKey: "pvdh.parent.contactChannel",
    },
  ];

  // II. 6 nhóm câu hỏi học sinh
  params.studentQuestions.forEach((sq, idx) => {
    fields.push({
      fieldKey: `hs_q${sq.num}`,
      sectionCode: "II_STUDENT",
      itemNumber: sq.num,
      label: sq.label,
      promptQuestion: sq.prompt,
      guideline: "Ghi nhận trung thực ý chính, ví dụ từ chia sẻ của học sinh hoặc chọn Chưa ghi nhận kèm lý do.",
      dataType: "INTERVIEW_GROUP",
      sortOrder: 20 + idx,
      requiredOnComplete: true,
      allowNotRecorded: true,
      maxLength: 2000,
      visibilityCondition: sq.visibilityCondition || null,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: `pvdh.studentInterview.q${sq.num}`,
    });
  });

  // III. Ghi nhận của giáo viên (4 trường riêng, ghép vào Mục III khi xuất)
  const teacherObsFields: Array<{ key: string; label: string; guideline: string; exportKey: string }> = [
    {
      key: "obs_strengths_interests",
      label: "Điểm mạnh và sở thích nổi bật",
      guideline: "Mô tả quan sát thực tế về điểm mạnh, sự hứng thú nổi bật của học sinh trong buổi trao đổi.",
      exportKey: "pvdh.teacherObservation.strengthsInterests",
    },
    {
      key: "obs_communication_style",
      label: "Cách giao tiếp",
      guideline: "Mô tả cách diễn đạt, lắng nghe, tương tác với người phỏng vấn (không gán nhãn tính cách/chẩn đoán).",
      exportKey: "pvdh.teacherObservation.communicationStyle",
    },
    {
      key: "obs_participation_level",
      label: "Mức độ tham gia",
      guideline: "Mô tả sự hợp tác, chủ động, mức độ tập trung và phản hồi trong quá trình phỏng vấn.",
      exportKey: "pvdh.teacherObservation.participationLevel",
    },
    {
      key: "obs_support_needs",
      label: "Nhu cầu hỗ trợ ban đầu",
      guideline: "Ghi nhận nhu cầu hỗ trợ học tập, ngôn ngữ hoặc hòa nhập bước đầu từ góc nhìn giáo viên.",
      exportKey: "pvdh.teacherObservation.supportNeeds",
    },
  ];
  teacherObsFields.forEach((tf, idx) => {
    fields.push({
      fieldKey: tf.key,
      sectionCode: "III_TEACHER",
      itemNumber: idx + 1,
      label: tf.label,
      guideline: tf.guideline,
      dataType: "TEXTAREA",
      sortOrder: 40 + idx,
      requiredOnComplete: true,
      maxLength: 1500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "INTERNAL_HANDOVER",
      exportMappingKey: tf.exportKey,
    });
  });

  // IV. 5 nhóm trao đổi PHHS
  params.parentQuestions.forEach((pq, idx) => {
    fields.push({
      fieldKey: `ph_q${pq.num}`,
      sectionCode: "IV_PARENT",
      itemNumber: pq.num,
      label: pq.label,
      promptQuestion: pq.prompt,
      guideline: pq.sensitive
        ? "Thông tin sức khỏe/cá nhân cần hỗ trợ chỉ chia sẻ cho người có trách nhiệm."
        : "Ghi nhận ý kiến gia đình cung cấp hoặc chọn Chưa ghi nhận kèm lý do.",
      dataType: "INTERVIEW_GROUP",
      sortOrder: 60 + idx,
      requiredOnComplete: true,
      allowNotRecorded: true,
      maxLength: 2000,
      visibilityCondition: pq.visibilityCondition || null,
      viewRoles: pq.sensitive
        ? ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"]
        : ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: pq.sensitive ? "SENSITIVE_HEALTH_PSYCH" : "INTERNAL_HANDOVER",
      exportMappingKey: `pvdh.parentExchange.q${pq.num}`,
    });
  });

  // V. Thống nhất định hướng và hỗ trợ
  fields.push(
    {
      fieldKey: "plan_strengths_priority",
      sectionCode: "V_ORIENTATION",
      itemNumber: 1,
      label: "Điểm mạnh và nhu cầu ưu tiên của học sinh",
      dataType: "TEXTAREA",
      sortOrder: 80,
      requiredOnComplete: true,
      maxLength: 2000,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.orientationPlan.strengthsPriority",
    },
    {
      fieldKey: "plan_goals_actions",
      sectionCode: "V_ORIENTATION",
      itemNumber: 2,
      label: "Mục tiêu ban đầu và hành động thống nhất với HS, PHHS",
      guideline: "Có thể nhập trực tiếp hoặc thêm từ bảng hành động bên dưới (tự động đồng bộ sang mục 2 trên phiếu in, không cần nhập lặp).",
      dataType: "TEXTAREA",
      sortOrder: 81,
      requiredOnComplete: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.orientationPlan.goalsActions",
    },
    {
      fieldKey: "follow_up_actions",
      sectionCode: "V_ORIENTATION",
      label: "Danh sách hành động phối hợp chi tiết (tùy chọn, tự động ghép vào mục 2)",
      dataType: "ACTION_LIST",
      sortOrder: 82,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.orientationPlan.followUpActions",
    },
    {
      fieldKey: "plan_coordinator",
      sectionCode: "V_ORIENTATION",
      itemNumber: 3,
      label: "Người/bộ phận phối hợp",
      dataType: "TEXT",
      sortOrder: 83,
      requiredOnComplete: false,
      maxLength: 300,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "INTERNAL_HANDOVER",
      exportMappingKey: "pvdh.orientationPlan.coordinator",
    },
    {
      fieldKey: "plan_review_date",
      sectionCode: "V_ORIENTATION",
      label: "Mốc trao đổi lại",
      guideline: "Bắt buộc khi có hành động tiếp nối hoặc nội dung cần tìm hiểu thêm.",
      dataType: "DATE",
      sortOrder: 84,
      requiredOnComplete: false,
      visibilityCondition: { whenHasFollowUpOrInquiry: true },
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.orientationPlan.reviewDate",
    },
    {
      fieldKey: "plan_further_topics",
      sectionCode: "V_ORIENTATION",
      itemNumber: 4,
      label: "Nội dung cần tìm hiểu thêm",
      guideline: "Lựa chọn 'Không' loại trừ hoàn toàn với các nội dung cần tìm hiểu thêm khác.",
      dataType: "CHECKBOX_GROUP",
      sortOrder: 85,
      requiredOnComplete: true,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "INTERNAL_HANDOVER",
      exportMappingKey: "pvdh.orientationPlan.furtherTopics",
    },
    {
      fieldKey: "plan_further_other_text",
      sectionCode: "V_ORIENTATION",
      label: "Nội dung khác cần tìm hiểu thêm",
      dataType: "TEXT",
      sortOrder: 86,
      requiredOnComplete: false,
      maxLength: 500,
      visibilityCondition: { whenTopicIncludes: ["KHAC"] },
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "INTERNAL_HANDOVER",
      exportMappingKey: "pvdh.orientationPlan.furtherOtherText",
    },
    {
      fieldKey: "plan_referral_reason",
      sectionCode: "V_ORIENTATION",
      label: "Lý do đề nghị tìm hiểu thêm / phối hợp",
      dataType: "TEXTAREA",
      sortOrder: 87,
      requiredOnComplete: false,
      maxLength: 1000,
      visibilityCondition: {
        whenTopicIncludes: ["HOC_TAP", "TIENG_ANH", "THICH_NGHI", "TAM_LY_THEO_DE_NGHI", "KHAC"],
      },
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SENSITIVE_HEALTH_PSYCH",
      exportMappingKey: "pvdh.orientationPlan.referralReason",
    },
    {
      fieldKey: "plan_referral_receiver",
      sectionCode: "V_ORIENTATION",
      label: "Người / bộ phận tiếp nhận",
      dataType: "TEXT",
      sortOrder: 88,
      requiredOnComplete: false,
      maxLength: 300,
      visibilityCondition: {
        whenTopicIncludes: ["HOC_TAP", "TIENG_ANH", "THICH_NGHI", "TAM_LY_THEO_DE_NGHI", "KHAC"],
      },
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "INTERNAL_HANDOVER",
      exportMappingKey: "pvdh.orientationPlan.referralReceiver",
    },
    {
      fieldKey: "plan_handover_notes",
      sectionCode: "V_ORIENTATION",
      itemNumber: 5,
      label: "Nội dung bàn giao cho GVCN/bộ phận liên quan khi nhập học",
      dataType: "TEXTAREA",
      sortOrder: 89,
      requiredOnComplete: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "INTERNAL_HANDOVER",
      exportMappingKey: "pvdh.orientationPlan.handoverNotes",
    }
  );

  return fields;
}

const BM_COMMON_PARENT_B_QUESTIONS: Array<{ code: string; label: string; prompt: string }> = [
  {
    code: "b01",
    label: "B01. Đặc điểm cá nhân & cảm xúc.",
    prompt:
      "Ba từ mô tả con; điểm mạnh; điều con cần cải thiện. Con thường phản ứng thế nào khi gặp khó khăn, bị góp ý hoặc thất bại?",
  },
  {
    code: "b02",
    label: "B02. Quá trình học tập.",
    prompt:
      "Môn học/hoạt động con yêu thích và lĩnh vực cần hỗ trợ? Gia đình hoặc giáo viên đã áp dụng biện pháp hỗ trợ nào; hiệu quả?",
  },
  {
    code: "b03",
    label: "B03. Thói quen tại nhà.",
    prompt:
      "Con tự học, tự quản lý thời gian ở mức nào? Thói quen sinh hoạt, sử dụng thiết bị và hoạt động ngoài giờ ra sao?",
  },
  {
    code: "b04",
    label: "B04. Gia đình đồng hành.",
    prompt:
      "Gia đình thường theo dõi và hỗ trợ việc học thế nào? Khi kết quả chưa tốt, gia đình phản hồi ra sao; mong muốn trao đổi với trường theo cách nào?",
  },
  {
    code: "b05",
    label: "B05. Mục tiêu & kỳ vọng.",
    prompt:
      "Gia đình kỳ vọng điều gì nhất khi chọn Sky-Line? Ưu tiên phát triển kiến thức, tiếng Anh, kỹ năng, phẩm chất hay trải nghiệm nào?",
  },
];

function buildBmKtdbclSections(gradeNum: number): PvdhSectionConfig[] {
  return [
    {
      sectionCode: "I_GENERAL",
      romanNumeral: "",
      title: "Thông tin chung",
      partNumber: 1,
      sortOrder: 1,
      guideline:
        "Hướng dẫn: Hỏi mở, tôn trọng ý kiến HS/PHHS; ghi nhận nguồn thông tin, không tự quy đổi thành điểm xét tuyển.",
    },
    {
      sectionCode: "II_STUDENT",
      romanNumeral: "A",
      title: "A. PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH",
      partNumber: 1,
      sortOrder: 2,
      guideline:
        "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày. Với khối nhỏ, kết hợp trò chuyện và hoạt động đơn giản.",
    },
    {
      sectionCode: "IV_PARENT",
      romanNumeral: "B",
      title: "B. TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH",
      partNumber: 1,
      sortOrder: 3,
      guideline: "",
    },
    {
      sectionCode: "C_PARENT_GRADE",
      romanNumeral: "C",
      title: `C. CÂU HỎI PHÂN HÓA RIÊNG CHO KHỐI ${gradeNum} (PHỤ HUYNH)`,
      partNumber: 2,
      sortOrder: 4,
      guideline: "",
    },
    {
      sectionCode: "D_TEACHER_SUMMARY",
      romanNumeral: "D",
      title: "D. TỔNG HỢP VÀ ĐỊNH HƯỚNG CỦA GIÁO VIÊN",
      partNumber: 2,
      sortOrder: 5,
      guideline: "",
    },
  ];
}

function buildBmKtdbclFields(params: {
  studentQuestionsA: Array<{ code: string; label: string }>;
  parentQuestionsC: Array<{ code: string; label: string; prompt: string }>;
}): PvdhFieldConfig[] {
  const fields: PvdhFieldConfig[] = [
    // Thông tin chung — đúng 7 trường theo mẫu BM.KTĐBCL.31 / 32
    {
      fieldKey: "gen_student_name",
      label: "Họ và tên HS",
      sectionCode: "I_GENERAL",
      dataType: "READONLY_PROFILE",
      sortOrder: 1,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "student.fullName",
    },
    {
      fieldKey: "gen_program_system",
      label: "Hệ",
      sectionCode: "I_GENERAL",
      dataType: "READONLY_PROFILE",
      sortOrder: 2,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "student.programSystem",
    },
    {
      fieldKey: "gen_campus",
      label: "Cơ sở",
      sectionCode: "I_GENERAL",
      dataType: "READONLY_PROFILE",
      sortOrder: 3,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "student.campusName",
    },
    {
      fieldKey: "gen_academic_year",
      label: "Năm học",
      sectionCode: "I_GENERAL",
      dataType: "READONLY_PROFILE",
      sortOrder: 4,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: [],
      sensitivityTier: "SHARED",
      exportMappingKey: "student.academicYearName",
    },
    {
      fieldKey: "gen_interview_date",
      label: "Ngày phỏng vấn",
      sectionCode: "I_GENERAL",
      dataType: "DATE",
      sortOrder: 5,
      requiredOnComplete: true,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.interviewDate",
    },
    {
      fieldKey: "gen_parent_name",
      label: "Phụ huynh tham gia",
      sectionCode: "I_GENERAL",
      dataType: "TEXT",
      sortOrder: 6,
      requiredOnComplete: true,
      maxLength: 200,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.parentFullName",
    },
    {
      fieldKey: "gen_parent_relationship",
      label: "Quan hệ với HS",
      sectionCode: "I_GENERAL",
      dataType: "TEXT",
      sortOrder: 7,
      requiredOnComplete: true,
      maxLength: 100,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.parentRelationship",
    },
  ];

  // A. Phỏng vấn định hướng học sinh (A01..A06) — chỉ có câu hỏi đơn dòng theo đúng mẫu BM.KTĐBCL.31/32
  params.studentQuestionsA.forEach((q, idx) => {
    fields.push({
      fieldKey: q.code,
      label: q.label,
      sectionCode: "II_STUDENT",
      dataType: "INTERVIEW_GROUP",
      sortOrder: idx + 1,
      requiredOnComplete: true,
      allowNotRecorded: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: `pvdh.studentResponses.${q.code}`,
    });
  });

  // B. Trao đổi định hướng với phụ huynh (B01..B05)
  BM_COMMON_PARENT_B_QUESTIONS.forEach((q, idx) => {
    fields.push({
      fieldKey: q.code,
      label: q.label,
      promptQuestion: q.prompt,
      sectionCode: "IV_PARENT",
      dataType: "INTERVIEW_GROUP",
      sortOrder: idx + 1,
      requiredOnComplete: true,
      allowNotRecorded: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: `pvdh.parentResponses.${q.code}`,
    });
  });

  // C. Câu hỏi phân hóa riêng cho khối 1 / khối 2 (Phụ huynh) (C01..C05)
  params.parentQuestionsC.forEach((q, idx) => {
    fields.push({
      fieldKey: q.code,
      label: q.label,
      promptQuestion: q.prompt,
      sectionCode: "C_PARENT_GRADE",
      dataType: "INTERVIEW_GROUP",
      sortOrder: idx + 1,
      requiredOnComplete: true,
      allowNotRecorded: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: `pvdh.parentResponses.${q.code}`,
    });
  });

  // D. Tổng hợp và định hướng của giáo viên (D01..D04 + Trạng thái phiếu + Đề nghị phỏng vấn tâm lí)
  fields.push(
    {
      fieldKey: "d01",
      label: "D01. Điểm mạnh nổi bật của HS (nguồn HS / PHHS / quan sát)",
      sectionCode: "D_TEACHER_SUMMARY",
      dataType: "TEXTAREA",
      sortOrder: 1,
      requiredOnComplete: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.teacherSummary.d01",
    },
    {
      fieldKey: "d02",
      label: "D02. Khó khăn, nhu cầu hỗ trợ và nội dung cần xác minh",
      sectionCode: "D_TEACHER_SUMMARY",
      dataType: "TEXTAREA",
      sortOrder: 2,
      requiredOnComplete: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.teacherSummary.d02",
    },
    {
      fieldKey: "d03",
      label: "D03. Kỳ vọng của HS và gia đình (tương đồng / khác biệt)",
      sectionCode: "D_TEACHER_SUMMARY",
      dataType: "TEXTAREA",
      sortOrder: 3,
      requiredOnComplete: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.teacherSummary.d03",
    },
    {
      fieldKey: "d04",
      label: "D04. Định hướng giáo dục, phối hợp và bước tiếp theo",
      sectionCode: "D_TEACHER_SUMMARY",
      dataType: "TEXTAREA",
      sortOrder: 4,
      requiredOnComplete: true,
      maxLength: 2500,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.teacherSummary.d04",
    },
    {
      fieldKey: "sheet_status",
      label: "Trạng thái phiếu",
      sectionCode: "D_TEACHER_SUMMARY",
      dataType: "RADIO_STATUS",
      sortOrder: 5,
      requiredOnComplete: true,
      options: BM_SHEET_STATUS_OPTIONS.map((o) => ({ value: o.code, label: o.label })),
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SHARED",
      exportMappingKey: "pvdh.teacherSummary.sheetStatus",
    },
    {
      fieldKey: "psych_interview_requested",
      label: "Đề nghị phỏng vấn (tâm lí)",
      sectionCode: "D_TEACHER_SUMMARY",
      dataType: "BOOLEAN_CHECKBOX",
      sortOrder: 6,
      requiredOnComplete: false,
      viewRoles: ["ALL_ASSIGNED", "REVIEWER", "GVCN", "ADMIN"],
      editRoles: ["STUDENT_INTERVIEWER", "PARENT_INTERVIEWER", "REVIEWER"],
      sensitivityTier: "SENSITIVE_HEALTH_PSYCH",
      exportMappingKey: "pvdh.teacherSummary.psychInterviewRequested",
    }
  );

  return fields;
}

function createBmKtdbclSeedTemplate(params: {
  gradeNum: number;
  code: PvdhTemplateCode;
  studentQuestionsA: Array<{ code: string; label: string }>;
  parentQuestionsC: Array<{ code: string; label: string; prompt: string }>;
}): PvdhSeedTemplateDefinition {
  const g = params.gradeNum;
  return {
    code: params.code,
    name: `Phiếu phỏng vấn định hướng học sinh và trao đổi với phụ huynh (Dành cho khối ${g})`,
    description: `Biểu mẫu ${params.code} của Ban Khảo thí & Đảm bảo chất lượng — Phiếu phỏng vấn định hướng học sinh và trao đổi với phụ huynh dành cho khối ${g}.`,
    gradeGroup: `KHOI_${g}` as PvdhGradeGroup,
    gradeDisplayLabel: `KHỐI ${g}`,
    grades: [String(g)],
    priorityOrder: 100,
    sections: buildBmKtdbclSections(g),
    fields: buildBmKtdbclFields({
      studentQuestionsA: params.studentQuestionsA,
      parentQuestionsC: params.parentQuestionsC,
    }),
    exportLayout: {
      paperSize: "A4",
      orientation: "PORTRAIT",
      layoutVariant: "BM_KTDBCL_ABCD",
      formCodeBox: params.code,
      ownerUnit: "Ban Khảo thí & Đảm bảo chất lượng",
      headerSubtitle: `(Dành cho khối ${g})`,
      headerGuideLine:
        "Hướng dẫn: Hỏi mở, tôn trọng ý kiến HS/PHHS; ghi nhận nguồn thông tin, không tự quy đổi thành điểm xét tuyển.",
      internalFooterText: "SSM Sky-Line | Phiếu lưu hành nội bộ",
      part1Title: "PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ TRAO ĐỔI VỚI PHỤ HUYNH",
      part1Subtitle: `(Dành cho khối ${g})`,
      part2Title: "PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ TRAO ĐỔI VỚI PHỤ HUYNH",
      part2Subtitle: `(Dành cho khối ${g})`,
      purposeLine:
        "Hướng dẫn: Hỏi mở, tôn trọng ý kiến HS/PHHS; ghi nhận nguồn thông tin, không tự quy đổi thành điểm xét tuyển.",
      privacyDisclaimer: "SSM Sky-Line | Phiếu lưu hành nội bộ",
      showDraftBadgeWhenUnlocked: false,
      signatureColumns: [
        {
          key: "TEACHER_EXECUTOR",
          title: "Giáo viên thực hiện",
          subtitle: "(Kí và ghi rõ họ tên)",
        },
      ],
    },
  };
}

export const PVDH_SEED_TEMPLATES: PvdhSeedTemplateDefinition[] = [
  // 1. BM.KTĐBCL.31: KHỐI 1
  createBmKtdbclSeedTemplate({
    gradeNum: 1,
    code: "BM.KTĐBCL.31",
    studentQuestionsA: [
      { code: "a01", label: "A01. Con thích chơi hoặc làm hoạt động gì nhất?" },
      { code: "a02", label: "A02. Con đã tự làm được những việc gì?" },
      { code: "a03", label: "A03. Khi gặp việc khó, con thường làm gì?" },
      { code: "a04", label: "A04. Con làm quen với bạn mới thế nào?" },
      { code: "a05", label: "A05. Điều gì khiến con vui hoặc lo khi đến trường?" },
      { code: "a06", label: "A06. Con mong được làm gì ở Sky-Line?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Khả năng thích nghi:",
        prompt: "Con phản ứng thế nào khi xa bố mẹ, gặp thầy cô hoặc bạn mới?",
      },
      {
        code: "c02",
        label: "C02. Sẵn sàng vào lớp 1:",
        prompt: "Con có thể tự phục vụ, nghe hướng dẫn, tập trung vào một hoạt động ra sao?",
      },
      {
        code: "c03",
        label: "C03. Tiền đọc viết & số học:",
        prompt: "Con thích kể chuyện, nhận diện chữ/số, đếm và quan sát như thế nào?",
      },
      {
        code: "c04",
        label: "C04. Nếp sinh hoạt:",
        prompt: "Giấc ngủ, ăn uống, đi vệ sinh, tự chuẩn bị đồ dùng có cần hỗ trợ?",
      },
      {
        code: "c05",
        label: "C05. Giao tiếp & phối hợp:",
        prompt: "Con diễn đạt nhu cầu, chờ lượt và chia sẻ với bạn thế nào?",
      },
    ],
  }),

  // 2. BM.KTĐBCL.32: KHỐI 2
  createBmKtdbclSeedTemplate({
    gradeNum: 2,
    code: "BM.KTĐBCL.32",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em thích môn học hoặc hoạt động nào?" },
      { code: "a02", label: "A02. Khi gặp bài đọc hoặc toán khó, em làm gì?" },
      { code: "a03", label: "A03. Em tự chuẩn bị đồ dùng học tập như thế nào?" },
      { code: "a04", label: "A04. Khi làm bài sai, em thường làm gì?" },
      { code: "a05", label: "A05. Em làm gì khi muốn chơi với bạn mới?" },
      { code: "a06", label: "A06. Em muốn học thêm điều gì ở trường mới?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Thích nghi với học tập:",
        prompt: "Con làm quen việc đọc, viết và bài tập về nhà ở lớp 1 như thế nào?",
      },
      {
        code: "c02",
        label: "C02. Đọc hiểu & toán cơ bản:",
        prompt: "Con tự đọc yêu cầu và giải bài toán ở mức nào?",
      },
      {
        code: "c03",
        label: "C03. Tính tự giác:",
        prompt: "Con có tự chuẩn bị sách vở và hoàn thành việc học không?",
      },
      {
        code: "c04",
        label: "C04. Tiếng Anh:",
        prompt: "Con thích học từ vựng, nghe nói hay hoạt động nào bằng tiếng Anh?",
      },
      {
        code: "c05",
        label: "C05. Kỳ vọng:",
        prompt: "Gia đình mong con cải thiện thói quen hay năng lực nào ở lớp 2?",
      },
    ],
  }),

  // 3. BM.KTĐBCL.33: KHỐI 3
  createBmKtdbclSeedTemplate({
    gradeNum: 3,
    code: "BM.KTĐBCL.33",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em thích khám phá điều gì ngoài giờ học?" },
      { code: "a02", label: "A02. Khi chưa hiểu bài, em tìm cách nào để hiểu?" },
      { code: "a03", label: "A03. Em tự hoàn thành bài tập hằng ngày thế nào?" },
      { code: "a04", label: "A04. Khi làm việc nhóm, em thường nhận nhiệm vụ gì?" },
      { code: "a05", label: "A05. Em giải quyết bất đồng với bạn thế nào?" },
      { code: "a06", label: "A06. Em mong muốn cải thiện điều gì ở bản thân?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Đọc hiểu:",
        prompt: "Con có thể đọc, kể lại và giải thích một nội dung đã học không?",
      },
      {
        code: "c02",
        label: "C02. Tư duy toán:",
        prompt: "Con xử lý bài toán có lời văn, trình bày cách làm ra sao?",
      },
      {
        code: "c03",
        label: "C03. Hợp tác:",
        prompt: "Con làm việc nhóm, nhờ giúp đỡ hoặc hỗ trợ bạn thế nào?",
      },
      {
        code: "c04",
        label: "C04. Tự học:",
        prompt: "Con có cần nhắc thường xuyên để bắt đầu và hoàn thành bài?",
      },
      {
        code: "c05",
        label: "C05. Mục tiêu:",
        prompt: "Gia đình mong con phát triển điểm mạnh nào trong năm tới?",
      },
    ],
  }),

  // 4. BM.KTĐBCL.34: KHỐI 4
  createBmKtdbclSeedTemplate({
    gradeNum: 4,
    code: "BM.KTĐBCL.34",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em tự hào nhất về khả năng nào của mình?" },
      { code: "a02", label: "A02. Em sắp xếp việc học khi có nhiều bài tập ra sao?" },
      { code: "a03", label: "A03. Em giải quyết một vấn đề chưa biết cách làm thế nào?" },
      { code: "a04", label: "A04. Em thường chủ động đặt câu hỏi khi nào?" },
      { code: "a05", label: "A05. Em làm gì nếu bất đồng với bạn?" },
      { code: "a06", label: "A06. Em muốn tham gia hoạt động nào tại Sky-Line?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Tự quản lý:",
        prompt: "Con có tự sắp xếp lịch học, đồ dùng và nhiệm vụ của mình không?",
      },
      {
        code: "c02",
        label: "C02. Đọc & trình bày:",
        prompt: "Con đọc hiểu, diễn đạt ý tưởng và viết đoạn văn như thế nào?",
      },
      {
        code: "c03",
        label: "C03. Toán & giải quyết vấn đề:",
        prompt: "Con có biết giải thích lý do chọn cách giải không?",
      },
      {
        code: "c04",
        label: "C04. Ngoại ngữ:",
        prompt: "Mức độ tự tin giao tiếp tiếng Anh và kinh nghiệm học hiện có?",
      },
      {
        code: "c05",
        label: "C05. Trách nhiệm:",
        prompt: "Con nhận và hoàn thành trách nhiệm ở nhà thế nào?",
      },
    ],
  }),

  // 5. BM.KTĐBCL.35: KHỐI 5
  createBmKtdbclSeedTemplate({
    gradeNum: 5,
    code: "BM.KTĐBCL.35",
    studentQuestionsA: [
      { code: "a01", label: "A01. Môn học nào là thế mạnh của em?" },
      { code: "a02", label: "A02. Em đã tự lập kế hoạch ôn tập ra sao?" },
      { code: "a03", label: "A03. Em dự đoán điều gì thay đổi khi lên THCS?" },
      { code: "a04", label: "A04. Khi gặp khó khăn em sẽ nhờ ai hỗ trợ?" },
      { code: "a05", label: "A05. Em xử lý mâu thuẫn với bạn thế nào?" },
      { code: "a06", label: "A06. Em kỳ vọng điều gì ở môi trường mới?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Chuẩn bị chuyển cấp:",
        prompt: "Con có mong đợi hay lo lắng gì về môi trường THCS?",
      },
      {
        code: "c02",
        label: "C02. Học tập độc lập:",
        prompt: "Con tự ghi chép, ôn tập và lên kế hoạch kiểm tra ra sao?",
      },
      {
        code: "c03",
        label: "C03. Quan hệ bạn bè:",
        prompt: "Con xử lý mâu thuẫn, xây dựng tình bạn và tìm kiếm hỗ trợ thế nào?",
      },
      {
        code: "c04",
        label: "C04. Tiếng Anh:",
        prompt: "Gia đình kỳ vọng kỹ năng giao tiếp, học thuật hoặc chứng chỉ nào?",
      },
      {
        code: "c05",
        label: "C05. Định hướng:",
        prompt: "Những hỗ trợ con cần để chuyển cấp tự tin?",
      },
    ],
  }),

  // 6. BM.KTĐBCL.36: KHỐI 6
  createBmKtdbclSeedTemplate({
    gradeNum: 6,
    code: "BM.KTĐBCL.36",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em nghĩ thế nào về việc học nhiều môn và giáo viên?" },
      { code: "a02", label: "A02. Em theo dõi bài tập và lịch kiểm tra thế nào?" },
      { code: "a03", label: "A03. Khi không hiểu bài em chủ động giải quyết ra sao?" },
      { code: "a04", label: "A04. Em có dễ kết bạn khi chuyển môi trường không?" },
      { code: "a05", label: "A05. Điều gì khiến em lo lắng khi học THCS?" },
      { code: "a06", label: "A06. Em mong đạt được mục tiêu gì năm học này?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Thích nghi THCS:",
        prompt: "Con phản ứng thế nào với nhiều môn học, giáo viên và thời khóa biểu mới?",
      },
      {
        code: "c02",
        label: "C02. Tự học & tổ chức:",
        prompt: "Con ghi bài, chuẩn bị bài và theo dõi hạn nộp như thế nào?",
      },
      {
        code: "c03",
        label: "C03. Cảm xúc & bạn bè:",
        prompt: "Con thích nghi với nhóm bạn mới và xử lý xung đột ra sao?",
      },
      {
        code: "c04",
        label: "C04. Ngoại ngữ & hệ học:",
        prompt: "Gia đình kỳ vọng lộ trình tiếng Anh/hệ Song ngữ như thế nào?",
      },
      {
        code: "c05",
        label: "C05. Hỗ trợ chuyển cấp:",
        prompt: "Gia đình muốn GVCN lưu ý điều gì trong học kỳ đầu THCS?",
      },
    ],
  }),

  // 7. BM.KTĐBCL.37: KHỐI 7
  createBmKtdbclSeedTemplate({
    gradeNum: 7,
    code: "BM.KTĐBCL.37",
    studentQuestionsA: [
      { code: "a01", label: "A01. Điều gì tạo động lực học tập cho em?" },
      { code: "a02", label: "A02. Em phản ứng thế nào trước bài khó hoặc điểm thấp?" },
      { code: "a03", label: "A03. Em tự phân bổ thời gian học và dùng thiết bị thế nào?" },
      { code: "a04", label: "A04. Em đã từng chủ động giải quyết vấn đề nào?" },
      { code: "a05", label: "A05. Em xử lý bất đồng với bạn ra sao?" },
      { code: "a06", label: "A06. Em mong nhà trường hỗ trợ điều gì?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Động lực:",
        prompt: "Con thích những môn học nào và điều gì thúc đẩy con học?",
      },
      {
        code: "c02",
        label: "C02. Thói quen số:",
        prompt: "Con sử dụng mạng, thiết bị và tự điều chỉnh thời gian thế nào?",
      },
      {
        code: "c03",
        label: "C03. Tự quản lý:",
        prompt: "Con có kế hoạch học tập và chịu trách nhiệm với kết quả không?",
      },
      {
        code: "c04",
        label: "C04. Quan hệ xã hội:",
        prompt: "Con giao tiếp, hợp tác và giải quyết bất đồng với bạn thế nào?",
      },
      {
        code: "c05",
        label: "C05. Phát triển năng lực:",
        prompt: "Gia đình muốn con tăng cường năng lực/kỹ năng nào?",
      },
    ],
  }),

  // 8. BM.KTĐBCL.38: KHỐI 8
  createBmKtdbclSeedTemplate({
    gradeNum: 8,
    code: "BM.KTĐBCL.38",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em có thể kể một khó khăn đã tự giải quyết?" },
      { code: "a02", label: "A02. Em đặt mục tiêu và theo dõi tiến bộ thế nào?" },
      { code: "a03", label: "A03. Em muốn tìm hiểu sâu lĩnh vực nào?" },
      { code: "a04", label: "A04. Em làm gì khi gặp áp lực học tập?" },
      { code: "a05", label: "A05. Khi ý kiến khác nhau, em trao đổi thế nào?" },
      { code: "a06", label: "A06. Em muốn phát triển phẩm chất, kỹ năng nào?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Áp lực học tập:",
        prompt: "Khi gặp kiểm tra hoặc bài khó, con thường ứng phó ra sao?",
      },
      {
        code: "c02",
        label: "C02. Mục tiêu cá nhân:",
        prompt: "Con đã biết đặt mục tiêu học tập và theo dõi tiến bộ chưa?",
      },
      {
        code: "c03",
        label: "C03. Cảm xúc & giao tiếp:",
        prompt: "Con có chủ động chia sẻ khó khăn với người lớn tin cậy không?",
      },
      {
        code: "c04",
        label: "C04. Ngoại ngữ:",
        prompt: "Kỹ năng tiếng Anh nào cần được ưu tiên hỗ trợ?",
      },
      {
        code: "c05",
        label: "C05. Sở thích:",
        prompt: "Con có dự án, câu lạc bộ hoặc năng khiếu muốn theo đuổi?",
      },
    ],
  }),

  // 9. BM.KTĐBCL.39: KHỐI 9
  createBmKtdbclSeedTemplate({
    gradeNum: 9,
    code: "BM.KTĐBCL.39",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em đã có mục tiêu học THPT như thế nào?" },
      { code: "a02", label: "A02. Đâu là môn học mạnh và môn cần cải thiện?" },
      { code: "a03", label: "A03. Em lên kế hoạch ôn tập thế nào?" },
      { code: "a04", label: "A04. Em ứng phó với áp lực kiểm tra ra sao?" },
      { code: "a05", label: "A05. Em chủ động tìm sự hỗ trợ khi cần thế nào?" },
      { code: "a06", label: "A06. Em kỳ vọng điều gì tại Sky-Line?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Định hướng lên THPT:",
        prompt: "Con có quan tâm lựa chọn hệ học, tổ hợp hoặc môi trường THPT?",
      },
      {
        code: "c02",
        label: "C02. Chuẩn bị kỳ thi:",
        prompt: "Con quản lý lịch ôn tập và áp lực đánh giá cuối cấp thế nào?",
      },
      {
        code: "c03",
        label: "C03. Điểm mạnh học thuật:",
        prompt: "Môn học nào nổi trội; môn nào cần kế hoạch củng cố?",
      },
      {
        code: "c04",
        label: "C04. Kỹ năng quyết định:",
        prompt: "Con tham gia như thế nào vào quyết định về lộ trình học?",
      },
      {
        code: "c05",
        label: "C05. Tiếng Anh & định hướng:",
        prompt: "Gia đình mong muốn mục tiêu ngoại ngữ trong 2–3 năm tới?",
      },
    ],
  }),

  // 10. BM.KTĐBCL.40: KHỐI 10
  createBmKtdbclSeedTemplate({
    gradeNum: 10,
    code: "BM.KTĐBCL.40",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em quan tâm môn học hoặc lĩnh vực nào nhất?" },
      { code: "a02", label: "A02. Em có căn cứ gì khi lựa chọn môn học?" },
      { code: "a03", label: "A03. Em tự tìm kiếm tài liệu để giải quyết vấn đề ra sao?" },
      { code: "a04", label: "A04. Em dự kiến quản lý khối lượng học THPT thế nào?" },
      { code: "a05", label: "A05. Em quan tâm chứng chỉ ngoại ngữ hoặc trải nghiệm nào?" },
      { code: "a06", label: "A06. Em mong muốn phát triển bản thân ra sao trong ba năm tới?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Thích nghi THPT:",
        prompt: "Con có khó khăn khi thay đổi yêu cầu học tập, bạn bè, thầy cô?",
      },
      {
        code: "c02",
        label: "C02. Lựa chọn học tập:",
        prompt: "Điểm mạnh và sở thích của con phù hợp nhóm môn nào?",
      },
      {
        code: "c03",
        label: "C03. Tự chủ:",
        prompt: "Con biết cân đối học tập, hoạt động và nghỉ ngơi không?",
      },
      {
        code: "c04",
        label: "C04. Ngoại ngữ:",
        prompt: "Con có định hướng IELTS, chứng chỉ khác hoặc học chương trình quốc tế?",
      },
      {
        code: "c05",
        label: "C05. Định hướng nghề:",
        prompt: "Con đã hình dung lĩnh vực nghề nghiệp quan tâm chưa?",
      },
    ],
  }),

  // 11. BM.KTĐBCL.41: KHỐI 11
  createBmKtdbclSeedTemplate({
    gradeNum: 11,
    code: "BM.KTĐBCL.41",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em quan tâm ngành nghề nào và vì sao?" },
      { code: "a02", label: "A02. Em đã tìm hiểu yêu cầu đầu vào trường/ngành mục tiêu chưa?" },
      { code: "a03", label: "A03. Em xây dựng kế hoạch kết quả học và ngoại ngữ ra sao?" },
      { code: "a04", label: "A04. Khi kết quả không như mong đợi em điều chỉnh thế nào?" },
      { code: "a05", label: "A05. Em tham gia ra quyết định về tương lai của mình thế nào?" },
      { code: "a06", label: "A06. Em mong được tư vấn hướng nghiệp nội dung gì?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Lộ trình cuối cấp:",
        prompt: "Con có mục tiêu học tập hoặc ngành nghề ban đầu không?",
      },
      {
        code: "c02",
        label: "C02. Hiệu quả học tập:",
        prompt: "Con có phương pháp ôn tập và đánh giá tiến bộ từng môn không?",
      },
      {
        code: "c03",
        label: "C03. Áp lực & sức khỏe tinh thần:",
        prompt: "Con ứng phó với kỳ vọng, áp lực thi cử ra sao?",
      },
      {
        code: "c04",
        label: "C04. Chứng chỉ & tiếng Anh:",
        prompt: "Gia đình dự kiến chứng chỉ ngoại ngữ, mốc thời gian nào?",
      },
      {
        code: "c05",
        label: "C05. Hướng nghiệp:",
        prompt: "Con cần hoạt động trải nghiệm hoặc tư vấn nghề nào?",
      },
    ],
  }),

  // 12. BM.KTĐBCL.42: KHỐI 12
  createBmKtdbclSeedTemplate({
    gradeNum: 12,
    code: "BM.KTĐBCL.42",
    studentQuestionsA: [
      { code: "a01", label: "A01. Em xác định mục tiêu sau THPT như thế nào?" },
      { code: "a02", label: "A02. Em dựa vào yếu tố nào để chọn ngành/trường?" },
      { code: "a03", label: "A03. Kế hoạch xét tuyển, học tập và chứng chỉ của em là gì?" },
      { code: "a04", label: "A04. Nếu chưa đạt nguyện vọng ban đầu, em có phương án khác không?" },
      { code: "a05", label: "A05. Em tự đánh giá kỹ năng nào cần cải thiện trước đại học?" },
      { code: "a06", label: "A06. Em mong nhà trường hỗ trợ điều gì trong năm cuối cấp?" },
    ],
    parentQuestionsC: [
      {
        code: "c01",
        label: "C01. Mục tiêu sau THPT:",
        prompt: "Con ưu tiên đại học, chương trình quốc tế, học nghề hay lựa chọn khác?",
      },
      {
        code: "c02",
        label: "C02. Phương án tuyển sinh:",
        prompt: "Gia đình đã trao đổi về ngành học, trường, phương thức xét tuyển?",
      },
      {
        code: "c03",
        label: "C03. Tự quản lý áp lực:",
        prompt: "Con quản lý tiến độ ôn thi, nghỉ ngơi và cảm xúc thế nào?",
      },
      {
        code: "c04",
        label: "C04. Ngoại ngữ & hồ sơ:",
        prompt: "Có mục tiêu chứng chỉ, hồ sơ du học hoặc điều kiện đầu vào nào?",
      },
      {
        code: "c05",
        label: "C05. Kế hoạch dự phòng:",
        prompt: "Gia đình và học sinh đã chuẩn bị phương án thay thế chưa?",
      },
    ],
  }),
];

/**
 * Chuẩn hóa chuỗi Khối về số "1".."12" (nếu là K-12)
 */
export function normalizeK12GradeNumber(rawGrade: unknown): string {
  const s = String(rawGrade ?? "")
    .trim()
    .replace(/^khối\s*/i, "")
    .replace(/^khoi\s*/i, "")
    .replace(/^lớp\s*/i, "")
    .replace(/^lop\s*/i, "")
    .replace(/^k(?=\d)/i, "")
    .trim();
  const match = s.match(/^(1[0-2]|[1-9])(?:\b|[._/A-Za-z])/);
  return match ? match[1] : s;
}

/**
 * Xác định mã mẫu BM.KTĐBCL mặc định cho Khối 1..12 (BM.KTĐBCL.31 -> BM.KTĐBCL.42)
 */
export function getDefaultPvdhCodeForGrade(rawGrade: unknown): PvdhTemplateCode | null {
  const g = Number(normalizeK12GradeNumber(rawGrade));
  if (!Number.isInteger(g) || g < 1 || g > 12) return null;
  return `BM.KTĐBCL.${30 + g}`;
}

/**
 * Kiểm tra xem cấu hình phiếu có thuộc định dạng chuẩn BM.KTĐBCL.31 / BM.KTĐBCL.32 (A, B, C, D) không
 */
export function isBmKtdbclTemplate(params: {
  exportLayout?: Partial<PvdhExportLayoutConfig> | null;
  sections?: PvdhSectionConfig[] | null;
  fields?: PvdhFieldConfig[] | null;
  templateCode?: string | null;
}): boolean {
  if (params.exportLayout?.layoutVariant === "BM_KTDBCL_ABCD") return true;
  const code = String(params.templateCode || "").toUpperCase();
  if (code.startsWith("BM.KTĐBCL.") || code.startsWith("BM.KTDBCL.")) return true;
  if (params.sections?.some((s) => s.sectionCode === "C_PARENT_GRADE" || s.sectionCode === "D_TEACHER_SUMMARY")) {
    return true;
  }
  if (params.fields?.some((f) => f.sectionCode === "C_PARENT_GRADE" || f.sectionCode === "D_TEACHER_SUMMARY")) {
    return true;
  }
  return false;
}

/**
 * Phân loại rõ Môn khảo sát vs Nội dung phỏng vấn định hướng trong danh mục AssessmentSubject
 */
export function classifyAssessmentContentCategory(subject: {
  code?: string | null;
  name?: string | null;
  subjectType?: string | null;
  contentCategory?: string | null;
}): ContentCategoryType {
  const explicit = String(subject?.contentCategory || "").toUpperCase().trim();
  if (
    explicit === "ORIENTATION_INTERVIEW" ||
    explicit === "SUBJECT_CRITERIA" ||
    explicit === "SUBJECT_RUBRIC" ||
    explicit === "SUBJECT_SCORE"
  ) {
    return explicit as ContentCategoryType;
  }

  const code = String(subject?.code || "").toUpperCase().trim();
  const name = String(subject?.name || "").toLowerCase().normalize("NFC");
  const stype = String(subject?.subjectType || "").toLowerCase().normalize("NFC");

  if (
    code === "PDHDV" ||
    code === "PVDH" ||
    code.startsWith("PVDH-") ||
    code.startsWith("BM.KTĐBCL.") ||
    code.startsWith("BM.KTDBCL.") ||
    stype.includes("định hướng") ||
    name.includes("định hướng") ||
    name.includes("phỏng vấn định hướng")
  ) {
    return "ORIENTATION_INTERVIEW";
  }

  if (
    code === "TCI" ||
    code.includes("CPT") ||
    stype.includes("tiêu chí") ||
    name.includes("chuẩn phát triển")
  ) {
    return "SUBJECT_CRITERIA";
  }

  if (stype.includes("rubric")) {
    return "SUBJECT_RUBRIC";
  }

  return "SUBJECT_SCORE";
}

/**
 * Định dạng danh sách hành động tiếp nối thành văn bản đồng bộ vào mục V.2 của phiếu gốc
 */
export function formatFollowUpActionsToText(actions: PvdhFollowUpActionItem[]): string {
  const valid = (actions || []).filter((a) => String(a?.actionContent || "").trim() !== "");
  if (valid.length === 0) return "";
  return valid
    .map((a, idx) => {
      const parts = [`${idx + 1}. ${a.actionContent.trim()}`];
      if (a.owner?.trim()) parts.push(`Phụ trách: ${a.owner.trim()}`);
      if (a.dueDate?.trim()) parts.push(`Thời hạn: ${a.dueDate.trim()}`);
      if (a.progressIndicator?.trim()) parts.push(`Cách nhận biết tiến bộ: ${a.progressIndicator.trim()}`);
      return parts.join(" | ");
    })
    .join("\n");
}
