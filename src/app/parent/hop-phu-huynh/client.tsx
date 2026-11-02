"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
    Calendar,
    QrCode,
    MessageSquare,
    FileText,
    CheckSquare,
    MapPin,
    Clock,
    User,
    GraduationCap,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Send,
    Star,
    ShieldCheck,
    Video,
    Users,
    ChevronRight,
    Printer,
} from "lucide-react";
import {
    ATTENDEE_ROLES,
    AttendeeRoleCode,
    FEEDBACK_BUSINESS_STATUS,
    FEEDBACK_STAGE_LABELS,
    FEEDBACK_TOPIC_GROUPS,
    FeedbackBusinessStatusCode,
    FeedbackStageCode,
    FeedbackTopicGroupCode,
    MEETING_STATUS_CONFIG,
    MEETING_TASK_STATUS_CONFIG,
    MEETING_TYPES,
    MeetingStatusCode,
    MeetingTaskStatusCode,
    MeetingTypeCode,
    RSVP_STATUS_CONFIG,
    RsvpStatusCode,
} from "@/lib/parent-meeting/constants";

type ParentTab = "schedule" | "qr" | "feedback" | "minutes" | "tasks";

export default function ParentMeetingPortalClient() {
    const searchParams = useSearchParams();
    const initialMeetingId = searchParams?.get("meetingId") || "";
    const initialStudentId = searchParams?.get("studentId") || "";

    const [lang, setLang] = useState<"vi" | "en">("vi");
    const [activeTab, setActiveTab] = useState<ParentTab>("schedule");
    const [loading, setLoading] = useState(true);

    const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [selectedMeetingId, setSelectedMeetingId] = useState<string>(initialMeetingId);

    const [detailData, setDetailData] = useState<any | null>(null);
    const [qrState, setQrState] = useState<any | null>(null);
    const [loadingQr, setLoadingQr] = useState(false);

    // RSVP Modal / Form state
    const [rsvpStatus, setRsvpStatus] = useState<RsvpStatusCode>("CONFIRMED");
    const [attendeeRole, setAttendeeRole] = useState<AttendeeRoleCode>("BO");
    const [attendeeName, setAttendeeName] = useState("");
    const [attendeePhone, setAttendeePhone] = useState("");
    const [absenceReason, setAbsenceReason] = useState("");
    const [rsvpNote, setRsvpNote] = useState("");
    const [submittingRsvp, setSubmittingRsvp] = useState(false);

    // Feedback Form state
    const [fbStage, setFbStage] = useState<FeedbackStageCode>("PRE_MEETING");
    const [fbTopic, setFbTopic] = useState<FeedbackTopicGroupCode>("KET_QUA_HOC_TAP");
    const [fbTitle, setFbTitle] = useState("");
    const [fbContent, setFbContent] = useState("");
    const [fbAttachmentUrl, setFbAttachmentUrl] = useState("");
    const [fbShareSummary, setFbShareSummary] = useState(false);
    const [submittingFb, setSubmittingFb] = useState(false);

    // Reply & CSAT state
    const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
    const [csatScoreMap, setCsatScoreMap] = useState<Record<string, number>>({});
    const [csatCommentMap, setCsatCommentMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const saved = localStorage.getItem("ssm_lang");
        if (saved === "en" || saved === "vi") setLang(saved);
        const handler = (e: any) => {
            if (e?.detail === "en" || e?.detail === "vi") setLang(e.detail);
        };
        window.addEventListener("ssm_language_change", handler);
        return () => window.removeEventListener("ssm_language_change", handler);
    }, []);

    const loadMeetings = useCallback(async (studentIdFilter?: string) => {
        setLoading(true);
        try {
            const url = new URL("/api/parent-meetings", window.location.origin);
            url.searchParams.set("includeMeta", "true");
            if (studentIdFilter) url.searchParams.set("studentId", studentIdFilter);

            const res = await fetch(url.toString());
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể tải danh sách lịch họp.");
                return;
            }

            const students = data.actor?.linkedStudents || [];
            setLinkedStudents(students);

            const resolvedStudentId =
                studentIdFilter ||
                selectedStudentId ||
                students[0]?.studentId ||
                "";
            if (resolvedStudentId && resolvedStudentId !== selectedStudentId) {
                setSelectedStudentId(resolvedStudentId);
            }

            const items = data.items || [];
            setMeetings(items);

            if (items.length > 0) {
                const chosenId =
                    items.find((m: any) => m.id === selectedMeetingId)?.id || items[0].id;
                setSelectedMeetingId(chosenId);
            } else {
                setSelectedMeetingId("");
                setDetailData(null);
            }
        } catch {
            toast.error("Lỗi kết nối máy chủ khi tải lịch họp.");
        } finally {
            setLoading(false);
        }
    }, [selectedStudentId, selectedMeetingId]);

    const loadMeetingDetail = useCallback(
        async (meetingId: string, studentId: string) => {
            if (!meetingId) return;
            try {
                const url = new URL(`/api/parent-meetings/${meetingId}`, window.location.origin);
                if (studentId) url.searchParams.set("studentId", studentId);
                const res = await fetch(url.toString());
                const data = await res.json();
                if (res.ok) {
                    setDetailData(data);
                    if (data.invitation) {
                        setRsvpStatus(
                            (data.invitation.rsvpStatus as RsvpStatusCode) === "PENDING"
                                ? "CONFIRMED"
                                : (data.invitation.rsvpStatus as RsvpStatusCode)
                        );
                        setAttendeeRole(
                            (data.invitation.attendeeRole as AttendeeRoleCode) || "BO"
                        );
                        setAttendeeName(data.invitation.attendeeName || "");
                        setAttendeePhone(data.invitation.attendeePhone || "");
                        setAbsenceReason(data.invitation.absenceReason || "");
                        setRsvpNote(data.invitation.rsvpNote || "");
                    }
                }
            } catch {
                // Silent fallback
            }
        },
        []
    );

    const loadQrToken = useCallback(
        async (meetingId: string, studentId: string, refresh = false) => {
            if (!meetingId || !studentId) return;
            setLoadingQr(true);
            try {
                const url = new URL(
                    `/api/parent-meetings/${meetingId}/qr`,
                    window.location.origin
                );
                url.searchParams.set("studentId", studentId);
                if (refresh) url.searchParams.set("refresh", "true");

                const res = await fetch(url.toString());
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error || "Chưa thể phát hành mã QR.");
                    return;
                }
                setQrState(data);
                if (refresh) {
                    toast.success(
                        lang === "en"
                            ? "QR code refreshed successfully!"
                            : "Đã làm mới mã QR điểm danh!"
                    );
                }
            } catch {
                toast.error("Không thể tải mã QR điểm danh.");
            } finally {
                setLoadingQr(false);
            }
        },
        [lang]
    );

    useEffect(() => {
        loadMeetings(selectedStudentId || undefined);
    }, [selectedStudentId]);

    useEffect(() => {
        if (selectedMeetingId && selectedStudentId) {
            loadMeetingDetail(selectedMeetingId, selectedStudentId);
        }
    }, [selectedMeetingId, selectedStudentId, loadMeetingDetail]);

    useEffect(() => {
        if (activeTab === "qr" && selectedMeetingId && selectedStudentId) {
            loadQrToken(selectedMeetingId, selectedStudentId, false);
        }
    }, [activeTab, selectedMeetingId, selectedStudentId, loadQrToken]);

    const activeStudent = useMemo(() => {
        return (
            linkedStudents.find((s) => s.studentId === selectedStudentId) ||
            linkedStudents[0] ||
            null
        );
    }, [linkedStudents, selectedStudentId]);

    const handleRsvpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMeetingId || !selectedStudentId) return;
        setSubmittingRsvp(true);
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/rsvp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: selectedStudentId,
                    rsvpStatus,
                    attendeeRole,
                    attendeeName,
                    attendeePhone,
                    absenceReason,
                    rsvpNote,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể lưu xác nhận.");
                return;
            }
            toast.success(
                lang === "en"
                    ? "Attendance confirmation saved!"
                    : "Đã lưu xác nhận tham dự thành công!"
            );
            await loadMeetingDetail(selectedMeetingId, selectedStudentId);
            await loadMeetings(selectedStudentId);
        } catch {
            toast.error("Lỗi kết nối khi gửi xác nhận.");
        } finally {
            setSubmittingRsvp(false);
        }
    };

    const handleCreateFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMeetingId || !selectedStudentId) return;
        if (!fbContent.trim()) {
            toast.error("Vui lòng nhập nội dung câu hỏi hoặc ý kiến góp ý.");
            return;
        }
        setSubmittingFb(true);
        try {
            const attachments = fbAttachmentUrl.trim()
                ? [{ fileName: "Tài liệu đính kèm", fileUrl: fbAttachmentUrl.trim() }]
                : undefined;

            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: selectedStudentId,
                    classId: activeStudent?.classId,
                    stage: fbStage,
                    topicGroup: fbTopic,
                    title: fbTitle,
                    content: fbContent,
                    attachments,
                    visibilityScope: fbShareSummary ? "CLASS_SHARED_ANONYMOUS" : "PRIVATE",
                    allowShareInSummary: fbShareSummary,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể gửi ý kiến.");
                return;
            }
            toast.success("Đã gửi ý kiến tới Giáo viên chủ nhiệm!");
            setFbTitle("");
            setFbContent("");
            setFbAttachmentUrl("");
            await loadMeetingDetail(selectedMeetingId, selectedStudentId);
        } catch {
            toast.error("Lỗi kết nối khi gửi ý kiến.");
        } finally {
            setSubmittingFb(false);
        }
    };

    const handleReplyFeedback = async (feedbackId: string) => {
        const text = replyTextMap[feedbackId]?.trim();
        if (!text || !selectedMeetingId) return;
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    feedbackId,
                    action: "REPLY",
                    messageContent: text,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || "Không thể gửi phản hồi.");
                return;
            }
            toast.success("Đã gửi phản hồi trong luồng trao đổi!");
            setReplyTextMap((prev) => ({ ...prev, [feedbackId]: "" }));
            await loadMeetingDetail(selectedMeetingId, selectedStudentId);
        } catch {
            toast.error("Lỗi khi gửi phản hồi.");
        }
    };

    const handleRateCsat = async (feedbackId: string) => {
        const score = csatScoreMap[feedbackId] || 5;
        const comment = csatCommentMap[feedbackId] || "";
        if (!selectedMeetingId) return;
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    feedbackId,
                    action: "RATE_CSAT",
                    csatScore: score,
                    csatComment: comment,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || "Không thể gửi đánh giá.");
                return;
            }
            toast.success("Cảm ơn Quý Phụ huynh đã đánh giá mức độ hài lòng!");
            await loadMeetingDetail(selectedMeetingId, selectedStudentId);
        } catch {
            toast.error("Lỗi khi gửi đánh giá hài lòng.");
        }
    };

    const tabs: Array<{ id: ParentTab; labelVi: string; labelEn: string; icon: any }> = [
        { id: "schedule", labelVi: "Lịch họp", labelEn: "Schedule", icon: Calendar },
        { id: "qr", labelVi: "QR tham dự", labelEn: "Attendance QR", icon: QrCode },
        {
            id: "feedback",
            labelVi: "Trao đổi & Góp ý",
            labelEn: "Q&A & Feedback",
            icon: MessageSquare,
        },
        {
            id: "minutes",
            labelVi: "Biên bản & Kết luận",
            labelEn: "Minutes & Conclusions",
            icon: FileText,
        },
        {
            id: "tasks",
            labelVi: "Theo dõi sau họp",
            labelEn: "Post-Meeting Follow-up",
            icon: CheckSquare,
        },
    ];

    const currentMeeting = detailData?.meeting;
    const currentInvitation = detailData?.invitation;
    const currentAttendance = detailData?.attendance;
    const currentClassObj = currentMeeting?.classes?.find(
        (c: any) => c.classId === activeStudent?.classId
    ) || currentMeeting?.classes?.[0];

    return (
        <div className="max-w-5xl mx-auto space-y-5 pb-20 font-sans text-slate-800">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#003B3A] to-[#006A67] rounded-3xl p-5 sm:p-6 text-white shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full text-teal-200 mb-2">
                            <QrCode className="w-3.5 h-3.5" />
                            <span>
                                {lang === "en"
                                    ? "SKY-LINE DIGITAL PARENT MEETING"
                                    : "HỌP PHỤ HUYNH SỐ SKY-LINE"}
                            </span>
                        </span>
                        <h1 className="text-xl sm:text-2xl font-bold">
                            {lang === "en"
                                ? "Parent Meeting & Companion Portal"
                                : "Cổng Họp Phụ Huynh & Đồng Hành Giáo Dục"}
                        </h1>
                        <p className="text-xs sm:text-sm text-teal-100/90 mt-1">
                            {lang === "en"
                                ? "Confirm attendance, open check-in QR, submit questions, and view official meeting minutes."
                                : "Xác nhận tham dự, mở mã QR điểm danh điện tử, gửi ý kiến trao đổi và xem biên bản kết luận cuộc họp."}
                        </p>
                    </div>

                    {/* Child Switcher for Multi-Child Parents */}
                    {linkedStudents.length > 0 && (
                        <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-3 min-w-[230px]">
                            <label className="block text-[11px] text-teal-200 font-semibold mb-1.5">
                                {lang === "en" ? "Select Student:" : "Hồ sơ Học sinh:"}
                            </label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="w-full bg-white text-slate-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-hidden"
                            >
                                {linkedStudents.map((st) => (
                                    <option key={st.studentId} value={st.studentId}>
                                        {st.studentName} — Lớp {st.className} ({st.studentCode})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Meeting Selector Pill Bar if multiple meetings exist */}
            {meetings.length > 1 && (
                <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs font-bold text-slate-500 shrink-0 px-2">
                        {lang === "en" ? "Meetings:" : "Chọn kỳ họp:"}
                    </span>
                    {meetings.map((m) => {
                        const isSelected = m.id === selectedMeetingId;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setSelectedMeetingId(m.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    isSelected
                                        ? "bg-[#00A19A] text-white shadow-xs"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                {m.title} ({new Date(m.startTime).toLocaleDateString("vi-VN")})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 5 Navigation Tabs */}
            <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {tabs.map((t) => {
                    const Icon = t.icon;
                    const active = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                active
                                    ? "bg-[#003B3A] text-white shadow-xs"
                                    : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">
                                {lang === "en" ? t.labelEn : t.labelVi}
                            </span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
                    <RefreshCw className="w-7 h-7 text-[#00A19A] animate-spin mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">
                        {lang === "en"
                            ? "Loading parent meeting information..."
                            : "Đang tải dữ liệu cuộc họp phụ huynh..."}
                    </p>
                </div>
            ) : !currentMeeting ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                    <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">
                        {lang === "en"
                            ? "No scheduled meetings found for this class"
                            : "Hiện chưa có lịch họp Phụ huynh được công bố cho lớp"}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {lang === "en"
                            ? "When the school or homeroom teacher publishes a meeting schedule, you will receive an instant notification here."
                            : "Khi Nhà trường hoặc Giáo viên chủ nhiệm công bố lịch họp mới, thông tin thư mời và mã QR sẽ hiển thị tại đây."}
                    </p>
                </div>
            ) : (
                <>
                    {/* TAB 1: LỊCH HỌP & XÁC NHẬN THAM DỰ */}
                    {activeTab === "schedule" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            {/* Left: Meeting Card (Module 2.A) */}
                            <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                                    MEETING_TYPES[
                                                        currentMeeting.meetingType as MeetingTypeCode
                                                    ]?.badgeClass || "bg-teal-50 text-teal-800"
                                                }`}
                                            >
                                                {MEETING_TYPES[
                                                    currentMeeting.meetingType as MeetingTypeCode
                                                ]?.[lang === "en" ? "labelEn" : "labelVi"] ||
                                                    currentMeeting.meetingType}
                                            </span>
                                            <span
                                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                                    MEETING_STATUS_CONFIG[
                                                        currentMeeting.status as MeetingStatusCode
                                                    ]?.badgeClass || "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                {MEETING_STATUS_CONFIG[
                                                    currentMeeting.status as MeetingStatusCode
                                                ]?.[lang === "en" ? "labelEn" : "labelVi"] ||
                                                    currentMeeting.status}
                                            </span>
                                        </div>
                                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-1">
                                            {currentMeeting.title}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Mã cuộc họp: <strong>{currentMeeting.meetingCode}</strong> • Học kỳ:{" "}
                                            <strong>{currentMeeting.semester}</strong>
                                        </p>
                                    </div>

                                    <div
                                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                                            RSVP_STATUS_CONFIG[
                                                (currentInvitation?.rsvpStatus ||
                                                    "PENDING") as RsvpStatusCode
                                            ]?.badgeClass
                                        }`}
                                    >
                                        {
                                            RSVP_STATUS_CONFIG[
                                                (currentInvitation?.rsvpStatus ||
                                                    "PENDING") as RsvpStatusCode
                                            ]?.[lang === "en" ? "labelEn" : "labelVi"]
                                        }
                                    </div>
                                </div>

                                {/* Student, Class, GVCN, Time, Location */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
                                    <div className="flex items-start gap-2.5">
                                        <User className="w-4 h-4 text-[#00A19A] mt-0.5 shrink-0" />
                                        <div>
                                            <span className="text-[11px] text-slate-500 block">
                                                Học sinh
                                            </span>
                                            <span className="text-xs font-bold text-slate-900">
                                                {activeStudent?.studentName} ({activeStudent?.studentCode})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <GraduationCap className="w-4 h-4 text-[#00A19A] mt-0.5 shrink-0" />
                                        <div>
                                            <span className="text-[11px] text-slate-500 block">
                                                Lớp & Giáo viên chủ nhiệm
                                            </span>
                                            <span className="text-xs font-bold text-slate-900">
                                                Lớp {currentClassObj?.className || activeStudent?.className} •{" "}
                                                {currentClassObj?.homeroomTeacherName ||
                                                    currentMeeting.hostName}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <Clock className="w-4 h-4 text-[#00A19A] mt-0.5 shrink-0" />
                                        <div>
                                            <span className="text-[11px] text-slate-500 block">
                                                Thời gian tổ chức
                                            </span>
                                            <span className="text-xs font-bold text-slate-900">
                                                {new Date(currentMeeting.startTime).toLocaleString(
                                                    "vi-VN",
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                    }
                                                )}{" "}
                                                –{" "}
                                                {new Date(currentMeeting.endTime).toLocaleTimeString(
                                                    "vi-VN",
                                                    { hour: "2-digit", minute: "2-digit" }
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <MapPin className="w-4 h-4 text-[#00A19A] mt-0.5 shrink-0" />
                                        <div>
                                            <span className="text-[11px] text-slate-500 block">
                                                Địa điểm / Phòng họp
                                            </span>
                                            <span className="text-xs font-bold text-slate-900">
                                                {currentClassObj?.roomOverride ||
                                                    currentMeeting.location ||
                                                    "Tại phòng học của lớp"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {currentMeeting.onlineLink && (
                                    <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <Video className="w-4 h-4 text-blue-600 shrink-0" />
                                            <span className="text-xs font-bold text-blue-900">
                                                Liên kết họp trực tuyến:
                                            </span>
                                        </div>
                                        <a
                                            href={currentMeeting.onlineLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-bold text-blue-700 underline"
                                        >
                                            Mở phòng họp Online
                                        </a>
                                    </div>
                                )}

                                {/* Agenda & Preparation Notes */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Nội dung & Chương trình cuộc họp
                                    </h3>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                        {currentMeeting.agenda ||
                                            currentMeeting.contentSummary ||
                                            "1. Tổng kết tình hình học tập & rèn luyện của lớp.\n2. Định hướng kế hoạch học tập và phối hợp Gia đình – Nhà trường.\n3. Trao đổi & giải đáp ý kiến Phụ huynh."}
                                    </div>
                                    {currentClassObj?.preparationNotes && (
                                        <div className="bg-teal-50/70 rounded-2xl p-3.5 border border-teal-200 text-xs text-teal-900">
                                            <strong>Lưu ý từ GVCN lớp {currentClassObj.className}:</strong>{" "}
                                            {currentClassObj.preparationNotes}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Action Buttons */}
                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("qr")}
                                        disabled={currentMeeting.status === "CANCELLED"}
                                        className="flex-1 min-w-[180px] py-3 px-4 rounded-2xl bg-[#00A19A] hover:bg-[#008983] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                                    >
                                        <QrCode className="w-4 h-4" />
                                        <span>Mở Mã QR Điểm Danh</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("feedback")}
                                        className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <MessageSquare className="w-4 h-4 text-[#00A19A]" />
                                        <span>Gửi câu hỏi trước họp</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right: RSVP Confirmation Form */}
                            <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-[#00A19A]" />
                                    <span>Xác nhận tham dự / Báo vắng</span>
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Quý Phụ huynh vui lòng xác nhận để Giáo viên chủ nhiệm chuẩn bị chu đáo tài liệu và chỗ ngồi cho từng gia đình.
                                </p>

                                <form onSubmit={handleRsvpSubmit} className="space-y-3.5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Trạng thái tham dự
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(
                                                ["CONFIRMED", "DELEGATED", "ABSENT"] as RsvpStatusCode[]
                                            ).map((st) => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setRsvpStatus(st)}
                                                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                        rsvpStatus === st
                                                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                                                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {RSVP_STATUS_CONFIG[st].labelVi}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {rsvpStatus !== "ABSENT" ? (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Vai trò người tham dự
                                                </label>
                                                <select
                                                    value={attendeeRole}
                                                    onChange={(e) =>
                                                        setAttendeeRole(
                                                            e.target.value as AttendeeRoleCode
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                                                >
                                                    {Object.entries(ATTENDEE_ROLES).map(
                                                        ([code, cfg]) => (
                                                            <option key={code} value={code}>
                                                                {cfg.labelVi}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Họ tên người tham dự
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={attendeeName}
                                                        onChange={(e) =>
                                                            setAttendeeName(e.target.value)
                                                        }
                                                        placeholder="Nhập họ tên..."
                                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Số điện thoại liên hệ
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={attendeePhone}
                                                        onChange={(e) =>
                                                            setAttendeePhone(e.target.value)
                                                        }
                                                        placeholder="Số điện thoại..."
                                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Lý do xin phép vắng mặt
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={absenceReason}
                                                onChange={(e) => setAbsenceReason(e.target.value)}
                                                placeholder="Nhập lý do bận công tác / lịch hẹn..."
                                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Ghi chú gửi GVCN (nếu có)
                                        </label>
                                        <input
                                            type="text"
                                            value={rsvpNote}
                                            onChange={(e) => setRsvpNote(e.target.value)}
                                            placeholder="VD: Gia đình mong muốn trao đổi thêm cuối giờ..."
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={
                                            submittingRsvp ||
                                            currentMeeting.status === "CANCELLED" ||
                                            currentMeeting.status === "COMPLETED"
                                        }
                                        className="w-full py-3 rounded-2xl bg-[#00A19A] hover:bg-[#008983] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                                    >
                                        {submittingRsvp
                                            ? "Đang lưu..."
                                            : "Lưu xác nhận tham dự"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: KHU VỰC MÃ QR ĐIỂM DANH (Module 2.B) */}
                    {activeTab === "qr" && (
                        <div className="max-w-md mx-auto bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center space-y-5">
                            <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#00A19A] text-[11px] font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>MÃ QR BẢO MẬT ĐỊNH DANH</span>
                                </span>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {currentMeeting.title}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Học sinh: <strong>{activeStudent?.studentName}</strong> • Lớp{" "}
                                    <strong>{activeStudent?.className}</strong>
                                </p>
                            </div>

                            {/* Attendance Status Banner when already checked in */}
                            {(currentAttendance || qrState?.attendance) && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left space-y-1.5">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <span>ĐÃ THAM DỰ (ĐIỂM DANH THÀNH CÔNG)</span>
                                    </div>
                                    <p className="text-xs text-emerald-900">
                                        • Người tham dự:{" "}
                                        <strong>
                                            {(currentAttendance || qrState?.attendance)?.attendeeName}
                                        </strong>{" "}
                                        (
                                        {ATTENDEE_ROLES[
                                            ((currentAttendance || qrState?.attendance)
                                                ?.attendeeRole || "BO") as AttendeeRoleCode
                                        ]?.labelVi || "Phụ huynh"}
                                        )
                                    </p>
                                    <p className="text-xs text-emerald-900">
                                        • Thời điểm xác nhận:{" "}
                                        <strong>
                                            {new Date(
                                                (currentAttendance || qrState?.attendance)?.checkedInAt
                                            ).toLocaleString("vi-VN")}
                                        </strong>
                                    </p>
                                </div>
                            )}

                            {loadingQr ? (
                                <div className="py-12">
                                    <RefreshCw className="w-8 h-8 text-[#00A19A] animate-spin mx-auto" />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Đang tạo mã QR bảo mật...
                                    </p>
                                </div>
                            ) : qrState?.qrDataUrl ? (
                                <div className="space-y-3">
                                    <div className="bg-white p-4 rounded-3xl border-2 border-[#00A19A]/40 inline-block shadow-xs">
                                        <img
                                            src={qrState.qrDataUrl}
                                            alt="Parent Meeting Attendance QR"
                                            className="w-64 h-64 mx-auto object-contain"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Đưa mã QR này trước Camera của Giáo viên chủ nhiệm hoặc bộ phận tiếp đón để điểm danh tự động.
                                    </p>
                                    <div className="flex items-center justify-center gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                loadQrToken(
                                                    selectedMeetingId,
                                                    selectedStudentId,
                                                    true
                                                )
                                            }
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span>Làm mới mã QR</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-xs text-amber-700 bg-amber-50 rounded-2xl p-4 border border-amber-200">
                                    Chưa thể hiển thị mã QR. Vui lòng kiểm tra trạng thái cuộc họp hoặc thử lại.
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: TRAO ĐỔI & GÓP Ý (Module 2.C & Module 5) */}
                    {activeTab === "feedback" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            {/* Left: Submit Feedback Form */}
                            <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-[#00A19A]" />
                                    <span>Gửi Câu Hỏi & Ý Kiến Góp Ý</span>
                                </h3>
                                <form onSubmit={handleCreateFeedback} className="space-y-3.5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Thời điểm gửi ý kiến
                                        </label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {(
                                                [
                                                    "PRE_MEETING",
                                                    "DURING_MEETING",
                                                    "POST_MEETING",
                                                ] as FeedbackStageCode[]
                                            ).map((st) => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setFbStage(st)}
                                                    className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                                        fbStage === st
                                                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                                                            : "bg-slate-50 text-slate-700 border-slate-200"
                                                    }`}
                                                >
                                                    {FEEDBACK_STAGE_LABELS[st].labelVi}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Nhóm chủ đề
                                        </label>
                                        <select
                                            value={fbTopic}
                                            onChange={(e) =>
                                                setFbTopic(e.target.value as FeedbackTopicGroupCode)
                                            }
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                                        >
                                            {Object.entries(FEEDBACK_TOPIC_GROUPS).map(
                                                ([code, cfg]) => (
                                                    <option key={code} value={code}>
                                                        {cfg.labelVi}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Tiêu đề tóm tắt
                                        </label>
                                        <input
                                            type="text"
                                            value={fbTitle}
                                            onChange={(e) => setFbTitle(e.target.value)}
                                            placeholder="VD: Câu hỏi về lộ trình bồi dưỡng môn Toán..."
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Nội dung chi tiết *
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={fbContent}
                                            onChange={(e) => setFbContent(e.target.value)}
                                            placeholder="Nhập nội dung câu hỏi, trao đổi hoặc đề xuất với GVCN/Nhà trường..."
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Liên kết tài liệu đính kèm (nếu có)
                                        </label>
                                        <input
                                            type="url"
                                            value={fbAttachmentUrl}
                                            onChange={(e) => setFbAttachmentUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        />
                                    </div>

                                    <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={fbShareSummary}
                                            onChange={(e) => setFbShareSummary(e.target.checked)}
                                            className="mt-0.5 rounded-sm"
                                        />
                                        <span>
                                            Cho phép tổng hợp ý kiến này (ở chế độ <strong>ẩn danh</strong>) vào phần thảo luận chung của Biên bản họp lớp. (Nếu không chọn, ý kiến được bảo mật riêng tư 1-1).
                                        </span>
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={submittingFb}
                                        className="w-full py-3 rounded-2xl bg-[#00A19A] hover:bg-[#008983] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>{submittingFb ? "Đang gửi..." : "Gửi ý kiến"}</span>
                                    </button>
                                </form>
                            </div>

                            {/* Right: Feedback Threads & CSAT */}
                            <div className="lg:col-span-7 space-y-4">
                                {(detailData?.feedbacks || []).length === 0 ? (
                                    <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
                                        <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                                        <p className="text-sm font-bold text-slate-700">
                                            Chưa có ý kiến trao đổi nào trong cuộc họp này
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Mọi câu hỏi của Quý Phụ huynh sẽ được liên thông trực tiếp với hệ thống Trao đổi & Đồng hành của GVCN.
                                        </p>
                                    </div>
                                ) : (
                                    (detailData?.feedbacks || []).map((fb: any) => {
                                        const statusCfg =
                                            FEEDBACK_BUSINESS_STATUS[
                                                fb.businessStatus as FeedbackBusinessStatusCode
                                            ] || FEEDBACK_BUSINESS_STATUS.NEW;
                                        const topicCfg =
                                            FEEDBACK_TOPIC_GROUPS[
                                                fb.topicGroup as FeedbackTopicGroupCode
                                            ];
                                        return (
                                            <div
                                                key={fb.id}
                                                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3.5"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                                                            {fb.feedbackCode}
                                                        </span>
                                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800">
                                                            {topicCfg?.labelVi || fb.topicGroup}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">
                                                            (
                                                            {
                                                                FEEDBACK_STAGE_LABELS[
                                                                    fb.stage as FeedbackStageCode
                                                                ]?.labelVi
                                                            }
                                                            )
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {fb.isOverdue && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                                                Quá hạn phản hồi
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.badgeClass}`}
                                                        >
                                                            {statusCfg.labelVi}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900">
                                                        {fb.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">
                                                        {fb.content}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 mt-1.5">
                                                        Người xử lý: <strong>{fb.assigneeName}</strong> ({fb.assigneeRole}) • Hạn xử lý:{" "}
                                                        {new Date(fb.dueAt).toLocaleString("vi-VN")}
                                                    </p>
                                                </div>

                                                {/* Multi-turn Conversation Messages */}
                                                {fb.messages && fb.messages.length > 0 && (
                                                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-2.5">
                                                        {fb.messages.map((m: any) => (
                                                            <div
                                                                key={m.id}
                                                                className={`p-2.5 rounded-xl text-xs ${
                                                                    m.senderRole === "PARENT"
                                                                        ? "bg-white border border-slate-200"
                                                                        : "bg-teal-50/90 border border-teal-200 text-teal-950"
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                                    <strong className="text-slate-800">
                                                                        {m.senderName} ({m.senderRole})
                                                                    </strong>
                                                                    <span>
                                                                        {new Date(
                                                                            m.createdAt
                                                                        ).toLocaleString("vi-VN")}
                                                                    </span>
                                                                </div>
                                                                <p className="whitespace-pre-line">
                                                                    {m.content}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reply box for parent's own feedback */}
                                                {fb.isOwnFeedback && (
                                                    <div className="space-y-3 pt-1">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={replyTextMap[fb.id] || ""}
                                                                onChange={(e) =>
                                                                    setReplyTextMap((prev) => ({
                                                                        ...prev,
                                                                        [fb.id]: e.target.value,
                                                                    }))
                                                                }
                                                                placeholder="Nhập phản hồi trao đổi tiếp..."
                                                                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleReplyFeedback(fb.id)
                                                                }
                                                                className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold cursor-pointer"
                                                            >
                                                                Gửi
                                                            </button>
                                                        </div>

                                                        {/* CSAT Rating section when responded/completed */}
                                                        {(fb.businessStatus === "RESPONDED" ||
                                                            fb.businessStatus === "COMPLETED") && (
                                                            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 space-y-2">
                                                                {fb.csatScore ? (
                                                                    <div className="flex items-center justify-between text-xs text-amber-900">
                                                                        <span className="font-bold">
                                                                            Đánh giá hài lòng của Quý Phụ huynh:
                                                                        </span>
                                                                        <span className="font-bold text-amber-600">
                                                                            {"★".repeat(fb.csatScore)}{" "}
                                                                            ({fb.csatScore}/5)
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-bold text-slate-800">
                                                                                Đánh giá mức độ hài lòng sau xử lý:
                                                                            </span>
                                                                            <div className="flex items-center gap-1">
                                                                                {[1, 2, 3, 4, 5].map(
                                                                                    (star) => (
                                                                                        <button
                                                                                            key={star}
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setCsatScoreMap(
                                                                                                    (
                                                                                                        prev
                                                                                                    ) => ({
                                                                                                        ...prev,
                                                                                                        [fb.id]:
                                                                                                            star,
                                                                                                    })
                                                                                                )
                                                                                            }
                                                                                            className="p-1 cursor-pointer"
                                                                                        >
                                                                                            <Star
                                                                                                className={`w-4 h-4 ${
                                                                                                    (csatScoreMap[
                                                                                                        fb.id
                                                                                                    ] ||
                                                                                                        5) >=
                                                                                                    star
                                                                                                        ? "text-amber-500 fill-amber-500"
                                                                                                        : "text-slate-300"
                                                                                                }`}
                                                                                            />
                                                                                        </button>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={
                                                                                    csatCommentMap[
                                                                                        fb.id
                                                                                    ] || ""
                                                                                }
                                                                                onChange={(e) =>
                                                                                    setCsatCommentMap(
                                                                                        (prev) => ({
                                                                                            ...prev,
                                                                                            [fb.id]:
                                                                                                e.target
                                                                                                    .value,
                                                                                        })
                                                                                    )
                                                                                }
                                                                                placeholder="Nhận xét thêm (tùy chọn)..."
                                                                                className="flex-1 rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-xs"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleRateCsat(
                                                                                        fb.id
                                                                                    )
                                                                                }
                                                                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                                                                            >
                                                                                Xác nhận hoàn tất
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: BIÊN BẢN VÀ KẾT LUẬN (Module 6) */}
                    {activeTab === "minutes" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                            {!detailData?.minutes ? (
                                <div className="py-10 text-center space-y-2">
                                    <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                                    <h3 className="text-base font-bold text-slate-800">
                                        Biên bản cuộc họp đang được tổng hợp & phê duyệt
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                                        Biên bản họp lớp sẽ hiển thị tại đây ngay sau khi Giáo viên chủ nhiệm hoàn tất và được phê duyệt công bố chính thức.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-5" id="parent-minutes-print-area">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                                        <div>
                                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                BIÊN BẢN CHÍNH THỨC (Phiên bản v{detailData.minutes.version})
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900 mt-1">
                                                Biên bản {currentMeeting.title} — Lớp{" "}
                                                {detailData.minutes.className || activeStudent?.className}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Người lập: <strong>{detailData.minutes.recorderName}</strong>
                                                {detailData.minutes.approverName
                                                    ? ` • Phê duyệt: ${detailData.minutes.approverName}`
                                                    : ""}{" "}
                                                • Công bố ngày:{" "}
                                                {detailData.minutes.publishedAt
                                                    ? new Date(
                                                          detailData.minutes.publishedAt
                                                      ).toLocaleDateString("vi-VN")
                                                    : ""}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => window.print()}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4" />
                                            <span>In / Lưu PDF</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs">
                                        <div>
                                            <span className="text-slate-500 block">
                                                Tỷ lệ đại diện HS tham dự
                                            </span>
                                            <strong className="text-base text-[#003B3A]">
                                                {detailData.minutes.presentStudentCount}/
                                                {detailData.minutes.totalStudents} HS (
                                                {detailData.minutes.attendanceRate}%)
                                            </strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">
                                                Tổng số người dự thực tế
                                            </span>
                                            <strong className="text-base text-slate-900">
                                                {detailData.minutes.actualAttendeeCount} người
                                            </strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">
                                                Thành phần tham dự
                                            </span>
                                            <strong className="text-slate-800">
                                                {detailData.minutes.attendeeSummary ||
                                                    "GVCN và Phụ huynh học sinh lớp"}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                                        <div>
                                            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1">
                                                1. Nội dung trình bày trọng tâm
                                            </h4>
                                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 whitespace-pre-line">
                                                {detailData.minutes.presentationContent ||
                                                    "Đã trình bày theo chương trình cuộc họp."}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1">
                                                2. Các vấn đề thảo luận & Ý kiến chung (Đã ẩn danh thông tin cá nhân)
                                            </h4>
                                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 whitespace-pre-line">
                                                {detailData.minutes.discussionIssues}
                                                {detailData.minutes.generalFeedbackSummary
                                                    ? `\n\n${detailData.minutes.generalFeedbackSummary}`
                                                    : ""}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1">
                                                3. Kết luận & Nội dung thống nhất phối hợp
                                            </h4>
                                            <div className="bg-teal-50/70 rounded-2xl p-4 border border-teal-200 text-teal-950 whitespace-pre-line">
                                                {detailData.minutes.conclusions ||
                                                    detailData.minutes.agreedActions ||
                                                    "Thống nhất chương trình phối hợp giữa Gia đình và Nhà trường."}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: THEO DÕI SAU HỌP (Module 7) */}
                    {activeTab === "tasks" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-[#00A19A]" />
                                <span>Theo dõi các nhiệm vụ & hành động sau cuộc họp</span>
                            </h3>
                            {(detailData?.tasks || []).length === 0 ? (
                                <div className="py-10 text-center text-xs text-slate-500">
                                    Hiện chưa có nhiệm vụ công khai sau họp nào cần theo dõi.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(detailData?.tasks || []).map((task: any) => {
                                        const stCfg =
                                            MEETING_TASK_STATUS_CONFIG[
                                                task.status as MeetingTaskStatusCode
                                            ] || MEETING_TASK_STATUS_CONFIG.NEW;
                                        return (
                                            <div
                                                key={task.id}
                                                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-bold text-slate-500">
                                                            {task.taskCode}
                                                        </span>
                                                        <span
                                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stCfg.badgeClass}`}
                                                        >
                                                            {stCfg.labelVi}
                                                        </span>
                                                        {task.isOverdue && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                                                Quá hạn
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-900">
                                                        {task.title}
                                                    </h4>
                                                    {task.description && (
                                                        <p className="text-xs text-slate-600">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                    {task.resultSummary && (
                                                        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 mt-1">
                                                            <strong>Kết quả thực hiện:</strong>{" "}
                                                            {task.resultSummary}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 sm:text-right shrink-0">
                                                    <div>
                                                        Phụ trách:{" "}
                                                        <strong className="text-slate-800">
                                                            {task.assigneeName} ({task.assigneeRole})
                                                        </strong>
                                                    </div>
                                                    <div>
                                                        Hạn hoàn thành:{" "}
                                                        <strong>
                                                            {new Date(task.dueAt).toLocaleDateString(
                                                                "vi-VN"
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
