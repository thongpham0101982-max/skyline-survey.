// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  BookOpen,
  Sparkles,
  ArrowLeft,
  Search,
  CheckCircle2,
  Settings,
  HelpCircle,
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

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#007A72] uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Từ Điển Chuẩn Hóa Danh Mục</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-850 tracking-tight">
            Quản Lý Alias Môn Học & Năng Lực
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Ánh xạ các cách viết khác nhau trong file Excel (VD: KHOA HỌC TỰ NHIÊN (LÍ) & (LÝ)) về cùng một môn học / năng lực chuẩn.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/competency-assessment/import"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-[#007A72] hover:bg-[#003B3A] shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Trở về Trình Import
          </Link>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("SUBJECTS")}
            className={"px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer " + (
              activeTab === "SUBJECTS" ? "bg-[#003B3A] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Môn học & Alias ({subjects.length} môn • {subjectAliases.length} alias)
          </button>
          <button
            onClick={() => setActiveTab("COMPETENCIES")}
            className={"px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer " + (
              activeTab === "COMPETENCIES" ? "bg-[#003B3A] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Năng lực & Alias ({competencies.length} năng lực • {competencyAliases.length} alias)
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm môn/năng lực..."
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#007A72]"
            />
          </div>

          {activeTab === "SUBJECTS" ? (
            <button
              onClick={() => {
                setModalType("SUBJECT_ALIAS");
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#007A72] hover:bg-[#003B3A] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Thêm Alias Môn
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModalType("NEW_COMPETENCY");
                  setModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-[#007A72] border border-teal-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Năng Lực
              </button>
              <button
                onClick={() => {
                  setModalType("COMPETENCY_ALIAS");
                  setModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#007A72] hover:bg-[#003B3A] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Thêm Alias Năng Lực
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUBJECTS TAB CONTENT */}
      {activeTab === "SUBJECTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects
            .filter((s) => s.subjectName.toLowerCase().includes(searchKey.toLowerCase()) || s.subjectCode.toLowerCase().includes(searchKey.toLowerCase()))
            .map((s) => {
              const aliases = subjectAliases.filter((a) => a.subjectId === s.id);
              return (
                <div key={s.id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#007A72] flex items-center justify-center font-black text-xs">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{s.subjectName}</h4>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{s.subjectCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Danh sách Alias đã gán ({aliases.length})
                    </div>
                    {aliases.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chưa có alias nào.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {aliases.map((a) => (
                          <span
                            key={a.id}
                            className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                          >
                            {a.aliasPattern}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* COMPETENCIES TAB CONTENT */}
      {activeTab === "COMPETENCIES" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Môn học</th>
                <th className="py-3 px-4">Mã & Tên Năng Lực Chuẩn</th>
                <th className="py-3 px-4 text-center">Thứ tự trục Radar</th>
                <th className="py-3 px-4 text-center">Trọng số</th>
                <th className="py-3 px-4">Các Alias tương đương</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {competencies
                .filter((c) => c.name.toLowerCase().includes(searchKey.toLowerCase()) || c.subject?.subjectName.toLowerCase().includes(searchKey.toLowerCase()))
                .map((c, idx) => {
                  const aliases = competencyAliases.filter((a) => a.competencyId === c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-[#007A72]">{c.subject?.subjectName}</td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-800">{c.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{c.code}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">{c.displayOrder}</td>
                      <td className="py-3 px-4 text-center font-mono">{c.weight}</td>
                      <td className="py-3 px-4">
                        {aliases.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">Chưa có alias</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {aliases.map((a) => (
                              <span key={a.id} className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded text-[11px] font-medium">
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
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-sm font-black text-slate-850 uppercase tracking-tight">
              {modalType === "SUBJECT_ALIAS"
                ? "Thêm Alias Môn Học"
                : modalType === "COMPETENCY_ALIAS"
                ? "Thêm Alias Năng Lực"
                : "Thêm Năng Lực Chuẩn Mới"}
            </h3>

            {modalType === "SUBJECT_ALIAS" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Môn học chuẩn:</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="">-- Chọn môn --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subjectName} ({s.subjectCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Tên Alias:</label>
                  <input
                    type="text"
                    value={aliasPattern}
                    onChange={(e) => setAliasPattern(e.target.value)}
                    placeholder="VD: KHOA HỌC TỰ NHIÊN (LÍ)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {modalType === "COMPETENCY_ALIAS" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Năng lực chuẩn:</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="">-- Chọn năng lực --</option>
                    {competencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.subject?.subjectName}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Tên Alias:</label>
                  <input
                    type="text"
                    value={aliasPattern}
                    onChange={(e) => setAliasPattern(e.target.value)}
                    placeholder="VD: Kĩ năng nhận thức khoa học"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {modalType === "NEW_COMPETENCY" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Thuộc Môn học:</label>
                  <select
                    value={newCompSubjectId}
                    onChange={(e) => setNewCompSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="">-- Chọn môn --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Tên Năng lực chuẩn:</label>
                  <input
                    type="text"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    placeholder="VD: Năng lực vận dụng kiến thức, kỹ năng đã học"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                disabled={modalLoading}
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#007A72] hover:bg-[#003B3A]"
              >
                {modalLoading ? "Đang lưu..." : "Lưu vào Danh mục"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
