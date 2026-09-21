"use client"

import React, { useRef } from "react"
import { Printer, X, Award, Globe, CheckCircle2, Sparkles, BookOpen, AlertCircle } from "lucide-react"

interface PrintModalProps {
  slot: any
  registration: any
  onClose: () => void
}

// 1. CẤU TRÚC 4 TIÊU CHUẨN - 11 YÊU CẦU KHỐI PHỔ THÔNG (K-12: 20 ĐIỂM)
const K12_SECTIONS = [
  {
    name: "Tiêu chuẩn 1: Phương tiện (3 điểm)",
    requirements: [
      { 
        id: 1, 
        label: "Yêu cầu 1", 
        max: 1.5, 
        mandatoryFor: ["Giỏi", "Khá", "Trung bình"],
        mandatoryText: "Buộc đạt điểm Max (1.5đ) cho loại Giỏi, Khá, TB",
        text: "Chuẩn bị giáo án tốt, giáo án phải chỉ rõ các hoạt động của trò và thầy, bám sát chuẩn kiến thức, kỹ năng, thể hiện mức độ phù hợp của các hoạt động học với mục tiêu, nội dung và phương pháp dạy học được sử dụng." 
      },
      { id: 2, label: "Yêu cầu 2", max: 1.5, text: "Tích cực sử dụng đồ dùng, thiết bị dạy học. Thiết bị, đồ dùng dạy học phải phù hợp với nội dung, phương pháp của kiểu bài lên lớp." }
    ]
  },
  {
    name: "Tiêu chuẩn 2: Nội dung (5 điểm)",
    requirements: [
      { 
        id: 3, 
        label: "Yêu cầu 3", 
        max: 2.0, 
        mandatoryFor: ["Giỏi", "Khá", "Trung bình"],
        mandatoryText: "Buộc đạt điểm Max (2.0đ) cho loại Giỏi, Khá, TB",
        text: "Nội dung bài dạy chính xác, khoa học; Hấp dẫn về nội dung, phương pháp và hình thức giao nhiệm vụ học tập cho học sinh." 
      },
      { id: 4, label: "Yêu cầu 4", max: 2.0, text: "Bảo đảm tính hệ thống, đủ nội dung theo chuẩn kiến thức, kỹ năng và làm rõ trọng tâm của bài học." },
      { id: 5, label: "Yêu cầu 5", max: 1.0, text: "Liên hệ với thực tế đời sống và sản xuất (nếu có). Nội dung liên hệ thực tế có tính giáo dục và gắn với nội dung bài dạy." }
    ]
  },
  {
    name: "Tiêu chuẩn 3: Phương pháp (9 điểm)",
    requirements: [
      { 
        id: 6, 
        label: "Yêu cầu 6", 
        max: 2.0, 
        mandatoryFor: ["Giỏi", "Khá"],
        mandatoryText: "Buộc đạt điểm Max (2.0đ) cho loại Giỏi, Khá",
        text: "Không dạy học theo lối 'đọc chép', áp đặt đối với học sinh. Thể hiện khả năng quan sát, theo dõi, phát hiện kịp thời những khó khăn của học sinh." 
      },
      { 
        id: 7, 
        label: "Yêu cầu 7", 
        max: 3.0, 
        mandatoryFor: ["Giỏi"],
        mandatoryText: "Buộc đạt điểm Max (3.0đ) cho loại Giỏi",
        text: "Tổ chức học sinh học tập tích cực, chủ động, phù hợp với từng đối tượng trong lớp. Khuyến khích học sinh hợp tác, giúp đỡ nhau khi thực hiện nhiệm vụ học tập." 
      },
      { id: 8, label: "Yêu cầu 8", max: 2.0, text: "Thực hiện linh hoạt các khâu lên lớp, phân phối thời gian hợp lý (đúng quy trình theo YCCD của CT2018). Dành thời gian thích hợp để củng cố, luyện tập nhằm khắc sâu trọng tâm bài học." },
      { id: 9, label: "Yêu cầu 9", max: 2.0, text: "Kết hợp tốt các phương pháp trong hoạt động dạy và học. Học sinh tiếp nhận, sẵn sàng, chủ động, sáng tạo, hợp tác thực hiện các nhiệm vụ." }
    ]
  },
  {
    name: "Tiêu chuẩn 4: Kết quả (3 điểm)",
    requirements: [
      { id: 10, label: "Yêu cầu 10", max: 2.0, text: "Mức độ phù hợp, đúng đắn, chính xác của phương án kiểm tra, đánh giá trong quá trình dạy học. Học sinh hiểu bài, nắm vững trọng tâm, biết vận dụng." },
      { id: 11, label: "Yêu cầu 11", max: 1.0, text: "Tiết dạy nhuần nhuyễn, hấp dẫn, gây ấn tượng và có tính sáng tạo." }
    ]
  }
];

