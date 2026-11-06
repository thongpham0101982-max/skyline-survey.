"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  Lock,
  Unlock,
  KeyRound,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react"

interface HandoverMeta {
  token: string
  appName: string
  recipientEmail?: string | null
  keyId: string
  keyPrefix: string
  expiresAt: string
  claimedAt?: string | null
  isExpired: boolean
  isLocked: boolean
  attemptsLeft: number
}

export default function HandoverUnlockPage() {
  const params = useParams()
  const token = params?.token as string

  const [meta, setMeta] = useState<HandoverMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [passcode, setPasscode] = useState("")
  const [showPasscode, setShowPasscode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)

  const [unlockedKey, setUnlockedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token) return

    fetch(`/api/v1/handover/${token}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setMeta(res.data)
          setAttemptsLeft(res.data.attemptsLeft)
        } else {
          setError(res.error || "Gói bàn giao không tồn tại")
        }
      })
      .catch(() => setError("Lỗi kết nối khi tải thông tin bàn giao"))
      .finally(() => setLoading(false))
  }, [token])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passcode.trim()) {
      setUnlockError("Vui lòng nhập mật khẩu bàn giao")
      return
    }

    setSubmitting(true)
    setUnlockError(null)

    try {
      const res = await fetch(`/api/v1/handover/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      })

      const data = await res.json()
      if (data.success) {
        setUnlockedKey(data.data.rawKey)
      } else {
        setUnlockError(data.error || "Mật khẩu không chính xác")
        if (typeof data.attemptsLeft === "number") {
          setAttemptsLeft(data.attemptsLeft)
        }
      }
    } catch {
      setUnlockError("Lỗi kết nối máy chủ khi xác thực mật khẩu")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-slate-800">
      {/* Masthead Header */}
      <header className="border-b border-slate-200 bg-[#003B3A] text-white py-4 px-6 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-teal-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">Hệ Thống Quản Lý Giáo Dục Sky-Line (SSM)</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Secure Delivery
                </span>
              </div>
              <p className="text-xs text-teal-100/80">Cổng Nhận Khóa Bí Mật & Bàn Giao Tích Hợp API</p>
            </div>
          </div>
          <a
            href="/api-docs.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-teal-200 hover:text-white transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Tài liệu OpenAPI
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 my-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Card Head */}
          <div className="border-b border-slate-100 bg-slate-50/70 p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-teal-100 text-[#003B3A] flex items-center justify-center">
                {unlockedKey ? <Unlock className="w-4 h-4 text-emerald-700" /> : <Lock className="w-4 h-4 text-[#00A19A]" />}
              </span>
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  {unlockedKey ? "Khóa API Đã Được Giải Mã" : "Xác Thực Mật Khẩu Bàn Giao API"}
                </h1>
                <p className="text-[11px] text-slate-500">Mã hóa bảo mật 2 lớp AES-256-GCM</p>
              </div>
            </div>
            {meta && (
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                {meta.keyPrefix}
              </span>
            )}
          </div>

          <div className="p-6 space-y-5">
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <div className="w-6 h-6 border-2 border-[#003B3A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Đang nạp thông tin gói bàn giao...
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">Không thể mở gói bàn giao</strong>
                  <p>{error}</p>
                </div>
              </div>
            ) : meta?.isExpired ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Gói bàn giao đã hết hạn
                </div>
                <p>
                  Thời hạn hiệu lực của liên kết bảo mật đã kết thúc ({new Date(meta.expiresAt).toLocaleString("vi-VN")}). Vui lòng liên hệ Ban Quản trị để cấp phát lại khóa mới.
                </p>
              </div>
            ) : meta?.isLocked ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Liên kết đã bị khóa bảo vệ
                </div>
                <p>
                  Do nhập sai mật khẩu quá 5 lần, gói bàn giao đã tự động khóa để bảo vệ an toàn. Xin liên hệ Ban CNTT / KT&ĐBCL để mở khóa.
                </p>
              </div>
            ) : unlockedKey ? (
              /* SUCCESS STATE: RAW KEY REVEALED */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block mb-0.5">Giải mã thành công!</strong>
                    <span>Khóa kết nối API cho ứng dụng <strong>"{meta?.appName}"</strong> đã sẵn sàng sử dụng.</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-700">
                    <span>Khóa bí mật (API Secret Key):</span>
                    <span className="text-[11px] text-slate-400 font-normal">Chỉ lưu trữ an toàn</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={unlockedKey}
                      className="w-full px-3 py-3 pr-24 bg-slate-900 text-teal-300 font-mono text-xs rounded-lg border border-slate-700 select-all"
                    />
                    <button
                      onClick={() => handleCopy(unlockedKey)}
                      className="absolute right-2 top-2 px-3 py-1.5 rounded-md bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Đã sao chép
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Sao chép
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Curl Guide */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#00A19A]" />
                    Hướng dẫn cấu hình Header gọi API:
                  </div>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-[11px] overflow-x-auto">
                    <code>Authorization: Bearer {unlockedKey}</code>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <a
                    href="/api-docs.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#003B3A] hover:underline"
                  >
                    Xem tài liệu OpenAPI & Swagger <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              /* INPUT PASSCODE FORM */
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl text-xs text-slate-700 space-y-1">
                  <div className="font-semibold text-[#003B3A]">
                    Ứng dụng: <strong>{meta?.appName}</strong>
                  </div>
                  {meta?.recipientEmail && (
                    <div className="text-slate-500">
                      Người nhận: <span className="font-medium text-slate-700">{meta.recipientEmail}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-teal-100 flex items-center justify-between">
                    <span>Hạn nhận khóa: {meta?.expiresAt ? new Date(meta.expiresAt).toLocaleDateString("vi-VN") : "72 giờ"}</span>
                    <span className="font-semibold text-amber-800 tabular-nums">
                      {attemptsLeft !== null ? `Còn ${attemptsLeft} lượt thử` : ""}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Nhập Mật khẩu bảo vệ bàn giao (Passcode):
                  </label>
                  <div className="relative">
                    <input
                      type={showPasscode ? "text" : "password"}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Ví dụ: SL-849201 hoặc mã do Admin cấp..."
                      className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-xs font-mono focus:border-[#00A19A] focus:outline-hidden"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Mật khẩu này được Ban Quản trị gửi qua <strong>SMS / Zalo / Trực tiếp</strong> nhằm ngăn ngừa rủi ro lộ lọt khóa khi gửi qua email theo Nghị định 13/2023/NĐ-CP.
                  </p>
                </div>

                {unlockError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{unlockError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#003B3A] hover:bg-[#002B2A] text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    "Đang giải mã..."
                  ) : (
                    <>
                      Mở khóa & Xem API Key <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-400">
        Bản quyền © Sky-Line School • Hệ thống Giám sát & Quản trị Giáo dục SSM
      </footer>
    </div>
  )
}
