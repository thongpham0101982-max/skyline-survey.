"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  BookOpen, 
  Plus, 
  Search, 
  X, 
  Check, 
  AlertCircle, 
  Trash2, 
  Info, 
  ChevronRight,
  Layers,
  FileText
} from "lucide-react"
import { 
  createObservationSlot, 
  registerObservation, 
  cancelObservation, 
  deleteObservationSlot, 
  getCreatedCountInMonth, 
  getObservationSlots 
} from "./actions"

interface TeacherInfo {
  id: string
  teacherName: string
  teacherCode: string
  email: string | null
  departmentId: string | null
}

interface SubjectInfo {
  id: string
  subjectCode: string
  subjectName: string
}

interface DeptInfo {
  id: string
  code: string
  name: string
}

interface ObservationClientProps {
  initialSlots: any[]
  currentTeacher: TeacherInfo
  subjects: SubjectInfo[]
  departments: DeptInfo[]
  teachers: any[]
  initialFilters: {
    level: string
    subjectId: string
    grade: string
    teacherId: string
    date: string
  }
}

export function ObservationClient({
  initialSlots,
  currentTeacher,
  subjects,
  departments,
  teachers,
  initialFilters
}: ObservationClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTabParam = searchParams.get("tab") || "dang-ky"

  const [slots, setSlots] = useState(initialSlots)
  const [activeTab, setActiveTab] = useState(activeTabParam)
  const [isPending, startTransition] = useTransition()
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Custom toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  // Filter form states
  const [filterLevel, setFilterLevel] = useState(initialFilters.level)
  const [filterSubjectId, setFilterSubjectId] = useState(initialFilters.subjectId)
  const [filterGrade, setFilterGrade] = useState(initialFilters.grade)
  const [filterTeacherId, setFilterTeacherId] = useState(initialFilters.teacherId)
  const [filterDate, setFilterDate] = useState(initialFilters.date)

  // Creation form states
  const [newSubjectId, setNewSubjectId] = useState("")
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newLevel, setNewLevel] = useState("")
  const [newGrade, setNewGrade] = useState("")
  const [newTopic, setNewTopic] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newStartTime, setNewStartTime] = useState("07:00")
  const [newEndTime, setNewEndTime] = useState("07:45")
  const [newIsDoublePeriod, setNewIsDoublePeriod] = useState(false)
  const [newRoom, setNewRoom] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newVisibility, setNewVisibility] = useState("ALL")
  const [newTargetDeptId, setNewTargetDeptId] = useState("")
  const [monthlyLimitCount, setMonthlyLimitCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Sync active tab with search parameter
  useEffect(() => {
    setActiveTab(activeTabParam)
  }, [activeTabParam])

  // Fetch count of slots created in selected month
  useEffect(() => {
    if (newDate) {
      getCreatedCountInMonth(newDate).then(res => {
        if (res.success) {
          setMonthlyLimitCount(res.count)
        }
      })
    }
  }, [newDate])

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Predefined time options (07:00 to 17:30, 15-minute intervals)
  const timeOptions = useMemo(() => {
    const options = []
    for (let hour = 7; hour <= 17; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const hStr = hour.toString().padStart(2, "0")
        const mStr = min.toString().padStart(2, "0")
        options.push(`${hStr}:${mStr}`)
      }
    }
    options.push("18:00")
    return options
  }, [])

  // Predefined rooms
  const roomOptions = [
    "Phòng học tiêu chuẩn",
    "Phòng Lab Ngoại ngữ",
    "Phòng STEM / Tin học",
    "Phòng Thí nghiệm Lý-Hóa-Sinh",
    "Phòng Âm nhạc",
    "Phòng Mỹ thuật",
    "Phòng Đa năng (Thể chất)",
    "Thư viện trường",
    "Sân thể thao ngoài trời"
  ]

  // Grades list dependent on selected Level
  const getGradesForLevel = (level: string) => {
    switch (level) {
      case "Mầm non":
        return ["18-24 tháng", "24-36 tháng", "Mầm (3-4 tuổi)", "Chồi (4-5 tuổi)", "Lá (5-6 tuổi)"]
      case "Tiểu học":
        return ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"]
      case "THCS":
        return ["Khối 6", "Khối 7", "Khối 8", "Khối 9"]
      case "THPT":
        return ["Khối 10", "Khối 11", "Khối 12"]
      default:
        return []
    }
  }

  // Trigger search filters
  const handleSearch = () => {
    const params = new URLSearchParams(window.location.search)
    
    if (filterLevel && filterLevel !== "all") params.set("level", filterLevel)
    else params.delete("level")
    
    if (filterSubjectId && filterSubjectId !== "all") params.set("subjectId", filterSubjectId)
    else params.delete("subjectId")
    
    if (filterGrade && filterGrade !== "all") params.set("grade", filterGrade)
    else params.delete("grade")
    
    if (filterTeacherId && filterTeacherId !== "all") params.set("teacherId", filterTeacherId)
    else params.delete("teacherId")
    
    if (filterDate) params.set("date", filterDate)
    else params.delete("date")

    startTransition(async () => {
      router.push(`${pathname}?${params.toString()}`)
      const res = await getObservationSlots({
        level: filterLevel,
        subjectId: filterSubjectId,
        grade: filterGrade,
        teacherId: filterTeacherId,
        date: filterDate
      })
      if (res.success && res.slots) {
        setSlots(res.slots)
        showToast("Đã cập nhật danh sách tìm kiếm!", "success")
      }
    })
  }

  // Handle slot registration
  const handleRegister = async (slotId: string) => {
    startTransition(async () => {
      const res = await registerObservation(slotId)
      if (res.success) {
        showToast("Đăng ký dự giờ thành công!", "success")
        refreshSlots()
      } else {
        showToast(res.error || "Không thể đăng ký!", "error")
      }
    })
  }

  // Handle cancel registration
  const handleCancelRegistration = async (slotId: string) => {
    if (!confirm("Thầy/Cô có chắc chắn muốn hủy đăng ký dự giờ tiết dạy này?")) return

    startTransition(async () => {
      const res = await cancelObservation(slotId)
      if (res.success) {
        showToast("Đã hủy đăng ký dự giờ!", "info")
        refreshSlots()
      } else {
        showToast(res.error || "Không thể hủy đăng ký!", "error")
      }
    })
  }

  // Handle delete hosted slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Thầy/Cô có chắc chắn muốn xóa tiết dạy dự giờ này? Tất cả đăng ký liên quan sẽ bị hủy.")) return

    startTransition(async () => {
      const res = await deleteObservationSlot(slotId)
      if (res.success) {
        showToast("Đã xóa tiết dạy dự giờ thành công!", "info")
        refreshSlots()
      } else {
        showToast(res.error || "Không thể xóa!", "error")
      }
    })
  }

  const refreshSlots = async () => {
    const res = await getObservationSlots({
      level: filterLevel,
      subjectId: filterSubjectId,
      grade: filterGrade,
      teacherId: filterTeacherId,
      date: filterDate
    })
    if (res.success && res.slots) {
      setSlots(res.slots)
    }
  }

  // Handle creation form submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLevel || !newGrade || !newTopic || !newDate || !newStartTime || !newEndTime || !newRoom) {
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "error")
      return
    }

    if (newStartTime >= newEndTime) {
      showToast("Thời gian bắt đầu phải trước thời gian kết thúc!", "error")
      return
    }

    setSubmitting(true)
    const selectedSub = subjects.find(s => s.id === newSubjectId)
    const subName = selectedSub ? selectedSub.subjectName : newSubjectName || "Khác"

    const res = await createObservationSlot({
      subjectId: newSubjectId || undefined,
      subjectName: subName,
      level: newLevel,
      grade: newGrade,
      topic: newTopic,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      isDoublePeriod: newIsDoublePeriod,
      room: newRoom,
      description: newDescription,
      visibilityType: newVisibility,
      targetDeptId: newVisibility === "DEPARTMENT" ? newTargetDeptId : undefined
    })

    setSubmitting(false)
    if (res.success) {
      showToast("Tạo tiết dạy dự giờ mới thành công!", "success")
      setShowCreateModal(false)
      // Reset form
      setNewSubjectId("")
      setNewSubjectName("")
      setNewLevel("")
      setNewGrade("")
      setNewTopic("")
      setNewDate("")
      setNewStartTime("07:00")
      setNewEndTime("07:45")
      setNewIsDoublePeriod(false)
      setNewRoom("")
      setNewDescription("")
      setNewVisibility("ALL")
      setNewTargetDeptId("")
      
      refreshSlots()
    } else {
      showToast(res.error || "Lỗi tạo tiết dạy!", "error")
    }
  }

  // Filter slots for tabs
  const tabFilteredSlots = useMemo(() => {
    const now = new Date()
    return slots.filter(slot => {
      const isHost = slot.teacherId === currentTeacher.id
      const isObserver = slot.registrations.some((r: any) => r.teacherId === currentTeacher.id)
      const slotDate = new Date(slot.date)
      const isPast = slotDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (activeTab === "dang-ky") {
        return !isHost && !isPast
      }
      if (activeTab === "my-schedule") {
        return (isHost || isObserver) && !isPast
      }
      if (activeTab === "history") {
        return (isHost || isObserver) && isPast
      }
      return true
    })
  }, [slots, activeTab, currentTeacher.id])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(window.location.search)
    if (tab === "dang-ky") params.delete("tab")
    else params.set("tab", tab)
    router.push(`smpathname}?${params.toString()}`.replace('smpathname', pathname))
  }

  const selectedMonthStr = newDate ? `${(new Date(newDate).getMonth() + 1).toString().padStart(2, "0")}/${new Date(newDate).getFullYear()}` : "tháng hiện tại"

  return (
    <div className="flex flex-col gap-6 relative pb-12 animate-fade-in">
      {/* Toast Alert Box */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border border-white/20 text-white animate-in slide-in-from-top duration-300 ${
          toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-rose-600" : "bg-sky-600"
        }`}>
          {toast.type === "success" && <Check className="w-5 h-5 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-bold tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#0A3230] tracking-tight flex items-center gap-2">
            <Calendar className="w-7 h-7 text-[#00A19A]" />
            Đăng ký dự giờ
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Đăng ký dự giờ tiết dạy tại Sky-Line
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-[#00A19A] hover:bg-[#008B85] text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Thêm mới tiết dạy
        </button>
      </div>

      {/* Info Warning Alert */}
      <div className="flex items-start gap-4 p-5 bg-[#F0FDFA] border-2 border-[#CCFBF1] rounded-2xl text-[#0A3230] shadow-sm">
        <Info className="w-6 h-6 text-[#00A19A] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-extrabold text-sm uppercase tracking-wide">Dự giờ là gì?</h4>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed">
            Dự giờ là hoạt động chuyên môn giúp giáo viên học hỏi, trao đổi kinh nghiệm giảng dạy và hoàn thiện phương pháp sư phạm.
            Vui lòng chọn lớp học và đăng ký các tiết dự giờ phù hợp bên dưới.
          </p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 gap-1 bg-slate-100 p-1.5 rounded-xl">
        <button
          onClick={() => handleTabChange("dang-ky")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
            activeTab === "dang-ky"
              ? "bg-white text-[#0A3230] shadow-sm font-black"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Đăng ký dự giờ
        </button>
        <button
          onClick={() => handleTabChange("my-schedule")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
            activeTab === "my-schedule"
              ? "bg-white text-[#0A3230] shadow-sm font-black"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
          }`}
        >
          <Layers className="w-4 h-4" />
          Lịch của tôi
        </button>
        <button
          onClick={() => handleTabChange("history")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
            activeTab === "history"
              ? "bg-white text-[#0A3230] shadow-sm font-black"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
          }`}
        >
          <FileText className="w-4 h-4" />
          Lịch sử đăng ký
        </button>
      </div>

      {/* Main Layout: Filters on Left, Grid Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Filters */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col gap-4">
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#00A19A]" />
            Lọc thông tin
          </h3>

          {/* Level Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cấp học</label>
            <select
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value)
                setFilterGrade("all") // Reset grade on level change
              }}
              className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-[#00A19A] outline-none"
            >
              <option value="all">Chọn cấp học</option>
              <option value="Mầm non">Mầm non</option>
              <option value="Tiểu học">Tiểu học</option>
              <option value="THCS">THCS</option>
              <option value="THPT">THPT</option>
            </select>
          </div>

          {/* Grade Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khối lớp</label>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              disabled={filterLevel === "all"}
              className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-[#00A19A] outline-none disabled:opacity-50"
            >
              <option value="all">Chọn khối lớp</option>
              {getGradesForLevel(filterLevel).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Môn học</label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-[#00A19A] outline-none"
            >
              <option value="all">Chọn môn học</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
              ))}
            </select>
          </div>

          {/* Teacher Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Giáo viên dạy</label>
            <select
              value={filterTeacherId}
              onChange={(e) => setFilterTeacherId(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-[#00A19A] outline-none"
            >
              <option value="all">Chọn giáo viên</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.teacherName} ({t.teacherCode})</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thời gian</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-[#00A19A] outline-none"
            />
          </div>

          {/* Filter Search Button */}
          <button
            onClick={handleSearch}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-[#0A3230] hover:bg-[#134D4A] text-white font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2 text-xs uppercase tracking-wider"
          >
            {isPending ? "Đang tìm kiếm..." : "Tìm kiếm"}
          </button>
        </div>

        {/* Right Column: Grid list cards */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {tabFilteredSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Calendar className="w-16 h-16 text-slate-300 stroke-1 mb-4" />
              <p className="text-slate-400 font-bold text-sm">Không tìm thấy tiết dạy dự giờ nào!</p>
              <p className="text-slate-400 text-xs mt-1">Vui lòng thay đổi bộ lọc hoặc thêm mới tiết dạy của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tabFilteredSlots.map((slot) => {
                const isHost = slot.teacherId === currentTeacher.id
                const isRegistered = slot.registrations.some((r: any) => r.teacherId === currentTeacher.id)
                const observerCount = slot.registrations.length
                const seatsLeft = slot.maxSeats - observerCount
                const slotDate = new Date(slot.date)

                return (
                  <div 
                    key={slot.id} 
                    className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-4 group relative overflow-hidden"
                  >
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#E0F2FE] text-[#0284C7] rounded-lg uppercase tracking-wider">
                          {slot.level}
                        </span>
                        <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#FEF3C7] text-[#D97706] rounded-lg uppercase tracking-wider">
                          {slot.grade}
                        </span>
                      </div>
                      {slot.visibilityType === "DEPARTMENT" && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-md">
                          Nội bộ Tổ
                        </span>
                      )}
                    </div>

                    {/* Lesson topic */}
                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-800 text-base group-hover:text-[#00A19A] transition-colors leading-snug">
                        {slot.topic}
                      </h4>
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
                        Môn học: <span className="text-slate-700">{slot.subjectName}</span>
                      </p>
                    </div>

                    {/* Meta info: Time, Room, Teacher */}
                    <div className="grid grid-cols-1 gap-2.5 bg-slate-50 p-3.5 rounded-xl text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#00A19A] shrink-0" />
                        <span>{slotDate.toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#00A19A] shrink-0" />
                        <span>
                          {slot.startTime} - {slot.endTime} 
                          {slot.isDoublePeriod && <span className="text-[10px] font-bold text-[#00A19A] ml-2">(2 tiết liên tiếp)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#00A19A] shrink-0" />
                        <span>Phòng: <span className="font-bold text-slate-800">{slot.room}</span></span>
                      </div>
                      <div className="flex items-center gap-2 border-t border-slate-200 pt-2 mt-0.5">
                        <User className="w-4 h-4 text-[#00A19A] shrink-0" />
                        <span>
                          Gv dạy: <span className="font-bold text-slate-800">{slot.teacher.teacherName}</span>
                          <span className="text-slate-400 text-[10px] ml-1.5">({slot.teacher.campus?.campusName || "Sky-Line"})</span>
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {slot.description && (
                      <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-slate-200 pl-2">
                        "{slot.description.length > 100 ? `${slot.description.substring(0, 100)}...` : slot.description}"
                      </p>
                    )}

                    {/* Footer Actions / Seats */}
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      {/* Seats Count */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
                        <Users className="w-4 h-4 text-slate-400" />
                        {seatsLeft > 0 ? (
                          <span>Còn <span className="text-emerald-600 font-black">{seatsLeft}</span> chỗ</span>
                        ) : (
                          <span className="text-red-500 font-black">Hết chỗ</span>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isHost ? (
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa tiết
                          </button>
                        ) : isRegistered ? (
                          <button
                            onClick={() => handleCancelRegistration(slot.id)}
                            className="px-4 py-1.5 bg-slate-100 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                          >
                            Hủy đăng ký
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRegister(slot.id)}
                            disabled={seatsLeft <= 0}
                            className="px-5 py-1.5 bg-[#00A19A] hover:bg-[#008B85] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all shadow-sm disabled:shadow-none"
                          >
                            Đăng ký
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notes / Rules Alert at Bottom */}
      <div className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 mt-6 shadow-sm">
        <Info className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <h4 className="font-extrabold text-sm uppercase tracking-wide text-slate-800">Lưu ý chuyên môn:</h4>
          <ul className="list-disc pl-4 text-xs font-semibold text-slate-500 leading-relaxed space-y-1">
            <li>Vui lòng có mặt trước giờ dạy dự định ít nhất 10 phút để chuẩn bị.</li>
            <li>Giữ trật tự tuyệt đối trong lớp học và không làm ảnh hưởng đến quá trình học tập của học sinh.</li>
            <li>Sau khi tiết dạy kết thúc, xin hãy trao đổi và nhận xét đóng góp ý kiến xây dựng cho giáo viên dạy.</li>
          </ul>
        </div>
      </div>

      {/* "Thêm mới tiết dạy" Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#0A3230] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-lg">Thêm mới tiết dạy</h3>
                <p className="text-white/60 text-xs mt-0.5">Tạo tiết dạy để giáo viên khác đăng ký dự giờ</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {/* Monthly Limit warning */}
              <div className="flex items-center justify-between gap-3 p-4 bg-sky-50 border border-sky-100 text-sky-800 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Info className="w-4.5 h-4.5 text-sky-600 shrink-0" />
                  <span className="text-xs font-semibold">Bạn có thể tạo tối đa 2 tiết dạy mỗi tháng.</span>
                </div>
                <span className="text-xs font-bold bg-sky-200/50 px-2 py-0.5 rounded-md text-sky-900 shrink-0">
                  Đã tạo trong {selectedMonthStr}: <span className="font-black">{monthlyLimitCount}/2</span> tiết
                </span>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Level Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Cấp học *</label>
                  <select
                    value={newLevel}
                    onChange={(e) => {
                      setNewLevel(e.target.value)
                      setNewGrade("") // reset grade
                    }}
                    required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                  >
                    <option value="">Chọn cấp học</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                  </select>
                </div>

                {/* Grade Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Khối lớp *</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    required
                    disabled={!newLevel}
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none disabled:opacity-50"
                  >
                    <option value="">Chọn khối lớp</option>
                    {getGradesForLevel(newLevel).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Subject Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Môn học *</label>
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                  >
                    <option value="">Chọn môn học</option>
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
                    ))}
                    <option value="other">Môn học khác / Tổ nhóm chuyên đề</option>
                  </select>
                </div>

                {/* Other Subject Input (conditional) */}
                {newSubjectId === "other" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Tên môn học khác *</label>
                    <input
                      type="text"
                      placeholder="Nhập tên môn học..."
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      required
                      className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                    />
                  </div>
                )}

                {/* Topic / Lesson Title */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Bài dạy / Chủ đề *</label>
                  <input
                    type="text"
                    placeholder="Nhập tên bài dạy hoặc chủ đề sinh hoạt..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                  />
                </div>

                {/* Date Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Ngày dạy *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                  />
                </div>

                {/* Room Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">Phòng học *</label>
                  <select
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    required
                    className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                  >
                    <option value="">Chọn phòng học</option>
                    {roomOptions.map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                    <option value="Phòng học lớp phụ trách">Phòng học lớp phụ trách</option>
                  </select>
                </div>

                {/* Time Selection */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Thời gian: Từ *</label>
                    <select
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full text-sm rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                    >
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Đến *</label>
                    <select
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full text-sm rounded-xl border border-slate-200 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                    >
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pb-2 h-[42px] pl-2">
                    <input
                      type="checkbox"
                      id="isDoublePeriod"
                      checked={newIsDoublePeriod}
                      onChange={(e) => setNewIsDoublePeriod(e.target.checked)}
                      className="w-4.5 h-4.5 rounded text-[#00A19A] focus:ring-[#00A19A]"
                    />
                    <label htmlFor="isDoublePeriod" className="text-xs font-extrabold text-slate-600 select-none">
                      Dạy 2 tiết liên tiếp
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">Mô tả nội dung tiết dạy (không bắt buộc)</label>
                  <span className="text-[10px] font-bold text-slate-400">{newDescription.length}/500</span>
                </div>
                <textarea
                  placeholder="Nhập mô tả ngắn về nội dung, mục tiêu, phương pháp dạy học..."
                  maxLength={500}
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-200 p-3 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none resize-none"
                />
              </div>

              {/* Visibility Settings */}
              <div className="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-xs font-extrabold text-slate-700">Hiển thị cho giáo viên</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={newVisibility === "ALL"}
                      onChange={() => setNewVisibility("ALL")}
                      className="w-4 h-4 text-[#00A19A] focus:ring-[#00A19A]"
                    />
                    Tất cả giáo viên trong trường
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={newVisibility === "DEPARTMENT"}
                      onChange={() => setNewVisibility("DEPARTMENT")}
                      className="w-4 h-4 text-[#00A19A] focus:ring-[#00A19A]"
                    />
                    Chỉ các tổ nhóm chuyên môn
                  </label>
                </div>

                {newVisibility === "DEPARTMENT" && (
                  <div className="flex flex-col gap-1.5 mt-2 animate-in fade-in duration-200">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chọn tổ nhóm *</label>
                    <select
                      value={newTargetDeptId}
                      onChange={(e) => setNewTargetDeptId(e.target.value)}
                      required
                      className="w-full text-sm rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-[#00A19A] outline-none"
                    >
                      <option value="">Chọn tổ nhóm chuyên môn</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || monthlyLimitCount >= 2}
                  className="px-6 py-2.5 bg-[#00A19A] hover:bg-[#008B85] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md text-sm shrink-0"
                >
                  {submitting ? "Đang lưu..." : "Lưu tiết dạy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
