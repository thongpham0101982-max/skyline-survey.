"use client"
import { useState } from "react"
import { Users, Send, CheckCircle2, X, AlertTriangle, Info } from "lucide-react"
import { dispatchSurveyAction } from "./actions"
import Link from "next/link"

export function PublishSurveyClient({ period, classes }: any) {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")

  const toggleClass = (id: string) => {
    if (selectedClasses.includes(id)) {
      setSelectedClasses(selectedClasses.filter(c => c !== id))
    } else {
      setSelectedClasses([...selectedClasses, id])
    }
  }

  const toggleAll = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([])
    } else {
      setSelectedClasses(classes.map((c: any) => c.id))
    }
  }

  const handleDispatch = async () => {
    setShowConfirm(false)
    setLoading(true)
    setError("")
    try {
      const res = await dispatchSurveyAction(period.id, selectedClasses)
      if (res.success) {
        setResult(res)
      } else {
        setError("Co loi xay ra khi phat hanh. Vui long thu lai.")
      }
    } catch (e: any) {
      setError(e.message || "Co loi xay ra.")
    }
    setLoading(false)
  }

  const groupedClasses = classes.reduce((acc: any, cls: any) => {
    const campusName = cls.campus?.campusName || "Co so chua ro"
    if (!acc[campusName]) acc[campusName] = []
    acc[campusName].push(cls)
    return acc
  }, {})

  if (result !== null) {
    const totalForms = result.created + result.alreadyExisted
    const hasNewForms = result.created > 0
    const allExisted = result.created === 0 && result.alreadyExisted > 0
    const noParentsFound = result.studentsWithoutParents > 0

    return (
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto mt-10 space-y-6">
        <div className="text-center">
          <div className={`w-20 h-20 ${hasNewForms ? 'bg-green-100 text-green-600' : allExisted ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {hasNewForms || allExisted ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            {hasNewForms ? 'Phat hanh thanh cong!' : allExisted ? 'Da phat hanh truoc do!' : 'Khong tim thay Phu huynh!'}
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="text-2xl font-bold text-indigo-700">{result.created}</div>
            <div className="text-sm text-indigo-600 font-medium">Phieu moi tao</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-2xl font-bold text-slate-700">{result.alreadyExisted}</div>
            <div className="text-sm text-slate-500 font-medium">Đã co truoc do</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="text-2xl font-bold text-green-700">{result.totalStudents}</div>
            <div className="text-sm text-green-600 font-medium">Tong Hoc sinh</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="text-2xl font-bold text-purple-700">{result.studentsWithParents}</div>
            <div className="text-sm text-purple-600 font-medium">HS co Phu huynh</div>
          </div>
        </div>

        {allExisted && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Tat ca {result.alreadyExisted} phieu khao sat da duoc tao truoc do.</strong> Khong co phieu moi nao duoc tao them. Neu muon tao lai, hay xoa phieu cu truoc.
            </div>
          </div>
        )}

        {noParentsFound && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>{result.studentsWithoutParents} hoc sinh chua duoc gan Phu huynh.</strong> Vui long kiem tra lai muc <strong>Quan ly Tài khoản PHHS</strong> de dam bao moi HS deu co tai khoan PH lien ket.
            </div>
          </div>
        )}

        {result.totalStudents === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Khong co hoc sinh nao trong cac lop da chon!</strong> Vui long kiem tra lai danh sach lop va dam bao cac lop da co hoc sinh.
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/admin/surveys" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
            Tro ve trang quan tri
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6 relative">
      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Xac nhan Phat hanh</h3>
                <p className="text-sm text-slate-500">Hanh dong nay khong the huy</p>
              </div>
            </div>
            <p className="text-slate-600 mb-2 leading-relaxed">
              Ban co chac muon phat hanh khao sat <strong className="text-indigo-700">"{period.name}"</strong> cho <strong className="text-indigo-700">{selectedClasses.length} lop hoc</strong> da chon?
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
              He thong se tu dong tao phieu khao sat va gui toi tat ca Phu huynh trong cac lop duoc chon.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
              >
                Hủy bo
              </button>
              <button
                onClick={handleDispatch}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/30 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Xac nhan Phat hanh
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 flex items-center gap-3 font-medium">
          <X className="w-5 h-5 flex-shrink-0" />{error}
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Send className="w-5 h-5 mr-3 text-indigo-500" /> Chon doi tuong ap dung (Lop hoc)
        </h2>
        
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 font-medium">
          <div className="text-slate-600">
            Đã chon: <span className="text-indigo-600 font-bold text-lg mx-1">{selectedClasses.length}</span> / {classes.length} lop hoc
          </div>
          <button onClick={toggleAll} className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2">
            {selectedClasses.length === classes.length ? "Bo chon tat ca" : "Chon tat ca"}
          </button>
        </div>

        {Object.keys(groupedClasses).map(campus => (
          <div key={campus} className="mb-8 last:mb-0">
            <h3 className="font-semibold text-slate-700 uppercase tracking-widest text-xs mb-3 text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md inline-block max-w-max">{campus}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {groupedClasses[campus].map((c: any) => {
                const isSelected = selectedClasses.includes(c.id)
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleClass(c.id)}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${isSelected ? "border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100" : "border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50"}`}
                  >
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center mb-2">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <span className={`font-bold text-lg ${isSelected ? "text-indigo-800" : "text-slate-700"}`}>{c.className}</span>
                    <span className="text-xs text-slate-500 mt-1 flex items-center"><Users className="w-3 h-3 mr-1"/>{c._count?.students || 0} HS</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end p-2 mt-8">
        <button
          onClick={() => {
            if (selectedClasses.length === 0) {
              setError("Vui long chon it nhat 1 lop hoc!")
              return
            }
            setError("")
            setShowConfirm(true)
          }}
          disabled={loading || selectedClasses.length === 0}
          className="flex items-center px-8 py-3.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/30 hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          <Send className="w-5 h-5 mr-3" />
          {loading ? "Dang phan bo & Gan Form..." : "Phat hanh & Gan Form Khao sat"}
        </button>
      </div>
    </div>
  )
}
