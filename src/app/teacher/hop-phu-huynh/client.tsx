"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
    LayoutDashboard,
    Users,
    QrCode,
    BookOpen,
    MessageSquare,
    FileText,
    CheckSquare,
    Plus,
    Copy,
    Camera,
    CheckCircle2,
    AlertTriangle,
    Send,
    Share2,
    Printer,
    RefreshCw,
    Maximize2,
    Minimize2,
    UserCheck,
    Clock,
    Search,
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
    MANUAL_CHECKIN_REASONS,
    ManualCheckInReasonCode,
    MEETING_STATUS_CONFIG,
    MEETING_TASK_STATUS_CONFIG,
    MEETING_TYPES,
    MeetingStatusCode,
    MeetingTaskPriorityCode,
    MeetingTaskStatusCode,
    MeetingTypeCode,
    MINUTES_STATUS_CONFIG,
    MinutesStatusCode,
    RSVP_STATUS_CONFIG,
    RsvpStatusCode,
} from "@/lib/parent-meeting/constants";

type TeacherTab =
    | "overview"
    | "roster"
    | "scanner"
    | "content"
    | "feedback"
    | "minutes"
    | "tasks";

export default function TeacherParentMeetingClient() {
    const searchParams = useSearchParams();
    const initialMeetingId = searchParams?.get("meetingId") || "";
    const initialTab = (searchParams?.get("tab") as TeacherTab) || "overview";

    const [activeTab, setActiveTab] = useState<TeacherTab>(initialTab);
    const [loading, setLoading] = useState(true);

    const [actor, setActor] = useState<any | null>(null);
    const [meta, setMeta] = useState<{
        academicYears: any[];
        campuses: any[];
        classes: any[];
    }>({ academicYears: [], campuses: [], classes: [] });

    const [meetings, setMeetings] = useState<any[]>([]);
    const [selectedMeetingId, setSelectedMeetingId] = useState<string>(initialMeetingId);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [detail, setDetail] = useState<any | null>(null);

    // Create Meeting Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState<MeetingTypeCode>("DINH_KY");
    const [newSemester, setNewSemester] = useState("HK1");
    const [newStartTime, setNewStartTime] = useState("");
    const [newEndTime, setNewEndTime] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [newOnlineLink, setNewOnlineLink] = useState("");
    const [newAgenda, setNewAgenda] = useState("");
    const [newClassIds, setNewClassIds] = useState<string[]>([]);
    const [newStatus, setNewStatus] = useState<MeetingStatusCode>("PUBLISHED");

    // Manual Check-in Modal state
    const [manualTarget, setManualTarget] = useState<any | null>(null);
    const [manualAttendeeName, setManualAttendeeName] = useState("");
    const [manualRole, setManualRole] = useState<AttendeeRoleCode>("BO");
    const [manualCount, setManualCount] = useState(1);
    const [manualReason, setManualReason] = useState<ManualCheckInReasonCode>("NO_PHONE");
    const [manualNote, setManualNote] = useState("");

    // QR Scanner state
    const [qrInputToken, setQrInputToken] = useState("");
    const [scanPreview, setScanPreview] = useState<any | null>(null);
    const [scanRole, setScanRole] = useState<AttendeeRoleCode>("BO");
    const [scanAttendeeName, setScanAttendeeName] = useState("");
    const [scanCount, setScanCount] = useState(1);
    const [isFullScreenScanner, setIsFullScreenScanner] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Content Prep state
    const [prepAgenda, setPrepAgenda] = useState("");
    const [prepNotes, setPrepNotes] = useState("");
    const [prepRoom, setPrepRoom] = useState("");
    const [prepOnlineLink, setPrepOnlineLink] = useState("");

    // Direct Feedback & Reply/Forward state
    const [liveStudentId, setLiveStudentId] = useState("");
    const [liveTopic, setLiveTopic] = useState<FeedbackTopicGroupCode>("KET_QUA_HOC_TAP");
    const [liveContent, setLiveContent] = useState("");
    const [liveShareSummary, setLiveShareSummary] = useState(true);
    const [replyMap, setReplyMap] = useState<Record<string, string>>({});
    const [forwardTargetMap, setForwardTargetMap] = useState<Record<string, string>>({});

    // Minutes state
    const [minAttendeeSummary, setMinAttendeeSummary] = useState("");
    const [minPresentation, setMinPresentation] = useState("");
    const [minDiscussion, setMinDiscussion] = useState("");
    const [minGeneralFeedback, setMinGeneralFeedback] = useState("");
    const [minConclusions, setMinConclusions] = useState("");
    const [minAgreedActions, setMinAgreedActions] = useState("");

    // Post-Meeting Task Form state
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [taskAssigneeUserId, setTaskAssigneeUserId] = useState("");
    const [taskDueAt, setTaskDueAt] = useState("");
    const [taskPriority, setTaskPriority] = useState<MeetingTaskPriorityCode>("NORMAL");
    const [taskVisibleParents, setTaskVisibleParents] = useState(true);
    const [rosterSearch, setRosterSearch] = useState("");

    const loadListAndMeta = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/parent-meetings?includeMeta=true");
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể tải danh sách cuộc họp.");
                return;
            }
            setActor(data.actor || null);
            setMeta(data.meta || { academicYears: [], campuses: [], classes: [] });
            const items = data.items || [];
            setMeetings(items);

            if (data.actor?.homeroomClassIds?.length > 0 && newClassIds.length === 0) {
                setNewClassIds([data.actor.homeroomClassIds[0]]);
            }

            if (items.length > 0) {
                const chosen =
                    items.find((m: any) => m.id === selectedMeetingId) || items[0];
                setSelectedMeetingId(chosen.id);
                if (!selectedClassId && chosen.classes?.length > 0) {
                    const hrMatch = chosen.classes.find((c: any) =>
                        data.actor?.homeroomClassIds?.includes(c.classId)
                    );
                    setSelectedClassId(hrMatch?.classId || chosen.classes[0].classId);
                }
            }
        } catch {
            toast.error("Lỗi kết nối khi tải danh sách họp phụ huynh.");
        } finally {
            setLoading(false);
        }
    }, [selectedMeetingId, selectedClassId, newClassIds.length]);

    const loadDetail = useCallback(async (meetingId: string, classId?: string) => {
        if (!meetingId) return;
        try {
            const url = new URL(`/api/parent-meetings/${meetingId}`, window.location.origin);
            if (classId) url.searchParams.set("classId", classId);
            const res = await fetch(url.toString());
            const data = await res.json();
            if (!res.ok) return;

            setDetail(data);
            if (data.activeClassId && data.activeClassId !== classId) {
                setSelectedClassId(data.activeClassId);
            }

            const clsObj = data.meeting?.classes?.find(
                (c: any) => c.classId === (classId || data.activeClassId)
            );
            setPrepAgenda(data.meeting?.agenda || "");
            setPrepNotes(clsObj?.preparationNotes || "");
            setPrepRoom(clsObj?.roomOverride || data.meeting?.location || "");
            setPrepOnlineLink(clsObj?.onlineLinkOverride || data.meeting?.onlineLink || "");

            if (data.minutes) {
                setMinAttendeeSummary(data.minutes.attendeeSummary || "");
                setMinPresentation(data.minutes.presentationContent || "");
                setMinDiscussion(data.minutes.discussionIssues || "");
                setMinGeneralFeedback(data.minutes.generalFeedbackSummary || "");
                setMinConclusions(data.minutes.conclusions || "");
                setMinAgreedActions(data.minutes.agreedActions || "");
            } else {
                setMinAttendeeSummary(
                    `Tổng số HS: ${data.stats?.totalStudents || 0} | Đại diện HS tham dự: ${data.stats?.presentStudentCount || 0}/${data.stats?.totalStudents || 0} (${data.stats?.attendanceRate || 0}%) | Số người thực tế dự họp: ${data.stats?.actualAttendeeCount || 0}`
                );
                setMinPresentation(data.meeting?.agenda || "");
                setMinDiscussion("");
                setMinGeneralFeedback("");
                setMinConclusions("");
                setMinAgreedActions("");
            }
        } catch {
            // Silent fallback
        }
    }, []);

    useEffect(() => {
        loadListAndMeta();
    }, []);

    useEffect(() => {
        if (selectedMeetingId) {
            loadDetail(selectedMeetingId, selectedClassId || undefined);
        }
    }, [selectedMeetingId, selectedClassId, loadDetail]);

    // Camera Scanner management
    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((t) => t.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    }, []);

    const startCamera = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                toast.error("Trình duyệt không hỗ trợ mở Camera trực tiếp. Vui lòng dùng ô nhập/quét mã.");
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            setCameraActive(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
            }, 100);
        } catch {
            toast.error("Không thể cấp quyền Camera. Vui lòng kiểm tra quyền trình duyệt.");
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || newClassIds.length === 0 || !newStartTime || !newEndTime) {
            toast.error("Vui lòng điền tên cuộc họp, thời gian và chọn ít nhất 1 lớp.");
            return;
        }

        const defaultYear =
            meta.academicYears.find((y) => y.isCurrent)?.id ||
            meta.academicYears[0]?.id ||
            "";
        const firstClass = meta.classes.find((c) => newClassIds.includes(c.id));
        const campusId = firstClass?.campusId || meta.campuses[0]?.id || "";

        try {
            const res = await fetch("/api/parent-meetings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTitle,
                    meetingType: newType,
                    academicYearId: defaultYear,
                    semester: newSemester,
                    campusId,
                    grade: firstClass?.grade,
                    level: firstClass?.level,
                    startTime: newStartTime,
                    endTime: newEndTime,
                    location: newLocation,
                    onlineLink: newOnlineLink,
                    agenda: newAgenda,
                    status: newStatus,
                    classIds: newClassIds,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể tạo cuộc họp.");
                return;
            }
            toast.success(
                `Đã tạo cuộc họp thành công và mời tự động ${data.invitationsCount} PHHS!`
            );
            setIsCreateOpen(false);
            setSelectedMeetingId(data.meeting.id);
            await loadListAndMeta();
        } catch {
            toast.error("Lỗi khi tạo cuộc họp.");
        }
    };

    const handleCloneCurrentMeeting = async () => {
        if (!detail?.meeting) return;
        const m = detail.meeting;
        try {
            const nextStart = new Date(new Date(m.startTime).getTime() + 7 * 24 * 60 * 60 * 1000);
            const nextEnd = new Date(new Date(m.endTime).getTime() + 7 * 24 * 60 * 60 * 1000);
            const res = await fetch("/api/parent-meetings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `${m.title} (Bản sao)`,
                    meetingType: m.meetingType,
                    academicYearId: m.academicYearId,
                    semester: m.semester,
                    campusId: m.campusId,
                    grade: m.grade,
                    level: m.level,
                    startTime: nextStart.toISOString(),
                    endTime: nextEnd.toISOString(),
                    location: m.location,
                    onlineLink: m.onlineLink,
                    agenda: m.agenda,
                    status: "DRAFT",
                    classIds: m.classes.map((c: any) => c.classId),
                    clonedFromId: m.id,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể sao chép cuộc họp.");
                return;
            }
            toast.success("Đã sao chép lịch họp sang bản nháp mới!");
            setSelectedMeetingId(data.meeting.id);
            await loadListAndMeta();
        } catch {
            toast.error("Lỗi khi sao chép cuộc họp.");
        }
    };

    const handleChangeMeetingStatus = async (status: MeetingStatusCode) => {
        if (!selectedMeetingId) return;
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể cập nhật trạng thái.");
                return;
            }
            toast.success(
                `Đã chuyển trạng thái cuộc họp sang: ${MEETING_STATUS_CONFIG[status].labelVi}`
            );
            await loadDetail(selectedMeetingId, selectedClassId);
            await loadListAndMeta();
        } catch {
            toast.error("Lỗi khi chuyển trạng thái cuộc họp.");
        }
    };

    const handlePreviewQrScan = async () => {
        if (!qrInputToken.trim() || !selectedMeetingId) {
            toast.error("Vui lòng quét hoặc dán mã token QR.");
            return;
        }
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/qr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    qrToken: qrInputToken.trim(),
                    mode: "PREVIEW",
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Mã QR không hợp lệ.");
                setScanPreview(null);
                return;
            }
            setScanPreview(data);
            setScanAttendeeName(data.parent?.fullName || "Phụ huynh");
            setScanRole((data.invitation?.attendeeRole as AttendeeRoleCode) || "BO");
            setScanCount(1);
            toast.success("Đã xác minh mã QR hợp lệ! Vui lòng xác nhận người tham dự.");
        } catch {
            toast.error("Lỗi khi xác minh mã QR.");
        }
    };

    const handleConfirmQrScan = async () => {
        if (!qrInputToken.trim() || !selectedMeetingId) return;
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/qr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    qrToken: qrInputToken.trim(),
                    mode: "CONFIRM",
                    attendeeRole: scanRole,
                    attendeeName: scanAttendeeName,
                    attendeeCount: scanCount,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể lưu điểm danh QR.");
                return;
            }
            toast.success(data.messageVi || "Điểm danh QR thành công!");
            setQrInputToken("");
            setScanPreview(null);
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi xác nhận điểm danh QR.");
        }
    };

    const handleManualCheckInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTarget || !selectedMeetingId) return;
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/qr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    checkInMethod: "MANUAL",
                    classId: manualTarget.classId,
                    studentId: manualTarget.studentId,
                    parentId: manualTarget.parentId,
                    attendeeName: manualAttendeeName || manualTarget.parentName,
                    attendeeRole: manualRole,
                    attendeeCount: manualCount,
                    manualReason,
                    relationshipNote: manualNote,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể điểm danh thủ công.");
                return;
            }
            toast.success("Đã ghi nhận điểm danh thủ công!");
            setManualTarget(null);
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi điểm danh thủ công.");
        }
    };

    const handleSavePrepContent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMeetingId) return;
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agenda: prepAgenda,
                    classIdForPrep: selectedClassId,
                    preparationNotes: prepNotes,
                    roomOverride: prepRoom,
                    onlineLinkOverride: prepOnlineLink,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể lưu nội dung cuộc họp.");
                return;
            }
            toast.success("Đã cập nhật nội dung chuẩn bị cuộc họp!");
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi lưu nội dung cuộc họp.");
        }
    };

    const handleRecordLiveFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMeetingId || !liveStudentId || !liveContent.trim()) {
            toast.error("Vui lòng chọn học sinh và nhập nội dung ý kiến.");
            return;
        }
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classId: selectedClassId,
                    studentId: liveStudentId,
                    stage: "DURING_MEETING",
                    topicGroup: liveTopic,
                    content: liveContent,
                    visibilityScope: liveShareSummary ? "CLASS_SHARED_ANONYMOUS" : "PRIVATE",
                    allowShareInSummary: liveShareSummary,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể ghi nhận ý kiến.");
                return;
            }
            toast.success("Đã ghi nhận ý kiến trực tiếp trong cuộc họp!");
            setLiveContent("");
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi ghi nhận ý kiến.");
        }
    };

    const handleTeacherReplyFeedback = async (
        feedbackId: string,
        newStatus: FeedbackBusinessStatusCode = "RESPONDED"
    ) => {
        const text = replyMap[feedbackId]?.trim();
        if (!text || !selectedMeetingId) {
            toast.error("Vui lòng nhập nội dung phản hồi.");
            return;
        }
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    feedbackId,
                    action: "REPLY",
                    messageContent: text,
                    newStatus,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể gửi phản hồi.");
                return;
            }
            toast.success("Đã gửi phản hồi tới Phụ huynh!");
            setReplyMap((prev) => ({ ...prev, [feedbackId]: "" }));
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi phản hồi ý kiến.");
        }
    };

    const handleForwardFeedback = async (feedbackId: string) => {
        const targetUserId = forwardTargetMap[feedbackId];
        if (!targetUserId || !selectedMeetingId) {
            toast.error("Vui lòng chọn GVBM / CVHT / Bộ phận nhận xử lý.");
            return;
        }
        const staffObj = (detail?.assignableStaff || []).find(
            (s: any) => s.userId === targetUserId
        );
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    feedbackId,
                    action: "FORWARD",
                    targetAssigneeUserId: targetUserId,
                    targetAssigneeName: staffObj?.name || "Giáo viên phối hợp",
                    targetAssigneeRole: staffObj?.role || "GVBM",
                    messageContent:
                        replyMap[feedbackId] ||
                        "Đề nghị phối hợp giải đáp ý kiến từ cuộc họp PHHS.",
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể chuyển tiếp ý kiến.");
                return;
            }
            toast.success(`Đã chuyển ý kiến cho ${staffObj?.name || "bộ phận phối hợp"}!`);
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi chuyển tiếp ý kiến.");
        }
    };

    const handleMinutesAction = async (
        action: "SAVE_DRAFT" | "SUBMIT_APPROVAL" | "APPROVE" | "PUBLISH"
    ) => {
        if (!selectedMeetingId || !selectedClassId) return;
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/minutes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classId: selectedClassId,
                    action,
                    attendeeSummary: minAttendeeSummary,
                    presentationContent: minPresentation,
                    discussionIssues: minDiscussion,
                    generalFeedbackSummary: minGeneralFeedback,
                    conclusions: minConclusions,
                    agreedActions: minAgreedActions,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể cập nhật biên bản.");
                return;
            }
            const msgMap = {
                SAVE_DRAFT: "Đã lưu nháp biên bản họp số (kèm lịch sử phiên bản)!",
                SUBMIT_APPROVAL: "Đã trình duyệt biên bản lên Ban Giám hiệu / Quản lý cơ sở!",
                APPROVE: "Đã phê duyệt biên bản!",
                PUBLISH: "Đã công bố biên bản chính thức tới Phụ huynh học sinh!",
            };
            toast.success(msgMap[action]);
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi lưu biên bản.");
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMeetingId || !selectedClassId || !taskTitle.trim()) {
            toast.error("Vui lòng nhập nội dung nhiệm vụ.");
            return;
        }
        const staffObj =
            (detail?.assignableStaff || []).find(
                (s: any) => s.userId === taskAssigneeUserId
            ) || {
                userId: actor?.userId,
                name: actor?.userName || "GVCN",
                role: "GVCN",
            };

        const resolvedDue =
            taskDueAt ||
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classId: selectedClassId,
                    minutesId: detail?.minutes?.id,
                    title: taskTitle,
                    description: taskDesc,
                    assigneeUserId: staffObj.userId,
                    assigneeName: staffObj.name,
                    assigneeRole: staffObj.role,
                    dueAt: resolvedDue,
                    priority: taskPriority,
                    visibleToParents: taskVisibleParents,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Không thể tạo nhiệm vụ sau họp.");
                return;
            }
            toast.success("Đã tạo nhiệm vụ sau họp và đồng bộ vào Sổ Giáo viên!");
            setTaskTitle("");
            setTaskDesc("");
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi tạo nhiệm vụ.");
        }
    };

    const handleUpdateTaskStatus = async (
        taskId: string,
        status: MeetingTaskStatusCode,
        resultSummary?: string
    ) => {
        if (!selectedMeetingId) return;
        try {
            const res = await fetch(`/api/parent-meetings/${selectedMeetingId}/tasks`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId,
                    status,
                    resultSummary,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || "Không thể cập nhật nhiệm vụ.");
                return;
            }
            toast.success("Đã cập nhật tiến độ nhiệm vụ!");
            await loadDetail(selectedMeetingId, selectedClassId);
        } catch {
            toast.error("Lỗi khi cập nhật nhiệm vụ.");
        }
    };

    const tabs: Array<{ id: TeacherTab; label: string; icon: any }> = [
        { id: "overview", label: "1. Tổng quan", icon: LayoutDashboard },
        { id: "roster", label: "2. Danh sách PHHS", icon: Users },
        { id: "scanner", label: "3. Quét QR", icon: QrCode },
        { id: "content", label: "4. Nội dung cuộc họp", icon: BookOpen },
        { id: "feedback", label: "5. Trao đổi & Góp ý", icon: MessageSquare },
        { id: "minutes", label: "6. Biên bản", icon: FileText },
        { id: "tasks", label: "7. Nhiệm vụ sau họp", icon: CheckSquare },
    ];

    const stats = detail?.stats || {
        totalStudents: 0,
        invitedCount: 0,
        confirmedCount: 0,
        presentStudentCount: 0,
        actualAttendeeCount: 0,
        unattendedStudentCount: 0,
        attendanceRate: 0,
    };

    const totalFeedback = (detail?.feedbacks || []).length;
    const pendingFeedback = (detail?.feedbacks || []).filter(
        (f: any) => f.businessStatus !== "COMPLETED"
    ).length;

    const attendanceByStudent = new Map<string, any>();
    for (const att of detail?.attendances || []) {
        attendanceByStudent.set(att.studentId, att);
    }

    const filteredInvitations = (detail?.invitations || []).filter((inv: any) => {
        if (!rosterSearch.trim()) return true;
        const q = rosterSearch.toLowerCase();
        return (
            inv.studentName?.toLowerCase().includes(q) ||
            inv.parentName?.toLowerCase().includes(q) ||
            inv.studentCode?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-16 font-sans text-slate-800">
            {/* Top Header */}
            <div className="bg-gradient-to-r from-[#003B3A] to-[#006A67] rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full text-teal-200 mb-2">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QUẢN LÝ HỌP PHỤ HUYNH SỐ – GVCN & GVBM</span>
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold">
                        Không Gian Điều Hành Họp Phụ Huynh Lớp
                    </h1>
                    <p className="text-xs sm:text-sm text-teal-100/90 mt-0.5">
                        Chuẩn bị chương trình họp, điểm danh QR trực tiếp, tiếp nhận & chuyển xử lý ý kiến, lập biên bản số và giao nhiệm vụ sau họp.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {meetings.length > 0 && (
                        <select
                            value={selectedMeetingId}
                            onChange={(e) => setSelectedMeetingId(e.target.value)}
                            className="bg-white text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 min-w-[220px]"
                        >
                            {meetings.map((m) => (
                                <option key={m.id} value={m.id}>
                                    [{m.meetingCode}] {m.title}
                                </option>
                            ))}
                        </select>
                    )}

                    {detail?.meeting?.classes?.length > 1 && (
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="bg-white/15 text-white border border-white/25 text-xs font-bold rounded-xl px-3 py-2.5"
                        >
                            {detail.meeting.classes.map((c: any) => (
                                <option key={c.classId} value={c.classId} className="text-slate-900">
                                    Lớp {c.className}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00A19A] hover:bg-[#008983] text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Lập lịch họp mới</span>
                    </button>

                    {detail?.meeting && (
                        <button
                            type="button"
                            onClick={handleCloneCurrentMeeting}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                            title="Sao chép cuộc họp"
                        >
                            <Copy className="w-4 h-4" />
                            <span>Sao chép</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 7 Navigation Tabs */}
            <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs flex items-center gap-1 overflow-x-auto">
                {tabs.map((t) => {
                    const Icon = t.icon;
                    const active = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                active
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
                    <p className="text-xs text-slate-500 mt-2">Đang tải dữ liệu cuộc họp...</p>
                </div>
            ) : !detail?.meeting ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                    <QrCode className="w-10 h-10 text-slate-400 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">
                        Chưa có cuộc họp Phụ huynh nào
                    </h3>
                    <p className="text-xs text-slate-500">
                        Nhấn nút <strong>&quot;Lập lịch họp mới&quot;</strong> ở góc trên bên phải để khởi tạo lịch họp PHHS cho lớp chủ nhiệm.
                    </p>
                </div>
            ) : (
                <>
                    {/* TAB 1: TỔNG QUAN (Module 4 Dashboard 8 Metrics) */}
                    {activeTab === "overview" && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] text-slate-500 block">
                                        1. Tổng số HS
                                    </span>
                                    <strong className="text-xl font-black text-slate-900">
                                        {stats.totalStudents}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] text-slate-500 block">
                                        2. PHHS được mời
                                    </span>
                                    <strong className="text-xl font-black text-slate-900">
                                        {stats.invitedCount}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] text-slate-500 block">
                                        3. Xác nhận dự
                                    </span>
                                    <strong className="text-xl font-black text-teal-700">
                                        {stats.confirmedCount}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                                    <span className="text-[11px] text-emerald-800 block">
                                        4. Đã điểm danh
                                    </span>
                                    <strong className="text-xl font-black text-emerald-700">
                                        {stats.presentStudentCount} HS
                                    </strong>
                                    <span className="text-[10px] text-emerald-700 block">
                                        ({stats.actualAttendeeCount} người dự thực tế)
                                    </span>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] text-slate-500 block">
                                        5. Chưa tham dự
                                    </span>
                                    <strong className="text-xl font-black text-amber-600">
                                        {stats.unattendedStudentCount}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-teal-200 bg-teal-50/40 shadow-2xs">
                                    <span className="text-[11px] text-teal-800 block">
                                        6. Tỷ lệ tham dự
                                    </span>
                                    <strong className="text-xl font-black text-[#00A19A]">
                                        {stats.attendanceRate}%
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                                    <span className="text-[11px] text-slate-500 block">
                                        7. Tổng ý kiến
                                    </span>
                                    <strong className="text-xl font-black text-slate-900">
                                        {totalFeedback}
                                    </strong>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-rose-200 bg-rose-50/40 shadow-2xs">
                                    <span className="text-[11px] text-rose-800 block">
                                        8. Ý kiến cần xử lý
                                    </span>
                                    <strong className="text-xl font-black text-rose-600">
                                        {pendingFeedback}
                                    </strong>
                                </div>
                            </div>

                            {/* Meeting Status & Workflow Bar */}
                            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500">
                                            Mã: {detail.meeting.meetingCode}
                                        </span>
                                        <span
                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                                MEETING_STATUS_CONFIG[
                                                    detail.meeting.status as MeetingStatusCode
                                                ]?.badgeClass
                                            }`}
                                        >
                                            {
                                                MEETING_STATUS_CONFIG[
                                                    detail.meeting.status as MeetingStatusCode
                                                ]?.labelVi
                                            }
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {detail.meeting.title}
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Thời gian:{" "}
                                        <strong>
                                            {new Date(detail.meeting.startTime).toLocaleString(
                                                "vi-VN"
                                            )}{" "}
                                            –{" "}
                                            {new Date(detail.meeting.endTime).toLocaleTimeString(
                                                "vi-VN"
                                            )}
                                        </strong>{" "}
                                        • Địa điểm: <strong>{detail.meeting.location || "Tại lớp"}</strong>
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {detail.meeting.status !== "PUBLISHED" &&
                                        detail.meeting.status !== "IN_PROGRESS" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleChangeMeetingStatus("PUBLISHED")
                                                }
                                                className="px-3.5 py-2 rounded-xl bg-[#00A19A] text-white text-xs font-bold cursor-pointer"
                                            >
                                                Công bố & Gửi thông báo PHHS
                                            </button>
                                        )}
                                    {detail.meeting.status === "PUBLISHED" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleChangeMeetingStatus("IN_PROGRESS")
                                            }
                                            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                        >
                                            Bắt đầu diễn ra cuộc họp
                                        </button>
                                    )}
                                    {detail.meeting.status === "IN_PROGRESS" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleChangeMeetingStatus("COMPLETED")
                                            }
                                            className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                                        >
                                            Kết thúc cuộc họp
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("scanner")}
                                        className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>Mở Quét QR Điểm Danh</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: DANH SÁCH PHHS & ĐIỂM DANH THỦ CÔNG */}
                    {activeTab === "roster" && (
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Danh sách Học sinh & Người giám hộ hợp lệ
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Đại diện HS có mặt: <strong>{stats.presentStudentCount}</strong> • Tổng số người thực tế dự họp: <strong>{stats.actualAttendeeCount}</strong>
                                    </p>
                                </div>
                                <div className="relative min-w-[260px]">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        value={rosterSearch}
                                        onChange={(e) => setRosterSearch(e.target.value)}
                                        placeholder="Tìm tên HS, mã HS, tên PHHS..."
                                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                                            <th className="py-3 px-3 font-bold">Học sinh</th>
                                            <th className="py-3 px-3 font-bold">Phụ huynh / Giám hộ</th>
                                            <th className="py-3 px-3 font-bold">Xác nhận RSVP</th>
                                            <th className="py-3 px-3 font-bold">Trạng thái Điểm danh</th>
                                            <th className="py-3 px-3 font-bold">Số người dự</th>
                                            <th className="py-3 px-3 font-bold text-right">
                                                Thao tác ngoại lệ
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredInvitations.map((inv: any) => {
                                            const att = attendanceByStudent.get(inv.studentId);
                                            const rsvpCfg =
                                                RSVP_STATUS_CONFIG[
                                                    (inv.rsvpStatus || "PENDING") as RsvpStatusCode
                                                ];
                                            return (
                                                <tr key={inv.id} className="hover:bg-slate-50/80">
                                                    <td className="py-3 px-3 font-bold text-slate-900">
                                                        {inv.studentName}
                                                        <span className="block text-[11px] font-normal text-slate-400">
                                                            Mã HS: {inv.studentCode || "---"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-semibold text-slate-800">
                                                            {inv.attendeeName || inv.parentName}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {inv.parentPhone || "---"}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span
                                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${rsvpCfg?.badgeClass}`}
                                                        >
                                                            {rsvpCfg?.labelVi || inv.rsvpStatus}
                                                        </span>
                                                        {inv.absenceReason && (
                                                            <span className="block text-[10px] text-amber-700 mt-0.5">
                                                                Lý do: {inv.absenceReason}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {att ? (
                                                            <div>
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    <span>
                                                                        {att.isLate
                                                                            ? "Đã dự (Đến trễ)"
                                                                            : "Đã điểm danh"}
                                                                    </span>
                                                                </span>
                                                                <span className="block text-[10px] text-slate-500 mt-0.5">
                                                                    {att.checkInMethod === "QR_SCAN"
                                                                        ? "Quét QR"
                                                                        : `Thủ công (${
                                                                              MANUAL_CHECKIN_REASONS[
                                                                                  att.manualReason as ManualCheckInReasonCode
                                                                              ]?.labelVi ||
                                                                              att.manualReason
                                                                          })`}{" "}
                                                                    •{" "}
                                                                    {new Date(
                                                                        att.checkedInAt
                                                                    ).toLocaleTimeString("vi-VN", {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400">
                                                                Chưa điểm danh
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-slate-800">
                                                        {att ? `${att.attendeeCount} người` : "-"}
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setManualTarget(inv);
                                                                setManualAttendeeName(
                                                                    inv.attendeeName || inv.parentName
                                                                );
                                                                setManualRole(
                                                                    (inv.attendeeRole as AttendeeRoleCode) ||
                                                                        "BO"
                                                                );
                                                                setManualCount(1);
                                                            }}
                                                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-bold cursor-pointer"
                                                        >
                                                            <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                                                            Điểm danh thủ công
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: QUÉT MÃ QR ĐIỂM DANH (Module 3 Full-Screen Mobile Ready) */}
                    {activeTab === "scanner" && (
                        <div
                            className={`${
                                isFullScreenScanner
                                    ? "fixed inset-0 z-50 bg-slate-950 text-white p-4 overflow-y-auto"
                                    : "bg-white rounded-3xl p-6 border border-slate-200 shadow-xs"
                            } space-y-5`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3
                                        className={`text-base font-bold ${
                                            isFullScreenScanner ? "text-white" : "text-slate-900"
                                        }`}
                                    >
                                        Trạm Quét Mã QR Điểm Danh Phụ Huynh
                                    </h3>
                                    <p
                                        className={`text-xs ${
                                            isFullScreenScanner ? "text-slate-300" : "text-slate-500"
                                        }`}
                                    >
                                        Hệ thống tự động xác minh chữ ký số HMAC-SHA256, hạn hiệu lực và chống ghi trùng khi nhiều giáo viên quét đồng thời.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsFullScreenScanner(!isFullScreenScanner)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A19A] text-white text-xs font-bold cursor-pointer"
                                >
                                    {isFullScreenScanner ? (
                                        <>
                                            <Minimize2 className="w-4 h-4" />
                                            <span>Thu nhỏ</span>
                                        </>
                                    ) : (
                                        <>
                                            <Maximize2 className="w-4 h-4" />
                                            <span>Toàn màn hình (Điện thoại)</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                {/* Left: Camera + Token Input */}
                                <div className="lg:col-span-6 space-y-4">
                                    <div className="bg-slate-900 rounded-3xl p-4 text-center text-white min-h-[240px] flex flex-col items-center justify-center relative overflow-hidden">
                                        {cameraActive ? (
                                            <div className="w-full space-y-3">
                                                <video
                                                    ref={videoRef}
                                                    className="w-full max-h-64 rounded-2xl object-cover bg-black"
                                                    playsInline
                                                    muted
                                                />
                                                <button
                                                    type="button"
                                                    onClick={stopCamera}
                                                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                                                >
                                                    Tắt Camera
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 py-6">
                                                <Camera className="w-10 h-10 text-teal-400 mx-auto" />
                                                <p className="text-xs text-slate-300 max-w-xs mx-auto">
                                                    Mở Camera trên điện thoại/máy tính bảng hoặc kết nối súng quét mã QR 2D.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={startCamera}
                                                    className="px-4 py-2.5 rounded-xl bg-[#00A19A] hover:bg-[#008983] text-white text-xs font-bold cursor-pointer"
                                                >
                                                    Bật Camera Quét QR
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            className={`block text-xs font-bold ${
                                                isFullScreenScanner
                                                    ? "text-slate-200"
                                                    : "text-slate-700"
                                            }`}
                                        >
                                            Chuỗi Token QR từ máy quét / thiết bị PHHS:
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={qrInputToken}
                                                onChange={(e) => setQrInputToken(e.target.value)}
                                                placeholder="pmqr_v1...."
                                                className="flex-1 rounded-xl border border-slate-300 bg-white text-slate-900 px-3.5 py-2.5 text-xs font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={handlePreviewQrScan}
                                                className="px-4 py-2.5 rounded-xl bg-[#00A19A] text-white text-xs font-bold shrink-0 cursor-pointer"
                                            >
                                                Kiểm tra QR
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Verification & Attendee Role Confirmation */}
                                <div className="lg:col-span-6">
                                    {scanPreview ? (
                                        <div className="bg-teal-50 border-2 border-[#00A19A] rounded-3xl p-5 text-slate-900 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-[#003B3A] bg-teal-200/70 px-3 py-1 rounded-full">
                                                    XÁC MINH HỢP LỆ
                                                </span>
                                                {scanPreview.alreadyCheckedIn && (
                                                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                                                        Đã điểm danh trước đó
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1 text-xs">
                                                <p>
                                                    Học sinh:{" "}
                                                    <strong className="text-sm">
                                                        {scanPreview.student?.fullName}
                                                    </strong>{" "}
                                                    ({scanPreview.student?.studentCode})
                                                </p>
                                                <p>
                                                    Lớp: <strong>{scanPreview.student?.className}</strong>
                                                </p>
                                                <p>
                                                    Hồ sơ Phụ huynh:{" "}
                                                    <strong>{scanPreview.parent?.fullName}</strong>
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Xác nhận vai trò người dự
                                                    </label>
                                                    <select
                                                        value={scanRole}
                                                        onChange={(e) => {
                                                            const r = e.target
                                                                .value as AttendeeRoleCode;
                                                            setScanRole(r);
                                                            setScanCount(
                                                                ATTENDEE_ROLES[r].defaultHeadcount
                                                            );
                                                        }}
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
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
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Số người thực tế tham dự
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={4}
                                                        value={scanCount}
                                                        onChange={(e) =>
                                                            setScanCount(Number(e.target.value) || 1)
                                                        }
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Tên người tham dự
                                                </label>
                                                <input
                                                    type="text"
                                                    value={scanAttendeeName}
                                                    onChange={(e) =>
                                                        setScanAttendeeName(e.target.value)
                                                    }
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleConfirmQrScan}
                                                className="w-full py-3 rounded-2xl bg-[#003B3A] hover:bg-slate-900 text-white text-xs font-bold shadow-md cursor-pointer"
                                            >
                                                Lưu Kết Quả Điểm Danh
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-full rounded-3xl border border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-center text-xs text-slate-500">
                                            <QrCode className="w-8 h-8 text-slate-400 mb-2" />
                                            <p>
                                                Quét mã QR từ điện thoại Phụ huynh để hiển thị thông tin học sinh và xác nhận điểm danh tại đây.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: NỘI DUNG CUỘC HỌP */}
                    {activeTab === "content" && (
                        <form
                            onSubmit={handleSavePrepContent}
                            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4"
                        >
                            <h3 className="text-base font-bold text-slate-900">
                                Chuẩn bị & Cập nhật Nội dung Chương trình Họp Lớp
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Phòng họp / Địa điểm của lớp
                                    </label>
                                    <input
                                        type="text"
                                        value={prepRoom}
                                        onChange={(e) => setPrepRoom(e.target.value)}
                                        placeholder="VD: Phòng 302 - Tòa A..."
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Liên kết họp trực tuyến (Google Meet / Zoom / Teams)
                                    </label>
                                    <input
                                        type="text"
                                        value={prepOnlineLink}
                                        onChange={(e) => setPrepOnlineLink(e.target.value)}
                                        placeholder="https://meet.google.com/..."
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Chương trình họp (Agenda hiển thị cho PHHS)
                                </label>
                                <textarea
                                    rows={5}
                                    value={prepAgenda}
                                    onChange={(e) => setPrepAgenda(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ghi chú dặn dò riêng của GVCN lớp
                                </label>
                                <textarea
                                    rows={3}
                                    value={prepNotes}
                                    onChange={(e) => setPrepNotes(e.target.value)}
                                    placeholder="Lưu ý chuẩn bị tài liệu, thời gian đón tiếp..."
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-5 py-2.5 rounded-xl bg-[#00A19A] hover:bg-[#008983] text-white text-xs font-bold cursor-pointer"
                            >
                                Lưu cập nhật nội dung
                            </button>
                        </form>
                    )}

                    {/* TAB 5: TRAO ĐỔI & GÓP Ý (Module 4 & Module 5) */}
                    {activeTab === "feedback" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            {/* Left: Record Live Opinion During Meeting */}
                            <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                                <h3 className="text-sm font-bold text-slate-900">
                                    Ghi nhận ý kiến phát biểu trực tiếp tại cuộc họp
                                </h3>
                                <form onSubmit={handleRecordLiveFeedback} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Phụ huynh của Học sinh
                                        </label>
                                        <select
                                            value={liveStudentId}
                                            onChange={(e) => setLiveStudentId(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        >
                                            <option value="">-- Chọn học sinh --</option>
                                            {(detail.invitations || []).map((inv: any) => (
                                                <option key={inv.id} value={inv.studentId}>
                                                    {inv.studentName} (PH: {inv.parentName})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Nhóm chủ đề
                                        </label>
                                        <select
                                            value={liveTopic}
                                            onChange={(e) =>
                                                setLiveTopic(
                                                    e.target.value as FeedbackTopicGroupCode
                                                )
                                            }
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
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
                                            Nội dung phát biểu / kiến nghị
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={liveContent}
                                            onChange={(e) => setLiveContent(e.target.value)}
                                            placeholder="Ghi tóm tắt ý kiến của PHHS..."
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={liveShareSummary}
                                            onChange={(e) => setLiveShareSummary(e.target.checked)}
                                        />
                                        <span>Đưa vào tổng hợp ý kiến chung (ẩn danh)</span>
                                    </label>
                                    <button
                                        type="submit"
                                        className="w-full py-2.5 rounded-xl bg-[#00A19A] text-white text-xs font-bold cursor-pointer"
                                    >
                                        Ghi nhận ý kiến
                                    </button>
                                </form>
                            </div>

                            {/* Right: Feedback List, Reply & Forward to GVBM/CVHT */}
                            <div className="lg:col-span-8 space-y-4">
                                {(detail.feedbacks || []).length === 0 ? (
                                    <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-500">
                                        Chưa có ý kiến trao đổi nào trong cuộc họp này.
                                    </div>
                                ) : (
                                    (detail.feedbacks || []).map((fb: any) => {
                                        const stCfg =
                                            FEEDBACK_BUSINESS_STATUS[
                                                fb.businessStatus as FeedbackBusinessStatusCode
                                            ] || FEEDBACK_BUSINESS_STATUS.NEW;
                                        return (
                                            <div
                                                key={fb.id}
                                                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100">
                                                            {fb.feedbackCode}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-900">
                                                            HS: {fb.studentName} (PH:{" "}
                                                            {fb.parentName})
                                                        </span>
                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800">
                                                            {
                                                                FEEDBACK_TOPIC_GROUPS[
                                                                    fb.topicGroup as FeedbackTopicGroupCode
                                                                ]?.labelVi
                                                            }
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">
                                                            •{" "}
                                                            {
                                                                FEEDBACK_STAGE_LABELS[
                                                                    fb.stage as FeedbackStageCode
                                                                ]?.labelVi
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {fb.isOverdue && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                                                Quá hạn SLA
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stCfg.badgeClass}`}
                                                        >
                                                            {stCfg.labelVi}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-700 whitespace-pre-line">
                                                    {fb.content}
                                                </p>

                                                <div className="text-[11px] text-slate-500">
                                                    Đang phụ trách:{" "}
                                                    <strong className="text-slate-800">
                                                        {fb.assigneeName} ({fb.assigneeRole})
                                                    </strong>{" "}
                                                    • Hạn xử lý:{" "}
                                                    {new Date(fb.dueAt).toLocaleString("vi-VN")}
                                                </div>

                                                {fb.messages && fb.messages.length > 0 && (
                                                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 space-y-2">
                                                        {fb.messages.map((m: any) => (
                                                            <div
                                                                key={m.id}
                                                                className="text-xs bg-white p-2.5 rounded-xl border border-slate-200"
                                                            >
                                                                <strong className="text-slate-800">
                                                                    {m.senderName}:
                                                                </strong>{" "}
                                                                <span>{m.content}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                                                    <input
                                                        type="text"
                                                        value={replyMap[fb.id] || ""}
                                                        onChange={(e) =>
                                                            setReplyMap((prev) => ({
                                                                ...prev,
                                                                [fb.id]: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Nhập nội dung trả lời PHHS hoặc ghi chú chuyển tiếp..."
                                                        className="sm:col-span-6 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleTeacherReplyFeedback(
                                                                fb.id,
                                                                "RESPONDED"
                                                            )
                                                        }
                                                        className="sm:col-span-2 py-2 px-3 rounded-xl bg-[#00A19A] text-white text-xs font-bold cursor-pointer"
                                                    >
                                                        Phản hồi PHHS
                                                    </button>
                                                    <select
                                                        value={forwardTargetMap[fb.id] || ""}
                                                        onChange={(e) =>
                                                            setForwardTargetMap((prev) => ({
                                                                ...prev,
                                                                [fb.id]: e.target.value,
                                                            }))
                                                        }
                                                        className="sm:col-span-2 rounded-xl border border-slate-300 px-2 py-2 text-[11px]"
                                                    >
                                                        <option value="">Chuyển GVBM/CVHT...</option>
                                                        {(detail.assignableStaff || []).map(
                                                            (st: any) => (
                                                                <option
                                                                    key={st.userId}
                                                                    value={st.userId}
                                                                >
                                                                    {st.label}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleForwardFeedback(fb.id)}
                                                        className="sm:col-span-2 py-2 px-3 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
                                                    >
                                                        Chuyển xử lý
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 6: BIÊN BẢN HỌP SỐ (Module 6) */}
                    {activeTab === "minutes" && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-900">
                                            Biên Bản Họp Phụ Huynh Điện Tử
                                        </h3>
                                        {detail.minutes && (
                                            <span
                                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                                    MINUTES_STATUS_CONFIG[
                                                        detail.minutes.status as MinutesStatusCode
                                                    ]?.badgeClass
                                                }`}
                                            >
                                                {
                                                    MINUTES_STATUS_CONFIG[
                                                        detail.minutes.status as MinutesStatusCode
                                                    ]?.labelVi
                                                }{" "}
                                                (v{detail.minutes.version})
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Bảo mật: Hệ thống tự động loại trừ các ý kiến riêng tư cá nhân khỏi biên bản tập thể.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleMinutesAction("SAVE_DRAFT")}
                                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                                    >
                                        Lưu nháp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMinutesAction("SUBMIT_APPROVAL")}
                                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                                    >
                                        Trình duyệt
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMinutesAction("PUBLISH")}
                                        className="px-3.5 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008983] text-white text-xs font-bold cursor-pointer"
                                    >
                                        Công bố đến PHHS
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Xuất PDF</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Thành phần & Tỷ lệ tham dự
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={minAttendeeSummary}
                                        onChange={(e) => setMinAttendeeSummary(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Nội dung trình bày
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={minPresentation}
                                        onChange={(e) => setMinPresentation(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Các vấn đề thảo luận tại lớp
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={minDiscussion}
                                        onChange={(e) => setMinDiscussion(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Ý kiến & Kiến nghị chung (Đã ẩn danh)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={minGeneralFeedback}
                                        onChange={(e) => setMinGeneralFeedback(e.target.value)}
                                        placeholder="Để trống để hệ thống tự động tổng hợp các ý kiến được phép chia sẻ ẩn danh..."
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Kết luận cuộc họp
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={minConclusions}
                                        onChange={(e) => setMinConclusions(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Các nội dung thống nhất & Nhiệm vụ trọng tâm
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={minAgreedActions}
                                        onChange={(e) => setMinAgreedActions(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 7: NHIỆM VỤ SAU HỌP (Module 7) */}
                    {activeTab === "tasks" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                                <h3 className="text-sm font-bold text-slate-900">
                                    Giao Nhiệm Vụ Sau Họp (Tự động liên kết Sổ Giáo viên)
                                </h3>
                                <form onSubmit={handleCreateTask} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Nội dung nhiệm vụ *
                                        </label>
                                        <input
                                            type="text"
                                            value={taskTitle}
                                            onChange={(e) => setTaskTitle(e.target.value)}
                                            placeholder="VD: Gửi tài liệu ôn tập giữa kỳ cho PHHS..."
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Mô tả chi tiết
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={taskDesc}
                                            onChange={(e) => setTaskDesc(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Người phụ trách
                                        </label>
                                        <select
                                            value={taskAssigneeUserId}
                                            onChange={(e) => setTaskAssigneeUserId(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                        >
                                            <option value="">Bản thân (GVCN)</option>
                                            {(detail.assignableStaff || []).map((st: any) => (
                                                <option key={st.userId} value={st.userId}>
                                                    {st.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Hạn hoàn thành
                                            </label>
                                            <input
                                                type="date"
                                                value={taskDueAt}
                                                onChange={(e) => setTaskDueAt(e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Mức ưu tiên
                                            </label>
                                            <select
                                                value={taskPriority}
                                                onChange={(e) =>
                                                    setTaskPriority(
                                                        e.target.value as MeetingTaskPriorityCode
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs"
                                            >
                                                <option value="NORMAL">Bình thường</option>
                                                <option value="HIGH">Cao</option>
                                                <option value="URGENT">Khẩn cấp</option>
                                            </select>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={taskVisibleParents}
                                            onChange={(e) =>
                                                setTaskVisibleParents(e.target.checked)
                                            }
                                        />
                                        <span>Công khai tiến độ nhiệm vụ này cho PHHS lớp</span>
                                    </label>
                                    <button
                                        type="submit"
                                        className="w-full py-2.5 rounded-xl bg-[#00A19A] text-white text-xs font-bold cursor-pointer"
                                    >
                                        Tạo nhiệm vụ
                                    </button>
                                </form>
                            </div>

                            <div className="lg:col-span-8 space-y-3">
                                {(detail.tasks || []).length === 0 ? (
                                    <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-500">
                                        Chưa có nhiệm vụ sau họp nào được tạo.
                                    </div>
                                ) : (
                                    (detail.tasks || []).map((task: any) => {
                                        const stCfg =
                                            MEETING_TASK_STATUS_CONFIG[
                                                task.status as MeetingTaskStatusCode
                                            ] || MEETING_TASK_STATUS_CONFIG.NEW;
                                        return (
                                            <div
                                                key={task.id}
                                                className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                                                    <p className="text-xs text-slate-500">
                                                        Phụ trách: <strong>{task.assigneeName}</strong> ({task.assigneeRole}) • Hạn:{" "}
                                                        {new Date(task.dueAt).toLocaleDateString(
                                                            "vi-VN"
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {task.status !== "COMPLETED" && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleUpdateTaskStatus(
                                                                    task.id,
                                                                    "COMPLETED",
                                                                    "Đã hoàn thành nhiệm vụ theo kết luận cuộc họp."
                                                                )
                                                            }
                                                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                                        >
                                                            Hoàn thành
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal: Create Meeting */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-base font-bold text-slate-900">
                            Lập Kế Hoạch Họp Phụ Huynh Mới
                        </h3>
                        <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Tên cuộc họp *
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="VD: Họp Phụ huynh định kỳ Đầu năm học 2026-2027..."
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
                                        Thời gian bắt đầu *
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
                                        Thời gian kết thúc *
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
                                <label className="block font-bold text-slate-700 mb-1">
                                    Gán lớp tham dự *
                                </label>
                                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 grid grid-cols-2 gap-1.5">
                                    {meta.classes.map((cls) => {
                                        const checked = newClassIds.includes(cls.id);
                                        return (
                                            <label
                                                key={cls.id}
                                                className="flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewClassIds((prev) => [
                                                                ...prev,
                                                                cls.id,
                                                            ]);
                                                        } else {
                                                            setNewClassIds((prev) =>
                                                                prev.filter((id) => id !== cls.id)
                                                            );
                                                        }
                                                    }}
                                                />
                                                <span>Lớp {cls.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Địa điểm / Phòng họp
                                </label>
                                <input
                                    type="text"
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    placeholder="Phòng học của lớp..."
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Nội dung chương trình họp
                                </label>
                                <textarea
                                    rows={3}
                                    value={newAgenda}
                                    onChange={(e) => setNewAgenda(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-[#00A19A] text-white font-bold cursor-pointer"
                                >
                                    Tạo cuộc họp & Mời PHHS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Manual Check-In */}
            {manualTarget && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
                        <h3 className="text-base font-bold text-slate-900">
                            Điểm Danh Thủ Công — HS: {manualTarget.studentName}
                        </h3>
                        <form onSubmit={handleManualCheckInSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Lý do điểm danh thủ công *
                                </label>
                                <select
                                    value={manualReason}
                                    onChange={(e) =>
                                        setManualReason(e.target.value as ManualCheckInReasonCode)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                                >
                                    {Object.entries(MANUAL_CHECKIN_REASONS).map(([code, cfg]) => (
                                        <option key={code} value={code}>
                                            {cfg.labelVi}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Vai trò người tham dự *
                                </label>
                                <select
                                    value={manualRole}
                                    onChange={(e) => {
                                        const r = e.target.value as AttendeeRoleCode;
                                        setManualRole(r);
                                        setManualCount(ATTENDEE_ROLES[r].defaultHeadcount);
                                    }}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                                >
                                    {Object.entries(ATTENDEE_ROLES).map(([code, cfg]) => (
                                        <option key={code} value={code}>
                                            {cfg.labelVi}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Tên người tham dự
                                    </label>
                                    <input
                                        type="text"
                                        value={manualAttendeeName}
                                        onChange={(e) => setManualAttendeeName(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Số người thực tế dự
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={4}
                                        value={manualCount}
                                        onChange={(e) =>
                                            setManualCount(Number(e.target.value) || 1)
                                        }
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setManualTarget(null)}
                                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-[#00A19A] text-white font-bold cursor-pointer"
                                >
                                    Xác nhận điểm danh
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
