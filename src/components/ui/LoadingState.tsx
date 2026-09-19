import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function LoadingSpinner({
  className,
  size = "md",
  text
}: {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
}) {
  const sizeMap = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8"
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 p-6 text-slate-500", className)}>
      <Loader2 className={cn(sizeMap[size], "animate-spin text-[#003B3A]")} />
      {text && <p className="text-xs font-medium text-slate-500">{text}</p>}
    </div>
  )
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-200/70", className)}
      {...props}
    />
  )
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
  className
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={cn("w-full space-y-3 p-4 bg-white rounded-2xl border border-slate-200/80", className)}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-3 py-2 border-b border-slate-50" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-6 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 bg-white rounded-2xl border border-slate-200/80 space-y-3", className)}>
      <Skeleton className="h-5 w-32 rounded-md" />
      <Skeleton className="h-8 w-20 rounded-md" />
      <Skeleton className="h-4 w-48 rounded-md" />
    </div>
  )
}
