'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  Award,
  Search,
  Send,
  Paperclip,
  PlusCircle,
  Share2,
  ArrowLeft,
  Filter,
  ShieldCheck,
  Target,
  TrendingUp,
  RefreshCw,
  FileText,
  Lock,
} from 'lucide-react';
import {
  COORDINATION_TOPICS,
  THREAD_STATUS_LABELS,
  CASE_STATUS_LABELS,
  PRIORITY_CONFIG,
  validateAttachmentMeta,
} from '@/lib/coordination/constants';

interface Props {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function HomeroomCoordinationClient({ user }: Props) {
  const [activeTab, setActiveTab] = useState<'INBOX' | 'COORD_GVBM' | 'QUALITY'>('INBOX');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Context & Filters
  const [contextData, setContextData] = useState<any>(null);
  const [selectedAyId, setSelectedAyId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('ALL');
  const [inboxQuickFilter, setInboxQuickFilter] = useState<'ALL' | 'UNREAD' | 'PROCESSING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dashboard & Data
  const [dashboard, setDashboard] = useState<any>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<any>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  // Mobile 2-screen navigation state
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Reply & Attachment state
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ fileName: string; fileType: string; fileSize: number; fileUrl: string }>
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);

  // Cases & Coordination
  const [cases, setCases] = useState<any[]>([]);
  const [improvements, setImprovements] = useState<any[]>([]);

