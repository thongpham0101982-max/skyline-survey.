"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Copy,
  Eye,
  Save,
  Power,
  Trash2,
  Lock,
  Loader2,
  FileText,
  Layers,
} from "lucide-react";
import {
  PvdhFieldConfig,
  PvdhSectionCode,
  isBmKtdbclTemplate,
  BM_SHEET_STATUS_OPTIONS,
} from "@/lib/pvdh/constants";

interface PvdhTemplateConfigPanelProps {
  campuses?: any[];
  eduSystems?: any[];
  periods?: any[];
}

const SECTION_LABELS: Record<PvdhSectionCode, string> = {
  I_GENERAL: "I. Thông tin chung",
  II_STUDENT: "II. Trao đổi với học sinh",
  III_TEACHER: "III. Ghi nhận của giáo viên",
  IV_PARENT: "IV. Trao đổi với PHHS",
  V_ORIENTATION: "V. Thống nhất định hướng & hỗ trợ",
  C_PARENT_GRADE: "C. Câu hỏi phân hóa riêng theo khối (Phụ huynh)",
  D_TEACHER_SUMMARY: "D. Tổng hợp và định hướng của giáo viên",
};

function formatBmSectionTabLabel(sectionCode: PvdhSectionCode, rawTitle: string, gradeLabel: string): string {
  switch (sectionCode) {
    case "I_GENERAL":
      return "Thông tin chung";
    case "II_STUDENT":
      return "A. Phỏng vấn định hướng học sinh";
    case "IV_PARENT":
      return "B. Trao đổi định hướng với phụ huynh";
    case "C_PARENT_GRADE":
      return `C. Câu hỏi phân hóa riêng cho khối ${gradeLabel} (Phụ huynh)`;
    case "D_TEACHER_SUMMARY":
      return "D. Tổng hợp và định hướng của giáo viên";
    default:
      return rawTitle || SECTION_LABELS[sectionCode] || sectionCode;
  }
}

function formatFieldDisplayCode(f: PvdhFieldConfig): string {
  if (/^[abcd]\d{2}$/i.test(f.fieldKey)) {
    return f.fieldKey.toUpperCase();
  }
  if (f.fieldKey === "sheet_status") return "Trạng thái";
  if (f.fieldKey === "psych_interview_requested") return "Tâm lí";
  if (f.sectionCode === "I_GENERAL") return `TT-${String(f.sortOrder).padStart(2, "0")}`;
  return f.itemNumber ? `Mục ${f.itemNumber}` : f.fieldKey;
}

function formatFieldRecordingType(f: PvdhFieldConfig): string {
  switch (f.dataType) {
    case "READONLY_PROFILE":
      return "Tự động từ hồ sơ HS";
    case "DATE":
      return "Ngày phỏng vấn (..../..../20....)";
    case "TEXT":
      return "Thông tin nhập ngắn";
    case "INTERVIEW_GROUP":
      return "Ghi nhận trả lời mở";
    case "TEXTAREA":
      return "Ghi nhận tổng hợp GV";
    case "RADIO_STATUS":
      return "Chọn 1 trong 3 ô ☐";
    case "BOOLEAN_CHECKBOX":
      return "Ô đánh dấu ☐";
    case "MULTI_CHECKBOX":
      return "Danh sách tùy chọn ☐";
    case "ACTION_LIST":
      return "Bảng hành động phối hợp";
    default:
      return f.dataType;
  }
}

function formatBmPagePosition(sectionCode: PvdhSectionCode, gradeLabel: string): string {
  switch (sectionCode) {
    case "I_GENERAL":
      return "Trang 1 • Thông tin chung";
    case "II_STUDENT":
      return "Trang 1 • Mục A (Học sinh)";
    case "IV_PARENT":
      return "Trang 1 • Mục B (Phụ huynh)";
    case "C_PARENT_GRADE":
      return `Trang 2 • Mục C (PHHS khối ${gradeLabel})`;
    case "D_TEACHER_SUMMARY":
      return "Trang 2 • Mục D & Chữ ký GV";
    default:
      return SECTION_LABELS[sectionCode] || sectionCode;
  }
}

