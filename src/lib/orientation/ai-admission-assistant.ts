import { GoogleGenerativeAI } from "@google/generative-ai";
import { GradeGroupKey } from "./criteria-config";

export interface AISuggestedQuestion {
  question: string;
  purpose: string; // Giải thích ngắn mục đích sư phạm
}

export interface AISuggestQuestionsResult {
  success: boolean;
  questions: AISuggestedQuestion[];
  source: "GEMINI_AI" | "RULES_ENGINE_FALLBACK";
  message?: string;
}

export interface AIDraftCommentResult {
  success: boolean;
  draftComment: string;
  evidencePoints: string[];
  source: "GEMINI_AI" | "RULES_ENGINE_FALLBACK";
  message?: string;
}

export interface AIAdmissionSummaryResult {
  success: boolean;
  diemManhNoiBat: string;
  noiDungCanPhatTrien: string;
  khaNangThichNghi: string;
  deXuatHoTroBanDau: string;
  noiDungCanXacMinh: string;
  khuyenNghiXepLop?: string;
  heHocDeXuat?: string;
  source: "GEMINI_AI" | "RULES_ENGINE_FALLBACK";
  message?: string;
}

/**
 * 1. AI GỢI Ý CÂU HỎI PHỎNG VẤN THEO KHỐI
 * - Tối đa 3 câu hỏi phù hợp theo nhóm khối
 * - Giải thích ngắn mục đích câu hỏi
 * - Không hỏi lại nội dung đã có câu trả lời rõ ràng
 */
export async function generateSuggestedInterviewQuestions(params: {
  grade?: string | number | null;
  gradeGroupKey: GradeGroupKey;
  criterionName: string;
  categoryLabel?: string;
  guideline?: string;
  studentName?: string;
  currentNotes?: string;
  existingQuestions?: string[];
}): Promise<AISuggestQuestionsResult> {
  const {
    grade,
    gradeGroupKey,
    criterionName,
    categoryLabel,
    guideline,
    studentName = "học sinh",
    currentNotes = "",
    existingQuestions = []
  } = params;

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (apiKey) {
    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      });

      const prompt = `Bạn là Trợ lý AI Phỏng vấn Tuyển sinh & Định hướng học sinh của Hệ thống Giáo dục Sky-Line.
Nhiệm vụ: Gợi ý TỐI ĐA 3 CÂU HỎI PHỎNG VẤN sâu sắc, gần gũi, phù hợp theo nhóm khối để giáo viên phỏng vấn học sinh.

[THÔNG TIN HỌC SINH & TIÊU CHÍ]
- Nhóm khối: ${gradeGroupKey} (Khối ${grade || "chưa rõ"})
- Tên học sinh: ${studentName}
- Tiêu chí đang phỏng vấn: ${criterionName} (${categoryLabel || "Định hướng"})
- Hướng dẫn quan sát sư phạm: ${guideline || "Quan sát phản xạ, thái độ, ngôn ngữ"}
- Ghi nhận hiện tại của GV: ${currentNotes || "Chưa có ghi nhận"}
- Các câu hỏi đã có sẵn/đã hỏi: ${JSON.stringify(existingQuestions)}

[NGUYÊN TẮC THEO NHÓM KHỐI]
- Khối 1 (KHOI_1): Câu hỏi cực kỳ ngắn, trực quan, gần gũi, ngôn ngữ ấm áp, không dùng từ trừu tượng. Tập trung làm quen, sự tự tin, thói quen tự phục vụ.
- Khối 2-5 (KHOI_2_5): Khám phá sở thích, môn học yêu thích, động lực học tập, phản ứng khi gặp bài khó, cảm xúc khi chuyển trường.
- Khối 6 (KHOI_6): Chuyển tiếp cấp 2, thích nghi nhiều giáo viên bộ môn, tự quản lý thời gian, cách giải quyết bài vở khi gặp khó khăn.
- Khối 7-9 (KHOI_7_9): Tự học, cân bằng học tập và năng khiếu/hoạt động, cách làm việc nhóm, xử lý bất đồng, mục tiêu cá nhân.
- Khối 10-12 (KHOI_10_12): Định hướng môn học, khối thi/nghề nghiệp, năng lực tự chủ, tinh thần trách nhiệm, kỳ vọng sau tốt nghiệp.

[YÊU CẦU ĐẦU RA JSON BẮT BUỘC]
Trả về định dạng JSON thuần túy:
{
  "questions": [
    {
      "question": "Nội dung câu hỏi trực tiếp để giáo viên hỏi học sinh...",
      "purpose": "Giải thích ngắn 1 câu mục đích sư phạm cần tìm hiểu ở câu hỏi này"
    }
  ]
}`;

      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
        return {
          success: true,
          questions: parsed.questions.slice(0, 3),
          source: "GEMINI_AI"
        };
      }
    } catch (err: any) {
      console.warn("Gemini AI suggest questions failed, using Rules Engine fallback:", err?.message);
    }
  }

  // FALLBACK DETERMINISTIC RULES ENGINE
  return {
    success: true,
    questions: getFallbackQuestions(gradeGroupKey, criterionName),
    source: "RULES_ENGINE_FALLBACK"
  };
}

