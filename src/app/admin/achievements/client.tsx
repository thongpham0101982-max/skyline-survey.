"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react"

const CATEGORIES = {
  "Học thuật": ["Toán", "Ngữ văn", "Tiếng Anh", "Khoa học tự nhiên", "Khoa học xã hội"],
  "Khoa học - Công nghệ": ["Khoa học kỹ thuật", "STEM", "Robotics", "AI", "Lập trình"],
  "Nghệ thuật": ["Âm nhạc", "Mỹ thuật", "Múa", "Sân khấu"],
  "Thể thao": ["Bóng đá", "Bơi lội", "Điền kinh", "Hội khỏe Phù Đổng"],
  "Kỹ năng - hoạt động xã hội": ["Hùng biện", "Tranh biện", "Kỹ năng sống", "Lãnh đạo trẻ"]
};
const OTHER_KEY = "__khac__";
const OTHER_NATURE_LABEL = "Khác...";

const ALL_LEVELS = ["Tiểu học", "THCS", "THPT"];
const ALL_GRADES = Array.from({length: 12}, (_, i) => `Khối ${i + 1}`);

const emptyForm = {
  competitionCode: "",
  competitionName: "",
  level: [],
  grade: [],
  nature: "Học thuật",
  customNature: "",
  field: "Toán",
  customField: "",
  organizingLevel: "Cấp Tỉnh",
  recognition: "",
  participationType: "Bắt buộc",
  academicYear: ""
};

