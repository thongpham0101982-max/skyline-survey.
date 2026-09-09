"use client"

import React, { useRef } from "react"
import { Printer, X, Download, Award, CheckCircle2, Building, Calendar, Clock, User, BookOpen } from "lucide-react"

interface PrintModalProps {
  slot: any
  registration: any
  onClose: () => void
}

const K12_SECTIONS = [
  {
    name: "Tiêu chuẩn 1: Phương tiện (3 điểm)",
    requirements: [
      { id: 1, label: "Yêu cầu 1", max: 1.5, text: "Chuẩn bị giáo án tốt, giáo án phải chỉ rõ các hoạt động của trò và thầy, bám sát chuẩn kiến thức, kỹ năng, thể hiện mức độ phù hợp của các hoạt động học với mục tiêu, nội dung và phương pháp dạy học được sử dụng." },
      { id: 2, label: "Yêu cầu 2", max: 1.5, text: "Tích cực sử dụng đồ dùng, thiết bị dạy học. Thiết bị, đồ dùng dạy học phải phù hợp với nội dung, phương pháp của kiểu bài lên lớp." }
    ]
  },
  {
    name: "Tiêu chuẩn 2: Nội dung (5 điểm)",
    requirements: [
      { id: 3, label: "Yêu cầu 3", max: 2.0, text: "Nội dung bài dạy chính xác, khoa học; Hấp dẫn về nội dung, phương pháp và hình thức giao nhiệm vụ học tập cho học sinh." },
      { id: 4, label: "Yêu cầu 4", max: 2.0, text: "Bảo đảm tính hệ thống, đủ nội dung theo chuẩn kiến thức, kỹ năng và làm rõ trọng tâm của bài học." },
      { id: 5, label: "Yêu cầu 5", max: 1.0, text: "Liên hệ với thực tế đời sống và sản xuất (nếu có). Nội dung liên hệ thực tế có tính giáo dục và gắn với nội dung bài dạy." }
    ]
  },
  {
    name: "Tiêu chuẩn 3: Phương pháp (9 điểm)",
    requirements: [
      { id: 6, label: "Yêu cầu 6", max: 2.0, text: "Không dạy học theo lối 'đọc chép', áp đặt đối với học sinh. Thể hiện khả năng quan sát, theo dõi, phát hiện kịp thời những khó khăn của học sinh." },
      { id: 7, label: "Yêu cầu 7", max: 3.0, text: "Tổ chức học sinh học tập tích cực, chủ động, phù hợp với từng đối tượng trong lớp. Khuyến khích học sinh hợp tác, giúp đỡ nhau khi thực hiện nhiệm vụ học tập." },
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
]

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
]

export function PrintObservationEvaluationModal({ slot, registration, onClose }: PrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const evaluation = registration?.evaluation || slot?.evaluation || null
  const isPreschool = slot?.level === "Mầm non" || (slot?.topic && slot?.topic.toLowerCase().includes("mầm non"))

  const handlePrint = () => {
    window.print()
  }

  // Parse scores
  let scores: number[] = []
  if (evaluation) {
    if (Array.isArray(evaluation.criteriaScores) && evaluation.criteriaScores.length > 0) {
      scores = evaluation.criteriaScores
    } else if (Array.isArray(evaluation.criteria)) {
      scores = evaluation.criteria.map((c: any) => typeof c === "number" ? c : Number(c?.score || 0))
    }
  }

  const sections = isPreschool ? MAMNON_SECTIONS : K12_SECTIONS
  const maxTotalScore = isPreschool ? 10.0 : 20.0
  const actualTotalScore = evaluation?.totalScore != null 
    ? Number(evaluation.totalScore) 
    : scores.reduce((a, b) => a + Number(b || 0), 0)

  const overallRating = evaluation?.overallRating || (isPreschool ? (actualTotalScore >= 9 ? "Tốt" : actualTotalScore >= 8 ? "Khá" : actualTotalScore >= 7 ? "Đạt" : "Không đạt") : (actualTotalScore >= 16 ? "Giỏi" : actualTotalScore >= 13 ? "Khá" : actualTotalScore >= 10 ? "Trung bình" : "Không xếp loại"))

  const hostTeacherName = slot?.teacher?.teacherName || slot?.teacherName || "—"
  const hostTeacherCode = slot?.teacher?.teacherCode || ""
  const hostDept = slot?.teacher?.departmentRel?.name || slot?.deptName || "—"
  const observerName = registration?.teacher?.teacherName || registration?.observerTeacher?.teacherName || "—"
  const observerDept = registration?.teacher?.departmentRel?.name || registration?.observerTeacher?.departmentRel?.name || "—"
  const campusName = slot?.campusName || slot?.campus?.campusName || slot?.teacher?.campus?.campusName || "Hệ thống Giáo dục Sky-Line"

  const slotDateStr = slot?.date ? new Date(slot.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"

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
            padding: 15mm;
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
              <Printer className="w-5 h-5 text-[#48BFE3]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                {isPreschool ? "PHIẾU ĐÁNH GIÁ HOẠT ĐỘNG MẦM NON" : "PHIẾU ĐÁNH GIÁ DỰ GIỜ TIẾT DẠY"}
              </h3>
              <p className="text-[11px] text-teal-100 font-medium">
                Xem trước biểu mẫu in chuẩn A4 & Lưu trữ hồ sơ chuyên môn
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#003B3A] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu (A4)</span>
            </button>
            <button
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
            {/* Header / Quốc hiệu hoặc Đơn vị */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
              <div className="text-center font-sans">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">HỆ THỐNG GIÁO DỤC SKY-LINE</p>
                <p className="text-xs font-black uppercase text-[#003B3A]">{campusName}</p>
                <p className="text-[10px] italic text-slate-500">Tổ CM: {hostDept}</p>
              </div>
              <div className="text-center font-sans">
                <p className="text-[10px] font-black uppercase text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[10px] font-bold text-slate-700">Độc lập - Tự do - Hạnh phúc</p>
                <p className="text-[10px] italic text-slate-500 mt-1">Ngày ...... tháng ...... năm 20...</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 font-sans">
                {isPreschool ? "PHIẾU ĐÁNH GIÁ DỰ GIỜ HOẠT ĐỘNG GIÁO DỤC MẦM NON" : "PHIẾU ĐÁNH GIÁ TIẾT DẠY"}
              </h2>
              <p className="text-xs font-sans text-slate-600 mt-1">
                {isPreschool 
                  ? "(Ban hành theo Quy chế Đánh giá Chuyên môn Bậc Mầm non Sky-Line)"
                  : "(Ban hành theo Công văn 5555/BGDĐT & Chuẩn Chuyên môn Sky-Line)"}
              </p>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 font-sans text-xs">
              <div>
                <span className="font-bold text-slate-600">1. Họ và tên người dạy: </span>
                <span className="font-black text-slate-900">{hostTeacherName} {hostTeacherCode ? `(${hostTeacherCode})` : ""}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">2. Họ và tên người dự: </span>
                <span className="font-black text-slate-900">{observerName}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">3. Môn học / Lĩnh vực: </span>
                <span className="font-bold text-slate-900">{slot?.subjectName || slot?.subject?.subjectName || "—"}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">4. Lớp / Nhóm trẻ: </span>
                <span className="font-bold text-slate-900">{slot?.className || slot?.grade || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="font-bold text-slate-600">5. Tên bài dạy / Hoạt động: </span>
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

            {/* Scoring Rubric Table */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full border-collapse border border-slate-800 text-[11px] font-sans">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-black text-center">
                    <th className="border border-slate-800 p-2 w-10">TT</th>
                    <th className="border border-slate-800 p-2">Nội dung đánh giá theo tiêu chí</th>
                    <th className="border border-slate-800 p-2 w-20">Điểm tối đa</th>
                    <th className="border border-slate-800 p-2 w-20">Điểm đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((section, sIdx) => {
                    let reqStartIdx = 0
                    for (let i = 0; i < sIdx; i++) {
                      reqStartIdx += sections[i].requirements.length
                    }

                    return (
                      <React.Fragment key={sIdx}>
                        <tr className="bg-slate-50/80 font-black text-slate-900">
                          <td colSpan={4} className="border border-slate-800 p-2 uppercase text-[11px] bg-slate-100/60">
                            {section.name}
                          </td>
                        </tr>
                        {section.requirements.map((req, rSubIdx) => {
                          const globalIdx = reqStartIdx + rSubIdx
                          const itemScore = scores[globalIdx] != null ? Number(scores[globalIdx]) : "—"

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
                          )
                        })}
                      </React.Fragment>
                    )
                  })}

                  {/* Summary Row */}
                  <tr className="bg-slate-100 font-black text-slate-900">
                    <td colSpan={2} className="border border-slate-800 p-2.5 text-right uppercase">
                      TỔNG CỘNG ĐIỂM:
                    </td>
                    <td className="border border-slate-800 p-2.5 text-center font-black">
                      {maxTotalScore.toFixed(2)}
                    </td>
                    <td className="border border-slate-800 p-2.5 text-center text-sm font-black text-[#003B3A]">
                      {actualTotalScore.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/50 font-black text-slate-900">
                    <td colSpan={2} className="border border-slate-800 p-2.5 text-right uppercase">
                      XẾP LOẠI TIẾT DẠY / HOẠT ĐỘNG:
                    </td>
                    <td colSpan={2} className="border border-slate-800 p-2.5 text-center text-sm font-black uppercase text-amber-900">
                      {overallRating}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Qualitative Feedback */}
            <div className="space-y-4 mb-8 font-sans text-xs">
              <div className="p-3.5 rounded-xl border border-slate-300">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  1. Ưu điểm nổi bật của tiết dạy / hoạt động:
                </h4>
                <p className="text-slate-700 italic min-h-[40px] whitespace-pre-wrap">
                  {evaluation?.strengths || evaluation?.strengthNote || "— Không có ghi chú —"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-300">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  2. Tồn tại / Góp ý biện pháp khắc phục & phát triển:
                </h4>
                <p className="text-slate-700 italic min-h-[40px] whitespace-pre-wrap">
                  {evaluation?.improvements || evaluation?.improvementNote || "— Không có ghi chú —"}
                </p>
              </div>

              {evaluation?.generalFeedback && (
                <div className="p-3.5 rounded-xl border border-slate-300">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                    3. Đánh giá chung:
                  </h4>
                  <p className="text-slate-700 italic whitespace-pre-wrap">
                    {evaluation.generalFeedback}
                  </p>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 text-center font-sans text-xs mt-10 pt-4 border-t border-slate-300">
              <div>
                <p className="font-bold uppercase text-slate-900">GIÁO VIÊN ĐƯỢC DỰ</p>
                <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                <div className="h-20 flex items-end justify-center font-black text-slate-800">
                  {hostTeacherName}
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-slate-900">TỔ TRƯỞNG CHUYÊN MÔN</p>
                <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                <div className="h-20 flex items-end justify-center font-black text-slate-800">
                  ................................
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-slate-900">NGƯỜI DỰ GIỜ</p>
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
  )
}
