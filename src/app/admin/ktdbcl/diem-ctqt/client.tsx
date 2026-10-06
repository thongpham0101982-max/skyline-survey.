"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  FileSpreadsheet,
  Users,
  Download,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  ChevronRight,
  Search,
  BookOpen,
  Filter,
  Sparkles,
  Layers,
  Award,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { CTQT_LEVEL_CONFIGS, detectCtqtLevel, CORE_COMPETENCIES_DEF } from "@/lib/ctqt/config";

interface Props {
  academicYears: any[];
  activeYearId: string;
  campuses: any[];
  teachers: any[];
  initialClasses: any[];
}

export function DiemCtqtAdminClient({
  academicYears,
  activeYearId,
  campuses,
  teachers,
  initialClasses,
}: Props) {
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""));
  const [selectedSemester, setSelectedSemester] = useState(2); // Default to HK2 as seen in screenshots
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [activeTab, setActiveTab] = useState<"subject_gradebook" | "consolidated" | "assignments" | "excel" | "report_card">("subject_gradebook");

  // Subject Gradebook Tab state
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("ENG");
  const [subjectTeacherId, setSubjectTeacherId] = useState<string>("");
  const [subjectDelegatedTeacherId, setSubjectDelegatedTeacherId] = useState<string>("");
  const [subjectAssignmentStatus, setSubjectAssignmentStatus] = useState<string>("DRAFT");
  const [savingSubjectAssignment, setSavingSubjectAssignment] = useState(false);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, any>>({});

  // Selected class for consolidated view & Excel
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClasses[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");

  // Assignment tab state
  const [assignmentClasses, setAssignmentClasses] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Consolidated tab state
  const [consolidatedData, setConsolidatedData] = useState<any>(null);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);

  // Excel tab state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);

  // Report Card generating
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Filtered classes by campus
  const filteredClasses = useMemo(() => {
    return initialClasses.filter(c => {
      const matchCampus = !selectedCampusId || c.campusId === selectedCampusId;
      const matchSearch = !searchQuery || c.className.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCampus && matchSearch;
    });
  }, [initialClasses, selectedCampusId, searchQuery]);

  // Keep selectedClassId valid
  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0].id);
    }
  }, [filteredClasses, selectedClassId]);

  // Load assignments when on assignment tab or dependencies change
  const fetchAssignments = async () => {
    if (!selectedYearId) return;
    setLoadingAssignments(true);
    try {
      const res = await fetch(
        `/api/admin/ctqt/assignments?academicYearId=${selectedYearId}&semester=${selectedSemester}&campusId=${selectedCampusId}`
      );
      const data = await res.json();
      if (data.success) {
        setAssignmentClasses(data.data);
      } else {
        toast.error(data.error || "Không thể tải phân công");
      }
    } catch (e: any) {
      toast.error("Lỗi kết nối khi tải phân công");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (activeTab === "assignments") {
      fetchAssignments();
    }
  }, [activeTab, selectedYearId, selectedSemester, selectedCampusId]);

  // Load consolidated grades when selectedClassId or semester changes
  const fetchConsolidatedGrades = async () => {
    if (!selectedClassId || !selectedYearId) return;
    setLoadingConsolidated(true);
    try {
      const res = await fetch(
        `/api/admin/ctqt/grades?classId=${selectedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setConsolidatedData(data.data);
      } else {
        toast.error(data.error || "Không thể tải sổ điểm tổng hợp");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải sổ điểm");
    } finally {
      setLoadingConsolidated(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && (activeTab === "subject_gradebook" || activeTab === "consolidated" || activeTab === "report_card")) {
      fetchConsolidatedGrades();
    }
  }, [selectedClassId, selectedYearId, selectedSemester, activeTab]);

  // Save Assignment changes
  const handleSaveAssignments = async () => {
    setSavingAssignments(true);
    try {
      const payload: any[] = [];
      assignmentClasses.forEach(cls => {
        cls.subjects.forEach((sub: any) => {
          payload.push({
            classId: cls.classId,
            subjectCode: sub.code,
            primaryTeacherId: sub.primaryTeacherId,
            delegatedTeacherId: sub.delegatedTeacherId,
          });
        });
      });

      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          semester: selectedSemester,
          assignments: payload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã lưu phân công thành công!");
        fetchAssignments();
      } else {
        toast.error(data.error || "Lỗi lưu phân công");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingAssignments(false);
    }
  };

  // Clone from Semester 1 to Semester 2
  const handleCloneAssignments = async () => {
    if (!confirm(`Sao chép toàn bộ phân công từ Học kỳ 1 sang Học kỳ 2?`)) return;
    try {
      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clone",
          academicYearId: selectedYearId,
          sourceSemester: 1,
          targetSemester: 2,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchAssignments();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    if (!selectedClassId) {
      toast.error("Vui lòng chọn lớp học");
      return;
    }
    const url = `/api/admin/ctqt/excel?classId=${selectedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}`;
    window.open(url, "_blank");
  };

  // Upload Excel file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClassId) return;

    setUploadingFile(true);
    setImportStats(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classId", selectedClassId);
      formData.append("academicYearId", selectedYearId);
      formData.append("semester", String(selectedSemester));

      const res = await fetch("/api/admin/ctqt/excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã nạp file Excel thành công!");
        setImportStats(data.stats);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Lỗi nạp file");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  // Export PDF Report Cards (Single or All)
  const handleExportPdf = async (studentId?: string) => {
    if (!selectedClassId) return;
    setGeneratingPdf(true);
    try {
      const res = await fetch("/api/admin/ctqt/report-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          studentId,
          academicYearId: selectedYearId,
          semester: selectedSemester,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi xuất PDF" }));
        throw new Error(err.error || "Không thể xuất PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = studentId
        ? `ReportCard_HS_${studentId}.pdf`
        : `ReportCard_Lop_${selectedClass?.className || "CTQT"}_HK${selectedSemester}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Xuất Report Card thành công!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi xuất Report Card");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const selectedClass = initialClasses.find(c => c.id === selectedClassId);
  const currentLevel = selectedClass ? detectCtqtLevel(selectedClass.className, selectedClass.grade, selectedClass.level) : "PRIMARY";
  const currentSubjectDef = useMemo(() => {
    return currentConfig?.subjects?.find(s => s.code === selectedSubjectCode) || currentConfig?.subjects?.[0];
  }, [currentConfig, selectedSubjectCode]);

  useEffect(() => {
    if (currentConfig?.subjects?.length > 0) {
      if (!currentConfig.subjects.some(s => s.code === selectedSubjectCode)) {
        setSelectedSubjectCode(currentConfig.subjects[0].code);
      }
    }
  }, [currentConfig, selectedSubjectCode]);

  const currentSubjectAssignment = useMemo(() => {
    return consolidatedData?.assignments?.find((a: any) => a.subjectCode === selectedSubjectCode);
  }, [consolidatedData?.assignments, selectedSubjectCode]);

  useEffect(() => {
    if (currentSubjectAssignment) {
      setSubjectTeacherId(currentSubjectAssignment.primaryTeacherId || "");
      setSubjectDelegatedTeacherId(currentSubjectAssignment.delegatedTeacherId || "");
      setSubjectAssignmentStatus(currentSubjectAssignment.status || "DRAFT");
    } else {
      setSubjectTeacherId("");
      setSubjectDelegatedTeacherId("");
      setSubjectAssignmentStatus("DRAFT");
    }
  }, [currentSubjectAssignment, selectedSubjectCode]);

  useEffect(() => {
    if (!consolidatedData?.students) return;
    const gradeMap: Record<string, any> = {};
    consolidatedData.students.forEach((st: any) => {
      const g = consolidatedData.grades?.find((x: any) => x.studentId === st.id && x.subjectCode === selectedSubjectCode);
      let progArr: any[] = [];
      try {
        progArr = g?.progressScores ? JSON.parse(g.progressScores) : [];
      } catch {
        progArr = [];
      }
      gradeMap[st.id] = {
        studentId: st.id,
        progressScores: progArr,
        midTermScore: g?.midTermScore !== null && g?.midTermScore !== undefined ? g.midTermScore : "",
        endTermScore: g?.endTermScore !== null && g?.endTermScore !== undefined ? g.endTermScore : "",
        gpaScore: g?.gpaScore !== null && g?.gpaScore !== undefined ? g.gpaScore : "",
        assessmentContentEn: g?.assessmentContentEn || "",
        assessmentContentVi: g?.assessmentContentVi || "",
        ieltsScore: g?.ieltsScore !== null && g?.ieltsScore !== undefined ? g.ieltsScore : "",
        commentEn: g?.commentEn || "",
        commentVi: g?.commentVi || "",
        status: g?.status || "DRAFT",
      };
    });
    setSubjectGrades(gradeMap);
  }, [consolidatedData, selectedSubjectCode]);

  // Update a single score field for a student
  const updateStudentScore = (studentId: string, field: string, value: any, subIndex?: number) => {
    setSubjectGrades(prev => {
      const current = prev[studentId] || { studentId, progressScores: [] };
      const updated = { ...current };

      if (field === "progressScores" && typeof subIndex === "number") {
        const pArr = [...(updated.progressScores || [])];
        pArr[subIndex] = value === "" ? "" : Number(value);
        updated.progressScores = pArr;
      } else {
        updated[field] = value === "" ? "" : value;
      }

      // If MIDDLE level, auto calculate GPA if applicable
      if (currentLevel === "MIDDLE" && !currentSubjectDef?.isQualitative) {
        const pVals = (updated.progressScores || [])
          .filter((v: any) => v !== "" && v !== null && !isNaN(Number(v)))
          .map(Number);
        const mVal = updated.midTermScore !== "" && updated.midTermScore !== null && !isNaN(Number(updated.midTermScore))
          ? Number(updated.midTermScore)
          : null;
        const eVal = updated.endTermScore !== "" && updated.endTermScore !== null && !isNaN(Number(updated.endTermScore))
          ? Number(updated.endTermScore)
          : null;

        const scores: number[] = [...pVals];
        if (mVal !== null) scores.push(mVal, mVal);
        if (eVal !== null) scores.push(eVal, eVal);
        if (scores.length > 0) {
          const sum = scores.reduce((a, b) => a + b, 0);
          updated.gpaScore = Math.round((sum / scores.length) * 10) / 10;
        } else {
          updated.gpaScore = "";
        }
      }

      return {
        ...prev,
        [studentId]: updated,
      };
    });
  };

  // Save Subject Assignment
  const handleSaveSubjectAssignment = async () => {
    if (!selectedClassId || !selectedSubjectCode) return;
    setSavingSubjectAssignment(true);
    try {
      const res = await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          semester: selectedSemester,
          assignments: [
            {
              classId: selectedClassId,
              subjectCode: selectedSubjectCode,
              primaryTeacherId: subjectTeacherId || null,
              delegatedTeacherId: subjectDelegatedTeacherId || null,
              status: subjectAssignmentStatus,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã cập nhật phân quyền GVBM & GVTA môn ${currentSubjectDef?.nameVi || selectedSubjectCode}!`);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Lỗi cập nhật phân quyền");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingSubjectAssignment(false);
    }
  };

  // Save Subject Grades
  const handleSaveSubjectGrades = async () => {
    if (!selectedClassId || !selectedSubjectCode) return;
    setSavingGrades(true);
    try {
      const gradesPayload = Object.values(subjectGrades).map((g: any) => ({
        studentId: g.studentId,
        subjectCode: selectedSubjectCode,
        progressScores: JSON.stringify(g.progressScores || []),
        midTermScore: g.midTermScore !== "" && g.midTermScore !== null ? Number(g.midTermScore) : null,
        endTermScore: g.endTermScore !== "" && g.endTermScore !== null ? Number(g.endTermScore) : null,
        gpaScore: g.gpaScore !== "" && g.gpaScore !== null ? Number(g.gpaScore) : null,
        assessmentContentEn: g.assessmentContentEn || null,
        assessmentContentVi: g.assessmentContentVi || null,
        ieltsScore: g.ieltsScore !== "" && g.ieltsScore !== null ? Number(g.ieltsScore) : null,
        commentEn: g.commentEn || null,
        commentVi: g.commentVi || null,
        status: g.status || "DRAFT",
      }));

      const res = await fetch("/api/admin/ctqt/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          academicYearId: selectedYearId,
          semester: selectedSemester,
          grades: gradesPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã lưu bảng điểm môn ${currentSubjectDef?.nameVi || selectedSubjectCode} thành công!`);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Lỗi lưu bảng điểm");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingGrades(false);
    }
  };

  // Approve Subject Grades
  const handleApproveSubjectGrades = async () => {
    if (!confirm(`Xác nhận duyệt hoàn tất bảng điểm môn ${currentSubjectDef?.nameVi || selectedSubjectCode}? Sau khi duyệt, điểm sẽ được ghi nhận chính thức.`)) return;
    setSavingGrades(true);
    try {
      const updatedGrades = { ...subjectGrades };
      Object.keys(updatedGrades).forEach(k => {
        updatedGrades[k] = { ...updatedGrades[k], status: "APPROVED" };
      });
      setSubjectGrades(updatedGrades);

      const gradesPayload = Object.values(updatedGrades).map((g: any) => ({
        studentId: g.studentId,
        subjectCode: selectedSubjectCode,
        progressScores: JSON.stringify(g.progressScores || []),
        midTermScore: g.midTermScore !== "" && g.midTermScore !== null ? Number(g.midTermScore) : null,
        endTermScore: g.endTermScore !== "" && g.endTermScore !== null ? Number(g.endTermScore) : null,
        gpaScore: g.gpaScore !== "" && g.gpaScore !== null ? Number(g.gpaScore) : null,
        assessmentContentEn: g.assessmentContentEn || null,
        assessmentContentVi: g.assessmentContentVi || null,
        ieltsScore: g.ieltsScore !== "" && g.ieltsScore !== null ? Number(g.ieltsScore) : null,
        commentEn: g.commentEn || null,
        commentVi: g.commentVi || null,
        status: "APPROVED",
      }));

      await fetch("/api/admin/ctqt/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          academicYearId: selectedYearId,
          semester: selectedSemester,
          grades: gradesPayload,
        }),
      });

      await fetch("/api/admin/ctqt/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          semester: selectedSemester,
          assignments: [
            {
              classId: selectedClassId,
              subjectCode: selectedSubjectCode,
              primaryTeacherId: subjectTeacherId || null,
              delegatedTeacherId: subjectDelegatedTeacherId || null,
              status: "APPROVED",
            },
          ],
        }),
      });
      setSubjectAssignmentStatus("APPROVED");
      toast.success(`Đã phê duyệt hoàn tất bảng điểm môn ${currentSubjectDef?.nameVi || selectedSubjectCode}!`);
      fetchConsolidatedGrades();
    } catch {
      toast.error("Lỗi khi duyệt bảng điểm");
    } finally {
      setSavingGrades(false);
    }
  };

  // Download Single Subject Excel Template
  const handleDownloadSubjectTemplate = (subCode?: string) => {
    if (!selectedClassId) {
      toast.error("Vui lòng chọn lớp học");
      return;
    }
    const targetSub = subCode || selectedSubjectCode;
    const url = `/api/admin/ctqt/excel?classId=${selectedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}&subjectCode=${targetSub}`;
    window.open(url, "_blank");
  };

  // Upload Single Subject Excel
  const handleSubjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClassId) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classId", selectedClassId);
      formData.append("academicYearId", selectedYearId);
      formData.append("semester", String(selectedSemester));

      const res = await fetch("/api/admin/ctqt/excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã nạp file điểm môn ${currentSubjectDef?.nameVi || ""} thành công!`);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error || "Lỗi nạp file điểm");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  // Stats for the current subject
  const subjectStats = useMemo(() => {
    if (!consolidatedData?.students || consolidatedData.students.length === 0) {
      return { total: 0, hasScore: 0, avg: 0, max: 0, min: 0 };
    }
    const students = consolidatedData.students;
    let scoreSum = 0;
    let scoreCount = 0;
    let max = -Infinity;
    let min = Infinity;
    let hasScoreCount = 0;

    students.forEach((st: any) => {
      const g = subjectGrades[st.id];
      if (!g) return;
      let repScore: number | null = null;
      if (currentLevel === "PRIMARY") {
        if (g.endTermScore !== "" && g.endTermScore !== null) repScore = Number(g.endTermScore);
        else if (g.midTermScore !== "" && g.midTermScore !== null) repScore = Number(g.midTermScore);
      } else if (currentLevel === "MIDDLE") {
        if (g.gpaScore !== "" && g.gpaScore !== null) repScore = Number(g.gpaScore);
        else if (g.endTermScore !== "" && g.endTermScore !== null) repScore = Number(g.endTermScore);
      } else if (currentLevel === "HIGH") {
        if (currentSubjectDef?.code === "IELTS") {
          if (g.ieltsScore !== "" && g.ieltsScore !== null) repScore = Number(g.ieltsScore);
        } else {
          if (g.midTermScore !== "" && g.midTermScore !== null) repScore = Number(g.midTermScore);
        }
      }

      if (repScore !== null && !isNaN(repScore)) {
        hasScoreCount++;
        scoreSum += repScore;
        scoreCount++;
        if (repScore > max) max = repScore;
        if (repScore < min) min = repScore;
      }
    });

    return {
      total: students.length,
      hasScore: hasScoreCount,
      avg: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0,
      max: max === -Infinity ? 0 : max,
      min: min === Infinity ? 0 : min,
    };
  }, [consolidatedData?.students, subjectGrades, currentLevel, currentSubjectDef]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl">
                <Globe className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  Quản lý Điểm CTQT & Report Card
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    Bilingual / International
                  </span>
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                  Cấu hình sổ điểm, phân công GVBM, gán GVTA ủy quyền, sổ điểm tổng hợp và xuất Report Card song ngữ.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Year & Semester selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:outline-teal-500"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>
                  Năm học: {y.name}
                </option>
              ))}
            </select>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSemester(1)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedSemester === 1 ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester(2)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedSemester === 2 ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ 2
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("subject_gradebook")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "subject_gradebook"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            1. Sổ điểm theo Môn (GVBM)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("consolidated")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "consolidated"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            2. Sổ điểm Tổng hợp
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignments")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "assignments"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            3. Phân công & Gán GVTA ủy quyền
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("excel")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "excel"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            4. Quản lý File & Import/Export
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("report_card")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "report_card"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award className="w-4 h-4" />
            5. Xuất Report Card (PDF)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SỔ ĐIỂM THEO MÔN (GVBM)                                            */}
      {/* ========================================================================= */}
      {activeTab === "subject_gradebook" && (
        <div className="space-y-4">
          {/* Top Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Campus filter */}
              <select
                value={selectedCampusId}
                onChange={e => setSelectedCampusId(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700"
              >
                <option value="">Tất cả Cơ sở</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>

              {/* Class selector */}
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-xs font-bold px-4 py-2 bg-teal-50 border border-teal-300 rounded-xl text-teal-900"
              >
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp: {c.className} ({c.campus?.campusName || ""})
                  </option>
                ))}
              </select>

              {selectedClass && (
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl">
                  {currentConfig.levelNameVi} ({currentConfig.subjects.length} môn)
                </span>
              )}
            </div>

            {/* Quick Actions for Subject Gradebook */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleDownloadSubjectTemplate()}
                className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all"
                title="Tải file Excel mẫu đúng riêng môn này"
              >
                <Download className="w-3.5 h-3.5" />
                Tải Excel môn này
              </button>

              <label className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {uploadingFile ? "Đang nạp..." : "Nạp Excel môn này"}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleSubjectFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>

              <button
                type="button"
                onClick={handleSaveSubjectGrades}
                disabled={savingGrades}
                className="text-xs font-bold px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingGrades ? "Đang lưu điểm..." : "Lưu điểm môn này"}
              </button>
            </div>
          </div>

          {/* Subject Pills / Tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 px-1">
              Chọn môn học để nhập điểm & phân quyền GVBM:
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {currentConfig.subjects.map(sub => {
                const isSelected = sub.code === selectedSubjectCode;
                const assignment = consolidatedData?.assignments?.find((a: any) => a.subjectCode === sub.code);
                const primaryTeacher = assignment?.primaryTeacher?.teacherName;
                const status = assignment?.status || "DRAFT";

                return (
                  <button
                    key={sub.code}
                    type="button"
                    onClick={() => setSelectedSubjectCode(sub.code)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 ${
                      isSelected
                        ? "bg-teal-700 text-white border-teal-800 shadow-md ring-2 ring-teal-400"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                        isSelected ? "bg-white text-teal-800" : "bg-teal-100 text-teal-800"
                      }`}
                    >
                      {sub.code}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">
                        {sub.nameVi} <span className={isSelected ? "text-teal-200 font-normal" : "text-slate-500 font-normal"}>({sub.nameEn})</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-medium ${isSelected ? "text-teal-100" : "text-slate-500"}`}>
                          {primaryTeacher ? `GVBM: ${primaryTeacher}` : "Chưa phân công GVBM"}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            status === "APPROVED"
                              ? isSelected ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-800"
                              : status === "SUBMITTED"
                              ? isSelected ? "bg-sky-400 text-slate-900" : "bg-sky-100 text-sky-800"
                              : isSelected ? "bg-teal-800 text-teal-200" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {status === "APPROVED" ? "Đã duyệt" : status === "SUBMITTED" ? "Chờ rà soát" : "Bản nháp"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Assignment & Delegation Header Card */}
          <div className="bg-gradient-to-r from-teal-50 via-sky-50 to-slate-50 border border-teal-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                  {currentSubjectDef?.code}
                </div>
                <div>
                  <div className="text-base font-black text-slate-800 flex items-center gap-2">
                    Bảng điểm môn: {currentSubjectDef?.nameVi} ({currentSubjectDef?.nameEn})
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-teal-200 text-teal-800">
                      Sheet: {currentSubjectDef?.sheetName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Phân quyền Giáo viên Bộ môn (GVBM) nhập điểm và gán Giáo viên tiếng Anh (GVTA) kiểm duyệt câu từ song ngữ.
                  </p>
                </div>
              </div>

              {/* Direct Assignment Controls */}
              <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-teal-100 shadow-2xs">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    1. GVBM (Dạy &amp; Nhập điểm):
                  </label>
                  <select
                    value={subjectTeacherId}
                    onChange={e => setSubjectTeacherId(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-teal-500 min-w-[170px]"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} ({t.teacherCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    2. GVTA ủy quyền (Rà soát tiếng Anh):
                  </label>
                  <select
                    value={subjectDelegatedTeacherId}
                    onChange={e => setSubjectDelegatedTeacherId(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-teal-500 min-w-[170px]"
                  >
                    <option value="">-- Không ủy quyền --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} ({t.teacherCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    3. Trạng thái sổ điểm môn:
                  </label>
                  <select
                    value={subjectAssignmentStatus}
                    onChange={e => setSubjectAssignmentStatus(e.target.value)}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-teal-500"
                  >
                    <option value="DRAFT">Bản nháp (GVBM đang nhập)</option>
                    <option value="SUBMITTED">Chờ GVTA rà soát</option>
                    <option value="APPROVED">Đã duyệt chính thức</option>
                    <option value="REVISION_REQUESTED">Yêu cầu chỉnh sửa</option>
                  </select>
                </div>

                <div className="flex items-end gap-2 pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={handleSaveSubjectAssignment}
                    disabled={savingSubjectAssignment}
                    className="text-xs font-bold px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {savingSubjectAssignment ? "Đang lưu..." : "Lưu phân quyền"}
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveSubjectGrades}
                    className="text-xs font-bold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Duyệt điểm môn
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Grade Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {loadingConsolidated ? (
              <div className="p-16 text-center text-slate-500 font-semibold flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Đang tải bảng điểm môn {currentSubjectDef?.nameVi}...</span>
              </div>
            ) : !consolidatedData?.students || consolidatedData.students.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-semibold">
                Lớp này chưa có danh sách học sinh.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 z-10 shadow-xs">
                      <tr>
                        <th className="p-3 border border-slate-300 text-center w-12">STT</th>
                        <th className="p-3 border border-slate-300 min-w-[160px]">Họ và tên</th>
                        <th className="p-3 border border-slate-300 text-teal-800 min-w-[120px]">English Name</th>
                        <th className="p-3 border border-slate-300 text-center w-24">Mã HS</th>

                        {/* Dynamic Score Columns */}
                        {currentLevel === "HIGH" ? (
                          currentSubjectDef?.code === "IELTS" ? (
                            <>
                              <th className="p-3 border border-slate-300 text-center w-36">Nội dung</th>
                              <th className="p-3 border border-slate-300 text-center w-28 bg-indigo-50 text-indigo-900">IELTS Band (0-9)</th>
                            </>
                          ) : currentSubjectDef?.isQualitative ? (
                            <th className="p-3 border border-slate-300 text-center w-48">Nghiên cứu học thuật</th>
                          ) : (
                            <>
                              <th className="p-3 border border-slate-300 text-center min-w-[180px]">Nội dung kiểm tra (Content)</th>
                              <th className="p-3 border border-slate-300 text-center w-24 bg-teal-50 text-teal-900">Điểm số (Mark)</th>
                            </>
                          )
                        ) : (
                          currentSubjectDef?.scoreColumns.map((col: any) => (
                            <th
                              key={col.key}
                              className={`p-3 border border-slate-300 text-center ${
                                col.key === "gpaScore" ? "bg-teal-50 text-teal-900 w-28 font-black" : "w-24"
                              }`}
                            >
                              <div>{col.labelVi}</div>
                              <div className="text-[10px] font-normal text-slate-500">{col.labelEn}</div>
                            </th>
                          ))
                        )}

                        <th className="p-3 border border-slate-300 min-w-[220px]">Nhận xét tiếng Anh (Comment EN)</th>
                        <th className="p-3 border border-slate-300 min-w-[220px]">Nhận xét tiếng Việt (Nhận xét VI)</th>
                        <th className="p-3 border border-slate-300 text-center w-24">Trạng thái</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {consolidatedData.students.map((st: any, idx: number) => {
                        const g = subjectGrades[st.id] || { studentId: st.id, progressScores: [] };

                        return (
                          <tr key={st.id} className="hover:bg-teal-50/30 transition-colors">
                            <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 border border-slate-200 font-bold text-slate-800 whitespace-nowrap">
                              {st.studentName}
                            </td>
                            <td className="p-2.5 border border-slate-200 font-semibold text-teal-700 whitespace-nowrap">
                              {st.englishName || "-"}
                            </td>
                            <td className="p-2.5 border border-slate-200 text-center font-mono text-slate-600">
                              {st.studentCode}
                            </td>

                            {/* Score Inputs */}
                            {currentLevel === "HIGH" ? (
                              currentSubjectDef?.code === "IELTS" ? (
                                <>
                                  <td className="p-2 border border-slate-200 text-center text-slate-500 italic">
                                    Điểm thi HK2
                                  </td>
                                  <td className="p-2 border border-slate-200 text-center">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="9"
                                      value={g.ieltsScore ?? ""}
                                      onChange={e => updateStudentScore(st.id, "ieltsScore", e.target.value)}
                                      placeholder="0 - 9"
                                      className="w-20 text-center font-black text-indigo-700 px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                  </td>
                                </>
                              ) : currentSubjectDef?.isQualitative ? (
                                <td className="p-2 border border-slate-200 text-center text-slate-500 italic">
                                  Đánh giá định tính
                                </td>
                              ) : (
                                <>
                                  <td className="p-2 border border-slate-200">
                                    <input
                                      type="text"
                                      value={g.assessmentContentVi || g.assessmentContentEn || ""}
                                      onChange={e => updateStudentScore(st.id, "assessmentContentVi", e.target.value)}
                                      placeholder="Nhập nội dung bài đánh giá..."
                                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-2 border border-slate-200 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={g.midTermScore ?? ""}
                                      onChange={e => updateStudentScore(st.id, "midTermScore", e.target.value)}
                                      placeholder="Điểm"
                                      className="w-18 text-center font-black text-teal-800 px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    />
                                  </td>
                                </>
                              )
                            ) : (
                              currentSubjectDef?.scoreColumns.map((col: any) => {
                                if (col.key.startsWith("progressScores_")) {
                                  const subIdx = parseInt(col.key.split("_")[1], 10);
                                  const val = g.progressScores?.[subIdx] ?? "";
                                  return (
                                    <td key={col.key} className="p-2 border border-slate-200 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={val}
                                        onChange={e => updateStudentScore(st.id, "progressScores", e.target.value, subIdx)}
                                        className="w-16 text-center font-bold px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                      />
                                    </td>
                                  );
                                }
                                if (col.key === "midTermScore") {
                                  return (
                                    <td key={col.key} className="p-2 border border-slate-200 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={g.midTermScore ?? ""}
                                        onChange={e => updateStudentScore(st.id, "midTermScore", e.target.value)}
                                        className="w-16 text-center font-bold px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                      />
                                    </td>
                                  );
                                }
                                if (col.key === "endTermScore") {
                                  return (
                                    <td key={col.key} className="p-2 border border-slate-200 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={g.endTermScore ?? ""}
                                        onChange={e => updateStudentScore(st.id, "endTermScore", e.target.value)}
                                        className="w-16 text-center font-bold px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                      />
                                    </td>
                                  );
                                }
                                if (col.key === "gpaScore") {
                                  return (
                                    <td key={col.key} className="p-2 border border-slate-200 text-center bg-teal-50/40">
                                      <span className="font-black text-teal-800 text-xs px-2.5 py-1 rounded bg-teal-100 border border-teal-200 inline-block">
                                        {g.gpaScore !== "" && g.gpaScore !== null ? g.gpaScore : "-"}
                                      </span>
                                    </td>
                                  );
                                }
                                return <td key={col.key} className="p-2 border border-slate-200 text-center">-</td>;
                              })
                            )}

                            {/* Comment EN */}
                            <td className="p-2 border border-slate-200">
                              <textarea
                                rows={2}
                                value={g.commentEn || ""}
                                onChange={e => updateStudentScore(st.id, "commentEn", e.target.value)}
                                placeholder="Nhận xét tiếng Anh (English comment)..."
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y"
                              />
                            </td>

                            {/* Comment VI */}
                            <td className="p-2 border border-slate-200">
                              <textarea
                                rows={2}
                                value={g.commentVi || ""}
                                onChange={e => updateStudentScore(st.id, "commentVi", e.target.value)}
                                placeholder="Nhận xét tiếng Việt đối ứng..."
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y"
                              />
                            </td>

                            {/* Student Status */}
                            <td className="p-2 border border-slate-200 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                  g.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : g.status === "SUBMITTED"
                                    ? "bg-sky-100 text-sky-800 border border-sky-300"
                                    : g.status === "REVISION_REQUESTED"
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : "bg-slate-100 text-slate-700 border border-slate-300"
                                }`}
                              >
                                {g.status === "APPROVED"
                                  ? "Đã duyệt"
                                  : g.status === "SUBMITTED"
                                  ? "Chờ GVTA"
                                  : g.status === "REVISION_REQUESTED"
                                  ? "Yêu cầu sửa"
                                  : "Bản nháp"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Statistics Bar */}
                <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-slate-700 font-semibold">
                    <span>
                      Sĩ số: <strong className="text-slate-900">{subjectStats.total}</strong> học sinh
                    </span>
                    <span>
                      Đã có điểm:{" "}
                      <strong className="text-teal-700">
                        {subjectStats.hasScore} / {subjectStats.total}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-bold">
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-800">
                      Điểm TB môn cả lớp: <strong className="text-teal-700">{subjectStats.avg || "-"}</strong>
                    </span>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-emerald-700">
                      Cao nhất: <strong>{subjectStats.max || "-"}</strong>
                    </span>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-rose-700">
                      Thấp nhất: <strong>{subjectStats.min || "-"}</strong>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SỔ ĐIỂM TỔNG HỢP (CONSOLIDATED GRID)                                */}
      {/* ========================================================================= */}
      {activeTab === "consolidated" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Campus filter */}
              <select
                value={selectedCampusId}
                onChange={e => setSelectedCampusId(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700"
              >
                <option value="">Tất cả Cơ sở</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>

              {/* Class selector */}
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-xs font-bold px-4 py-2 bg-teal-50 border border-teal-300 rounded-xl text-teal-900"
              >
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp: {c.className} ({c.campus?.campusName || ""})
                  </option>
                ))}
              </select>

              {selectedClass && (
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl">
                  {currentConfig.levelNameVi} ({currentConfig.subjects.length} môn)
                </span>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Tải Excel
              </button>

              <button
                type="button"
                onClick={() => handleExportPdf()}
                disabled={generatingPdf}
                className="text-xs font-bold px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                {generatingPdf ? "Đang xuất..." : "Xuất Report Card Lớp"}
              </button>
            </div>
          </div>

          {/* Consolidated Grid */}
          {loadingConsolidated ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Đang tải dữ liệu Sổ điểm Tổng hợp...
            </div>
          ) : !consolidatedData || consolidatedData.students?.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Chưa có học sinh nào trong lớp này hoặc lớp chưa có dữ liệu.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700">
                  Danh sách {consolidatedData.students.length} học sinh • Bảng ma trận tổng hợp khớp chính xác cấu trúc Sheet TỔNG HỢP
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  * Nhấp đúp vào ô nhận xét để xem/chỉnh sửa chi tiết song ngữ
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] border-b border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 shadow-xs z-10">
                    <tr>
                      <th className="p-2.5 border border-slate-300 text-center font-bold text-slate-700 w-10">STT</th>
                      <th className="p-2.5 border border-slate-300 font-bold text-slate-700 min-w-[140px]">Họ và tên</th>
                      <th className="p-2.5 border border-slate-300 font-bold text-teal-800 min-w-[90px]">English Name</th>
                      <th className="p-2.5 border border-slate-300 text-center font-bold text-slate-700 w-24">Mã HS</th>

                      {/* Subject Groups */}
                      {consolidatedData.config?.subjects?.map((sub: any) => (
                        <th
                          key={sub.code}
                          colSpan={sub.scoreColumns.length + 2}
                          className={`p-2 border border-slate-300 text-center font-black ${sub.color.bg} ${sub.color.text}`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{sub.nameEn} ({sub.nameVi})</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubjectCode(sub.code);
                                setActiveTab("subject_gradebook");
                              }}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/90 hover:bg-white text-slate-800 border border-slate-300/80 shadow-2xs transition-all hover:scale-105 cursor-pointer"
                              title={`Chuyển đến Sổ điểm môn ${sub.nameVi} để nhập điểm & phân quyền GVBM`}
                            >
                              Sổ môn ↗
                            </button>
                          </div>
                        </th>
                      ))}

                      {/* Core Competencies Header */}
                      <th
                        colSpan={6}
                        className="p-2 border border-slate-300 text-center font-black bg-emerald-50 text-emerald-800"
                      >
                        Năng lực Cốt lõi (Core Competencies)
                      </th>
                    </tr>

                    {/* Sub-header row */}
                    <tr className="bg-slate-50 text-[11px]">
                      <th className="border border-slate-300"></th>
                      <th className="border border-slate-300"></th>
                      <th className="border border-slate-300"></th>
                      <th className="border border-slate-300"></th>

                      {consolidatedData.config?.subjects?.map((sub: any) => (
                        <React.Fragment key={sub.code}>
                          {sub.scoreColumns.map((col: any) => (
                            <th key={col.key} className="p-1.5 border border-slate-300 text-center font-bold text-slate-700 w-12">
                              {col.shortLabel}
                            </th>
                          ))}
                          <th className="p-1.5 border border-slate-300 text-center font-semibold text-slate-600 min-w-[120px]">CMT (EN)</th>
                          <th className="p-1.5 border border-slate-300 text-center font-semibold text-slate-600 min-w-[120px]">NX (VI)</th>
                        </React.Fragment>
                      ))}

                      {CORE_COMPETENCIES_DEF.map(cc => (
                        <th key={cc.key} className="p-1.5 border border-slate-300 text-center font-bold text-slate-700 w-12">
                          {cc.labelVi}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {consolidatedData.students.map((st: any, idx: number) => {
                      const gradeMap = new Map<string, any>();
                      consolidatedData.grades
                        ?.filter((g: any) => g.studentId === st.id)
                        .forEach((g: any) => gradeMap.set(g.subjectCode, g));

                      const comp = consolidatedData.competencies?.find((c: any) => c.studentId === st.id) || {};

                      return (
                        <tr key={st.id} className="hover:bg-teal-50/40 transition-colors">
                          <td className="p-2 border border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="p-2 border border-slate-200 font-bold text-slate-800">{st.studentName}</td>
                          <td className="p-2 border border-slate-200 font-semibold text-teal-700">{st.englishName || "-"}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-slate-600">{st.studentCode}</td>

                          {/* Subjects scores & comments */}
                          {consolidatedData.config?.subjects?.map((sub: any) => {
                            const g = gradeMap.get(sub.code) || {};
                            let progArr: any[] = [];
                            try {
                              progArr = JSON.parse(g.progressScores || "[]");
                            } catch {
                              progArr = [];
                            }

                            return (
                              <React.Fragment key={sub.code}>
                                {sub.scoreColumns.map((col: any) => {
                                  let val: any = "-";
                                  if (col.key.startsWith("progressScores_")) {
                                    const pIdx = parseInt(col.key.replace("progressScores_", ""), 10);
                                    val = progArr[pIdx] !== undefined ? progArr[pIdx] : "-";
                                  } else if (col.key === "midTermScore") {
                                    val = g.midTermScore !== null && g.midTermScore !== undefined ? g.midTermScore : "-";
                                  } else if (col.key === "endTermScore") {
                                    val = g.endTermScore !== null && g.endTermScore !== undefined ? g.endTermScore : "-";
                                  } else if (col.key === "gpaScore") {
                                    val = g.gpaScore !== null && g.gpaScore !== undefined ? g.gpaScore : "-";
                                  } else if (col.key === "ieltsScore") {
                                    val = g.ieltsScore !== null && g.ieltsScore !== undefined ? g.ieltsScore : "-";
                                  }

                                  return (
                                    <td key={col.key} className="p-1.5 border border-slate-200 text-center font-semibold text-slate-800">
                                      {val}
                                    </td>
                                  );
                                })}

                                <td className="p-1.5 border border-slate-200 text-[11px] text-slate-700 truncate max-w-[140px]" title={g.commentEn}>
                                  {g.commentEn || "-"}
                                </td>
                                <td className="p-1.5 border border-slate-200 text-[11px] text-slate-600 italic truncate max-w-[140px]" title={g.commentVi}>
                                  {g.commentVi || "-"}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          {/* Core Competencies values */}
                          {CORE_COMPETENCIES_DEF.map(cc => {
                            const val = comp[cc.key] || "E";
                            return (
                              <td key={cc.key} className="p-1.5 border border-slate-200 text-center font-black">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                                    val === "E"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : val === "S"
                                      ? "bg-blue-100 text-blue-800"
                                      : val === "N"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {val}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PHÂN CÔNG & GÁN GVTA ỦY QUYỀN                                      */}
      {/* ========================================================================= */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select
                value={selectedCampusId}
                onChange={e => setSelectedCampusId(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700"
              >
                <option value="">Tất cả Cơ sở</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleCloneAssignments}
                className="text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                Sao chép từ Học kỳ 1 sang Học kỳ 2
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveAssignments}
              disabled={savingAssignments}
              className="text-xs font-bold px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingAssignments ? "Đang lưu..." : "Lưu Phân công"}
            </button>
          </div>

          {loadingAssignments ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Đang tải danh sách phân công...
            </div>
          ) : assignmentClasses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Không tìm thấy lớp học CTQT nào phù hợp bộ lọc.
            </div>
          ) : (
            <div className="space-y-4">
              {assignmentClasses.map((cls, cIdx) => (
                <div key={cls.classId} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-black text-slate-800">
                        {cls.className}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">
                        {cls.campusName}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-lg border border-teal-200">
                        {cls.level === "PRIMARY" ? "Khối 1 - 5" : cls.level === "MIDDLE" ? "Khối 6 - 9" : "Khối 10 - 12"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cls.subjects.map((sub: any, sIdx: number) => (
                      <div key={sub.code} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            {sub.nameEn} ({sub.nameVi})
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                            {sub.code}
                          </span>
                        </div>

                        {/* GVBM Primary selector */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            GVBM nhập điểm (Chính):
                          </label>
                          <select
                            value={sub.primaryTeacherId || ""}
                            onChange={e => {
                              const val = e.target.value;
                              const updated = [...assignmentClasses];
                              updated[cIdx].subjects[sIdx].primaryTeacherId = val || null;
                              setAssignmentClasses(updated);
                            }}
                            className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:outline-teal-500"
                          >
                            <option value="">-- Chưa phân công --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.teacherName} ({t.teacherCode})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* GVTA Reviewer selector */}
                        <div>
                          <label className="block text-[11px] font-bold text-teal-700 mb-1">
                            GVTA ủy quyền rà soát:
                          </label>
                          <select
                            value={sub.delegatedTeacherId || ""}
                            onChange={e => {
                              const val = e.target.value;
                              const updated = [...assignmentClasses];
                              updated[cIdx].subjects[sIdx].delegatedTeacherId = val || null;
                              setAssignmentClasses(updated);
                            }}
                            className="w-full text-xs font-semibold p-2 bg-white border border-teal-300 rounded-lg focus:outline-teal-500"
                          >
                            <option value="">-- Chưa gán ủy quyền --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.teacherName} ({t.teacherCode})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUẢN LÝ FILE & IMPORT / EXPORT                                     */}
      {/* ========================================================================= */}
      {activeTab === "excel" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Tải File mẫu */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-teal-700 mb-2">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-800">1. Tải File Mẫu Excel Chuẩn</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tải file mẫu Excel được tạo tự động tương ứng theo cấp học của lớp (5 Sheet cho Khối 1-5, 6 Sheet cho Khối 6-9, 7 Sheet cho Khối 10-12), đã điền sẵn danh sách học sinh từ CSDL.
              </p>

              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chọn Lớp học:</label>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-teal-500"
                  >
                    {filteredClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.campus?.campusName || ""})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClass && (
                  <div className="text-[11px] text-slate-600 space-y-2">
                    <div>• Cấp học nhận diện: <strong className="text-teal-700">{currentConfig.levelNameVi}</strong></div>
                    <div>• Danh mục sheet xuất ra: {currentConfig.subjects.map(s => s.sheetName).join(", ")}, Core Competencies, TỔNG HỢP</div>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5">Hoặc tải file Excel riêng từng môn cho GVBM:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentConfig.subjects.map(s => (
                          <button
                            key={s.code}
                            type="button"
                            onClick={() => handleDownloadSubjectTemplate(s.code)}
                            className="text-[11px] font-semibold px-2.5 py-1 bg-white border border-slate-300 hover:bg-teal-50 hover:border-teal-300 text-slate-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-teal-600" />
                            {s.nameVi} ({s.code})
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="mt-6 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              Tải File Excel Mẫu Của Lớp Này
            </button>
          </div>

          {/* Box 2: Tải lên File điểm */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-teal-700 mb-2">
                <Upload className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-800">2. Nạp File Điểm & Nhận Xét Lên Hệ Thống</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tải lên file Excel hoàn thiện của lớp. Hệ thống tự động bóc tách từng sheet môn học, tự động khớp mã học sinh, cập nhật tên tiếng Anh và đồng bộ sổ điểm tổng hợp.
              </p>

              <div className="mt-4 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-teal-500 transition-colors bg-slate-50">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="text-xs font-bold text-teal-600 hover:underline">Chọn file Excel (.xlsx)</span>
                  <span className="text-xs text-slate-500"> hoặc kéo thả vào đây</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>
                <div className="text-[10px] text-slate-400 mt-2">Hỗ trợ file định dạng Excel chuẩn của trường</div>
              </div>

              {uploadingFile && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Đang bóc tách dữ liệu và nạp vào hệ thống...
                </div>
              )}

              {importStats && (
                <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã nạp file thành công!
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    • Điểm số nạp: <strong>{importStats.grades}</strong> bản ghi
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    • Năng lực cốt lõi: <strong>{importStats.competencies}</strong> bản ghi
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    • Tên tiếng Anh: <strong>{importStats.englishNames}</strong> học sinh
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: XUẤT REPORT CARD                                                  */}
      {/* ========================================================================= */}
      {activeTab === "report_card" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-xs font-bold px-4 py-2 bg-teal-50 border border-teal-300 rounded-xl text-teal-900"
              >
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp: {c.className} ({c.campus?.campusName || ""})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleExportPdf()}
              disabled={generatingPdf}
              className="text-xs font-bold px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {generatingPdf ? "Đang tạo PDF..." : "Tải Trọn Bộ PDF Cả Lớp"}
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-700">
              Danh sách học sinh lớp {selectedClass?.className} • Xuất phiếu Report Card cá nhân
            </div>

            <div className="divide-y divide-slate-100">
              {consolidatedData?.students?.map((st: any, idx: number) => (
                <div key={st.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">{idx + 1}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{st.studentName}</div>
                      <div className="text-[11px] text-slate-500">
                        Mã: <span className="font-mono">{st.studentCode}</span> • English Name: <span className="font-semibold text-teal-700">{st.englishName || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportPdf(st.id)}
                    disabled={generatingPdf}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Xuất Phiếu PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
