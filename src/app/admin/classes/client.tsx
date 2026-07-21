"use client"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import { useState, useRef, useEffect } from "react"
import { Upload, Users, BookOpen, Download, Calendar, Building2, GraduationCap, Layers, Trash2, Edit, X, Save, CheckSquare, Plus, ArrowRightLeft, Copy, ClipboardCheck, Loader2, AlertCircle, CheckCircle2, ChevronDown, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as xlsx from "xlsx"
import { importClassesAction, deleteClasses, updateClass, createClassAction, previewClassTransferAction, transferClassesAction, previewStudentCopyAction, copyStudentsAction, previewTeachingAssignmentCopyAction, copyTeachingAssignmentsAction, getClassesByYearAndCampusAction, getStudentsByClassAction, copyStudentsToTargetClassAction } from "./actions"

const K12_LEVELS = [
  { value: "", label: "Tất cả" },
  { value: "Tiểu học", label: "Tiểu học" },
  { value: "THCS", label: "THCS" },
  { value: "THPT", label: "THPT" },
];

const MN_LEVELS = [
  { value: "", label: "Tất cả" },
  { value: "Mầm non", label: "Mầm non" }
];

function SearchableSelect({ options, value, onChange, placeholder = "Chọn giáo viên..." }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find((o: any) => o.value === value);
  const filtered = options.filter((o: any) =>
    (o.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full text-slate-700" ref={containerRef}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
        className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white cursor-pointer flex justify-between items-center min-h-[42px] border-slate-200"
      >
        <span className={selectedOpt && selectedOpt.value ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <span className="text-slate-400 text-xs">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên..."
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="overflow-y-auto max-h-48 divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-slate-400 text-center">Không tìm thấy GV</div>
            ) : (
              filtered.map((opt: any) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 transition-colors ${
                    opt.value === value ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-700"
                  }`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Parse preschool grade to extract Khối học and Nhóm tuổi
const parsePreschoolGrade = (gradeValue: string) => {
  if (!gradeValue) return { grade: "—", ageGroup: "—" };
  const val = gradeValue.trim();
  
  if (val === "Nhà trẻ 12-18 tháng") {
    return { grade: "Nhà trẻ 12-18 tháng", ageGroup: "12 đến 18 tháng" };
  }
  if (val === "Nhà trẻ 18-24 tháng") {
    return { grade: "Nhà trẻ 18-24 tháng", ageGroup: "18 đến 24 tháng" };
  }
  if (val === "Nhà trẻ 24-36 tháng") {
    return { grade: "Nhà trẻ 24-36 tháng", ageGroup: "24 đến 36 tháng" };
  }
  if (val === "Mẫu giáo bé") {
    return { grade: "Mẫu giáo bé", ageGroup: "3 đến 4 tuổi" };
  }
  if (val === "Mẫu giáo nhỡ") {
    return { grade: "Mẫu giáo nhỡ", ageGroup: "4 đến 5 tuổi" };
  }
  if (val === "Mẫu giáo lớn") {
    return { grade: "Mẫu giáo lớn", ageGroup: "5 đến 6 tuổi" };
  }
  
  // Fallbacks:
  if (val === "12 đến 18 tháng" || val === "12-18 tháng" || val === "Nhà trẻ (12-18 tháng)") {
    return { grade: "Nhà trẻ 12-18 tháng", ageGroup: "12 đến 18 tháng" };
  }
  if (val === "18 đến 24 tháng" || val === "18-24 tháng" || val === "Nhà trẻ (18-24 tháng)") {
    return { grade: "Nhà trẻ 18-24 tháng", ageGroup: "18 đến 24 tháng" };
  }
  if (val === "24 đến 36 tháng" || val === "24-36 tháng" || val === "Nhà trẻ (24-36 tháng)" || val === "18 đến 36 tháng" || val === "18-36 tháng" || val === "12 đến 36 tháng" || val === "12-36 tháng" || val === "12 đến 24 tháng" || val === "12-24 tháng" || val === "Nhà trẻ") {
    return { grade: "Nhà trẻ 24-36 tháng", ageGroup: "24 đến 36 tháng" };
  }
  if (val === "3 đến 4 tuổi" || val === "3-4 tuổi") {
    return { grade: "Mẫu giáo bé", ageGroup: "3 đến 4 tuổi" };
  }
  if (val === "4 đến 5 tuổi" || val === "4-5 tuổi") {
    return { grade: "Mẫu giáo nhỡ", ageGroup: "4 đến 5 tuổi" };
  }
  if (val === "5 đến 6 tuổi" || val === "5-6 tuổi") {
    return { grade: "Mẫu giáo lớn", ageGroup: "5 đến 6 tuổi" };
  }
  
  return { grade: val, ageGroup: "—" };
};

export function AdminClassesClient({ initialClasses, campuses, academicYears, teachers, isCampusLocked = false, defaultCampusId = null }: any) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("k12")
  const [classes, setClasses] = useState(initialClasses)
  const [selectedYearId, setSelectedYearId] = useState<string>(() => getDefaultAcademicYearClient(academicYears)?.id || "")
  const [selectedCampus, setSelectedCampus] = useState(defaultCampusId || "")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedEduSystem, setSelectedEduSystem] = useState("")
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editModal, setEditModal] = useState<any>(null)
  const [createModal, setCreateModal] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [classPage, setClassPage] = useState(1)
  const CLASS_PAGE_SIZE = 10

  // Modal: Kết chuyển lớp học
  const [transferModal, setTransferModal] = useState(false)
  const [transferSourceYear, setTransferSourceYear] = useState("")
  const [transferTargetYear, setTransferTargetYear] = useState("")
  const [transferPreview, setTransferPreview] = useState<any[]>([])
  const [transferSelectedIds, setTransferSelectedIds] = useState<string[]>([])
  const [transferMode, setTransferMode] = useState<"class_only"|"with_subjects"|"with_assignments">("class_only")
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferResult, setTransferResult] = useState<any>(null)

  // Modal: Sao chép học sinh (Granular)
  const [copyStudentModal, setCopyStudentModal] = useState(false)
  const [copyStudentSourceYear, setCopyStudentSourceYear] = useState("")
  const [copyStudentSourceCampus, setCopyStudentSourceCampus] = useState("")
  const [copyStudentSourceClass, setCopyStudentSourceClass] = useState("")
  const [copyStudentTargetYear, setCopyStudentTargetYear] = useState("")
  const [copyStudentTargetCampus, setCopyStudentTargetCampus] = useState("")
  const [copyStudentTargetClass, setCopyStudentTargetClass] = useState("")
  const [copyStudentSourceClasses, setCopyStudentSourceClasses] = useState<any[]>([])
  const [copyStudentTargetClasses, setCopyStudentTargetClasses] = useState<any[]>([])
  const [copyStudentSourceStudents, setCopyStudentSourceStudents] = useState<any[]>([])
  const [copyStudentSelectedIds, setCopyStudentSelectedIds] = useState<string[]>([])
  const [copyStudentLoading, setCopyStudentLoading] = useState(false)
  const [copyStudentResult, setCopyStudentResult] = useState<any>(null)

  useEffect(() => {
    if (copyStudentSourceYear && copyStudentSourceCampus) {
      getClassesByYearAndCampusAction(copyStudentSourceYear, copyStudentSourceCampus).then(res => {
        if (res.success) setCopyStudentSourceClasses(res.classes || []);
      });
    } else {
      setCopyStudentSourceClasses([]);
    }
    setCopyStudentSourceClass("");
    setCopyStudentSourceStudents([]);
    setCopyStudentSelectedIds([]);
  }, [copyStudentSourceYear, copyStudentSourceCampus]);

  useEffect(() => {
    if (copyStudentTargetYear && copyStudentTargetCampus) {
      getClassesByYearAndCampusAction(copyStudentTargetYear, copyStudentTargetCampus).then(res => {
        if (res.success) setCopyStudentTargetClasses(res.classes || []);
      });
    } else {
      setCopyStudentTargetClasses([]);
    }
    setCopyStudentTargetClass("");
  }, [copyStudentTargetYear, copyStudentTargetCampus]);

  useEffect(() => {
    if (copyStudentSourceClass) {
      setCopyStudentLoading(true);
      getStudentsByClassAction(copyStudentSourceClass).then(res => {
        if (res.success) {
          setCopyStudentSourceStudents(res.students || []);
          setCopyStudentSelectedIds((res.students || []).map((s: any) => s.id));
        }
        setCopyStudentLoading(false);
      });
    } else {
      setCopyStudentSourceStudents([]);
      setCopyStudentSelectedIds([]);
    }
  }, [copyStudentSourceClass]);

  // Modal: Phân công giảng dạy
  const [copyAssignModal, setCopyAssignModal] = useState(false)
  const [copyAssignSourceYear, setCopyAssignSourceYear] = useState("")
  const [copyAssignTargetYear, setCopyAssignTargetYear] = useState("")
  const [copyAssignPreview, setCopyAssignPreview] = useState<any[]>([])
  const [copyAssignLoading, setCopyAssignLoading] = useState(false)
  const [copyAssignResult, setCopyAssignResult] = useState<any>(null)

  const selectedYear = academicYears.find((y: any) => y.id === selectedYearId)
  const allEduSystems = selectedYear?.educationSystems || [];
  
  // Filter systems for Preschool/Mầm non (starts with MN or name contains "mầm non")
  const mnEduSystems = allEduSystems.filter((es: any) => 
    (es.code || "").toUpperCase().startsWith("MN") || 
    (es.name || "").toLowerCase().includes("mầm non")
  );
  
  // Filter systems for K-12 (Phổ thông)
  const baseEduSystems = allEduSystems.filter((es: any) => 
    !(es.code || "").toUpperCase().startsWith("MN") && 
    !(es.name || "").toLowerCase().includes("mầm non")
  );
  
  const eduSystems = activeTab === "mam-non" ? mnEduSystems : baseEduSystems;

  const getGradesList = (level: string, tab: string) => {
    if (tab === "mam-non") return ["Nhà trẻ 12-18 tháng", "Nhà trẻ 18-24 tháng", "Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];
    if (level === "Tiểu học") return ["1", "2", "3", "4", "5"];
    if (level === "THCS") return ["6", "7", "8", "9"];
    if (level === "THPT") return ["10", "11", "12"];
    return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  }
  const getAvailableGrades = () => {
    if (activeTab === "mam-non") {
      return ["Nhà trẻ 12-18 tháng", "Nhà trẻ 18-24 tháng", "Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];
    }
    return getGradesList(selectedLevel, activeTab);
  };


  useEffect(() => { setClasses(initialClasses); setSelectedIds([]) }, [initialClasses])
  useEffect(() => { setClassPage(1) }, [selectedYearId, selectedCampus, selectedLevel, selectedGrade, selectedEduSystem, activeTab])

  let filteredClasses = classes.filter((c: any) => c.academicYearId === selectedYearId)
  const mnLevelsLowerCase = ["nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn", "mầm non"];
  if (activeTab === "mam-non") {
    filteredClasses = filteredClasses.filter((c: any) => c.level && mnLevelsLowerCase.includes(c.level.toLowerCase()));
  } else {
    filteredClasses = filteredClasses.filter((c: any) => !c.level || !mnLevelsLowerCase.includes(c.level.toLowerCase()));
  }
  if (selectedCampus) filteredClasses = filteredClasses.filter((c: any) => c.campusId === selectedCampus)
  if (selectedLevel) filteredClasses = filteredClasses.filter((c: any) => c.level === selectedLevel)
  if (selectedGrade) {
    if (activeTab === "mam-non") {
      if (selectedGrade === "Nhà trẻ") {
        const babyGrades = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "12 đến 24 tháng", "18 đến 36 tháng", "12 đến 36 tháng", "nhà trẻ"];
        filteredClasses = filteredClasses.filter((c: any) => c.grade && babyGrades.includes(c.grade.toLowerCase()));
      } else if (selectedGrade === "Mẫu giáo bé") {
        filteredClasses = filteredClasses.filter((c: any) => c.grade === "3 đến 4 tuổi" || c.grade === "Mẫu giáo bé");
      } else if (selectedGrade === "Mẫu giáo nhỡ") {
        filteredClasses = filteredClasses.filter((c: any) => c.grade === "4 đến 5 tuổi" || c.grade === "Mẫu giáo nhỡ");
      } else if (selectedGrade === "Mẫu giáo lớn") {
        filteredClasses = filteredClasses.filter((c: any) => c.grade === "5 đến 6 tuổi" || c.grade === "Mẫu giáo lớn");
      } else {
        filteredClasses = filteredClasses.filter((c: any) => c.grade === selectedGrade);
      }
    } else {
      filteredClasses = filteredClasses.filter((c: any) => c.grade === selectedGrade);
    }
  }
  if (selectedEduSystem) filteredClasses = filteredClasses.filter((c: any) => c.educationSystem === selectedEduSystem)

  const handleDownloadTemplate = () => {
    const k12Data = [
      { "Mã lớp*": "C-26-1", "Cơ sở": "CS1", "Bậc học": "THCS", "Khối lớp": "6", "Tên lớp*": "6A1", "Hệ học": "HNG", "Sỹ số": 35, "GVCN": "Nguyễn Văn A" },
      { "Mã lớp*": "C-26-2", "Cơ sở": "CS2", "Bậc học": "THPT", "Khối lớp": "10", "Tên lớp*": "10A1", "Hệ học": "SB", "Sỹ số": 32, "GVCN": "Trần Thị B" },
      { "Mã lớp*": "C-26-3", "Cơ sở": "CS1", "Bậc học": "Tiểu học", "Khối lớp": "1", "Tên lớp*": "1A1", "Hệ học": "HNS", "Sỹ số": 30, "GVCN": "" }
    ];
    
    const mnData = [
      { "Mã lớp*": "MN-26-1", "Cơ sở": "CS1", "Bậc học": "Mầm non", "Khối lớp": "Nhà trẻ", "Tên lớp*": "Nhà trẻ 1", "Hệ học": "MNS", "Sỹ số": 20, "GVCN": "Nguyễn Thị Mầm" },
      { "Mã lớp*": "MN-26-2", "Cơ sở": "CS2", "Bậc học": "Mầm non", "Khối lớp": "Mẫu giáo bé", "Tên lớp*": "Mầm 1", "Hệ học": "MNG", "Sỹ số": 25, "GVCN": "Trần Thị Non" },
      { "Mã lớp*": "MN-26-3", "Cơ sở": "CS1", "Bậc học": "Mầm non", "Khối lớp": "Mẫu giáo lớn", "Tên lớp*": "Lá 1", "Hệ học": "MNS", "Sỹ số": 25, "GVCN": "" }
    ];

    const dataToExport = activeTab === "mam-non" ? mnData : k12Data;
    const fileName = activeTab === "mam-non" ? "Form_Mau_Them_Lop_Mam_Non.xlsx" : "Form_Mau_Them_Lop_Pho_Thong.xlsx";

    const ws = xlsx.utils.json_to_sheet(dataToExport, { header: ["Mã lớp*", "Cơ sở", "Bậc học", "Khối lớp", "Tên lớp*", "Hệ học", "Sỹ số", "GVCN"] })
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 25 }]
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Danh_sach_lop")
    xlsx.writeFile(wb, fileName)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedYearId) { alert("Vui lòng chọn Năm học!"); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = xlsx.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = xlsx.utils.sheet_to_json(ws) as any[]
        const defaultCampus = campuses[0]?.id

        const payload = data.map((row: any) => {
          const excelCampusStr = (row["Cơ sở"] || row["Co so"] || "").toString().trim().toLowerCase()
          const matchedCampus = campuses.find((c: any) => {
             const cName = c.campusName.trim().toLowerCase()
             return cName === excelCampusStr || cName.includes(excelCampusStr) || excelCampusStr.includes(cName)
          })

          return {
            classCode: row["Mã lớp*"] || row["Ma lop*"] || row["Ma lop"] || "C-" + Date.now() + "-" + Math.floor(Math.random()*1000),
            className: row["Tên lớp*"] || row["Ten lop*"] || row["Ten lop"] || "New Class",
            level: (row["Bậc học"] || row["Bac hoc"] || "").toString().trim(),
            grade: (row["Khối học"] || row["Khoi hoc"] || row["Khối lớp"] || row["Khoi lop"] || row["Nhóm tuổi"] || row["Nhom tuoi"] || row["Khối"] || row["Khoi"] || "").toString().trim(),
            educationSystem: (row["Hệ học"] || row["He hoc"] || "").toString().trim(),
            campusId: matchedCampus ? matchedCampus.id : defaultCampus,
            academicYearId: selectedYearId
          }
        })
        const res = await importClassesAction(payload)
        if (res.success) {
          alert("Đã import " + res.count + " lớp học!");
          router.refresh();
        }
      } catch(e) { console.error(e); alert("Lỗi đọc file Excel!") }
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    reader.readAsBinaryString(file)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredClasses.map((c: any) => c.id))
    else setSelectedIds([])
  }
  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id])
    else setSelectedIds(selectedIds.filter(x => x !== id))
  }
  const handleDeleteMany = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa " + selectedIds.length + " lớp?")) return
    setDeleting(true)
    const res = await deleteClasses(selectedIds)
    if (res.success) { alert("Xóa thành công!"); router.refresh(); }
    else alert("Có lỗi khi xóa!")
    setDeleting(false)
  }
  const handleDeleteSingle = async (id: string) => {
    if (!confirm("Xóa lớp này?")) return
    const res = await deleteClasses([id])
    if (res.success) { alert("Xóa thành công!"); router.refresh(); } else alert("Không thể xóa!")
  }
  const handleOpenCreateModal = () => {
    setCreateModal({
      className: "",
      campusId: selectedCampus || defaultCampusId || campuses[0]?.id || "",
      academicYearId: selectedYearId,
      level: selectedLevel || (activeTab === "mam-non" ? "Mầm non" : ""),
      grade: selectedGrade || "",
      educationSystem: selectedEduSystem || "",
      gvcn1: "",
      gvcn2: "",
      homeroomTeacherId: ""
    });
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createModal.className.trim()) { alert("Vui lòng nhập Tên lớp!"); return; }
    if (!createModal.campusId) { alert("Vui lòng chọn Cơ sở!"); return; }
    if (!createModal.level) { alert("Vui lòng chọn Bậc học!"); return; }
    if (!createModal.grade) { alert("Vui lòng chọn Khối lớp!"); return; }

    let finalTeacherId = createModal.homeroomTeacherId || null;
    if (createModal.level === "Mầm non") {
      const g1 = createModal.gvcn1 || "";
      const g2 = createModal.gvcn2 || "";
      finalTeacherId = [g1, g2].filter(Boolean).join(",") || null;
    }

    const res = await createClassAction({
      className: createModal.className.trim(),
      level: createModal.level,
      grade: createModal.grade,
      campusId: createModal.campusId,
      academicYearId: createModal.academicYearId,
      educationSystem: createModal.educationSystem || "",
      homeroomTeacherId: finalTeacherId
    })
    if (res.success) {
      setCreateModal(null);
      router.refresh();
    } else {
      alert(res.error || "Lỗi khi thêm mới lớp học!")
    }
  }

  const handleOpenEditModal = (c: any) => {
    let gvcn1 = "";
    let gvcn2 = "";
    if (c.homeroomTeacherId) {
      const parts = c.homeroomTeacherId.split(",");
      gvcn1 = parts[0]?.trim() || "";
      gvcn2 = parts[1]?.trim() || "";
    }
    setEditModal({
      ...c,
      gvcn1,
      gvcn2
    });
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    let finalTeacherId = editModal.homeroomTeacherId || null;
    if (editModal.level === "Mầm non") {
      const g1 = editModal.gvcn1 || "";
      const g2 = editModal.gvcn2 || "";
      finalTeacherId = [g1, g2].filter(Boolean).join(",") || null;
    }
    const res = await updateClass(editModal.id, {
      className: editModal.className,
      level: editModal.level,
      grade: editModal.grade,
      campusId: editModal.campusId,
      educationSystem: editModal.educationSystem || "",
      homeroomTeacherId: finalTeacherId
    })
    if (res.success) { setEditModal(null); router.refresh(); } else alert("Lỗi khi cập nhật!")
  }

  // ─── Kết chuyển lớp học handlers ───
  const handleOpenTransferModal = () => {
    setTransferModal(true);
    setTransferSourceYear(selectedYearId || academicYears[0]?.id || "");
    setTransferTargetYear("");
    setTransferPreview([]);
    setTransferSelectedIds([]);
    setTransferMode("class_only");
    setTransferResult(null);
  };
  const handleTransferPreview = async () => {
    if (!transferSourceYear || !transferTargetYear) return;
    setTransferLoading(true);
    const res = await previewClassTransferAction(transferSourceYear, transferTargetYear);
    if (res.success) {
      setTransferPreview(res.preview || []);
      setTransferSelectedIds((res.preview || []).filter((p: any) => !p.alreadyExists).map((p: any) => p.id));
    }
    setTransferLoading(false);
  };
  const handleTransferExecute = async () => {
    if (!transferSelectedIds.length) return;
    setTransferLoading(true);
    const res = await transferClassesAction({ sourceYearId: transferSourceYear, targetYearId: transferTargetYear, classIds: transferSelectedIds, mode: transferMode });
    setTransferResult(res);
    setTransferLoading(false);
    if (res.success) { router.refresh(); setTransferPreview([]); }
  };

  // ─── Sao chép học sinh handlers ───
  const handleOpenCopyStudentModal = () => {
    setCopyStudentModal(true);
    setCopyStudentSourceYear(selectedYearId || academicYears[0]?.id || "");
    setCopyStudentSourceCampus("");
    setCopyStudentSourceClass("");
    setCopyStudentTargetYear("");
    setCopyStudentTargetCampus("");
    setCopyStudentTargetClass("");
    setCopyStudentSourceClasses([]);
    setCopyStudentTargetClasses([]);
    setCopyStudentSourceStudents([]);
    setCopyStudentSelectedIds([]);
    setCopyStudentResult(null);
  };
  const handleCopyStudentExecute = async () => {
    if (!copyStudentTargetClass || copyStudentSelectedIds.length === 0) return;
    setCopyStudentLoading(true);
    const res = await copyStudentsToTargetClassAction(
      copyStudentSelectedIds,
      copyStudentTargetClass,
      copyStudentTargetYear
    );
    setCopyStudentResult(res);
    setCopyStudentLoading(false);
    if (res.success) {
      router.refresh();
      setCopyStudentSelectedIds([]);
    }
  };

  // ─── Phân công giảng dạy handlers ───
  const handleOpenCopyAssignModal = () => {
    setCopyAssignModal(true);
    setCopyAssignSourceYear(selectedYearId || academicYears[0]?.id || "");
    setCopyAssignTargetYear("");
    setCopyAssignPreview([]);
    setCopyAssignResult(null);
  };
  const handleCopyAssignPreview = async () => {
    if (!copyAssignSourceYear || !copyAssignTargetYear) return;
    setCopyAssignLoading(true);
    const res = await previewTeachingAssignmentCopyAction(copyAssignSourceYear, copyAssignTargetYear);
    if (res.success) setCopyAssignPreview(res.preview || []);
    setCopyAssignLoading(false);
  };
  const handleCopyAssignExecute = async () => {
    setCopyAssignLoading(true);
    const res = await copyTeachingAssignmentsAction(copyAssignSourceYear, copyAssignTargetYear);
    setCopyAssignResult(res);
    setCopyAssignLoading(false);
    if (res.success) { router.refresh(); setCopyAssignPreview([]); }
  };

  const getEduBadgeColor = (code: string) => {
    if (code === "HNG") return "bg-purple-100 text-purple-700"
    if (code === "SB") return "bg-teal-100 text-teal-700"
    if (code === "HNS") return "bg-orange-100 text-orange-700"
    if (code === "MNS") return "bg-rose-100 text-rose-700"
    if (code === "MNG") return "bg-emerald-100 text-emerald-700"
    return "bg-slate-100 text-slate-600"
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-slate-100 p-1.5 rounded-xl w-fit">
        <button onClick={() => { setActiveTab("k12"); setSelectedLevel(""); setSelectedGrade(""); setSelectedEduSystem("") }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-extrabold uppercase tracking-wider transition-all duration-200 ${activeTab === "k12" ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-600/20" : "text-slate-500 hover:text-blue-700 hover:bg-blue-100"}`}>
          <GraduationCap className="w-5 h-5" /> Phổ thông K-12
        </button>
        <button onClick={() => { setActiveTab("mam-non"); setSelectedLevel(""); setSelectedGrade(""); setSelectedEduSystem("") }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-extrabold uppercase tracking-wider transition-all duration-200 ${activeTab === "mam-non" ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/20" : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-100"}`}>
          <Layers className="w-5 h-5" /> Mầm non
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <label className="font-semibold text-slate-700 text-sm">Năm học:</label>
          <select value={selectedYearId} onChange={e => { setSelectedYearId(e.target.value); setSelectedEduSystem("") }}
            className="border rounded-lg p-2 text-sm min-w-[160px] outline-none focus:ring-2 focus:ring-blue-300">
            {academicYears.length === 0 && <option value="">Chưa có</option>}
            {academicYears.filter((y: any) => !y.isOff).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#00A99D]" />
          <label className="font-semibold text-slate-700 text-sm">Cơ sở:</label>
          <select value={selectedCampus} onChange={e => setSelectedCampus(e.target.value)}
            className="border rounded-lg p-2 text-sm min-w-[160px] outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Tất cả cơ sở</option>
            {campuses.map((cp: any) => <option key={cp.id} value={cp.id}>{cp.campusName}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          <label className="font-semibold text-slate-700 text-sm">Bậc học:</label>
          <select value={selectedLevel} onChange={e => { setSelectedLevel(e.target.value); setSelectedGrade(""); }}
            className="border rounded-lg p-2 text-sm min-w-[140px] outline-none focus:ring-2 focus:ring-emerald-300">
            {(activeTab === "mam-non" ? MN_LEVELS : K12_LEVELS).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <label className="font-semibold text-slate-700 text-sm">Khối học:</label>
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
            className="border rounded-lg p-2 text-sm min-w-[120px] outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Tất cả</option>
            {getAvailableGrades().map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          <label className="font-semibold text-slate-700 text-sm">Hệ học:</label>
          <select value={selectedEduSystem} onChange={e => setSelectedEduSystem(e.target.value)}
            className="border rounded-lg p-2 text-sm min-w-[120px] outline-none focus:ring-2 focus:ring-purple-300">
            <option value="">Tất cả</option>
            {eduSystems.map((es: any) => <option key={es.id} value={es.code}>{es.code} - {es.name}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500">
          Tổng: <span className="font-bold text-slate-800">{filteredClasses.length}</span> lớp
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">Quản lý lớp học</h2>
            {selectedIds.length > 0 && (
              <button onClick={handleDeleteMany} disabled={deleting}
                className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-100 font-semibold text-sm text-xs font-semibold">
                <Trash2 className="w-4 h-4 mr-2" /> {deleting ? "Đang xóa..." : "Xóa " + selectedIds.length + " lớp"}
              </button>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => handleOpenCreateModal()} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm text-sm">
              <Plus className="w-4 h-4 mr-2" /> Thêm Mới Lớp Học
            </button>
            <button onClick={handleOpenTransferModal} className="flex items-center bg-[#00A99D] hover:bg-[#008075] text-white font-semibold py-2 px-4 rounded-md shadow-sm text-sm">
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Kết chuyển lớp
            </button>
            <button onClick={handleOpenCopyStudentModal} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm text-sm">
              <Copy className="w-4 h-4 mr-2" /> Sao chép học sinh
            </button>
            <button onClick={handleOpenCopyAssignModal} className="flex items-center bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm text-sm">
              <ClipboardCheck className="w-4 h-4 mr-2" /> Phân công GD
            </button>
            <button onClick={handleDownloadTemplate} className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-100 font-semibold text-sm text-xs font-semibold">
              <Download className="w-4 h-4 mr-2" /> Tải File Mẫu
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !selectedYearId}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 text-sm">
              <Upload className="w-4 h-4 mr-2" /> {uploading ? "Đang xử lý..." : "Import File Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#F0FDFA] sticky top-0 z-10 shadow-[0_1px_0_#CCFBF1]">
            <tr>
              <th className="p-2 p-2 w-12 text-center border border-slate-200"><input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={filteredClasses.length > 0 && selectedIds.length === filteredClasses.length} onChange={handleSelectAll} /></th>
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs w-12 border border-slate-200">STT</th>
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs border border-slate-200">Cơ sở</th>
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs border border-slate-200">Bậc học</th>
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs border border-slate-200">Khối học</th>
              {activeTab === "mam-non" && (
                <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs border border-slate-200">Nhóm tuổi</th>
              )}
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs border border-slate-200">Tên lớp</th>
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs border border-slate-200">Hệ học</th>
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs border border-slate-200">Sỹ số</th>
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs border border-slate-200">GVCN</th>
              <th className="p-2 p-2 font-semibold text-slate-500 uppercase text-xs text-right border border-slate-200">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClasses.length === 0 && (
              <tr><td colSpan={activeTab === "mam-non" ? 11 : 10} className="p-2 text-center text-slate-400 border border-slate-200">Chưa có lớp học nào trong năm học này.</td></tr>
            )}
            {filteredClasses.slice((classPage - 1) * CLASS_PAGE_SIZE, classPage * CLASS_PAGE_SIZE).map((c: any, i: number) => (
               <tr key={c.id} className={"hover:bg-slate-50 transition-colors " + (selectedIds.includes(c.id) ? "bg-blue-50/50" : "")}>
                 <td className="p-2 p-2 text-center border border-slate-200"><input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={selectedIds.includes(c.id)} onChange={e => handleSelectRow(c.id, e.target.checked)} /></td>
                 <td className="p-2 p-2 text-slate-400 text-center border border-slate-200">{(classPage - 1) * CLASS_PAGE_SIZE + i + 1}</td>
                 <td className="p-2 p-2 border border-slate-200"><span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-indigo-500" /><span className="text-slate-700">{c.campus}</span></span></td>
                 <td className="p-2 p-2 border border-slate-200">
                   {c.level ? (<span className={"text-xs px-2 py-1 rounded-full font-medium " + (["tiểu học", "tieu hoc"].includes(c.level.toLowerCase()) ? "bg-amber-50 text-amber-700" : ["thcs"].includes(c.level.toLowerCase()) ? "bg-blue-50 text-blue-700" : ["thpt"].includes(c.level.toLowerCase()) ? "bg-purple-50 text-purple-700" : ["mầm non", "nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn"].includes(c.level.toLowerCase()) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{["mầm non", "nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn"].includes(c.level.toLowerCase()) ? "Mầm non" : c.level}</span>) : <span className="text-slate-300">--</span>}
                 </td>
                                   {activeTab === "mam-non" ? (
                    <>
                      <td className="p-2 p-2 border border-slate-200">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-slate-700 font-medium">{parsePreschoolGrade(c.grade).grade}</span>
                        </span>
                      </td>
                      <td className="p-2 p-2 border border-slate-200">
                        <span className="text-slate-600 font-normal">{parsePreschoolGrade(c.grade).ageGroup}</span>
                      </td>
                    </>
                  ) : (
                    <td className="p-2 p-2 border border-slate-200">
                      {c.grade ? (<span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-emerald-500" /><span className="text-slate-700 font-medium">{c.grade}</span></span>) : <span className="text-slate-300">--</span>}
                    </td>
                  )}
                 <td className="p-2 p-2 border border-slate-200">
                   <Link href={"/admin/classes/" + c.id} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center font-semibold">
                     <div className="p-1.5 mr-2 text-xs font-semibold"><BookOpen className="w-3.5 h-3.5 text-blue-600" /></div>{c.className}
                   </Link>
                 </td>
                 <td className="p-2 p-2 border border-slate-200">
                   {c.educationSystem ? (<span className={"text-xs px-2.5 py-1 rounded-full font-bold " + getEduBadgeColor(c.educationSystem)}>{c.educationSystem}</span>) : <span className="text-slate-300">--</span>}
                 </td>
                 <td className="p-2 p-2 border border-slate-200"><span className="flex items-center text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full w-max text-xs font-medium"><Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> {c.studentCount}</span></td>
                 <td className="p-2 p-2 text-slate-700 font-medium border border-slate-200">{c.homeroomTeacher}</td>
                 <td className="p-2 p-2 text-right space-x-2 border border-slate-200">
                    <button onClick={() => handleOpenEditModal(c)} className="p-1.5 text-blue-500 hover:bg-blue-100 text-xs font-semibold" title="Sửa"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteSingle(c.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Pagination */}
      {filteredClasses.length > CLASS_PAGE_SIZE && (() => {
        const totalPages = Math.ceil(filteredClasses.length / CLASS_PAGE_SIZE);
        const pages: (number | string)[] = [];
        Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - classPage) <= 2)
          .forEach((p, idx, arr) => {
            if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) pages.push('...');
            pages.push(p);
          });
        return (
          <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="text-sm text-slate-500">
              Hiển thị <span className="font-bold text-slate-700">{(classPage - 1) * CLASS_PAGE_SIZE + 1}</span>–<span className="font-bold text-slate-700">{Math.min(classPage * CLASS_PAGE_SIZE, filteredClasses.length)}</span> trong <span className="font-bold text-[#00A99D]">{filteredClasses.length}</span> lớp
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setClassPage(1)} disabled={classPage === 1} className="px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-[#00A99D] hover:bg-teal-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors">«</button>
              <button onClick={() => setClassPage(p => Math.max(1, p - 1))} disabled={classPage === 1} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-[#00A99D] hover:bg-teal-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors">‹ Trước</button>
              {pages.map((p, idx) => p === '...' ? (
                <span key={"el" + idx} className="px-2 text-slate-400 text-xs">...</span>
              ) : (
                <button key={p} onClick={() => setClassPage(p as number)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${classPage === p ? 'bg-[#00A99D] text-white shadow-sm' : 'text-slate-600 hover:text-[#00A99D] hover:bg-teal-50'}`}>{p}</button>
              ))}
              <button onClick={() => setClassPage(p => Math.min(totalPages, p + 1))} disabled={classPage === totalPages} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-[#00A99D] hover:bg-teal-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors">Sau ›</button>
              <button onClick={() => setClassPage(totalPages)} disabled={classPage === totalPages} className="px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-[#00A99D] hover:bg-teal-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors">»</button>
            </div>
          </div>
        );
      })()}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-5 flex items-center justify-between text-xs font-semibold">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Edit className="w-5 h-5 text-blue-500" /> Sửa thông tin lớp</h3>
                <button onClick={() => setEditModal(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Tên lớp</label><input type="text" required value={editModal.className} onChange={e => setEditModal({...editModal, className: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"/></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Cơ sở</label><select required value={editModal.campusId} disabled={isCampusLocked} onChange={e => !isCampusLocked && setEditModal({...editModal, campusId: e.target.value})} className={`w-full border rounded-xl p-2.5 outline-none text-sm ${isCampusLocked ? "bg-[#00A99D]/10 border-indigo-200 text-indigo-700 cursor-not-allowed" : "focus:ring-2 focus:ring-blue-500 border-slate-200"}`}>{campuses.map((cp: any) => <option key={cp.id} value={cp.id}>{cp.campusName}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Bậc học</label><select required value={editModal.level} onChange={e => setEditModal({...editModal, level: e.target.value, grade: ""})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"><option value="">Chọn bậc</option>{(activeTab === "mam-non" ? MN_LEVELS : K12_LEVELS).filter(l => l.value).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">"Khối học"</label><select required value={editModal.grade} onChange={e => setEditModal({...editModal, grade: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"><option value="">Chọn khối</option>{getGradesList(editModal.level, activeTab).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hệ học</label>
                  <select value={editModal.educationSystem || ""} onChange={e => setEditModal({...editModal, educationSystem: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">-- Chưa chọn --</option>
                    {eduSystems.map((es: any) => <option key={es.id} value={es.code}>{es.code} - {es.name}</option>)}
                  </select>
                </div>
                                {editModal.level === "Mầm non" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">GVCN 1</label>
                      <SearchableSelect
                        options={[
                          { value: "", label: "-- Chưa phân công --" },
                          ...(teachers?.filter((t: any) => (t.blockCM || "").toLowerCase().includes("mầm non")) || []).map((t: any) => ({
                            value: t.id,
                            label: t.teacherName
                          }))
                        ]}
                        value={editModal.gvcn1 || ""}
                        onChange={(val: string) => setEditModal({ ...editModal, gvcn1: val })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">GVCN 2</label>
                      <SearchableSelect
                        options={[
                          { value: "", label: "-- Chưa phân công --" },
                          ...(teachers?.filter((t: any) => (t.blockCM || "").toLowerCase().includes("mầm non")) || []).map((t: any) => ({
                            value: t.id,
                            label: t.teacherName
                          }))
                        ]}
                        value={editModal.gvcn2 || ""}
                        onChange={(val: string) => setEditModal({ ...editModal, gvcn2: val })}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Giáo viên chủ nhiệm (GVCN)</label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "-- Chưa phân công --" },
                        ...(teachers || []).map((t: any) => ({
                          value: t.id,
                          label: t.teacherName
                        }))
                      ]}
                      value={editModal.homeroomTeacherId || ""}
                      onChange={(val: string) => setEditModal({ ...editModal, homeroomTeacherId: val })}
                    />
                  </div>
                )}
                <div className="pt-4 flex items-center justify-end gap-3">
                   <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm">Hủy</button>
                   <button type="submit" className="font-medium text-white hover:bg-blue-700 text-sm shadow-sm flex items-center text-xs font-semibold"><Save className="w-4 h-4 mr-2" /> Lưu thay đổi</button>
                </div>
             </form>
           </div>
        </div>
      )}
      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-5 flex items-center justify-between text-xs font-semibold">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500" /> Thêm mới lớp học</h3>
                <button onClick={() => setCreateModal(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSaveCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tên lớp <span className="text-red-500">*</span></label>
                  <input type="text" required value={createModal.className} onChange={e => setCreateModal({...createModal, className: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nhập tên lớp..."/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cơ sở <span className="text-red-500">*</span></label>
                  <select required value={createModal.campusId} disabled={isCampusLocked} onChange={e => !isCampusLocked && setCreateModal({...createModal, campusId: e.target.value})} className={`w-full border rounded-xl p-2.5 outline-none text-sm ${isCampusLocked ? "bg-[#00A99D]/10 border-indigo-200 text-indigo-700 cursor-not-allowed" : "focus:ring-2 focus:ring-blue-500 border-slate-200"}`}>
                    {campuses.map((cp: any) => <option key={cp.id} value={cp.id}>{cp.campusName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Bậc học <span className="text-red-500">*</span></label>
                    <select required value={createModal.level} onChange={e => setCreateModal({...createModal, level: e.target.value, grade: ""})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">Chọn bậc</option>
                      {(activeTab === "mam-non" ? MN_LEVELS : K12_LEVELS).filter(l => l.value).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">"Khối học" <span className="text-red-500">*</span></label>
                    <select required value={createModal.grade} onChange={e => setCreateModal({...createModal, grade: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">Chọn khối</option>
                      {getGradesList(createModal.level, activeTab).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hệ học</label>
                  <select value={createModal.educationSystem || ""} onChange={e => setCreateModal({...createModal, educationSystem: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">-- Chưa chọn --</option>
                    {eduSystems.map((es: any) => <option key={es.id} value={es.code}>{es.code} - {es.name}</option>)}
                  </select>
                </div>
                {createModal.level === "Mầm non" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">GVCN 1</label>
                      <SearchableSelect
                        options={[
                          { value: "", label: "-- Chưa phân công --" },
                          ...(teachers?.filter((t: any) => (t.blockCM || "").toLowerCase().includes("mầm non")) || []).map((t: any) => ({
                            value: t.id,
                            label: t.teacherName
                          }))
                        ]}
                        value={createModal.gvcn1 || ""}
                        onChange={(val: string) => setCreateModal({ ...createModal, gvcn1: val })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">GVCN 2</label>
                      <SearchableSelect
                        options={[
                          { value: "", label: "-- Chưa phân công --" },
                          ...(teachers?.filter((t: any) => (t.blockCM || "").toLowerCase().includes("mầm non")) || []).map((t: any) => ({
                            value: t.id,
                            label: t.teacherName
                          }))
                        ]}
                        value={createModal.gvcn2 || ""}
                        onChange={(val: string) => setCreateModal({ ...createModal, gvcn2: val })}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Giáo viên chủ nhiệm (GVCN)</label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "-- Chưa phân công --" },
                        ...(teachers || []).map((t: any) => ({
                          value: t.id,
                          label: t.teacherName
                        }))
                      ]}
                      value={createModal.homeroomTeacherId || ""}
                      onChange={(val: string) => setCreateModal({ ...createModal, homeroomTeacherId: val })}
                    />
                  </div>
                )}
                <div className="pt-4 flex items-center justify-end gap-3">
                   <button type="button" onClick={() => setCreateModal(null)} className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm">Hủy</button>
                   <button type="submit" className="font-medium text-white hover:bg-blue-700 text-sm shadow-sm flex items-center text-xs font-semibold bg-blue-600 px-4 py-2 rounded-xl"><Save className="w-4 h-4 mr-2" /> Thêm mới</button>
                </div>
             </form>
           </div>
        </div>
      )}
    {/* ═══════════════════════════════════════════════════════════════ */}
    {/* Modal: Kết chuyển lớp học */}
    {transferModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#00A99D] to-[#006E68] text-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="w-5 h-5" />
              <h2 className="text-base font-bold tracking-tight">Kết chuyển lớp học sang năm học mới</h2>
            </div>
            <button onClick={() => { setTransferModal(false); setTransferResult(null); }} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Year selectors */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Năm học nguồn</label>
                <select value={transferSourceYear} onChange={e => { setTransferSourceYear(e.target.value); setTransferPreview([]); setTransferResult(null); }}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00A99D]/40 min-w-[160px]">
                  <option value="">-- Chọn --</option>
                  {academicYears.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <ArrowRightLeft className="w-5 h-5 text-slate-400 mb-2.5" />
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Năm học đích</label>
                <select value={transferTargetYear} onChange={e => { setTransferTargetYear(e.target.value); setTransferPreview([]); setTransferResult(null); }}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00A99D]/40 min-w-[160px]">
                  <option value="">-- Chọn --</option>
                  {academicYears.filter((y: any) => y.id !== transferSourceYear).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <button onClick={handleTransferPreview} disabled={!transferSourceYear || !transferTargetYear || transferLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#00A99D] hover:bg-[#008075] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
                {transferLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Tải danh sách
              </button>
            </div>

            {/* Mode radio */}
            {transferPreview.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tùy chọn kết chuyển:</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    { value: "class_only", label: "Chỉ sao chép cấu trúc lớp (Tên lớp, Cơ sở, Khối, Hệ học, GVCN)" },
                    { value: "with_assignments", label: "Sao chép lớp + Phân công giảng dạy (kèm Học kỳ)" }
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="radio" name="transferMode" value={opt.value} checked={transferMode === opt.value}
                        onChange={() => setTransferMode(opt.value as any)}
                        className="w-4 h-4 accent-[#00A99D]" />
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Result banner */}
          {transferResult && (
            <div className={`px-6 py-3 flex items-center gap-3 text-sm font-semibold ${transferResult.success ? "bg-emerald-50 text-emerald-700 border-b border-emerald-200" : "bg-rose-50 text-rose-700 border-b border-rose-200"}`}>
              {transferResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {transferResult.success
                ? `Kết chuyển thành công! Đã tạo ${transferResult.created} lớp mới. ${transferResult.skipped} lớp đã tồn tại (bỏ qua).`
                : `Lỗi: ${transferResult.error}`}
              {transferResult.errors?.length > 0 && <span className="text-xs font-normal ml-2">{transferResult.errors.slice(0,3).join("; ")}</span>}
            </div>
          )}

          {/* Preview table */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {transferPreview.length === 0 && !transferLoading && (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                <ArrowRightLeft className="w-8 h-8 mb-2 opacity-30" />
                Chọn năm học nguồn và đích, rồi bấm "Tải danh sách"
              </div>
            )}
            {transferLoading && (
              <div className="flex items-center justify-center h-32 gap-3 text-[#00A99D]">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-semibold">Đang tải dữ liệu...</span>
              </div>
            )}
            {transferPreview.length > 0 && !transferLoading && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-700">
                    Tổng: <span className="text-[#00A99D]">{transferPreview.length}</span> lớp nguồn •
                    Chọn: <span className="text-blue-600">{transferSelectedIds.length}</span> lớp •
                    Đã tồn tại: <span className="text-amber-600">{transferPreview.filter(p => p.alreadyExists).length}</span>
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setTransferSelectedIds(transferPreview.filter(p => !p.alreadyExists).map(p => p.id))}
                      className="text-xs font-semibold text-[#00A99D] hover:underline">Chọn lớp mới</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => setTransferSelectedIds([])}
                      className="text-xs font-semibold text-slate-400 hover:underline">Bỏ chọn</button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-10"><input type="checkbox"
                          checked={transferSelectedIds.length === transferPreview.filter(p => !p.alreadyExists).length && transferPreview.filter(p => !p.alreadyExists).length > 0}
                          onChange={e => setTransferSelectedIds(e.target.checked ? transferPreview.filter(p => !p.alreadyExists).map(p => p.id) : [])}
                          className="w-4 h-4 accent-[#00A99D]" /></th>
                        <th className="px-3 py-2.5 text-left">Tên lớp</th>
                        <th className="px-3 py-2.5 text-left">Cơ sở</th>
                        <th className="px-3 py-2.5 text-left">Khối</th>
                        <th className="px-3 py-2.5 text-left">Bậc học</th>
                        <th className="px-3 py-2.5 text-center">Sỹ số</th>
                        <th className="px-3 py-2.5 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transferPreview.map((p: any) => (
                        <tr key={p.id} className={`transition-colors ${transferSelectedIds.includes(p.id) ? "bg-teal-50/40" : "hover:bg-slate-50"} ${p.alreadyExists ? "opacity-60" : ""}`}>
                          <td className="px-3 py-2.5 text-center">
                            <input type="checkbox" checked={transferSelectedIds.includes(p.id)} disabled={p.alreadyExists}
                              onChange={e => setTransferSelectedIds(e.target.checked ? [...transferSelectedIds, p.id] : transferSelectedIds.filter(id => id !== p.id))}
                              className="w-4 h-4 accent-[#00A99D] disabled:opacity-40" />
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{p.className}</td>
                          <td className="px-3 py-2.5 text-slate-600">{p.campus}</td>
                          <td className="px-3 py-2.5 text-slate-600">{p.grade || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{p.level || "—"}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                              <Users className="w-3 h-3" />{p.studentCount}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {p.alreadyExists
                              ? <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-200/60">Đã tồn tại</span>
                              : <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-200/60">Sẽ tạo mới</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-white rounded-b-2xl">
            <button onClick={() => { setTransferModal(false); setTransferResult(null); }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              {transferResult?.success ? "Đóng" : "Hủy"}
            </button>
            {!transferResult?.success && (
              <button onClick={handleTransferExecute}
                disabled={!transferSelectedIds.length || transferLoading}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#00A99D] hover:bg-[#008075] disabled:opacity-50 rounded-xl transition-colors shadow-sm">
                {transferLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                Kết chuyển {transferSelectedIds.length > 0 ? `${transferSelectedIds.length} lớp` : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ═══════════════════════════════════════════════════════════════ */}
    {/* Modal: Sao chép học sinh */}
    {copyStudentModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <Copy className="w-5 h-5" />
              <h2 className="text-base font-bold tracking-tight">Sao chép học sinh sang năm học mới</h2>
            </div>
            <button onClick={() => { setCopyStudentModal(false); setCopyStudentResult(null); }} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col md:flex-row gap-6 min-h-0">
            {/* Column 1: Nguồn */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col min-h-[400px]">
              <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-1.5 text-indigo-700">
                <Building2 className="w-4 h-4" /> Nguồn (Năm học cũ)
              </h3>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Năm học</label>
                  <select value={copyStudentSourceYear} onChange={e => { setCopyStudentSourceYear(e.target.value); }}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-400/40">
                    <option value="">-- Chọn --</option>
                    {academicYears.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cơ sở</label>
                  <select value={copyStudentSourceCampus} onChange={e => { setCopyStudentSourceCampus(e.target.value); }}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-400/40">
                    <option value="">-- Chọn --</option>
                    {campuses.map((c: any) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lớp học</label>
                  <select value={copyStudentSourceClass} onChange={e => { setCopyStudentSourceClass(e.target.value); }}
                    disabled={!copyStudentSourceYear || !copyStudentSourceCampus}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-400/40 disabled:bg-slate-50">
                    <option value="">-- Chọn --</option>
                    {copyStudentSourceClasses.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
              </div>

              {/* Student list */}
              <div className="flex-grow border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50/50 min-h-[220px]">
                {copyStudentLoading ? (
                  <div className="flex-grow flex items-center justify-center gap-2 text-indigo-600 text-xs font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách học sinh...
                  </div>
                ) : !copyStudentSourceClass ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-400 text-xs p-10 text-center">
                    <Users className="w-8 h-8 mb-1.5 opacity-30 mx-auto" />
                    Vui lòng chọn Năm học, Cơ sở và Lớp nguồn
                  </div>
                ) : copyStudentSourceStudents.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-400 text-xs p-10 text-center">
                    Không có học sinh hoạt động nào trong lớp này
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col min-h-0">
                    <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={copyStudentSelectedIds.length === copyStudentSourceStudents.length}
                          onChange={e => setCopyStudentSelectedIds(e.target.checked ? copyStudentSourceStudents.map(s => s.id) : [])}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer" />
                        <span>Chọn tất cả ({copyStudentSourceStudents.length})</span>
                      </label>
                      <span>Đang chọn: <strong className="text-indigo-600">{copyStudentSelectedIds.length}</strong></span>
                    </div>
                    <div className="overflow-y-auto flex-grow max-h-[250px] divide-y divide-slate-100 bg-white">
                      {copyStudentSourceStudents.map((s: any) => {
                        const isChecked = copyStudentSelectedIds.includes(s.id);
                        return (
                          <label key={s.id} className={`flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors cursor-pointer ${isChecked ? "bg-indigo-50/20" : ""}`}>
                            <input type="checkbox" checked={isChecked}
                              onChange={e => setCopyStudentSelectedIds(e.target.checked ? [...copyStudentSelectedIds, s.id] : copyStudentSelectedIds.filter(id => id !== s.id))}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer" />
                            <div className="text-xs">
                              <div className="font-bold text-slate-800">{s.studentName}</div>
                              <div className="text-slate-400 font-medium font-mono text-[10px] mt-0.5">{s.studentCode}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Đích */}
            <div className="w-full md:w-[360px] bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-1.5 text-emerald-700">
                <Building2 className="w-4 h-4" /> Đích (Năm học mới)
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Năm học đích</label>
                  <select value={copyStudentTargetYear} onChange={e => { setCopyStudentTargetYear(e.target.value); }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-400/40">
                    <option value="">-- Chọn --</option>
                    {academicYears.filter((y: any) => y.id !== copyStudentSourceYear).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cơ sở đích</label>
                  <select value={copyStudentTargetCampus} onChange={e => { setCopyStudentTargetCampus(e.target.value); }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-400/40">
                    <option value="">-- Chọn --</option>
                    {campuses.map((c: any) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lớp học đích</label>
                  <select value={copyStudentTargetClass} onChange={e => { setCopyStudentTargetClass(e.target.value); }}
                    disabled={!copyStudentTargetYear || !copyStudentTargetCampus}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:bg-slate-50">
                    <option value="">-- Chọn --</option>
                    {copyStudentTargetClasses.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
              </div>

              {copyStudentResult && (
                <div className={`mt-6 p-3 rounded-lg text-xs font-semibold space-y-1 ${copyStudentResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"}`}>
                  {copyStudentResult.success ? (
                    <>
                      <div className="flex items-center gap-1.5 font-bold"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Thành công!</div>
                      <p>Đã sao chép {copyStudentResult.copied} học sinh.</p>
                      {copyStudentResult.skipped > 0 && <p className="text-slate-500 font-medium">Bỏ qua {copyStudentResult.skipped} học sinh trùng mã số.</p>}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 font-bold"><AlertCircle className="w-4 h-4 text-rose-600" /> Thất bại!</div>
                      <p>{copyStudentResult.error}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-white rounded-b-2xl">
            <p className="text-xs text-slate-400 font-medium">Chỉ cho phép sao chép khi đã chọn đầy đủ thông tin nguồn/đích và có ít nhất 1 học sinh được chọn.</p>
            <div className="flex gap-3">
              <button onClick={() => { setCopyStudentModal(false); setCopyStudentResult(null); }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                {copyStudentResult?.success ? "Đóng" : "Hủy"}
              </button>
              {!copyStudentResult?.success && (
                <button onClick={handleCopyStudentExecute}
                  disabled={!copyStudentTargetClass || copyStudentSelectedIds.length === 0 || copyStudentLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm">
                  {copyStudentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  Sao chép {copyStudentSelectedIds.length} học sinh
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ═══════════════════════════════════════════════════════════════ */}
    {/* Modal: Phân công giảng dạy */}
    {copyAssignModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-violet-800 text-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5" />
              <h2 className="text-base font-bold tracking-tight">Sao chép phân công giảng dạy sang năm học mới</h2>
            </div>
            <button onClick={() => { setCopyAssignModal(false); setCopyAssignResult(null); }} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Year selectors */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Năm học nguồn</label>
                <select value={copyAssignSourceYear} onChange={e => { setCopyAssignSourceYear(e.target.value); setCopyAssignPreview([]); setCopyAssignResult(null); }}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400/40 min-w-[160px]">
                  <option value="">-- Chọn --</option>
                  {academicYears.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <ArrowRightLeft className="w-5 h-5 text-slate-400 mb-2.5" />
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Năm học đích</label>
                <select value={copyAssignTargetYear} onChange={e => { setCopyAssignTargetYear(e.target.value); setCopyAssignPreview([]); setCopyAssignResult(null); }}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400/40 min-w-[160px]">
                  <option value="">-- Chọn --</option>
                  {academicYears.filter((y: any) => y.id !== copyAssignSourceYear).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <button onClick={handleCopyAssignPreview} disabled={!copyAssignSourceYear || !copyAssignTargetYear || copyAssignLoading}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
                {copyAssignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Kiểm tra
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Phân công được ghép tự động theo tên lớp. Phân công đã tồn tại trong năm đích sẽ được bỏ qua. Học kỳ (HK1/HK2) được giữ nguyên.</p>
          </div>

          {/* Result banner */}
          {copyAssignResult && (
            <div className={`px-6 py-3 flex items-center gap-3 text-sm font-semibold ${copyAssignResult.success ? "bg-emerald-50 text-emerald-700 border-b border-emerald-200" : "bg-rose-50 text-rose-700 border-b border-rose-200"}`}>
              {copyAssignResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {copyAssignResult.success
                ? `Hoàn thành! Đã sao chép ${copyAssignResult.copied} phân công. Bỏ qua ${copyAssignResult.skipped} (trùng hoặc chưa có lớp đích).`
                : `Lỗi: ${copyAssignResult.error}`}
            </div>
          )}

          {/* Preview table */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {copyAssignPreview.length === 0 && !copyAssignLoading && (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                <ClipboardCheck className="w-8 h-8 mb-2 opacity-30" />
                Chọn năm học nguồn và đích, rồi bấm "Kiểm tra" để xem trước
              </div>
            )}
            {copyAssignLoading && (
              <div className="flex items-center justify-center h-32 gap-3 text-violet-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-semibold">Đang kiểm tra phân công...</span>
              </div>
            )}
            {copyAssignPreview.length > 0 && !copyAssignLoading && (
              <>
                <div className="flex items-center gap-4 mb-3 text-sm font-bold text-slate-700">
                  <span>Tổng: <span className="text-violet-600">{copyAssignPreview.length}</span> phân công</span>
                  <span>Sẽ sao chép: <span className="text-emerald-600">{copyAssignPreview.filter(a => !a.isDuplicate && a.hasTargetClass).length}</span></span>
                  <span>Trùng (bỏ qua): <span className="text-amber-600">{copyAssignPreview.filter(a => a.isDuplicate).length}</span></span>
                  <span>Chưa có lớp đích: <span className="text-rose-600">{copyAssignPreview.filter(a => !a.isDuplicate && !a.hasTargetClass).length}</span></span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Giáo viên</th>
                        <th className="px-3 py-2.5 text-left">Môn học</th>
                        <th className="px-3 py-2.5 text-left">Lớp</th>
                        <th className="px-3 py-2.5 text-center">Học kỳ</th>
                        <th className="px-3 py-2.5 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {copyAssignPreview.map((a: any, idx: number) => (
                        <tr key={idx} className={`transition-colors hover:bg-slate-50 ${a.isDuplicate ? "opacity-55" : ""}`}>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{a.teacherName}</td>
                          <td className="px-3 py-2.5 text-slate-600">{a.subjectName}</td>
                          <td className="px-3 py-2.5 text-slate-600">{a.className}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md ${a.semester === 1 ? "bg-blue-50 text-blue-700 border border-blue-200/60" : "bg-orange-50 text-orange-700 border border-orange-200/60"}`}>
                              HK{a.semester}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {a.isDuplicate
                              ? <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-200/60"><AlertCircle className="w-3 h-3" /> Đã tồn tại</span>
                              : !a.hasTargetClass
                              ? <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-md border border-rose-200/60">Chưa có lớp đích</span>
                              : <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-200/60"><CheckCircle2 className="w-3 h-3" /> Sẽ sao chép</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-white rounded-b-2xl">
            <p className="text-xs text-slate-400">Phân công trùng sẽ được bỏ qua. Chỉ sao chép phân công có lớp đích tương ứng.</p>
            <div className="flex gap-3">
              <button onClick={() => { setCopyAssignModal(false); setCopyAssignResult(null); }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                {copyAssignResult?.success ? "Đóng" : "Hủy"}
              </button>
              {!copyAssignResult?.success && (
                <button onClick={handleCopyAssignExecute}
                  disabled={copyAssignPreview.filter((a: any) => !a.isDuplicate && a.hasTargetClass).length === 0 || copyAssignLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm">
                  {copyAssignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                  Sao chép {copyAssignPreview.filter((a: any) => !a.isDuplicate && a.hasTargetClass).length} phân công
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    </div>
  )
}