"use client"

import React from "react"
import { DetailDrawer } from "@/components/ui/drawer"
import { StatusBadge } from "@/components/ui/badge"
import { DrilldownRow } from "@/lib/dashboard/dashboardDataContract"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface DrilldownDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  rows: DrilldownRow[]
  valueColumnHeader?: string
}

export function DrilldownDrawer({
  open,
  onClose,
  title,
  description,
  rows,
  valueColumnHeader = "Chỉ số / Giá trị"
}: DrilldownDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={title}
      description={description}
      width="lg"
    >
      <div className="space-y-4 text-xs">
        <div className="text-slate-500">
          Hiển thị <strong>{rows.length}</strong> bản ghi chi tiết:
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Đối tượng / Mã</th>
                <th className="py-2.5 px-3">Phạm vi</th>
                <th className="py-2.5 px-3 text-center">{valueColumnHeader}</th>
                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{r.code}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{r.scope}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                    {r.metricValue}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={r.statusVariant} label={r.status} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {r.detailUrl ? (
                      <Link
                        href={r.detailUrl}
                        className="inline-flex items-center gap-1 text-[#003B3A] font-semibold hover:underline"
                      >
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DetailDrawer>
  )
}
