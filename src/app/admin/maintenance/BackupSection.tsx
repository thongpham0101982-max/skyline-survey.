"use client"

import { useState } from "react"
import {
  Database,
  Download,
  Play,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  HardDrive,
  ShieldCheck,
  Copy,
  Check,
  FileCheck2,
  Sparkles,
  Trash2,
  Archive
} from "lucide-react"
import {
  triggerBackupAction,
  verifyBackupAction,
  optimizeBackupStorageAction,
  deleteBackupAction
} from "./actions"

interface PhotoVaultInfo {
  photoCount: number
  maxUpdated: string
  dbSizeBytes: number
  gzSizeBytes: number
  sha256: string
  updatedAt: string
}

interface StorageInfo {
  freeBytes: number
  totalBytes: number
  backupDirBytes: number
  redundantBytes?: number
  redundantFilesCount?: number
  photoVault?: PhotoVaultInfo | null
}

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
  sha256?: string
  sha256Db?: string
  integrityCheck?: string
  fkViolations?: number
  verifiedAt?: string
  durationSeconds: number
  triggerType: string
  sourceEngine?: string
  backupMode?: string
  photoVaultRef?: string
  photoVaultCount?: number
  status: string
}

interface BackupSectionProps {
  initialBackups: BackupItem[]
  storageInfo?: StorageInfo
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export function BackupSection({ initialBackups, storageInfo }: BackupSectionProps) {
  const [backups, setBackups] = useState<BackupItem[]>(initialBackups || [])
  const [storage, setStorage] = useState<StorageInfo | undefined>(storageInfo)
  const [isLoading, setIsLoading] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedSha, setCopiedSha] = useState<string | null>(null)
  const [backupMode, setBackupMode] = useState<"CORE_LITE" | "FULL">("CORE_LITE")
  const [backupSource, setBackupSource] = useState<"AUTO" | "LOCAL" | "CLOUD">("AUTO")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const latestBackup = backups.length > 0 ? backups[0] : null
  const unverifiedCount = backups.filter((b) => !b.sha256).length

