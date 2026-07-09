"use client"
import { useState, useRef } from "react"
import { 
  Globe, Save, Copy, Check, ExternalLink, 
  AlertCircle, CheckCircle2, RefreshCw, Eye, Settings, FileText, Info,
  UploadCloud, FolderOpen, FileImage, Play, Trash2, AlertTriangle
} from "lucide-react"

interface FileItem {
  id: string;
  file: File;
  fileName: string;
  studentCode: string;
  studentName?: string;
  className?: string;
  campusName?: string;
  hasPhoto?: boolean;
  status: "pending" | "validating" | "valid" | "invalid" | "uploading" | "success" | "error";
  errorMsg?: string;
  progress?: number;
}

export function StudentPortalClient({ initialConfig, academicYears, stats }: any) {
  const [activeTab, setActiveTab] = useState<"config" | "bulk">("config")
  const [config, setConfig] = useState(initialConfig)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  // Bulk Upload States
  const [fileList, setFileList] = useState<FileItem[]>([])
  const [validating, setValidating] = useState(false)
  const [uploadingAll, setUploadingAll] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)

  const folderInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

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

  // --- Bulk Upload Handlers ---

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return

    const newItems: FileItem[] = Array.from(files)
      .filter(file => file.type.startsWith("image/"))
      .map((file, index) => {
        const rawName = file.name
        const dotIndex = rawName.lastIndexOf('.')
        const studentCode = (dotIndex !== -1 ? rawName.substring(0, dotIndex) : rawName).trim()

        return {
          id: `${file.name}-${index}-${Date.now()}-${Math.random()}`,
          file,
          fileName: file.name,
          studentCode,
          status: "pending" as const,
          progress: 0
        }
      })

    setFileList(prev => [...prev, ...newItems])
  }

  const handleClearList = () => {
    if (uploadingAll || validating) return
    setFileList([])
    setOverallProgress(0)
  }

  const handleRemoveItem = (id: string) => {
    if (uploadingAll || validating) return
    setFileList(prev => prev.filter(item => item.id !== id))
  }

  const handleValidateList = async () => {
    if (fileList.length === 0 || validating) return
    setValidating(true)

    const codes = fileList.map(item => item.studentCode)
    
    setFileList(prev => prev.map(item => ({ ...item, status: "validating" })))

    try {
      const res = await fetch("/api/admin/student-portal-config/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", codes })
      })

      if (res.ok) {
        const data = await res.json()
        const dbStudents = data.students || []
        
        setFileList(prev => prev.map(item => {
          const matched = dbStudents.find((s: any) => s.studentCode === item.studentCode)
          if (matched) {
            return {
              ...item,
              studentName: matched.studentName,
              className: matched.className,
              campusName: matched.campusName,
              hasPhoto: matched.hasPhoto,
              status: "valid" as const
            }
          } else {
            return {
              ...item,
              status: "invalid" as const,
              errorMsg: "Mã HS không tồn tại"
            }
          }
        }))
      } else {
        setFileList(prev => prev.map(item => ({ ...item, status: "pending" })))
        alert("Không thể kết nối đến máy chủ để xác thực danh sách.")
      }
    } catch (err) {
      setFileList(prev => prev.map(item => ({ ...item, status: "pending" })))
      alert("Đã xảy ra lỗi khi xác thực.")
    } finally {
      setValidating(false)
    }
  }

  const handleStartUpload = async () => {
    const validItems = fileList.filter(item => item.status === "valid" || item.status === "error")
    if (validItems.length === 0 || uploadingAll) return

    setUploadingAll(true)
    let successCount = 0
    const totalToUpload = validItems.length

    setFileList(prev => prev.map(item => {
      if (item.status === "valid" || item.status === "error") {
        return { ...item, status: "uploading" }
      }
      return item
    }))

    for (let i = 0; i < fileList.length; i++) {
      const item = fileList[i]
      if (item.status !== "valid" && item.status !== "error" && item.status !== "uploading") {
        continue
      }

      const formData = new FormData()
      formData.append("file", item.file)
      formData.append("studentCode", item.studentCode)

      try {
        const res = await fetch("/api/admin/student-portal-config/bulk-upload", {
          method: "POST",
          body: formData
        })

        if (res.ok) {
          successCount++
          setFileList(prev => prev.map(f => f.id === item.id ? { ...f, status: "success" } : f))
        } else {
          const data = await res.json().catch(() => ({}))
          setFileList(prev => prev.map(f => f.id === item.id ? { ...f, status: "error", errorMsg: data.error || "Tải lên lỗi" } : f))
        }
      } catch (err) {
        setFileList(prev => prev.map(f => f.id === item.id ? { ...f, status: "error", errorMsg: "Lỗi kết nối" } : f))
      }

      setOverallProgress(Math.round((successCount / totalToUpload) * 100))
    }

    setUploadingAll(false)
    alert(`Hoàn thành tải lên! Đã upload thành công ${successCount}/${totalToUpload} tệp ảnh học sinh.`)
  }

  const completionRate = stats.totalStudents > 0 
    ? Math.round((stats.uploadedCount / stats.totalStudents) * 100) 
    : 0

  const totalCount = fileList.length
  const pendingCount = fileList.filter(f => f.status === "pending" || f.status === "validating").length
  const validCount = fileList.filter(f => f.status === "valid").length
  const invalidCount = fileList.filter(f => f.status === "invalid").length
  const successUploadCount = fileList.filter(f => f.status === "success").length
  const errorUploadCount = fileList.filter(f => f.status === "error").length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-outfit">
      
      {/* Cấu hình cổng hoặc Tool Upload Hàng loạt */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setActiveTab("config")}
              className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "config" 
                  ? "border-[#00A99D] text-[#00A99D]" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Settings className="w-4 h-4" /> Cấu hình Cổng
            </button>
            <button 
              onClick={() => setActiveTab("bulk")}
              className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "bulk" 
                  ? "border-[#00A99D] text-[#00A99D]" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <UploadCloud className="w-4 h-4" /> Tải ảnh Hàng loạt
            </button>
          </div>

          {/* TAB 1: CONFIGURATION */}
          {activeTab === "config" && (
            <div className="space-y-6">
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#00A99D] focus:ring-4 focus:ring-teal-50 outline-none transition-all"
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
          )}

          {/* TAB 2: BULK PHOTO UPLOAD */}
          {activeTab === "bulk" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-4 text-xs font-medium text-slate-600">
                <Info className="w-5 h-5 text-[#00A99D] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800">Hướng dẫn sử dụng Tool Upload Hàng loạt:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Đặt tên các tệp ảnh trùng với **Mã Học Sinh** của học sinh đó (Ví dụ: `0601020382.jpg` hoặc `0601020382.png`).</li>
                    <li>Sử dụng nút chọn thư mục (Folder) hoặc chọn nhiều ảnh để tải danh sách lên danh sách chờ.</li>
                    <li>Nhấn **"Xác thực danh sách"** để đối chiếu tự động mã học sinh với cơ sở dữ liệu hệ thống.</li>
                    <li>Nhấn **"Bắt đầu tải lên"** để lưu ảnh vào hồ sơ của các học sinh hợp lệ.</li>
                  </ol>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-200 hover:border-[#00A99D] bg-slate-50/60 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[180px] transition-all relative overflow-hidden group">
                <input 
                  type="file" 
                  ref={folderInputRef}
                  onChange={e => handleFilesAdded(e.target.files)}
                  className="hidden" 
                  {...({
                    webkitdirectory: "",
                    directory: "",
                    multiple: true
                  } as any)}
                />
                <input 
                  type="file" 
                  ref={filesInputRef}
                  onChange={e => handleFilesAdded(e.target.files)}
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />

                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white text-slate-400 group-hover:text-[#00A99D] rounded-2xl shadow transition-colors">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">Tải tệp ảnh hoặc chọn nguyên thư mục chứa ảnh học sinh</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Đảm bảo tên tệp là Mã học sinh. Định dạng ảnh JPG, PNG.</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button 
                      onClick={() => folderInputRef.current?.click()}
                      disabled={uploadingAll || validating}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00A99D]/10 hover:bg-[#00A99D]/20 text-[#00A99D] rounded-xl text-xs font-black transition-all disabled:opacity-50 pointer-events-auto"
                    >
                      <FolderOpen className="w-4 h-4" /> Chọn Thư mục
                    </button>
                    <button 
                      onClick={() => filesInputRef.current?.click()}
                      disabled={uploadingAll || validating}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all disabled:opacity-50 pointer-events-auto"
                    >
                      <FileImage className="w-4 h-4" /> Chọn Nhiều Tệp
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress and Stats bar */}
              {fileList.length > 0 && (
                <div className="space-y-4 p-5 bg-slate-50 border border-slate-200/50 rounded-2xl">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <span>Tổng: <strong className="text-slate-700 font-extrabold">{totalCount}</strong></span>
                      {pendingCount > 0 && <span className="text-slate-500">Chờ duyệt: <strong>{pendingCount}</strong></span>}
                      {validCount > 0 && <span className="text-teal-600">Hợp lệ: <strong>{validCount}</strong></span>}
                      {invalidCount > 0 && <span className="text-rose-500">Lỗi mã: <strong>{invalidCount}</strong></span>}
                      {successUploadCount > 0 && <span className="text-emerald-600">Thành công: <strong>{successUploadCount}</strong></span>}
                      {errorUploadCount > 0 && <span className="text-rose-600">Lỗi tải: <strong>{errorUploadCount}</strong></span>}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleClearList}
                        disabled={uploadingAll || validating}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        Xóa danh sách
                      </button>
                      {pendingCount > 0 && (
                        <button 
                          onClick={handleValidateList}
                          disabled={validating || uploadingAll}
                          className="px-3.5 py-1.5 bg-[#00A99D] hover:bg-[#009085] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          Xác thực mã HS
                        </button>
                      )}
                      {(validCount > 0 || errorUploadCount > 0) && (
                        <button 
                          onClick={handleStartUpload}
                          disabled={uploadingAll || validating}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5" /> Bắt đầu tải lên
                        </button>
                      )}
                    </div>
                  </div>

                  {uploadingAll && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <span>Tiến trình tải lên</span>
                        <span>{overallProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${overallProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Files table list */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[350px] overflow-y-auto pr-1">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">
                          <th className="p-3 w-16 text-center">Ảnh</th>
                          <th className="p-3">Mã HS nhận diện</th>
                          <th className="p-3">Học sinh đối chiếu</th>
                          <th className="p-3 w-32 text-center font-bold">Trạng thái</th>
                          <th className="p-3 w-12 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {fileList.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-2 text-center">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 inline-flex items-center justify-center">
                                <img 
                                  src={URL.createObjectURL(item.file)} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-extrabold text-slate-800">{item.studentCode}</div>
                              <div className="text-[9px] text-slate-400 font-semibold truncate max-w-[150px]" title={item.fileName}>
                                {item.fileName}
                              </div>
                            </td>
                            <td className="p-3">
                              {item.studentName ? (
                                <div>
                                  <div className="font-black text-slate-800 leading-tight">{item.studentName}</div>
                                  <div className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">
                                    Lớp: {item.className} | CS: {item.campusName}
                                  </div>
                                </div>
                              ) : item.status === "invalid" ? (
                                <span className="text-rose-500 font-bold text-[10px] leading-tight">Không tìm thấy mã HS</span>
                              ) : (
                                <span className="text-slate-400 font-semibold text-[10px] italic">Chờ xác thực...</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold">
                              {item.status === "pending" && (
                                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-wider">Chờ xác thực</span>
                              )}
                              {item.status === "validating" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Đang check
                                </span>
                              )}
                              {item.status === "valid" && (
                                <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider" title={item.hasPhoto ? "Học sinh đã có ảnh. Sẽ ghi đè." : "Học sinh chưa có ảnh."}>
                                  Hợp lệ {item.hasPhoto && "• Đã có ảnh"}
                                </span>
                              )}
                              {item.status === "invalid" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Không khớp
                                </span>
                              )}
                              {item.status === "uploading" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Tải lên...
                                </span>
                              )}
                              {item.status === "success" && (
                                <span className="inline-block px-2.5 py-1 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider font-bold">Thành công</span>
                              )}
                              {item.status === "error" && (
                                <span className="inline-block px-2.5 py-1 bg-rose-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider font-bold" title={item.errorMsg}>Lỗi</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={uploadingAll || validating}
                                className="text-slate-300 hover:text-rose-600 transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Chia sẻ cổng / Link */}
        {activeTab === "config" && (
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
        )}
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
