"use client"

import Link from "next/link"

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
  MessageSquare,
  Ribbon,
  Target,
  Bookmark,
  FolderCheck,
  Heart,
  HelpCircle
} from "lucide-react"

export default function ParentStudentProfilePage() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    "advisory" | "hshs_detail" | "moet" | "entrance" | "achievements" | "orientation" | "experiences" | "comments" | "support"
  >("hshs_detail")

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
  const consultationLogs = profile?.consultationLogs || []

  const hk1Summary = termSummaries.find((s: any) => s.semester === "HK1" || s.semester === 1)
  const hk2Summary = termSummaries.find((s: any) => s.semester === "HK2" || s.semester === 2)
  const dateOfBirthStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'
  const genderStr = student.gender || 'Nam'
  const classNameStr = student.class?.className || selectedStudent.class?.className || "N/A"
  const campusNameStr = student.class?.campus?.campusName || selectedStudent.class?.campus?.campusName || "CS1"
  const academicYearNameStr = student.academicYear?.name || student.class?.academicYear?.name || "2026-2027"
  const homeroomTeacherName = selectedStudent.homeroomTeacherName || student.homeroomTeacherName || (student.class?.homeroomTeacherId ? "Phụ trách chuyên môn" : "Chưa phân công")
  const currentStatusColor = profile?.currentStatusColor || "GREEN"

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      {/* Child Switcher Dropdown / Pills Selector */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#48BFE3]" />
            <span>Chọn học sinh xem Hồ sơ Năng lực:</span>
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
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse space-y-2">
          <GraduationCap className="w-8 h-8 mx-auto text-[#48BFE3] animate-bounce" />
          <p>Đang tải Hồ sơ Năng lực Học sinh...</p>
        </div>
      ) : childrenList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chưa có dữ liệu con em</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Tài khoản chưa có thông tin học sinh liên kết. Quý Phụ huynh vui lòng chuyển sang trang Tổng quan để liên kết học sinh.
          </p>
          <div className="pt-2 flex justify-center">
            <Link href="/parent" className="px-5 py-2.5 rounded-2xl bg-[#003B3A] text-white text-xs font-bold hover:bg-[#004D4A] transition-all">
              Chuyển sang trang Tổng quan
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB BAR MATCHING EXACT SCREENSHOT (2 Rows rounded pill container) */}
          <div className="bg-white rounded-[28px] p-5 border border-slate-200/90 shadow-sm space-y-3 font-sans">
            {/* Row 1 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setActiveTab("advisory")}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all " + (
                  activeTab === "advisory"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-teal-50/40 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Compass className="w-4 h-4 text-slate-500" />
                <span>Cố vấn & Mục tiêu 360°</span>
              </button>

              <button
                onClick={() => setActiveTab("hshs_detail")}
                className={"flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all " + (
                  activeTab === "hshs_detail"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <User className="w-4 h-4 text-[#48BFE3]" />
                <span>Xem chi tiết HSHS</span>
              </button>

              <button
                onClick={() => setActiveTab("moet")}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all " + (
                  activeTab === "moet"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-teal-50/40 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Kết quả Học tập (MOET)</span>
              </button>

              <button
                onClick={() => setActiveTab("entrance")}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all " + (
                  activeTab === "entrance"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-teal-50/40 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <ClipboardCheck className="w-4 h-4 text-slate-500" />
                <span>Khảo sát đầu vào</span>
              </button>

              <button
                onClick={() => setActiveTab("achievements")}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all " + (
                  activeTab === "achievements"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-teal-50/40 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Bookmark className="w-4 h-4 text-slate-500" />
                <span>Thành tích</span>
              </button>
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 border-t border-slate-100">
              <button
                onClick={() => setActiveTab("orientation")}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all " + (
                  activeTab === "orientation"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-teal-50/40 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Compass className="w-4 h-4 text-slate-500" />
                <span>Hướng nghiệp</span>
              </button>

              <button
                onClick={() => setActiveTab("experiences")}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all " + (
                  activeTab === "experiences"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-teal-50/40 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Hoạt động trải nghiệm</span>
              </button>

              <button
                onClick={() => setActiveTab("comments")}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all " + (
                  activeTab === "comments"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-teal-50/40 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span>Nhận xét nổi bật</span>
              </button>

              <button
                onClick={() => setActiveTab("support")}
                className={"flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all " + (
                  activeTab === "support"
                    ? "border-2 border-[#48BFE3] text-[#48BFE3] bg-teal-50/40 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <GraduationCap className="w-4 h-4 text-slate-500" />
                <span>Hỗ trợ học tập</span>
              </button>
            </div>
          </div>

          {/* TAB 1: XEM CHI TIẾT HSHS (EXACT SCREENSHOT PORTFOLIO CARD) */}
          {activeTab === "hshs_detail" && (
            <div className="bg-white border-t-4 border-[#48BFE3] rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-10 space-y-8 relative overflow-hidden font-sans">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#48BFE3]" />
                    <span className="font-extrabold text-xs tracking-wider text-slate-600 uppercase">SKY-LINE SYSTEM</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    HỒ SƠ NĂNG LỰC HỌC SINH
                  </h1>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    STUDENT COMPREHENSIVE PROFILE & PORTFOLIO
                  </p>
                </div>

                <div className="text-right text-xs space-y-1 self-start sm:self-auto">
                  <div className="inline-block bg-slate-100 text-slate-700 font-extrabold px-3.5 py-1 rounded-full text-xs">
                    Năm học: <span className="font-black text-slate-900">{academicYearNameStr}</span>
                  </div>
                  <div className="text-slate-500 font-bold text-xs pr-2">
                    Cơ sở: <strong className="text-slate-800">{campusNameStr}</strong>
                  </div>
                </div>
              </div>

              {/* Main 2-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="md:col-span-1 border-r border-slate-100 pr-0 md:pr-6 space-y-6">
                  <div className="text-center space-y-3">
                    <div className="w-32 h-32 mx-auto rounded-3xl overflow-hidden border-4 border-slate-100 shadow-inner flex items-center justify-center bg-slate-50 text-slate-300">
                      <User className="w-16 h-16" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="font-black text-xl text-slate-900">
                        {student.studentName || selectedStudent.studentName || "N/A"}
                      </h2>
                      <div>
                        <span className="inline-block bg-teal-50 text-[#48BFE3] font-extrabold text-xs px-3.5 py-1 rounded-full border border-teal-100 uppercase tracking-wider">
                          LỚP: {classNameStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs text-slate-600 font-semibold">
                    <div className="flex justify-between items-center">
                      <span>Mã học sinh:</span>
                      <span className="font-black text-slate-900">{student.studentCode || selectedStudent.studentCode || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Ngày sinh:</span>
                      <span className="font-bold text-slate-900">{dateOfBirthStr}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Giới tính:</span>
                      <span className="font-bold text-slate-900">{genderStr}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Ribbon className="w-4 h-4 text-[#48BFE3]" />
                      <span>THÀNH TÍCH NỔI BẬT</span>
                    </h3>
                    {achievements.length === 0 ? (
                      <p className="text-xs text-slate-400 italic font-medium py-1">
                        Chưa ghi nhận thành tích.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {achievements.map((a: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-start text-xs bg-amber-50/40 border border-amber-100 p-2.5 rounded-xl">
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">{a.achievement?.title || a.achievement?.name || "Khen thưởng"}</div>
                              <div className="text-[9px] text-amber-700 font-extrabold uppercase mt-0.5">{a.achievement?.awardLevel || a.achievement?.category || "Cấp Trường"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Compass className="w-4 h-4 text-[#48BFE3]" />
                      <span>ĐỊNH HƯỚNG NGÀNH NGHỀ</span>
                    </h3>
                    {careerOrientation?.description || careerOrientation?.targetField ? (
                      <div className="bg-teal-50/40 border border-teal-100 p-3 rounded-xl space-y-1">
                        <div className="text-[9px] text-teal-700 font-bold uppercase tracking-wider">Nhóm ngành phát triển</div>
                        <p className="text-xs font-bold text-slate-800 leading-relaxed">{careerOrientation.description || careerOrientation.targetField}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic font-medium py-1">
                        Chưa định hướng ngành nghề.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="md:col-span-2 space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <ClipboardCheck className="w-4 h-4 text-[#48BFE3]" />
                      <span>HỒ SƠ HỌC THUẬT ĐẦU VÀO (INTAKE EVALUATION)</span>
                    </h3>
                    {inputAssessment ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                          <div className="text-[9px] text-[#48BFE3] font-black uppercase tracking-wider">Toán học</div>
                          <div className="text-xl font-black text-slate-900 mt-1">{inputAssessment.mathScore ?? "—"}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                          <div className="text-[9px] text-teal-700 font-black uppercase tracking-wider">Tâm lý</div>
                          <div className="text-xl font-black text-slate-900 mt-1">{inputAssessment.psychologyScore ?? "Ổn định"}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                          <div className="text-[9px] text-sky-600 font-black uppercase tracking-wider">Anh viết</div>
                          <div className="text-xl font-black text-slate-900 mt-1">{inputAssessment.writtenEnglishScore ?? "—"}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                          <div className="text-[9px] text-sky-600 font-black uppercase tracking-wider">Anh nói</div>
                          <div className="text-xl font-black text-slate-900 mt-1">{inputAssessment.oralEnglishScore ?? "—"}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic font-medium py-1">
                        Chưa ghi nhận điểm khảo sát đầu vào.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <BookOpen className="w-4 h-4 text-[#48BFE3]" />
                      <span>HOẠT ĐỘNG TRẢI NGHIỆM</span>
                    </h3>
                    {projectExperiences.length === 0 ? (
                      <p className="text-xs text-slate-400 italic font-medium py-1">
                        Học sinh chưa tham gia hoạt động trải nghiệm nào.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {projectExperiences.map((p: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-teal-50/30 border border-teal-100 space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                              <span>{p.projectName || p.title}</span>
                              <span className="text-[9px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-black">Hoàn thành</span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">{p.description || p.resultSummary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <GraduationCap className="w-4 h-4 text-[#48BFE3]" />
                      <span>KẾ HOẠCH HỖ TRỢ HỌC TẬP & PHÁT TRIỂN</span>
                    </h3>
                    {learningSupportTargets.length === 0 ? (
                      <p className="text-xs text-slate-400 italic font-medium py-1">
                        Không thuộc đối tượng nhận hỗ trợ trong năm học này.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {learningSupportTargets.map((st: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold text-rose-900">
                              <span>{st.targetName || st.subjectName}</span>
                              <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-black">Đang bổ trợ</span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">{st.description || st.notes}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <MessageSquare className="w-4 h-4 text-[#48BFE3]" />
                      <span>NHẬN XÉT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM</span>
                    </h3>
                    {highlightComments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic font-medium py-1">
                        Chưa ghi nhận đánh giá định kỳ.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {highlightComments.map((c: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                              <span>{c.teacherName || "GVCN"}</span>
                              <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : ''}</span>
                            </div>
                            <p className="text-xs text-slate-800 font-semibold">{c.commentText || c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTHER TABS */}
          {activeTab === "advisory" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-600" />
                <span>Cố Vấn & Mục Tiêu Phát Triển 360°</span>
              </h3>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Trạng thái tự học:</span>
                <span className={"px-3.5 py-1 rounded-full text-xs font-black uppercase border " + (
                  currentStatusColor === "RED" ? "bg-rose-100 text-rose-800 border-rose-300" :
                  currentStatusColor === "YELLOW" ? "bg-amber-100 text-amber-800 border-amber-300" :
                  "bg-emerald-100 text-emerald-800 border-emerald-300"
                )}>
                  {currentStatusColor === "RED" ? "🔴 Cần hỗ trợ" : currentStatusColor === "YELLOW" ? "🟡 Cần theo dõi" : "🟢 Tự học tốt"}
                </span>
              </div>
              {goals.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Chưa có bảng mục tiêu trong cơ sở dữ liệu.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {goals.map((g: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-100 px-2 py-0.5 rounded">{g.category}</span>
                      <h4 className="text-xs font-black text-slate-900">{g.targetText}</h4>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "moet" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Bảng Điểm Môn Học & Nhận Xét MOET</span>
              </h3>
              {termScores.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Chưa có dữ liệu điểm số môn học trong cơ sở dữ liệu.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Môn Học</th>
                        <th className="p-3">Học Kỳ</th>
                        <th className="p-3">Điểm TB / Đánh giá</th>
                        <th className="p-3">Nhận Xét Của GVBM</th>
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
          )}

          {activeTab === "entrance" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-teal-600" />
                <span>Kết Quả Khảo Sát Đầu Vào</span>
              </h3>
              {!inputAssessment ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Chưa có dữ liệu điểm khảo sát đầu vào.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                    <div className="text-[9px] text-[#48BFE3] font-black uppercase tracking-wider">Toán học</div>
                    <div className="text-xl font-black text-slate-900 mt-1">{inputAssessment.mathScore ?? "—"}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                    <div className="text-[9px] text-teal-700 font-black uppercase tracking-wider">Tâm lý</div>
                    <div className="text-xl font-black text-slate-900 mt-1">{inputAssessment.psychologyScore ?? "Ổn định"}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                    <div className="text-[9px] text-sky-600 font-black uppercase tracking-wider">Anh viết</div>
                    <div className="text-xl font-black text-slate-900 mt-1">{inputAssessment.writtenEnglishScore ?? "—"}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                    <div className="text-[9px] text-sky-600 font-black uppercase tracking-wider">Anh nói</div>
                    <div className="text-xl font-black text-slate-900 mt-1">{inputAssessment.oralEnglishScore ?? "—"}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "achievements" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500" />
                <span>Danh Hiệu Khen Thưởng</span>
              </h3>
              {achievements.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Chưa ghi nhận thành tích.</p>
              ) : (
                <div className="space-y-2">
                  {achievements.map((item: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 flex items-center gap-4">
                      <Award className="w-6 h-6 text-amber-500" />
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{item.achievement?.title || item.achievement?.name}</h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{item.achievement?.category || "Cấp Trường"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "orientation" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-600" />
                <span>Định Hướng Ngành Nghề & Phát Triển</span>
              </h3>
              <p className="text-xs font-semibold text-slate-800">{careerOrientation?.description || careerOrientation?.targetField || "Chưa định hướng ngành nghề."}</p>
            </div>
          )}

          {activeTab === "experiences" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>Hoạt Động Trải Nghiệm</span>
              </h3>
              {projectExperiences.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Học sinh chưa tham gia hoạt động trải nghiệm nào.</p>
              ) : (
                <div className="space-y-2">
                  {projectExperiences.map((p: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-teal-50/30 border border-teal-100 space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                        <span>{p.projectName || p.title}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{p.description || p.resultSummary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                <span>Nhận Xét Định Kỳ Từ Giáo Viên</span>
              </h3>
              {highlightComments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Chưa ghi nhận đánh giá định kỳ.</p>
              ) : (
                <div className="space-y-2">
                  {highlightComments.map((c: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <p className="text-xs text-slate-800 font-semibold">{c.commentText || c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "support" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-rose-500" />
                <span>Kế Hoạch Hỗ Trợ Học Tập & Phát Triển</span>
              </h3>
              {learningSupportTargets.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Không thuộc đối tượng nhận hỗ trợ trong năm học này.</p>
              ) : (
                <div className="space-y-2">
                  {learningSupportTargets.map((st: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-1">
                      <span className="text-xs font-bold text-rose-900">{st.targetName || st.subjectName}</span>
                      <p className="text-xs text-slate-600 font-medium">{st.description || st.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