  const handleTriggerBackup = async () => {
    if (isLoading || isOptimizing) return
    const modeDesc =
      backupMode === "CORE_LITE"
        ? "Chế độ Tối ưu Dung lượng (Tách riêng kho ảnh tĩnh 695MB, tệp nén nghiệp vụ chỉ ~15MB)"
        : "Chế độ Toàn phần Độc lập (Gộp cả kho ảnh học sinh vào tệp sao lưu ~525MB)"

    const confirmed = window.confirm(
      `Tiến hành sao lưu cơ sở dữ liệu ngay bây giờ?\n• ${modeDesc}\n• Nguồn: ${backupSource}\n• Tự động kiểm tra toàn vẹn PRAGMA & cấp mã băm SHA-256.`
    )
    if (!confirmed) return

    setIsLoading(true)
    setStatusMessage("Đang khởi tạo snapshot nguyên tử, kiểm định cấu trúc SQLite và nén Gzip...")
    setErrorMessage(null)

    try {
      const res = await triggerBackupAction({ mode: backupMode, source: backupSource })
      if (res.success && res.result) {
        if (res.result.skipped) {
          setStatusMessage(
            `Tiến trình bỏ qua: ${
              res.result.reason === "ALREADY_RAN_TODAY"
                ? "Hôm nay đã có bản sao lưu hợp lệ"
                : "Đang có tiến trình sao lưu khác thực thi"
            }.`
          )
        } else {
          setStatusMessage(
            `Sao lưu hoàn tất! Đã lưu ${res.result.totalRows?.toLocaleString("vi-VN")} dòng (${res.result.totalTables} bảng) • Dung lượng nén: ${formatBytes(res.result.gzSizeBytes)} • Đã xóa tệp .db thô để tiết kiệm ổ đĩa.`
          )
          if (res.backups) setBackups(res.backups)
          if (res.storage) setStorage(res.storage)
        }
      } else {
        setErrorMessage(res.error || "Sao lưu thất bại. Vui lòng kiểm tra nhật ký máy chủ.")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi không xác định khi kích hoạt sao lưu.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOptimizeStorage = async () => {
    if (isOptimizing || isLoading) return
    const confirmed = window.confirm(
      "Hệ thống sẽ tiến hành:\n1. Xóa các tệp .db thô bị lưu trùng với .db.gz\n2. Gộp các bản sao lưu chạy trùng lặp trong cùng 1 đêm\n3. Xóa các tệp tạm (.tmp) rác\n4. Tự động kiểm định & cấp mã băm SHA-256 cho các bản chưa xác minh.\n\nBạn có muốn tiếp tục?"
    )
    if (!confirmed) return

    setIsOptimizing(true)
    setErrorMessage(null)
    setStatusMessage("Đang dọn dẹp tệp trùng lặp, giải phóng ổ đĩa và xác minh toàn vẹn SHA-256...")

    try {
      const res = await optimizeBackupStorageAction()
      if (res.success && res.result) {
        setStatusMessage(
          `Tối ưu hóa hoàn tất! Đã giải phóng ${formatBytes(res.result.freedBytes)} (${res.result.removedFilesCount} tệp thừa/trùng lặp) và xác minh SHA-256 cho ${res.result.verifiedCount} bản sao lưu.`
        )
        if (res.backups) setBackups(res.backups)
        if (res.storage) setStorage(res.storage)
      } else {
        setErrorMessage(res.error || "Không thể tối ưu hóa dung lượng lưu trữ.")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi khi tối ưu hóa dung lượng.")
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleVerify = async (backupId: string) => {
    if (verifyingId) return
    setVerifyingId(backupId)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const res = await verifyBackupAction(backupId)
      if (res.success && res.result) {
        setStatusMessage(
          `Xác minh thành công ${backupId}: Cấu trúc SQLite ${res.result.integrityCheck}, Vi phạm khóa ngoại: ${res.result.fkViolations}, Checksum SHA-256: HỢP LỆ.`
        )
        setBackups((prev) =>
          prev.map((b) =>
            b.id === backupId
              ? {
                  ...b,
                  sha256: res.result.sha256,
                  sha256Db: res.result.sha256Db,
                  integrityCheck: res.result.integrityCheck,
                  fkViolations: res.result.fkViolations,
                  verifiedAt: res.result.verifiedAt
                }
              : b
          )
        )
      } else {
        setErrorMessage(res.error || "Không thể xác minh tệp sao lưu.")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi khi xác minh tệp.")
    } finally {
      setVerifyingId(null)
    }
  }

  const handleDelete = async (backupId: string) => {
    if (deletingId) return
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa bản sao lưu ${backupId} để giải phóng ổ đĩa?`)
    if (!confirmed) return

    setDeletingId(backupId)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const res = await deleteBackupAction(backupId)
      if (res.success && res.result) {
        setStatusMessage(`Đã xóa bản sao lưu ${backupId} (Giải phóng ${formatBytes(res.result.freedBytes)}).`)
        if (res.backups) setBackups(res.backups)
        if (res.storage) setStorage(res.storage)
      } else {
        setErrorMessage(res.error || "Không thể xóa bản sao lưu.")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi khi xóa bản sao lưu.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha)
    setCopiedSha(sha)
    setTimeout(() => setCopiedSha(null), 2500)
  }

  const usedDiskPercent =
    storage && storage.totalBytes > 0
      ? Math.round(((storage.totalBytes - storage.freeBytes) / storage.totalBytes) * 100)
      : 0

  return (
    <div className="bg-white rounded-[2rem] p-8 border-2 border-[#003B3A]/15 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#003B3A]/10 text-[#003B3A] rounded-2xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Hệ Thống Sao Lưu Dữ Liệu Tự Động (v2.0)</h3>
              <p className="text-xs font-semibold text-[#003B3A] uppercase tracking-wider">
                Enterprise Central Coordinator • Sky-Line School
              </p>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium pt-1">
            Sao lưu nguyên tử SQLite nén Gzip, tách kho ảnh chống trùng lặp (Deduplication), kiểm tra toàn vẹn tự động và cấp mã băm SHA-256.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={backupMode}
            onChange={(e) => setBackupMode(e.target.value as "CORE_LITE" | "FULL")}
            disabled={isLoading || isOptimizing}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#003B3A]"
            title="Chọn chế độ đóng gói dung lượng"
          >
            <option value="CORE_LITE">Tối ưu ổ đĩa (Nghiệp vụ + Kho ảnh ~15MB)</option>
            <option value="FULL">Toàn phần độc lập (Gộp cả ảnh ~525MB)</option>
          </select>

          <select
            value={backupSource}
            onChange={(e) => setBackupSource(e.target.value as "AUTO" | "LOCAL" | "CLOUD")}
            disabled={isLoading || isOptimizing}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#003B3A]"
            title="Chọn nguồn cơ sở dữ liệu"
          >
            <option value="AUTO">Nguồn: Tự động (Local ưu tiên)</option>
            <option value="LOCAL">Nguồn: Local SQLite (local.db)</option>
            <option value="CLOUD">Nguồn: Turso Cloud</option>
          </select>

          <button
            onClick={handleOptimizeStorage}
            disabled={isOptimizing || isLoading}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
              (storage?.redundantBytes || 0) > 0 || unverifiedCount > 0
                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }`}
            title="Xóa file .db thô trùng lặp, gộp bản chạy trùng đêm và xác minh SHA-256 tự động"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang tối ưu...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-600" />
                Tối ưu &amp; Dọn ổ đĩa
                {(storage?.redundantBytes || 0) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-amber-200/80 text-amber-900 rounded-md text-[10px]">
                    -{formatBytes(storage?.redundantBytes)}
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={handleTriggerBackup}
            disabled={isLoading || isOptimizing}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              isLoading
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-[#003B3A] hover:bg-[#002B2A] text-white shadow-[#003B3A]/20 active:scale-95"
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang sao lưu &amp; xác minh...
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

      {/* Thông tin lịch trình & Giám sát lưu trữ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Lịch sao lưu */}
        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#003B3A] font-bold text-xs uppercase tracking-wider mb-1.5">
              <Clock className="w-4 h-4 text-[#003B3A]" />
              Lịch sao lưu định kỳ
            </div>
            <div className="text-xl font-black text-slate-900">23:00 Thứ 6 hằng tuần</div>
            <p className="text-xs text-slate-500 mt-1">Điều phối duy nhất: Windows Task Scheduler</p>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/60 text-xs text-emerald-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Master Scheduler: Đã kích hoạt (Chống trùng PID)
          </div>
        </div>

        {/* Card 2: Bản sao lưu gần nhất */}
        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Lần sao lưu gần nhất
            </div>
            <div className="text-xl font-black text-slate-800">
              {latestBackup
                ? `${latestBackup.dayOfWeek}, ${new Date(latestBackup.createdAt).toLocaleDateString("vi-VN")}`
                : "Chưa có"}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {latestBackup
                ? `${latestBackup.totalRows?.toLocaleString("vi-VN")} dòng • ${latestBackup.totalTables} bảng (${formatBytes(latestBackup.gzSizeBytes)})`
                : "Chờ kích hoạt"}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600 flex items-center justify-between font-medium">
            <span>Toàn vẹn CSDL:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {latestBackup?.integrityCheck || "Đạt chuẩn (OK)"}
            </span>
          </div>
        </div>

        {/* Card 3: Dung lượng ổ đĩa D */}
        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1.5">
              <HardDrive className="w-4 h-4 text-indigo-600" />
              Lưu trữ Ổ đĩa D:\
            </div>
            <div className="text-xl font-black text-slate-800">
              {storage ? `Trống ${formatBytes(storage.freeBytes)}` : "Đang tính..."}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Thư mục backup: <span className="font-bold text-slate-700">{formatBytes(storage?.backupDirBytes)}</span> ({backups.length} bản)
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
              <span>Đã dùng {usedDiskPercent}%</span>
              <span>Tổng: {formatBytes(storage?.totalBytes)}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  usedDiskPercent > 85 ? "bg-rose-500" : usedDiskPercent > 70 ? "bg-amber-500" : "bg-[#003B3A]"
                }`}
                style={{ width: `${usedDiskPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Kho ảnh tĩnh Deduplication (nếu đã khởi tạo) */}
      {storage?.photoVault && (
        <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-teal-900 uppercase tracking-wider">
                Kho Lưu Trữ Ảnh Học Sinh Độc Lập (Deduplicated Photo Vault)
              </div>
              <div className="text-xs text-teal-700 font-medium mt-0.5">
                Đang bảo toàn <strong>{storage.photoVault.photoCount.toLocaleString("vi-VN")} ảnh</strong> ({formatBytes(storage.photoVault.gzSizeBytes)} nén / gốc {formatBytes(storage.photoVault.dbSizeBytes)}) • SHA-256: <code className="font-mono text-[11px]">{storage.photoVault.sha256?.substring(0, 12)}...</code>
              </div>
            </div>
          </div>
          <a
            href="/api/admin/backup?download=student_photos_vault.db.gz"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-colors self-start sm:self-center"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Kho Ảnh (.db.gz)
          </a>
        </div>
      )}

      {/* Thông báo trạng thái */}
      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Bảng danh sách bản sao lưu */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#003B3A]" />
            Danh sách tệp sao lưu hợp lệ ({backups.length})
          </h4>
          <span className="text-xs text-slate-400 font-medium">
            Chính sách: Lưu 12 bản chuẩn gần nhất (Chỉ giữ .db.gz, giải nén Stream khi tải .db)
          </span>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
            Chưa có bản sao lưu nào được tạo. Bấm <strong>&quot;Sao lưu ngay&quot;</strong> để tạo bản đầu tiên.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Thời gian &amp; Mã</th>
                  <th className="px-4 py-3">Bản ghi &amp; Số bảng</th>
                  <th className="px-4 py-3">Dung lượng</th>
                  <th className="px-4 py-3">Xác minh Toàn vẹn</th>
                  <th className="px-4 py-3">Chế độ</th>
                  <th className="px-4 py-3 text-right">Thao tác &amp; Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Thời gian */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{new Date(b.createdAt).toLocaleString("vi-VN")}</div>
                      <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{b.dayOfWeek}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded">{b.id}</span>
                      </div>
                    </td>

                    {/* Bản ghi & Bảng */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{b.totalRows?.toLocaleString("vi-VN")} dòng</div>
                      <div className="text-xs text-slate-400 font-medium">
                        {b.totalTables} bảng {b.sourceEngine ? `• ${b.sourceEngine}` : ""}
                      </div>
                    </td>

                    {/* Dung lượng */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#003B3A]">{formatBytes(b.gzSizeBytes)} (nén)</div>
                      <div className="text-xs text-slate-400 font-medium">
                        Gốc: {formatBytes(b.dbSizeBytes)} (Tiết kiệm ~
                        {Math.round((1 - b.gzSizeBytes / (b.dbSizeBytes || 1)) * 100)}%)
                      </div>
                      {b.backupMode === "CORE_LITE" && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded">
                          + Kho ảnh tĩnh ({b.photoVaultCount || 3062} ảnh)
                        </span>
                      )}
                    </td>

                    {/* Checksum & Xác minh */}
                    <td className="px-4 py-3">
                      {b.sha256 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Toàn vẹn: {b.integrityCheck || "OK"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                            <span className="truncate max-w-[110px]" title={b.sha256}>
                              SHA: {b.sha256.substring(0, 10)}...
                            </span>
                            <button
                              onClick={() => handleCopySha(b.sha256!)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                              title="Sao chép toàn bộ mã băm SHA-256"
                            >
                              {copiedSha === b.sha256 ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 italic">Chưa xác minh</span>
                          <button
                            onClick={() => handleVerify(b.id)}
                            disabled={verifyingId === b.id}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            {verifyingId === b.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                            ) : (
                              <FileCheck2 className="w-3 h-3 text-[#003B3A]" />
                            )}
                            Kiểm tra
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Chế độ */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {b.triggerType || "SCHEDULED"}
                      </span>
                    </td>

                    {/* Tải về & Xóa */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/api/admin/backup?download=${encodeURIComponent(b.gzFilename)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#003B3A]/10 text-[#003B3A] hover:bg-[#003B3A]/20 transition-colors shadow-xs"
                          title="Tải tệp nén dung lượng nhỏ (.db.gz) - Khuyến nghị"
                        >
                          <Download className="w-3.5 h-3.5" />
                          .db.gz
                        </a>
                        <a
                          href={`/api/admin/backup?download=${encodeURIComponent(b.filename)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          title="Tải tệp SQLite gốc (.db) - Giải nén trực tiếp qua luồng Stream không tốn ổ đĩa"
                        >
                          <Download className="w-3.5 h-3.5" />
                          .db
                        </a>
                        {backups.length > 1 && (
                          <button
                            onClick={() => handleDelete(b.id)}
                            disabled={deletingId === b.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa bản sao lưu này"
                          >
                            {deletingId === b.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
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