// 2. CẤU TRÚC 4 TIÊU CHUẨN - 18 YÊU CẦU KHỐI MẦM NON (10 ĐIỂM)
const MAMNON_SECTIONS = [
  {
    name: "1. Chuẩn bị cho hoạt động (2 điểm)",
    requirements: [
      { id: 1, label: "Yêu cầu 1", max: 1.0, text: "Mục tiêu hoạt động phù hợp với độ tuổi và phù hợp với khả năng của trẻ." },
      { id: 2, label: "Yêu cầu 2", max: 0.5, text: "Các phương tiện dạy học kích thích trẻ hoạt động." },
      { id: 3, label: "Yêu cầu 3", max: 0.5, text: "GV tận dụng các sản phẩm do trẻ làm ra để trẻ được hoạt động." }
    ]
  },
  {
    name: "2. Nội dung hoạt động (3 điểm)",
    requirements: [
      { id: 4, label: "Yêu cầu 4", max: 0.5, text: "Khuyến khích trẻ tham gia hoạt động giáo dục bằng vận động thân thể và các giác quan dưới nhiều hình thức khác nhau." },
      { id: 5, label: "Yêu cầu 5", max: 0.5, text: "Đảm bảo tính chính xác về mặt kiến thức, kỹ năng." },
      { id: 6, label: "Yêu cầu 6", max: 0.5, text: "Kiến thức có hệ thống, gần gũi với cuộc sống thực của trẻ." },
      { id: 7, label: "Yêu cầu 7", max: 0.5, text: "Thiết kế các hoạt động cho trẻ hợp lý, đảm bảo tính phát triển, phù hợp với đặc điểm nhận thức và khả năng tư duy của trẻ." },
      { id: 8, label: "Yêu cầu 8", max: 0.5, text: "Nội dung tích hợp nhẹ nhàng, phù hợp." },
      { id: 9, label: "Yêu cầu 9", max: 0.5, text: "GV hướng dẫn rõ ràng, ngắn gọn, chính xác. GV gợi ý, dẫn dắt trẻ tìm ra câu trả lời, luôn tạo cơ hội cho trẻ tham gia hoạt động." }
    ]
  },
  {
    name: "3. Phương pháp và hình thức tổ chức (3 điểm)",
    requirements: [
      { id: 10, label: "Yêu cầu 10", max: 1.0, text: "Tùy theo từng loại hình tổ chức hoạt động, GV kết hợp các phương pháp một cách linh hoạt và thành thạo. Phân bổ thời gian cho các hoạt động hợp lý." },
      { id: 11, label: "Yêu cầu 11", max: 0.5, text: "Giáo viên tổ chức, điều khiển, hỗ trợ đúng lúc, không làm thay trẻ. Khuyến khích tương tác giữa trẻ với trẻ." },
      { id: 12, label: "Yêu cầu 12", max: 0.5, text: "GV đưa ra những tình huống có vấn đề phù hợp, đúng lúc để tạo hứng thú và kích thích trẻ hoạt động." },
      { id: 13, label: "Yêu cầu 13", max: 0.5, text: "Bao quát lớp tốt, lắng nghe trẻ, khen ngợi trẻ kịp thời. GV có thái độ nhẹ nhàng tình cảm, lôi cuốn trẻ." },
      { id: 14, label: "Yêu cầu 14", max: 0.5, text: "Sử dụng các phương tiện dạy học đạt hiệu quả. Có đa dạng các hình thức cho trẻ hoạt động." }
    ]
  },
  {
    name: "4. Kết quả trên trẻ (2 điểm)",
    requirements: [
      { id: 15, label: "Yêu cầu 15", max: 0.5, text: "Trẻ tích cực, hứng thú trên giờ học." },
      { id: 16, label: "Yêu cầu 16", max: 0.5, text: "Trẻ có nhiều cơ hội để khám phá." },
      { id: 17, label: "Yêu cầu 17", max: 0.5, text: "Mọi trẻ đều được GV hỗ trợ và được tham gia hoạt động." },
      { id: 18, label: "Yêu cầu 18", max: 0.5, text: "Trẻ tự chuẩn bị đồ dùng để hoạt động, GV không làm thay cho trẻ." }
    ]
  }
];

