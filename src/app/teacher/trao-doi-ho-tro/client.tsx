'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  MessageSquare,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Star,
  Award,
  Search,
  Send,
  Paperclip,
  PlusCircle,
  CheckCircle2,
  ArrowLeft,
  Target,
  TrendingUp,
  RefreshCw,
  Share2,
  UserCheck,
} from 'lucide-react';
import {
  COORDINATION_TOPICS,
  THREAD_STATUS_LABELS,
  CASE_STATUS_LABELS,
  NPS_SUPPLEMENTARY_CRITERIA,
  validateAttachmentMeta,
} from '@/lib/coordination/constants';
import GvbmAdvisoryTasksPanel from '@/components/advisory/GvbmAdvisoryTasksPanel';

interface Props {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function SubjectTeacherSupportClient({ user }: Props) {
  const [activeTab, setActiveTab] = useState<'INBOX' | 'SUPPORT_PLANS' | 'QUALITY'>('INBOX');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (B1: năm học, môn học, lớp, thời gian và trạng thái)
  const [contextData, setContextData] = useState<any>(null);
  const [selectedAyId, setSelectedAyId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data
  const [dashboard, setDashboard] = useState<any>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<any>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [shareWithGvcn, setShareWithGvcn] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ fileName: string; fileType: string; fileSize: number; fileUrl: string }>
  >([]);
  const [sendingReply, setSendingReply] = useState(false);

  // Support plans (B3)
  const [cases, setCases] = useState<any[]>([]);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMsgForm, setNewMsgForm] = useState({
    assignmentIndex: 0,
    studentId: '',
    topic: 'TIEN_DO_HOC_TAP',
    content: '',
    createSupportPlan: false,
    supportPlanMeasures: '',
  });

  // Update Support Plan modal (B3)
  const [editingCase, setEditingCase] = useState<any | null>(null);
  const [supportForm, setSupportForm] = useState({
    supportPlanMeasures: '',
    supportProgressNote: '',
    supportOutcomeProposal: 'CONTINUE' as 'CONTINUE' | 'COMPLETE' | 'ESCALATE',
    verifiedConclusion: '',
    syncToStudentSupportRecord: true,
  });

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
      if (!ctxRes.ok) throw new Error(ctxJson.error || 'Không thể tải phân công giảng dạy.');

      const ctx = ctxJson.data;
      setContextData(ctx);
      const ayId = selectedAyId || ctx.activeAcademicYear?.id || '';
      if (!selectedAyId && ayId) setSelectedAyId(ayId);

      const query = new URLSearchParams({
        viewMode: 'GVBM',
        ...(ayId ? { academicYearId: ayId } : {}),
        ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
        ...(selectedClassId ? { classId: selectedClassId } : {}),
        ...(selectedStatus ? { status: selectedStatus } : {}),
        ...(selectedTopic ? { topic: selectedTopic } : {}),
      });

      if (timeframeFilter === '7D') {
        query.set('fromDate', new Date(Date.now() - 7 * 86400000).toISOString());
      } else if (timeframeFilter === '30D') {
        query.set('fromDate', new Date(Date.now() - 30 * 86400000).toISOString());
      }

      const [dashRes, thdRes, caseRes] = await Promise.all([
        fetch(`/api/coordination/dashboard?${query.toString()}`),
        fetch(
          `/api/coordination/threads?${query.toString()}${
            searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''
          }`
        ),
        fetch(`/api/coordination/cases?${query.toString()}`),
      ]);

      const [dashJson, thdJson, caseJson] = await Promise.all([
        dashRes.json(),
        thdRes.json(),
        caseRes.json(),
      ]);

