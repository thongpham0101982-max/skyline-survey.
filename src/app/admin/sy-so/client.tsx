"use client"
// @ts-nocheck
import React, { useState, useTransition } from "react"
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Building2, 
  ArrowRightLeft, 
  Plus, 
  Download, 
  CheckCircle2, 
  Lock, 
  Loader2, 
  X, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  FileSpreadsheet,
  Info
} from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import { getSnapshotsAction, getSnapshotDetailAction, captureMonthlySnapshotAction } from "./actions"

export function MonthlyEnrollmentClient({
  academicYears,
  campuses,
  activeYear,
  initialSnapshots,
  totalClasses,
  totalStudents,
  isFullAccess
}: any) {
  const [selectedYearId, setSelectedYearId] = useState(activeYear?.id || "")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [snapshots, setSnapshots] = useState(initialSnapshots || [])
  const [isPending, startTransition] = useTransition()

  // Modal states
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [captureYear, setCaptureYear] = useState(2026)
  const [captureMonth, setCaptureMonth] = useState(10)
  const [captureNotes, setCaptureNotes] = useState("")

  // Detail Drawer states
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null)
  const [snapshotDetail, setSnapshotDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Reload snapshots when filter changes
  const handleFilterChange = (yearId: string, campusId: string) => {
    setSelectedYearId(yearId)
    setSelectedCampusId(campusId)
    startTransition(async () => {
      const res = await getSnapshotsAction(yearId, campusId)
      if (res.success) {
        setSnapshots(res.snapshots || [])
      } else {
        toast.error(res.error || "Không thể tải danh sách chốt sỹ số")
      }
    })
  }

  // Open detail
  const handleViewDetail = async (snap: any) => {
    setSelectedSnapshot(snap)
    setLoadingDetail(true)
    try {
      const res = await getSnapshotDetailAction(snap.id)
      if (res.success) {
        setSnapshotDetail(res.snapshot)
      } else {
        toast.error(res.error || "Không thể tải chi tiết lớp học")
      }
    } catch {
      toast.error("Lỗi khi tải chi tiết")
    } finally {
      setLoadingDetail(false)
    }
  }

  // Trigger snapshot capture
  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await captureMonthlySnapshotAction({
        academicYearId: selectedYearId,
        year: Number(captureYear),
        month: Number(captureMonth),
        notes: captureNotes
      })

      if (res.success) {
        toast.success(res.message || "Chốt sỹ số thành công!")
        setShowCaptureModal(false)
        setCaptureNotes("")
        // Refresh list
        handleFilterChange(selectedYearId, selectedCampusId)
      } else {
        toast.error(res.error || "Chốt sỹ số thất bại!")
      }
    })
  }

  // Export Excel for a snapshot
  const handleExportExcel = async (snap: any) => {
    const toastId = toast.loading("Đang chuẩn bị file Excel...")
    try {
      const res = await getSnapshotDetailAction(snap.id)
      if (!res.success || !res.snapshot) {
        toast.error("Không thể lấy dữ liệu lớp học", { id: toastId })
        return
      }

      const snapData = res.snapshot
      const classes = snapData.classEnrollments || []

      // 1. Sheet 1: Tổng hợp
      const summaryData = [
        ["BÁO CÁO CHỐT SỸ SỐ HỌC SINH TOÀN TRƯỜNG THEO THÁNG"],
        [`Kỳ chốt: ${snapData.periodLabel} (Thời điểm: ${new Date(snapData.snapshotDate).toLocaleDateString('vi-VN')})`],
        [`Trạng thái: ${snapData.status === 'OFFICIAL' ? 'Chính thức' : 'Đã chốt'}`],
        [],
        ["Chỉ tiêu", "Số lượng"],
        ["Sỹ số đầu tháng", snapData.openingCount],
        ["Học sinh tăng trong tháng (Nhập mới/chuyển đến)", snapData.increaseCount],
        ["Học sinh giảm trong tháng (Chuyển đi/bảo lưu)", snapData.decreaseCount],
        ["Sỹ số chốt cuối tháng", snapData.closingCount],
        ["- Trong đó Mầm non", snapData.preschoolCount],
        ["- Trong đó Tiểu học", snapData.primaryCount],
        ["- Trong đó THCS", snapData.secondaryCount],
        ["- Trong đó THPT", snapData.highSchoolCount],
        ["Tỷ lệ duy trì sỹ số (%)", `${snapData.retentionRate || 100}%`],
        ["Ghi chú", snapData.notes || ""]
      ]

      // 2. Sheet 2: Chi tiết từng lớp
      const classRows = classes.map((c: any, index: number) => ({
        "STT": index + 1,
        "Khối": c.grade,
        "Tên Lớp": c.className,
        "Cấp học": c.level,
        "Sỹ số đầu tháng": c.openingCount,
        "Tăng (+)": c.newStudents + c.transferredIn,
        "Giảm (-)": c.transferredOut + c.droppedOut + c.reservedCount,
        "Sỹ số cuối tháng": c.closingCount,
        "Sức chứa định mức": c.maxCapacity,
        "Tỷ lệ lấp đầy (%)": `${c.occupancyRate || 0}%`
      }))

      const wb = XLSX.utils.book_new()
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
      const wsClasses = XLSX.utils.json_to_sheet(classRows)

      XLSX.utils.book_append_sheet(wb, wsSummary, "Tong_Hop")
      XLSX.utils.book_append_sheet(wb, wsClasses, "Chi_Tiet_Lop")

      const fileName = `Bao_Cao_Sy_So_${snapData.periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success("Xuất file Excel thành công!", { id: toastId })
    } catch (e: any) {
      console.error("Export Excel error:", e)
      toast.error("Lỗi khi xuất file Excel", { id: toastId })
    }
  }

  const latestSnap = snapshots[0] || null

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00A19A] shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#003B3A] tracking-tight">
              Theo dõi & Lưu trữ Sỹ số theo Tháng
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Hệ thống lưu trữ lịch sử sỹ số và đo lường biến động học sinh định kỳ hàng tháng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCaptureModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00A19A] hover:bg-[#008781] text-white text-xs font-black shadow-md shadow-teal-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Chốt Sỹ số Tháng</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Năm học:
            </span>
            <select
              value={selectedYearId}
              onChange={(e) => handleFilterChange(e.target.value, selectedCampusId)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {academicYears.map((y: any) => (
                <option key={y.id} value={y.id}>{y.name} {y.status === 'ACTIVE' ? '(Đang học)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Campus selector */}
          {isFullAccess && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Cơ sở:
              </span>
              <select
                value={selectedCampusId}
                onChange={(e) => handleFilterChange(selectedYearId, e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="ALL">Toàn trường (Hệ thống)</option>
                {campuses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.campusCode} - {c.campusName}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-xs font-bold text-teal-600 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang nạp dữ liệu...</span>
          </div>
        )}
      </div>

      {/* KPI Cards (based on latest snapshot or current active) */}
      {latestSnap && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Closing count */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Sỹ số chốt kỳ gần nhất</span>
              <span className="px-2 py-0.5 bg-teal-50 text-[#00A19A] rounded-md text-[10px] uppercase font-black">
                {latestSnap.periodLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#003B3A] tracking-tight">
                {latestSnap.closingCount}
              </span>
              <span className="text-xs font-bold text-slate-500">học sinh</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-teal-600 font-bold">PT: {latestSnap.closingCount - latestSnap.preschoolCount}</span>
              <span>•</span>
              <span className="text-rose-500 font-bold">MN: {latestSnap.preschoolCount}</span>
            </div>
          </div>

          {/* Card 2: Increase */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Học sinh tăng trong kỳ</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">
                +{latestSnap.increaseCount}
              </span>
              <span className="text-xs font-bold text-slate-500">học sinh mới</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 pt-1 border-t border-slate-100">
              Nhập học mới & Tiếp nhận chuyển đến
            </p>
          </div>

          {/* Card 3: Decrease */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Học sinh giảm trong kỳ</span>
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-600 tracking-tight">
                -{latestSnap.decreaseCount}
              </span>
              <span className="text-xs font-bold text-slate-500">học sinh</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 pt-1 border-t border-slate-100">
              Chuyển trường, thôi học, bảo lưu
            </p>
          </div>

          {/* Card 4: Retention */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Tỷ lệ duy trì sỹ số</span>
              <CheckCircle2 className="w-4 h-4 text-[#48BFE3]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0284C7] tracking-tight">
                {latestSnap.retentionRate || 100}%
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 pt-1 border-t border-slate-100">
              Đo lường mức độ ổn định học sinh
            </p>
          </div>
        </div>
      )}

      {/* Snapshot History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#00A19A]" />
            <h3 className="text-base font-black text-[#003B3A]">
              Lịch sử các Kỳ Chốt Sỹ số
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {snapshots.length} kỳ chốt đã lưu
          </span>
        </div>

        {snapshots.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Info className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">Chưa có kỳ chốt sỹ số nào được ghi nhận cho bộ lọc này.</p>
            <p className="text-xs text-slate-400">Nhấn nút "Chốt Sỹ số Tháng" ở góc trên để tạo kỳ chốt mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-black border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Kỳ Chốt</th>
                  <th className="py-3.5 px-3">Ngày Chốt</th>
                  <th className="py-3.5 px-3 text-right">Đầu Tháng</th>
                  <th className="py-3.5 px-3 text-right text-emerald-600">Tăng (+)</th>
                  <th className="py-3.5 px-3 text-right text-rose-600">Giảm (-)</th>
                  <th className="py-3.5 px-3 text-right font-black text-[#003B3A]">Cuối Tháng</th>
                  <th className="py-3.5 px-3 text-center">Phổ thông / MN</th>
                  <th className="py-3.5 px-3 text-center">Duy trì</th>
                  <th className="py-3.5 px-3 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {snapshots.map((s: any) => {
                  const netChange = s.increaseCount - s.decreaseCount
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-black text-[#003B3A] text-sm">
                        {s.periodLabel}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {new Date(s.snapshotDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-600">
                        {s.openingCount}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-600">
                        {s.increaseCount > 0 ? `+${s.increaseCount}` : '0'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-rose-600">
                        {s.decreaseCount > 0 ? `-${s.decreaseCount}` : '0'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-[#00A19A] text-sm">
                        {s.closingCount}
                        <span className="block text-[10px] font-bold text-slate-400">
                          {netChange > 0 ? `+${netChange} ròng` : netChange < 0 ? `${netChange} ròng` : '0 ròng'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-600">
                        <span className="text-teal-600">{s.closingCount - s.preschoolCount}</span>
                        <span className="mx-1 text-slate-300">/</span>
                        <span className="text-rose-500">{s.preschoolCount}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {s.retentionRate || 100}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          s.status === 'OFFICIAL' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <Lock className="w-2.5 h-2.5" />
                          {s.status === 'OFFICIAL' ? 'Chính thức' : 'Đã chốt'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewDetail(s)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#00A19A] font-bold transition-all text-xs cursor-pointer"
                            title="Xem chi tiết 116 lớp"
                          >
                            Xem lớp
                          </button>
                          <button
                            onClick={() => handleExportExcel(s)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-all text-xs flex items-center gap-1 cursor-pointer"
                            title="Xuất file Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Excel</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Chốt sỹ số tháng mới */}
      {showCaptureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Chốt Sỹ số Tháng Mới</h3>
                  <p className="text-xs text-slate-400 font-semibold">Tự động tổng hợp và lưu trữ số liệu toàn trường</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCaptureModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCaptureSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tháng chốt:</label>
                  <select
                    value={captureMonth}
                    onChange={(e) => setCaptureMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Năm:</label>
                  <select
                    value={captureYear}
                    onChange={(e) => setCaptureYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú kỳ chốt:</label>
                <textarea
                  value={captureNotes}
                  onChange={(e) => setCaptureNotes(e.target.value)}
                  placeholder="Ví dụ: Chốt sỹ số định kỳ cuối tháng 10/2026..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 h-20"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  Quy trình chốt sỹ số:
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Hệ thống sẽ quét toàn bộ 116 lớp và 2.341 học sinh, tính toán số học sinh chuyển đến/đi và tạo bản ghi lịch sử cố định cho tháng được chọn.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCaptureModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#00A19A] hover:bg-[#008781] transition-all flex items-center gap-2 shadow-md shadow-teal-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Xác nhận Chốt Sỹ số</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: Xem danh sách chi tiết các lớp */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span>Chi tiết Sỹ số các Lớp học</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00A19A] font-bold">
                    {selectedSnapshot.periodLabel}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Tổng sỹ số chốt: {selectedSnapshot.closingCount} học sinh • {snapshotDetail?.classEnrollments?.length || 0} lớp
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportExcel(selectedSnapshot)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel</span>
                </button>
                <button 
                  onClick={() => setSelectedSnapshot(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center text-teal-600 flex items-center justify-center gap-2 text-xs font-bold">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang tải danh sách lớp học...</span>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 text-slate-500 uppercase font-black border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Khối</th>
                      <th className="py-2.5 px-3">Tên Lớp</th>
                      <th className="py-2.5 px-3">Cấp học</th>
                      <th className="py-2.5 px-3 text-right">Đầu tháng</th>
                      <th className="py-2.5 px-3 text-right text-emerald-600">Tăng (+)</th>
                      <th className="py-2.5 px-3 text-right text-rose-600">Giảm (-)</th>
                      <th className="py-2.5 px-3 text-right font-black text-[#00A19A]">Cuối tháng</th>
                      <th className="py-2.5 px-3 text-right">Định mức</th>
                      <th className="py-2.5 px-3 text-center">Lấp đầy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {(snapshotDetail?.classEnrollments || []).map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-bold text-slate-500">{c.grade}</td>
                        <td className="py-2 px-3 font-black text-slate-800">{c.className}</td>
                        <td className="py-2 px-3 text-slate-500">{c.level}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-600">{c.openingCount}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">
                          {c.newStudents > 0 ? `+${c.newStudents}` : '0'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {c.transferredOut > 0 ? `-${c.transferredOut}` : '0'}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-[#00A19A]">{c.closingCount}</td>
                        <td className="py-2 px-3 text-right text-slate-400">{c.maxCapacity}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-bold text-slate-600">{c.occupancyRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
