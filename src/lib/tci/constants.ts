// ============================================================================
// MÔN TCI – BỘ CHUẨN PHÁT TRIỂN TRẺ EM 5–6 TUỔI (DỰ TUYỂN VÀO LỚP 1)
// Định nghĩa hằng số, 16 tiêu chí chuẩn nguyên văn và hàm tính toán/kiểm tra
// ============================================================================

export const TCI_SUBJECT_CODE = "TCI";
export const TCI_SUBJECT_NAME = "Bộ chuẩn phát triển trẻ em 5–6 tuổi";
export const TCI_SUBJECT_DISPLAY_LABEL = "TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi";
export const TCI_ASSESSMENT_TYPE = "Đánh giá theo tiêu chí";
export const TCI_TOTAL_CRITERIA = 16;
export const TCI_DEFAULT_TEMPLATE_CODE = "TCI_K1_DEFAULT";
export const TCI_DEFAULT_TEMPLATE_NAME =
    "Phiếu khảo sát đầu vào môn TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi (Dự tuyển Lớp 1)";

export type TciResultChoice = "DAT" | "KHONG_DAT" | "KHONG_LAM";

export type TciEvaluationStatus =
    | "NOT_STARTED"       // Chưa nhập (0/16)
    | "IN_PROGRESS"       // Đang nhập (1..15/16 hoặc chưa đủ điều kiện ký)
    | "PENDING_SIGNATURE" // Chờ ký (đã đủ 16/16 tiêu chí, chờ GV ký xác nhận)
    | "COMPLETED"         // Đã hoàn thành (16/16 + Đã ký + Đã xuất PDF bất biến)
    | "REOPENED";         // Đã mở khóa để đánh giá lại (phiên bản mới)

export type TciSignatureStatus =
    | "UNSIGNED"          // Chưa ký
    | "SIGNED"            // Đã ký
    | "PENDING_RESIGN";   // Cần ký lại (sau khi mở khóa phiên bản mới)

export type TciReviewStatus =
    | "PENDING"              // Chờ xét duyệt
    | "APPROVED"             // Đã xét duyệt
    | "SUPPLEMENT_REQUESTED" // Yêu cầu bổ sung
    | "REOPENED";            // Đã mở lại (hiệu lực duyệt cũ bị hủy)

export type TciSupplementaryType =
    | "NONE"
    | "WRITING_SAMPLE_BOX"          // Câu 13: Vùng Giáo viên viết mẫu / Thí sinh viết theo
    | "COLORING_SAMPLE_AND_PRODUCT"; // Câu 16: Ảnh mẫu tô màu + Mục Sản phẩm của học sinh

export interface TciCriterionConfig {
    criterionId: string;           // Khóa định danh ổn định: TCI_C01 .. TCI_C16
    stt: number;                   // Thứ tự hiển thị trên phiếu: 1 .. 16
    indicatorCodes: string[];      // Mã chỉ số tham chiếu (VD: ["65"], hoặc ["42", "43"] ở STT 11)
    content: string;               // Nội dung tiêu chí nguyên văn
    guideline: string;             // Hướng dẫn thực hiện cho GV khảo sát
    resultOptions: TciResultChoice[]; // ["DAT", "KHONG_DAT", "KHONG_LAM"]
    allowNote: boolean;            // Cho phép nhập ghi chú theo tiêu chí
    noteRequiredOn?: TciResultChoice[]; // Bắt buộc ghi chú khi chọn trạng thái nào (tùy chọn)
    supplementaryType: TciSupplementaryType;
    sampleImageUrl?: string | null; // Ảnh mẫu (VD: hình mẫu tô màu ở Câu 16)
    sampleImageCaption?: string | null;
    writingPromptDefault?: string | null; // Gợi ý chữ viết mẫu cho Câu 13
    allowProductImage: boolean;    // Cho phép GV đính kèm ảnh sản phẩm bài làm
    isProductImageRequired: boolean; // Bắt buộc ảnh sản phẩm khi hoàn thành (mặc định false)
    requireImageOnKhongLam?: boolean; // Mặc định false: Không bắt buộc ảnh khi chọn Không làm
    maxImages: number;             // Số ảnh tối đa (VD: 3)
    maxFileSizeMb: number;         // Dung lượng tối đa mỗi ảnh (MB, VD: 5MB)
    allowedMimeTypes: string[];    // ["image/jpeg", "image/png", "image/webp"]
}

