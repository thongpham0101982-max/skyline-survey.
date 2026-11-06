"use client";
import React, { useState, useEffect, useMemo } from "react";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  Users, 
  Building2, 
  BookOpen, 
  Plus, 
  Trash2, 
  RefreshCcw, 
  CheckSquare, 
  Square, 
  GraduationCap, 
  Sparkles,
  ClipboardList,
  ShieldCheck,
  UserCheck,
  Zap,
  Info,
  ArrowRight,
  Heart,
  Compass,
  Shield,
  Coins,
  Mail,
  Send,
  Pencil
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  getSpecialSubjectGrades,
  SPECIAL_SUBJECT_SCOPE_LABELS
} from "@/lib/specialSubjectsPortfolio";

export default function SpecialSubjectsAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [unassignedClasses, setUnassignedClasses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"ASSIGNED" | "UNASSIGNED">("ASSIGNED");

  // Row selection for bulk operations (delete, email, etc.)
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Edit Single Assignment Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("ALL");
  const [editSendNotificationEmail, setEditSendNotificationEmail] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL");
  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedEducationSystem, setSelectedEducationSystem] = useState("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [academicYearId, setAcademicYearId] = useState("");
  const [academicYearName, setAcademicYearName] = useState("2026-2027");

  // Modal allocate state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"AUTO_GVCN" | "SPECIFIC_TEACHER">("AUTO_GVCN");
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [allocSubjectId, setAllocSubjectId] = useState("");
  const [allocDepartmentId, setAllocDepartmentId] = useState("ALL");
  const [allocTeacherId, setAllocTeacherId] = useState("");
  const [allocCampusId, setAllocCampusId] = useState("ALL");
  const [allocGrade, setAllocGrade] = useState("ALL");
  const [allocEducationSystem, setAllocEducationSystem] = useState("ALL");
  const [allocVersionCode, setAllocVersionCode] = useState("v1.0");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [sendNotificationEmail, setSendNotificationEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  // Email Reminder Modal state
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifyCustomMessage, setNotifyCustomMessage] = useState("");
  const [notifyTargetAssignmentIds, setNotifyTargetAssignmentIds] = useState<string[] | null>(null);
  const [notifyTargetTeacherName, setNotifyTargetTeacherName] = useState<string>("");
  const [selectedNotifyTeacherIds, setSelectedNotifyTeacherIds] = useState<string[]>([]);

  const [campuses, setCampuses] = useState([
    { code: "ALL", name: "Tất cả cơ sở" },
    { code: "cmnofie5n0000uhvs2ifqj6pr", name: "CS1 - Sky-Line Riverside" },
    { code: "cmnofie7a0001uhvsl131y7yv", name: "CS2 - Sky-Line Central" },
    { code: "cmnofie7v0002uhvscd5jqp58", name: "CS3 - Sky-Line Global" },
    { code: "cmnofie8h0003uhvsggzaehkk", name: "CS4 - Sky-Line Hill" },
    { code: "cmnofie960004uhvsu7ez21gj", name: "CS5 - Sky-Line Beach" },
  ]);

  // Fetch subjects and departments list on mount
  useEffect(() => {
    async function loadInitialOptions() {
      try {
        const [subRes, optRes] = await Promise.all([
          fetch("/api/special-subjects"),
          fetch("/api/special-subjects/assignments/options")
        ]);
        const subJson = await subRes.json();
        if (subRes.ok && subJson.subjects) {
          setAvailableSubjects(subJson.subjects);
        }
        const optJson = await optRes.json();
        if (optRes.ok) {
          if (optJson.departments) setDepartments(optJson.departments);
          if (optJson.campuses && optJson.campuses.length > 0) setCampuses(optJson.campuses);
          if (optJson.activeAcademicYear?.id) setAcademicYearId(optJson.activeAcademicYear.id);
          if (optJson.activeAcademicYear?.name) setAcademicYearName(optJson.activeAcademicYear.name);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInitialOptions();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const url = `/api/special-subjects/assignments?campusId=${selectedCampus}&grade=${selectedGrade}&educationSystem=${selectedEducationSystem}${
        selectedSubjectId !== "ALL" ? `&subjectId=${selectedSubjectId}` : ""
      }${selectedDepartment !== "ALL" ? `&departmentId=${selectedDepartment}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setAssignments(json.assignments || []);
        setUnassignedClasses(json.unassignedClasses || []);
        if (json.academicYearId) setAcademicYearId(json.academicYearId);
      } else {
        toast.error(json.error || "Không thể tải danh sách phân công");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedCampus, selectedGrade, selectedEducationSystem, selectedSubjectId, selectedDepartment]);

  const openAllocateModal = async () => {
    setIsModalOpen(true);
    try {
      setOptionsLoading(true);
      const res = await fetch("/api/special-subjects/assignments/options");
      const json = await res.json();
      if (res.ok) {
        setTeachers(json.teachers || []);
        setDepartments(json.departments || []);
        setClasses(json.classes || []);
        setSubjects(json.subjects || []);
        if (json.campuses && json.campuses.length > 0) setCampuses(json.campuses);
        if (json.subjects?.length > 0) setAllocSubjectId(json.subjects[0].id);
        if (json.teachers?.length > 0) setAllocTeacherId(json.teachers[0].id);
        if (json.activeAcademicYear?.id) setAcademicYearId(json.activeAcademicYear.id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi nạp danh sách giáo viên và lớp");
    } finally {
      setOptionsLoading(false);
    }
  };

  // Quick 1-click Auto Assign all classes in current filter to their GVCN
  const handleAutoAssignGvcn = async (specificClassIds?: string[]) => {
    const campusLabel = campuses.find(c => c.code === selectedCampus)?.name || "tất cả cơ sở";
    const gradeLabel = selectedGrade === "ALL" ? "các khối áp dụng" : `Khối ${selectedGrade}`;
    const scopeMsg = specificClassIds 
      ? `${specificClassIds.length} lớp được chọn`
      : `${gradeLabel} thuộc ${campusLabel}`;

    if (!confirm(`Bạn có chắc chắn muốn TỰ ĐỘNG PHÂN CÔNG cho Giáo viên Chủ nhiệm (GVCN) của ${scopeMsg}?`)) {
      return;
    }

    try {
      setAutoAssigning(true);
      const res = await fetch("/api/special-subjects/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "AUTO_GVCN",
          subjectId: selectedSubjectId !== "ALL" ? selectedSubjectId : allocSubjectId || undefined,
          campusId: selectedCampus,
          grade: selectedGrade,
          educationSystem: selectedEducationSystem,
          versionCode: allocVersionCode,
          classIds: specificClassIds,
          academicYearId: academicYearId || undefined,
          semester: 1,
          sendNotificationEmail: true
        })
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Đã phân công thành công cho GVCN");
        fetchAssignments();
        if (isModalOpen) setIsModalOpen(false);
      } else {
        toast.error(json.error || "Lỗi tự động phân công GVCN");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleToggleClass = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  const handleSelectAllFiltered = (filteredCls: any[]) => {
    const ids = filteredCls.map(c => c.id);
    const allSelected = ids.every(id => selectedClassIds.includes(id));
    if (allSelected) {
      setSelectedClassIds(selectedClassIds.filter(id => !ids.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedClassIds, ...ids]));
      setSelectedClassIds(merged);
    }
  };

  const handleDelete = async (assignmentId: string, className?: string) => {
    if (!confirm(`Xác nhận hủy phân công lớp ${className || ""}? Kết quả đánh giá nếu có vẫn sẽ được bảo lưu.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/special-subjects/assignments?id=${assignmentId}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Đã xóa phân công");
        setSelectedRowIds(prev => prev.filter(id => id !== assignmentId));
        fetchAssignments();
      } else {
        toast.error(json.error || "Lỗi xóa phân công");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  // Toggle selection of a row
  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle select all rows
  const handleToggleSelectAllRows = () => {
    if (selectedRowIds.length === assignments.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(assignments.map(a => a.id));
    }
  };

  // Bulk delete selected assignments
  const handleBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn XÓA PHÂN CÔNG của ${selectedRowIds.length} lớp đã chọn? Kết quả đánh giá nếu có vẫn sẽ được bảo lưu.`)) {
      return;
    }

    try {
      setDeletingBulk(true);
      const res = await fetch("/api/special-subjects/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRowIds })
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || `Đã xóa thành công ${selectedRowIds.length} phân công`);
        setSelectedRowIds([]);
        fetchAssignments();
      } else {
        toast.error(json.error || "Lỗi xóa phân công");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setDeletingBulk(false);
    }
  };

  // Open Edit Modal for a single assignment
  const handleOpenEditModal = (assignment: any) => {
    setEditingAssignment(assignment);
    setEditTeacherId(assignment.teacherId || "");
    setEditDepartmentId(assignment.teacher?.departmentId || "ALL");
    setEditSendNotificationEmail(true);
    setIsEditModalOpen(true);
    // Ensure teachers options are loaded if empty
    if (teachers.length === 0) {
      fetch("/api/special-subjects/assignments/options")
        .then(res => res.json())
        .then(data => {
          if (data.teachers) setTeachers(data.teachers);
          if (data.departments) setDepartments(data.departments);
          if (data.subjects) setSubjects(data.subjects);
        });
    }
  };

  // Save edited assignment
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !editTeacherId) {
      toast.error("Vui lòng chọn giáo viên phụ trách mới");
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch("/api/special-subjects/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAssignment.id,
          teacherId: editTeacherId,
          sendNotificationEmail: editSendNotificationEmail
        })
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Đã cập nhật phân công thành công");
        setIsEditModalOpen(false);
        setEditingAssignment(null);
        fetchAssignments();
      } else {
        toast.error(json.error || "Lỗi cập nhật phân công");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocSubjectId) {
      toast.error("Vui lòng chọn môn học");
      return;
    }
    if (selectedClassIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một lớp học");
      return;
    }
    if (modalMode === "SPECIFIC_TEACHER" && !allocTeacherId) {
      toast.error("Vui lòng chọn giáo viên phụ trách");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/special-subjects/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: modalMode,
          subjectId: allocSubjectId,
          teacherId: modalMode === "SPECIFIC_TEACHER" ? allocTeacherId : undefined,
          classIds: selectedClassIds,
          grade: allocGrade,
          educationSystem: allocEducationSystem,
          versionCode: allocVersionCode,
          academicYearId: academicYearId || undefined,
          semester: 1,
          sendNotificationEmail
        })
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Phân công thành công");
        setIsModalOpen(false);
        setSelectedClassIds([]);
        fetchAssignments();
      } else {
        toast.error(json.error || "Lỗi phân công");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  // Target assignments in scope for notification
  const targetAssignments = useMemo(() => {
    if (notifyTargetAssignmentIds && notifyTargetAssignmentIds.length > 0) {
      return assignments.filter(a => notifyTargetAssignmentIds.includes(a.id));
    }
    return assignments;
  }, [assignments, notifyTargetAssignmentIds]);

  // Group targeted assignments by Giáo viên phụ trách (GVPT)
  const targetTeachersList = useMemo(() => {
    const map = new Map<string, {
      teacherId: string;
      teacherName: string;
      teacherCode?: string;
      email?: string;
      departmentName?: string;
      classes: Array<{ id: string; className: string; campusCode?: string; assignmentId: string }>;
    }>();

    for (const a of targetAssignments) {
      const t = a.teacher;
      const tId = t?.id || a.teacherId;
      if (!tId) continue;
      if (!map.has(tId)) {
        map.set(tId, {
          teacherId: tId,
          teacherName: t?.teacherName || "Chưa có tên",
          teacherCode: t?.teacherCode || "",
          email: (t?.email || "").trim(),
          departmentName: t?.department?.name || "",
          classes: []
        });
      }
      map.get(tId)!.classes.push({
        id: a.class?.id || a.classId,
        className: a.class?.className || "Lớp",
        campusCode: a.class?.campus?.campusCode || "CS",
        assignmentId: a.id
      });
    }

    return Array.from(map.values());
  }, [targetAssignments]);

  // Selected assignments for batch bar
  const selectedAssignments = useMemo(() => {
    return assignments.filter(a => selectedRowIds.includes(a.id));
  }, [assignments, selectedRowIds]);

  const selectedTeachersCount = useMemo(() => {
    return new Set(selectedAssignments.map(a => a.teacherId || a.teacher?.id).filter(Boolean)).size;
  }, [selectedAssignments]);

  // Open email reminder modal
  const handleOpenNotifyModal = (assignmentIds?: string[], teacherName?: string) => {
    setNotifyTargetAssignmentIds(assignmentIds || null);
    setNotifyTargetTeacherName(teacherName || "");
    setNotifyCustomMessage("");

    const inScope = (assignmentIds && assignmentIds.length > 0)
      ? assignments.filter(a => assignmentIds.includes(a.id))
      : assignments;
    const tIds = Array.from(new Set(inScope.map(a => a.teacherId || a.teacher?.id).filter(Boolean))) as string[];
    setSelectedNotifyTeacherIds(tIds);
    setIsNotifyModalOpen(true);
  };

  // Open modal specifically for one GVPT with all their assigned classes
  const handleOpenNotifyModalForTeacher = (teacherId: string, teacherName?: string) => {
    const teacherAssignmentIds = assignments.filter(a => (a.teacherId === teacherId || a.teacher?.id === teacherId)).map(a => a.id);
    handleOpenNotifyModal(teacherAssignmentIds, teacherName);
  };

  // Toggle selection of a GVPT in modal
  const handleToggleNotifyTeacher = (teacherId: string) => {
    setSelectedNotifyTeacherIds(prev => 
      prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
    );
  };

  // Toggle select all GVPTs in modal
  const handleToggleSelectAllNotifyTeachers = () => {
    if (selectedNotifyTeacherIds.length === targetTeachersList.length) {
      setSelectedNotifyTeacherIds([]);
    } else {
      setSelectedNotifyTeacherIds(targetTeachersList.map(t => t.teacherId));
    }
  };

  // Send assignment reminder email to selected GVPTs
  const handleSendNotification = async () => {
    if (selectedNotifyTeacherIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một Giáo viên phụ trách (GVPT) để gửi email");
      return;
    }
    try {
      setNotifying(true);
      const finalAssignmentIds = targetAssignments
        .filter(a => selectedNotifyTeacherIds.includes(a.teacherId || a.teacher?.id))
        .map(a => a.id);

      const body: any = {
        academicYearId,
        semester: 1,
        customMessage: notifyCustomMessage || undefined,
        assignmentIds: finalAssignmentIds
      };

      const res = await fetch("/api/special-subjects/assignments/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || `Đã gửi email nhắc phân công cho ${selectedNotifyTeacherIds.length} GVPT thành công!`);
        setIsNotifyModalOpen(false);
      } else {
        toast.error(json.error || "Lỗi khi gửi email");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối máy chủ khi gửi email");
    } finally {
      setNotifying(false);
    }
  };

  // Special subject grade scoping helpers
  const currentSelectedSubject = useMemo(() => {
    return availableSubjects.find(s => s.id === selectedSubjectId);
  }, [availableSubjects, selectedSubjectId]);

  const mainAllowedGrades = useMemo(() => {
    if (!currentSelectedSubject || selectedSubjectId === "ALL") {
      return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    }
    return getSpecialSubjectGrades(currentSelectedSubject.code);
  }, [currentSelectedSubject, selectedSubjectId]);

  // If grade filter is set to a grade that is not valid for the selected subject, reset to ALL
  useEffect(() => {
    if (selectedGrade !== "ALL" && !mainAllowedGrades.includes(selectedGrade)) {
      setSelectedGrade("ALL");
    }
  }, [mainAllowedGrades, selectedGrade]);

  const allocSubject = useMemo(() => {
    return (subjects.length > 0 ? subjects : availableSubjects).find(s => s.id === allocSubjectId);
  }, [subjects, availableSubjects, allocSubjectId]);

  const allocAllowedGrades = useMemo(() => {
    if (!allocSubject) return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    return getSpecialSubjectGrades(allocSubject.code);
  }, [allocSubject]);

  useEffect(() => {
    if (allocGrade !== "ALL" && !allocAllowedGrades.includes(allocGrade)) {
      setAllocGrade("ALL");
    }
  }, [allocAllowedGrades, allocGrade]);

  // Filter teachers inside modal based on selected department
  const modalFilteredTeachers = useMemo(() => {
    if (allocDepartmentId === "ALL") return teachers;
    return teachers.filter(t => t.departmentId === allocDepartmentId);
  }, [teachers, allocDepartmentId]);

  // Filter teachers inside edit modal based on selected department
  const editFilteredTeachers = useMemo(() => {
    if (editDepartmentId === "ALL") return teachers;
    return teachers.filter(t => t.departmentId === editDepartmentId);
  }, [teachers, editDepartmentId]);

  // Filter classes inside modal strictly based on campus, subject grade scope, and grade selector
  const modalFilteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (allocCampusId !== "ALL" && c.campusId !== allocCampusId) return false;
      const cGrade = String(c.grade || "");
      if (!allocAllowedGrades.includes(cGrade)) return false;
      if (allocGrade !== "ALL" && cGrade !== allocGrade) return false;
      if (allocSubject?.code === "FIN_EDU" && cGrade === "1") {
        const cSys = String(c.educationSystem || "").toUpperCase();
        if (cSys !== "S" && cSys !== "HNS") return false;
      }
      return true;
    });
  }, [classes, allocCampusId, allocGrade, allocAllowedGrades, allocSubject]);

  return (
    <div className="p-3 md:p-4 w-full max-w-[1600px] mx-auto space-y-3.5">
      {/* Top Banner Navigation */}
      <SpecialSubjectNav 
        title="Phân công Giảng dạy Môn đặc thù"
        subtitle="Quản lý giáo viên phụ trách môn đặc thù theo cơ sở, khối và lớp học toàn hệ thống"
      />

      {/* Specialty Notice Banner - Compact */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] text-white rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-white/10 backdrop-blur-md shrink-0">
            <UserCheck className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded border border-teal-300/30">
                Quy định phân công
              </span>
              <span className="text-xs text-white/80 font-medium">Hệ thống Sky-Line</span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold mt-0.5 text-white">
              Giáo viên Chủ nhiệm (GVCN) trực tiếp phụ trách giảng dạy & đánh giá môn đặc thù
            </h4>
            <p className="text-[11px] text-teal-100/90 mt-0.5 max-w-3xl">
              Hệ thống hỗ trợ cơ chế 1-click tự động gán chính xác GVCN của từng lớp vào môn học tương ứng theo niên khóa 2026-2027.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleOpenNotifyModal()}
            disabled={notifying || assignments.length === 0}
            className="px-3.5 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Gửi email nhắc nhở phân công cho giáo viên trong bộ lọc hiện tại"
          >
            <Mail className={`w-3.5 h-3.5 ${notifying ? "animate-spin" : ""}`} />
            <span>📧 Nhắc mail theo GVPT</span>
          </button>

          <button
            onClick={() => handleAutoAssignGvcn()}
            disabled={autoAssigning || loading}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${autoAssigning ? "animate-spin" : ""}`} />
            <span>{autoAssigning ? "Đang phân công..." : "⚡ Tự động gán GVCN"}</span>
          </button>

          <button
            onClick={openAllocateModal}
            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all border border-white/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tùy chỉnh phân công</span>
          </button>
        </div>
      </div>

      {/* Control bar: Filters - High Density */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-2xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Môn học đặc thù</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="text-xs font-bold border border-teal-200 rounded-lg px-3 py-1.5 bg-teal-50/70 text-teal-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">Tất cả môn đặc thù</option>
              {availableSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {currentSelectedSubject?.code && (
            <div className="hidden xl:block">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Phạm vi khối</label>
              <span className="inline-block text-xs font-bold text-teal-900 bg-teal-100/70 border border-teal-300/80 rounded-lg px-2.5 py-1.5 tabular-nums">
                {SPECIAL_SUBJECT_SCOPE_LABELS[currentSelectedSubject.code] || `Khối ${mainAllowedGrades.join(", ")}`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tổ chuyên môn</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">Tất cả tổ chuyên môn</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} {d.blockCM ? `• ${d.blockCM}` : ""}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cơ sở</label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {campuses.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Khối lớp</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">Tất cả khối {selectedSubjectId !== "ALL" ? `(${mainAllowedGrades.length} khối)` : ""}</option>
              {mainAllowedGrades.map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          </div>

          <div className="pt-5">
            <button
              onClick={fetchAssignments}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all text-xs"
              title="Làm mới"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tab switch between Assigned and Unassigned */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("ASSIGNED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "ASSIGNED"
                ? "bg-white text-teal-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp đã phân công</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "ASSIGNED" ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-600"
            }`}>
              {assignments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("UNASSIGNED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "UNASSIGNED"
                ? "bg-white text-teal-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Lớp chưa phân công</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              unassignedClasses.length > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
            }`}>
              {unassignedClasses.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Table - Zero Dead Space */}
      {activeTab === "ASSIGNED" ? (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Danh sách Lớp đã phân công ({assignments.length} lớp)
              </h3>
              {selectedRowIds.length > 0 && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                  Đã chọn {selectedRowIds.length} lớp
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Học kỳ 1 • Niên khóa 2026-2027
            </span>
          </div>

          {/* Bulk Action Toolbar when 1 or more rows selected */}
          {selectedRowIds.length > 0 && (
            <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                <CheckSquare className="w-4 h-4 text-amber-600" />
                <span>Đang chọn {selectedRowIds.length} / {assignments.length} phân công</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenNotifyModal(selectedRowIds)}
                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Gửi email nhắc phân công cho các Giáo viên phụ trách (GVPT) đã chọn"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Nhắc mail theo GVPT ({selectedTeachersCount} GV / {selectedRowIds.length} lớp)</span>
                </button>

                <button
                  onClick={handleBulkDelete}
                  disabled={deletingBulk}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Xóa phân công các lớp đã chọn"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${deletingBulk ? "animate-spin" : ""}`} />
                  <span>{deletingBulk ? "Đang xóa..." : `Xóa ${selectedRowIds.length} phân công`}</span>
                </button>

                <button
                  onClick={() => setSelectedRowIds([])}
                  className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-200/60 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200">
                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRowIds.length === assignments.length && assignments.length > 0}
                      onChange={handleToggleSelectAllRows}
                      className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                      title={selectedRowIds.length === assignments.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    />
                  </th>
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3.5 w-28">Cơ sở</th>
                  <th className="py-2.5 px-3.5 w-28">Lớp</th>
                  <th className="py-2.5 px-3.5">Môn học đặc thù</th>
                  <th className="py-2.5 px-3.5">Giáo viên phụ trách</th>
                  <th className="py-2.5 px-3.5 text-center w-32">Vai trò</th>
                  <th className="py-2.5 px-3.5 text-center w-32">Tiến độ nhập điểm</th>
                  <th className="py-2.5 px-3.5 text-center w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.length > 0 ? (
                  assignments.map((item, idx) => {
                    const entryCount = item._count?.gradeEntries || 0;
                    const isSelected = selectedRowIds.includes(item.id);
                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${isSelected ? "bg-amber-50/60 hover:bg-amber-100/60" : "hover:bg-teal-50/40"}`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                            className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-2.5 px-3.5">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                            {item.class?.campus?.campusCode || "CS"}
                          </span>
                        </td>

                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {item.class?.className}
                        </td>

                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold text-teal-900 flex items-center space-x-1.5">
                            <span 
                              style={{ backgroundColor: item.subject?.color || "#00A19A" }} 
                              className="w-2 h-2 rounded-full shrink-0" 
                            />
                            <span className="truncate max-w-[200px]">{item.subject?.name}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-slate-800 flex items-center space-x-1.5 flex-wrap gap-1">
                            <span>{item.teacher?.teacherName}</span>
                            {item.isGvcn && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                GVCN
                              </span>
                            )}
                            {item.teacher?.departmentRel?.name && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {item.teacher.departmentRel.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.teacher?.teacherCode} {item.teacher?.email ? `• ${item.teacher.email}` : ""}
                          </div>
                        </td>

                        <td className="py-2.5 px-3.5 text-center">
                          {item.isGvcn ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-800">
                              ✓ Đúng GVCN
                            </span>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                                GV bộ môn
                              </span>
                              {item.homeroomTeacher && (
                                <button
                                  onClick={() => handleAutoAssignGvcn([item.classId])}
                                  className="text-[9px] text-teal-700 hover:underline mt-0.5"
                                  title="Gán lại cho GVCN lớp"
                                >
                                  (GVCN: {item.homeroomTeacher.teacherName})
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entryCount > 0 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {entryCount} lượt đánh giá
                          </span>
                        </td>

                        <td className="py-2.5 px-3.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleOpenNotifyModalForTeacher(item.teacherId, item.teacher?.teacherName)}
                              className="p-1 hover:bg-sky-50 text-sky-700 rounded-md transition-colors cursor-pointer"
                              title={`Nhắc email theo GVPT: Gửi cho ${item.teacher?.teacherName || "GV"} (tất cả các lớp phụ trách)`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:bg-amber-50 text-amber-700 rounded-md transition-colors cursor-pointer"
                              title="Hiệu chỉnh phân công"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              href={`/admin/special-subjects/gradebook?assignmentId=${item.id}`}
                              className="p-1 hover:bg-teal-50 text-teal-700 rounded-md transition-colors"
                              title="Mở Sổ đánh giá"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(item.id, item.class?.className)}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer"
                              title="Hủy phân công"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <Users className="w-7 h-7 mx-auto mb-2 opacity-40" />
                      <div>Chưa có phân công nào phù hợp với bộ lọc</div>
                      {unassignedClasses.length > 0 && (
                        <button
                          onClick={() => handleAutoAssignGvcn()}
                          className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all inline-flex items-center space-x-1.5 shadow-2xs"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>⚡ Nhấn để tự động phân công {unassignedClasses.length} lớp cho GVCN</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Unassigned Classes Table */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Danh sách Lớp chưa được phân công môn học ({unassignedClasses.length} lớp)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Các lớp đã phát hiện Giáo viên Chủ nhiệm (GVCN) sẵn sàng phân công
              </p>
            </div>
            {unassignedClasses.length > 0 && (
              <button
                onClick={() => handleAutoAssignGvcn()}
                disabled={autoAssigning}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Gán toàn bộ {unassignedClasses.length} lớp cho GVCN</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200">
                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3.5 w-28">Cơ sở</th>
                  <th className="py-2.5 px-3.5 w-28">Lớp</th>
                  <th className="py-2.5 px-3.5 w-24">Khối</th>
                  <th className="py-2.5 px-3.5">Giáo viên Chủ nhiệm (GVCN) của lớp</th>
                  <th className="py-2.5 px-3.5 text-center w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unassignedClasses.length > 0 ? (
                  unassignedClasses.map((cls, idx) => {
                    const gvcn = cls.homeroomTeacher;
                    return (
                      <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                            {cls.campus?.campusCode || "CS"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {cls.className}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-semibold">
                          Khối {cls.grade}
                        </td>
                        <td className="py-2.5 px-3.5">
                          {gvcn ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-800">{gvcn.teacherName}</span>
                              <span className="text-[10px] text-slate-500">({gvcn.teacherCode})</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                GVCN
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-600 italic">Chưa xác định GVCN</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          {gvcn ? (
                            <button
                              onClick={() => handleAutoAssignGvcn([cls.id])}
                              className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 transition-colors inline-flex items-center space-x-1 text-xs"
                            >
                              <Zap className="w-3 h-3 text-emerald-600" />
                              <span>Gán GVCN</span>
                            </button>
                          ) : (
                            <button
                              onClick={openAllocateModal}
                              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs"
                            >
                              Chỉ định GV
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <ShieldCheck className="w-7 h-7 mx-auto mb-2 text-emerald-500 opacity-80" />
                      <div className="text-slate-700 font-semibold">Tất cả các lớp trong phạm vi đã được phân công!</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-100 space-y-3.5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Phân công Giảng dạy Môn đặc thù</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {optionsLoading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                <span>Đang tải danh sách giáo viên và lớp học...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveAllocation} className="space-y-3.5">
                {/* Method selector */}
                <div className="p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalMode("AUTO_GVCN")}
                    className={`py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      modalMode === "AUTO_GVCN"
                        ? "bg-white text-teal-900 shadow-2xs border border-teal-500/20"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gán theo GVCN của lớp (Khuyến nghị)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMode("SPECIFIC_TEACHER")}
                    className={`py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                      modalMode === "SPECIFIC_TEACHER"
                        ? "bg-white text-teal-900 shadow-2xs border border-teal-500/20"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    <span>Chỉ định một giáo viên cụ thể</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700">Môn học đặc thù *</label>
                        {allocSubject?.code && (
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                            {SPECIAL_SUBJECT_SCOPE_LABELS[allocSubject.code] || `Khối ${allocAllowedGrades.join(", ")}`}
                          </span>
                        )}
                      </div>
                      <select
                        value={allocSubjectId}
                        onChange={(e) => setAllocSubjectId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-semibold cursor-pointer"
                        required
                      >
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code}) - {SPECIAL_SUBJECT_SCOPE_LABELS[s.code] || `Khối ${getSpecialSubjectGrades(s.code).join(", ")}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {modalMode === "SPECIFIC_TEACHER" ? (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Tổ chuyên môn (Lọc theo tổ)
                        </label>
                        <select
                          value={allocDepartmentId}
                          onChange={(e) => {
                            const newDept = e.target.value;
                            setAllocDepartmentId(newDept);
                            const filtered = newDept === "ALL" ? teachers : teachers.filter(t => t.departmentId === newDept);
                            if (filtered.length > 0 && !filtered.some(t => t.id === allocTeacherId)) {
                              setAllocTeacherId(filtered[0].id);
                            }
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
                        >
                          <option value="ALL">Tất cả tổ chuyên môn ({teachers.length} GV)</option>
                          {departments.map(d => {
                            const count = teachers.filter(t => t.departmentId === d.id).length;
                            return (
                              <option key={d.id} value={d.id}>
                                {d.name} {d.blockCM ? `• ${d.blockCM}` : ""} ({count} GV)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="text-[10px] text-emerald-900 leading-tight">
                          <span className="font-bold">Tự động gán GVCN:</span> Mỗi lớp được chọn sẽ tự động được phân công cho chính Giáo viên Chủ nhiệm của lớp đó.
                        </div>
                      </div>
                    )}
                  </div>

                  {modalMode === "SPECIFIC_TEACHER" && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Giáo viên phụ trách * ({modalFilteredTeachers.length} GV)
                      </label>
                      <select
                        value={allocTeacherId}
                        onChange={(e) => setAllocTeacherId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
                        required
                      >
                        {modalFilteredTeachers.length === 0 ? (
                          <option disabled value="">Không có giáo viên thuộc tổ này</option>
                        ) : (
                          modalFilteredTeachers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.teacherName} ({t.teacherCode}) - {t.campus?.campusCode || "CS"} {t.departmentRel?.name ? `• ${t.departmentRel.name}` : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-700">
                      Chọn các lớp học ({selectedClassIds.length} lớp đã chọn)
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={allocCampusId}
                        onChange={(e) => setAllocCampusId(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] bg-slate-50 cursor-pointer"
                      >
                        <option value="ALL">Tất cả cơ sở</option>
                        {campuses.filter(c => c.code !== "ALL").map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                      <select
                        value={allocGrade}
                        onChange={(e) => setAllocGrade(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] bg-slate-50 cursor-pointer"
                      >
                        <option value="ALL">Tất cả khối ({allocAllowedGrades.length} khối)</option>
                        {allocAllowedGrades.map(g => (
                          <option key={g} value={g}>Khối {g}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSelectAllFiltered(modalFilteredClasses)}
                        className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Chọn tất cả ({modalFilteredClasses.length})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {modalFilteredClasses.map((cls) => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      const gvcn = cls.homeroomTeacher;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleToggleClass(cls.id)}
                          className={`p-2 rounded-xl text-left border transition-all flex items-start space-x-2 cursor-pointer ${
                            isSelected
                              ? "bg-teal-50 border-teal-500 text-teal-900 shadow-2xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                          )}
                          <div className="overflow-hidden">
                            <div className="font-bold text-[11px] truncate flex items-center space-x-1">
                              <span>{cls.className}</span>
                              <span className="text-[9px] text-slate-400 font-normal">({cls.campus?.campusCode})</span>
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                              GVCN: <span className="font-semibold text-slate-800">{gvcn?.teacherName || "Chưa có"}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email notification option */}
                <div className="p-2.5 bg-teal-50/70 border border-teal-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                    <div>
                      <span className="text-[11px] font-semibold text-teal-950 block">
                        Gửi email thông báo phân công cho giáo viên ngay sau khi lưu
                      </span>
                      <span className="text-[10px] text-teal-700">
                        Hệ thống sẽ gửi email Sky-line SMS kèm danh sách lớp và link Sổ đánh giá
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={sendNotificationEmail}
                      onChange={(e) => setSendNotificationEmail(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || selectedClassIds.length === 0}
                    className="px-4 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] text-white font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {submitting 
                      ? "Đang lưu..." 
                      : modalMode === "AUTO_GVCN"
                        ? `Xác nhận gán cho GVCN (${selectedClassIds.length} lớp)`
                        : `Xác nhận phân công (${selectedClassIds.length} lớp)`
                    }
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Email Reminder Modal - Grouped by GVPT */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-100 space-y-3.5 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Mail className="w-4 h-4 text-teal-600" />
                <span>Gửi Email Nhắc Theo Giáo Viên Phụ Trách (GVPT)</span>
              </h3>
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl space-y-2 text-slate-700">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-teal-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>Danh sách GVPT nhận email ({targetTeachersList.length} GV / {targetAssignments.length} lớp):</span>
                  </div>
                  {targetTeachersList.length > 1 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllNotifyTeachers}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                    >
                      {selectedNotifyTeacherIds.length === targetTeachersList.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </button>
                  )}
                </div>

                {/* List of GVPT recipients */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {targetTeachersList.length > 0 ? (
                    targetTeachersList.map(t => {
                      const isChecked = selectedNotifyTeacherIds.includes(t.teacherId);
                      const hasEmail = Boolean(t.email && t.email.includes("@"));
                      return (
                        <div 
                          key={t.teacherId}
                          onClick={() => handleToggleNotifyTeacher(t.teacherId)}
                          className={`p-2 rounded-lg border transition-colors flex items-start gap-2.5 cursor-pointer ${
                            isChecked ? "bg-white border-teal-300 shadow-2xs" : "bg-slate-50/70 border-slate-200 opacity-60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer pointer-events-none"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                              <span>👤 {t.teacherName}</span>
                              {t.teacherCode && <span className="text-[10px] font-normal text-slate-500">({t.teacherCode})</span>}
                              {t.departmentName && (
                                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {t.departmentName}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-medium mt-0.5">
                              {hasEmail ? (
                                <span className="text-teal-700">✉ {t.email}</span>
                              ) : (
                                <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded">
                                  ⚠ Chưa có email (sẽ bị bỏ qua khi gửi)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                              Phụ trách {t.classes.length} lớp: {t.classes.map(c => `${c.className} (${c.campusCode || "CS"})`).join(", ")}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                            {t.classes.length} lớp
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-3 text-slate-500">
                      Không tìm thấy Giáo viên phụ trách nào trong phạm vi đã chọn
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 pt-0.5 border-t border-teal-200/50">
                  Email thông báo sẽ gửi đích danh đến từng <strong>Giáo viên phụ trách (GVPT)</strong>, kèm bảng tổng hợp danh sách tất cả các lớp phụ trách và đường dẫn đăng nhập thực hiện đánh giá.
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lời nhắn thêm cho giáo viên (tùy chọn):
                </label>
                <textarea
                  value={notifyCustomMessage}
                  onChange={(e) => setNotifyCustomMessage(e.target.value)}
                  rows={3}
                  placeholder="Ví dụ: Thầy/Cô vui lòng cập nhật tiến độ đánh giá năng lực đợt 1 trước ngày 30/10..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-normal"
                />
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Sẽ gửi tới: <strong className="text-teal-700">{selectedNotifyTeacherIds.length} GVPT</strong>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNotifyModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={notifying || selectedNotifyTeacherIds.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 text-xs flex items-center space-x-1.5"
                >
                  <Send className={`w-3.5 h-3.5 ${notifying ? "animate-spin" : ""}`} />
                  <span>{notifying ? "Đang gửi email..." : `Xác nhận gửi email (${selectedNotifyTeacherIds.length} GVPT)`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Single Assignment Modal */}
      {isEditModalOpen && editingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 space-y-3.5 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-amber-600" />
                <span>Hiệu chỉnh Phân công Giảng dạy</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Assignment overview badge */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 text-[11px]">Lớp học:</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {editingAssignment.class?.className} ({editingAssignment.class?.campus?.campusCode || "CS"})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 text-[11px]">Môn học đặc thù:</span>
                  <span className="font-bold text-teal-800 text-xs flex items-center space-x-1">
                    <span 
                      style={{ backgroundColor: editingAssignment.subject?.color || "#00A19A" }} 
                      className="w-2 h-2 rounded-full inline-block" 
                    />
                    <span>{editingAssignment.subject?.name}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-500 text-[11px]">GVCN của lớp:</span>
                  <span className="font-medium text-slate-800 text-[11px]">
                    {editingAssignment.homeroomTeacher?.teacherName || "Chưa có"}
                  </span>
                </div>
                {editingAssignment.homeroomTeacher && editingAssignment.teacherId !== editingAssignment.homeroomTeacher.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditTeacherId(editingAssignment.homeroomTeacher.id);
                      if (editingAssignment.homeroomTeacher.departmentId) {
                        setEditDepartmentId(editingAssignment.homeroomTeacher.departmentId);
                      }
                    }}
                    className="w-full mt-1 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] border border-emerald-200 flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Zap className="w-3 h-3 text-emerald-600" />
                    <span>⚡ Gán nhanh cho GVCN ({editingAssignment.homeroomTeacher.teacherName})</span>
                  </button>
                )}
              </div>

              {/* Department selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tổ chuyên môn (Lọc giáo viên theo tổ)
                </label>
                <select
                  value={editDepartmentId}
                  onChange={(e) => {
                    const newDept = e.target.value;
                    setEditDepartmentId(newDept);
                    const filtered = newDept === "ALL" ? teachers : teachers.filter(t => t.departmentId === newDept);
                    if (filtered.length > 0 && !filtered.some(t => t.id === editTeacherId)) {
                      setEditTeacherId(filtered[0].id);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
                >
                  <option value="ALL">Tất cả tổ chuyên môn ({teachers.length} GV)</option>
                  {departments.map(d => {
                    const count = teachers.filter(t => t.departmentId === d.id).length;
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.blockCM ? `• ${d.blockCM}` : ""} ({count} GV)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Teacher selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Giáo viên phụ trách mới * ({editFilteredTeachers.length} GV)
                </label>
                <select
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
                  required
                >
                  {editFilteredTeachers.length === 0 ? (
                    <option disabled value="">Không có giáo viên thuộc tổ này</option>
                  ) : (
                    editFilteredTeachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} ({t.teacherCode}) - {t.campus?.campusCode || "CS"} {t.departmentRel?.name ? `• ${t.departmentRel.name}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Notification toggle */}
              <div className="p-2.5 bg-teal-50/70 border border-teal-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold text-teal-950 block">
                      Gửi email thông báo cho giáo viên mới
                    </span>
                    <span className="text-[10px] text-teal-700">
                      Gửi thư thông báo phân công lớp học đến hộp thư của GV
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={editSendNotificationEmail}
                    onChange={(e) => setEditSendNotificationEmail(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 text-xs flex items-center space-x-1.5"
                >
                  <Pencil className={`w-3.5 h-3.5 ${updating ? "animate-spin" : ""}`} />
                  <span>{updating ? "Đang lưu..." : "Cập nhật phân công"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
