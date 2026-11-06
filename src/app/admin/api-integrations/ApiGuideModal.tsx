"use client"

import React, { useState } from "react"
import {
  X,
  BookOpen,
  KeyRound,
  Shield,
  Terminal,
  Activity,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Lock,
  Cpu,
  Workflow,
  AlertTriangle
} from "lucide-react"

type ApiGuideTab = "workflow" | "curl_n8n" | "permissions" | "security"

export function ApiGuideModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<ApiGuideTab>("workflow")
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSnippet(id)
    setTimeout(() => setCopiedSnippet(null), 2500)
  }

  const sampleCurl = `curl -X GET "https://ssm.skylineschool.edu.vn/api/v1/students?page=1&limit=20" \\
  -H "Authorization: Bearer sky_live_9f8a3b2c1e4d5f6a7b8c9d0e1f2a3b4c" \\
  -H "Content-Type: application/json"`

  const sampleLogsCurl = `curl -X GET "https://ssm.skylineschool.edu.vn/api/v1/access-logs?limit=50&status_code=200" \\
  -H "Authorization: Bearer sky_live_9f8a3b2c1e4d5f6a7b8c9d0e1f2a3b4c" \\
  -H "Content-Type: application/json"`

  const sampleGradePost = `curl -X POST "https://ssm.skylineschool.edu.vn/api/v1/grades" \\
  -H "Authorization: Bearer sky_live_9f8a3b2c1e4d5f6a7b8c9d0e1f2a3b4c" \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentId": "std_123456",
    "subjectCode": "MATH_G10",
    "grade": 8.5,
    "term": "HK1",
    "academicYearId": "NH2026-2027",
    "evaluationType": "REGULAR",
    "notes": "Kiểm tra 15 phút đợt 1"
  }'`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header Masthead */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#003B3A] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-teal-300">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Sổ tay Hướng dẫn Tích hợp & Kết nối API SSM Sky-Line
                </h2>
                <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-teal-200 border border-teal-400/30">
                  Phiên bản 1.0
                </span>
              </div>
              <p className="text-xs text-teal-100/80">
                Quy chuẩn kết nối an toàn cho các ứng dụng đối tác, phần mềm chuyên môn và workflow n8n
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api-docs.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Mở Swagger/OpenAPI
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveTab("workflow")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "workflow"
                ? "border-[#003B3A] text-[#003B3A] bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Workflow className="h-4 w-4 text-[#00A19A]" />
            1. Quy trình 5 bước tích hợp
          </button>
          <button
            onClick={() => setActiveTab("curl_n8n")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "curl_n8n"
                ? "border-[#003B3A] text-[#003B3A] bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Terminal className="h-4 w-4 text-[#00A19A]" />
            2. Mẫu gọi cURL & n8n Workflow
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "permissions"
                ? "border-[#003B3A] text-[#003B3A] bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield className="h-4 w-4 text-[#00A19A]" />
            3. Phân quyền & Phạm vi cơ sở
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "security"
                ? "border-[#003B3A] text-[#003B3A] bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="h-4 w-4 text-[#00A19A]" />
            4. Bảo mật, Rate limit & Logs
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
          {/* TAB 1: WORKFLOW */}
          {activeTab === "workflow" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-teal-200/80 bg-teal-50/70 p-4">
                <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[#00A19A]" />
                  Tổng quan cơ chế kết nối Sky-Line SSM API
                </h3>
                <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                  Sky-Line SSM áp dụng tiêu chuẩn kết nối máy-máy (Machine-to-Machine) dựa trên <strong>API Key mật mã cấp cao (CSPRNG)</strong>. Khóa bí mật chỉ được sinh ra và hiển thị đầy đủ duy nhất 1 lần khi tạo, máy chủ chỉ lưu bản băm SHA-256 một chiều để bảo vệ an toàn tối đa cho dữ liệu học sinh và nhà trường.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#003B3A] text-white text-xs font-bold tabular-nums">
                      1
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Admin</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Tạo ứng dụng</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Vào trang này, bấm <strong>"Thêm ứng dụng mới"</strong>. Điền tên hệ thống đối tác, người phụ trách và chọn các quyền tối thiểu cần thiết.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00A19A] text-white text-xs font-bold tabular-nums">
                      2
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Khóa</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Sinh khóa API</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Bấm <strong>"Tạo khóa mới"</strong> tại ứng dụng vừa tạo. Hệ thống cấp một chuỗi khóa bí mật định dạng <code className="text-teal-700 font-mono text-[10px]">sky_live_...</code>.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white text-xs font-bold tabular-nums">
                      3
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Lưu trữ</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Lưu khóa an toàn</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Sao chép và lưu khóa vào file cấu hình bảo mật (<code className="text-[10px]">.env</code>) của ứng dụng gọi. Khóa sẽ không thể xem lại lần thứ hai.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold tabular-nums">
                      4
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Giao tiếp</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Gọi API</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Gửi kèm khóa trong HTTP Request Header: <br />
                    <code className="text-[10px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded font-mono">Authorization: Bearer &lt;KEY&gt;</code>
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700 text-white text-xs font-bold tabular-nums">
                      5
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Giám sát</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Giám sát & Thay khóa</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Theo dõi lịch sử truy cập qua nút <strong>"Nhật ký"</strong>. Hỗ trợ tạo khóa phụ để thay khóa luân phiên (Rotation) mà không gián đoạn dịch vụ.
                  </p>
                </div>
              </div>

              {/* Danh sách Endpoint API chính */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#00A19A]" />
                  Danh mục Endpoint API v1 sẵn sàng kết nối
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">GET/POST/PATCH</span>
                      <span className="font-mono font-bold text-slate-800">/api/v1/students</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Đọc danh sách, chi tiết học sinh; cập nhật thông tin học thuật và hồ sơ. SĐT/Email phụ huynh được che giấu nếu không có quyền liên hệ.</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">GET</span>
                      <span className="font-mono font-bold text-slate-800">/api/v1/students/:id/grades</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Bảng điểm tổng hợp theo học sinh: điểm thường xuyên các môn và điểm tổng kết học kỳ (Anti-IDOR Scope).</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">GET/POST/PATCH</span>
                      <span className="font-mono font-bold text-slate-800">/api/v1/teachers</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Danh bạ giáo viên, tra cứu theo cơ sở và tổ chuyên môn. Cập nhật hồ sơ chuyên môn và liên kết tài khoản.</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">GET</span>
                      <span className="font-mono font-bold text-slate-800">/api/v1/teachers/:id/assignments</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Lịch phân công giảng dạy chi tiết của giáo viên: danh sách lớp phụ trách, môn học và số tiết theo tuần.</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">GET/POST/PATCH</span>
                      <span className="font-mono font-bold text-slate-800">/api/v1/grades</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Đọc bảng điểm toàn lớp, ghi điểm số (kiểm tra thang điểm 0-10 và trạng thái khóa sổ điểm GradebookLock).</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800">GET/POST/PATCH</span>
                      <span className="font-mono font-bold text-slate-800">/api/v1/assignments</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Phân công giảng dạy toàn trường, nhiệm vụ học thuật theo giáo viên, lớp, môn và học kỳ.</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">GET/POST/PATCH</span>
                      <span className="font-mono font-bold text-slate-800">/api/v1/survey-results</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Kết quả khảo sát ý kiến, khảo thí định kỳ. Kết quả ghi vào giữ trạng thái Chờ duyệt.</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">GET</span>
                      <span className="font-mono font-bold text-slate-800">/api/v1/access-logs</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Tra cứu telemetry và nhật ký gọi API riêng của chính ứng dụng (thời gian, endpoint, mã HTTP, độ trễ ms, IP gọi).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CURL & N8N */}
          {activeTab === "curl_n8n" && (
            <div className="space-y-5">
              {/* cURL Snippet 1 */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-teal-400" />
                    <span className="font-semibold font-mono">Ví dụ 1: Đọc danh sách học sinh (cURL)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(sampleCurl, "curl1")}
                    className="flex items-center gap-1 text-[11px] bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded transition-colors text-slate-200"
                  >
                    {copiedSnippet === "curl1" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> Đã sao chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Sao chép
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                  <pre>{sampleCurl}</pre>
                </div>
              </div>

              {/* cURL Snippet 2 */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold font-mono">Ví dụ 2: Nhập điểm học sinh với kiểm tra khóa sổ (cURL)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(sampleGradePost, "curl2")}
                    className="flex items-center gap-1 text-[11px] bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded transition-colors text-slate-200"
                  >
                    {copiedSnippet === "curl2" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> Đã sao chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Sao chép
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                  <pre>{sampleGradePost}</pre>
                </div>
              </div>

              {/* cURL Snippet 3: Access Logs */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-400" />
                    <span className="font-semibold font-mono">Ví dụ 3: Lấy dữ liệu nhật ký truy cập để giám sát hệ thống (cURL)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(sampleLogsCurl, "curl3")}
                    className="flex items-center gap-1 text-[11px] bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded transition-colors text-slate-200"
                  >
                    {copiedSnippet === "curl3" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> Đã sao chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Sao chép
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                  <pre>{sampleLogsCurl}</pre>
                </div>
              </div>

              {/* Cấu hình n8n */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-[#00A19A]" />
                  Hướng dẫn cấu hình trong n8n Workflow Automation
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                    <span className="font-bold text-slate-800">1. Chọn Node:</span>
                    <p className="text-[11px] text-slate-600">Thêm node <strong>HTTP Request</strong> trong n8n canvas.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                    <span className="font-bold text-slate-800">2. Authentication:</span>
                    <p className="text-[11px] text-slate-600">Chọn <strong>Generic Credential Type → Header Auth</strong>. Điền <code className="text-teal-800">Authorization</code> với giá trị <code className="text-teal-800">Bearer sky_live_...</code>.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                    <span className="font-bold text-slate-800">3. Options & Retries:</span>
                    <p className="text-[11px] text-slate-600">Bật <em>Never Error</em> để bóc tách mã lỗi HTTP hoặc cấu hình <em>Retry On Fail</em> khi gặp mã 429.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PERMISSIONS */}
          {activeTab === "permissions" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Shield className="h-4 w-4 text-blue-700" />
                  Nguyên tắc Quyền Tối thiểu & Bảo vệ Quyền Riêng tư (Nghị định 13/2023/NĐ-CP)
                </div>
                <p className="text-blue-800 leading-relaxed">
                  Mỗi ứng dụng chỉ nên được cấp đúng các quyền cần thiết để vận hành. Nếu ứng dụng không được cấp quyền liên hệ (<code className="text-blue-900 font-bold font-mono">students:contact:read</code> / <code className="text-blue-900 font-bold font-mono">teachers:read</code>), hệ thống sẽ <strong>tự động che giấu số điện thoại và email</strong> (ví dụ: <code className="bg-blue-100 px-1 rounded font-mono">090*****89</code>) để ngăn ngừa lộ lọt dữ liệu nhạy cảm.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="px-4 py-3">Phân nhóm</th>
                      <th className="px-4 py-3">Mã quyền (Scope)</th>
                      <th className="px-4 py-3">Ý nghĩa nghiệp vụ & Bảo mật</th>
                      <th className="px-4 py-3">Hành động được phép</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {/* Học sinh */}
                    <tr className="bg-slate-50/30">
                      <td rowSpan={4} className="px-4 py-3 font-bold text-slate-800 align-top border-r border-slate-100">
                        🎓 Học sinh
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-700">students:profile:read</td>
                      <td className="px-4 py-2.5">Đọc hồ sơ cơ bản học sinh</td>
                      <td className="px-4 py-2.5">Tra cứu danh sách, mã HS, ngày sinh, khối, lớp (SĐT/email PHHS bị che)</td>
                    </tr>
                    <tr className="bg-slate-50/30">
                      <td className="px-4 py-2.5 font-mono font-bold text-amber-700">students:contact:read</td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-amber-900">Đọc liên hệ PHHS & địa chỉ</span>
                        <span className="ml-1 text-[10px] text-amber-800 bg-amber-100 px-1 py-0.5 rounded font-bold">PII NĐ 13/2023</span>
                      </td>
                      <td className="px-4 py-2.5">Xem đầy đủ số điện thoại và email phụ huynh để đồng bộ liên lạc</td>
                    </tr>
                    <tr className="bg-slate-50/30">
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">students:profile:write</td>
                      <td className="px-4 py-2.5">Cập nhật hồ sơ học sinh</td>
                      <td className="px-4 py-2.5">Thêm học sinh mới hoặc chỉnh sửa họ tên, ngày sinh, giới tính, lớp, cơ sở</td>
                    </tr>
                    <tr className="bg-slate-50/30">
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-600">students:read / write</td>
                      <td className="px-4 py-2.5 text-slate-500">Toàn quyền học sinh (Legacy)</td>
                      <td className="px-4 py-2.5 text-slate-500">Tương thích ngược các ứng dụng đối tác cũ</td>
                    </tr>

                    {/* Giáo viên */}
                    <tr>
                      <td rowSpan={4} className="px-4 py-3 font-bold text-slate-800 align-top border-r border-slate-100">
                        👨‍🏫 Giáo viên
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-teal-700">teachers:directory:read</td>
                      <td className="px-4 py-2.5">Đọc danh bạ giáo viên</td>
                      <td className="px-4 py-2.5">Xem mã GV, họ tên, email trường, tổ chuyên môn, môn phụ trách chính</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono font-bold text-teal-700">teachers:assignments:read</td>
                      <td className="px-4 py-2.5">Đọc lịch phân công giáo viên</td>
                      <td className="px-4 py-2.5">Xem chi tiết các lớp dạy, môn dạy và số tiết chuyên môn của giáo viên</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">teachers:profile:write</td>
                      <td className="px-4 py-2.5">Cập nhật thông tin giáo viên</td>
                      <td className="px-4 py-2.5">Thêm mới GV, cập nhật email trường, tổ chuyên môn, môn giảng dạy chính</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-600">teachers:read / write</td>
                      <td className="px-4 py-2.5 text-slate-500">Toàn quyền giáo viên (Legacy)</td>
                      <td className="px-4 py-2.5 text-slate-500">Bao gồm toàn bộ quyền đọc/ghi hồ sơ và phân công giáo viên</td>
                    </tr>

                    {/* Điểm số & Chuyên môn */}
                    <tr className="bg-slate-50/30">
                      <td rowSpan={2} className="px-4 py-3 font-bold text-slate-800 align-top border-r border-slate-100">
                        📊 Điểm & Sổ điểm
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-700">grades:read</td>
                      <td className="px-4 py-2.5">Đọc bảng điểm số</td>
                      <td className="px-4 py-2.5">Xem điểm thường xuyên, giữa kỳ, cuối kỳ của học sinh theo môn và lớp</td>
                    </tr>
                    <tr className="bg-slate-50/30">
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">grades:write</td>
                      <td className="px-4 py-2.5">Ghi điểm & sửa điểm</td>
                      <td className="px-4 py-2.5">Nhập điểm (tự động khóa nếu kỳ điểm đã đóng sổ GradebookLock)</td>
                    </tr>

                    {/* Phân công trường */}
                    <tr>
                      <td rowSpan={2} className="px-4 py-3 font-bold text-slate-800 align-top border-r border-slate-100">
                        📋 Phân công trường
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-700">assignments:read</td>
                      <td className="px-4 py-2.5">Đọc phân công toàn trường</td>
                      <td className="px-4 py-2.5">Xem toàn bộ danh sách phân công lớp và môn học của trường</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">assignments:write</td>
                      <td className="px-4 py-2.5">Ghi phân công giảng dạy</td>
                      <td className="px-4 py-2.5">Gán nhiệm vụ giảng dạy hoặc phân công khảo thí cho giáo viên</td>
                    </tr>

                    {/* Khảo sát & ĐBCL */}
                    <tr className="bg-slate-50/30">
                      <td rowSpan={2} className="px-4 py-3 font-bold text-slate-800 align-top border-r border-slate-100">
                        📈 Khảo sát & ĐBCL
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-700">survey-results:read</td>
                      <td className="px-4 py-2.5">Đọc kết quả khảo sát</td>
                      <td className="px-4 py-2.5">Tra cứu dữ liệu khảo sát ý kiến, khảo sát đầu vào, phản hồi</td>
                    </tr>
                    <tr className="bg-slate-50/30">
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">survey-results:write</td>
                      <td className="px-4 py-2.5">Nạp kết quả khảo sát</td>
                      <td className="px-4 py-2.5">Ghi nhận câu trả lời khảo sát (giữ trạng thái Đã nộp/SUBMITTED)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-600" />
                  Bảo vệ Phạm vi Cơ sở (Anti-IDOR Security)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nếu một ứng dụng chỉ được cấu hình cho Cơ sở <strong>Sky-Line Riverside (CP01)</strong>, dù ứng dụng có cố tình truyền mã học sinh hoặc bản ghi thuộc <strong>Sky-Line Hill (CP03)</strong>, hệ thống sẽ lập tức từ chối với mã lỗi <code className="text-rose-600 font-bold font-mono">403 Forbidden</code> và ghi nhận sự cố vào nhật ký an ninh.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & LOGS */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-teal-600" />
                    Giới hạn tần suất gọi (Rate Limiting)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mỗi ứng dụng có hạn mức số yêu cầu/phút (RPM). Mặc định là <strong>60 yêu cầu/phút</strong>. Nếu vượt quá, máy chủ trả về mã HTTP <code className="text-amber-700 font-mono font-bold">429 Too Many Requests</code> kèm header <code className="text-slate-800 font-mono">Retry-After</code>.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Thu hồi Khóa khẩn cấp (Emergency Revocation)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nếu nghi ngờ khóa bị lộ, Quản trị viên có thể bấm <strong>"Thu hồi khóa"</strong> ngay lập tức. Toàn bộ các yêu cầu tiếp theo sử dụng khóa đó sẽ bị máy chủ từ chối ngay tức thì mà không cần khởi động lại dịch vụ.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-600" />
                  Mã phản hồi HTTP chuẩn hóa của hệ thống
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-2">
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">200 / 201</span>
                    <span className="text-slate-600">Thành công, trả về dữ liệu hoặc tạo bản ghi mới.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-2">
                    <span className="font-mono font-bold text-rose-700 tabular-nums">401 Unauthorized</span>
                    <span className="text-slate-600">Khóa không hợp lệ, hết hạn hoặc đã bị thu hồi.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-2">
                    <span className="font-mono font-bold text-amber-700 tabular-nums">403 Forbidden</span>
                    <span className="text-slate-600">Không có quyền thao tác hoặc ngoài phạm vi cơ sở.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-2">
                    <span className="font-mono font-bold text-slate-700 tabular-nums">404 Not Found</span>
                    <span className="text-slate-600">Không tìm thấy bản ghi hoặc đối tượng yêu cầu.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-2">
                    <span className="font-mono font-bold text-teal-800 tabular-nums">409 Conflict</span>
                    <span className="text-slate-600">Xung đột phiên bản dữ liệu hoặc sổ điểm đã khóa.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-2">
                    <span className="font-mono font-bold text-amber-800 tabular-nums">429 Rate Limit</span>
                    <span className="text-slate-600">Vượt quá tần suất gọi API cho phép trong 1 phút.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Cần hỗ trợ kỹ thuật chuyên sâu? Liên hệ: <strong className="text-slate-700">Ban Công nghệ Thông tin Sky-Line</strong>
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Đóng sổ tay
          </button>
        </div>
      </div>
    </div>
  )
}
