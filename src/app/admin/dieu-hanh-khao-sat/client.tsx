"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  History,
  Layers,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  ENTRANCE_WORKFLOW_STAGES,
  ENTRANCE_STAGE_STATUS_META,
  DELIVERY_STATUS_META,
  EXCEPTION_TYPE_META,
  DEADLINE_ALERT_META,
  EntranceStageStatus,
  NotificationDeliveryStatus,
  EntranceExceptionType,
  canUserConfirmStage,
  getStageDefinition,
} from "@/lib/entrance-progress/constants";
import type {
  StudentProgressRow,
  BatchProgressRow,
  AssigneeTaskRow,
  BacklogItem,
} from "@/lib/entrance-progress/entranceProgressEngine";

interface DashboardProps {
  initialData: any;
  currentUser: {
    id: string;
    fullName: string;
    role: string;
    email?: string;
    isSuperAdmin?: boolean;
    campusIds?: string[];
  };
  rolePermissions?: any[];
}

export function EntranceOperationsDashboardClient({
  initialData,
  currentUser,
}: DashboardProps) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(
    null
  );

  const notify = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Bộ lọc điều hành ───
  const [academicYearId, setAcademicYearId] = useState<string>(
    initialData?.filterOptions?.activeAcademicYearId || ""
  );
  const [level, setLevel] = useState<"ALL" | "K12" | "PRESCHOOL">("ALL");
  const [periodId, setPeriodId] = useState<string>("ALL");
  const [batchId, setBatchId] = useState<string>("ALL");
  const [campusCode, setCampusCode] = useState<string>("ALL");
  const [educationSystem, setEducationSystem] = useState<string>("ALL");
  const [grade, setGrade] = useState<string>("ALL");
  const [stageNumberFilter, setStageNumberFilter] = useState<number>(0);
  const [stageStatusFilter, setStageStatusFilter] = useState<string>("ALL");
  const [milestoneFilter, setMilestoneFilter] = useState<string>("ALL");
  const [alertFilter, setAlertFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ─── Tab hiển thị & Biểu đồ ───
  const [activeTab, setActiveTab] = useState<
    "students" | "batches" | "assignees" | "backlog" | "audit"
  >("students");
  const [showChart, setShowChart] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // ─── Выбор nhiều học sinh (Bulk selection) ───
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // ─── Modal Chi tiết & Xác nhận Học sinh / Công đoạn ───
  const [detailStudent, setDetailStudent] = useState<StudentProgressRow | null>(
    null
  );
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    targetScope: "BATCH" | "STUDENT" | "ASSIGNMENT";
    action: "CONFIRM" | "REQUEST_ADJUSTMENT" | "SET_EXCEPTION" | "UPDATE_DELIVERY";
    stageNumber: number;
    periodId: string;
    batchId: string | null;
    isPreschool: boolean;
    studentIds: string[];
    assignmentId?: string | null;
    studentSummary?: string;
    currentAdmissionResult?: string | null;
    canIssueCongrat?: boolean;
  } | null>(null);

  const [modalForm, setModalForm] = useState<{
    status: EntranceStageStatus;
    admissionResult: string;
    deliveryStatus: NotificationDeliveryStatus;
    exceptionType: EntranceExceptionType;
    documentTypes: string[];
    note: string;
  }>({
    status: "COMPLETED",
    admissionResult: "Đạt",
    deliveryStatus: "SENT",
    exceptionType: "NONE",
    documentTypes: ["Thư chúc mừng", "Phiếu kết quả"],
    note: "",
  });

  // ─── Hàm tải dữ liệu từ API ───
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (academicYearId) params.set("academicYearId", academicYearId);
      if (level !== "ALL") params.set("level", level);
      if (periodId !== "ALL") params.set("periodId", periodId);
      if (batchId !== "ALL") params.set("batchId", batchId);
      if (campusCode !== "ALL") params.set("campusCode", campusCode);
      if (educationSystem !== "ALL")
        params.set("educationSystem", educationSystem);
      if (grade !== "ALL") params.set("grade", grade);
      if (stageNumberFilter > 0)
        params.set("stageNumber", String(stageNumberFilter));
      if (stageStatusFilter !== "ALL")
        params.set("stageStatus", stageStatusFilter);
      if (milestoneFilter !== "ALL")
        params.set("milestoneFilter", milestoneFilter);
      if (alertFilter !== "ALL") params.set("alertFilter", alertFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(
        `/api/admin/entrance-progress?${params.toString()}`
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
        if (detailStudent) {
          const updatedStu = (json.studentRows || []).find(
            (s: StudentProgressRow) => s.id === detailStudent.id
          );
          if (updatedStu) setDetailStudent(updatedStu);
        }
      } else {
        notify(json.error || "Không thể tải dữ liệu tiến độ khảo sát.", "err");
      }
    } catch (err: any) {
      notify("Lỗi kết nối máy chủ: " + (err?.message || ""), "err");
    } finally {
      setLoading(false);
    }
  }, [
    academicYearId,
    level,
    periodId,
    batchId,
    campusCode,
    educationSystem,
    grade,
    stageNumberFilter,
    stageStatusFilter,
    milestoneFilter,
    alertFilter,
    searchQuery,
    detailStudent,
    notify,
  ]);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    academicYearId,
    level,
    periodId,
    batchId,
    campusCode,
    educationSystem,
    grade,
    stageNumberFilter,
    stageStatusFilter,
    milestoneFilter,
    alertFilter,
  ]);

  const kpis = data?.kpis || {
    totalBatches: 0,
    totalStudents: 0,
    workCompletedCount: 0,
    workCompletedPct: 0,
    approvalCompletedCount: 0,
    approvalCompletedPct: 0,
    approvedPassCount: 0,
    pendingApprovalCount: 0,
    handoverCompletedCount: 0,
    notificationSentCount: 0,
    notificationSentPct: 0,
    parentReadCount: 0,
    parentReadPct: 0,
    backlogCount: 0,
    dueSoonCount: 0,
    overdueCount: 0,
    needsAdjustmentCount: 0,
    exceptionCount: 0,
  };

  const stageChartData = useMemo(
    () => data?.stageChartData || [],
    [data?.stageChartData]
  );
  const studentRows: StudentProgressRow[] = useMemo(
    () => data?.studentRows || [],
    [data?.studentRows]
  );
  const batchRows: BatchProgressRow[] = useMemo(
    () => data?.batchProgressRows || [],
    [data?.batchProgressRows]
  );
  const assigneeRows: AssigneeTaskRow[] = useMemo(
    () => data?.assigneeRows || [],
    [data?.assigneeRows]
  );
  const backlogItems: BacklogItem[] = useMemo(
    () => data?.backlogItems || [],
    [data?.backlogItems]
  );
  const auditLogs: any[] = useMemo(() => data?.auditLogs || [], [data?.auditLogs]);
  const filterOptions = data?.filterOptions || {
    academicYears: [],
    campuses: [],
    periods: [],
    grades: [],
    educationSystems: [],
  };

  // Danh sách đợt theo kỳ đã chọn
  const availableBatches = useMemo(() => {
    if (periodId === "ALL") {
      const list: any[] = [];
      for (const p of filterOptions.periods || []) {
        for (const b of p.batches || []) {
          list.push({ ...b, periodName: p.name });
        }
      }
      return list;
    }
    const selPeriod = (filterOptions.periods || []).find(
      (p: any) => p.id === periodId
    );
    return selPeriod?.batches || [];
  }, [periodId, filterOptions.periods]);

  // Phân trang danh sách học sinh
  const totalPages = Math.max(1, Math.ceil(studentRows.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return studentRows.slice(start, start + pageSize);
  }, [studentRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedStudentIds([]);
  }, [
    academicYearId,
    level,
    periodId,
    batchId,
    campusCode,
    educationSystem,
    grade,
    stageNumberFilter,
    stageStatusFilter,
    milestoneFilter,
    alertFilter,
  ]);

  const resetFilters = () => {
    setLevel("ALL");
    setPeriodId("ALL");
    setBatchId("ALL");
    setCampusCode("ALL");
    setEducationSystem("ALL");
    setGrade("ALL");
    setStageNumberFilter(0);
    setStageStatusFilter("ALL");
    setMilestoneFilter("ALL");
    setAlertFilter("ALL");
    setSearchQuery("");
  };

  // ─── Mở Modal Xác nhận ───
  const openActionModal = (params: {
    title: string;
    targetScope: "BATCH" | "STUDENT" | "ASSIGNMENT";
    action: "CONFIRM" | "REQUEST_ADJUSTMENT" | "SET_EXCEPTION" | "UPDATE_DELIVERY";
    stageNumber: number;
    periodId: string;
    batchId: string | null;
    isPreschool: boolean;
    studentIds?: string[];
    assignmentId?: string | null;
    studentSummary?: string;
    currentAdmissionResult?: string | null;
    canIssueCongrat?: boolean;
    defaultDeliveryStatus?: NotificationDeliveryStatus;
  }) => {
    const canCongrat = params.canIssueCongrat ?? true;
    setModalForm({
      status:
        params.action === "REQUEST_ADJUSTMENT"
          ? "NEEDS_ADJUSTMENT"
          : "COMPLETED",
      admissionResult: params.currentAdmissionResult || "Đạt",
      deliveryStatus: params.defaultDeliveryStatus || "SENT",
      exceptionType: "EXEMPT",
      documentTypes: canCongrat
        ? ["Thư chúc mừng", "Phiếu kết quả khảo sát"]
        : ["Thông báo kết quả khảo sát"],
      note: "",
    });
    setConfirmModal({
      open: true,
      title: params.title,
      targetScope: params.targetScope,
      action: params.action,
      stageNumber: params.stageNumber,
      periodId: params.periodId,
      batchId: params.batchId,
      isPreschool: params.isPreschool,
      studentIds: params.studentIds || [],
      assignmentId: params.assignmentId || null,
      studentSummary: params.studentSummary,
      currentAdmissionResult: params.currentAdmissionResult,
      canIssueCongrat: canCongrat,
    });
  };

  // ─── Gửi yêu cầu xác nhận lên Backend ───
  const handleConfirmSubmit = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/entrance-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirmModal.action,
          targetScope: confirmModal.targetScope,
          academicYearId,
          isPreschool: confirmModal.isPreschool,
          periodId: confirmModal.periodId,
          batchId: confirmModal.batchId,
          studentIds: confirmModal.studentIds,
          assignmentId: confirmModal.assignmentId,
          stageNumber: confirmModal.stageNumber,
          status: modalForm.status,
          admissionResult:
            confirmModal.stageNumber === 6
              ? modalForm.admissionResult
              : confirmModal.currentAdmissionResult,
          deliveryStatus: modalForm.deliveryStatus,
          exceptionType: modalForm.exceptionType,
          documentTypes: modalForm.documentTypes,
          note: modalForm.note,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify(json.message || "Đã xác nhận và đồng bộ trạng thái thành công!", "ok");
        setConfirmModal(null);
        setSelectedStudentIds([]);
        await fetchDashboard();
      } else {
        notify(json.error || "Không thể thực hiện xác nhận.", "err");
      }
    } catch (err: any) {
      notify("Lỗi xử lý: " + (err?.message || ""), "err");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Xuất Báo cáo Tiến độ Excel (4 Sheets) ───
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Tổng hợp Tiến độ theo Đợt & 8 Công đoạn
      const stageSheetRows = stageChartData.map((s: any) => ({
        "Công đoạn": s.shortName,
        "Tên đầy đủ": s.name,
        "Vai trò phụ trách": s.responsibleLabel,
        "Tổng hồ sơ": s.total,
        "Hoàn thành": s.completed,
        "Đang thực hiện": s.inProgress,
        "Cần điều chỉnh": s.needsAdjustment,
        "Chưa bắt đầu": s.notStarted,
        "Không áp dụng": s.notApplicable,
        "Tỷ lệ hoàn thành (%)": `${s.completionPct}%`,
      }));
      const wsStages = XLSX.utils.json_to_sheet(stageSheetRows);
      XLSX.utils.book_append_sheet(wb, wsStages, "1_Tien_Do_8_Cong_Doan");

      // Sheet 2: Tiến độ Học sinh 8 Bước
      const studentSheetRows = studentRows.map((s, idx) => ({
        STT: idx + 1,
        "Mã HS": s.studentCode,
        "Họ và tên": s.fullName,
        "Cấp học": s.isPreschool ? "Mầm non" : "Phổ thông K-12",
        Khối: s.grade,
        "Hệ đào tạo": s.educationSystem,
        "Cơ sở": s.campusName,
        "Kỳ khảo sát": s.periodName,
        "Đợt khảo sát": s.batchName,
        "B1. Tạo đợt": ENTRANCE_STAGE_STATUS_META[s.stages[0]?.status]?.label || "",
        "B2. Nhập DS": ENTRANCE_STAGE_STATUS_META[s.stages[1]?.status]?.label || "",
        "B3. Phân công GV": ENTRANCE_STAGE_STATUS_META[s.stages[2]?.status]?.label || "",
        "B4. GV đánh giá": ENTRANCE_STAGE_STATUS_META[s.stages[3]?.status]?.label || "",
        "B5. Định hướng": ENTRANCE_STAGE_STATUS_META[s.stages[4]?.status]?.label || "",
        "B6. Thẩm định & Duyệt": ENTRANCE_STAGE_STATUS_META[s.stages[5]?.status]?.label || "",
        "B7. Bàn giao Tư vấn": ENTRANCE_STAGE_STATUS_META[s.stages[6]?.status]?.label || "",
        "Hoàn thành Công việc CM": s.isWorkCompleted ? "Đã hoàn thành" : "Chưa xong",
        "Hoàn thành Xét duyệt": s.isApprovalCompleted ? "Đã phê duyệt" : "Chờ duyệt",
        "Kết luận Tuyển sinh": s.admissionResult || "Chưa kết luận",
        "Bàn giao Tư vấn": s.stages[6]?.status === "COMPLETED" ? "Đã bàn giao" : "Chưa bàn giao",
        "Ngoại lệ / Đặc biệt": EXCEPTION_TYPE_META[s.exceptionType]?.label || "Tiêu chuẩn",
        "Cảnh báo hạn": s.deadlineAlert.label,
        "Tiến độ tổng (%)": `${s.overallProgressPct}%`,
      }));
      const wsStudents = XLSX.utils.json_to_sheet(studentSheetRows);
      XLSX.utils.book_append_sheet(wb, wsStudents, "2_Tien_Do_Hoc_Sinh");

      // Sheet 3: Nhiệm vụ theo Người phụ trách
      const assigneeSheetRows = assigneeRows.map((a, idx) => ({
        STT: idx + 1,
        "Người phụ trách": a.fullName,
        "Vai trò": a.roleLabel,
        "Cơ sở": a.campusName,
        "Công đoạn": a.stageName,
        "Kỳ khảo sát": a.periodName,
        "Đợt khảo sát": a.batchName,
        "Phạm vi phụ trách": a.scopeDescription,
        "Tổng HS": a.totalStudents,
        "Đã hoàn thành": a.completedStudents,
        "Đang thực hiện": a.inProgressStudents,
        "Cần điều chỉnh": a.needsAdjustmentStudents,
        "Chưa bắt đầu": a.notStartedStudents,
        "Tiến độ (%)": `${a.completionPct}%`,
        "Xác nhận hoàn thành": a.isConfirmedComplete ? "Đã xác nhận" : "Chưa xác nhận",
        "Cảnh báo hạn": a.deadlineAlert.label,
      }));
      const wsAssignees = XLSX.utils.json_to_sheet(assigneeSheetRows);
      XLSX.utils.book_append_sheet(wb, wsAssignees, "3_Nhiem_Vu_Phu_Trach");

      // Sheet 4: Hồ sơ Tồn đọng
      const backlogSheetRows = backlogItems.map((b, idx) => ({
        STT: idx + 1,
        "Mã HS": b.studentCode,
        "Họ và tên": b.fullName,
        Khối: b.grade,
        "Hệ đào tạo": b.educationSystem,
        "Cơ sở": b.campusName,
        "Đợt khảo sát": `${b.periodName} - ${b.batchName}`,
        "Công đoạn tồn đọng": b.bottleneckStageName,
        "Nguyên nhân tồn đọng": b.reason,
        "Bộ phận phụ trách": b.responsibleRoleLabel,
        "Người thực hiện": b.assigneeNames,
        "Cảnh báo hạn": b.deadlineAlert.label,
      }));
      const wsBacklog = XLSX.utils.json_to_sheet(backlogSheetRows);
      XLSX.utils.book_append_sheet(wb, wsBacklog, "4_Ho_So_Ton_Dong");

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Bao_Cao_Dieu_Hanh_Tien_Do_KSDV_SkyLine_${dateStr}.xlsx`);
      notify("Đã xuất báo cáo tiến độ Excel (4 Sheets) thành công!", "ok");
    } catch (err: any) {
      notify("Lỗi khi xuất Excel: " + (err?.message || ""), "err");
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[500] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs sm:text-sm font-bold animate-in slide-in-from-top-3 duration-300 ${
            toast.type === "ok"
              ? "bg-[#003B3A] text-white border-[#00A19A]"
              : "bg-rose-600 text-white border-rose-400"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="w-5 h-5 text-[#00A19A] shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── HEADER BANNER SKY-LINE ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00736E] text-white p-6 sm:p-7 shadow-xl border border-teal-700/40">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold uppercase tracking-wider text-teal-200">
              <Activity className="w-3.5 h-3.5 text-[#48BFE3]" />
              <span>Trung tâm Điều hành Tuyển sinh & Khảo thí Sky-Line</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Điều hành & Tiến độ Khảo sát Đầu vào
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-3xl">
              Giám sát thời gian thực toàn trình từ Tạo đợt → Nhập danh sách → Phân công GV → Đánh giá → Định hướng → Thẩm định xét duyệt → Bàn giao kết quả, văn bản cho Tư vấn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchDashboard()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới dữ liệu</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00A19A] hover:bg-[#008f89] text-xs font-bold text-white shadow-lg shadow-black/15 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Báo cáo Tiến độ Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── KHU VỰC 1: KPI TỔNG HỢP TIẾN ĐỘ (PHÂN BIỆT RÕ 3 MỐC + CẢNH BÁO HẠN) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Card 1: Tổng quy mô */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Tổng Quy mô Khảo sát
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#003B3A]">
                  {kpis.totalStudents}
                </span>
                <span className="text-xs font-bold text-slate-500">học sinh</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#003B3A]/10 text-[#003B3A] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Thuộc <strong className="text-slate-800">{kpis.totalBatches}</strong> đợt KS
            </span>
            {kpis.exceptionCount > 0 && (
              <button
                onClick={() => setMilestoneFilter("EXCEPTION")}
                className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold text-[11px] hover:bg-violet-100 transition-colors cursor-pointer"
              >
                {kpis.exceptionCount} Miễn/KS lại/Ngoại lệ
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Mốc 1 - Hoàn thành Công việc Chuyên môn (Bước 1 -> 5) */}
        <div
          onClick={() =>
            setMilestoneFilter(
              milestoneFilter === "WORK_COMPLETED" ? "ALL" : "WORK_COMPLETED"
            )
          }
          className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            milestoneFilter === "WORK_COMPLETED"
              ? "border-[#00A19A] ring-2 ring-[#00A19A]/20"
              : "border-slate-200/90 hover:border-teal-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#00736E]">
                1. Hoàn thành Công việc CM
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#00736E]">
                  {kpis.workCompletedCount}/{kpis.totalStudents}
                </span>
                <span className="text-xs font-extrabold text-teal-600">
                  ({kpis.workCompletedPct}%)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00A19A] rounded-full transition-all"
                style={{ width: `${kpis.workCompletedPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 font-medium">
              Đủ kết quả đánh giá (B4) & Bản định hướng (B5)
            </p>
          </div>
        </div>

        {/* Card 3: Mốc 2 - Hoàn thành Xét duyệt (Bước 6) */}
        <div
          onClick={() =>
            setMilestoneFilter(
              milestoneFilter === "APPROVAL_COMPLETED"
                ? "ALL"
                : "APPROVAL_COMPLETED"
            )
          }
          className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            milestoneFilter === "APPROVAL_COMPLETED"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-slate-200/90 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                2. Hoàn thành Xét duyệt
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">
                  {kpis.approvalCompletedCount}/{kpis.totalStudents}
                </span>
                <span className="text-xs font-extrabold text-emerald-600">
                  ({kpis.approvalCompletedPct}%)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold">
              Đạt/Đủ ĐK thư: {kpis.approvedPassCount} HS
            </span>
            <span className="text-amber-600 font-bold">
              Chờ duyệt: {kpis.pendingApprovalCount} HS
            </span>
          </div>
        </div>

        {/* Card 4: Mốc 3 - Hoàn thành Bàn giao Tư vấn (Bước 7) */}
        <div
          onClick={() =>
            setMilestoneFilter(
              milestoneFilter === "NOTIFICATION_SENT"
                ? "ALL"
                : "NOTIFICATION_SENT"
            )
          }
          className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            milestoneFilter === "NOTIFICATION_SENT"
              ? "border-sky-500 ring-2 ring-sky-500/20"
              : "border-slate-200/90 hover:border-sky-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-sky-700">
                3. Hoàn thành Bàn giao Tư vấn
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-sky-700">
                  {kpis.handoverCompletedCount}/{kpis.totalStudents}
                </span>
                <span className="text-xs font-extrabold text-sky-600">
                  ({kpis.totalStudents > 0 ? Math.round((kpis.handoverCompletedCount / kpis.totalStudents) * 100) : 0}% đã bàn giao)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-semibold">
              Đã bàn giao hồ sơ & văn bản cho Tư vấn
            </span>
          </div>
        </div>

        {/* Card 5: Cảnh báo Gần hạn / Quá hạn / Cần điều chỉnh */}
        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">
                Cảnh báo Hạn & Tồn đọng
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-600">
                  {kpis.overdueCount + kpis.dueSoonCount}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  cảnh báo hạn
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              onClick={() =>
                setAlertFilter(alertFilter === "OVERDUE" ? "ALL" : "OVERDUE")
              }
              className={`px-2 py-0.5 rounded-full font-bold cursor-pointer border ${
                alertFilter === "OVERDUE"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              Quá hạn: {kpis.overdueCount}
            </button>
            <button
              onClick={() =>
                setAlertFilter(alertFilter === "DUE_SOON" ? "ALL" : "DUE_SOON")
              }
              className={`px-2 py-0.5 rounded-full font-bold cursor-pointer border ${
                alertFilter === "DUE_SOON"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              Gần hạn: {kpis.dueSoonCount}
            </button>
            <button
              onClick={() =>
                setStageStatusFilter(
                  stageStatusFilter === "NEEDS_ADJUSTMENT"
                    ? "ALL"
                    : "NEEDS_ADJUSTMENT"
                )
              }
              className={`px-2 py-0.5 rounded-full font-bold cursor-pointer border ${
                stageStatusFilter === "NEEDS_ADJUSTMENT"
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-orange-50 text-orange-700 border-orange-200"
              }`}
            >
              Cần ĐC: {kpis.needsAdjustmentCount}
            </button>
          </div>
        </div>
      </div>

      {/* ─── KHU VỰC 2: THANH PIPELINE LIÊN THÔNG 7 CÔNG ĐOẠN & BIỂU ĐỒ TIẾN ĐỘ ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#003B3A] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00A19A]" />
              <span>Chuỗi 7 Công đoạn Khảo sát Đầu vào & Liên kết Xử lý Trực tiếp</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bấm vào từng công đoạn để lọc hồ sơ hoặc bấm biểu tượng mũi tên để chuyển thẳng tới màn hình nghiệp vụ tương ứng.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stageNumberFilter > 0 && (
              <button
                onClick={() => setStageNumberFilter(0)}
                className="px-3 py-1.5 rounded-xl bg-teal-50 text-[#00736E] border border-teal-200 text-xs font-bold hover:bg-teal-100 cursor-pointer"
              >
                Bỏ lọc Công đoạn {stageNumberFilter} ✕
              </button>
            )}
            <button
              onClick={() => setShowChart((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#00A19A]" />
              <span>{showChart ? "Thu gọn biểu đồ" : "Mở biểu đồ tiến độ"}</span>
              {showChart ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 7-Stage Interactive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {stageChartData.map((stg: any) => {
            const isSelected = stageNumberFilter === stg.stageNumber;
            const targetHref =
              level === "PRESCHOOL"
                ? stg.defaultHrefPreschool
                : stg.defaultHrefK12;
            const canConfirm = canUserConfirmStage(
              currentUser?.role,
              stg.stageNumber,
              currentUser?.isSuperAdmin
            );

            return (
              <div
                key={stg.stageNumber}
                onClick={() =>
                  setStageNumberFilter(
                    isSelected ? 0 : Number(stg.stageNumber)
                  )
                }
                className={`group relative rounded-2xl border p-3 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#003B3A] text-white border-[#003B3A] shadow-md scale-[1.01]"
                    : "bg-slate-50/70 hover:bg-white border-slate-200/90 hover:border-[#00A19A] hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isSelected
                          ? "bg-[#00A19A] text-white"
                          : stg.milestoneGroup === "WORK"
                          ? "bg-teal-100/80 text-[#00736E]"
                          : stg.milestoneGroup === "APPROVAL"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      Bước {stg.stageNumber}
                    </span>
                    <Link
                      href={targetHref}
                      onClick={(e) => e.stopPropagation()}
                      title={`Mở màn hình: ${stg.name}`}
                      className={`p-1 rounded-lg transition-colors ${
                        isSelected
                          ? "text-teal-200 hover:bg-white/15 hover:text-white"
                          : "text-slate-400 hover:bg-teal-50 hover:text-[#00736E]"
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <p
                    className={`text-xs font-extrabold leading-snug line-clamp-2 ${
                      isSelected ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {stg.name}
                  </p>
                  <p
                    className={`text-[10px] mt-1 font-semibold truncate ${
                      isSelected ? "text-teal-200" : "text-slate-500"
                    }`}
                    title={stg.responsibleLabel}
                  >
                    👤 {stg.responsibleLabel}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/50 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span className={isSelected ? "text-teal-200" : "text-[#00736E]"}>
                      {stg.completionPct}% hoàn thành
                    </span>
                    <span className={isSelected ? "text-white" : "text-slate-700"}>
                      {stg.completed}/{stg.total - stg.notApplicable}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00A19A] rounded-full transition-all"
                      style={{ width: `${stg.completionPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold pt-0.5">
                    <span
                      className={
                        isSelected ? "text-amber-300" : "text-teal-700"
                      }
                    >
                      Đang làm: {stg.inProgress}
                    </span>
                    {stg.needsAdjustment > 0 ? (
                      <span
                        className={
                          isSelected ? "text-rose-300" : "text-rose-600"
                        }
                      >
                        Cần ĐC: {stg.needsAdjustment}
                      </span>
                    ) : (
                      <span
                        className={
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }
                      >
                        Chưa BĐ: {stg.notStarted}
                      </span>
                    )}
                  </div>
                  {canConfirm && (
                    <div
                      className={`text-[9.5px] font-bold truncate pt-0.5 ${
                        isSelected ? "text-emerald-300" : "text-emerald-700"
                      }`}
                    >
                      ✓ Quyền: {stg.confirmButtonLabel}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Biểu đồ Recharts Tiến độ 8 Giai đoạn */}
        {showChart && stageChartData.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={stageChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: "#00736E" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="completed"
                    name="Hoàn thành"
                    stackId="a"
                    fill="#10B981"
                    radius={[0, 0, 0, 0]}
                    barSize={34}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="inProgress"
                    name="Đang thực hiện"
                    stackId="a"
                    fill="#00A19A"
                    barSize={34}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="needsAdjustment"
                    name="Cần điều chỉnh"
                    stackId="a"
                    fill="#F43F5E"
                    barSize={34}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="notStarted"
                    name="Chưa bắt đầu"
                    stackId="a"
                    fill="#CBD5E1"
                    radius={[6, 6, 0, 0]}
                    barSize={34}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completionPct"
                    name="Tỷ lệ hoàn thành (%)"
                    stroke="#003B3A"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#003B3A" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ─── KHU VỰC 3: BỘ LỌC ĐIỀU HÀNH ĐA CHIỀU ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#003B3A]">
            <Filter className="w-4 h-4 text-[#00A19A]" />
            <span>Bộ lọc Điều hành (Đợt • Cơ sở • Hệ • Khối • Trạng thái)</span>
          </div>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#00736E] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5">
          {/* Năm học */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Năm học
            </label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A19A]"
            >
              {(filterOptions.academicYears || []).map((ay: any) => (
                <option key={ay.id} value={ay.id}>
                  Năm học {ay.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cấp học */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Bậc học
            </label>
            <select
              value={level}
              onChange={(e) =>
                setLevel(e.target.value as "ALL" | "K12" | "PRESCHOOL")
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả (K-12 & Mầm non)</option>
              <option value="K12">Phổ thông (K-12)</option>
              <option value="PRESCHOOL">Mầm non</option>
            </select>
          </div>

          {/* Kỳ khảo sát */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Kỳ khảo sát
            </label>
            <select
              value={periodId}
              onChange={(e) => {
                setPeriodId(e.target.value);
                setBatchId("ALL");
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả kỳ khảo sát</option>
              {(filterOptions.periods || []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.isPreschool ? "[MN] " : "[K12] "}
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Đợt khảo sát */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Đợt khảo sát
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả các đợt</option>
              {availableBatches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.periodName ? `(${b.periodName})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cơ sở */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Cơ sở
            </label>
            <select
              value={campusCode}
              onChange={(e) => setCampusCode(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả cơ sở</option>
              {(filterOptions.campuses || []).map((c: any) => (
                <option key={c.id} value={c.campusCode}>
                  {c.campusName} ({c.campusCode})
                </option>
              ))}
            </select>
          </div>

          {/* Hệ đào tạo */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Hệ đào tạo
            </label>
            <select
              value={educationSystem}
              onChange={(e) => setEducationSystem(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả hệ</option>
              {(filterOptions.educationSystems || []).map((sys: string) => (
                <option key={sys} value={sys}>
                  {sys}
                </option>
              ))}
            </select>
          </div>

          {/* Khối lớp */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Khối / Nhóm lớp
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả khối</option>
              {(filterOptions.grades || []).map((g: string) => (
                <option key={g} value={g}>
                  {g.startsWith("Khối") || g.includes("tháng") || g.includes("tuổi")
                    ? g
                    : `Khối ${g}`}
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái bước */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Trạng thái bước
            </label>
            <select
              value={stageStatusFilter}
              onChange={(e) => setStageStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NOT_STARTED">Chưa bắt đầu</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="NEEDS_ADJUSTMENT">Cần điều chỉnh</option>
              <option value="NOT_APPLICABLE">Không áp dụng</option>
            </select>
          </div>
        </div>

        {/* Hàng tìm kiếm & Bộ lọc nhanh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchDashboard();
              }}
              placeholder="Tìm theo Mã HS, Họ tên học sinh, Giáo viên phụ trách, Đợt..."
              className="w-full pl-9 pr-20 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#00A19A]"
            />
            <button
              onClick={() => fetchDashboard()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#003B3A] text-white text-[11px] font-bold hover:bg-[#005B58] cursor-pointer"
            >
              Tìm
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-bold mr-1">Lọc nhanh:</span>
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "WORK_COMPLETED", label: "✓ Xong Công việc CM" },
              { id: "APPROVAL_COMPLETED", label: "✓ Xong Xét duyệt" },
              { id: "NOTIFICATION_SENT", label: "✓ Đã bàn giao Tư vấn" },
              { id: "EXCEPTION", label: "★ Miễn/KS lại/Ngoại lệ" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMilestoneFilter(item.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                  milestoneFilter === item.id
                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── KHU VỰC 4: CÁC TAB GIÁM SÁT & THAO TÁC ĐIỀU HÀNH ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Thanh chọn Tab */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 pt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              {
                id: "students",
                label: `Bảng Tiến độ Học sinh (${studentRows.length})`,
                icon: GraduationCap,
              },
              {
                id: "batches",
                label: `Tiến độ theo Đợt KS (${batchRows.length})`,
                icon: Calendar,
              },
              {
                id: "assignees",
                label: `Nhiệm vụ theo Người phụ trách (${assigneeRows.length})`,
                icon: UserCheck,
              },
              {
                id: "backlog",
                label: `Hồ sơ đang tồn đọng (${backlogItems.length})`,
                icon: AlertCircle,
                badgeColor:
                  backlogItems.length > 0
                    ? "bg-rose-500 text-white"
                    : "bg-slate-200 text-slate-600",
              },
              {
                id: "audit",
                label: `Lịch sử Xác nhận & Kiểm soát (${auditLogs.length})`,
                icon: History,
              },
            ].map((t) => {
              const Icon = t.icon;
              const isAct = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                    isAct
                      ? "bg-white text-[#003B3A] border-[#00A19A] shadow-2xs"
                      : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-white/60"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isAct ? "text-[#00A19A]" : "text-slate-400"
                    }`}
                  />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── TAB 1: BẢNG TIẾN ĐỘ HỌC SINH (MA TRẬN 8 CÔNG ĐOẠN) ─── */}
        {activeTab === "students" && (
          <div className="p-4 space-y-4">
            {/* Thanh thao tác hàng loạt khi chọn Học sinh */}
            {selectedStudentIds.length > 0 && (
              <div className="bg-[#003B3A] text-white rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-[#00A19A] text-white font-black">
                    Đã chọn {selectedStudentIds.length} học sinh
                  </span>
                  <span className="text-teal-100">
                    Chọn công đoạn cần xác nhận hàng loạt:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canUserConfirmStage(
                    currentUser.role,
                    4,
                    currentUser.isSuperAdmin
                  ) && (
                    <button
                      onClick={() => {
                        const first = studentRows.find((s) =>
                          selectedStudentIds.includes(s.id)
                        );
                        if (!first) return;
                        openActionModal({
                          title: `GV xác nhận hoàn thành đánh giá (${selectedStudentIds.length} HS)`,
                          targetScope: "STUDENT",
                          action: "CONFIRM",
                          stageNumber: 4,
                          periodId: first.periodId,
                          batchId: first.batchId,
                          isPreschool: first.isPreschool,
                          studentIds: selectedStudentIds,
                          studentSummary: `${selectedStudentIds.length} học sinh đã chọn`,
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white cursor-pointer"
                    >
                      B4. Xác nhận Đánh giá
                    </button>
                  )}
                  {canUserConfirmStage(
                    currentUser.role,
                    5,
                    currentUser.isSuperAdmin
                  ) && (
                    <button
                      onClick={() => {
                        const first = studentRows.find((s) =>
                          selectedStudentIds.includes(s.id)
                        );
                        if (!first) return;
                        openActionModal({
                          title: `Xác nhận hoàn thành Bản định hướng (${selectedStudentIds.length} HS)`,
                          targetScope: "STUDENT",
                          action: "CONFIRM",
                          stageNumber: 5,
                          periodId: first.periodId,
                          batchId: first.batchId,
                          isPreschool: first.isPreschool,
                          studentIds: selectedStudentIds,
                          studentSummary: `${selectedStudentIds.length} học sinh đã chọn`,
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white cursor-pointer"
                    >
                      B5. Xác nhận Định hướng
                    </button>
                  )}
                  {canUserConfirmStage(
                    currentUser.role,
                    6,
                    currentUser.isSuperAdmin
                  ) && (
                    <button
                      onClick={() => {
                        const first = studentRows.find((s) =>
                          selectedStudentIds.includes(s.id)
                        );
                        if (!first) return;
                        openActionModal({
                          title: `Phê duyệt kết luận tuyển sinh (${selectedStudentIds.length} HS)`,
                          targetScope: "STUDENT",
                          action: "CONFIRM",
                          stageNumber: 6,
                          periodId: first.periodId,
                          batchId: first.batchId,
                          isPreschool: first.isPreschool,
                          studentIds: selectedStudentIds,
                          studentSummary: `${selectedStudentIds.length} học sinh đã chọn`,
                          currentAdmissionResult: first.admissionResult || "Đạt",
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
                    >
                      B6. Phê duyệt Kết luận
                    </button>
                  )}
                  {canUserConfirmStage(
                    currentUser.role,
                    7,
                    currentUser.isSuperAdmin
                  ) && (
                    <button
                      onClick={() => {
                        const first = studentRows.find((s) =>
                          selectedStudentIds.includes(s.id)
                        );
                        if (!first) return;
                        const allCanCongrat = studentRows
                          .filter((s) => selectedStudentIds.includes(s.id))
                          .every((s) => s.canIssueCongratulation);
                        openActionModal({
                          title: `Xác nhận bàn giao văn bản cho Tư vấn (${selectedStudentIds.length} HS)`,
                          targetScope: "STUDENT",
                          action: "CONFIRM",
                          stageNumber: 7,
                          periodId: first.periodId,
                          batchId: first.batchId,
                          isPreschool: first.isPreschool,
                          studentIds: selectedStudentIds,
                          studentSummary: `${selectedStudentIds.length} học sinh đã chọn`,
                          canIssueCongrat: allCanCongrat,
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer"
                    >
                      B7. Bàn giao Tư vấn
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedStudentIds([])}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="p-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          paginatedStudents.length > 0 &&
                          paginatedStudents.every((s) =>
                            selectedStudentIds.includes(s.id)
                          )
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const ids = paginatedStudents.map((s) => s.id);
                            setSelectedStudentIds((prev) =>
                              Array.from(new Set([...prev, ...ids]))
                            );
                          } else {
                            const pageSet = new Set(
                              paginatedStudents.map((s) => s.id)
                            );
                            setSelectedStudentIds((prev) =>
                              prev.filter((id) => !pageSet.has(id))
                            );
                          }
                        }}
                        className="rounded border-white/30 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 min-w-[200px]">Học sinh & Đợt KS</th>
                    <th className="p-3 min-w-[120px]">Cơ sở • Khối/Hệ</th>
                    {ENTRANCE_WORKFLOW_STAGES.map((stg) => (
                      <th
                        key={stg.stageNumber}
                        className="p-2 text-center min-w-[92px] border-l border-white/10"
                        title={`${stg.name} (${stg.responsibleLabel})`}
                      >
                        <div>B{stg.stageNumber}</div>
                        <div className="text-[9.5px] font-semibold text-teal-200 normal-case truncate max-w-[88px] mx-auto">
                          {stg.shortName.replace(/^\d+\.\s*/, "")}
                        </div>
                      </th>
                    ))}
                    <th className="p-3 min-w-[175px] border-l border-white/10">
                      3 Mốc & TT Thông báo
                    </th>
                    <th className="p-3 text-center min-w-[110px]">
                      Hạn & Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="py-14 text-center text-slate-400 font-semibold"
                      >
                        Không có hồ sơ học sinh nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((stu) => {
                      const alertMeta =
                        DEADLINE_ALERT_META[stu.deadlineAlert.level];
                      const excMeta = EXCEPTION_TYPE_META[stu.exceptionType];
                      const delivMeta =
                        DELIVERY_STATUS_META[stu.deliveryStatus];

                      return (
                        <tr
                          key={stu.id}
                          className="hover:bg-teal-50/30 transition-colors"
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(stu.id)}
                              onChange={() =>
                                setSelectedStudentIds((prev) =>
                                  prev.includes(stu.id)
                                    ? prev.filter((x) => x !== stu.id)
                                    : [...prev, stu.id]
                                )
                              }
                              className="rounded border-slate-300 cursor-pointer"
                            />
                          </td>

                          {/* Học sinh & Đợt */}
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[11px] font-black text-[#00736E] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {stu.studentCode}
                              </span>
                              <button
                                onClick={() => setDetailStudent(stu)}
                                className="font-extrabold text-slate-800 hover:text-[#00736E] text-left cursor-pointer"
                              >
                                {stu.fullName}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[220px]">
                              {stu.periodName} •{" "}
                              <strong className="text-slate-700">
                                {stu.batchName}
                              </strong>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {stu.exceptionType !== "NONE" && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${excMeta.badgeClass}`}
                                >
                                  {excMeta.label}
                                </span>
                              )}
                              {stu.isRetest && stu.exceptionType !== "RETEST" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  KS lại (Lần {stu.retestCount})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cơ sở • Khối/Hệ */}
                          <td className="p-3">
                            <div className="font-bold text-[#003B3A]">
                              {stu.campusCode}
                            </div>
                            <div className="text-[11px] text-slate-600 font-semibold">
                              {stu.grade.startsWith("Khối") || stu.isPreschool
                                ? stu.grade
                                : `Khối ${stu.grade}`}{" "}
                              • {stu.educationSystem}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Tiến độ: <strong>{stu.overallProgressPct}%</strong>
                            </div>
                          </td>

                          {/* 8 Ô Công đoạn */}
                          {stu.stages.map((stItem) => {
                            const meta =
                              ENTRANCE_STAGE_STATUS_META[stItem.status];
                            const canClickConfirm = canUserConfirmStage(
                              currentUser.role,
                              stItem.stageNumber,
                              currentUser.isSuperAdmin
                            );

                            return (
                              <td
                                key={stItem.stageNumber}
                                className="p-2 text-center border-l border-slate-100 align-middle"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (canClickConfirm) {
                                      openActionModal({
                                        title: `Công đoạn ${stItem.stageNumber}: ${stItem.name}`,
                                        targetScope: "STUDENT",
                                        action:
                                          stItem.stageNumber === 8
                                            ? "UPDATE_DELIVERY"
                                            : "CONFIRM",
                                        stageNumber: stItem.stageNumber,
                                        periodId: stu.periodId,
                                        batchId: stu.batchId,
                                        isPreschool: stu.isPreschool,
                                        studentIds: [stu.id],
                                        studentSummary: `${stu.fullName} (${stu.studentCode})`,
                                        currentAdmissionResult:
                                          stu.admissionResult,
                                        canIssueCongrat:
                                          stu.canIssueCongratulation,
                                      });
                                    } else {
                                      setDetailStudent(stu);
                                    }
                                  }}
                                  title={`${stItem.name}: ${meta.label}\n${stItem.detailText}${
                                    stItem.confirmedByName
                                      ? `\nXác nhận bởi: ${stItem.confirmedByName}`
                                      : ""
                                  }`}
                                  className={`w-full px-1.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${meta.badgeClass} hover:brightness-95`}
                                >
                                  <span className="flex items-center gap-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`}
                                    />
                                    <span>{meta.shortLabel}</span>
                                  </span>
                                  <span className="text-[9px] font-medium opacity-80 truncate max-w-[78px]">
                                    {stItem.stageNumber === 4
                                      ? `${stu.evaluatedSubjectsCount}/${Math.max(
                                          1,
                                          stu.assignedSubjectsCount
                                        )} môn`
                                      : stItem.stageNumber === 6 &&
                                        stu.admissionResult
                                      ? stu.admissionResult
                                      : stItem.stageNumber === 8 &&
                                        stu.isParentRead
                                      ? "PH đã đọc"
                                      : ""}
                                  </span>
                                </button>
                              </td>
                            );
                          })}

                          {/* Cột Phân biệt 3 Mốc: Công việc CM / Xét duyệt / Bàn giao Tư vấn */}
                          <td className="p-3 border-l border-slate-100 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10.5px]">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  stu.isWorkCompleted
                                    ? "bg-teal-50 text-[#00736E] border border-teal-200"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                1.CV: {stu.isWorkCompleted ? "Xong" : "Đang làm"}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  stu.isApprovalCompleted
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                2.Duyệt:{" "}
                                {stu.isApprovalCompleted
                                  ? stu.admissionResult
                                  : "Chờ"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  stu.stages[6]?.status === "COMPLETED"
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {stu.stages[6]?.status === "COMPLETED"
                                  ? "Đã bàn giao Tư vấn"
                                  : "Chưa bàn giao Tư vấn"}
                              </span>
                            </div>
                          </td>

                          {/* Hạn & Thao tác */}
                          <td className="p-3 text-center space-y-1.5">
                            <div>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${alertMeta.badgeClass}`}
                              >
                                {stu.deadlineAlert.label}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setDetailStudent(stu)}
                                title="Xem chi tiết 8 công đoạn & lịch sử xác nhận"
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#00736E] text-[10.5px] font-bold transition-colors cursor-pointer"
                              >
                                Chi tiết
                              </button>
                              <Link
                                href={
                                  stu.stages[stu.currentStageNumber - 1]
                                    ?.actionHref || "/admin/xet-duyet-ket-qua"
                                }
                                title={`Đi tới màn hình xử lý Bước ${stu.currentStageNumber}`}
                                className="p-1 rounded-lg bg-[#003B3A] text-white hover:bg-[#005B58] transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-600">
                <span>
                  Hiển thị {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, studentRows.length)} /{" "}
                  {studentRows.length} học sinh
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Trước
                  </button>
                  <span className="px-3 py-1.5 rounded-xl bg-[#003B3A] text-white">
                    Trang {currentPage}/{totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: TIẾN ĐỘ CẤP ĐỘ ĐỢT KHẢO SÁT ─── */}
        {activeTab === "batches" && (
          <div className="p-4">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="p-3">Kỳ & Đợt khảo sát</th>
                    <th className="p-3">Cơ sở & Phụ trách</th>
                    <th className="p-3 text-center">Thời hạn & Cảnh báo</th>
                    <th className="p-3 text-center">Quy mô HS</th>
                    <th className="p-3">Tiến độ 8 Công đoạn</th>
                    <th className="p-3 text-center">3 Mốc Hoàn thành</th>
                    <th className="p-3 text-center">Xác nhận Điều hành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {batchRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-slate-400 font-semibold"
                      >
                        Không có đợt khảo sát nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    batchRows.map((b) => {
                      const alertMeta =
                        DEADLINE_ALERT_META[b.deadlineAlert.level];
                      const stg3 = b.stageSummaries.find(
                        (s) => s.stageNumber === 3
                      );
                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-teal-50/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  b.isPreschool
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-teal-100 text-[#003B3A]"
                                }`}
                              >
                                {b.isPreschool ? "Mầm non" : "K-12"}
                              </span>
                              <span className="font-extrabold text-slate-800">
                                {b.batchName}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Kỳ: {b.periodName} ({b.periodCode})
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-[#003B3A]">
                              {b.campusName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              👤 {b.assignedUserName}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${alertMeta.badgeClass}`}
                            >
                              {b.deadlineAlert.label}
                            </div>
                            <div className="text-[10.5px] text-slate-500 mt-1">
                              {b.startDate
                                ? new Date(b.startDate).toLocaleDateString(
                                    "vi-VN"
                                  )
                                : "—"}{" "}
                              →{" "}
                              {b.endDate
                                ? new Date(b.endDate).toLocaleDateString("vi-VN")
                                : "—"}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="text-base font-black text-[#003B3A]">
                              {b.totalStudents}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              học sinh
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {b.stageSummaries.map((s) => {
                                const m =
                                  ENTRANCE_STAGE_STATUS_META[s.status];
                                return (
                                  <span
                                    key={s.stageNumber}
                                    title={`${s.shortName}: ${m.label} (${s.completionPct}%)`}
                                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${m.badgeClass}`}
                                  >
                                    B{s.stageNumber}: {s.completionPct}%
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3 text-center space-y-1 text-[11px]">
                            <div className="text-[#00736E] font-bold">
                              Công việc CM: {b.workCompletedCount}/
                              {b.totalStudents}
                            </div>
                            <div className="text-emerald-700 font-bold">
                              Xét duyệt: {b.approvalCompletedCount}/
                              {b.totalStudents}
                            </div>
                            <div className="text-sky-700 font-bold">
                              Bàn giao TV: {b.stageSummaries.find((s) => s.stageNumber === 7)?.completedCount || 0}/{b.totalStudents}
                            </div>
                          </td>
                          <td className="p-3 text-center space-y-1.5">
                            {canUserConfirmStage(
                              currentUser.role,
                              3,
                              currentUser.isSuperAdmin
                            ) && (
                              <button
                                onClick={() =>
                                  openActionModal({
                                    title: `Xác nhận hoàn thành phân công & Công bố GV - ${b.batchName}`,
                                    targetScope: "BATCH",
                                    action: "CONFIRM",
                                    stageNumber: 3,
                                    periodId: b.periodId,
                                    batchId: b.id,
                                    isPreschool: b.isPreschool,
                                    studentSummary: `Đợt ${b.batchName} (${b.totalStudents} HS)`,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-[#00A19A] hover:bg-[#008f89] text-white text-[10.5px] font-bold transition-all cursor-pointer"
                              >
                                {stg3?.confirmedAt
                                  ? "✓ Đã XN Phân công (Cập nhật)"
                                  : "Xác nhận Phân công (B3)"}
                              </button>
                            )}
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                href={
                                  b.isPreschool
                                    ? `/admin/phan-cong-khao-sat?tab=preschool&periodId=${b.periodId}&batchId=${b.id}`
                                    : `/admin/phan-cong-khao-sat?tab=k12&periodId=${b.periodId}&batchId=${b.id}`
                                }
                                className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-bold"
                              >
                                Phân công
                              </Link>
                              <Link
                                href={
                                  b.isPreschool
                                    ? `/admin/xet-duyet-ket-qua?tab=preschool&periodId=${b.periodId}&batchId=${b.id}`
                                    : `/admin/xet-duyet-ket-qua?tab=k12&periodId=${b.periodId}&batchId=${b.id}`
                                }
                                className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-bold"
                              >
                                Xét duyệt
                              </Link>
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

        {/* ─── TAB 3: BẢNG NHIỆM VỤ THEO GIÁO VIÊN / NGƯỜI PHỤ TRÁCH ─── */}
        {activeTab === "assignees" && (
          <div className="p-4">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="p-3">Người phụ trách & Vai trò</th>
                    <th className="p-3">Công đoạn & Phạm vi</th>
                    <th className="p-3">Kỳ / Đợt khảo sát</th>
                    <th className="p-3 text-center">Tổng HS</th>
                    <th className="p-3 text-center">Hoàn thành</th>
                    <th className="p-3 text-center">Đang làm / Chưa BĐ</th>
                    <th className="p-3 text-center">Cần điều chỉnh</th>
                    <th className="p-3 text-center">Tiến độ & Hạn</th>
                    <th className="p-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {assigneeRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-slate-400 font-semibold"
                      >
                        Chưa có dữ liệu nhiệm vụ người phụ trách theo bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    assigneeRows.map((a) => {
                      const alertMeta =
                        DEADLINE_ALERT_META[a.deadlineAlert.level];
                      return (
                        <tr
                          key={a.assigneeKey}
                          className="hover:bg-teal-50/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-extrabold text-slate-800">
                              {a.fullName}
                            </div>
                            <div className="text-[11px] text-[#00736E] font-bold">
                              {a.roleLabel} • {a.campusName}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">
                              {a.stageName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {a.scopeDescription}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-700">
                              {a.batchName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {a.periodName}
                            </div>
                          </td>
                          <td className="p-3 text-center font-black text-slate-800">
                            {a.totalStudents}
                          </td>
                          <td className="p-3 text-center font-black text-emerald-600">
                            {a.completedStudents}
                          </td>
                          <td className="p-3 text-center font-bold text-teal-700">
                            {a.inProgressStudents + a.notStartedStudents}
                          </td>
                          <td className="p-3 text-center font-bold text-rose-600">
                            {a.needsAdjustmentStudents}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-black text-[#003B3A]">
                                {a.completionPct}%
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${alertMeta.badgeClass}`}
                              >
                                {a.deadlineAlert.label}
                              </span>
                            </div>
                            <div className="w-28 mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-[#00A19A]"
                                style={{ width: `${a.completionPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={a.actionHref}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005B58] text-white text-[11px] font-bold"
                              >
                                <span>Mở xử lý</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
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

        {/* ─── TAB 4: DANH SÁCH HỒ SƠ ĐANG TỒN ĐỌNG (BACKLOG) ─── */}
        {activeTab === "backlog" && (
          <div className="p-4">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="p-3">Cảnh báo hạn</th>
                    <th className="p-3">Học sinh & Khối/Hệ</th>
                    <th className="p-3">Cơ sở & Đợt khảo sát</th>
                    <th className="p-3">Công đoạn đang tồn đọng</th>
                    <th className="p-3">Nguyên nhân cụ thể</th>
                    <th className="p-3">Bộ phận / Người phụ trách</th>
                    <th className="p-3 text-center">Xử lý ngay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {backlogItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-emerald-600 font-bold"
                      >
                        🎉 Tuyệt vời! Không có hồ sơ tồn đọng nào theo bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    backlogItems.map((item) => {
                      const alertMeta =
                        DEADLINE_ALERT_META[item.deadlineAlert.level];
                      const stMeta =
                        ENTRANCE_STAGE_STATUS_META[item.stageStatus];
                      const stuObj = studentRows.find(
                        (s) => s.id === item.studentId
                      );

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-rose-50/20 transition-colors"
                        >
                          <td className="p-3">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-extrabold border ${alertMeta.badgeClass}`}
                            >
                              {item.deadlineAlert.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-extrabold text-slate-800">
                              {item.fullName}{" "}
                              <span className="font-mono text-[#00736E]">
                                ({item.studentCode})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Khối {item.grade} • {item.educationSystem}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-[#003B3A]">
                              {item.campusName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.periodName} • {item.batchName}
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg border text-[10.5px] font-bold ${stMeta.badgeClass}`}
                            >
                              {item.bottleneckStageName} ({stMeta.shortLabel})
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700 max-w-xs">
                            {item.reason}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">
                              {item.responsibleRoleLabel}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.assigneeNames}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {stuObj &&
                                canUserConfirmStage(
                                  currentUser.role,
                                  item.bottleneckStageNumber,
                                  currentUser.isSuperAdmin
                                ) && (
                                  <button
                                    onClick={() =>
                                      openActionModal({
                                        title: `Xử lý & Xác nhận ${item.bottleneckStageName}`,
                                        targetScope: "STUDENT",
                                        action:
                                          item.bottleneckStageNumber === 8
                                            ? "UPDATE_DELIVERY"
                                            : "CONFIRM",
                                        stageNumber: item.bottleneckStageNumber,
                                        periodId: item.periodId,
                                        batchId: item.batchId,
                                        isPreschool: item.isPreschool,
                                        studentIds: [item.studentId],
                                        studentSummary: `${item.fullName} (${item.studentCode})`,
                                        currentAdmissionResult:
                                          stuObj.admissionResult,
                                        canIssueCongrat:
                                          stuObj.canIssueCongratulation,
                                        defaultDeliveryStatus:
                                          stuObj.isNotificationSent
                                            ? "READ"
                                            : "SENT",
                                      })
                                    }
                                    className="px-2.5 py-1.5 rounded-xl bg-[#00A19A] hover:bg-[#008f89] text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Xác nhận
                                  </button>
                                )}
                              <Link
                                href={item.actionHref}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005B58] text-white text-[11px] font-bold"
                              >
                                <span>Xử lý</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
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

        {/* ─── TAB 5: LỊCH SỬ XÁC NHẬN & KIỂM SOÁT (AUDIT LOGS) ─── */}
        {activeTab === "audit" && (
          <div className="p-4">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Người xác nhận & Vai trò</th>
                    <th className="p-3">Công đoạn</th>
                    <th className="p-3">Đối tượng / Học sinh</th>
                    <th className="p-3">Thao tác & Trạng thái mới</th>
                    <th className="p-3">Ghi chú / Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-slate-400 font-semibold"
                      >
                        Chưa có bản ghi lịch sử xác nhận nào.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log: any) => {
                      const stgDef = getStageDefinition(
                        Number(log.stageNumber) || 1
                      );
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString("vi-VN")
                              : "—"}
                          </td>
                          <td className="p-3">
                            <div className="font-extrabold text-slate-800">
                              {log.actorName}
                            </div>
                            <div className="text-[10.5px] font-bold text-[#00736E]">
                              Vai trò: {log.actorRole}
                            </div>
                          </td>
                          <td className="p-3 font-bold text-[#003B3A]">
                            Bước {log.stageNumber}: {stgDef.name}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">
                              {log.studentName || "Cấp Đợt khảo sát"}
                            </div>
                            {log.studentCode && (
                              <div className="text-[11px] font-mono text-slate-500">
                                Mã HS: {log.studentCode}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-[#00736E] border border-teal-200 font-bold text-[11px]">
                              {log.action} → {log.newStatus}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {log.reasonOrNote || "—"}
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
      </div>

      {/* ─── MODAL CHI TIẾT 8 CÔNG ĐOẠN CỦA 1 HỌC SINH ─── */}
      {detailStudent && (
        <div
          className="fixed inset-0 z-[400] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDetailStudent(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#003B3A] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#00A19A] text-[11px] font-black font-mono">
                    {detailStudent.studentCode}
                  </span>
                  <h3 className="text-base sm:text-lg font-black">
                    {detailStudent.fullName}
                  </h3>
                </div>
                <p className="text-xs text-teal-200 mt-0.5">
                  {detailStudent.campusName} • Khối {detailStudent.grade} (
                  {detailStudent.educationSystem}) • {detailStudent.periodName} (
                  {detailStudent.batchName})
                </p>
              </div>
              <button
                onClick={() => setDetailStudent(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Thanh trạng thái 3 mốc & Ngoại lệ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200">
                  <div className="text-[10px] font-black uppercase text-[#00736E]">
                    1. Mốc Công việc Chuyên môn
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 mt-1">
                    {detailStudent.isWorkCompleted
                      ? "✓ Đã hoàn thành (Đủ điểm & Định hướng)"
                      : "Đang thực hiện"}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[10px] font-black uppercase text-emerald-700">
                    2. Mốc Xét duyệt Kết luận
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 mt-1">
                    {detailStudent.isApprovalCompleted
                      ? `✓ Đã duyệt: ${detailStudent.admissionResult}`
                      : "Chờ thẩm định phê duyệt"}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200">
                  <div className="text-[10px] font-black uppercase text-sky-700">
                    3. Mốc Bàn giao Tư vấn
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 mt-1">
                    {detailStudent.stages[6]?.status === "COMPLETED"
                      ? "✓ Đã bàn giao hồ sơ & văn bản cho Tư vấn"
                      : "Chưa bàn giao Tư vấn"}
                  </div>
                </div>
              </div>

              {/* Thiết lập nhanh Trường hợp Ngoại lệ / Miễn KS / Khảo sát lại */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">
                    Phân loại hồ sơ:
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold border ${
                      EXCEPTION_TYPE_META[detailStudent.exceptionType].badgeClass
                    }`}
                  >
                    {EXCEPTION_TYPE_META[detailStudent.exceptionType].label}
                  </span>
                </div>
                <button
                  onClick={() =>
                    openActionModal({
                      title: `Cập nhật diện Miễn khảo sát / Khảo sát lại / Ngoại lệ - ${detailStudent.fullName}`,
                      targetScope: "STUDENT",
                      action: "SET_EXCEPTION",
                      stageNumber: detailStudent.currentStageNumber,
                      periodId: detailStudent.periodId,
                      batchId: detailStudent.batchId,
                      isPreschool: detailStudent.isPreschool,
                      studentIds: [detailStudent.id],
                      studentSummary: `${detailStudent.fullName} (${detailStudent.studentCode})`,
                    })
                  }
                  className="px-3 py-1 rounded-xl border border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold cursor-pointer"
                >
                  Thiết lập Miễn KS / KS lại / Ngoại lệ
                </button>
              </div>

              {/* Danh sách 8 Công đoạn của Học sinh */}
              <div className="space-y-2.5">
                {detailStudent.stages.map((st) => {
                  const meta = ENTRANCE_STAGE_STATUS_META[st.status];
                  const canConfirm = canUserConfirmStage(
                    currentUser.role,
                    st.stageNumber,
                    currentUser.isSuperAdmin
                  );
                  return (
                    <div
                      key={st.stageNumber}
                      className="p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-teal-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-[#003B3A] text-white text-[10.5px] font-black">
                            Bước {st.stageNumber}
                          </span>
                          <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                            {st.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          {st.detailText} • Phụ trách:{" "}
                          <strong className="text-slate-800">
                            {st.responsibleLabel}
                          </strong>
                        </p>
                        {(st.confirmedByName || st.note) && (
                          <p className="text-[11px] text-slate-500">
                            {st.confirmedByName && (
                              <span>
                                ✓ Xác nhận bởi:{" "}
                                <strong>{st.confirmedByName}</strong>{" "}
                                {st.confirmedAt
                                  ? `(${new Date(
                                      st.confirmedAt
                                    ).toLocaleString("vi-VN")})`
                                  : ""}
                              </span>
                            )}
                            {st.note && <span> • Ghi chú: {st.note}</span>}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {canConfirm && (
                          <>
                            <button
                              onClick={() =>
                                openActionModal({
                                  title: `Xác nhận Bước ${st.stageNumber}: ${st.name}`,
                                  targetScope: "STUDENT",
                                  action:
                                    st.stageNumber === 8
                                      ? "UPDATE_DELIVERY"
                                      : "CONFIRM",
                                  stageNumber: st.stageNumber,
                                  periodId: detailStudent.periodId,
                                  batchId: detailStudent.batchId,
                                  isPreschool: detailStudent.isPreschool,
                                  studentIds: [detailStudent.id],
                                  studentSummary: `${detailStudent.fullName} (${detailStudent.studentCode})`,
                                  currentAdmissionResult:
                                    detailStudent.admissionResult,
                                  canIssueCongrat:
                                    detailStudent.canIssueCongratulation,
                                })
                              }
                              className="px-3 py-1.5 rounded-xl bg-[#00A19A] hover:bg-[#008f89] text-white text-xs font-bold cursor-pointer"
                            >
                              Xác nhận
                            </button>
                            <button
                              onClick={() =>
                                openActionModal({
                                  title: `Yêu cầu điều chỉnh Bước ${st.stageNumber}: ${st.name}`,
                                  targetScope: "STUDENT",
                                  action: "REQUEST_ADJUSTMENT",
                                  stageNumber: st.stageNumber,
                                  periodId: detailStudent.periodId,
                                  batchId: detailStudent.batchId,
                                  isPreschool: detailStudent.isPreschool,
                                  studentIds: [detailStudent.id],
                                  studentSummary: `${detailStudent.fullName} (${detailStudent.studentCode})`,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                            >
                              Cần ĐC
                            </button>
                          </>
                        )}
                        <Link
                          href={st.actionHref}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold"
                        >
                          <span>Màn hình xử lý</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL XÁC NHẬN CÔNG ĐOẠN / CẬP NHẬT TRẠNG THÁI (KIỂM SOÁT BACKEND) ─── */}
      {confirmModal?.open && (
        <div
          className="fixed inset-0 z-[450] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#003B3A] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black">
                {confirmModal.title}
              </h3>
              <button
                onClick={() => setConfirmModal(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {confirmModal.studentSummary && (
                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 font-bold text-[#003B3A]">
                  Đối tượng: {confirmModal.studentSummary}
                </div>
              )}

              {/* Chọn trạng thái bước nếu là CONFIRM */}
              {confirmModal.action === "CONFIRM" && (
                <div>
                  <label className="block font-extrabold uppercase text-slate-500 mb-1.5">
                    Trạng thái công đoạn
                  </label>
                  <select
                    value={modalForm.status}
                    onChange={(e) =>
                      setModalForm((f) => ({
                        ...f,
                        status: e.target.value as EntranceStageStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-bold text-slate-800 outline-none focus:border-[#00A19A]"
                  >
                    <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
                    <option value="IN_PROGRESS">
                      Đang thực hiện (IN_PROGRESS)
                    </option>
                    <option value="NEEDS_ADJUSTMENT">
                      Cần điều chỉnh (NEEDS_ADJUSTMENT)
                    </option>
                    <option value="NOT_APPLICABLE">
                      Không áp dụng theo nghiệp vụ (NOT_APPLICABLE)
                    </option>
                  </select>
                </div>
              )}

              {/* Công đoạn 6: Chọn kết luận phê duyệt */}
              {confirmModal.stageNumber === 6 &&
                confirmModal.action === "CONFIRM" && (
                  <div>
                    <label className="block font-extrabold uppercase text-slate-500 mb-1.5">
                      Kết luận thẩm định & xét duyệt chính thức *
                    </label>
                    <select
                      value={modalForm.admissionResult}
                      onChange={(e) =>
                        setModalForm((f) => ({
                          ...f,
                          admissionResult: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-bold text-slate-800 outline-none focus:border-[#00A19A]"
                    >
                      <option value="Đạt">Đạt (Trúng tuyển chuẩn)</option>
                      <option value="Đạt cam kết">
                        Đạt có cam kết đồng hành
                      </option>
                      <option value="Đạt - Giao lưu">
                        Đạt - Học giao lưu / Học thử
                      </option>
                      <option value="Miễn khảo sát">
                        Miễn khảo sát (Đạt thẳng)
                      </option>
                      <option value="Không đạt - Kiểm tra lại">
                        Không đạt - Cho phép khảo sát lại
                      </option>
                      <option value="Không đạt">Không đạt</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      * Hệ thống kiểm soát không tự động duyệt khi chưa có thao tác phê duyệt kết luận của cấp có thẩm quyền.
                    </p>
                  </div>
                )}

              {/* Công đoạn 7: Chọn văn bản bàn giao Tư vấn (Kiểm soát chặn Thư chúc mừng nếu chưa Đạt) */}
              {confirmModal.stageNumber === 7 &&
                confirmModal.action === "CONFIRM" && (
                  <div className="space-y-2">
                    <label className="block font-extrabold uppercase text-slate-500">
                      Văn bản chuẩn bị & bàn giao cho Tư vấn
                    </label>
                    {!confirmModal.canIssueCongrat && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[11px]">
                        ⚠️ Học sinh chưa có kết luận ĐẠT đã phê duyệt nên hệ thống khóa phát hành Thư chúc mừng. Chỉ cho phép bàn giao Thông báo kết quả khảo sát.
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          id: "Thư chúc mừng",
                          disabled: !confirmModal.canIssueCongrat,
                        },
                        {
                          id: "Bản cam kết",
                          disabled: !confirmModal.canIssueCongrat,
                        },
                        { id: "Phiếu kết quả khảo sát", disabled: false },
                        { id: "Thông báo kết quả khảo sát", disabled: false },
                      ].map((doc) => {
                        const checked = modalForm.documentTypes.includes(doc.id);
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            disabled={doc.disabled}
                            onClick={() =>
                              setModalForm((f) => ({
                                ...f,
                                documentTypes: checked
                                  ? f.documentTypes.filter((x) => x !== doc.id)
                                  : [...f.documentTypes, doc.id],
                              }))
                            }
                            className={`px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              checked
                                ? "bg-[#003B3A] text-white border-[#003B3A]"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {checked ? "✓ " : ""}
                            {doc.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Thiết lập Ngoại lệ */}
              {confirmModal.action === "SET_EXCEPTION" && (
                <div>
                  <label className="block font-extrabold uppercase text-slate-500 mb-1.5">
                    Loại hồ sơ đặc biệt / ngoại lệ
                  </label>
                  <select
                    value={modalForm.exceptionType}
                    onChange={(e) =>
                      setModalForm((f) => ({
                        ...f,
                        exceptionType: e.target.value as EntranceExceptionType,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-bold text-slate-800 outline-none focus:border-[#00A19A]"
                  >
                    <option value="NONE">Hồ sơ khảo sát tiêu chuẩn</option>
                    <option value="EXEMPT">
                      Miễn khảo sát (Tuyển thẳng / Chứng chỉ quốc tế)
                    </option>
                    <option value="RETEST">Hồ sơ khảo sát lại</option>
                    <option value="AMENDMENT">
                      Hồ sơ chỉnh sửa / điều chỉnh kết quả
                    </option>
                    <option value="SPECIAL_EXCEPTION">
                      Trường hợp ngoại lệ đặc biệt
                    </option>
                  </select>
                </div>
              )}

              {/* Ghi chú / Lý do */}
              <div>
                <label className="block font-extrabold uppercase text-slate-500 mb-1.5">
                  Ghi chú / Nội dung xác nhận (Lưu lịch sử kiểm soát)
                </label>
                <textarea
                  rows={3}
                  value={modalForm.note}
                  onChange={(e) =>
                    setModalForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="Nhập ghi chú xác nhận, lý do điều chỉnh hoặc thông tin bàn giao..."
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 outline-none focus:border-[#00A19A]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  Người xác nhận: <strong>{currentUser.fullName}</strong> (
                  {currentUser.role})
                </span>
                <span>Thời gian: Hệ thống tự động ghi nhận</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmSubmit}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008f89] text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Xác nhận & Lưu lịch sử</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
