"use client"
import { useState, useEffect } from "react"
import { 
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft, CheckCircle2, 
  Bell, Mail, Sparkles, X, Volume2, Tv, MousePointer, Clock, Check
} from "lucide-react"

interface VideoGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

const STEPS = [
  {
    id: 1,
    title: "Mở Tiết Dạy Dự Giờ",
    subtitle: "Giáo viên điền thông tin và đăng ký lịch mở tiết dạy",
    duration: 10,
    caption: "Thầy/Cô chọn thẻ 'GV dạy tự mở tiết', điền Tên bài dạy, Môn học, Cấp, Khối lớp, Lớp và thời gian. Sau đó bấm '+ KHỞI TẠO LỊCH DẠY'.",
    uiAction: "CREATE_SLOT"
  },
  {
    id: 2,
    title: "Tự Động Gửi Email & Thông Báo",
    subtitle: "Hệ thống phát thông báo tới tất cả GV trong Tổ chuyên môn (TCM)",
    duration: 10,
    caption: "Ngay khi khởi tạo thành công, hệ thống tự động phát email HTML và tạo thông báo trong ứng dụng tới tất cả giáo viên trong Tổ chuyên môn.",
    uiAction: "EMAIL_TCM"
  },
  {
    id: 3,
    title: "GVBM Đăng Ký / Xin Dự Giờ",
    subtitle: "Giáo viên bộ môn đăng ký tham dự tiết dự giờ",
    duration: 10,
    caption: "GVBM chọn tiết dạy và nhấn 'ĐĂNG KÝ'. Hệ thống lập tức ghi nhận và gửi thông báo báo về cho Giáo viên dạy.",
    uiAction: "REGISTER_SLOT"
  },
  {
    id: 4,
    title: "Chuông Thông Báo & Badge Đỏ (1, 2, 3...)",
    subtitle: "Hiển thị số thông báo chưa đọc và câu thông báo chuẩn",
    duration: 12,
    caption: "Chuông 🔔 góc trên bên phải nảy số đỏ (1, 2, 3...). Bấm vào chuông sẽ thấy tin nhắn: 'Thầy/cô vừa đăng ký tiết dạy của bạn, vui lòng đăng nhập hệ thống và xác nhận.'",
    uiAction: "NOTIF_BADGE"
  },
  {
    id: 5,
    title: "Xác Nhận & Nộp Đánh Giá",
    subtitle: "Phê duyệt người dự và hoàn tất phiếu đánh giá",
    duration: 10,
    caption: "Giáo viên dạy xác nhận danh sách người tham dự. Sau tiết học, giáo viên dự giờ vào nộp phiếu đánh giá chuyên môn chuẩn Skyline.",
    uiAction: "COMPLETE"
  }
]

