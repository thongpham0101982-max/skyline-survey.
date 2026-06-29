"use client"
import { useState, useEffect } from "react"
import { ArrowRightLeft, ArrowRightToLine, ArrowLeftToLine, Search, Plus, X, Loader2, UserCheck, GraduationCap, Baby } from "lucide-react"
import { 
  getTransferFormOptionsAction, 
  getClassesByCampusAndYearAction, 
  getStudentsByClassAction, 
  createTransferOutAction, 
  getTransfersAction, 
  createChangeClassAction, 
  updateTransferInAction, 
  getInputAssessmentStudentsAction, 
  getInputAssessmentPeriodsAction, 
  getInputAssessmentBatchesAction, 
  getInputAssessmentStudentsByPeriodAction, 
  getPendingEnrollmentsAction, 
  completeEnrollmentAction,
  getPreschoolInputAssessmentPeriodsAction,
  getPreschoolInputAssessmentBatchesAction,
  getPreschoolInputAssessmentStudentsByPeriodAction
} from "./actions"

const isClassPreschool = (c: any) => {
  if (!c) return false;
  const lvl = (c.level || "").toLowerCase();
  const name = (c.className || "").toLowerCase();
  return lvl.includes("mam") || lvl.includes("mầm") || lvl.includes("preschool") ||
         name.includes("mam") || name.includes("mầm") || name.includes("preschool") ||
         name.includes("nhóm") || name.includes("nhom") ||
         name.includes("chồi") || name.includes("choi") ||
         name.includes("lá") || name.includes("la");
};

const checkIsPreschoolStudent = (student: any) => {
  if (!student) return false;
  return isClassPreschool(student.class);
};