/**
 * 2. AI HỖ TRỢ DỰ THẢO NHẬN XÉT THEO TIÊU CHÍ
 * - Dựa trên ghi nhận thực tế và mức đánh giá
 * - Không hư cấu, không gán nhãn tính cách
 * - Mang tính sư phạm xây dựng
 */
export async function draftCriterionComment(params: {
  criterionName: string;
  rating: string;
  rawNotes?: string;
  guideline?: string;
  studentName?: string;
  grade?: string | number | null;
}): Promise<AIDraftCommentResult> {
  const {
    criterionName,
    rating,
    rawNotes = "",
    guideline = "",
    studentName = "Học sinh",
    grade = ""
  } = params;

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (apiKey) {
    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.25,
          responseMimeType: "application/json"
        }
      });

      const prompt = `Bạn là Trợ lý Sư phạm Sky-Line AI Admission.
Nhiệm vụ: Chuyển hóa các từ khóa / ghi chép nhanh của Giáo viên và mức đánh giá thành 01 ĐOẠN NHẬN XÉT SƯ PHẠM NGẮN GỌN (1-3 câu), khách quan, tích cực và đúng mực.

[DỮ LIỆU ĐẦU VÀO]
- Học sinh: ${studentName} (Khối ${grade})
- Tiêu chí: ${criterionName}
- Mức nhận diện: ${rating} (EXCELLENT: Tự tin/Tích cực; NORMAL: Bình thường/Ổn định; NEEDS_SUPPORT: Cần hỗ trợ ban đầu; NOTE: Cần lưu ý thêm)
- Hướng dẫn quan sát: ${guideline}
- Ghi chép nhanh của GV: "${rawNotes || "Chưa có ghi chép cụ thể"}"

[QUY TẮC BẮT BUỘC]
- Tuyệt đối không phán xét tiêu cực hay gán nhãn cố định nhân cách học sinh.
- Nếu ghi chép của GV ít từ, hãy dùng từ ngữ sư phạm chuẩn mực mô tả hành vi quan sát được ở mức độ ${rating}.
- Luôn kèm đề xuất sư phạm hỗ trợ nhẹ nhàng nếu ở mức NEEDS_SUPPORT hoặc NOTE.
- Viết văn phong sư phạm Việt Nam, ngắn gọn, súc tích (dưới 70 từ).

[YÊU CẦU ĐẦU RA JSON BẮT BUỘC]
{
  "draftComment": "Nội dung nhận xét dự thảo...",
  "evidencePoints": ["Điểm ghi nhận 1", "Điểm ghi nhận 2"]
}`;

      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const parsed = JSON.parse(text);
      if (parsed?.draftComment) {
        return {
          success: true,
          draftComment: parsed.draftComment,
          evidencePoints: Array.isArray(parsed.evidencePoints) ? parsed.evidencePoints : [],
          source: "GEMINI_AI"
        };
      }
    } catch (err: any) {
      console.warn("Gemini AI draft comment failed, using Rules Engine fallback:", err?.message);
    }
  }

  // FALLBACK RULES ENGINE DRAFT
  return {
    success: true,
    draftComment: getFallbackComment(criterionName, rating, rawNotes, studentName),
    evidencePoints: rawNotes ? [rawNotes] : [],
    source: "RULES_ENGINE_FALLBACK"
  };
}

