"use client"
import { useState, useEffect, useRef } from "react"
import { 
  GraduationCap, UserCheck, Camera, Upload, CheckCircle2, 
  AlertCircle, Calendar, ArrowLeft, Loader2, Sparkles, RefreshCw 
} from "lucide-react"

export default function StudentPhotoPortalPage() {
  const [portalStatus, setPortalStatus] = useState<{ isOpen: boolean; checked: boolean; errorMsg: string }>({
    isOpen: true,
    checked: false,
    errorMsg: ""
  })

  // State for Step 1: Verification
  const [studentCode, setStudentCode] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState("")

  // State for Step 2: Uploading
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Verify portal status on load
  useEffect(() => {
    async function checkPortal() {
      try {
        const res = await fetch("/api/hocsinh/portal/student-info?studentCode=CHECK")
        if (res.status === 403) {
          const data = await res.json()
          setPortalStatus({
            isOpen: false,
            checked: true,
            errorMsg: data.error || "Cổng thu nhận ảnh hồ sơ hiện đang đóng."
          })
        } else {
          setPortalStatus({
            isOpen: true,
            checked: true,
            errorMsg: ""
          })
        }
      } catch (err) {
        setPortalStatus({
          isOpen: true,
          checked: true,
          errorMsg: ""
        })
      }
    }
    checkPortal()
  }, [])

  // Handle student verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentCode.trim() || !dateOfBirth) {
      setVerifyError("Vui lòng nhập Mã học sinh và chọn Ngày sinh.")
      return
    }

    setVerifying(true)
    setVerifyError("")

    try {
      const res = await fetch(`/api/hocsinh/portal/student-info?studentCode=${studentCode.trim().toUpperCase()}&dateOfBirth=${dateOfBirth}`)
      const data = await res.json()

      if (res.ok) {
        setStudentInfo(data)
        if (data.hasPhoto) {
          setPreviewUrl(data.photoUrl)
        }
      } else {
        setVerifyError(data.error || "Mã học sinh hoặc ngày sinh không đúng.")
      }
    } catch (err) {
      setVerifyError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.")
    } finally {
      setVerifying(false)
    }
  }

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        setUploadError("Vui lòng chọn file hình ảnh (PNG, JPG, JPEG).")
        return
      }
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Kích thước ảnh tối đa là 5MB.")
        return
      }

      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setUploadError("")
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !studentInfo) return

    setUploading(true)
    setUploadError("")
    setUploadSuccess(false)

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("studentId", studentInfo.studentId)
    formData.append("studentCode", studentInfo.studentCode)
    formData.append("dateOfBirth", dateOfBirth)

    try {
      const res = await fetch("/api/hocsinh/portal/upload", {
        method: "POST",
        body: formData
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setUploadSuccess(true)
      } else {
        setUploadError(data.error || "Tải ảnh lên thất bại.")
      }
    } catch (err) {
      setUploadError("Lỗi kết nối máy chủ khi tải ảnh lên.")
    } finally {
      setUploading(false)
    }
  }

  // Reset portal state for new search
  const handleReset = () => {
    setStudentInfo(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadSuccess(false)
    setUploadError("")
    setStudentCode("")
    setDateOfBirth("")
  }

  if (!portalStatus.checked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
        <Loader2 className="w-12 h-12 text-[#00A99D] animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang kiểm tra kết nối cổng...</p>
      </div>
    )
  }

  if (!portalStatus.isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] font-sans">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-50 rounded-[1.8rem] text-rose-500 shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Cổng Đang Đóng</h2>
          <p className="text-slate-500 text-sm font-semibold leading-relaxed">
            {portalStatus.errorMsg || "Cổng thu nhận ảnh hồ sơ học sinh hiện đang đóng hoặc chưa được kích hoạt từ phía Nhà trường."}
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            Skyline Education Group
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-slate-50 to-amber-50 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-200/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[500px] my-8">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#00A99D] rounded-3xl mb-4 shadow-2xl relative animate-bounce-subtle">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">SKYLINE PORTAL</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[4px] mt-1.5 opacity-80">Thu tập ảnh thẻ hồ sơ học sinh</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white">
          
          {/* STEP 1: VERIFICATION FORM */}
          {!studentInfo && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-black text-slate-800">Xác thực Thông tin</h2>
                <p className="text-slate-500 text-xs font-bold mt-1 leading-relaxed">
                  Vui lòng nhập chính xác Mã học sinh và Ngày sinh của học sinh để mở khóa cổng tải ảnh.
                </p>
              </div>

              {verifyError && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex items-center gap-3 text-xs font-bold animate-pulse">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{verifyError}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã học sinh (Mã HS)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={studentCode} 
                      onChange={e => setStudentCode(e.target.value)} 
                      placeholder="VD: HS000000"
                      className="w-full rounded-2xl px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-[#00A99D] text-base font-extrabold text-slate-800 outline-none transition-all placeholder:text-slate-300" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày sinh</label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <input 
                      type="date" 
                      value={dateOfBirth} 
                      onChange={e => setDateOfBirth(e.target.value)}
                      className="w-full rounded-2xl pl-14 pr-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-[#00A99D] text-base font-extrabold text-slate-800 outline-none transition-all" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={verifying}
                  className="w-full py-4.5 bg-[#00A99D] hover:bg-[#009085] text-white rounded-2xl text-base font-black shadow-xl shadow-[#00A99D]/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Đang xác thực...
                    </>
                  ) : (
                    <>
                      Xác nhận thông tin <UserCheck className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: UPLOAD FORM */}
          {studentInfo && !uploadSuccess && (
            <div className="space-y-6">
              {/* Back button */}
              <button 
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[9px] text-[#00A99D] font-black uppercase tracking-widest block">Thông tin học sinh</span>
                <h3 className="text-lg font-black text-slate-800 leading-tight">{studentInfo.studentName}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 pt-1">
                  <div>Lớp: <span className="text-slate-800">{studentInfo.className}</span></div>
                  <div>Cơ sở: <span className="text-slate-800">{studentInfo.campusName}</span></div>
                  <div className="col-span-2 mt-1">Mã số: <span className="text-[#00A99D] font-black">{studentInfo.studentCode}</span></div>
                </div>
              </div>

              {studentInfo.notes && (
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-[11px] font-semibold text-amber-800 leading-relaxed space-y-1">
                  <div className="font-extrabold uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Lưu ý từ nhà trường:
                  </div>
                  <p>{studentInfo.notes}</p>
                </div>
              )}

              {uploadError && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex items-center gap-3 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Photo upload dropzone/box */}
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-[#00A99D] bg-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[220px] cursor-pointer transition-all relative overflow-hidden group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  {previewUrl ? (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-white p-2">
                      <img 
                        src={previewUrl} 
                        alt="Preview Avatar" 
                        className="h-full w-auto object-contain rounded-2xl shadow" 
                      />
                      <div className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full shadow transition-all scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100">
                        <Camera className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-14 h-14 bg-white text-slate-400 group-hover:text-[#00A99D] rounded-2xl shadow transition-colors">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-700">Kéo thả ảnh hoặc nhấp để chọn</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Hỗ trợ PNG, JPG, JPEG (Tối đa 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>

                {studentInfo.hasPhoto && !selectedFile && (
                  <p className="text-[10px] text-amber-500 font-black italic text-center">
                    * Học sinh hiện đã có ảnh hồ sơ. Tải ảnh mới sẽ thay thế ảnh hiện có.
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  {selectedFile && (
                    <button 
                      onClick={() => { setSelectedFile(null); setPreviewUrl(studentInfo.hasPhoto ? studentInfo.photoUrl : null); }}
                      className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-black transition-all"
                    >
                      Hủy chọn
                    </button>
                  )}
                  <button 
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className={`flex-1 py-4 text-white rounded-2xl text-sm font-black shadow-xl transition-all flex items-center justify-center gap-2 ${
                      selectedFile && !uploading 
                        ? "bg-[#00A99D] hover:bg-[#009085] shadow-[#00A99D]/20 active:scale-98" 
                        : "bg-slate-300 shadow-none cursor-not-allowed"
                    }`}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải lên...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" /> Xác nhận tải ảnh
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS VIEW */}
          {uploadSuccess && (
            <div className="text-center space-y-6 py-4 animate-in zoom-in-95 duration-300">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800">Tải Ảnh Thành Công!</h2>
                <p className="text-slate-500 text-xs font-bold max-w-sm mx-auto leading-relaxed">
                  Ảnh hồ sơ của học sinh <strong className="text-slate-700 font-extrabold">{studentInfo?.studentName}</strong> đã được lưu thành công trên hệ thống Skyline.
                </p>
              </div>

              {previewUrl && (
                <div className="w-36 h-48 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden mx-auto shadow-md p-1.5">
                  <img src={previewUrl} alt="Avatar Uploaded" className="w-full h-full object-cover rounded-xl" />
                </div>
              )}

              <div className="pt-4">
                <button 
                  onClick={handleReset}
                  className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Tải ảnh học sinh khác
                </button>
              </div>
            </div>
          )}

        </div>
        
        <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-[4px] mt-10">2026 SKYLINE EDUCATION GROUP</p>
      </div>
    </div>
  )
}
