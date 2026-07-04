"use client";
import { ExperientialTabs } from '@/components/ExperientialTabs';
import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Save, X, Search, CheckCircle2 } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for form
  const [formData, setFormData] = useState({ type: 'GROUP', code: '', name: '', sortOrder: 0, status: 'ACTIVE' });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State for search/filter
  const [searchTerm, setSearchTerm] = useState('');

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
      const url = editingId 
        ? `/api/activities/categories/${editingId}` 
        : '/api/activities/categories';
        
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        resetForm();
        fetchCategories();
      } else {
        alert('Có lỗi xảy ra khi lưu danh mục!');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi kết nối đến máy chủ!');
    }
  };

  const handleEdit = (cat: any) => {
    setFormData({
      type: cat.type,
      code: cat.code,
      name: cat.name,
      sortOrder: cat.sortOrder,
      status: cat.status
    });
    setEditingId(cat.id);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?`)) {
      try {
        const res = await fetch(`/api/activities/categories/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchCategories();
        } else {
          alert('Không thể xóa danh mục này!');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetForm = () => {
    setFormData({ type: 'GROUP', code: '', name: '', sortOrder: 0, status: 'ACTIVE' });
    setEditingId(null);
  };

  // Filter categories
  const filteredCategories = categories.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Tabs */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cấu hình Danh mục</h1>
            <p className="text-sm text-slate-500 mt-1">Quản lý các loại danh mục cho Hoạt động trải nghiệm</p>
          </div>
          <div className="-mb-6">
            <ExperientialTabs activeTab="categories" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* FORM PANEL */}
          <div className="bg-white p-6 shadow-sm rounded-2xl border border-slate-100 sticky top-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <div className={`p-2 rounded-xl ${editingId ? 'bg-amber-100 text-amber-600' : 'bg-[#00A99D]/10 text-[#00A99D]'}`}>
                {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Cập nhật Danh mục' : 'Thêm mới Danh mục'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Loại danh mục</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5 transition-colors"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  {categoryTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mã danh mục</label>
                <input 
                  required
                  placeholder="VD: HNG"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5 transition-colors"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tên danh mục</label>
                <input 
                  required
                  placeholder="VD: Hướng nghiệp"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thứ tự hiển thị</label>
                <input 
                  type="number"
                  min="0"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5 transition-colors"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                />
              </div>

              {editingId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Trạng thái</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5 transition-colors"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">Khóa (INACTIVE)</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                {editingId && (
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                )}
                <button 
                  type="submit" 
                  className={`flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-colors ${
                    editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#00A99D] hover:bg-[#009085]'
                  }`}
                >
                  <Save className="w-4 h-4" /> {editingId ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>

          {/* LIST PANEL */}
          <div className="lg:col-span-2 bg-white p-6 shadow-sm rounded-2xl border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800">Danh sách Danh mục</h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A99D] mb-4"></div>
                <p className="text-sm font-medium">Đang tải dữ liệu...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Layers className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-medium">Chưa có danh mục nào được tìm thấy</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm text-left">
                  <thead className="text-xs text-slate-600 bg-slate-50 border-b border-slate-200 uppercase font-bold tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-4">Phân loại</th>
                      <th scope="col" className="px-6 py-4">Mã</th>
                      <th scope="col" className="px-6 py-4">Tên</th>
                      <th scope="col" className="px-6 py-4">Thứ tự</th>
                      <th scope="col" className="px-6 py-4 text-center">Trạng thái</th>
                      <th scope="col" className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((c: any) => {
                      const typeLabel = categoryTypes.find(t => t.value === c.type)?.label || c.type;
                      const isActive = c.status === 'ACTIVE';
                      
                      return (
                        <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${editingId === c.id ? 'bg-amber-50/50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-700">{typeLabel}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500">
                            {c.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                            {c.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                            {c.sortOrder}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide uppercase ${
                              isActive ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'
                            }`}>
                              {isActive && <CheckCircle2 className="w-3 h-3" />}
                              {c.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEdit(c)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Sửa danh mục"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(c.id, c.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Xóa danh mục"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
