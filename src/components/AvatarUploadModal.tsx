"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  RotateCcw,
} from "lucide-react";

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  currentAvatarUrl: string | null;
  onAvatarUpdated: (newAvatarUrl: string | null) => void;
}

const OUTPUT_SIZE = 320;

export function AvatarUploadModal({
  isOpen,
  onClose,
  userName = "Giáo viên",
  userEmail = "",
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarUploadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const initial = userName ? userName.trim().charAt(0).toUpperCase() : "G";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSourceImage(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setPreviewDataUrl(null);
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  // Render cropped square avatar whenever sourceImage, zoom, or offset changes
  const renderCroppedPreview = useCallback(() => {
    if (!sourceImage) return;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const imgW = sourceImage.naturalWidth || sourceImage.width;
    const imgH = sourceImage.naturalHeight || sourceImage.height;
    const baseScale = Math.max(OUTPUT_SIZE / imgW, OUTPUT_SIZE / imgH);
    const finalScale = baseScale * zoom;

    const drawW = imgW * finalScale;
    const drawH = imgH * finalScale;

    // Clamp offset so image always covers the square
    const maxOffsetX = Math.max(0, (drawW - OUTPUT_SIZE) / 2);
    const maxOffsetY = Math.max(0, (drawH - OUTPUT_SIZE) / 2);
    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y));

    const dx = (OUTPUT_SIZE - drawW) / 2 + clampedX;
    const dy = (OUTPUT_SIZE - drawH) / 2 + clampedY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sourceImage, dx, dy, drawW, drawH);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreviewDataUrl(dataUrl);
  }, [sourceImage, zoom, offset]);

  useEffect(() => {
    renderCroppedPreview();
  }, [renderCroppedPreview]);

  if (!isOpen || !mounted) return null;

  const handleFileSelect = (file: File | null | undefined) => {
    if (!file) return;
    setError("");
    setSuccessMsg("");

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError("Định dạng tệp không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Kích thước ảnh gốc tối đa 10MB. Vui lòng chọn ảnh nhẹ hơn.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== "string") return;
      const img = new Image();
      img.onload = () => {
        setSourceImage(img);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      };
      img.onerror = () => {
        setError("Không thể đọc tệp ảnh này. Vui lòng thử ảnh khác.");
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sourceImage) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !sourceImage) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSaveAvatar = async () => {
    if (!previewDataUrl) {
      setError("Vui lòng chọn một ảnh từ thiết bị trước khi lưu.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: previewDataUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Không thể lưu ảnh đại diện.");
        return;
      }

      onAvatarUpdated(data.avatarUrl);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ssm:avatar-updated", {
            detail: { avatarUrl: data.avatarUrl },
          })
        );
      }

      setSuccessMsg("Đã cập nhật ảnh đại diện thành công!");
      setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setError("Có lỗi kết nối khi lưu ảnh đại diện.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/avatar", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Không thể gỡ ảnh đại diện.");
        return;
      }

      onAvatarUpdated(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ssm:avatar-updated", {
            detail: { avatarUrl: null },
          })
        );
      }

      setSourceImage(null);
      setPreviewDataUrl(null);
      setSuccessMsg("Đã gỡ ảnh đại diện về mặc định.");
      setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setError("Có lỗi kết nối khi gỡ ảnh đại diện.");
    } finally {
      setLoading(false);
    }
  };

  const activeDisplayAvatar = previewDataUrl || currentAvatarUrl;

  const modalJSX = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
        {/* Header — Sky-Line Deep Pine */}
        <div className="bg-[#003B3A] px-5 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/15 rounded-xl">
              <Camera className="w-5 h-5 text-[#5EEAD4]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white leading-tight">
                Ảnh đại diện cá nhân
              </h3>
              <p className="text-[11px] text-teal-100/80 mt-0.5">
                Hiển thị trên thanh công cụ và Không gian Giáo viên
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Hidden canvas for square crop rendering */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              handleFileSelect(file);
              e.target.value = "";
            }}
          />

          {/* Interactive Avatar Preview & Crop Area */}
          <div className="flex flex-col items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-md bg-gradient-to-tr from-[#003B3A] to-[#00A19A] flex items-center justify-center select-none ${
                sourceImage ? "cursor-grab active:cursor-grabbing" : ""
              }`}
              title={sourceImage ? "Kéo để căn chỉnh vị trí ảnh" : "Ảnh đại diện hiện tại"}
            >
              {activeDisplayAvatar ? (
                <img
                  src={activeDisplayAvatar}
                  alt={userName}
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <span className="text-4xl font-extrabold text-white">{initial}</span>
              )}
            </div>

            <div className="mt-3 text-center">
              <p className="text-sm font-bold text-slate-900">{userName}</p>
              {userEmail && (
                <p className="text-[11px] font-medium text-slate-500 tabular-nums mt-0.5">
                  {userEmail}
                </p>
              )}
            </div>

            {/* Zoom & Reset Controls when a new photo is loaded */}
            {sourceImage && (
              <div className="w-full mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                    <ZoomIn className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>Thu phóng & kéo ảnh để căn khung</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                    className="inline-flex items-center gap-1 text-[#00736E] hover:underline font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt lại</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={2.5}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom( parseFloat(e.target.value) || 1 )}
                    className="flex-1 accent-[#003B3A] cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-slate-600 tabular-nums w-10 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Upload Trigger / Dropzone */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#00A19A] bg-[#F0FDFA]/60 hover:bg-[#F0FDFA] text-[#003B3A] font-semibold transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#00A19A]" />
              <span>{sourceImage ? "Chọn ảnh khác từ máy" : "Tải ảnh lên từ thiết bị"}</span>
            </button>

            {currentAvatarUrl && !sourceImage && (
              <button
                type="button"
                disabled={loading}
                onClick={handleRemoveAvatar}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 text-rose-700 font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Gỡ ảnh</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Hỗ trợ định dạng <strong>JPG, PNG, WebP</strong>. Hệ thống tự động chuẩn hóa kích thước khung tròn vuông sắc nét.
          </p>

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveAvatar}
              disabled={loading || !previewDataUrl}
              className="px-5 py-2 rounded-xl font-bold text-white bg-[#003B3A] hover:bg-[#005250] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4]" />
                  <span>Lưu ảnh đại diện</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
