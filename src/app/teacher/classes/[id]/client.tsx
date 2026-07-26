"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Users, Info, TrendingUp, Camera, Loader2, User, 
  ArrowLeftRight, LogOut, CheckCircle2,
  UserCheck
} from "lucide-react"
import { 
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend 
} from "recharts"

export function ClassDetailClient({
  classId,
  classInfo,
  isGVCNOfThisClass,
  totalStudents,
  completionRate,
  averageSatisfaction,
  nps,
  forms,
  monthlyHeadcount,
  studentMovements
}: {
  classId: string
  classInfo: any
  isGVCNOfThisClass: boolean
  totalStudents: number
  completionRate: number
  averageSatisfaction: number
  nps: number
  forms: any[]
  monthlyHeadcount: any[]
  studentMovements: any[]
}) {
  // States for student photos
  const [uploadingStudentId, setUploadingStudentId] = useState<string | null>(null)
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({})

  // Vietnamese alphabetical sorting logic
  const getVietnameseSortKey = (fullName: string) => {
    if (!fullName) return ""
    const parts = fullName.trim().split(/\s+/)
    const firstName = parts[parts.length - 1] || ""
    const rest = parts.slice(0, parts.length - 1).join(" ")
    return `${firstName.toLowerCase()} | ${rest.toLowerCase()}`
  }

  const sortedStudents = useMemo(() => {
    if (!classInfo.students) return []
    return [...classInfo.students].sort((a, b) => {
      const keyA = getVietnameseSortKey(a.studentName || "")
      const keyB = getVietnameseSortKey(b.studentName || "")
      return keyA.localeCompare(keyB, "vi-VN")
    })
  }, [classInfo.students])

  // Photo upload handler
  const handleUploadPhoto = async (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Chỉ chấp nhận các file ảnh!")
      return
    }

    try {
      setUploadingStudentId(studentId)
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/teacher-student-records?action=uploadAvatar&studentId=${studentId}`, {
        method: "POST",
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          // Clear broken cache for this student
          setBrokenAvatars(prev => ({ ...prev, [studentId]: false }))
          // Update avatar URL with a bust parameter
          setAvatars(prev => ({
            ...prev,
            [studentId]: `/uploads/students/${studentId}.jpg?t=${Date.now()}`
          }))
        } else {
          alert("Lỗi tải ảnh lên: " + (data.error || "Không rõ nguyên nhân"))
        }
      } else {
        alert("Lỗi tải ảnh lên: HTTP " + res.status)
      }
    } catch (err) {
      console.error("Error uploading student avatar:", err)
      alert("Đã xảy ra lỗi trong quá trình tải ảnh!")
    } finally {
      setUploadingStudentId(null)
    }
  }

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "---"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "---"
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Gender translate helper
  const translateGender = (g: string | null) => {
    if (!g) return "Chưa rõ"
    const lower = g.toLowerCase()
    if (lower === "male" || lower === "nam") return "Nam"
    if (lower === "female" || lower === "nữ" || lower === "nu") return "Nữ"
    return g
  }

  return (
    <div className="space-y-6">
      {/* Back link and Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2">
            <Link href="/teacher/classes" className="text-xs font-bold text-[#00A99D] hover:underline">
              &larr; Quay lại danh sách lớp
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{classInfo.className}</h1>
          <p className="text-slate-500 mt-1 text-xs">
            Mã lớp: <span className="font-bold text-[#00A99D]">{classInfo.classCode}</span> • Cơ sở: <span className="font-bold text-slate-700">{classInfo.campus?.campusName}</span> • Năm học: <span className="font-bold text-slate-700">{classInfo.academicYear?.name}</span>
          </p>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-blue-100 flex flex-col justify-between">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tổng số Học sinh</h3>
           <div className="text-3xl font-black text-slate-800">{totalStudents}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-amber-100 flex flex-col justify-between">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tỷ lệ Hoàn thành Khảo sát</h3>
           <div className="text-3xl font-black text-slate-800">{completionRate > 100 ? 100 : completionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-indigo-100 flex flex-col justify-between">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Hài lòng Trung bình</h3>
           <div className="text-3xl font-black text-slate-800">{averageSatisfaction.toFixed(1)} / 5.0</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-emerald-100 flex flex-col justify-between">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Chỉ số NPS</h3>
           <div className="text-3xl font-black text-slate-800">{nps}</div>
        </div>
      </div>

      {/* RENDER VIEW BASED ON GVCN ROLE (NO TABS) */}
      {!isGVCNOfThisClass ? (
        /* SURVEY RESULTS VIEW FOR SUBJECT TEACHERS */
        <div className="bg-white rounded-xl shadow-sm border-2 border-violet-100 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Trạng thái Khảo sát theo Học sinh</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-slate-600 text-xs font-semibold bg-slate-50/50">
                <tr>
                  <th className="p-3 font-semibold rounded-tl-lg border border-slate-200">Mã Học sinh</th>
                  <th className="p-3 font-semibold border border-slate-200">Họ và Tên</th>
                  <th className="p-3 font-semibold border border-slate-200">Số TK Phụ huynh</th>
                  <th className="p-3 font-semibold rounded-tr-lg border border-slate-200">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-500 border border-slate-200 text-xs font-semibold">
                      Chưa có học sinh nào trong lớp.
                    </td>
                  </tr>
                ) : (
                  sortedStudents.map((student) => {
                    const studentForms = forms.filter(f => f.studentId === student.id)
                    const hasSubmitted = studentForms.some(f => f.status === "SUBMITTED" || f.status === "ĐÃ HOÀN THÀNH")
                    
                    return (
                      <tr key={student.id} className="last:border-b-0 hover:bg-slate-50 transition-colors text-xs font-semibold">
                        <td className="p-3 font-medium text-slate-900 border border-slate-200">{student.studentCode}</td>
                        <td className="p-3 font-medium text-slate-700 border border-slate-200">{student.studentName}</td>
                        <td className="p-3 border border-slate-200 text-slate-500">{student.parents.length} tài khoản</td>
                        <td className="p-3 border border-slate-200">
                          {hasSubmitted ? (
                            <Link 
                              href={`/teacher/classes/${classId}/${studentForms.find(f => f.status === "SUBMITTED" || f.status === "ĐÃ HOÀN THÀNH")?.id}`} 
                              className="inline-block text-[#00A99D] hover:bg-teal-50 px-2.5 py-1 rounded border border-teal-200/50 text-xs font-bold tracking-wide transition-colors cursor-pointer"
                            >
                              ĐÃ HOÀN THÀNH (XEM)
                            </Link>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded text-xs font-bold tracking-wide">
                              CHƯA KHẢO SÁT
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* HOMEROOM VIEW FOR GVCN */
        <div className="space-y-8">
          {/* SECTION: CHART AND TIMELINE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart: Sỹ số theo Tháng */}
            <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6 shadow-sm flex flex-col justify-between lg:col-span-2">
              <div>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                  <div className="w-8 h-8 text-indigo-600 flex items-center justify-center bg-indigo-50 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Theo dõi Sỹ số theo Tháng</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Biến động sỹ số trong suốt năm học</p>
                  </div>
                </div>
                
                <div className="h-64 w-full pr-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyHeadcount} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dx={-5} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgb(0 0 0 / 0.05)', fontSize: '11px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                      />
                      <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="count" stroke="#00A99D" strokeWidth={3} activeDot={{ r: 6 }} name="Sỹ số lớp" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Timeline: Lịch sử biến động sỹ số */}
            <div className="bg-white rounded-2xl border-2 border-emerald-100 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                  <div className="w-8 h-8 text-emerald-600 flex items-center justify-center bg-emerald-50 rounded-lg">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Biến động Học sinh</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Nhập học, chuyển lớp, chuyển trường</p>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-64 pr-1 space-y-4">
                  {studentMovements.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      Chưa ghi nhận biến động nào trong năm học này.
                    </div>
                  ) : (
                    studentMovements.map((item) => {
                      let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      let typeLabel = "Nhập học mới"
                      let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-100"

                      if (item.type === "OUT") {
                        icon = <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        typeLabel = "Chuyển đi"
                        colorClass = "bg-rose-50 text-rose-700 border-rose-100"
                      } else if (item.type === "CHANGE_CLASS") {
                        icon = <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500" />
                        typeLabel = "Chuyển lớp"
                        colorClass = "bg-amber-50 text-amber-700 border-amber-100"
                      }

                      return (
                        <div key={item.id} className="flex items-start gap-2.5 text-xs font-semibold">
                          <div className="mt-0.5 flex-shrink-0">{icon}</div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}>
                                {typeLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">{formatDate(item.transferDate)}</span>
                            </div>
                            <p className="text-slate-700 font-bold leading-tight">
                              {item.studentName} <span className="text-slate-400 font-semibold">({item.studentCode})</span>
                            </p>
                            {item.type === "OUT" && (
                              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                                Đến: <span className="font-bold">{item.destinationSchool || "Chưa rõ"}</span>
                                {item.reason && ` • Lý do: ${item.reason}`}
                              </p>
                            )}
                            {item.type === "CHANGE_CLASS" && (
                              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                                {item.reason && `Lý do: ${item.reason}`}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: STUDENT LIST TABLE WITH PHOTO UPDATES */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-slate-150 p-6 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#00A99D]/15 rounded flex items-center justify-center text-[#00A99D]">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Hồ sơ Học sinh Lớp chủ nhiệm</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 border border-slate-200 px-2 py-1 rounded-md self-start sm:self-auto">
                Chuẩn Alphabet Tiếng Việt
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-slate-600 text-xs font-semibold bg-slate-50/50">
                  <tr>
                    <th className="p-3 font-semibold rounded-tl-lg border border-slate-200 w-20 text-center">Ảnh</th>
                    <th className="p-3 font-semibold border border-slate-200">Mã Học sinh</th>
                    <th className="p-3 font-semibold border border-slate-200">Họ và Tên</th>
                    <th className="p-3 font-semibold border border-slate-200">Ngày sinh</th>
                    <th className="p-3 font-semibold border border-slate-200">Giới tính</th>
                    <th className="p-3 font-semibold rounded-tr-lg border border-slate-200">Trạng thái / Biến động</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student) => {
                    const studentAvatar = avatars[student.id] || `/uploads/students/${student.id}.jpg?t=${Date.now()}`
                    const isBroken = brokenAvatars[student.id]
                    const isUploading = uploadingStudentId === student.id
                    
                    // Determine if student has any transfer status
                    const transfers = student.studentTransfers || []
                    const lastTransfer = transfers[transfers.length - 1]
                    
                    let statusText = "Đang học"
                    let statusColor = "bg-teal-50 text-teal-700 border-teal-100"
                    
                    if (student.status === "TRANSFERRED_OUT") {
                      statusText = "Đã chuyển trường"
                      statusColor = "bg-rose-50 text-rose-700 border-rose-100"
                      if (lastTransfer && lastTransfer.type === "OUT") {
                        statusText = `Đã chuyển trường (${formatDate(lastTransfer.transferDate)})`
                      }
                    } else if (student.status === "ACTIVE" && lastTransfer) {
                      if (lastTransfer.type === "IN") {
                        statusText = `Nhập học mới (${formatDate(lastTransfer.transferDate)})`
                        statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100"
                      } else if (lastTransfer.type === "CHANGE_CLASS") {
                        statusText = `Nhập học/Chuyển lớp (${formatDate(lastTransfer.transferDate)})`
                        statusColor = "bg-amber-50 text-amber-700 border-amber-100"
                      }
                    }

                    return (
                      <tr key={student.id} className="last:border-b-0 hover:bg-slate-50 transition-colors text-xs font-semibold">
                        {/* Interactive Avatar Image Upload */}
                        <td className="p-3 border border-slate-200 text-center">
                          <div className="w-11 h-11 rounded-full border border-slate-200 object-cover shadow-sm bg-slate-100 flex items-center justify-center relative group overflow-hidden mx-auto">
                            {isUploading ? (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              </div>
                            ) : (
                              <>
                                {!isBroken ? (
                                  <img 
                                    src={studentAvatar} 
                                    alt={student.studentName} 
                                    className="w-full h-full object-cover" 
                                    onError={() => setBrokenAvatars(prev => ({ ...prev, [student.id]: true }))} 
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400" />
                                )}
                                
                                <label 
                                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-300"
                                  htmlFor={`avatar-input-${student.id}`}
                                >
                                  <Camera className="w-4 h-4 text-white" />
                                </label>
                                <input
                                  type="file"
                                  id={`avatar-input-${student.id}`}
                                  accept="image/*"
                                  onChange={(e) => handleUploadPhoto(student.id, e)}
                                  className="hidden"
                                  disabled={isUploading}
                                />
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-medium text-slate-900 border border-slate-200">{student.studentCode}</td>
                        <td className="p-3 font-medium text-slate-700 border border-slate-200">{student.studentName}</td>
                        <td className="p-3 border border-slate-200 text-slate-500">{formatDate(student.dateOfBirth)}</td>
                        <td className="p-3 border border-slate-200">
                          <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${
                            translateGender(student.gender) === "Nam" 
                              ? "bg-sky-50 text-sky-700 border-sky-100" 
                              : translateGender(student.gender) === "Nữ"
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : "bg-slate-50 text-slate-700 border-slate-100"
                          }`}>
                            {translateGender(student.gender)}
                          </span>
                        </td>
                        <td className="p-3 border border-slate-200">
                          <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${statusColor}`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