      if (dashJson.success) setDashboard(dashJson.data);
      if (thdJson.success) {
        const items = thdJson.data.items || [];
        setThreads(items);
        if (!selectedThreadId && items.length > 0) {
          setSelectedThreadId(items[0].id);
        }
      }
      if (caseJson.success) setCases(caseJson.data || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [
    selectedAyId,
    selectedSubjectId,
    selectedClassId,
    selectedStatus,
    selectedTopic,
    timeframeFilter,
    searchQuery,
    selectedThreadId,
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchThreadDetail = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`/api/coordination/threads/${threadId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setThreadDetail(json.data);
      }
    } catch {
      setThreadDetail(null);
    }
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadDetail(selectedThreadId);
    } else {
      setThreadDetail(null);
    }
  }, [selectedThreadId, fetchThreadDetail]);

  const teachingAssignments: any[] = contextData?.teachingAssignments || [];
  const distinctClasses = Array.from(
    new Map(teachingAssignments.map((a) => [a.classId, { id: a.classId, name: a.className }])).values()
  );
  const distinctSubjects = Array.from(
    new Map(
      teachingAssignments.map((a) => [a.subjectId, { id: a.subjectId, name: a.subjectName }])
    ).values()
  );

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
          shareWithGvcn,
          attachments: pendingAttachments,
          clientMessageId: `GVBM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReplyText('');
      setPendingAttachments([]);
      setShareWithGvcn(false);
      showToast('Đã gửi phản hồi thành công.');
      await fetchThreadDetail(selectedThreadId);
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateScopedThread = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignment = teachingAssignments[newMsgForm.assignmentIndex];
    if (!assignment || !newMsgForm.studentId || !newMsgForm.content.trim()) {
      showToast('Vui lòng chọn phân công lớp/môn, học sinh và nhập nội dung.');
      return;
    }

    try {
      const res = await fetch('/api/coordination/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: newMsgForm.studentId,
          teacherId: contextData?.teacher?.id,
          roleType: 'GVBM',
          subjectId: assignment.subjectId,
          topic: newMsgForm.topic,
          content: newMsgForm.content.trim(),
          createCaseImmediately: newMsgForm.createSupportPlan,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShowNewMessageModal(false);
      setNewMsgForm({
        assignmentIndex: 0,
        studentId: '',
        topic: 'TIEN_DO_HOC_TAP',
        content: '',
        createSupportPlan: false,
        supportPlanMeasures: '',
      });
      showToast('Đã khởi tạo trao đổi theo phân công giảng dạy.');
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleSaveSupportPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;
    try {
      const nextAction =
        supportForm.supportOutcomeProposal === 'COMPLETE' ? 'RESOLVE' : 'UPDATE_PLAN';
      const res = await fetch(`/api/coordination/cases/${editingCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextAction,
          supportPlanMeasures: supportForm.supportPlanMeasures,
          supportProgressNote: supportForm.supportProgressNote,
          supportOutcomeProposal: supportForm.supportOutcomeProposal,
          verifiedConclusion: supportForm.verifiedConclusion,
          resolutionSummary:
            supportForm.supportOutcomeProposal === 'COMPLETE'
              ? supportForm.verifiedConclusion || supportForm.supportProgressNote
              : undefined,
          syncToStudentSupportRecord: supportForm.syncToStudentSupportRecord,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEditingCase(null);
      showToast('Đã cập nhật Kế hoạch Hỗ trợ Học sinh & đồng bộ kết luận xác minh.');
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const kpis = dashboard?.kpis || {};
  const npsGvbmMetrics = dashboard?.npsSummary?.gvbmMetrics || null;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-12">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#003B3A] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Filters (B1) */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#003B3A]">
                <span>Sổ Giáo viên</span>
                <span>/</span>
                <span>Trao đổi & Hỗ trợ Học sinh (GVBM)</span>
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Trao đổi PHHS & Theo dõi Hỗ trợ Học sinh theo Bộ môn
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Tự động đồng bộ từ phân công giảng dạy hợp lệ • Mã GV:{' '}
                <strong>{contextData?.teacher?.teacherCode || '—'}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedAyId}
                onChange={(e) => setSelectedAyId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {(contextData?.academicYears || []).map((ay: any) => (
                  <option key={ay.id} value={ay.id}>
                    Năm học: {ay.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-1.5 text-xs font-semibold text-[#003B3A]"
              >
                <option value="">Tất cả môn phân công ({distinctSubjects.length})</option>
                {distinctSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    Môn: {s.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <option value="">Tất cả lớp phụ trách ({distinctClasses.length})</option>
                {distinctClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp: {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <option value="">Mọi trạng thái</option>
                <option value="NEW">Mới</option>
                <option value="IN_DISCUSSION">Đang trao đổi</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
              </select>

              <button
                onClick={fetchAllData}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* B1. Dashboard GVBM (9 KPI Cards) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">Lớp phụ trách</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">
              {distinctClasses.length}
            </div>
            <div className="text-[10px] text-slate-400">Theo phân công</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">Môn phân công</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-[#003B3A]">
              {distinctSubjects.length}
            </div>
            <div className="text-[10px] text-slate-400">Hợp lệ hiệu lực</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">Hội thoại PHHS</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">
              {kpis.totalThreads ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Trao đổi môn học</div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">Chưa đọc</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-[#003B3A]">
              {kpis.unreadMessagesCount ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Tin nhắn mới</div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">Cần xử lý</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-blue-700">
              {kpis.pendingCasesCount ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Yêu cầu hỗ trợ</div>
          </div>

          <div className="rounded-xl border border-rose-100 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">Quá hạn SLA</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-rose-600">
              {kpis.overdueCasesCount ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Giờ hành chính</div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">Đúng hạn</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-[#00736E]">
              {kpis.onTimeResponseRate !== null && kpis.onTimeResponseRate !== undefined
                ? `${kpis.onTimeResponseRate}%`
                : '—'}
            </div>
            <div className="text-[10px] text-slate-400">Tỷ lệ phản hồi</div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">CSAT xử lý</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">
              {kpis.csatAverage !== null && kpis.csatAverage !== undefined
                ? `${kpis.csatAverage}/5`
                : '—'}
            </div>
            <div className="text-[10px] text-slate-400">Sau hỗ trợ</div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 shadow-xs">
            <div className="text-[11px] font-semibold text-[#003B3A]">NPS Cá nhân</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-[#003B3A]">
              {kpis.npsGvbmEligible && kpis.npsGvbm !== null ? kpis.npsGvbm : 'Ẩn (<5)'}
            </div>
            <div className="text-[10px] text-slate-500">{kpis.npsGvbmCount || 0} mẫu ẩn danh</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4">
          <GvbmAdvisoryTasksPanel
            mode="GVBM"
            academicYearId={selectedAyId}
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('INBOX')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'INBOX'
                  ? 'bg-[#003B3A] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              B2. Hộp thư GVBM ({threads.length})
            </button>

            <button
              onClick={() => setActiveTab('SUPPORT_PLANS')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'SUPPORT_PLANS'
                  ? 'bg-[#003B3A] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Target className="h-4 w-4" />
              B3. Theo dõi Hỗ trợ Học sinh ({cases.length})
            </button>

            <button
              onClick={() => setActiveTab('QUALITY')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'QUALITY'
                  ? 'bg-[#003B3A] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Award className="h-4 w-4" />
              B4. Chất lượng Phản hồi (NPS & CSAT)
            </button>
          </div>

          <button
            onClick={() => setShowNewMessageModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#00A19A] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#008B85]"
          >
            <PlusCircle className="h-4 w-4" />
            Trao đổi mới theo Phân công
          </button>
        </div>

        {/* 7 Topic Quick Pills (B2) */}
        {activeTab === 'INBOX' && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Chủ đề:</span>
              <button
                onClick={() => setSelectedTopic('')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  selectedTopic === ''
                    ? 'bg-[#003B3A] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả (7)
              </button>
              {COORDINATION_TOPICS.map((tp) => (
                <button
                  key={tp.code}
                  onClick={() => setSelectedTopic(tp.code)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    selectedTopic === tp.code
                      ? 'bg-[#003B3A] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tp.order}. {tp.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left list */}
              <div
                className={`lg:col-span-5 ${
                  mobileShowDetail ? 'hidden lg:block' : 'block'
                } rounded-2xl border border-slate-200 bg-white shadow-xs`}
              >
                <div className="border-b border-slate-100 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên HS, mã HS, lớp, chủ đề..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-[#003B3A] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto">
                  {threads.length === 0 ? (
                    <div className="p-8 text-center">
                      <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        Chưa có cuộc trao đổi môn học nào
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Mỗi cuộc trao đổi đều gắn chặt với Mã HS, Mã GV, Mã lớp, Mã môn và Mã phân công giảng dạy.
                      </p>
                    </div>
                  ) : (
                    threads.map((item) => {
                      const isSelected = item.id === selectedThreadId;
                      const stBadge =
                        THREAD_STATUS_LABELS[item.status] || THREAD_STATUS_LABELS.NEW;
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
                              <span className="text-xs font-bold text-slate-900">
                                {item.studentName} ({item.studentCode})
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Lớp {item.className} • Môn:{' '}
                                <strong className="text-[#003B3A]">{item.subjectName}</strong>
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stBadge.badgeClass}`}
                            >
                              {stBadge.label}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="rounded bg-teal-50 px-2 py-0.5 font-semibold text-[#003B3A]">
                              {item.topicLabel}
                            </span>
                            {item.assignmentId && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500">
                                PC: {item.assignmentId.slice(0, 10)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                            {item.lastMessagePreview}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right detail */}
              <div
                className={`lg:col-span-7 ${
                  mobileShowDetail ? 'block' : 'hidden lg:block'
                } flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs`}
              >
                {!selectedThreadId || !threadDetail ? (
                  <div className="flex h-[520px] flex-col items-center justify-center p-8 text-center">
                    <MessageSquare className="h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      Chọn một cuộc trao đổi môn học để xem bối cảnh phân công và phản hồi
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Assignment Metadata Banner (B2 Mandatory Binding) */}
                    <div className="border-b border-slate-100 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setMobileShowDetail(false)}
                            className="rounded-lg border border-slate-200 p-1.5 lg:hidden"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          <div>
                            <h2 className="text-sm font-bold text-slate-900">
                              {threadDetail.subjectTitle}
                            </h2>
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-600">
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">
                                Mã HS: {threadDetail.student?.studentCode}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">
                                Mã GV: {threadDetail.teacherInfo?.teacherCode}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5">
                                Lớp: {threadDetail.classInfo?.className}
                              </span>
                              <span className="rounded bg-teal-50 px-2 py-0.5 font-bold text-[#003B3A]">
                                Môn: {threadDetail.subjectInfo?.name || 'Bộ môn'}
                              </span>
                              <span className="rounded bg-teal-50 px-2 py-0.5 font-mono text-teal-800">
                                Mã PC: {threadDetail.assignmentId || 'ASSIGNED'}
                              </span>
                              <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                                Chủ đề: {threadDetail.topicLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[360px] flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4">
                      {(threadDetail.messages || []).map((msg: any) => {
                        const isMine = msg.senderUserId === user.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                                isMine
                                  ? 'bg-[#003B3A] text-white'
                                  : 'border border-slate-200 bg-white text-slate-800'
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-3 text-[10px] opacity-80">
                                <span className="font-bold">
                                  {msg.senderName} ({msg.senderRole})
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
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendReply} className="border-t border-slate-200 bg-white p-3.5">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Nhập phản hồi chuyên môn cho Phụ huynh..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-[#003B3A] focus:outline-none"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={shareWithGvcn}
                            onChange={(e) => setShareWithGvcn(e.target.checked)}
                            className="rounded border-slate-300 text-[#003B3A]"
                          />
                          <span>Đồng thời chia sẻ hội thoại này với GVCN lớp để phối hợp</span>
                        </label>
                        <button
                          type="submit"
                          disabled={sendingReply || !replyText.trim()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-4 py-2 text-xs font-bold text-white hover:bg-[#5B3172] disabled:opacity-50"
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
          </>
        )}

        {/* TAB B3: THEO DÕI HỖ TRỢ HỌC SINH */}
        {activeTab === 'SUPPORT_PLANS' && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Kế hoạch Hỗ trợ Học sinh & Phối hợp GVCN ({cases.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Liên kết trực tiếp với dữ liệu chất lượng môn học và Hồ sơ Hỗ trợ Học tập (chỉ đồng bộ kết luận đã xác minh).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã HS / Học sinh</th>
                    <th className="px-4 py-3">Lớp / Môn</th>
                    <th className="px-4 py-3">Biện pháp & Tiến độ Hỗ trợ</th>
                    <th className="px-4 py-3">Đề xuất</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Chưa có kế hoạch hỗ trợ học sinh nào.
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => {
                      const stBadge =
                        CASE_STATUS_LABELS[c.status] || CASE_STATUS_LABELS.NEW;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{c.studentName}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {c.studentCode} • {c.caseCode}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">Lớp {c.className}</div>
                            <div className="text-[11px] text-[#003B3A]">{c.subjectName}</div>
                          </td>
                          <td className="max-w-md px-4 py-3">
                            <div className="font-semibold text-slate-900">{c.title}</div>
                            {c.supportPlanMeasures && (
                              <p className="mt-1 text-[11px] text-teal-800">
                                <strong>Biện pháp:</strong> {c.supportPlanMeasures}
                              </p>
                            )}
                            {c.supportProgressNote && (
                              <p className="mt-0.5 text-[11px] text-slate-600">
                                <strong>Tiến độ:</strong> {c.supportProgressNote}
                              </p>
                            )}
                            {c.verifiedConclusion && (
                              <p className="mt-0.5 text-[11px] font-medium text-[#003B3A]">
                                <strong>Kết luận:</strong> {c.verifiedConclusion}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {c.supportOutcomeProposal === 'COMPLETE'
                                ? 'Đề xuất kết thúc'
                                : c.supportOutcomeProposal === 'ESCALATE'
                                  ? 'Chuyển phối hợp sâu'
                                  : 'Tiếp tục hỗ trợ'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${stBadge.badgeClass}`}
                            >
                              {stBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setEditingCase(c);
                                setSupportForm({
                                  supportPlanMeasures: c.supportPlanMeasures || '',
                                  supportProgressNote: c.supportProgressNote || '',
                                  supportOutcomeProposal:
                                    (c.supportOutcomeProposal as any) || 'CONTINUE',
                                  verifiedConclusion: c.verifiedConclusion || '',
                                  syncToStudentSupportRecord: true,
                                });
                              }}
                              className="rounded-lg bg-[#003B3A] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5B3172]"
                            >
                              Ghi nhận tiến độ
                            </button>
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

        {/* TAB B4: CHẤT LƯỢNG PHẢN HỒI (Ẩn danh PHHS tuyệt đối) */}
        {activeTab === 'QUALITY' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 text-xs text-slate-700">
              <div className="font-bold text-[#003B3A]">
                Chính sách Bảo mật Danh tính & Sử dụng Chỉ số Chất lượng (Mục B4)
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>
                  Hệ thống <strong>không cung cấp danh tính PHHS hoặc học sinh</strong> gắn với từng phiếu khảo sát định kỳ.
                </li>
                <li>
                  Kết quả NPS chỉ hiển thị khi đạt ngưỡng mẫu tối thiểu (&ge; 5 phản hồi hợp lệ) và{' '}
                  <strong>không sử dụng NPS làm căn cứ duy nhất để xếp loại giáo viên</strong>.
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">
                  Chỉ số NPS & Điểm Hài lòng theo 5 Tiêu chí (Thang 1–5)
                </h3>
                {npsGvbmMetrics?.isEligibleToPublish ? (
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-teal-50 p-3">
                      <span className="font-semibold text-slate-700">
                        Điểm NPS Bộ môn (Thang -100 đến +100):
                      </span>
                      <span className="text-lg font-extrabold text-[#003B3A]">
                        {npsGvbmMetrics.npsScore}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                        Promoters (9–10): <strong>{npsGvbmMetrics.promotersPct}%</strong>
                      </div>
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                        Passives (7–8): <strong>{npsGvbmMetrics.passivesPct}%</strong>
                      </div>
                      <div className="rounded-lg bg-rose-50 p-2 text-rose-800">
                        Detractors (0–6): <strong>{npsGvbmMetrics.detractorsPct}%</strong>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <div className="mb-2 font-bold text-slate-800">
                        Điểm Hài lòng theo Tiêu chí (Tách biệt với NPS):
                      </div>
                      <div className="space-y-2">
                        {NPS_SUPPLEMENTARY_CRITERIA.map((crit) => {
                          const mapKey: Record<string, string> = {
                            criteriaCommunication: 'communication',
                            criteriaTimeliness: 'timeliness',
                            criteriaClarity: 'clarity',
                            criteriaSupport: 'support',
                            criteriaCoordination: 'coordination',
                          };
                          const val =
                            npsGvbmMetrics.criteriaAverages?.[mapKey[crit.key]] ?? '—';
                          return (
                            <div
                              key={crit.key}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <span>{crit.label}</span>
                              <span className="font-mono font-bold text-slate-900">
                                {val} / 5.0
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                    Chưa đủ số mẫu khảo sát tối thiểu (&ge; 5 phản hồi) để hiển thị kết quả NPS cá nhân.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">
                  Chủ đề Cần Cải tiến & Ý kiến Đóng góp Ẩn danh
                </h3>
                <div className="mt-3 space-y-2">
                  {(dashboard?.npsSummary?.anonymizedComments || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      Chưa có ý kiến đóng góp công bố trong kỳ.
                    </div>
                  ) : (
                    (dashboard?.npsSummary?.anonymizedComments || []).map((c: any) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold text-[#003B3A]">
                            Phản hồi ẩn danh • Môn: {c.subjectName || 'Bộ môn'}
                          </span>
                          <span>Điểm tiêu chí TB: {c.criteriaAverage}/5.0</span>
                        </div>
                        <p className="mt-1 text-slate-700">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Tạo trao đổi mới theo phân công hợp lệ (B2) */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Gửi Trao đổi / Kế hoạch Hỗ trợ theo Phân công Giảng dạy
            </h3>
            <form onSubmit={handleCreateScopedThread} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">
                  1. Chọn Lớp & Môn học được phân công *
                </label>
                <select
                  value={newMsgForm.assignmentIndex}
                  onChange={(e) =>
                    setNewMsgForm({
                      ...newMsgForm,
                      assignmentIndex: Number(e.target.value),
                      studentId: '',
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  {teachingAssignments.map((a, idx) => (
                    <option key={a.assignmentId} value={idx}>
                      Lớp {a.className} - Môn {a.subjectName} (Mã PC: {a.assignmentId.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">2. Chọn Học sinh trong lớp *</label>
                <select
                  required
                  value={newMsgForm.studentId}
                  onChange={(e) => setNewMsgForm({ ...newMsgForm, studentId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {(teachingAssignments[newMsgForm.assignmentIndex]?.students || []).map(
                    (st: any) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.studentCode})
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">3. Chủ đề trao đổi (1–7) *</label>
                <select
                  value={newMsgForm.topic}
                  onChange={(e) => setNewMsgForm({ ...newMsgForm, topic: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  {COORDINATION_TOPICS.map((tp) => (
                    <option key={tp.code} value={tp.code}>
                      {tp.order}. {tp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">4. Nội dung trao đổi *</label>
                <textarea
                  rows={3}
                  required
                  value={newMsgForm.content}
                  onChange={(e) => setNewMsgForm({ ...newMsgForm, content: e.target.value })}
                  placeholder="Nhập nội dung trao đổi chuyên môn với Phụ huynh..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={newMsgForm.createSupportPlan}
                  onChange={(e) =>
                    setNewMsgForm({ ...newMsgForm, createSupportPlan: e.target.checked })
                  }
                  className="rounded border-slate-300 text-[#003B3A]"
                />
                <span className="font-semibold text-slate-700">
                  Đồng thời lập Kế hoạch Hỗ trợ Học sinh (B3)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#003B3A] px-4 py-2 font-bold text-white hover:bg-[#5B3172]"
                >
                  Gửi trao đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cập nhật Kế hoạch Hỗ trợ Học sinh (B3) */}
      {editingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Cập nhật Kế hoạch Hỗ trợ Học sinh ({editingCase.studentName})
            </h3>
            <form onSubmit={handleSaveSupportPlan} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">1. Biện pháp hỗ trợ môn học *</label>
                <textarea
                  rows={2}
                  required
                  value={supportForm.supportPlanMeasures}
                  onChange={(e) =>
                    setSupportForm({ ...supportForm, supportPlanMeasures: e.target.value })
                  }
                  placeholder="Ghi nhận biện pháp phụ đạo, điều chỉnh bài tập hoặc hỗ trợ trên lớp..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">2. Ghi nhận tiến độ & kết quả *</label>
                <textarea
                  rows={2}
                  required
                  value={supportForm.supportProgressNote}
                  onChange={(e) =>
                    setSupportForm({ ...supportForm, supportProgressNote: e.target.value })
                  }
                  placeholder="Cập nhật sự thay đổi về điểm số, thái độ học tập và mức độ hoàn thành bài..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">
                  3. Kết luận giáo dục đã xác minh (Đồng bộ Sổ Giáo viên)
                </label>
                <input
                  type="text"
                  value={supportForm.verifiedConclusion}
                  onChange={(e) =>
                    setSupportForm({ ...supportForm, verifiedConclusion: e.target.value })
                  }
                  placeholder="Kết luận ngắn gọn, khách quan sau đợt hỗ trợ..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">
                  4. Đề xuất tiếp theo
                </label>
                <select
                  value={supportForm.supportOutcomeProposal}
                  onChange={(e) =>
                    setSupportForm({
                      ...supportForm,
                      supportOutcomeProposal: e.target.value as any,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="CONTINUE">Tiếp tục theo dõi & hỗ trợ</option>
                  <option value="COMPLETE">Đề xuất kết thúc hỗ trợ (Đã đạt mục tiêu)</option>
                  <option value="ESCALATE">Chuyển phối hợp sâu với GVCN / Tổ CM</option>
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={supportForm.syncToStudentSupportRecord}
                  onChange={(e) =>
                    setSupportForm({
                      ...supportForm,
                      syncToStudentSupportRecord: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-[#003B3A]"
                />
                <span className="text-slate-700">
                  Đồng bộ kết luận xác minh vào Hồ sơ Hỗ trợ Học tập (LearningSupportTarget)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#003B3A] px-4 py-2 font-bold text-white hover:bg-[#5B3172]"
                >
                  Lưu & Đồng bộ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
