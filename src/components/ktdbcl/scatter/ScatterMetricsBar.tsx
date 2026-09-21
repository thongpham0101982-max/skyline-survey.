// @ts-nocheck
"use client"

import React from "react"
import {
  Users,
  Award,
  TrendingUp,
  Activity,
  AlertTriangle,
  Sparkles,
  Percent,
  CheckCircle2,
  HelpCircle
} from "lucide-react"

interface Props {
  metrics: any
  benchmarks: any
  meta: any
}

export function ScatterMetricsBar({ metrics, benchmarks, meta }: Props) {
  if (!metrics) return null

  const {
    n,
    meanX,
    meanY,
    stdDevX,
    stdDevY,
    cvX,
    cvY,
    pearsonR,
    rSquared,
    passRateY,
    atRiskCount,
    outlierCount,
    regressionEquation
  } = metrics

  const deltaMean = Math.round((meanY - meanX) * 10) / 10
  const isGrowing = deltaMean >= 0

  // Đánh giá mức độ phân tán sư phạm
  const dispersionLabel = cvY < 15 ? "Chất lượng rất đồng đều" : cvY <= 25 ? "Phân hóa trung bình" : "Phân hóa rất mạnh"
  const dispersionColor = cvY < 15 ? "text-emerald-700 bg-emerald-50" : cvY <= 25 ? "text-sky-700 bg-sky-50" : "text-amber-700 bg-amber-50"

  // Đánh giá tương quan Pearson
  const correlationLabel = pearsonR >= 0.7 ? "Tương quan mạnh" : pearsonR >= 0.4 ? "Tương quan trung bình" : "Phân tán rời rạc"
  const correlationColor = pearsonR >= 0.7 ? "text-emerald-700" : pearsonR >= 0.4 ? "text-sky-700" : "text-rose-700"

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Sỹ số ma trận N */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Sỹ số Khảo sát</span>
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#005B58] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-800">{n}</span>
          <span className="text-[11px] font-bold text-slate-400">học sinh</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1 truncate">
          Có đủ dữ liệu tọa độ (X, Y)
        </div>
      </div>

      {/* 2. Điểm TB Trọng tâm & Delta */}
      <div className="bg-white p-3.5 rounded-2xl border border-teal-200 shadow-sm bg-gradient-to-br from-white to-teal-50/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-teal-800">Điểm TB Hiện tại (Y)</span>
          <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-teal-900">{meanY}</span>
          <span className="text-[11px] font-bold text-teal-700">/10đ</span>
          <span className={`text-[11px] font-extrabold ml-auto ${isGrowing ? "text-emerald-600" : "text-rose-600"}`}>
            {isGrowing ? `+${deltaMean}` : deltaMean}đ
          </span>
        </div>
        <div className="text-[10px] text-teal-700/80 mt-1">
          Gốc (X): <strong>{meanX}đ</strong>
        </div>
      </div>

      {/* 3. Độ biến thiên CV% & Độ lệch chuẩn */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Độ biến thiên (CV%)</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-indigo-900">{cvY}%</span>
          <span className="text-[11px] text-slate-500 font-medium">(σ = {stdDevY})</span>
        </div>
        <div className="mt-1">
          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${dispersionColor}`}>
            {dispersionLabel}
          </span>
        </div>
      </div>

      {/* 4. Tương quan Pearson r & Hồi quy */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Tương quan Pearson (r)</span>
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={`text-2xl font-black ${correlationColor}`}>{pearsonR}</span>
          <span className="text-[10px] text-slate-400 font-mono">(R²: {rSquared})</span>
        </div>
        <div className="text-[10px] font-bold mt-1 truncate" title={regressionEquation}>
          {correlationLabel}
        </div>
      </div>

      {/* 5. Tỷ lệ Đạt Chuẩn Sky-Line */}
      <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-800">Đạt Chuẩn Sky-Line</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-emerald-700">{passRateY}%</span>
          <span className="text-[10px] font-bold text-emerald-600">(≥ {benchmarks?.benchY || 6.0}đ)</span>
        </div>
        <div className="text-[10px] text-emerald-700/80 mt-1">
          Kỳ trước đạt: {metrics.passRateX}%
        </div>
      </div>

      {/* 6. Cảnh báo Nguy cơ & Điểm Ngoại lai */}
      <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-rose-700">Nguy cơ & Ngoại lai</span>
          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-rose-700">{atRiskCount}</span>
          <span className="text-[10px] font-bold text-rose-600">dưới 5đ</span>
          <span className="text-[10px] font-extrabold text-amber-700 ml-auto" title="Học sinh có điểm biến động bất thường (|Z| >= 2.0)">
            {outlierCount} ngoại lai
          </span>
        </div>
        <div className="text-[10px] text-rose-700/80 mt-1 font-medium">
          Cần can thiệp sư phạm khẩn
        </div>
      </div>
    </div>
  )
}
