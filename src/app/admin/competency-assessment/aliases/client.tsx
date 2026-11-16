"use client";
// @ts-nocheck

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Plus,
  BookOpen,
  ArrowLeft,
  Search,
} from "lucide-react";
import Link from "next/link";

interface AliasesClientProps {
  currentUser: any;
}

export function AliasesClient({ currentUser }: AliasesClientProps) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [subjectAliases, setSubjectAliases] = useState<any[]>([]);
  const [competencyAliases, setCompetencyAliases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchKey, setSearchKey] = useState("");
  const [activeTab, setActiveTab] = useState<"SUBJECTS" | "COMPETENCIES">("SUBJECTS");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"SUBJECT_ALIAS" | "COMPETENCY_ALIAS" | "NEW_COMPETENCY">("SUBJECT_ALIAS");
  const [targetId, setTargetId] = useState("");
  const [aliasPattern, setAliasPattern] = useState("");
  const [newCompSubjectId, setNewCompSubjectId] = useState("");
  const [newCompName, setNewCompName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/competency-assessment/aliases");
      const data = await res.json();
      if (data.subjects) setSubjects(data.subjects);
      if (data.competencies) setCompetencies(data.competencies);
      if (data.subjectAliases) setSubjectAliases(data.subjectAliases);
      if (data.competencyAliases) setCompetencyAliases(data.competencyAliases);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setModalLoading(true);
    try {
      const payload: any = { type: modalType, targetId, aliasPattern };
      if (modalType === "NEW_COMPETENCY") {
        payload.newCompetency = { subjectId: newCompSubjectId, name: newCompName };
      }

      const res = await fetch("/api/admin/competency-assessment/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu");

      alert("Lưu thành công!");
      setModalOpen(false);
      setAliasPattern("");
      setNewCompName("");
      fetchData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    const q = searchKey.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => {
      const aliases = subjectAliases.filter((a) => a.subjectId === s.id);
      return (
        s.subjectName.toLowerCase().includes(q) ||
        s.subjectCode.toLowerCase().includes(q) ||
        aliases.some((a) => a.aliasPattern.toLowerCase().includes(q))
      );
    });
  }, [subjects, subjectAliases, searchKey]);

  const filteredCompetencies = useMemo(() => {
    const q = searchKey.trim().toLowerCase();
    if (!q) return competencies;
    return competencies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.subject?.subjectName || "").toLowerCase().includes(q) ||
        (c.subject?.subjectCode || "").toLowerCase().includes(q)
    );
  }, [competencies, searchKey]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Masthead — Sky-Line Academic Ledger */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#008B85]">
              <Layers className="w-4 h-4" />
              <span>Từ điển chuẩn hóa tên gọi & Trục năng lực</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#003B3A] tracking-tight">
              Từ điển Alias Môn học & Năng lực
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              Ánh xạ các cách viết tên môn hoặc tên năng lực khác nhau trên tệp Excel về môn học và trục năng lực chuẩn. Để quản lý bộ mã môn Đánh giá năng lực, vui lòng truy cập mục <strong>Danh mục Mã môn ĐGNL</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/admin/competency-assessment/subjects"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-[#00736E] bg-[#F0FDFA] hover:bg-teal-100 border border-teal-200 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Danh mục Mã môn ĐGNL
            </Link>
            <Link
              href="/admin/competency-assessment/import"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#003B3A] hover:bg-[#00736E] shadow-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Trở về trình Import ĐGNL
            </Link>
          </div>
        </div>

        {/* Unified Ledger Strip & Controls */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 tabular-nums">
          <div className="inline-flex flex-wrap gap-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
            <button
              onClick={() => setActiveTab("SUBJECTS")}
              className={
                "px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer " +
                (activeTab === "SUBJECTS"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A] hover:bg-white")
              }
            >
              Alias tên môn học ({subjects.length} môn • {subjectAliases.length} alias)
            </button>
            <button
              onClick={() => setActiveTab("COMPETENCIES")}
              className={
                "px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer " +
                (activeTab === "COMPETENCIES"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A] hover:bg-white")
              }
            >
              Trục năng lực & Alias ({competencies.length} năng lực • {competencyAliases.length} alias)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên môn hoặc năng lực..."
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              />
            </div>

            {activeTab === "COMPETENCIES" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setModalType("NEW_COMPETENCY");
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F0FDFA] hover:bg-teal-100 text-[#00736E] border border-teal-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm trục năng lực
                </button>
                <button
                  onClick={() => {
                    setModalType("COMPETENCY_ALIAS");
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#00A19A] hover:bg-[#003B3A] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Thêm Alias năng lực
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setModalType("SUBJECT_ALIAS");
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#00A19A] hover:bg-[#003B3A] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Thêm Alias tên môn
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: TỪ ĐIỂN ALIAS TÊN MÔN HỌC */}
        {activeTab === "SUBJECTS" && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 w-12 text-center text-teal-100">STT</th>
                    <th className="py-3 px-3 text-white">Mã môn SSM</th>
                    <th className="py-3 px-3 text-white">Tên môn học chuẩn</th>
                    <th className="py-3 px-3 text-teal-100">Các cách viết tên môn tương đương (Alias)</th>
                    <th className="py-3 px-3 text-right text-white">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Đang tải từ điển Alias...
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((s, idx) => {
                      const textAliases = subjectAliases.filter((a) => a.subjectId === s.id);
                      return (
                        <tr key={s.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3 text-center text-slate-400 font-medium align-middle">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-teal-200 font-mono font-semibold">
                              {s.subjectCode}
                            </span>
                          </td>
                          <td className="py-3 px-3 align-middle font-semibold text-slate-800 whitespace-nowrap">
                            {s.subjectName}
                          </td>
                          <td className="py-3 px-3 align-middle">
                            {textAliases.length === 0 ? (
                              <span className="text-slate-400 italic">Chưa có alias phụ</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {textAliases.map((a) => (
                                  <span
                                    key={a.id}
                                    className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-medium"
                                  >
                                    {a.aliasPattern}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right align-middle whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setModalType("SUBJECT_ALIAS");
                                setTargetId(s.id);
                                setModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#00736E] bg-[#F0FDFA] hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Thêm alias
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TRỤC NĂNG LỰC & ALIAS */}
        {activeTab === "COMPETENCIES" && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 w-12 text-center text-teal-100">STT</th>
                    <th className="py-3 px-3 text-white">Môn học SSM</th>
                    <th className="py-3 px-3 text-white">Mã & Tên năng lực chuẩn</th>
                    <th className="py-3 px-3 text-center text-teal-100">Thứ tự trục Radar</th>
                    <th className="py-3 px-3 text-center text-teal-100">Trọng số</th>
                    <th className="py-3 px-3 text-[#5EEAD4]">Các Alias tương đương</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {filteredCompetencies.map((c, idx) => {
                    const aliases = competencyAliases.filter((a) => a.competencyId === c.id);
                    return (
                      <tr key={c.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 text-center text-slate-400 font-medium align-middle">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <div className="font-semibold text-[#00736E]">{c.subject?.subjectName}</div>
                          <div className="font-mono text-[11px] text-slate-400">{c.subject?.subjectCode}</div>
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <div className="font-semibold text-slate-800">{c.name}</div>
                          <div className="font-mono text-[11px] text-slate-400">{c.code}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700 align-middle">
                          {c.displayOrder}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600 align-middle">
                          {c.weight}
                        </td>
                        <td className="py-3 px-3 align-middle">
                          {aliases.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">Chưa có alias</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {aliases.map((a) => (
                                <span
                                  key={a.id}
                                  className="bg-[#F0FDFA] text-[#00736E] border border-teal-200 px-2 py-0.5 rounded-md text-[11px] font-medium"
                                >
                                  {a.aliasPattern}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-base font-bold text-[#003B3A]">
                {modalType === "SUBJECT_ALIAS"
                  ? "Thêm Alias tên môn học"
                  : modalType === "COMPETENCY_ALIAS"
                  ? "Thêm Alias trục năng lực"
                  : "Thêm trục năng lực chuẩn mới"}
              </h3>

              {modalType === "SUBJECT_ALIAS" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Môn học chuẩn trên SSM
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Chọn môn chuẩn SSM --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          [{s.subjectCode}] {s.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Cách viết tên môn trên tệp Excel (Không nhập mã DG_*)
                    </label>
                    <input
                      type="text"
                      value={aliasPattern}
                      onChange={(e) => setAliasPattern(e.target.value)}
                      placeholder="VD: Khoa học tự nhiên (Hóa Học)"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>
              )}

              {modalType === "COMPETENCY_ALIAS" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Trục năng lực chuẩn
                    </label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Chọn năng lực --</option>
                      {competencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.subject?.subjectCode}] {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tên Alias trên tệp Excel
                    </label>
                    <input
                      type="text"
                      value={aliasPattern}
                      onChange={(e) => setAliasPattern(e.target.value)}
                      placeholder="VD: Kĩ năng nhận thức khoa học"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>
              )}

              {modalType === "NEW_COMPETENCY" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Thuộc môn học SSM
                    </label>
                    <select
                      value={newCompSubjectId}
                      onChange={(e) => setNewCompSubjectId(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Chọn môn --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          [{s.subjectCode}] {s.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tên năng lực chuẩn
                    </label>
                    <input
                      type="text"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      placeholder="VD: Năng lực vận dụng kiến thức, kỹ năng đã học"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  disabled={modalLoading}
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#003B3A] hover:bg-[#00736E] cursor-pointer"
                >
                  {modalLoading ? "Đang lưu..." : "Lưu vào từ điển"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
