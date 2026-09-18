"use client"

import { useState, useMemo } from "react"
import { Sparkles, Plus, Check, RotateCcw, Save, Zap, Brain, MessageSquare, ThumbsUp, Lightbulb } from "lucide-react"

interface QuickCommentPresetsProps {
  isPreschool?: boolean
  evalK12Scores?: number[]
  evalCriteria?: number[] | Record<string, any>
  onAddStrength: (text: string) => void
  onAddImprovement: (text: string) => void
  onAutoFillFeedback?: (strengths: string, improvements: string) => void
  draftSavedAt?: Date | null
  onRestoreDraft?: () => void
  hasDraft?: boolean
}

const maxScoresK12 = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];

const K12_CRITERIA_STRENGTHS: Record<number, string> = {
  0: "Kế hoạch bài dạy (giáo án) chuẩn bị công phu, chỉn chu, xác định mục tiêu và yêu cầu cần đạt (YCCĐ) bám sát CTGDPT 2018.",
  1: "Sử dụng đồ dùng, thiết bị dạy học và học liệu số sáng tạo, tạo trực quan sinh động cho học sinh.",
  2: "Kiến thức bài học chính xác, khoa học, có hệ thống và mở rộng liên hệ chuyên sâu hợp lý.",
  3: "Đảm bảo tính hệ thống, làm nổi bật trọng tâm bài học, các phần liên kết chặt chẽ và mạch lạc.",
  4: "Liên hệ thực tiễn đời sống sinh động, khéo léo lồng ghép giáo dục phẩm chất và kỹ năng sống.",
  5: "Không đọc chép, giảng giải khúc chiết, bao quát lớp tốt và kịp thời hỗ trợ học sinh khi gặp khó khăn.",
  6: "Tổ chức hoạt động học tập nhóm hiệu quả, học sinh làm việc chủ động, tích cực trao đổi và báo cáo tự tin.",
  7: "Phân phối thời gian bài dạy hợp lý, điều hành các khâu linh hoạt, nhịp nhàng giữa cá nhân và nhóm.",
  8: "Kết hợp linh hoạt các phương pháp dạy học tích cực, đặt câu hỏi kích thích tư duy phản biện của học sinh.",
  9: "Quan sát, đánh giá quá trình (formative assessment) kịp thời, học sinh nắm vững kiến thức trọng tâm.",
  10: "Tiết dạy nhuần nhuyễn, không khí lớp học hào hứng, tương tác thầy - trò tự nhiên, sinh động và truyền cảm hứng."
};

const K12_CRITERIA_IMPROVEMENTS: Record<number, string> = {
  0: "Kế hoạch bài dạy cần cụ thể hóa sản phẩm học tập đầu ra của từng hoạt động và xác định rõ tiêu chí đánh giá.",
  1: "Cần khai thác triệt để hơn thiết bị dạy học và học liệu số, tránh sử dụng mang tính hình thức chiếu lướt.",
  2: "Nội dung bài dạy cần tinh giản phần lý thuyết hàn lâm, tập trung làm rõ và khắc sâu khái niệm cốt lõi.",
  3: "Cần chốt kiến thức trọng tâm rõ ràng sau mỗi hoạt động trước khi chuyển sang nội dung tiếp theo.",
  4: "Nên đưa thêm ví dụ thực tiễn gần gũi với lứa tuổi học sinh vào phần vận dụng để tăng tính ứng dụng.",
  5: "Hạn chế việc giáo viên nói thay hoặc học sinh chép thụ động; tăng cường đặt câu hỏi gợi mở cho học sinh.",
  6: "Cần giao nhiệm vụ nhóm rõ ràng, phân công vai trò cụ thể để tránh tình trạng chỉ một vài em tích cực làm việc.",
  7: "Cần kiểm soát thời gian chặt chẽ hơn ở phần khởi động, dành đủ thời lượng cho học sinh luyện tập và củng cố.",
  8: "Nên áp dụng thêm các kỹ thuật dạy học tích cực (khăn trải bàn, phòng tranh, KWLH) để phân hóa đối tượng học sinh.",
  9: "Tăng cường đánh giá thường xuyên, kiểm tra mức độ nắm bài của nhóm học sinh tiếp thu chậm trước khi kết thúc tiết.",
  10: "Cần tăng cường năng lượng, tạo thêm các điểm nhấn bất ngờ hoặc trò chơi học tập để không khí lớp học thêm sôi nổi."
};

