"use client"
import { useState } from "react"
import { 
  Globe, Save, Copy, Check, ExternalLink, 
  AlertCircle, CheckCircle2, RefreshCw, Eye, Settings, FileText, Info
} from "lucide-react"

export function StudentPortalClient({ initialConfig, academicYears, stats }: any) {
  const [config, setConfig] = useState(initialConfig)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  // Portal URL
  const getPortalUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/hocsinh/portal/upload-anh`
    }
    return "/hocsinh/portal/upload-anh"
  }

  const handleCopyLink = () => {
    const url = getPortalUrl()
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess(false)

    try {
      const res = await fetch("/api/admin/student-portal-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        window.location.reload()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Có lỗi xảy ra khi lưu cấu hình.")
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ.")
    } finally {
      setSaving(false)
    }
  }

  const completionRate = stats.totalStudents > 0 
    ? Math.round((stats.uploadedCount / stats.totalStudents) * 100) 
    : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cấu hình cổng */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00A99D]/5 rounded-bl-[100px] pointer-events-none" />
          
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#00A99D]" /> Cấu hình Cổng Thu nhận Ảnh
          </h3>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>Đã cập nhật cấu hình cổng thành công!</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Target Academic Year */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Năm học Thu nhận Ảnh *</label>
              <select 
                value={config.academicYearId}
                onChange={e => setConfig({ ...config, academicYearId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold bg-white focus:border-[#00A99D] focus:ring-4 focus:ring-teal-50 outline-none transition-all"
              >
                <option value="">-- Chọn năm học --</option>
                {academicYears.map((year: any) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-semibold italic ml-1">Ảnh tải lên sẽ được liên kết trực tiếp với dữ liệu học sinh thuộc năm học này.</p>
            </div>

            {/* Toggle options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Portal Open */}
              <div 
                onClick={() => setConfig({ ...config, isOpen: !config.isOpen })}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-36 ${
                  config.isOpen 
                    ? "border-[#00A99D]/30 bg-[#00A99D]/5" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">Trạng thái Cổng</span>
                  <div className={`w-12 h-6 rounded-full p-0.5 transition-colors ${config.isOpen ? "bg-[#00A99D]" : "bg-slate-200"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${config.isOpen ? "translate-x-6" : "translate-x-0"}`} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">Bật Cổng Thu thập</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Cho phép mở trang web công cộng để tìm kiếm học sinh.</p>
                </div>
              </div>

              {/* Allow Upload */}
              <div 
                onClick={() => setConfig({ ...config, allowUpload: !config.allowUpload })}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-36 ${
                  config.allowUpload 
                    ? "border-[#00A99D]/30 bg-[#00A99D]/5" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">Tải ảnh lên</span>
                  <div className={`w-12 h-6 rounded-full p-0.5 transition-colors ${config.allowUpload ? "bg-[#00A99D]" : "bg-slate-200"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${config.allowUpload ? "translate-x-6" : "translate-x-0"}`} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">Cho phép Tải ảnh lên</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Cho phép học sinh nhấn chọn file hoặc chụp ảnh gửi lên máy chủ.</p>
                </div>
              </div>
            </div>

            {/* Note text guidelines */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Lời dặn / Hướng dẫn của Nhà trường</label>
              <textarea 
                value={config.notes}
                onChange={e => setConfig({ ...config, notes: e.target.value })}
                rows={6}
                placeholder="Ví dụ: Phụ huynh vui lòng tải ảnh chân dung học sinh chuẩn định dạng thẻ, phông nền trắng hoặc xanh dương, mặt nhìn thẳng không đeo kính..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#00A99D] focus:ring-4 focus:ring-teal-50 transition-all"
              />
              <p className="text-[10px] text-slate-400 font-semibold italic ml-1">Văn bản này sẽ được hiển thị ngay bên dưới khung tải ảnh tại trang công cộng.</p>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#00A99D] text-white px-8 py-3.5 rounded-2xl hover:bg-[#009085] font-black shadow-lg shadow-teal-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Lưu cấu hình
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chia sẻ cổng / Link */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" /> Đường dẫn & Chia sẻ Cổng
          </h3>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Địa chỉ trang công cộng</span>
              <p className="text-xs font-bold text-slate-700 truncate font-mono select-all bg-white p-2.5 rounded-xl border border-slate-100">{getPortalUrl()}</p>
            </div>
            <div className="flex gap-2.5">
              <button 
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" /> Đã sao chép
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Sao chép link
                  </>
                )}
              </button>
              <a 
                href={getPortalUrl()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#00A99D]/10 hover:bg-[#00A99D]/20 text-[#00A99D] rounded-xl text-xs font-bold transition-all"
              >
                <Eye className="w-4 h-4" /> Xem thử <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[11px] font-medium text-slate-600">
            <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-slate-800">Quy trình vận hành đề xuất:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Bật <strong>Trạng thái Cổng</strong> và <strong>Cho phép Tải ảnh lên</strong>.</li>
                <li>Sao chép đường dẫn phía trên và gửi đến Phụ huynh Học sinh qua email, SMS hoặc ứng dụng nội bộ.</li>
                <li>Giáo viên chủ nhiệm có thể trực tiếp theo dõi tiến độ tải ảnh đại diện tại phần quản lý hồ sơ.</li>
                <li>Sau thời hạn nộp ảnh, Admin chuyển <strong>Trạng thái Cổng</strong> về tắt để khóa cổng.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Cột Thống kê */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-bl-[100px] pointer-events-none" />
          
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" /> Thống kê Tiến trình
          </h3>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Năm học áp dụng</span>
              <p className="text-sm font-extrabold text-slate-800 mt-1">
                {academicYears.find((y: any) => y.id === config.academicYearId)?.name || "Chưa xác định"}
              </p>
            </div>

            <div className="py-6 flex flex-col items-center justify-center space-y-3 border-b border-slate-100">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="54" className="stroke-slate-100 fill-none" strokeWidth="8" />
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="54" 
                    className="stroke-[#00A99D] fill-none transition-all duration-500" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 54} 
                    strokeDashoffset={2 * Math.PI * 54 * (1 - completionRate / 100)} 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-slate-800">{completionRate}%</span>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Hoàn thành</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block">Tổng học sinh</span>
                <span className="text-lg font-black text-slate-800 block mt-1">{stats.totalStudents}</span>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-black block">Đã có ảnh</span>
                <span className="text-lg font-black text-emerald-700 block mt-1">{stats.uploadedCount}</span>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
              <span className="text-[9px] text-amber-600 uppercase tracking-widest font-black block">Chưa tải ảnh</span>
              <span className="text-lg font-black text-amber-700 block mt-1">
                {stats.totalStudents - stats.uploadedCount > 0 ? stats.totalStudents - stats.uploadedCount : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
