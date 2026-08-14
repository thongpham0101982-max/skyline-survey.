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
  MessageSquare,
  Ribbon
} from "lucide-react"
import { LinkStudentModal } from "@/components/LinkStudentModal"

export default function ParentStudentProfilePage() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
  const inputAssessment = profile?.inputAssessment || null
  const achievements = profile?.achievements || []
  const careerOrientation = profile?.careerOrientation || null
  const highlightComments = profile?.highlightComments || []
  const projectExperiences = profile?.projectExperiences || []
  const learningSupportTargets = profile?.learningSupportTargets || []

  const dateOfBirthStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'
  const genderStr = student.gender || 'Nam'
  const classNameStr = student.class?.className || selectedStudent.class?.className || "N/A"
  const campusNameStr = student.class?.campus?.campusName || selectedStudent.class?.campus?.campusName || "CS1"
  const academicYearNameStr = student.academicYear?.name || student.class?.academicYear?.name || "2026-2027"

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      {/* Child Switcher Dropdown / Pills Selector */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00A99D]" />
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
            <LinkStudentModal onSuccess={() => window.location.reload()} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse space-y-2">
          <GraduationCap className="w-8 h-8 mx-auto text-[#00A99D] animate-bounce" />
          <p>Đang tải Hồ sơ Năng lực Học sinh...</p>
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
        /* EXACT SCREENSHOT CARD CONTAINER */
        <div className="bg-white border-t-4 border-[#00A99D] rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-10 space-y-8 relative overflow-hidden font-sans">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#00A99D]" />
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

          {/* Main 2-Column Grid (Exactly matching screenshot layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN */}
            <div className="md:col-span-1 border-r border-slate-100 pr-0 md:pr-6 space-y-6">
              
              {/* Avatar & Name & Class Pill */}
              <div className="text-center space-y-3">
                <div className="w-32 h-32 mx-auto rounded-3xl overflow-hidden border-4 border-slate-100 shadow-inner flex items-center justify-center bg-slate-50 text-slate-300">
                  <User className="w-16 h-16" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-black text-xl text-slate-900">
                    {student.studentName || selectedStudent.studentName || "N/A"}
                  </h2>
                  <div>
                    <span className="inline-block bg-teal-50 text-[#00A99D] font-extrabold text-xs px-3.5 py-1 rounded-full border border-teal-100 uppercase tracking-wider">
                      LỚP: {classNameStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Administrative Info Card */}
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

              {/* Section 1: THÀNH TÍCH NỔI BẬT */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Ribbon className="w-4 h-4 text-[#00A99D]" />
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

              {/* Section 2: ĐỊNH HƯỚNG NGÀNH NGHỀ */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Compass className="w-4 h-4 text-[#00A99D]" />
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

            {/* RIGHT COLUMN */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Section 1: HỒ SƠ HỌC THUẬT ĐẦU VÀO (INTAKE EVALUATION) */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <ClipboardCheck className="w-4 h-4 text-[#00A99D]" />
                  <span>HỒ SƠ HỌC THUẬT ĐẦU VÀO (INTAKE EVALUATION)</span>
                </h3>

                {inputAssessment ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                      <div className="text-[9px] text-[#00A99D] font-black uppercase tracking-wider">Toán học</div>
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

              {/* Section 2: HOẠT ĐỘNG TRẢI NGHIỆM */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <BookOpen className="w-4 h-4 text-[#00A99D]" />
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

              {/* Section 3: KẾ HOẠCH HỖ TRỢ HỌC TẬP & PHÁT TRIỂN */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <GraduationCap className="w-4 h-4 text-[#00A99D]" />
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

              {/* Section 4: NHẬN XÉT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <MessageSquare className="w-4 h-4 text-[#00A99D]" />
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
    </div>
  )
}