export function StudentTransfersClient() {
  const [activeTab, setActiveTab] = useState<"OUT" | "IN" | "CHANGE_CLASS">("OUT")
  const [activeSubTab, setActiveSubTab] = useState<"general" | "preschool">("general")
  const [showOutModal, setShowOutModal] = useState(false)
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [showInModal, setShowInModal] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<any>(null)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  
  const [transfers, setTransfers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    loadTransfers()
  }, [])

  async function loadTransfers() {
    setLoadingList(true)
    const data = await getTransfersAction()
    setTransfers(data)
    const pendingData = await getPendingEnrollmentsAction()
    setPendingRequests(pendingData)
    setLoadingList(false)
  }


  const filteredTransfers = transfers.filter(t => {
    const isPreschool = checkIsPreschoolStudent(t.student);
    return activeSubTab === "preschool" ? isPreschool : !isPreschool;
  });

  const outTransfers = filteredTransfers.filter(t => t.type === "OUT")
  const changeTransfers = filteredTransfers.filter(t => t.type === "CHANGE_CLASS")
  const inTransfers = filteredTransfers.filter(t => t.type === "IN")

  const filteredPendingRequests = pendingRequests.filter(req => {
    return activeSubTab === "preschool" ? req.isPreschool : !req.isPreschool;
  });

  return (
    <div className="space-y-6">
      {/* Primary Sub-Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("general")}
          className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
            activeSubTab === "general"
              ? "border-[#00A99D] text-[#00A99D] bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          Phổ thông K-12
        </button>
        <button
          onClick={() => setActiveSubTab("preschool")}
          className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
            activeSubTab === "preschool"
              ? "border-[#00A99D] text-[#00A99D] bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
          }`}
        >
          <Baby className="w-5 h-5" />
          Mầm non
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border-2 border-amber-100 overflow-hidden">
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
                ? "bg-[#00A99D]/10 text-[#00A99D] border-b-4 border-indigo-500 shadow-sm"
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
             <input type="text" placeholder="Tìm kiếm học sinh..." className="w-full pl-11 pr-4 focus:border-indigo-500 font-medium outline-none transition-all text-xs font-semibold" />
           </div>
           
           {activeTab === "OUT" && (
             <button onClick={() => setShowOutModal(true)} className="px-6 py-3 bg-[#00A99D] text-white font-bold rounded-2xl hover:bg-[#009085] transition-all flex items-center shadow-lg shadow-[#00A99D]/20">
               <Plus className="w-5 h-5 mr-2" /> Tạo phiếu Chuyển đi
             </button>
           )}

           {activeTab === "CHANGE_CLASS" && (
             <button onClick={() => setShowChangeModal(true)} className="px-6 py-3 bg-[#00A99D] text-white font-bold rounded-2xl hover:bg-[#009085] transition-all flex items-center shadow-lg shadow-[#00A99D]/20">
               <Plus className="w-5 h-5 mr-2" /> Tạo phiếu Chuyển lớp
             </button>
           )}

           {activeTab === "IN" && (
             <button onClick={() => setShowInModal(true)} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all flex items-center shadow-lg shadow-emerald-100">
               <Plus className="w-5 h-5 mr-2" /> Tạo phiếu Chuyển đến
             </button>
           )}
        </div>

        {activeTab === "OUT" && (
          loadingList ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : outTransfers.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="text-slate-600 font-bold uppercase text-[10px] tracking-wider text-xs font-semibold">
                  <tr>
                    <th className="p-2 border border-slate-200">Ngày chuyển</th>
                    <th className="p-2 border border-slate-200">Học sinh</th>
                    <th className="p-2 border border-slate-200">Lớp / Cơ sở cũ</th>
                    <th className="p-2 border border-slate-200">Diện chuyển</th>
                    <th className="p-2 border border-slate-200">Nơi đến</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outTransfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 text-xs font-semibold">
                      <td className="p-2 font-medium text-slate-700 border border-slate-200">{new Date(t.transferDate).toLocaleDateString('vi-VN')} <br/><span className="text-xs text-slate-400">{t.semester === 'HK1' ? 'Học kỳ 1' : t.semester === 'HK2' ? 'Học kỳ 2' : t.semester === 'SUMMER' ? 'Trong hè' : ''}</span></td>
                      <td className="p-2 font-bold text-slate-900 border border-slate-200">{t.student?.studentName} <br/><span className="text-xs font-medium text-slate-400">{t.student?.studentCode}</span></td>
                      <td className="p-2 border border-slate-200"><span className="px-2 py-1 bg-slate-100 rounded-md font-bold text-slate-600">{t.student?.class?.className}</span> <br/><span className="text-xs text-slate-500">{t.student?.class?.campus?.campusName}</span></td>
                      <td className="p-2 font-medium text-rose-600 border border-slate-200">{t.transferCategory === "DOMESTIC" ? "Chuyển trường VN" : t.transferCategory === "ABROAD" ? "Du học" : "Bảo lưu"}</td>
                      <td className="p-2 text-slate-600 border border-slate-200">{t.transferCategory === "DOMESTIC" ? t.destinationSchool : t.transferCategory === "ABROAD" ? t.destinationCountry : t.reserveStartDate ? `Từ ${new Date(t.reserveStartDate).toLocaleDateString('vi-VN')} đến ${new Date(t.reserveEndDate).toLocaleDateString('vi-VN')}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-xs font-semibold">
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
              <table className="w-full text-left text-sm border-collapse">
                <thead className="text-slate-600 font-bold uppercase text-[10px] tracking-wider text-xs font-semibold">
                  <tr>
                    <th className="p-2 border border-slate-200">Ngày chuyển</th>
                    <th className="p-2 border border-slate-200">Học sinh</th>
                    <th className="p-2 border border-slate-200">Lớp chuyển đến</th>
                    <th className="p-2 border border-slate-200">Lý do</th><th className="p-2 text-right border border-slate-200">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changeTransfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 text-xs font-semibold">
                      <td className="p-2 font-medium text-slate-700 border border-slate-200">{new Date(t.transferDate).toLocaleDateString('vi-VN')} <br/><span className="text-xs text-slate-400">{t.semester === 'HK1' ? 'Học kỳ 1' : t.semester === 'HK2' ? 'Học kỳ 2' : t.semester === 'SUMMER' ? 'Trong hè' : ''}</span></td>
                      <td className="p-2 font-bold text-slate-900 border border-slate-200">{t.student?.studentName} <br/><span className="text-xs font-medium text-slate-400">{t.student?.studentCode}</span></td>
                      <td className="p-2 font-medium text-[#00A99D] border border-slate-200">{t.destinationSchool}</td>
                      <td className="p-2 text-slate-600 border border-slate-200">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-xs font-semibold">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                 <ArrowRightLeft className="w-8 h-8 text-indigo-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có dữ liệu chuyển lớp</h3>
               <p className="text-slate-500 font-medium">Bấm "Tạo phiếu Chuyển lớp" để thêm mới.</p>
            </div>
          )
        )}
        
        {activeTab === "IN" && (
          loadingList ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-8">
              {/* Pending Enrollment Requests Section */}
              {filteredPendingRequests.length > 0 && (
                <div className="p-6 text-xs font-semibold">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full opacity-75 text-xs font-semibold"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 text-xs font-semibold"></span>
                    </span>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">
                      Danh sách Yêu cầu Nhập học chờ xử lý ({filteredPendingRequests.length})
                    </h3>
                  </div>
                  <div className="border border-amber-100 bg-white rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="text-slate-600 font-bold uppercase text-[10px] tracking-wider text-xs font-semibold">
                        <tr>
                          <th className="p-2 border border-slate-200">Ngày yêu cầu</th>
                          <th className="p-2 border border-slate-200">Học sinh</th>
                          <th className="p-2 border border-slate-200">Cơ sở dự tuyển</th>
                          <th className="p-2 border border-slate-200">Phân hệ / Khối</th>
                          <th className="p-2 border border-slate-200">Trạng thái</th>
                          <th className="p-2 text-right border border-slate-200">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPendingRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50/50 text-xs font-semibold">
                            <td className="p-2 font-medium text-slate-700 border border-slate-200">
                              {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="p-2 font-bold text-slate-900 border border-slate-200">
                              {req.fullName} <br/>
                              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Mã KS: {req.studentCode}</span>
                            </td>
                            <td className="p-2 font-semibold text-slate-600 border border-slate-200">
                              {req.admissionCampus}
                            </td>
                            <td className="p-2 border border-slate-200">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${req.isPreschool ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                {req.isPreschool ? "Mầm non" : `Khối ${req.grade}`}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-200">
                              <span className="text-xs font-bold text-amber-800 text-xs font-semibold">
                                Chờ xếp lớp
                              </span>
                            </td>
                            <td className="p-2 text-right border border-slate-200">
                              <button 
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowInModal(true);
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Xếp lớp
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* History / Completed Transfers-In */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Lịch sử học sinh Chuyển đến</h3>
                {inTransfers.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="text-slate-600 font-bold uppercase text-[10px] tracking-wider text-xs font-semibold">
                        <tr>
                          <th className="p-2 border border-slate-200">Ngày nhập học</th>
                          <th className="p-2 border border-slate-200">Học sinh</th>
                          <th className="p-2 border border-slate-200">Lớp chuyển đến</th>
                          <th className="p-2 border border-slate-200">Lý do</th>
                          <th className="p-2 text-right border border-slate-200">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inTransfers.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50 text-xs font-semibold">
                            <td className="p-2 font-medium text-slate-700 border border-slate-200">{new Date(t.transferDate).toLocaleDateString('vi-VN')} <br/><span className="text-xs text-slate-400">{t.semester === 'HK1' ? 'Học kỳ 1' : t.semester === 'HK2' ? 'Học kỳ 2' : t.semester === 'SUMMER' ? 'Trong hè' : ''}</span></td>
                            <td className="p-2 font-bold text-slate-900 border border-slate-200">{t.student?.studentName} <br/><span className="text-xs font-medium text-slate-400">{t.student?.studentCode}</span></td>
                            <td className="p-2 font-medium text-emerald-600 border border-slate-200">{t.destinationSchool}</td>
                            <td className="p-2 text-slate-600 border border-slate-200">{t.reason}</td>
                            <td className="p-2 text-right border border-slate-200">
                              <button 
                                onClick={() => {
                                  setEditingTransfer(t);
                                  setShowInModal(true);
                                }}
                                className="text-[#00A99D] font-bold hover:text-indigo-800 transition-colors"
                              >
                                Sửa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-16 text-center text-xs font-semibold">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                      <ArrowLeftToLine className="w-8 h-8 text-emerald-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có dữ liệu chuyển đến</h3>
                    <p className="text-slate-500 font-medium">Bấm "Tạo phiếu Chuyển đến" để thêm mới.</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

{showOutModal && <TransferOutModal activeSubTab={activeSubTab} onClose={() => setShowOutModal(false)} onSaved={loadTransfers} />}
      {showChangeModal && <ChangeClassModal activeSubTab={activeSubTab} onClose={() => setShowChangeModal(false)} onSaved={loadTransfers} />}
      {showInModal && (
        <TransferInModal 
          activeSubTab={activeSubTab}
          initialData={editingTransfer} 
          enrollmentRequest={selectedRequest}
          onClose={() => { 
            setShowInModal(false); 
            setEditingTransfer(null); 
            setSelectedRequest(null);
          }} 
          onSaved={loadTransfers} 
        />
      )}
    </div>
    </div>
  )
}

function TransferOutModal({ activeSubTab, onClose, onSaved }: { activeSubTab: "general" | "preschool", onClose: () => void, onSaved: () => void }) {
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
        const activeYear = data.years.find((y: any) => !y.isOff) || data.years[0];
        if (activeYear) setForm(f => ({ ...f, academicYearId: activeYear.id }))
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
  const [provinces, setProvinces] = useState<string[]>([])

  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/")
      .then(res => res.json())
      .then(data => setProvinces(data.map((p: any) => p.name)))
      .catch(e => console.error("Lỗi tải tỉnh thành", e))
  }, [])

  const filteredClasses = classes.filter(c => {
    const isPre = isClassPreschool(c);
    return activeSubTab === "preschool" ? isPre : !isPre;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 text-xs font-semibold">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Năm học</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})}>
                  <option value="">Chọn năm học</option>
                  {options.years.filter((y: any) => !y.isOff).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})}>
                  <option value="">Chọn cơ sở</option>
                  {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp học</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                  <option value="">Chọn lớp học</option>
                  {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Học sinh</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})}>
                  <option value="">Chọn học sinh</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.studentName} ({s.studentCode})</option>)}
                </select>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Transfer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày chuyển</label>
                <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.transferDate} onChange={e => setForm({...form, transferDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kỳ học</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                  <option value="">Chọn kỳ</option>
                  <option value="HK1">Học kỳ 1</option>
                  <option value="HK2">Học kỳ 2</option>
                  <option value="SUMMER">Trong hè</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Diện chuyển</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.transferCategory} onChange={e => setForm({...form, transferCategory: e.target.value})}>
                  <option value="">Chọn diện</option>
                  <option value="DOMESTIC">Chuyển trường VN</option>
                  <option value="ABROAD">Du học</option>
                  <option value="RESERVE">Bảo lưu</option>
                </select>
              </div>
            </div>

            {form.transferCategory === "DOMESTIC" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/55 p-5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trường chuyển đến</label>
                  <input type="text" placeholder="Tên trường" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destinationSchool} onChange={e => setForm({...form, destinationSchool: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Loại hình</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destinationType} onChange={e => setForm({...form, destinationType: e.target.value})}>
                    <option value="">Chọn loại</option>
                    <option value="PRIVATE">Tư thục</option>
                    <option value="PUBLIC">Công lập</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tỉnh/TP</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destinationProvince} onChange={e => setForm({...form, destinationProvince: e.target.value})}>
                    <option value="">Chọn Tỉnh/TP</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            )}

            {form.transferCategory === "ABROAD" && (
              <div className="p-5 bg-slate-50/55 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quốc gia theo học</label>
                <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destinationCountry} onChange={e => setForm({...form, destinationCountry: e.target.value})}>
                  <option value="">Chọn Quốc gia</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {form.transferCategory === "RESERVE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50/55 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Từ ngày</label>
                  <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reserveStartDate} onChange={e => setForm({...form, reserveStartDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Đến ngày</label>
                  <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reserveEndDate} onChange={e => setForm({...form, reserveEndDate: e.target.value})} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lý do chuyển</label>
              <textarea placeholder="Nhập lý do chi tiết..." rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button disabled={saving} type="submit" className="px-6 py-3 bg-[#00A99D] text-white font-bold rounded-xl hover:bg-[#009085] transition-colors shadow-lg shadow-[#00A99D]/20 flex items-center">
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

function ChangeClassModal({ activeSubTab, onClose, onSaved }: { activeSubTab: "general" | "preschool", onClose: () => void, onSaved: () => void }) {
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
        const activeYear = data.years.find((y: any) => !y.isOff) || data.years[0];
        if (activeYear) setForm(f => ({ ...f, academicYearId: activeYear.id }))
      }
    } catch(e: any) {
        console.error("Error loading transfer data:", e)
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

  const filteredClasses = classes.filter(c => {
    const isPre = isClassPreschool(c);
    return activeSubTab === "preschool" ? isPre : !isPre;
  });

  const filteredDestClasses = destClasses.filter(c => {
    const isPre = isClassPreschool(c);
    return activeSubTab === "preschool" ? isPre : !isPre;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 text-xs font-semibold">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Năm học</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})}>
                    <option value="">Chọn năm học</option>
                    {options.years.filter((y: any) => !y.isOff).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở hiện tại</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})}>
                    <option value="">Chọn cơ sở</option>
                    {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp hiện tại</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                    <option value="">Chọn lớp học</option>
                    {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Học sinh</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})}>
                    <option value="">Chọn học sinh</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.studentName} ({s.studentCode})</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Destination Info */}
            <div>
              <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 pb-2 border-b border-[#00A99D]/20">Thông tin chuyển đến</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#00A99D]/5 p-5 rounded-2xl border border-[#00A99D]/20">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở chuyển đến</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destCampusId} onChange={e => setForm({...form, destCampusId: e.target.value})}>
                    <option value="">Chọn cơ sở</option>
                    {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp chuyển đến</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.destClassId} onChange={e => setForm({...form, destClassId: e.target.value})}>
                    <option value="">Chọn lớp</option>
                    {filteredDestClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Other details */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày chuyển</label>
                  <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.transferDate} onChange={e => setForm({...form, transferDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kỳ học</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                    <option value="">Chọn kỳ</option>
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                    <option value="SUMMER">Trong hè</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lý do chuyển</label>
                <input type="text" placeholder="Nhập lý do chi tiết..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-xs font-semibold text-slate-800" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button disabled={saving} type="submit" className="px-6 py-3 bg-[#00A99D] text-white font-bold rounded-xl hover:bg-[#009085] transition-colors shadow-lg shadow-[#00A99D]/20 flex items-center">
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
function TransferInModal({ activeSubTab, onClose, onSaved, initialData, enrollmentRequest }: { activeSubTab: "general" | "preschool", onClose: () => void, onSaved: () => void, initialData?: any, enrollmentRequest?: any }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [options, setOptions] = useState({ years: [] as any[], campuses: [] as any[] })
  const [classes, setClasses] = useState<any[]>([])
  
  const [periods, setPeriods] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [assessmentStudents, setAssessmentStudents] = useState<any[]>([])
  
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedBatch, setSelectedBatch] = useState("")
  const [selectedAssessmentStudent, setSelectedAssessmentStudent] = useState<any>(null)
  
  const [form, setForm] = useState({
    academicYearId: "",
    campusId: "",
    classId: "",
    assessmentStudentId: "",
    studentCode: "",
    studentName: "",
    transferDate: new Date().toISOString().split("T")[0],
    semester: "HK1",
    reason: ""
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const ops = await getTransferFormOptionsAction()
      let campusId = "";
      if (ops && ops.years) {
        setOptions(ops)
        const activeYear = ops.years.find((y: any) => !y.isOff) || ops.years[0];
        if (!initialData && activeYear) {
          setForm(f => ({ ...f, academicYearId: activeYear.id }))
        }
        if (enrollmentRequest?.admissionCampus && ops.campuses) {
          const campusMatch = ops.campuses.find((c: any) => 
            c.campusName.toLowerCase().trim() === enrollmentRequest.admissionCampus.toLowerCase().trim() ||
            c.campusCode.toLowerCase().trim() === enrollmentRequest.admissionCampus.toLowerCase().trim()
          );
          if (campusMatch) campusId = campusMatch.id;
        }
      }
      
      const isPreTarget = enrollmentRequest ? enrollmentRequest.isPreschool : (activeSubTab === "preschool");
      const pds = await (isPreTarget ? getPreschoolInputAssessmentPeriodsAction() : getInputAssessmentPeriodsAction())
      setPeriods(pds)

      if (enrollmentRequest) {
        const activeYear = ops?.years?.find((y: any) => !y.isOff) || ops?.years?.[0];
        setForm({
          academicYearId: activeYear ? activeYear.id : "",
          campusId: campusId,
          classId: "",
          assessmentStudentId: enrollmentRequest.id,
          studentCode: enrollmentRequest.studentCode || "",
          studentName: enrollmentRequest.fullName || "",
          transferDate: new Date().toISOString().split("T")[0],
          semester: "HK1",
          reason: "Tổ chức nhập học từ kết quả khảo sát"
        });
        setSelectedAssessmentStudent({
          fullName: enrollmentRequest.fullName,
          studentCode: enrollmentRequest.studentCode,
          dateOfBirth: enrollmentRequest.dateOfBirth
        });
      } else if (initialData) {
        setForm({
          academicYearId: initialData.student?.academicYearId || "",
          campusId: initialData.student?.campusId || "",
          classId: initialData.student?.classId || "",
          assessmentStudentId: "EXISTING",
          studentCode: initialData.student?.studentCode || "",
          studentName: initialData.student?.studentName || "",
          transferDate: new Date(initialData.transferDate).toISOString().split("T")[0],
          semester: initialData.semester || "HK1",
          reason: initialData.reason || ""
        });
        setSelectedAssessmentStudent({
          fullName: initialData.student?.studentName,
          studentCode: initialData.student?.studentCode,
          dateOfBirth: initialData.student?.dateOfBirth
        });
      }
    } catch(e: any) {
        console.error("Error loading transfer data:", e)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedPeriod) {
      const isPreTarget = enrollmentRequest ? enrollmentRequest.isPreschool : (activeSubTab === "preschool");
      if (isPreTarget) {
        getPreschoolInputAssessmentBatchesAction(selectedPeriod).then(setBatches)
      } else {
        getInputAssessmentBatchesAction(selectedPeriod).then(setBatches)
      }
      setAssessmentStudents([])
      setSelectedBatch("")
      loadStudents(selectedPeriod, "")
    }
  }, [selectedPeriod])

  useEffect(() => {
    if (selectedPeriod) {
      loadStudents(selectedPeriod, selectedBatch)
    }
  }, [selectedBatch])

  async function loadStudents(pId: string, bId: string) {
    const isPreTarget = enrollmentRequest ? enrollmentRequest.isPreschool : (activeSubTab === "preschool");
    const data = await (isPreTarget ? getPreschoolInputAssessmentStudentsByPeriodAction(pId, bId) : getInputAssessmentStudentsByPeriodAction(pId, bId))
    setAssessmentStudents(data)
  }

  useEffect(() => {
    if (form.campusId && form.academicYearId) {
      getClassesByCampusAndYearAction(form.campusId, form.academicYearId).then(setClasses)
    }
  }, [form.campusId, form.academicYearId])

  function handleSelectStudent(id: string) {
    const s = assessmentStudents.find(x => x.id === id);
    if (s) {
      setForm(f => ({ 
        ...f, 
        assessmentStudentId: id,
        studentCode: s.studentCode || "",
        studentName: s.fullName || ""
      }))
      setSelectedAssessmentStudent(s)
    }
  }

  async function handleSubmit(e: any, notifyGVCN = false) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      let res;
      if (enrollmentRequest) {
        res = await completeEnrollmentAction(enrollmentRequest.id, enrollmentRequest.isPreschool, form);
      } else if (initialData) {
        res = await updateTransferInAction(initialData.id, form);
      } else {
        res = await createTransferInAction({
          ...form,
          isPreschool: activeSubTab === "preschool"
        });
      }
      
      if (res.success) {
        alert(enrollmentRequest ? "Đã tổ chức nhập học và xếp lớp thành công!" : initialData ? "Đã cập nhật thông tin thành công!" : (notifyGVCN ? "Đã tiếp nhận và thông báo đến GVCN thành công!" : "Đã lưu thông tin học sinh!"));
        onSaved()
        onClose()
      } else {
        alert("Lỗi: " + res.error)
      }
    } catch (err: any) {
      alert("Lỗi hệ thống: " + err.message)
    }
    setSaving(false)
  }

  const filteredClasses = classes.filter(c => {
    const isPreschoolTarget = enrollmentRequest ? enrollmentRequest.isPreschool : (activeSubTab === "preschool");
    const isPre = isClassPreschool(c);
    return isPreschoolTarget ? isPre : !isPre;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 text-xs font-semibold">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <ArrowLeftToLine className="w-5 h-5 mr-3 text-emerald-500" /> 
            {initialData ? "Chỉnh sửa phiếu học sinh chuyển đến" : "Tạo phiếu học sinh chuyển đến"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
           <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : (
                    <form className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
            
            {/* Input Assessment Data selection */}
            {enrollmentRequest ? (
              <div className="p-5 mb-4 text-xs font-semibold bg-amber-50/50 rounded-2xl border border-amber-200">
                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse bg-amber-500 rounded-full"></span>
                  Học sinh khảo sát liên kết
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
                  <div>Họ và tên: <span className="font-black text-slate-900">{enrollmentRequest.fullName}</span></div>
                  <div>Mã khảo sát: <span className="font-mono font-black text-indigo-700 text-xs font-semibold">{enrollmentRequest.studentCode}</span></div>
                  <div>Phân hệ / Khối: <span className="font-black text-slate-900">{enrollmentRequest.isPreschool ? "Mầm non" : `Khối ${enrollmentRequest.grade}`}</span></div>
                </div>
              </div>
            ) : !initialData && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b">CĂN CỨ DỮ LIỆU KHẢO SÁT</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 mb-4 bg-slate-50/55 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-emerald-650 uppercase tracking-wider mb-2">1. Chọn Kỳ khảo sát ({periods.length})</label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                      <option value="">Chọn kỳ...</option>
                      {periods.filter(p => !form.academicYearId || p.academicYearId === form.academicYearId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-650 uppercase tracking-wider mb-2">2. Chọn Đợt khảo sát</label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                      <option value="">Tất cả các đợt</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-650 uppercase tracking-wider mb-2">3. Chọn Học sinh</label>
                    <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.assessmentStudentId} onChange={e => handleSelectStudent(e.target.value)}>
                      <option value="">Chọn học sinh...</option>
                      {assessmentStudents.map(s => <option key={s.id} value={s.id}>{s.fullName} - MS: {s.studentCode}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Destination Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b">Thông tin tiếp nhận</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Họ và tên học sinh</label>
                  <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.studentName} onChange={e => setForm({...form, studentName: e.target.value})} placeholder="Nhập họ và tên..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mã KS (Khảo sát)</label>
                  <input disabled type="text" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-semibold outline-none text-slate-550 cursor-not-allowed" value={selectedAssessmentStudent?.studentCode || ""} placeholder="Mã KS từ dữ liệu..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mã HS</label>
                  <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.studentCode} onChange={e => setForm({...form, studentCode: e.target.value})} placeholder="Nhập mã HS mới..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Năm học</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.academicYearId} onChange={e => {
                    const yId = e.target.value;
                    setForm({...form, academicYearId: yId});
                    const currentPeriodObj = periods.find(p => p.id === selectedPeriod);
                    if (currentPeriodObj && currentPeriodObj.academicYearId !== yId) {
                      setSelectedPeriod("");
                      setBatches([]);
                      setAssessmentStudents([]);
                    }
                  }}>
                    <option value="">Chọn năm học</option>
                    {options.years.filter((y: any) => !y.isOff).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kỳ học</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                    <option value="SUMMER">Trong hè</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ sở</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})}>
                    <option value="">Chọn cơ sở</option>
                    {options.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lớp học</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.classId} onChange={e => setForm({...form, classId: e.target.value})}>
                    <option value="">Chọn lớp học</option>
                    {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Other details */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày nhập học</label>
                  <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.transferDate} onChange={e => setForm({...form, transferDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ghi chú thêm</label>
                <input type="text" placeholder="Nhập ghi chú chi tiết (nếu có)..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-xs font-semibold text-slate-800" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              
              <button 
                type="button"
                onClick={() => handleSubmit(null)}
                disabled={saving}
                className="px-6 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {initialData ? "Lưu thay đổi" : "Lưu phiếu"}
              </button>

              <button 
                type="button"
                onClick={() => handleSubmit(null, true)}
                disabled={saving}
                className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Thông báo đến GVCN
              </button>
            </div>
          </form>

        )}
      </div>
    </div>
  )
}