export interface TciFooterConfig {
    enableGeneralComment: boolean;
    generalCommentLabel: string;
    generalCommentRequired: boolean;

    enableHighlightsComment: boolean;
    highlightsCommentLabel: string;
    highlightsCommentRequired: boolean;

    enableSupportNeededComment: boolean;
    supportNeededCommentLabel: string;
    supportNeededCommentRequired: boolean;

    enableTeacherRecommendation: boolean;
    teacherRecommendationLabel: string;
    teacherRecommendationRequired: boolean;

    requireExaminerSignature: boolean;
    examinerSignatureTitle: string;
}

export interface TciExportConfig {
    schoolHeaderLine1: string;
    schoolHeaderLine2: string;
    documentTitle: string;
    documentSubTitle: string;
    paperSize: "A4";
    orientation: "PORTRAIT";
    showDraftWatermarkWhenUnsigned: boolean;
    showAuditHashFooter: boolean;
    c16EvidenceExportTarget?: string;
}

export interface TciCriterionResultEntry {
    criterionId: string;
    stt: number;
    indicatorCodes: string[];
    status: TciResultChoice | null; // null = Chưa đánh giá
    note?: string;
    writingSampleText?: string;     // Dành cho Câu 13: Giáo viên viết mẫu
    studentWritingText?: string;    // Dành cho Câu 13: Ghi nhận chữ thí sinh viết theo
    updatedAt?: string;
}

export interface TciSummaryCounts {
    totalCriteria: number;     // Luôn là 16
    countEvaluated: number;    // Đạt + Không đạt + Không làm
    countDat: number;          // Số tiêu chí Đạt
    countKhongDat: number;     // Số tiêu chí Không đạt
    countKhongLam: number;     // Số tiêu chí Không làm
    countChuaDanhGia: number;  // Số tiêu chí Chưa đánh giá
    isAllEvaluated: boolean;   // countEvaluated === 16 && countChuaDanhGia === 0
    missingStts: number[];     // Danh sách STT chưa chọn kết quả
    missingCriterionIds: string[];
}

export interface TciEvidenceSummaryItem {
    id: string;
    criterionId: string;
    criterionStt: number;
    indicatorCode: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    rotationDeg: number;
    imageDataBase64?: string;
    uploadedByUserId: string;
    uploadedByName: string;
    createdAt: string;
}