export function ObservationVideoGuideModal({ isOpen, onClose }: VideoGuideModalProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isOpen || !isPlaying) return

    const currentStepObj = STEPS[activeStep]
    const stepDurationMs = currentStepObj.duration * 1000
    const intervalMs = 100

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + (intervalMs / stepDurationMs) * 100
        if (next >= 100) {
          if (activeStep < STEPS.length - 1) {
            setActiveStep(s => s + 1)
            return 0
          } else {
            setIsPlaying(false)
            return 100
          }
        }
        return next
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isOpen, isPlaying, activeStep])

  if (!isOpen) return null

  const currentStep = STEPS[activeStep]

  const handleStepChange = (index: number) => {
    setActiveStep(index)
    setProgress(0)
    setIsPlaying(true)
  }

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleRestart = () => {
    setActiveStep(0)
    setProgress(0)
    setIsPlaying(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Video Player Bar */}
        <div className="bg-gradient-to-r from-[#002D2B] via-[#005E57] to-[#009085] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/10">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base flex items-center gap-2">
                Video Hướng Dẫn Tương Tác: Dự Giờ Đánh Giá Giáo Viên
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border border-amber-300/30">
                  Skyline HD
                </span>
              </h3>
              <p className="text-xs text-emerald-100/80 font-medium">Trình mô phỏng quy trình tạo tiết dạy, gửi email & thông báo tự động</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Navigation Bar */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 shrink-0 flex items-center justify-between gap-2 overflow-x-auto">
          {STEPS.map((step, idx) => {
            const isActive = idx === activeStep
            const isCompleted = idx < activeStep
            return (
              <button
                key={step.id}
                onClick={() => handleStepChange(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? "bg-[#00A99D] text-white shadow-md shadow-teal-500/20 scale-105" 
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? "bg-white text-[#00A99D]" : isCompleted ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : step.id}
                </span>
                <span>{step.title}</span>
              </button>
            )
          })}
        </div>

        {/* MAIN VIDEO SIMULATION SCREEN */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-white relative flex flex-col justify-between min-h-[360px]">
          {/* Simulated Browser Chrome */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 shadow-2xl relative overflow-hidden flex-1 flex flex-col">
            {/* Browser top address bar */}
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700/60 text-xs text-slate-400 mb-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="bg-slate-900/80 px-3 py-1 rounded-lg text-[11px] font-mono text-emerald-400 flex items-center gap-2 flex-1 max-w-sm">
                <span className="text-slate-500">https://</span>skyline-survey.vercel.app/teacher/du-gio
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {/* Header Bell Icon Simulation */}
                <div className="relative bg-slate-700 p-1.5 rounded-lg text-slate-200">
                  <Bell className="w-4 h-4" />
                  {(currentStep.uiAction === "NOTIF_BADGE" || currentStep.uiAction === "REGISTER_SLOT") && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-md">
                      3
                    </span>
                  )}
                </div>
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  L
                </div>
              </div>
            </div>

            {/* SCREEN SIMULATION CONTENT */}
            <div className="flex-1 flex flex-col justify-center items-center relative p-4">
              {/* STEP 1: CREATE SLOT */}
              {currentStep.uiAction === "CREATE_SLOT" && (
                <div className="w-full max-w-xl bg-slate-900 border border-teal-500/40 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-teal-400 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> 1. GV DẠY TỰ MỞ TIẾT DẠY
                    </h4>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-mono">Tháng 8: 0/2</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Tên Bài Dạy / Chủ Đề *</label>
                      <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-white font-medium">
                        Toán 4: Luyện tập phép cộng
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Môn Học *</label>
                      <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-teal-300 font-medium">
                        Toán học
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Khối Lớp & Lớp *</label>
                      <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-white font-medium">
                        Khối 4 - Lớp 4.4_CS2
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Thời Gian / Tiết *</label>
                      <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-white font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" /> Tiết 3 (09:30 - 10:15)
                      </div>
                    </div>
                  </div>
                  <button className="w-full bg-[#00A99D] hover:bg-teal-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30">
                    <MousePointer className="w-4 h-4 animate-bounce" /> + KHỞI TẠO LỊCH DẠY
                  </button>
                </div>
              )}

              {/* STEP 2: EMAIL TCM */}
              {currentStep.uiAction === "EMAIL_TCM" && (
                <div className="w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" /> THÔNG BÁO EMAIL & NOTIFICATION ĐẾN TỔ CHUYÊN MÔN
                    </h4>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">Tự động 100%</span>
                  </div>
                  <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 text-xs space-y-2">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> [Skyline - Dự giờ] Đăng ký tiết dự giờ mới: Toán học - Luyện tập
                    </div>
                    <div className="text-slate-300 text-[11px] leading-relaxed">
                      Kính gửi Thầy/Cô thuộc Tổ chuyên môn,<br />
                      Thầy/Cô <strong>Lưu Thị Mỹ Linh</strong> vừa đăng ký thông tin tiết dạy dự giờ mới (Toán 4, Lớp 4.4_CS2, Ngày 20/08/2026, Tiết 3). Kính mời Thầy/Cô đăng ký tham dự.
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: REGISTER SLOT */}
              {currentStep.uiAction === "REGISTER_SLOT" && (
                <div className="w-full max-w-xl bg-slate-900 border border-sky-500/40 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-sky-400 text-sm flex items-center gap-2">
                      <MousePointer className="w-4 h-4" /> GVBM BẤM ĐĂNG KÝ DỰ GIỜ
                    </h4>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono">Thao tác 1-Click</span>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 border border-slate-700">
                    <div>
                      <div className="font-bold text-white text-xs">Lưu Thị Mỹ Linh • Toán 4</div>
                      <div className="text-[11px] text-slate-400">Chủ đề: Luyện tập phép cộng • Tiết 1 - Phòng 302</div>
                    </div>
                    <button className="bg-[#00A99D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-teal-500/30 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ĐĂNG KÝ
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: NOTIF BADGE */}
              {currentStep.uiAction === "NOTIF_BADGE" && (
                <div className="w-full max-w-xl bg-slate-900 border border-rose-500/40 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4 text-rose-500 animate-bounce" /> XUẤT HIỆN BADGE ĐỎ (1, 2, 3...) & CÂU THÔNG BÁO CHUẨN
                    </h4>
                  </div>
                  <div className="bg-white text-slate-800 rounded-2xl p-4 shadow-2xl space-y-3 border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#00A99D]" /> Thông báo hệ thống
                      </span>
                      <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        3 tin mới
                      </span>
                    </div>
                    <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-100 text-xs">
                      <div className="font-bold text-[#00A99D] mb-1">Thông báo đăng ký tiết dạy</div>
                      <div className="text-slate-700 font-medium">
                        Thầy/cô <strong>Nguyễn Văn A</strong> vừa đăng ký tiết dạy của bạn, vui lòng đăng nhập hệ thống và xác nhận.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: COMPLETE */}
              {currentStep.uiAction === "COMPLETE" && (
                <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="font-black text-lg text-emerald-400">HOÀN TẤT VÀ NỘP PHIẾU ĐÁNH GIÁ</h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    Giáo viên dạy phê duyệt danh sách tham dự. Sau tiết dự giờ, giáo viên vào nộp phiếu đánh giá chuyên môn trực tiếp trên giao diện Skyline.
                  </p>
                </div>
              )}
            </div>

            {/* Voiceover Captions Bar below */}
            <div className="bg-slate-950/90 border-t border-slate-800 p-3.5 rounded-xl flex items-start gap-3 mt-4">
              <Volume2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">Thuyết minh giọng đọc AI:</span>
                <p className="text-xs text-slate-200 leading-snug font-medium">{currentStep.caption}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Video Player Controls Footer Bar */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-2xl bg-[#00A99D] hover:bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/30 transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={handleRestart}
              title="Phát lại từ đầu"
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="text-xs font-bold text-slate-600 hidden sm:block">
              Bước {activeStep + 1} / {STEPS.length}: <span className="text-slate-900">{currentStep.title}</span>
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="flex-1 max-w-xs mx-4 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#00A99D] h-full transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={activeStep === 0}
              onClick={() => handleStepChange(activeStep - 1)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-40 font-bold text-xs flex items-center gap-1 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" /> Lùi
            </button>
            <button
              disabled={activeStep === STEPS.length - 1}
              onClick={() => handleStepChange(activeStep + 1)}
              className="p-2 rounded-xl bg-[#00A99D] text-white disabled:opacity-40 font-bold text-xs flex items-center gap-1 hover:bg-teal-600 shadow-md shadow-teal-500/20"
            >
              Tiếp <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