/**
 * 3. AI TỔNG HỢP HỒ SƠ ĐỊNH HƯỚNG (AI ADMISSION SUMMARY)
 * Chuẩn hóa 5 nhóm nội dung theo Mục VII & XI của Master Prompt:
 * 1. Điểm mạnh nổi bật
 * 2. Nội dung cần tiếp tục phát triển
 * 3. Khả năng thích nghi
 * 4. Đề xuất hỗ trợ ban đầu
 * 5. Nội dung cần tiếp tục xác minh
 */
export async function synthesizeAdmissionSummary(params: {
  student: any;
  criteriaAnswers: Record<string, any>;
  parentData?: {
    parentExpectations?: string;
    parentPersonalityNotes?: string;
    parentSpecialRequests?: string;
    cooperationCommitment?: string;
    parentHealthNotes?: string;
  };
  surveyScores?: {
    mathScore?: string | number | null;
    literatureScore?: string | number | null;
    writtenEnglishScore?: string | number | null;
    oralEnglishScore?: string | number | null;
    psychologyScore?: string | number | null;
  };
}): Promise<AIAdmissionSummaryResult> {
  const { student, criteriaAnswers = {}, parentData = {}, surveyScores = {} } = params;

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (apiKey) {
    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });

      const prompt = `Bạn là Chuyên gia Tuyển sinh và Định hướng Học sinh Hệ thống Giáo dục Sky-Line (Sky-Line AI Admission).
Nhiệm vụ: Tổng hợp toàn diện hồ sơ định hướng đầu vào của học sinh dựa trên 3 NGUỒN DỮ LIỆU CHUẨN MỰC THỰC TẾ:
- Tab 1: Thông tin Học sinh (Bảng 17 Cột chuẩn)
- Tab 2: Phỏng vấn Học sinh (8 Câu hỏi chuẩn)
- Tab 3: Trao đổi Phụ huynh (PHHS - Gia đình & Nhà trường)

============================================================
[NGUỒN DỮ LIỆU 1: TAB 1 – THÔNG TIN HỌC SINH (BẢNG 17 CỘT CHUẨN)]
============================================================
- 1. Thông tin học sinh: Mã HS: ${student?.studentCode || "Chưa có"} | Họ và tên: ${student?.fullName || "Chưa rõ"} | Ngày sinh: ${student?.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—"} | Giới tính: ${student?.gender || "—"}
- 2. Đợt khảo sát: ${student?.batchName || student?.surveyPeriod || "Chính thức"}
- 3. Khối đăng ký: Khối ${student?.grade || "Chưa rõ"}
- 4. Hệ khảo sát: ${student?.surveySystem || student?.educationSystem || "Chất lượng cao"}
- 5. Diện tuyển sinh: ${student?.admissionCriteria || student?.targetType || "Khảo sát đầu vào"}
- 6. Hình thức KS: ${student?.surveyMode || "Trực tiếp tại cơ sở"}
- 7. Chương trình học tập: ${student?.curriculum || "Chuẩn Sky-Line"}
- 8. Tên trường học cũ: ${student?.oldSchoolName || "Chưa cập nhật"}
- 9. Tỉnh/TP/Quốc gia: ${[student?.wardName, student?.districtName, student?.cityName, student?.countryName].filter(Boolean).join(", ") || "Chưa cập nhật"}
- 10. Hệ học trước: ${student?.oldSchoolType || "Công lập / Tiêu chuẩn"}
- 11. Bảng điểm/Học bạ: ${student?.transcriptStatus || "Đầy đủ"}
- 12. KQ Xếp loại học tập: ${student?.kqHocTap || student?.academicRank || "Tốt"}
- 13. KQ Rèn luyện (Hạnh kiểm): ${student?.kqRenLuyen || student?.conductRank || "Tốt"}
- 14. Điểm Toán (Học bạ): ${student?.mathTranscriptScore ?? "N/A"}
- 15. Điểm Ngữ Văn (Học bạ): ${student?.literatureTranscriptScore ?? "N/A"}
- 16. Điểm Tiếng Anh (Học bạ): ${student?.englishTranscriptScore ?? "N/A"}
- 17. Các môn khác (Học bạ): ${student?.otherTranscriptScores || "Đạt yêu cầu"}

[KẾT QUẢ ĐIỂM KHẢO SÁT CÁC MÔN ĐẦU VÀO TẠI SKY-LINE]
- Toán KS: ${surveyScores.mathScore ?? "Chưa khảo sát"} | Văn/Tiếng Việt KS: ${surveyScores.literatureScore ?? "Chưa khảo sát"}
- Tiếng Anh viết KS: ${surveyScores.writtenEnglishScore ?? "Chưa khảo sát"} | Tiếng Anh nói/phỏng vấn KS: ${surveyScores.oralEnglishScore ?? "Chưa khảo sát"}
- Đánh giá Tâm lý học đường: ${surveyScores.psychologyScore ?? "Chưa có chỉ định"}

============================================================
[NGUỒN DỮ LIỆU 2: TAB 2 – PHỎNG VẤN HỌC SINH (8 CÂU HỎI CHUẨN)]
============================================================
${Object.entries(criteriaAnswers)
  .map(([k, v]: any, idx) => `${idx + 1}. Tiêu chí [${v?.questionText || k}]: Mức nhận diện: ${v?.rating || "NORMAL"}. Nhận xét & Bằng chứng GV: "${v?.teacherComment || v?.notes || "Chưa có ghi chép chi tiết"}"`)
  .join("\n")}

============================================================
[NGUỒN DỮ LIỆU 3: TAB 3 – TRAO ĐỔI PHỤ HUYNH (PHHS) (GIA ĐÌNH & NHÀ TRƯỜNG)]
============================================================
- 1. Nguyện vọng & Kỳ vọng của gia đình đối với sự phát triển của học sinh: "${parentData.parentExpectations || "Gia đình chưa có ghi chú"}"
- 2. Đặc điểm cá nhân, sở thích, tính cách và thói quen sinh hoạt của học sinh: "${parentData.parentPersonalityNotes || "Gia đình chưa có ghi chú"}"
- 3. Nhu cầu hỗ trợ chuyên sâu và đề xuất từ phía gia đình: "${parentData.parentSpecialRequests || "Gia đình chưa có đề xuất đặc biệt"}"
- 4. Nội dung phối hợp giáo dục giữa gia đình và nhà trường (thời gian đồng hành, cam kết): "${parentData.cooperationCommitment || "Gia đình cam kết phối hợp cùng nhà trường"}"
- Lưu ý sức khỏe / thể chất: "${parentData.parentHealthNotes || "Bình thường"}"

============================================================
[QUY TẮC BẮT BUỘC: BÁM SÁT NGUỒN DỮ LIỆU TRÊN – TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT DỮ LIỆU]
============================================================
1. CHỈ SỬ DỤNG VÀ PHÂN TÍCH DỰA TRÊN CÁC DỮ LIỆU CÓ THỰC ĐƯỢC CUNG CẤP Ở TRÊN (TAB 1, TAB 2, TAB 3 VÀ ĐIỂM KHẢO SÁT).
2. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT THÔNG TIN: Không tự sáng tác ra điểm số, năng khiếu, giải thưởng, tình huống gia đình, bệnh lý hay lời nói mà học sinh/phụ huynh chưa từng nêu.
3. NẾU MỘT NỘI DUNG CHƯA CÓ DỮ LIỆU: Phải ghi rõ "Chưa có dữ liệu ghi nhận trong hồ sơ" và bắt buộc đưa vào mục "noiDungCanXacMinh" (Nội dung cần tiếp tục xác minh) để Hội đồng tuyển sinh làm rõ thêm.
4. MỌI ĐÁNH GIÁ PHẢI CÓ CHỨNG CỨ TRÍCH DẪN: Nêu rõ chứng cứ từ điểm số học bạ (Tab 1), từ câu trả lời/nhận xét phỏng vấn của học sinh (Tab 2) hoặc từ chia sẻ của gia đình (Tab 3).
5. TUYỆT ĐỐI KHÔNG TỰ Ý QUYẾT ĐỊNH ĐẠT HOẶC KHÔNG ĐẠT (quyền quyết định thuộc về Hội đồng Tuyển sinh).
6. Văn phong sư phạm chuẩn mực, xây dựng, khách quan, không phán xét tiêu cực hay gán nhãn tính cách.

[YÊU CẦU ĐẦU RA JSON BẮT BUỘC]
{
  "diemManhNoiBat": "Đoạn văn điểm mạnh có căn cứ thực tế từ phỏng vấn, điểm số hoặc học bạ...",
  "noiDungCanPhatTrien": "Đoạn văn nội dung cần rèn luyện thêm dựa trên các tiêu chí Need support/Note...",
  "khaNangThichNghi": "Đoạn văn nhận xét khả năng thích nghi môi trường mới dựa trên phỏng vấn và độ tuổi...",
  "deXuatHoTroBanDau": "Đoạn văn đề xuất biện pháp hỗ trợ phối hợp giữa GVCN và Gia đình trong 4 tuần đầu...",
  "noiDungCanXacMinh": "Các thông tin còn để trống, chưa rõ ràng cần tuyển sinh/chuyên môn xác minh thêm...",
  "khuyenNghiXepLop": "Đề xuất môi trường lớp học/hệ học tham khảo...",
  "heHocDeXuat": "Hệ Chất lượng cao / Song ngữ / Quốc tế..."
}`;

      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const parsed = JSON.parse(text);
      if (parsed?.diemManhNoiBat) {
        return {
          success: true,
          diemManhNoiBat: parsed.diemManhNoiBat,
          noiDungCanPhatTrien: parsed.noiDungCanPhatTrien || "",
          khaNangThichNghi: parsed.khaNangThichNghi || "",
          deXuatHoTroBanDau: parsed.deXuatHoTroBanDau || "",
          noiDungCanXacMinh: parsed.noiDungCanXacMinh || "",
          khuyenNghiXepLop: parsed.khuyenNghiXepLop || "",
          heHocDeXuat: parsed.heHocDeXuat || "",
          source: "GEMINI_AI"
        };
      }
    } catch (err: any) {
      console.warn("Gemini AI synthesis failed, using Rules Engine fallback:", err?.message);
    }
  }

  // FALLBACK RULES ENGINE SYNTHESIS
  return generateFallbackSynthesis(student, criteriaAnswers, parentData, surveyScores);
}

