'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  MessageSquare,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  Star,
  Award,
  RefreshCw,
  BookOpen,
  UserCheck,
  AlertCircle,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  COORDINATION_TOPICS,
  THREAD_STATUS_LABELS,
  CASE_STATUS_LABELS,
  NPS_SUPPLEMENTARY_CRITERIA,
  validateAttachmentMeta,
} from '@/lib/coordination/constants';
import ParentGvbmAdvisorySection from '@/components/advisory/ParentGvbmAdvisorySection';

interface Props {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function ParentCoordinationClient({ user }: Props) {
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW_CONTACTS' | 'SEND_MESSAGE' | 'THREADS_CASES' | 'SURVEYS'
  >('OVERVIEW_CONTACTS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-child context (C1)
  const [contextData, setContextData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Threads, Cases & Surveys
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  const [cases, setCases] = useState<any[]>([]);
  const [npsEvaluations, setNpsEvaluations] = useState<any[]>([]);

  // C3. Guided Composer State
  const [composer, setComposer] = useState({
    roleType: 'GVCN' as 'GVCN' | 'GVBM',
    teacherId: '',
    subjectId: '',
    topic: 'PHOI_HOP_GIAO_DUC',
    content: '',
    needFormalCase: false,
  });
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ fileName: string; fileType: string; fileSize: number; fileUrl: string }>
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [submittingMessage, setSubmittingMessage] = useState(false);

  // C4. CSAT & Reopen Modal
  const [ratingCase, setRatingCase] = useState<any | null>(null);
  const [csatForm, setCsatForm] = useState({
    csatScore: 5,
    timelinessScore: 5,
    clarityScore: 5,
    supportScore: 5,
    comment: '',
  });
  const [reopeningCase, setReopeningCase] = useState<any | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // C5. NPS Survey Modal
  const [activeSurveyItem, setActiveSurveyItem] = useState<any | null>(null);
  const [surveyForm, setSurveyForm] = useState({
    npsScore: 9,
    criteriaCommunication: 5,
    criteriaTimeliness: 5,
    criteriaClarity: 5,
    criteriaSupport: 5,
    criteriaCoordination: 5,
    feedbackTopic: 'PHOI_HOP_GIAO_DUC',
    comment: '',
  });
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

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
        `/api/coordination/context${
          selectedStudentId ? `?studentId=${selectedStudentId}` : ''
        }`
      );
      const ctxJson = await ctxRes.json();
      if (!ctxRes.ok) throw new Error(ctxJson.error || 'Không thể tải hồ sơ học sinh.');

      const ctx = ctxJson.data;
      setContextData(ctx);

      const currentChild =
        (selectedStudentId
          ? ctx.children?.find((c: any) => c.studentId === selectedStudentId)
          : null) ||
        ctx.activeChild ||
        ctx.children?.[0] ||
        null;

      const activeStId = currentChild?.studentId || '';
      if (!selectedStudentId && activeStId) {
        setSelectedStudentId(activeStId);
      }

      // Pre-select default GVCN in composer if empty
      if (currentChild && !composer.teacherId && currentChild.gvcnContacts?.[0]) {
        setComposer((prev) => ({
          ...prev,
          roleType: 'GVCN',
          teacherId: currentChild.gvcnContacts[0].teacherId,
          subjectId: '',
        }));
      }

      const [thdRes, caseRes, npsRes] = await Promise.all([
        fetch(
          `/api/coordination/threads?viewMode=PARENT${
            activeStId ? `&studentId=${activeStId}` : ''
          }`
        ),
        fetch(
          `/api/coordination/cases?viewMode=PARENT${
            activeStId ? `&studentId=${activeStId}` : ''
          }`
        ),
        fetch(
          `/api/coordination/nps${activeStId ? `?studentId=${activeStId}` : ''}`
        ),
      ]);

      const [thdJson, caseJson, npsJson] = await Promise.all([
        thdRes.json(),
        caseRes.json(),
        npsRes.json(),
      ]);

