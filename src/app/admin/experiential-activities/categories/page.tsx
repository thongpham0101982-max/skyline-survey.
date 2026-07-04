"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ type: 'GROUP', code: '', name: '', sortOrder: 0 });

  const categoryTypes = [
    { value: 'GROUP', label: 'Nhóm hoạt động' },
    { value: 'TYPE', label: 'Loại hoạt động' },
    { value: 'THEME', label: 'Chủ đề hoạt động' },
    { value: 'LEVEL', label: 'Cấp hoạt động' },
    { value: 'FORMAT', label: 'Hình thức hoạt động' },
    { value: 'ROLE', label: 'Vai trò tham gia' },
    { value: 'EVAL_LEVEL', label: 'Mức đánh giá' },
    { value: 'ACHIEVEMENT', label: 'Thành tích' },
    { value: 'ORGANIZER', label: 'Đơn vị tổ chức' },
    { value: 'LOCATION', label: 'Địa điểm' },
    { value: 'ABSENCE_REASON', label: 'Lý do không tham gia' },
    { value: 'EVIDENCE_TYPE', label: 'Loại minh chứng' }
  ];

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/activities/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/activities/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ ...formData, code: '', name: '', sortOrder: 0 });
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Quản lý Danh mục nhỏ (Categories)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 shadow rounded-lg h-fit">
          <h2 className="text-lg font-semibold mb-4">Thêm danh mục mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loại danh mục</label>
              <select 
                className="w-full border rounded p-2"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                {categoryTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mã</label>
              <input 
                required
                className="w-full border rounded p-2"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên</label>
              <input 
                required
                className="w-full border rounded p-2"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thứ tự hiển thị</label>
              <input 
                type="number"
                className="w-full border rounded p-2"
                value={formData.sortOrder}
                onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value)})}
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white rounded p-2 hover:bg-blue-700">
              Lưu danh mục
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white p-4 shadow rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Danh sách hiện tại</h2>
          {loading ? (
            <p>Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Phân loại</th>
                    <th className="border p-2 text-left">Mã</th>
                    <th className="border p-2 text-left">Tên</th>
                    <th className="border p-2 text-left">Thứ tự</th>
                    <th className="border p-2 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c: any) => (
                    <tr key={c.id}>
                      <td className="border p-2">{categoryTypes.find(t => t.value === c.type)?.label || c.type}</td>
                      <td className="border p-2">{c.code}</td>
                      <td className="border p-2">{c.name}</td>
                      <td className="border p-2">{c.sortOrder}</td>
                      <td className="border p-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{c.status}</span>
                      </td>
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
