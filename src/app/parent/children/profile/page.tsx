"use client"

import { useState, useEffect } from "react"
import { 
  GraduationCap, 
  User, 
  Award, 
  BookOpen, 
  ClipboardCheck, 
  CheckCircle2, 
  Star, 
  Calendar, 
  MapPin, 
  School, 
  Users,
  Sparkles,
  TrendingUp,
  FileText,
  Compass,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  Printer,
  MessageCircle,
  Heart,
  Target,
  HelpCircle,
  MessageSquare,
  Layers,
  FolderCheck
} from "lucide-react"
import { LinkStudentModal } from "@/components/LinkStudentModal"

export default function ParentStudentProfilePage() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"cv" | "academic" | "entrance" | "achievements" | "orientation" | "projects" | "comments" | "support">("cv")

  useEffect(() => {
    let year = ""
    if (typeof window !== "undefined") {
      year = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(year)
    }

    async function loadChildren(targetYearId: string) {
      try {
        setLoading(true)
        const url = targetYearId ? `/api/parent/children?academicYearId=${targetYearId}` : "/api/parent/children"
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setChildrenList(data)
            setSelectedStudentId(data[0].id)
          } else {
            setChildrenList([])
            setSelectedStudentId("")
            setLoading(false)
          }
        } else {
          setChildrenList([])
          setSelectedStudentId("")
          setLoading(false)
        }
      } catch (e) {
        console.error("Error loading parent children:", e)
        setChildrenList([])
        setSelectedStudentId("")
        setLoading(false)
      }
    }

    loadChildren(year)

    const handleYearChange = () => {
      if (typeof window !== "undefined") {
        const newYear = localStorage.getItem("selectedAcademicYear") || ""
        setAcademicYearId(newYear)
        loadChildren(newYear)
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)

    return () => {
      window.removeEventListener("academicYearChanged", handleYearChange)
    }
  }, [])

  useEffect(() => {
    if (!selectedStudentId) {
      setLoading(false)
      return
    }

    async function load360Profile() {
      try {
        setLoading(true)
        const res = await fetch(`/api/advisory/profile-360?studentId=${selectedStudentId}&academicYearId=${academicYearId}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (e) {
        console.error("Error loading 360 profile:", e)
      } finally {
        setLoading(false)
      }
    }
    load360Profile()
  }, [selectedStudentId, academicYearId])

  const selectedStudent = childrenList.find(c => c.id === selectedStudentId) || {}
  const student = profile?.student || selectedStudent
  const termSummaries = profile?.termSummaries || []
  const termScores = profile?.termScores || []
  const inputAssessment = profile?.inputAssessment || null
  const achievements = profile?.achievements || []
  const goals = profile?.goals || []
  const careerOrientation = profile?.careerOrientation || null
  const learningCommitment = profile?.learningCommitment || null
  const highlightComments = profile?.highlightComments || []
  const projectExperiences = profile?.projectExperiences || []
  const learningSupportTargets = profile?.learningSupportTargets || []

  const hk1Summary = termSummaries.find((s: any) => s.semester === "HK1" || s.semester === 1)
  const hk2Summary = termSummaries.find((s: any) => s.semester === "HK2" || s.semester === 2)
  const homeroomTeacherName = selectedStudent.homeroomTeacherName || student.homeroomTeacherName || (student.class?.homeroomTeacherId ? "Phụ trách chuyên môn" : "Chưa phân công")
  const currentStatusColor = profile?.currentStatusColor || "GREEN"

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] p-8 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 backdrop-blur-md uppercase tracking-wider text-teal-100 border border-white/20">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>HỒ SƠ HỌC SINH 360° — MẪU NĂNG LỰC ADMIN</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Chi Tiết Hồ Sơ Học Sinh 360°</h1>
        <p className="text-xs sm:text-sm text-teal-100 font-medium max-w-3xl leading-relaxed">
          Sử dụng chính xác mẫu Hồ sơ Năng lực (Student Portfolio CV) từ Danh mục Admin: Thông tin cá nhân, Học thuật MOET, Đánh giá đầu vào, Khen thưởng & Kế hoạch hỗ trợ học tập.
        </p>
      </div>

      {/* Child Switcher Pill Selector */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00A99D]" />
            <span>Chọn con em xem Hồ sơ 360°:</span>
          </span>
          <div className="flex items-center gap-2">
            {childrenList.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedStudentId(c.id)}
                className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (
                  selectedStudentId === c.id 
                    ? "bg-[#003B3A] text-white shadow-sm" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {c.studentName} ({c.class?.className || 'Lớp hiện tại'})
              </button>
            ))}
            <LinkStudentModal onSuccess={() => window.location.reload()} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse space-y-2">
          <GraduationCap className="w-8 h-8 mx-auto text-[#00A99D] animate-bounce" />
          <p>Đang tải Hồ sơ Học sinh 360° chuẩn Admin...</p>
        </div>
      ) : childrenList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chưa gắn thông tin con em</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Tài khoản Phụ huynh hiện chưa được liên kết với mã học sinh. Vui lòng bổ sung mã học sinh hoặc liên hệ Văn phòng Nhà trường để hỗ trợ kích hoạt liên kết.
          </p>
          <div className="pt-2 flex justify-center">
            <LinkStudentModal onSuccess={() => window.location.reload()} buttonText="Bổ sung mã Học sinh ngay" />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header Thông tin Học sinh (Matching Admin HSHS client.tsx header) */}
          <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#00A99D]/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-teal-50 border border-[#00A99D]/30 flex items-center justify-center text-[#00A99D] shadow-sm shrink-0">
                <User className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xl text-slate-900 tracking-tight leading-tight">
                  {student.studentName || selectedStudent.studentName || "N/A"}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-xs font-semibold">
                  <span>Mã HS: <strong className="text-slate-800">{student.studentCode || selectedStudent.studentCode || "N/A"}</strong></span>
                  <span>•</span>
                  <span>Lớp: <strong className="text-teal-700">{student.class?.className || selectedStudent.class?.className || "N/A"}</strong></span>
                  <span>•</span>
                  <span>Cơ sở: <strong className="text-slate-800">{student.class?.campus?.campusName || selectedStudent.class?.campus?.campusName || "Skyline Campus"}</strong></span>
                  <span>•</span>
                  <span>GVCN: <strong className="text-teal-700">Cô/Thầy {homeroomTeacherName}</strong></span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={"text-xs font-black px-3 py-1 rounded-full border " + (
                currentStatusColor === "RED" ? "bg-rose-100 text-rose-800 border-rose-300" :
                currentStatusColor === "YELLOW" ? "bg-amber-100 text-amber-800 border-amber-300" :
                "bg-emerald-100 text-emerald-800 border-emerald-300"
              )}>
                {currentStatusColor === "RED" ? "🔴 Cần hỗ trợ" : currentStatusColor === "YELLOW" ? "🟡 Cần theo dõi" : "🟢 Tự học tốt"}
              </span>
            </div>
          </div>

          {/* Tab Navigation (Exact matching tabs from Admin client.tsx) */}
          <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/50 px-3 pt-2 gap-1 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab("cv")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                activeTab === "cv"
                  ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. CV Năng Lực 360°</span>
            </button>

            <button
              onClick={() => setActiveTab("academic")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                activeTab === "academic"
                  ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>2. Học Tập MOET</span>
            </button>

            <button
              onClick={() => setActiveTab("entrance")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                activeTab === "entrance"
                  ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>3. Khảo Sát Đầu Vào</span>
            </button>

            <button
              onClick={() => setActiveTab("achievements")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                activeTab === "achievements"
                  ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>4. Khen Thưởng</span>
            </button>

            <button
              onClick={() => setActiveTab("orientation")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                activeTab === "orientation"
                  ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>5. Định Hướng & Cam Kết</span>
            </button>

            <button
              onClick={() => setActiveTab("projects")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <FolderCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>6. Dự Án STEM & Trải Nghiệm</span>
            </button>

            <button
              onClick={() => setActiveTab("comments")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                activeTab === "comments"
                  ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>7. Nhận Xét Nổi Bật</span>
            </button>

            <button
              onClick={() => setActiveTab("support")}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                activeTab === "support"
                  ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>8. Hỗ Trợ Học Tập</span>
            </button>
          </div>

          {/* TAB CONTENT AREAS */}
          <div className="p-6 flex-grow">
            {/* TAB 1: CV NĂNG LỰC INTEGRATED (Mẫu chuẩn Admin Portfolio) */}
            {activeTab === "cv" && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-8 max-w-4xl mx-auto font-sans relative overflow-hidden">
                  {/* CV Header */}
                  <div className="border-b-2 border-[#00A99D] pb-6 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-6 h-6 text-[#00A99D]" />
                        <span className="font-extrabold text-sm tracking-wider text-slate-700">SKY-LINE SYSTEM</span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Hồ sơ Năng lực Học sinh</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Comprehensive Profile & Portfolio</p>
                    </div>
                    <div className="text-right text-xs text-slate-500 font-semibold space-y-0.5">
                      <div>Lớp: <span className="text-slate-800 font-bold">{student.class?.className || selectedStudent.class?.className || "N/A"}</span></div>
                      <div>Cơ sở: <span className="text-slate-800 font-bold">{student.class?.campus?.campusName || selectedStudent.class?.campus?.campusName || "N/A"}</span></div>
                    </div>
                  </div>

                  {/* CV Body Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {/* Left Column */}
                    <div className="md:col-span-1 border-r border-slate-100 pr-6 space-y-6">
                      <div className="text-center space-y-3">
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-[#00A99D]/20 shadow-inner flex items-center justify-center bg-slate-50 text-slate-400">
                          <User className="w-16 h-16" />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-slate-900">{student.studentName || selectedStudent.studentName || "N/A"}</h3>
                          <p className="text-[10px] text-[#00A99D] font-extrabold uppercase tracking-widest mt-0.5">Lớp: {student.class?.className || selectedStudent.class?.className || "N/A"}</p>
                        </div>
                      </div>

                      {/* Administrative Info */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs text-slate-700 font-semibold">
                        <div className="flex justify-between">
                          <span>Mã học sinh:</span>
                          <span className="font-bold text-slate-900">{student.studentCode || selectedStudent.studentCode || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Giới tính:</span>
                          <span className="font-bold text-slate-900">{student.gender || selectedStudent.gender || "Nam/Nữ"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ngày sinh:</span>
                          <span className="font-bold text-slate-900">
                            {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Outstanding Achievements */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <Award className="w-4 h-4 text-[#00A99D]" />
                          Thành tích nổi bật
                        </h4>
                        {achievements.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận thành tích trong DB.</p>
                        ) : (
                          <div className="space-y-2">
                            {achievements.slice(0, 3).map((a: any, idx: number) => (
                              <div key={idx} className="flex gap-2 items-start text-xs bg-amber-50/30 border border-amber-100 p-2 rounded-lg">
                                <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold text-slate-900 leading-tight">{a.achievement?.title || a.achievement?.name || "Khen thưởng danh hiệu"}</div>
                                  <div className="text-[9px] text-amber-700 font-extrabold uppercase mt-0.5">{a.achievement?.awardLevel || a.achievement?.category || "Cấp Trường"}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Career Orientation */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <Compass className="w-4 h-4 text-[#00A99D]" />
                          Định hướng phát triển
                        </h4>
                        {careerOrientation ? (
                          <div className="bg-teal-50/30 border border-teal-100 p-3 rounded-lg space-y-1">
                            <div className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">Mục tiêu phát triển</div>
                            <div className="text-xs font-black text-slate-800">{careerOrientation.description || careerOrientation.targetField}</div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận định hướng trong DB.</p>
                        )}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-2 space-y-6">
                      {/* Section: Academic Intake Profile */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <ClipboardCheck className="w-4 h-4 text-[#00A99D]" />
                          Hồ sơ học thuật đầu vào (Intake Evaluation)
                        </h4>
                        {inputAssessment ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                              <div className="text-[9px] text-[#00A99D] font-bold uppercase tracking-wider">Toán học</div>
                              <div className="text-lg font-black text-slate-900 mt-0.5">{inputAssessment.mathScore ?? "—"}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                              <div className="text-[9px] text-teal-700 font-bold uppercase tracking-wider">Tâm lý</div>
                              <div className="text-lg font-black text-slate-900 mt-0.5">{inputAssessment.psychologyScore ?? "Ổn định"}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                              <div className="text-[9px] text-sky-600 font-bold uppercase tracking-wider">Anh viết</div>
                              <div className="text-lg font-black text-slate-900 mt-0.5">{inputAssessment.writtenEnglishScore ?? "—"}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                              <div className="text-[9px] text-sky-600 font-bold uppercase tracking-wider">Anh nói</div>
                              <div className="text-lg font-black text-slate-900 mt-0.5">{inputAssessment.oralEnglishScore ?? "—"}</div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận điểm khảo sát đầu vào trong DB.</p>
                        )}
                      </div>

                      {/* Section: Academic MOET Summary */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <TrendingUp className="w-4 h-4 text-[#00A99D]" />
                          Kết quả Học tập MOET
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Học kỳ I</span>
                            <div className="text-xs font-bold text-slate-700">Học lực: <strong className="text-teal-700">{hk1Summary?.academicRating || "Chưa cập nhật"}</strong></div>
                            <div className="text-xs font-bold text-slate-700">Rèn luyện: <strong className="text-emerald-700">{hk1Summary?.conductRating || "Chưa cập nhật"}</strong></div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Học kỳ II</span>
                            <div className="text-xs font-bold text-slate-700">Học lực: <strong className="text-teal-700">{hk2Summary?.academicRating || "Chưa cập nhật"}</strong></div>
                            <div className="text-xs font-bold text-slate-700">Rèn luyện: <strong className="text-emerald-700">{hk2Summary?.conductRating || "Chưa cập nhật"}</strong></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ACADEMIC MOET */}
            {activeTab === "academic" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học Kỳ I</span>
                    <div className="flex justify-between items-center pt-1">
                      <div>
                        <p className="text-xs text-slate-500 font-bold">Học lực: <strong className="text-teal-700">{hk1Summary?.academicRating || "Chưa cập nhật"}</strong></p>
                        <p className="text-xs text-slate-500 font-bold">Rèn luyện: <strong className="text-emerald-700 font-extrabold">{hk1Summary?.conductRating || "Chưa cập nhật"}</strong></p>
                      </div>
                      <span className="px-3 py-1 bg-teal-50 text-teal-700 font-black rounded-xl text-xs">HK1</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học Kỳ II</span>
                    <div className="flex justify-between items-center pt-1">
                      <div>
                        <p className="text-xs text-slate-500 font-bold">Học lực: <strong className="text-teal-700">{hk2Summary?.academicRating || "Chưa cập nhật"}</strong></p>
                        <p className="text-xs text-slate-500 font-bold">Rèn luyện: <strong className="text-emerald-700 font-extrabold">{hk2Summary?.conductRating || "Chưa cập nhật"}</strong></p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black rounded-xl text-xs">HK2</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                    <span>Bảng Điểm Môn Học & Nhận Xét GVBM</span>
                  </h3>

                  {termScores.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-slate-300" />
                      <p>Chưa có dữ liệu điểm số môn học trong cơ sở dữ liệu cho học sinh này.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3 rounded-l-xl">Môn Học</th>
                            <th className="p-3">Học Kỳ</th>
                            <th className="p-3">Điểm TB / Đánh giá</th>
                            <th className="p-3 rounded-r-xl">Nhận Xét Của GVBM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {termScores.map((score: any, idx: number) => (
                            <tr key={idx}>
                              <td className="p-3 font-bold text-slate-800">{score.subject?.subjectName || score.subjectId || "Môn học"}</td>
                              <td className="p-3 font-semibold text-slate-600">{score.semester || "Cả năm"}</td>
                              <td className="p-3 font-extrabold text-teal-700">{score.gpaScore ?? score.gradeText ?? "Đạt"}</td>
                              <td className="p-3 text-slate-600">{score.teacherComment || "Đạt yêu cầu môn học"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ENTRANCE EVALUATION */}
            {activeTab === "entrance" && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-teal-600" />
                  <span>Kết Quả Khảo Sát Đầu Vào Theo Từng Lĩnh Vực</span>
                </h3>

                {!inputAssessment ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-300" />
                    <p>Chưa có dữ liệu khảo sát đầu vào trong cơ sở dữ liệu cho học sinh này.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 text-center space-y-1">
                      <span className="text-[10px] font-black text-teal-600 uppercase">Khảo sát Tâm lý</span>
                      <p className="text-lg font-black text-teal-900">{inputAssessment.psychologyScore ?? "Ổn định"}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 text-center space-y-1">
                      <span className="text-[10px] font-black text-sky-600 uppercase">Tiếng Anh Viết</span>
                      <p className="text-lg font-black text-sky-900">{inputAssessment.writtenEnglishScore ? `${inputAssessment.writtenEnglishScore} / 10` : "Đạt"}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-center space-y-1">
                      <span className="text-[10px] font-black text-amber-600 uppercase">Tiếng Anh Phỏng vấn</span>
                      <p className="text-lg font-black text-amber-900">{inputAssessment.oralEnglishScore ? `${inputAssessment.oralEnglishScore} / 10` : "Đạt"}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
                      <span className="text-[10px] font-black text-emerald-600 uppercase">Toán & Tư duy</span>
                      <p className="text-lg font-black text-emerald-900">{inputAssessment.mathScore ? `${inputAssessment.mathScore} / 10` : "Đạt"}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ACHIEVEMENTS */}
            {activeTab === "achievements" && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Kỷ Yếu Thành Tích & Danh Hiệu Khen Thưởng</span>
                </h3>

                {achievements.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                    <Award className="w-8 h-8 mx-auto text-slate-300" />
                    <p>Chưa có dữ liệu danh hiệu khen thưởng trong cơ sở dữ liệu cho học sinh này.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {achievements.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                          <Star className="w-5 h-5 fill-amber-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{item.achievement?.title || item.achievement?.name || "Khen thưởng danh hiệu học tập"}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{item.achievement?.category || "Cấp Trường"} • {item.achievement?.awardLevel || "Đạt danh hiệu"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: ORIENTATION */}
            {activeTab === "orientation" && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-teal-600" />
                  <span>Định Hướng Phát Triển & Cam Kết Học Tập</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-medium">
                  <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-3">
                    <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider block">Định hướng sự nghiệp & Năng khiếu</span>
                    <p className="text-slate-700 leading-relaxed font-semibold">
                      {careerOrientation?.description || careerOrientation?.targetField || "Chưa có dữ liệu định hướng phát triển trong DB."}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3">
                    <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider block">Cam kết mục tiêu năm học</span>
                    <p className="text-slate-700 leading-relaxed font-semibold">
                      {learningCommitment?.commitmentText || "Chưa có dữ liệu cam kết học tập trong DB."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: PROJECTS */}
            {activeTab === "projects" && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <FolderCheck className="w-4 h-4 text-teal-600" />
                  <span>Dự Án Trải Nghiệm Thực Tế & Hoạt Động STEM</span>
                </h3>

                {projectExperiences.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                    <FolderCheck className="w-8 h-8 mx-auto text-slate-300" />
                    <p>Chưa có dữ liệu hoạt động dự án trải nghiệm trong cơ sở dữ liệu cho học sinh này.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectExperiences.map((p: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-teal-50/30 border border-teal-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-slate-900">{p.projectName || p.title}</span>
                          <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">Hoàn thành</span>
                        </div>
                        <p className="text-xs text-slate-600 font-semibold">{p.description || p.resultSummary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: COMMENTS */}
            {activeTab === "comments" && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-600" />
                  <span>Nhận Xét Nổi Bật Từ Giáo Viên Hàng Tháng</span>
                </h3>

                {highlightComments.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                    <p>Chưa có nhận xét ghi nhận từ Giáo viên trong cơ sở dữ liệu.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {highlightComments.map((c: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                          <span>{c.teacherName || "Giáo viên"}</span>
                          <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : ''}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-semibold">{c.commentText || c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 8: SUPPORT */}
            {activeTab === "support" && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-500" />
                  <span>Kế Hoạch & Mục Tiêu Hỗ Trợ Học Tập Cá Nhân Hóa</span>
                </h3>

                {learningSupportTargets.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                    <Target className="w-8 h-8 mx-auto text-slate-300" />
                    <p>Học sinh đạt kết quả học tập ổn định, hiện chưa thuộc diện cần bổ trợ đặc biệt.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {learningSupportTargets.map((st: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-rose-900">{st.targetName || st.subjectName}</span>
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">Đang thực hiện</span>
                        </div>
                        <p className="text-xs text-slate-700 font-semibold">{st.description || st.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
