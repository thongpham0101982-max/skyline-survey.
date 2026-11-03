"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Plus,
  Search,
  Filter,
  Calendar,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Smartphone,
  Monitor,
  BarChart3,
  Download,
  Clock,
  RotateCcw,
  Users,
  FileText,
  Sparkles,
  MessageSquare,
  CheckCheck,
  ShieldCheck,
  Paperclip,
  Zap,
} from "lucide-react";
import * as XLSX from "xlsx";

interface NotificationManagementWorkspaceProps {
  workspaceRole: "KTDBCL" | "TEACHER";
  embeddedInKhaoThiSo?: boolean;
  defaultTestingPeriodId?: string;
}

type WorkspaceSubTab = "LIST" | "COMPOSER" | "AUTOMATION" | "DASHBOARD";

export function NotificationManagementWorkspace({
  workspaceRole,
  embeddedInKhaoThiSo = false,
  defaultTestingPeriodId = "",
}: NotificationManagementWorkspaceProps) {
  const [subTab, setSubTab] = useState<WorkspaceSubTab>("LIST");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [actor, setActor] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPeriodId, setFilterPeriodId] = useState<string>(defaultTestingPeriodId);
  const [filterCampusId, setFilterCampusId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selected Notification Detail in Management Panel
  const [selectedNotifId, setSelectedNotifId] = useState<string>("");
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [recallReason, setRecallReason] = useState<string>("");
  const [teacherReplyText, setTeacherReplyText] = useState<string>("");

  // Composer Form State
  const [previewDevice, setPreviewDevice] = useState<"DESKTOP" | "MOBILE">("MOBILE");
  const [composerForm, setComposerForm] = useState({
    category: workspaceRole === "KTDBCL" ? "EXAM" : "TEACHER",
    subType: workspaceRole === "KTDBCL" ? "EXAM_SCHEDULE" : "GVCN_ANNOUNCEMENT",
    title: "",
    summary: "",
    contentHtml: "",
    priority: "IMPORTANT",
    senderUnit: workspaceRole === "KTDBCL" ? "Ban KT&ĐBCL" : "Giáo viên",
    testingPeriodId: defaultTestingPeriodId || "",
    testingSubjectExamId: "",
    testingSessionId: "",
    campusId: "",
    gradeLevels: "",
    classIds: [] as string[],
    subjectId: "",
    subjectName: "",
    targetRoles: ["PARENT", "STUDENT"] as Array<"PARENT" | "STUDENT" | "TEACHER">,
    requireAcknowledge: true,
    acknowledgeDeadline: "",
    allowReply: workspaceRole === "TEACHER",
    requiresApproval: false,
    scheduledAt: "",
    attachmentFileName: "",
    attachmentFileUrl: "",
  });

  // Automated Exam Event Trigger State
  const [eventForm, setEventForm] = useState({
    eventType: "EVENT_EXAM_SCHEDULE_PUBLISHED",
    testingPeriodId: defaultTestingPeriodId || "",
    testingSubjectExamId: "",
    testingSessionId: "",
    reminderDaysBefore: "3",
    beforeRoom: "Phòng A201",
    beforeTime: "07:30 - 08:30",
    afterRoom: "Phòng Lab LMS B102",
    afterTime: "09:00 - 10:00",
  });

  // Dashboard Metrics State
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        mode: "MANAGE",
        includeMeta: "true",
      });
      if (filterCategory !== "ALL") qs.set("category", filterCategory);
      if (filterStatus !== "ALL") qs.set("status", filterStatus);
      if (filterPeriodId) qs.set("testingPeriodId", filterPeriodId);
      if (filterCampusId) qs.set("campusId", filterCampusId);
      if (searchQuery.trim()) qs.set("search", searchQuery.trim());

      const res = await fetch(`/api/notification-center?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể tải dữ liệu Trung tâm Thông báo.");
      }
      const data = await res.json();
      setActor(data.actor || null);
      setMeta(data.meta || null);
      const list = Array.isArray(data.items) ? data.items : [];
      setNotifications(list);
      setTotalCount(Number(data.totalCount || list.length));

      if (list.length > 0 && !selectedNotifId) {
        setSelectedNotifId(list[0].id);
      }
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, filterPeriodId, filterCampusId, searchQuery, selectedNotifId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const fetchNotificationDetail = useCallback(async (id: string) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/notification-center/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSelectedDetail(data);
      }
    } catch (err) {
      console.error("Failed to fetch notification detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNotifId) {
      fetchNotificationDetail(selectedNotifId);
    }
  }, [selectedNotifId, fetchNotificationDetail]);

  const fetchDashboardMetrics = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterCampusId) qs.set("campusId", filterCampusId);
      if (filterPeriodId) qs.set("testingPeriodId", filterPeriodId);
      if (filterCategory !== "ALL") qs.set("category", filterCategory);

      const res = await fetch(`/api/notification-center/analytics?${qs.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setDashboardLoading(false);
    }
  }, [filterCampusId, filterPeriodId, filterCategory]);

  useEffect(() => {
    if (subTab === "DASHBOARD") {
      fetchDashboardMetrics();
    }
  }, [subTab, fetchDashboardMetrics]);

  // Filter available classes & subjects based on teacher scope or admin scope
  const availableClasses = useMemo(() => {
    const allClasses = meta?.classes || [];
    if (actor?.isKTDBCL || actor?.isAdmin) return allClasses;
    if (composerForm.subType.startsWith("GVCN_")) {
      return allClasses.filter((c: any) => actor?.homeroomClassIds?.includes(c.id));
    }
    return allClasses;
  }, [meta?.classes, actor, composerForm.subType]);

  const handleApplyTemplate = (tplCode: string) => {
    const tpl = (meta?.templates || []).find((t: any) => t.code === tplCode);
    if (!tpl) return;
    setComposerForm((prev) => ({
      ...prev,
      category: tpl.category,
      subType: tpl.subType,
      priority: tpl.defaultPriority,
      requireAcknowledge: tpl.requireAcknowledge,
      allowReply: tpl.allowReply,
      title: tpl.titleTemplate,
      contentHtml: tpl.contentTemplate,
    }));
  };

  const handleAutoPullExamSchedule = async () => {
    if (!composerForm.testingPeriodId && !composerForm.testingSubjectExamId) {
      showToast("error", "Vui lòng chọn Kỳ kiểm tra hoặc Môn kiểm tra để lấy dữ liệu tự động.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/notification-center/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PULL_EXAM_META",
          testingPeriodId: composerForm.testingPeriodId,
          testingSubjectExamId: composerForm.testingSubjectExamId,
          testingSessionId: composerForm.testingSessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.examMeta) {
        throw new Error(data.error || "Không tìm thấy thông tin lịch kiểm tra.");
      }
      const em = data.examMeta;
      setComposerForm((prev) => ({
        ...prev,
        gradeLevels: em.gradeLevel || prev.gradeLevels,
        subjectId: em.subjectId || prev.subjectId,
        subjectName: em.subjectName || prev.subjectName,
        classIds: em.classId ? [em.classId] : prev.classIds,
        title: `[Thông báo Khảo thí] Lịch kiểm tra ${em.periodName} - Môn ${em.subjectName}`,
        contentHtml: `<p>Kính gửi Quý Phụ huynh và các em Học sinh,</p>
<p>Ban KT&amp;ĐBCL Trường Sky-Line thông báo lịch kiểm tra chính thức kỳ <strong>${em.periodName}</strong>:</p>
<ul>
  <li><strong>Môn kiểm tra:</strong> ${em.subjectName}</li>
  <li><strong>Khung giờ:</strong> ${em.startTime} - ${em.endTime} (${em.durationMinutes} phút)</li>
  <li><strong>Phòng kiểm tra:</strong> ${em.roomName}</li>
  <li><strong>Hình thức làm bài:</strong> ${em.examFormatLabel}</li>
</ul>
<p>Quý Phụ huynh vui lòng nhắc nhở học sinh chuẩn bị đầy đủ dụng cụ và có mặt đúng giờ quy định.</p>`,
      }));
      showToast("success", "Đã tự động điền lịch, phòng thi, thời gian và hình thức kiểm tra từ SSM!");
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi khi lấy lịch kiểm tra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitComposer = async (
    action: "SAVE_DRAFT" | "SUBMIT_APPROVAL" | "PUBLISH" | "SCHEDULE"
  ) => {
    if (!composerForm.title.trim() || !composerForm.contentHtml.trim()) {
      showToast("error", "Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo.");
      return;
    }

    setSubmitting(true);
    try {
      const attachments =
        composerForm.attachmentFileName.trim() && composerForm.attachmentFileUrl.trim()
          ? [
              {
                fileName: composerForm.attachmentFileName.trim(),
                fileUrl: composerForm.attachmentFileUrl.trim(),
              },
            ]
          : [];

      const res = await fetch("/api/notification-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...composerForm,
          attachments,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu / phát hành thông báo.");

      showToast(
        "success",
        action === "PUBLISH"
          ? "Đã phát hành thông báo thành công!"
          : action === "SUBMIT_APPROVAL"
          ? "Đã gửi thông báo chờ phê duyệt!"
          : "Đã lưu bản nháp thông báo!"
      );
      setSubTab("LIST");
      if (data.notification?.id) {
        setSelectedNotifId(data.notification.id);
      }
      await fetchWorkspace();
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi xử lý thông báo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkflowTransition = async (
    action: "APPROVE" | "REJECT" | "PUBLISH" | "RECALL" | "CANCEL" | "REMIND_UNREAD"
  ) => {
    if (!selectedNotifId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/notification-center/${selectedNotifId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comment: recallReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể thực hiện thao tác.");

      showToast(
        "success",
        action === "REMIND_UNREAD"
          ? `Đã gửi nhắc nhở tới ${data.remindedCount || 0} người nhận chưa đọc!`
          : action === "RECALL"
          ? "Đã thu hồi thông báo và ghi nhật ký kiểm toán!"
          : "Đã cập nhật trạng thái thông báo thành công!"
      );
      setRecallReason("");
      await fetchWorkspace();
      await fetchNotificationDetail(selectedNotifId);
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi cập nhật trạng thái.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerAutomatedEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.testingPeriodId) {
      showToast("error", "Vui lòng chọn Kỳ kiểm tra để kích hoạt sự kiện thông báo.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/notification-center/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: eventForm.eventType,
          testingPeriodId: eventForm.testingPeriodId,
          testingSubjectExamId: eventForm.testingSubjectExamId || undefined,
          testingSessionId: eventForm.testingSessionId || undefined,
          reminderDaysBefore: Number(eventForm.reminderDaysBefore || 3),
          beforeChange:
            eventForm.eventType === "EVENT_EXAM_SCHEDULE_CHANGED"
              ? { roomName: eventForm.beforeRoom, startTime: eventForm.beforeTime }
              : undefined,
          afterChange:
            eventForm.eventType === "EVENT_EXAM_SCHEDULE_CHANGED"
              ? { roomName: eventForm.afterRoom, startTime: eventForm.afterTime }
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể kích hoạt sự kiện tự động.");

      if (data.deduplicated) {
        showToast(
          "success",
          "Sự kiện này đã được phát hành trước đó (Idempotency Key chặn gửi trùng thành công)."
        );
      } else {
        showToast("success", "Đã kích hoạt và phát hành thông báo khảo thí tự động thành công!");
      }
      setSubTab("LIST");
      if (data.notification?.id) setSelectedNotifId(data.notification.id);
      await fetchWorkspace();
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi khi phát hành sự kiện tự động.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyToParentResponse = async (parentResponseId: string) => {
    if (!selectedNotifId || !teacherReplyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/notification-center/${selectedNotifId}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REPLY",
          parentResponseId,
          replyContent: teacherReplyText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể gửi phản hồi.");
      setTeacherReplyText("");
      showToast("success", "Đã gửi phản hồi tới Phụ huynh / Học sinh!");
      await fetchNotificationDetail(selectedNotifId);
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi khi gửi phản hồi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportDashboardExcel = () => {
    if (!dashboardData) return;
    const wb = XLSX.utils.book_new();

    const kpiSheet = XLSX.utils.json_to_sheet([
      {
        "Tổng thông báo phát hành": dashboardData.kpis.totalPublishedNotifications,
        "Tổng người nhận": dashboardData.kpis.totalRecipients,
        "Gửi thành công": dashboardData.kpis.sentSuccessCount,
        "Gửi thất bại": dashboardData.kpis.sentFailedCount,
        "Đã đọc": dashboardData.kpis.readCount,
        "Chưa đọc": dashboardData.kpis.unreadCount,
        "Đã xác nhận": dashboardData.kpis.acknowledgedCount,
        "Chưa xác nhận": dashboardData.kpis.unacknowledgedCount,
        "Tỷ lệ đọc (%)": dashboardData.kpis.readRate,
        "Tỷ lệ xác nhận (%)": dashboardData.kpis.acknowledgeRate,
      },
    ]);
    XLSX.utils.book_append_sheet(wb, kpiSheet, "10_Chi_So_KPI");

    const classSheet = XLSX.utils.json_to_sheet(
      (dashboardData.byClass || []).map((c: any) => ({
        Lớp: c.className,
        "Cơ sở": c.campusName,
        "Tổng người nhận": c.totalRecipients,
        "Gửi thành công": c.sentSuccess,
        "Đã đọc": c.readCount,
        "Đã xác nhận": c.acknowledgedCount,
        "Tỷ lệ đọc (%)": c.readRate,
        "Tỷ lệ xác nhận (%)": c.acknowledgeRate,
      }))
    );
    XLSX.utils.book_append_sheet(wb, classSheet, "Thong_Ke_Theo_Lop");

    const unreadSheet = XLSX.utils.json_to_sheet(
      (dashboardData.unreadRecipients || []).map((u: any) => ({
        "Mã TB": u.notificationCode,
        "Tiêu đề": u.notificationTitle,
        "Người nhận": u.recipientName,
        "Vai trò": u.recipientRole,
        "Học sinh": u.studentName || "",
        Lớp: u.className || "",
        "Cơ sở": u.campusName || "",
        "Số lần nhắc": u.remindedCount || 0,
      }))
    );
    XLSX.utils.book_append_sheet(wb, unreadSheet, "Danh_Sach_Chua_Doc");

    XLSX.writeFile(wb, `SSM_Thong_Ke_Thong_Bao_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5 font-sans text-slate-800">
      {/* 1. TOP BANNER & NAVIGATION TABS */}
      {!embeddedInKhaoThiSo && (
        <div className="bg-gradient-to-r from-[#4C1D95] via-[#5B2D8B] to-[#003B3A] rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/15 text-purple-100 border border-white/20">
                {workspaceRole === "KTDBCL"
                  ? "BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG"
                  : "CÔNG TÁC GIÁO VIÊN CHỦ NHIỆM & BỘ MÔN"}
              </span>
              <h1 className="text-lg sm:text-xl font-black mt-1">
                Trung tâm Thông báo &amp; Liên lạc Sky-Line SSM
              </h1>
              <p className="text-xs text-purple-100/90 font-medium mt-0.5">
                Phát hành thông báo khảo thí, lịch kiểm tra, hướng dẫn học tập và theo dõi tỷ lệ đọc / xác nhận theo thời gian thực
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSubTab("COMPOSER")}
              className="px-4 py-2.5 rounded-xl bg-white text-[#4C1D95] hover:bg-purple-50 text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Thông báo mới</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-navigation bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex items-center justify-between gap-2 flex-wrap shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab("LIST")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              subTab === "LIST"
                ? "bg-[#5B2D8B] text-white shadow-xs"
                : "text-slate-600 hover:bg-purple-50 hover:text-[#5B2D8B]"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Danh sách &amp; Quản lý ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("COMPOSER")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              subTab === "COMPOSER"
                ? "bg-[#5B2D8B] text-white shadow-xs"
                : "text-slate-600 hover:bg-purple-50 hover:text-[#5B2D8B]"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Soạn &amp; Phát hành Thông báo</span>
          </button>

          {(workspaceRole === "KTDBCL" || actor?.isKTDBCL || actor?.isAdmin) && (
            <button
              type="button"
              onClick={() => setSubTab("AUTOMATION")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                subTab === "AUTOMATION"
                  ? "bg-[#5B2D8B] text-white shadow-xs"
                  : "text-slate-600 hover:bg-purple-50 hover:text-[#5B2D8B]"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Tự động hóa Sự kiện Khảo thí (6 Events)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSubTab("DASHBOARD")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              subTab === "DASHBOARD"
                ? "bg-[#5B2D8B] text-white shadow-xs"
                : "text-slate-600 hover:bg-purple-50 hover:text-[#5B2D8B]"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard Theo dõi (10 KPI)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={fetchWorkspace}
          className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#6D28D9]" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* =====================================================================
          TAB 1: DESKTOP 4-ZONE MANAGEMENT LAYOUT (FILTER - LIST - DETAIL - ACTIONS)
      ===================================================================== */}
      {subTab === "LIST" && (
        <div className="space-y-4">
          {/* Zone 1: Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã thông báo, tiêu đề, nội dung..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#6D28D9]"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50"
            >
              <option value="ALL">Tất cả phân loại</option>
              <option value="EXAM">1. Thông báo Khảo thí</option>
              <option value="TEACHER">2. Thông báo Giáo viên</option>
              <option value="ACADEMIC_RESULT">3. Kết quả học tập</option>
              <option value="SYSTEM">4. Thông báo Hệ thống</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50"
            >
              <option value="ALL">Mọi trạng thái quy trình</option>
              <option value="PUBLISHED">Đã phát hành (Published)</option>
              <option value="PENDING_APPROVAL">Chờ duyệt (Pending Approval)</option>
              <option value="DRAFT">Bản nháp (Draft)</option>
              <option value="SCHEDULED">Hẹn giờ (Scheduled)</option>
              <option value="RECALLED">Đã thu hồi (Recalled)</option>
            </select>

            <select
              value={filterPeriodId}
              onChange={(e) => setFilterPeriodId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50"
            >
              <option value="">Tất cả Kỳ kiểm tra</option>
              {(meta?.testingPeriods || []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Zone 2: Notification List */}
            <div className="lg:col-span-5 space-y-2.5 max-h-[76vh] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 font-bold">
                  Đang tải danh sách thông báo...
                </div>
              ) : notifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                  <Bell className="w-8 h-8 text-[#6D28D9] mx-auto opacity-60" />
                  <p className="text-xs font-bold text-slate-600">
                    Chưa có thông báo nào trong bộ lọc hiện tại.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubTab("COMPOSER")}
                    className="px-4 py-2 rounded-xl bg-[#5B2D8B] text-white text-xs font-extrabold"
                  >
                    + Tạo thông báo đầu tiên
                  </button>
                </div>
              ) : (
                notifications.map((n: any) => {
                  const active = selectedNotifId === n.id;
                  const readRate =
                    n.totalRecipients > 0
                      ? Math.round((n.readCount / n.totalRecipients) * 100)
                      : 0;
                  const ackRate =
                    n.totalRecipients > 0
                      ? Math.round((n.acknowledgedCount / n.totalRecipients) * 100)
                      : 0;

                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNotifId(n.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                        active
                          ? "bg-purple-50/80 border-[#6D28D9] shadow-sm ring-1 ring-[#6D28D9]/30"
                          : "bg-white border-slate-200 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-[#5B2D8B]">
                          {n.code} • {n.category}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            n.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800"
                              : n.status === "PENDING_APPROVAL"
                              ? "bg-amber-100 text-amber-800"
                              : n.status === "RECALLED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {n.status}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-2">
                        {n.title}
                      </h3>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span>{n.senderUnit}</span>
                        <span>{new Date(n.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>

                      {/* 3 Distinct Progress Metrics: Sent Success - Read - Acknowledged */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[10px] font-bold">
                        <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                          <span className="text-slate-400 block">Đã gửi</span>
                          <span className="text-slate-800 font-black">
                            {n.sentSuccessCount}/{n.totalRecipients}
                          </span>
                        </div>
                        <div className="bg-purple-50/70 rounded-lg p-1.5 text-center">
                          <span className="text-purple-600 block">Đã đọc</span>
                          <span className="text-[#5B2D8B] font-black">
                            {n.readCount} ({readRate}%)
                          </span>
                        </div>
                        <div className="bg-emerald-50/70 rounded-lg p-1.5 text-center">
                          <span className="text-emerald-600 block">Xác nhận</span>
                          <span className="text-emerald-800 font-black">
                            {n.acknowledgedCount} ({ackRate}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Zone 3 & 4: Notification Detail Panel + Management Actions */}
            <div className="lg:col-span-7">
              {selectedDetail?.notification ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-5 p-5 sm:p-6">
                  {/* Header & Management Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5B2D8B]">
                          {selectedDetail.notification.code}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Trạng thái: {selectedDetail.notification.status}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800">
                          Ưu tiên: {selectedDetail.notification.priority}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900">
                        {selectedDetail.notification.title}
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold">
                        Đơn vị phát hành: {selectedDetail.notification.senderUnit} ({selectedDetail.notification.senderName})
                      </p>
                    </div>

                    {/* Zone 4: Role-based Workflow Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {selectedDetail.notification.status === "DRAFT" && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleWorkflowTransition("PUBLISH")}
                          className="px-3.5 py-2 rounded-xl bg-[#5B2D8B] hover:bg-[#4C1D95] text-white text-xs font-extrabold cursor-pointer"
                        >
                          Phát hành ngay
                        </button>
                      )}

                      {selectedDetail.notification.status === "PENDING_APPROVAL" &&
                        (actor?.isKTDBCL || actor?.isAdmin) && (
                          <>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleWorkflowTransition("APPROVE")}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
                            >
                              Phê duyệt &amp; Phát hành
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleWorkflowTransition("REJECT")}
                              className="px-3.5 py-2 rounded-xl bg-rose-100 text-rose-700 text-xs font-extrabold cursor-pointer"
                            >
                              Trả lại bản nháp
                            </button>
                          </>
                        )}

                      {selectedDetail.notification.status === "PUBLISHED" && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleWorkflowTransition("REMIND_UNREAD")}
                          className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Nhắc PHHS/HS chưa đọc</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2"
                    dangerouslySetInnerHTML={{ __html: selectedDetail.notification.contentHtml }}
                  />

                  {/* Recall / Amend Control */}
                  {selectedDetail.notification.status === "PUBLISHED" && (
                    <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={recallReason}
                        onChange={(e) => setRecallReason(e.target.value)}
                        placeholder="Lý do thu hồi / đính chính thông báo..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-xs font-semibold"
                      />
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleWorkflowTransition("RECALL")}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Thu hồi thông báo</span>
                      </button>
                    </div>
                  )}

                  {/* Recipient Delivery / Read / Acknowledge Tracking Table */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#5B2D8B]" />
                        <span>
                          Theo dõi Gửi – Đọc – Xác nhận ({selectedDetail.recipients?.length || 0} người nhận)
                        </span>
                      </h4>
                    </div>

                    <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-extrabold sticky top-0">
                          <tr>
                            <th className="p-2.5">Người nhận</th>
                            <th className="p-2.5">Học sinh / Lớp</th>
                            <th className="p-2.5 text-center">1. Gửi</th>
                            <th className="p-2.5 text-center">2. Đã đọc</th>
                            <th className="p-2.5 text-center">3. Xác nhận</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedDetail.recipients || []).slice(0, 60).map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50/80">
                              <td className="p-2.5 font-bold text-slate-800">
                                {r.recipientName}{" "}
                                <span className="text-[10px] text-slate-400">({r.recipientRole})</span>
                              </td>
                              <td className="p-2.5 text-slate-600 font-semibold">
                                {r.studentName ? `${r.studentName} (${r.className})` : r.className || "-"}
                              </td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    r.deliveryStatus === "SENT"
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {r.deliveryStatus}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                {r.isRead ? (
                                  <span className="text-emerald-700 font-extrabold">✓ Đã đọc</span>
                                ) : (
                                  <span className="text-amber-600 font-bold">Chưa đọc</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                {r.isAcknowledged ? (
                                  <span className="text-purple-700 font-extrabold">✓ Đã xác nhận</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Parent & Student Responses Q&A */}
                  {Array.isArray(selectedDetail.responses) && selectedDetail.responses.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-[#5B2D8B]" />
                        <span>Phản hồi từ PHHS / Học sinh ({selectedDetail.responses.length})</span>
                      </h4>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {selectedDetail.responses.map((resp: any) => (
                          <div
                            key={resp.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>
                                {resp.senderName} ({resp.senderRole})
                                {resp.studentName ? ` • HS: ${resp.studentName}` : ""}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(resp.createdAt).toLocaleString("vi-VN")}
                              </span>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: resp.content }} />
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                value={teacherReplyText}
                                onChange={(e) => setTeacherReplyText(e.target.value)}
                                placeholder="Nhập nội dung trả lời PHHS..."
                                className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleReplyToParentResponse(resp.id)}
                                className="px-3 py-1 rounded-lg bg-[#5B2D8B] text-white text-xs font-bold"
                              >
                                Trả lời
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400 font-bold">
                  Chọn một thông báo ở danh sách bên trái để xem chi tiết, phê duyệt, thu hồi hoặc theo dõi tỷ lệ đọc.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: UNIFIED NOTIFICATION COMPOSER + DESKTOP/MOBILE LIVE PREVIEW
      ===================================================================== */}
      {subTab === "COMPOSER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Column */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Biên soạn &amp; Phát hành Thông báo
                </h2>
                <p className="text-xs text-slate-500">
                  Form dùng chung phân quyền theo vai trò ({actor?.role || workspaceRole})
                </p>
              </div>
              <select
                onChange={(e) => handleApplyTemplate(e.target.value)}
                defaultValue=""
                className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-[#5B2D8B] text-xs font-extrabold"
              >
                <option value="" disabled>
                  ✨ Chọn mẫu thông báo chuẩn...
                </option>
                {(meta?.templates || []).map((tpl: any) => (
                  <option key={tpl.code} value={tpl.code}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 1. Thông tin chung */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Nhóm thông báo
                </label>
                <select
                  value={composerForm.category}
                  onChange={(e) =>
                    setComposerForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  {(actor?.isKTDBCL || actor?.isAdmin) && (
                    <option value="EXAM">1. Thông báo Khảo thí</option>
                  )}
                  <option value="TEACHER">2. Thông báo Giáo viên (GVCN/GVBM)</option>
                  {(actor?.isKTDBCL || actor?.isAdmin) && (
                    <>
                      <option value="ACADEMIC_RESULT">3. Thông báo Kết quả học tập</option>
                      <option value="SYSTEM">4. Thông báo Hệ thống</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Loại nghiệp vụ chi tiết
                </label>
                <select
                  value={composerForm.subType}
                  onChange={(e) =>
                    setComposerForm((prev) => ({ ...prev, subType: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  {composerForm.category === "EXAM" ? (
                    <>
                      <option value="EXAM_SCHEDULE">Lịch kiểm tra định kỳ</option>
                      <option value="EXAM_LMS_GUIDE">Hướng dẫn kiểm tra trên LMS</option>
                      <option value="EXAM_SCHEDULE_CHANGE">Thay đổi lịch / phòng / hình thức</option>
                      <option value="EXAM_MAKEUP">Kiểm tra bổ sung / Kiểm tra bù</option>
                    </>
                  ) : (
                    <>
                      {actor?.isGVCN && (
                        <>
                          <option value="GVCN_ANNOUNCEMENT">GVCN - Thông báo lớp chủ nhiệm</option>
                          <option value="GVCN_EXAM_REMINDER">GVCN - Nhắc lịch kiểm tra đã duyệt</option>
                          <option value="GVCN_PREPARATION">GVCN - Nhắc PHHS chuẩn bị cho con</option>
                        </>
                      )}
                      <option value="GVBM_STUDY_GUIDE">GVBM - Hướng dẫn học tập trước kỳ thi</option>
                      <option value="GVBM_REVIEW_TOPICS">GVBM - Nhắc nội dung ôn tập môn học</option>
                      <option value="GVBM_MATERIALS">GVBM - Tài liệu &amp; Dụng cụ cần chuẩn bị</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Mức độ ưu tiên
                </label>
                <select
                  value={composerForm.priority}
                  onChange={(e) =>
                    setComposerForm((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="NORMAL">Thông thường</option>
                  <option value="IMPORTANT">Quan trọng</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>
            </div>

            {/* 2. Liên kết nghiệp vụ Khảo thí & Lớp học */}
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black text-[#5B2D8B] uppercase">
                  Liên kết Kỳ kiểm tra &amp; Phạm vi Lớp / Môn học
                </span>
                <button
                  type="button"
                  onClick={handleAutoPullExamSchedule}
                  className="px-3 py-1.5 rounded-xl bg-[#5B2D8B] text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tự động lấy Lịch, Phòng, Giờ thi từ SSM</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Kỳ kiểm tra (TestingPeriod)
                  </label>
                  <select
                    value={composerForm.testingPeriodId}
                    onChange={(e) =>
                      setComposerForm((prev) => ({ ...prev, testingPeriodId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value="">-- Không gắn kỳ kiểm tra --</option>
                    {(meta?.testingPeriods || []).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Môn kiểm tra / Môn học
                  </label>
                  <select
                    value={composerForm.testingSubjectExamId}
                    onChange={(e) =>
                      setComposerForm((prev) => ({
                        ...prev,
                        testingSubjectExamId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value="">-- Chọn bài kiểm tra trong kỳ --</option>
                    {(meta?.testingExams || [])
                      .filter(
                        (ex: any) =>
                          !composerForm.testingPeriodId ||
                          ex.periodId === composerForm.testingPeriodId
                      )
                      .map((ex: any) => (
                        <option key={ex.id} value={ex.id}>
                          Khối {ex.gradeLevel} • Hình thức {ex.examFormat} ({ex.durationMinutes}p)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Multi-class selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Chọn Lớp nhận thông báo ({composerForm.classIds.length} lớp đã chọn)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto p-2 rounded-xl bg-white border border-slate-200">
                  {availableClasses.map((cls: any) => {
                    const checked = composerForm.classIds.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() =>
                          setComposerForm((prev) => ({
                            ...prev,
                            classIds: checked
                              ? prev.classIds.filter((id) => id !== cls.id)
                              : [...prev.classIds, cls.id],
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          checked
                            ? "bg-[#5B2D8B] text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-purple-100"
                        }`}
                      >
                        {cls.className}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Tiêu đề & Nội dung Rich Text */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Tiêu đề thông báo *
                </label>
                <input
                  type="text"
                  value={composerForm.title}
                  onChange={(e) =>
                    setComposerForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="VD: [Thông báo Khảo thí] Lịch kiểm tra Giữa Học kỳ I - Môn Toán..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Nội dung chi tiết (Hỗ trợ định dạng HTML an toàn) *
                </label>
                <textarea
                  rows={6}
                  value={composerForm.contentHtml}
                  onChange={(e) =>
                    setComposerForm((prev) => ({ ...prev, contentHtml: e.target.value }))
                  }
                  placeholder="Nhập nội dung thông báo gửi tới Phụ huynh và Học sinh..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#6D28D9]"
                />
              </div>
            </div>

            {/* 4. Đối tượng nhận & Thiết lập phát hành */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <span className="block text-[11px] font-extrabold text-slate-700">
                  Tương tác &amp; Xác nhận
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composerForm.requireAcknowledge}
                    onChange={(e) =>
                      setComposerForm((prev) => ({
                        ...prev,
                        requireAcknowledge: e.target.checked,
                      }))
                    }
                    className="rounded text-[#5B2D8B]"
                  />
                  <span>Yêu cầu Phụ huynh / Học sinh bấm &ldquo;Xác nhận đã xem&rdquo;</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composerForm.allowReply}
                    onChange={(e) =>
                      setComposerForm((prev) => ({
                        ...prev,
                        allowReply: e.target.checked,
                      }))
                    }
                    className="rounded text-[#5B2D8B]"
                  />
                  <span>Cho phép Phụ huynh / Học sinh gửi phản hồi hỏi đáp</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-slate-700">
                  Tệp đính kèm (PDF, Word, Excel, Ảnh &le; 15MB)
                </label>
                <input
                  type="text"
                  value={composerForm.attachmentFileName}
                  onChange={(e) =>
                    setComposerForm((prev) => ({
                      ...prev,
                      attachmentFileName: e.target.value,
                    }))
                  }
                  placeholder="Tên tệp (VD: De_cuong_on_tap_HK1.pdf)"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={composerForm.attachmentFileUrl}
                  onChange={(e) =>
                    setComposerForm((prev) => ({
                      ...prev,
                      attachmentFileUrl: e.target.value,
                    }))
                  }
                  placeholder="Đường dẫn tệp đính kèm (URL)"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-wrap">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitComposer("SAVE_DRAFT")}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-extrabold text-slate-700 cursor-pointer"
              >
                Lưu nháp
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitComposer("SUBMIT_APPROVAL")}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold cursor-pointer"
              >
                Gửi duyệt
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitComposer("PUBLISH")}
                className="px-5 py-2.5 rounded-xl bg-[#5B2D8B] hover:bg-[#4C1D95] text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Phát hành thông báo</span>
              </button>
            </div>
          </div>

          {/* Right Live Preview Column (Desktop & Mobile Switcher) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#5B2D8B]" />
                <span>Xem trước hiển thị (Live Preview)</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("MOBILE")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    previewDevice === "MOBILE"
                      ? "bg-[#5B2D8B] text-white"
                      : "text-slate-600"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile PHHS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("DESKTOP")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    previewDevice === "DESKTOP"
                      ? "bg-[#5B2D8B] text-white"
                      : "text-slate-600"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
              </div>
            </div>

            <div
              className={`mx-auto transition-all ${
                previewDevice === "MOBILE" ? "max-w-[370px]" : "w-full"
              }`}
            >
              <div className="bg-white rounded-3xl border-2 border-purple-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#5B2D8B] to-[#003B3A] p-4 text-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/15">
                      {composerForm.senderUnit}
                    </span>
                    <span className="text-[10px] font-bold text-purple-200">Vừa xong</span>
                  </div>
                  <h3 className="text-sm font-black leading-snug">
                    {composerForm.title || "Tiêu đề thông báo sẽ hiển thị tại đây..."}
                  </h3>
                </div>

                <div className="p-4 space-y-3 text-xs text-slate-700">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html:
                        composerForm.contentHtml ||
                        "<p>Nội dung chi tiết của thông báo sẽ hiển thị tại đây...</p>",
                    }}
                  />

                  {composerForm.requireAcknowledge && (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#5B2D8B]">
                        Yêu cầu xác nhận đã đọc
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-[#5B2D8B] text-white text-[11px] font-extrabold">
                        Xác nhận đã xem
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: AUTOMATED EXAM NOTIFICATION EVENTS (6 EVENTS + IDEMPOTENCY)
      ===================================================================== */}
      {subTab === "AUTOMATION" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#5B2D8B]" />
              <span>Tự động hóa Thông báo Khảo thí (Event-Based Notification Engine)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tích hợp trực tiếp với dữ liệu Kỳ kiểm tra, Ca thi và Kết quả điểm đã duyệt. Tích hợp cơ chế chống gửi trùng bằng Idempotency Key.
            </p>
          </div>

          <form onSubmit={handleTriggerAutomatedEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Sự kiện Khảo thí Tự động *
              </label>
              <select
                value={eventForm.eventType}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, eventType: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="EVENT_EXAM_SCHEDULE_PUBLISHED">
                  1. EVENT_EXAM_SCHEDULE_PUBLISHED — Công bố lịch kiểm tra chính thức
                </option>
                <option value="EVENT_EXAM_REMINDER">
                  2. EVENT_EXAM_REMINDER — Nhắc lịch kiểm tra tự động (Trước 3 ngày / 1 ngày)
                </option>
                <option value="EVENT_EXAM_SCHEDULE_CHANGED">
                  3. EVENT_EXAM_SCHEDULE_CHANGED — Thông báo thay đổi lịch / phòng thi
                </option>
                <option value="EVENT_EXAM_STUDENT_ABSENT">
                  4. EVENT_EXAM_STUDENT_ABSENT — Thông báo riêng khi học sinh vắng thi
                </option>
                <option value="EVENT_EXAM_RESULT_PUBLISHED">
                  5. EVENT_EXAM_RESULT_PUBLISHED — Công bố kết quả khi điểm đã được duyệt
                </option>
                <option value="EVENT_EXAM_MAKEUP_SCHEDULED">
                  6. EVENT_EXAM_MAKEUP_SCHEDULED — Thông báo lịch kiểm tra bổ sung / thi bù
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Kỳ kiểm tra (TestingPeriod) *
              </label>
              <select
                value={eventForm.testingPeriodId}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, testingPeriodId: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="">-- Chọn Kỳ kiểm tra --</option>
                {(meta?.testingPeriods || []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Môn / Đề kiểm tra (TestingSubjectExam)
              </label>
              <select
                value={eventForm.testingSubjectExamId}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    testingSubjectExamId: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                <option value="">-- Tất cả môn trong kỳ hoặc chọn môn cụ thể --</option>
                {(meta?.testingExams || [])
                  .filter(
                    (ex: any) =>
                      !eventForm.testingPeriodId || ex.periodId === eventForm.testingPeriodId
                  )
                  .map((ex: any) => (
                    <option key={ex.id} value={ex.id}>
                      Khối {ex.gradeLevel} • {ex.examFormat} ({ex.durationMinutes} phút)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Ca / Phòng kiểm tra (TestingSession)
              </label>
              <select
                value={eventForm.testingSessionId}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, testingSessionId: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                <option value="">-- Chọn ca kiểm tra (tùy chọn) --</option>
                {(meta?.testingSessions || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    Phòng {s.roomName} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>

            {eventForm.eventType === "EVENT_EXAM_SCHEDULE_CHANGED" && (
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Thông tin TRƯỚC điều chỉnh (Phòng / Giờ)
                  </label>
                  <input
                    type="text"
                    value={eventForm.beforeRoom}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, beforeRoom: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    Thông tin SAU điều chỉnh (Phòng / Giờ mới)
                  </label>
                  <input
                    type="text"
                    value={eventForm.afterRoom}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, afterRoom: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs"
                  />
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#5B2D8B] hover:bg-[#4C1D95] text-white text-xs font-extrabold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Kích hoạt Sự kiện &amp; Phát hành Thông báo</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB 4: NOTIFICATION ANALYTICS DASHBOARD (10 KPIS + CHARTS + EXCEL)
      ===================================================================== */}
      {subTab === "DASHBOARD" && (
        <div className="space-y-5">
          {dashboardLoading || !dashboardData ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400 font-bold">
              Đang tổng hợp dữ liệu 10 chỉ số KPI thông báo...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Dashboard Theo dõi Tiếp nhận, Đọc &amp; Xác nhận Thông báo
                  </h2>
                  <p className="text-xs text-slate-500">
                    Phân biệt độc lập 3 trạng thái: Gửi thành công — Đã đọc — Đã xác nhận
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportDashboardExcel}
                  className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Báo cáo Excel (.xlsx)</span>
                </button>
              </div>

              {/* 10 Mandatory KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  {
                    label: "1. Thông báo phát hành",
                    val: dashboardData.kpis.totalPublishedNotifications,
                    color: "text-[#5B2D8B] bg-purple-50 border-purple-200",
                  },
                  {
                    label: "2. Tổng người nhận",
                    val: dashboardData.kpis.totalRecipients,
                    color: "text-slate-800 bg-white border-slate-200",
                  },
                  {
                    label: "3. Gửi thành công",
                    val: dashboardData.kpis.sentSuccessCount,
                    color: "text-sky-800 bg-sky-50 border-sky-200",
                  },
                  {
                    label: "4. Gửi thất bại",
                    val: dashboardData.kpis.sentFailedCount,
                    color: "text-rose-800 bg-rose-50 border-rose-200",
                  },
                  {
                    label: "5. Đã đọc",
                    val: dashboardData.kpis.readCount,
                    color: "text-emerald-800 bg-emerald-50 border-emerald-200",
                  },
                  {
                    label: "6. Chưa đọc",
                    val: dashboardData.kpis.unreadCount,
                    color: "text-amber-800 bg-amber-50 border-amber-200",
                  },
                  {
                    label: "7. Đã xác nhận",
                    val: dashboardData.kpis.acknowledgedCount,
                    color: "text-indigo-800 bg-indigo-50 border-indigo-200",
                  },
                  {
                    label: "8. Chưa xác nhận",
                    val: dashboardData.kpis.unacknowledgedCount,
                    color: "text-slate-700 bg-slate-50 border-slate-200",
                  },
                  {
                    label: "9. Tỷ lệ Đã đọc",
                    val: `${dashboardData.kpis.readRate}%`,
                    color: "text-[#5B2D8B] bg-purple-100/70 border-purple-300",
                  },
                  {
                    label: "10. Tỷ lệ Xác nhận",
                    val: `${dashboardData.kpis.acknowledgeRate}%`,
                    color: "text-teal-900 bg-teal-100/70 border-teal-300",
                  },
                ].map((k, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border ${k.color} space-y-1 shadow-2xs`}
                  >
                    <span className="text-[11px] font-bold opacity-80 block">{k.label}</span>
                    <span className="text-xl font-black tabular-nums">{k.val}</span>
                  </div>
                ))}
              </div>

              {/* Campus & Class Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase">
                    Tỷ lệ đọc &amp; xác nhận theo Cơ sở
                  </h3>
                  <div className="space-y-2.5">
                    {(dashboardData.byCampus || []).map((c: any) => (
                      <div key={c.campusId} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{c.campusName}</span>
                          <span className="text-[#5B2D8B]">
                            Đọc: {c.readRate}% • Xác nhận: {c.acknowledgeRate}% ({c.readCount}/
                            {c.totalRecipients})
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#5B2D8B] to-[#00A19A] rounded-full"
                            style={{ width: `${Math.min(100, c.readRate)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase">
                    Tỷ lệ đọc theo Lớp &amp; Cảnh báo Lớp tỷ lệ đọc thấp (&lt;80%)
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(dashboardData.byClass || []).map((cls: any) => (
                      <div
                        key={cls.classId}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-800">{cls.className}</span>
                          <span className="text-[11px] text-slate-400 ml-1.5">
                            ({cls.campusName})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-bold">
                          <span
                            className={
                              cls.readRate < 80 ? "text-rose-600" : "text-emerald-700"
                            }
                          >
                            Đọc: {cls.readRate}% ({cls.readCount}/{cls.totalRecipients})
                          </span>
                          <span className="text-purple-700">XN: {cls.acknowledgeRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationManagementWorkspace;
