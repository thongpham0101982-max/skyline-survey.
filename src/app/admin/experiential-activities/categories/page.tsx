"use client";
import { ExperientialTabs } from '@/components/ExperientialTabs';
import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Save, X, Search, CheckCircle2, ChevronRight, Settings } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const systemTypes = categories.filter((c: any) => c.type === 'SYSTEM_CATEGORY_TYPE').sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const categoryTypes = systemTypes.map((c: any) => ({ value: c.code, label: c.name }));

  const [activeType, setActiveType] = useState('GROUP');
  const [showForm, setShowForm] = useState(false);
  
  // State for form
  const [formData, setFormData] = useState({ type: 'GROUP', code: '', name: '', sortOrder: 0, status: 'ACTIVE' });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState('');

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
        ? '/api/activities/categories/' + editingId 
        : '/api/activities/categories';
        
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...formData, type: activeType})
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
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục "' + name + '"?')) {
      try {
        const res = await fetch('/api/activities/categories/' + id, {
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
    setFormData({ type: activeType, code: '', name: '', sortOrder: 0, status: 'ACTIVE' });
    setEditingId(null);
    setShowForm(false);
  };

  const activeTypeLabel = activeType === 'SYSTEM_CATEGORY_TYPE' ? 'Nhóm phân loại' : (categoryTypes.find((t: any) => t.value === activeType)?.label || activeType);
  
  const filteredCategories = categories.filter((c: any) => 
    c.type === activeType &&
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.code.toLowerCase().includes(searchTerm.toLowerCase()))
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
        
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT SIDEBAR: Category Types Menu */}
          <div className="w-full lg:w-72 flex-shrink-0 bg-white p-4 shadow-sm rounded-2xl border border-slate-100 sticky top-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Nhóm phân loại</h2>
            <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {categoryTypes.map(t => {
                const isActive = activeType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => { setActiveType(t.value); resetForm(); }}
                    className={"flex items-center justify-between px-4 py-3 rounded-xl transition-all whitespace-nowrap " + (
                      isActive 
                        ? 'bg-[#00A99D] text-white shadow-md shadow-[#00A99D]/20' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <span className={"text-sm font-semibold " + (isActive ? 'text-white' : 'text-slate-700')}>{t.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 text-white/80 hidden lg:block" />}
                  </button>
                )
              })}
              
              <div className="my-2 border-t border-slate-100 hidden lg:block"></div>
              
              <button
                onClick={() => { setActiveType('SYSTEM_CATEGORY_TYPE'); resetForm(); }}
                className={"flex items-center justify-between px-4 py-3 rounded-xl transition-all whitespace-nowrap " + (
                  activeType === 'SYSTEM_CATEGORY_TYPE' 
                    ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 lg:border-none'
                )}
              >
                <span className={"text-sm font-semibold flex items-center gap-2 " + (activeType === 'SYSTEM_CATEGORY_TYPE' ? 'text-white' : 'text-slate-700')}>
                  <Settings className="w-4 h-4" /> Quản lý nhóm phân loại
                </span>
                {activeType === 'SYSTEM_CATEGORY_TYPE' && <ChevronRight className="w-4 h-4 text-white/80 hidden lg:block" />}
              </button>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 w-full space-y-6">
            
            {/* Header of Active Type */}
            <div className="bg-white p-6 shadow-sm rounded-2xl border border-slate-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Quản lý {activeTypeLabel}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Có {categories.filter((c: any) => c.type === activeType).length} mục trong danh sách này
                  </p>
                </div>
                <button 
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#00A99D] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-[#009085] transition-colors"
                >
                  {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showForm ? 'Đóng form' : 'Thêm mới'}
                </button>
              </div>

              {/* INLINE FORM */}
              {showForm && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                  <form onSubmit={handleSubmit} className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      {editingId ? <Edit2 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-[#00A99D]" />}
                      {editingId ? 'Cập nhật ' + activeTypeLabel : 'Thêm mới ' + activeTypeLabel}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mã</label>
                        <input 
                          required
                          placeholder="Nhập mã..."
                          className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5"
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tên</label>
                        <input 
                          required
                          placeholder="Nhập tên..."
                          className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thứ tự</label>
                        <input 
                          type="number"
                          min="0"
                          className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5"
                          value={formData.sortOrder}
                          onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                        />
                      </div>

                      {editingId && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Trạng thái</label>
                          <select 
                            className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-[#00A99D] focus:border-[#00A99D] block p-2.5"
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                          >
                            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                            <option value="INACTIVE">Khóa (INACTIVE)</option>
                          </select>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-5 flex justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={resetForm}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Hủy
                      </button>
                      <button 
                        type="submit" 
                        className={"flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors " + (
                          editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#00A99D] hover:bg-[#009085]'
                        )}
                      >
                        <Save className="w-4 h-4" /> {editingId ? 'Lưu thay đổi' : 'Tạo mới'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* TABLE */}
            <div className="bg-white p-6 shadow-sm rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase">Danh sách</h3>
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] transition-all"
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
                  <p className="text-sm font-medium">Không có dữ liệu {activeTypeLabel.toLowerCase()}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm text-left">
                    <thead className="text-xs text-slate-600 bg-slate-50 border-b border-slate-200 uppercase font-bold tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-4">Mã</th>
                        <th scope="col" className="px-6 py-4">Tên</th>
                        <th scope="col" className="px-6 py-4 text-center">Thứ tự</th>
                        <th scope="col" className="px-6 py-4 text-center">Trạng thái</th>
                        <th scope="col" className="px-6 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCategories.map((c: any) => {
                        const isActive = c.status === 'ACTIVE';
                        return (
                          <tr key={c.id} className={"hover:bg-slate-50/80 transition-colors " + (editingId === c.id ? 'bg-amber-50/50' : '')}>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500 font-semibold">
                              {c.code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                              {c.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-center">
                              {c.sortOrder}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide uppercase " + (
                                isActive ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'
                              )}>
                                {isActive && <CheckCircle2 className="w-3 h-3" />}
                                {c.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEdit(c)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Sửa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(c.id, c.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Xóa"
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
    </div>
  );
}