  // Modals
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordForm, setCoordForm] = useState({
    studentId: '',
    subjectId: '',
    teacherId: '',
    assignedRole: 'GVBM' as 'GVBM' | 'TTCM' | 'QLCM',
    category: 'DE_NGHI_HO_TRO',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    title: '',
    description: '',
    supportPlanMeasures: '',
    slaTargetHours: 16,
  });
  const [submittingCoord, setSubmittingCoord] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctxRes = await fetch(
        `/api/coordination/context${selectedAyId ? `?academicYearId=${selectedAyId}` : ''}`
      );
      const ctxJson = await ctxRes.json();
      if (!ctxRes.ok) throw new Error(ctxJson.error || 'Không thể tải ngữ cảnh GVCN.');

      const ctx = ctxJson.data;
      setContextData(ctx);
      const ayId = selectedAyId || ctx.activeAcademicYear?.id || '';
      if (!selectedAyId && ayId) setSelectedAyId(ayId);

      const defaultClassId =
        selectedClassId || ctx.homeroomClasses?.[0]?.id || '';
      if (!selectedClassId && defaultClassId) setSelectedClassId(defaultClassId);

      const query = new URLSearchParams({
        viewMode: 'GVCN',
        ...(ayId ? { academicYearId: ayId } : {}),
        ...(defaultClassId ? { classId: defaultClassId } : {}),
        ...(selectedStatus ? { status: selectedStatus } : {}),
        ...(selectedTopic ? { topic: selectedTopic } : {}),
      });

      if (timeframeFilter === '7D') {
        query.set('fromDate', new Date(Date.now() - 7 * 86400000).toISOString());
      } else if (timeframeFilter === '30D') {
        query.set('fromDate', new Date(Date.now() - 30 * 86400000).toISOString());
      }

      const [dashRes, thdRes, caseRes, impRes] = await Promise.all([
        fetch(`/api/coordination/dashboard?${query.toString()}`),
        fetch(
          `/api/coordination/threads?${query.toString()}${
            inboxQuickFilter === 'UNREAD' ? '&unreadOnly=true' : ''
          }${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`
        ),
        fetch(`/api/coordination/cases?${query.toString()}`),
        fetch(`/api/coordination/improvements?${ayId ? `academicYearId=${ayId}` : ''}`),
      ]);

      const [dashJson, thdJson, caseJson, impJson] = await Promise.all([
        dashRes.json(),
        thdRes.json(),
        caseRes.json(),
        impRes.json(),
      ]);

      if (dashJson.success) setDashboard(dashJson.data);
      if (thdJson.success) {
        let items = thdJson.data.items || [];
        if (inboxQuickFilter === 'PROCESSING') {
          items = items.filter((t: any) => t.status === 'IN_DISCUSSION' || t.status === 'NEW');
        } else if (inboxQuickFilter === 'COMPLETED') {
          items = items.filter((t: any) => t.status === 'ARCHIVED' || t.status === 'READ');
        }
        setThreads(items);
        if (!selectedThreadId && items.length > 0) {
          setSelectedThreadId(items[0].id);
        }
      }
      if (caseJson.success) setCases(caseJson.data || []);
      if (impJson.success) setImprovements(impJson.data?.actions || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [
    selectedAyId,
    selectedClassId,
    selectedStatus,
    selectedTopic,
    timeframeFilter,
    inboxQuickFilter,
    searchQuery,
    selectedThreadId,
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchThreadDetail = useCallback(async (threadId: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/coordination/threads/${threadId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setThreadDetail(json.data);
      } else {
        setThreadDetail({ privacyRestricted: true, privacyMessage: json.error });
      }
    } catch {
      setThreadDetail(null);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadDetail(selectedThreadId);
    } else {
      setThreadDetail(null);
    }
  }, [selectedThreadId, fetchThreadDetail]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const nextList = [...pendingAttachments];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const check = validateAttachmentMeta({
        fileName: f.name,
        fileType: f.type,
        fileSize: f.size,
      });
      if (!check.valid) {
        setAttachmentError(check.reason || 'Tệp không hợp lệ.');
        return;
      }
      nextList.push({
        fileName: f.name,
        fileType: f.type || 'application/octet-stream',
        fileSize: f.size,
        fileUrl: `/uploads/coordination/${encodeURIComponent(f.name)}`,
      });
    }
    setPendingAttachments(nextList.slice(0, 5));
    e.target.value = '';
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/coordination/threads/${selectedThreadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText.trim(),
          isInternalNote,
          attachments: pendingAttachments,
          clientMessageId: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể gửi phản hồi.');
      setReplyText('');
      setPendingAttachments([]);
      setIsInternalNote(false);
      showToast('Đã gửi phản hồi thành công.');
      await fetchThreadDetail(selectedThreadId);
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateCaseFromThread = async () => {
    if (!threadDetail) return;
    try {
      const res = await fetch('/api/coordination/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: threadDetail.id,
          studentId: threadDetail.studentId,
          teacherId: threadDetail.teacherId,
          assignedRole: 'GVCN',
          category: threadDetail.topic,
          title: `Xử lý: ${threadDetail.subjectTitle}`,
          description:
            threadDetail.messages?.[threadDetail.messages.length - 1]?.content ||
            threadDetail.subjectTitle,
          priority: threadDetail.priority || 'NORMAL',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(`Đã lập hồ sơ yêu cầu xử lý ${json.data.caseCode}.`);
      await fetchThreadDetail(threadDetail.id);
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tạo yêu cầu.');
    }
  };

  const handleCreateGvbmCoordination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordForm.studentId || !coordForm.title.trim() || !coordForm.description.trim()) {
      showToast('Vui lòng chọn học sinh và nhập đầy đủ nội dung cần phối hợp.');
      return;
    }
    setSubmittingCoord(true);
    try {
      const currentClass = contextData?.homeroomClasses?.find(
        (c: any) => c.id === selectedClassId
      );
      const selectedGvbm = currentClass?.subjectTeachers?.find(
        (t: any) =>
          t.teacherId === coordForm.teacherId &&
          (!coordForm.subjectId || t.subjectId === coordForm.subjectId)
      );

      const res = await fetch('/api/coordination/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: coordForm.studentId,
          teacherId: selectedGvbm?.teacherId || coordForm.teacherId || null,
          assignedToUserId: selectedGvbm?.teacherUserId || undefined,
          assignedToName: selectedGvbm?.teacherName || undefined,
          assignedRole: coordForm.assignedRole,
          subjectId: coordForm.subjectId || selectedGvbm?.subjectId || null,
          category: coordForm.category,
          priority: coordForm.priority,
          title: coordForm.title.trim(),
          description: coordForm.description.trim(),
          supportPlanMeasures: coordForm.supportPlanMeasures.trim() || undefined,
          slaTargetHours: Number(coordForm.slaTargetHours) || 16,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi khi tạo yêu cầu phối hợp.');
      setShowCoordModal(false);
      setCoordForm({
        studentId: '',
        subjectId: '',
        teacherId: '',
        assignedRole: 'GVBM',
        category: 'DE_NGHI_HO_TRO',
        priority: 'NORMAL',
        title: '',
        description: '',
        supportPlanMeasures: '',
        slaTargetHours: 16,
      });
      showToast(`Đã gửi yêu cầu phối hợp ${json.data.caseCode} tới giáo viên bộ môn.`);
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSubmittingCoord(false);
    }
  };

  const handleCaseStatusAction = async (
    caseId: string,
    action: string,
    extra: Record<string, any> = {}
  ) => {
    try {
      const res = await fetch(`/api/coordination/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast('Đã cập nhật trạng thái xử lý.');
      await fetchAllData();
      if (selectedThreadId) await fetchThreadDetail(selectedThreadId);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const currentHomeroomClass =
    contextData?.homeroomClasses?.find((c: any) => c.id === selectedClassId) ||
    contextData?.homeroomClasses?.[0] ||
    null;

  const kpis = dashboard?.kpis || {};

  return (
    <div className="min-h-screen bg-slate-50/70 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#003B3A] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#003B3A]">
                <span>Sổ Giáo viên</span>
                <span>/</span>
                <span>Phối hợp Giáo dục (GVCN)</span>
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Phối hợp Giáo dục & Chất lượng Phản hồi Lớp Chủ nhiệm
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Chu trình: Tiếp nhận → Phản hồi → Xử lý → Xác minh → Đo lường → Cải tiến
              </p>
            </div>

            {/* Filter Bar (A1) */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedAyId}
                onChange={(e) => setSelectedAyId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#003B3A] focus:outline-none"
              >
                {(contextData?.academicYears || []).map((ay: any) => (
                  <option key={ay.id} value={ay.id}>
                    Năm học: {ay.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-1.5 text-xs font-semibold text-[#003B3A] focus:border-[#003B3A] focus:outline-none"
              >
                {(contextData?.homeroomClasses || []).length === 0 ? (
                  <option value="">Chưa có lớp chủ nhiệm</option>
                ) : (
                  (contextData?.homeroomClasses || []).map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      Lớp CN: {cls.className}
                    </option>
                  ))
                )}
              </select>

              <select
                value={timeframeFilter}
                onChange={(e) => setTimeframeFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <option value="ALL">Mọi thời gian</option>
                <option value="7D">7 ngày qua</option>
                <option value="30D">30 ngày qua</option>
              </select>

              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <option value="">Tất cả nhóm vấn đề</option>
                {COORDINATION_TOPICS.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.order}. {t.label}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchAllData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* A1. Dashboard GVCN (8 Compact KPI Cards) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <div className="rounded-xl border border-teal-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Tổng hội thoại</span>
              <MessageSquare className="h-4 w-4 text-[#003B3A]" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {kpis.totalThreads ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Lớp chủ nhiệm</div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Chưa đọc</span>
              <span className="h-2 w-2 rounded-full bg-[#003B3A]" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-[#003B3A]">
              {kpis.unreadMessagesCount ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Tin nhắn mới</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Đang xử lý</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-blue-700">
              {kpis.pendingCasesCount ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Hồ sơ yêu cầu</div>
          </div>

          <div className="rounded-xl border border-rose-100 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Quá hạn SLA</span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-rose-600">
              {kpis.overdueCasesCount ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Theo giờ hành chính</div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Đã hoàn tất</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-700">
              {kpis.completedCasesCount ?? 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Yêu cầu đã đóng</div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Đúng hạn</span>
              <ShieldCheck className="h-4 w-4 text-[#00A19A]" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-[#00736E]">
              {kpis.onTimeResponseRate !== null && kpis.onTimeResponseRate !== undefined
                ? `${kpis.onTimeResponseRate}%`
                : '—'}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Phản hồi SLA</div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Hài lòng CSAT</span>
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {kpis.csatAverage !== null && kpis.csatAverage !== undefined
                ? `${kpis.csatAverage}/5`
                : '—'}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {kpis.csatCount ? `${kpis.csatCount} lượt đánh giá` : 'Chưa có dữ liệu'}
            </div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#003B3A]">
              <span>NPS GVCN</span>
              <Award className="h-4 w-4 text-[#003B3A]" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-[#003B3A]">
              {kpis.npsGvcnEligible && kpis.npsGvcn !== null ? kpis.npsGvcn : 'Ẩn (<5 mẫu)'}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {kpis.npsGvcnCount || 0} phản hồi ẩn danh
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('INBOX')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'INBOX'
                  ? 'bg-[#003B3A] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              A2. Hộp thư liên lạc PHHS ({threads.length})
            </button>

            <button
              onClick={() => setActiveTab('COORD_GVBM')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'COORD_GVBM'
                  ? 'bg-[#003B3A] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="h-4 w-4" />
              A3. Phối hợp Giáo viên Bộ môn ({cases.length})
            </button>

            <button
              onClick={() => setActiveTab('QUALITY')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'QUALITY'
                  ? 'bg-[#003B3A] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              A4. Theo dõi Chất lượng & Cải tiến ({improvements.length})
            </button>
          </div>

          <button
            onClick={() => setShowCoordModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#00A19A] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#008B85]"
          >
            <PlusCircle className="h-4 w-4" />
            Tạo yêu cầu phối hợp GVBM
          </button>
        </div>

        {/* TAB A2: HỘP THƯ LIÊN LẠC PHHS (2-column desktop, 2-screen mobile) */}
        {activeTab === 'INBOX' && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* LEFT COLUMN: Thread List */}
            <div
              className={`lg:col-span-5 ${
                mobileShowDetail ? 'hidden lg:block' : 'block'
              } rounded-2xl border border-slate-200 bg-white shadow-xs`}
            >
              <div className="border-b border-slate-100 p-3.5">
                <div className="relative">
                  <Search className=" absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm học sinh, mã HS, phụ huynh, chủ đề..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-[#003B3A] focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'UNREAD', label: 'Chưa đọc' },
                    { key: 'PROCESSING', label: 'Đang xử lý' },
                    { key: 'COMPLETED', label: 'Hoàn tất' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setInboxQuickFilter(tab.key as any)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                        inboxQuickFilter === tab.key
                          ? 'bg-teal-50 text-[#003B3A]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Đang tải danh sách hội thoại...
                  </div>
                ) : threads.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Chưa có cuộc trao đổi nào trong bộ lọc hiện tại
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Các tin nhắn từ Phụ huynh lớp chủ nhiệm hoặc trao đổi được chia sẻ sẽ hiển thị tại đây.
                    </p>
                  </div>
                ) : (
                  threads.map((item) => {
                    const isSelected = item.id === selectedThreadId;
                    const statusBadge =
                      THREAD_STATUS_LABELS[item.status] || THREAD_STATUS_LABELS.NEW;
                    const priorityBadge =
                      PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.NORMAL;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedThreadId(item.id);
                          setMobileShowDetail(true);
                        }}
                        className={`cursor-pointer p-3.5 transition hover:bg-teal-50/40 ${
                          isSelected ? 'border-l-4 border-l-[#003B3A] bg-teal-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">
                                HS: {item.studentName}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                                {item.studentCode}
                              </span>
                              {item.unreadCountTeacher > 0 && (
                                <span className="rounded-full bg-[#003B3A] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {item.unreadCountTeacher} mới
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              PH: {item.parentName} • Lớp {item.className}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.badgeClass}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-[#003B3A]">
                            {item.topicLabel}
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${priorityBadge.badgeClass}`}
                          >
                            {priorityBadge.label}
                          </span>
                        </div>

                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                          {item.lastMessagePreview || item.subjectTitle}
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Mã: {item.threadCode}</span>
                          <span>
                            {new Date(item.lastMessageAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Thread Detail & Student Context */}
            <div
              className={`lg:col-span-7 ${
                mobileShowDetail ? 'block' : 'hidden lg:block'
              } flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs`}
            >
              {!selectedThreadId || !threadDetail ? (
                <div className="flex h-[540px] flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    Chọn một hội thoại bên trái để xem chi tiết và phản hồi
                  </p>
                </div>
              ) : threadDetail.privacyRestricted ? (
                <div className="flex h-[540px] flex-col items-center justify-center p-8 text-center">
                  <Lock className="h-10 w-10 text-amber-500" />
                  <h3 className="mt-3 text-sm font-bold text-slate-800">
                    Giới hạn quyền riêng tư hội thoại
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-slate-600">
                    {threadDetail.privacyMessage ||
                      'GVCN không mặc định đọc toàn bộ hội thoại riêng giữa GVBM và PHHS khi chưa được chia sẻ phối hợp.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Student Context Header */}
                  <div className="border-b border-slate-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMobileShowDetail(false)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 lg:hidden"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900">
                              {threadDetail.subjectTitle}
                            </h2>
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-[#003B3A]">
                              {threadDetail.topicLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Học sinh:{' '}
                            <strong className="text-slate-800">
                              {threadDetail.student?.fullName} ({threadDetail.student?.studentCode})
                            </strong>{' '}
                            • Lớp {threadDetail.classInfo?.className} • PH:{' '}
                            {threadDetail.parentInfo?.parentName || 'Phụ huynh'}
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={handleCreateCaseFromThread}
                          className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-[#003B3A] hover:bg-teal-50"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Tạo yêu cầu xử lý
                        </button>
                        <button
                          onClick={() => {
                            setCoordForm((prev) => ({
                              ...prev,
                              studentId: threadDetail.studentId,
                              title: `Phối hợp hỗ trợ: ${threadDetail.subjectTitle}`,
                              description: `Chuyển phối hợp từ hội thoại ${threadDetail.threadCode}`,
                            }));
                            setShowCoordModal(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-[#00736E] hover:bg-teal-100"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Chuyển phối hợp GVBM/TTCM
                        </button>
                      </div>
                    </div>

                    {/* Linked Cases Banner */}
                    {threadDetail.cases?.length > 0 && (
                      <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/60 p-2.5 text-xs">
                        <div className="font-semibold text-teal-800">
                          Hồ sơ yêu cầu gắn kèm ({threadDetail.cases.length}):
                        </div>
                        {threadDetail.cases.map((c: any) => (
                          <div
                            key={c.id}
                            className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                          >
                            <span>
                              <strong>{c.caseCode}</strong>: {c.title} • Phụ trách:{' '}
                              {c.assignedToName || c.assignedRole}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                CASE_STATUS_LABELS[c.status]?.badgeClass || ''
                              }`}
                            >
                              {CASE_STATUS_LABELS[c.status]?.label || c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Conversation History */}
                  <div className="max-h-[380px] flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4">
                    {(threadDetail.messages || []).map((msg: any) => {
                      const isMine = msg.senderUserId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs ${
                              msg.isInternalNote
                                ? 'border border-amber-300 bg-amber-50 text-amber-950'
                                : isMine
                                  ? 'bg-[#003B3A] text-white'
                                  : 'border border-slate-200 bg-white text-slate-800'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-3 text-[10px] opacity-80">
                              <span className="font-bold">
                                {msg.senderName} ({msg.senderRole})
                                {msg.isInternalNote && ' • [Ghi chú nội bộ GV]'}
                              </span>
                              <span>
                                {new Date(msg.createdAt).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            {msg.attachments?.length > 0 && (
                              <div className="mt-2 space-y-1 border-t border-white/20 pt-1.5">
                                {msg.attachments.map((att: any) => (
                                  <div
                                    key={att.id}
                                    className="flex items-center gap-1.5 text-[11px] underline"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span>
                                      {att.fileName} ({Math.round(att.fileSize / 1024)} KB)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Box */}
                  <form onSubmit={handleSendReply} className="border-t border-slate-200 bg-white p-3.5">
                    {attachmentError && (
                      <div className="mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-600">
                        {attachmentError}
                      </div>
                    )}
                    {pendingAttachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {pendingAttachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-[11px] font-medium text-[#003B3A]"
                          >
                            <Paperclip className="h-3 w-3" />
                            {att.fileName}
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="ml-1 text-rose-500 hover:font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Nhập nội dung phản hồi cho Phụ huynh hoặc ghi chú phối hợp..."
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-[#003B3A] focus:outline-none"
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          <Paperclip className="h-3.5 w-3.5 text-[#003B3A]" />
                          <span>Đính kèm tệp (&le;5MB)</span>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            className="rounded border-slate-300 text-[#003B3A]"
                          />
                          <span>Ghi chú nội bộ GV (ẩn với PHHS)</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={sendingReply || !replyText.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#5B3172] disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {sendingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB A3: PHỐI HỢP GIÁO VIÊN BỘ MÔN */}
        {activeTab === 'COORD_GVBM' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 text-xs text-slate-700">
              <div className="flex items-center gap-2 font-bold text-[#003B3A]">
                <Lock className="h-4 w-4" />
                <span>Nguyên tắc bảo mật & phối hợp GVCN – GVBM</span>
              </div>
              <p className="mt-1">
                GVCN có thể tạo yêu cầu phối hợp hỗ trợ học sinh với GVBM, giao thời hạn và nhận cập nhật kết quả.
                GVCN không mặc định đọc toàn bộ hội thoại riêng 1-1 giữa GVBM và PHHS trừ khi được chia sẻ phối hợp.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Danh sách Yêu cầu Phối hợp & Hỗ trợ Học sinh ({cases.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Mã YC</th>
                      <th className="px-4 py-3">Học sinh / Lớp</th>
                      <th className="px-4 py-3">Môn / Bộ phận</th>
                      <th className="px-4 py-3">Nội dung & Biện pháp hỗ trợ</th>
                      <th className="px-4 py-3">Người phụ trách</th>
                      <th className="px-4 py-3">Hạn SLA</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          Chưa có yêu cầu phối hợp nào. Nhấn &ldquo;Tạo yêu cầu phối hợp GVBM&rdquo; để bắt đầu.
                        </td>
                      </tr>
                    ) : (
                      cases.map((c) => {
                        const stBadge =
                          CASE_STATUS_LABELS[c.status] || CASE_STATUS_LABELS.NEW;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono font-bold text-[#003B3A]">
                              {c.caseCode}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{c.studentName}</div>
                              <div className="text-[11px] text-slate-500">
                                {c.studentCode} • Lớp {c.className}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                                {c.subjectName}
                              </span>
                            </td>
                            <td className="max-w-xs px-4 py-3">
                              <div className="font-semibold text-slate-900">{c.title}</div>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                                {c.description}
                              </p>
                              {c.supportPlanMeasures && (
                                <div className="mt-1 rounded bg-teal-50 px-2 py-1 text-[11px] text-teal-900">
                                  <strong>Biện pháp:</strong> {c.supportPlanMeasures}
                                </div>
                              )}
                              {c.resolutionSummary && (
                                <div className="mt-1 rounded bg-teal-50 px-2 py-1 text-[11px] text-teal-800">
                                  <strong>Kết quả:</strong> {c.resolutionSummary}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">
                                {c.assignedToName || c.teacherName}
                              </div>
                              <div className="text-[10px] text-slate-400">{c.assignedRole}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px]">
                              <div className={c.isOverdue ? 'font-bold text-rose-600' : 'text-slate-700'}>
                                {new Date(c.slaDueAt).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </div>
                              {c.isOverdue && (
                                <span className="text-[10px] font-bold text-rose-600">
                                  Quá hạn SLA
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${stBadge.badgeClass}`}
                              >
                                {stBadge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                {c.status !== 'RESOLVED' && c.status !== 'COMPLETED' && (
                                  <button
                                    onClick={() =>
                                      handleCaseStatusAction(c.id, 'RESOLVE', {
                                        resolutionSummary:
                                          'GVCN & GVBM đã phối hợp hỗ trợ và thống nhất biện pháp với gia đình.',
                                      })
                                    }
                                    className="rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-700"
                                  >
                                    Có kết quả
                                  </button>
                                )}
                                {c.status === 'RESOLVED' && (
                                  <button
                                    onClick={() =>
                                      handleCaseStatusAction(c.id, 'CONFIRM_COMPLETED')
                                    }
                                    className="rounded-lg bg-[#003B3A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#5B3172]"
                                  >
                                    Hoàn tất
                                  </button>
                                )}
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
          </div>
        )}

        {/* TAB A4: THEO DÕI CHẤT LƯỢNG PHỐI HỢP & CẢI TIẾN */}
        {activeTab === 'QUALITY' && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Recurring Issues & On-time resolution summary */}
            <div className="space-y-4 lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Target className="h-4 w-4 text-[#003B3A]" />
                  Thống kê Vấn đề Phát sinh Nhiều lần
                </h3>
                <div className="mt-3 space-y-2.5">
                  {(dashboard?.recurringIssues || []).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Chưa ghi nhận nhóm vấn đề lặp lại trong kỳ.
                    </p>
                  ) : (
                    (dashboard?.recurringIssues || []).map((iss: any) => (
                      <div
                        key={iss.code}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{iss.label}</span>
                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-mono font-bold text-[#003B3A]">
                          {iss.count} yêu cầu
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Award className="h-4 w-4 text-[#003B3A]" />
                  Kết quả Khảo sát Định kỳ (Ẩn danh PHHS)
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  {dashboard?.npsSummary?.governanceNotice}
                </p>
                {dashboard?.npsSummary?.gvcnMetrics?.isEligibleToPublish ? (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between rounded-lg bg-teal-50 p-2.5">
                      <span>Điểm NPS GVCN:</span>
                      <strong className="text-[#003B3A]">
                        {dashboard.npsSummary.gvcnMetrics.npsScore}
                      </strong>
                    </div>
                    <div className="flex justify-between rounded-lg bg-slate-50 p-2.5">
                      <span>Điểm hài lòng trung bình (thang 1–5):</span>
                      <strong>
                        {dashboard.npsSummary.gvcnMetrics.criteriaAverages?.overallSatisfaction}/5.0
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                    Chưa đủ ngưỡng mẫu tối thiểu (&ge; 5 phản hồi) để công bố điểm NPS.
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Improvement Actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="h-4 w-4 text-[#003B3A]" />
                Nhiệm vụ Cải tiến Chất lượng được giao ({improvements.length})
              </h3>
              <div className="mt-3 space-y-3">
                {improvements.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                    Hiện chưa có nhiệm vụ cải tiến nào được giao.
                  </div>
                ) : (
                  improvements.map((imp: any) => (
                    <div
                      key={imp.id}
                      className="rounded-xl border border-slate-200 p-4 text-xs hover:border-teal-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#003B3A]">{imp.issueCode}</span>
                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-[#003B3A]">
                          {imp.status}
                        </span>
                      </div>
                      <h4 className="mt-1 font-bold text-slate-900">{imp.title}</h4>
                      <p className="mt-1 text-slate-600">
                        <strong>Nguyên nhân xác minh:</strong> {imp.verifiedRootCause}
                      </p>
                      <p className="mt-1 text-slate-600">
                        <strong>Biện pháp cải tiến:</strong> {imp.actionPlan}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Hạn hoàn thành: {new Date(imp.dueDate).toLocaleDateString('vi-VN')}</span>
                        {imp.status !== 'VERIFIED_EFFECTIVE' && (
                          <button
                            onClick={async () => {
                              await fetch('/api/coordination/improvements', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  id: imp.id,
                                  status: 'PENDING_VERIFICATION',
                                  evidenceNote: 'GVCN đã triển khai biện pháp và cập nhật minh chứng.',
                                }),
                              });
                              showToast('Đã gửi báo cáo hoàn thành nhiệm vụ cải tiến.');
                              fetchAllData();
                            }}
                            className="rounded-lg bg-[#003B3A] px-3 py-1 font-semibold text-white"
                          >
                            Cập nhật minh chứng
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Tạo yêu cầu phối hợp GVBM (A3) */}
      {showCoordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Tạo Yêu cầu Phối hợp Giáo viên Bộ môn / Chuyên môn
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Lớp chủ nhiệm: {currentHomeroomClass?.className || 'Chưa chọn'}
            </p>

            <form onSubmit={handleCreateGvbmCoordination} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">1. Chọn học sinh cần hỗ trợ *</label>
                <select
                  required
                  value={coordForm.studentId}
                  onChange={(e) => setCoordForm({ ...coordForm, studentId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="">-- Chọn học sinh trong lớp --</option>
                  {(currentHomeroomClass?.students || []).map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} ({st.studentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700">2. Môn học & GVBM phụ trách</label>
                  <select
                    value={`${coordForm.teacherId}__${coordForm.subjectId}`}
                    onChange={(e) => {
                      const [tId, sId] = e.target.value.split('__');
                      setCoordForm({ ...coordForm, teacherId: tId || '', subjectId: sId || '' });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <option value="__">-- Chọn GVBM theo phân công --</option>
                    {(currentHomeroomClass?.subjectTeachers || []).map((t: any, idx: number) => (
                      <option key={idx} value={`${t.teacherId}__${t.subjectId || ''}`}>
                        {t.subjectName} - {t.teacherName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">3. Vai trò & Mức ưu tiên</label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={coordForm.assignedRole}
                      onChange={(e) =>
                        setCoordForm({ ...coordForm, assignedRole: e.target.value as any })
                      }
                      className="w-1/2 rounded-xl border border-slate-200 px-2 py-2"
                    >
                      <option value="GVBM">GVBM</option>
                      <option value="TTCM">Tổ trưởng CM</option>
                      <option value="QLCM">Quản lý CM</option>
                    </select>
                    <select
                      value={coordForm.priority}
                      onChange={(e) =>
                        setCoordForm({ ...coordForm, priority: e.target.value as any })
                      }
                      className="w-1/2 rounded-xl border border-slate-200 px-2 py-2"
                    >
                      <option value="NORMAL">Bình thường (16h)</option>
                      <option value="HIGH">Cao (8h)</option>
                      <option value="URGENT">Khẩn (4h)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">4. Tiêu đề yêu cầu phối hợp *</label>
                <input
                  type="text"
                  required
                  value={coordForm.title}
                  onChange={(e) => setCoordForm({ ...coordForm, title: e.target.value })}
                  placeholder="VD: Phối hợp hỗ trợ kiến thức môn Toán chương Đại số"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">5. Nội dung cần phối hợp *</label>
                <textarea
                  rows={3}
                  required
                  value={coordForm.description}
                  onChange={(e) => setCoordForm({ ...coordForm, description: e.target.value })}
                  placeholder="Mô tả biểu hiện của học sinh, ý kiến của phụ huynh và nội dung đề nghị GVBM hỗ trợ..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">
                  6. Đề xuất biện pháp / Kế hoạch hỗ trợ học sinh
                </label>
                <input
                  type="text"
                  value={coordForm.supportPlanMeasures}
                  onChange={(e) =>
                    setCoordForm({ ...coordForm, supportPlanMeasures: e.target.value })
                  }
                  placeholder="VD: Giao phiếu bài tập củng cố và phản hồi tiến độ sau 1 tuần"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCoordModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingCoord}
                  className="rounded-xl bg-[#003B3A] px-4 py-2 font-bold text-white hover:bg-[#5B3172]"
                >
                  {submittingCoord ? 'Đang tạo...' : 'Giao yêu cầu phối hợp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
