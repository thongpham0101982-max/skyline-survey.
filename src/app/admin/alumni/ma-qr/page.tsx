"use client";

import { useState, useEffect } from "react";
import { AlumniNavTabs } from "@/components/alumni/AlumniNavTabs";
import {
  QrCode,
  Search,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldAlert,
  Printer
} from "lucide-react";

export default function AlumniQrManagePage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [campusId, setCampusId] = useState("all");
  const [search, setSearch] = useState("");
  const [activeActionModal, setActiveActionModal] = useState<{
    type: "REVOKE" | "REISSUE";
    token: any;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, campusId, search });
      const res = await fetch(`/api/admin/alumni/qr?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTokens(json.data);
      }
    } catch (e) {
      console.error("Error fetching QR tokens:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [status, campusId]);

  const handleAction = async () => {
    if (!activeActionModal) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/alumni/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: activeActionModal.type,
          alumniId: activeActionModal.token.alumniId,
          reason: actionReason
        })
      });
      const json = await res.json();
      if (json.success) {
        setActiveActionModal(null);
        setActionReason("");
        fetchTokens();
      } else {
        alert(json.error || "Lỗi thao tác mã QR");
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AlumniNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#005856]" />
              Quản lý Mã QR & Token Cá nhân Cựu học sinh
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cơ chế bảo mật mã định danh không chứa PII, quản lý cấp phát, thu hồi và in thẻ cựu học sinh
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTokens}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security Notice Card */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-900 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#005856] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-[#005856]">Tiêu chuẩn bảo mật mã QR Sky-Line:</div>
            <p className="text-teal-800 leading-relaxed">
              Mỗi mã QR chỉ chứa một chuỗi Token ngẫu nhiên (UUID v4) dẫn đến Cổng thông tin Alumni.
              Mã QR tuyệt đối không chứa dữ liệu cá nhân (CCCD, SĐT, Email).
              Khi quét mã, cựu học sinh cần xác thực danh tính trước khi được phép xem hoặc chỉnh sửa thông tin.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã học sinh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTokens()}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#005856]"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="p-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50 w-full sm:w-44"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kích hoạt (ACTIVE)</option>
            <option value="REVOKED">Đã thu hồi (REVOKED)</option>
          </select>

          <select
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            className="p-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50 w-full sm:w-44"
          >
            <option value="all">Tất cả cơ sở</option>
            <option value="CS1">CS1</option>
            <option value="CS2">CS2</option>
            <option value="CS3">CS3</option>
            <option value="CS4">CS4</option>
            <option value="CS5">CS5</option>
          </select>
        </div>

        {/* Tokens Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Cựu học sinh</th>
                  <th className="py-3.5 px-3">Mã học sinh</th>
                  <th className="py-3.5 px-3">Cơ sở / Khóa</th>
                  <th className="py-3.5 px-3">Public Token (Bí mật)</th>
                  <th className="py-3.5 px-3 text-center">Trạng thái</th>
                  <th className="py-3.5 px-3 text-center">Lượt quét</th>
                  <th className="py-3.5 px-3">Lần quét cuối</th>
                  <th className="py-3.5 px-4 text-right">Quản trị QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Đang tải danh sách mã QR...
                    </td>
                  </tr>
                ) : tokens.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Không có mã QR nào phù hợp điều kiện.
                    </td>
                  </tr>
                ) : (
                  tokens.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{t.studentName}</td>
                      <td className="py-3 px-3 font-mono font-medium text-gray-700">{t.studentCode}</td>
                      <td className="py-3 px-3 text-gray-600">
                        {t.campusId} • {t.graduationYear}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-gray-400 max-w-[140px] truncate">
                        {t.publicToken}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {t.status === "ACTIVE" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            Đã thu hồi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[#005856]">
                        {t.scanCount}
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs">
                        {t.lastScannedAt ? new Date(t.lastScannedAt).toLocaleDateString("vi-VN") : "Chưa quét"}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {t.status === "ACTIVE" ? (
                          <>
                            <button
                              onClick={() => {
                                setActiveActionModal({ type: "REISSUE", token: t });
                                setActionReason("Cấp lại mã QR mới");
                              }}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-medium"
                            >
                              Cấp lại
                            </button>
                            <button
                              onClick={() => {
                                setActiveActionModal({ type: "REVOKE", token: t });
                                setActionReason("Thu hồi bảo mật theo yêu cầu");
                              }}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium"
                            >
                              Thu hồi
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveActionModal({ type: "REISSUE", token: t });
                              setActionReason("Cấp mới sau khi đã thu hồi");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#005856] text-white text-xs font-medium hover:bg-teal-900"
                          >
                            Kích hoạt lại
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Modal (Revoke / Reissue) */}
      {activeActionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              {activeActionModal.type === "REVOKE" ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  Xác nhận Thu hồi Mã QR
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 text-[#005856]" />
                  Cấp lại Mã QR Mới
                </>
              )}
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed">
              Bạn đang thực hiện thao tác trên mã QR của cựu học sinh:{" "}
              <strong className="text-gray-800">
                {activeActionModal.token.studentName} ({activeActionModal.token.studentCode})
              </strong>
              .
              {activeActionModal.type === "REVOKE" &&
                " Khi thu hồi, các liên kết và thẻ in cũ sẽ lập tức bị vô hiệu hóa."}
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lý do thực hiện:</label>
              <input
                type="text"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Nhập lý do thu hồi hoặc cấp lại..."
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#005856]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveActionModal(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                disabled={processing}
                onClick={handleAction}
                className={`flex-1 py-2 rounded-xl text-white text-xs font-semibold shadow-sm ${
                  activeActionModal.type === "REVOKE"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#005856] hover:bg-teal-900"
                }`}
              >
                {processing ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
