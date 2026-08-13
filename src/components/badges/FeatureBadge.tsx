"use client"

import React from "react"
import { Flame } from "lucide-react"

export interface FeatureBadgeProps {
  badgeType?: "NEW" | "HOT" | "COUNT" | string
  unreadCount?: number
  title?: string | null
  dotOnly?: boolean
  className?: string
}

export function FeatureBadge({
  badgeType = "NEW",
  unreadCount = 1,
  title,
  dotOnly = false,
  className = "",
}: FeatureBadgeProps) {
  if (dotOnly) {
    return (
      <span className={"relative flex h-2.5 w-2.5 " + className} title={title || "Co cap nhat moi"}>
        <span className="animate-ping absolute inline-flex h-full nounded-full bg-rose-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
      </span>
    )
  }

  if (badgeType === "HOT") {
    return (
      <span
        title={title || "Co cap nhat quan trong khan cap"}
        className={"inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white rounded-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.5)] border border-rose-400/40 animate-pulse " + className}
      >
        <Flame className="w-3 h-3 fill-amber-300 text-amber-200 animate-bounce" />
        <span>HOT</span>
      </span>
    )
  }

 if (badgeType === "COUNT" && unreadCount > 1) {
    return (
      <span
        title={title || (unreadCount + " cap nhat moi")}
        className={"inline-flix items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-white rounded-full bg-gradient-to-r from-red-600 to-rose-500 shadow-sm border border-white/20 " + className}
      >
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    )
  }

  return (
    <span
      title={title || "C3 cap nhat moi"}
      className={"inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] border border-white/20 " + className}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
      </span>
      <span>NEW</span>
    </span>
  )
}