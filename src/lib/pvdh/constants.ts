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

export type PvdhTemplateCode = "PVDH-01" | "PVDH-02" | "PVDH-03" | "PVDH-04" | "PVDH-05";

export type PvdhGradeGroup =
  | "KHOI_1"
  | "KHOI_2_3"
  | "KHOI_4_5"
  | "KHOI_6_9"
  | "KHOI_10_12";

export type PvdhSectionCode =
  | "I_GENERAL"
  | "II_STUDENT"
  | "III_TEACHER"
  | "IV_PARENT"
  | "V_ORIENTATION";

export type PvdhFieldDataType =
  | "READONLY_PROFILE"
  | "TEXT"
  | "TEXTAREA"
  | "DATE"
  | "CHECKBOX_GROUP"
  | "ACTION_LIST"
  | "INTERVIEW_GROUP";

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
  part1Title: string;
  part1Subtitle: string;
  part2Title: string;
  part2Subtitle: string;
  purposeLine: string;
  privacyDisclaimer: string;
  showDraftBadgeWhenUnlocked: boolean;
  signatureColumns: Array<{
    key: "interviewer" | "parent" | "student";
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

function buildFieldsForTemplate(params: {
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

export const PVDH_SEED_TEMPLATES: PvdhSeedTemplateDefinition[] = [
  // 1. PVDH-01: KHỐI 1
  {
    code: "PVDH-01",
    name: "Phiếu phỏng vấn định hướng HS và PHHS – Khối 1",
    description:
      "Mẫu đề xuất phục vụ triển khai phỏng vấn định hướng học sinh và trao đổi PHHS dự tuyển Khối 1 (thực hiện độc lập với khảo sát 16 tiêu chí TCI).",
    gradeGroup: "KHOI_1",
    gradeDisplayLabel: "KHỐI 1",
    grades: ["1"],
    priorityOrder: 100,
    sections: buildSectionsForTemplate(true),
    fields: buildFieldsForTemplate({
      studentQuestions: [
        {
          num: 1,
          label: "Làm quen và giao tiếp",
          prompt: "Con tên gì? Con thích được gọi là gì? Con thích chơi cùng ai?",
        },
        {
          num: 2,
          label: "Cảm xúc khi đến trường",
          prompt: "Con mong được làm gì ở trường mới? Khi nhớ bố mẹ hoặc buồn, con muốn ai giúp?",
        },
        {
          num: 3,
          label: "Tự phục vụ",
          prompt: "Con tự làm được những việc gì khi ăn, mặc, đi vệ sinh và sắp xếp đồ dùng?",
        },
        {
          num: 4,
          label: "Sở thích và cách tham gia",
          prompt: "Con thích nghe kể chuyện, vẽ, xếp hình hay vận động? Con kể về một hoạt động con thích nhé.",
        },
        {
          num: 5,
          label: "Giao tiếp và tìm kiếm hỗ trợ",
          prompt: "Nếu chưa hiểu lời cô hoặc gặp khó khăn với bạn, con sẽ làm gì?",
        },
        {
          num: 6,
          label: "Mong muốn của học sinh",
          prompt: "Con muốn cô giáo và bố mẹ giúp con điều gì khi vào lớp 1?",
        },
      ],
      parentQuestions: [
        {
          num: 1,
          label: "Quá trình học và thích nghi",
          prompt: "Trẻ đã học mầm non ở đâu? Khi thay đổi môi trường hoặc xa người thân, trẻ thường phản ứng thế nào?",
        },
        {
          num: 2,
          label: "Nếp sinh hoạt và tự phục vụ",
          prompt: "Giờ ăn ngủ, khả năng tự phục vụ, đi vệ sinh và những việc gia đình đang hỗ trợ trẻ?",
        },
        {
          num: 3,
          label: "Sức khỏe và nhu cầu hỗ trợ",
          prompt: "Thông tin sức khỏe, dị ứng, ăn uống hoặc nhu cầu hỗ trợ nào nhà trường cần biết để chăm sóc trẻ?",
          sensitive: true,
        },
        {
          num: 4,
          label: "Hiểu trẻ qua gia đình",
          prompt: "Điểm mạnh, sở thích, điều khiến trẻ lo lắng và cách gia đình thường giúp trẻ bình tĩnh?",
        },
        {
          num: 5,
          label: "Kỳ vọng và phối hợp",
          prompt: "Gia đình mong trẻ tiến bộ điều gì trong giai đoạn đầu? Có thể phối hợp rèn nếp và trao đổi với giáo viên thế nào?",
        },
      ],
    }),
    exportLayout: {
      paperSize: "A4",
      orientation: "PORTRAIT",
      part1Title: "PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ PHỤ HUYNH HỌC SINH",
      part1Subtitle: "KHỐI 1   •   Mẫu PVDH 01   •   Phần 1 trên 2",
      part2Title: "TRAO ĐỔI VỚI PHỤ HUYNH VÀ ĐỊNH HƯỚNG",
      part2Subtitle: "KHỐI 1   •   Mẫu PVDH 01   •   Phần 2 trên 2",
      purposeLine: "Mục đích: tìm hiểu học sinh, ghi nhận kỳ vọng gia đình và xác định nội dung cần hỗ trợ khi nhập học.",
      privacyDisclaimer: COMMON_PRIVACY_DISCLAIMER,
      showDraftBadgeWhenUnlocked: true,
      signatureColumns: DEFAULT_SIGNATURE_COLUMNS,
    },
  },

  // 2. PVDH-02: KHỐI 2 VÀ 3
  {
    code: "PVDH-02",
    name: "Phiếu phỏng vấn định hướng HS và PHHS – Khối 2 và 3",
    description:
      "Mẫu đề xuất phục vụ triển khai phỏng vấn định hướng học sinh và trao đổi PHHS dự tuyển Khối 2 và Khối 3.",
    gradeGroup: "KHOI_2_3",
    gradeDisplayLabel: "KHỐI 2 VÀ 3",
    grades: ["2", "3"],
    priorityOrder: 100,
    sections: buildSectionsForTemplate(false),
    fields: buildFieldsForTemplate({
      studentQuestions: [
        {
          num: 1,
          label: "Trải nghiệm học tập",
          prompt: "Con thích điều gì ở lớp hiện tại? Điều gì khiến con thấy khó hoặc chưa vui?",
        },
        {
          num: 2,
          label: "Điểm mạnh và hứng thú",
          prompt: "Con thích môn học hoặc hoạt động nào? Kể một việc con làm được và thấy vui.",
        },
        {
          num: 3,
          label: "Thói quen học tập",
          prompt: "Ở nhà con chuẩn bị bài và đồ dùng thế nào? Khi chưa hiểu bài, con thường nhờ ai?",
        },
        {
          num: 4,
          label: "Bạn bè và cảm xúc",
          prompt: "Khi bất đồng với bạn hoặc làm bài chưa tốt, con thường làm gì? Ai có thể giúp con?",
        },
        {
          num: 5,
          label: "Tự lập và tham gia",
          prompt: "Con tự làm được những việc gì? Con muốn tham gia hoạt động nào ở trường mới?",
        },
        {
          num: 6,
          label: "Mục tiêu gần",
          prompt: "Nếu đến trường mới, con muốn làm tốt hơn điều gì? Con muốn thầy cô giúp như thế nào?",
        },
      ],
      parentQuestions: [
        {
          num: 1,
          label: "Lịch sử học tập",
          prompt: "Trường/lớp đang học, lý do chuyển trường và những thay đổi trong việc học gần đây?",
        },
        {
          num: 2,
          label: "Năng lực và thói quen",
          prompt: "Con thuận lợi hoặc cần hỗ trợ ở nội dung nào của Toán, Tiếng Việt và Tiếng Anh? Căn cứ từ bài học hoặc nhận xét nào?",
        },
        {
          num: 3,
          label: "Nếp sinh hoạt và sử dụng thiết bị",
          prompt: "Khả năng tự học, tự phục vụ, thời gian nghỉ ngơi và cách gia đình quản lý thiết bị số?",
        },
        {
          num: 4,
          label: "Sức khỏe và quan hệ",
          prompt: "Thông tin sức khỏe, cảm xúc, quan hệ bạn bè hoặc nhu cầu hỗ trợ mà gia đình muốn nhà trường lưu ý?",
          sensitive: true,
        },
        {
          num: 5,
          label: "Kỳ vọng và phối hợp",
          prompt: "Ưu tiên tiến bộ của con là gì? Gia đình có thể đồng hành bằng việc cụ thể nào?",
        },
      ],
    }),
    exportLayout: {
      paperSize: "A4",
      orientation: "PORTRAIT",
      part1Title: "PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ PHỤ HUYNH HỌC SINH",
      part1Subtitle: "KHỐI 2 VÀ 3   •   Mẫu PVDH 02   •   Phần 1 trên 2",
      part2Title: "TRAO ĐỔI VỚI PHỤ HUYNH VÀ ĐỊNH HƯỚNG",
      part2Subtitle: "KHỐI 2 VÀ 3   •   Mẫu PVDH 02   •   Phần 2 trên 2",
      purposeLine: "Mục đích: tìm hiểu học sinh, ghi nhận kỳ vọng gia đình và xác định nội dung cần hỗ trợ khi nhập học.",
      privacyDisclaimer: COMMON_PRIVACY_DISCLAIMER,
      showDraftBadgeWhenUnlocked: true,
      signatureColumns: DEFAULT_SIGNATURE_COLUMNS,
    },
  },

  // 3. PVDH-03: KHỐI 4 VÀ 5
  {
    code: "PVDH-03",
    name: "Phiếu phỏng vấn định hướng HS và PHHS – Khối 4 và 5",
    description:
      "Mẫu đề xuất phục vụ triển khai phỏng vấn định hướng học sinh và trao đổi PHHS dự tuyển Khối 4 và Khối 5.",
    gradeGroup: "KHOI_4_5",
    gradeDisplayLabel: "KHỐI 4 VÀ 5",
    grades: ["4", "5"],
    priorityOrder: 100,
    sections: buildSectionsForTemplate(false),
    fields: buildFieldsForTemplate({
      studentQuestions: [
        {
          num: 1,
          label: "Nhìn lại việc học",
          prompt: "Em thấy mình làm tốt môn hoặc hoạt động nào? Nội dung nào em cần được hỗ trợ? Hãy nêu ví dụ.",
        },
        {
          num: 2,
          label: "Cách học và tự quản",
          prompt: "Em sắp xếp việc học, chuẩn bị bài và kiểm tra kết quả ra sao? Khi bài khó, em thử cách nào?",
        },
        {
          num: 3,
          label: "Hợp tác và trách nhiệm",
          prompt: "Kể một lần em làm việc nhóm. Em đảm nhận việc gì và xử lý bất đồng thế nào?",
        },
        {
          num: 4,
          label: "Cảm xúc và an toàn",
          prompt: "Khi áp lực hoặc gặp điều khiến em không thoải mái ở trường hay trên mạng, em thường tìm ai hỗ trợ?",
        },
        {
          num: 5,
          label: "Sở thích và chuyển tiếp",
          prompt: "Em muốn tham gia hoạt động nào? Em mong đợi hoặc lo lắng điều gì khi học ở trường mới, lên THCS?",
        },
        {
          num: 6,
          label: "Mục tiêu phát triển",
          prompt: "Em muốn cải thiện điều gì trong học kỳ tới? Em có thể bắt đầu bằng việc nào và cần ai giúp?",
        },
      ],
      parentQuestions: [
        {
          num: 1,
          label: "Quá trình học tập",
          prompt: "Lịch sử học tập, lý do chuyển trường và các thay đổi đáng chú ý về kết quả hoặc thái độ học?",
        },
        {
          num: 2,
          label: "Điểm mạnh và khoảng trống",
          prompt: "Gia đình nhận thấy điểm mạnh, nội dung cần củng cố và mức độ tự học của con như thế nào?",
        },
        {
          num: 3,
          label: "Quan hệ và phát triển cá nhân",
          prompt: "Con thích nghi với bạn bè, quy tắc, phản hồi và thay đổi ra sao? Cách hỗ trợ nào thường có hiệu quả?",
        },
        {
          num: 4,
          label: "Sức khỏe và sinh hoạt",
          prompt: "Thông tin sức khỏe, cảm xúc, giấc ngủ hoặc sử dụng thiết bị số nào cần lưu ý?",
          sensitive: true,
        },
        {
          num: 5,
          label: "Kỳ vọng và chuyển tiếp",
          prompt: "Gia đình ưu tiên điều gì cho giai đoạn cuối tiểu học/chuyển cấp? Thống nhất cách đồng hành thế nào?",
        },
      ],
    }),
    exportLayout: {
      paperSize: "A4",
      orientation: "PORTRAIT",
      part1Title: "PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ PHỤ HUYNH HỌC SINH",
      part1Subtitle: "KHỐI 4 VÀ 5   •   Mẫu PVDH 03   •   Phần 1 trên 2",
      part2Title: "TRAO ĐỔI VỚI PHỤ HUYNH VÀ ĐỊNH HƯỚNG",
      part2Subtitle: "KHỐI 4 VÀ 5   •   Mẫu PVDH 03   •   Phần 2 trên 2",
      purposeLine: "Mục đích: tìm hiểu học sinh, ghi nhận kỳ vọng gia đình và xác định nội dung cần hỗ trợ khi nhập học.",
      privacyDisclaimer: COMMON_PRIVACY_DISCLAIMER,
      showDraftBadgeWhenUnlocked: true,
      signatureColumns: DEFAULT_SIGNATURE_COLUMNS,
    },
  },

  // 4. PVDH-04: KHỐI 6 ĐẾN 9
  {
    code: "PVDH-04",
    name: "Phiếu phỏng vấn định hướng HS và PHHS – Khối 6 đến 9",
    description:
      "Mẫu đề xuất phục vụ triển khai phỏng vấn định hướng học sinh và trao đổi PHHS dự tuyển THCS (Khối 6, 7, 8, 9; có nhấn mạnh định hướng sau THCS cho Khối 9).",
    gradeGroup: "KHOI_6_9",
    gradeDisplayLabel: "KHỐI 6 ĐẾN 9",
    grades: ["6", "7", "8", "9"],
    priorityOrder: 100,
    sections: buildSectionsForTemplate(false),
    fields: buildFieldsForTemplate({
      studentQuestions: [
        {
          num: 1,
          label: "Tự đánh giá học tập",
          prompt: "Em đánh giá điểm mạnh và khó khăn học tập của mình thế nào? Nêu ví dụ từ môn học hoặc kết quả gần đây.",
        },
        {
          num: 2,
          label: "Phương pháp và tự quản",
          prompt: "Em lập kế hoạch học, ôn tập và điều chỉnh sau bài kiểm tra như thế nào? Điều gì thường cản trở em?",
        },
        {
          num: 3,
          label: "Động lực và môi trường mới",
          prompt: "Vì sao em muốn học tại trường? Em mong môi trường mới giúp mình phát triển điều gì?",
        },
        {
          num: 4,
          label: "Quan hệ và cảm xúc",
          prompt: "Khi căng thẳng hoặc bất đồng với bạn, thầy cô, gia đình, em thường xử lý và tìm hỗ trợ ra sao?",
        },
        {
          num: 5,
          label: "Sở thích và hướng phát triển",
          prompt: "Em muốn khám phá lĩnh vực, câu lạc bộ hay hoạt động nào? Với khối 9, em đang nghĩ gì về hướng học sau THCS?",
          visibilityCondition: {
            gradeEmphasisNote: {
              "6": "Trọng tâm Khối 6–8: Tìm hiểu lĩnh vực, câu lạc bộ hoặc hoạt động học sinh muốn khám phá.",
              "7": "Trọng tâm Khối 6–8: Tìm hiểu lĩnh vực, câu lạc bộ hoặc hoạt động học sinh muốn khám phá.",
              "8": "Trọng tâm Khối 6–8: Tìm hiểu lĩnh vực, câu lạc bộ hoặc hoạt động học sinh muốn khám phá.",
              "9": "Trọng tâm chuyển cấp Khối 9: Bổ sung trao đổi sâu về dự định hướng học / tổ hợp môn sau THCS.",
            },
          },
        },
        {
          num: 6,
          label: "Mục tiêu và đồng hành",
          prompt: "Chọn một mục tiêu học kỳ tới: em sẽ làm gì, nhận biết tiến bộ bằng cách nào và cần hỗ trợ gì?",
        },
      ],
      parentQuestions: [
        {
          num: 1,
          label: "Lịch sử và động lực chuyển trường",
          prompt: "Quá trình học, lý do chuyển trường, mong muốn của gia đình và mức độ đồng thuận của học sinh?",
        },
        {
          num: 2,
          label: "Học tập và tự chủ",
          prompt: "Điểm mạnh, môn cần hỗ trợ, khả năng tự học và phản ứng của con trước áp lực học tập?",
        },
        {
          num: 3,
          label: "Giao tiếp và quan hệ",
          prompt: "Gia đình nhận thấy con thích nghi, kết bạn và trao đổi khó khăn thế nào? Cách phối hợp nào phù hợp với con?",
        },
        {
          num: 4,
          label: "Sức khỏe và sinh hoạt",
          prompt: "Thông tin sức khỏe, cảm xúc, giấc ngủ, thiết bị số hoặc hỗ trợ đã có cần bàn giao cho trường?",
          sensitive: true,
        },
        {
          num: 5,
          label: "Kỳ vọng và hướng học",
          prompt: "Ưu tiên phát triển của gia đình; với khối 9, dự kiến hướng học sau THCS và cách hỗ trợ lựa chọn của con?",
          visibilityCondition: {
            gradeEmphasisNote: {
              "9": "Trọng tâm chuyển cấp Khối 9: Trao đổi rõ dự kiến hướng học sau THCS và cách gia đình hỗ trợ lựa chọn của con.",
            },
          },
        },
      ],
    }),
    exportLayout: {
      paperSize: "A4",
      orientation: "PORTRAIT",
      part1Title: "PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ PHỤ HUYNH HỌC SINH",
      part1Subtitle: "KHỐI 6 ĐẾN 9   •   Mẫu PVDH 04   •   Phần 1 trên 2",
      part2Title: "TRAO ĐỔI VỚI PHỤ HUYNH VÀ ĐỊNH HƯỚNG",
      part2Subtitle: "KHỐI 6 ĐẾN 9   •   Mẫu PVDH 04   •   Phần 2 trên 2",
      purposeLine: "Mục đích: tìm hiểu học sinh, ghi nhận kỳ vọng gia đình và xác định nội dung cần hỗ trợ khi nhập học.",
      privacyDisclaimer: COMMON_PRIVACY_DISCLAIMER,
      showDraftBadgeWhenUnlocked: true,
      signatureColumns: DEFAULT_SIGNATURE_COLUMNS,
    },
  },

  // 5. PVDH-05: KHỐI 10 ĐẾN 12
  {
    code: "PVDH-05",
    name: "Phiếu phỏng vấn định hướng HS và PHHS – Khối 10 đến 12",
    description:
      "Mẫu đề xuất phục vụ triển khai phỏng vấn định hướng học sinh và trao đổi PHHS dự tuyển THPT (Khối 10, 11, 12).",
    gradeGroup: "KHOI_10_12",
    gradeDisplayLabel: "KHỐI 10 ĐẾN 12",
    grades: ["10", "11", "12"],
    priorityOrder: 100,
    sections: buildSectionsForTemplate(false),
    fields: buildFieldsForTemplate({
      studentQuestions: [
        {
          num: 1,
          label: "Hồ sơ học tập và thế mạnh",
          prompt: "Em có thế mạnh, kết quả hoặc trải nghiệm học tập nổi bật nào? Nội dung nào đang cần củng cố?",
        },
        {
          num: 2,
          label: "Động lực và lựa chọn",
          prompt: "Vì sao em lựa chọn trường/chương trình này? Điều gì khiến em hứng thú hoặc còn băn khoăn?",
        },
        {
          num: 3,
          label: "Phương pháp và tiến độ",
          prompt: "Em quản lý thời gian, tự học và theo dõi mục tiêu ra sao? Em điều chỉnh thế nào khi kết quả chưa như mong muốn?",
        },
        {
          num: 4,
          label: "Định hướng sau THPT",
          prompt: "Em đang quan tâm ngành, nghề hoặc hướng học nào? Đã tìm hiểu và trải nghiệm gì? Nếu chưa rõ, em muốn khám phá điều gì?",
        },
        {
          num: 5,
          label: "Cảm xúc và nguồn hỗ trợ",
          prompt: "Khi áp lực học tập hoặc gặp khó khăn trong quan hệ, em thường làm gì? Em mong người lớn hỗ trợ theo cách nào?",
        },
        {
          num: 6,
          label: "Mục tiêu và kế hoạch",
          prompt: "Mục tiêu ưu tiên trong học kỳ tới là gì? Nêu hành động, mốc kiểm tra tiến bộ và hỗ trợ em cần.",
        },
      ],
      parentQuestions: [
        {
          num: 1,
          label: "Quá trình học và lựa chọn",
          prompt: "Lịch sử học tập, lý do chuyển trường, chương trình dự kiến và mức độ thống nhất với học sinh?",
        },
        {
          num: 2,
          label: "Năng lực và thói quen",
          prompt: "Nhận định của gia đình về thế mạnh, nội dung cần củng cố và khả năng tự chủ của con?",
        },
        {
          num: 3,
          label: "Định hướng tương lai",
          prompt: "Kỳ vọng về hướng học, ngành nghề hoặc môi trường học sau THPT? Điểm thống nhất và khác biệt với mong muốn của con?",
        },
        {
          num: 4,
          label: "Sức khỏe và áp lực",
          prompt: "Thông tin sức khỏe, cảm xúc, sinh hoạt hoặc hỗ trợ đã có nào cần lưu ý khi đồng hành với con?",
          sensitive: true,
        },
        {
          num: 5,
          label: "Điều kiện và phối hợp",
          prompt: "Gia đình có thể hỗ trợ mục tiêu của con thế nào? Cần tư vấn thêm nội dung nào và thống nhất kênh trao đổi ra sao?",
        },
      ],
    }),
    exportLayout: {
      paperSize: "A4",
      orientation: "PORTRAIT",
      part1Title: "PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ PHỤ HUYNH HỌC SINH",
      part1Subtitle: "KHỐI 10 ĐẾN 12   •   Mẫu PVDH 05   •   Phần 1 trên 2",
      part2Title: "TRAO ĐỔI VỚI PHỤ HUYNH VÀ ĐỊNH HƯỚNG",
      part2Subtitle: "KHỐI 10 ĐẾN 12   •   Mẫu PVDH 05   •   Phần 2 trên 2",
      purposeLine: "Mục đích: tìm hiểu học sinh, ghi nhận kỳ vọng gia đình và xác định nội dung cần hỗ trợ khi nhập học.",
      privacyDisclaimer: COMMON_PRIVACY_DISCLAIMER,
      showDraftBadgeWhenUnlocked: true,
      signatureColumns: DEFAULT_SIGNATURE_COLUMNS,
    },
  },
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
 * Xác định mã mẫu PVDH mặc định cho Khối 1..12
 */
export function getDefaultPvdhCodeForGrade(rawGrade: unknown): PvdhTemplateCode | null {
  const g = Number(normalizeK12GradeNumber(rawGrade));
  if (!Number.isInteger(g) || g < 1 || g > 12) return null;
  if (g === 1) return "PVDH-01";
  if (g === 2 || g === 3) return "PVDH-02";
  if (g === 4 || g === 5) return "PVDH-03";
  if (g >= 6 && g <= 9) return "PVDH-04";
  return "PVDH-05";
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
