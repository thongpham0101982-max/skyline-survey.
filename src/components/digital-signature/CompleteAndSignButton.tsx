"use client";

import React, { useState } from "react";
import { PenTool, ShieldCheck, CheckCircle2, RefreshCw, Eye, Lock } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CompleteAndSignButtonProps {
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  classId: string;
  campusId?: string;
  academicYearId: string;
  subjectId?: string;
  term?: string;
  formType: "HO_SO_NANG_LUC" | "PHIEU_DANH_GIA_MON_HOC" | "PHIEU_DANH_GIA_MAM_NON" | "CAM_KET_HOC_TAP";
  title: string;
  contentSnapshot: any;
  /** Function kiểm tra xem dữ liệu bắt buộc đã nhập đủ chưa (VD: điểm/nhận xét) */
  validateRequiredData?: () => { isValid: boolean; message?: string };
  /** Callback sau khi ký thành công */
  onSignedSuccess?: (documentId: string) => void;
  classNameCustom?: string;
}

export function CompleteAndSignButton({
  studentId,
  studentName,
  studentCode,
  className: classNameProp,
  classId,
  campusId,
  academicYearId,
  subjectId,
  term,
  formType,
  title,
  contentSnapshot,
  validateRequiredData,
  onSignedSuccess,
  classNameCustom,
}: CompleteAndSignButtonProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<"PREVIEW" | "OTP" | "SUCCESS">("PREVIEW");
  const [loading, setLoading] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<any>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const handleOpenClick = () => {
    // 1. Kiểm tra dữ liệu bắt buộc
    if (validateRequiredData) {
      const check = validateRequiredData();
      if (!check.isValid) {
        toast.error(check.message || "Dữ liệu chưa đủ điều kiện để hoàn thành và ký số.");
        return;
      }
    }

    setStep("PREVIEW");
    setModalOpen(true);
  };

  const handleCreateSnapshotAndInitiate = async () => {
    try {
      setLoading(true);

      // Bước 1: Tạo snapshot tài liệu cố định
      const docRes = await fetch("/api/teacher/digital-signature/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          classId,
          campusId,
          subjectId,
          formType,
          term,
          title,
          contentSnapshot,
        }),
      });

      const docData = await docRes.json();
      if (!docRes.ok) throw new Error(docData.error || "Không thể khởi tạo tài liệu");

      setCreatedDoc(docData.document);

      // Bước 2: Khởi tạo yêu cầu ký số
      const signRes = await fetch("/api/teacher/digital-signature/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docData.document.id }),
      });

      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || "Không thể khởi tạo phiên ký số");

      setActiveRequestId(signData.requestId);
      setStep("OTP");
      toast.success("Đã khởi tạo yêu cầu ký số thành công.");
    } catch (err: any) {
      toast.error(err.message || "Lỗi xử lý ký số");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!activeRequestId) return;
    try {
      setLoading(true);
      const res = await fetch("/api/teacher/digital-signature/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: activeRequestId,
          otpCode: otpCode || "123456",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || "Xác thực chữ ký số thất bại");

      setStep("SUCCESS");
      toast.success("Ký số hoàn tất thành công! Bản PDF đã được lưu trữ an toàn.");
      if (onSignedSuccess && createdDoc) {
        onSignedSuccess(createdDoc.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi xác thực chữ ký");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenClick}
        className={
          classNameCustom ||
          "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] transition-all shadow-xs active:scale-95"
        }
      >
        <PenTool className="w-3.5 h-3.5 text-teal-300" />
        <span>Hoàn thành & Ký số</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-[#003B3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-300" />
                <h3 className="text-sm font-bold">Hoàn thành & Ký số điện tử</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white/60 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {step === "PREVIEW" && (
                <>
                  <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <div>Biểu mẫu: <b className="text-slate-900">{title}</b></div>
                    <div>Học sinh: <b className="text-slate-900">{studentName}</b> ({studentCode})</div>
                    <div>Lớp: <b className="text-slate-900">{classNameProp}</b></div>
                    {term && <div>Kỳ đánh giá: <b className="text-slate-900">{term}</b></div>}
                  </div>

                  <div className="p-3 border rounded-xl border-dashed border-teal-300 bg-teal-50/40 text-center">
                    <div className="text-[10px] text-[#003B3A] font-bold uppercase mb-1">
                      VỊ TRÍ CHỮ KÝ TRÊN VĂN BẢN
                    </div>
                    <div className="text-slate-600">
                      Chữ ký số sẽ được gắn tự động kèm thông tin chứng thư CA và thời điểm ký ở chân trang biểu mẫu.
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    * Lưu ý: Sau khi ký, nội dung này sẽ được chốt cố định. Nếu có thay đổi sau này, hệ thống sẽ tự động chuyển sang trạng thái <i>Cần ký lại</i>.
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Xem lại
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateSnapshotAndInitiate}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Đang tạo phiên bản...
                        </>
                      ) : (
                        "Xác nhận & Tiến hành ký"
                      )}
                    </button>
                  </div>
                </>
              )}

              {step === "OTP" && (
                <>
                  <div className="text-center py-2 space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#00A19A] mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-black text-slate-900">Xác thực Chữ ký số</div>
                    <p className="text-slate-500 text-[11px]">
                      Vui lòng nhập mã OTP hoặc xác nhận qua ứng dụng chữ ký số của bạn:
                    </p>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Mã OTP (Mặc định: 123456)"
                      className="w-full text-center text-lg font-mono tracking-widest border border-slate-300 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmOtp}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Đang xác thực...
                        </>
                      ) : (
                        "Xác nhận hoàn tất"
                      )}
                    </button>
                  </div>
                </>
              )}

              {step === "SUCCESS" && (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-black text-slate-900">Đã hoàn thành và ký số!</div>
                  <p className="text-slate-500 text-[11px]">
                    Hồ sơ đã được lưu trữ an toàn và cập nhật trạng thái trong Sổ cái học thuật.
                  </p>
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalOpen(false);
                        router.push("/teacher/ho-so-cho-ky");
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#003B3A]"
                    >
                      Xem hồ sơ chờ ký
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
