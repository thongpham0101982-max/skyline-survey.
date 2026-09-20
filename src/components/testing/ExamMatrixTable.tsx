"use client"

import React from "react"
import { StatusBadge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"
import { MatrixItem, MatrixValidationResult, THINKING_LEVEL_LABELS } from "@/lib/testing/examMatrixService"

interface ExamMatrixTableProps {
  matrixName: string
  subjectName: string
  grade: string
  durationMinutes: number
  items: MatrixItem[]
  validation: MatrixValidationResult
}

export function ExamMatrixTable({
  matrixName,
  subjectName,
  grade,
  durationMinutes,
  items,
  validation
}: ExamMatrixTableProps) {
  return (
    <div className="space-y-4">
      {/* Matrix Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <div>
          <h3 className="font-bold text-slate-900 text-base">{matrixName}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Môn: <strong>{subjectName}</strong> | Khối: <strong>{grade}</strong> | Thời lượng: <strong>{durationMinutes} phút</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            status={validation.isValid ? "success" : "danger"}
            label={validation.isValid ? "Ma trận hợp lệ (10.0 điểm)" : "Chưa đạt chuẩn"}
          />
        </div>
      </div>

      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1 text-red-800">
          <div className="font-semibold flex items-center gap-1.5 text-red-900">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>Lỗi cấu hình ma trận:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-800">
          <div className="font-semibold flex items-center gap-1.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Cảnh báo số lượng câu hỏi trong thư viện:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validation.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">STT</th>
              <th className="py-2.5 px-3">Chủ đề / Mạch kiến thức</th>
              <th className="py-2.5 px-3">Mức độ tư duy</th>
              <th className="py-2.5 px-3 text-center">Số câu</th>
              <th className="py-2.5 px-3 text-right">Điểm/câu</th>
              <th className="py-2.5 px-3 text-right">Tổng điểm</th>
              <th className="py-2.5 px-3 text-center">Sẵn có / Yêu cầu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, idx) => {
              const isPoolShort = it.availableInBank < it.questionCount
              return (
                <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{it.topic}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {THINKING_LEVEL_LABELS[it.level]?.label || it.level}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-800">{it.questionCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{it.pointsPerQuestion.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {(it.questionCount * it.pointsPerQuestion).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-medium px-2 py-0.5 rounded text-[11px] ${
                        isPoolShort ? "bg-red-100 text-red-700 font-bold" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {it.availableInBank} / {it.questionCount}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
            <tr>
              <td colSpan={3} className="py-2.5 px-3 text-right uppercase">
                Tổng cộng:
              </td>
              <td className="py-2.5 px-3 text-center text-sm">{validation.totalQuestions} câu</td>
              <td className="py-2.5 px-3 text-right text-xs text-slate-500">—</td>
              <td className="py-2.5 px-3 text-right text-sm text-[#003B3A]">{validation.totalScore.toFixed(2)} đ</td>
              <td className="py-2.5 px-3 text-center">
                {validation.isValid ? (
                  <span className="text-emerald-600 flex items-center justify-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Chuẩn 10.0
                  </span>
                ) : (
                  <span className="text-red-600 text-[11px]">Chưa chuẩn</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
