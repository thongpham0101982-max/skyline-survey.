"use client";

import React, { useState } from "react";
import { X, Star, CheckCircle2, AlertCircle, ShieldAlert, FileCheck2 } from "lucide-react";
import {
  SLC_IDEA_STAR_DESCRIPTIONS,
  SLC_PRODUCT_STAR_DESCRIPTIONS,
} from "@/lib/skyline-connect/constants";

interface RatingAndApplicationModalProps {
  isOpen: boolean;
  mode: "RATING" | "APPLICATION" | "REPORT";
  targetType: "IDEA" | "PRODUCT" | "POST" | "COMMENT" | "PROJECT";
  targetId: string;
  targetTitle: string;
  postId?: string;
  initialStars?: number;
  initialReviewText?: string;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

const CRITERIA_CHIPS = [
  "Sát thực tế lớp học",
  "Tiết kiệm thời gian GV",
  "Tăng hứng thú học sinh",
  "Dễ nhân rộng liên môn",
  "Hướng dẫn rõ ràng",
  "An toàn dữ liệu HS",
];

export function RatingAndApplicationModal({
  isOpen,
  mode,
  targetType,
  targetId,
  targetTitle,
  postId,
  initialStars = 5,
  initialReviewText = "",
  onClose,
  onSuccess,
}: RatingAndApplicationModalProps) {
  const [stars, setStars] = useState<number>(initialStars || 5);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(["Sát thực tế lớp học"]);
  const [reviewText, setReviewText] = useState(initialReviewText);
  const [confirmedExperienced, setConfirmedExperienced] = useState(true);

  // Application form fields
  const [subjectOrTask, setSubjectOrTask] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [howApplied, setHowApplied] = useState("");
  const [observedResult, setObservedResult] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [requestVerification, setRequestVerification] = useState(true);

  // Report form fields
  const [reasonCategory, setReasonCategory] = useState<
    "PII_STUDENT" | "INAPPROPRIATE" | "COPYRIGHT" | "SPAM" | "INACCURATE" | "OTHER"
  >("PII_STUDENT");
  const [reportDescription, setReportDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const starDescriptions =
    targetType === "IDEA" ? SLC_IDEA_STAR_DESCRIPTIONS : SLC_PRODUCT_STAR_DESCRIPTIONS;
  const currentStarDesc = starDescriptions[stars] || starDescriptions[5];

  const toggleCriterion = (c: string) => {
    if (selectedCriteria.includes(c)) {
      setSelectedCriteria(selectedCriteria.filter((x) => x !== c));
    } else {
      setSelectedCriteria([...selectedCriteria, c]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (mode === "RATING") {
        const res = await fetch("/api/skyline-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submitRating",
            targetType: targetType === "IDEA" ? "IDEA" : "PRODUCT",
            targetId,
            stars,
            criteriaTags: selectedCriteria,
            reviewText: reviewText.trim(),
            confirmedExperienced: targetType === "PRODUCT" ? confirmedExperienced : true,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Không thể gửi đánh giá sao.");
        onSuccess(json);
        onClose();
        return;
      }

      if (mode === "APPLICATION") {
        const res = await fetch("/api/skyline-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submitApplication",
            productId: targetId,
            subjectOrTask: subjectOrTask.trim(),
            gradeLevel: gradeLevel.trim(),
            howApplied: howApplied.trim(),
            observedResult: observedResult.trim(),
            evidenceText: evidenceText.trim(),
            evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
            requestVerification,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Không thể lưu báo cáo áp dụng.");
        onSuccess(json);
        onClose();
        return;
      }

      if (mode === "REPORT") {
        const res = await fetch("/api/skyline-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reportAction",
            subAction: "CREATE_REPORT",
            targetType,
            targetId,
            postId,
            reasonCategory,
            description: reportDescription.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Không thể gửi báo cáo nội dung.");
        onSuccess(json);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Đã xảy ra lỗi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 bg-[#123E4A] text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">
              {mode === "RATING"
                ? targetType === "IDEA"
                  ? "Đánh giá sao mức độ tiềm năng (Ý tưởng)"
                  : "Đánh giá sao mức độ hữu dụng (Sản phẩm AI)"
                : mode === "APPLICATION"
                ? "Ghi nhận: Tôi đã áp dụng sản phẩm trong thực tế"
                : "Báo cáo nội dung cần rà soát"}
            </h3>
            <p className="text-xs text-teal-100/85 truncate max-w-sm mt-0.5">{targetTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === "RATING" && (
            <>
              <div className="text-center p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-500 mb-2">
                  Chọn mức đánh giá từ 1 đến 5 sao
                </div>
                <div className="flex items-center justify-center gap-2 mb-2.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStars(s)}
                      className="p-1.5 rounded-xl hover:scale-110 transition-transform cursor-pointer"
                      aria-label={`${s} sao`}
                    >
                      <Star
                        className={`w-7 h-7 ${
                          s <= stars
                            ? "fill-[#D6A74A] text-[#D6A74A]"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-sm font-bold text-[#123E4A] tabular-nums">
                  {stars} sao — {currentStarDesc.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {currentStarDesc.desc}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Tiêu chí nổi bật
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CRITERIA_CHIPS.map((c) => {
                    const active = selectedCriteria.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCriterion(c)}
                        className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                          active
                            ? "bg-[#159EAA] text-white border-[#159EAA]"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nhận xét ngắn gọn (tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Chia sẻ điểm tâm đắc hoặc gợi ý hoàn thiện..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-[#159EAA]"
                />
              </div>

              {targetType === "PRODUCT" && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedExperienced}
                    onChange={(e) => setConfirmedExperienced(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#159EAA]"
                  />
                  <span className="text-slate-700 leading-relaxed font-medium">
                    Tôi xác nhận đã trực tiếp dùng thử và trải nghiệm sản phẩm AI này trước khi chấm sao hữu dụng.
                  </span>
                </label>
              )}
            </>
          )}

          {mode === "APPLICATION" && (
            <>
              <div className="p-3 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#159EAA] shrink-0 mt-0.5" />
                <div className="text-slate-600 leading-relaxed">
                  Báo cáo áp dụng thực tế giúp ghi nhận mức độ lan tỏa của sản phẩm. Không bắt buộc đính kèm danh sách học sinh hay điểm số cá nhân.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Môn học / Công việc áp dụng *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectOrTask}
                    onChange={(e) => setSubjectOrTask(e.target.value)}
                    placeholder="Ví dụ: Toán 7 - Ôn tập chương 2"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Khối / Lớp áp dụng
                  </label>
                  <input
                    type="text"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="Ví dụ: Khối 7"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cách Thầy/Cô đã triển khai thực tế *
                </label>
                <textarea
                  rows={2}
                  required
                  value={howApplied}
                  onChange={(e) => setHowApplied(e.target.value)}
                  placeholder="Tổ chức hoạt động khởi động 10 phút đầu giờ, giao nhiệm vụ nhóm..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kết quả quan sát được *
                </label>
                <textarea
                  rows={2}
                  required
                  value={observedResult}
                  onChange={(e) => setObservedResult(e.target.value)}
                  placeholder="Học sinh hào hứng tương tác, tiết kiệm 30 phút chuẩn bị câu hỏi..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả minh chứng / Liên kết minh chứng (để xét duyệt tính điểm U trên Bảng vàng)
                </label>
                <input
                  type="text"
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="Ghi chú tiết dạy, biên bản sinh hoạt tổ hoặc mô tả sản phẩm đầu ra..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 mb-2"
                />
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://... (liên kết ảnh/tài liệu minh chứng nếu có)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestVerification}
                  onChange={(e) => setRequestVerification(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#159EAA]"
                />
                <span className="text-slate-600">
                  Gửi kèm yêu cầu Tổ trưởng chuyên môn / Điều phối viên xác nhận minh chứng áp dụng
                </span>
              </label>
            </>
          )}

          {mode === "REPORT" && (
            <>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Báo cáo sẽ được chuyển tới Điều phối viên chuyên môn và Quản trị viên để xem xét theo quy trình minh bạch.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nhóm lý do phản ánh *
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="PII_STUDENT">Lộ thông tin định danh cá nhân học sinh</option>
                  <option value="INACCURATE">Nội dung chuyên môn / AI chưa chính xác</option>
                  <option value="COPYRIGHT">Bản quyền học liệu / trích dẫn nguồn</option>
                  <option value="INAPPROPRIATE">Ngôn từ hoặc hình ảnh không phù hợp</option>
                  <option value="SPAM">Nội dung trùng lặp / spam</option>
                  <option value="OTHER">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả chi tiết *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Nêu rõ chi tiết cần điều phối viên rà soát..."
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159EAA] hover:bg-[#11828C] text-white font-bold shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? "Đang gửi..."
                  : mode === "RATING"
                  ? "Lưu đánh giá sao"
                  : mode === "APPLICATION"
                  ? "Gửi báo cáo áp dụng"
                  : "Gửi phản ánh"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