export function PvdhTemplateConfigPanel({
  campuses = [],
  eduSystems = [],
}: PvdhTemplateConfigPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [canManage, setCanManage] = useState(false);

  const [selectedTplId, setSelectedTplId] = useState<string>("");
  const [selectedVerId, setSelectedVerId] = useState<string>("");
  const [activeSectionFilter, setActiveSectionFilter] = useState<PvdhSectionCode | "ALL">("II_STUDENT");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "PRIMARY" | "THCS" | "THPT">("ALL");

  // Editable draft buffers
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGrades, setEditGrades] = useState<string[]>([]);
  const [editSystems, setEditSystems] = useState<string[]>(["ALL"]);
  const [editCampuses, setEditCampuses] = useState<string[]>(["ALL"]);
  const [editPriority, setEditPriority] = useState<number>(100);
  const [editFrom, setEditFrom] = useState<string>("");
  const [editTo, setEditTo] = useState<string>("");
  const [editFields, setEditFields] = useState<PvdhFieldConfig[]>([]);
  const [changeNote, setChangeNote] = useState("");

  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneCode, setCloneCode] = useState("");
  const [cloneName, setCloneName] = useState("");

  const notify = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const syncFormFromSelection = useCallback((tplList: any[], tplId: string, verId?: string) => {
    const tpl = tplList.find((t) => t.id === tplId) || tplList[0];
    if (!tpl) return;
    setSelectedTplId(tpl.id);
    const ver =
      (verId && tpl.versions?.find((v: any) => v.id === verId)) ||
      tpl.activeVersion ||
      tpl.versions?.[0];
    if (!ver) return;

    setSelectedVerId(ver.id);
    setEditName(ver.nameSnapshot || tpl.name || "");
    setEditDesc(tpl.description || "");
    setEditGrades(Array.isArray(ver.grades) ? ver.grades : []);
    setEditSystems(Array.isArray(ver.educationSystems) ? ver.educationSystems : ["ALL"]);
    setEditCampuses(Array.isArray(ver.campusIds) ? ver.campusIds : ["ALL"]);
    setEditPriority(Number(ver.priorityOrder ?? tpl.priorityOrder ?? 100));
    setEditFrom(ver.effectiveFrom || "");
    setEditTo(ver.effectiveTo || "");
    setEditFields(Array.isArray(ver.fields) ? ver.fields : []);
    setChangeNote(ver.changeSummary || "");
    const validSecCodes = new Set(
      Array.isArray(ver.sections) ? ver.sections.map((s: any) => s.sectionCode) : []
    );
    setActiveSectionFilter((prev) => {
      if (prev === "ALL") return "ALL";
      if (validSecCodes.size > 0 && !validSecCodes.has(prev)) {
        return "II_STUDENT";
      }
      return prev;
    });
  }, []);

  const fetchTemplates = useCallback(
    async (preferTplId?: string, preferVerId?: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/pvdh/templates", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.success) {
          const list = data.templates || [];
          setTemplates(list);
          setCanManage(Boolean(data.canManageConfig));
          syncFormFromSelection(list, preferTplId || selectedTplId, preferVerId);
        }
      } catch (err: any) {
        notify("err", err?.message || "Không thể tải danh sách mẫu định hướng.");
      } finally {
        setLoading(false);
      }
    },
    [selectedTplId, syncFormFromSelection]
  );

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentTpl = templates.find((t) => t.id === selectedTplId);
  const currentVer = currentTpl?.versions?.find((v: any) => v.id === selectedVerId) || currentTpl?.activeVersion;
  const isImmutable = Boolean(currentVer?.isStructureImmutable);

  const handleSelectTpl = (tpl: any) => {
    syncFormFromSelection(templates, tpl.id);
  };

  const handleSelectVersion = (verId: string) => {
    syncFormFromSelection(templates, selectedTplId, verId);
  };

  const toggleGrade = (g: string) => {
    setEditGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const updateFieldAt = (fieldKey: string, patch: Partial<PvdhFieldConfig>) => {
    setEditFields((prev) =>
      prev.map((f) => (f.fieldKey === fieldKey ? { ...f, ...patch } : f))
    );
  };

  const handleSaveVersion = async () => {
    if (!currentTpl || !currentVer) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pvdh/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_VERSION",
          templateId: currentTpl.id,
          versionId: currentVer.id,
          name: editName,
          description: editDesc,
          grades: editGrades,
          educationSystems: editSystems,
          campusIds: editCampuses,
          effectiveFrom: editFrom || null,
          effectiveTo: editTo || null,
          priorityOrder: editPriority,
          fields: editFields,
          changeSummary: changeNote || "Cập nhật nhãn và tham số biểu mẫu",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("err", data.error || "Không thể lưu cấu hình.");
        return;
      }
      notify("ok", `Đã lưu cấu hình mẫu ${currentTpl.code} (${currentVer.versionCode}).`);
      await fetchTemplates(currentTpl.id, currentVer.id);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewVersion = async () => {
    if (!currentTpl) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pvdh/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_NEW_VERSION",
          templateId: currentTpl.id,
          baseVersionId: currentVer?.id,
          changeSummary: `Tạo phiên bản mới kế thừa từ ${currentVer?.versionCode || "v1.0"}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("err", data.error || "Không thể tạo phiên bản mới.");
        return;
      }
      notify("ok", `Đã tạo phiên bản nháp mới ${data.version?.versionCode} để chỉnh sửa an toàn.`);
      await fetchTemplates(currentTpl.id, data.version?.id);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishOrDeactivate = async (action: "PUBLISH" | "DEACTIVATE") => {
    if (!currentTpl || !currentVer) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pvdh/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          templateId: currentTpl.id,
          versionId: currentVer.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("err", data.error || "Không thể thay đổi trạng thái phát hành.");
        return;
      }
      notify(
        "ok",
        action === "PUBLISH"
          ? `Đã phát hành áp dụng ${currentTpl.code} (${currentVer.versionCode}).`
          : `Đã ngừng áp dụng mẫu ${currentTpl.code}.`
      );
      await fetchTemplates(currentTpl.id, currentVer.id);
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!currentTpl) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pvdh/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLONE_TEMPLATE",
          sourceTemplateId: currentTpl.id,
          newCode: cloneCode,
          newName: cloneName,
          priorityOrder: Math.max(10, editPriority - 10),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("err", data.error || "Không thể nhân bản mẫu.");
        return;
      }
      setCloneModalOpen(false);
      notify("ok", `Đã nhân bản thành mẫu nháp ${data.template?.code}.`);
      await fetchTemplates(data.template?.id);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTpl) return;
    if (!window.confirm(`Xác nhận xóa mẫu nháp ${currentTpl.code}? (Chỉ xóa được khi chưa có hồ sơ tham chiếu)`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/pvdh/templates?templateId=${encodeURIComponent(currentTpl.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("err", data.error || "Không thể xóa mẫu.");
        return;
      }
      notify("ok", `Đã xóa mẫu ${currentTpl.code}.`);
      await fetchTemplates();
    } finally {
      setSaving(false);
    }
  };

  const filteredFields = editFields.filter((f) =>
    activeSectionFilter === "ALL" ? true : f.sectionCode === activeSectionFilter
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-[#00A19A]" />
        <span>Đang tải cấu hình 12 biểu mẫu định hướng BM.KTĐBCL.31–42 (Khối 1–12)...</span>
      </div>
    );
  }

  const sortedTemplates = [...templates].sort((a, b) => {
    const ga = Number((a.grades && a.grades[0]) || 99);
    const gb = Number((b.grades && b.grades[0]) || 99);
    if (ga !== gb) return ga - gb;
    return String(a.code || "").localeCompare(String(b.code || ""), "vi", { numeric: true });
  });

  const visibleTemplates = sortedTemplates.filter((tpl) => {
    if (levelFilter === "ALL") return true;
    const gs: number[] = (tpl.grades || []).map((g: any) => Number(g)).filter((n: number) => !Number.isNaN(n));
    if (levelFilter === "PRIMARY") return gs.some((g) => g >= 1 && g <= 5);
    if (levelFilter === "THCS") return gs.some((g) => g >= 6 && g <= 9);
    if (levelFilter === "THPT") return gs.some((g) => g >= 10 && g <= 12);
    return true;
  });

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Bộ lọc cấp học & dải chọn 12 biểu mẫu chuẩn BM.KTĐBCL.31 .. BM.KTĐBCL.42 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: "ALL", label: `Tất cả khối (${sortedTemplates.length})` },
                { id: "PRIMARY", label: "Tiểu học (Khối 1–5 • BM.31–35)" },
                { id: "THCS", label: "THCS (Khối 6–9 • BM.36–39)" },
                { id: "THPT", label: "THPT (Khối 10–12 • BM.40–42)" },
              ] as const
            ).map((lv) => (
              <button
                key={lv.id}
                type="button"
                onClick={() => setLevelFilter(lv.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer tabular-nums ${
                  levelFilter === lv.id
                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                    : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                }`}
              >
                {lv.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Đơn vị sở hữu: Ban Khảo thí &amp; Đảm bảo chất lượng
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {visibleTemplates.map((tpl) => {
            const isSelected = tpl.id === selectedTplId;
            const isActive = tpl.status === "ACTIVE";
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTpl(tpl)}
                className={`text-left p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  isSelected
                    ? "bg-[#003B3A] text-white border-[#003B3A] shadow-sm"
                    : "bg-white hover:bg-[#F8FAFC] text-slate-800 border-[#E2E8F0]"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded tabular-nums ${
                      isSelected ? "bg-white/15 text-[#5EEAD4]" : "bg-[#F0FDFA] text-[#00736E]"
                    }`}
                  >
                    {tpl.code}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      isActive
                        ? isSelected
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-emerald-50 text-emerald-700"
                        : isSelected
                        ? "bg-white/15 text-slate-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isActive ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                    <span>{isActive ? "Đang AD" : tpl.status === "DRAFT" ? "Nháp" : "Ngừng"}</span>
                  </span>
                </div>
                <div className="text-xs font-bold line-clamp-1">
                  Khối {(tpl.grades || []).join(", ")}
                </div>
                <div
                  className={`text-[11px] line-clamp-1 tabular-nums ${
                    isSelected ? "text-teal-100" : "text-slate-500"
                  }`}
                >
                  {tpl.currentVersionCode} • Ưu tiên #{tpl.priorityOrder}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chi tiết cấu hình mẫu đang chọn */}
      {currentTpl && currentVer && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-[#003B3A] text-white text-xs font-bold tabular-nums">
                  {currentTpl.code}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-semibold">
                  {String(currentTpl.code || "").startsWith("BM.KTĐBCL.")
                    ? "Đơn vị sở hữu: Ban Khảo thí & Đảm bảo chất lượng • Không quy đổi điểm xét tuyển"
                    : "Mẫu đề xuất phục vụ triển khai • Nội dung phỏng vấn định tính (Không tính điểm)"}
                </span>
                <select
                  value={selectedVerId}
                  onChange={(e) => handleSelectVersion(e.target.value)}
                  className="border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white tabular-nums"
                >
                  {(currentTpl.versions || []).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      Phiên bản {v.versionCode} ({v.status === "ACTIVE" ? "Đang áp dụng" : v.status === "DRAFT" ? "Nháp" : "Ngừng AD"})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 tabular-nums">
                  Hồ sơ tham chiếu: <strong>{currentTpl.totalUsageCount || 0}</strong>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {currentTpl.description}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`/api/pvdh/templates?mode=preview_html&code=${encodeURIComponent(currentTpl.code)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold"
              >
                <Eye className="w-3.5 h-3.5 text-[#00736E]" />
                <span>Xem trước A4</span>
              </a>

              {canManage && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setCloneCode(`${currentTpl.code}-CUSTOM`);
                      setCloneName(`${currentTpl.name} (Bản tùy chỉnh)`);
                      setCloneModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#00736E]" />
                    <span>Nhân bản</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleCreateNewVersion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 text-[#003B3A] text-xs font-semibold cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#00736E]" />
                    <span>Tạo phiên bản mới</span>
                  </button>

                  {!isImmutable && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveVersion}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu phiên bản</span>
                    </button>
                  )}

                  {currentVer.status !== "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handlePublishOrDeactivate("PUBLISH")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5 text-[#5EEAD4]" />
                      <span>Phát hành áp dụng</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handlePublishOrDeactivate("DEACTIVATE")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Ngừng áp dụng</span>
                    </button>
                  )}

                  {currentTpl.totalUsageCount === 0 &&
                    !currentTpl.code.startsWith("PVDH-0") &&
                    !currentTpl.code.startsWith("BM.KTĐBCL.") && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleDelete}
                      className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Xóa mẫu nháp chưa sử dụng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {isImmutable && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Phiên bản <strong>{currentVer.versionCode}</strong> đã có <strong>{currentVer.finalizedCount}</strong> phiếu chốt nên cấu trúc được khóa bất biến. Để điều chỉnh nhãn hoặc trường dữ liệu, hãy bấm <strong>&ldquo;Tạo phiên bản mới&rdquo;</strong>.
              </span>
            </div>
          )}

          {/* Phạm vi áp dụng & Độ ưu tiên */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên mẫu hiển thị</label>
              <input
                type="text"
                value={editName}
                disabled={!canManage || isImmutable}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thứ tự ưu tiên (Số nhỏ ưu tiên trước)
              </label>
              <input
                type="number"
                value={editPriority}
                disabled={!canManage || isImmutable}
                onChange={(e) => setEditPriority(Number(e.target.value || 100))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-bold text-slate-900 tabular-nums"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hiệu lực từ</label>
                <input
                  type="date"
                  value={editFrom}
                  disabled={!canManage || isImmutable}
                  onChange={(e) => setEditFrom(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-2 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={editTo}
                  disabled={!canManage || isImmutable}
                  onChange={(e) => setEditTo(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-2 text-xs tabular-nums"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nhóm khối áp dụng
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => {
                  const active = editGrades.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={!canManage || isImmutable}
                      onClick={() => toggleGrade(g)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border tabular-nums cursor-pointer ${
                        active
                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                          : "bg-white text-slate-600 border-[#E2E8F0]"
                      }`}
                    >
                      Khối {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hệ / Chương trình</label>
              <select
                value={editSystems[0] || "ALL"}
                disabled={!canManage || isImmutable}
                onChange={(e) => setEditSystems([e.target.value])}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="ALL">Tất cả hệ đào tạo</option>
                {eduSystems.map((s: any) => (
                  <option key={s.id || s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cơ sở áp dụng</label>
              <select
                value={editCampuses[0] || "ALL"}
                disabled={!canManage || isImmutable}
                onChange={(e) => setEditCampuses([e.target.value])}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="ALL">Toàn hệ thống cơ sở</option>
                {campuses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.campusName} ({c.campusCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bộ lọc mục trường dữ liệu theo các phần của phiên bản đang chọn */}
          {(() => {
            const isBmModel = isBmKtdbclTemplate({
              templateCode: currentTpl.code,
              exportLayout: currentVer.exportLayout,
              sections: currentVer.sections,
              fields: editFields,
            });
            const bmCodeNum = Number(String(currentTpl.code || "").split(".").pop());
            const bmGradeLabel =
              editGrades[0] ||
              (Number.isInteger(bmCodeNum) && bmCodeNum >= 31 && bmCodeNum <= 42
                ? String(bmCodeNum - 30)
                : "1");
            const verSections: Array<{
              code: PvdhSectionCode;
              label: string;
              guideline?: string;
              count: number;
            }> =
              Array.isArray(currentVer.sections) && currentVer.sections.length > 0
                ? currentVer.sections.map((s: any) => {
                    const secCode = s.sectionCode as PvdhSectionCode;
                    const count = editFields.filter((f) => f.sectionCode === secCode).length;
                    const label = isBmModel
                      ? formatBmSectionTabLabel(secCode, s.title || "", bmGradeLabel)
                      : s.romanNumeral && !String(s.title || "").startsWith(`${s.romanNumeral}.`)
                      ? `${s.romanNumeral}. ${s.title}`
                      : s.title || SECTION_LABELS[secCode] || secCode;
                    return {
                      code: secCode,
                      label,
                      guideline: s.guideline || "",
                      count,
                    };
                  })
                : (Object.keys(SECTION_LABELS) as PvdhSectionCode[])
                    .map((sec) => ({
                      code: sec,
                      label: SECTION_LABELS[sec],
                      guideline: "",
                      count: editFields.filter((f) => f.sectionCode === sec).length,
                    }))
                    .filter((item) => item.count > 0);

            const activeSecMeta = verSections.find((s) => s.code === activeSectionFilter);

            return (
              <div className="space-y-3">
                {/* Hộp tiêu đề chuẩn biểu mẫu BM.KTĐBCL.31 / BM.KTĐBCL.32 */}
                {isBmModel && (
                  <div className="rounded-xl border border-[#CBD5E1] bg-white overflow-hidden">
                    <div className="grid grid-cols-12 divide-x divide-[#CBD5E1] text-xs">
                      <div className="col-span-3 sm:col-span-2 p-3 flex items-center justify-center bg-[#F8FAFC]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/logo.png"
                          alt="SKY-LINE"
                          className="h-8 w-auto object-contain"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-8 divide-y divide-[#CBD5E1]">
                        <div className="px-3 py-2 text-center">
                          <div className="font-bold text-[#003B3A] text-xs sm:text-sm">
                            PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ TRAO ĐỔI VỚI PHỤ HUYNH
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">
                            (Dành cho khối {bmGradeLabel})
                          </div>
                        </div>
                        <div className="px-3 py-1.5 text-center text-[11px] font-medium text-slate-600 bg-[#F8FAFC]">
                          Đơn vị sở hữu: Ban Khảo thí &amp; Đảm bảo chất lượng
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2 p-3 flex flex-col items-center justify-center bg-[#F8FAFC] tabular-nums">
                        <span className="font-bold text-[#003B3A] text-xs sm:text-sm">
                          {currentTpl.code}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 text-center">
                          2 trang A4
                        </span>
                      </div>
                    </div>
                    <div className="px-3.5 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                      <span>
                        <strong>Cấu trúc chuẩn:</strong> Trang 1 (Thông tin chung • Mục A: A01–A06 • Mục B: B01–B05) — Trang 2 (Mục C: C01–C05 • Mục D: D01–D04, Trạng thái phiếu, Đề nghị phỏng vấn tâm lí &amp; Giáo viên thực hiện)
                      </span>
                      <span className="italic text-slate-500">
                        SSM Sky-Line | Phiếu lưu hành nội bộ
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {verSections.map((secItem) => (
                      <button
                        key={secItem.code}
                        type="button"
                        onClick={() => setActiveSectionFilter(secItem.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer tabular-nums ${
                          activeSectionFilter === secItem.code
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:bg-white"
                        }`}
                      >
                        {secItem.label} ({secItem.count})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActiveSectionFilter("ALL")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer tabular-nums ${
                        activeSectionFilter === "ALL"
                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                          : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:bg-white"
                      }`}
                    >
                      Toàn bộ biểu mẫu ({editFields.length})
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    Hiển thị {filteredFields.length} / {editFields.length} mục trên phiếu
                  </span>
                </div>

                {activeSecMeta?.guideline && (
                  <div className="px-3.5 py-2 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-xs italic text-[#003B3A]">
                    {activeSecMeta.guideline}
                  </div>
                )}

                {/* Bảng cấu hình trường chuẩn Sky-Line Academic Ledger */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-3 px-3 text-left text-white">Mã mục</th>
                        <th className="py-3 px-3 text-left text-white">
                          Nội dung câu hỏi / chỉ mục trên biểu mẫu
                        </th>
                        <th className="py-3 px-3 text-left text-teal-100">
                          {isBmModel ? "Vị trí trên phiếu A4" : "Khóa mapping xuất"}
                        </th>
                        <th className="py-3 px-3 text-left text-teal-100">Hình thức ghi nhận</th>
                        {!isBmModel && (
                          <th className="py-3 px-3 text-center text-teal-100">Giới hạn ký tự</th>
                        )}
                        <th className="py-3 px-3 text-center text-[#5EEAD4]">Bắt buộc chốt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {filteredFields.map((f) => {
                        const hasSecondaryPrompt = isBmModel
                          ? (f.sectionCode === "IV_PARENT" || f.sectionCode === "C_PARENT_GRADE") &&
                            Boolean(f.promptQuestion && f.promptQuestion.trim())
                          : f.promptQuestion !== undefined &&
                            (Boolean(f.promptQuestion) || f.dataType === "INTERVIEW_GROUP");

                        return (
                          <tr
                            key={f.fieldKey}
                            className="transition-colors align-middle hover:bg-[#F8FAFC]"
                          >
                            <td className="py-3 px-3 align-middle whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#003B3A] border border-[#CCFBF1] font-bold text-[11px] tabular-nums">
                                {formatFieldDisplayCode(f)}
                              </span>
                            </td>
                            <td className="py-3 px-3 align-middle space-y-1.5 min-w-[340px]">
                              <input
                                type="text"
                                value={f.label}
                                disabled={!canManage || isImmutable}
                                onChange={(e) =>
                                  updateFieldAt(f.fieldKey, { label: e.target.value })
                                }
                                className="w-full rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                              />
                              {hasSecondaryPrompt && (
                                <input
                                  type="text"
                                  value={f.promptQuestion || ""}
                                  disabled={!canManage || isImmutable}
                                  onChange={(e) =>
                                    updateFieldAt(f.fieldKey, { promptQuestion: e.target.value })
                                  }
                                  placeholder="Nội dung chi tiết trên biểu mẫu..."
                                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] text-slate-600"
                                />
                              )}
                              {f.fieldKey === "sheet_status" && (
                                <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-slate-700 font-medium">
                                  {(f.options && f.options.length > 0
                                    ? f.options
                                    : BM_SHEET_STATUS_OPTIONS
                                  ).map((opt: any) => (
                                    <span key={opt.value || opt.code}>
                                      ☐ {opt.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {f.fieldKey === "psych_interview_requested" && (
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-600">
                                  <span>☐ Đánh dấu khi cần trao đổi thêm với bộ phận tâm lí</span>
                                  <span className="font-medium text-slate-700">
                                    Chữ ký góc phải: Giáo viên thực hiện (Kí và ghi rõ họ tên)
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 align-middle text-slate-600 whitespace-nowrap">
                              {isBmModel ? (
                                <span className="text-[11px] font-medium text-slate-700">
                                  {formatBmPagePosition(f.sectionCode, bmGradeLabel)}
                                </span>
                              ) : (
                                <span className="font-mono text-[11px] text-slate-600">
                                  {f.exportMappingKey}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 align-middle text-slate-700 whitespace-nowrap">
                              {formatFieldRecordingType(f)}
                            </td>
                            {!isBmModel && (
                              <td className="py-3 px-3 align-middle text-center">
                                <input
                                  type="number"
                                  value={f.maxLength || 2000}
                                  disabled={
                                    !canManage ||
                                    isImmutable ||
                                    f.dataType === "READONLY_PROFILE"
                                  }
                                  onChange={(e) =>
                                    updateFieldAt(f.fieldKey, {
                                      maxLength: Number(e.target.value || 2000),
                                    })
                                  }
                                  className="w-20 rounded-lg border border-[#E2E8F0] px-2 py-1 text-center text-xs tabular-nums"
                                />
                              </td>
                            )}
                            <td className="py-3 px-3 align-middle text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(f.requiredOnComplete)}
                                disabled={
                                  !canManage ||
                                  isImmutable ||
                                  f.dataType === "READONLY_PROFILE"
                                }
                                onChange={(e) =>
                                  updateFieldAt(f.fieldKey, {
                                    requiredOnComplete: e.target.checked,
                                  })
                                }
                                className="rounded border-slate-300 text-[#00A19A]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal Nhân bản mẫu */}
      {cloneModalOpen && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00A19A]" />
              <span>Nhân bản mẫu định hướng ({currentTpl?.code})</span>
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã mẫu mới *</label>
              <input
                type="text"
                value={cloneCode}
                onChange={(e) => setCloneCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên mẫu mới *</label>
              <input
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCloneModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleClone}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
              >
                Tạo bản sao (Nháp)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
