
"use client"
import { useState } from "react"
import { ArrowRightLeft, ArrowRightToLine, ArrowLeftToLine, Search, Plus } from "lucide-react"

export function StudentTransfersClient() {
  const [activeTab, setActiveTab] = useState<"OUT" | "IN" | "CHANGE_CLASS">("OUT")

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-100 p-2 flex gap-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("OUT")}
          className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
            activeTab === "OUT"
              ? "bg-rose-50 text-rose-600 border-b-4 border-rose-500 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <ArrowRightToLine className="w-5 h-5 mr-3" />
          Chuyển đi
        </button>
        <button
          onClick={() => setActiveTab("IN")}
          className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
            activeTab === "IN"
              ? "bg-emerald-50 text-emerald-600 border-b-4 border-emerald-500 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <ArrowLeftToLine className="w-5 h-5 mr-3" />
          Chuyển đến
        </button>
        <button
          onClick={() => setActiveTab("CHANGE_CLASS")}
          className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
            activeTab === "CHANGE_CLASS"
              ? "bg-indigo-50 text-indigo-600 border-b-4 border-indigo-500 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <ArrowRightLeft className="w-5 h-5 mr-3" />
          Chuyển lớp
        </button>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
           <div className="relative w-72">
             <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Tìm kiếm học sinh..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-medium outline-none transition-all" />
           </div>
           <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center shadow-lg shadow-indigo-100">
             <Plus className="w-5 h-5 mr-2" /> Tạo phiếu lưu chuyển
           </button>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-16 text-center">
           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
             <ArrowRightLeft className="w-8 h-8 text-slate-300" />
           </div>
           <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có dữ liệu lưu chuyển</h3>
           <p className="text-slate-500 font-medium">Tính năng này đang trong quá trình phát triển để liên kết với hệ thống nhân sự.</p>
        </div>
      </div>
    </div>
  )
}