// -------------------------------------------------------------
// DETERMINISTIC RULES ENGINE HELPER FUNCTIONS (FALLBACK)
// -------------------------------------------------------------

function getFallbackQuestions(gradeGroup: GradeGroupKey, criterionName: string): AISuggestedQuestion[] {
  const norm = criterionName.toLowerCase();

  if (gradeGroup === "KHOI_1") {
    if (norm.includes("giới thiệu") || norm.includes("giao tiếp")) {
      return [
        {
          question: "Con có thể kể cho thầy/cô nghe về trò chơi hoặc món đồ chơi mà con thích nhất không?",
          purpose: "Đánh giá khả năng diễn đạt tự nhiên và vốn từ ngữ thường ngày của trẻ."
        },
        {
          question: "Khi đến trường mới, điều gì làm con cảm thấy vui và tò mò nhất?",
          purpose: "Quan sát cảm xúc và tâm thế sẵn sàng bước vào lớp 1."
        },
        {
          question: "Ở nhà ai thường đọc truyện hoặc chơi cùng con nhiều nhất?",
          purpose: "Tìm hiểu thói quen tương tác gia đình và môi trường ngôn ngữ."
        }
      ];
    }
    return [
      {
        question: "Khi gặp một bài vẽ hay trò chơi mà con chưa biết làm, con sẽ làm thế nào?",
        purpose: "Đánh giá phản xạ tìm kiếm sự trợ giúp và tính kiên nhẫn ban đầu."
      },
      {
        question: "Con có thích tự chuẩn bị balo và đồ dùng của mình không?",
        purpose: "Khảo sát tính tự lập và kỹ năng tự phục vụ cơ bản."
      }
    ];
  }

  if (gradeGroup === "KHOI_6") {
    return [
      {
        question: "Lên lớp 6 sẽ có nhiều thầy cô bộ môn khác nhau, con cảm thấy hứng thú hay có chút lo lắng nào không?",
        purpose: "Nhận diện tâm lý chuyển tiếp cấp học và khả năng thích ứng với phương pháp mới."
      },
      {
        question: "Khi có nhiều bài tập trong ngày, con thường sắp xếp thứ tự làm như thế nào?",
        purpose: "Khảo sát kỹ năng quản lý thời gian và tự học cá nhân."
      },
      {
        question: "Môn học nào ở cấp 1 con thấy tự tin nhất và muốn khám phá sâu hơn ở cấp 2?",
        purpose: "Xác định thế mạnh học tập và niềm say mê nghiên cứu."
      }
    ];
  }

  if (gradeGroup === "KHOI_10_12") {
    return [
      {
        question: "Định hướng tổ hợp môn tự chọn và ngành nghề tương lai của em hiện tại như thế nào?",
        purpose: "Đánh giá mức độ rõ ràng trong mục tiêu học tập và định hướng nghề nghiệp."
      },
      {
        question: "Khi đối diện với áp lực thi cử hoặc bài tập nhóm phức tạp, em thường làm gì để duy trì hiệu quả?",
        purpose: "Đánh giá năng lực tự chủ, giải quyết vấn đề và điều tiết cảm xúc."
      },
      {
        question: "Em mong muốn được trải nghiệm hoạt động ngoại khóa hoặc câu lạc bộ nào tại Sky-Line?",
        purpose: "Khám phá nguyện vọng phát triển toàn diện và năng lực hội nhập."
      }
    ];
  }

  // DEFAULT FOR KHOI_2_5 AND KHOI_7_9
  return [
    {
      question: "Con/em thích nhất điều gì trong cách học tập ở trường trước đây?",
      purpose: "Tìm hiểu trải nghiệm tích cực và kỳ vọng về môi trường học tập."
    },
    {
      question: "Khi gặp một nhiệm vụ khó hoặc một bài toán chưa tìm ra cách giải, con/em thường xử lý ra sao?",
      purpose: "Khảo sát sự kiên trì và phương pháp tìm kiếm sự hỗ trợ."
    },
    {
      question: "Nếu được tự chọn một dự án học tập cùng các bạn, con/em muốn làm về chủ đề gì?",
      purpose: "Đánh giá khả năng hợp tác, sáng tạo và sở thích cá nhân."
    }
  ];
}

