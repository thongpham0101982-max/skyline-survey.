"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Layers,
  Mail,
  Send,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  CheckSquare,
  Square,
  X,
  Eye,
  UserPlus,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";

interface CampusOption {
  id: string;
  campusCode?: string;
  campusName: string;
}

interface DepartmentOption {
  id: string;
  code?: string;
  name: string;
}

interface ProgressSummary {
  totalClasses: number;
  totalSlots: number;
  assignedSlots: number;
  unassignedSlots: number;
  totalTeachers: number;
  completedTeachers: number;
  inProgressTeachers: number;
  notStartedTeachers: number;
  completedSlots: number;
  inProgressSlots: number;
  notStartedSlots: number;
  approvedSlots: number;
  totalExpectedStudents: number;
  totalGradedStudents: number;
  overallRate: number;
}

interface ProgressSlotItem {
  slotKey: string;
  classId: string;
  className: string;
  grade: string;
  level: string;
  campusId: string;
  campusName: string;
  campusCode: string;
  subjectCode: string;
  subjectNameVi: string;
  subjectNameEn: string;
  isQualitative: boolean;
  requiredColsCount: number;
  isAssigned: boolean;
  primaryTeacherId: string | null;
  primaryTeacherName: string | null;
  primaryTeacherCode: string | null;
  primaryTeacherEmail: string | null;
  primaryTeacherCampusId: string;
  primaryTeacherCampusName: string;
  primaryTeacherDeptIds: string[];
  primaryTeacherDeptNames: string[];
  delegatedTeacherId: string | null;
  delegatedTeacherName: string | null;
  totalStudents: number;
  gradedStudents: number;
  fullScoreStudents: number;
  commentEnStudents: number;
  commentViStudents: number;
  missingStudents: number;
  progressRate: number;
  fullScoreRate: number;
  commentRate: number;
  progressStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS";
  reviewStatus: string;
  lastUpdatedAt: string | null;
}

interface TeacherProgressItem {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  email: string | null;
  campusId: string;
  campusName: string;
  deptIds: string[];
  deptNames: string[];
  classCount: number;
  slotCount: number;
  completedSlots: number;
  inProgressSlots: number;
  notStartedSlots: number;
  noStudentsSlots: number;
  incompleteSlots: number;
  approvedSlots: number;
  pendingReviewSlots: number;
  totalExpectedStudents: number;
  totalGradedStudents: number;
  totalFullScoreStudents: number;
  totalCommentEnStudents: number;
  totalCommentViStudents: number;
  missingStudents: number;
  progressRate: number;
  commentRate: number;
  teacherStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS";
  lastUpdatedAt: string | null;
  slots: ProgressSlotItem[];
}

interface StudentSlotDetailRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  englishName: string;
  hasAnyScore: boolean;
  hasFullScore: boolean;
  hasCommentEn: boolean;
  hasCommentVi: boolean;
  filledCols: number;
  requiredCols: number;
  scoreSummary: string;
  commentEn: string;
  commentVi: string;
  reviewStatus: string;
  updatedAt: string | null;
}

interface SlotDetailData {
  classId: string;
  className: string;
  campusName: string;
  level: string;
  subjectCode: string;
  subjectNameVi: string;
  subjectNameEn: string;
  isQualitative: boolean;
  primaryTeacherName: string | null;
  primaryTeacherCode: string | null;
  students: StudentSlotDetailRow[];
}

interface GradeProgressTabProps {
  academicYearId: string;
  academicYearName: string;
  semester: number;
  campuses: CampusOption[];
  departments?: DepartmentOption[];
  selectedCampusId: string;
  onCampusChange: (campusId: string) => void;
  presetSearch?: string;
  onClearPresetSearch?: () => void;
  onOpenGradebook: (params: { classId: string; subjectCode: string }) => void;
  onOpenAssignTab: (params?: { classId?: string; teacherId?: string }) => void;
}

const SUBJECT_FILTER_OPTIONS = [
  { code: "ALL", label: "Tất cả môn CTQT" },
  { code: "ENG", label: "ENG - Tiếng Anh" },
  { code: "SCI", label: "SCI - Khoa học" },
  { code: "MAT", label: "MAT - Toán quốc tế" },
  { code: "GLOBAL_STUDIES", label: "GLOBAL_STUDIES - Global Studies" },
  { code: "AE", label: "AE - Tiếng Anh Học thuật" },
  { code: "IELTS", label: "IELTS" },
  { code: "AR", label: "AR - Nghiên cứu Học thuật" },
];

function formatDateTimeVi(iso?: string | null): string {
  if (!iso) return "Chưa nhập";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Chưa nhập";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  } catch {
    return "Chưa nhập";
  }
}

function getProgressBadgeMeta(status: string) {
  if (status === "COMPLETED") {
    return {
      label: "Hoàn thành 100%",
      badgeClass: "bg-emerald-50 text-[#059669] border border-emerald-200",
      barClass: "bg-[#059669]",
      chipClass: "bg-emerald-50 text-[#059669] border-emerald-200 hover:bg-emerald-100/70",
    };
  }
  if (status === "IN_PROGRESS") {
    return {
      label: "Đang nhập dở",
      badgeClass: "bg-amber-50 text-[#D97706] border border-amber-200",
      barClass: "bg-[#D97706]",
      chipClass: "bg-amber-50 text-[#D97706] border-amber-200 hover:bg-amber-100/70",
    };
  }
  if (status === "NO_STUDENTS") {
    return {
      label: "Lớp chưa có HS",
      badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
      barClass: "bg-slate-400",
      chipClass: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70",
    };
  }
  return {
    label: "Chưa bắt đầu",
    badgeClass: "bg-rose-50 text-[#E11D48] border border-rose-200",
    barClass: "bg-[#E11D48]",
    chipClass: "bg-rose-50 text-[#E11D48] border-rose-200 hover:bg-rose-100/70",
  };
}

