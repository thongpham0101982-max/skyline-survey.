import * as React from "react"
import { AlertTriangle, RefreshCw, WifiOff, XCircle, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function InlineError({
  message,
  className
}: {
  message: string
  className?: string
}) {
  if (!message) return null
  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1", className)}>
      <AlertTriangle className="size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function PageError({
  title = "Đã xảy ra lỗi tải trang",
  description = "Không thể nạp dữ liệu từ máy chủ. Vui lòng kiểm tra lại đường truyền hoặc thử tải lại.",
  onRetry,
  className
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-2xl border border-rose-100 shadow-xs text-center", className)}>
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-inner">
        <XCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed text-pretty">
        {description}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="size-3.5" />}
        >
          Thử tải lại
        </Button>
      )}
    </div>
  )
}

export function NetworkError({
  onRetry,
  className
}: {
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-6 bg-amber-50/50 rounded-2xl border border-amber-200 text-center", className)}>
      <WifiOff className="size-8 text-amber-600 mb-2" />
      <h4 className="text-sm font-bold text-slate-800">Mất kết nối mạng</h4>
      <p className="text-xs text-slate-500 mt-1 mb-4">Vui lòng kiểm tra lại Wi-Fi hoặc kết nối Internet của thiết bị.</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Kết nối lại
        </Button>
      )}
    </div>
  )
}
