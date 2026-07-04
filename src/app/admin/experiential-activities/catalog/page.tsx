"use client";
import { ExperientialTabs } from '@/components/ExperientialTabs';
import React, { useState, useEffect } from 'react';

export default function CatalogPage() {
  const [catalogs, setCatalogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ 
    code: '', name: '', groupId: '', typeId: '', themeId: '', level: '', description: '' 
  });

  const fetchData = async () => {
    try {
      const [catRes, ctgRes] = await Promise.all([
        fetch('/api/activities/catalog'),
        fetch('/api/activities/categories')
      ]);
      const catData = await catRes.json();
      const ctgData = await ctgRes.json();
      
      if (catData.success) setCatalogs(catData.data);
      if (ctgData.success) setCategories(ctgData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.themeId) delete payload.themeId;
      
      const res = await fetch('/api/activities/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFormData({ code: '', name: '', groupId: '', typeId: '', themeId: '', level: '', description: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const groups = categories.filter((c: any) => c.type === 'GROUP');
  const types = categories.filter((c: any) => c.type === 'TYPE');
  const themes = categories.filter((c: any) => c.type === 'THEME');

  return (
    <div className="p-6">
      <ExperientialTabs activeTab="catalog" />
      <h1 className="text-2xl font-bold mb-6">Quản lý Danh mục hoạt động mẫu</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 shadow rounded-lg h-fit">
          <h2 className="text-lg font-semibold mb-4">Thêm hoạt động mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã hoạt động</label>
              <input required className="w-full border rounded p-2" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên hoạt động</label>
              <input required className="w-full border rounded p-2" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nhóm hoạt động</label>
              <select required className="w-full border rounded p-2" value={formData.groupId} onChange={(e) => setFormData({...formData, groupId: e.target.value})}>
                <option value="">Chọn nhóm...</option>
                {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loại hoạt động</label>
              <select required className="w-full border rounded p-2" value={formData.typeId} onChange={(e) => setFormData({...formData, typeId: e.target.value})}>
                <option value="">Chọn loại...</option>
                {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chủ đề (Tùy chọn)</label>
              <select className="w-full border rounded p-2" value={formData.themeId} onChange={(e) => setFormData({...formData, themeId: e.target.value})}>
                <option value="">Không có...</option>
                {themes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Áp dụng cấp học</label>
              <input className="w-full border rounded p-2" value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})} placeholder="VD: TH, THCS, THPT" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea className="w-full border rounded p-2" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white rounded p-2 hover:bg-blue-700">Lưu hoạt động</button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white p-4 shadow rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Danh sách hoạt động mẫu</h2>
          {loading ? (
            <p>Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Mã</th>
                    <th className="border p-2 text-left">Tên hoạt động</th>
                    <th className="border p-2 text-left">Nhóm</th>
                    <th className="border p-2 text-left">Loại</th>
                    <th className="border p-2 text-left">Chủ đề</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogs.map((c: any) => (
                    <tr key={c.id}>
                      <td className="border p-2">{c.code}</td>
                      <td className="border p-2 font-medium">{c.name}</td>
                      <td className="border p-2">{c.group?.name}</td>
                      <td className="border p-2">{c.type?.name}</td>
                      <td className="border p-2">{c.theme?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