// Hình mẫu tô màu mặc định cho Câu 16 (SVG chuẩn nét mảnh kèm góc mẫu màu tham khảo)
const QUESTION_16_SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 230" width="520" height="230">
  <rect x="2" y="2" width="516" height="226" rx="10" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
  <!-- Khung bên trái: Hình mẫu có màu -->
  <g transform="translate(16, 14)">
    <rect x="0" y="0" width="228" height="200" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
    <text x="114" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#003B3A">HÌNH MẪU THAM KHẢO</text>
    <!-- Ngôi nhà nhỏ & bông hoa chi tiết nhỏ -->
    <polygon points="65,85 114,45 163,85" fill="#F43F5E" stroke="#1E293B" stroke-width="2"/>
    <rect x="77" y="85" width="74" height="62" fill="#FEF08A" stroke="#1E293B" stroke-width="2"/>
    <rect x="103" y="109" width="22" height="38" fill="#38BDF8" stroke="#1E293B" stroke-width="1.8"/>
    <rect x="85" y="95" width="14" height="14" fill="#A7F3D0" stroke="#1E293B" stroke-width="1.5"/>
    <rect x="129" y="95" width="14" height="14" fill="#A7F3D0" stroke="#1E293B" stroke-width="1.5"/>
    <!-- Mặt trời nhỏ -->
    <circle cx="42" cy="56" r="12" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>
    <!-- Bông hoa 5 cánh chi tiết nhỏ -->
    <line x1="188" y1="118" x2="188" y2="152" stroke="#15803D" stroke-width="2.5"/>
    <ellipse cx="179" cy="136" rx="8" ry="4" transform="rotate(-20 179 136)" fill="#4ADE80" stroke="#1E293B" stroke-width="1.5"/>
    <ellipse cx="197" cy="136" rx="8" ry="4" transform="rotate(20 197 136)" fill="#4ADE80" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="188" cy="96" r="7" fill="#FB7185" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="199" cy="104" r="7" fill="#FB7185" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="195" cy="116" r="7" fill="#FB7185" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="181" cy="116" r="7" fill="#FB7185" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="177" cy="104" r="7" fill="#FB7185" stroke="#1E293B" stroke-width="1.5"/>
    <circle cx="188" cy="107" r="6" fill="#FDE047" stroke="#1E293B" stroke-width="1.5"/>
    <text x="114" y="182" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#475569">Tô kín, đều màu, không chờm viền</text>
  </g>
  <!-- Khung bên phải: Hình nét viền để học sinh tô màu trên phiếu in -->
  <g transform="translate(274, 14)">
    <rect x="0" y="0" width="228" height="200" rx="8" fill="#FFFFFF" stroke="#94A3B8" stroke-dasharray="4 3"/>
    <text x="114" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0F172A">HÌNH NÉT VIỀN ĐỂ HỌC SINH TÔ MÀU</text>
    <polygon points="65,85 114,45 163,85" fill="#FFFFFF" stroke="#0F172A" stroke-width="2"/>
    <rect x="77" y="85" width="74" height="62" fill="#FFFFFF" stroke="#0F172A" stroke-width="2"/>
    <rect x="103" y="109" width="22" height="38" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.8"/>
    <rect x="85" y="95" width="14" height="14" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <rect x="129" y="95" width="14" height="14" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <circle cx="42" cy="56" r="12" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.8"/>
    <line x1="188" y1="118" x2="188" y2="152" stroke="#0F172A" stroke-width="2.2"/>
    <ellipse cx="179" cy="136" rx="8" ry="4" transform="rotate(-20 179 136)" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <ellipse cx="197" cy="136" rx="8" ry="4" transform="rotate(20 197 136)" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <circle cx="188" cy="96" r="7" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <circle cx="199" cy="104" r="7" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <circle cx="195" cy="116" r="7" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <circle cx="181" cy="116" r="7" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <circle cx="177" cy="104" r="7" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <circle cx="188" cy="107" r="6" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <text x="114" y="182" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748B">Quan sát cách cầm bút và độ khéo léo</text>
  </g>