const MN_CRITERIA_STRENGTHS: Record<number, string> = {
  1: "Nội dung bài dạy chính xác, lựa chọn đề tài phù hợp với lứa tuổi và khả năng nhận thức của trẻ.",
  2: "Phương pháp giảng dạy sinh động, sáng tạo, dẫn dắt tự nhiên kích thích sự tò mò và hứng thú của trẻ.",
  3: "Tổ chức góc học tập và hoạt động trải nghiệm tích cực, trẻ được tự do thao tác, khám phá.",
  4: "Chuẩn bị đồ dùng, học cụ trực quan phong phú, an toàn, ứng dụng CNTT khéo léo và đẹp mắt.",
  5: "Trẻ hào hứng, tích cực tương tác với cô và bạn bè, thể hiện tốt các kỹ năng nhận biết và vận động."
};

const MN_CRITERIA_IMPROVEMENTS: Record<number, string> = {
  1: "Nội dung cần điều chỉnh độ khó vừa sức hơn, tránh ôm đồm quá nhiều kiến thức đối với độ tuổi.",
  2: "Cần tăng cường đàm thoại gợi mở, tạo cơ hội cho trẻ diễn đạt bằng ngôn ngữ riêng thay vì cô nói nhiều.",
  3: "Nên để trẻ tự do thao tác và trải nghiệm nhiều hơn, hạn chế can thiệp hoặc làm hộ sản phẩm của trẻ.",
  4: "Cần sắp xếp vị trí đồ dùng và khoảng cách ngồi của trẻ hợp lý hơn khi cô làm mẫu hoặc giới thiệu vật phẩm.",
  5: "Cần bao quát đều các trẻ nhút nhát ở góc lớp, kịp thời khích lệ để tất cả các bé đều được tham gia."
};

