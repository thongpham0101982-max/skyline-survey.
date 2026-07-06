"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Settings, Save, Search, Download, Upload,
  CheckCircle2, AlertCircle, Plus, X, Type, Hash
} from 'lucide-react';

export default function ActivityResultInput() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Mock data for students
  const [students, setStudents] = useState([
    { id: 's1', code: 'HS001', name: 'Nguyễn Văn A', class: '10A1', roleId: 'Thành viên', evalLevelId: 'Tốt', achievementId: '', absenceReasonId: '', note: '{"col_1":"9","col_2":"Tích cực"}' },
    { id: 's2', code: 'HS002', name: 'Trần Thị B', class: '10A1', roleId: 'Nhóm trưởng', evalLevelId: 'Xuất sắc', achievementId: 'Giải Nhất', absenceReasonId: '', note: '{"col_1":"10","col_2":"Lãnh đạo tốt"}' },
    { id: 's3', code: 'HS003', name: 'Lê Hoàng C', class: '10A1', roleId: '', evalLevelId: '', achievementId: '', absenceReasonId: 'Ốm', note: '{}' },
  ]);

  // Form Config State
  const [config, setConfig] = useState({
    visibleStandardColumns: ['roleId', 'evalLevelId', 'achievementId', 'note'],
    customColumns: [
      { id: 'col_1', name: 'Điểm sáng tạo', type: 'number' },
      { id: 'col_2', name: 'Nhận xét riêng', type: 'text' }
    ]
  });

  // Edit State for Config Modal
  const [editConfig, setEditConfig] = useState(config);

  const standardColumnsMeta = [
    { id: 'roleId', name: 'Vai trò tham gia' },
    { id: 'evalLevelId', name: 'Mức đánh giá' },
    { id: 'achievementId', name: 'Thành tích' },
    { id: 'absenceReasonId', name: 'Lý do vắng' },
    { id: 'note', name: 'Ghi chú chung' }
  ];

  const handleSaveConfig = () => {
    setConfig(editConfig);
    setShowConfigModal(false);
    // Real app: await fetch('/api/activities/records/' + id, { method: 'PUT', body: JSON.stringify({ formConfig: editConfig }) })
  };

  const addCustomColumn = () => {
    setEditConfig({
      ...editConfig,
      customColumns: [
        ...editConfig.customColumns,
        { id: `col_${Date.now()}`, name: 'Cột mới', type: 'text' }
      ]
    });
  };

  const removeCustomColumn = (colId: string) => {
    setEditConfig({
      ...editConfig,
      customColumns: editConfig.customColumns.filter(c => c.id !== colId)
    });
  };

  const updateCustomColumn = (colId: string, field: string, value: string) => {
    setEditConfig({
      ...editConfig,
      customColumns: editConfig.customColumns.map(c => c.id === colId ? { ...c, [field]: value } : c)
    });
  };

  const handleStudentDataChange = (studentId: string, field: string, value: string, isCustom: boolean = false) => {
    setStudents(students.map(s => {
      if (s.id !== studentId) return s;
      
      if (isCustom) {
        let noteObj = {};
        try { noteObj = JSON.parse(s.note || '{}'); } catch(e) {}
        noteObj[field] = value;
        return { ...s, note: JSON.stringify(noteObj) };
      } else {
        return { ...s, [field]: value };
      }
    }));
  };

  const getCustomValue = (noteString: string, colId: string) => {
    try {
      const obj = JSON.parse(noteString || '{}');
      return obj[colId] || '';
    } catch(e) {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button 
              onClick={() => router.push('/teacher/experiential-activities')}
              className="text-sm font-bold text-slate-500 hover:text-[#00A99D] flex items-center gap-1 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Trở lại danh sách
            </button>
            <h1 className="text-2xl font-black text-slate-800">Nhập kết quả: Trải nghiệm làm gốm Thanh Hà</h1>
            <p className="text-sm text-slate-500 font-medium">Lớp: 10A1 • Ngày: 20/10/2023</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => { setEditConfig(config); setShowConfigModal(true); }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Settings className="w-4 h-4" /> Cấu hình Form nhập
            </button>
            <button className="px-5 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
              <Save className="w-4 h-4" /> Lưu kết quả
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm học sinh..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#00A99D] transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 text-sm font-bold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-2">
              <Download className="w-4 h-4" /> Tải mẫu Excel
            </button>
            <button className="px-3 py-2 text-sm font-bold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-12 text-center">STT</th>
                <th className="px-4 py-4 min-w-[200px]">Học sinh</th>
                
                {/* Standard Columns */}
                {standardColumnsMeta.filter(c => config.visibleStandardColumns.includes(c.id)).map(col => (
                  <th key={col.id} className="px-4 py-4 bg-slate-100/50">{col.name}</th>
                ))}
                
                {/* Custom Columns */}
                {config.customColumns.map(col => (
                  <th key={col.id} className="px-4 py-4 bg-[#00A99D]/5 border-l border-white text-[#00A99D]">
                    <div className="flex items-center gap-1.5">
                      {col.type === 'number' ? <Hash className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                      {col.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student, idx) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{student.name}</div>
                    <div className="text-xs text-slate-500">{student.code} • {student.class}</div>
                  </td>
                  
                  {/* Standard Columns Inputs */}
                  {standardColumnsMeta.filter(c => config.visibleStandardColumns.includes(c.id)).map(col => (
                    <td key={col.id} className="px-4 py-2">
                      {col.id === 'note' ? (
                        <input 
                          type="text"
                          className="w-full min-w-[150px] p-2 bg-transparent border-0 ring-1 ring-slate-200 rounded-md focus:ring-2 focus:ring-[#00A99D] transition-all text-sm"
                          value={student[col.id] || ''}
                          onChange={e => handleStudentDataChange(student.id, col.id, e.target.value)}
                        />
                      ) : (
                        <select
                          className="w-full min-w-[130px] p-2 bg-transparent border-0 ring-1 ring-slate-200 rounded-md focus:ring-2 focus:ring-[#00A99D] transition-all text-sm font-medium"
                          value={student[col.id] || ''}
                          onChange={e => handleStudentDataChange(student.id, col.id, e.target.value)}
                        >
                          <option value="">-- Chọn --</option>
                          {col.id === 'evalLevelId' && (
                            <>
                              <option value="Xuất sắc">Xuất sắc</option>
                              <option value="Tốt">Tốt</option>
                              <option value="Đạt">Đạt</option>
                            </>
                          )}
                          {col.id === 'roleId' && (
                            <>
                              <option value="Nhóm trưởng">Nhóm trưởng</option>
                              <option value="Thành viên">Thành viên</option>
                            </>
                          )}
                          {/* Add options for others as needed */}
                        </select>
                      )}
                    </td>
                  ))}
                  
                  {/* Custom Columns Inputs */}
                  {config.customColumns.map(col => (
                    <td key={col.id} className="px-4 py-2">
                      <input 
                        type={col.type === 'number' ? 'number' : 'text'}
                        className="w-full min-w-[100px] p-2 bg-[#00A99D]/5 border-0 ring-1 ring-[#00A99D]/20 rounded-md focus:ring-2 focus:ring-[#00A99D] transition-all text-sm font-semibold text-slate-700"
                        value={getCustomValue(student.note, col.id)}
                        onChange={e => handleStudentDataChange(student.id, col.id, e.target.value, true)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIG MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800">Cấu hình Form nhập liệu</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Bật/tắt các cột có sẵn hoặc tự tạo tiêu chí đánh giá riêng.</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-8">
              {/* Standard Columns */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00A99D]" /> Cột thông tin chuẩn
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {standardColumnsMeta.map(col => {
                    const isChecked = editConfig.visibleStandardColumns.includes(col.id);
                    return (
                      <label key={col.id} className={"flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer " + (isChecked ? 'bg-[#00A99D]/5 border-[#00A99D]/30' : 'bg-white border-slate-200 opacity-60')}>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-[#00A99D] focus:ring-[#00A99D]"
                          checked={isChecked}
                          onChange={(e) => {
                            const newCols = e.target.checked 
                              ? [...editConfig.visibleStandardColumns, col.id]
                              : editConfig.visibleStandardColumns.filter(id => id !== col.id);
                            setEditConfig({...editConfig, visibleStandardColumns: newCols});
                          }}
                        />
                        <span className={"text-sm font-bold " + (isChecked ? 'text-slate-800' : 'text-slate-500')}>{col.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Custom Columns */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-500" /> Cột tự định nghĩa (Tuỳ chỉnh)
                  </h3>
                  <button onClick={addCustomColumn} className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Thêm cột
                  </button>
                </div>
                
                {editConfig.customColumns.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-sm text-slate-500 font-medium">Bạn chưa tạo cột tuỳ chỉnh nào.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editConfig.customColumns.map((col, idx) => (
                      <div key={col.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="w-6 text-center text-xs font-bold text-slate-400">{idx + 1}</div>
                        <input 
                          type="text"
                          value={col.name}
                          onChange={e => updateCustomColumn(col.id, 'name', e.target.value)}
                          placeholder="Tên cột (VD: Điểm tác phong)"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                        <select
                          value={col.type}
                          onChange={e => updateCustomColumn(col.id, 'type', e.target.value)}
                          className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all"
                        >
                          <option value="text">Văn bản chữ</option>
                          <option value="number">Kiểu số (Điểm)</option>
                        </select>
                        <button onClick={() => removeCustomColumn(col.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Dữ liệu của các <strong>Cột tuỳ chỉnh</strong> sẽ được lưu trữ động trong hệ thống. GVBM có thể tải xuống file Excel chứa toàn bộ các cột này sau khi nhập xong.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
              >
                Huỷ bỏ
              </button>
              <button 
                onClick={handleSaveConfig}
                className="px-6 py-2.5 text-sm font-bold text-white bg-[#00A99D] hover:bg-[#009085] rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}