"use client"

import { useState } from "react"
import { Database, Download, Play, RefreshCw, CheckCircle2, Clock, AlertCircle, HardDrive, ShieldCheck } from "lucide-react"
import { triggerBackupAction } from "./actions"

interface BackupItem {
  id: string
  filename: string
  gzFilename: string
  createdAt: string
  dateStr: string
  dayOfWeek: string
  totalTables: number
  totalRows: number
  dbSizeBytes: number
  gzSizeBytes: number
  durationSeconds: number
  triggerType: string
  status: string
}

interface BackupSectionProps {
  initialBackups: BackupItem[]
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export function BackupSection({ initialBackups }: BackupSectionProps) {
  const [backups, setBackups] = useState<BackupItem[]>(initialBackups || [])
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const latestBackup = backups.length > 0 ? backups[0] : null

  const handleTriggerBackup = async () => {
    if (isLoading) return
    const confirmed = window.confirm("Bạn có chắc chắn muốn tiến hành sao lưu toàn bộ cơ sở dữ liệu ngay bây giờ không? Tiến trình có thể mất từ 1-3 phút.")
    if (!confirmed) return

    setIsLoading(true)
    setStatusMessage("Đang tiến hành sao lưu và nén toàn bộ 112 bảng dữ liệu từ Turso Cloud...")
    setErrorMessage(null)

    try {
      const res = await triggerBackupAction()
      if (res.success && res.result) {
        setStatusMessage(`Sao lưu thành công! Đã sao lưu ${res.result.totalRows?.toLocaleString()} dòng dữ liệu.`)
        // Cập nhật danh sách bản sao lưu
        const updated = [res.result, ...backups.filter(b => b.id !== res.result.id)]
        setBackups(updated)
      } else {
        setErrorMessage(res.error || "Sao lưu thất bại. Vui lòng kiểm tra nhật ký máy chủ.")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi không xác định khi kích hoạt sao lưu.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-[2rem] p-8 border-2 border-emerald-100 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-800">Chế độ Sao lưu Dữ liệu Tự động</h3>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Hệ thống tự động sao lưu toàn bộ dữ liệu Turso Cloud sang tệp SQLite và nén Gzip định kỳ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerBackup}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              isLoading
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95"
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang sao lưu...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Sao lưu ngay
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thông tin lịch trình */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/80">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4 text-emerald-600" />
            Lịch sao lưu định kỳ
          </div>
          <div className="text-lg font-black text-emerald-950">23:00 Thứ 6 hằng tuần</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang kích hoạt (Windows + In-App)
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Lần sao lưu gần nhất
          </div>
          <div className="text-lg font-black text-slate-800">
            {latestBackup ? `${latestBackup.dayOfWeek}, ${new Date(latestBackup.createdAt).toLocaleDateString("vi-VN")}` : "Chưa có"}
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            {latestBackup ? `${latestBackup.totalRows?.toLocaleString("vi-VN")} dòng • ${formatBytes(latestBackup.gzSizeBytes)}` : "Chờ kích hoạt"}
          </div>
        </div>

        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100/80">
          <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Chính sách lưu trữ
          </div>
          <div className="text-lg font-black text-indigo-950">Lưu 12 bản gần nhất</div>
          <div className="text-xs text-indigo-700 mt-2 font-medium">
            Tự động dọn dẹp bản cũ &gt; 3 tháng
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Danh sách tệp sao lưu */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            Danh sách tệp sao lưu ({backups.length})
          </h4>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
            Chưa có bản sao lưu nào được tạo. Bấm <strong>"Sao lưu ngay"</strong> để tạo bản đầu tiên.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Bản ghi & Số bảng</th>
                  <th className="px-4 py-3">Dung lượng</th>
                  <th className="px-4 py-3">Chế độ</th>
                  <th className="px-4 py-3 text-right">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div>{new Date(b.createdAt).toLocaleString("vi-VN")}</div>
                      <div className="text-xs font-normal text-slate-400">{b.dayOfWeek}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-700">{b.totalRows?.toLocaleString("vi-VN")} dòng</div>
                      <div className="text-xs text-slate-400">{b.totalTables} bảng dữ liệu</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-indigo-600">{formatBytes(b.gzSizeBytes)} (nén)</div>
                      <div className="text-xs text-slate-400">Gốc: {formatBytes(b.dbSizeBytes)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {b.triggerType || "SCHEDULED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/admin/backup?download=${encodeURIComponent(b.gzFilename)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                          title="Tải tệp nén dung lượng nhỏ (.db.gz)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          .db.gz
                        </a>
                        <a
                          href={`/api/admin/backup?download=${encodeURIComponent(b.filename)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          title="Tải tệp SQLite gốc (.db)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          .db
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
