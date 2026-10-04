"use client"

import React, { useState, useEffect } from "react"
import {
  Smartphone,
  Tablet,
  Laptop,
  ShieldCheck,
  LogOut,
  RefreshCw,
  X,
  AlertTriangle,
  Lock,
  Globe,
  Clock,
  CheckCircle2
} from "lucide-react"

interface Device {
  id: string
  deviceId: string
  deviceName: string
  deviceType: "MOBILE" | "TABLET" | "DESKTOP"
  browser: string
  os: string
  ipAddress: string
  lastActiveAt: string
  status: "ACTIVE" | "REVOKED"
  isCurrent: boolean
}

interface DeviceSessionManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function DeviceSessionManager({ isOpen, onClose }: DeviceSessionManagerProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [currentDeviceId, setCurrentDeviceId] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadDevices = async () => {
    try {
      setLoading(true)
      const storedDeviceId = typeof window !== "undefined" ? localStorage.getItem("ssm_device_id") || "" : ""
      setCurrentDeviceId(storedDeviceId)

      const res = await fetch("/api/pwa/devices", {
        headers: {
          "x-device-id": storedDeviceId
        }
      })
      if (res.ok) {
        const data = await res.json()
        setDevices(data.devices || [])
      }
    } catch (e) {
      console.error("Error loading device sessions:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadDevices()
    }
  }, [isOpen])

  const handleRevokeSingle = async (deviceId: string) => {
    try {
      setActionLoading(deviceId)
      const res = await fetch("/api/pwa/devices/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId })
      })

      if (res.ok) {
        showToast("Đã thu hồi phiên đăng nhập thiết bị.")
        await loadDevices()
      }
    } catch (e) {
      console.error("Error revoking device:", e)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokeAllOthers = async () => {
    try {
      setActionLoading("ALL_OTHERS")
      const res = await fetch("/api/pwa/devices/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revokeAllOthers: true,
          currentDeviceId
        })
      })

      if (res.ok) {
        const data = await res.json()
        showToast(data.message || "Đã đăng xuất tất cả thiết bị khác.")
        setConfirmRevokeAll(false)
        await loadDevices()
      }
    } catch (e) {
      console.error("Error revoking all others:", e)
    } finally {
      setActionLoading(null)
    }
  }

  const formatLastActive = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      if (diffMins < 2) return "Vừa xong"
      if (diffMins < 60) return `${diffMins} phút trước`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours} giờ trước`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays} ngày trước`
    } catch {
      return "Gần đây"
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "TABLET":
        return <Tablet className="w-5 h-5 text-teal-600" />
      case "DESKTOP":
        return <Laptop className="w-5 h-5 text-indigo-600" />
      default:
        return <Smartphone className="w-5 h-5 text-teal-600" />
    }
  }

  if (!isOpen) return null

  const currentDevice = devices.find(d => d.isCurrent || d.deviceId === currentDeviceId)
  const otherActiveDevices = devices.filter(d => (!d.isCurrent && d.deviceId !== currentDeviceId) && d.status === "ACTIVE")

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 p-0 sm:p-4">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00A19A]/10 text-[#00A19A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#003B3A]">Thiết bị đăng nhập</h3>
              <p className="text-[11px] text-slate-500">Kiểm soát bảo mật phiên truy cập SSM</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadDevices}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#00A19A]" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-4 mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Section 1: Thiết bị hiện tại */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Thiết bị hiện tại
            </h4>
            {currentDevice ? (
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 shadow-2xs relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getDeviceIcon(currentDevice.deviceType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#003B3A]">
                          {currentDevice.deviceName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Thiết bị này
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          {currentDevice.browser} • {currentDevice.os}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatLastActive(currentDevice.lastActiveAt)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        IP: {currentDevice.ipAddress}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 text-slate-400 text-xs italic">
                Đang nhận diện thiết bị này...
              </div>
            )}
          </div>

          {/* Section 2: Thiết bị khác đang đăng nhập */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Thiết bị khác ({otherActiveDevices.length})
              </h4>
              {otherActiveDevices.length > 0 && !confirmRevokeAll && (
                <button
                  onClick={() => setConfirmRevokeAll(true)}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Đăng xuất tất cả
                </button>
              )}
            </div>

            {/* Confirm Revoke All Box */}
            {confirmRevokeAll && (
              <div className="p-3.5 mb-3 rounded-2xl bg-rose-50 border border-rose-200 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-rose-900">Xác nhận đăng xuất tất cả thiết bị khác?</p>
                    <p className="text-rose-700 text-[11px] mt-0.5">
                      Toàn bộ phiên làm việc trên các điện thoại, máy tính bảng hoặc máy tính khác sẽ bị vô hiệu hóa ngay lập tức.
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        onClick={handleRevokeAllOthers}
                        disabled={actionLoading === "ALL_OTHERS"}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === "ALL_OTHERS" ? "Đang xử lý..." : "Đăng xuất ngay"}
                      </button>
                      <button
                        onClick={() => setConfirmRevokeAll(false)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 font-semibold text-xs hover:bg-rose-100 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : otherActiveDevices.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">Tài khoản an toàn</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Không có thiết bị lạ nào khác đang truy cập tài khoản của Thầy/Cô.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {otherActiveDevices.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {getDeviceIcon(d.deviceType)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{d.deviceName}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {d.browser} • {d.os}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                          <span>IP: {d.ipAddress}</span>
                          <span>•</span>
                          <span>{formatLastActive(d.lastActiveAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeSingle(d.deviceId)}
                      disabled={actionLoading === d.deviceId}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-semibold text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      title="Thu hồi phiên thiết bị này"
                    >
                      {actionLoading === d.deviceId ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Cam kết Bảo mật Doanh nghiệp */}
          <div className="p-3.5 rounded-2xl bg-[#003B3A]/5 border border-[#003B3A]/10 text-xs">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#00A19A] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#003B3A]">Tiêu chuẩn Bảo mật SSM Enterprise</p>
                <ul className="text-[11px] text-slate-600 mt-1 space-y-1 list-disc list-inside">
                  <li>Không lưu trữ dữ liệu nhạy cảm (SĐT phụ huynh, hồ sơ học sinh) trong bộ nhớ máy.</li>
                  <li>Mã hóa đường truyền an toàn TLS 1.3 và chống giả mạo Clickjacking (CSP Enforced).</li>
                  <li>Tự động đăng xuất ngay lập tức khi phiên thiết bị bị thu hồi từ xa.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
