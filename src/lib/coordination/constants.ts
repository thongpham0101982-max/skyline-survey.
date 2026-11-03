export interface TopicDefinition {
  code: string;
  order: number;
  label: string;
  description: string;
  defaultPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  suggestsCase: boolean;
}

export const COORDINATION_TOPICS: TopicDefinition[] = [
  {
    code: 'KET_QUA_HOC_TAP',
    order: 1,
    label: 'Kết quả học tập',
    description: 'Trao đổi về điểm số, đánh giá định kỳ và năng lực môn học',
    defaultPriority: 'NORMAL',
    suggestsCase: false,
  },
  {
    code: 'BAI_TAP_KIEM_TRA',
    order: 2,
    label: 'Bài tập và kiểm tra',
    description: 'Thông tin bài tập về nhà, lịch kiểm tra, hướng dẫn ôn tập',
    defaultPriority: 'NORMAL',
    suggestsCase: false,
  },
  {
    code: 'TIEN_DO_HOC_TAP',
    order: 3,
    label: 'Tiến độ học tập',
    description: 'Theo dõi sự tiến bộ, chuyên cần và mức độ tập trung trên lớp',
    defaultPriority: 'NORMAL',
    suggestsCase: false,
  },
  {
    code: 'DE_NGHI_HO_TRO',
    order: 4,
    label: 'Đề nghị hỗ trợ học sinh',
    description: 'Đề xuất kế hoạch phụ đạo, bồi dưỡng hoặc hỗ trợ tâm lý - học tập',
    defaultPriority: 'HIGH',
    suggestsCase: true,
  },
  {
    code: 'PHOI_HOP_GIAO_DUC',
    order: 5,
    label: 'Phối hợp giáo dục',
    description: 'Phối hợp giữa Gia đình - GVCN - GVBM về nền nếp, kỹ năng, rèn luyện',
    defaultPriority: 'NORMAL',
    suggestsCase: true,
  },
  {
    code: 'GOP_Y_PHAN_ANH',
    order: 6,
    label: 'Góp ý hoặc phản ánh',
    description: 'Ý kiến đóng góp, phản ánh về chất lượng giảng dạy và dịch vụ giáo dục',
    defaultPriority: 'HIGH',
    suggestsCase: true,
  },
  {
    code: 'NOI_DUNG_KHAC',
    order: 7,
    label: 'Nội dung khác',
    description: 'Các trao đổi chung khác trong phạm vi lớp học và môn học',
    defaultPriority: 'LOW',
    suggestsCase: false,
  },
];

