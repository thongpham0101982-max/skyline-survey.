"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, GraduationCap, User, Award, FileText, Compass, ClipboardCheck, BookOpen, MessageSquare } from "lucide-react"

export default function AdminStudentProfilesPrintPage() {
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
  const block = searchParams.get("block") || "k12"
  const academicYearId = searchParams.get("academicYearId")
  const campusId = searchParams.get("campusId")
  const classId = searchParams.get("classId")
  const grade = searchParams.get("grade")
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
        if (campusId && campusId !== "all") params.set("campusId", campusId)
        if (classId && classId !== "all") params.set("classId", classId)

        const res = await fetch(`/api/admin/student-profiles?${params.toString()}`)
        if (res.ok) {
          const result = await res.json()
          let data = result.data || []

          // Apply local filtering by grade if specified
          if (grade && grade !== "all") {
            data = data.filter((s: any) => s.class?.grade === grade)
          }

          // Apply local filtering by Bậc học (block)
          data = data.filter((s: any) => {
            const isPreschoolGrade = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"].includes(s.class?.grade)
            return block === "preschool" ? isPreschoolGrade : !isPreschoolGrade
          })

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
  }, [type, block, academicYearId, campusId, classId, grade, studentId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-white">
        <Loader2 className="w-12 h-12 text-[#48BFE3] animate-spin" />
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

      {/* Admin print control bar (hidden in print mode) */}
      <div className="no-print-layout max-w-4xl mx-auto mb-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between text-xs font-bold text-slate-700">
        <div>
          <span>Bản in A4: </span>
          <span className="text-[#48BFE3] font-extrabold">{students.length} học sinh</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#48BFE3] hover:bg-[#009085] text-white rounded-xl shadow-xs transition-all cursor-pointer"
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
        {students.map((student) => (
          <div
            key={student.id}
            className="print-cv-page bg-white border border-slate-200 shadow-md rounded-2xl p-8 font-sans relative overflow-hidden space-y-6"
          >
            {/* TOP DECORATIVE BANNER */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#003B3A] via-[#007A72] to-[#48BFE3]" />

            {/* SECTION 1: HEADER & ADMINISTRATIVE INFO */}
            <div className="border-b-2 border-slate-100 pb-4 pt-1">
              <div className="flex justify-between items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003B3A] to-[#007A72] flex items-center justify-center text-white shadow-md">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-black text-[10px] tracking-widest text-[#007A72] uppercase">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
                    <h2 className="text-lg font-black text-slate-850 uppercase tracking-tight">HỒ SƠ NĂNG LỰC HỌC SINH</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Student Comprehensive Profile &amp; Portfolio</p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right text-xs font-semibold text-slate-600">
                  <div>Năm học: <span className="text-[#007A72] font-black">{student.yearName || "2025-2026"}</span></div>
                  <div>Cơ sở: <span className="text-slate-800 font-bold">{student.campusName || "Sky-Line"}</span></div>
                </div>
              </div>

              {/* PROFILE CARD: AVATAR, INFO & GVCN */}
              <div className="bg-gradient-to-br from-slate-50 to-teal-50/20 border border-teal-100/80 rounded-xl p-4 grid grid-cols-4 gap-4 items-center">
                {/* Avatar Column */}
                <div className="col-span-1 text-center flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow bg-white flex items-center justify-center text-teal-700">
                    <User className="w-10 h-10" />
                  </div>
                  <span className="inline-block px-2.5 py-0.5 bg-[#007A72]/10 border border-[#007A72]/20 text-[#007A72] font-black text-[10px] rounded-full uppercase tracking-wider">
                    Lớp {student.className || "N/A"}
                  </span>
                </div>

                {/* Info Column */}
                <div className="col-span-3 grid grid-cols-2 gap-3 text-xs font-medium text-slate-700">
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Họ và tên học sinh</span>
                      <span className="text-sm font-black text-slate-900">{student.studentName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Mã học sinh</span>
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">{student.studentCode}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Ngày sinh</span>
                        <span className="font-bold text-slate-800">{student.dob || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Giới tính</span>
                        <span className="font-bold text-slate-800">{student.gender || "N/A"}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Giáo viên chủ nhiệm (GVCN)</span>
                      <span className="font-black text-[#007A72] text-xs">
                        {student.homeroomTeacherName || "Thầy/Cô Chủ nhiệm"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: KẾT QUẢ HỌC TẬP (MOET / HỌC THUẬT) */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-[#007A72]" />
                2. KẾT QUẢ HỌC TẬP &amp; HỌC THUẬT (MOET EVALUATION)
              </h3>
              <div className="grid grid-cols-4 gap-2.5">
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <div className="text-[9px] text-[#007A72] font-black uppercase">Toán học</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">{student.mathScore || "8.5"}</div>
                  <div className="text-[8px] text-slate-400 font-semibold">Hoàn thành tốt</div>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <div className="text-[9px] text-indigo-700 font-black uppercase">Ngữ văn</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">{student.literatureScore || "8.0"}</div>
                  <div className="text-[8px] text-slate-400 font-semibold">Hoàn thành tốt</div>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <div className="text-[9px] text-sky-700 font-black uppercase">Tiếng Anh (Viết)</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">{student.writtenEnglishScore || "9.0"}</div>
                  <div className="text-[8px] text-slate-400 font-semibold">Xuất sắc</div>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <div className="text-[9px] text-amber-700 font-black uppercase">Tiếng Anh (Nói)</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">{student.oralEnglishScore || "8.8"}</div>
                  <div className="text-[8px] text-slate-400 font-semibold">Xuất sắc</div>
                </div>
              </div>
            </div>

            {/* SECTION 3: THÀNH TÍCH & KHEN THƯỞNG */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                3. THÀNH TÍCH &amp; KHEN THƯỞNG NỔI BẬT
              </h3>
              {(!student.achievements || student.achievements.length === 0) ? (
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-center text-xs text-slate-400 italic">
                  Chưa ghi nhận thành tích giải thưởng trong năm học.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-center w-8">STT</th>
                        <th className="py-2 px-3">Tên Giải thưởng</th>
                        <th className="py-2 px-3">Lĩnh vực</th>
                        <th className="py-2 px-3 text-center">Hạng / Cấp giải</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {student.achievements.slice(0, 4).map((item: any, idx: number) => {
                        const ach = item.achievement || item;
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{ach.name || "Giải thưởng"}</td>
                            <td className="py-2 px-3 text-[9px] font-black text-[#007A72] uppercase">{ach.category || "Thể thao / Học thuật"}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                                {ach.level || "Cấp Trường"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 4: HOẠT ĐỘNG TRẢI NGHIỆM & DỰ ÁN */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                4. HOẠT ĐỘNG TRẢI NGHIỆM &amp; DỰ ÁN THỰC TẾ
              </h3>
              {(!student.experientialActivities || student.experientialActivities.length === 0) ? (
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-center text-xs text-slate-400 italic">
                  Chưa tham gia dự án trải nghiệm ngoại khóa.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {student.experientialActivities.slice(0, 4).map((act: any, idx: number) => (
                    <div key={idx} className="bg-sky-50/30 border border-sky-100 p-2.5 rounded-lg text-xs font-semibold">
                      <div className="font-bold text-slate-800">{act.activityName}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Vai trò: <span className="font-bold text-slate-700">{act.role}</span> | Đánh giá: <span className="font-bold text-teal-700">{act.evalLevel}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 5: PHIẾU CỐ VẤN HỌC TẬP & ĐÁNH GIÁ RUBRIC */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                5. PHIẾU CỐ VẤN HỌC TẬP &amp; ĐÁNH GIÁ THEO RUBRIC
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50/30 border border-indigo-100 p-3 rounded-xl space-y-1 text-xs">
                  <h4 className="text-[10px] font-black text-indigo-900 uppercase">Mục tiêu cá nhân (Cố vấn)</h4>
                  <p className="text-[11px] text-slate-700 italic leading-snug">
                    "{student.commitmentContent || student.orientation || 'Quyết tâm rèn luyện tư duy sáng tạo và hoàn thành xuất sắc các mục tiêu cá nhân.'}"
                  </p>
                </div>
                <div className="bg-teal-50/30 border border-teal-100 p-3 rounded-xl space-y-1 text-xs font-semibold">
                  <h4 className="text-[10px] font-black text-[#007A72] uppercase">Đánh giá Năng lực Rubric</h4>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between"><span>Tự chủ &amp; Tự học:</span><span className="font-black text-[#007A72]">Tốt (Level 4)</span></div>
                    <div className="flex justify-between"><span>Giao tiếp &amp; Hợp tác:</span><span className="font-black text-[#007A72]">Tốt (Level 4)</span></div>
                    <div className="flex justify-between"><span>Giải quyết vấn đề:</span><span className="font-black text-[#007A72]">Đạt (Level 3)</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 6: NHẬN XẾT NỔI BẬT & ĐÁNH GIÁ ĐỊNH KỲ */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                6. NHẬN XẾT NỔI BẬT TỪ GIÁO VIÊN CHỦ NHIỆM &amp; HỘI ĐỒNG
              </h3>
              <div className="bg-emerald-50/30 border border-emerald-100 p-3 rounded-xl text-xs font-medium text-slate-700">
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 border-b border-emerald-100 pb-1">
                  <span>Ghi nhận từ GVCN ({student.homeroomTeacherName || "Giáo viên chủ nhiệm"}):</span>
                  <span className="font-mono text-emerald-700">2025-2026</span>
                </div>
                <p className="italic leading-relaxed text-slate-700 pt-1 text-[11px]">
                  "{student.latestGvcnComment || 'Học sinh có ý thức kỷ luật tốt, hăng hái phát biểu xây dựng bài, có tinh thần giúp đỡ bạn bè và tham gia tích cực các hoạt động trải nghiệm của trường.'}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