      if (thdJson.success) {
        const items = thdJson.data.items || [];
        setThreads(items);
        if (!selectedThreadId && items.length > 0) {
          setSelectedThreadId(items[0].id);
        }
      }
      if (caseJson.success) setCases(caseJson.data || []);
      if (npsJson.success) setNpsEvaluations(npsJson.data.parentEvaluations || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, selectedThreadId, composer.teacherId]);

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
    }
  }, [selectedThreadId, fetchThreadDetail]);

  const activeChild =
    contextData?.children?.find((c: any) => c.studentId === selectedStudentId) ||
    contextData?.activeChild ||
    null;

  const handleStartContact = (contact: any) => {
    setComposer({
      roleType: contact.roleType,
      teacherId: contact.teacherId,
      subjectId: contact.subjectId || '',
      topic: contact.roleType === 'GVCN' ? 'PHOI_HOP_GIAO_DUC' : 'KET_QUA_HOC_TAP',
      content: '',
      needFormalCase: false,
    });
    setActiveTab('SEND_MESSAGE');
  };

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
        setAttachmentError(check.reason || 'Tệp đính kèm không hợp lệ.');
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

  const handleSendComposer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild || !composer.teacherId || !composer.content.trim()) {
      showToast('Vui lòng chọn giáo viên và nhập nội dung trao đổi.');
      return;
    }
    setSubmittingMessage(true);
    try {
      const res = await fetch('/api/coordination/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeChild.studentId,
          teacherId: composer.teacherId,
          roleType: composer.roleType,
          subjectId: composer.subjectId || null,
          topic: composer.topic,
          content: composer.content.trim(),
          attachments: pendingAttachments,
          createCaseImmediately: composer.needFormalCase,
          clientMessageId: `PH-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setComposer((prev) => ({ ...prev, content: '', needFormalCase: false }));
      setPendingAttachments([]);
      showToast('Đã gửi trao đổi tới giáo viên thành công.');
      setSelectedThreadId(json.data.thread.id);
      setActiveTab('THREADS_CASES');
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSubmittingMessage(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !replyText.trim()) return;
    try {
      const res = await fetch(`/api/coordination/threads/${selectedThreadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText.trim(),
          clientMessageId: `PHR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReplyText('');
      showToast('Đã gửi phản hồi.');
      await fetchThreadDetail(selectedThreadId);
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleSubmitCsat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingCase) return;
    try {
      const res = await fetch(`/api/coordination/cases/${ratingCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_CSAT',
          ...csatForm,
          confirmCompleted: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRatingCase(null);
      showToast('Cảm ơn Quý Phụ huynh đã xác nhận hoàn tất và đánh giá chất lượng!');
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleReopenCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopeningCase || !reopenReason.trim()) return;
    try {
      const res = await fetch(`/api/coordination/cases/${reopeningCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REOPEN',
          reopenReason: reopenReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReopeningCase(null);
      setReopenReason('');
      showToast('Đã gửi yêu cầu xem xét lại.');
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleSubmitNpsSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSurveyItem || !activeChild) return;
    setSubmittingSurvey(true);
    try {
      const res = await fetch('/api/coordination/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: activeSurveyItem.periodId,
          assignmentId: activeSurveyItem.assignmentId,
          studentId: activeChild.studentId,
          ...surveyForm,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setActiveSurveyItem(null);
      showToast('Cảm ơn Quý Phụ huynh đã thực hiện khảo sát chất lượng giáo dục!');
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const unreadCount = threads.reduce((acc, t) => acc + (t.unreadCountParent || 0), 0);
  const pendingSurveysCount = npsEvaluations.filter((e) => !e.isCompleted).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {toastMessage && (
        <div className="fixed bottom-16 right-4 z-50 flex items-center gap-2 rounded-xl bg-[#6E3D89] px-4 py-3 text-xs font-bold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile-First Header & Child Switcher (C1) */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#6E3D89] px-4 py-5 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-200">
            Cổng Phụ huynh Sky-Line • Trao đổi & Đồng hành
          </div>
          <h1 className="mt-1 text-lg font-bold sm:text-xl">
            Đồng hành Giáo dục cùng Nhà trường
          </h1>

          {/* Child Switcher for Multi-Child Parents */}
          {(contextData?.children || []).length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-teal-100">Hồ sơ con:</span>
              {contextData.children.map((child: any) => {
                const isSelected = child.studentId === activeChild?.studentId;
                return (
                  <button
                    key={child.studentId}
                    onClick={() => {
                      setSelectedStudentId(child.studentId);
                      setSelectedThreadId(null);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-white text-[#6E3D89] shadow-xs'
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {child.fullName} • Lớp {child.className}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Overview Pills (C1) */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div
              onClick={() => setActiveTab('THREADS_CASES')}
              className="cursor-pointer rounded-xl bg-white/10 p-2.5 backdrop-blur-xs"
            >
              <div className="text-[11px] text-teal-100">Tin nhắn mới</div>
              <div className="mt-0.5 text-lg font-extrabold">{unreadCount}</div>
            </div>
            <div
              onClick={() => setActiveTab('THREADS_CASES')}
              className="cursor-pointer rounded-xl bg-white/10 p-2.5 backdrop-blur-xs"
            >
              <div className="text-[11px] text-teal-100">Ý kiến đang xử lý</div>
              <div className="mt-0.5 text-lg font-extrabold">{cases.length}</div>
            </div>
            <div
              onClick={() => setActiveTab('SURVEYS')}
              className="cursor-pointer rounded-xl bg-white/10 p-2.5 backdrop-blur-xs"
            >
              <div className="text-[11px] text-teal-100">Khảo sát cần làm</div>
              <div className="mt-0.5 text-lg font-extrabold">{pendingSurveysCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="mx-auto max-w-4xl px-4 pt-4 space-y-4">
        {selectedStudentId && (
          <ParentGvbmAdvisorySection
            studentId={selectedStudentId}
            studentName={activeChild?.fullName || 'con'}
          />
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            onClick={() => setActiveTab('OVERVIEW_CONTACTS')}
            className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
              activeTab === 'OVERVIEW_CONTACTS'
                ? 'bg-[#6E3D89] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            1. Danh bạ Giáo viên
          </button>
          <button
            onClick={() => setActiveTab('SEND_MESSAGE')}
            className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
              activeTab === 'SEND_MESSAGE'
                ? 'bg-[#6E3D89] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            2. Gửi trao đổi
          </button>
          <button
            onClick={() => setActiveTab('THREADS_CASES')}
            className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
              activeTab === 'THREADS_CASES'
                ? 'bg-[#6E3D89] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            3. Theo dõi ({threads.length})
          </button>
          <button
            onClick={() => setActiveTab('SURVEYS')}
            className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
              activeTab === 'SURVEYS'
                ? 'bg-[#6E3D89] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            4. Khảo sát ({pendingSurveysCount})
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* TAB C1 & C2: TỔNG QUAN & LIÊN HỆ GIÁO VIÊN HỢP LỆ */}
        {activeTab === 'OVERVIEW_CONTACTS' && (
          <div className="mt-4 space-y-4">
            {!activeChild ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                Hiện chưa có hồ sơ học sinh liên kết với tài khoản Phụ huynh.
              </div>
            ) : (
              <>
                {/* Group 1: Giáo viên Chủ nhiệm */}
                <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6E3D89]">
                    <UserCheck className="h-4 w-4" />
                    <span>Giáo viên Chủ nhiệm hợp lệ (Lớp {activeChild.className})</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {(activeChild.gvcnContacts || []).length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Chưa cập nhật phân công GVCN cho lớp này.
                      </p>
                    ) : (
                      activeChild.gvcnContacts.map((gvcn: any) => (
                        <div
                          key={gvcn.teacherId}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50/40 p-3.5"
                        >
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {gvcn.teacherName}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-600">
                              Chủ nhiệm lớp {gvcn.className} • Năm học {activeChild.academicYearName}
                            </div>
                            {gvcn.latestThreadStatus && (
                              <div className="mt-1 text-[11px] font-medium text-[#6E3D89]">
                                Hội thoại gần nhất:{' '}
                                {THREAD_STATUS_LABELS[gvcn.latestThreadStatus]?.label ||
                                  gvcn.latestThreadStatus}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleStartContact(gvcn)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E3D89] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#5B3172]"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Nhắn trao đổi
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Group 2: Giáo viên Bộ môn theo phân công */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00736E]">
                      <BookOpen className="h-4 w-4" />
                      <span>
                        Giáo viên Bộ môn theo Phân công ({activeChild.gvbmContacts?.length || 0})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Tự động đồng bộ từ thời khóa biểu lớp {activeChild.className}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {(activeChild.gvbmContacts || []).length === 0 ? (
                      <p className="col-span-2 text-xs text-slate-400">
                        Chưa có dữ liệu phân công giáo viên bộ môn cho lớp.
                      </p>
                    ) : (
                      activeChild.gvbmContacts.map((gvbm: any, idx: number) => (
                        <div
                          key={`${gvbm.teacherId}_${gvbm.subjectId}_${idx}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 hover:border-purple-200"
                        >
                          <div>
                            <span className="inline-block rounded bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-[#00736E]">
                              Môn: {gvbm.subjectName}
                            </span>
                            <div className="mt-1 text-xs font-bold text-slate-900">
                              {gvbm.teacherName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Lớp {gvbm.className}
                              {gvbm.latestThreadStatus
                                ? ` • ${
                                    THREAD_STATUS_LABELS[gvbm.latestThreadStatus]?.label ||
                                    gvbm.latestThreadStatus
                                  }`
                                : ' • Chưa có trao đổi'}
                            </div>
                          </div>
                          <button
                            onClick={() => handleStartContact(gvbm)}
                            className="shrink-0 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-[#6E3D89] hover:bg-[#6E3D89] hover:text-white"
                          >
                            Trao đổi
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB C3: GỬI TRAO ĐỔI (QUY TRÌNH HƯỚNG DẪN TỰ ĐỘNG ĐIỀN) */}
        {activeTab === 'SEND_MESSAGE' && activeChild && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">
              Gửi Trao đổi tới Giáo viên
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Thông tin Học sinh: <strong>{activeChild.fullName}</strong> ({activeChild.studentCode}) • Lớp{' '}
              <strong>{activeChild.className}</strong> • Năm học {activeChild.academicYearName} (Tự động điền)
            </p>

            <form onSubmit={handleSendComposer} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const firstGvcn = activeChild.gvcnContacts?.[0];
                    setComposer({
                      ...composer,
                      roleType: 'GVCN',
                      teacherId: firstGvcn?.teacherId || '',
                      subjectId: '',
                    });
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    composer.roleType === 'GVCN'
                      ? 'border-[#6E3D89] bg-purple-50/60 text-[#6E3D89]'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold">1A. Giáo viên Chủ nhiệm</div>
                  <div className="mt-0.5 text-[11px] opacity-80">
                    Trao đổi chung về nền nếp, rèn luyện và học tập
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const firstGvbm = activeChild.gvbmContacts?.[0];
                    setComposer({
                      ...composer,
                      roleType: 'GVBM',
                      teacherId: firstGvbm?.teacherId || '',
                      subjectId: firstGvbm?.subjectId || '',
                    });
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    composer.roleType === 'GVBM'
                      ? 'border-[#6E3D89] bg-purple-50/60 text-[#6E3D89]'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold">1B. Giáo viên Bộ môn</div>
                  <div className="mt-0.5 text-[11px] opacity-80">
                    Trao đổi sâu theo từng môn học được phân công
                  </div>
                </button>
              </div>

              <div>
                <label className="font-semibold text-slate-700">
                  2. Giáo viên phụ trách hợp lệ *
                </label>
                {composer.roleType === 'GVCN' ? (
                  <select
                    required
                    value={composer.teacherId}
                    onChange={(e) => setComposer({ ...composer, teacherId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    <option value="">-- Chọn GVCN lớp {activeChild.className} --</option>
                    {(activeChild.gvcnContacts || []).map((c: any) => (
                      <option key={c.teacherId} value={c.teacherId}>
                        {c.teacherName} (GVCN Lớp {c.className})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={`${composer.teacherId}__${composer.subjectId}`}
                    onChange={(e) => {
                      const [tId, sId] = e.target.value.split('__');
                      setComposer({ ...composer, teacherId: tId || '', subjectId: sId || '' });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    <option value="__">-- Chọn Môn học & Giáo viên bộ môn --</option>
                    {(activeChild.gvbmContacts || []).map((c: any, idx: number) => (
                      <option key={idx} value={`${c.teacherId}__${c.subjectId || ''}`}>
                        Môn {c.subjectName} - {c.teacherName} (Lớp {c.className})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700">3. Chủ đề trao đổi *</label>
                <select
                  value={composer.topic}
                  onChange={(e) => setComposer({ ...composer, topic: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
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
                  rows={4}
                  required
                  value={composer.content}
                  onChange={(e) => setComposer({ ...composer, content: e.target.value })}
                  placeholder="Nhập nội dung Quý Phụ huynh muốn trao đổi cùng Giáo viên..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 focus:border-[#6E3D89] focus:outline-none"
                />
              </div>

              {/* Attachment & Case option */}
              {attachmentError && (
                <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-600">
                  {attachmentError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
                  <Paperclip className="h-4 w-4 text-[#6E3D89]" />
                  <span>5. Đính kèm tệp (&le;5MB)</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={composer.needFormalCase}
                    onChange={(e) =>
                      setComposer({ ...composer, needFormalCase: e.target.checked })
                    }
                    className="rounded border-slate-300 text-[#6E3D89]"
                  />
                  <span>Đây là đề nghị hỗ trợ / phản ánh cần lập hồ sơ theo dõi kết quả</span>
                </label>
              </div>

              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pendingAttachments.map((att, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-[#6E3D89]"
                    >
                      {att.fileName}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingMessage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6E3D89] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#5B3172] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submittingMessage ? 'Đang gửi...' : '6. Gửi trao đổi tới Giáo viên'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB C4: THEO DÕI HỘI THOẠI & Ý KIẾN ĐÃ GỬI */}
        {activeTab === 'THREADS_CASES' && (
          <div className="mt-4 space-y-5">
            {/* Formal Cases Tracker (C4) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">
                Theo dõi Yêu cầu Cần Xử lý ({cases.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Quý Phụ huynh có thể xem tiến độ, xác nhận khi đã giải quyết thỏa đáng, yêu cầu xem xét lại hoặc đánh giá mức độ hài lòng (CSAT).
              </p>

              <div className="mt-3 space-y-3">
                {cases.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                    Chưa có hồ sơ yêu cầu xử lý nào. (Tin nhắn thông thường được hiển thị ở danh sách hội thoại bên dưới).
                  </div>
                ) : (
                  cases.map((c) => {
                    const stBadge = CASE_STATUS_LABELS[c.status] || CASE_STATUS_LABELS.NEW;
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-slate-200 p-3.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-bold text-slate-900">
                            <span className="font-mono text-[#6E3D89]">{c.caseCode}</span> •{' '}
                            {c.title}
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${stBadge.badgeClass}`}
                          >
                            {stBadge.label}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600">{c.description}</p>
                        <div className="mt-1.5 text-[11px] text-slate-500">
                          Phụ trách xử lý: <strong>{c.assignedToName || c.teacherName}</strong> ({c.assignedRole})
                        </div>

                        {c.resolutionSummary && (
                          <div className="mt-2 rounded-lg bg-teal-50 p-2.5 text-teal-950">
                            <strong>Kết quả xử lý từ Nhà trường:</strong> {c.resolutionSummary}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                          {(c.status === 'RESOLVED' || c.status === 'COMPLETED') &&
                            !c.satisfaction && (
                              <button
                                onClick={() => setRatingCase(c)}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#6E3D89] px-3 py-1.5 font-bold text-white"
                              >
                                <Star className="h-3.5 w-3.5" />
                                Xác nhận đã giải quyết & Đánh giá CSAT
                              </button>
                            )}
                          {c.satisfaction && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Đã đánh giá CSAT: {c.satisfaction.csatScore}/5 sao
                            </span>
                          )}
                          {(c.status === 'RESOLVED' || c.status === 'COMPLETED') && (
                            <button
                              onClick={() => setReopeningCase(c)}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Yêu cầu xem xét lại
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2-Way Threads List & Conversation */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs md:col-span-5">
                <h3 className="px-2 py-1.5 text-xs font-bold uppercase text-slate-500">
                  Lịch sử Hội thoại ({threads.length})
                </h3>
                <div className="mt-1 max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                  {threads.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Chưa có cuộc trao đổi nào.
                    </div>
                  ) : (
                    threads.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedThreadId(t.id)}
                        className={`cursor-pointer p-3 transition ${
                          selectedThreadId === t.id
                            ? 'rounded-xl bg-purple-50 font-medium'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>{t.teacherName}</span>
                          <span className="text-[10px] font-semibold text-[#6E3D89]">
                            {t.subjectName}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                          {t.lastMessagePreview}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs md:col-span-7">
                {!threadDetail ? (
                  <div className="flex h-72 items-center justify-center p-6 text-xs text-slate-400">
                    Chọn một cuộc trao đổi để xem chi tiết phản hồi từ Giáo viên
                  </div>
                ) : (
                  <>
                    <div className="border-b border-slate-100 p-3.5">
                      <div className="text-xs font-bold text-slate-900">
                        {threadDetail.subjectTitle}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Giáo viên: {threadDetail.teacherInfo?.teacherName} •{' '}
                        {threadDetail.topicLabel}
                      </div>
                    </div>
                    <div className="max-h-72 flex-1 space-y-2.5 overflow-y-auto bg-slate-50/50 p-3.5">
                      {(threadDetail.messages || []).map((m: any) => {
                        const isMine = m.senderUserId === user.id;
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs ${
                                isMine
                                  ? 'bg-[#6E3D89] text-white'
                                  : 'border border-slate-200 bg-white text-slate-800'
                              }`}
                            >
                              <div className="mb-0.5 text-[10px] font-bold opacity-75">
                                {m.senderName}
                              </div>
                              <p className="whitespace-pre-wrap">{m.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <form onSubmit={handleSendReply} className="flex gap-2 border-t border-slate-100 p-3">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Nhập tin nhắn phản hồi hoặc bổ sung thông tin..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#6E3D89] focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-[#6E3D89] px-4 py-2 text-xs font-bold text-white"
                      >
                        Gửi
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB C5: KHẢO SÁT CHẤT LƯỢNG ĐỊNH KỲ (NPS 0-10 & 5 TIÊU CHÍ 1-5) */}
        {activeTab === 'SURVEYS' && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Award className="h-5 w-5 text-[#6E3D89]" />
              <span>Khảo sát Chất lượng Phối hợp Giáo dục Định kỳ</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Đánh giá ẩn danh dành cho GVCN và GVBM giảng dạy lớp của con. Câu hỏi NPS chính (thang 0–10) và 5 tiêu chí chất lượng phối hợp (thang 1–5) được phân tách rõ ràng.
            </p>

            <div className="mt-4 space-y-2.5">
              {npsEvaluations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                  Hiện chưa có đợt khảo sát định kỳ nào đang mở cho lớp của con.
                </div>
              ) : (
                npsEvaluations.map((ev) => (
                  <div
                    key={ev.assignmentId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5"
                  >
                    <div>
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-[#6E3D89]">
                        {ev.periodTitle} ({ev.semester})
                      </span>
                      <div className="mt-1 text-xs font-bold text-slate-900">
                        {ev.roleType === 'GVCN' ? 'Giáo viên Chủ nhiệm' : `GVBM ${ev.subjectName}`}:{' '}
                        {ev.teacherName}
                      </div>
                    </div>

                    {ev.isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Đã hoàn thành (NPS: {ev.submittedScore}/10 • TB Tiêu chí:{' '}
                        {ev.submittedCriteriaAverage}/5)
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveSurveyItem(ev)}
                        className="rounded-xl bg-[#6E3D89] px-4 py-2 text-xs font-bold text-white hover:bg-[#5B3172]"
                      >
                        Thực hiện đánh giá
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal C4: Đánh giá CSAT sau xử lý */}
      {ratingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Xác nhận Giải quyết & Đánh giá Mức độ Hài lòng (CSAT)
            </h3>
            <p className="mt-1 text-xs text-slate-500">Yêu cầu: {ratingCase.title}</p>
            <form onSubmit={handleSubmitCsat} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">
                  Mức độ hài lòng chung sau xử lý (1 đến 5 sao) *
                </label>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setCsatForm({ ...csatForm, csatScore: star })}
                      className={`flex-1 rounded-xl border py-2 font-bold ${
                        csatForm.csatScore >= star
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Nhận xét bổ sung (Tùy chọn)</label>
                <textarea
                  rows={2}
                  value={csatForm.comment}
                  onChange={(e) => setCsatForm({ ...csatForm, comment: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5"
                  placeholder="Ý kiến ghi nhận hoặc góp ý thêm..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRatingCase(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6E3D89] px-4 py-2 font-bold text-white"
                >
                  Xác nhận & Gửi CSAT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal C4: Yêu cầu xem xét lại (Reopen) */}
      {reopeningCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Yêu cầu Xem xét lại Hồ sơ ({reopeningCase.caseCode})
            </h3>
            <form onSubmit={handleReopenCase} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">
                  Lý do cần xem xét lại / Nội dung chưa được giải quyết *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5"
                  placeholder="Vui lòng nêu rõ điểm chưa được giải quyết thỏa đáng..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReopeningCase(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white"
                >
                  Gửi yêu cầu mở lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal C5: Khảo sát NPS (0-10) & 5 tiêu chí (1-5) */}
      {activeSurveyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Khảo sát Chất lượng Phối hợp Giáo dục (Ẩn danh)
            </h3>
            <p className="mt-0.5 text-xs text-[#6E3D89] font-semibold">
              Đánh giá: {activeSurveyItem.teacherName} ({activeSurveyItem.subjectName})
            </p>

            <form onSubmit={handleSubmitNpsSurvey} className="mt-4 space-y-4 text-xs">
              {/* Câu hỏi NPS chính thang 0-10 */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5">
                <label className="font-bold text-slate-900">
                  Phần 1 (Chỉ số NPS - Thang 0 đến 10): Mức độ Quý Phụ huynh sẵn sàng giới thiệu / tin tưởng vào sự đồng hành giáo dục của Giáo viên? *
                </label>
                <div className="mt-2.5 grid grid-cols-11 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setSurveyForm({ ...surveyForm, npsScore: val })}
                      className={`rounded-lg py-2 font-mono font-bold transition ${
                        surveyForm.npsScore === val
                          ? 'bg-[#6E3D89] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-purple-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                  <span>0–6: Chưa hài lòng</span>
                  <span>7–8: Trung lập</span>
                  <span>9–10: Rất tin tưởng</span>
                </div>
              </div>

              {/* 5 Tiêu chí bổ sung thang 1-5 (tách biệt với NPS) */}
              <div className="space-y-2.5">
                <div className="font-bold text-slate-900">
                  Phần 2 (5 Tiêu chí Chất lượng Phối hợp - Thang 1 đến 5):
                </div>
                {NPS_SUPPLEMENTARY_CRITERIA.map((crit) => (
                  <div
                    key={crit.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <span className="font-medium text-slate-700">{crit.label}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          type="button"
                          key={score}
                          onClick={() =>
                            setSurveyForm({ ...surveyForm, [crit.key]: score })
                          }
                          className={`h-7 w-7 rounded-lg font-bold ${
                            (surveyForm as any)[crit.key] === score
                              ? 'bg-[#00A19A] text-white'
                              : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="font-semibold text-slate-700">
                  Ý kiến đóng góp thêm (Hoàn toàn ẩn danh với Giáo viên)
                </label>
                <textarea
                  rows={2}
                  value={surveyForm.comment}
                  onChange={(e) => setSurveyForm({ ...surveyForm, comment: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5"
                  placeholder="Chia sẻ điều Phụ huynh hài lòng hoặc mong muốn cải thiện..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSurveyItem(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingSurvey}
                  className="rounded-xl bg-[#6E3D89] px-5 py-2 font-bold text-white"
                >
                  {submittingSurvey ? 'Đang gửi...' : 'Gửi phiếu khảo sát'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
