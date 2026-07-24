"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, GraduationCap, User, Award, FileText, Compass, ClipboardCheck, BookOpen, MessageSquare } from "lucide-react"

export default function TeacherStudentProfilesPrintPage() {
  useEffect(() => {
    const style = document.createElement("style")
    style.id = "hide-portal-layout"
    style.innerHTML = `
      aside, header, footer, .no-print, [class*="Sidebar"], [class*="ChatBotWidget"], [class*="chatbot"] {
        display: none !important;
      }
      main {
        margin-left: 0 !important;
        padding: 0 !important;
      }
      div.p-4, div.p-6, div.p-8, div.p-10, div.p-12, div.px-6 {
        padding: 0 !important;
      }
      div.flex.min-h-screen {
        display: block !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById("hide-portal-layout")
      if (el) el.remove()
    }
  }, [])
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "class"
  const academicYearId = searchParams.get("academicYearId")
  const classId = searchParams.get("classId")
  const studentId = searchParams.get("studentId")

  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadPrintData() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set("action", "getProfiles")
        
        if (studentId) params.set("studentId", studentId)
        if (academicYearId) params.set("academicYearId", academicYearId)
        if (classId && classId !== "all") params.set("classId", classId)

        const res = await fetch(`/api/teacher-student-records?${params.toString()}`)
        if (res.ok) {
          const result = await res.json()
          const data = result.data || []

          setStudents(data)

          if (data.length === 0) {
            setError("Không tìm thấy học sinh nào trong phạm vi đã chọn.")
          } else {
            // Trigger browser print dialog after short delay to let images/layout load
            setTimeout(() => {
              window.print()
            }, 1000)
          }
        } else {
          setError("Lỗi khi tải dữ liệu từ máy chủ.")
        }
      } catch (err) {
        console.error("Error loading print profiles:", err)
        setError("Lỗi kết nối mạng.")
      } finally {
        setLoading(false)
      }
    }

    loadPrintData()
  }, [type, academicYearId, classId, studentId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-white">
        <Loader2 className="w-12 h-12 text-[#00A99D] animate-spin" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Đang khởi tạo bản in hồ sơ A4...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-md shadow-sm">
          <h3 className="font-extrabold text-base mb-2">Lỗi in ấn</h3>
          <p className="text-xs font-semibold">{error}</p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:py-0 print:bg-white">
      {/* Dynamic Page Break Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-cv-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 1.2cm !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 100vh !important;
            page-break-after: always !important;
            position: relative !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print-layout {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      ` }} />

      {/* Control bar (hidden in print mode) */}
      <div className="no-print-layout max-w-4xl mx-auto mb-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between text-xs font-bold text-slate-700">
        <div>
          <span>Bản in A4: </span>
          <span className="text-[#00A99D] font-extrabold">{students.length} học sinh</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#00A99D] hover:bg-[#009085] text-white rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Mở hộp thoại In
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-655 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Render list of Student CVs */}
      <div className="space-y-6 print:space-y-0 max-w-4xl mx-auto">
        {students.map((student) => {
          const isHngOrSb = student.class?.educationSystem === "HNG" || student.class?.educationSystem === "SB" || student.educationSystem === "HNG" || student.educationSystem === "SB";
          const isPreschool = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"].includes(student.class?.grade);

          return (
            <div
              key={student.id}
              className="print-cv-page bg-white border border-slate-200 shadow-md rounded-2xl p-10 font-sans relative overflow-hidden"
            >
              {/* CV Header */}
              <div className="border-b-2 border-[#00A99D] pb-6 flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-[#00A99D]" />
                    <span className="font-extrabold text-sm tracking-wider text-slate-700 font-sans">SKY-LINE SYSTEM</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-805 uppercase tracking-tight font-sans">Hồ sơ Năng lực Học sinh</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Student Comprehensive Profile & Portfolio</p>
                </div>
                <div className="text-right text-xs text-slate-500 font-semibold space-y-0.5">
                  <div>Năm học: <span className="text-slate-800 font-bold">{student.yearName}</span></div>
                  <div>Cơ sở: <span className="text-slate-800 font-bold">{student.campusName}</span></div>
                </div>
              </div>

              {/* CV Body Grid */}
              <div className="grid grid-cols-3 gap-6 mt-6">
                {/* Left Column */}
                <div className="col-span-1 border-r border-slate-100 pr-6 space-y-6">
                  <div className="text-center space-y-3">
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-[#00A99D]/20 shadow-inner flex items-center justify-center bg-slate-50 text-slate-355">
                      <User className="w-16 h-16" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-800">{student.studentName}</h3>
                      <p className="text-[10px] text-[#00A99D] font-extrabold uppercase tracking-widest mt-0.5">Lớp: {student.className || "N/A"}</p>
                    </div>
                  </div>

                  {/* Administrative Info */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs text-slate-655 font-semibold">
                    <div className="flex justify-between">
                      <span>Mã học sinh:</span>
                      <span className="font-bold text-slate-855">{student.studentCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ngày sinh:</span>
                      <span className="font-bold text-slate-855">{student.dob}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Giới tính:</span>
                      <span className="font-bold text-slate-855">{student.gender}</span>
                    </div>
                  </div>

                  {/* Outstanding Achievements */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Award className="w-4 h-4 text-[#00A99D]" />
                      Thành tích nổi bật
                    </h4>
                    {(!student.achievements || student.achievements.length === 0) ? (
                      <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận thành tích.</p>
                    ) : (
                      <div className="space-y-2">
                        {student.achievements.slice(0, 3).map((a: any) => (
                          <div key={a.id} className="flex gap-2 items-start text-xs bg-amber-50/30 border border-amber-100 p-2 rounded-lg">
                            <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-slate-850 leading-tight">{a.achievement?.name}</div>
                              <div className="text-[9px] text-amber-700 font-extrabold uppercase mt-0.5">{a.achievement?.level}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Learning Commitment / Results */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <FileText className="w-4 h-4 text-[#00A99D]" />
                      {isHngOrSb
                        ? "Kết quả Học tập & Rèn luyện: Chương trình Bộ & Chương trình Học Song Ngữ"
                        : "Cam kết rèn luyện"}
                    </h4>
                    {student.commitmentContent ? (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                        <p className="text-[10px] text-slate-600 italic leading-relaxed line-clamp-4 font-semibold">
                          "{student.commitmentContent}"
                        </p>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                          <span className="text-[9px] text-slate-400 font-bold">Trạng thái:</span>
                          <span className="text-[8px] font-black uppercase text-teal-700">{student.commitmentStatus}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic font-semibold">
                        {isHngOrSb
                          ? "Chưa thiết lập kết quả học tập & rèn luyện."
                          : "Chưa thiết lập cam kết."}
                      </p>
                    )}
                  </div>

                  {/* Career Orientation */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Compass className="w-4 h-4 text-[#00A99D]" />
                      Định hướng ngành nghề
                    </h4>
                    {student.orientation ? (
                      <div className="bg-teal-50/20 border border-teal-100 p-3 rounded-lg space-y-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nhóm ngành quan tâm</div>
                        <div className="text-xs font-black text-slate-755">{student.orientation}</div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic font-semibold">Chưa định hướng ngành nghề.</p>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="col-span-2 space-y-6">
                  {/* Section: Academic Intake Profile */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <ClipboardCheck className="w-4 h-4 text-[#00A99D]" />
                      Hồ sơ học thuật đầu vào (Intake Evaluation)
                    </h4>
                    {student.admitted !== "Không" ? (
                      <div className="space-y-3">
                        {isPreschool ? (
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
                            <div className="text-xs font-bold text-slate-700">Đánh giá phát triển mầm non: <span className="font-extrabold text-[#00A99D]">{student.devAssessment || "N/A"}</span></div>
                            {student.probationaryComment && (
                              <div className="bg-white p-2.5 rounded border border-slate-100 text-[10px] text-slate-500 italic leading-relaxed">
                                "{student.probationaryComment}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                              <div className="text-[9px] text-[#00A99D] font-bold uppercase tracking-wider">Toán học</div>
                              <div className="text-lg font-black text-slate-805 mt-0.5">{student.mathScore || "—"}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                              <div className="text-[9px] text-indigo-650 font-bold uppercase tracking-wider">Ngữ văn</div>
                              <div className="text-lg font-black text-slate-805 mt-0.5">{student.literatureScore || "—"}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                              <div className="text-[9px] text-sky-655 font-bold uppercase tracking-wider">Anh viết</div>
                              <div className="text-lg font-black text-slate-805 mt-0.5">{student.writtenEnglishScore || "—"}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                              <div className="text-[9px] text-sky-655 font-bold uppercase tracking-wider">Anh nói</div>
                              <div className="text-lg font-black text-slate-850 mt-0.5">{student.oralEnglishScore || "—"}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận điểm khảo sát đầu vào.</p>
                    )}
                  </div>

                  {/* Section: Projects & Experiences */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <BookOpen className="w-4 h-4 text-[#00A99D]" />
                      Hoạt động trải nghiệm
                    </h4>
                    {(!student.projectExperiences || student.projectExperiences.length === 0) ? (
                      <p className="text-[10px] text-slate-400 italic font-semibold">Học sinh chưa tham gia hoạt động trải nghiệm nào.</p>
                    ) : (
                      <div className="space-y-2">
                        {student.projectExperiences.slice(0, 2).map((p: any) => (
                          <div key={p.id} className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg text-xs">
                            <div className="flex justify-between items-start">
                              <div className="font-bold text-slate-805">{p.projectName}</div>
                              <span className="text-[8px] font-black uppercase bg-[#00A99D]/10 text-[#00A99D] px-2 py-0.5 rounded">
                                {p.role || "Thành viên"}
                              </span>
                            </div>
                            {p.notes && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">"{p.notes}"</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Learning Support Progress */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <GraduationCap className="w-4 h-4 text-[#00A99D]" />
                      Kế hoạch hỗ trợ học tập & Phát triển
                    </h4>
                    {!student.supportReason ? (
                      <p className="text-[10px] text-slate-400 italic font-semibold">Không thuộc đối tượng nhận hỗ trợ trong năm học này.</p>
                    ) : (
                      <div className="border border-slate-100 bg-slate-50/30 p-3 rounded-lg text-xs space-y-2">
                        <div className="font-semibold text-slate-705">Mục tiêu: <span className="font-bold text-slate-800">{student.supportReason}</span></div>
                        <div className="text-[10px] text-slate-400 font-bold">GV phụ trách: {student.supportTeacher}</div>
                      </div>
                    )}
                  </div>

                  {/* Section: GVCN Testimonial */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <MessageSquare className="w-4 h-4 text-[#00A99D]" />
                      Nhận xét định kỳ từ Giáo viên Chủ nhiệm
                    </h4>
                    {student.latestGvcnComment ? (
                      <div className="bg-teal-50/10 border-l-4 border-[#00A99D] p-3 rounded-r-lg space-y-2">
                        <p className="text-xs text-slate-755 font-semibold italic leading-relaxed whitespace-pre-wrap">
                          "{student.latestGvcnComment}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận đánh giá định kỳ.</p>
                    )}
                  </div>
                </div>
              </div>


            </div>
          )
        })}
      </div>
    </div>
  )
}