function getFallbackComment(
  criterionName: string,
  rating: string,
  rawNotes: string,
  studentName: string
): string {
  const notesText = rawNotes.trim();

  if (rating === "EXCELLENT") {
    return notesText
      ? `${studentName} thể hiện nổi bật ở tiêu chí ${criterionName}: ${notesText}. Học sinh tự tin, phản xạ nhanh và có thái độ tích cực.`
      : `${studentName} có biểu hiện rất tốt, tự tin và chủ động trong việc tương tác ở tiêu chí ${criterionName}.`;
  }

  if (rating === "NEEDS_SUPPORT") {
    return notesText
      ? `Ở tiêu chí ${criterionName}, ${notesText}. Cần có sự đồng hành và khích lệ từ GVCN và gia đình trong giai đoạn đầu nhập học.`
      : `${studentName} còn chút rụt rè ở tiêu chí ${criterionName}. Đề xuất GVCN tạo cơ hội để học sinh làm quen và tự tin hơn trong các tuần đầu.`;
  }

  if (rating === "NOTE") {
    return notesText
      ? `Lưu ý ở tiêu chí ${criterionName}: ${notesText}. Cần phối hợp trao đổi thêm cùng gia đình để thống nhất phương pháp hỗ trợ.`
      : `Tiêu chí ${criterionName} cần tiếp tục quan sát thêm trong môi trường lớp học thực tế để có đánh giá toàn diện.`;
  }

  // NORMAL
  return notesText
    ? `Ở tiêu chí ${criterionName}: ${notesText}. Học sinh đáp ứng ổn định, tương tác bình thường theo đúng độ tuổi.`
    : `${studentName} đáp ứng đúng yêu cầu lứa tuổi ở tiêu chí ${criterionName}, hòa nhập ổn định.`;
}

