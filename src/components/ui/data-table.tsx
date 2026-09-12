"use client"

import * as React from "react";
import { useState, useMemo } from "react"
import { Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ColumnDef<T> {
  header: string
  accessorKey?: keyof T
  cell?: (row: T, index: number) => React.ReactNode
  className?: string
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  searchKey?: keyof T
  searchPlaceholder?: string
  pageSize?: number
  headerRightActions?: React.ReactNode
  isLoading?: boolean
  emptyMessage?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Tìm kiếm...",
  pageSize = 10,
  headerRightActions,
  isLoading,
  emptyMessage = "Không tìm thấy dữ liệu nào",
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Filter by searchKey if provided
  const filteredData = useMemo(() => {
    if (!searchKey || !searchQuery.trim()) return data
    const q = searchQuery.toLowerCase().trim()
    return data.filter((item) => {
      const val = item[searchKey]
      return val ? String(val).toLowerCase().includes(q) : false
    })
  }, [data, searchKey, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      {(searchKey || headerRightActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          {searchKey ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:bg-white focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/15 transition-all"
              />
            </div>
          ) : <div />}

          {headerRightActions && <div className="flex items-center gap-2 flex-wrap">{headerRightActions}</div>}
        </div>
      )}

      {/* Table Surface */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={cn(
                      "px-4 py-3 font-extrabold uppercase tracking-wider text-slate-500 text-[11px] whitespace-nowrap",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400 font-semibold">
                    <div className="inline-block w-6 h-6 border-2 border-[#48BFE3] border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-500">{emptyMessage}</p>
                    {searchQuery && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Thử điều chỉnh từ khóa tìm kiếm: "{searchQuery}"
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={cn("px-4 py-3 text-slate-700 font-medium", col.className)}>
                        {col.cell ? col.cell(row, (currentPage - 1) * pageSize + rowIdx) : row[col.accessorKey as string]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredData.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[11px] font-semibold text-slate-500">
              Hiển thị <strong>{Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)}</strong> -{" "}
              <strong>{Math.min(filteredData.length, currentPage * pageSize)}</strong> trên{" "}
              <strong>{filteredData.length}</strong> dòng
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
