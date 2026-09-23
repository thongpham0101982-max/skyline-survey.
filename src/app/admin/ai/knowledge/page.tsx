"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Shield,
  Calendar,
  Layers,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
  Loader2,
  Sparkles,
  Info
} from "lucide-react";

interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  version: string;
  schoolYear: string;
  effectiveDate: string;
  status: string;
  source: string;
  content: string;
  roleScope: string;
  campusScope: string;
  createdAt: string;
}

export default function KnowledgeAdminPage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<KnowledgeDoc> | null>(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/ai/knowledge");
      const data = await res.json();
      if (data.success && data.documents) {
        setDocs(data.documents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc?.title || !editingDoc?.source || !editingDoc?.content) {
      alert("Vui lòng điền đầy đủ Tiêu đề, Số hiệu văn bản và Nội dung quy định.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/ai/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDoc)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setEditingDoc(null);
        fetchDocs();
      } else {
        alert(data.error || "Lỗi lưu văn bản.");
      }
    } catch (err: any) {
      alert(err.message || "Lỗi lưu văn bản.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Thầy/Cô có chắc chắn muốn xóa văn bản quy chế này khỏi bộ nhớ AI Assistant?")) return;
    try {
      const res = await fetch(`/api/admin/ai/knowledge?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchDocs();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Lỗi khi xóa tài liệu.");
    }
  };

  const filteredDocs = docs.filter(d => {
    const matchCat = selectedCategory === "ALL" || d.category === selectedCategory;
    const matchSearch = !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.source.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-[#002828] via-[#003838] to-[#014747] text-white p-6 md:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-300" /> Wave 2 RAG Knowledge Center
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Quản Trị Kho Tri Thức Quy Chế & Hướng Dẫn SSM
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Nạp và cập nhật các văn bản quy chế, điểm chuẩn benchmark, định mức dự giờ và quy trình học đường để AI Assistant trích dẫn chính xác 100% kèm số hiệu văn bản.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingDoc({
                title: "",
                category: "BENCHMARK",
                version: "1.0",
                schoolYear: "2026-2027",
                effectiveDate: new Date().toISOString().split("T")[0],
                status: "ACTIVE",
                source: "",
                content: "",
                roleScope: JSON.stringify(["ADMIN", "TEACHER", "PARENT", "STUDENT"]),
                campusScope: JSON.stringify(["ALL"])
              });
              setShowModal(true);
            }}
            className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Thêm Văn Bản Mới
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filter bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, số quyết định..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {["ALL", "BENCHMARK", "OBSERVATION", "ADVISORY", "PROCESS", "GENERAL"].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#002828] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "ALL" ? "Tất cả" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Đang tải kho tài liệu tri thức...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700">Chưa có văn bản quy định nào được nạp</h3>
            <p className="text-slate-500 text-sm mt-1">
              Thầy/Cô hãy bấm vào nút <strong>"Thêm Văn Bản Mới"</strong> phía trên để đưa quy chế học đường vào kho tri thức của AI.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                      {doc.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">v{doc.version} • {doc.schoolYear}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-2">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-teal-800 font-semibold mb-3 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-teal-600" /> {doc.source}
                  </p>
                  <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 line-clamp-4 font-mono leading-relaxed mb-4 whitespace-pre-wrap">
                    {doc.content}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Hiệu lực: {doc.effectiveDate}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingDoc(doc);
                        setShowModal(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-teal-700 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      title="Xóa văn bản"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && editingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                {editingDoc.id ? "Chỉnh Sửa Văn Bản Quy Định" : "Nạp Văn Bản Quy Định Mới"}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingDoc(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tiêu đề văn bản quy định *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Quy Chế Điểm Chuẩn Benchmark Học Tập Năm Học 2026-2027"
                  value={editingDoc.title || ""}
                  onChange={e => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Số hiệu văn bản ban hành (Nguồn trích dẫn) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Quyết định số 48/QĐ-BĐHCM-SKL"
                    value={editingDoc.source || ""}
                    onChange={e => setEditingDoc({ ...editingDoc, source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Phân loại danh mục
                  </label>
                  <select
                    value={editingDoc.category || "GENERAL"}
                    onChange={e => setEditingDoc({ ...editingDoc, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="BENCHMARK">BENCHMARK (Điểm chuẩn)</option>
                    <option value="OBSERVATION">OBSERVATION (Dự giờ 11 tiêu chí)</option>
                    <option value="ADVISORY">ADVISORY (Cố vấn & SMART Goal)</option>
                    <option value="PROCESS">PROCESS (Quy trình mở khóa điểm)</option>
                    <option value="GENERAL">GENERAL (Quy định chung & Nề nếp)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Phiên bản
                  </label>
                  <input
                    type="text"
                    value={editingDoc.version || "1.0"}
                    onChange={e => setEditingDoc({ ...editingDoc, version: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Năm học
                  </label>
                  <input
                    type="text"
                    value={editingDoc.schoolYear || "2026-2027"}
                    onChange={e => setEditingDoc({ ...editingDoc, schoolYear: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Ngày hiệu lực
                  </label>
                  <input
                    type="date"
                    value={editingDoc.effectiveDate || ""}
                    onChange={e => setEditingDoc({ ...editingDoc, effectiveDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nội dung điều khoản quy định (Chi tiết) *
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Nhập nội dung đầy đủ của quyết định/quy định..."
                  value={editingDoc.content || ""}
                  onChange={e => setEditingDoc({ ...editingDoc, content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono leading-relaxed focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-teal-600" />
                  Nội dung này sẽ được AI Assistant trích dẫn nguyên văn khi người dùng đặt câu hỏi tra cứu.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDoc(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-[#002828] hover:bg-[#003838] text-white rounded-lg font-semibold flex items-center gap-2 shadow"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingDoc.id ? "Cập Nhật Văn Bản" : "Lưu & Kích Hoạt Tri Thức"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