export function AchievementsClient({ initialData }) {
  const [achievements, setAchievements] = useState(initialData)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    if (!editingId && formData.academicYear) {
      const stt = (achievements.length + 1).toString().padStart(2, "0");
      const shortYear = formData.academicYear.split("-")[0] || formData.academicYear;
      setFormData(prev => ({ ...prev, competitionCode: `EX-${stt}-${shortYear}` }));
    }
  }, [formData.academicYear, achievements.length, editingId]);

  function detectCustomNature(nature) {
    if (!nature) return { nature: "Học thuật", customNature: "" };
    if (nature === OTHER_NATURE_LABEL || !CATEGORIES[nature]) {
      return { nature: OTHER_KEY, customNature: nature === OTHER_NATURE_LABEL ? "" : nature };
    }
    return { nature, customNature: "" };
  }

  function detectCustomField(nature, field) {
    const knownFields = nature && CATEGORIES[nature] ? CATEGORIES[nature] : [];
    if (!field) return { field: knownFields[0] || OTHER_KEY, customField: "" };
    if (!knownFields.includes(field)) {
      return { field: OTHER_KEY, customField: field };
    }
    return { field, customField: "" };
  }

  function toggleArrayItem(array, item) {
    if (array.includes(item)) return array.filter(i => i !== item);
    return [...array, item];
  }

  function resolveValues() {
    const actualNature = formData.nature === OTHER_KEY
      ? (formData.customNature.trim() || OTHER_NATURE_LABEL)
      : formData.nature;
    const actualField = formData.field === OTHER_KEY
      ? (formData.customField.trim() || "Khác")
      : formData.field;
    return { actualNature, actualField };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { actualNature, actualField } = resolveValues();
    const submitData = {
      competitionCode: formData.competitionCode,
      competitionName: formData.competitionName,
      nature: actualNature,
      field: actualField,
      level: formData.level.join(", "),
      grade: formData.grade.join(", "),
      organizingLevel: formData.organizingLevel,
      recognition: formData.recognition,
      participationType: formData.participationType,
      academicYear: formData.academicYear
    };
    try {
      const res = await fetch("/api/achievements", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...submitData } : submitData)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Có lỗi xảy ra khi lưu");
      }
      setIsOpen(false);
      setEditingId(null);
      window.location.reload();
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Xóa bản ghi này?")) return;
    try {
      const res = await fetch("/api/achievements?id=" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Không thể xóa");
      window.location.reload();
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  }

  const isNatureOther = formData.nature === OTHER_KEY;
  const isFieldOther = formData.field === OTHER_KEY;
  const currentFields = (!isNatureOther && CATEGORIES[formData.nature]) ? CATEGORIES[formData.nature] : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
        <div className="flex items-center gap-3">
           <GraduationCap className="w-5 h-5 text-indigo-600" />
           <span className="font-semibold text-slate-800">Danh mục Kỳ thi ({achievements.length})</span>
        </div>
        <button 
          onClick={() => {
            setEditingId(null)
            setFormData({...emptyForm, field: CATEGORIES["Học thuật"][0], academicYear: ""})
            setIsOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Thêm Danh mục
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Mã Kỳ thi</th>
              <th className="px-6 py-4">Tên Kỳ thi</th>
              <th className="px-6 py-4 whitespace-nowrap">Bậc học / Khối</th>
              <th className="px-6 py-4 whitespace-nowrap">Tính chất / Lĩnh vực</th>
              <th className="px-6 py-4 whitespace-nowrap">Cấp tổ chức</th>
              <th className="px-6 py-4 whitespace-nowrap">Năm học</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {achievements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  Chưa có dữ liệu danh mục kỳ thi.
                </td>
              </tr>
            ) : (
              achievements.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">{item.competitionCode}</td>
                  <td className="px-6 py-4 text-slate-800 font-medium max-w-[200px] truncate">{item.competitionName}</td>
                  <td className="px-6 py-4 text-slate-600 max-w-[160px] truncate" title={item.level + " - " + item.grade}>
                    <div className="font-medium text-indigo-600 truncate">{item.level}</div>
                    <div className="text-xs text-slate-400 truncate">{item.grade}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="font-medium">{item.nature}</div>
                    <div className="text-xs text-slate-400">{item.field}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.organizingLevel}</td>
                  <td className="px-6 py-4 text-slate-600">{item.academicYear}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => {
                          setEditingId(item.id)
                          const { nature: detNature, customNature } = detectCustomNature(item.nature);
                          const { field: detField, customField } = detectCustomField(detNature === OTHER_KEY ? "" : item.nature, item.field);
                          setFormData({
                            competitionCode: item.competitionCode,
                            competitionName: item.competitionName,
                            level: item.level ? item.level.split(", ").filter(Boolean) : [],
                            grade: item.grade ? item.grade.split(", ").filter(Boolean) : [],
                            nature: detNature,
                            customNature,
                            organizingLevel: item.organizingLevel || "",
                            field: detField,
                            customField,
                            recognition: item.recognition || "",
                            participationType: item.participationType || "",
                            academicYear: item.academicYear || ""
                          })
                          setIsOpen(true)
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                         <Pencil className="w-4 h-4" />
                       </button>
                      <button 
                         onClick={() => handleDelete(item.id)}
                         className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingId ? "Sửa Danh mục" : "Thêm mới Danh mục"}
                </h3>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-lg">✕</button>
             </div>
             
             <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
               <form id="ach-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Mã Kỳ thi *</label>
                      <input
                        required
                        placeholder="VD: EX-01-2023"
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                        value={formData.competitionCode}
                        onChange={e => setFormData({...formData, competitionCode: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Tên Kỳ thi / Cuộc thi *</label>
                      <input
                        required
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                        value={formData.competitionName}
                        onChange={e => setFormData({...formData, competitionName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Năm học *</label>
                      <input
                        required
                        placeholder="VD: 2023-2024"
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                        value={formData.academicYear}
                        onChange={e => setFormData({...formData, academicYear: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">Phân loại Bậc học</label>
                      <div className="flex gap-4 flex-wrap">
                        {ALL_LEVELS.map(lvl => (
                           <label key={lvl} className="flex items-center gap-2 cursor-pointer px-4 py-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
                              <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={formData.level.includes(lvl)} onChange={() => setFormData({...formData, level: toggleArrayItem(formData.level, lvl)})} />
                              <span className="text-sm font-medium text-slate-700">{lvl}</span>
                           </label>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">Phân loại Khối</label>
                      <div className="grid grid-cols-4 gap-2">
                        {ALL_GRADES.map(gr => (
                           <label key={gr} className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-all">
                              <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={formData.grade.includes(gr)} onChange={() => setFormData({...formData, grade: toggleArrayItem(formData.grade, gr)})} />
                              <span className="text-sm text-slate-700">{gr}</span>
                           </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Tính chất *</label>
                      <select className="w-full border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium" value={formData.nature} onChange={e => { const newNature = e.target.value; const firstField = newNature !== OTHER_KEY && CATEGORIES[newNature] ? CATEGORIES[newNature][0] : OTHER_KEY; setFormData({ ...formData, nature: newNature, customNature: "", field: firstField, customField: "" }) }}>
                        {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        <option value={OTHER_KEY}>✏️ Khác...</option>
                      </select>
                      {isNatureOther && <input required placeholder="Nhập tên Tính chất mới..." className="mt-2 w-full border border-indigo-300 rounded-xl px-4 py-2.5 bg-indigo-50/50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm" value={formData.customNature} onChange={e => setFormData({...formData, customNature: e.target.value})} />}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Lĩnh vực *</label>
                      {!isNatureOther ? (<select className="w-full border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium" value={formData.field} onChange={e => setFormData({...formData, field: e.target.value, customField: ""})}>{currentFields.map(f => <option key={f} value={f}>{f}</option>)}<option value={OTHER_KEY}>✏️ Khác...</option></select>) : (<input required placeholder="Nhập tên Lĩnh vực mới..." className="w-full border border-indigo-300 rounded-xl px-4 py-2.5 bg-indigo-50/50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm" value={formData.customField} onChange={e => setFormData({...formData, customField: e.target.value, field: OTHER_KEY})} />)}
                      {isFieldOther && !isNatureOther && <input required placeholder="Nhập tên Lĩnh vực mới..." className="mt-2 w-full border border-indigo-300 rounded-xl px-4 py-2.5 bg-indigo-50/50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm" value={formData.customField} onChange={e => setFormData({...formData, customField: e.target.value})} />}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Cấp tổ chức</label>
                      <input placeholder="VD: Cấp Trường, Địa phương, Quốc gia..." className="w-full border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm" value={formData.organizingLevel} onChange={e => setFormData({...formData, organizingLevel: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Tuyển chọn / Loại hình</label>
                      <select className="w-full border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm" value={formData.participationType} onChange={e => setFormData({...formData, participationType: e.target.value})}>
                        <option value="Bắt buộc">Bắt buộc</option>
                        <option value="Tự nguyện">Tự nguyện</option>
                        <option value="Tự do">Tự do</option>
                      </select>
                    </div>
                  </div>
               </form>
             </div>
             <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
               <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-semibold transition-colors">Hủy bỏ</button>
               <button form="ach-form" type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold transition-colors shadow-sm shadow-indigo-600/30">{editingId ? "Cập nhật Danh mục" : "Lưu Danh mục"}</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}