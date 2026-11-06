"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  KeyRound,
  FileCheck,
  Layers,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  Sliders,
  Check,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface ProviderInfo {
  code: string;
  name: string;
  vendor: string;
  description: string;
  isMock: boolean;
  supportedAuthTypes: string[];
}

export function AdminDigitalSignatureConfigClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Config form state
  const [isEnabled, setIsEnabled] = useState(true);
  const [activeProvider, setActiveProvider] = useState("MOCK_SANDBOX");
  const [allowedProviders, setAllowedProviders] = useState<string[]>([]);
  const [providerSettings, setProviderSettings] = useState<Record<string, any>>({});
  const [applicableForms, setApplicableForms] = useState<string[]>([]);
  const [signingOrder, setSigningOrder] = useState<string[]>(["GVBM", "GVCN", "TTCM", "GDCS"]);
  const [requirePreviousSigns, setRequirePreviousSigns] = useState(false);
  const [autoPublishOnCompleted, setAutoPublishOnCompleted] = useState(false);
  const [campusScope, setCampusScope] = useState<string[]>(["*"]);
  const [academicYearScope, setAcademicYearScope] = useState<string[]>(["*"]);

  // Available metadata
  const [availableProviders, setAvailableProviders] = useState<ProviderInfo[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Load config
  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/digital-signature/config");
      if (!res.ok) throw new Error("Không thể tải cấu hình chữ ký số");
      const data = await res.json();

      const cfg = data.config;
      setIsEnabled(cfg.isEnabled);
      setActiveProvider(cfg.activeProvider || "MOCK_SANDBOX");
      setAllowedProviders(cfg.allowedProviders || []);
      setProviderSettings(cfg.providerSettings || {});
      setApplicableForms(cfg.applicableForms || []);
      setSigningOrder(cfg.signingFlowRules?.order || ["GVBM", "GVCN", "TTCM", "GDCS"]);
      setRequirePreviousSigns(Boolean(cfg.signingFlowRules?.requirePreviousSigns));
      setAutoPublishOnCompleted(Boolean(cfg.autoPublishOnCompleted));
      setCampusScope(cfg.campusScope || ["*"]);
      setAcademicYearScope(cfg.academicYearScope || ["*"]);

      setAvailableProviders(data.availableProviders || []);
      setCampuses(data.campuses || []);
      setAcademicYears(data.academicYears || []);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải cấu hình");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Save config
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/digital-signature/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled,
          activeProvider,
          allowedProviders,
          providerSettings,
          applicableForms,
          signingFlowRules: {
            order: signingOrder,
            requirePreviousSigns,
          },
          autoPublishOnCompleted,
          campusScope,
          academicYearScope,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu cấu hình");

      toast.success(data.message || "Đã lưu cấu hình Chữ ký số thành công!");
      await loadConfig();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };

  // Test provider connection
  const handleTestProvider = async (code: string) => {
    try {
      setTestingProvider(code);
      const settings = providerSettings[code] || {};
      const res = await fetch("/api/admin/digital-signature/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST_PROVIDER",
          providerCode: code,
          settings,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`[${code}] ${data.message} (${data.responseTimeMs}ms)`);
      } else {
        toast.error(`[${code}] ${data.message}`);
      }
    } catch (err: any) {
      toast.error("Lỗi khi kiểm tra kết nối");
    } finally {
      setTestingProvider(null);
    }
  };

  const handleToggleForm = (formCode: string) => {
    setApplicableForms((prev) =>
      prev.includes(formCode) ? prev.filter((f) => f !== formCode) : [...prev, formCode]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] text-slate-500 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#00A19A]" />
        <span className="text-xs font-medium">Đang tải cấu hình chữ ký số...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Masthead Header - Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs border-l-4 border-[#003B3A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-[#00A19A] tracking-wider uppercase">
                Quản trị Hệ thống Sky-Line
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Cấu hình Chữ ký số & Nhà cung cấp CA
              </span>
            </div>
            <h1 className="text-xl font-black text-[#003B3A] tracking-tight">
              Cấu hình Chữ ký số Hệ thống
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản trị kết nối các nhà cung cấp chữ ký số từ xa, quy chuẩn biểu mẫu học thuật và thứ tự phê duyệt điện tử.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] transition-all shadow-xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-teal-300" />
                  Lưu cấu hình
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: TRẠNG THÁI & NHÀ CUNG CẤP CHỦ ĐẠO */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#00A19A]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#003B3A]">Kích hoạt & Nhà cung cấp chính</h2>
              <p className="text-[11px] text-slate-400">Trạng thái vận hành và cổng chứng thư mặc định</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003B3A]"></div>
            <span className="ml-2 text-xs font-bold text-slate-700">
              {isEnabled ? "Đang bật chữ ký số" : "Tạm khóa tính năng"}
            </span>
          </label>
        </div>

        {/* Danh sách nhà cung cấp */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableProviders.map((prov) => {
            const isActive = activeProvider === prov.code;
            const isAllowed = allowedProviders.includes(prov.code);

            return (
              <div
                key={prov.code}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? "border-[#003B3A] bg-teal-50/20 ring-2 ring-teal-100"
                    : isAllowed
                    ? "border-slate-300 bg-white"
                    : "border-slate-200 bg-slate-50 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">{prov.name}</span>
                  {prov.isMock && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      MÔ PHỎNG / DEV
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 mb-3 line-clamp-2">{prov.description}</div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveProvider(prov.code)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      isActive
                        ? "bg-[#003B3A] text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isActive ? "✓ Đang chọn" : "Đặt mặc định"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestProvider(prov.code)}
                    disabled={testingProvider === prov.code}
                    className="text-[11px] font-bold text-[#00A19A] hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {testingProvider === prov.code ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : null}
                    Kiểm tra kết nối
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: BIỂU MẪU ÁP DỤNG & QUY TRÌNH PHÊ DUYỆT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biểu mẫu áp dụng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#00A19A]">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#003B3A]">Loại biểu mẫu áp dụng</h2>
              <p className="text-[11px] text-slate-400">Chọn các loại hồ sơ học sinh bắt buộc ký số</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { code: "HO_SO_NANG_LUC", name: "Hồ sơ Năng lực Học sinh (K12)" },
              { code: "PHIEU_DANH_GIA_MON_HOC", name: "Phiếu Nhận xét & Đánh giá Môn học Định kỳ" },
              { code: "PHIEU_DANH_GIA_MAM_NON", name: "Phiếu Đánh giá Sự Phát triển Mầm non" },
              { code: "CAM_KET_HOC_TAP", name: "Bản Cam kết Học tập & Rèn luyện" },
            ].map((f) => {
              const checked = applicableForms.includes(f.code);
              return (
                <label
                  key={f.code}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleForm(f.code)}
                    className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A]"
                  />
                  <span className="font-semibold text-slate-800">{f.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Thứ tự ký số & Điều kiện hoàn tất */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#00A19A]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#003B3A]">Quy tắc & Thứ tự ký</h2>
              <p className="text-[11px] text-slate-400">Thứ tự các bên ký xác thực và chính sách công bố</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-2">Thứ tự ký số chuẩn (Đa chữ ký):</label>
              <div className="flex items-center gap-2 flex-wrap">
                {signingOrder.map((role, idx) => (
                  <div key={role} className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-slate-200 font-bold text-slate-800 tabular-nums">
                      {idx + 1}. {role}
                    </span>
                    {idx < signingOrder.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePreviousSigns}
                  onChange={(e) => setRequirePreviousSigns(e.target.checked)}
                  className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A] mt-0.5"
                />
                <span className="text-slate-700 font-medium">
                  Bắt buộc hoàn thành chữ ký của vai trò trước mới cho phép vai trò sau tiến hành ký số.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPublishOnCompleted}
                  onChange={(e) => setAutoPublishOnCompleted(e.target.checked)}
                  className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A] mt-0.5"
                />
                <div>
                  <span className="text-slate-700 font-medium">
                    Tự động công bố tới Phụ huynh & Học sinh ngay sau khi hoàn tất đủ chữ ký.
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">
                    (Khuyến nghị: Tắt để áp dụng luồng phê duyệt và công bố chủ động từ Ban KT&ĐBCL)
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
