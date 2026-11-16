"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, Eye, Loader2, ShieldCheck } from "lucide-react";

interface KsdvApplicabilityLedgerPanelProps {
  savedSubjectConfigs?: any[];
}

export function KsdvApplicabilityLedgerPanel({
  savedSubjectConfigs = [],
}: KsdvApplicabilityLedgerPanelProps) {
  const [loading, setLoading] = useState(true);
  const [pvdhTemplates, setPvdhTemplates] = useState<any[]>([]);
  const [fileTemplates, setFileTemplates] = useState<any[]>([]);
  const [filterKind, setFilterKind] = useState<"ALL" | "ORIENTATION" | "FILE_EXPORT" | "SUBJECT_SCORE">("ALL");

  useEffect(() => {
    fetch("/api/admin/ksdv-file-configs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPvdhTemplates(d.pvdhTemplates || []);
          setFileTemplates(d.fileTemplates || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-[#00A19A]" />
        <span>Đang tổng hợp sổ cái phạm vi áp dụng &amp; phiên bản biểu mẫu...</span>
      </div>
    );
  }

  const unifiedRows: Array<{
    id: string;
    kind: "ORIENTATION" | "FILE_EXPORT" | "SUBJECT_SCORE";
    kindLabel: string;
    code: string;
    name: string;
    scopeGrades: string;
    scopeSystem: string;
    version: string;
    priority: string;
    effectiveRange: string;
    status: string;
    previewUrl?: string;
  }> = [];

  for (const t of pvdhTemplates) {
    unifiedRows.push({
      id: `pvdh_${t.id}`,
      kind: "ORIENTATION",
      kindLabel: "Nội dung phỏng vấn định hướng",
      code: t.code,
      name: t.name,
      scopeGrades: `Khối ${(t.grades || []).join(", ")}`,
      scopeSystem: (t.educationSystems || ["ALL"]).join(", "),
      version: t.currentVersionCode || "v1.0",
      priority: `#${t.priorityOrder ?? 100}`,
      effectiveRange:
        t.effectiveFrom || t.effectiveTo
          ? `${t.effectiveFrom || "Đầu kỳ"} → ${t.effectiveTo || "Mở"}`
          : "Toàn thời gian",
      status: t.status,
      previewUrl: `/api/pvdh/templates?mode=preview_html&code=${encodeURIComponent(t.code)}`,
    });
  }

  for (const ft of fileTemplates) {
    unifiedRows.push({
      id: `ft_${ft.id}`,
      kind: "FILE_EXPORT",
      kindLabel: `Mẫu file xuất (${ft.resultType})`,
      code: ft.code,
      name: ft.name,
      scopeGrades: `Khối ${(ft.grades || ["ALL"]).join(", ")}`,
      scopeSystem: (ft.educationSystems || ["ALL"]).join(", "),
      version: ft.versionCode || "v1.0",
      priority: `#${ft.priorityOrder ?? 100}`,
      effectiveRange:
        ft.effectiveFrom || ft.effectiveTo
          ? `${ft.effectiveFrom || "Đầu kỳ"} → ${ft.effectiveTo || "Mở"}`
          : "Toàn thời gian",
      status: ft.status,
    });
  }

  for (const sc of savedSubjectConfigs.slice(0, 60)) {
    const subCode = sc.subject?.code || sc.subjectCode || "MON";
    if (subCode === "PDHDV") continue;
    unifiedRows.push({
      id: `sc_${sc.id}`,
      kind: "SUBJECT_SCORE",
      kindLabel: "Cấu trúc điểm môn khảo sát",
      code: `${subCode}_${sc.grade}`,
      name: `${sc.subject?.name || subCode} (${sc.periodName || sc.periodId || "Mẫu chung"})`,
      scopeGrades: sc.grade || "ALL",
      scopeSystem: sc.educationSystemCode || sc.educationSystemId || "ALL",
      version: "Hiện hành",
      priority: sc.grade !== "ALL" ? "#10 (Đặc thù khối)" : "#50 (Mẫu chung)",
      effectiveRange: "Theo năm học",
      status: sc.status || "ACTIVE",
    });
  }

  const visibleRows = unifiedRows.filter((r) =>
    filterKind === "ALL" ? true : r.kind === filterKind
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00A19A]" />
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">
              Sổ cái phạm vi áp dụng, thứ tự ưu tiên &amp; phiên bản biểu mẫu
            </h3>
            <p className="text-xs text-slate-500">
              Khi nhiều mẫu giao thoa phạm vi, hệ thống áp dụng mẫu có số thứ tự ưu tiên nhỏ hơn; chặn phát hành nếu trùng phạm vi cùng độ ưu tiên.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
          {[
            { k: "ALL", lbl: "Tất cả" },
            { k: "ORIENTATION", lbl: "5 mẫu định hướng" },
            { k: "FILE_EXPORT", lbl: "Mẫu file xuất" },
            { k: "SUBJECT_SCORE", lbl: "Cấu trúc môn KS" },
          ].map((tab) => (
            <button
              key={tab.k}
              type="button"
              onClick={() => setFilterKind(tab.k as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                filterKind === tab.k
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              {tab.lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng sổ cái chuẩn Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
              <th className="py-3 px-3 text-left text-white">Mã biểu mẫu</th>
              <th className="py-3 px-3 text-left text-white">Tên cấu hình</th>
              <th className="py-3 px-3 text-left text-teal-100">Phân loại nội dung</th>
              <th className="py-3 px-3 text-left text-teal-100">Phạm vi khối / hệ</th>
              <th className="py-3 px-3 text-center text-teal-100">Phiên bản</th>
              <th className="py-3 px-3 text-center text-teal-100">Thứ tự ưu tiên</th>
              <th className="py-3 px-3 text-left text-teal-100">Hiệu lực</th>
              <th className="py-3 px-3 text-center text-[#5EEAD4]">Trạng thái</th>
              <th className="py-3 px-3 text-center text-white">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {visibleRows.map((r) => (
              <tr key={r.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                <td className="py-3 px-3 align-middle font-mono font-bold text-[#003B3A]">
                  {r.code}
                </td>
                <td className="py-3 px-3 align-middle font-semibold text-slate-800">{r.name}</td>
                <td className="py-3 px-3 align-middle text-slate-600">{r.kindLabel}</td>
                <td className="py-3 px-3 align-middle text-slate-700">
                  {r.scopeGrades} • Hệ {r.scopeSystem}
                </td>
                <td className="py-3 px-3 align-middle text-center font-semibold text-[#00736E]">
                  {r.version}
                </td>
                <td className="py-3 px-3 align-middle text-center font-semibold">{r.priority}</td>
                <td className="py-3 px-3 align-middle text-slate-600">{r.effectiveRange}</td>
                <td className="py-3 px-3 align-middle text-center">
                  {r.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đang áp dụng</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>{r.status === "DRAFT" ? "Nháp" : "Ngừng áp dụng"}</span>
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 align-middle text-center">
                  {r.previewUrl ? (
                    <a
                      href={r.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] text-[#00736E] text-[11px] font-semibold"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Xem mẫu</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
