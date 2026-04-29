"use client"
import { useState, useEffect } from "react"
import { ArrowRightLeft, ArrowRightToLine, ArrowLeftToLine, Search, Plus, X, Loader2 } from "lucide-react"
import { getTransferFormOptionsAction, getClassesByCampusAndYearAction, getStudentsByClassAction, createTransferOutAction, getTransfersAction, createChangeClassAction } from "./actions"

export function StudentTransfersClient() {
  const [activeTab, setActiveTab] = useState<"OUT" | "IN" | "CHANGE_CLASS">("OUT")
  const [showOutModal, setShowOutModal] = useState(false)
  const [showChangeModal, setShowChangeModal] = useState(false)
  
  const [transfers, setTransfers] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    loadTransfers()
  }, [])

  async function loadTransfers() {
    setLoadingList(true)
    const data = await getTransfersAction()
    setTransfers(data)
    setLoadingList(false)
  }

  const outTransfers = transfers.filter(t => t.type === "OUT")
  const changeTransfers = transfers.filter(t => t.type === "CHANGE_CLASS")

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-100 p-2 flex gap-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("OUT")}
          className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
            activeTab === "OUT"
              ? "bg-rose-50 text-rose-600 border-b-4 border-rose-500 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <ArrowRightToLine className="w-5 h-5 mr-3" />
          Chuyển đi
        </button>
        <button
          onClick={() => setActiveTab("IN")}
          className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
            activeTab === "IN"
              ? "bg-emerald-50 text-emerald-600 border-b-4 border-emerald-500 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <ArrowLeftToLine className="w-5 h-5 mr-3" />
          Chuyển đến
        </button>
        <button
          onClick={() => setActiveTab("CHANGE_CLASS")}
          className={`flex items-center px-6 py-4 text-sm font-bold rounded-2xl transition-all whitespace-nowrap ${
            activeTab === "CHANGE_CLASS"
              ? "bg-indigo-50 text-indigo-600 border-b-4 border-indigo-500 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <ArrowRightLeft className="w-5 h-5 mr-3" />
          Chuyển lớp
        </button>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
           <div className="relative w-72">
             <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Tìm kiếm học sinh..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-medium outline-none transition-all" />
           </div>
           
           {activeTab === "OUT" && (
             <button onClick={() => setShowOutModal(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center shadow-lg shadow-indigo-100">
               <Plus className="w-5 h-5 mr-2" /> Tạo phiếu Chuyển đi
             </button>
           )}

           {activeTab === "CHANGE_CLASS" && (
             <button onClick={() => setShowChangeModal(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center shadow-lg shadow-indigo-100">
               <Plus className="w-5 h-5 mr-2" /> Tạo phiếu Chuyển lớp
             </button>
           )}
        </div>

        {activeTab === "OUT" && (
          loadingList ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : outTransfers.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Ngày chuyển</th>
                    <th className="p-4">Học sinh</th>
                    <th className="p-4">Lớp / Cơ sở cũ</th>
                    <th className="p-4">Diện chuyển</th>
                    <th className="p-4">Nơi đến</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outTransfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-700">{new Date(t.transferDate).toLocaleDateString('vi-VN')} <br/><span className="text-xs text-slate-400">{t.semester === 'HK1' ? 'Học kỳ 1' : t.semester === 'HK2' ? 'Học kỳ 2' : t.semester === 'SUMMER' ? 'Trong hè' : ''}</span></td>
                      <td className="p-4 font-bold text-slate-900">{t.student?.studentName} <br/><span className="text-xs font-medium text-slate-400">{t.student?.studentCode}</span></td>
                      <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded-md font-bold text-slate-600">{t.student?.class?.className}</span> <br/><span className="text-xs text-slate-500">{t.student?.class?.campus?.campusName}</span></td>
                      <td className="p-4 font-medium text-rose-600">{t.transferCategory === "DOMESTIC" ? "Chuyển trường VN" : t.transferCategory === "ABROAD" ? "Du học" : "Bảo lưu"}</td>
                      <td className="p-4 text-slate-600">{t.transferCategory === "DOMESTIC" ? t.destinationSchool : t.transferCategory === "ABROAD" ? t.destinationCountry : t.reserveStartDate ? `Từ ${new Date(t.reserveStartDate).toLocaleDateString('vi-VN')} đến ${new Date(t.reserveEndDate).toLocaleDateString('vi-VN')}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-16 text-center">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                 <ArrowRightToLine className="w-8 h-8 text-rose-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có dữ liệu chuyển đi</h3>
               <p className="text-slate-500 font-medium">Bấm "Tạo phiếu Chuyển đi" để thêm mới.</p>
            </div>
          )
        )}

        {activeTab === "CHANGE_CLASS" && (
          loadingList ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : changeTransfers.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Ngày chuyển</th>
                    <th className="p-4">Học sinh</th>
                    <th className="p-4">Lớp chuyển đến</th>
                    <th className="p-4">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changeTransfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-700">{new Date(t.transferDate).toLocaleDateString('vi-VN')} <br/><span className="text-xs text-slate-400">{t.semester === 'HK1' ? 'Học kỳ 1' : t.semester === 'HK2' ? 'Học kỳ 2' : t.semester === 'SUMMER' ? 'Trong hè' : ''}</span></td>
                      <td className="p-4 font-bold text-slate-900">{t.student?.studentName} <br/><span className="text-xs font-medium text-slate-400">{t.student?.studentCode}</span></td>
                      <td className="p-4 font-medium text-indigo-600">{t.destinationSchool}</td>
                      <td className="p-4 text-slate-600">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-16 text-center">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                 <ArrowRightLeft className="w-8 h-8 text-indigo-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có dữ liệu chuyển lớp</h3>
               <p className="text-slate-500 font-medium">Bấm "Tạo phiếu Chuyển lớp" để thêm mới.</p>
            </div>
          )
        )}
        
        {activeTab === "IN" && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-16 text-center">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                 <ArrowLeftToLine className="w-8 h-8 text-slate-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">Tính năng đang phát triển</h3>
               <p className="text-slate-500 font-medium">Tính năng này đang trong quá trình phát triển để liên kết với hệ thống nhân sự.</p>
            </div>
        )}
      </div>

      {showOutModal && <TransferOutModal onClose={() => setShowOutModal(false)} onSaved={loadTransfers} />}
      {showChangeModal && <ChangeClassModal onClose={() => setShowChangeModal(false)} onSaved={loadTransfers} />}
    </div>
  )
}

