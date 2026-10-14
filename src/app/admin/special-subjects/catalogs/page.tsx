"use client";
import React, { useState, useEffect } from "react";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  Plus, 
  Layers, 
  Building2, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  RefreshCcw,
  Sparkles,
  Coins,
  Shield,
  Palette
} from "lucide-react";
import toast from "react-hot-toast";

export default function SpecialSubjectsCatalogsPage() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [levels, setLevels] = useState<string[]>(["PRIMARY"]);
  const [campuses, setCampuses] = useState<string[]>(["ALL"]);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#00A19A");
  const [status, setStatus] = useState("ACTIVE");

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/special-subjects");
      const json = await res.json();
      if (res.ok) {
        setSubjects(json.subjects || []);
      } else {
        toast.error(json.error || "Không thể tải danh mục");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setCode("");
    setName("");
    setLevels(["PRIMARY"]);
    setCampuses(["ALL"]);
    setDescription("");
    setColor("#00A19A");
    setStatus("ACTIVE");
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
    setLevels(item.levels ? item.levels.split(",") : ["PRIMARY"]);
    setCampuses(item.campuses ? item.campuses.split(",") : ["ALL"]);
    setDescription(item.description || "");
    setColor(item.color || "#00A19A");
    setStatus(item.status || "ACTIVE");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error("Mã và tên môn là bắt buộc");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/special-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          code,
          name,
          levels,
          campuses,
          description,
          color,
          status
        })
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Lưu thành công");
        setIsModalOpen(false);
        fetchSubjects();
      } else {
        toast.error(json.error || "Lỗi lưu dữ liệu");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };

  const toggleLevel = (lvl: string) => {
    if (levels.includes(lvl)) {
      if (levels.length > 1) setLevels(levels.filter(l => l !== lvl));
    } else {
      setLevels([...levels, lvl]);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <SpecialSubjectNav 
        title="Danh mục Môn học đặc thù Sky-Line"
        subtitle="Quản lý định danh các môn học đặc thù, cấp học và cơ sở triển khai"
      />

      {/* Header action bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Danh sách Môn đặc thù ({subjects.length})</h2>
          <p className="text-xs text-slate-500">Các môn học đặc thù được cấu hình trong hệ sinh thái giáo dục Sky-Line</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSubjects}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
            title="Làm mới"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-md shadow-[#003B3A]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Môn học mới</span>
          </button>
        </div>
      </div>

      {/* Subject cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map((sub) => {
          const isActive = sub.status === "ACTIVE";
          const currCount = sub.curriculums?.length || 0;
          const assignCount = sub._count?.assignments || 0;

          return (
            <div
              key={sub.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      style={{ backgroundColor: `${sub.color || "#00A19A"}15`, color: sub.color || "#00A19A" }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner"
                    >
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 tracking-wider">
                        {sub.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                        {sub.name}
                      </h3>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isActive 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {isActive ? "Đang áp dụng" : "Tạm ngưng"}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {sub.description || "Chưa có mô tả chi tiết."}
                </p>

                <div className="pt-2 flex flex-wrap gap-1.5">
                  {sub.levels?.split(",").map((lvl: string) => (
                    <span key={lvl} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-100">
                      {lvl === "PRIMARY" ? "Tiểu học (K1-5)" : lvl === "MIDDLE" ? "THCS (K6-9)" : lvl === "HIGH" ? "THPT (K10-12)" : lvl}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-slate-700">{currCount} khung CT</span>
                  <span>•</span>
                  <span>{assignCount} lớp phân công</span>
                </div>

                <button
                  onClick={() => openEditModal(sub)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-all"
                  title="Chỉnh sửa"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div 
                style={{ backgroundColor: sub.color || "#00A19A" }} 
                className="absolute top-0 left-0 bottom-0 w-1" 
              />
            </div>
          );
        })}
      </div>

      {/* Modal create / edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? "Cập nhật Môn học đặc thù" : "Thêm mới Môn học đặc thù"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã môn học *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="VD: FIN_EDU"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Màu nhận diện</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên môn học *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Giáo dục tài chính cá nhân"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Cấp học áp dụng</label>
                <div className="flex items-center space-x-2">
                  {[
                    { code: "PRIMARY", label: "Tiểu học" },
                    { code: "MIDDLE", label: "THCS" },
                    { code: "HIGH", label: "THPT" },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => toggleLevel(l.code)}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all ${
                        levels.includes(l.code)
                          ? "bg-teal-50 text-teal-800 border-teal-300 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả mục tiêu môn học</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Mô tả tóm tắt ý nghĩa và định hướng phát triển năng lực..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="ACTIVE">Kích hoạt (ACTIVE)</option>
                  <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white font-semibold transition-all shadow-md shadow-[#003B3A]/20"
                >
                  {saving ? "Đang lưu..." : "Lưu môn học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
