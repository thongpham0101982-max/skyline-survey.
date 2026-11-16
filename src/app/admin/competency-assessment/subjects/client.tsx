"use client";
// @ts-nocheck

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Layers,
  CheckCircle2,
  Circle,
} from "lucide-react";
import Link from "next/link";

interface CompetencySubjectsClientProps {
  currentUser: any;
}

const PROGRAM_META: Record<string, { label: string; badgeClass: string }> = {
  MOET: {
    label: "Chương trình Bộ GD&ĐT",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  BILINGUAL: {
    label: "Song ngữ & Quốc tế",
    badgeClass: "bg-[#F0FDFA] text-[#00736E] border-teal-200",
  },
  SKL: {
    label: "Đặc thù Sky-Line",
    badgeClass: "bg-amber-50 text-[#D97706] border-amber-200",
  },
};

const MAPPING_TYPE_META: Record<string, { label: string; badgeClass: string }> = {
  DIRECT: {
    label: "Ánh xạ 1-1",
    badgeClass: "bg-emerald-50 text-[#059669] border-emerald-200",
  },
  AVERAGED_COMPONENT: {
    label: "Gộp trung bình phân môn",
    badgeClass: "bg-amber-50 text-[#D97706] border-amber-200",
  },
  INTEGRATED: {
    label: "Môn tích hợp quy đổi",
    badgeClass: "bg-[#F0FDFA] text-[#00736E] border-teal-200",
  },
};

export function CompetencySubjectsClient({ currentUser }: CompetencySubjectsClientProps) {
  const [items, setItems] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [suggestedBySsmCode, setSuggestedBySsmCode] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [programFilter, setProgramFilter] = useState<string>("ALL");
  const [mappingFilter, setMappingFilter] = useState<string>("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formDgnlCode, setFormDgnlCode] = useState("");
  const [formDgnlName, setFormDgnlName] = useState("");
  const [formProgramGroup, setFormProgramGroup] = useState("MOET");
  const [formMappingType, setFormMappingType] = useState("DIRECT");
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCatalog = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/competency-assessment/subjects");
      const data = await res.json();
      if (data.items) setItems(data.items);
      if (data.subjects) setSubjects(data.subjects);
      if (data.suggestedBySsmCode) setSuggestedBySsmCode(data.suggestedBySsmCode);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormSubjectId("");
    setFormDgnlCode("");
    setFormDgnlName("");
    setFormProgramGroup("MOET");
    setFormMappingType("DIRECT");
    setFormDisplayOrder(items.length + 1);
    setFormIsActive(true);
    setFormNote("");
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormSubjectId(item.subjectId);
    setFormDgnlCode(item.dgnlCode);
    setFormDgnlName(item.dgnlName);
    setFormProgramGroup(item.programGroup || "MOET");
    setFormMappingType(item.mappingType || "DIRECT");
    setFormDisplayOrder(item.displayOrder || 1);
    setFormIsActive(item.isActive !== false);
    setFormNote(item.note || "");
    setModalOpen(true);
  };

  const handleSelectSsmSubject = (subjId: string) => {
    setFormSubjectId(subjId);
    const subj = subjects.find((s) => s.id === subjId);
    if (!subj || editingItem) return;

    const preset = suggestedBySsmCode[subj.subjectCode];
    const codeExists = preset && items.some((i) => i.dgnlCode.toUpperCase() === preset.dgnlCode.toUpperCase());

    if (preset && !codeExists) {
      setFormDgnlCode(preset.dgnlCode);
      setFormDgnlName(preset.dgnlName);
      setFormProgramGroup(preset.programGroup || "MOET");
      setFormNote(`Ánh xạ 1-1 về môn ${subj.subjectName} (${subj.subjectCode})`);
    } else {
      const cleanLetters = subj.subjectCode.replace(/^INT[-_]/i, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const twoChar = (cleanLetters.slice(0, 2) || "XX").padEnd(2, "0");
      setFormDgnlCode(`DG_${twoChar}0`);
      setFormDgnlName(subj.subjectName);
      const cat = String(subj.category || "").toUpperCase();
      if (cat.includes("BILINGUAL") || cat.includes("INT") || subj.subjectCode.startsWith("INT-")) {
        setFormProgramGroup("BILINGUAL");
      } else if (cat.includes("SKL")) {
        setFormProgramGroup("SKL");
      } else {
        setFormProgramGroup("MOET");
      }
      setFormNote(`Ánh xạ về môn ${subj.subjectName} (${subj.subjectCode})`);
    }
  };

  const handleSave = async () => {
    if (!formDgnlCode.trim() || !formDgnlName.trim() || !formSubjectId) {
      alert("Vui lòng nhập đầy đủ Mã môn ĐGNL, Tên môn ĐGNL và chọn Môn học chuẩn trên SSM.");
      return;
    }

    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = {
        id: editingItem?.id,
        dgnlCode: formDgnlCode.trim().toUpperCase(),
        dgnlName: formDgnlName.trim(),
        subjectId: formSubjectId,
        programGroup: formProgramGroup,
        mappingType: formMappingType,
        displayOrder: Number(formDisplayOrder) || 1,
        isActive: formIsActive,
        note: formNote.trim() || null,
      };

      const res = await fetch("/api/admin/competency-assessment/subjects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu dữ liệu");

      setModalOpen(false);
      await fetchCatalog(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: any) => {
    const nextValue = !Boolean(item.isActive);
    // Optimistic update for instant checkbox response
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: nextValue } : row)));
    setTogglingIds((prev) => ({ ...prev, [item.id]: true }));

    try {
      const res = await fetch("/api/admin/competency-assessment/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: nextValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể đổi trạng thái Đánh giá năng lực");
    } catch (err: any) {
      // Revert on failure
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: !nextValue } : row)));
      alert(err.message);
    } finally {
      setTogglingIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const handleBulkToggleFiltered = async (nextActive: boolean) => {
    const targetIds = filteredItems
      .filter((row) => Boolean(row.isActive) !== nextActive)
      .map((row) => row.id);
    if (targetIds.length === 0) return;

    const actionLabel = nextActive
      ? `tick chọn ${targetIds.length} môn đang lọc vào nhóm Có Đánh giá năng lực`
      : `bỏ tick ${targetIds.length} môn đang lọc sang nhóm Chưa Đánh giá năng lực`;

    if (!confirm(`Bạn có muốn ${actionLabel}?`)) return;

    const idSet = new Set(targetIds);
    setItems((prev) => prev.map((row) => (idSet.has(row.id) ? { ...row, isActive: nextActive } : row)));

    try {
      const res = await fetch("/api/admin/competency-assessment/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targetIds, isActive: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật hàng loạt");
    } catch (err: any) {
      await fetchCatalog(true);
      alert(err.message);
    }
  };

  const handleDelete = async (item: any) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa mã môn ĐGNL "${item.dgnlCode} - ${item.dgnlName}" khỏi danh mục Đánh giá năng lực?\n(Lưu ý: Thao tác này không ảnh hưởng đến Dữ liệu quản lý môn học của trường)`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/competency-assessment/subjects?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xóa mã môn ĐGNL");
      await fetchCatalog(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.isActive) return false;
      if (statusFilter === "INACTIVE" && item.isActive) return false;
      if (programFilter !== "ALL" && item.programGroup !== programFilter) return false;
      if (mappingFilter !== "ALL" && item.mappingType !== mappingFilter) return false;
      if (!q) return true;
      return (
        item.dgnlCode.toLowerCase().includes(q) ||
        item.dgnlName.toLowerCase().includes(q) ||
        (item.subject?.subjectCode || "").toLowerCase().includes(q) ||
        (item.subject?.subjectName || "").toLowerCase().includes(q) ||
        (item.note || "").toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, programFilter, mappingFilter, searchQuery]);

  const stats = useMemo(() => {
    const activeCount = items.filter((i) => i.isActive).length;
    const inactiveCount = items.length - activeCount;
    const uniqueSsmIds = new Set(items.map((i) => i.subjectId)).size;
    const componentCount = items.filter((i) => i.mappingType !== "DIRECT").length;
    return {
      total: items.length,
      activeCount,
      inactiveCount,
      uniqueSsmIds,
      componentCount,
    };
  }, [items]);

  const allFilteredChecked =
    filteredItems.length > 0 && filteredItems.every((item) => Boolean(item.isActive));
  const someFilteredChecked =
    filteredItems.some((item) => Boolean(item.isActive)) && !allFilteredChecked;

  const handleExportExcel = () => {
    const exportRows = filteredItems.map((item, idx) => ({
      STT: idx + 1,
      Tick_DGNL: item.isActive ? "x" : "",
      SubjectCode: item.dgnlCode,
      SubjectName: item.dgnlName,
      SSM_SubjectCode: item.subject?.subjectCode || "",
      SSM_SubjectName: item.subject?.subjectName || "",
      PhanHe: PROGRAM_META[item.programGroup]?.label || item.programGroup,
      QuyTacQuyDoi: MAPPING_TYPE_META[item.mappingType]?.label || item.mappingType,
      SoTrucRadar: item.competencyCount || 0,
      TrangThai_DGNL: item.isActive ? "Có Đánh giá năng lực" : "Chưa Đánh giá năng lực",
      GhiChu: item.note || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Muc_Ma_Mon_DGNL");
    XLSX.writeFile(wb, "Danh_Muc_Ma_Mon_Danh_Gia_Nang_Luc_SSM.xlsx");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Masthead — Sky-Line Academic Ledger */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#008B85]">
              <BookOpen className="w-4 h-4" />
              <span>Quản lý Đánh giá năng lực</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Áp dụng riêng cho Đánh giá năng lực — không ghi vào Dữ liệu quản lý môn học
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#003B3A] tracking-tight">
              Danh mục Mã môn Đánh giá năng lực
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              Tick chọn các môn có tổ chức <strong>Đánh giá năng lực</strong> (nhận diện tự động mã{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 text-[#003B3A] font-mono text-xs">DG_*</code> khi
              Import) và phân tách rõ với các môn chưa triển khai Đánh giá năng lực.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/admin/competency-assessment/aliases"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs text-[#00736E] bg-[#F0FDFA] hover:bg-teal-100 border border-teal-200 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Từ điển Alias & Trục NL
            </Link>
            <Link
              href="/admin/competency-assessment/import"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Trình Import ĐGNL
            </Link>
          </div>
        </div>

        {/* Unified Ledger Summary Strip */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 tabular-nums">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500">Tổng danh mục:</span>{" "}
              <span className="font-bold text-[#003B3A] text-sm ml-1">{stats.total}</span>
            </div>
            <div className="h-4 w-px bg-[#E2E8F0] hidden sm:block" />
            <div>
              <span className="text-slate-500">Môn Đánh giá năng lực (Đã tick):</span>{" "}
              <span className="font-bold text-[#059669] text-sm ml-1">{stats.activeCount}</span>
            </div>
            <div className="h-4 w-px bg-[#E2E8F0] hidden sm:block" />
            <div>
              <span className="text-slate-500">Môn chưa ĐGNL (Chưa tick):</span>{" "}
              <span className="font-bold text-[#D97706] text-sm ml-1">{stats.inactiveCount}</span>
            </div>
            <div className="h-4 w-px bg-[#E2E8F0] hidden sm:block" />
            <div>
              <span className="text-slate-500">Mã phân môn / tích hợp:</span>{" "}
              <span className="font-bold text-[#00736E] text-sm ml-1">{stats.componentCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#008B85]" />
              Xuất Excel
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#003B3A] hover:bg-[#00736E] shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm mã môn ĐGNL
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
            {/* Segmented Control: Trạng thái tick ĐGNL */}
            <div className="inline-flex flex-wrap gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold tabular-nums">
              {[
                { id: "ALL", label: `Tất cả danh mục (${stats.total})` },
                { id: "ACTIVE", label: `Có Đánh giá năng lực (${stats.activeCount})` },
                { id: "INACTIVE", label: `Chưa Đánh giá năng lực (${stats.inactiveCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={
                    "px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer " +
                    (statusFilter === tab.id
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-[#003B3A] hover:bg-white")
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Secondary Filters */}
            <div className="flex flex-wrap items-center gap-2.5 justify-end">
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="ALL">Tất cả phân hệ</option>
                <option value="MOET">Chương trình Bộ GD&ĐT</option>
                <option value="BILINGUAL">Song ngữ & Quốc tế</option>
                <option value="SKL">Đặc thù Sky-Line</option>
              </select>

              <select
                value={mappingFilter}
                onChange={(e) => setMappingFilter(e.target.value)}
                className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                <option value="ALL">Mọi quy tắc quy đổi</option>
                <option value="DIRECT">Ánh xạ 1-1</option>
                <option value="AVERAGED_COMPONENT">Gộp trung bình phân môn</option>
                <option value="INTEGRATED">Môn tích hợp quy đổi</option>
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm mã DG_*, tên môn, mã SSM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Table — Sky-Line Academic Ledger Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 w-16 text-center text-[#5EEAD4]">
                    <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer" title="Tick / Bỏ tick toàn bộ danh sách đang lọc">
                      <input
                        type="checkbox"
                        checked={allFilteredChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredChecked;
                        }}
                        onChange={(e) => handleBulkToggleFiltered(e.target.checked)}
                        className="w-4 h-4 rounded border-teal-200 accent-[#00A19A] cursor-pointer"
                      />
                      <span>ĐGNL</span>
                    </label>
                  </th>
                  <th className="py-3 px-3 w-12 text-center text-teal-100">STT</th>
                  <th className="py-3 px-3 text-white">Mã môn ĐGNL</th>
                  <th className="py-3 px-3 text-white">Tên môn Đánh giá năng lực</th>
                  <th className="py-3 px-3 text-[#5EEAD4]">Mã môn chuẩn SSM</th>
                  <th className="py-3 px-3 text-teal-100">Tên môn trên SSM</th>
                  <th className="py-3 px-3 text-teal-100">Phân hệ</th>
                  <th className="py-3 px-3 text-[#5EEAD4]">Quy tắc quy đổi</th>
                  <th className="py-3 px-3 text-center text-teal-100">Trục Radar</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4]">Phân loại ĐGNL</th>
                  <th className="py-3 px-3 text-right text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400">
                      Đang tải danh mục Mã môn Đánh giá năng lực...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400">
                      Không tìm thấy mã môn ĐGNL phù hợp với điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isTicked = Boolean(item.isActive);
                    const isBusy = Boolean(togglingIds[item.id]);
                    const prog = PROGRAM_META[item.programGroup] || PROGRAM_META.MOET;
                    const mapMeta = MAPPING_TYPE_META[item.mappingType] || MAPPING_TYPE_META.DIRECT;
                    return (
                      <tr
                        key={item.id}
                        className={
                          "transition-colors align-middle " +
                          (isTicked
                            ? "bg-[#F0FDFA]/50 hover:bg-[#F0FDFA]"
                            : "bg-white hover:bg-[#F8FAFC]")
                        }
                      >
                        <td className="py-3 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isTicked}
                            disabled={isBusy}
                            onChange={() => handleToggleActive(item)}
                            title={
                              isTicked
                                ? "Bỏ tick để chuyển sang Môn chưa Đánh giá năng lực"
                                : "Tick chọn là Môn có Đánh giá năng lực"
                            }
                            className="w-4 h-4 rounded border-slate-300 accent-[#008B85] cursor-pointer disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 font-medium align-middle">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.dgnlCode)}
                            title="Sao chép mã môn ĐGNL"
                            className={
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-colors cursor-pointer " +
                              (isTicked
                                ? "bg-[#003B3A] text-white hover:bg-[#00736E]"
                                : "bg-slate-200 text-slate-600 hover:bg-slate-300")
                            }
                          >
                            <span>{item.dgnlCode}</span>
                            {copiedCode === item.dgnlCode ? (
                              <Check className="w-3 h-3 text-[#5EEAD4]" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-70" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <div className={isTicked ? "font-semibold text-slate-900" : "font-medium text-slate-500"}>
                            {item.dgnlName}
                          </div>
                          {item.note && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{item.note}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <ArrowRight className={isTicked ? "w-3.5 h-3.5 text-[#00A19A]" : "w-3.5 h-3.5 text-slate-400"} />
                            <span
                              className={
                                "px-2.5 py-1 rounded-lg border font-mono font-semibold " +
                                (isTicked
                                  ? "bg-[#F0FDFA] text-[#00736E] border-teal-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200")
                              }
                            >
                              {item.subject?.subjectCode || "—"}
                            </span>
                          </div>
                        </td>
                        <td className={"py-3 px-3 align-middle whitespace-nowrap " + (isTicked ? "font-medium text-slate-700" : "text-slate-500")}>
                          {item.subject?.subjectName || "—"}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <span
                            className={
                              "inline-flex px-2.5 py-0.5 rounded-md border text-[11px] font-medium " +
                              prog.badgeClass
                            }
                          >
                            {prog.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <span
                            className={
                              "inline-flex px-2.5 py-0.5 rounded-md border text-[11px] font-medium " +
                              mapMeta.badgeClass
                            }
                          >
                            {mapMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                          {item.competencyCount > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                              {item.competencyCount} trục
                            </span>
                          ) : (
                            <span className="text-slate-400">0 trục</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleActive(item)}
                            className={
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 " +
                              (isTicked
                                ? "bg-emerald-50 text-[#059669] border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200")
                            }
                          >
                            {isTicked ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Có ĐGNL
                              </>
                            ) : (
                              <>
                                <Circle className="w-3.5 h-3.5 text-slate-400" /> Chưa ĐGNL
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Chỉnh sửa mã môn ĐGNL"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#00736E] hover:bg-[#F0FDFA] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              title="Xóa khỏi danh mục ĐGNL"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 transition-colors cursor-pointer"
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
            </table>
          </div>
        </div>

        {/* Create / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-6 w-full max-w-lg space-y-4">
              <div className="border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#003B3A]">
                  {editingItem ? "Chỉnh sửa mã môn Đánh giá năng lực" : "Thêm mã môn Đánh giá năng lực mới"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã <code className="font-mono text-[#003B3A]">DG_*</code> chỉ lưu trong danh mục Đánh giá năng lực, đối chiếu trực tiếp về môn học chuẩn hiện có trên SSM.
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Môn học chuẩn trên SSM (*Bắt buộc)
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => handleSelectSsmSubject(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
                  >
                    <option value="">-- Chọn môn học chuẩn hiện có trên SSM --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.subjectCode}] {s.subjectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Mã môn ĐGNL (*Bắt buộc)
                    </label>
                    <input
                      type="text"
                      value={formDgnlCode}
                      onChange={(e) => setFormDgnlCode(e.target.value.toUpperCase())}
                      placeholder="VD: DG_TB0, DG_CD0..."
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[#003B3A] focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tên môn trên tệp Đánh giá năng lực (*Bắt buộc)
                  </label>
                  <input
                    type="text"
                    value={formDgnlName}
                    onChange={(e) => setFormDgnlName(e.target.value)}
                    placeholder="VD: TA-BGD, Khoa học tự nhiên (Hóa Học)..."
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Phân hệ chương trình
                    </label>
                    <select
                      value={formProgramGroup}
                      onChange={(e) => setFormProgramGroup(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
                    >
                      <option value="MOET">Chương trình Bộ GD&ĐT</option>
                      <option value="BILINGUAL">Song ngữ & Quốc tế</option>
                      <option value="SKL">Đặc thù Sky-Line</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Quy tắc quy đổi khi Import
                    </label>
                    <select
                      value={formMappingType}
                      onChange={(e) => setFormMappingType(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
                    >
                      <option value="DIRECT">Ánh xạ 1-1</option>
                      <option value="AVERAGED_COMPONENT">Gộp trung bình phân môn</option>
                      <option value="INTEGRATED">Môn tích hợp quy đổi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ghi chú nghiệp vụ
                  </label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="VD: Phân môn KHTN (Vật lý) — tự động gộp trung bình về KHT"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-[#008B85]"
                  />
                  <span>Tick chọn là môn có tổ chức Đánh giá năng lực (bỏ tick nếu môn chưa ĐGNL)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#003B3A] hover:bg-[#00736E] cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : editingItem ? "Cập nhật mã môn ĐGNL" : "Lưu vào danh mục ĐGNL"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
