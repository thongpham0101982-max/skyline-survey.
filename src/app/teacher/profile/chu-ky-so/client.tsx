"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  KeyRound,
  FileCheck,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  PenTool,
  Download,
  Info,
  Building2,
  UserCheck,
  Calendar,
  Lock,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface ProfileData {
  teacher: {
    id: string;
    teacherCode: string;
    teacherName: string;
    campusName: string;
    campusId: string;
    position: string;
  };
  profile: {
    provider: string;
    connectionStatus: "NOT_CONNECTED" | "CONNECTED" | "EXPIRED" | "REVOKED";
    subjectDn: string | null;
    serialNumber: string | null;
    issuer: string | null;
    validFrom: string | null;
    validTo: string | null;
    lastVerifiedAt: string | null;
    visualAppearanceUrl: string | null;
    appearanceType: "DRAWN" | "UPLOADED";
    appearanceVersion: number;
    signatureRoleText: string | null;
  };
}

export function TeacherSignatureProfileClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);

  // Connection form state
  const [selectedProvider, setSelectedProvider] = useState<string>("MOCK_SANDBOX");
  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Visual appearance state
  const [mode, setMode] = useState<"DRAW" | "UPLOAD">("DRAW");
  const [drawnUrl, setDrawnUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [roleText, setRoleText] = useState<string>("Giáo viên Bộ môn");
  const [savingAppearance, setSavingAppearance] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnStroke, setHasDrawnStroke] = useState(false);

  // Fetch initial profile data
  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teacher/digital-signature/profile");
      if (!res.ok) throw new Error("Không thể tải thông tin chữ ký số");
      const json: ProfileData = await res.json();
      setData(json);
      setSelectedProvider(json.profile.provider !== "NOT_CONFIGURED" ? json.profile.provider : "MOCK_SANDBOX");
      setRoleText(json.profile.signatureRoleText || (json.teacher.position?.includes("CN") ? "Giáo viên Chủ nhiệm" : "Giáo viên Bộ môn"));
      if (json.profile.visualAppearanceUrl) {
        if (json.profile.appearanceType === "UPLOADED") {
          setUploadedUrl(json.profile.visualAppearanceUrl);
          setMode("UPLOAD");
        } else {
          setDrawnUrl(json.profile.visualAppearanceUrl);
          setMode("DRAW");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải thông tin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (mode === "DRAW" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#003B3A"; // Sky-Line Deep Pine ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [mode]);

  // Canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawnStroke(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      setDrawnUrl(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnUrl(null);
    setHasDrawnStroke(false);
  };

  // Upload file handler with thorough validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Check type
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Vui lòng chọn tệp hình ảnh có định dạng PNG, JPG hoặc WebP.");
      return;
    }

    // 2. Check size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Kích thước tệp vượt quá 2MB. Vui lòng chọn tệp nhỏ hơn.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedUrl(result);
      toast.success("Đã tải ảnh nét chữ ký thành công.");
    };
    reader.onerror = () => {
      toast.error("Không thể đọc tệp hình ảnh.");
    };
    reader.readAsDataURL(file);
  };

  // Save visual appearance
  const handleSaveAppearance = async () => {
    const activeUrl = mode === "DRAW" ? drawnUrl : uploadedUrl;
    if (!activeUrl) {
      toast.error("Vui lòng ký tay hoặc tải lên hình ảnh nét chữ ký trước khi lưu.");
      return;
    }

    try {
      setSavingAppearance(true);
      const res = await fetch("/api/teacher/digital-signature/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualAppearanceUrl: activeUrl,
          appearanceType: mode === "DRAW" ? "DRAWN" : "UPLOADED",
          signatureRoleText: roleText,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể lưu mẫu chữ ký");

      toast.success(json.message || "Đã lưu mẫu chữ ký thành công!");
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu mẫu");
    } finally {
      setSavingAppearance(false);
    }
  };

  // Connect or Verify CA certificate
  const handleConnectProvider = async (action: "CONNECT" | "DISCONNECT") => {
    try {
      if (action === "CONNECT") setConnecting(true);
      else setVerifying(true);

      const res = await fetch("/api/teacher/digital-signature/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          providerCode: selectedProvider,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Thao tác không thành công");

      toast.success(json.message);
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối chữ ký số");
    } finally {
      setConnecting(false);
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] text-slate-500 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#00A19A]" />
        <span className="text-xs font-medium">Đang tải hồ sơ chữ ký số...</span>
      </div>
    );
  }

  const teacher = data?.teacher;
  const profile = data?.profile;
  const isConnected = profile?.connectionStatus === "CONNECTED";
  const activeAppearanceUrl = mode === "DRAW" ? drawnUrl : uploadedUrl;

  return (
    <div className="space-y-6">
      {/* Masthead Header - Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs border-l-4 border-[#003B3A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-[#00A19A] tracking-wider uppercase">
                Hệ thống Giáo dục Sky-Line
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Sổ cái Chứng thư Chuyên môn
              </span>
            </div>
            <h1 className="text-xl font-black text-[#003B3A] tracking-tight">
              Chữ ký số cá nhân của tôi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Thiết lập kết nối chứng thư số từ xa và mẫu hiển thị chữ ký phục vụ ký duyệt hồ sơ học sinh theo phân công.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tabular-nums ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đã kết nối chứng thư CA
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Chưa kết nối chứng thư
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (5 cols) — KẾT NỐI CHỨNG THƯ SỐ */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#00A19A]">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#003B3A]">Kết nối chữ ký số</h2>
                <p className="text-[11px] text-slate-400">Thông tin chứng thư số và nhà cung cấp CA</p>
              </div>
            </div>

            {/* Thông tin giáo viên từ tài khoản */}
            <div className="space-y-3 bg-[#F8FAFC] border border-slate-200/70 rounded-xl p-3.5 text-xs text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Giáo viên:</span>
                <span className="font-bold text-slate-900">{teacher?.teacherName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mã nhân sự:</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {teacher?.teacherCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Cơ sở:</span>
                <span className="font-medium text-slate-900">{teacher?.campusName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chức vụ / Vị trí:</span>
                <span className="font-medium text-slate-900">{teacher?.position || "Giáo viên"}</span>
              </div>
            </div>

            {/* Chọn nhà cung cấp CA */}
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nhà cung cấp chứng thư số</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={isConnected}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A] disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="MOCK_SANDBOX">Cổng Mô phỏng Kiểm thử [SANDBOX-DEV]</option>
                <option value="VNPT_SMARTCA">VNPT SmartCA (Ký số từ xa đám mây)</option>
                <option value="VIETTEL_CA">Viettel-CA Cloud PKI (MySign)</option>
                <option value="MISA_ESIGN">MISA eSign Remote Signing</option>
                <option value="FPT_CA">FPT-CA Cloud Public CA</option>
              </select>
              <p className="text-[10px] text-slate-400 italic">
                * Chỉ chọn nhà cung cấp đã được Admin cấp phép và tích hợp với hệ thống Sky-Line.
              </p>
            </div>

            {/* Chi tiết chứng thư số */}
            {isConnected ? (
              <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-bold text-emerald-800 text-[11px] pb-1 border-b border-emerald-200/60">
                  <span>CHỨNG THƯ ĐANG HOẠT ĐỘNG</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white">Hợp lệ</span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Chủ thể chứng thư (Subject DN):</div>
                  <div className="font-mono text-[11px] text-slate-800 break-all bg-white/70 p-1.5 rounded border border-emerald-200/50 mt-0.5">
                    {profile?.subjectDn || "Chưa có thông tin"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Số sê-ri:</div>
                    <div className="font-mono text-[11px] font-bold text-slate-900 truncate">
                      {profile?.serialNumber || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Tổ chức cấp:</div>
                    <div className="text-[11px] font-bold text-slate-900 truncate">
                      {profile?.issuer || "Sky-Line CA"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/50 text-[10px] text-slate-500">
                  <div>
                    Hiệu lực từ:{" "}
                    <b className="tabular-nums text-slate-700">
                      {profile?.validFrom ? new Date(profile.validFrom).toLocaleDateString("vi-VN") : "N/A"}
                    </b>
                  </div>
                  <div>
                    Đến ngày:{" "}
                    <b className="tabular-nums text-slate-700">
                      {profile?.validTo ? new Date(profile.validTo).toLocaleDateString("vi-VN") : "N/A"}
                    </b>
                  </div>
                </div>
                {profile?.lastVerifiedAt && (
                  <div className="text-[10px] text-slate-400 text-right italic">
                    Kiểm tra gần nhất: {new Date(profile.lastVerifiedAt).toLocaleString("vi-VN")}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                <Lock className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <div>Chưa có chứng thư số nào được liên kết với tài khoản này.</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Bấm nút <b>Kết nối chứng thư</b> bên dưới để tra cứu và kích hoạt chứng thư số.
                </div>
              </div>
            )}

            {/* Nhóm nút hành động kết nối */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
              {!isConnected ? (
                <button
                  onClick={() => handleConnectProvider("CONNECT")}
                  disabled={connecting}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] transition-all shadow-xs disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang kết nối...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Kết nối chứng thư
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleConnectProvider("CONNECT")}
                    disabled={connecting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#003B3A] bg-teal-50 hover:bg-teal-100 transition-all border border-teal-200 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${connecting ? "animate-spin" : ""}`} />
                    Kiểm tra kết nối
                  </button>
                  <button
                    onClick={() => handleConnectProvider("DISCONNECT")}
                    disabled={verifying}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all border border-rose-200 disabled:opacity-50"
                  >
                    Ngắt kết nối
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (7 cols) — MẪU HIỂN THỊ CHỮ KÝ */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#00A19A]">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#003B3A]">Mẫu hiển thị chữ ký</h2>
                  <p className="text-[11px] text-slate-400">
                    Hình ảnh nét ký và khối dấu hiển thị trên các văn bản học thuật
                  </p>
                </div>
              </div>

              {/* Segmented Control Chuyển Ký tay / Tải ảnh */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMode("DRAW")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mode === "DRAW" ? "bg-white text-[#003B3A] shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Ký trên màn hình
                </button>
                <button
                  type="button"
                  onClick={() => setMode("UPLOAD")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mode === "UPLOAD" ? "bg-white text-[#003B3A] shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tải ảnh PNG
                </button>
              </div>
            </div>

            {/* Khu vực tạo nét ký */}
            {mode === "DRAW" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Dùng chuột hoặc ngón tay để vẽ chữ ký vào khung dưới:</span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa nét ký
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center relative touch-none">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[160px] cursor-crosshair bg-white"
                  />
                  {!hasDrawnStroke && !drawnUrl && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs italic">
                      Ký tên tại đây (Nét mực xanh Sky-Line Deep Pine)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 hover:bg-teal-50/30 transition-all">
                  <Upload className="w-8 h-8 mx-auto text-[#00A19A] mb-2" />
                  <div className="text-xs font-bold text-slate-700">Tải tệp ảnh chữ ký trong suốt (PNG)</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Định dạng khuyến nghị: PNG nền trong suốt, dung lượng tối đa 2MB.
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    className="mt-3 block w-full max-w-xs mx-auto text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#003B3A] file:text-white hover:file:bg-[#002B2A] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Nhãn vai trò hiển thị */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhãn vai trò hiển thị
                </label>
                <input
                  type="text"
                  value={roleText}
                  onChange={(e) => setRoleText(e.target.value)}
                  placeholder="Ví dụ: Giáo viên Bộ môn Toán"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phiên bản mẫu chữ ký
                </label>
                <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 rounded-xl px-3 py-2 border border-slate-200 flex items-center justify-between">
                  <span>v{profile?.appearanceVersion || 1}.0</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tự động tăng khi lưu mới</span>
                </div>
              </div>
            </div>

            {/* KHỐI XEM TRƯỚC MẪU CHỮ KÝ TRÊN VĂN BẢN (Preview Stamp Card) */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#003B3A] uppercase tracking-wide">
                  Xem trước khối chữ ký hiển thị trên tài liệu:
                </span>
                <span className="text-[10px] text-slate-400 italic">Mẫu tiêu chuẩn A4 Sky-Line</span>
              </div>

              <div className="max-w-[280px] mx-auto border border-slate-300 rounded-xl p-3.5 bg-[#F8FAFC] text-center shadow-xs">
                <div className="text-[11px] font-bold text-[#003B3A] uppercase mb-1">
                  {roleText || "Giáo viên Bộ môn"}
                </div>

                <div className="h-16 flex items-center justify-center my-1 bg-white/60 rounded border border-dashed border-slate-200">
                  {activeAppearanceUrl ? (
                    <img
                      src={activeAppearanceUrl}
                      alt="Nét chữ ký"
                      className="max-h-14 max-w-[200px] object-contain"
                    />
                  ) : (
                    <span className="text-xs font-cursive text-slate-400 italic">
                      [Chưa có hình chữ ký]
                    </span>
                  )}
                </div>

                <div className="text-xs font-black text-slate-900 mt-1">
                  {teacher?.teacherName}
                </div>

                <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-[9px] text-left text-slate-500 leading-tight space-y-0.5">
                  <div className="text-[#00A19A] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    ĐÃ KÝ SỐ ĐIỆN TỬ
                  </div>
                  <div>Thời điểm: <b>[Thời gian ký thực tế]</b></div>
                  <div>Chứng thư: <b>{profile?.serialNumber || "Số sê-ri xác thực"}</b></div>
                </div>
              </div>
            </div>

            {/* Nút lưu mẫu hiển thị */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 italic max-w-sm">
                * Thay đổi mẫu chữ ký chỉ áp dụng cho các lượt ký sau; tuyệt đối không làm thay đổi các tài liệu đã ký trước đó.
              </div>

              <button
                type="button"
                onClick={handleSaveAppearance}
                disabled={savingAppearance || !activeAppearanceUrl}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] transition-all shadow-xs disabled:opacity-50"
              >
                {savingAppearance ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang lưu mẫu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
                    Lưu mẫu hiển thị
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
