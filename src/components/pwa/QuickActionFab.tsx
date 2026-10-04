"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Plus,
  X,
  Eye,
  Search,
  HeartHandshake,
  CheckSquare,
  Sparkles
} from "lucide-react"

export function QuickActionFab() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs transition-opacity duration-200 md:hidden"
        />
      )}

      {/* Floating Action Menu Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-5 duration-200 md:hidden">
          <Link
            href="/teacher/du-gio"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-[#E6ECEA] active:scale-95 transition-all text-xs font-bold text-slate-700"
          >
            <span>Dự giờ & Thao giảng</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/teacher/ho-so-hoc-sinh"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-[#E6ECEA] active:scale-95 transition-all text-xs font-bold text-slate-700"
          >
            <span>Tra cứu hồ sơ học sinh</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/teacher/ho-tro-hoc-tap"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-[#E6ECEA] active:scale-95 transition-all text-xs font-bold text-slate-700"
          >
            <span>Ghi chú hỗ trợ học tập</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/teacher/tasks"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-[#E6ECEA] active:scale-95 transition-all text-xs font-bold text-slate-700"
          >
            <span>Việc cần làm hôm nay</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thao tác nhanh"
        className={`fixed bottom-20 right-4 z-50 w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-[0_6px_20px_rgba(0,161,154,0.4)] transition-all cursor-pointer active:scale-90 md:hidden ${
          isOpen ? "bg-slate-800 rotate-45" : "bg-[#00A19A] hover:bg-[#008B85]"
        }`}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </>
  )
}
