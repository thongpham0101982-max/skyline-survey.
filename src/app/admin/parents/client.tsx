"use client"
import { useState, useEffect } from "react"
import { getClassStudentsWithParentsAction, generateParentAccountsAction, deleteParentAccountsAction } from "./actions"
import { Users, KeyRound, UserCheck, AlertCircle, RefreshCw, CalendarDays, Trash2, X } from "lucide-react"

export function ParentAccountsClient({ classes, years, defaultYearId }: any) {
  const [filterYearId, setFilterYearId] = useState(defaultYearId || "ALL")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  const filteredClasses = filterYearId === "ALL"
    ? classes
    : classes.filter((c: any) => c.academicYear?.id === filterYearId)

  const fetchStudents = async (cid: string) => {
    setLoading(true)
    const data = await getClassStudentsWithParentsAction(cid)
    setStudents(data)
    setSelectedStudentIds([]) // Reset selection on class change
    setLoading(false)
  }

  useEffect(() => {
    if (selectedClassId) fetchStudents(selectedClassId)
    else setStudents([])
  }, [selectedClassId])

  // Reset class selection when year changes
  useEffect(() => {
    setSelectedClassId("")
    setStudents([])
    setSelectedStudentIds([])
  }, [filterYearId])

  const handleGenerate = async () => {
    if (!selectedClassId) return
    if (!confirm("Hệ thống sẽ tự động tạo tài khoản (P_MaHS) cho học sinh chưa có tài khoản phụ huynh. Bạn chắc chắn?")) return
    setGenerating(true)
    const res = await generateParentAccountsAction(selectedClassId)
    setGenerating(false)
    if (res.success) {
      alert(`Khởi tạo thành công ${res.count} tài khoản mới cho Phụ huynh lớp này!`)
      fetchStudents(selectedClassId)
    }
  }

  const handleDeleteMany = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedStudentIds.length} tài khoản PHHS đã chọn?`)) return;
    setDeleting(true);
    const res = await deleteParentAccountsAction(selectedStudentIds);
    setDeleting(false);
    if (res.success) {
      alert("Xoá thành công!");
      fetchStudents(selectedClassId);
    } else {
      alert("Lỗi: " + (res.error || ""));
    }
  }

  const handleDeleteAllInClass = async () => {
    if (!selectedClassId) return;
    const studentIdsWithAccounts = students.filter(s => s.parents.length > 0).map(s => s.id);
    if (studentIdsWithAccounts.length === 0) {
      alert("Lớp này chưa có tài khoản nào để huỷ.");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn huỷ (xoá) TOÀN BỘ ${studentIdsWithAccounts.length} tài khoản phụ huynh trong lớp này?`)) return;
    setDeleting(true);
    const res = await deleteParentAccountsAction(studentIdsWithAccounts);
    setDeleting(false);
    if (res.success) {
      alert("Đã huỷ toàn bộ tài khoản thành công!");
      fetchStudents(selectedClassId);
    } else {
      alert("Lỗi: " + (res.error || ""));
    }
  }

  const currentYearName = years.find((y: any) => y.id === filterYearId)?.name || "Tat ca"

  return (
    <div className="space-y-6">

      {/* Year Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-700">Lọc theo Năm học:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterYearId("ALL")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filterYearId === "ALL" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
            >
              Tất cả (${classes.length} lớp)
            </button>
            {years.map((y: any) => (
              <button key={y.id}
                onClick={() => setFilterYearId(y.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filterYearId === y.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
              >
                {y.name}{y.status === "ACTIVE" && " *"}
                (${classes.filter((c: any) => c.academicYear?.id === y.id).length} lớp)
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex-1 w-full md:max-w-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Chọn Lớp học</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 font-medium text-slate-800 bg-slate-50 outline-none"
            >
              <option value="">-- Click để chọn Lớp (${filteredClasses.length} lớp) --</option>
              {filteredClasses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.className} - {c.academicYear?.name || "?"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-6">
            {selectedStudentIds.length > 0 && (
              <button onClick={handleDeleteMany} disabled={deleting}
                 className="flex items-center text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-semibold py-3.5 px-5 rounded-xl border border-red-200 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                 <Trash2 className="w-5 h-5 mr-2" /> {deleting ? "Đang xoá..." : `Xoá ${selectedStudentIds.length} tài khoản`}
              </button>
            )}

            {selectedClassId && students.some(s => s.parents.length > 0) && (
              <button 
                onClick={handleDeleteAllInClass} 
                disabled={deleting || loading}
                className="flex items-center text-red-600 hover:text-red-700 bg-white hover:bg-red-50 font-semibold py-3.5 px-5 rounded-xl border-2 border-red-200 transition shadow-sm disabled:opacity-50"
              >
                <X className="w-5 h-5 mr-2" /> Hủy tạo tài khoản
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={!selectedClassId || generating || loading}
              className="flex items-center justify-center px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <KeyRound className="w-5 h-5 mr-2" />}
              Khởi tạo Tài khoản tự động
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded text-indigo-600"
                    checked={students.length > 0 && selectedStudentIds.length === students.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedStudentIds(students.map(s => s.id));
                      else setSelectedStudentIds([]);
                    }}
                  />
                </th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm">STT</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm">Mã HS</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm">Họ và Tên HS</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm opacity-50">Ngày sinh</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm text-center">Tài khoản PHHS</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm text-center">Mật khẩu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!selectedClassId && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium bg-white">
                  Vui lòng chọn 1 lớp học ở ô phía trên để tải danh sách.
                </td></tr>
              )}
              {loading && selectedClassId && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-indigo-500 font-bold bg-white animate-pulse">Đang nạp dữ liệu...</td></tr>
              )}
              {!loading && selectedClassId && students.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 bg-white">Lớp này chưa có học sinh nào.</td></tr>
              )}
              {!loading && students.map((s, idx) => {
                const parentLink = s.parents[0]
                const user = parentLink?.parent?.user
                const hasAccount = !!user
                return (
                  <tr key={s.id} className={"hover:bg-slate-50/70 bg-white transition-colors " + (selectedStudentIds.includes(s.id) ? "bg-indigo-50/30" : "")}>
                    <td className="px-6 py-4 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded text-indigo-600"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id])
                          else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id))
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4 text-indigo-700 font-extrabold">{s.studentCode}</td>
                    <td className="px-6 py-4 text-slate-800 font-bold">{s.studentName}</td>
                    <td className="px-6 py-4 text-slate-500 opacity-50">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "---"}</td>
                    <td className="px-6 py-4 text-center">
                      {hasAccount ? (
                        <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold shadow-sm">
                          <UserCheck className="w-4 h-4" /><span>{user.email}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-amber-500 font-semibold bg-amber-50 px-3 py-1 rounded-full text-xs border border-amber-100">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />Chưa khởi tạo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-semibold text-slate-600 bg-slate-50/50">
                      {hasAccount ? <span className="tracking-widest">********</span> : <span className="opacity-30">---</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {students.length > 0 && !loading && (
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-sm text-indigo-800 font-medium flex items-start">
              <KeyRound className="w-5 h-5 mr-2 shrink-0 mt-0.5 opacity-70" />
              <span><b>Quy tắc:</b> Mật khẩu mặc định = Mã Học Sinh. Phụ huynh đăng nhập bằng Tài khoản (cột xanh) và Password = mã học sinh.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}