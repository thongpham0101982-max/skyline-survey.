export type ApiPermission =
  // Quyền Học sinh
  | "students:read"
  | "students:profile:read"
  | "students:contact:read"
  | "students:write"
  | "students:profile:write"
  // Quyền Giáo viên
  | "teachers:read"
  | "teachers:directory:read"
  | "teachers:write"
  | "teachers:profile:write"
  | "teachers:assignments:read"
  | "teachers:assignments:write"
  // Quyền Điểm số & Sổ điểm
  | "grades:read"
  | "grades:write"
  // Quyền Phân công Giảng dạy
  | "assignments:read"
  | "assignments:write"
  // Quyền Khảo sát & ĐBCL
  | "survey-results:read"
  | "survey-results:write"

export interface PermissionDefinition {
  code: ApiPermission
  label: string
  description: string
  category: "HỌC SINH" | "GIÁO VIÊN" | "ĐIỂM SỐ & CHUYÊN MÔN" | "KHẢO SÁT & ĐBCL"
  isSensitive?: boolean
}

export const ALL_API_PERMISSIONS: PermissionDefinition[] = [
  // 1. Nhóm Học sinh
  {
    code: "students:profile:read",
    label: "Đọc hồ sơ cơ bản học sinh",
    description: "Xem họ tên, mã HS, ngày sinh, giới tính, lớp, khối, cơ sở (không xem SĐT/email phụ huynh)",
    category: "HỌC SINH",
  },
  {
    code: "students:contact:read",
    label: "Đọc thông tin liên hệ PHHS & Địa chỉ",
    description: "Xem số điện thoại phụ huynh, email, địa chỉ nhà (dữ liệu nhạy cảm cao theo NĐ 13/2023)",
    category: "HỌC SINH",
    isSensitive: true,
  },
  {
    code: "students:profile:write",
    label: "Cập nhật thông tin học sinh",
    description: "Thêm mới hoặc chỉnh sửa hồ sơ học sinh, trạng thái học tập trong phạm vi được cấp",
    category: "HỌC SINH",
  },
  {
    code: "students:read",
    label: "Toàn quyền đọc học sinh (Legacy)",
    description: "Bao gồm cả thông tin học thuật và thông tin liên hệ phụ huynh",
    category: "HỌC SINH",
  },
  {
    code: "students:write",
    label: "Toàn quyền ghi học sinh (Legacy)",
    description: "Thêm mới và cập nhật toàn bộ trường hồ sơ học sinh",
    category: "HỌC SINH",
  },

  // 2. Nhóm Giáo viên
  {
    code: "teachers:directory:read",
    label: "Đọc danh bạ giáo viên",
    description: "Xem mã GV, họ tên, email trường, tổ chuyên môn, môn phụ trách chính và chức danh",
    category: "GIÁO VIÊN",
  },
  {
    code: "teachers:assignments:read",
    label: "Đọc lịch phân công giáo viên",
    description: "Xem danh sách lớp dạy, môn dạy, học kỳ và số tiết của giáo viên",
    category: "GIÁO VIÊN",
  },
  {
    code: "teachers:profile:write",
    label: "Cập nhật hồ sơ giáo viên",
    description: "Chỉnh sửa chức vụ, email, tổ chuyên môn và môn học giảng dạy",
    category: "GIÁO VIÊN",
  },
  {
    code: "teachers:assignments:write",
    label: "Ghi phân công giảng dạy cho giáo viên",
    description: "Phân công lớp, môn và nhiệm vụ chuyên môn theo học kỳ cho giáo viên",
    category: "GIÁO VIÊN",
  },
  {
    code: "teachers:read",
    label: "Toàn quyền đọc giáo viên (Legacy)",
    description: "Xem đầy đủ danh bạ, hồ sơ chuyên môn và lịch phân công giáo viên",
    category: "GIÁO VIÊN",
  },
  {
    code: "teachers:write",
    label: "Toàn quyền ghi giáo viên (Legacy)",
    description: "Thêm mới hoặc cập nhật toàn diện thông tin và phân công giáo viên",
    category: "GIÁO VIÊN",
  },

  // 3. Nhóm Điểm số & Chuyên môn
  {
    code: "grades:read",
    label: "Đọc sổ điểm",
    description: "Xem điểm các môn học, đợt kiểm tra, điểm định kỳ theo lớp và cơ sở",
    category: "ĐIỂM SỐ & CHUYÊN MÔN",
  },
  {
    code: "grades:write",
    label: "Ghi sổ điểm",
    description: "Ghi nhận và cập nhật điểm theo kỳ đánh giá (tự động khóa nếu đợt điểm đã niêm phong)",
    category: "ĐIỂM SỐ & CHUYÊN MÔN",
  },
  {
    code: "assignments:read",
    label: "Đọc phân công giảng dạy",
    description: "Xem phân công nhiệm vụ và giáo viên bộ môn / chủ nhiệm",
    category: "ĐIỂM SỐ & CHUYÊN MÔN",
  },
  {
    code: "assignments:write",
    label: "Ghi phân công giảng dạy",
    description: "Cập nhật và phân công nhiệm vụ giảng dạy cho giáo viên",
    category: "ĐIỂM SỐ & CHUYÊN MÔN",
  },

  // 4. Nhóm Khảo sát & ĐBCL
  {
    code: "survey-results:read",
    label: "Đọc kết quả khảo sát",
    description: "Xem biểu mẫu và điểm đánh giá khảo sát giáo dục, NPS, phản hồi học sinh",
    category: "KHẢO SÁT & ĐBCL",
  },
  {
    code: "survey-results:write",
    label: "Ghi kết quả khảo sát",
    description: "Gửi và cập nhật phản hồi khảo sát (mặc định lưu bản nháp/chờ duyệt)",
    category: "KHẢO SÁT & ĐBCL",
  },
]

export interface ApiApplicationRecord {
  id: string
  name: string
  description?: string | null
  contactPerson?: string | null
  status: "ACTIVE" | "INACTIVE" | "REVOKED"
  permissions: string // JSON array of ApiPermission
  allowedCampusIds: string // JSON array of campus IDs, ["*"] for all
  allowedClassIds: string // JSON array of class IDs, ["*"] for all
  allowedDataScope: string
  expiresAt?: string | Date | null
  rateLimitRpm: number
  lastUsedAt?: string | Date | null
  createdById?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  apiKeys?: ApiKeyRecord[]
}

export interface ApiKeyRecord {
  id: string
  applicationId: string
  name?: string | null
  keyId: string
  keyPrefix: string
  keyHash: string
  status: "ACTIVE" | "REVOKED" | "EXPIRED"
  expiresAt?: string | Date | null
  lastUsedAt?: string | Date | null
  revokedAt?: string | Date | null
  revokedReason?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  application?: ApiApplicationRecord
}

export interface ApiAccessLogRecord {
  id: string
  applicationId: string
  keyId?: string | null
  requestId: string
  endpoint: string
  method: string
  statusCode: number
  ipAddress?: string | null
  userAgent?: string | null
  durationMs?: number | null
  requestSummary?: string | null
  errorMessage?: string | null
  createdAt: string | Date
}

export interface AuthenticatedApiContext {
  application: {
    id: string
    name: string
    status: string
    permissions: ApiPermission[]
    allowedCampusIds: string[]
    allowedClassIds: string[]
    allowedDepartmentIds: string[]
    allowedDataScope: string
    rateLimitRpm: number
  }
  key: {
    id: string
    keyId: string
  }
  requestId: string
}
