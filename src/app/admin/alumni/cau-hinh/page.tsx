"use client";

import { useState, useEffect } from "react";
import { AlumniNavTabs } from "@/components/alumni/AlumniNavTabs";
import {
  Settings,
  Plus,
  Search,
  CheckCircle2,
  Building2,
  Globe,
  Briefcase,
  GraduationCap,
  Shield,
  RefreshCw,
  X
} from "lucide-react";

export default function AlumniConfigPage() {
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState("UNIVERSITY");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newParentCode, setNewParentCode] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCatalogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      const res = await fetch(`/api/admin/alumni/catalogs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCatalogs(json.data);
      }
    } catch (e) {
      console.error("Error fetching catalogs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, [type]);

  const handleSaveCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/alumni/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          code: newCode,
          name: newName,
          nameEn: newNameEn,
          parentCode: newParentCode
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setNewCode("");
        setNewName("");
        setNewNameEn("");
        setNewParentCode("");
        fetchCatalogs();
      } else {
        alert(json.error || "Lỗi lưu danh mục");
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };

  const filtered = catalogs.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AlumniNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#005856]" />
              Cấu hình Danh mục Dùng chung & Phân quyền Alumni
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chuẩn hóa từ điển trường đại học, nhóm ngành, quốc gia và quản lý chính sách bảo vệ dữ liệu cá nhân
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#005856] text-white text-xs sm:text-sm font-semibold hover:bg-teal-900 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm danh mục
            </button>
            <button
              onClick={fetchCatalogs}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: "Tất cả danh mục" },
              { id: "UNIVERSITY", label: "Trường Đại học" },
              { id: "MAJOR_GROUP", label: "Nhóm ngành" },
              { id: "MAJOR", label: "Ngành học" },
              { id: "COUNTRY", label: "Quốc gia" },
              { id: "INDUSTRY", label: "Lĩnh vực nghề" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setType(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  type === tab.id
                    ? "bg-[#005856] text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#005856]"
            />
          </div>
        </div>

        {/* Catalogs Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Loại danh mục</th>
                  <th className="py-3.5 px-3">Mã chuẩn hóa</th>
                  <th className="py-3.5 px-4">Tên hiển thị (Tiếng Việt)</th>
                  <th className="py-3.5 px-4">Tên tiếng Anh</th>
                  <th className="py-3.5 px-3">Mã phân cấp</th>
                  <th className="py-3.5 px-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      Đang tải từ điển danh mục...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      Chưa có mục nào trong danh mục này.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-[#005856]">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-800">
                        {item.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {item.nameEn || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500 text-xs">
                        {item.parentCode || "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          Chuẩn hóa
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Thêm mục danh mục chuẩn</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalog} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Loại danh mục:</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200"
                >
                  <option value="UNIVERSITY">Trường Đại học (UNIVERSITY)</option>
                  <option value="MAJOR_GROUP">Nhóm ngành (MAJOR_GROUP)</option>
                  <option value="MAJOR">Ngành học cụ thể (MAJOR)</option>
                  <option value="COUNTRY">Quốc gia (COUNTRY)</option>
                  <option value="INDUSTRY">Lĩnh vực nghề nghiệp (INDUSTRY)</option>
                  <option value="DEGREE_LEVEL">Bậc học (DEGREE_LEVEL)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Mã định danh (Code):</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: DH_BACH_KHOA_HN hoặc MAJ_AI"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  className="w-full p-2.5 font-mono rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Tên tiếng Việt:</label>
                <input
                  type="text"
                  required
                  placeholder="Tên đầy đủ tiếng Việt"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Tên tiếng Anh (Tùy chọn):</label>
                <input
                  type="text"
                  placeholder="English name"
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Mã nhóm cha / Phân cấp (Tùy chọn):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: VN (nếu là trường ở VN) hoặc GRP_IT (nếu là ngành CNTT)"
                  value={newParentCode}
                  onChange={(e) => setNewParentCode(e.target.value)}
                  className="w-full p-2.5 font-mono rounded-xl border border-gray-200"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#005856] text-white font-semibold hover:bg-teal-900 disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu danh mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
