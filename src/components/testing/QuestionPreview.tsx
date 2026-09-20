"use client"

import React from "react"
import { StatusBadge } from "@/components/ui/badge"
import { DetailDrawer } from "@/components/ui/drawer"
import { HelpCircle, BookOpen, User, Calendar, CheckCircle2, XCircle, Tag, Layers } from "lucide-react"

export interface QuestionDetail {
  id: string
  code: string
  subjectName: string
  grade: string
  topic: string
  levelLabel: string
  questionType: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE" | "MATCHING"
  content: string
  options?: { key: string; text: string; isCorrect: boolean }[]
  explanation?: string
  authorName: string
  status: "DRAFT" | "PENDING" | "APPROVED" | "IN_USE" | "ARCHIVED"
  usedInExams?: string[]
  updatedAt: string
}

interface QuestionPreviewProps {
  question: QuestionDetail | null
  isOpen: boolean
  onClose: () => void
}

export function QuestionPreview({ question, isOpen, onClose }: QuestionPreviewProps) {
  if (!question) return null

  const statusVariantMap: Record<string, "neutral" | "warning" | "success" | "info"> = {
    DRAFT: "neutral",
    PENDING: "warning",
    APPROVED: "success",
    IN_USE: "info",
    ARCHIVED: "neutral"
  }

  const statusLabelMap: Record<string, string> = {
    DRAFT: "Bản nháp",
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    IN_USE: "Đang sử dụng",
    ARCHIVED: "Lưu trữ"
  }

  return (
    <DetailDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={`Chi tiết câu hỏi: ${question.code}`}
      description={`${question.subjectName} - Khối ${question.grade} | Mức độ: ${question.levelLabel}`}
    >
      <div className="space-y-6 text-sm">
        {/* Metadata Header */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <StatusBadge
            status={statusVariantMap[question.status] || "neutral"}
            label={statusLabelMap[question.status] || question.status}
          />
          <span className="flex items-center gap-1 text-xs text-slate-600 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Chủ đề: <strong>{question.topic}</strong></span>
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-600 font-medium ml-auto">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Tác giả: {question.authorName}</span>
          </span>
        </div>

        {/* Nội dung câu hỏi */}
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#003B3A]" />
            <span>Nội dung câu hỏi</span>
          </h4>
          <div className="p-4 bg-white border border-slate-200 rounded-lg text-slate-800 leading-relaxed font-serif text-base shadow-2xs whitespace-pre-wrap">
            {question.content}
          </div>
        </div>

        {/* Đáp án lựa chọn */}
        {question.options && question.options.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#003B3A]" />
              <span>Phương án trả lời</span>
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {question.options.map((opt) => (
                <div
                  key={opt.key}
                  className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                    opt.isCorrect
                      ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium"
                      : "bg-slate-50/50 border-slate-200 text-slate-700"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    opt.isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {opt.key}
                  </div>
                  <div className="flex-1 pt-0.5">{opt.text}</div>
                  {opt.isCorrect && (
                    <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đáp án đúng</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lời giải chi tiết */}
        {question.explanation && (
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Hướng dẫn giải / Đáp án biểu điểm:</h4>
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed whitespace-pre-wrap">
              {question.explanation}
            </div>
          </div>
        )}

        {/* Lịch sử sử dụng */}
        {question.usedInExams && question.usedInExams.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Đã sử dụng trong các đề thi:</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {question.usedInExams.map((ex, i) => (
                <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border border-slate-200 font-mono">
                  {ex}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </DetailDrawer>
  )
}