function TransferOutModal({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [options, setOptions] = useState({ years: [] as any[], campuses: [] as any[] })
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  
  const [form, setForm] = useState({
    academicYearId: "",
    campusId: "",
    classId: "",
    studentId: "",
    transferDate: "",
    semester: "",
    transferCategory: "", // DOMESTIC, ABROAD
    destinationSchool: "",
    destinationType: "",
    destinationProvince: "",
    destinationCountry: "",
    reserveStartDate: "",
    reserveEndDate: "",
    reason: ""
  })

  useEffect(() => {
    loadOptions()
  }, [])

  async function loadOptions() {
    setLoading(true)
    try {
      const data = await getTransferFormOptionsAction()
      if (data && data.years) {
        setOptions(data)
        if (data.years.length > 0) setForm(f => ({ ...f, academicYearId: data.years[0].id }))
      } else {
        alert("Lỗi tải dữ liệu. Xin thử lại.")
      }
    } catch(e: any) {
      alert("Lỗi tải form: " + e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (form.campusId && form.academicYearId) {
      getClassesByCampusAndYearAction(form.campusId, form.academicYearId).then(data => {
        setClasses(data)
        setForm(f => ({ ...f, classId: "", studentId: "" }))
      })
    }
  }, [form.campusId, form.academicYearId])

  useEffect(() => {
    if (form.classId) {
      getStudentsByClassAction(form.classId).then(data => {
        setStudents(data)
        setForm(f => ({ ...f, studentId: "" }))
      })
    }
  }, [form.classId])

  async function handleSubmit(e: any) {
    e.preventDefault()
    setSaving(true)
    const res = await createTransferOutAction(form)
    setSaving(false)
    if (res.success) {
      alert("Đã tạo phiếu lưu chuyển và cập nhật danh sách lớp!")
      onSaved()
      onClose()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const COUNTRIES = ["Mỹ", "Anh", "Úc", "Canada", "Singapore", "Nhật Bản", "Hàn Quốc", "New Zealand", "Trung Quốc", "Đài Loan", "Pháp", "Đức", "Thụy Sĩ", "Hà Lan", "Phần Lan", "Ireland", "Nga", "Khác..."]
  const PROVINCES = ["An Giang", "Bà Rịa - Vũng Tàu", "Bạc Liêu", "Bắc Giang", "Bắc Kạn", "Bắc Ninh", "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước", "Bình Thuận", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lạng Sơn", "Lào Cai", "Lâm Đồng", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "TP Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"]

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <ArrowRightToLine className="w-5 h-5 mr-3 text-rose-500" /> 
            Tạo phiếu Chuyển đi
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
           <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Filter Group */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Năm học</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})}>
                  <option value="">Chọn năm học</option>
                  {options.years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})}>
                  <option value="">Chọn cơ sở</option>
                  {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp học</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                  <option value="">Chọn lớp học</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Học sinh</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})}>
                  <option value="">Chọn học sinh</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.studentName} ({s.studentCode})</option>)}
                </select>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Transfer Details */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày chuyển</label>
                <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.transferDate} onChange={e => setForm({...form, transferDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kỳ học</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                  <option value="">Chọn kỳ</option>
                  <option value="HK1">Học kỳ 1</option>
                  <option value="HK2">Học kỳ 2</option>
                  <option value="SUMMER">Trong hè</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Diện chuyển</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.transferCategory} onChange={e => setForm({...form, transferCategory: e.target.value})}>
                  <option value="">Chọn diện</option>
                  <option value="DOMESTIC">Chuyển trường VN</option>
                  <option value="ABROAD">Du học</option>
                  <option value="RESERVE">Bảo lưu</option>
                </select>
              </div>
            </div>

            {form.transferCategory === "DOMESTIC" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trường chuyển đến</label>
                  <input type="text" placeholder="Tên trường" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.destinationSchool} onChange={e => setForm({...form, destinationSchool: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Loại hình</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.destinationType} onChange={e => setForm({...form, destinationType: e.target.value})}>
                    <option value="">Chọn loại</option>
                    <option value="PRIVATE">Tư thục</option>
                    <option value="PUBLIC">Công lập</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tỉnh/TP</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.destinationProvince} onChange={e => setForm({...form, destinationProvince: e.target.value})}>
                    <option value="">Chọn Tỉnh/TP</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            )}

            {form.transferCategory === "ABROAD" && (
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quốc gia theo học</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-orange-500 transition-colors" value={form.destinationCountry} onChange={e => setForm({...form, destinationCountry: e.target.value})}>
                    <option value="">Chọn Quốc gia</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
            )}

            {form.transferCategory === "RESERVE" && (
              <div className="grid grid-cols-2 gap-4 bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Từ ngày</label>
                    <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-yellow-500 transition-colors" value={form.reserveStartDate} onChange={e => setForm({...form, reserveStartDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Đến ngày</label>
                    <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-yellow-500 transition-colors" value={form.reserveEndDate} onChange={e => setForm({...form, reserveEndDate: e.target.value})} />
                  </div>
              </div>
            )}


            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lý do chuyển</label>
              <textarea placeholder="Nhập lý do chi tiết..." rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button disabled={saving} type="submit" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Xác nhận chuyển
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function ChangeClassModal({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [options, setOptions] = useState({ years: [] as any[], campuses: [] as any[] })
  const [classes, setClasses] = useState<any[]>([])
  const [destClasses, setDestClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  
  const [form, setForm] = useState({
    academicYearId: "",
    campusId: "",
    classId: "",
    studentId: "",
    destCampusId: "",
    destClassId: "",
    transferDate: "",
    semester: "",
    reason: ""
  })

  useEffect(() => {
    loadOptions()
  }, [])

  async function loadOptions() {
    setLoading(true)
    try {
      const data = await getTransferFormOptionsAction()
      if (data && data.years) {
        setOptions(data)
        if (data.years.length > 0) setForm(f => ({ ...f, academicYearId: data.years[0].id }))
      }
    } catch(e: any) {}
    setLoading(false)
  }

  useEffect(() => {
    if (form.campusId && form.academicYearId) {
      getClassesByCampusAndYearAction(form.campusId, form.academicYearId).then(data => {
        setClasses(data)
        setForm(f => ({ ...f, classId: "", studentId: "" }))
      })
    }
  }, [form.campusId, form.academicYearId])

  useEffect(() => {
    if (form.classId) {
      getStudentsByClassAction(form.classId).then(data => {
        setStudents(data)
        setForm(f => ({ ...f, studentId: "" }))
      })
    }
  }, [form.classId])

  useEffect(() => {
    if (form.destCampusId && form.academicYearId) {
      getClassesByCampusAndYearAction(form.destCampusId, form.academicYearId).then(data => {
        setDestClasses(data)
        setForm(f => ({ ...f, destClassId: "" }))
      })
    }
  }, [form.destCampusId, form.academicYearId])

  async function handleSubmit(e: any) {
    e.preventDefault()
    setSaving(true)
    const res = await createChangeClassAction(form)
    setSaving(false)
    if (res.success) {
      alert("Đã chuyển lớp thành công!")
      onSaved()
      onClose()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <ArrowRightLeft className="w-5 h-5 mr-3 text-indigo-500" /> 
            Tạo phiếu Chuyển lớp
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
           <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
            
            {/* Current Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b">Thông tin hiện tại</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Năm học</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})}>
                    <option value="">Chọn năm học</option>
                    {options.years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở hiện tại</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})}>
                    <option value="">Chọn cơ sở</option>
                    {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp hiện tại</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                    <option value="">Chọn lớp học</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Học sinh</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})}>
                    <option value="">Chọn học sinh</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.studentName} ({s.studentCode})</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Destination Info */}
            <div>
              <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 pb-2 border-b border-indigo-100">Thông tin chuyển đến</h3>
              <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở chuyển đến</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.destCampusId} onChange={e => setForm({...form, destCampusId: e.target.value})}>
                    <option value="">Chọn cơ sở</option>
                    {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp chuyển đến</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.destClassId} onChange={e => setForm({...form, destClassId: e.target.value})}>
                    <option value="">Chọn lớp</option>
                    {destClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Other details */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày chuyển</label>
                <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.transferDate} onChange={e => setForm({...form, transferDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kỳ học</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                  <option value="">Chọn kỳ</option>
                  <option value="HK1">Học kỳ 1</option>
                  <option value="HK2">Học kỳ 2</option>
                  <option value="SUMMER">Trong hè</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lý do chuyển</label>
                <input type="text" placeholder="Nhập lý do chi tiết..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button disabled={saving} type="submit" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Xác nhận chuyển lớp
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
