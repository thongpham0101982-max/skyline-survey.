const fs = require("fs");

const parentClient = `"use client"
import { useState, useEffect } from "react"
import { getClassStudentsWithParentsAction, generateParentAccountsAction } from "./actions"
import { Users, KeyRound, UserCheck, AlertCircle, RefreshCw, CalendarDays } from "lucide-react"

export function ParentAccountsClient({ classes, years, defaultYearId }) {
  const [filterYearId, setFilterYearId] = useState(defaultYearId || "ALL")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const filteredClasses = filterYearId === "ALL"
    ? classes
    : classes.filter(c => c.academicYear?.id === filterYearId)

  const fetchStudents = async (cid) => {
    setLoading(true)
    const data = await getClassStudentsWithParentsAction(cid)
    setStudents(data)
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
  }, [filterYearId])

  const handleGenerate = async () => {
    if (!selectedClassId) return
    if (!confirm("He thong se tu dong tao tai khoan (PH_Ma HS) cho hoc sinh chua co tai khoan phu huynh. Ban chac chan?")) return
    setGenerating(true)
    const res = await generateParentAccountsAction(selectedClassId)
    setGenerating(false)
    if (res.success) {
      alert(\`Khoi tao thanh cong \${res.count} tai khoan moi cho Phu huynh lop nay!\`)
      fetchStudents(selectedClassId)
    }
  }

  const currentYearName = years.find(y => y.id === filterYearId)?.name || "Tat ca"

  return (
    <div className="space-y-6">

      {/* Year Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-700">Loc theo Nam hoc:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterYearId("ALL")}
              className={\`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all \${filterYearId === "ALL" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}\`}
            >
              Tat ca ({classes.length} lop)
            </button>
            {years.map(y => (
              <button key={y.id}
                onClick={() => setFilterYearId(y.id)}
                className={\`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all \${filterYearId === y.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}\`}
              >
                {y.name}{y.status === "ACTIVE" && " *"}
                ({classes.filter(c => c.academicYear?.id === y.id).length} lop)
              </button>
            ))}
          </div>
        </div>
        {filterYearId !== "ALL" && (
          <p className="text-xs text-indigo-600 font-medium mt-2 pl-6">
            Hien thi {filteredClasses.length} lop thuoc nam hoc {currentYearName}
          </p>
        )}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex-1 w-full md:max-w-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Chon Lop hoc</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 font-medium text-slate-800 bg-slate-50 outline-none"
            >
              <option value="">-- Click de chon Lop ({filteredClasses.length} lop) --</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} - {c.academicYear?.name || "?"}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedClassId || generating || loading}
            className="flex items-center justify-center px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4 md:mt-6"
          >
            {generating ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <KeyRound className="w-5 h-5 mr-2" />}
            Khoi tao Tai khoan tu dong
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm">STT</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm">Ma HS</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm">Ho va Ten HS</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm">Ngay sinh</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm text-center">Tai khoan PHHS</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-sm text-center">Mat khau</th>
              </tr>
            </thead>
            <tbody>
              {!selectedClassId && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium bg-white">
                  Vui long chon 1 lop hoc o o phia tren de tai danh sach.
                </td></tr>
              )}
              {loading && selectedClassId && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-indigo-500 font-bold bg-white animate-pulse">Dang nap du lieu...</td></tr>
              )}
              {!loading && selectedClassId && students.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 bg-white">Lop nay chua co hoc sinh nao.</td></tr>
              )}
              {!loading && students.map((s, idx) => {
                const parentLink = s.parents[0]
                const user = parentLink?.parent?.user
                const hasAccount = !!user
                return (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 bg-white">
                    <td className="px-6 py-4 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4 text-indigo-700 font-extrabold">{s.studentCode}</td>
                    <td className="px-6 py-4 text-slate-800 font-bold">{s.studentName}</td>
                    <td className="px-6 py-4 text-slate-500">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "---"}</td>
                    <td className="px-6 py-4 text-center">
                      {hasAccount ? (
                        <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold shadow-sm">
                          <UserCheck className="w-4 h-4" /><span>{user.email}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-amber-500 font-semibold bg-amber-50 px-3 py-1 rounded-full text-xs border border-amber-100">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />Chua khoi tao
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
              <span><b>Quy tac:</b> Mat khau mac dinh = Ma Hoc Sinh. Phu huynh dang nhap bang Tai khoan (cot xanh) va Password = ma hoc sinh.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
`;

fs.writeFileSync("src/app/admin/parents/client.tsx", parentClient, "utf8");
console.log("parents/client.tsx updated OK");
