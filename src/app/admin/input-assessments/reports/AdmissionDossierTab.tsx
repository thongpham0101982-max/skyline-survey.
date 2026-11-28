"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileCheck2,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  ALL_GRADES,
  AdmissionDossierGroup,
  AdmissionDossierItem,
  GradeNumber,
  countRequiredDocsForGrade,
  createDefaultAdmissionDossierGroups,
  formatTwoDigits,
  resolveStudentDossier,
} from "@/lib/admission-dossier";

interface AdmissionDossierTabProps {
  groups: AdmissionDossierGroup[];
  onChangeGroups: (next: AdmissionDossierGroup[]) => void;
  targetTypeOptions: { id: string; name: string }[];
  logoUrl: string;
  watermarkUrl: string;
  footerUrl: string;
  schoolHeaderName?: string;
  onNotify: (msg: string, type?: "ok" | "err") => void;
  onConfirm: (msg: string, fn: () => void) => void;
}

const FALLBACK_TARGET_TYPES = [
  "Nội tỉnh",
  "Ngoại tỉnh",
  "Nước ngoài",
  "Home Schooling",
];

const GRADE_PRESETS: { label: string; grades: readonly GradeNumber[] }[] = [
  { label: "Tất cả (1–12)", grades: ALL_GRADES },
  { label: "Lớp 2–12", grades: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { label: "Tiểu học (1–5)", grades: [1, 2, 3, 4, 5] },
  { label: "Tiểu học + L6 (2–6)", grades: [2, 3, 4, 5, 6] },
  { label: "THCS + L10 (7–10)", grades: [7, 8, 9, 10] },
  { label: "THPT (11–12)", grades: [11, 12] },
  { label: "Chuyển trường (2–5, 7–9, 11–12)", grades: [2, 3, 4, 5, 7, 8, 9, 11, 12] },
  { label: "Bỏ chọn hết", grades: [] },
];

export function AdmissionDossierTab({
  groups,
  onChangeGroups,
  targetTypeOptions,
  logoUrl,
  watermarkUrl,
  footerUrl,
  schoolHeaderName = "TRƯỜNG TH, THCS, THPT SKY-LINE",
  onNotify,
  onConfirm,
}: AdmissionDossierTabProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups[0]?.id || "trong_nuoc"
  );
  const [previewGrade, setPreviewGrade] = useState<GradeNumber>(1);
  const [previewHasCommitment, setPreviewHasCommitment] = useState<boolean>(false);

  // Modal: Thêm / Sửa dòng hồ sơ
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdmissionDossierItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDefaultQty, setItemDefaultQty] = useState("01");
  const [itemIsConditional, setItemIsConditional] = useState(false);
  const [itemConditionLabel, setItemConditionLabel] = useState("Nếu có cam kết");
  const [itemNote, setItemNote] = useState("");
  const [itemGradeQuantities, setItemGradeQuantities] = useState<
    Partial<Record<GradeNumber, string>>
  >({});

  // Modal: Thêm / Sửa nhóm đối tượng
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdmissionDossierGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupShortLabel, setGroupShortLabel] = useState("");
  const [groupSubtitle, setGroupSubtitle] = useState("");

  // Chỉnh sửa ghi chú chân bảng
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftFootnotes, setDraftFootnotes] = useState("");
  const [draftSubmissionNote, setDraftSubmissionNote] = useState("");
  const [draftInternalNotes, setDraftInternalNotes] = useState("");

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || groups[0];
  }, [groups, selectedGroupId]);

  const mergedTargetOptions = useMemo(() => {
    const names = new Set<string>();
    targetTypeOptions.forEach((t) => {
      if (t.name?.trim()) names.add(t.name.trim());
    });
    if (names.size === 0) {
      FALLBACK_TARGET_TYPES.forEach((n) => names.add(n));
    }
    (activeGroup?.targetTypes || []).forEach((n) => {
      if (n?.trim()) names.add(n.trim());
    });
    return Array.from(names);
  }, [targetTypeOptions, activeGroup]);

  const resolvedPreview = useMemo(() => {
    if (!activeGroup) return null;
    return resolveStudentDossier(groups, {
      groupId: activeGroup.id,
      grade: previewGrade,
      hasCommitment: previewHasCommitment,
    });
  }, [groups, activeGroup, previewGrade, previewHasCommitment]);

  const updateActiveGroup = (
    updater: (group: AdmissionDossierGroup) => AdmissionDossierGroup
  ) => {
    if (!activeGroup) return;
    const next = groups.map((g) => (g.id === activeGroup.id ? updater(g) : g));
    onChangeGroups(next);
  };

  const handleToggleCell = (itemId: string, grade: GradeNumber) => {
    updateActiveGroup((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.id !== itemId) return item;
        const currentVal = (item.gradeQuantities[grade] || "").trim();
        const nextMap = { ...item.gradeQuantities };
        if (currentVal) {
          delete nextMap[grade];
        } else {
          nextMap[grade] = item.isConditional ? "x" : item.defaultQty || "01";
        }
        return { ...item, gradeQuantities: nextMap };
      }),
    }));
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    if (!activeGroup) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= activeGroup.items.length) return;
    updateActiveGroup((group) => {
      const nextItems = [...group.items];
      const [moved] = nextItems.splice(index, 1);
      nextItems.splice(targetIdx, 0, moved);
      return { ...group, items: nextItems };
    });
  };

  const handleDeleteItem = (item: AdmissionDossierItem) => {
    onConfirm(`Xóa hồ sơ "${item.name}" khỏi bảng "${activeGroup?.shortLabel}"?`, () => {
      updateActiveGroup((group) => ({
        ...group,
        items: group.items.filter((i) => i.id !== item.id),
      }));
      onNotify("Đã xóa mục hồ sơ.");
    });
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemName("");
    setItemDefaultQty("01");
    setItemIsConditional(false);
    setItemConditionLabel("Nếu có cam kết");
    setItemNote("");
    const initGrades: Partial<Record<GradeNumber, string>> = {};
    ALL_GRADES.forEach((g) => {
      initGrades[g] = "01";
    });
    setItemGradeQuantities(initGrades);
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: AdmissionDossierItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDefaultQty(item.defaultQty || (item.isConditional ? "x" : "01"));
    setItemIsConditional(Boolean(item.isConditional));
    setItemConditionLabel(item.conditionLabel || "Nếu có cam kết");
    setItemNote(item.note || "");
    setItemGradeQuantities({ ...item.gradeQuantities });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = () => {
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      onNotify("Vui lòng nhập tên hồ sơ.", "err");
      return;
    }
    const cleanQty = itemIsConditional ? "x" : itemDefaultQty.trim() || "01";
    const normalizedGrades: Partial<Record<GradeNumber, string>> = {};
    ALL_GRADES.forEach((g) => {
      const v = (itemGradeQuantities[g] || "").trim();
      if (v) {
        normalizedGrades[g] = itemIsConditional ? "x" : v;
      }
    });

    if (editingItem) {
      updateActiveGroup((group) => ({
        ...group,
        items: group.items.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                name: trimmedName,
                defaultQty: cleanQty,
                isConditional: itemIsConditional,
                conditionLabel: itemIsConditional
                  ? itemConditionLabel.trim() || "Nếu có cam kết"
                  : undefined,
                note: itemNote.trim() || undefined,
                gradeQuantities: normalizedGrades,
              }
            : i
        ),
      }));
      onNotify("Đã cập nhật hồ sơ.");
    } else {
      const newItem: AdmissionDossierItem = {
        id: `doc_${Date.now()}`,
        name: trimmedName,
        defaultQty: cleanQty,
        isConditional: itemIsConditional,
        conditionLabel: itemIsConditional
          ? itemConditionLabel.trim() || "Nếu có cam kết"
          : undefined,
        note: itemNote.trim() || undefined,
        gradeQuantities: normalizedGrades,
      };
      updateActiveGroup((group) => ({
        ...group,
        items: [...group.items, newItem],
      }));
      onNotify("Đã thêm hồ sơ mới vào ma trận.");
    }
    setIsItemModalOpen(false);
  };

  const openAddGroupModal = () => {
    setEditingGroup(null);
    setGroupName("");
    setGroupShortLabel("");
    setGroupSubtitle("");
    setIsGroupModalOpen(true);
  };

  const openEditGroupModal = () => {
    if (!activeGroup) return;
    setEditingGroup(activeGroup);
    setGroupName(activeGroup.name);
    setGroupShortLabel(activeGroup.shortLabel);
    setGroupSubtitle(activeGroup.subtitle);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = () => {
    const trimmed = groupName.trim();
    if (!trimmed) {
      onNotify("Vui lòng nhập tên nhóm đối tượng hồ sơ.", "err");
      return;
    }
    const shortVal = groupShortLabel.trim() || trimmed;
    if (editingGroup) {
      updateActiveGroup((g) => ({
        ...g,
        name: trimmed,
        shortLabel: shortVal,
        subtitle: groupSubtitle.trim(),
      }));
      onNotify("Đã cập nhật thông tin nhóm đối tượng.");
    } else {
      const newGroup: AdmissionDossierGroup = {
        id: `custom_${Date.now()}`,
        name: trimmed,
        shortLabel: shortVal,
        subtitle: groupSubtitle.trim() || `Danh mục hồ sơ nhập học ${trimmed}`,
        targetTypes: [],
        items: [],
        footnotes: [],
        submissionNote:
          "* Quý phụ huynh vui lòng bổ sung hồ sơ thiếu (nếu có) trong vòng 10 ngày kể từ ngày nộp Hồ sơ.",
      };
      onChangeGroups([...groups, newGroup]);
      setSelectedGroupId(newGroup.id);
      onNotify("Đã thêm nhóm đối tượng mới.");
    }
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = () => {
    if (!activeGroup) return;
    if (groups.length <= 1) {
      onNotify("Cần giữ lại ít nhất một bảng danh mục hồ sơ.", "err");
      return;
    }
    onConfirm(
      `Xóa nhóm "${activeGroup.name}" cùng toàn bộ ma trận hồ sơ của nhóm này?`,
      () => {
        const next = groups.filter((g) => g.id !== activeGroup.id);
        onChangeGroups(next);
        setSelectedGroupId(next[0].id);
        onNotify("Đã xóa nhóm đối tượng hồ sơ.");
      }
    );
  };

  const handleResetDefaults = () => {
    onConfirm(
      "Khôi phục toàn bộ 3 bảng Danh mục Hồ sơ nhập học về mẫu chuẩn của Hệ thống Giáo dục Sky-Line?",
      () => {
        const defaults = createDefaultAdmissionDossierGroups();
        onChangeGroups(defaults);
        setSelectedGroupId(defaults[0].id);
        onNotify("Đã khôi phục mẫu chuẩn Sky-Line (3 nhóm đối tượng, Lớp 1–12).");
      }
    );
  };

  const handleToggleTargetType = (targetName: string) => {
    updateActiveGroup((group) => {
      const exists = group.targetTypes.includes(targetName);
      return {
        ...group,
        targetTypes: exists
          ? group.targetTypes.filter((t) => t !== targetName)
          : [...group.targetTypes, targetName],
      };
    });
  };

  const startEditingNotes = () => {
    if (!activeGroup) return;
    setDraftFootnotes((activeGroup.footnotes || []).join("\n"));
    setDraftSubmissionNote(activeGroup.submissionNote || "");
    setDraftInternalNotes((activeGroup.internalNotes || []).join("\n"));
    setEditingNotes(true);
  };

  const saveNotes = () => {
    updateActiveGroup((group) => ({
      ...group,
      footnotes: draftFootnotes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      submissionNote: draftSubmissionNote.trim(),
      internalNotes: draftInternalNotes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
    setEditingNotes(false);
    onNotify("Đã lưu ghi chú chân bảng.");
  };

  if (!activeGroup) return null;

  return (
    <div className="space-y-5">
      {/* Masthead — Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-6 py-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#00736E] shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Danh mục Hồ sơ nhập học
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình ma trận giấy tờ cần nộp theo Đối tượng tuyển sinh và Khối lớp (Lớp 1–12)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Khôi phục mẫu chuẩn
          </button>
          <button
            type="button"
            onClick={openAddItemModal}
            className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002928] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm hồ sơ mới
          </button>
        </div>
      </div>

      {/* Segmented Group Switcher + Target Mapping */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Top segmented bar */}
        <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {groups.map((g) => {
              const isActive = g.id === activeGroup.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(g.id);
                    setEditingNotes(false);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "bg-white text-slate-600 border border-[#E2E8F0] hover:border-[#00A19A] hover:text-[#003B3A]"
                  }`}
                >
                  <span>{g.shortLabel}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] tabular-nums ${
                      isActive
                        ? "bg-white/15 text-[#5EEAD4]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {g.items.length}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={openAddGroupModal}
              className="px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-[#00A19A] hover:bg-[#F0FDFA] text-slate-600 hover:text-[#00736E] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Thêm nhóm đối tượng hồ sơ mới"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm nhóm
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openEditGroupModal}
              className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Đổi tên hoặc tiêu đề phụ của nhóm"
            >
              <Pencil className="w-3.5 h-3.5" />
              Sửa nhóm
            </button>
            {groups.length > 1 && (
              <button
                type="button"
                onClick={handleDeleteGroup}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Xóa nhóm này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Group title & targetType checkboxes */}
        <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-[#F1F5F9]">
          <div>
            <div className="text-sm font-bold text-[#003B3A]">{activeGroup.name}</div>
            {activeGroup.subtitle && (
              <div className="text-xs text-slate-500 mt-0.5">{activeGroup.subtitle}</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1">
              Áp dụng cho đối tượng tuyển sinh:
            </span>
            {mergedTargetOptions.map((targetName) => {
              const checked = activeGroup.targetTypes.includes(targetName);
              return (
                <label
                  key={targetName}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer select-none transition-colors ${
                    checked
                      ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A]"
                      : "bg-white border-[#E2E8F0] text-slate-500 hover:bg-[#F8FAFC]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleTargetType(targetName)}
                    className="w-3.5 h-3.5 rounded accent-[#00736E] cursor-pointer"
                  />
                  <span>{targetName}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Matrix Table — Sky-Line Academic Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left tabular-nums">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr>
                <th className="py-2.5 px-2.5 text-center text-[11px] font-semibold text-white whitespace-nowrap w-11 border-r border-white/10">
                  TT
                </th>
                <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap min-w-[270px] border-r border-white/10">
                  Hồ sơ nhập học
                </th>
                {ALL_GRADES.map((g) => {
                  const isPreviewCol = g === previewGrade;
                  return (
                    <th
                      key={g}
                      onClick={() => setPreviewGrade(g)}
                      title={`Bấm để xem trước trang A4 cho Lớp ${g}`}
                      className={`py-2.5 px-1.5 text-center text-[11px] font-semibold whitespace-nowrap w-14 border-r border-white/10 cursor-pointer transition-colors ${
                        isPreviewCol
                          ? "bg-[#005755] text-[#5EEAD4]"
                          : "text-teal-100 hover:bg-white/10"
                      }`}
                    >
                      Lớp {g}
                    </th>
                  );
                })}
                <th className="py-2.5 px-2.5 text-center text-[11px] font-semibold text-white whitespace-nowrap w-24">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
              {activeGroup.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="py-10 px-4 text-center text-slate-400 text-xs"
                  >
                    Chưa có hồ sơ nào trong nhóm này. Bấm{" "}
                    <button
                      type="button"
                      onClick={openAddItemModal}
                      className="text-[#00736E] font-semibold underline cursor-pointer"
                    >
                      Thêm hồ sơ mới
                    </button>{" "}
                    để bắt đầu cấu hình ma trận.
                  </td>
                </tr>
              ) : (
                activeGroup.items.map((item, idx) => {
                  const isCond = Boolean(item.isConditional);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors align-middle ${
                        isCond
                          ? "bg-[#FFFBEB]/70 hover:bg-[#FEF3C7]/60"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-2.5 px-2.5 text-center font-semibold text-slate-500 border-r border-[#F1F5F9]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-[#F1F5F9]">
                        <div className="font-medium text-slate-800 leading-snug">
                          {item.name}
                        </div>
                        {(isCond || item.note) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {isCond && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] text-[11px] font-medium">
                                {item.conditionLabel || "Nếu có cam kết"}
                              </span>
                            )}
                            {item.note && (
                              <span className="text-[11px] text-slate-500">
                                {item.note}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {ALL_GRADES.map((g) => {
                        const val = (item.gradeQuantities[g] || "").trim();
                        const isPreviewCol = g === previewGrade;
                        return (
                          <td
                            key={g}
                            className={`py-2 px-1 text-center border-r border-[#F1F5F9] ${
                              isPreviewCol ? "bg-[#F0FDFA]/50" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleCell(item.id, g)}
                              title={
                                val
                                  ? `Lớp ${g}: ${val} — Bấm để bỏ áp dụng`
                                  : `Lớp ${g}: Chưa áp dụng — Bấm để bật`
                              }
                              className={`w-9 h-7 rounded-md text-xs font-semibold transition-colors inline-flex items-center justify-center cursor-pointer ${
                                val
                                  ? isCond
                                    ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] hover:bg-[#FDE68A]/80"
                                    : "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] hover:bg-[#D1FAE5]"
                                  : "text-transparent hover:text-slate-400 hover:bg-slate-100 border border-transparent hover:border-slate-200"
                              }`}
                            >
                              {val || "+"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveItem(idx, -1)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                            title="Chuyển lên"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeGroup.items.length - 1}
                            onClick={() => handleMoveItem(idx, 1)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                            title="Chuyển xuống"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditItemModal(item)}
                            className="p-1 rounded hover:bg-[#F0FDFA] text-slate-500 hover:text-[#00736E] cursor-pointer"
                            title="Chỉnh sửa hồ sơ"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {activeGroup.items.length > 0 && (
              <tfoot className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0]">
                <tr>
                  <td className="py-2.5 px-2.5 text-center text-xs font-bold text-slate-500 border-r border-[#E2E8F0]">
                    Σ
                  </td>
                  <td className="py-2.5 px-3 text-xs font-semibold text-[#003B3A] border-r border-[#E2E8F0]">
                    Tổng số hồ sơ bắt buộc theo lớp
                    <span className="font-normal text-slate-500 ml-1.5">
                      (chưa tính mục có điều kiện)
                    </span>
                  </td>
                  {ALL_GRADES.map((g) => {
                    const total = countRequiredDocsForGrade(activeGroup, g);
                    const isPreviewCol = g === previewGrade;
                    return (
                      <td
                        key={g}
                        className={`py-2.5 px-1 text-center text-xs font-bold border-r border-[#E2E8F0] ${
                          isPreviewCol
                            ? "bg-[#CCFBF1]/60 text-[#003B3A]"
                            : "text-[#003B3A]"
                        }`}
                      >
                        {formatTwoDigits(total)}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-2 text-center text-[11px] text-slate-400">
                    Bấm ô để bật/tắt
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footnotes & Internal Process Notes bar */}
        <div className="px-5 py-3.5 bg-[#F8FAFC]/70 border-t border-[#E2E8F0]">
          {!editingNotes ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2.5 text-xs text-slate-600 max-w-4xl">
                <div className="space-y-1">
                  {activeGroup.footnotes.length > 0 ? (
                    activeGroup.footnotes.map((line, i) => (
                      <p key={i} className={i === 0 ? "font-semibold text-slate-800" : ""}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <p className="text-slate-400">Chưa có ghi chú chuyên biệt in trên tờ A4.</p>
                  )}
                  {activeGroup.submissionNote && (
                    <p className="text-slate-700 font-medium pt-0.5">
                      {activeGroup.submissionNote}
                    </p>
                  )}
                </div>

                {(activeGroup.internalNotes || []).length > 0 && (
                  <div className="rounded-xl border border-[#FDE68A] border-l-4 border-l-[#D97706] bg-[#FFFBEB]/80 px-3.5 py-2.5 space-y-1">
                    <div className="text-[11px] font-bold text-[#B45309]">
                      Lưu ý quy trình xử lý nội bộ (không in trên tờ A4 gửi phụ huynh)
                    </div>
                    {(activeGroup.internalNotes || []).map((line, idx) => {
                      const colonIdx = line.indexOf(":");
                      if (colonIdx > 0 && colonIdx < 30) {
                        return (
                          <p key={idx} className="text-xs text-slate-700 leading-relaxed">
                            <span className="font-bold text-[#B91C1C]">
                              {line.slice(0, colonIdx + 1)}
                            </span>
                            {line.slice(colonIdx + 1)}
                          </p>
                        );
                      }
                      return (
                        <p key={idx} className="text-xs text-slate-700 leading-relaxed">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={startEditingNotes}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Sửa ghi chú
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú chân bảng in trên A4 (mỗi dòng 1 ý — các dòng bắt đầu bằng [*] / Đúng tuyến / Trái tuyến tự động hiện ở bản in Lớp 1)
                </label>
                <textarea
                  rows={3}
                  value={draftFootnotes}
                  onChange={(e) => setDraftFootnotes(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A19A]"
                  placeholder="Nhập ghi chú giải thích nếu có..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú thời hạn bổ sung hồ sơ (hiển thị cuối trang A4)
                </label>
                <input
                  type="text"
                  value={draftSubmissionNote}
                  onChange={(e) => setDraftSubmissionNote(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A19A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lưu ý quy trình nội bộ cho Tuyển sinh / Giáo vụ (mỗi dòng 1 ý, không in ra tờ A4)
                </label>
                <textarea
                  rows={3}
                  value={draftInternalNotes}
                  onChange={(e) => setDraftInternalNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A19A]"
                  placeholder="Ví dụ: Đối với tiểu học: sau khi có kết luận ĐẠT > Xuất thư chúc mừng..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNotes(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={saveNotes}
                  className="px-3.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002928] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Lưu ghi chú
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive A4 Preview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Preview Controls & Summary */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <FileText className="w-4 h-4 text-[#00736E]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Kiểm tra bản in A4 theo từng khối lớp
              </h3>
              <p className="text-xs text-slate-500">
                Trang 2 tự động đính kèm Thư Chúc mừng khi xuất PDF hoặc gửi phụ huynh
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Chọn khối lớp cần kiểm tra
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {ALL_GRADES.map((g) => {
                const selected = previewGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setPreviewGrade(g)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer border ${
                      selected
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#00A19A] hover:text-[#003B3A]"
                    }`}
                  >
                    Lớp {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer select-none">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Mô phỏng học sinh có Cam kết học tập
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tự động bổ sung mục &quot;Cam kết tăng cường kiến thức&quot; khi học sinh thuộc diện cam kết
                </div>
              </div>
              <input
                type="checkbox"
                checked={previewHasCommitment}
                onChange={(e) => setPreviewHasCommitment(e.target.checked)}
                className="w-4 h-4 accent-[#00736E] cursor-pointer shrink-0"
              />
            </label>
          </div>

          {resolvedPreview && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white divide-y divide-[#F1F5F9] text-xs tabular-nums">
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Nhóm đối tượng</span>
                <span className="font-semibold text-slate-800">
                  {resolvedPreview.group.shortLabel}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Khối lớp xem trước</span>
                <span className="font-semibold text-[#003B3A]">
                  Lớp {resolvedPreview.grade}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Số mục in trên trang A4</span>
                <span className="font-bold text-[#047857]">
                  {formatTwoDigits(resolvedPreview.items.length)} mục
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500">Ghi chú [*] đúng/trái tuyến</span>
                <span className="font-medium text-slate-700">
                  {resolvedPreview.footnotes.length > 0 ? "Tự động hiển thị" : "Không áp dụng"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live A4 Preview Sheet */}
        <div className="lg:col-span-7 bg-[#F1F5F9] rounded-2xl border border-[#E2E8F0] p-5 sm:p-7 flex flex-col items-center">
          <div className="w-full max-w-[560px] flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#003B3A]">
              Xem trước thiết kế A4 thực tế — Lớp {previewGrade} ({activeGroup.shortLabel})
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">
              Khổ A4 (210 × 297 mm)
            </span>
          </div>

          <div
            className="bg-white rounded-lg border border-slate-200 p-8 shadow-md flex flex-col justify-between w-full max-w-[560px] aspect-[210/297] relative overflow-hidden select-none text-slate-900"
            style={{ fontFamily: '"Open Sans", Arial, sans-serif' }}
          >
            {/* Watermark */}
            <div
              className="absolute pointer-events-none"
              style={{
                backgroundImage: `url('${watermarkUrl}')`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "contain",
                opacity: 1,
                top: "50%",
                left: "50%",
                width: "75%",
                height: "75%",
                transform: "translate(-50%, -50%)",
              }}
            />

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="border-b-[1.5px] border-[#00A19A] pb-2 mb-4">
                  <img
                    src={logoUrl}
                    alt="Sky-Line Logo"
                    className="h-8 object-contain mb-1"
                  />
                  <h4 className="font-extrabold text-[9.5px] uppercase tracking-wide text-slate-900">
                    {schoolHeaderName}
                  </h4>
                </div>

                <div className="text-center mb-3.5">
                  <h2 className="text-[13px] font-extrabold tracking-wide text-[#003B3A] uppercase">
                    DANH MỤC HỒ SƠ NHẬP HỌC
                  </h2>
                  <p className="text-[9.5px] text-slate-600 font-semibold mt-0.5">
                    Lớp {previewGrade} — {activeGroup.name}
                  </p>
                </div>

                <div className="border border-slate-900 overflow-hidden">
                  <table className="w-full border-collapse text-left text-[9.5px] text-slate-900 tabular-nums">
                    <thead>
                      <tr className="bg-[#003B3A] text-white border-b border-slate-900 font-bold">
                        <th className="px-2 py-1.5 border-r border-slate-700 text-center w-10">
                          STT
                        </th>
                        <th className="px-3 py-1.5 border-r border-slate-700 text-left">
                          Tên hồ sơ
                        </th>
                        <th className="px-2 py-1.5 text-center w-16">Số lượng</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/95">
                      {(resolvedPreview?.items || []).map((row, idx) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-800 last:border-b-0"
                        >
                          <td className="px-2 py-1.5 border-r border-slate-800 text-center">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-800 font-medium leading-snug">
                            {row.name}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold">
                            {row.qty}
                          </td>
                        </tr>
                      ))}
                      {(!resolvedPreview || resolvedPreview.items.length === 0) && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-4 text-center text-slate-400 italic"
                          >
                            Chưa có hồ sơ áp dụng cho Lớp {previewGrade}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {resolvedPreview && resolvedPreview.footnotes.length > 0 && (
                  <div className="mt-3 space-y-1 text-[8.5px] text-slate-800 leading-relaxed">
                    {resolvedPreview.footnotes.map((line, idx) => (
                      <p key={idx} className={idx === 0 ? "font-bold italic" : ""}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                {resolvedPreview?.submissionNote && (
                  <p className="mt-3 text-[9px] text-slate-900 font-bold leading-relaxed">
                    {resolvedPreview.submissionNote}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 mt-3">
                <img
                  src={footerUrl}
                  alt="Footer"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Thêm / Sửa Hồ sơ */}
      {isItemModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsItemModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#E2E8F0]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {editingItem ? "Cập nhật mục hồ sơ" : "Thêm hồ sơ nhập học mới"}
                </h3>
                <p className="text-xs text-teal-100 mt-0.5">
                  Nhóm: {activeGroup.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên hồ sơ / Giấy tờ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ví dụ: Giấy khai sinh (có dấu đỏ)"
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#00A19A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số lượng mặc định
                  </label>
                  <input
                    type="text"
                    value={itemIsConditional ? "x" : itemDefaultQty}
                    disabled={itemIsConditional}
                    onChange={(e) => setItemDefaultQty(e.target.value)}
                    placeholder="Ví dụ: 01"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#00A19A] disabled:bg-slate-100 disabled:text-slate-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ghi chú bổ sung (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    placeholder="Ví dụ: Bản sao y có công chứng"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#00A19A]"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB]/70 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={itemIsConditional}
                    onChange={(e) => {
                      const nextCond = e.target.checked;
                      setItemIsConditional(nextCond);
                      setItemGradeQuantities((prev) => {
                        const updated: Partial<Record<GradeNumber, string>> = {};
                        ALL_GRADES.forEach((g) => {
                          if (prev[g]) {
                            updated[g] = nextCond ? "x" : itemDefaultQty || "01";
                          }
                        });
                        return updated;
                      });
                    }}
                    className="w-4 h-4 accent-[#D97706] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-amber-900">
                    Hồ sơ có điều kiện (chỉ in trên Thư Chúc mừng khi học sinh thuộc diện Cam kết)
                  </span>
                </label>
                {itemIsConditional && (
                  <input
                    type="text"
                    value={itemConditionLabel}
                    onChange={(e) => setItemConditionLabel(e.target.value)}
                    placeholder="Ví dụ: Nếu có cam kết"
                    className="w-full rounded-lg border border-[#FDE68A] bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#D97706]"
                  />
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Áp dụng cho từng khối lớp (Lớp 1–12)
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {GRADE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const next: Partial<Record<GradeNumber, string>> = {};
                        const qty = itemIsConditional ? "x" : itemDefaultQty || "01";
                        preset.grades.forEach((g) => {
                          next[g] = qty;
                        });
                        setItemGradeQuantities(next);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#00A19A] hover:text-[#003B3A] text-[11px] font-medium text-slate-600 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {ALL_GRADES.map((g) => {
                    const val = itemGradeQuantities[g] || "";
                    const isChecked = Boolean(val);
                    return (
                      <div
                        key={g}
                        className={`rounded-xl border p-2 transition-colors ${
                          isChecked
                            ? itemIsConditional
                              ? "border-[#FDE68A] bg-[#FFFBEB]"
                              : "border-[#A7F3D0] bg-[#ECFDF5]/60"
                            : "border-[#E2E8F0] bg-white"
                        }`}
                      >
                        <label className="flex items-center gap-1.5 cursor-pointer select-none mb-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setItemGradeQuantities((prev) => {
                                const next = { ...prev };
                                if (e.target.checked) {
                                  next[g] = itemIsConditional
                                    ? "x"
                                    : itemDefaultQty || "01";
                                } else {
                                  delete next[g];
                                }
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 accent-[#00736E] cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700 tabular-nums">
                            Lớp {g}
                          </span>
                        </label>
                        {isChecked && !itemIsConditional && (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) =>
                              setItemGradeQuantities((prev) => ({
                                ...prev,
                                [g]: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-[#CBD5E1] bg-white px-2 py-0.5 text-center text-xs font-semibold text-slate-800 tabular-nums outline-none focus:border-[#00A19A]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002928] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Lưu hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Thêm / Sửa Nhóm Đối tượng */}
      {isGroupModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsGroupModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#E2E8F0]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingGroup ? "Chỉnh sửa nhóm đối tượng" : "Thêm nhóm đối tượng hồ sơ"}
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên đầy đủ nhóm đối tượng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ví dụ: Học sinh chuyển trường giữa năm (HK2)"
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#00A19A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên ngắn trên thanh tab
                </label>
                <input
                  type="text"
                  value={groupShortLabel}
                  onChange={(e) => setGroupShortLabel(e.target.value)}
                  placeholder="Ví dụ: Chuyển trường HK2"
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#00A19A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tiêu đề phụ / phạm vi áp dụng
                </label>
                <input
                  type="text"
                  value={groupSubtitle}
                  onChange={(e) => setGroupSubtitle(e.target.value)}
                  placeholder="Ví dụ: Áp dụng nhập học học kì 2"
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#00A19A]"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveGroup}
                className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002928] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Lưu nhóm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