</svg>`;

export const DEFAULT_TCI_QUESTION_16_SAMPLE_IMAGE =
    `data:image/svg+xml;utf8,${encodeURIComponent(QUESTION_16_SAMPLE_SVG)}`;

// ============================================================================
// BỘ 16 TIÊU CHÍ TCI NGUYÊN VĂN (ĐỐI CHIẾU CHÍNH XÁC VỚI YÊU CẦU)
// ============================================================================
export const DEFAULT_TCI_CRITERIA_16: TciCriterionConfig[] = [
    {
        criterionId: "TCI_C01",
        stt: 1,
        indicatorCodes: ["65"],
        content: "Có thói quen chào hỏi, cảm ơn, xin phép và xưng hô lễ phép với người lớn.",
        guideline: "Quan sát trực tiếp khi trẻ vào phòng khảo sát, khi nhận đồ dùng và trao đổi với giáo viên.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C02",
        stt: 2,
        indicatorCodes: ["74"],
        content: "Tập trung chú ý thực hiện nhiệm vụ và hoạt động.",
        guideline: "Quan sát mức độ duy trì sự chú ý của trẻ trong suốt quá trình thực hiện các hoạt động khảo sát.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C03",
        stt: 3,
        indicatorCodes: ["16"],
        content: "Nhận biết về tên gọi, đặc điểm bên ngoài, giới tính, sở thích, điểm mạnh, điểm yếu của bản thân.",
        guideline: "Trò chuyện và đặt câu hỏi để trẻ tự giới thiệu về bản thân, sở thích, điểm mạnh/điểm yếu.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C04",
        stt: 4,
        indicatorCodes: ["14"],
        content: "Nhận ra tình huống nguy hiểm và biết cách xử lý phù hợp.",
        guideline: "Sử dụng tranh tình huống hoặc câu hỏi giả định về an toàn để trẻ nhận biết và nêu cách xử lý.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C05",
        stt: 5,
        indicatorCodes: ["33"],
        content: "Sử dụng lời nói, hành vi lịch sự trong giao tiếp.",
        guideline: "Đánh giá cách trả lời trọn câu, thái độ lịch sự, ánh mắt và hành vi giao tiếp của trẻ.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C06",
        stt: 6,
        indicatorCodes: ["31"],
        content: "Nghe và phản hồi thông tin đơn giản.",
        guideline: "Đọc/nêu thông tin hoặc yêu cầu ngắn gọn, quan sát khả năng lắng nghe và phản hồi đúng trọng tâm.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C07",
        stt: 7,
        indicatorCodes: ["48"],
        content: "Gọi tên các ngày trong tuần theo thứ tự.",
        guideline: "Yêu cầu trẻ kể tên các ngày trong tuần theo đúng trình tự từ Thứ Hai đến Chủ Nhật.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C08",
        stt: 8,
        indicatorCodes: ["47"],
        content: "Xác định được vị trí (trong, ngoài, trên, dưới, sau, phải, trái) của một vật so với một vật khác.",
        guideline: "Dùng học cụ trực quan hoặc tranh minh họa để trẻ xác định vị trí tương đối giữa các vật.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C09",
        stt: 9,
        indicatorCodes: ["51"],
        content: "Phân loại một số sự vật thành nhóm theo đặc điểm chung và gọi tên nhóm.",
        guideline: "Cho trẻ quan sát bộ thẻ/đồ vật, yêu cầu phân nhóm theo dấu hiệu chung và gọi đúng tên nhóm.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C10",
        stt: 10,
        indicatorCodes: ["45"],
        content: "Xác định một số hình phẳng và hình khối đơn giản trong cuộc sống xung quanh.",
        guideline: "Yêu cầu trẻ nhận biết hình tròn, vuông, tam giác, chữ nhật; khối cầu, khối vuông, khối trụ...",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C11",
        stt: 11,
        indicatorCodes: ["42", "43"],
        content: "Tách, gộp số lượng trong phạm vi 10; so sánh, thêm bớt số lượng trong phạm vi 10.",
        guideline: "Thực hành trên học cụ đếm trong phạm vi 10 (1 tiêu chí tổng hợp gồm Chỉ số 42 và 43).",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C12",
        stt: 12,
        indicatorCodes: ["38"],
        content: "Nhận biết và gọi tên chữ cái trong bảng chữ cái Tiếng Việt.",
        guideline: "Cho trẻ nhận diện và phát âm các chữ cái Tiếng Việt bất kỳ trên bảng/thẻ chữ.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C13",
        stt: 13,
        indicatorCodes: ["41"],
        content: "Bắt chước hành vi “viết”.",
        guideline: "Giáo viên viết mẫu vào ô quy định, yêu cầu thí sinh cầm bút và viết theo mẫu.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "WRITING_SAMPLE_BOX",
        writingPromptDefault: "bé chăm ngoan",
        allowProductImage: true,
        isProductImageRequired: false,
        requireImageOnKhongLam: false,
        maxImages: 2,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C14",
        stt: 14,
        indicatorCodes: ["9"],
        content: "Thực hiện các việc tự phục vụ không cần sự giúp đỡ.",
        guideline: "Quan sát/hỏi trẻ về kỹ năng tự phục vụ cá nhân (cất đồ dùng, chỉnh trang phục, vệ sinh cá nhân...).",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C15",
        stt: 15,
        indicatorCodes: ["60"],
        content: "Thể hiện ý tưởng, cảm xúc của bản thân thông qua hát, vận động theo nhạc.",
        guideline: "Khuyến khích trẻ hát một bài hát yêu thích hoặc vận động nhịp nhàng theo giai điệu.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "NONE",
        allowProductImage: false,
        isProductImageRequired: false,
        maxImages: 1,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
        criterionId: "TCI_C16",
        stt: 16,
        indicatorCodes: ["61"],
        content: "Tô màu kín, không chờm ra ngoài đường viền các hình có chi tiết nhỏ.",
        guideline: "Cho trẻ tô màu hình mẫu có chi tiết nhỏ; chụp/tải ảnh sản phẩm bài làm của học sinh vào mục Sản phẩm.",
        resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
        allowNote: true,
        supplementaryType: "COLORING_SAMPLE_AND_PRODUCT",
        sampleImageUrl: DEFAULT_TCI_QUESTION_16_SAMPLE_IMAGE,
        sampleImageCaption: "Hình mẫu tô màu có chi tiết nhỏ (Chỉ số 61)",
        allowProductImage: true,
        isProductImageRequired: false, // Mặc định tùy chọn, cho phép Admin bật bắt buộc trong cấu hình mẫu
        requireImageOnKhongLam: false,
        maxImages: 3,
        maxFileSizeMb: 5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
];

export const DEFAULT_TCI_FOOTER_CONFIG: TciFooterConfig = {
    enableGeneralComment: true,
    generalCommentLabel: "Nhận xét chung",
    generalCommentRequired: false,

    enableHighlightsComment: true,
    highlightsCommentLabel: "Điểm nổi bật",
    highlightsCommentRequired: false,

    enableSupportNeededComment: true,
    supportNeededCommentLabel: "Nội dung cần hỗ trợ",
    supportNeededCommentRequired: false,

    enableTeacherRecommendation: true,
    teacherRecommendationLabel: "Đề xuất của giáo viên",
    teacherRecommendationRequired: false,

    requireExaminerSignature: true,
    examinerSignatureTitle: "GIÁO VIÊN KHẢO SÁT",
};

export const DEFAULT_TCI_EXPORT_CONFIG: TciExportConfig = {
    schoolHeaderLine1: "HỆ THỐNG GIÁO DỤC SKY-LINE",
    schoolHeaderLine2: "HỘI ĐỒNG TUYỂN SINH – KHẢO SÁT ĐẦU VÀO LỚP 1",
    documentTitle: "PHIẾU ĐÁNH GIÁ BỘ CHUẨN PHÁT TRIỂN TRẺ EM 5–6 TUỔI",
    documentSubTitle: "Môn khảo sát: TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi (Dự tuyển vào Lớp 1)",
    paperSize: "A4",
    orientation: "PORTRAIT",
    showDraftWatermarkWhenUnsigned: true,
    showAuditHashFooter: true,
    c16EvidenceExportTarget: "frame:tci_c16_images",
};

// ============================================================================
// HÀM TIỆN ÍCH CHUẨN HÓA, TÍNH TOÁN & KIỂM TRA QUY TẮC ĐÁNH GIÁ
// ============================================================================

export function formatIndicatorCodesLabel(indicatorCodes: string[] | string | undefined | null): string {
    if (!indicatorCodes) return "";
    const arr = Array.isArray(indicatorCodes)
        ? indicatorCodes
        : String(indicatorCodes)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
    if (arr.length === 0) return "";
    return `Chỉ số ${arr.join(", ")}`;
}

export function isValidTciResultChoice(val: unknown): val is TciResultChoice {
    return val === "DAT" || val === "KHONG_DAT" || val === "KHONG_LAM";
}

export function getTciChoiceLabel(choice: TciResultChoice | null | undefined): string {
    switch (choice) {
        case "DAT":
            return "Đạt";
        case "KHONG_DAT":
            return "Không đạt";
        case "KHONG_LAM":
            return "Không làm";
        default:
            return "Chưa đánh giá";
    }
}

export function getTciEvaluationStatusLabel(status: string | null | undefined): string {
    switch (status) {
        case "COMPLETED":
            return "Đã hoàn thành";
        case "PENDING_SIGNATURE":
            return "Chờ ký";
        case "IN_PROGRESS":
            return "Đang nhập";
        case "REOPENED":
            return "Đang đánh giá lại";
        case "NOT_STARTED":
        default:
            return "Chưa nhập";
    }
}

export function getTciSignatureStatusLabel(status: string | null | undefined): string {
    switch (status) {
        case "SIGNED":
            return "Đã ký";
        case "PENDING_RESIGN":
            return "Cần ký lại";
        case "UNSIGNED":
        default:
            return "Chưa ký";
    }
}

export function getTciReviewStatusLabel(status: string | null | undefined): string {
    switch (status) {
        case "APPROVED":
            return "Đã xét duyệt";
        case "SUPPLEMENT_REQUESTED":
            return "Yêu cầu bổ sung";
        case "REOPENED":
            return "Đã mở khóa (chờ ký lại)";
        case "PENDING":
        default:
            return "Chờ xét duyệt";
    }
}

/**
 * Chuẩn hóa map kết quả theo bộ tiêu chí của mẫu (không tự điền mặc định, giữ nguyên null cho tiêu chí chưa chọn)
 */
export function normalizeCriterionResults(
    rawInput: unknown,
    criteriaConfig: TciCriterionConfig[] = DEFAULT_TCI_CRITERIA_16
): Record<string, TciCriterionResultEntry> {
    let parsed: Record<string, any> = {};
    if (typeof rawInput === "string" && rawInput.trim()) {
        try {
            const obj = JSON.parse(rawInput);
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
                parsed = obj;
            }
        } catch {
            parsed = {};
        }
    } else if (rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)) {
        parsed = rawInput as Record<string, any>;
    }

    const normalized: Record<string, TciCriterionResultEntry> = {};

    for (const c of criteriaConfig) {
        // Hỗ trợ tra cứu theo criterionId ổn định ("TCI_C01") hoặc fallback theo STT ("1")
        const rawEntry =
            parsed[c.criterionId] ??
            parsed[`STT_${c.stt}`] ??
            parsed[String(c.stt)] ??
            null;

        let status: TciResultChoice | null = null;
        let note = "";
        let writingSampleText = c.writingPromptDefault || "";
        let studentWritingText = "";
        let updatedAt: string | undefined = undefined;

        if (typeof rawEntry === "string") {
            if (isValidTciResultChoice(rawEntry)) {
                status = rawEntry;
            }
        } else if (rawEntry && typeof rawEntry === "object") {
            if (isValidTciResultChoice(rawEntry.status)) {
                status = rawEntry.status;
            }
            if (typeof rawEntry.note === "string") {
                note = rawEntry.note;
            }
            if (typeof rawEntry.writingSampleText === "string") {
                writingSampleText = rawEntry.writingSampleText;
            }
            if (typeof rawEntry.studentWritingText === "string") {
                studentWritingText = rawEntry.studentWritingText;
            }
            if (typeof rawEntry.updatedAt === "string") {
                updatedAt = rawEntry.updatedAt;
            }
        }

        normalized[c.criterionId] = {
            criterionId: c.criterionId,
            stt: c.stt,
            indicatorCodes: c.indicatorCodes,
            status,
            note,
            writingSampleText: c.supplementaryType === "WRITING_SAMPLE_BOX" ? writingSampleText : undefined,
            studentWritingText: c.supplementaryType === "WRITING_SAMPLE_BOX" ? studentWritingText : undefined,
            updatedAt,
        };
    }

    return normalized;
}

/**
 * Tính toán bộ đếm tổng hợp TCI:
 * - Không tự đổi Chưa đánh giá thành Không làm hoặc Không đạt.
 * - Tổng Đạt + Không đạt + Không làm + Chưa đánh giá = 16.
 * - STT 11 gồm Chỉ số 42 và 43 nhưng tính là 1 tiêu chí trong 16 tiêu chí.
 */
export function computeTciSummary(
    rawResults: unknown,
    criteriaConfig: TciCriterionConfig[] = DEFAULT_TCI_CRITERIA_16
): TciSummaryCounts {
    const normalized = normalizeCriterionResults(rawResults, criteriaConfig);
    const totalCriteria = criteriaConfig.length;

    let countDat = 0;
    let countKhongDat = 0;
    let countKhongLam = 0;
    let countChuaDanhGia = 0;
    const missingStts: number[] = [];
    const missingCriterionIds: string[] = [];

    for (const c of criteriaConfig) {
        const entry = normalized[c.criterionId];
        const status = entry?.status ?? null;
        if (status === "DAT") {
            countDat += 1;
        } else if (status === "KHONG_DAT") {
            countKhongDat += 1;
        } else if (status === "KHONG_LAM") {
            countKhongLam += 1;
        } else {
            countChuaDanhGia += 1;
            missingStts.push(c.stt);
            missingCriterionIds.push(c.criterionId);
        }
    }

    const countEvaluated = countDat + countKhongDat + countKhongLam;

    return {
        totalCriteria,
        countEvaluated,
        countDat,
        countKhongDat,
        countKhongLam,
        countChuaDanhGia,
        isAllEvaluated: countEvaluated === totalCriteria && countChuaDanhGia === 0,
        missingStts,
        missingCriterionIds,
    };
}

export interface TciGroupedCriterionView {
    config: TciCriterionConfig;
    result: TciCriterionResultEntry;
    evidences: TciEvidenceSummaryItem[];
}

export interface TciGroupedCriteriaSummary {
    datList: TciGroupedCriterionView[];
    khongDatList: TciGroupedCriterionView[];
    khongLamList: TciGroupedCriterionView[];
    chuaDanhGiaList: TciGroupedCriterionView[];
}

/**
 * Phân nhóm 16 tiêu chí thành Đạt / Không đạt / Không làm / Chưa đánh giá phục vụ màn hình Xét duyệt
 */
export function groupCriteriaByStatus(
    rawResults: unknown,
    criteriaConfig: TciCriterionConfig[] = DEFAULT_TCI_CRITERIA_16,
    evidences: TciEvidenceSummaryItem[] = []
): TciGroupedCriteriaSummary {
    const normalized = normalizeCriterionResults(rawResults, criteriaConfig);
    const datList: TciGroupedCriterionView[] = [];
    const khongDatList: TciGroupedCriterionView[] = [];
    const khongLamList: TciGroupedCriterionView[] = [];
    const chuaDanhGiaList: TciGroupedCriterionView[] = [];

    for (const config of criteriaConfig) {
        const result = normalized[config.criterionId];
        const itemEvidences = evidences.filter(
            (ev) => ev.criterionId === config.criterionId || ev.criterionStt === config.stt
        );
        const view: TciGroupedCriterionView = {
            config,
            result,
            evidences: itemEvidences,
        };

        if (result.status === "DAT") {
            datList.push(view);
        } else if (result.status === "KHONG_DAT") {
            khongDatList.push(view);
        } else if (result.status === "KHONG_LAM") {
            khongLamList.push(view);
        } else {
            chuaDanhGiaList.push(view);
        }
    }

    return {
        datList,
        khongDatList,
        khongLamList,
        chuaDanhGiaList,
    };
}

export interface TciCompletionValidationInput {
    criteriaResults: unknown;
    criteriaConfig?: TciCriterionConfig[];
    footerConfig?: TciFooterConfig;
    evidences?: TciEvidenceSummaryItem[];
    hasUploadingOrErroredEvidence?: boolean;
    generalComment?: string | null;
    highlightsComment?: string | null;
    supportNeededComment?: string | null;
    teacherRecommendation?: string | null;
}

export interface TciCompletionValidationResult {
    valid: boolean;
    summary: TciSummaryCounts;
    errors: string[];
    missingEvidenceStts: number[];
    missingFooterFields: string[];
}

/**
 * Kiểm tra toàn diện điều kiện trước khi cho phép "Ký và xác nhận hoàn thành"
 */
export function validateTciCompletion(input: TciCompletionValidationInput): TciCompletionValidationResult {
    const criteriaConfig = input.criteriaConfig ?? DEFAULT_TCI_CRITERIA_16;
    const footerConfig = input.footerConfig ?? DEFAULT_TCI_FOOTER_CONFIG;
    const evidences = input.evidences ?? [];
    const normalized = normalizeCriterionResults(input.criteriaResults, criteriaConfig);
    const summary = computeTciSummary(normalized, criteriaConfig);

    const errors: string[] = [];
    const missingEvidenceStts: number[] = [];
    const missingFooterFields: string[] = [];

    if (!summary.isAllEvaluated) {
        errors.push(
            `Còn ${summary.countChuaDanhGia}/${summary.totalCriteria} tiêu chí chưa đánh giá (Câu STT: ${summary.missingStts.join(", ")}). Vui lòng chọn Đạt, Không đạt hoặc Không làm cho tất cả 16 tiêu chí.`
        );
    }

    if (input.hasUploadingOrErroredEvidence) {
        errors.push("Đang có ảnh sản phẩm chưa tải lên xong hoặc bị lỗi tải lên. Vui lòng hoàn tất hoặc xóa ảnh lỗi trước khi ký.");
    }

    for (const c of criteriaConfig) {
        const entry = normalized[c.criterionId];
        const choice = entry?.status;

        // Kiểm tra ghi chú bắt buộc nếu mẫu có cấu hình
        if (choice && Array.isArray(c.noteRequiredOn) && c.noteRequiredOn.includes(choice)) {
            if (!entry.note || !entry.note.trim()) {
                errors.push(`Tiêu chí STT ${c.stt} (${formatIndicatorCodesLabel(c.indicatorCodes)}) yêu cầu nhập ghi chú khi chọn "${getTciChoiceLabel(choice)}".`);
            }
        }

        // Kiểm tra ảnh sản phẩm bắt buộc:
        // Mặc định không bắt buộc đối với lựa chọn "Không làm", trừ khi requireImageOnKhongLam === true
        if (c.allowProductImage && c.isProductImageRequired && choice) {
            const mustHaveImage = choice !== "KHONG_LAM" || Boolean(c.requireImageOnKhongLam);
            if (mustHaveImage) {
                const countEv = evidences.filter(
                    (ev) => ev.criterionId === c.criterionId || ev.criterionStt === c.stt
                ).length;
                if (countEv === 0) {
                    missingEvidenceStts.push(c.stt);
                    errors.push(
                        `Tiêu chí STT ${c.stt} (${formatIndicatorCodesLabel(c.indicatorCodes)}) bắt buộc đính kèm ảnh sản phẩm của học sinh trước khi ký phiếu.`
                    );
                }
            }
        }
    }

    // Kiểm tra các trường nhận xét cuối phiếu nếu mẫu cấu hình bắt buộc
    if (footerConfig.enableGeneralComment && footerConfig.generalCommentRequired) {
        if (!input.generalComment || !input.generalComment.trim()) {
            missingFooterFields.push(footerConfig.generalCommentLabel);
            errors.push(`Vui lòng nhập "${footerConfig.generalCommentLabel}".`);
        }
    }
    if (footerConfig.enableHighlightsComment && footerConfig.highlightsCommentRequired) {
        if (!input.highlightsComment || !input.highlightsComment.trim()) {
            missingFooterFields.push(footerConfig.highlightsCommentLabel);
            errors.push(`Vui lòng nhập "${footerConfig.highlightsCommentLabel}".`);
        }
    }
    if (footerConfig.enableSupportNeededComment && footerConfig.supportNeededCommentRequired) {
        if (!input.supportNeededComment || !input.supportNeededComment.trim()) {
            missingFooterFields.push(footerConfig.supportNeededCommentLabel);
            errors.push(`Vui lòng nhập "${footerConfig.supportNeededCommentLabel}".`);
        }
    }
    if (footerConfig.enableTeacherRecommendation && footerConfig.teacherRecommendationRequired) {
        if (!input.teacherRecommendation || !input.teacherRecommendation.trim()) {
            missingFooterFields.push(footerConfig.teacherRecommendationLabel);
            errors.push(`Vui lòng nhập "${footerConfig.teacherRecommendationLabel}".`);
        }
    }

    return {
        valid: errors.length === 0,
        summary,
        errors,
        missingEvidenceStts,
        missingFooterFields,
    };
}