export function QuickCommentPresets({
  isPreschool = false,
  evalK12Scores = [],
  evalCriteria = {},
  onAddStrength,
  onAddImprovement,
  onAutoFillFeedback,
  draftSavedAt,
  onRestoreDraft,
  hasDraft = false
}: QuickCommentPresetsProps) {
  const [activePresetTab, setActivePresetTab] = useState<"ai-coach" | "strength" | "improvement">("ai-coach")

  // AI Generated context-aware suggestions
  const aiGeneratedFeedback = useMemo(() => {
    const strengthsList: { id: string; text: string; tag: string }[] = [];
    const improvementsList: { id: string; text: string; tag: string }[] = [];

    if (!isPreschool) {
      if (evalK12Scores && evalK12Scores.length === 11) {
        evalK12Scores.forEach((score, idx) => {
          const max = maxScoresK12[idx];
          if (score >= max) {
            strengthsList.push({
              id: `Y${idx + 1}`,
              text: K12_CRITERIA_STRENGTHS[idx] || "",
              tag: `Y${idx + 1} (${score}/${max}đ)`
            });
          } else if (score < max) {
            improvementsList.push({
              id: `Y${idx + 1}`,
              text: K12_CRITERIA_IMPROVEMENTS[idx] || "",
              tag: `Y${idx + 1} (${score}/${max}đ)`
            });
          }
        });
      }
    } else {
      if (evalCriteria) {
        for (let i = 1; i <= 5; i++) {
          const val = Array.isArray(evalCriteria) ? evalCriteria[i - 1] : evalCriteria[`criterion${i}`];
          if (val === 4) {
            strengthsList.push({
              id: `T${i}`,
              text: MN_CRITERIA_STRENGTHS[i] || "",
              tag: `T${i} (4/4đ)`
            });
          } else if (val !== undefined && val <= 3) {
            improvementsList.push({
              id: `T${i}`,
              text: MN_CRITERIA_IMPROVEMENTS[i] || "",
              tag: `T${i} (${val}/4đ)`
            });
          }
        }
      }
    }

    return { strengthsList, improvementsList };
  }, [isPreschool, evalK12Scores, evalCriteria]);

  const handleApplyAllAI = () => {
    if (!onAutoFillFeedback) return;
    const sText = aiGeneratedFeedback.strengthsList.slice(0, 3).map(s => `• ${s.text}`).join("\n");
    const iText = aiGeneratedFeedback.improvementsList.slice(0, 2).map(i => `• ${i.text}`).join("\n");
    onAutoFillFeedback(sText, iText);
  };

  return (
    <div className="p-4 bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-amber-50/60 rounded-2xl border border-teal-200/80 space-y-3">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <span>Trợ lý Sư phạm AI & Nhận xét Mẫu</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-800">
              AI Coach
            </span>
          </span>
        </div>

        {/* Action Buttons & Draft Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {onAutoFillFeedback && (aiGeneratedFeedback.strengthsList.length > 0 || aiGeneratedFeedback.improvementsList.length > 0) && (
            <button
              type="button"
              onClick={handleApplyAllAI}
              className="text-[11px] font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 px-3 py-1 rounded-lg border border-teal-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Tự động tổng hợp và điền các nhận xét chuyên môn dựa trên điểm số vừa chấm"
            >
              <Zap className="w-3.5 h-3.5 text-teal-700" />
              <span>⚡ Điền nhanh nhận xét AI</span>
            </button>
          )}

          {draftSavedAt && (
            <span className="text-[10px] font-bold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs flex items-center gap-1">
              <Save className="w-3 h-3 text-teal-600" />
              <span>Đã lưu nháp {draftSavedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </span>
          )}
          {hasDraft && onRestoreDraft && (
            <button
              type="button"
              onClick={onRestoreDraft}
              className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục bản nháp</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-teal-200/50 pb-2">
        <button
          type="button"
          onClick={() => setActivePresetTab("ai-coach")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activePresetTab === "ai-coach"
              ? "bg-teal-700 text-white shadow-xs"
              : "text-slate-700 hover:bg-white/80"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Gợi ý theo điểm vừa chấm ({aiGeneratedFeedback.strengthsList.length + aiGeneratedFeedback.improvementsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePresetTab("strength")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activePresetTab === "strength"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-700 hover:bg-white/80"
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>Ưu điểm mẫu</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePresetTab("improvement")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activePresetTab === "improvement"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-700 hover:bg-white/80"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Góp ý phát triển</span>
        </button>
      </div>

      {/* Content Rendering */}
      {activePresetTab === "ai-coach" ? (
        <div className="space-y-3">
          {aiGeneratedFeedback.strengthsList.length === 0 && aiGeneratedFeedback.improvementsList.length === 0 ? (
            <div className="p-4 bg-white/80 rounded-xl border border-dashed border-teal-200 text-center text-xs text-slate-500 font-medium">
              Vui lòng cho điểm các tiêu chí ở trên để AI tự động phân tích và sinh nhận xét chuyên sâu phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Cột Ưu điểm AI */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-teal-900 flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-teal-600" />
                  <span>Ưu điểm nhận diện từ các tiêu chí điểm cao:</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {aiGeneratedFeedback.strengthsList.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onAddStrength(item.text)}
                      className="w-full text-left p-2 bg-white/95 hover:bg-teal-50 border border-teal-100 hover:border-teal-300 rounded-xl transition-all shadow-2xs group flex items-start gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5 group-hover:scale-125 transition-transform" />
                      <div className="text-[11px] text-slate-700 leading-snug">
                        <span className="font-bold text-teal-800 mr-1">[{item.tag}]</span>
                        {item.text}
                      </div>
                    </button>
                  ))}
                  {aiGeneratedFeedback.strengthsList.length === 0 && (
                    <div className="p-2 text-[11px] text-slate-400 italic">Chưa có tiêu chí đạt điểm tối đa</div>
                  )}
                </div>
              </div>

              {/* Cột Góp ý cải thiện AI */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>Góp ý phát triển cho các tiêu chí bị trừ điểm:</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {aiGeneratedFeedback.improvementsList.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onAddImprovement(item.text)}
                      className="w-full text-left p-2 bg-white/95 hover:bg-amber-50 border border-amber-100 hover:border-amber-300 rounded-xl transition-all shadow-2xs group flex items-start gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5 group-hover:scale-125 transition-transform" />
                      <div className="text-[11px] text-slate-700 leading-snug">
                        <span className="font-bold text-amber-800 mr-1">[{item.tag}]</span>
                        {item.text}
                      </div>
                    </button>
                  ))}
                  {aiGeneratedFeedback.improvementsList.length === 0 && (
                    <div className="p-2 text-[11px] text-emerald-700 font-bold">
                      🎉 Tiết dạy đạt điểm tối đa ở tất cả các tiêu chí đã chấm!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {(activePresetTab === "strength"
            ? Object.values(isPreschool ? MN_CRITERIA_STRENGTHS : K12_CRITERIA_STRENGTHS)
            : Object.values(isPreschool ? MN_CRITERIA_IMPROVEMENTS : K12_CRITERIA_IMPROVEMENTS)
          ).map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (activePresetTab === "strength") {
                  onAddStrength(preset);
                } else {
                  onAddImprovement(preset);
                }
              }}
              className="text-[11px] font-medium text-slate-700 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 text-left cursor-pointer group"
            >
              <Plus className="w-3 h-3 text-teal-600 group-hover:scale-125 transition-transform shrink-0" />
              <span>{preset}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
