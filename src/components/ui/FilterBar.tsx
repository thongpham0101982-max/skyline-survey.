"use client"

import * as React from "react"
import { Search, RotateCcw, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  children?: React.ReactNode
  onReset?: () => void
  hasActiveFilters?: boolean
  className?: string
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm nhanh...",
  children,
  onReset,
  hasActiveFilters = false,
  className
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs", className)}>
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
        {onSearchChange !== undefined && (
          <div className="w-full sm:w-64">
            <Input
              type="text"
              value={searchValue || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              prefixIcon={<Search className="size-4" />}
            />
          </div>
        )}
        {children}
      </div>

      {onReset && hasActiveFilters && (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="size-3.5" />}
            className="text-slate-500 hover:text-slate-800"
          >
            Đặt lại bộ lọc
          </Button>
        </div>
      )}
    </div>
  )
}
