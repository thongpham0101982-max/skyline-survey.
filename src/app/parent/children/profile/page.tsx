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
  Printer
} from "lucide-react"
import { LinkStudentModal } from "@/components/LinkStudentModal"

export default function ParentStudentProfilePage() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"INFO" | "ACADEMIC" | "INPUT_ASSESSMENT" | "ACHIEVEMENTS" | "ADVISORY">("INFO")

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
  const advisoryStatuses = profile?.advisoryStatuses || []

  const hk1Summary = termSummaries.find((s: any) => s.semester === "HK1" || s.semester === 1)
  const hk2Summary = termSummaries.find((s: any) => s.semester === "HK2" || s.semester === 2)
  const homeroomTeacherName = selectedStudent.homeroomTeacherName || student.homeroomTeacherName || (student.class?.homeroomTeacherId ? "Phụ trách chuyên môn" : "Chưa phân công")
  const currentStatusColor = profile?.currentStatusColor || "GREEN"

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans text-slate-800 pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-teal-500 p-8 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 backdrop-blur-md uppercase tracking-wider text-sky-100 border border-white/20">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>PARENT PORTAL — HỒ SƠ HỌC SINH 360°</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Chi Tiết Hồ Sơ Học Sinh 360°</h1>
        <p className="text-xs sm:text-sm text-sky-100 font-medium max-w-2xl leading-relaxed">
          Xem thông tin chi tiết lý lịch cá nhân, kết quả học tập rèn luyện, khảo sát đầu vào, khen thưởng và cố vấn tự học đồng bộ từ hệ thống Quản lý Học sinh Admin.
        </p>
      </div>

      {/* Child Switcher Dropdown / Pills */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Chọn con em xem hồ sơ chi tiết:</span>
          </span>
          <div className="flex items-center gap-2">
            {childrenList.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedStudentId(c.id)}
                className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (
                  selectedStudentId === c.id 
                    ? "bg-sky-700 text-white shadow-sm" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {c.studentName} ({c.class?.className || 'Chưa xếp lớp'})
              </button>
            ))}
            <LinkStudentModal onSuccess={() => window.location.reload()} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse space-y-2">
          <GraduationCap className="w-8 h-8 mx-auto text-sky-500 animate-bounce" />
          <p>Đang tải Chi tiết Hồ sơ Học sinh 360°...</p>
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
        <div className="space-y-6">
          {/* Thẻ Thông tin Tổng quan Học sinh */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-2xl shadow-inner">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900">{student.studentName || selectedStudent.studentName || "N/A"}</h2>
                    <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase">
                      Mã HS: {student.studentCode || selectedStudent.studentCode || "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-sky-600" />
                      <span>Lớp: <strong>{student.class?.className || selectedStudent.class?.className || "N/A"}</strong></span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>{student.class?.campus?.campusName || selectedStudent.class?.campus?.campusName || "N/A"}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-teal-700 font-bold">
                      <span>GVCN: {homeroomTeacherName}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[220px]">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Giới tính</span>
                  <span className="font-extrabold text-slate-700">{student.gender || selectedStudent.gender || "Nam/Nữ"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Ngày sinh</span>
                  <span className="font-extrabold text-slate-700">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Nav Tabs Chi tiết Hồ sơ (Matching Admin HSHS) */}
          <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-xs font-black overflow-x-auto">
            <button
              onClick={() => setActiveTab("INFO")}
              className={"pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all " + (
                activeTab === "INFO"
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <User className="w-4 h-4" />
              <span>1. LÝ LỊCH VÀ THÔNG TIN CÁ NHÂN</span>
            </button>

            <button
              onClick={() => setActiveTab("ACADEMIC")}
              className={"pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all " + (
                activeTab === "ACADEMIC"
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span>2. KẾT QUẢ HỌC TẬP & RÈN LUYỆN</span>
            </button>

            <button
              onClick={() => setActiveTab("INPUT_ASSESSMENT")}
              className={"pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all " + (
                activeTab === "INPUT_ASSESSMENT"
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>3. KHẢO SÁT ĐẦU VÀO</span>
            </button>

            <button
              onClick={() => setActiveTab("ACHIEVEMENTS")}
              className={"pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all " + (
                activeTab === "ACHIEVEMENTS"
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Award className="w-4 h-4" />
              <span>4. KHEN THƯỞNG & THÀNH TÍCH</span>
            </button>

            <button
              onClick={() => setActiveTab("ADVISORY")}
              className={"pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all " + (
                activeTab === "ADVISORY"
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Compass className="w-4 h-4" />
              <span>5. CỐ VẤN TỰ HỌC & MỤC TIÊU</span>
            </button>
          </div>

          {/* Tab 1: Lý lịch và Thông tin Cá nhân */}
          {activeTab === "INFO" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-sky-600" />
                <span>Chi Tiết Lý Lịch Học Sinh & Thông Tin Liên Hệ</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Thông tin học đường</span>
                  <div className="space-y-2 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Họ và tên:</span>
                      <span className="font-extrabold text-slate-900">{student.studentName || selectedStudent.studentName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã học sinh:</span>
                      <span className="font-bold text-sky-700">{student.studentCode || selectedStudent.studentCode || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Lớp học:</span>
                      <span className="font-bold text-slate-800">{student.class?.className || selectedStudent.class?.className || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cơ sở học tập:</span>
                      <span className="font-bold text-slate-800">{student.class?.campus?.campusName || selectedStudent.class?.campus?.campusName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Giáo viên chủ nhiệm:</span>
                      <span className="font-bold text-teal-700">{homeroomTeacherName}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Thông tin liên hệ gia đình</span>
                  <div className="space-y-2 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Giới tính:</span>
                      <span className="font-bold text-slate-800">{student.gender || selectedStudent.gender || "Nam/Nữ"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngày sinh:</span>
                      <span className="font-bold text-slate-800">
                        {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trạng thái hồ sơ:</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Hoạt động / Chính thức</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Kết quả Học tập & Rèn luyện */}
          {activeTab === "ACADEMIC" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả Học kỳ I</span>
                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Học lực: <strong className="text-sky-700">{hk1Summary?.academicRating || "Chưa cập nhật"}</strong></p>
                      <p className="text-xs text-slate-500 font-bold">Rèn luyện: <strong className="text-emerald-700 font-extrabold">{hk1Summary?.conductRating || "Chưa cập nhật"}</strong></p>
                    </div>
                    <span className="px-3 py-1 bg-sky-50 text-sky-700 font-black rounded-xl text-xs">HK1</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả Học kỳ II</span>
                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Học lực: <strong className="text-sky-700">{hk2Summary?.academicRating || "Chưa cập nhật"}</strong></p>
                      <p className="text-xs text-slate-500 font-bold">Rèn luyện: <strong className="text-emerald-700 font-extrabold">{hk2Summary?.conductRating || "Chưa cập nhật"}</strong></p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black rounded-xl text-xs">HK2</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span>Bảng Tổng Hợp Nhận Xét & Điểm Số Các Môn Học</span>
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
                            <td className="p-3 font-extrabold text-sky-700">{score.gpaScore ?? score.gradeText ?? "Đạt"}</td>
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

          {/* Tab 3: Khảo sát đầu vào */}
          {activeTab === "INPUT_ASSESSMENT" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-sky-600" />
                <span>Kết Quả Đánh Giá Đầu Vào Của Học Sinh</span>
              </h3>

              {!inputAssessment ? (
                <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Chưa có dữ liệu khảo sát đầu vào trong cơ sở dữ liệu cho học sinh này.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 text-center space-y-1">
                    <span className="text-[10px] font-black text-sky-600 uppercase">Khảo sát Tâm lý</span>
                    <p className="text-lg font-black text-sky-900">{inputAssessment.psychologyScore ?? "Đạt / Ổn định"}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 text-center space-y-1">
                    <span className="text-[10px] font-black text-teal-600 uppercase">Tiếng Anh Viết</span>
                    <p className="text-lg font-black text-teal-900">{inputAssessment.writtenEnglishScore ? `${inputAssessment.writtenEnglishScore} / 10` : "Đạt"}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-center space-y-1">
                    <span className="text-[10px] font-black text-amber-600 uppercase">Tiếng Anh Phỏng vấn</span>
                    <p className="text-lg font-black text-amber-900">{inputAssessment.oralEnglishScore ? `${inputAssessment.oralEnglishScore} / 10` : "Đạt"}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Toán / Tư duy</span>
                    <p className="text-lg font-black text-emerald-900">{inputAssessment.mathScore ? `${inputAssessment.mathScore} / 10` : "Đạt"}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Khen thưởng & Danh hiệu */}
          {activeTab === "ACHIEVEMENTS" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Danh Hiệu Khen Thưởng & Kỷ Yếu Thành Tích</span>
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

          {/* Tab 5: Cố vấn Tự học & Mục tiêu */}
          {activeTab === "ADVISORY" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-600" />
                <span>Bảng Mục Tiêu Phát Triển & Tín Hiệu Cố Vấn</span>
              </h3>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Tín hiệu theo dõi tự học:</span>
                <span className={"px-3.5 py-1 rounded-full text-xs font-black uppercase border " + (
                  currentStatusColor === "RED" ? "bg-rose-100 text-rose-800 border-rose-300" :
                  currentStatusColor === "YELLOW" ? "bg-amber-100 text-amber-800 border-amber-300" :
                  "bg-emerald-100 text-emerald-800 border-emerald-300"
                )}>
                  {currentStatusColor === "RED" ? "🔴 Cần hỗ trợ đặc biệt" : currentStatusColor === "YELLOW" ? "🟡 Cần theo dõi thêm" : "🟢 Ổn định & Phát triển tốt"}
                </span>
              </div>

              {goals.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Con chưa khởi tạo bảng mục tiêu cá nhân cho năm học này.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((g: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-800 uppercase inline-block">
                        {g.category}
                      </span>
                      <h4 className="text-xs font-black text-slate-900">{g.targetText}</h4>
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
