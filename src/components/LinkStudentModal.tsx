"use client"

import { useState } from "react"
import { UserPlus, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

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

      setSuccessMsg(data.message || "Đã xử lý yêu cầu thành công!")
      setStudentCode("")
      setNotes("")

      setTimeout(() => {
        setIsOpen(false)
        setSuccessMsg("")
        if (onSuccess) {
          onSuccess()
        } else {
          window.location.reload()
        }
      }, 2000)
    } catch (err: any) {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại sau.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
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
              onClick={() => { setIsOpen(false); setErrorMsg(""); setSuccessMsg(""); }}
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
                <p className="text-xs text-slate-500 font-medium">Nhập mã học sinh của con em để liên kết dữ liệu</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
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
                  placeholder="Nhập thông tin lớp hoặc yêu cầu hỗ trợ (nếu có)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-slate-800 font-medium transition-all"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all"
                >
                  Hủy
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
          </div>
        </div>
      )}
    </>
  )
}
