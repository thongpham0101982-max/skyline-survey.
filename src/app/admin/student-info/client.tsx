"use client";

import { useState, useMemo, useRef, useEffect, Fragment, useCallback } from "react";
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Users2, 
  Baby, 
  GraduationCap, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  BookOpen, 
  FileText,
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  Sparkles
} from "lucide-react";
import * as XLSX from "xlsx";

interface StudentInfoClientProps {
  initialGeneralStudents: any[];
  initialPreschoolStudents: any[];
  generalPeriods: any[];
  preschoolPeriods: any[];
  activeYearName: string;
  activeYearId: string;
  configs: any[];
  preschoolConfigs: any[];
  eduSystems: any[];
  campuses: any[];
  grades: string[];
}

const preschoolGrades = ["18 đến 24 tháng", "24 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn", "5 đến 6 tuổi"];

export function StudentInfoClient({ 
  initialGeneralStudents = [], 
  initialPreschoolStudents = [],
  generalPeriods = [],
  preschoolPeriods = [],
  activeYearName = "",
  activeYearId = "",
  configs = [],
  preschoolConfigs = [],
  eduSystems = [],
  campuses = [],
  grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
}: StudentInfoClientProps) {
  const [activeTab, setActiveTab] = useState<"general" | "preschool">("general");
  
  const currentEduSystems = useMemo(() => {
    if (!activeYearId) return eduSystems;
    return eduSystems.filter((es: any) => es.academicYearId === activeYearId);
  }, [eduSystems, activeYearId]);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedResult, setSelectedResult] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected student for details modal
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Add/Edit student modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<any>({
    studentCode: "",
    fullName: "",
    dateOfBirth: "",
    gender: "Nam",
    grade: "",
    className: "",
    periodId: "",
    batchId: "",
    surveySystem: "",
    admissionCriteria: "",
    admissionCampus: "",
    admissionResult: "",
    directorNote: "",
    signatureName: "",
    surveyFormType: "",
    kqHocTap: "",
    kqRenLuyen: "",
    hoSoCtQuocTe: "",
    hocKy: "",
    targetType: "",
    kqgdTieuHoc: "",
    devProfessionalComment: "",
    devPsychologyComment: "",
    devImportantNote: "",
    devAssessmentResult: ""
  });

  // Import excel modal states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPeriodId, setImportPeriodId] = useState("");
  const [importBatchId, setImportBatchId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Feedback notifications
  const [notification, setNotification] = useState<{ text: string; type: "success" | "err" } | null>(null);

  const showNotification = (text: string, type: "success" | "err" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Reset filters when changing tab
  const handleTabChange = (tab: "general" | "preschool") => {
    setActiveTab(tab);
    setSearchQuery("");
    setSelectedPeriod("");
    setSelectedBatch("");
    setSelectedResult("");
    setSelectedGrade("");
    setSelectedIds([]);
    setCurrentPage(1);
  };

  // Get active dataset
  const currentDataset = useMemo(() => {
    return activeTab === "general" ? initialGeneralStudents : initialPreschoolStudents;
  }, [activeTab, initialGeneralStudents, initialPreschoolStudents]);

  // Extract unique periods, batches, grades for filter options
  const filterOptions = useMemo(() => {
    const periods = new Set<string>();
    const batches = new Set<string>();
    const grades = new Set<string>();
    const results = new Set<string>();

    currentDataset.forEach((student) => {
      if (student.period?.name) periods.add(student.period.name);
      if (student.batch?.name) batches.add(student.batch.name);
      if (student.grade) grades.add(student.grade);
      if (student.admissionResult) results.add(student.admissionResult);
    });

    return {
      periods: Array.from(periods).sort(),
      batches: Array.from(batches).sort(),
      grades: Array.from(grades).sort((a, b) => {
        const na = parseInt(a);
        const nb = parseInt(b);
        if (isNaN(na) || isNaN(nb)) return a.localeCompare(b);
        return na - nb;
      }),
      results: Array.from(results).sort()
    };
  }, [currentDataset]);

  // Filtered dataset
  const filteredStudents = useMemo(() => {
    return currentDataset.filter((student) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = student.fullName?.toLowerCase().includes(query);
        const matchesCode = student.studentCode?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }
      if (selectedPeriod && student.period?.name !== selectedPeriod) return false;
      if (selectedBatch && student.batch?.name !== selectedBatch) return false;
      if (selectedResult && student.admissionResult !== selectedResult) return false;
      if (selectedGrade && student.grade !== selectedGrade) return false;
      return true;
    });
  }, [currentDataset, searchQuery, selectedPeriod, selectedBatch, selectedResult, selectedGrade]);

  // Reset selected checkboxes if filtered dataset changes
  useEffect(() => {
    setSelectedIds([]);
  }, [filteredStudents]);

  // Statistics
  const statistics = useMemo(() => {
    let total = filteredStudents.length;
    let passed = 0;
    let failed = 0;
    let pending = 0;

    filteredStudents.forEach((s) => {
      const res = s.admissionResult || "";
      if (res === "Đạt" || res === "Đạt cam kết" || res === "Học thử") {
        passed++;
      } else if (res.includes("Không đạt")) {
        failed++;
      } else {
        pending++;
      }
    });

    return { total, passed, failed, pending };
  }, [filteredStudents]);

  // Paginated dataset
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "-";
    try {
      return new Date(dateVal).toLocaleDateString("vi-VN");
    } catch {
      return String(dateVal);
    }
  };

  const getResultBadgeClass = (result: string) => {
    if (!result) return "bg-slate-50 text-slate-500 border border-slate-100";
    if (result === "Đạt") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    if (result === "Đạt cam kết") return "bg-amber-50 text-amber-600 border border-amber-100";
    if (result === "Học thử") return "bg-indigo-50 text-indigo-600 border border-indigo-100";
    if (result.includes("Không đạt")) return "bg-rose-50 text-rose-600 border border-rose-100";
    return "bg-blue-50 text-blue-600 border border-blue-100";
  };

  // Get current active tab periods list
  const activePeriodsList = useMemo(() => {
    return activeTab === "general" ? generalPeriods : preschoolPeriods;
  }, [activeTab, generalPeriods, preschoolPeriods]);

  // Get active tab period's batch options in form/import
  const activeFormBatches = useMemo(() => {
    const selected = activePeriodsList.find(p => p.id === formState.periodId);
    return selected?.batches || [];
  }, [formState.periodId, activePeriodsList]);

  const activeImportBatches = useMemo(() => {
    const selected = activePeriodsList.find(p => p.id === importPeriodId);
    return selected?.batches || [];
  }, [importPeriodId, activePeriodsList]);

  // Preschool age calculation and dynamic suggestions
  const getMonthsAndSuggestGrade = useCallback((dobStr: string, batchId: string) => {
    if (!dobStr) return { months: null, suggest: "", surveyDateStr: "" };
    
    // Find the survey date based on selected batch or period
    let surveyDate = new Date();
    let source = "Ngày hôm nay";
    
    if (batchId) {
      const selectedBatch = preschoolPeriods.flatMap(p => p.batches || []).find(b => b.id === batchId);
      if (selectedBatch?.startDate) {
        surveyDate = new Date(selectedBatch.startDate);
        source = `Đầu đợt: ${surveyDate.toLocaleDateString("vi-VN")}`;
      }
    } else {
      const activePeriodId = formState.periodId || (preschoolPeriods[0]?.id || "");
      const period = preschoolPeriods.find(p => p.id === activePeriodId);
      if (period?.startDate) {
        surveyDate = new Date(period.startDate);
        source = `Đầu kỳ: ${surveyDate.toLocaleDateString("vi-VN")}`;
      }
    }

    const birth = new Date(dobStr);
    if (isNaN(birth.getTime())) return { months: null, suggest: "", surveyDateStr: "" };

    // Calculate months difference
    let months = (surveyDate.getFullYear() - birth.getFullYear()) * 12 + (surveyDate.getMonth() - birth.getMonth());
    if (surveyDate.getDate() < birth.getDate()) {
      months--;
    }

    // Suggest grade
    let suggest = "";
    if (months >= 18 && months <= 24) suggest = "18 đến 24 tháng";
    else if (months > 24 && months <= 36) suggest = "24 đến 36 tháng";
    else if (months > 36 && months <= 48) suggest = "Mẫu giáo bé";
    else if (months > 48 && months <= 60) suggest = "Mẫu giáo nhỡ";
    else if (months > 60) suggest = "Mẫu giáo lớn";

    return { months, suggest, surveyDateStr: source };
  }, [preschoolPeriods, formState.periodId]);

  const ageInfo = useMemo(() => {
    if (activeTab !== "preschool") return { months: null, suggest: "", surveyDateStr: "" };
    return getMonthsAndSuggestGrade(formState.dateOfBirth, formState.batchId);
  }, [activeTab, formState.dateOfBirth, formState.batchId, getMonthsAndSuggestGrade]);

  // Auto generate code helper
  const handleAutoGenerateCode = async () => {
    try {
      const endpoint = activeTab === "general" 
        ? "/api/input-assessment-students?get_max_code=true" 
        : "/api/preschool-input-assessment-students?get_max_code=true";
      const r = await fetch(endpoint);
      if (r.ok) {
        const res = await r.json();
        if (res.nextCode) {
          if (activeTab === "general") {
            setFormState(prev => ({ ...prev, studentCode: res.nextCode }));
          } else {
            const code = "MN" + res.nextCode.replace(/^\D+/, "");
            setFormState(prev => ({ ...prev, studentCode: code }));
          }
          showNotification("Đã tạo mã học sinh tự động");
        }
      }
    } catch (e) {
      showNotification("Lỗi khi tự động sinh mã", "err");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormMode("create");
    setEditingId(null);
    const defaultPeriodId = activeTab === "general" 
      ? (generalPeriods[0]?.id || "") 
      : (preschoolPeriods[0]?.id || "");
    const defaultBatchId = activeTab === "general"
      ? (generalPeriods[0]?.batches?.[0]?.id || "")
      : (preschoolPeriods[0]?.batches?.[0]?.id || "");

    setFormState({
      studentCode: "",
      fullName: "",
      dateOfBirth: "",
      gender: "Nam",
      grade: activeTab === "general" ? (grades[0] || "1") : "18 đến 24 tháng",
      className: "",
      periodId: defaultPeriodId,
      batchId: defaultBatchId,
      surveySystem: "",
      admissionCriteria: "",
      admissionCampus: "",
      admissionResult: "",
      directorNote: "",
      signatureName: "",
      surveyFormType: "",
      kqHocTap: "",
      kqRenLuyen: "",
      hoSoCtQuocTe: "",
      hocKy: "",
      targetType: "",
      kqgdTieuHoc: "",
      devProfessionalComment: "",
      devPsychologyComment: "",
      devImportantNote: "",
      devAssessmentResult: ""
    });
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (student: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormMode("edit");
    setEditingId(student.id);
    
    // Format birthdate for HTML date input: YYYY-MM-DD
    let formattedDob = "";
    if (student.dateOfBirth) {
      try {
        formattedDob = new Date(student.dateOfBirth).toISOString().split("T")[0];
      } catch {}
    }

    setFormState({
      studentCode: student.studentCode || "",
      fullName: student.fullName || "",
      dateOfBirth: formattedDob,
      gender: student.gender || "Nam",
      grade: student.grade || "",
      className: student.className || "",
      periodId: student.periodId || "",
      batchId: student.batchId || "",
      surveySystem: student.surveySystem || "",
      admissionCriteria: student.admissionCriteria || "",
      admissionCampus: student.admissionCampus || "",
      admissionResult: student.admissionResult || "",
      directorNote: student.directorNote || "",
      signatureName: student.signatureName || "",
      surveyFormType: student.surveyFormType || "",
      kqHocTap: student.kqHocTap || "",
      kqRenLuyen: student.kqRenLuyen || "",
      hoSoCtQuocTe: student.hoSoCtQuocTe || "",
      hocKy: student.hocKy || "",
      targetType: student.targetType || "",
      kqgdTieuHoc: student.kqgdTieuHoc || "",
      devProfessionalComment: student.devProfessionalComment || "",
      devPsychologyComment: student.devPsychologyComment || "",
      devImportantNote: student.devImportantNote || "",
      devAssessmentResult: student.devAssessmentResult || ""
    });
    setIsFormOpen(true);
  };

  // Handle Save Student (Create/Edit)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.studentCode.trim()) return showNotification("Mã học sinh không được để trống", "err");
    if (!formState.fullName.trim()) return showNotification("Họ và tên không được để trống", "err");
    if (!formState.periodId) return showNotification("Kỳ khảo sát là bắt buộc", "err");

    const endpoint = activeTab === "general" 
      ? "/api/input-assessment-students" 
      : "/api/preschool-input-assessment-students";
    
    const method = formMode === "edit" ? "PUT" : "POST";
    const bodyData = formMode === "edit"
      ? { id: editingId, data: formState }
      : { action: "CREATE", data: formState };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
      if (res.ok) {
        showNotification(formMode === "edit" ? "Cập nhật học sinh thành công!" : "Thêm mới học sinh thành công!");
        setIsFormOpen(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        showNotification("Lỗi: " + (err.error || "Gửi yêu cầu thất bại"), "err");
      }
    } catch (e) {
      showNotification("Lỗi kết nối máy chủ", "err");
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async (student: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc muốn xóa học sinh ${student.fullName} (${student.studentCode}) khỏi hệ thống?`)) return;

    const endpoint = activeTab === "general" 
      ? `/api/input-assessment-students?id=${student.id}` 
      : `/api/preschool-input-assessment-students?id=${student.id}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        showNotification("Đã xóa học sinh thành công");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification("Lỗi khi xóa học sinh", "err");
      }
    } catch (e) {
      showNotification("Lỗi kết nối", "err");
    }
  };

  // Bulk Delete
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} học sinh đã chọn khỏi hệ thống?`)) return;

    const endpoint = activeTab === "general"
      ? `/api/input-assessment-students?ids=${selectedIds.join(",")}`
      : `/api/preschool-input-assessment-students?ids=${selectedIds.join(",")}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        showNotification(`Đã xóa thành công ${selectedIds.length} học sinh!`);
        setSelectedIds([]);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification("Lỗi khi thực hiện xóa nhiều dòng", "err");
      }
    } catch (e) {
      showNotification("Lỗi kết nối", "err");
    }
  };

  // Export filtered students list to Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return showNotification("Không có dữ liệu trong bộ lọc để xuất", "err");

    const dataToExport = filteredStudents.map((s) => {
      const basic = {
        "Mã học sinh": s.studentCode || "",
        "Họ và tên": s.fullName || "",
        "Ngày sinh": formatDate(s.dateOfBirth),
        "Giới tính": s.gender || "",
        "Kỳ khảo sát": s.period?.name || "",
        "Đợt khảo sát": s.batch?.name || "",
        "Kết quả duyệt": s.admissionResult || "Chưa duyệt",
        "Hệ đào tạo": s.surveySystem || "",
        "Cơ sở dự tuyển": s.admissionCampus || "",
        "Ghi chú tuyển sinh": s.directorNote || "",
      };

      if (activeTab === "general") {
        return {
          ...basic,
          "Khối học": s.grade || "",
          "Lớp dự tuyển": s.className || "",
          "Diện tuyển sinh": s.admissionCriteria || "",
          "Học lực": s.kqHocTap || "",
          "Hạnh kiểm": s.kqRenLuyen || "",
          "Học bạ": s.kqgdTieuHoc || "",
          "Hệ Khảo sát": s.surveyFormType || "",
          "Hồ sơ / Bảng điểm": s.hoSoCtQuocTe || "",
          "Đối tượng Tuyển sinh": s.targetType || "",
        };
      } else {
        return {
          ...basic,
          "Nhóm tuổi": s.grade || "",
          "Hệ khảo sát": s.surveyFormType || "",
          "Đánh giá chuyên môn": s.devProfessionalComment || "",
          "Đánh giá tâm lý": s.devPsychologyComment || "",
          "Ghi chú quan trọng": s.devImportantNote || "",
          "Nhận xét chung": s.devAssessmentResult || "",
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === "general" ? "Phổ thông" : "Mầm non");
    XLSX.writeFile(workbook, `Danh_Sach_HS_Khao_Sat_${activeTab === "general" ? "Pho_Thong" : "Mam_Non"}.xlsx`);
    showNotification("Đã xuất file Excel thành công!");
  };

  // Download template for Excel import matching KSNL 100%
  const handleDownloadTemplate = () => {
    let ws;
    if (activeTab === "general") {
      ws = XLSX.utils.json_to_sheet([
        { 
          "Mã HS KS": "", 
          "Họ và Tên *": "Nguyễn Văn A", 
          "Ngày sinh": "20/05/2010",
          "Giới tính": "Nam",
          "Khối": "6",
          "Học kỳ / Năm TS": "HK1",
          "Hệ Khảo sát": "",
          "Hồ sơ / Bảng điểm": "",
          "Đối tượng Tuyển sinh": "",
          "Diện khảo sát": "",
          "Hình thức KS": "",
          "Kết quả Học tập": "",
          "Kết quả Rèn luyện": ""
        }
      ]);
      ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    } else {
      ws = XLSX.utils.json_to_sheet([
        { 
          "Mã bé": "MN001", 
          "Họ và tên": "Nguyễn Bé An", 
          "Ngày sinh": "15/08/2022", 
          "Giới tính": "Nữ", 
          "Nhóm tuổi": "18 đến 24 tháng", 
          "Cơ sở": "Skyline Riverside", 
          "Hệ KS": "Chất lượng cao" 
        }
      ]);
      ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, "DS_HocSinh");
    XLSX.writeFile(workbook, activeTab === "general" ? "Mau_Import_HS_KhaoSat.xlsx" : "Form_Mau_Them_Be_Mam_Non.xlsx");
    showNotification("Đã tải file Excel mẫu!");
  };

  // Handle Excel parsing and bulk upload matching KSNL 100%
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!importPeriodId) return showNotification("Vui lòng chọn Kỳ khảo sát đích trước", "err");
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportSuccessCount(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

      if (rawRows.length === 0) {
        throw new Error("File Excel không có dữ liệu học sinh");
      }

      // Helper function to dynamically map values based on keywords
      const findVal = (row: any, keywords: string[]) => {
        const keys = Object.keys(row);
        for (const key of keys) {
          const k = key.toLowerCase().trim();
          if (keywords.some(kw => k.includes(kw.toLowerCase()))) return row[key];
        }
        return null;
      };

      const mapped = rawRows.map((row: any) => {
        // Handle date parsing
        let parsedDate = null;
        const rawDate = row["Ngày sinh"] || findVal(row, ["birth", "dob", "sinh", "ngay sinh"]);
        if (rawDate) {
          if (typeof rawDate === "number") {
            const date = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            parsedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toISOString();
          } else if (typeof rawDate === "string") {
            const parts = rawDate.split(/[\/\-]/);
            if (parts.length === 3 && parts[0].length <= 2) {
              parsedDate = parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0") + "T00:00:00.000Z";
            } else {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) parsedDate = d.toISOString();
            }
          }
        }

        const genderVal = String(row["Giới tính"] || findVal(row, ["giới tính", "gender"]) || "").trim().toLowerCase();
        let gender = "Nam";
        if (genderVal.includes("nữ") || genderVal === "female" || genderVal === "f") {
          gender = "Nữ";
        } else if (genderVal.includes("nam") || genderVal === "male" || genderVal === "m") {
          gender = "Nam";
        }

        if (activeTab === "general") {
          const studentCode = String(row["Mã HS KS"] || findVal(row, ["mã hs", "ma hs", "mã"]) || "").trim();
          const fullName = String(row["Họ và Tên *"] || row["Họ và tên"] || findVal(row, ["họ tên", "tên", "fullname"]) || "").trim();
          const grade = String(row["Khối"] || findVal(row, ["khối", "grade"]) || "").trim();
          const hocKy = String(row["Học kỳ / Năm TS"] || findVal(row, ["học kỳ", "hoc ky"]) || "").trim();
          const surveyFormType = String(row["Hệ Khảo sát"] || findVal(row, ["hệ khảo sát", "he khao sat"]) || "").trim();
          const hoSoCtQuocTe = String(row["Hồ sơ / Bảng điểm"] || findVal(row, ["hồ sơ", "bảng điểm"]) || "").trim();
          const targetType = String(row["Đối tượng Tuyển sinh"] || findVal(row, ["đối tượng", "doi tuong"]) || "").trim();
          const admissionCriteria = String(row["Diện khảo sát"] || findVal(row, ["diện", "criteria"]) || "").trim();
          const surveySystem = String(row["Hình thức KS"] || findVal(row, ["hình thức", "hinh thuc"]) || "").trim();
          const kqHocTap = String(row["Kết quả Học tập"] || findVal(row, ["học lực", "học tập"]) || "").trim();
          const kqRenLuyen = String(row["Kết quả Rèn luyện"] || findVal(row, ["hạnh kiểm", "rèn luyện"]) || "").trim();

          return {
            studentCode,
            fullName,
            dateOfBirth: parsedDate,
            gender,
            grade,
            hocKy,
            surveyFormType,
            hoSoCtQuocTe,
            targetType,
            admissionCriteria,
            surveySystem,
            kqHocTap,
            kqRenLuyen,
            periodId: importPeriodId,
            batchId: importBatchId || null
          };
        } else {
          const studentCode = String(row["Mã bé"] || findVal(row, ["mã bé", "mã"]) || "").trim();
          const fullName = String(row["Họ và tên"] || findVal(row, ["họ tên", "tên", "fullname"]) || "").trim();
          const grade = String(row["Nhóm tuổi"] || findVal(row, ["nhóm tuổi", "nhom tuoi", "tuổi"]) || "").trim();
          const admissionCampus = String(row["Cơ sở"] || findVal(row, ["cơ sở", "campus", "cs"]) || "").trim();
          const surveyFormType = String(row["Hệ KS"] || findVal(row, ["hệ ks", "he ks"]) || "").trim();

          return {
            studentCode,
            fullName,
            dateOfBirth: parsedDate,
            gender,
            grade,
            admissionCampus,
            surveyFormType,
            periodId: importPeriodId,
            batchId: importBatchId || null
          };
        }
      });

      // Filter rows that don't have full names or student code
      const validRows = mapped.filter(r => r.fullName && r.studentCode);
      if (validRows.length === 0) {
        throw new Error("Không có dòng dữ liệu hợp lệ (Cần có Mã học sinh và Họ & tên)");
      }

      const endpoint = activeTab === "general"
        ? "/api/input-assessment-students"
        : "/api/preschool-input-assessment-students";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BULK_CREATE", data: validRows })
      });

      if (response.ok) {
        const result = await response.json();
        setImportSuccessCount(result.created || validRows.length);
        showNotification(`Đã import thành công ${result.created || validRows.length} học sinh!`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await response.json();
        throw new Error(err.error || "Gửi dữ liệu lên API thất bại");
      }

    } catch (err: any) {
      setImportError(err.message || "Đã xảy ra lỗi không xác định");
      showNotification("Import file thất bại", "err");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  // Set default batch when period changes in forms
  useEffect(() => {
    if (activeFormBatches.length > 0) {
      const match = activeFormBatches.find((b: any) => b.id === formState.batchId);
      if (!match) {
        setFormState(prev => ({ ...prev, batchId: activeFormBatches[0].id }));
      }
    } else {
      setFormState(prev => ({ ...prev, batchId: "" }));
    }
  }, [formState.periodId, activeFormBatches]);

  useEffect(() => {
    if (activeImportBatches.length > 0) {
      setImportBatchId(activeImportBatches[0].id);
    } else {
      setImportBatchId("");
    }
  }, [importPeriodId, activeImportBatches]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-top-4 duration-300 font-semibold text-sm ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
          {notification.text}
        </div>
      )}

      {/* Tab Selector & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => handleTabChange("general")}
            className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
              activeTab === "general"
                ? "border-[#00A6A9] text-[#00A6A9] bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            Phổ thông K-12 ({initialGeneralStudents.length})
          </button>
          <button
            onClick={() => handleTabChange("preschool")}
            className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-px rounded-t-xl ${
              activeTab === "preschool"
                ? "border-[#00A6A9] text-[#00A6A9] bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20"
            }`}
          >
            <Baby className="w-5 h-5" />
            Mầm non ({initialPreschoolStudents.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-2 sm:pb-0">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Xóa đã chọn ({selectedIds.length})
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00A6A9] hover:bg-[#008c85] text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {activeTab === "general" ? "Thêm mới" : "Thêm bé"}
          </button>
          <button
            onClick={() => {
              if (activePeriodsList.length === 0) {
                return showNotification("Năm học này chưa có kỳ khảo sát để import học sinh", "err");
              }
              setImportPeriodId(activePeriodsList[0].id);
              setImportError(null);
              setImportSuccessCount(null);
              setIsImportOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-605 text-indigo-600 rounded-xl text-xs font-bold border border-indigo-200 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Nhập Excel
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tổng số trong bộ lọc</p>
            <p className="text-2xl font-extrabold text-slate-800">{statistics.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Đạt / Đạt cam kết / Học thử</p>
            <p className="text-2xl font-extrabold text-emerald-600">{statistics.passed}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Không đạt</p>
            <p className="text-2xl font-extrabold text-rose-600">{statistics.failed}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chưa duyệt / Khác</p>
            <p className="text-2xl font-extrabold text-amber-600">{statistics.pending}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Control Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#1E1B4B] font-bold text-sm">
          <Filter className="w-4 h-4 text-[#00A6A9]" />
          Bộ lọc & Tìm kiếm nhanh
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tên hoặc mã HS..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer text-slate-700 font-medium"
          >
            <option value="">Tất cả Kỳ khảo sát</option>
            {filterOptions.periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer text-slate-700 font-medium"
          >
            <option value="">Tất cả Đợt</option>
            {filterOptions.batches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer text-slate-700 font-medium"
          >
            <option value="">Tất cả Khối</option>
            {filterOptions.grades.map((g) => (
              <option key={g} value={g}>{activeTab === "general" ? `Khối ${g}` : g}</option>
            ))}
          </select>

          {/* Result Filter */}
          <select
            value={selectedResult}
            onChange={(e) => {
              setSelectedResult(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer text-slate-700 font-medium"
          >
            <option value="">Tất cả Kết quả</option>
            {filterOptions.results.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "general" ? (
            /* Phổ thông K-12 Table (Matched style of original general assessments) */
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#00A19A]/5 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#00A6A9] accent-[#00A6A9]"
                      checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                      onChange={(e) => setSelectedIds(e.target.checked ? filteredStudents.map(s => s.id) : [])}
                    />
                  </th>
                  <th className="px-5 py-4 w-28 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã học sinh</th>
                  <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên</th>
                  <th className="px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Khối</th>
                  <th className="px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Giới tính</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Ngày sinh</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">Hệ KS</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Học lực</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Hạnh kiểm</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Học bạ</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Học kỳ / Năm TS</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Đối tượng TS</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả duyệt</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy dữ liệu học sinh phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s, idx) => (
                    <tr 
                      key={s.id} 
                      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      onClick={() => {
                        setSelectedStudent(s);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-[#00A6A9] accent-[#00A6A9]"
                          checked={selectedIds.includes(s.id)}
                          onChange={(e) => setSelectedIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-black text-[#00A19A] bg-[#00A19A]/10 border border-[#00A19A]/20 px-2.5 py-1 rounded-md">
                          {s.studentCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{s.fullName}</span>
                          <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{s.surveySystem || "Chưa xếp hệ"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center text-xs font-bold text-slate-500 bg-slate-50/50 group-hover:bg-transparent">
                        {s.grade}
                      </td>
                      <td className="px-3 py-3.5 text-center text-xs font-bold text-slate-500">
                        {s.gender || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs font-semibold text-slate-600">{formatDate(s.dateOfBirth)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {s.surveyFormType || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-600">{s.kqHocTap || "-"}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-600">{s.kqRenLuyen || "-"}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-600">{s.kqgdTieuHoc || "-"}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-600">{s.hocKy || "-"}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-600">{s.targetType || "-"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getResultBadgeClass(s.admissionResult)}`}>
                          {s.admissionResult || "Chưa duyệt"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStudent(s);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#00A6A9] hover:bg-slate-100 rounded-lg transition-all"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-slate-400 hover:text-[#00A6A9] hover:bg-slate-100 rounded-lg transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteStudent(s, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Xóa học sinh"
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
          ) : (
            /* Mầm non Preschool Table (Matched style of original preschool Ds Trẻ) */
            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
              <thead className="bg-[#00A19A]/5 border-b border-slate-300">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-[#00A19A]"
                      checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                      onChange={(e) => setSelectedIds(e.target.checked ? filteredStudents.map(c => c.id) : [])}
                    />
                  </th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-14">STT</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Mã bé</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Ngày sinh</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Giới tính</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Nhóm tuổi</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">Cơ sở</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">Kết quả</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-50">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 font-medium">
                      Không tìm thấy dữ liệu học sinh phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((child, i) => (
                    <tr 
                      key={child.id} 
                      className={`hover:bg-[#00A19A]/5/30 transition-colors cursor-pointer ${selectedIds.includes(child.id) ? "bg-[#00A19A]/5/50" : ""}`}
                      onClick={() => {
                        setSelectedStudent(child);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-[#00A19A]"
                          checked={selectedIds.includes(child.id)}
                          onChange={(e) => setSelectedIds(prev => e.target.checked ? [...prev, child.id] : prev.filter(id => id !== child.id))}
                        />
                      </td>
                      <td className="p-4 text-slate-400 text-sm">{(currentPage - 1) * pageSize + i + 1}</td>
                      <td className="p-4">
                        <span className="font-mono text-xs font-black text-[#00A19A] bg-[#00A19A]/5 px-2 py-1 rounded-none">
                          {child.studentCode}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-fuchsia-400 flex items-center justify-center text-white font-black text-xs shadow-none">
                            {child.fullName?.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{child.fullName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {formatDate(child.dateOfBirth)}
                      </td>
                      <td className="p-4">
                        {child.gender ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none border ${child.gender === "Nữ" || child.gender === "F" || child.gender === "FEMALE" ? "bg-teal-50 text-[#00A19A] border-teal-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                            {child.gender === "MALE" || child.gender === "Nam" || child.gender === "M" ? "Nam" : "Nữ"}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold text-[#00A6A9] bg-[#00A6A9]/5 px-2 py-1 rounded-none border border-[#00A6A9]/30">
                          {child.grade || "—"}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-600">
                        {child.admissionCampus || "—"}
                      </td>
                      <td className="p-4">
                        {child.admissionResult ? (
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-none border ${child.admissionResult === "Học thử" ? "bg-[#00A19A]/5 text-[#00A6A9] border-[#00A6A9]/30" : child.admissionResult.toUpperCase().includes("ĐẠT") && !child.admissionResult.toUpperCase().includes("KHÔNG") ? "bg-emerald-50 text-emerald-800 border-emerald-300" : child.admissionResult.toUpperCase().includes("KHÔNG") ? "bg-rose-50 text-rose-800 border-rose-300" : "bg-amber-50 text-amber-800 border-amber-300"}`}>
                            {child.admissionResult}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">Chưa duyệt</span>
                        )}
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedStudent(child);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#00A6A9] hover:bg-slate-100 rounded-lg transition-all"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(child)}
                            className="p-2 text-slate-300 hover:text-[#00A19A] hover:bg-[#00A19A]/5 rounded-none transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteStudent(child, e)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-none transition-all"
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
          )}
        </div>

        {/* Pagination Controls */}
        {filteredStudents.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị {Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)}-
              {Math.min(filteredStudents.length, currentPage * pageSize)} trong tổng số{" "}
              {filteredStudents.length} học sinh
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-2 py-1 text-xs text-slate-400">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-[#00A6A9] text-white border-[#00A6A9]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Form: Add / Edit Student */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in scale-in duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {formMode === "create" ? (activeTab === "general" ? "Thêm mới học sinh" : "Thêm bé") : "Chỉnh sửa thông tin học sinh"}
                </h3>
                <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">
                  {activeTab === "general" ? "Phân hệ Phổ thông" : "Phân hệ Mầm non"} - Năm học {activeYearName}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 overflow-y-auto space-y-4 flex-1">
              {activeTab === "general" ? (
                /* PHỔ THÔNG K-12 FORM - MATCHED 100% WITH ORIGINAL */
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mã HS KS *</label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          disabled={formMode === "edit"}
                          value={formState.studentCode}
                          onChange={(e) => setFormState({ ...formState, studentCode: e.target.value.toUpperCase().replace(/\s/g, "") })}
                          placeholder="VD: HS001"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        {formMode === "create" && (
                          <button
                            type="button"
                            onClick={handleAutoGenerateCode}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                          >
                            Sinh mã
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày sinh</label>
                      <input
                        type="date"
                        value={formState.dateOfBirth}
                        onChange={(e) => setFormState({ ...formState, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Họ và Tên *</label>
                    <input
                      required
                      type="text"
                      value={formState.fullName}
                      onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giới tính</label>
                      <select
                        value={formState.gender}
                        onChange={(e) => setFormState({ ...formState, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer"
                      >
                        <option value="">--</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Khối</label>
                      <select
                        value={formState.grade}
                        onChange={(e) => setFormState({ ...formState, grade: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">--</option>
                        {grades.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Học kỳ / Năm TS</label>
                      <select
                        value={formState.hocKy}
                        onChange={(e) => setFormState({ ...formState, hocKy: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">--</option>
                        {configs.filter(c => c.categoryType === "HOC_KY").map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hồ sơ/Bảng điểm</label>
                      <select
                        value={formState.hoSoCtQuocTe}
                        onChange={(e) => setFormState({ ...formState, hoSoCtQuocTe: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">--</option>
                        {configs.filter(c => c.categoryType === "HS_HT_HOC_SINH").map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đợt khảo sát</label>
                      <select
                        value={formState.batchId}
                        onChange={(e) => setFormState({ ...formState, batchId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer"
                      >
                        <option value="">-- Không có / Mặc định --</option>
                        {activeFormBatches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đối tượng Tuyển sinh</label>
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chọn một hoặc nhiều đối tượng tuyển sinh:</span>
                      <div className="flex flex-wrap gap-2">
                        {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => {
                          const selectedTargets = formState.targetType ? formState.targetType.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
                          const isChecked = selectedTargets.includes(c.name);
                          return (
                            <label key={c.id} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all " + (isChecked ? "bg-[#00A6A9] text-white border-[#00A6A9] font-bold shadow-sm" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600")}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => {
                                  let updated;
                                  if (e.target.checked) {
                                    updated = [...selectedTargets, c.name];
                                  } else {
                                    updated = selectedTargets.filter((t: string) => t !== c.name);
                                  }
                                  setFormState(f => ({ ...f, targetType: updated.join(", ") }));
                                }}
                                className="w-4 h-4 rounded text-[#00A6A9] focus:ring-[#00A6A9] accent-[#00A6A9]"
                              />
                              <span className="text-xs">{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Diện Khảo sát</label>
                      <select
                        value={formState.admissionCriteria}
                        onChange={(e) => setFormState({ ...formState, admissionCriteria: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">--</option>
                        {configs.filter(c => c.categoryType === "DIEN_KS").map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hình thức KS</label>
                      <select
                        value={formState.surveySystem}
                        onChange={(e) => setFormState({ ...formState, surveySystem: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">--</option>
                        {configs.filter(c => c.categoryType === "HINH_THUC_KS").map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kết quả Học tập</label>
                      <select
                        value={formState.kqHocTap}
                        onChange={(e) => setFormState({ ...formState, kqHocTap: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">--</option>
                        {configs.filter(c => c.categoryType === "KQ_HOC_TAP").map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kết quả Rèn luyện</label>
                      <select
                        value={formState.kqRenLuyen}
                        onChange={(e) => setFormState({ ...formState, kqRenLuyen: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">--</option>
                        {configs.filter(c => c.categoryType === "KQ_REN_LUYEN").map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hệ Khảo sát</label>
                      <select
                        value={formState.surveyFormType}
                        onChange={(e) => setFormState({ ...formState, surveyFormType: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">--</option>
                        {currentEduSystems.map(es => (
                          <option key={es.code} value={es.code}>{es.code} - {es.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* MẦM NON PRESCHOOL FORM - MATCHED 100% WITH ORIGINAL */
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mã bé *</label>
                      <input
                        required
                        type="text"
                        disabled={formMode === "edit"}
                        value={formState.studentCode}
                        onChange={(e) => setFormState({ ...formState, studentCode: e.target.value })}
                        placeholder="VD: MN001"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Họ và tên *</label>
                      <input
                        required
                        type="text"
                        value={formState.fullName}
                        onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                        placeholder="VD: Nguyễn Bé An"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày sinh</label>
                      <input
                        type="date"
                        value={formState.dateOfBirth}
                        onChange={(e) => {
                          const dobVal = e.target.value;
                          setFormState(prev => {
                            const nextState = { ...prev, dateOfBirth: dobVal };
                            const info = getMonthsAndSuggestGrade(dobVal, nextState.batchId);
                            if (info.suggest) {
                              nextState.grade = info.suggest;
                            }
                            return nextState;
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none"
                      />
                      {ageInfo.months !== null && (
                        <div className="text-[11px] font-black text-[#00A6A9] mt-1.5 uppercase tracking-wider bg-[#00A6A9]/5 rounded px-3 py-1.5 border border-slate-200 flex items-center gap-1.5 animate-in fade-in duration-200">
                          <Sparkles className="w-3.5 h-3.5" />
                          Xác minh: {ageInfo.months} tháng tuổi ({ageInfo.surveyDateStr})
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giới tính</label>
                      <select
                        value={formState.gender}
                        onChange={(e) => setFormState({ ...formState, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer"
                      >
                        <option value="">-- Chọn --</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nhóm tuổi</label>
                      <select
                        value={formState.grade}
                        onChange={(e) => setFormState({ ...formState, grade: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">-- Chọn nhóm tuổi --</option>
                        {preschoolGrades.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cơ sở</label>
                      <select
                        value={formState.admissionCampus}
                        onChange={(e) => setFormState({ ...formState, admissionCampus: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">-- Chọn cơ sở --</option>
                        {campuses.map(c => (
                          <option key={c.campusName} value={c.campusName}>{c.campusName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đợt KS</label>
                      <select
                        value={formState.batchId}
                        onChange={(e) => {
                          const bIdVal = e.target.value;
                          setFormState(prev => {
                            const nextState = { ...prev, batchId: bIdVal };
                            const info = getMonthsAndSuggestGrade(nextState.dateOfBirth, bIdVal);
                            if (info.suggest) {
                              nextState.grade = info.suggest;
                            }
                            // Find the campus associated with the batch
                            const batch = preschoolPeriods.flatMap(p => p.batches || []).find(b => b.id === bIdVal);
                            const campus = campuses.find(c => c.id === batch?.campusId);
                            if (campus) {
                              nextState.admissionCampus = campus.campusName;
                            } else {
                              nextState.admissionCampus = "";
                            }
                            return nextState;
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer"
                      >
                        <option value="">-- Không gán --</option>
                        {activeFormBatches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hệ KS</label>
                      <select
                        value={formState.surveyFormType}
                        onChange={(e) => setFormState({ ...formState, surveyFormType: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white"
                      >
                        <option value="">-- Chọn Hệ KS --</option>
                        {preschoolConfigs.filter(c => c.categoryType === "system").map(c => (
                          <option key={c.code} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preschool Specific Comments */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <h4 className="text-xs font-extrabold text-indigo-650 text-indigo-600 uppercase tracking-wider">Đánh giá phát triển mầm non (Không bắt buộc)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nhận xét chuyên môn</label>
                        <textarea
                          value={formState.devProfessionalComment}
                          onChange={(e) => setFormState({ ...formState, devProfessionalComment: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nhận xét tâm lý</label>
                        <textarea
                          value={formState.devPsychologyComment}
                          onChange={(e) => setFormState({ ...formState, devPsychologyComment: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none resize-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú quan trọng</label>
                      <input
                        type="text"
                        value={formState.devImportantNote}
                        onChange={(e) => setFormState({ ...formState, devImportantNote: e.target.value })}
                        placeholder="VD: Bé còn rụt rè, khó hòa nhập"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đánh giá chung</label>
                      <input
                        type="text"
                        value={formState.devAssessmentResult}
                        onChange={(e) => setFormState({ ...formState, devAssessmentResult: e.target.value })}
                        placeholder="VD: Đạt khảo sát"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Common approval result and notes (student info administrative actions) */}
              {formMode === "edit" && (
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-bold text-[#00A6A9] uppercase tracking-wider mb-1">Kết quả xét duyệt tuyển sinh</label>
                      <select
                        value={formState.admissionResult}
                        onChange={(e) => setFormState({ ...formState, admissionResult: e.target.value })}
                        className="w-full px-3 py-2 border border-[#00A6A9]/30 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white font-bold text-slate-700"
                      >
                        {activeTab === "general" ? (
                          <Fragment>
                            <option value="">Chưa duyệt / Khác</option>
                            <option value="Đạt">Đạt</option>
                            <option value="Đạt cam kết">Đạt cam kết</option>
                            <option value="Học thử">Học thử</option>
                            <option value="Không đạt">Không đạt</option>
                            <option value="Không đạt - Kiểm tra lại">Không đạt - Kiểm tra lại</option>
                            <option value="Không đạt - Không kiểm tra lại">Không đạt - Không kiểm tra lại</option>
                          </Fragment>
                        ) : (
                          <Fragment>
                            <option value="">Chưa duyệt</option>
                            <option value="Đạt">Đạt</option>
                            <option value="Không đạt">Không đạt</option>
                            <option value="Học thử">Học thử</option>
                          </Fragment>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giám đốc tuyển sinh ký duyệt</label>
                      <input
                        type="text"
                        value={formState.signatureName}
                        onChange={(e) => setFormState({ ...formState, signatureName: e.target.value })}
                        placeholder="Họ tên Giám đốc tuyển sinh"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ý kiến chỉ đạo / Ghi chú của Giám đốc</label>
                    <textarea
                      value={formState.directorNote}
                      onChange={(e) => setFormState({ ...formState, directorNote: e.target.value })}
                      rows={2}
                      placeholder="Ghi ý kiến chỉ đạo tuyển sinh..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#00A6A9] hover:bg-[#008c85] text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Form: Import Excel */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800">Nhập học sinh từ Excel</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                  Phân hệ {activeTab === "general" ? "Phổ thông K-12" : "Mầm non"}
                </p>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target Period selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kỳ khảo sát nhập vào *</label>
                <select
                  value={importPeriodId}
                  onChange={(e) => setImportPeriodId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer font-semibold"
                >
                  {activePeriodsList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Batch selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đợt khảo sát nhập vào</label>
                <select
                  value={importBatchId}
                  onChange={(e) => setImportBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A6A9]/20 focus:border-[#00A6A9] outline-none bg-white cursor-pointer font-semibold"
                >
                  <option value="">Không phân đợt</option>
                  {activeImportBatches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Download template */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="text-xs font-medium text-slate-500">
                  Tải file Excel mẫu đúng định dạng chuẩn để nhập dữ liệu.
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Mẫu file
                </button>
              </div>

              {/* Show Status */}
              {importing && (
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 border border-blue-150 rounded-2xl">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold">Đang xử lý dữ liệu và tải lên hệ thống...</span>
                </div>
              )}

              {importError && (
                <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-semibold">
                  Lỗi: {importError}
                </div>
              )}

              {importSuccessCount !== null && (
                <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold">
                  Đã import thành công {importSuccessCount} học sinh vào hệ thống!
                </div>
              )}

              <input
                type="file"
                ref={importInputRef}
                accept=".xlsx"
                className="hidden"
                onChange={handleImportExcel}
              />

              {/* Footer buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => setIsImportOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={importing || !importPeriodId}
                  onClick={() => importInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#00A6A9] hover:bg-[#008c85] text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  Chọn file tải lên
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Dialog Modal */}
      {isDetailsOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-full">
                  {activeTab === "general" ? "Học sinh Phổ thông" : "Học sinh Mầm non"}
                </span>
                <h3 className="text-xl font-extrabold text-slate-800 mt-2 flex items-center gap-2">
                  {selectedStudent.fullName}
                  <span className="text-slate-400 font-mono text-sm font-bold">({selectedStudent.studentCode})</span>
                </h3>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    openEditModal(selectedStudent);
                  }}
                  className="p-2 text-slate-400 hover:text-[#00A6A9] hover:bg-slate-100 rounded-xl transition-all"
                  title="Chỉnh sửa"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Section: Basic info */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#00A6A9]" />
                  Thông tin hành chính
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{formatDate(selectedStudent.dateOfBirth)}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giới tính</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">
                      {selectedStudent.gender || "—"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khối học</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{activeTab === "general" ? `Khối ${selectedStudent.grade || "-"}` : (selectedStudent.grade || "-")}</span>
                  </div>
                  {activeTab === "general" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp dự tuyển</label>
                      <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{selectedStudent.className || "-"}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kỳ khảo sát</label>
                    <span className="text-sm font-semibold text-[#00A6A9] mt-0.5 block">{selectedStudent.period?.name || "-"}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt khảo sát</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{selectedStudent.batch?.name || "-"}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ đào tạo</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{selectedStudent.surveySystem || "-"}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở dự tuyển</label>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{selectedStudent.admissionCampus || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Section: Assessment Details */}
              {activeTab === "general" ? (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#00A6A9]" />
                    Kết quả điểm khảo sát năng lực
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm Toán</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.mathScore !== null && selectedStudent.mathScore !== undefined ? selectedStudent.mathScore : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm Ngữ văn</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.literatureScore !== null && selectedStudent.literatureScore !== undefined ? selectedStudent.literatureScore : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiếng Anh viết</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.writtenEnglishScore !== null && selectedStudent.writtenEnglishScore !== undefined ? selectedStudent.writtenEnglishScore : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiếng Anh nói</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.oralEnglishScore !== null && selectedStudent.oralEnglishScore !== undefined ? selectedStudent.oralEnglishScore : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm Tâm lý</span>
                      <span className="text-2xl font-black text-[#1E1B4B] mt-1 block">
                        {selectedStudent.psychologyScore !== null && selectedStudent.psychologyScore !== undefined ? selectedStudent.psychologyScore : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diện tuyển sinh</label>
                      <span className="text-sm font-semibold text-slate-700 mt-1 block">{selectedStudent.admissionCriteria || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hình thức KS</label>
                      <span className="text-sm font-semibold text-slate-700 mt-1 block">{selectedStudent.surveySystem || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ Khảo sát</label>
                      <span className="text-sm font-semibold text-slate-700 mt-1 block">{selectedStudent.surveyFormType || "-"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học bạ tiểu học / THCS</label>
                      <span className="text-sm text-slate-600 mt-1 block">{selectedStudent.kqgdTieuHoc || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học tập</label>
                      <span className="text-sm text-slate-600 mt-1 block">{selectedStudent.kqHocTap || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả rèn luyện</label>
                      <span className="text-sm text-slate-600 mt-1 block">{selectedStudent.kqRenLuyen || "-"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hồ sơ / Bảng điểm</label>
                      <span className="text-sm text-slate-600 mt-1 block">{selectedStudent.hoSoCtQuocTe || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học kỳ / Năm TS</label>
                      <span className="text-sm text-slate-600 mt-1 block">{selectedStudent.hocKy || "-"}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đối tượng Tuyển sinh</label>
                      <span className="text-sm text-slate-600 mt-1 block">{selectedStudent.targetType || "-"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#00A6A9]" />
                    Đánh giá phát triển mầm non
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá chuyên môn</label>
                      <p className="text-sm text-slate-700 font-medium mt-1">{selectedStudent.devProfessionalComment || "Chưa có nhận xét chuyên môn."}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá tâm lý</label>
                      <p className="text-sm text-slate-700 font-medium mt-1">{selectedStudent.devPsychologyComment || "Chưa có nhận xét tâm lý."}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ghi chú quan trọng</label>
                    <p className="text-sm text-rose-600 font-semibold mt-1">{selectedStudent.devImportantNote || "-"}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả đánh giá chung</label>
                    <p className="text-sm text-slate-800 font-bold mt-1">{selectedStudent.devAssessmentResult || "-"}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-dashed border-slate-200 pt-4">
                    <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/55">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">Ban Giám Hiệu</span>
                      <div className="mt-2 text-sm font-semibold text-slate-700">Trạng thái: <span className="text-emerald-600 font-bold">{selectedStudent.bghApprovalStatus || "Chưa duyệt"}</span></div>
                      <p className="text-xs text-slate-500 mt-1 italic">Ý kiến: {selectedStudent.bghApprovalComment || "Không có ý kiến."}</p>
                    </div>

                    <div className="bg-teal-50/30 p-4 rounded-2xl border border-teal-100/55">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded">GĐCS</span>
                      <div className="mt-2 text-sm font-semibold text-slate-700">Trạng thái: <span className="text-teal-600 font-bold">{selectedStudent.gdcsApprovalStatus || "Chưa duyệt"}</span></div>
                      <p className="text-xs text-slate-500 mt-1 italic">Ý kiến: {selectedStudent.gdcsApprovalComment || "Không có ý kiến."}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-4">
                    <h5 className="text-[11px] font-black uppercase text-indigo-650 text-indigo-600 tracking-wider mb-3">Thông tin học thử (nếu có)</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/40">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian học thử</label>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedStudent.probationaryPeriod || "-"}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm học thử</label>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedStudent.probationaryScoreText || "-"}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp học thử</label>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedStudent.probationaryClass || "-"}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên phụ trách</label>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{selectedStudent.probationaryTeacher || "-"}</span>
                      </div>
                    </div>
                    <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/40 mt-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học thử</label>
                      <span className="text-xs font-bold text-indigo-700 mt-0.5 block">{selectedStudent.probationaryResult || "-"}</span>
                      <p className="text-xs text-slate-500 mt-1.5 font-medium">Nhận xét chi tiết: {selectedStudent.probationaryComment || "Chưa có nhận xét."}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Final Approval Result */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#00A6A9]" />
                  Quyết định & Ghi chú của Giám đốc tuyển sinh
                </h4>
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kết quả chung cuộc</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block border mt-1 ${getResultBadgeClass(selectedStudent.admissionResult)}`}>
                        {selectedStudent.admissionResult || "Chưa duyệt kết quả tuyển sinh"}
                      </span>
                    </div>
                    {selectedStudent.signatureName && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Người ký duyệt</span>
                        <span className="text-sm font-bold text-slate-700 block mt-1">{selectedStudent.signatureName}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ý kiến chỉ đạo / Ghi chú của Giám đốc</span>
                    <p className="text-sm font-semibold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 mt-1.5 min-h-[4rem]">
                      {selectedStudent.directorNote || "Chưa có ghi chú chỉ đạo."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
              >
                Đóng thông tin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
