"use client";

import { useState } from "react";
import { X, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Đổi mật khẩu thất bại.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setSuccess(false);
        }, 2000);
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi đổi mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="bg-gradient-to-r from-[#1E8B87] to-[#135E5B] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Đổi mật khẩu</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-800">Thành công!</h4>
                <p className="text-slate-500 mt-2">Mật khẩu của bạn đã được thay đổi.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Mật khẩu cũ</label>
                <input 
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1E8B87] focus:ring-2 focus:ring-[#1E8B87]/20 transition-all outline-none"
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Mật khẩu mới</label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1E8B87] focus:ring-2 focus:ring-[#1E8B87]/20 transition-all outline-none"
                  placeholder="Nhập mật khẩu mới"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Xác nhận mật khẩu</label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1E8B87] focus:ring-2 focus:ring-[#1E8B87]/20 transition-all outline-none"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#1E8B87] hover:bg-[#135E5B] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Xác nhận"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