export const THREAD_STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  NEW: { label: 'Mới', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  READ: { label: 'Đã đọc', badgeClass: 'bg-sky-100 text-sky-800 border-sky-200' },
  IN_DISCUSSION: { label: 'Đang trao đổi', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200' },
  ARCHIVED: { label: 'Đã lưu trữ', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const CASE_STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  NEW: { label: 'Mới tiếp nhận', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  ASSIGNED: { label: 'Đã phân công', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  IN_PROGRESS: { label: 'Đang xử lý', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  WAITING_INFO: { label: 'Chờ thông tin', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  RESOLVED: { label: 'Đã có kết quả', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200' },
  COMPLETED: { label: 'Hoàn tất', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  REOPENED: { label: 'Mở lại', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; slaBusinessHours: number; badgeClass: string }> = {
  LOW: { label: 'Thấp', slaBusinessHours: 24, badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  NORMAL: { label: 'Bình thường', slaBusinessHours: 16, badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  HIGH: { label: 'Cao', slaBusinessHours: 8, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  URGENT: { label: 'Khẩn cấp', slaBusinessHours: 4, badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export const NPS_SUPPLEMENTARY_CRITERIA = [
  { key: 'criteriaCommunication', label: 'Chất lượng trao đổi' },
  { key: 'criteriaTimeliness', label: 'Mức độ kịp thời' },
  { key: 'criteriaClarity', label: 'Sự rõ ràng của thông tin' },
  { key: 'criteriaSupport', label: 'Mức độ đồng hành, hỗ trợ' },
  { key: 'criteriaCoordination', label: 'Hiệu quả phối hợp giáo dục' },
] as const;

export const MIN_NPS_SAMPLE_SIZE = 5;

export const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.docx',
  '.xlsx',
]);

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface AttachmentValidationInput {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
}

export function validateAttachmentMeta(att: AttachmentValidationInput): { valid: boolean; reason?: string } {
  if (!att.fileName || typeof att.fileName !== 'string') {
    return { valid: false, reason: 'Tên tệp đính kèm không hợp lệ.' };
  }
  const lowerName = att.fileName.trim().toLowerCase();
  const dotIdx = lowerName.lastIndexOf('.');
  const ext = dotIdx >= 0 ? lowerName.slice(dotIdx) : '';

  // Block double extensions or executable scripts
  if (/\.(exe|bat|cmd|sh|js|vbs|ps1|php|html|svg)$/i.test(lowerName)) {
    return { valid: false, reason: 'Định dạng tệp có nguy cơ mất an toàn bảo mật.' };
  }

  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext) && !ALLOWED_ATTACHMENT_TYPES.has(att.fileType)) {
    return {
      valid: false,
      reason: 'Chỉ hỗ trợ tệp PDF, hình ảnh (JPG, PNG, WEBP), Word (DOCX) hoặc Excel (XLSX).',
    };
  }

  if (typeof att.fileSize !== 'number' || att.fileSize <= 0) {
    return { valid: false, reason: 'Dung lượng tệp không hợp lệ.' };
  }

  if (att.fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
    return { valid: false, reason: 'Dung lượng tệp vượt quá giới hạn tối đa 5MB.' };
  }

  return { valid: true };
}

/**
 * Tính thời hạn SLA theo giờ làm việc hành chính của trường:
 * - Thứ Hai đến Thứ Sáu: 07:30 – 17:00 (trừ nghỉ trưa 11:30 – 13:30 => 7.5 giờ làm việc/ngày)
 * - Thứ Bảy: 07:30 – 11:30 (4 giờ làm việc)
 * - Chủ Nhật & ngoài giờ hành chính: Không tính vào SLA (không yêu cầu giáo viên phản hồi 24/7).
 */
export function calculateBusinessHoursSlaDue(startDate: Date, targetBusinessHours: number): Date {
  let remainingMinutes = Math.max(1, Math.round(targetBusinessHours * 60));
  const cursor = new Date(startDate.getTime());

  const getWindowsForDay = (d: Date): Array<[number, number]> => {
    const day = d.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0) return [];
    if (day === 6) {
      return [[7 * 60 + 30, 11 * 60 + 30]]; // 07:30 - 11:30
    }
    return [
      [7 * 60 + 30, 11 * 60 + 30], // 07:30 - 11:30
      [13 * 60 + 30, 17 * 60 + 0], // 13:30 - 17:00
    ];
  };

  let safetyDays = 0;
  while (remainingMinutes > 0 && safetyDays < 120) {
    const windows = getWindowsForDay(cursor);
    const currentMinOfDay = cursor.getHours() * 60 + cursor.getMinutes();

    for (const [winStart, winEnd] of windows) {
      if (currentMinOfDay >= winEnd) continue;
      const effectiveStart = Math.max(currentMinOfDay, winStart);
      const availableInWindow = winEnd - effectiveStart;

      if (remainingMinutes <= availableInWindow) {
        const result = new Date(cursor.getTime());
        const targetMinOfDay = effectiveStart + remainingMinutes;
        result.setHours(Math.floor(targetMinOfDay / 60), targetMinOfDay % 60, 0, 0);
        return result;
      } else {
        remainingMinutes -= availableInWindow;
      }
    }

    // Move to next day at 07:30
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(7, 30, 0, 0);
    safetyDays++;
  }

  return cursor;
}

/**
 * Tính số giờ làm việc thực tế đã trôi qua giữa 2 mốc thời gian
 */
export function calculateBusinessHoursElapsed(startDate: Date, endDate: Date): number {
  if (endDate <= startDate) return 0;
  let totalMinutes = 0;
  const cursor = new Date(startDate.getTime());

  const getWindowsForDay = (d: Date): Array<[number, number]> => {
    const day = d.getDay();
    if (day === 0) return [];
    if (day === 6) return [[7 * 60 + 30, 11 * 60 + 30]];
    return [
      [7 * 60 + 30, 11 * 60 + 30],
      [13 * 60 + 30, 17 * 60 + 0],
    ];
  };

  let safetyDays = 0;
  while (cursor < endDate && safetyDays < 365) {
    const sameDayEnd =
      cursor.getFullYear() === endDate.getFullYear() &&
      cursor.getMonth() === endDate.getMonth() &&
      cursor.getDate() === endDate.getDate();

    const startMin = cursor.getHours() * 60 + cursor.getMinutes();
    const endMin = sameDayEnd ? endDate.getHours() * 60 + endDate.getMinutes() : 24 * 60;

    for (const [winStart, winEnd] of getWindowsForDay(cursor)) {
      const s = Math.max(startMin, winStart);
      const e = Math.min(endMin, winEnd);
      if (e > s) totalMinutes += e - s;
    }

    if (sameDayEnd) break;
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
    safetyDays++;
  }

  return Number((totalMinutes / 60).toFixed(2));
}

export function classifyNpsScore(score: number): 'PROMOTER' | 'PASSIVE' | 'DETRACTOR' {
  if (score >= 9) return 'PROMOTER';
  if (score >= 7) return 'PASSIVE';
  return 'DETRACTOR';
}

export interface RawNpsResponseItem {
  npsScore: number;
  criteriaCommunication: number;
  criteriaTimeliness: number;
  criteriaClarity: number;
  criteriaSupport: number;
  criteriaCoordination: number;
}

export interface NpsCalculationResult {
  totalResponses: number;
  minSampleSize: number;
  isEligibleToPublish: boolean;
  promotersCount: number;
  passivesCount: number;
  detractorsCount: number;
  promotersPct: number | null;
  passivesPct: number | null;
  detractorsPct: number | null;
  npsScore: number | null;
  criteriaAverages: {
    communication: number | null;
    timeliness: number | null;
    clarity: number | null;
    support: number | null;
    coordination: number | null;
    overallSatisfaction: number | null;
  };
}

/**
 * Tính toán NPS chuẩn từ toàn bộ phản hồi gốc hợp lệ:
 * NPS = %Promoters (9-10) - %Detractors (0-6)
 * Tuyệt đối không lấy trung bình cộng điểm NPS của các lớp.
 * Khi số mẫu < minSampleSize, ẩn điểm NPS (trả về npsScore = null, isEligibleToPublish = false).
 */
export function calculateExactNpsFromResponses(
  responses: RawNpsResponseItem[],
  minSampleSize: number = MIN_NPS_SAMPLE_SIZE
): NpsCalculationResult {
  const valid = responses.filter(
    (r) => typeof r.npsScore === 'number' && r.npsScore >= 0 && r.npsScore <= 10
  );
  const total = valid.length;
  const isEligible = total >= minSampleSize && total > 0;

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  let sumComm = 0;
  let sumTime = 0;
  let sumClar = 0;
  let sumSupp = 0;
  let sumCoord = 0;

  for (const r of valid) {
    const group = classifyNpsScore(r.npsScore);
    if (group === 'PROMOTER') promoters++;
    else if (group === 'PASSIVE') passives++;
    else detractors++;

    sumComm += Number(r.criteriaCommunication || 0);
    sumTime += Number(r.criteriaTimeliness || 0);
    sumClar += Number(r.criteriaClarity || 0);
    sumSupp += Number(r.criteriaSupport || 0);
    sumCoord += Number(r.criteriaCoordination || 0);
  }

  if (!isEligible) {
    return {
      totalResponses: total,
      minSampleSize,
      isEligibleToPublish: false,
      promotersCount: promoters,
      passivesCount: passives,
      detractorsCount: detractors,
      promotersPct: null,
      passivesPct: null,
      detractorsPct: null,
      npsScore: null,
      criteriaAverages: {
        communication: null,
        timeliness: null,
        clarity: null,
        support: null,
        coordination: null,
        overallSatisfaction: null,
      },
    };
  }

  const promotersPct = Number(((promoters / total) * 100).toFixed(1));
  const passivesPct = Number(((passives / total) * 100).toFixed(1));
  const detractorsPct = Number(((detractors / total) * 100).toFixed(1));
  // Exact formula from raw counts:
  const npsScore = Math.round(((promoters - detractors) / total) * 100);

  const commAvg = Number((sumComm / total).toFixed(2));
  const timeAvg = Number((sumTime / total).toFixed(2));
  const clarAvg = Number((sumClar / total).toFixed(2));
  const suppAvg = Number((sumSupp / total).toFixed(2));
  const coordAvg = Number((sumCoord / total).toFixed(2));
  const overallAvg = Number(
    ((sumComm + sumTime + sumClar + sumSupp + sumCoord) / (total * 5)).toFixed(2)
  );

  return {
    totalResponses: total,
    minSampleSize,
    isEligibleToPublish: true,
    promotersCount: promoters,
    passivesCount: passives,
    detractorsCount: detractors,
    promotersPct,
    passivesPct,
    detractorsPct,
    npsScore,
    criteriaAverages: {
      communication: commAvg,
      timeliness: timeAvg,
      clarity: clarAvg,
      support: suppAvg,
      coordination: coordAvg,
      overallSatisfaction: overallAvg,
    },
  };
}

export type AdminGovernanceType = 'QA_BUSINESS_ADMIN' | 'TECHNICAL_ADMIN' | 'DEPARTMENT_LEAD' | 'NONE';

/**
 * Phân biệt rõ Admin kỹ thuật và Admin nghiệp vụ KT&ĐBCL (Mục D6)
 */
export function classifyAdminRole(role?: string | null, teacherPosition?: string | null): AdminGovernanceType {
  const r = (role || '').toUpperCase().trim();
  const pos = (teacherPosition || '').toUpperCase().trim();

  if (['KT_DBCL', 'KHAO_THI', 'BGH', 'GDCS', 'BAN_KT_DBCL', 'QA_ADMIN', 'BOARD'].includes(r)) {
    return 'QA_BUSINESS_ADMIN';
  }
  if (['ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'SYS_ADMIN'].includes(r)) {
    return 'TECHNICAL_ADMIN';
  }
  if (['TTCM', 'QLCM', 'TPCM', 'KHOI_TRUONG'].includes(r) || /(TTCM|QLCM|TPCM)/.test(pos)) {
    return 'DEPARTMENT_LEAD';
  }
  return 'NONE';
}

/**
 * Kiểm tra quyền đọc nội dung chi tiết của một hội thoại riêng tư
 * - GVCN KHÔNG mặc định đọc được hội thoại riêng 1-1 giữa GVBM và PHHS trừ khi visibility === 'SHARED_WITH_GVCN' hoặc GVCN là participant hợp lệ.
 * - Admin kỹ thuật KHÔNG mặc định đọc được nội dung hội thoại riêng tư.
 * - Admin nghiệp vụ KT&ĐBCL chỉ đọc được nội dung khi hội thoại/case đã được chuyển cấp (ESCALATED_QA) hoặc có yêu cầu đang cần thẩm định/quá hạn.
 */
export function canUserReadThreadContent(params: {
  userId: string;
  userRole: string;
  teacherId?: string | null;
  parentId?: string | null;
  homeroomClassIds?: string[];
  thread: {
    threadType: string;
    visibility: string;
    parentId?: string | null;
    teacherId: string;
    classId: string;
    createdByUserId: string;
    participants?: Array<{ userId: string; accessScope?: string }>;
    cases?: Array<{ assignedToUserId: string; isOverdue?: boolean; status?: string }>;
  };
}): { allowed: boolean; reason?: string; summaryOnly?: boolean } {
  const { userId, userRole, teacherId, parentId, homeroomClassIds = [], thread } = params;

  // 1. Creator or explicit participant
  if (thread.createdByUserId === userId) {
    return { allowed: true };
  }
  if (thread.participants?.some((p) => p.userId === userId)) {
    return { allowed: true };
  }

  // 2. Parent owner
  if (userRole === 'PARENT') {
    if (parentId && thread.parentId === parentId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Phụ huynh chỉ được xem hội thoại của con mình.' };
  }

  // 3. Direct teacher of the thread
  if (teacherId && thread.teacherId === teacherId) {
    return { allowed: true };
  }

  // 4. Case assignee
  if (thread.cases?.some((c) => c.assignedToUserId === userId)) {
    return { allowed: true };
  }

  // 5. GVCN of the student's class
  const isHomeroomOfClass = homeroomClassIds.includes(thread.classId);
  if (isHomeroomOfClass) {
    if (thread.threadType === 'PARENT_GVCN' || thread.threadType === 'GVCN_GVBM_COORD') {
      return { allowed: true };
    }
    if (thread.threadType === 'PARENT_GVBM') {
      if (thread.visibility === 'SHARED_WITH_GVCN' || thread.visibility === 'ESCALATED_QA') {
        return { allowed: true };
      }
      return {
        allowed: false,
        summaryOnly: true,
        reason: 'GVCN không mặc định đọc nội dung hội thoại riêng giữa GVBM và PHHS khi chưa được chia sẻ phối hợp.',
      };
    }
  }

  // 6. Admin differentiation (D6)
  const adminType = classifyAdminRole(userRole);
  if (adminType === 'TECHNICAL_ADMIN') {
    if (thread.visibility === 'ESCALATED_QA') {
      return { allowed: true };
    }
    return {
      allowed: false,
      summaryOnly: true,
      reason: 'Tài khoản Admin kỹ thuật chỉ quản trị cấu hình/hệ thống, không mặc định đọc nội dung hội thoại riêng tư.',
    };
  }

  if (adminType === 'QA_BUSINESS_ADMIN' || adminType === 'DEPARTMENT_LEAD') {
    const hasEscalatedOrOverdueCase =
      thread.visibility === 'ESCALATED_QA' ||
      thread.cases?.some((c) => c.isOverdue || c.status === 'REOPENED' || c.assignedToUserId === userId);
    if (hasEscalatedOrOverdueCase) {
      return { allowed: true };
    }
    return {
      allowed: false,
      summaryOnly: true,
      reason: 'Chỉ hiển thị thông tin quản trị (metadata). Nội dung chi tiết hội thoại riêng tư được bảo mật.',
    };
  }

  return { allowed: false, reason: 'Bạn không có quyền truy cập hội thoại này.' };
}
