"use client"

import { useState, useEffect } from "react"
import { UserPlus, X, CheckCircle2, AlertCircle, Loader2, Plus, Check } from "lucide-react"

interface LinkStudentModalProps {
  onSuccess?: () => void
  buttonText?: string
  className?: string
}

export function LinkStudentModal({ onSuccess, buttonText = "Bổ sung mã Học sinh", className }: LinkStudentModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [studentCode, setStudentCode] = useState("")
  const [relationship, setRelationship] = useState("Cha/Mẹ")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [showMultiChildPrompt, setShowMultiChildPrompt] = useState(false)

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setShowMultiChildPrompt(false);
      setErrorMsg("");
      setSuccessMsg("");
    };
    window.addEventListener("openLinkStudentModal", handleOpen);
    return () => window.removeEventListener("openLinkStudentModal", handleOpen);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentCode.trim()) {
      setErrorMsg("Vui lòng nhập Mã học sinh!")
      return
    }

    try {
      setLoading(true)
      setErrorMsg("")
      setSuccessMsg("")

      const res = await fetch("/api/parent/link-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode: studentCode.trim(),
          relationship,
          notes
        })
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Có lỗi xảy ra khi gửi yêu cầu.")
        return
      }

      setSuccessMsg(data.message || "Đã ghi nhận thông tin mã học sinh thành công!")
      setStudentCode("")
      setNotes("")
      setShowMultiChildPrompt(true)
    } catch (err: any) {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại sau.")
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    setIsOpen(false)
    setShowMultiChildPrompt(false)
    setSuccessMsg("")
    if (onSuccess) {
      onSuccess()
    } else {
      window.location.reload()
    }
  }

  const handleAddAnother = () => {
    setShowMultiChildPrompt(false)
    setSuccessMsg("")
    setErrorMsg("")
    setStudentCode("")
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setIsOpen(true); setShowMultiChildPrompt(false); setErrorMsg(""); setSuccessMsg(""); }}
        className={className || "px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-200 active:scale-95 transition-all"}
      >
        <UserPlus className="w-4 h-4" />
        <span>+ {buttonText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-5 animate-in zoom-in-95 duration-200 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleFinish}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Bổ Sung Gắn Mã Học Sinh</h3>
                <p className="text-xs text-slate-500 font-medium">Dành cho Phụ huynh có con em theo học tại Sky-Line</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              </div>
            )}

            {/* Multi-Child Prompt Choice */}
            {showMultiChildPrompt ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Xác nhận thông tin con em</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Quý Phụ huynh có thêm con em khác đang cùng theo học tại Sky-Line không?
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAddAnother}
                    className="py-3 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Có, thêm mã khác</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="py-3 px-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Không (Hoàn tất)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Mã Học Sinh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 0601020663"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-slate-900 font-bold transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Mối quan hệ với Học sinh
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-slate-800 font-semibold bg-white transition-all"
                  >
                    <option value="Cha/Mẹ">Cha / Mẹ</option>
                    <option value="Cha">Cha</option>
                    <option value="Mẹ">Mẹ</option>
                    <option value="Người giám hộ">Người giám hộ</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Ghi chú gửi Văn phòng Nhà trường
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Nhập thông tin lớp hoặc ghi chú bổ sung..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-slate-800 font-medium transition-all"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white font-black flex items-center gap-2 shadow-md disabled:opacity-50 transition-all"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{loading ? "Đang gửi..." : "Gửi yêu cầu gắn mã"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
