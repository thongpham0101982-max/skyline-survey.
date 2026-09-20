"use client"

import React from "react"
import { Clock, CheckCircle2, AlertCircle, Heart, GraduationCap, Calendar, Sparkles } from "lucide-react"
import { TimelineEvent } from "@/lib/support/supportTrackingService"
import { StatusBadge } from "@/components/ui/badge"

export interface TrackingTimelineProps {
  events: TimelineEvent[]
  className?: string
}

export function TrackingTimeline({ events, className = "" }: TrackingTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        Chưa có sự kiện theo dõi nào được ghi nhận.
      </div>
    )
  }

  return (
    <div className={`relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 ${className}`}>
      {events.map((ev, idx) => {
        let iconNode = <Clock className="w-3.5 h-3.5 text-slate-500" />
        let dotBg = "bg-slate-100 border-slate-300"

        if (ev.type === "START") {
          iconNode = <Sparkles className="w-3.5 h-3.5 text-white" />
          dotBg = "bg-[#003B3A] border-[#003B3A]"
        } else if (ev.type === "MONTHLY_REVIEW") {
          iconNode = <Calendar className="w-3.5 h-3.5 text-white" />
          dotBg = "bg-indigo-600 border-indigo-600"
        } else if (ev.type === "TERMINATED") {
          iconNode = <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          dotBg = "bg-emerald-600 border-emerald-600"
        }

        return (
          <div key={ev.id || idx} className="relative group">
            {/* Timeline bullet dot */}
            <div className={`absolute -left-[27px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 shadow-2xs ${dotBg}`}>
              {iconNode}
            </div>

            {/* Event box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#003B3A]/40 transition-colors shadow-2xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs text-slate-900">{ev.title}</h4>
                  <span className="text-[10px] font-mono text-slate-400">• {ev.date}</span>
                </div>
                <StatusBadge status={ev.statusTag.variant} label={ev.statusTag.label} />
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {ev.summary}
              </p>

              {ev.detail && (
                <div className="p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-500 border border-slate-100 font-mono">
                  {ev.detail}
                </div>
              )}

              {ev.evaluatorName && (
                <div className="text-[10px] text-slate-400 text-right">
                  Cập nhật: {ev.evaluatorName}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