function getReviewStatusMeta(status?: string | null) {
  const s = (status || "DRAFT").toUpperCase();
  if (s === "APPROVED") {
    return {
      label: "Đã duyệt",
      badgeClass: "bg-emerald-50 text-[#059669] border border-emerald-200",
    };
  }
  if (s === "PENDING_REVIEW" || s === "SUBMITTED") {
    return {
      label: "Chờ duyệt",
      badgeClass: "bg-amber-50 text-[#D97706] border border-amber-200",
    };
  }
  if (s === "CHANGES_REQUESTED" || s === "REVISION_REQUESTED") {
    return {
      label: "Cần chỉnh sửa",
      badgeClass: "bg-rose-50 text-[#E11D48] border border-rose-200",
    };
  }
  return {
    label: "Bản nháp",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
  };
}

export function CtqtGradeProgressTab({
  academicYearId,
  academicYearName,
  semester,
  campuses,
  departments = [],
  selectedCampusId,
  onCampusChange,
  presetSearch = "",
  onClearPresetSearch,
  onOpenGradebook,
  onOpenAssignTab,
}: GradeProgressTabProps) {
  const [viewMode, setViewMode] = useState<"by_teacher" | "by_slot">("by_teacher");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    summary: ProgressSummary;
    teachers: TeacherProgressItem[];
    slots: ProgressSlotItem[];
  }>({
    summary: {
      totalClasses: 0,
      totalSlots: 0,
      assignedSlots: 0,
      unassignedSlots: 0,
      totalTeachers: 0,
      completedTeachers: 0,
      inProgressTeachers: 0,
      notStartedTeachers: 0,
      completedSlots: 0,
      inProgressSlots: 0,
      notStartedSlots: 0,
      approvedSlots: 0,
      totalExpectedStudents: 0,
      totalGradedStudents: 0,
      overallRate: 0,
    },
    teachers: [],
    slots: [],
  });

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [assignmentScope, setAssignmentScope] = useState<"ASSIGNED_ONLY" | "ALL_SLOTS" | "UNASSIGNED_ONLY">(
    "ASSIGNED_ONLY"
  );
  const [searchQuery, setSearchQuery] = useState<string>(presetSearch || "");

  useEffect(() => {
    if (presetSearch) {
      setSearchQuery(presetSearch);
    }
  }, [presetSearch]);

  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<string>>(new Set());
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Detail Modal for a specific class-subject slot
  const [detailSlot, setDetailSlot] = useState<ProgressSlotItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailData, setDetailData] = useState<SlotDetailData | null>(null);
  const [onlyMissingInModal, setOnlyMissingInModal] = useState(false);

  // Reminder Email Modal
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTeacherIds, setReminderTeacherIds] = useState<string[]>([]);
  const [onlyIncompleteReminder, setOnlyIncompleteReminder] = useState(true);
  const [reminderCustomMessage, setReminderCustomMessage] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchProgressData = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        academicYearId,
        semester: String(semester),
      });
      if (selectedCampusId) qs.set("campusId", selectedCampusId);

      const res = await fetch(`/api/admin/ctqt/grade-progress?${qs.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        toast.error(json.error || "Không thể tải dữ liệu thống kê nhập điểm");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi tải thống kê nhập điểm");
    } finally {
      setLoading(false);
    }
  }, [academicYearId, semester, selectedCampusId]);

  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  const toggleExpandTeacher = (teacherId: string) => {
    setExpandedTeacherIds(prev => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  };

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return data.teachers
      .map((t): TeacherProgressItem | null => {
        const matchingSlots = (t.slots || []).filter(s => {
          if (levelFilter !== "ALL" && s.level !== levelFilter) return false;
          if (subjectFilter !== "ALL" && s.subjectCode !== subjectFilter) return false;
          return true;
        });

        if (matchingSlots.length === 0) return null;

        const classSet = new Set(matchingSlots.map(s => s.classId));
        const slotCount = matchingSlots.length;
        const completedSlots = matchingSlots.filter(s => s.progressStatus === "COMPLETED").length;
        const inProgressSlots = matchingSlots.filter(s => s.progressStatus === "IN_PROGRESS").length;
        const notStartedSlots = matchingSlots.filter(s => s.progressStatus === "NOT_STARTED").length;
        const noStudentsSlots = matchingSlots.filter(s => s.progressStatus === "NO_STUDENTS").length;
        const approvedSlots = matchingSlots.filter(s => s.reviewStatus === "APPROVED").length;

        const totalExpectedStudents = matchingSlots.reduce((sum, s) => sum + s.totalStudents, 0);
        const totalGradedStudents = matchingSlots.reduce((sum, s) => sum + s.gradedStudents, 0);
        const totalFullScoreStudents = matchingSlots.reduce((sum, s) => sum + s.fullScoreStudents, 0);
        const totalCommentEnStudents = matchingSlots.reduce((sum, s) => sum + s.commentEnStudents, 0);
        const totalCommentViStudents = matchingSlots.reduce((sum, s) => sum + s.commentViStudents, 0);

        const activeSlots = slotCount - noStudentsSlots;
        let teacherStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS" = "NOT_STARTED";
        if (activeSlots <= 0) teacherStatus = "NO_STUDENTS";
        else if (completedSlots === activeSlots) teacherStatus = "COMPLETED";
        else if (totalGradedStudents > 0 || completedSlots > 0) teacherStatus = "IN_PROGRESS";

        const progressRate =
          totalExpectedStudents > 0
            ? Math.round((totalGradedStudents / totalExpectedStudents) * 100)
            : teacherStatus === "COMPLETED"
            ? 100
            : 0;

        return {
          ...t,
          classCount: classSet.size,
          slotCount,
          completedSlots,
          inProgressSlots,
          notStartedSlots,
          incompleteSlots: inProgressSlots + notStartedSlots,
          approvedSlots,
          totalExpectedStudents,
          totalGradedStudents,
          totalFullScoreStudents,
          totalCommentEnStudents,
          totalCommentViStudents,
          progressRate,
          teacherStatus,
          slots: matchingSlots,
        };
      })
      .filter((t): t is TeacherProgressItem => {
        if (!t) return false;

        if (deptFilter !== "ALL") {
          if (!Array.isArray(t.deptIds) || !t.deptIds.includes(deptFilter)) return false;
        }

        if (statusFilter === "COMPLETED" && t.teacherStatus !== "COMPLETED") return false;
        if (statusFilter === "IN_PROGRESS" && t.teacherStatus !== "IN_PROGRESS") return false;
        if (statusFilter === "NOT_STARTED" && t.teacherStatus !== "NOT_STARTED") return false;
        if (
          statusFilter === "INCOMPLETE" &&
          t.teacherStatus !== "IN_PROGRESS" &&
          t.teacherStatus !== "NOT_STARTED"
        ) {
          return false;
        }

        if (q) {
          const matchName = (t.teacherName || "").toLowerCase().includes(q);
          const matchCode = (t.teacherCode || "").toLowerCase().includes(q);
          const matchEmail = (t.email || "").toLowerCase().includes(q);
          const matchClass = t.slots.some(
            s =>
              (s.className || "").toLowerCase().includes(q) ||
              (s.subjectCode || "").toLowerCase().includes(q) ||
              (s.subjectNameVi || "").toLowerCase().includes(q)
          );
          if (!matchName && !matchCode && !matchEmail && !matchClass) return false;
        }

        return true;
      });
  }, [data.teachers, levelFilter, subjectFilter, deptFilter, statusFilter, searchQuery]);

  const filteredSlots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return (data.slots || []).filter(s => {
      if (assignmentScope === "ASSIGNED_ONLY" && !s.isAssigned) return false;
      if (assignmentScope === "UNASSIGNED_ONLY" && s.isAssigned) return false;

      if (levelFilter !== "ALL" && s.level !== levelFilter) return false;
      if (subjectFilter !== "ALL" && s.subjectCode !== subjectFilter) return false;

      if (deptFilter !== "ALL") {
        if (!Array.isArray(s.primaryTeacherDeptIds) || !s.primaryTeacherDeptIds.includes(deptFilter)) {
          return false;
        }
      }

      if (statusFilter === "COMPLETED" && s.progressStatus !== "COMPLETED") return false;
      if (statusFilter === "IN_PROGRESS" && s.progressStatus !== "IN_PROGRESS") return false;
      if (statusFilter === "NOT_STARTED" && s.progressStatus !== "NOT_STARTED") return false;
      if (
        statusFilter === "INCOMPLETE" &&
        s.progressStatus !== "IN_PROGRESS" &&
        s.progressStatus !== "NOT_STARTED"
      ) {
        return false;
      }

      if (q) {
        const matchClass = (s.className || "").toLowerCase().includes(q);
        const matchTeacher =
          (s.primaryTeacherName || "").toLowerCase().includes(q) ||
          (s.primaryTeacherCode || "").toLowerCase().includes(q);
        const matchSub =
          (s.subjectCode || "").toLowerCase().includes(q) ||
          (s.subjectNameVi || "").toLowerCase().includes(q);
        if (!matchClass && !matchTeacher && !matchSub) return false;
      }

      return true;
    });
  }, [data.slots, assignmentScope, levelFilter, subjectFilter, deptFilter, statusFilter, searchQuery]);

  const incompleteTeachers = useMemo(() => {
    return filteredTeachers.filter(
      t => t.teacherStatus === "NOT_STARTED" || t.teacherStatus === "IN_PROGRESS"
    );
  }, [filteredTeachers]);

  const handleOpenSlotDetail = async (slot: ProgressSlotItem) => {
    setDetailSlot(slot);
    setDetailData(null);
    setOnlyMissingInModal(false);
    setLoadingDetail(true);
    try {
      const qs = new URLSearchParams({
        academicYearId,
        semester: String(semester),
        action: "slot_detail",
        classId: slot.classId,
        subjectCode: slot.subjectCode,
      });
      const res = await fetch(`/api/admin/ctqt/grade-progress?${qs.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDetailData(json.data);
      } else {
        toast.error(json.error || "Không thể tải danh sách học sinh");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải chi tiết lớp");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenReminderModal = (targetTeacherIds: string[]) => {
    if (targetTeacherIds.length === 0) {
      toast("Hiện không có giáo viên nào cần nhắc nhở trong danh sách đang lọc.");
      return;
    }
    setReminderTeacherIds(targetTeacherIds);
    setOnlyIncompleteReminder(true);
    setIsReminderModalOpen(true);
  };

  const handleSendReminders = async () => {
    if (reminderTeacherIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 giáo viên.");
      return;
    }
    setSendingReminder(true);
    try {
      const res = await fetch("/api/admin/ctqt/grade-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_reminder",
          academicYearId,
          semester,
          teacherIds: reminderTeacherIds,
          onlyIncomplete: onlyIncompleteReminder,
          customMessage: reminderCustomMessage.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Đã gửi email nhắc tiến độ thành công!");
        setIsReminderModalOpen(false);
        setSelectedTeacherIds([]);
      } else {
        toast.error(json.error || "Không thể gửi email nhắc nhở");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi gửi email nhắc nhở");
    } finally {
      setSendingReminder(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const teacherRows = filteredTeachers.map((t, idx) => ({
        STT: idx + 1,
        "Mã giáo viên": t.teacherCode || "",
        "Họ và tên giáo viên": t.teacherName || "",
        Email: t.email || "",
        "Cơ sở": t.campusName || "",
        "Tổ chuyên môn": (t.deptNames || []).join(", "),
        "Số lớp dạy": t.classCount,
        "Số môn phụ trách": t.slotCount,
        "Số môn hoàn thành 100%": t.completedSlots,
        "Số môn đang nhập": t.inProgressSlots,
        "Số môn chưa nhập": t.notStartedSlots,
        "Tổng HS phụ trách": t.totalExpectedStudents,
        "Số HS đã có điểm": t.totalGradedStudents,
        "Số HS đủ cột điểm": t.totalFullScoreStudents,
        "Tỷ lệ nhập điểm (%)": `${t.progressRate}%`,
        "HS có nhận xét EN": t.totalCommentEnStudents,
        "HS có nhận xét VI": t.totalCommentViStudents,
        "Trạng thái": getProgressBadgeMeta(t.teacherStatus).label,
        "Cập nhật gần nhất": formatDateTimeVi(t.lastUpdatedAt),
        "Danh sách lớp - môn": t.slots
          .map(s => `${s.className} (${s.subjectCode}: ${s.gradedStudents}/${s.totalStudents})`)
          .join("; "),
      }));

      const slotRows = filteredSlots.map((s, idx) => ({
        STT: idx + 1,
        "Lớp học": s.className,
        "Cơ sở": s.campusName,
        "Cấp học":
          s.level === "PRIMARY"
            ? "Tiểu học"
            : s.level === "MIDDLE"
            ? "THCS"
            : "THPT",
        "Mã môn": s.subjectCode,
        "Tên môn học": s.subjectNameVi,
        "Mã GVBM": s.primaryTeacherCode || "",
        "Giáo viên phân công (GVBM)": s.primaryTeacherName || "Chưa phân công",
        "Sĩ số lớp": s.totalStudents,
        "Số HS đã có điểm": s.gradedStudents,
        "Số HS đủ cột điểm": s.fullScoreStudents,
        "Số HS còn thiếu điểm": s.missingStudents,
        "Tỷ lệ nhập điểm (%)": `${s.progressRate}%`,
        "HS có nhận xét EN": s.commentEnStudents,
        "HS có nhận xét VI": s.commentViStudents,
        "Trạng thái tiến độ": getProgressBadgeMeta(s.progressStatus).label,
        "Trạng thái duyệt": getReviewStatusMeta(s.reviewStatus).label,
        "Cập nhật gần nhất": formatDateTimeVi(s.lastUpdatedAt),
      }));

      const wb = XLSX.utils.book_new();
      const wsTeachers = XLSX.utils.json_to_sheet(
        teacherRows.length > 0 ? teacherRows : [{ "Thông báo": "Không có dữ liệu giáo viên khớp bộ lọc" }]
      );
      const wsSlots = XLSX.utils.json_to_sheet(
        slotRows.length > 0 ? slotRows : [{ "Thông báo": "Không có dữ liệu lớp - môn khớp bộ lọc" }]
      );

      XLSX.utils.book_append_sheet(wb, wsTeachers, "1_Theo_GV_Phan_Cong");
      XLSX.utils.book_append_sheet(wb, wsSlots, "2_Chi_Tiet_Lop_Mon");

      const safeYear = (academicYearName || "NamHoc").replace(/[^a-zA-Z0-9_-]/g, "_");
      XLSX.writeFile(wb, `ThongKe_NhapDiem_CTQT_${safeYear}_HK${semester}.xlsx`);
      toast.success("Đã xuất file Excel thống kê nhập điểm theo GV phân công!");
    } catch {
      toast.error("Không thể xuất file Excel");
    }
  };

  const toggleSelectTeacher = (teacherId: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
    );
  };

  const allVisibleTeachersSelected =
    filteredTeachers.length > 0 && filteredTeachers.every(t => selectedTeacherIds.includes(t.teacherId));

  const toggleSelectAllVisibleTeachers = () => {
    const visibleIds = filteredTeachers.map(t => t.teacherId);
    if (allVisibleTeachersSelected) {
      setSelectedTeacherIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedTeacherIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const hasActiveFilters =
    Boolean(selectedCampusId) ||
    levelFilter !== "ALL" ||
    subjectFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    deptFilter !== "ALL" ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    onCampusChange("");
    setLevelFilter("ALL");
    setSubjectFilter("ALL");
    setStatusFilter("ALL");
    setDeptFilter("ALL");
    setAssignmentScope("ASSIGNED_ONLY");
    setSearchQuery("");
    if (onClearPresetSearch) onClearPresetSearch();
  };

  const { summary } = data;

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. UNIFIED ACADEMIC LEDGER STRIP                                      */}
      {/* ===================================================================== */}
      <div className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#003B3A] rounded-2xl p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 tabular-nums">
          <div>
            <div className="text-xs font-semibold text-slate-500">Giáo viên có phân công</div>
            <div className="text-lg font-black text-[#003B3A] mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.totalTeachers}</span>
              <span className="text-xs font-semibold text-slate-500">giáo viên</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Đạt 100%: <strong className="text-[#059669]">{summary.completedTeachers}</strong> • Chưa xong:{" "}
              <strong className="text-[#D97706]">
                {summary.inProgressTeachers + summary.notStartedTeachers}
              </strong>
            </div>
          </div>

          <div className="h-9 w-px bg-[#E2E8F0] hidden sm:block" />

          <div>
            <div className="text-xs font-semibold text-slate-500">Lượt môn đã phân công</div>
            <div className="text-lg font-black text-[#003B3A] mt-0.5 flex items-baseline gap-1.5">
              <span>
                {summary.assignedSlots} / {summary.totalSlots}
              </span>
              <span className="text-xs font-semibold text-slate-500">lớp - môn</span>
            </div>
            {summary.unassignedSlots > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setViewMode("by_slot");
                  setAssignmentScope("UNASSIGNED_ONLY");
                }}
                className="text-[11px] font-semibold text-[#E11D48] hover:underline mt-0.5 inline-flex items-center gap-1 cursor-pointer"
              >
                Còn {summary.unassignedSlots} môn chưa gán GVBM
              </button>
            ) : (
              <div className="text-[11px] text-[#059669] font-medium mt-0.5">Đã phân công đủ 100%</div>
            )}
          </div>

          <div className="h-9 w-px bg-[#E2E8F0] hidden sm:block" />

          <div>
            <div className="text-xs font-semibold text-slate-500">Hoàn thành 100%</div>
            <div className="text-lg font-black text-[#059669] mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.completedSlots}</span>
              <span className="text-xs font-semibold text-slate-500">
                / {summary.assignedSlots} môn (
                {summary.assignedSlots > 0
                  ? Math.round((summary.completedSlots / summary.assignedSlots) * 100)
                  : 0}
                %)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Đã duyệt chính thức: <strong className="text-slate-700">{summary.approvedSlots}</strong> môn
            </div>
          </div>

          <div className="h-9 w-px bg-[#E2E8F0] hidden sm:block" />

          <div>
            <div className="text-xs font-semibold text-slate-500">Đang nhập / Chưa bắt đầu</div>
            <div className="text-lg font-black mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[#D97706]">{summary.inProgressSlots}</span>
              <span className="text-slate-300 font-normal">/</span>
              <span className="text-[#E11D48]">{summary.notStartedSlots}</span>
              <span className="text-xs font-semibold text-slate-500">môn</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Cần đôn đốc hoàn thiện</div>
          </div>

          <div className="h-9 w-px bg-[#E2E8F0] hidden md:block" />

          <div className="min-w-[165px]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Tiến độ điểm học sinh</span>
              <span className="font-black text-[#00736E]">{summary.overallRate}%</span>
            </div>
            <div className="mt-1.5 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#008B85] h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, summary.overallRate))}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Đã nhập:{" "}
              <strong className="text-slate-800">
                {summary.totalGradedStudents.toLocaleString("vi-VN")} /{" "}
                {summary.totalExpectedStudents.toLocaleString("vi-VN")}
              </strong>{" "}
              lượt HS
            </div>
          </div>
        </div>

        {/* Right Controls: Segmented View Switcher + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setViewMode("by_teacher")}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "by_teacher"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Theo GV phân công
            </button>
            <button
              type="button"
              onClick={() => setViewMode("by_slot")}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "by_slot"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Chi tiết lớp - môn
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenReminderModal(incompleteTeachers.map(t => t.teacherId))}
            disabled={loading}
            className="text-xs font-bold px-3.5 py-2 bg-[#003B3A] hover:bg-[#005250] text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer tabular-nums"
            title="Gửi email nhắc các giáo viên chưa nhập đủ 100% điểm"
          >
            <Mail className="w-3.5 h-3.5 text-[#5EEAD4]" />
            Nhắc GV chưa xong ({incompleteTeachers.length})
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading}
            className="text-xs font-bold px-3.5 py-2 bg-[#008B85] hover:bg-[#00736E] text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất Excel
          </button>

          <button
            type="button"
            onClick={fetchProgressData}
            disabled={loading}
            className="text-xs font-bold px-3 py-2 bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#008B85]" : ""}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. FILTER BAR                                                         */}
      {/* ===================================================================== */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-xs space-y-3 tabular-nums">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cơ sở lớp học</label>
            <select
              value={selectedCampusId}
              onChange={e => onCampusChange(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#003B3A] focus:outline-[#008B85]"
            >
              <option value="">Tất cả cơ sở</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cấp học CTQT</label>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-[#008B85]"
            >
              <option value="ALL">Mọi cấp (Khối 1 - 12)</option>
              <option value="PRIMARY">Tiểu học (Khối 1 - 5)</option>
              <option value="MIDDLE">THCS (Khối 6 - 9)</option>
              <option value="HIGH">THPT (Khối 10 - 12)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Môn học CTQT</label>
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-[#008B85]"
            >
              {SUBJECT_FILTER_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tiến độ nhập điểm</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-[#008B85]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="INCOMPLETE">Chưa hoàn tất (&lt; 100%)</option>
              <option value="NOT_STARTED">Chưa bắt đầu (0%)</option>
              <option value="IN_PROGRESS">Đang nhập dở (1 - 99%)</option>
              <option value="COMPLETED">Hoàn thành 100%</option>
            </select>
          </div>

          {viewMode === "by_teacher" ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tổ chuyên môn</label>
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-[#008B85]"
              >
                <option value="ALL">Tất cả tổ chuyên môn</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phạm vi phân công</label>
              <select
                value={assignmentScope}
                onChange={e =>
                  setAssignmentScope(e.target.value as "ASSIGNED_ONLY" | "ALL_SLOTS" | "UNASSIGNED_ONLY")
                }
                className="w-full text-xs font-semibold px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-[#008B85]"
              >
                <option value="ASSIGNED_ONLY">Chỉ môn đã có GVBM</option>
                <option value="ALL_SLOTS">Tất cả môn (gồm chưa gán)</option>
                <option value="UNASSIGNED_ONLY">Chỉ môn chưa phân công GVBM</option>
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-600">Tìm kiếm nhanh</label>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] font-semibold text-[#E11D48] hover:underline cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value && onClearPresetSearch) onClearPresetSearch();
                }}
                placeholder="Tên GV, mã GV, tên lớp..."
                className="w-full text-xs pl-8 pr-7 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-[#008B85]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    if (onClearPresetSearch) onClearPresetSearch();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Action Bar when teachers are ticked */}
      {viewMode === "by_teacher" && selectedTeacherIds.length > 0 && (
        <div className="bg-[#F0FDFA] border border-teal-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 tabular-nums">
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#003B3A]">
            <span className="px-2 py-0.5 rounded-full bg-[#003B3A] text-white text-[11px]">
              {selectedTeacherIds.length}
            </span>
            <span>Đã chọn {selectedTeacherIds.length} giáo viên để thao tác hàng loạt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenReminderModal(selectedTeacherIds)}
              className="text-xs font-bold px-3.5 py-1.5 bg-[#003B3A] hover:bg-[#005250] text-white rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#5EEAD4]" />
              Gửi email nhắc nhập điểm ({selectedTeacherIds.length} GV)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTeacherIds([])}
              className="text-xs font-semibold px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. SKY-LINE ACADEMIC LEDGER TABLE                                     */}
      {/* ===================================================================== */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-16 text-center text-xs font-semibold text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-[#008B85] mx-auto mb-2" />
          Đang tổng hợp tiến độ nhập điểm theo giáo viên phân công...
        </div>
      ) : viewMode === "by_teacher" ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
            <div className="font-bold text-[#003B3A]">
              Bảng tiến độ nhập điểm theo giáo viên phân công ({filteredTeachers.length} giáo viên)
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#059669]" /> Đủ 100% HS
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D97706]" /> Đang nhập (1-99%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#E11D48]" /> Chưa nhập (0%)
              </span>
              <button
                type="button"
                onClick={() => {
                  if (expandedTeacherIds.size === filteredTeachers.length) {
                    setExpandedTeacherIds(new Set());
                  } else {
                    setExpandedTeacherIds(new Set(filteredTeachers.map(t => t.teacherId)));
                  }
                }}
                className="font-semibold text-[#00736E] hover:underline ml-1 cursor-pointer"
              >
                {expandedTeacherIds.size === filteredTeachers.length && filteredTeachers.length > 0
                  ? "Thu gọn chi tiết"
                  : "Mở rộng tất cả lớp"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 w-10 text-center text-white">
                    <button
                      type="button"
                      onClick={toggleSelectAllVisibleTeachers}
                      className="inline-flex items-center justify-center text-white hover:text-[#5EEAD4] cursor-pointer"
                      title="Chọn tất cả giáo viên đang hiển thị"
                    >
                      {allVisibleTeachersSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#5EEAD4]" />
                      ) : (
                        <Square className="w-4 h-4 text-teal-200/80" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 text-white min-w-[210px]">Giáo viên phân công</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[290px]">
                    Các lớp &amp; môn phụ trách (nhấn để xem HS)
                  </th>
                  <th className="py-3 px-3 text-center text-teal-100 min-w-[115px]">Môn hoàn tất</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[175px]">Tiến độ nhập điểm HS</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[140px]">Nhận xét song ngữ</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[130px]">Cập nhật gần nhất</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4] min-w-[130px]">Trạng thái</th>
                  <th className="py-3 px-3 text-right text-white min-w-[145px]">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 px-4 text-center text-slate-500">
                      <div className="font-semibold text-slate-700">
                        Không có giáo viên phân công nào khớp với bộ lọc hiện tại
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Thử đổi bộ lọc tiến độ hoặc chuyển sang tab Phân công Giáo viên (GVBM) để gán lớp cho giáo viên.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map(t => {
                    const isSelected = selectedTeacherIds.includes(t.teacherId);
                    const isExpanded = expandedTeacherIds.has(t.teacherId);
                    const badge = getProgressBadgeMeta(t.teacherStatus);

                    return (
                      <React.Fragment key={t.teacherId}>
                        <tr
                          className={`transition-colors align-middle ${
                            isSelected
                              ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                              : "hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <td className="py-3 px-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => toggleSelectTeacher(t.teacherId)}
                              className="inline-flex items-center justify-center cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#008B85]" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                              )}
                            </button>
                          </td>

                          <td className="py-3 px-3 align-middle">
                            <div className="flex items-start gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleExpandTeacher(t.teacherId)}
                                className="mt-0.5 p-0.5 rounded hover:bg-slate-200/70 text-slate-500 hover:text-[#003B3A] cursor-pointer shrink-0"
                                title={isExpanded ? "Thu gọn danh sách lớp" : "Xem chi tiết từng lớp - môn"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-[#008B85]" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandTeacher(t.teacherId)}
                                  className="font-bold text-[#003B3A] hover:underline text-left cursor-pointer"
                                >
                                  {t.teacherName}
                                </button>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {t.teacherCode ? (
                                    <span className="font-mono font-semibold text-slate-700">{t.teacherCode}</span>
                                  ) : (
                                    <span>Chưa có mã</span>
                                  )}
                                  {t.campusName ? ` • ${t.campusName}` : ""}
                                </div>
                                {t.email ? (
                                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={t.email}>
                                    {t.email}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-[#D97706] font-medium">Chưa có email</div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 align-middle">
                            <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                              Phụ trách <strong className="text-[#003B3A]">{t.classCount}</strong> lớp •{" "}
                              <strong className="text-[#003B3A]">{t.slotCount}</strong> môn:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {t.slots.map(s => {
                                const sMeta = getProgressBadgeMeta(s.progressStatus);
                                return (
                                  <button
                                    key={s.slotKey}
                                    type="button"
                                    onClick={() => handleOpenSlotDetail(s)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${sMeta.chipClass}`}
                                    title={`${s.className} - ${s.subjectNameVi}: Đã nhập điểm ${s.gradedStudents}/${s.totalStudents} HS (${s.progressRate}%). Nhấn để xem chi tiết học sinh.`}
                                  >
                                    <span className="font-bold">{s.className}</span>
                                    <span>• {s.subjectCode}</span>
                                    <span className="opacity-90">
                                      ({s.gradedStudents}/{s.totalStudents})
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center align-middle">
                            <div className="font-black text-sm text-[#003B3A]">
                              {t.completedSlots} / {t.slotCount}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {t.approvedSlots > 0 ? `Đã duyệt ${t.approvedSlots}` : "môn đạt 100%"}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-middle">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-800">
                                {t.totalGradedStudents} / {t.totalExpectedStudents}{" "}
                                <span className="font-normal text-slate-500">HS</span>
                              </span>
                              <span className="font-black text-[#003B3A]">{t.progressRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`${badge.barClass} h-full rounded-full transition-all`}
                                style={{ width: `${Math.min(100, Math.max(0, t.progressRate))}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Đủ cột điểm: <strong className="text-slate-700">{t.totalFullScoreStudents}</strong>/
                              {t.totalExpectedStudents}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-middle">
                            <div className="space-y-0.5 text-[11px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">EN:</span>
                                <span
                                  className={`font-semibold ${
                                    t.totalExpectedStudents > 0 &&
                                    t.totalCommentEnStudents >= t.totalExpectedStudents
                                      ? "text-[#059669]"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {t.totalCommentEnStudents}/{t.totalExpectedStudents}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">VI:</span>
                                <span
                                  className={`font-semibold ${
                                    t.totalExpectedStudents > 0 &&
                                    t.totalCommentViStudents >= t.totalExpectedStudents
                                      ? "text-[#059669]"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {t.totalCommentViStudents}/{t.totalExpectedStudents}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 align-middle text-[11px] text-slate-600 whitespace-nowrap">
                            {formatDateTimeVi(t.lastUpdatedAt)}
                          </td>

                          <td className="py-3 px-3 text-center align-middle">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${badge.badgeClass}`}
                            >
                              {t.teacherStatus === "COMPLETED" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : t.teacherStatus === "IN_PROGRESS" ? (
                                <Clock className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {badge.label}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right align-middle">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleExpandTeacher(t.teacherId)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                {isExpanded ? "Ẩn lớp" : "Chi tiết"}
                              </button>
                              {t.teacherStatus !== "COMPLETED" && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReminderModal([t.teacherId])}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`Gửi email nhắc nhập điểm cho ${t.teacherName}`}
                                >
                                  <Mail className="w-3 h-3 text-[#5EEAD4]" />
                                  Nhắc GV
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#F8FAFC]">
                            <td colSpan={9} className="p-3.5 border-t border-[#E2E8F0]">
                              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                                <div className="px-3.5 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-[#003B3A]">
                                    Chi tiết từng lớp - môn phân công của {t.teacherName} ({t.slots.length} môn)
                                  </span>
                                  <span className="text-slate-500">
                                    Nhấn &ldquo;Xem HS&rdquo; để rà soát học sinh còn thiếu điểm hoặc &ldquo;Mở sổ điểm&rdquo; để chỉnh sửa trực tiếp
                                  </span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse tabular-nums">
                                    <thead>
                                      <tr className="bg-slate-100/80 border-b border-[#E2E8F0] text-[11px] font-semibold text-slate-700">
                                        <th className="py-2 px-3 text-left">Lớp học</th>
                                        <th className="py-2 px-3 text-left">Môn học CTQT</th>
                                        <th className="py-2 px-3 text-center">Sĩ số</th>
                                        <th className="py-2 px-3 text-center">Đã có điểm</th>
                                        <th className="py-2 px-3 text-center">Đủ cột điểm</th>
                                        <th className="py-2 px-3 text-center">Nhận xét EN / VI</th>
                                        <th className="py-2 px-3 text-center">Duyệt sổ</th>
                                        <th className="py-2 px-3 text-right">Thao tác</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E2E8F0]">
                                      {t.slots.map(s => {
                                        const revMeta = getReviewStatusMeta(s.reviewStatus);
                                        return (
                                          <tr key={s.slotKey} className="hover:bg-[#F8FAFC] align-middle">
                                            <td className="py-2.5 px-3 font-bold text-[#003B3A]">
                                              {s.className}{" "}
                                              <span className="font-normal text-slate-500">
                                                ({s.campusName})
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                              <span className="font-bold text-slate-800">{s.subjectCode}</span>{" "}
                                              <span className="text-slate-600">— {s.subjectNameVi}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                              {s.totalStudents} HS
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                              <span
                                                className={`font-bold ${
                                                  s.progressStatus === "COMPLETED"
                                                    ? "text-[#059669]"
                                                    : s.progressStatus === "IN_PROGRESS"
                                                    ? "text-[#D97706]"
                                                    : "text-[#E11D48]"
                                                }`}
                                              >
                                                {s.gradedStudents}/{s.totalStudents} ({s.progressRate}%)
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-slate-700">
                                              {s.fullScoreStudents}/{s.totalStudents}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-slate-700">
                                              EN {s.commentEnStudents}/{s.totalStudents} • VI{" "}
                                              {s.commentViStudents}/{s.totalStudents}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                              <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${revMeta.badgeClass}`}
                                              >
                                                {revMeta.label}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                              <div className="inline-flex items-center gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenSlotDetail(s)}
                                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                  <Eye className="w-3 h-3" />
                                                  Xem HS
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    onOpenGradebook({
                                                      classId: s.classId,
                                                      subjectCode: s.subjectCode,
                                                    })
                                                  }
                                                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#00736E] border border-teal-200 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                  Mở sổ điểm
                                                  <ArrowUpRight className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
            <div className="font-bold text-[#003B3A]">
              Bảng tiến độ chi tiết theo từng lớp - môn CTQT ({filteredSlots.length} lượt môn)
            </div>
            <div className="text-[11px] text-slate-500">
              Nhấn &ldquo;Xem HS&rdquo; để kiểm tra danh sách học sinh còn thiếu điểm hoặc nhận xét
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 text-white min-w-[165px]">Lớp &amp; cơ sở</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[160px]">Môn học CTQT</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[200px]">Giáo viên phân công (GVBM)</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[180px]">Tiến độ điểm học sinh</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[135px]">Nhận xét EN / VI</th>
                  <th className="py-3 px-3 text-teal-100 min-w-[125px]">Cập nhật gần nhất</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4] min-w-[125px]">Tiến độ</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4] min-w-[110px]">Duyệt sổ</th>
                  <th className="py-3 px-3 text-right text-white min-w-[165px]">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {filteredSlots.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 px-4 text-center text-slate-500 font-semibold">
                      Không có lượt lớp - môn nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredSlots.map(s => {
                    const pBadge = getProgressBadgeMeta(s.progressStatus);
                    const rBadge = getReviewStatusMeta(s.reviewStatus);

                    return (
                      <tr key={s.slotKey} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 align-middle">
                          <div className="font-bold text-[#003B3A]">{s.className}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {s.campusName} •{" "}
                            {s.level === "PRIMARY"
                              ? "Tiểu học"
                              : s.level === "MIDDLE"
                              ? "THCS"
                              : "THPT"}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-middle">
                          <span className="inline-block font-bold px-2 py-0.5 rounded bg-[#003B3A] text-white text-[10px] mr-1.5">
                            {s.subjectCode}
                          </span>
                          <span className="font-semibold text-slate-800">{s.subjectNameVi}</span>
                        </td>

                        <td className="py-3 px-3 align-middle">
                          {s.isAssigned ? (
                            <div>
                              <div className="font-bold text-slate-800">{s.primaryTeacherName}</div>
                              <div className="text-[11px] text-slate-500">
                                Mã: <span className="font-mono">{s.primaryTeacherCode || "-"}</span>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenAssignTab({ classId: s.classId })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#E11D48] border border-rose-200 text-[11px] font-semibold cursor-pointer"
                            >
                              <UserPlus className="w-3 h-3" />
                              Chưa gán GVBM
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-800">
                              {s.gradedStudents} / {s.totalStudents} HS
                            </span>
                            <span className="font-black text-[#003B3A]">{s.progressRate}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`${pBadge.barClass} h-full rounded-full transition-all`}
                              style={{ width: `${Math.min(100, Math.max(0, s.progressRate))}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Đủ cột điểm: <strong className="text-slate-700">{s.fullScoreStudents}</strong>/
                            {s.totalStudents}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-middle text-[11px]">
                          <div>
                            EN: <strong className="text-slate-800">{s.commentEnStudents}</strong>/{s.totalStudents}
                          </div>
                          <div className="mt-0.5">
                            VI: <strong className="text-slate-800">{s.commentViStudents}</strong>/{s.totalStudents}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-middle text-[11px] text-slate-600 whitespace-nowrap">
                          {formatDateTimeVi(s.lastUpdatedAt)}
                        </td>

                        <td className="py-3 px-3 text-center align-middle">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${pBadge.badgeClass}`}
                          >
                            {pBadge.label}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center align-middle">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${rBadge.badgeClass}`}
                          >
                            {rBadge.label}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right align-middle">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenSlotDetail(s)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Xem HS
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onOpenGradebook({
                                  classId: s.classId,
                                  subjectCode: s.subjectCode,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              Sổ điểm
                              <ArrowUpRight className="w-3 h-3 text-[#5EEAD4]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: XEM CHI TIẾT HỌC SINH CỦA 1 LỚP - MÔN                        */}
      {/* ===================================================================== */}
      {detailSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight">
                  Chi tiết nhập điểm lớp {detailSlot.className} — {detailSlot.subjectNameVi} (
                  {detailSlot.subjectCode})
                </h3>
                <p className="text-xs text-teal-100/90 mt-0.5 tabular-nums">
                  GVBM phụ trách: {detailSlot.primaryTeacherName || "Chưa phân công"} • Đã có điểm:{" "}
                  {detailSlot.gradedStudents}/{detailSlot.totalStudents} học sinh ({detailSlot.progressRate}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailSlot(null)}
                className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyMissingInModal}
                  onChange={e => setOnlyMissingInModal(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#003B3A] rounded"
                />
                Chỉ hiện học sinh còn thiếu điểm hoặc thiếu nhận xét
              </label>

              <div className="flex items-center gap-2">
                {detailSlot.primaryTeacherId && detailSlot.progressStatus !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => {
                      const tid = detailSlot.primaryTeacherId!;
                      setDetailSlot(null);
                      handleOpenReminderModal([tid]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#D97706] border border-amber-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Nhắc GV môn này
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const target = { classId: detailSlot.classId, subjectCode: detailSlot.subjectCode };
                    setDetailSlot(null);
                    onOpenGradebook(target);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Mở sổ điểm để nhập / duyệt
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#5EEAD4]" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingDetail ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-500">
                  Đang tải danh sách học sinh...
                </div>
              ) : !detailData?.students || detailData.students.length === 0 ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-500">
                  Lớp chưa có danh sách học sinh đang học.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-2.5 px-3 text-center text-white w-12">STT</th>
                      <th className="py-2.5 px-3 text-white">Học sinh</th>
                      <th className="py-2.5 px-3 text-teal-100">Điểm thành phần đã nhập</th>
                      <th className="py-2.5 px-3 text-center text-teal-100">Nhận xét EN</th>
                      <th className="py-2.5 px-3 text-center text-teal-100">Nhận xét VI</th>
                      <th className="py-2.5 px-3 text-center text-[#5EEAD4]">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {detailData.students
                      .filter(st =>
                        onlyMissingInModal ? !st.hasFullScore || (!st.hasCommentEn && !st.hasCommentVi) : true
                      )
                      .map((st, idx) => (
                        <tr key={st.studentId} className="hover:bg-[#F8FAFC] align-middle">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">
                              {st.studentName}
                              {st.englishName ? (
                                <span className="font-normal text-[#00736E]"> ({st.englishName})</span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{st.studentCode}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            {st.hasAnyScore ? (
                              <span className="font-semibold text-slate-800">{st.scoreSummary}</span>
                            ) : (
                              <span className="text-[#E11D48] font-semibold">Chưa nhập điểm</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {st.hasCommentEn ? (
                              <span className="text-[#059669] font-semibold">Đã nhập</span>
                            ) : (
                              <span className="text-slate-400">Chưa có</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {st.hasCommentVi ? (
                              <span className="text-[#059669] font-semibold">Đã nhập</span>
                            ) : (
                              <span className="text-slate-400">Chưa có</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {st.hasFullScore ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
                                Đủ điểm
                              </span>
                            ) : st.hasAnyScore ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold">
                                Thiếu cột điểm ({st.filledCols}/{st.requiredCols})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#E11D48] border border-rose-200 text-[11px] font-semibold">
                                Chưa nhập
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: GỬI EMAIL NHẮC TIẾN ĐỘ NHẬP ĐIỂM CHO GIÁO VIÊN               */}
      {/* ===================================================================== */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/10 rounded-xl text-[#5EEAD4]">
                  <Mail className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Gửi email nhắc tiến độ nhập điểm CTQT
                  </h3>
                  <p className="text-xs text-teal-100/90 mt-0.5 tabular-nums">
                    Năm học {academicYearName} • Học kỳ {semester} • Đối tượng: {reminderTeacherIds.length} giáo viên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs tabular-nums">
              <label className="flex items-center gap-2.5 p-3 bg-[#F0FDFA] border border-teal-200 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyIncompleteReminder}
                  onChange={e => setOnlyIncompleteReminder(e.target.checked)}
                  className="w-4 h-4 accent-[#003B3A] rounded"
                />
                <span className="font-semibold text-[#003B3A]">
                  Chỉ liệt kê trong email các lớp - môn chưa đạt 100% học sinh có điểm
                </span>
              </label>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Ghi chú thời hạn / lời nhắn từ Ban KT&amp;ĐBCL (không bắt buộc)
                </label>
                <textarea
                  rows={3}
                  value={reminderCustomMessage}
                  onChange={e => setReminderCustomMessage(e.target.value)}
                  placeholder="Ví dụ: Kính nhờ Quý Thầy/Cô hoàn tất nhập điểm và nhận xét song ngữ trước 17h00 ngày 15/11 để Ban KT&ĐBCL tổng hợp xuất Report Card..."
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-[#008B85]"
                />
              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-slate-700">
                  Danh sách giáo viên nhận thông báo ({reminderTeacherIds.length})
                </div>
                <div className="max-h-[210px] overflow-y-auto divide-y divide-[#E2E8F0]">
                  {data.teachers
                    .filter(t => reminderTeacherIds.includes(t.teacherId))
                    .map(t => (
                      <div key={t.teacherId} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800">{t.teacherName}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {t.email || <span className="text-[#D97706]">Chưa có email (sẽ tự động bỏ qua)</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold">
                            Chưa xong {t.incompleteSlots}/{t.slotCount} môn ({t.progressRate}%)
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendReminders}
                disabled={sendingReminder}
                className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                {sendingReminder ? "Đang gửi email..." : "Xác nhận gửi email nhắc nhở"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
