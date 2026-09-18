"use client"
import Link from "next/link"
import { useState, useRef, useMemo } from "react"
import { 
  Upload, Download, UserCircle2, Plus, Trash2, Edit2, X, Save, Send, 
  RefreshCw, ArrowUpDown, Layers, ExternalLink, FileCode, ArrowRightLeft, 
  Sparkles, CheckCircle2, AlertCircle, Check, FileSpreadsheet 
} from "lucide-react"
import * as xlsx from "xlsx"
import { 
  importStudentsAction, 
  addStudentAction, 
  updateStudentAction, 
  deleteStudentsAction, 
  assignSurveyToStudentAction, 
  syncClassStudentsWithSurveysAction, 
  convertStudentTypeAction,
  updateStudentVnEduCodeAction,
  importVnEduMappingAction
} from "./actions"
import { sortVietnameseStudents } from "@/lib/vietnameseSort"

export function AdminClassStudentsClient({ classId, initialStudents, activeSurveys = [] }: any) {
  const [students, setStudents] = useState(initialStudents)
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [syncingSurveys, setSyncingSurveys] = useState(false)
  const [isAlphaSorted, setIsAlphaSorted] = useState(true)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedSurveyId, setSelectedSurveyId] = useState("")
  const [assigningStudent, setAssigningStudent] = useState<any>(null)
  const [formData, setFormData] = useState({ studentCode: "", vnEduCode: "", studentName: "", gender: "Nam", dateOfBirth: "", status: "ACTIVE", studentType: "CHINH_KHOA", studentTypeNote: "" })
  const [studentTypeFilter, setStudentTypeFilter] = useState<"ALL" | "CHINH_KHOA" | "GIAO_LUU">("ALL")
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertingStudent, setConvertingStudent] = useState<any>(null)
  const [convertTargetType, setConvertTargetType] = useState<"CHINH_KHOA" | "GIAO_LUU">("CHINH_KHOA")
  const [convertReason, setConvertReason] = useState("")
  const [convertSyncSurvey, setConvertSyncSurvey] = useState(true)
  const [convertingLoading, setConvertingLoading] = useState(false)

  // State cho Ánh xạ VNEdu
  const [uploadingMapping, setUploadingMapping] = useState(false)
  const [editingVnEduId, setEditingVnEduId] = useState<string | null>(null)
  const [tempVnEduValue, setTempVnEduValue] = useState<string>("")
  const [savingVnEdu, setSavingVnEdu] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputMappingRef = useRef<HTMLInputElement>(null)

  const chinhKhoaCount = useMemo(() => (students || []).filter((s: any) => s.studentType !== "GIAO_LUU").length, [students]);
  const giaoLuuCount = useMemo(() => (students || []).filter((s: any) => s.studentType === "GIAO_LUU").length, [students]);

  const displayStudents = useMemo(() => {
    if (!students || students.length === 0) return []
    return isAlphaSorted ? sortVietnameseStudents(students) : students
  }, [students, isAlphaSorted])

  const filteredStudents = useMemo(() => {
    let list = displayStudents;
    if (studentTypeFilter === "CHINH_KHOA") {
      list = list.filter((s: any) => s.studentType !== "GIAO_LUU");
    } else if (studentTypeFilter === "GIAO_LUU") {
      list = list.filter((s: any) => s.studentType === "GIAO_LUU");
    }
    return list;
  }, [displayStudents, studentTypeFilter]);

  const handleSyncSurveys = async () => {
    if (!confirm("Thực hiện đồng bộ tất cả học sinh trong lớp với Danh sách khảo sát đang mở?")) return
    setSyncingSurveys(true)
    const res = await syncClassStudentsWithSurveysAction(classId)
    if (res.success) {
      alert(res.message)
      window.location.reload()
    } else {
      alert("Lỗi đồng bộ: " + res.error)
    }
    setSyncingSurveys(false)
  }

  // Tải file mẫu thêm học sinh
  const handleDownloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { "STT": 1, "Mã học sinh *": "HS-10A1-001", "Mã VNEdu": "2500839484", "Họ và Tên *": "Nguyễn Văn A", "Giới tính": "Nam", "Ngày sinh": "20/05/2010", "Diện Học sinh": "Chính khóa" },
      { "STT": 2, "Mã học sinh *": "HS-10A1-002", "Mã VNEdu": "2500839485", "Họ và Tên *": "Bagdan Khabibov", "Giới tính": "Nam", "Ngày sinh": "15/12/2010", "Diện Học sinh": "Giao lưu" }
    ])
    ws["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 20 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 16 }]
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Danh_sach_HS")
    xlsx.writeFile(wb, "Form_Mau_Them_Hoc_Sinh.xlsx")
  }

  // Xuất file Excel ánh xạ VNEdu cho danh sách học sinh của lớp hiện tại
  const handleExportVnEduTemplate = () => {
    if (!displayStudents || displayStudents.length === 0) {
      alert("Lớp học chưa có học sinh nào để xuất file ánh xạ.");
      return;
    }

    const excelData = displayStudents.map((s: any, idx: number) => ({
      "STT": idx + 1,
      "Mã HS": String(s.studentCode || "").trim(),
      "Họ và Tên": s.studentName || "",
      "Mã VNEdu": s.vnEduCode ? String(s.vnEduCode).trim() : ""
    }));

    const ws = xlsx.utils.json_to_sheet(excelData);
    ws["!cols"] = [
      { wch: 6 },  // STT
      { wch: 20 }, // Mã HS
      { wch: 30 }, // Họ và Tên
      { wch: 22 }  // Mã VNEdu
    ];

    // Thiết lập định dạng text (chuỗi) cho cột Mã HS (B) và Mã VNEdu (D) để không bị mất số 0 ở đầu
    const range = xlsx.utils.decode_range(ws["!ref"] || "A1:D1");
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cellB = ws[xlsx.utils.encode_cell({ r: R, c: 1 })]; // Cột B: Mã HS
      if (cellB) { cellB.t = "s"; cellB.z = "@"; }
      const cellD = ws[xlsx.utils.encode_cell({ r: R, c: 3 })]; // Cột D: Mã VNEdu
      if (cellD) { cellD.t = "s"; cellD.z = "@"; }
    }

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Anh_Xa_VNEdu");
    xlsx.writeFile(wb, `Danh_Sach_Anh_Xa_VNEdu_${classId.slice(-6)}.xlsx`);
  };

  // Import file Excel ánh xạ VNEdu (STT, Mã HS, Mã VNEdu)
  const handleFileMappingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMapping(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = xlsx.read(buffer, { type: "array" });
        let ws = null;
        let headerRowIndex = -1;

        for (const sheetName of wb.SheetNames) {
          const currentWs = wb.Sheets[sheetName];
          const rawData = xlsx.utils.sheet_to_json(currentWs, { header: 1 }) as any[][];
          if (!rawData || rawData.length === 0) continue;

          for (let i = 0; i < Math.min(15, rawData.length); i++) {
            const row = rawData[i];
            const rowText = row.map(c => String(c || "").toLowerCase().trim()).join(" ");
            if (
              (rowText.includes("mã hs") || rowText.includes("mã học sinh") || rowText.includes("studentcode") || rowText.includes("ma hs")) &&
              (rowText.includes("vnedu") || rowText.includes("mã sở") || rowText.includes("sở"))
            ) {
              headerRowIndex = i;
              ws = currentWs;
              break;
            }
          }
          if (ws) break;
        }

        // Fallback: tìm theo mã hs nếu chưa thấy cả 2 từ khóa
        if (!ws) {
          for (const sheetName of wb.SheetNames) {
            const currentWs = wb.Sheets[sheetName];
            const rawData = xlsx.utils.sheet_to_json(currentWs, { header: 1 }) as any[][];
            if (!rawData || rawData.length === 0) continue;

            for (let i = 0; i < Math.min(15, rawData.length); i++) {
              const row = rawData[i];
              const rowText = row.map(c => String(c || "").toLowerCase().trim()).join(" ");
              if (rowText.includes("mã hs") || rowText.includes("mã học sinh") || rowText.includes("ma hs")) {
                headerRowIndex = i;
                ws = currentWs;
                break;
              }
            }
            if (ws) break;
          }
        }

        if (!ws || headerRowIndex === -1) {
          alert("Không tìm thấy dòng tiêu đề cột chứa 'Mã HS' và 'Mã VNEdu' trong file Excel. Vui lòng kiểm tra lại file mẫu.");
          setUploadingMapping(false);
          return;
        }

        const data = xlsx.utils.sheet_to_json(ws, { range: headerRowIndex }) as any[];

        const findVal = (row: any, keywords: string[]) => {
          const keys = Object.keys(row);
          for (const key of keys) {
            const k = key.toLowerCase().trim();
            if (keywords.some(kw => k.includes(kw.toLowerCase()))) return row[key];
          }
          return null;
        };

        const mappings: { studentCode: string; vnEduCode: string }[] = [];
        for (const row of data) {
          const sCode = String(findVal(row, ["mã học sinh", "mã hs", "ma hs", "studentcode", "mã csdl", "databasecode"]) || "").trim();
          const vCode = String(findVal(row, ["mã vnedu", "mã vn edu", "vnedu", "vneducode", "ma vnedu", "mã sở", "mã skl"]) || "").trim();
          if (sCode && vCode) {
            mappings.push({ studentCode: sCode, vnEduCode: vCode });
          }
        }

        if (mappings.length === 0) {
          alert("Không tìm thấy dữ liệu ánh xạ hợp lệ (cần có cả cột Mã HS và Mã VNEdu có dữ liệu trên cùng dòng).");
          setUploadingMapping(false);
          return;
        }

        const res = await importVnEduMappingAction(classId, mappings);
        if (res.success) {
          let msg = `Đã cập nhật ánh xạ thành công cho ${res.successCount} học sinh! Bỏ qua/giữ nguyên: ${res.skippedCount}.`;
          if (res.warnings && res.warnings.length > 0) {
            msg += `\n\nCảnh báo / Lỗi:\n${res.warnings.slice(0, 10).join("\n")}`;
            if (res.warnings.length > 10) {
              msg += `\n... và ${res.warnings.length - 10} cảnh báo khác.`;
            }
          }
          alert(msg);
          window.location.reload();
        } else {
          alert("Lỗi: " + res.error);
        }
      } catch (err: any) {
        console.error(err);
        alert("Lỗi khi xử lý file Excel ánh xạ: " + err.message);
      } finally {
        setUploadingMapping(false);
        if (fileInputMappingRef.current) fileInputMappingRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Lưu nhanh mã VNEdu trực tiếp trên bảng
  const handleSaveQuickVnEdu = async (student: any) => {
    setSavingVnEdu(true);
    const res = await updateStudentVnEduCodeAction(classId, student.id, student.studentCode, tempVnEduValue);
    if (res.success) {
      setStudents((prev: any[]) =>
        prev.map((s: any) =>
          s.id === student.id ? { ...s, vnEduCode: res.vnEduCode } : s
        )
      );
      setEditingVnEduId(null);
    } else {
      alert("Lỗi lưu Mã VNEdu: " + ((res as any).error || "Không rõ nguyên nhân"));
    }
    setSavingVnEdu(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result
        const wb = xlsx.read(buffer, { type: "array" })
        let ws = null;
        let data: any[] = [];
        let headerRowIndex = -1;

        for (const sheetName of wb.SheetNames) {
          const currentWs = wb.Sheets[sheetName];
          const rawData = xlsx.utils.sheet_to_json(currentWs, { header: 1 }) as any[][];
          if (!rawData || rawData.length === 0) continue;

          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row.some(cell => {
              const c = String(cell).toLowerCase();
              return c.includes("mã") || c.includes("học sinh") || c.includes("tên") || c.includes("hs") || c.includes("student");
            })) {
              headerRowIndex = i;
              ws = currentWs;
              break;
            }
          }
          if (ws) break;
        }

        if (!ws || headerRowIndex === -1) {
          alert("Không tìm thấy dữ liệu học sinh. Vui lòng kiểm tra lại file Excel (Cột 'Mã HS', 'Họ tên'...).");
          setUploading(false);
          return;
        }

        data = xlsx.utils.sheet_to_json(ws, { range: headerRowIndex }) as any[];

        const payload = data.filter(row => Object.values(row).some(v => v !== null && v !== "")).map((row: any) => {
          const findVal = (row: any, keywords: string[]) => {
            const keys = Object.keys(row);
            for (const key of keys) {
              const k = key.toLowerCase().trim();
              if (keywords.some(kw => k.includes(kw.toLowerCase()))) return row[key];
            }
            return null;
          };

          let parsedDate = null
          const rawDate = findVal(row, ["ngày sinh", "ngay sinh", "dob", "birth"]);
          if (rawDate) {
            if (typeof rawDate === "number") {
              const date = new Date(Math.round((rawDate - 25569)*86400*1000))
              parsedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
            } else if (typeof rawDate === "string") {
              const parts = String(rawDate).split(/[\/\-]/);
              if (parts.length === 3) {
                const d = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const y = parseInt(parts[2], 10);
                if (parts[0].length === 4) parsedDate = new Date(String(rawDate));
                else parsedDate = new Date(y, m, d);
              } else {
                parsedDate = new Date(String(rawDate));
              }
            } else {
              parsedDate = new Date(rawDate);
            }
          }

          const studentCode = String(findVal(row, ["mã học sinh", "mã hs", "ma hs", "studentcode"]) || "").trim() || ("HS-" + Date.now() + "-" + Math.floor(Math.random()*1000));
          const vnEduCode = String(findVal(row, ["mã vnedu", "mã vnedu", "vnedu", "vneducode", "ma vnedu"]) || "").trim();
          const studentName = String(findVal(row, ["họ và tên", "họ tên", "ho ten", "studentname", "full name"]) || "").trim() || "Unnamed";
          const gender = String(findVal(row, ["giới tính", "gioi tinh", "gender"]) || "Nam").trim();
          const rawType = String(findVal(row, ["diện học sinh", "dien hoc sinh", "diện hs", "loại học sinh", "loai hoc sinh", "studenttype"]) || "").trim();
          const studentType = (rawType.toLowerCase().includes("giao lưu") || rawType.toLowerCase().includes("giao luu")) ? "GIAO_LUU" : "CHINH_KHOA";

          return {
            studentCode,
            vnEduCode,
            studentName,
            gender,
            studentType,
            dateOfBirth: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null
          }
        })
        const res = await importStudentsAction(classId, payload)
        if (res.success) {
          let msg = "[Version 2.1] Đã import thành công " + res.count + " học sinh! Bỏ qua: " + (res.skipped || 0);
          if (res.warnings && res.warnings.length > 0) {
            msg += "\n\nCảnh báo trùng lặp:\n" + res.warnings.join("\n");
          }
          alert(msg);
          window.location.reload();
        } else {
          alert("Lỗi server: " + res.error);
        }
      } catch(e) {
        console.error(e);
        alert("Lỗi khi đọc file Excel.");
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    reader.readAsArrayBuffer(file);
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStudents.map((s: any) => s.id))
    else setSelectedIds([])
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id])
    else setSelectedIds(selectedIds.filter(x => x !== id))
  }

  const handleDeleteMany = async () => {
    if (!confirm("Xóa " + selectedIds.length + " học sinh đã chọn?")) return
    setSubmitting(true)
    const res = await deleteStudentsAction(classId, selectedIds)
    if (res.success) {
       setStudents(students.filter((s: any) => !selectedIds.includes(s.id)))
       setSelectedIds([])
    } else { alert("Lỗi: " + res.error) }
    setSubmitting(false)
  }

  const handleDeleteOne = async (id: string) => {
    if (!confirm("Xóa học sinh này?")) return
    setSubmitting(true)
    const res = await deleteStudentsAction(classId, [id])
    if (res.success) {
       setStudents(students.filter((s: any) => s.id !== id))
       setSelectedIds(selectedIds.filter(x => x !== id))
    } else { alert("Lỗi: " + res.error) }
    setSubmitting(false)
  }

  const handleAssign = async () => {
    if (!selectedSurveyId || !assigningStudent) return
    setSubmitting(true)
    const res = await assignSurveyToStudentAction(assigningStudent.id, selectedSurveyId)
    if (res.success) {
      alert("Đã gán khảo sát thành công!")
      setShowAssignModal(false)
      window.location.reload()
    } else {
      alert("Lỗi: " + res.error)
    }
    setSubmitting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    let res
    if (editingStudent) {
      res = await updateStudentAction(classId, editingStudent.id, formData)
    } else {
      res = await addStudentAction(classId, formData)
    }

    if (res.success) {
      window.location.reload()
    } else {
      alert("Lỗi: " + res.error)
      setSubmitting(false)
    }
  }

  const openConvertModal = (s: any, targetType: "CHINH_KHOA" | "GIAO_LUU") => {
    setConvertingStudent(s);
    setConvertTargetType(targetType);
    setConvertReason("");
    setConvertSyncSurvey(true);
    setShowConvertModal(true);
  };

  const handleConvertStudentType = async () => {
    if (!convertingStudent) return;
    if (!convertReason.trim()) {
      alert("Vui lòng nhập lý do hoặc căn cứ quyết định chuyển đổi diện học sinh!");
      return;
    }
    setConvertingLoading(true);
    const res = await convertStudentTypeAction({
      studentId: convertingStudent.id,
      classId,
      targetType: convertTargetType,
      reason: convertReason.trim(),
      syncSurvey: convertSyncSurvey
    });
    setConvertingLoading(false);
    if (res.success) {
      alert(res.message);
      setShowConvertModal(false);
      window.location.reload();
    } else {
      alert("Lỗi chuyển đổi: " + res.error);
    }
  };

  const openEdit = (s: any) => {
    setEditingStudent(s)
    setFormData({
      studentCode: s.studentCode,
      vnEduCode: s.vnEduCode !== "—" ? s.vnEduCode || "" : "",
      studentName: s.studentName,
      gender: s.gender || "Nam",
      dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split("T")[0] : "",
      status: s.status || "ACTIVE",
      studentType: s.studentType || "CHINH_KHOA",
      studentTypeNote: s.studentTypeNote || ""
    })
    setShowAddModal(true)
  }

  const openAdd = () => {
    setEditingStudent(null)
    setFormData({ studentCode: "", vnEduCode: "", studentName: "", gender: "Nam", dateOfBirth: "", status: "ACTIVE", studentType: "CHINH_KHOA", studentTypeNote: "" })
    setShowAddModal(true)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-emerald-100">
      {/* Modal for Assign Survey */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between text-xs font-semibold p-4 border-b border-emerald-100 bg-emerald-50">
               <h3 className="font-bold text-emerald-800">Gán Khảo Sát cho {assigningStudent?.studentName}</h3>
               <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-emerald-200 rounded-full transition-colors"><X className="w-5 h-5 text-emerald-500" /></button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Chọn đợt khảo sát *</label>
                 <select value={selectedSurveyId} onChange={e => setSelectedSurveyId(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                   <option value="">-- Chọn đợt khảo sát --</option>
                   {activeSurveys.map((s: any) => (
                     <option key={s.id} value={s.id}>{s.name} (Hết hạn: {new Date(s.endDate).toLocaleDateString("vi-VN")})</option>
                   ))}
                 </select>
                 {activeSurveys.length === 0 && <p className="text-xs text-amber-600 mt-1">Không có đợt khảo sát nào đang hoạt động.</p>}
               </div>
               <div className="pt-4 flex gap-3">
                 <button onClick={() => setShowAssignModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all">Hủy</button>
                 <button onClick={handleAssign} disabled={submitting || !selectedSurveyId} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 text-xs">
                   {submitting ? "Đang xử lý..." : "Xác nhận Gán"}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Modal Chuyển đổi Loại Học sinh */}
      {showConvertModal && convertingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-purple-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Chuyển Diện Học Sinh</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Thay đổi phân loại Chính khóa / Giao lưu</p>
                </div>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-1.5 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-2xs">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Thông tin học sinh */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Học sinh:</span>
                  <span className="text-xs font-bold text-slate-800">{convertingStudent.studentName} ({convertingStudent.studentCode})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Diện hiện tại:</span>
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    convertingStudent.studentType === "GIAO_LUU"
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : "bg-sky-100 text-sky-800 border border-sky-200"
                  }`}>
                    {convertingStudent.studentType === "GIAO_LUU" ? "Học sinh Giao lưu" : "Học sinh Chính khóa"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-xs text-slate-500 font-medium">Chuyển sang:</span>
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                    convertTargetType === "CHINH_KHOA"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 ring-2 ring-emerald-400/20"
                      : "bg-purple-100 text-purple-800 border border-purple-300 ring-2 ring-purple-400/20"
                  }`}>
                    ➔ {convertTargetType === "CHINH_KHOA" ? "Học sinh Chính khóa" : "Học sinh Giao lưu"}
                  </span>
                </div>
              </div>

              {/* Tùy chọn chuyển đổi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Diện học sinh đích *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConvertTargetType("CHINH_KHOA")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      convertTargetType === "CHINH_KHOA"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600 font-medium"
                    }`}
                  >
                    <div className="text-xs font-bold">Chính khóa</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Học tập chính thức theo chương trình</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertTargetType("GIAO_LUU")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      convertTargetType === "GIAO_LUU"
                        ? "border-purple-500 bg-purple-50/50 text-purple-900 ring-2 ring-purple-500/20 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600 font-medium"
                    }`}
                  >
                    <div className="text-xs font-bold">Giao lưu</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Học giao lưu / Trao đổi / Hội nhập</div>
                  </button>
                </div>
              </div>

              {/* Lý do chuyển đổi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lý do / Căn cứ quyết định chuyển đổi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={convertReason}
                  onChange={e => setConvertReason(e.target.value)}
                  placeholder="Ví dụ: Theo quyết định số 45/QĐ-BGH; Đã hoàn thành chương trình bồi dưỡng tiếng Việt; Đạt cam kết học tập chính thức..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              {/* Tùy chọn đồng bộ kết quả khảo sát đầu vào */}
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="convertSyncSurvey"
                  checked={convertSyncSurvey}
                  onChange={e => setConvertSyncSurvey(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 mt-0.5 cursor-pointer"
                />
                <label htmlFor="convertSyncSurvey" className="text-xs text-amber-900 cursor-pointer select-none">
                  <span className="font-bold">Đồng bộ cập nhật hồ sơ khảo sát đầu vào:</span> Tự động ghi nhận chuyển đổi kết quả tuyển sinh sang <span className="font-bold">{convertTargetType === "CHINH_KHOA" ? "Đạt (Chính khóa)" : "Đạt - Giao lưu"}</span> và lưu nhật ký duyệt vào hệ thống.
                </label>
              </div>

              {/* Nút hành động */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  disabled={convertingLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConvertStudentType}
                  disabled={convertingLoading || !convertReason.trim()}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {convertingLoading ? "Đang xử lý..." : "Xác nhận chuyển đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between text-xs font-semibold p-4 border-b border-slate-100 bg-slate-50">
               <h3 className="font-bold text-slate-800">{editingStudent ? "Sửa Thông Tin" : "Thêm Học Sinh Mới"}</h3>
               <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Mã học sinh *</label>
                   <input required value={formData.studentCode} onChange={e => setFormData({ ...formData, studentCode: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Mã VNEdu</label>
                   <input value={formData.vnEduCode} onChange={e => setFormData({ ...formData, vnEduCode: e.target.value })} placeholder="Ví dụ: 2500839484" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và Tên *</label>
                 <input required value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Giới tính</label>
                   <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                     <option value="Nam">Nam</option>
                     <option value="Nữ">Nữ</option>
                     <option value="Khác">Khác</option>
                   </select>
                 </div>
                 {editingStudent && (<div><label className="block text-sm font-semibold text-slate-700 mb-1">Trạng thái</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"><option value="ACTIVE">⚡ Đang hoạt động</option><option value="LOCKED">🔒 Đã khóa</option></select></div>)}
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày sinh</label>
                   <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                 </div>
               </div>
               <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all">Hủy</button>
                 <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 text-xs">{submitting ? "Đang xử lý..." : "Lưu Lại"}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center gap-4">
           <h2 className="text-lg font-bold text-slate-800">Danh sách học sinh ({filteredStudents.length}{studentTypeFilter !== "ALL" ? ` / ${displayStudents.length}` : ""})</h2>
           {selectedIds.length > 0 && (
             <button onClick={handleDeleteMany} disabled={submitting} className="flex items-center gap-2 text-red-600 hover:bg-red-100 font-semibold text-sm transition-colors text-xs">
                <Trash2 className="w-4 h-4" /> Xóa {selectedIds.length} HS đã chọn
             </button>
           )}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => setIsAlphaSorted(!isAlphaSorted)}
            className={`flex items-center px-3.5 py-2 rounded-md text-xs font-bold transition-all border ${
              isAlphaSorted 
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm" 
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
            title="Sắp xếp học sinh theo Tên A-Z tiếng Việt"
          >
            <ArrowUpDown className="w-4 h-4 mr-1.5 text-emerald-600" />
            {isAlphaSorted ? "Sắp xếp Alpha: Bật" : "Sắp xếp Alpha: Tắt"}
          </button>
          <button
            onClick={handleSyncSurveys}
            disabled={syncingSurveys}
            className="flex items-center bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-3.5 rounded-md transition-colors shadow-sm disabled:opacity-50 text-xs"
            title="Đồng bộ danh sách học sinh với các đợt khảo sát đang mở"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncingSurveys ? "animate-spin" : ""}`} />
            {syncingSurveys ? "Đang đồng bộ..." : "Đồng bộ DS Khảo sát"}
          </button>
          <button onClick={openAdd} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3.5 rounded-md transition-colors shadow-sm text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Thêm Học Sinh
          </button>
          <button 
            onClick={handleExportVnEduTemplate} 
            className="flex items-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 px-3 rounded-md transition-colors border border-indigo-200 text-xs" 
            title="Xuất file Excel gồm STT, Mã HS, Họ Tên, Mã VNEdu để điền hoặc lưu trữ"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-indigo-600" /> Xuất Mẫu Ánh Xạ VNEdu
          </button>
          <input type="file" ref={fileInputMappingRef} onChange={handleFileMappingUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          <button 
            onClick={() => fileInputMappingRef.current?.click()} 
            disabled={uploadingMapping} 
            className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-md transition-colors shadow-sm disabled:opacity-50 text-xs"
            title="Nhập file Excel chứa STT, Mã HS, Mã VNEdu để cập nhật ánh xạ hàng loạt cho lớp"
          >
            <Upload className="w-4 h-4 mr-1.5" /> {uploadingMapping ? "Đang import..." : "Import Ánh Xạ VNEdu"}
          </button>
          <button onClick={handleDownloadTemplate} className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-100 font-semibold py-2 px-3 rounded-md transition-colors text-xs">
            <Download className="w-4 h-4 mr-1.5" /> Tải File Mẫu
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3.5 rounded-md transition-colors shadow-sm disabled:opacity-50 text-xs">
            <Upload className="w-4 h-4 mr-1.5" /> {uploading ? "Đang tải..." : "Import Học Sinh"}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap border-collapse">
          <thead className="uppercase text-[10px] tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-4 py-3 border-r border-slate-200 w-10 text-center">
                <input type="checkbox" className="w-4 h-4 rounded" checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length} onChange={handleSelectAll} />
              </th>
              <th className="px-6 py-4 border-r border-slate-200 w-16 text-center">STT</th>
              <th className="px-6 py-4 border-r border-slate-200">Mã HS</th>
              <th className="px-6 py-4 border-r border-slate-200">Mã VNEdu</th>
              <th className="px-6 py-4 border-r border-slate-200 cursor-pointer select-none group" onClick={() => setIsAlphaSorted(!isAlphaSorted)}> 
                <div className="flex items-center gap-1.5">
                  <span>Họ và Tên</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${isAlphaSorted ? "text-emerald-600 font-bold" : "text-slate-400 group-hover:text-slate-600"}`} />
                </div>
              </th>
              <th className="px-6 py-4 border-r border-slate-200">Giới tính</th>
              <th className="px-6 py-4 border-r border-slate-200">Ngày sinh</th>
              <th className="px-6 py-4 border-r border-slate-200 text-center font-bold">Diện Học sinh</th>
              <th className="px-6 py-4 border-r border-slate-200 text-center">Đối tượng</th>
              <th className="px-6 py-4 border-r border-slate-200">Trạng thái</th>
              <th className="p-2 text-center border border-slate-200">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-10 text-slate-400 font-medium text-xs">
                  <UserCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  Chưa có học sinh nào. Hãy import hoặc thêm mới.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student: any, idx: number) => {
                const isSurvey = student.enrollmentType === "KS" || student.isSurveyStudent || (student.studentTransfers && student.studentTransfers.some((t: any) => t.type === 'IN'));
                const enrollmentLabel = isSurvey ? "KS" : (student.enrollmentType || "Trực tiếp");

                return (
                <tr 
                  key={student.id} 
                  className={`border-b border-l border-r border-slate-200 transition-colors ${
                    selectedIds.includes(student.id) 
                      ? "bg-indigo-50/70" 
                      : isSurvey 
                        ? "bg-emerald-50/70 hover:bg-emerald-100/70 font-medium" 
                        : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-4 py-3 border-r border-slate-200 text-center">
                    <input type="checkbox" className="w-4 h-4 rounded" checked={selectedIds.includes(student.id)} onChange={(e) => handleSelectRow(student.id, e.target.checked)} />
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-bold border-r border-slate-200 text-center">{idx + 1}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs border-r border-slate-200">{student.studentCode}</td>
                  <td className="px-6 py-4 border-r border-slate-200">
                    {editingVnEduId === student.id ? (
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          value={tempVnEduValue} 
                          onChange={e => setTempVnEduValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleSaveQuickVnEdu(student);
                            if (e.key === "Escape") setEditingVnEduId(null);
                          }}
                          placeholder="Nhập mã vnEdu..."
                          autoFocus
                          disabled={savingVnEdu}
                          className="w-32 px-2 py-1 text-xs border-2 border-indigo-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-sm bg-white"
                        />
                        <button 
                          onClick={() => handleSaveQuickVnEdu(student)}
                          disabled={savingVnEdu}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors disabled:opacity-50"
                          title="Lưu (Enter)"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setEditingVnEduId(null)}
                          disabled={savingVnEdu}
                          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                          title="Hủy (Esc)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : student.vnEduCode ? (
                      <div className="flex items-center gap-1.5 group">
                        <span className="text-slate-800 font-mono text-xs font-bold tracking-tight bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {student.vnEduCode}
                        </span>
                        <button 
                          onClick={() => {
                            setEditingVnEduId(student.id);
                            setTempVnEduValue(student.vnEduCode || "");
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                          title="Sửa nhanh Mã VNEdu"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingVnEduId(student.id);
                          setTempVnEduValue("");
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full transition-colors cursor-pointer shadow-xs"
                        title="Nhấp để nhập nhanh Mã VNEdu thủ công"
                      >
                        <span>Chưa ánh xạ</span>
                        <Edit2 className="w-2.5 h-2.5 text-amber-600" />
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 border-r border-slate-200 flex items-center justify-between">
                    <div className="flex items-center">
                      <UserCircle2 className="w-5 h-5 text-slate-300 mr-2" />
                      <span>{student.studentName}</span>
                    </div>
                    {student.surveyForms && student.surveyForms.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1" title="Đã đồng bộ bài khảo sát">
                        <Layers className="w-3 h-3 text-teal-500" />
                        {student.surveyForms.length} KS
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 border-r border-slate-200">
                    {student.gender || "Chưa cập nhật"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 border-r border-slate-200">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                  </td>
                  {/* Diện học sinh (Chính khóa / Giao lưu) */}
                  <td className="px-6 py-4 border-r border-slate-200 text-center">
                    {student.studentType === "GIAO_LUU" ? (
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          GIAO LƯU
                        </span>
                        {student.studentTypeNote && (
                          <span className="text-[9px] text-slate-400 max-w-[120px] truncate" title={student.studentTypeNote}>
                            {student.studentTypeNote}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          Chính khóa
                        </span>
                        {student.convertedAt && (
                          <span className="text-[9px] text-emerald-600 font-semibold" title={`Chuyển từ Giao lưu: ${student.conversionReason || ""}`}>
                            Đã chuyển từ GL
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 border-r border-slate-200 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      isSurvey 
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {enrollmentLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-r border-slate-200">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${(!student.status || student.status === "ACTIVE") ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {(!student.status || student.status === "ACTIVE") ? "HOẠT ĐỘNG" : "BỊ KHÓA"}
                    </span>
                  </td>
                  <td className="p-2 text-center border border-slate-200">
                     <div className="flex justify-center gap-1">
                        {/* Nút chuyển đổi Diện học sinh */}
                        {student.studentType === "GIAO_LUU" ? (
                          <button
                            onClick={() => openConvertModal(student, "CHINH_KHOA")}
                            className="p-1.5 px-2 text-purple-700 hover:text-white bg-purple-50 hover:bg-purple-600 border border-purple-200 rounded-lg transition-all text-xs font-bold flex items-center gap-1 shadow-2xs"
                            title="Chuyển học sinh sang diện Chính khóa"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Sang Chính khóa</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openConvertModal(student, "GIAO_LUU")}
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs"
                            title="Chuyển học sinh sang diện Giao lưu"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setAssigningStudent(student); setSelectedSurveyId(""); setShowAssignModal(true); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-xs" title="Gán khảo sát">
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(student)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs" title="Sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteOne(student.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}