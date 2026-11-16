"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  Download,
  Loader2,
  Share2,
} from "lucide-react";

interface GvcnHandoverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStudentModal?: (student: { id: string; studentCode: string; fullName?: string }) => void;
}

export function GvcnHandoverDrawer({
  isOpen,
  onClose,
  onOpenStudentModal,
}: GvcnHandoverDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [noteByHandoverId, setNoteByHandoverId] = useState<Record<string, string>>({});

  const fetchHandovers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pvdh/records?mode=gvcn_handovers", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setHandovers(data.handovers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchHandovers();
  }, [isOpen, fetchHandovers]);

  if (!isOpen) return null;

  const handleAcknowledge = async (handoverId: string) => {
    setAcknowledgingId(handoverId);
    try {
      const res = await fetch("/api/pvdh/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACKNOWLEDGE_HANDOVER",
          handoverId,
          gvcnFeedbackNote: noteByHandoverId[handoverId] || "GVCN đã tiếp nhận hồ sơ định hướng đầu vào.",
        }),
      });
      if (res.ok) {
        await fetchHandovers();
      }
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[255] flex justify-end bg-slate-900/45 backdrop-blur-[1px]">
      <div className="w-full max-w-2xl bg-[#F8FAFC] h-full border-l border-[#E2E8F0] shadow-2xl flex flex-col">
        <header className="bg-white border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#00A19A]" />
              <span>Hồ sơ định hướng bàn giao cho GVCN</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách phiếu định hướng đầu vào đã xác nhận của học sinh nhập học vào lớp thầy/cô chủ nhiệm
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-[#00A19A]" />
              <span>Đang tải danh sách bàn giao...</span>
            </div>
          ) : handovers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Chưa có hồ sơ định hướng bàn giao</div>
              <p className="text-xs text-slate-500">
                Khi học sinh hoàn tất nhập học vào lớp thầy/cô chủ nhiệm và Hội đồng bàn giao bản định hướng đã xác nhận, hồ sơ sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            handovers.map((h: any) => {
              let snap: any = {};
              try {
                snap = JSON.parse(h.handoverSnapshotJson || "{}");
              } catch {}
              const isAck = h.receiveStatus === "ACKNOWLEDGED";

              return (
                <div
                  key={h.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 shadow-xs tabular-nums"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#003B3A]">
                          {snap.studentName || `Mã HS: ${h.studentCode}`}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-semibold">
                          Lớp {h.targetClassName}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {snap.templateCode || "PVDH"} • {snap.templateVersionCode || "v1.0"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Mã hồ sơ: <strong>{h.studentCode}</strong> • Bàn giao bởi:{" "}
                        <strong>{h.handedOverByName}</strong> (
                        {h.handedOverAt ? new Date(h.handedOverAt).toLocaleDateString("vi-VN") : ""})
                      </div>
                    </div>

                    {isAck ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã tiếp nhận</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Chờ tiếp nhận</span>
                      </span>
                    )}
                  </div>

                  {snap.planHandoverNotes && (
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-800 space-y-1">
                      <div className="font-bold text-[#003B3A]">
                        Nội dung bàn giao trọng tâm cho GVCN:
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{snap.planHandoverNotes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <div className="flex items-center gap-2">
                      {onOpenStudentModal && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenStudentModal({
                              id: h.studentId,
                              studentCode: h.studentCode,
                              fullName: snap.studentName,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#00736E]" />
                          <span>Xem chi tiết phiếu</span>
                        </button>
                      )}
                      <a
                        href={`/api/pvdh/pdf?studentId=${encodeURIComponent(h.studentId)}&format=pdf&disposition=attachment`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] text-[#003B3A] text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5 text-[#00736E]" />
                        <span>Tải PDF</span>
                      </a>
                    </div>

                    {!isAck && (
                      <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                        <input
                          type="text"
                          value={noteByHandoverId[h.id] || ""}
                          onChange={(e) =>
                            setNoteByHandoverId((prev) => ({ ...prev, [h.id]: e.target.value }))
                          }
                          placeholder="Ghi chú tiếp nhận (tùy chọn)..."
                          className="border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs bg-white w-44"
                        />
                        <button
                          type="button"
                          disabled={acknowledgingId === h.id}
                          onClick={() => handleAcknowledge(h.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold cursor-pointer"
                        >
                          {acknowledgingId === h.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#5EEAD4]" />
                          )}
                          <span>Xác nhận tiếp nhận</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
