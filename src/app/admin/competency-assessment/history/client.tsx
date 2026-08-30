// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  User,
  Layers,
  Clock,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface HistoryClientProps {
  currentUser: any;
}

export function HistoryClient({ currentUser }: HistoryClientProps) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/competency-assessment/history");
      const data = await res.json();
      if (data.batches) setBatches(data.batches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRollback = async (batchId: string, batchCode: string) => {
    const confirmMsg = "CẢNH BÁO: Bạn có chắc chắn muốn Rollback (xóa dữ liệu điểm & đánh giá đã nạp) của đợt " + batchCode + "? Trạng thái đợt sẽ chuyển thành ĐÃ ROLLBACK.";
    if (!window.confirm(confirmMsg)) return;

    setRollingBackId(batchId);
    try {
      const res = await fetch("/api/admin/competency-assessment/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi rollback");

      alert("Đã Rollback thành công toàn bộ dữ liệu của đợt import " + batchCode + "!");
      fetchHistory();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setRollingBackId(null);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchCode: string) => {
    const confirmMsg = "XÁC NHẬN XÓA: Bạn có chắc chắn muốn XÓA HOÀN TOÀN đợt import " + batchCode + " khỏi hệ thống?";
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(batchId);
    try {
      const res = await fetch(`/api/admin/competency-assessment/rollback?batchId=${batchId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xóa đợt import");

      alert("Đã xóa hoàn toàn đợt import " + batchCode + "!");
      fetchHistory();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#007A72] uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Audit Trail & Data Integrity</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-850 tracking-tight">
            Lịch Sử Import Đánh Giá Năng Lực
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Theo dõi chi tiết các đợt nạp dữ liệu, khối lượng bản ghi, người thực hiện và hỗ trợ Rollback 1-Click.
          </p>
        </div>

        <Link
          href="/admin/competency-assessment/import"
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-[#007A72] hover:bg-[#003B3A] shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Trở về Import Wizard
        </Link>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Mã đợt / Tên file</th>
                <th className="py-3 px-4">Năm học & Kỳ</th>
                <th className="py-3 px-4">Người import</th>
                <th className="py-3 px-4 text-center">Tổng dòng</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thời gian</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Đang tải lịch sử import...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    Chưa có đợt import đánh giá năng lực nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="font-mono font-black text-[#007A72] text-xs">{b.batchCode}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[220px]" title={b.fileName}>
                          {b.fileName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{b.academicYear?.name || "—"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        HK{b.semester} • {b.assessmentPeriod}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{b.importedBy?.fullName || "—"}</div>
                      <div className="text-[10px] text-slate-400">{b.importedBy?.email}</div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-slate-800">{b.totalRows}</span>
                      <span className="text-[10px] text-emerald-600 block font-bold">
                        ({b.validRows} hợp lệ)
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={"text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full border " + (
                          b.status === "COMMITTED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : b.status === "ROLLED_BACK"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {b.status === "COMMITTED"
                          ? "Đã nạp chính thức"
                          : b.status === "ROLLED_BACK"
                          ? "Đã Rollback"
                          : "Đang Staging"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                      {new Date(b.createdAt).toLocaleString("vi-VN")}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === "COMMITTED" && (
                          <button
                            disabled={rollingBackId === b.id || deletingId === b.id}
                            onClick={() => handleRollback(b.id, b.batchCode)}
                            title="Xóa dữ liệu đã nạp và chuyển sang trạng thái Rolled Back"
                            className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {rollingBackId === b.id ? "Đang hủy..." : "Rollback"}
                          </button>
                        )}
                        <button
                          disabled={rollingBackId === b.id || deletingId === b.id}
                          onClick={() => handleDeleteBatch(b.id, b.batchCode)}
                          title="Xóa vĩnh viễn đợt import này"
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingId === b.id ? "..." : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
