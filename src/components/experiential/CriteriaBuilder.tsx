"use client"

import React from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActivityCriteriaDefinition } from "@/lib/experiential/activityEvaluationService"

export interface CriteriaBuilderProps {
  criteria: ActivityCriteriaDefinition[]
  onChange: (newList: ActivityCriteriaDefinition[]) => void
  maxCriteria?: number
  disabled?: boolean
}

export function CriteriaBuilder({
  criteria,
  onChange,
  maxCriteria = 5,
  disabled = false
}: CriteriaBuilderProps) {
  const handleAdd = () => {
    if (criteria.length >= maxCriteria) return
    const newIdx = criteria.length + 1
    const newCriteria: ActivityCriteriaDefinition = {
      id: `crit-${Date.now()}`,
      code: `TC${newIdx}`,
      name: `Tiêu chí ${newIdx}`,
      description: "",
      isRequired: true,
      sortOrder: newIdx
    }
    onChange([...criteria, newCriteria])
  }

  const handleRemove = (id: string) => {
    onChange(criteria.filter((c) => c.id !== id))
  }

  const handleUpdate = (id: string, field: keyof ActivityCriteriaDefinition, value: any) => {
    onChange(
      criteria.map((c) => {
        if (c.id === id) {
          return { ...c, [field]: value }
        }
        return c
      })
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">
          Cấu hình 3 đến 5 tiêu chí đánh giá cốt lõi cho hoạt động:
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || criteria.length >= maxCriteria}
          onClick={handleAdd}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Thêm tiêu chí ({criteria.length}/{maxCriteria})
        </Button>
      </div>

      <div className="space-y-2">
        {criteria.map((c, idx) => (
          <div
            key={c.id}
            className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-3"
          >
            <span className="w-6 text-center font-bold text-slate-400 text-xs">{idx + 1}</span>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <input
                type="text"
                disabled={disabled}
                value={c.name}
                onChange={(e) => handleUpdate(c.id, "name", e.target.value)}
                placeholder="Tên tiêu chí (VD: Tinh thần hợp tác)"
                className="p-2 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
              />
              <input
                type="text"
                disabled={disabled}
                value={c.description || ""}
                onChange={(e) => handleUpdate(c.id, "description", e.target.value)}
                placeholder="Mô tả biểu hiện đạt tiêu chuẩn..."
                className="sm:col-span-2 p-2 border border-slate-300 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
              />
            </div>

            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer shrink-0">
              <input
                type="checkbox"
                disabled={disabled}
                checked={c.isRequired}
                onChange={(e) => handleUpdate(c.id, "isRequired", e.target.checked)}
                className="rounded border-slate-300 text-[#003B3A] focus:ring-[#003B3A]"
              />
              <span>Bắt buộc</span>
            </label>

            <button
              type="button"
              disabled={disabled || criteria.length <= 1}
              onClick={() => handleRemove(c.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 cursor-pointer"
              title="Xóa tiêu chí"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
