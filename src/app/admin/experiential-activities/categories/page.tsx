"use client";
import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Save, X, Search, CheckCircle2, ChevronRight, Settings, FolderTree, LayoutGrid } from 'lucide-react';
import { ExperientialTabs } from '@/components/ExperientialTabs';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const systemTypes = categories.filter((c: any) => c.type === 'SYSTEM_CATEGORY_TYPE').sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const categoryTypes = systemTypes.map((c: any) => ({ value: c.code, label: c.name }));

  const [activeType, setActiveType] = useState('GROUP');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    sortOrder: 0,
    status: 'ACTIVE'
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/activities/categories');
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Ensure activeType is valid
  useEffect(() => {
    if (categoryTypes.length > 0 && activeType !== 'SYSTEM_CATEGORY_TYPE') {
      const exists = categoryTypes.find((t: any) => t.value === activeType);
      if (!exists) {
        setActiveType(categoryTypes[0].value);
      }
    }
  }, [categoryTypes, activeType]);

  const activeTypeLabel = activeType === 'SYSTEM_CATEGORY_TYPE' 
    ? 'Nhóm phân loại' 
    : (categoryTypes.find((t: any) => t.value === activeType)?.label || activeType);
  
  const filteredCategories = categories.filter((c: any) => 
    c.type === activeType &&
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.code.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const resetForm = () => {
    setFormData({ code: '', name: '', sortOrder: 0, status: 'ACTIVE' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (category: any) => {
    setFormData({
      code: category.code,
      name: category.name,
      sortOrder: category.sortOrder,
      status: category.status
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa danh mục "${name}"?`)) {
      try {
        const res = await fetch(`/api/activities/categories/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `/api/activities/categories/${editingId}`
        : '/api/activities/categories';
        
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          ...formData
        })
      });

      if (res.ok) {
        fetchData();
        resetForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <ExperientialTabs activeTab="categories" />
        
        {/* HEADER */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00A99D]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <FolderTree className="w-8 h-8 text-[#00A99D]" />
              Cấu hình Danh mục
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Quản lý các loại danh mục cho Hoạt động trải nghiệm</p>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-full sticky top-6">
              <div className="p-5 border-b border-slate-100/80 bg-slate-50/50">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" /> Nhóm phân loại
                </h2>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto max-h-[calc(100vh-300px)] space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
                {categoryTypes.map((type: any) => {
                  const isActive = activeType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => { setActiveType(type.value); resetForm(); }}
                      className={"w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group " + (
                        isActive 
                          ? 'bg-[#00A99D]/10 text-[#00A99D] shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <span className="truncate pr-2">{type.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>

              {/* SETTINGS BUTTON */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => { setActiveType('SYSTEM_CATEGORY_TYPE'); resetForm(); }}
                  className={"w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 " + (
                    activeType === 'SYSTEM_CATEGORY_TYPE' 
                      ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20' 
                      : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 bg-slate-100/50'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Settings className={"w-4 h-4 " + (activeType === 'SYSTEM_CATEGORY_TYPE' ? 'text-white' : 'text-slate-400')} /> 
                    Quản lý nhóm
                  </span>
                  {activeType === 'SYSTEM_CATEGORY_TYPE' && <ChevronRight className="w-4 h-4 text-white/80" />}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT PANE */}
          <div className="flex-1 space-y-6 min-w-0">
            
            {/* ACTION HEADER */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  Quản lý {activeTypeLabel}
                </h2>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Có {filteredCategories.length} mục trong danh sách này
                </p>
              </div>
              
              {!showForm && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white text-sm font-bold rounded-xl shadow-sm shadow-[#00A99D]/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Thêm mới
                </button>
              )}
            </div>

            {/* FORM */}
            {showForm && (
              <div className="bg-white p-6 md:p-8 shadow-lg shadow-slate-200/40 rounded-3xl border border-slate-200/60 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-[#00A99D]" />
                    {editingId ? 'Cập nhật mục' : 'Thêm mục mới'}
                  </h3>
                  <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mã (Code)</label>
                      <input 
                        required
                        disabled={!!editingId}
                        placeholder="VD: TYPE_1"
                        className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all disabled:opacity-50"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      />
                    </div>
                    
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tên mục</label>
                      <input 
                        required
                        placeholder="Nhập tên hiển thị..."
                        className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Thứ tự</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                      />
                    </div>

                    {editingId && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Trạng thái</label>
                        <select 
                          className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D] block p-3.5 transition-all"
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value})}
                        >
                          <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                          <option value="INACTIVE">Khóa (INACTIVE)</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={resetForm}
                      className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit" 
                      className={"flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 " + (
                        editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-[#00A99D] hover:bg-[#009085] shadow-[#00A99D]/20'
                      )}
                    >
                      <Save className="w-4 h-4" /> {editingId ? 'Lưu thay đổi' : 'Tạo mới'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TABLE */}
            <div className="bg-white p-6 shadow-sm rounded-3xl border border-slate-200/60 overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Danh sách</h3>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm nhanh..." 
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00A99D] transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00A99D] mb-4"></div>
                  <p className="text-sm font-bold">Đang tải dữ liệu...</p>
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold">Không có dữ liệu {activeTypeLabel.toLowerCase()}</p>
                  <p className="text-xs font-medium mt-1 opacity-70">Thêm mục mới để bắt đầu</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
                  <table className="min-w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase font-black tracking-widest">
                      <tr>
                        <th scope="col" className="px-6 py-4 border-b border-slate-200">Mã</th>
                        <th scope="col" className="px-6 py-4 border-b border-slate-200">Tên</th>
                        <th scope="col" className="px-6 py-4 border-b border-slate-200 text-center">Thứ tự</th>
                        <th scope="col" className="px-6 py-4 border-b border-slate-200 text-center">Trạng thái</th>
                        <th scope="col" className="px-6 py-4 border-b border-slate-200 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredCategories.map((c: any) => {
                        const isActive = c.status === 'ACTIVE';
                        return (
                          <tr key={c.id} className={"hover:bg-slate-50/80 transition-colors group " + (editingId === c.id ? 'bg-amber-50/30' : '')}>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-400 font-bold text-xs">
                              {c.code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-black text-slate-800">
                              {c.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-bold text-center">
                              {c.sortOrder}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm " + (
                                isActive ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                              )}>
                                {isActive && <CheckCircle2 className="w-3 h-3" />}
                                {c.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEdit(c)}
                                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                  title="Sửa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(c.id, c.name)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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