// 3. CẤU TRÚC 10 INDICATORS RUBRIC DỰ GIỜ GIÁO VIÊN NƯỚC NGOÀI (GVNN / ESL WALKTHROUGH: THANG 4.00 ĐIỂM)
const ESL_SECTIONS = [
  {
    sectionKey: "D",
    name: "D. Curriculum Implementation / Thực hiện Chương trình",
    indicators: [
      {
        id: 14,
        label: "Indicator 14",
        text: "The planned content is appropriate for the students' current level.",
        vnText: "Nội dung bài dạy phù hợp với trình độ hiện tại của học sinh."
      },
      {
        id: 15,
        label: "Indicator 15",
        text: "The amount of curriculum content is realistic within the allocated teaching time.",
        vnText: "Khối lượng kiến thức phù hợp với thời lượng tiết dạy."
      },
      {
        id: 16,
        label: "Indicator 16",
        text: "Teaching materials/resources support effective curriculum delivery.",
        vnText: "Tài liệu, học liệu hỗ trợ hiệu quả cho việc truyền tải bài học."
      },
      {
        id: 17,
        label: "Indicator 17",
        text: "The teacher is able to implement the curriculum as intended.",
        vnText: "Giáo viên thực hiện đúng định hướng và mục tiêu chương trình."
      }
    ]
  },
  {
    sectionKey: "E",
    name: "E. Assessment & Student Progress / Đánh giá & Sự Tiến bộ của Học sinh",
    indicators: [
      {
        id: 18,
        label: "Indicator 18",
        text: "The teacher uses formative assessment/checks for understanding regularly.",
        vnText: "Thường xuyên đánh giá quá trình và kiểm tra mức độ hiểu bài."
      },
      {
        id: 19,
        label: "Indicator 19",
        text: "Students receive clear feedback that helps them improve.",
        vnText: "Học sinh nhận được phản hồi rõ ràng giúp tiến bộ."
      },
      {
        id: 20,
        label: "Indicator 20",
        text: "Students who are not making expected progress are identified and supported.",
        vnText: "Học sinh chưa đạt tiến độ được nhận diện và hỗ trợ kịp thời."
      }
    ]
  },
  {
    sectionKey: "ABC",
    name: "A-C. Classroom Instruction & Immersion Climate / Giảng dạy & Môi trường Nhúng Ngôn ngữ",
    indicators: [
      {
        id: 1,
        label: "Indicator 1",
        text: "Clear learning intentions, staging, and structured transitions.",
        vnText: "Mục tiêu bài dạy rõ ràng, tiến trình chặt chẽ và chuyển giao mượt mà."
      },
      {
        id: 2,
        label: "Indicator 2",
        text: "Optimal Teacher Talk Time (TTT) vs. Student Talk Time (STT).",
        vnText: "Cân đối thời gian nói của GV và tối đa hóa thời gian nói của HS."
      },
      {
        id: 3,
        label: "Indicator 3",
        text: "Positive English immersion environment, strong rapport, and active engagement.",
        vnText: "Môi trường học tập tích cực, quan hệ sư phạm tốt và tạo hứng thú cao."
      }
    ]
  }
];

