// Forced Vercel Deployment: 2026-09-10T09:30:00.000Z
"use client";
import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Check, X, Search, Users, Loader2,
  Building2, Layers, Shield, Sparkles, ArrowRight, UserCheck, CheckSquare, Square
} from "lucide-react";
import toast from "react-hot-toast";
import { ACADEMIC_DIVISIONS, DIVISION_MAP, getDivisionByCode } from "@/config/divisions";

export default function DepartmentsClient({ currentSession }: { currentSession?: any }) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [divisionAssignments, setDivisionAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeDivisionTab, setActiveDivisionTab] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Batch Move State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [targetDivisionCode, setTargetDivisionCode] = useState<string>("");
  const [batchLoading, setBatchLoading] = useState(false);

  // Add / Edit Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    divisionCode: "",
    blockCM: "",
    teamsWebhookUrl: ""
  });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/departments");
      if (r.ok) {
        const data = await r.json();
        setDepartments(data.departments || []);
        setDivisionAssignments(data.divisionAssignments || []);
      } else {
        toast.error("Không thể tải danh sách Tổ chuyên môn");
      }
    } catch {
      toast.error("Lỗi khi tải dữ liệu Tổ chuyên môn");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      code: "",
      name: "",
      description: "",
      divisionCode: activeDivisionTab !== "ALL" ? activeDivisionTab : "",
      blockCM: "",
      teamsWebhookUrl: ""
    });
    setIsOpen(true);
  };

  const handleEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      code: d.code,
      name: d.name,
      description: d.description || "",
      divisionCode: d.divisionCode || "",
      blockCM: d.blockCM || "",
      teamsWebhookUrl: d.teamsWebhookUrl || ""
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Vui lòng điền đầy đủ Mã Tổ và Tên Tổ");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/departments", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form)
      });
      const data = await r.json();
      if (r.ok) {
        toast.success(editingId ? "Cập nhật Tổ chuyên môn thành công!" : "Tạo mới Tổ chuyên môn thành công!");
        setIsOpen(false);
        setEditingId(null);
        fetchDepartments();
      } else {
        toast.error(data.error || "Có lỗi xảy ra khi lưu thông tin");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa Tổ chuyên môn này?")) return;
    try {
      const r = await fetch("/api/departments?id=" + id, { method: "DELETE" });
      if (r.ok) {
        toast.success("Đã xóa Tổ chuyên môn");
        fetchDepartments();
      } else {
        const data = await r.json();
        toast.error(data.error || "Không thể xóa Tổ chuyên môn");
      }
    } catch {
      toast.error("Lỗi khi xóa Tổ chuyên môn");
    }
  };

  const handleBatchAssignDivision = async () => {
    if (!targetDivisionCode) {
      toast.error("Vui lòng chọn Bộ Phận đích");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 Tổ chuyên môn");
      return;
    }

    setBatchLoading(true);
    try {
      const r = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batchAssignDivision",
          departmentIds: selectedIds,
          targetDivisionCode
        })
      });
      const data = await r.json();
      if (r.ok) {
        const divName = DIVISION_MAP[targetDivisionCode]?.name || targetDivisionCode;
        toast.success(`Đã chuyển ${selectedIds.length} Tổ vào "${divName}" thành công!`);
        setSelectedIds([]);
        setBatchModalOpen(false);
        fetchDepartments();
      } else {
        toast.error(data.error || "Có lỗi khi chuyển Bộ phận");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setBatchLoading(false);
    }
  };

  // Filtered Departments
  const filtered = departments.filter(d => {
    let match = true;
    if (search) {
      const q = search.toLowerCase();
      match = match && (d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
    }
    if (activeDivisionTab !== "ALL") {
      if (activeDivisionTab === "UNASSIGNED") {
        match = match && (!d.divisionCode || d.divisionCode === "");
      } else {
        match = match && d.divisionCode === activeDivisionTab;
      }
    }
    return match;
  });

  const getDivisionBadge = (code?: string | null) => {
    if (!code) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">Chưa gán BP</span>;
    const div = DIVISION_MAP[code];
    if (!div) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">{code}</span>;
    
    const colorStyles: Record<string, string> = {
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
      amber: "bg-amber-50 text-amber-700 border-amber-200",
      cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
      violet: "bg-violet-50 text-violet-700 border-violet-200",
      rose: "bg-rose-50 text-rose-700 border-rose-200",
      teal: "bg-teal-50 text-teal-700 border-teal-200",
      purple: "bg-purple-50 text-purple-700 border-purple-200",
      orange: "bg-orange-50 text-orange-700 border-orange-200",
    };
    const style = colorStyles[div.color] || "bg-slate-50 text-slate-700 border-slate-200";

    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${style}`}>
        <Layers className="w-3 h-3 opacity-70" />
        {div.name}
      </span>
    );
  };

  const getTBPForDivision = (divisionCode: string) => {
    const list = divisionAssignments.filter((da: any) => da.divisionCode === divisionCode);
    return list.map((da: any) => da.teacher?.teacherName || "Chưa gán").join(", ");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
            Quản Lý Tổ & Bộ Phận Chuyên Môn
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Quản lý cơ cấu các Tổ chuyên môn trực thuộc các Ban & Bộ Phận (Ban GĐ, Ban KT&ĐBCL, Ban ĐHCM, Ban TT, BP Trung học, BP Tiểu học...).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => { setTargetDivisionCode(""); setBatchModalOpen(true); }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" /> Gán {selectedIds.length} Tổ vào Bộ Phận...
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-[#48BFE3] hover:bg-[#009085] text-white rounded-2xl font-bold text-xs shadow-md shadow-teal-100 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm Tổ Mới
          </button>
        </div>
      </div>

      {/* 10 Divisions Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
        {ACADEMIC_DIVISIONS.map((div) => {
          const deptCount = departments.filter(d => d.divisionCode === div.code).length;
          const tbpName = getTBPForDivision(div.code);
          const isSelected = activeDivisionTab === div.code;

          const cardColors: Record<string, { border: string, bg: string, text: string, countBg: string }> = {
            blue: { border: "border-blue-200", bg: "bg-blue-50/50", text: "text-blue-800", countBg: "bg-blue-100 text-blue-800" },
            emerald: { border: "border-emerald-200", bg: "bg-emerald-50/50", text: "text-emerald-800", countBg: "bg-emerald-100 text-emerald-800" },
            amber: { border: "border-amber-200", bg: "bg-amber-50/50", text: "text-amber-800", countBg: "bg-amber-100 text-amber-800" },
            cyan: { border: "border-cyan-200", bg: "bg-cyan-50/50", text: "text-cyan-800", countBg: "bg-cyan-100 text-cyan-800" },
            violet: { border: "border-violet-200", bg: "bg-violet-50/50", text: "text-violet-800", countBg: "bg-violet-100 text-violet-800" },
            rose: { border: "border-rose-200", bg: "bg-rose-50/50", text: "text-rose-800", countBg: "bg-rose-100 text-rose-800" },
            teal: { border: "border-teal-200", bg: "bg-teal-50/50", text: "text-teal-800", countBg: "bg-teal-100 text-teal-800" },
            purple: { border: "border-purple-200", bg: "bg-purple-50/50", text: "text-purple-800", countBg: "bg-purple-100 text-purple-800" },
            orange: { border: "border-orange-200", bg: "bg-orange-50/50", text: "text-orange-800", countBg: "bg-orange-100 text-orange-800" },
          };
          const style = cardColors[div.color] || cardColors.blue;

          return (
            <div
              key={div.code}
              onClick={() => setActiveDivisionTab(isSelected ? "ALL" : div.code)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `ring-2 ring-indigo-500 ${style.bg} ${style.border} shadow-md`
                  : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-xs"
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-1">
                  <span className={`text-[12px] font-black tracking-tight ${style.text}`}>
                    {div.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${style.countBg}`}>
                    {deptCount} Tổ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {div.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">TBP: {tbpName || <span className="text-slate-400 italic">Chưa gán</span>}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        {/* Controls & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/30">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Division Filter Tabs */}
            <button
              onClick={() => setActiveDivisionTab("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDivisionTab === "ALL"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Tất cả ({departments.length})
            </button>
            {ACADEMIC_DIVISIONS.map(div => {
              const count = departments.filter(d => d.divisionCode === div.code).length;
              const isSelected = activeDivisionTab === div.code;
              return (
                <button
                  key={div.code}
                  onClick={() => setActiveDivisionTab(div.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{div.shortName}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setActiveDivisionTab("UNASSIGNED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDivisionTab === "UNASSIGNED"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Chưa gán ({departments.filter(d => !d.divisionCode).length})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm mã hoặc tên tổ..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none bg-white font-medium"
            />
          </div>
        </div>

        {/* Departments List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="w-12 p-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={() => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(d => d.id))}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Mã Tổ</th>
                <th className="p-3.5 w-1/3">Tên Tổ Chuyên Môn</th>
                <th className="p-3.5">Bộ Phận Trực Thuộc</th>
                <th className="p-3.5 text-center">Số GV</th>
                <th className="p-3.5">Mô tả</th>
                <th className="p-3.5 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang tải danh sách Tổ chuyên môn...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    Không tìm thấy Tổ chuyên môn nào.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const isChecked = selectedIds.includes(d.id);
                  const teacherCount = d._count?.teachers || d._count?.teacherAssignments || 0;

                  return (
                    <tr key={d.id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? "bg-indigo-50/30" : ""}`}>
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedIds(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id])}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-bold text-indigo-600">{d.code}</td>
                      <td className="p-3.5 font-bold text-slate-800 text-sm">{d.name}</td>
                      <td className="p-3.5">{getDivisionBadge(d.divisionCode)}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {teacherCount} GV
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">{d.description || "-"}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleEdit(d)}
                            title="Sửa"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            title="Xóa"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Modal Batch Assign Division */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Gán {selectedIds.length} Tổ Vào Bộ Phận
              </h3>
              <button onClick={() => setBatchModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Chọn Bộ Phận chuyên môn mà bạn muốn gán cho <strong className="text-indigo-600">{selectedIds.length} Tổ</strong> đã chọn:
              </p>
              <div className="space-y-2">
                {ACADEMIC_DIVISIONS.map(div => (
                  <label
                    key={div.code}
                    className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      targetDivisionCode === div.code
                        ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                        : "border-slate-100 hover:border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="targetDivision"
                        checked={targetDivisionCode === div.code}
                        onChange={() => setTargetDivisionCode(div.code)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-800">{div.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{div.shortName}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {departments.filter(d => d.divisionCode === div.code).length} Tổ
                    </span>
                  </label>
                ))}
              </div>
              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  disabled={batchLoading}
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={batchLoading || !targetDivisionCode}
                  onClick={handleBatchAssignDivision}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {batchLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác Nhận Gán
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Department */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingId ? "Sửa thông tin" : "Thêm mới"} Tổ Chuyên Môn
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Mã Tổ *</label>
                <input
                  required
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none font-mono text-xs"
                  placeholder="VD: TO_TOAN, TO_KHOI_1..."
                />
              </div>
              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Tên Tổ Chuyên Môn *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none text-xs"
                  placeholder="VD: Tổ Toán học, Tổ Khối 1..."
                />
              </div>
              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Bộ Phận Trực Thuộc (6 Bộ Phận)</label>
                <select
                  value={form.divisionCode}
                  onChange={e => setForm({ ...form, divisionCode: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none bg-white text-xs cursor-pointer font-medium text-slate-700"
                >
                  <option value="">-- Chưa gán Bộ Phận --</option>
                  {ACADEMIC_DIVISIONS.map(div => (
                    <option key={div.code} value={div.code}>
                      {div.name} ({div.shortName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Microsoft Teams Webhook URL (Tùy chọn)</label>
                <input
                  value={form.teamsWebhookUrl}
                  onChange={e => setForm({ ...form, teamsWebhookUrl: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none text-[11px] font-mono"
                  placeholder="https://outlook.office.com/webhook/..."
                />
              </div>
              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Mô tả / Nhiệm vụ</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-indigo-500 outline-none text-xs"
                  placeholder="Mô tả chức năng, nhiệm vụ của tổ..."
                />
              </div>
              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#48BFE3] hover:bg-[#009085] text-white font-bold rounded-xl text-xs shadow-md shadow-teal-100 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? "Đang lưu..." : "Lưu Thông Tin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
