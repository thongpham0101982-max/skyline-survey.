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
  TrendingUp
} from "lucide-react"

export default function ParentStudentProfilePage() {
  const [childrenList, setChildrenList] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "INPUT_ASSESSMENT" | "ACHIEVEMENTS">("ACADEMIC")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)
    }

    const handleYearChange = () => {
      if (typeof window !== "undefined") {
        const storedYear = localStorage.getItem("selectedAcademicYear") || ""
        setAcademicYearId(storedYear)
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)

    async function loadChildren() {
      try {
        setLoading(true)
        const res = await fetch("/api/parent/children")
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
    loadChildren()

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

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans text-slate-800 pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-teal-500 p-8 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 backdrop-blur-md uppercase tracking-wider text-sky-100 border border-white/20">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>PARENT PORTAL — HỒ SƠ HỌC SINH 360°</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Hồ Sơ Học Tập & Rèn Luyện Toàn Diện</h1>
        <p className="text-xs sm:text-sm text-sky-100 font-medium max-w-2xl leading-relaxed">
          Theo dõi tổng quan thông tin cá nhân, kết quả học tập, rèn luyện đạo đức, kết quả khảo sát đầu vào và các danh hiệu khen thưởng của con.
        </p>
      </div>

      {/* Child Switcher Dropdown / Pills */}
      {childrenList.length > 1 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Chọn con em xem hồ sơ:</span>
          </span>
          <div className="flex gap-2">
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
                {c.studentName} ({c.class?.className || 'N/A'})
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse space-y-2">
          <GraduationCap className="w-8 h-8 mx-auto text-sky-500 animate-bounce" />
          <p>Đang tải Hồ sơ học sinh 360°...</p>
        </div>
      ) : childrenList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chưa gắn thông tin con em</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tài khoản Phụ huynh hiện chưa được liên kết với mã học sinh. Vui lòng liên hệ Văn phòng Nhà trường để hỗ trợ kích hoạt liên kết.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Thông tin Cá nhân & Lớp học */}
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
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-sky-600" />
                      <span>Lớp: <strong>{student.class?.className || selectedStudent.class?.className || "N/A"}</strong></span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      <span>{student.class?.campus?.campusName || selectedStudent.class?.campus?.campusName || "N/A"}</span>
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

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 gap-6 text-xs font-black">
            <button
              onClick={() => setActiveTab("ACADEMIC")}
              className={"pb-3 flex items-center gap-2 border-b-2 transition-all " + (
                activeTab === "ACADEMIC"
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span>KẾT QUẢ HỌC TẬP & RÈN LUYỆN</span>
            </button>

            <button
              onClick={() => setActiveTab("INPUT_ASSESSMENT")}
              className={"pb-3 flex items-center gap-2 border-b-2 transition-all " + (
                activeTab === "INPUT_ASSESSMENT"
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>KHẢO SÁT ĐẦU VÀO</span>
            </button>

            <button
              onClick={() => setActiveTab("ACHIEVEMENTS")}
              className={"pb-3 flex items-center gap-2 border-b-2 transition-all " + (
                activeTab === "ACHIEVEMENTS"
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Award className="w-4 h-4" />
              <span>KHEN THƯỞNG & HOẠT ĐỘNG</span>
            </button>
          </div>

          {/* Tab Content 1: Kết quả Học tập & Rèn luyện */}
          {activeTab === "ACADEMIC" && (
            <div className="space-y-6">
              {/* Summary Score Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả Học kỳ I</span>
                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Học lực: <strong className="text-sky-700">Tốt / Khá</strong></p>
                      <p className="text-xs text-slate-500 font-bold">Rèn luyện: <strong className="text-emerald-700 font-extrabold">Tốt</strong></p>
                    </div>
                    <span className="px-3 py-1 bg-sky-50 text-sky-700 font-black rounded-xl text-xs">HK1</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả Học kỳ II</span>
                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Học lực: <strong className="text-sky-700">Tốt</strong></p>
                      <p className="text-xs text-slate-500 font-bold">Rèn luyện: <strong className="text-emerald-700 font-extrabold">Tốt</strong></p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black rounded-xl text-xs">HK2</span>
                  </div>
                </div>
              </div>

              {/* General Subject Table Overview */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span>Bảng Tổng Hợp Nhận Xét Các Môn Học</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 rounded-l-xl">Môn Học</th>
                        <th className="p-3">Học Kỳ I</th>
                        <th className="p-3">Học Kỳ II</th>
                        <th className="p-3 rounded-r-xl">Nhận Xét Của GVBM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Toán học</td>
                        <td className="p-3 font-extrabold text-sky-700">Đạt / Tốt</td>
                        <td className="p-3 font-extrabold text-sky-700">Đạt / Tốt</td>
                        <td className="p-3 text-slate-600">Nắm vững tư duy logic, tích cực phát biểu.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Ngữ văn</td>
                        <td className="p-3 font-extrabold text-sky-700">Đạt / Tốt</td>
                        <td className="p-3 font-extrabold text-sky-700">Đạt / Tốt</td>
                        <td className="p-3 text-slate-600">Viết văn giàu cảm xúc, đọc hiểu sâu sắc.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Tiếng Anh (ESL)</td>
                        <td className="p-3 font-extrabold text-sky-700">A / Excellent</td>
                        <td className="p-3 font-extrabold text-sky-700">A+ / Mastered</td>
                        <td className="p-3 text-slate-600">Giao tiếp tự tin, khả năng thuyết trình xuất sắc.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Khảo sát đầu vào */}
          {activeTab === "INPUT_ASSESSMENT" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-sky-600" />
                <span>Kết Quả Đánh Giá Đầu Vào Của Học Sinh</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 text-center space-y-1">
                  <span className="text-[10px] font-black text-sky-600 uppercase">Khảo sát Tâm lý</span>
                  <p className="text-lg font-black text-sky-900">Đạt / Ổn định</p>
                </div>
                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 text-center space-y-1">
                  <span className="text-[10px] font-black text-teal-600 uppercase">Tiếng Anh Viết</span>
                  <p className="text-lg font-black text-teal-900">8.5 / 10</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-center space-y-1">
                  <span className="text-[10px] font-black text-amber-600 uppercase">Tiếng Anh Phỏng vấn</span>
                  <p className="text-lg font-black text-amber-900">Khá / Tốt</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Toán / Tư duy</span>
                  <p className="text-lg font-black text-emerald-900">9.0 / 10</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Khen thưởng & Hoạt động */}
          {activeTab === "ACHIEVEMENTS" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Danh Hiệu Khen Thưởng & Hoạt Động Trải Nghiệm</span>
              </h3>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                    <Star className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Học sinh Xuất sắc Học kỳ I — Năm học 2026-2027</h4>
                    <p className="text-[11px] text-slate-500 font-semibold">Cấp Trường • Tuyên dương tại Lễ Tổng kết</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/30 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Tham gia Hoạt động Trải nghiệm STEM & Sáng tạo Robot</h4>
                    <p className="text-[11px] text-slate-500 font-semibold">Tích cực tham gia nhóm sáng tạo và hoàn thành dự án xuất sắc</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