const ESL_RATING_LABELS: Record<string, { label: string; short: string; badge: string }> = {
  "4": { label: "4 - Strong Practice", short: "4", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  "3": { label: "3 - Effective Practice", short: "3", badge: "bg-sky-100 text-sky-800 border-sky-300" },
  "2": { label: "2 - Developing", short: "2", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  "1": { label: "1 - Needs Support", short: "1", badge: "bg-rose-100 text-rose-800 border-rose-300" },
  "N/O": { label: "N/O - Not Observed", short: "N/O", badge: "bg-slate-100 text-slate-600 border-slate-300" }
};

export function PrintObservationEvaluationModal({ slot, registration, onClose }: PrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const evaluation = registration?.evaluation || slot?.evaluation || null;

  // PHÂN LOẠI CHUẨN XÁC 3 KHỐI: MẦM NON, GVNN, HOẶC PHỔ THÔNG
  const subj = (slot?.subjectName || "").toLowerCase();
  const top = (slot?.topic || "").toLowerCase();
  const desc = (slot?.description || "").toLowerCase();
  const evalComment = evaluation?.generalComment || "";
  const isWalkthroughEval = evalComment.includes('"criterionScores"') || evalComment.includes('"teacherVoice"') || evalComment.includes('"targetSkills"');

  const isForeignEsl = slot?.requestOrigin === "FOREIGN_WALKTHROUGH" ||
    isWalkthroughEval ||
    desc.includes("dự giờ gvnn") ||
    desc.includes("du gio gvnn") ||
    (desc.includes("gvnn") && (desc.includes("tiếng anh") || desc.includes("foreign") || desc.includes("esl"))) ||
    top.includes("walkthrough") ||
    (top.includes("gvnn") && top.includes("esl")) ||
    (slot?.teacher?.position === "GVNN");

  const isPreschool = !isForeignEsl && (
    slot?.level === "Mầm non" ||
    (slot?.grade || "").toLowerCase().includes("mầm non") ||
    (slot?.grade || "").toLowerCase().includes("mẫu giáo") ||
    (slot?.grade || "").toLowerCase().includes("nhà trẻ") ||
    (slot?.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non") ||
    (slot?.teacher?.departmentRel?.name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("mam non") ||
    (typeof slot?.className === "string" && (
      slot.className.includes("READY FOR SKY-LINE") ||
      slot.className.includes("WINGS") ||
      slot.className.includes("NEWTON") ||
      slot.className.includes("MONTESSORI")
    ))
  );

  const categoryType: "MAM_NON" | "GVNN_ESL" | "K12" = isForeignEsl ? "GVNN_ESL" : isPreschool ? "MAM_NON" : "K12";

  const handlePrint = () => {
    window.print();
  };

  // PARSE ĐIỂM VÀ DỮ LIỆU ĐÁNH GIÁ THEO TỪNG LOẠI
  let parsedGeneral: any = null;
  if (evalComment && evalComment.startsWith("{")) {
    try {
      parsedGeneral = JSON.parse(evalComment);
    } catch {}
  }

  // Dữ liệu GVNN
  const eslCriterionScoresMap: Record<number, { score: number; rating: string; evidence?: string; notes?: string }> = {};
  if (parsedGeneral?.criterionScores && Array.isArray(parsedGeneral.criterionScores)) {
    parsedGeneral.criterionScores.forEach((item: any) => {
      eslCriterionScoresMap[item.id] = {
        score: item.score,
        rating: item.score === 4 ? "4" : item.score === 3 ? "3" : item.score === 2 ? "2" : item.score === 1 ? "1" : "N/O",
        evidence: item.evidence || "",
        notes: item.notes || ""
      };
    });
  }

  // Dữ liệu K12 & Mầm non
  let standardScores: number[] = [];
  if (evaluation) {
    if (parsedGeneral?.scores && Array.isArray(parsedGeneral.scores)) {
      standardScores = parsedGeneral.scores;
    } else if (Array.isArray(evaluation.criteriaScores) && evaluation.criteriaScores.length > 0) {
      standardScores = evaluation.criteriaScores;
    } else if (Array.isArray(evaluation.criteria)) {
      standardScores = evaluation.criteria.map((c: any) => typeof c === "number" ? c : Number(c?.score || 0));
    } else if (evaluation.criterion1 != null) {
      standardScores = [
        Number(evaluation.criterion1 || 0),
        Number(evaluation.criterion2 || 0),
        Number(evaluation.criterion3 || 0),
        Number(evaluation.criterion4 || 0),
        Number(evaluation.criterion5 || 0)
      ];
    }
  }

  // TỔNG ĐIỂM VÀ XẾP LOẠI THEO ĐÚNG KHỐI
  let maxTotalScore = 20.0;
  let actualTotalScore = 0;
  let overallRating = evaluation?.overallRating || "";

  if (categoryType === "MAM_NON") {
    maxTotalScore = 10.0;
    actualTotalScore = evaluation?.totalScore != null 
      ? Number(evaluation.totalScore) 
      : standardScores.reduce((a, b) => a + Number(b || 0), 0);
    if (!overallRating) {
      overallRating = actualTotalScore >= 9.0 ? "Tốt" : actualTotalScore >= 8.0 ? "Khá" : actualTotalScore >= 7.0 ? "Đạt" : "Không đạt";
    }
  } else if (categoryType === "GVNN_ESL") {
    maxTotalScore = 4.0;
    actualTotalScore = evaluation?.totalScore != null
      ? Number(evaluation.totalScore)
      : (parsedGeneral?.criterionScores && parsedGeneral.criterionScores.length > 0
          ? parsedGeneral.criterionScores.reduce((acc: number, cur: any) => acc + (cur.score || 0), 0) / parsedGeneral.criterionScores.length
          : 3.0);
    if (!overallRating) {
      overallRating = parsedGeneral?.overallRatingText || "Effective Practice";
    }
  } else {
    // K12
    maxTotalScore = 20.0;
    actualTotalScore = evaluation?.totalScore != null 
      ? Number(evaluation.totalScore) 
      : standardScores.reduce((a, b) => a + Number(b || 0), 0);
    if (!overallRating) {
      overallRating = actualTotalScore >= 17.0 ? "Giỏi" : actualTotalScore >= 14.0 ? "Khá" : actualTotalScore >= 12.0 ? "Trung bình" : "Không xếp loại";
    }
  }

  const hostTeacherName = slot?.teacher?.teacherName || slot?.teacherName || "—";
  const hostTeacherCode = slot?.teacher?.teacherCode || "";
  const hostDept = slot?.teacher?.departmentRel?.name || slot?.deptName || (categoryType === "GVNN_ESL" ? "Tổ Tiếng Anh & Quốc tế" : "—");
  const observerName = registration?.teacher?.teacherName || registration?.observerTeacher?.teacherName || "—";
  const campusName = slot?.campusName || slot?.campus?.campusName || slot?.teacher?.campus?.campusName || "Hệ thống Giáo dục Sky-Line";
  const slotDateStr = slot?.date ? new Date(slot.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-evaluation-sheet, #print-evaluation-sheet * {
            visibility: visible;
          }
          #print-evaluation-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 12mm 15mm;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="no-print px-6 py-4 bg-gradient-to-r from-[#003B3A] to-[#1E8B87] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              {categoryType === "GVNN_ESL" ? <Globe className="w-5 h-5 text-[#48BFE3]" /> : <Printer className="w-5 h-5 text-[#48BFE3]" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                {categoryType === "MAM_NON"
                  ? "PHIẾU ĐÁNH GIÁ DỰ GIỜ HOẠT ĐỘNG MẦM NON (10.00đ)"
                  : categoryType === "GVNN_ESL"
                  ? "PHIẾU DỰ GIỜ GIÁO VIÊN NƯỚC NGOÀI - ESL WALKTHROUGH (4.00đ)"
                  : "PHIẾU ĐÁNH GIÁ DỰ GIỜ TIẾT DẠY PHỔ THÔNG (20.00đ)"}
              </h3>
              <p className="text-[11px] text-teal-100 font-medium">
                Biểu mẫu in chuẩn A4 & Lưu trữ hồ sơ chuyên môn • Hệ thống Quản trị Chất lượng Sky-Line
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#003B3A] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-slate-50/50">
          <div
            id="print-evaluation-sheet"
            ref={printRef}
            className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm text-slate-800 text-xs font-serif leading-relaxed max-w-3xl mx-auto print:max-w-none print:p-0 print:border-0"
          >
            {/* Header: Đơn vị & Quốc hiệu */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-5 font-sans">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">HỆ THỐNG GIÁO DỤC SKY-LINE</p>
                <p className="text-xs font-black uppercase text-[#003B3A]">{campusName}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {categoryType === "GVNN_ESL" 
                    ? "TỔ TIẾNG ANH QUỐC TẾ & GVNN"
                    : categoryType === "MAM_NON"
                    ? "BẬC MẦM NON"
                    : `TỔ CHUYÊN MÔN: ${hostDept}`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[10px] font-bold text-slate-700">Độc lập - Tự do - Hạnh phúc</p>
                <p className="text-[10px] italic text-slate-500 mt-1">Ngày ...... tháng ...... năm 20...</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-5 font-sans">
              {categoryType === "MAM_NON" && (
                <>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                    PHIẾU ĐÁNH GIÁ DỰ GIỜ HOẠT ĐỘNG GIÁO DỤC MẦM NON
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    (Ban hành theo Quy chế Đánh giá Chuyên môn Bậc Mầm non Sky-Line)
                  </p>
                </>
              )}
              {categoryType === "GVNN_ESL" && (
                <>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                    PHIẾU ĐÁNH GIÁ DỰ GIỜ TIẾT DẠY GIÁO VIÊN NƯỚC NGOÀI
                  </h2>
                  <p className="text-xs font-bold text-[#003B3A] mt-0.5 uppercase tracking-wider">
                    FOREIGN TEACHER LESSON OBSERVATION FORM (ESL WALKTHROUGH)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 italic">
                    (Ban hành theo Khung Tiêu chuẩn Quan sát Chuyên môn ESL Sky-Line & Cambridge International Framework)
                  </p>
                </>
              )}
              {categoryType === "K12" && (
                <>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                    PHIẾU ĐÁNH GIÁ TIẾT DẠY KHỐI PHỔ THÔNG
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    (Ban hành theo Công văn 5555/BGDĐT & Chuẩn Chuyên môn Sky-Line)
                  </p>
                </>
              )}
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 font-sans text-xs">
              <div>
                <span className="font-bold text-slate-600">
                  {categoryType === "GVNN_ESL" ? "1. Giáo viên được dự (Host Teacher): " : "1. Họ và tên người dạy: "}
                </span>
                <span className="font-black text-slate-900">{hostTeacherName} {hostTeacherCode ? `(${hostTeacherCode})` : ""}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">
                  {categoryType === "GVNN_ESL" ? "2. Người dự giờ (Observer): " : "2. Họ và tên người dự: "}
                </span>
                <span className="font-black text-slate-900">{observerName}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">3. Môn học / Lĩnh vực: </span>
                <span className="font-bold text-slate-900">{slot?.subjectName || (categoryType === "GVNN_ESL" ? "Tiếng Anh (ESL)" : "—")}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">
                  {categoryType === "MAM_NON" ? "4. Lớp / Nhóm trẻ: " : "4. Lớp / Grade: "}
                </span>
                <span className="font-bold text-slate-900">{slot?.className || slot?.grade || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="font-bold text-slate-600">
                  {categoryType === "GVNN_ESL" ? "5. Topic / Unit / Tên bài dạy: " : "5. Tên bài dạy / Hoạt động: "}
                </span>
                <span className="font-black text-slate-900">{slot?.topic || "—"}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">6. Ngày dự: </span>
                <span className="font-bold text-slate-900">{slotDateStr}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">7. Tiết / Thời gian: </span>
                <span className="font-bold text-slate-900">{slot?.period || "—"} {slot?.startTime ? `(${slot.startTime} - ${slot.endTime || ""})` : ""}</span>
              </div>
            </div>

            {/* BẢNG TIÊU CHÍ 1: MẦM NON (THANG 10.00 ĐIỂM) */}
            {categoryType === "MAM_NON" && (
              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse border border-slate-800 text-[11px] font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black text-center">
                      <th className="border border-slate-800 p-2 w-10">TT</th>
                      <th className="border border-slate-800 p-2">Nội dung đánh giá 4 lĩnh vực hoạt động Mầm non</th>
                      <th className="border border-slate-800 p-2 w-20">Điểm Max</th>
                      <th className="border border-slate-800 p-2 w-20">Điểm đạt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MAMNON_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += MAMNON_SECTIONS[i].requirements.length;
                      }

                      return (
                        <React.Fragment key={sIdx}>
                          <tr className="bg-slate-50/80 font-black text-slate-900">
                            <td colSpan={4} className="border border-slate-800 p-2 uppercase text-[11px] bg-slate-100/60">
                              {sec.name}
                            </td>
                          </tr>
                          {sec.requirements.map((req, rSubIdx) => {
                            const globalIdx = reqStartIdx + rSubIdx;
                            const itemScore = standardScores[globalIdx] != null ? Number(standardScores[globalIdx]) : "—";

                            return (
                              <tr key={req.id}>
                                <td className="border border-slate-800 p-2 text-center font-bold">{req.id}</td>
                                <td className="border border-slate-800 p-2">
                                  <span className="font-bold text-slate-900">{req.label}: </span>
                                  <span className="text-slate-700">{req.text}</span>
                                </td>
                                <td className="border border-slate-800 p-2 text-center font-bold">{req.max.toFixed(2)}</td>
                                <td className="border border-slate-800 p-2 text-center font-black text-slate-900">
                                  {typeof itemScore === "number" ? itemScore.toFixed(2) : itemScore}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}

                    {/* Summary Row */}
                    <tr className="bg-slate-100 font-black text-slate-900">
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-right uppercase">
                        TỔNG CỘNG ĐIỂM (THANG 10.00 ĐIỂM):
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center font-black">
                        10.00
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center text-sm font-black text-[#003B3A]">
                        {actualTotalScore.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-amber-50/50 font-black text-slate-900">
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-right uppercase">
                        XẾP LOẠI HOẠT ĐỘNG GIÁO DỤC:
                      </td>
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-center text-sm font-black uppercase text-amber-900">
                        {overallRating}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Ghi chú xếp loại Mầm non */}
                <div className="mt-2 text-[10px] text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                  <p className="font-bold text-slate-800 not-italic mb-1">(*) Quy chuẩn Xếp loại Hoạt động Chuyên môn Bậc Mầm non Sky-Line:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-sans">
                    <span className="bg-emerald-50 text-emerald-800 p-1 rounded border border-emerald-200 font-bold">Tốt: ≥ 9.00 điểm</span>
                    <span className="bg-sky-50 text-sky-800 p-1 rounded border border-sky-200 font-bold">Khá: 8.00 - 8.99 điểm</span>
                    <span className="bg-teal-50 text-teal-800 p-1 rounded border border-teal-200 font-bold">Đạt: 7.00 - 7.99 điểm</span>
                    <span className="bg-rose-50 text-rose-800 p-1 rounded border border-rose-200 font-bold">Không đạt: &lt; 7.00 điểm</span>
                  </div>
                </div>
              </div>
            )}

            {/* BẢNG TIÊU CHÍ 2: KHỐI PHỔ THÔNG (THANG 20.00 ĐIỂM) */}
            {categoryType === "K12" && (
              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse border border-slate-800 text-[11px] font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black text-center">
                      <th className="border border-slate-800 p-2 w-10">TT</th>
                      <th className="border border-slate-800 p-2">Nội dung đánh giá theo 11 tiêu chí Công văn 5555</th>
                      <th className="border border-slate-800 p-2 w-20">Điểm Max</th>
                      <th className="border border-slate-800 p-2 w-20">Điểm đạt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {K12_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += K12_SECTIONS[i].requirements.length;
                      }

                      return (
                        <React.Fragment key={sIdx}>
                          <tr className="bg-slate-50/80 font-black text-slate-900">
                            <td colSpan={4} className="border border-slate-800 p-2 uppercase text-[11px] bg-slate-100/60">
                              {sec.name}
                            </td>
                          </tr>
                          {sec.requirements.map((req, rSubIdx) => {
                            const globalIdx = reqStartIdx + rSubIdx;
                            const itemScore = standardScores[globalIdx] != null ? Number(standardScores[globalIdx]) : "—";

                            return (
                              <tr key={req.id}>
                                <td className="border border-slate-800 p-2 text-center font-bold">{req.id}</td>
                                <td className="border border-slate-800 p-2">
                                  <span className="font-bold text-slate-900">{req.label}: </span>
                                  <span className="text-slate-700">{req.text}</span>
                                  {req.mandatoryText && (
                                    <span className="ml-2 inline-block text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
                                      ★ {req.mandatoryText}
                                    </span>
                                  )}
                                </td>
                                <td className="border border-slate-800 p-2 text-center font-bold">{req.max.toFixed(2)}</td>
                                <td className="border border-slate-800 p-2 text-center font-black text-slate-900">
                                  {typeof itemScore === "number" ? itemScore.toFixed(2) : itemScore}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}

                    {/* Summary Row */}
                    <tr className="bg-slate-100 font-black text-slate-900">
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-right uppercase">
                        TỔNG CỘNG ĐIỂM (THANG 20.00 ĐIỂM):
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center font-black">
                        20.00
                      </td>
                      <td className="border border-slate-800 p-2.5 text-center text-sm font-black text-[#003B3A]">
                        {actualTotalScore.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-amber-50/50 font-black text-slate-900">
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-right uppercase">
                        XẾP LOẠI TIẾT DẠY:
                      </td>
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-center text-sm font-black uppercase text-amber-900">
                        {overallRating}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Ghi chú ràng buộc K-12 */}
                <div className="mt-2 text-[10px] text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                  <p className="font-bold text-slate-800 not-italic mb-0.5">(*) Ghi chú quy định ràng buộc xếp loại K-12 (Chuẩn 20 điểm):</p>
                  <ul className="list-disc list-inside space-y-0.5 font-sans">
                    <li><strong className="text-slate-700 font-bold">Loại Giỏi (≥ 17.0đ):</strong> Buộc đạt điểm Max ở Yêu cầu 1 (1.5đ), 3 (2.0đ), 6 (2.0đ), 7 (3.0đ) và không có yêu cầu nào dưới 50% điểm tối đa.</li>
                    <li><strong className="text-slate-700 font-bold">Loại Khá (≥ 14.0đ):</strong> Buộc đạt điểm Max ở Yêu cầu 1 (1.5đ), 3 (2.0đ), 6 (2.0đ) và không có yêu cầu nào dưới 50% điểm tối đa.</li>
                    <li><strong className="text-slate-700 font-bold">Loại Trung bình (≥ 12.0đ):</strong> Buộc đạt điểm Max ở Yêu cầu 1 (1.5đ), 3 (2.0đ) và không có yêu cầu nào bị điểm 0.</li>
                    <li><strong className="text-slate-700 font-bold">Không xếp loại:</strong> Tổng điểm &lt; 12.0đ hoặc không thỏa mãn các tiêu chí bắt buộc đạt Max tương ứng.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* BẢNG TIÊU CHÍ 3: DỰ GIỜ GIÁO VIÊN NƯỚC NGOÀI (ESL WALKTHROUGH - THANG 4.00 ĐIỂM) */}
            {categoryType === "GVNN_ESL" && (
              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse border border-slate-800 text-[11px] font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black text-center">
                      <th className="border border-slate-800 p-2 w-10">No.</th>
                      <th className="border border-slate-800 p-2">ESL Walkthrough Rubric Indicators (Song ngữ)</th>
                      <th className="border border-slate-800 p-2 w-28">Đánh giá (1-4)</th>
                      <th className="border border-slate-800 p-2 w-48">Evidence & Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ESL_SECTIONS.map((sec, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <tr className="bg-slate-50/90 font-black text-slate-900">
                          <td colSpan={4} className="border border-slate-800 p-2 uppercase text-[11px] bg-slate-100/70 text-[#003B3A]">
                            {sec.name}
                          </td>
                        </tr>
                        {sec.indicators.map((ind) => {
                          const itemData = eslCriterionScoresMap[ind.id] || { score: 3, rating: "3", evidence: "", notes: "" };
                          const ratingCfg = ESL_RATING_LABELS[itemData.rating] || ESL_RATING_LABELS["3"];

                          return (
                            <tr key={ind.id}>
                              <td className="border border-slate-800 p-2 text-center font-bold">#{ind.id}</td>
                              <td className="border border-slate-800 p-2">
                                <span className="font-bold text-slate-900">{ind.label}: </span>
                                <span className="text-slate-800">{ind.text}</span>
                                <p className="text-[10px] text-slate-500 italic mt-0.5">{ind.vnText}</p>
                              </td>
                              <td className="border border-slate-800 p-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] border ${ratingCfg.badge}`}>
                                  {ratingCfg.label}
                                </span>
                              </td>
                              <td className="border border-slate-800 p-2 text-[10px] text-slate-700">
                                {itemData.evidence && <p><strong>Minh chứng:</strong> {itemData.evidence}</p>}
                                {itemData.notes && <p className="mt-0.5 text-teal-800"><strong>Tác động:</strong> {itemData.notes}</p>}
                                {!itemData.evidence && !itemData.notes && <span className="text-slate-400 italic">— Đạt yêu cầu —</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}

                    {/* Summary Row */}
                    <tr className="bg-slate-100 font-black text-slate-900">
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-right uppercase">
                        ĐIỂM TRUNG BÌNH RUBRIC (THANG 4.00 ĐIỂM):
                      </td>
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-center text-sm font-black text-[#003B3A]">
                        {actualTotalScore.toFixed(2)} / 4.00đ
                      </td>
                    </tr>
                    <tr className="bg-sky-50/60 font-black text-slate-900">
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-right uppercase">
                        OVERALL RATING / XẾP LOẠI TIẾT DẠY GVNN:
                      </td>
                      <td colSpan={2} className="border border-slate-800 p-2.5 text-center text-sm font-black uppercase text-sky-950">
                        {overallRating}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Thang đánh giá Rubric ESL */}
                <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 font-sans">
                  <p className="font-bold text-slate-800 mb-1">(*) Thang đánh giá Khung ESL Walkthrough (Sky-Line / Cambridge Standards):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <span className="bg-emerald-50 text-emerald-800 p-1 rounded border border-emerald-200 font-bold">4: Strong Practice (Xuất sắc)</span>
                    <span className="bg-sky-50 text-sky-800 p-1 rounded border border-sky-200 font-bold">3: Effective (Đạt chuẩn / Hiệu quả)</span>
                    <span className="bg-amber-50 text-amber-800 p-1 rounded border border-amber-200 font-bold">2: Developing (Cần hoàn thiện)</span>
                    <span className="bg-rose-50 text-rose-800 p-1 rounded border border-rose-200 font-bold">1: Needs Support (Cần hỗ trợ)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Qualitative Feedback (Nhận xét định tính) */}
            <div className="space-y-3.5 mb-8 font-sans text-xs">
              <div className="p-3.5 rounded-xl border border-slate-300">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  {categoryType === "GVNN_ESL" ? "1. Key Strengths / Ưu điểm nổi bật của tiết dạy:" : "1. Ưu điểm nổi bật của tiết dạy / hoạt động:"}
                </h4>
                <p className="text-slate-700 italic min-h-[36px] whitespace-pre-wrap">
                  {evaluation?.strengths || parsedGeneral?.summary?.keyStrengths || "— Không có ghi chú —"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-300">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  {categoryType === "GVNN_ESL" ? "2. Key Challenges & Growth Areas / Tồn tại & Điểm cần cải thiện:" : "2. Tồn tại / Góp ý biện pháp khắc phục & phát triển:"}
                </h4>
                <p className="text-slate-700 italic min-h-[36px] whitespace-pre-wrap">
                  {evaluation?.improvements || parsedGeneral?.summary?.keyChallenges || "— Không có ghi chú —"}
                </p>
              </div>

              {categoryType === "GVNN_ESL" && parsedGeneral?.summary?.studentProgressEvidence && (
                <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/30">
                  <h4 className="font-bold text-teal-950 uppercase text-[11px] mb-1">
                    3. Student Impact & Evidence / Minh chứng tác động học sinh:
                  </h4>
                  <p className="text-teal-900 italic min-h-[30px] whitespace-pre-wrap">
                    {parsedGeneral.summary.studentProgressEvidence}
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-xl border border-slate-300">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  {categoryType === "GVNN_ESL" ? "4. Teacher Voice & Agreed Action Plan / Kế hoạch hành động thống nhất:" : "3. Đánh giá chung & Phản hồi:"}
                </h4>
                <p className="text-slate-700 italic min-h-[36px] whitespace-pre-wrap">
                  {parsedGeneral?.summary?.agreedActions || evaluation?.generalComment || evaluation?.generalFeedback || "— Không có ghi chú —"}
                </p>
              </div>

              {evaluation?.teacherFeedback && (
                <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/30">
                  <h4 className="font-bold text-emerald-950 uppercase text-[11px] mb-1 flex items-center justify-between">
                    <span>Ý kiến tiếp thu & phản hồi của Giáo viên dạy:</span>
                    {evaluation.teacherAcknowledgedAt && (
                      <span className="text-[10px] text-emerald-800 font-normal normal-case">
                        (Xác nhận ngày {new Date(evaluation.teacherAcknowledgedAt).toLocaleDateString("vi-VN")})
                      </span>
                    )}
                  </h4>
                  <p className="text-emerald-900 italic min-h-[30px] whitespace-pre-wrap">
                    {evaluation.teacherFeedback}
                  </p>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 text-center font-sans text-xs mt-8 pt-4 border-t border-slate-300">
              <div>
                <p className="font-bold uppercase text-slate-900">
                  {categoryType === "GVNN_ESL" ? "HOST TEACHER / GV DẠY" : "GIÁO VIÊN ĐƯỢC DỰ"}
                </p>
                <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                <div className="h-20 flex flex-col items-center justify-end font-black text-slate-800">
                  {evaluation?.teacherAcknowledgedAt && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mb-1">
                      ✓ Đã tiếp thu {new Date(evaluation.teacherAcknowledgedAt).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                  <span>{hostTeacherName}</span>
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-slate-900">
                  {categoryType === "GVNN_ESL" ? "HEAD OF ENGLISH DEPT / TTCM" : "TỔ TRƯỞNG CHUYÊN MÔN"}
                </p>
                <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                <div className="h-20 flex items-end justify-center font-black text-slate-800">
                  ................................
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-slate-900">
                  {categoryType === "GVNN_ESL" ? "OBSERVER / NGƯỜI DỰ" : "NGƯỜI DỰ GIỜ"}
                </p>
                <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                <div className="h-20 flex items-end justify-center font-black text-slate-800">
                  {observerName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