function generateFallbackSynthesis(
  student: any,
  criteriaAnswers: Record<string, any>,
  parentData: any,
  surveyScores: any
): AIAdmissionSummaryResult {
  const answersList = Object.values(criteriaAnswers || {});
  const excellentList = answersList.filter((a: any) => a?.rating === "EXCELLENT");
  const supportList = answersList.filter((a: any) => a?.rating === "NEEDS_SUPPORT" || a?.rating === "NOTE");

  const name = student?.fullName || "Học sinh";
  const grade = student?.grade || "khối đăng ký";

  const diemManhNoiBat = excellentList.length > 0
    ? `${name} có thế mạnh nổi bật về ${excellentList.map((a: any) => a.questionText || a.category).join(", ")}. Tinh thần hợp tác tốt, phản xạ nhanh và có nền tảng học tập ổn định.`
    : `${name} có thái độ học tập và tiếp xúc tích cực, giao tiếp lịch thiệp, sẵn sàng làm quen với môi trường mới tại Sky-Line.`;

  const noiDungCanPhatTrien = supportList.length > 0
    ? `Cần hỗ trợ học sinh ở các mặt: ${supportList.map((a: any) => a.questionText || a.category).join(", ")}. Cần rèn luyện tính kiên trì và sự tự tin khi đối mặt với nhiệm vụ mới.`
    : `Tiếp tục bồi dưỡng nâng cao năng lực tự học và phát huy sở trường cá nhân trong các hoạt động trải nghiệm.`;

  const khaNangThichNghi = `Học sinh có tâm lý sẵn sàng vào ${grade}. Thích ứng bình thường với thầy cô và bạn bè mới nếu được khích lệ kịp thời.`;

  const deXuatHoTroBanDau = parentData?.parentSpecialRequests
    ? `GVCN phối hợp chặt chẽ với gia đình theo nguyện vọng: "${parentData.parentSpecialRequests}". Sắp xếp bạn đồng hành giúp đỡ trong 2 tuần đầu.`
    : `Bố trí bạn cán sự lớp hỗ trợ làm quen không gian trường học trong tuần đầu; GVCN thường xuyên khích lệ học sinh phát biểu.`;

  const noiDungCanXacMinh = !student?.kqHocTap || !student?.oldSchoolName
    ? `Cần bổ sung xác minh bản sao học bạ chính thức và đối chiếu thông tin trường cũ.`
    : `Hồ sơ đầy đủ, không có ghi nhận bất thường về sức khỏe hay tâm lý cần xác minh thêm.`;

  return {
    success: true,
    diemManhNoiBat,
    noiDungCanPhatTrien,
    khaNangThichNghi,
    deXuatHoTroBanDau,
    noiDungCanXacMinh,
    khuyenNghiXepLop: `Phù hợp xếp vào khối ${grade}`,
    heHocDeXuat: student?.surveySystem || "Hệ Chất lượng cao",
    source: "RULES_ENGINE_FALLBACK"
  };
}
