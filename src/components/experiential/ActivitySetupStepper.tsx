"use client"

import React from "react"
import { Check } from "lucide-react"

export interface ActivitySetupStepperProps {
  currentStep: number // 1 to 5
  onStepClick?: (step: number) => void
  steps?: string[]
}

const DEFAULT_STEPS = [
  "1. Thông tin hoạt động",
  "2. Tiêu chí đánh giá",
  "3. Đối tượng tham gia",
  "4. Phân công người đánh giá",
  "5. Xác nhận & Phát hành"
]

export function ActivitySetupStepper({
  currentStep,
  onStepClick,
  steps = DEFAULT_STEPS
}: ActivitySetupStepperProps) {
  return (
    <div className="flex items-center justify-between w-full py-4 border-b border-slate-200/80 bg-white">
      {steps.map((label, idx) => {
        const stepNum = idx + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep

        return (
          <div
            key={label}
            onClick={() => isCompleted && onStepClick && onStepClick(stepNum)}
            className={`flex items-center gap-2 cursor-pointer transition-all ${
              isActive
                ? "text-[#003B3A] font-black"
                : isCompleted
                ? "text-slate-600 hover:text-slate-900 font-bold"
                : "text-slate-400 font-medium cursor-not-allowed"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                isCompleted
                  ? "bg-emerald-600 text-white"
                  : isActive
                  ? "bg-[#003B3A] text-white shadow-xs scale-105"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
            </div>
            <span className="hidden sm:inline text-xs">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
