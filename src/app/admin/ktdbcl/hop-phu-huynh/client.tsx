"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import {
    BarChart3,
    Calendar,
    MessageSquare,
    FileText,
    Download,
    Printer,
    Plus,
    AlertTriangle,
    CheckCircle2,
    Users,
    Star,
    RefreshCw,
    Shield,
} from "lucide-react";
import {
    FEEDBACK_TOPIC_GROUPS,
    FeedbackTopicGroupCode,
    MEETING_STATUS_CONFIG,
    MEETING_TYPES,
    MeetingStatusCode,
    MeetingTypeCode,
    MINUTES_STATUS_CONFIG,
    MinutesStatusCode,
} from "@/lib/parent-meeting/constants";

type AdminTab = "overview" | "meetings" | "feedback" | "minutes";

export default function KtdbclParentMeetingAnalyticsClient() {
    const searchParams = useSearchParams();
    const initialTab = (searchParams?.get("tab") as AdminTab) || "overview";

    const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
    const [loading, setLoading] = useState(true);

    // Filter state
    const [academicYearId, setAcademicYearId] = useState("ALL");
    const [semester, setSemester] = useState("ALL");
    const [campusId, setCampusId] = useState("ALL");
    const [classId, setClassId] = useState("ALL");
    const [topicGroup, setTopicGroup] = useState("ALL");

    const [meta, setMeta] = useState<{
        academicYears: any[];
        campuses: any[];
        classes: any[];
    }>({ academicYears: [], campuses: [], classes: [] });

    const [analytics, setAnalytics] = useState<any | null>(null);
    const [meetings, setMeetings] = useState<any[]>([]);

    // Multi-class Meeting Creation Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState<MeetingTypeCode>("DINH_KY");
    const [newSemester, setNewSemester] = useState("HK1");
    const [newStartTime, setNewStartTime] = useState("");
    const [newEndTime, setNewEndTime] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [newAgenda, setNewAgenda] = useState("");
    const [newClassIds, setNewClassIds] = useState<string[]>([]);

    // Drill-down modal
    const [drillDownClass, setDrillDownClass] = useState<any | null>(null);
    const [drillDownDetail, setDrillDownDetail] = useState<any | null>(null);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const listUrl = new URL("/api/parent-meetings", window.location.origin);
            listUrl.searchParams.set("includeMeta", "true");
            if (academicYearId !== "ALL") listUrl.searchParams.set("academicYearId", academicYearId);
            if (semester !== "ALL") listUrl.searchParams.set("semester", semester);
            if (campusId !== "ALL") listUrl.searchParams.set("campusId", campusId);
            if (classId !== "ALL") listUrl.searchParams.set("classId", classId);

            const analyticsUrl = new URL("/api/parent-meetings/analytics", window.location.origin);
            if (academicYearId !== "ALL")
                analyticsUrl.searchParams.set("academicYearId", academicYearId);
            if (semester !== "ALL") analyticsUrl.searchParams.set("semester", semester);
            if (campusId !== "ALL") analyticsUrl.searchParams.set("campusId", campusId);
            if (classId !== "ALL") analyticsUrl.searchParams.set("classId", classId);
            if (topicGroup !== "ALL") analyticsUrl.searchParams.set("topicGroup", topicGroup);

            const [listRes, anaRes] = await Promise.all([
                fetch(listUrl.toString()),
                fetch(analyticsUrl.toString()),
            ]);

            const listData = await listRes.json();
            const anaData = await anaRes.json();

            if (listRes.ok) {
                setMeetings(listData.items || []);
                if (listData.meta) setMeta(listData.meta);
            }
            if (anaRes.ok) {
                setAnalytics(anaData);
            }
        } catch {
            toast.error("Lỗi khi tải dữ liệu báo cáo chất lượng họp phụ huynh.");
        } finally {
            setLoading(false);
        }
    }, [academicYearId, semester, campusId, classId, topicGroup]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const handleExportExcel = () => {
        if (!analytics?.classComparison) return;
        const rows = analytics.classComparison.map((r: any, idx: number) => ({
            STT: idx + 1,
            "Mã cuộc họp": r.meetingCode,
            "Tên cuộc họp": r.meetingTitle,
            "Cơ sở": r.campusName,
            Lớp: r.className,
            GVCN: r.homeroomTeacherName,
            "Tổng số HS": r.totalStudents,
            "Xác nhận RSVP": r.confirmedCount,
            "Đại diện HS tham dự": r.presentStudentCount,
            "Số người dự thực tế": r.actualAttendeeCount,
            "Tỷ lệ tham dự (%)": r.attendanceRate,
            "Tổng ý kiến": r.feedbackCount,
            "Ý kiến quá hạn": r.overdueFeedbackCount,
            "Trạng thái Biên bản": r.minutesStatus,
            "Hoàn thành nhiệm vụ (%)": r.taskCompletionRate,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "HopPhuHuynh_KTDBCL");
        XLSX.writeFile(wb, `BaoCao_HopPhuHuynh_SSM_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success("Đã xuất báo cáo Excel thành công!");
    };

    const handleCreateMultiClassMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || newClassIds.length === 0 || !newStartTime || !newEndTime) {
            toast.error("Vui lòng nhập tiêu đề, thời gian và chọn ít nhất một lớp.");
            return;
        }
        const defaultYear =
            meta.academicYears.find((y) => y.isCurrent)?.id ||
            meta.academicYears[0]?.id ||
            "";
        const firstClass = meta.classes.find((c) => newClassIds.includes(c.id));

        try {
            const res = await fetch("/api/parent-meetings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTitle,
                    meetingType: newType,
                    academicYearId: defaultYear,
                    semester: newSemester,
                    campusId: firstClass?.campusId || meta.campuses[0]?.id || "",
                    startTime: newStartTime,
                    endTime: newEndTime,
                    location: newLocation,
                    agenda: newAgenda,
                    status: "PUBLISHED",
                    classIds: newClassIds,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể tạo cuộc họp.");
                return;
            }
            toast.success(
                `Đã công bố lịch họp cho ${data.classCount} lớp (${data.invitationsCount} thư mời PHHS)!`
            );
            setIsCreateOpen(false);
            await loadDashboard();
        } catch {
            toast.error("Lỗi khi tạo lịch họp.");
        }
    };

    const handleApproveMinutes = async (
        meetingId: string,
        targetClassId: string,
        action: "APPROVE" | "PUBLISH" | "REJECT"
    ) => {
        try {
            const res = await fetch(`/api/parent-meetings/${meetingId}/minutes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classId: targetClassId,
                    action,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể duyệt biên bản.");
                return;
            }
            toast.success("Đã cập nhật phê duyệt biên bản thành công!");
            await loadDashboard();
        } catch {
            toast.error("Lỗi khi duyệt biên bản.");
        }
    };

    const openDrillDown = async (row: any) => {
        setDrillDownClass(row);
        try {
            const res = await fetch(
                `/api/parent-meetings/${row.meetingId}?classId=${row.classId}`
            );
            const data = await res.json();
            if (res.ok) setDrillDownDetail(data);
        } catch {
            // Ignore
        }
    };

    const kpis = analytics?.kpis || {
        totalMeetings: 0,
        onScheduleRate: 100,
        rsvpConfirmationRate: 0,
        studentAttendanceRate: 0,
        totalActualAttendees: 0,
        totalFeedbackCount: 0,
        onTimeResponseRate: 100,
        feedbackCompletionRate: 100,
        overdueFeedbackCount: 0,
        averageCsat: 0,
        recurringIssuesCount: 0,
    };

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-16 font-sans text-slate-800">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#003B3A] to-[#006A67] rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full text-teal-200 mb-2">
                        <Shield className="w-3.5 h-3.5" />
                        <span>BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG • QUẢN LÝ CƠ SỞ</span>
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold">
                        Trung Tâm Quản Trị & Giám Sát Chất Lượng Họp Phụ Huynh Số
                    </h1>
                    <p className="text-xs sm:text-sm text-teal-100/90 mt-0.5">
                        Theo dõi 11 chỉ số KPI toàn hệ thống, giám sát SLA phản hồi ý kiến PHHS, phê duyệt biên bản số và trích xuất báo cáo.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00A19A] hover:bg-[#008983] text-white text-xs font-bold cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Lập lịch họp Cơ sở / Khối</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span>Xuất Excel</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Xuất PDF</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Năm học
                    </label>
                    <select
                        value={academicYearId}
                        onChange={(e) => setAcademicYearId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                    >
                        <option value="ALL">Tất cả năm học</option>
                        {meta.academicYears.map((y) => (
                            <option key={y.id} value={y.id}>
                                {y.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Học kỳ
                    </label>
                    <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                    >
                        <option value="ALL">Tất cả học kỳ</option>
                        <option value="HK1">Học kỳ I</option>
                        <option value="HK2">Học kỳ II</option>
                        <option value="CA_NAM">Cả năm</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Cơ sở đào tạo
                    </label>
                    <select
                        value={campusId}
                        onChange={(e) => setCampusId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                    >
                        <option value="ALL">Toàn hệ thống</option>
                        {meta.campuses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Lớp học
                    </label>
                    <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                    >
                        <option value="ALL">Tất cả các lớp</option>
                        {meta.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                Lớp {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Nhóm chủ đề góp ý
                    </label>
                    <select
                        value={topicGroup}
                        onChange={(e) => setTopicGroup(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                    >
                        <option value="ALL">Tất cả chủ đề</option>
                        {Object.entries(FEEDBACK_TOPIC_GROUPS).map(([code, cfg]) => (
                            <option key={code} value={code}>
                                {cfg.labelVi}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 4 Sub-navigation Tabs */}
            <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                    {
                        id: "overview" as AdminTab,
                        label: "1. Dashboard Chất lượng (11 KPI)",
                        icon: BarChart3,
                    },
                    {
                        id: "meetings" as AdminTab,
                        label: "2. Quản lý Lịch họp & Phê duyệt",
                        icon: Calendar,
                    },
                    {
                        id: "feedback" as AdminTab,
                        label: "3. Giám sát Ý kiến & SLA",
                        icon: MessageSquare,
                    },
                    {
                        id: "minutes" as AdminTab,
                        label: "4. Duyệt Biên bản & Nhiệm vụ",
                        icon: FileText,
                    },
                ].map((t) => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === t.id
                                    ? "bg-[#003B3A] text-white shadow-xs"
                                    : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
                    <RefreshCw className="w-7 h-7 text-[#00A19A] animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 mt-2">
                        Đang tổng hợp dữ liệu phân tích từ cơ sở dữ liệu...
                    </p>
                </div>
            ) : (
                <>
                    {/* TAB 1: DASHBOARD 11 KPI & BIỂU ĐỒ */}
                    {activeTab === "overview" && (
                        <div className="space-y-5">
                            {/* 11 Mandatory KPI Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <span className="text-[11px] text-slate-500 block">
                                        1. Số cuộc họp tổ chức
                                    </span>
                                    <strong className="text-xl font-black text-slate-900">
                                        {kpis.totalMeetings}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <span className="text-[11px] text-slate-500 block">
                                        2. Đúng kế hoạch
                                    </span>
                                    <strong className="text-xl font-black text-teal-700">
                                        {kpis.onScheduleRate}%
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <span className="text-[11px] text-slate-500 block">
                                        3. Tỷ lệ xác nhận RSVP
                                    </span>
                                    <strong className="text-xl font-black text-blue-700">
                                        {kpis.rsvpConfirmationRate}%
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-teal-200 bg-teal-50/40">
                                    <span className="text-[11px] text-teal-800 block">
                                        4. Đại diện HS tham dự
                                    </span>
                                    <strong className="text-xl font-black text-[#00A19A]">
                                        {kpis.studentAttendanceRate}%
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40">
                                    <span className="text-[11px] text-emerald-800 block">
                                        5. Số người thực tế dự
                                    </span>
                                    <strong className="text-xl font-black text-emerald-700">
                                        {kpis.totalActualAttendees}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <span className="text-[11px] text-slate-500 block">
                                        6. Tổng ý kiến tiếp nhận
                                    </span>
                                    <strong className="text-xl font-black text-slate-900">
                                        {kpis.totalFeedbackCount}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <span className="text-[11px] text-slate-500 block">
                                        7. Phản hồi đúng hạn
                                    </span>
                                    <strong className="text-xl font-black text-teal-700">
                                        {kpis.onTimeResponseRate}%
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                                    <span className="text-[11px] text-slate-500 block">
                                        8. Xử lý hoàn tất
                                    </span>
                                    <strong className="text-xl font-black text-emerald-700">
                                        {kpis.feedbackCompletionRate}%
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-rose-200 bg-rose-50/50">
                                    <span className="text-[11px] text-rose-800 block">
                                        9. Ý kiến quá hạn SLA
                                    </span>
                                    <strong className="text-xl font-black text-rose-600">
                                        {kpis.overdueFeedbackCount}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/40">
                                    <span className="text-[11px] text-amber-800 block">
                                        10. Mức hài lòng PHHS
                                    </span>
                                    <strong className="text-xl font-black text-amber-600">
                                        {kpis.averageCsat}/5.0 ★
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-purple-200 bg-purple-50/40 col-span-2">
                                    <span className="text-[11px] text-purple-800 block">
                                        11. Vấn đề lặp lại nhiều lần (Cần lưu ý cải tiến)
                                    </span>
                                    <strong className="text-xl font-black text-purple-700">
                                        {kpis.recurringIssuesCount} nhóm vấn đề
                                    </strong>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        So sánh Tỷ lệ Tham dự & Hoàn thành Nhiệm vụ theo Lớp
                                    </h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics?.classComparison || []}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="className" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Bar
                                                    dataKey="attendanceRate"
                                                    name="Tỷ lệ tham dự (%)"
                                                    fill="#00A19A"
                                                    radius={[6, 6, 0, 0]}
                                                />
                                                <Bar
                                                    dataKey="taskCompletionRate"
                                                    name="Hoàn thành nhiệm vụ (%)"
                                                    fill="#003B3A"
                                                    radius={[6, 6, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Phân bố Ý kiến Phụ huynh theo 7 Nhóm Chủ Đề
                                    </h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics?.topicDistribution || []}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="labelVi" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Bar
                                                    dataKey="total"
                                                    name="Tổng ý kiến"
                                                    fill="#0284C7"
                                                    radius={[6, 6, 0, 0]}
                                                />
                                                <Bar
                                                    dataKey="overdue"
                                                    name="Quá hạn"
                                                    fill="#E11D48"
                                                    radius={[6, 6, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Class Drill-down Comparison Table */}
                            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                                <h3 className="text-sm font-bold text-slate-900">
                                    Bảng Tổng Hợp & Drill-down Chi Tiết Từng Lớp / Cuộc Họp
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                                <th className="py-2.5 px-3 font-bold">Cuộc họp</th>
                                                <th className="py-2.5 px-3 font-bold">Cơ sở / Lớp</th>
                                                <th className="py-2.5 px-3 font-bold">GVCN</th>
                                                <th className="py-2.5 px-3 font-bold">
                                                    Đại diện HS dự
                                                </th>
                                                <th className="py-2.5 px-3 font-bold">
                                                    Người dự thực tế
                                                </th>
                                                <th className="py-2.5 px-3 font-bold">Ý kiến</th>
                                                <th className="py-2.5 px-3 font-bold">Biên bản</th>
                                                <th className="py-2.5 px-3 font-bold text-right">
                                                    Chi tiết
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(analytics?.classComparison || []).map(
                                                (row: any, i: number) => (
                                                    <tr
                                                        key={`${row.meetingId}_${row.classId}_${i}`}
                                                        className="hover:bg-slate-50"
                                                    >
                                                        <td className="py-2.5 px-3 font-bold text-slate-900">
                                                            {row.meetingTitle}
                                                            <span className="block text-[10px] font-normal text-slate-400">
                                                                {row.meetingCode}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className="font-bold">
                                                                Lớp {row.className}
                                                            </span>
                                                            <span className="block text-[10px] text-slate-500">
                                                                {row.campusName}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {row.homeroomTeacherName}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-bold text-[#00A19A]">
                                                            {row.presentStudentCount}/
                                                            {row.totalStudents} ({row.attendanceRate}
                                                            %)
                                                        </td>
                                                        <td className="py-2.5 px-3 font-bold">
                                                            {row.actualAttendeeCount} người
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span>{row.feedbackCount} ý kiến</span>
                                                            {row.overdueFeedbackCount > 0 && (
                                                                <span className="ml-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                                                    {row.overdueFeedbackCount} quá hạn
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className="text-[11px] font-bold">
                                                                {MINUTES_STATUS_CONFIG[
                                                                    row.minutesStatus as MinutesStatusCode
                                                                ]?.labelVi || "Chưa lập"}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => openDrillDown(row)}
                                                                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
                                                            >
                                                                Drill-down
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: QUẢN LÝ LỊCH HỌP */}
                    {activeTab === "meetings" && (
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
                            <h3 className="text-base font-bold text-slate-900">
                                Danh sách Kế hoạch Họp Phụ huynh
                            </h3>
                            <div className="space-y-3">
                                {meetings.map((m) => (
                                    <div
                                        key={m.id}
                                        className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500">
                                                    {m.meetingCode}
                                                </span>
                                                <span
                                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                                        MEETING_STATUS_CONFIG[
                                                            m.status as MeetingStatusCode
                                                        ]?.badgeClass
                                                    }`}
                                                >
                                                    {
                                                        MEETING_STATUS_CONFIG[
                                                            m.status as MeetingStatusCode
                                                        ]?.labelVi
                                                    }
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-900">
                                                {m.title}
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                Thời gian:{" "}
                                                {new Date(m.startTime).toLocaleString("vi-VN")} • Số lớp:{" "}
                                                <strong>{m.classes?.length || 0} lớp</strong> • Tham dự:{" "}
                                                <strong>
                                                    {m.stats?.presentStudentCount}/
                                                    {m.stats?.totalStudents} HS (
                                                    {m.stats?.attendanceRate}%)
                                                </strong>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: GIÁM SÁT Ý KIẾN & QUÁ HẠN SLA */}
                    {activeTab === "feedback" && (
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-600" />
                                <span>
                                    Danh sách Cảnh báo Quá hạn Phản hồi & Nhiệm vụ ({analytics?.overdueAlerts?.length || 0})
                                </span>
                            </h3>
                            {(analytics?.overdueAlerts || []).length === 0 ? (
                                <div className="py-8 text-center text-xs text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-200">
                                    100% ý kiến và nhiệm vụ sau họp đều đang trong hạn SLA quy định!
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {(analytics?.overdueAlerts || []).map((al: any) => (
                                        <div
                                            key={al.id}
                                            className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 flex items-center justify-between text-xs"
                                        >
                                            <div>
                                                <span className="font-bold text-rose-800">
                                                    [{al.type}] {al.code} — {al.title}
                                                </span>
                                                <p className="text-slate-600 mt-0.5">
                                                    Lớp {al.className} ({al.campusName}) • Người phụ trách:{" "}
                                                    <strong>{al.assigneeName}</strong>
                                                </p>
                                            </div>
                                            <span className="font-bold text-rose-700">
                                                Hạn: {new Date(al.dueAt).toLocaleString("vi-VN")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: DUYỆT BIÊN BẢN & NHIỆM VỤ */}
                    {activeTab === "minutes" && (
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
                            <h3 className="text-base font-bold text-slate-900">
                                Phê duyệt & Công bố Biên bản Họp Phụ huynh Số
                            </h3>
                            <div className="space-y-3">
                                {(analytics?.classComparison || []).map((row: any, idx: number) => (
                                    <div
                                        key={`${row.meetingId}_${row.classId}_${idx}`}
                                        className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                    >
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-900">
                                                Lớp {row.className} — {row.meetingTitle}
                                            </h4>
                                            <p className="text-slate-500">
                                                GVCN: {row.homeroomTeacherName} • Trạng thái biên bản:{" "}
                                                <strong>
                                                    {MINUTES_STATUS_CONFIG[
                                                        row.minutesStatus as MinutesStatusCode
                                                    ]?.labelVi || "Chưa lập"}
                                                </strong>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleApproveMinutes(
                                                        row.meetingId,
                                                        row.classId,
                                                        "APPROVE"
                                                    )
                                                }
                                                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold cursor-pointer"
                                            >
                                                Phê duyệt
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleApproveMinutes(
                                                        row.meetingId,
                                                        row.classId,
                                                        "PUBLISH"
                                                    )
                                                }
                                                className="px-3 py-1.5 rounded-xl bg-[#00A19A] text-white font-bold cursor-pointer"
                                            >
                                                Công bố PHHS
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal: Create Multi-Class Meeting */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <h3 className="text-base font-bold text-slate-900">
                            Lập Kế Hoạch Họp Phụ Huynh Cấp Cơ Sở / Khối
                        </h3>
                        <form onSubmit={handleCreateMultiClassMeeting} className="space-y-3">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Tên cuộc họp *
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Loại cuộc họp
                                    </label>
                                    <select
                                        value={newType}
                                        onChange={(e) =>
                                            setNewType(e.target.value as MeetingTypeCode)
                                        }
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    >
                                        {Object.entries(MEETING_TYPES).map(([code, cfg]) => (
                                            <option key={code} value={code}>
                                                {cfg.labelVi}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Học kỳ
                                    </label>
                                    <select
                                        value={newSemester}
                                        onChange={(e) => setNewSemester(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    >
                                        <option value="HK1">Học kỳ I</option>
                                        <option value="HK2">Học kỳ II</option>
                                        <option value="CA_NAM">Cả năm</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Bắt đầu *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newStartTime}
                                        onChange={(e) => setNewStartTime(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Kết thúc *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newEndTime}
                                        onChange={(e) => setNewEndTime(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="font-bold text-slate-700">
                                        Chọn các lớp tham dự ({newClassIds.length} lớp)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setNewClassIds(meta.classes.map((c) => c.id))
                                        }
                                        className="text-[#00A19A] font-bold underline cursor-pointer"
                                    >
                                        Chọn tất cả
                                    </button>
                                </div>
                                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 grid grid-cols-3 gap-1.5">
                                    {meta.classes.map((cls) => (
                                        <label
                                            key={cls.id}
                                            className="flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={newClassIds.includes(cls.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setNewClassIds((prev) => [...prev, cls.id]);
                                                    } else {
                                                        setNewClassIds((prev) =>
                                                            prev.filter((id) => id !== cls.id)
                                                        );
                                                    }
                                                }}
                                            />
                                            <span>{cls.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-[#00A19A] text-white font-bold cursor-pointer"
                                >
                                    Công bố lịch họp
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Drill-down Class Detail */}
            {drillDownClass && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Chi Tiết Họp Phụ Huynh — Lớp {drillDownClass.className}
                                </h3>
                                <p className="text-slate-500">
                                    {drillDownClass.meetingTitle} • GVCN:{" "}
                                    {drillDownClass.homeroomTeacherName}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setDrillDownClass(null);
                                    setDrillDownDetail(null);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold cursor-pointer"
                            >
                                Đóng
                            </button>
                        </div>

                        {drillDownDetail ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl">
                                    <div>
                                        <span className="text-slate-500 block">Đại diện HS</span>
                                        <strong className="text-sm">
                                            {drillDownDetail.stats?.presentStudentCount}/
                                            {drillDownDetail.stats?.totalStudents} HS
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">
                                            Số người dự thực tế
                                        </span>
                                        <strong className="text-sm">
                                            {drillDownDetail.stats?.actualAttendeeCount} người
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">
                                            Ý kiến tiếp nhận
                                        </span>
                                        <strong className="text-sm">
                                            {(drillDownDetail.feedbacks || []).length} ý kiến
                                        </strong>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1">
                                        Kết luận biên bản:
                                    </h4>
                                    <p className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        {drillDownDetail.minutes?.conclusions ||
                                            "Chưa có kết luận biên bản."}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 py-4 text-center">
                                Đang tải dữ liệu chi tiết lớp...
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
