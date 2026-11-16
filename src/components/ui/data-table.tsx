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
    return paginatedDataSlice(filteredData, start, pageSize)
  }, [filteredData, currentPage, pageSize])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      {(searchKey || headerRightActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          {searchKey ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-white border border-slate-200/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 transition-all shadow-2xs"
              />
            </div>
          ) : <div />}

          {headerRightActions && <div className="flex items-center gap-2 flex-wrap">{headerRightActions}</div>}
        </div>
      )}

      {/* Table Surface — Chuẩn "Kết quả khảo sát theo đợt" (Sky-Line Academic Ledger) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-auto border-collapse tabular-nums">
            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={cn(
                      "py-3 px-3.5 font-semibold text-teal-100 first:text-white last:text-white whitespace-nowrap",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400 font-semibold">
                    <div className="inline-block size-6 border-2 border-[#003B3A] border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center border-b border-slate-100">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-11 h-11 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#00736E]">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 text-balance">{emptyMessage}</p>
                      {searchQuery && (
                        <p className="text-xs text-slate-500 text-pretty">
                          Thử điều chỉnh từ khóa tìm kiếm: "{searchQuery}"
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="hover:bg-[#F8FAFC] transition-colors align-middle"
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={cn("py-3 px-3.5 text-slate-700 font-medium align-middle", col.className)}>
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
          <div className="px-4 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs font-semibold tabular-nums">
            <span className="text-xs text-slate-600 font-medium">
              Hiển thị <strong className="font-bold text-[#003B3A]">{Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)}–{Math.min(filteredData.length, currentPage * pageSize)}</strong> trong tổng số{" "}
              <strong className="font-bold text-[#003B3A]">{filteredData.length}</strong> dòng
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Trang trước"
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs font-bold text-[#003B3A] px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function paginatedDataSlice<T>(arr: T[], start: number, pageSize: number): T[] {
  return arr.slice(start, start + pageSize);
}
