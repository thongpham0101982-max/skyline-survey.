'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Target, Calendar, MessageSquare, Users, CheckCircle2, AlertTriangle,
  ArrowRight, Clock, Plus, RefreshCw, Compass, BookOpen, Shield,
  Send, Edit3, Eye, Sparkles, ChevronDown, ChevronUp, X, FileText,
  UserCheck, Check, AlertCircle, History, ExternalLink, Bell
} from 'lucide-react';
import { normalizeGoalCategory, getStandardCategoryMeta } from '@/lib/advisory/advisoryWeights';

// ============================================================================
// 1. TEACHER OVERVIEW SUMMARY CARDS (Mục II - Tổng quan)
// ============================================================================
export function TeacherOverviewSummaryCards({
  classId,
  schoolYear,
  semester,
  selectedStudentId,
  selectedStudentName,
  nextBestAction,
  onNavigateTab,
}: {
  classId: string;
  schoolYear: string;
  semester: string;
  selectedStudentId?: string;
  selectedStudentName?: string;
  nextBestAction?: {
    stepCode?: string;
    stepTitle?: string;
    taskTitle: string;
    reason?: string;
    assigneeName?: string;
    dueDateLabel?: string;
    priority?: string;
    studentName?: string;
    studentCode?: string;
    targetTab?: string;
    onExecute?: () => void;
  } | null;
  onNavigateTab: (tab: string, subView?: string) => void;
}) {
  const [counts, setCounts] = useState({
    goalsDueOrAttention: 0,
    upcomingConsultations: 0,
    unprocessedFeedback: 0,
    pendingCompanionAccept: 0,
    pendingSupportConfirm: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadCounts = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        classId,
        schoolYear: schoolYear || '2025-2026',
        semester: semester || 'HK1',
      });
      const [matrixRes, fbRes, taskRes, consultRes] = await Promise.all([
        fetch(`/api/advisory/progress-matrix?${qs.toString()}`).then(r => r.json()).catch(() => null),
        fetch(`/api/advisory/student-feedback?classId=${encodeURIComponent(classId)}&schoolYear=${encodeURIComponent(schoolYear || '2025-2026')}`).then(r => r.json()).catch(() => null),
        fetch(`/api/advisory/gvbm-tasks?classId=${encodeURIComponent(classId)}&schoolYear=${encodeURIComponent(schoolYear || '2025-2026')}`).then(r => r.json()).catch(() => null),
        fetch(`/api/advisory/consultations?classId=${encodeURIComponent(classId)}&schoolYear=${encodeURIComponent(schoolYear || '2025-2026')}`).then(r => r.json()).catch(() => null),
      ]);

      const rows = matrixRes?.rows || [];
      const goalsAttention = rows.reduce((acc: number, r: any) => acc + (r.goals?.overdueOrAttentionCount || 0), 0);

      const fbSummary = fbRes?.summary || {};
      const unprocessedFb = Number(fbSummary.unprocessed || 0) + Number(fbSummary.needsAttention || 0);

      const tasks = Array.isArray(taskRes?.tasks) ? taskRes.tasks : [];
      const pendingAccept = tasks.filter((t: any) => t.status === 'ASSIGNED').length;
      const pendingConfirm = tasks.filter((t: any) => t.status === 'RESPONDED' || t.status === 'SUPPLEMENT_REQUESTED').length;
      const overdueT = tasks.filter((t: any) => t.isOverdue).length;

      const logs = Array.isArray(consultRes?.logs) ? consultRes.logs : [];
      const todayStr = new Date().toISOString().slice(0, 10);
      const upcomingC = logs.filter((l: any) => {
        const d = (l.sessionDate || '').slice(0, 10);
        const f = (l.nextFollowUpDate || '').slice(0, 10);
        return (d >= todayStr) || (f && f >= todayStr);
      }).length;

      setCounts({
        goalsDueOrAttention: goalsAttention,
        upcomingConsultations: upcomingC,
        unprocessedFeedback: unprocessedFb,
        pendingCompanionAccept: pendingAccept,
        pendingSupportConfirm: pendingConfirm,
        overdueTasks: overdueT + goalsAttention,
      });
    } finally {
      setLoading(false);
    }
  }, [classId, schoolYear, semester]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const cards = [
    {
      key: 'goals',
      label: 'Mục tiêu đến hạn / cần quan tâm',
      value: counts.goalsDueOrAttention,
      sub: 'Mục tiêu sắp tới hạn hoặc chưa ghi nhận tiến bộ',
      tone: counts.goalsDueOrAttention > 0 ? 'border-amber-200 bg-amber-50/40 text-amber-800' : 'border-slate-200 bg-white text-slate-800',
      badgeTone: counts.goalsDueOrAttention > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
      icon: Target,
      onClick: () => onNavigateTab('student_goals'),
    },
    {
      key: 'consultations',
      label: 'Lịch tư vấn sắp tới',
      value: counts.upcomingConsultations,
      sub: 'Buổi tư vấn 1:1 hoặc lịch hẹn theo dõi tiếp theo',
      tone: 'border-slate-200 bg-white text-slate-800',
      badgeTone: 'bg-teal-50 text-[#008B85]',
      icon: Calendar,
      onClick: () => onNavigateTab('consultation_logs'),
    },
    {
      key: 'feedback',
      label: 'Phản hồi học sinh chưa xử lý',
      value: counts.unprocessedFeedback,
      sub: 'Phản hồi sau tư vấn & tự đánh giá mục tiêu',
      tone: counts.unprocessedFeedback > 0 ? 'border-amber-200 bg-amber-50/40 text-amber-800' : 'border-slate-200 bg-white text-slate-800',
      badgeTone: counts.unprocessedFeedback > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
      icon: MessageSquare,
      onClick: () => onNavigateTab('student_feedback'),
    },
    {
      key: 'companion_accept',
      label: 'Nhiệm vụ GVBM/TLHN chờ tiếp nhận',
      value: counts.pendingCompanionAccept,
      sub: 'Phân công đồng hành đang chờ giáo viên xác nhận',
      tone: 'border-slate-200 bg-white text-slate-800',
      badgeTone: 'bg-teal-50 text-[#008B85]',
      icon: Users,
      onClick: () => onNavigateTab('companion_support'),
    },
    {
      key: 'support_confirm',
      label: 'Kết quả hỗ trợ chờ xác nhận',
      value: counts.pendingSupportConfirm,
      sub: 'GVBM/TLHN đã gửi báo cáo, chờ GVCN xác nhận',
      tone: counts.pendingSupportConfirm > 0 ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800' : 'border-slate-200 bg-white text-slate-800',
      badgeTone: counts.pendingSupportConfirm > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600',
      icon: CheckCircle2,
      onClick: () => onNavigateTab('companion_support'),
    },
    {
      key: 'overdue',
      label: 'Nhiệm vụ quá hạn',
      value: counts.overdueTasks,
      sub: 'Công việc cố vấn hoặc nhiệm vụ hỗ trợ trễ hạn',
      tone: counts.overdueTasks > 0 ? 'border-rose-200 bg-rose-50/40 text-rose-800' : 'border-slate-200 bg-white text-slate-800',
      badgeTone: counts.overdueTasks > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600',
      icon: AlertTriangle,
      onClick: () => onNavigateTab('companion_support'),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Khối Bước tiếp theo (Mục II) */}
      {nextBestAction && (
        <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-[#003B3A] p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#003B3A] text-white">
                Bước tiếp theo
              </span>
              {nextBestAction.stepTitle && (
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-teal-50 text-[#008B85] border border-teal-200">
                  {nextBestAction.stepTitle}
                </span>
              )}
              {nextBestAction.priority && (
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  nextBestAction.priority === 'HIGH' || nextBestAction.priority === 'URGENT'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  Mức ưu tiên: {nextBestAction.priority === 'URGENT' ? 'Khẩn cấp' : nextBestAction.priority === 'HIGH' ? 'Cao' : 'Trung bình'}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-[#003B3A]">
              Việc cần làm: {nextBestAction.taskTitle}
            </h3>
            {nextBestAction.reason && (
              <p className="text-xs text-slate-600">{nextBestAction.reason}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span>
                Học sinh: <strong className="text-slate-800">{nextBestAction.studentName || selectedStudentName || 'Lớp chủ nhiệm'}</strong>
              </span>
              <span>
                Người phụ trách: <strong className="text-slate-800">{nextBestAction.assigneeName || 'GVCN / CVHT'}</strong>
              </span>
              <span>
                Thời hạn: <strong className="text-[#008B85] tabular-nums">{nextBestAction.dueDateLabel || 'Trong tuần này'}</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (nextBestAction.onExecute) nextBestAction.onExecute();
                else if (nextBestAction.targetTab) onNavigateTab(nextBestAction.targetTab);
              }}
              className="px-4 py-2.5 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
            >
              Tiếp tục thực hiện <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6 thẻ chỉ số cốt lõi Mục II */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className={`text-left p-3.5 rounded-xl border transition-all hover:shadow-md flex flex-col justify-between ${c.tone}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold leading-snug">{c.label}</span>
                <span className={`p-1.5 rounded-lg shrink-0 ${c.badgeTone}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black tabular-nums">
                  {loading ? '…' : c.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {c.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 2. GOAL & PLAN EXTENDED PANEL (Mục III & IX - Mục tiêu & Kế hoạch)
// ============================================================================
export function GoalPlanExtendedPanel({
  studentId,
  studentCode,
  studentName,
  classId,
  className,
  schoolYear,
  semester,
  goals,
  onOpenCreateConsultation,
  onOpenAssignCompanion,
  onOpenTrackCoordination,
  onRefresh,
}: {
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className?: string;
  schoolYear: string;
  semester: string;
  goals: Array<{
    goalId: string;
    category: string;
    title: string;
    actionPlan?: string;
    checkpoint?: string;
    targetExpectation?: string;
    deadline?: string;
  }>;
  onOpenCreateConsultation: (goal: { goalId: string; title: string; category: string }) => void;
  onOpenAssignCompanion: (goal: { goalId: string; title: string; category: string }) => void;
  onOpenTrackCoordination: (goal: { goalId: string; title: string; category: string }) => void;
  onRefresh?: () => void;
}) {
  const [metaMap, setMetaMap] = useState<Record<string, any>>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [historyGoal, setHistoryGoal] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [formState, setFormState] = useState({
    goalKey: '',
    goalCategory: 'HOC_TAP',
    goalTitle: '',
    basisText: '',
    baselineValue: '',
    targetValue: '',
    deadlineDate: '',
    actionPlanText: '',
    assigneeName: 'Học sinh & GVCN',
    updateMilestone: 'Giữa kỳ / Cuối kỳ',
    currentResultText: '',
    evidenceText: '',
    companionTeacherName: '',
    advisorComment: '',
    nextStepNote: '',
    progressOutcome: 'CHUA_DU_DU_LIEU',
    changeReason: '',
  });

  const loadGoalData = useCallback(async () => {
    if (!studentId && !studentCode) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        studentId: studentId || studentCode,
        schoolYear: schoolYear || '2025-2026',
      });
      const [metaRes, taskRes, consultRes] = await Promise.all([
        fetch(`/api/advisory/goal-meta?${qs.toString()}`).then(r => r.json()).catch(() => null),
        fetch(`/api/advisory/gvbm-tasks?studentId=${encodeURIComponent(studentCode || studentId)}&schoolYear=${encodeURIComponent(schoolYear || '2025-2026')}`).then(r => r.json()).catch(() => null),
        fetch(`/api/advisory/consultations?studentId=${encodeURIComponent(studentId)}&schoolYear=${encodeURIComponent(schoolYear || '2025-2026')}`).then(r => r.json()).catch(() => null),
      ]);
      if (metaRes?.metaMap) setMetaMap(metaRes.metaMap);
      if (Array.isArray(taskRes?.tasks)) setTasks(taskRes.tasks);
      if (Array.isArray(consultRes?.logs)) setConsultations(consultRes.logs);
    } finally {
      setLoading(false);
    }
  }, [studentId, studentCode, schoolYear]);

  useEffect(() => {
    loadGoalData();
  }, [loadGoalData]);

  const mergedGoals = useMemo(() => {
    const baseList = goals.map(g => {
      const m = metaMap[g.goalId] || {};
      const normCat = normalizeGoalCategory(g.category || m.goalCategory || 'HOC_TAP');
      const catMeta = getStandardCategoryMeta(normCat);
      const linkedTasks = tasks.filter(t => t.goalId === g.goalId || (!t.goalId && normalizeGoalCategory(t.goalCategory || '') === normCat));
      const linkedConsults = consultations.filter(c => {
        const ids = Array.isArray(c.linkedGoalIds) ? c.linkedGoalIds : [];
        return ids.includes(g.goalId);
      });
      return {
        goalKey: g.goalId,
        goalCategory: normCat,
        categoryLabel: catMeta.shortLabel,
        goalTitle: m.goalTitle || g.title,
        basisText: m.basisText || 'Kết quả học tập, khảo sát đầu kỳ và trao đổi 1:1',
        baselineValue: m.baselineValue || 'Mức xuất phát đầu kỳ',
        targetValue: m.targetValue || g.targetExpectation || 'Hoàn thành mục tiêu đề ra',
        deadlineDate: m.deadlineDate || g.deadline || g.checkpoint || semester,
        actionPlanText: m.actionPlanText || g.actionPlan || '',
        assigneeName: m.assigneeName || 'Học sinh & GVCN',
        updateMilestone: m.updateMilestone || g.checkpoint || 'Định kỳ hàng tháng',
        currentResultText: m.currentResultText || 'Đang theo dõi thực hiện',
        evidenceText: m.evidenceText || '',
        progressUpdatedAt: m.progressUpdatedAt || m.updatedAt || null,
        companionTeacherName: m.companionTeacherName || (linkedTasks[0]?.assignedToName || ''),
        advisorComment: m.advisorComment || '',
        nextStepNote: m.nextStepNote || 'Tiếp tục theo dõi và cập nhật minh chứng',
        progressOutcome: m.progressOutcome || 'CHUA_DU_DU_LIEU',
        history: Array.isArray(m.history) ? m.history : [],
        linkedTasks,
        linkedConsults,
      };
    });

    // Also include standalone goals created directly in StudentGoalMeta
    Object.values(metaMap).forEach((m: any) => {
      if (!baseList.some(b => b.goalKey === m.goalKey)) {
        const normCat = normalizeGoalCategory(m.goalCategory || 'HOC_TAP');
        const catMeta = getStandardCategoryMeta(normCat);
        const linkedTasks = tasks.filter(t => t.goalId === m.goalKey);
        const linkedConsults = consultations.filter(c => Array.isArray(c.linkedGoalIds) && c.linkedGoalIds.includes(m.goalKey));
        baseList.push({
          goalKey: m.goalKey,
          goalCategory: normCat,
          categoryLabel: catMeta.shortLabel,
          goalTitle: m.goalTitle || 'Mục tiêu phát triển cá nhân',
          basisText: m.basisText || 'Cơ sở đánh giá cá nhân',
          baselineValue: m.baselineValue || 'Mức ban đầu',
          targetValue: m.targetValue || 'Mức cần đạt',
          deadlineDate: m.deadlineDate || semester,
          actionPlanText: m.actionPlanText || '',
          assigneeName: m.assigneeName || 'Học sinh & GVCN',
          updateMilestone: m.updateMilestone || 'Định kỳ',
          currentResultText: m.currentResultText || 'Đang thực hiện',
          evidenceText: m.evidenceText || '',
          progressUpdatedAt: m.progressUpdatedAt || m.updatedAt || null,
          companionTeacherName: m.companionTeacherName || (linkedTasks[0]?.assignedToName || ''),
          advisorComment: m.advisorComment || '',
          nextStepNote: m.nextStepNote || '',
          progressOutcome: m.progressOutcome || 'CHUA_DU_DU_LIEU',
          history: Array.isArray(m.history) ? m.history : [],
          linkedTasks,
          linkedConsults,
        });
      }
    });

    return baseList;
  }, [goals, metaMap, tasks, consultations, semester]);

  const openEditModal = (g: any) => {
    setFormState({
      goalKey: g.goalKey,
      goalCategory: g.goalCategory,
      goalTitle: g.goalTitle,
      basisText: g.basisText,
      baselineValue: g.baselineValue,
      targetValue: g.targetValue,
      deadlineDate: g.deadlineDate,
      actionPlanText: g.actionPlanText,
      assigneeName: g.assigneeName,
      updateMilestone: g.updateMilestone,
      currentResultText: g.currentResultText,
      evidenceText: g.evidenceText,
      companionTeacherName: g.companionTeacherName,
      advisorComment: g.advisorComment,
      nextStepNote: g.nextStepNote,
      progressOutcome: g.progressOutcome,
      changeReason: '',
    });
    setEditingGoal(g);
  };

  const handleSaveGoalMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/advisory/goal-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId || studentCode,
          studentCode,
          classId,
          schoolYear: schoolYear || '2025-2026',
          semester: semester || 'HK1',
          ...formState,
        }),
      });
      if (res.ok) {
        setEditingGoal(null);
        await loadGoalData();
        onRefresh?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const outcomeBadge = (code: string) => {
    switch (code) {
      case 'DAT_MUC_TIEU':
        return { label: 'Đạt mục tiêu', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'CO_TIEN_BO':
        return { label: 'Có tiến bộ', cls: 'bg-teal-50 text-[#008B85] border-teal-200' };
      case 'CHUA_GHI_NHAN_TIEN_BO':
        return { label: 'Chưa ghi nhận tiến bộ', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: 'Chưa đủ dữ liệu đánh giá', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
        <div>
          <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00A19A]" />
            Hồ sơ Mục tiêu, Kế hoạch hành động & Đối chiếu tiến bộ ({mergedGoals.length} mục tiêu)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Học sinh: <strong className="text-slate-700">{studentName} ({studentCode})</strong> • Năm học {schoolYear} ({semester})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const newKey = `GOAL_CUSTOM_${Date.now()}`;
              openEditModal({
                goalKey: newKey,
                goalCategory: 'DINH_HUONG',
                goalTitle: '',
                basisText: 'Kết quả khảo sát Holland & tư vấn 1:1',
                baselineValue: '',
                targetValue: '',
                deadlineDate: '',
                actionPlanText: '',
                assigneeName: studentName,
                updateMilestone: 'Cuối kỳ',
                currentResultText: '',
                evidenceText: '',
                companionTeacherName: '',
                advisorComment: '',
                nextStepNote: '',
                progressOutcome: 'CHUA_DU_DU_LIEU',
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm mục tiêu theo dõi
          </button>
          <button
            type="button"
            onClick={loadGoalData}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {mergedGoals.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          Chưa có mục tiêu nào được thiết lập cho học sinh này trong kỳ hiện tại.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {mergedGoals.map((g, idx) => {
            const ob = outcomeBadge(g.progressOutcome);
            return (
              <div key={g.goalKey} className="p-4 sm:p-5 hover:bg-slate-50/40 transition-colors space-y-3">
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#003B3A] text-white tabular-nums">
                        #{idx + 1}
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-teal-50 text-[#008B85] border border-teal-200">
                        {g.categoryLabel}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${ob.cls}`}>
                        {ob.label}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        Thời hạn: <strong className="text-slate-700">{g.deadlineDate}</strong>
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{g.goalTitle}</h4>
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Cơ sở xác lập:</span> {g.basisText}
                    </p>
                  </div>

                  {/* 4 nút hành động bắt buộc tại mỗi mục tiêu (Mục III) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenCreateConsultation({ goalId: g.goalKey, title: g.goalTitle, category: g.goalCategory })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#008B85]" /> Tạo buổi tư vấn
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAssignCompanion({ goalId: g.goalKey, title: g.goalTitle, category: g.goalCategory })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-[#008B85]" /> Phân công đồng hành
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTrackCoordination({ goalId: g.goalKey, title: g.goalTitle, category: g.goalCategory })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#008B85]" /> Theo dõi phối hợp ({g.linkedTasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(g)}
                      className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Cập nhật tiến bộ
                    </button>
                    {g.history.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHistoryGoal(g)}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold inline-flex items-center gap-1 tabular-nums"
                        title="Xem lịch sử điều chỉnh mục tiêu"
                      >
                        <History className="w-3.5 h-3.5" /> ({g.history.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Dải đối chiếu Mức ban đầu -> Kết quả hiện tại -> Mức cần đạt (Mục III & IX) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
                  <div className="bg-white p-2.5 rounded border border-slate-200/70">
                    <div className="text-[11px] font-semibold text-slate-500">1. Mức ban đầu</div>
                    <div className="font-bold text-slate-800 mt-0.5">{g.baselineValue}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-teal-200">
                    <div className="text-[11px] font-semibold text-[#008B85] flex items-center justify-between">
                      <span>2. Kết quả hiện tại & Minh chứng</span>
                      {g.progressUpdatedAt && (
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {new Date(g.progressUpdatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 mt-0.5">{g.currentResultText}</div>
                    {g.evidenceText && (
                      <div className="text-[11px] text-slate-600 mt-0.5">Minh chứng: {g.evidenceText}</div>
                    )}
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200/70">
                    <div className="text-[11px] font-semibold text-slate-500">3. Mức cần đạt</div>
                    <div className="font-bold text-[#003B3A] mt-0.5">{g.targetValue}</div>
                  </div>
                </div>

                {/* Chi tiết Kế hoạch hành động, GV đồng hành, Nhận xét & Bước tiếp theo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
                  <div>
                    <span className="font-semibold text-slate-700">Hành động & Người thực hiện:</span>{' '}
                    {g.actionPlanText || 'Theo kế hoạch hành động tuần'} ({g.assigneeName})
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Mốc cập nhật:</span>{' '}
                    <span className="tabular-nums">{g.updateMilestone}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Giáo viên đồng hành:</span>{' '}
                    {g.companionTeacherName || 'GVCN trực tiếp đồng hành'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Nhận xét & Bước tiếp theo:</span>{' '}
                    {g.advisorComment ? `${g.advisorComment} → ` : ''}{g.nextStepNote}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cập nhật tiến bộ & Điều chỉnh mục tiêu */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">Cập nhật Mục tiêu, Kế hoạch & Đánh giá Tiến bộ</h4>
                <p className="text-xs text-teal-100 mt-0.5">
                  Học sinh: {studentName} ({studentCode}) • Lưu vết lịch sử khi điều chỉnh mục tiêu, thời hạn hoặc mức cần đạt
                </p>
              </div>
              <button type="button" onClick={() => setEditingGoal(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGoalMeta} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhóm mục tiêu</label>
                  <select
                    value={formState.goalCategory}
                    onChange={e => setFormState(s => ({ ...s, goalCategory: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="HOC_TAP">1. Học tập</option>
                    <option value="KY_NANG">2. Rèn luyện & Kỹ năng</option>
                    <option value="THE_CHAT">3. Thể chất & Sức khỏe</option>
                    <option value="DINH_HUONG">4. Định hướng phát triển</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời hạn hoàn thành</label>
                  <input
                    type="text"
                    value={formState.deadlineDate}
                    onChange={e => setFormState(s => ({ ...s, deadlineDate: e.target.value }))}
                    placeholder="VD: Cuối HK1 hoặc 15/12/2026"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung mục tiêu cụ thể</label>
                <input
                  type="text"
                  required
                  value={formState.goalTitle}
                  onChange={e => setFormState(s => ({ ...s, goalTitle: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cơ sở xác lập mục tiêu</label>
                <input
                  type="text"
                  value={formState.basisText}
                  onChange={e => setFormState(s => ({ ...s, basisText: e.target.value }))}
                  placeholder="Kết quả học tập đầu kỳ, khảo sát Holland, nguyện vọng học sinh..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức ban đầu</label>
                  <input
                    type="text"
                    value={formState.baselineValue}
                    onChange={e => setFormState(s => ({ ...s, baselineValue: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#008B85] mb-1">Kết quả hiện tại</label>
                  <input
                    type="text"
                    value={formState.currentResultText}
                    onChange={e => setFormState(s => ({ ...s, currentResultText: e.target.value }))}
                    className="w-full rounded-lg border border-teal-300 px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức cần đạt</label>
                  <input
                    type="text"
                    value={formState.targetValue}
                    onChange={e => setFormState(s => ({ ...s, targetValue: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hành động & Kế hoạch thực hiện</label>
                  <input
                    type="text"
                    value={formState.actionPlanText}
                    onChange={e => setFormState(s => ({ ...s, actionPlanText: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minh chứng ghi nhận</label>
                  <input
                    type="text"
                    value={formState.evidenceText}
                    onChange={e => setFormState(s => ({ ...s, evidenceText: e.target.value }))}
                    placeholder="Điểm kiểm tra, sản phẩm học tập, nhận xét GVBM..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người thực hiện</label>
                  <input
                    type="text"
                    value={formState.assigneeName}
                    onChange={e => setFormState(s => ({ ...s, assigneeName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mốc cập nhật</label>
                  <input
                    type="text"
                    value={formState.updateMilestone}
                    onChange={e => setFormState(s => ({ ...s, updateMilestone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giáo viên đồng hành</label>
                  <input
                    type="text"
                    value={formState.companionTeacherName}
                    onChange={e => setFormState(s => ({ ...s, companionTeacherName: e.target.value }))}
                    placeholder="Tên GVBM / GV TLHN..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kết quả tiến bộ của học sinh (Mục IX)</label>
                  <select
                    value={formState.progressOutcome}
                    onChange={e => setFormState(s => ({ ...s, progressOutcome: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-[#003B3A]"
                  >
                    <option value="CHUA_DU_DU_LIEU">Chưa đủ dữ liệu đánh giá</option>
                    <option value="CHUA_GHI_NHAN_TIEN_BO">Chưa ghi nhận tiến bộ</option>
                    <option value="CO_TIEN_BO">Có tiến bộ</option>
                    <option value="DAT_MUC_TIEU">Đạt mục tiêu</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lý do điều chỉnh (nếu thay đổi mục tiêu/thời hạn)</label>
                  <input
                    type="text"
                    value={formState.changeReason}
                    onChange={e => setFormState(s => ({ ...s, changeReason: e.target.value }))}
                    placeholder="Ghi vào lịch sử điều chỉnh mục tiêu..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhận xét của GVCN/CVHT</label>
                  <textarea
                    rows={2}
                    value={formState.advisorComment}
                    onChange={e => setFormState(s => ({ ...s, advisorComment: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bước tiếp theo</label>
                  <textarea
                    rows={2}
                    value={formState.nextStepNote}
                    onChange={e => setFormState(s => ({ ...s, nextStepNote: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white font-bold"
                >
                  {saving ? 'Đang lưu...' : 'Lưu cập nhật & Ghi lịch sử'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lịch sử điều chỉnh mục tiêu */}
      {historyGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#003B3A] text-white flex items-center justify-between">
              <h4 className="text-sm font-bold">Lịch sử điều chỉnh mục tiêu</h4>
              <button type="button" onClick={() => setHistoryGoal(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-2.5 text-xs">
              {historyGoal.history.map((h: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{h.actorName || 'GVCN/CVHT'}</span>
                    <span className="text-slate-500 tabular-nums">
                      {h.at ? new Date(h.at).toLocaleString('vi-VN') : ''}
                    </span>
                  </div>
                  <div className="text-slate-700">Lý do: {h.reason || 'Cập nhật mục tiêu'}</div>
                  <div className="text-slate-500">
                    Mức cần đạt: <strong>{h.previousTarget || '—'}</strong> → <strong>{h.newTarget || '—'}</strong> • Thời hạn: <strong>{h.previousDeadline || '—'}</strong> → <strong>{h.newDeadline || '—'}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. STUDENT FEEDBACK WORKSPACE (Mục VI - Tab 5: Phản hồi học sinh)
// ============================================================================
export function StudentFeedbackWorkspace({
  classId,
  schoolYear,
  semester,
  selectedStudentId,
  onOpenScheduleConsult,
  onOpenAssignSupport,
}: {
  classId: string;
  schoolYear: string;
  semester: string;
  selectedStudentId?: string;
  onOpenScheduleConsult?: (studentCode: string, studentName: string) => void;
  onOpenAssignSupport?: (studentCode: string, studentName: string, goalId?: string) => void;
}) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'POST_CONSULTATION' | 'GOAL_SELF_ASSESSMENT' | 'NEEDS_ATTENTION' | 'UNPROCESSED'>('ALL');
  const [onlySelectedStudent, setOnlySelectedStudent] = useState(false);
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'REPLY' | 'ADJUST_PLAN' | 'ASSIGN_SUPPORT' | 'SCHEDULE_CONSULT' | 'CONFIRMED'>('CONFIRMED');
  const [replyText, setReplyText] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadFeedbacks = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        classId,
        schoolYear: schoolYear || '2025-2026',
      });
      if (onlySelectedStudent && selectedStudentId) {
        qs.set('studentId', selectedStudentId);
      }
      const res = await fetch(`/api/advisory/student-feedback?${qs.toString()}`);
      const data = await res.json();
      if (Array.isArray(data?.feedbacks)) setFeedbacks(data.feedbacks);
      if (data?.summary) setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  }, [classId, schoolYear, onlySelectedStudent, selectedStudentId]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const filtered = useMemo(() => {
    return feedbacks.filter(item => {
      if (filterMode === 'POST_CONSULTATION') return item.feedbackType === 'POST_CONSULTATION';
      if (filterMode === 'GOAL_SELF_ASSESSMENT') return item.feedbackType === 'GOAL_SELF_ASSESSMENT';
      if (filterMode === 'NEEDS_ATTENTION') return Boolean(item.needsAttention);
      if (filterMode === 'UNPROCESSED') return item.advisorStatus !== 'CONFIRMED';
      return true;
    });
  }, [feedbacks, filterMode]);

  const handleProcessFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/advisory/student-feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeItem.id,
          advisorActionType: actionType,
          advisorReply: replyText,
          advisorActionNote: actionNote,
          advisorStatus: 'CONFIRMED',
        }),
      });
      if (res.ok) {
        const studentCode = activeItem.studentCode || activeItem.studentId;
        const studentName = activeItem.studentName || studentCode;
        const goalId = activeItem.goalId;
        setActiveItem(null);
        await loadFeedbacks();
        if (actionType === 'SCHEDULE_CONSULT' && onOpenScheduleConsult) {
          onOpenScheduleConsult(studentCode, studentName);
        } else if (actionType === 'ASSIGN_SUPPORT' && onOpenAssignSupport) {
          onOpenAssignSupport(studentCode, studentName, goalId);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Summary Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#00A19A]" />
            Học sinh tự đánh giá & Phản hồi sau tư vấn (Mục VI)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tách biệt rõ 3 trạng thái: <strong>Buổi tư vấn</strong> • <strong>Học sinh phản hồi</strong> • <strong>GVCN xử lý phản hồi</strong>. Không trừ điểm rèn luyện khi học sinh chia sẻ khó khăn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedStudentId && (
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={onlySelectedStudent}
                onChange={e => setOnlySelectedStudent(e.target.checked)}
                className="rounded border-slate-300 text-[#003B3A]"
              />
              Chỉ xem học sinh đang chọn
            </label>
          )}
          <button
            type="button"
            onClick={loadFeedbacks}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'ALL', label: `Tất cả (${summary.total || feedbacks.length})` },
          { id: 'POST_CONSULTATION', label: `A. Phản hồi sau tư vấn (${summary.postConsultationCount || 0})` },
          { id: 'GOAL_SELF_ASSESSMENT', label: `B. Tự đánh giá thực hiện mục tiêu (${summary.goalSelfAssessmentCount || 0})` },
          { id: 'NEEDS_ATTENTION', label: `Cần quan tâm (${summary.needsAttention || 0})`, highlight: true },
          { id: 'UNPROCESSED', label: `Chờ GVCN xử lý (${summary.unprocessed || 0})` },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilterMode(t.id as any)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              filterMode === t.id
                ? 'bg-[#003B3A] text-white shadow-sm'
                : t.highlight
                ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table of Feedbacks */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Chưa có phản hồi hoặc phiếu tự đánh giá nào trong danh mục này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">Học sinh</th>
                  <th className="py-3 px-4">Loại phản hồi</th>
                  <th className="py-3 px-4">Nội dung phản hồi / Tự đánh giá</th>
                  <th className="py-3 px-4">3 Trạng thái tách biệt</th>
                  <th className="py-3 px-4">Chia sẻ PHHS</th>
                  <th className="py-3 px-4 text-right">GVCN xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900">{item.studentName || item.studentCode || item.studentId}</div>
                      <div className="text-[11px] text-slate-500">Mã HS: {item.studentCode || item.studentId}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                      </div>
                      {item.needsAttention && (
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Cần quan tâm
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      {item.feedbackType === 'POST_CONSULTATION' ? (
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-teal-50 text-[#008B85] border border-teal-200 inline-block">
                          A. Phản hồi sau tư vấn
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 inline-block">
                          B. Tự đánh giá mục tiêu
                        </span>
                      )}
                      {item.goalTitle && (
                        <div className="text-[11px] text-slate-600 mt-1.5 font-medium">
                          Mục tiêu: {item.goalTitle}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-md space-y-1">
                      {item.feedbackType === 'POST_CONSULTATION' ? (
                        <>
                          <div><span className="font-semibold text-slate-700">Cảm nhận:</span> {item.feelingAfter || '—'}</div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
                            <span>Được lắng nghe: <strong>{item.listenedScore || 5}/5</strong></span>
                            <span>Hiểu việc cần làm: <strong>{item.understoodNextStep || 'Rõ ràng'}</strong></span>
                            <span>Phù hợp: <strong>{item.goalSuitability || 'Phù hợp'}</strong></span>
                          </div>
                          {item.supportRequestText && (
                            <div className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                              <strong>Đề nghị hỗ trợ:</strong> {item.supportRequestText}
                            </div>
                          )}
                          {item.wantsMoreDiscussion && (
                            <div className="text-rose-700 font-semibold">• Mong muốn trao đổi thêm với GVCN/TLHN</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div><span className="font-semibold text-slate-700">Việc đã thực hiện:</span> {item.actionsTaken || '—'}</div>
                          {item.resultsAndEvidence && (
                            <div><span className="font-semibold text-slate-700">Kết quả & Minh chứng:</span> {item.resultsAndEvidence}</div>
                          )}
                          {item.difficultiesText && (
                            <div className="text-amber-800"><span className="font-semibold">Khó khăn:</span> {item.difficultiesText}</div>
                          )}
                          {item.supportNeededText && (
                            <div className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                              <strong>Hỗ trợ cần thêm:</strong> {item.supportNeededText}
                            </div>
                          )}
                          {item.adjustmentProposal && (
                            <div><span className="font-semibold text-slate-700">Đề xuất điều chỉnh:</span> {item.adjustmentProposal}</div>
                          )}
                        </>
                      )}

                      {item.advisorReply && (
                        <div className="mt-2 p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-slate-800">
                          <div className="font-bold text-[#003B3A]">Phản hồi & Xử lý của GVCN ({item.advisorName || 'GVCN'}):</div>
                          <div className="mt-0.5">{item.advisorReply}</div>
                          {item.advisorActionNote && (
                            <div className="text-[11px] text-slate-600 mt-0.5">Cách xử lý: {item.advisorActionNote}</div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 w-24">1. Buổi tư vấn:</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.consultationStatus === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã ghi nhận'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 w-24">2. HS phản hồi:</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-[#008B85] border border-teal-200">
                          Đã gửi phản hồi
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 w-24">3. GVCN xử lý:</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          item.advisorStatus === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {item.advisorStatus === 'CONFIRMED' ? 'Đã xử lý' : 'Chờ xử lý'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      {item.shareWithParent ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-[#008B85] border border-teal-200">
                          Chia sẻ PHHS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Riêng tư (HS & GV)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveItem(item);
                          setActionType((item.advisorActionType as any) || 'CONFIRMED');
                          setReplyText(item.advisorReply || '');
                          setActionNote(item.advisorActionNote || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {item.advisorStatus === 'CONFIRMED' ? 'Cập nhật xử lý' : 'Xử lý phản hồi'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal GVCN xử lý phản hồi (5 hình thức xử lý Mục VI) */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">Xử lý phản hồi của học sinh</h4>
                <p className="text-xs text-teal-100 mt-0.5">
                  Học sinh: {activeItem.studentName || activeItem.studentCode}
                </p>
              </div>
              <button type="button" onClick={() => setActiveItem(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProcessFeedback} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Chọn hình thức xử lý của GVCN (Mục VI)</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'REPLY', label: '1. Trả lời và động viên học sinh' },
                    { id: 'ADJUST_PLAN', label: '2. Giải thích hoặc điều chỉnh kế hoạch & mục tiêu' },
                    { id: 'ASSIGN_SUPPORT', label: '3. Phân công người hỗ trợ (GVBM / Tổ TLHN)' },
                    { id: 'SCHEDULE_CONSULT', label: '4. Đặt lịch tư vấn 1:1 tiếp theo' },
                    { id: 'CONFIRMED', label: '5. Ghi nhận cách xử lý và xác nhận đã xử lý' },
                  ].map(opt => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${
                        actionType === opt.id ? 'border-[#003B3A] bg-teal-50/50 font-bold text-[#003B3A]' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="actionType"
                        checked={actionType === opt.id}
                        onChange={() => setActionType(opt.id as any)}
                        className="text-[#003B3A]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung phản hồi gửi học sinh</label>
                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Nhập lời khuyên, giải thích kế hoạch hoặc hướng dẫn bước tiếp theo cho học sinh..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi nhận cách xử lý vào hồ sơ cố vấn</label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  placeholder="VD: Đã thống nhất điều chỉnh mốc mục tiêu tuần 4..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white font-bold"
                >
                  {saving ? 'Đang lưu...' : 'Xác nhận đã xử lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. COMPANION & HOLLAND SUPPORT WORKSPACE (Mục IV & VII - Tab 6: Đồng hành & Hỗ trợ)
// ============================================================================
export function CompanionSupportWorkspace({
  classId,
  className,
  gradeLevel,
  schoolYear,
  semester,
  selectedStudentId,
  selectedStudentCode,
  selectedStudentName,
  preselectedGoal,
}: {
  classId: string;
  className?: string;
  gradeLevel?: string;
  schoolYear: string;
  semester: string;
  selectedStudentId?: string;
  selectedStudentCode?: string;
  selectedStudentName?: string;
  preselectedGoal?: { goalId: string; title: string; category: string } | null;
}) {
  const [subTab, setSubTab] = useState<'GVBM' | 'TLHN' | 'HOLLAND_PIPELINE' | 'MY_COMPANION_TASKS'>('GVBM');
  const [tasks, setTasks] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [classTeachers, setClassTeachers] = useState<any[]>([]);
  const [tlhnTeachers, setTlhnTeachers] = useState<any[]>([]);
  const [orientationData, setOrientationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Modal tạo phân công đồng hành (GVBM / TLHN)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    companionType: 'GVBM' as 'GVBM' | 'TLHN',
    studentId: selectedStudentCode || selectedStudentId || '',
    studentName: selectedStudentName || '',
    goalId: '',
    goalTitle: '',
    goalCategory: 'HOC_TAP',
    subjectName: '',
    assignedToEmail: '',
    assignedToName: '',
    requestSummary: '',
    expectedOutcome: '',
    acceptDeadline: '',
    updateMilestone: 'Hàng tuần',
    dueDate: '',
  });

  // Modal thao tác GVCN hoặc GVBM/TLHN trên từng nhiệm vụ
  const [actionModal, setActionModal] = useState<{
    task: any;
    mode: 'LOG_ACTIVITY' | 'RESPOND' | 'DECLINE' | 'REQUEST_SUPPLEMENT' | 'APPROVE';
  } | null>(null);
  const [actionInput, setActionInput] = useState('');
  const [actionEvidence, setActionEvidence] = useState('');
  const [actionSharedNote, setActionSharedNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Form cập nhật chuyên môn TLHN trên hồ sơ Holland
  const [tlhnForm, setTlhnForm] = useState({
    discussionSummary: '',
    studentInterestsStrengths: '',
    studentConcernsAspirations: '',
    proposedGoalsText: '',
    agreedGoalTitle: '',
    agreedActionPlan: '',
    selectedSpecialSubjects: [] as string[],
    selectedExperientialActivities: [] as string[],
    counselorComment: '',
    evidenceText: '',
    nextStepProposal: '',
    createAgreedGoalInSystem: false,
  });

  const loadWorkspaceData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        classId: classId || '',
        schoolYear: schoolYear || '2025-2026',
        includeClassTeachers: '1',
      });
      const [taskRes, myTaskRes, orientRes] = await Promise.all([
        fetch(`/api/advisory/gvbm-tasks?${qs.toString()}`).then(r => r.json()).catch(() => null),
        fetch(`/api/advisory/gvbm-tasks?assignedToMe=1&schoolYear=${encodeURIComponent(schoolYear || '2025-2026')}`).then(r => r.json()).catch(() => null),
        fetch(`/api/advisory/orientation-tracking?classId=${encodeURIComponent(classId || '')}&studentId=${encodeURIComponent(selectedStudentId || selectedStudentCode || '')}&gradeLevel=${encodeURIComponent(gradeLevel || '12')}&schoolYear=${encodeURIComponent(schoolYear || '2025-2026')}`).then(r => r.json()).catch(() => null),
      ]);

      if (Array.isArray(taskRes?.tasks)) setTasks(taskRes.tasks);
      if (Array.isArray(taskRes?.classTeachers)) setClassTeachers(taskRes.classTeachers);
      if (Array.isArray(myTaskRes?.tasks)) setMyTasks(myTaskRes.tasks);
      if (orientRes) {
        setOrientationData(orientRes);
        if (Array.isArray(orientRes.tlhnTeachers)) setTlhnTeachers(orientRes.tlhnTeachers);
        const rec = orientRes.records?.[0];
        if (rec) {
          setTlhnForm(prev => ({
            ...prev,
            discussionSummary: rec.discussionSummary || '',
            studentInterestsStrengths: rec.studentInterestsStrengths || '',
            studentConcernsAspirations: rec.studentConcernsAspirations || '',
            proposedGoalsText: rec.proposedGoalsText || '',
            agreedGoalTitle: rec.agreedGoalTitle || '',
            agreedActionPlan: rec.agreedActionPlan || '',
            selectedSpecialSubjects: Array.isArray(rec.specialSubjectsJson) ? rec.specialSubjectsJson : [],
            selectedExperientialActivities: Array.isArray(rec.experientialActivitiesJson) ? rec.experientialActivitiesJson : [],
            counselorComment: rec.counselorComment || '',
            evidenceText: rec.evidenceText || '',
            nextStepProposal: rec.nextStepProposal || '',
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [classId, schoolYear, selectedStudentId, selectedStudentCode, gradeLevel]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    if (preselectedGoal) {
      const isTlhn = normalizeGoalCategory(preselectedGoal.category) === 'DINH_HUONG';
      setAssignForm(s => ({
        ...s,
        companionType: isTlhn ? 'TLHN' : 'GVBM',
        studentId: selectedStudentCode || selectedStudentId || '',
        studentName: selectedStudentName || '',
        goalId: preselectedGoal.goalId,
        goalTitle: preselectedGoal.title,
        goalCategory: normalizeGoalCategory(preselectedGoal.category),
        subjectName: isTlhn ? 'Tổ Tâm lý – Hướng nghiệp' : '',
      }));
      setShowAssignModal(true);
    }
  }, [preselectedGoal, selectedStudentCode, selectedStudentId, selectedStudentName]);

  const filteredTasks = useMemo(() => {
    if (subTab === 'MY_COMPANION_TASKS') return myTasks;
    return tasks.filter(t => (t.companionType || 'GVBM') === subTab);
  }, [tasks, myTasks, subTab]);

  const statusMeta = (t: any) => {
    switch (t.status) {
      case 'ASSIGNED':
        return { label: 'Chờ tiếp nhận', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'ACCEPTED':
        return { label: 'Đã tiếp nhận', cls: 'bg-teal-50 text-[#008B85] border-teal-200' };
      case 'IN_PROGRESS':
        return { label: 'Đang hỗ trợ', cls: 'bg-teal-50 text-[#008B85] border-teal-200' };
      case 'RESPONDED':
        return { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'SUPPLEMENT_REQUESTED':
        return { label: 'Cần bổ sung', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'APPROVED':
      case 'SENT_TO_PARENT':
        return { label: 'Đã hoàn thành', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'DECLINED':
        return { label: 'Từ chối nhận (có lý do)', cls: 'bg-slate-100 text-slate-600 border-slate-300' };
      default:
        return { label: t.status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/advisory/gvbm-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          className,
          schoolYear: schoolYear || '2025-2026',
          ...assignForm,
        }),
      });
      if (res.ok) {
        // If TLHN, also update OrientationAdvisoryRecord state to CHO_TIEP_NHAN
        if (assignForm.companionType === 'TLHN') {
          await fetch('/api/advisory/orientation-tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ASSIGN_TLHN',
              studentId: selectedStudentId || assignForm.studentId,
              studentCode: assignForm.studentId,
              studentName: assignForm.studentName,
              classId,
              className,
              schoolYear: schoolYear || '2025-2026',
              semester: semester || 'HK1',
              assignedTeacherId: assignForm.assignedToEmail,
              assignedTeacherName: assignForm.assignedToName,
              assignedTeacherEmail: assignForm.assignedToEmail,
              assignmentPrompt: assignForm.requestSummary,
              expectedOutcome: assignForm.expectedOutcome,
              dueDate: assignForm.dueDate,
            }),
          }).catch(() => null);
        }
        setShowAssignModal(false);
        await loadWorkspaceData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPatch = async (taskId: string, action: string, extra: Record<string, any> = {}) => {
    setSaving(true);
    try {
      await fetch('/api/advisory/gvbm-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, action, ...extra }),
      });
      setActionModal(null);
      await loadWorkspaceData();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTlhnConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    const rec = orientationData?.records?.[0];
    setSaving(true);
    try {
      await fetch('/api/advisory/orientation-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPLETE_CONSULTATION',
          recordId: rec?.id,
          studentId: selectedStudentId || selectedStudentCode,
          studentCode: selectedStudentCode,
          studentName: selectedStudentName,
          classId,
          schoolYear: schoolYear || '2025-2026',
          semester: semester || 'HK1',
          ...tlhnForm,
        }),
      });
      await loadWorkspaceData();
    } finally {
      setSaving(false);
    }
  };

  const currentOrientRec = orientationData?.records?.[0] || null;
  const hollandHistory = Array.isArray(orientationData?.hollandHistory) ? orientationData.hollandHistory : [];
  const activeHolland = hollandHistory[0] || null;
  const catalog = orientationData?.catalog || { specialSubjects: [], experientialActivities: [] };

  return (
    <div className="space-y-4">
      {/* Sub-navigation bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('GVBM')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'GVBM' ? 'bg-[#003B3A] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            1. GVBM phối hợp ({tasks.filter(t => (t.companionType || 'GVBM') === 'GVBM').length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('TLHN')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'TLHN' ? 'bg-[#003B3A] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2. Tổ TLHN đồng hành ({tasks.filter(t => t.companionType === 'TLHN').length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('HOLLAND_PIPELINE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'HOLLAND_PIPELINE' ? 'bg-[#003B3A] text-white' : 'bg-teal-50 text-[#008B85] border border-teal-200 hover:bg-teal-100'
            }`}
          >
            3. Hồ sơ Holland & Định hướng phát triển (Mục IV)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('MY_COMPANION_TASKS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'MY_COMPANION_TASKS' ? 'bg-[#003B3A] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            4. Nhiệm vụ đồng hành của tôi ({myTasks.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAssignForm(s => ({
                ...s,
                companionType: subTab === 'TLHN' || subTab === 'HOLLAND_PIPELINE' ? 'TLHN' : 'GVBM',
                studentId: selectedStudentCode || selectedStudentId || '',
                studentName: selectedStudentName || '',
                subjectName: subTab === 'TLHN' || subTab === 'HOLLAND_PIPELINE' ? 'Tổ Tâm lý – Hướng nghiệp' : '',
              }));
              setShowAssignModal(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Phân công đồng hành
          </button>
          <button
            type="button"
            onClick={loadWorkspaceData}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SECTION IV: HOLLAND & ĐỊNH HƯỚNG PHÁT TRIỂN */}
      {subTab === 'HOLLAND_PIPELINE' ? (
        <div className="space-y-4">
          {/* 5-Stage Pipeline Tracker */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#00A19A]" />
                  Quy trình theo dõi riêng: Holland & Định hướng phát triển — {selectedStudentName || 'Học sinh đang chọn'}
                </h4>
                <p className="text-xs text-slate-500">
                  Holland là nguồn tham khảo về sở thích; kết hợp dữ liệu học tập, năng lực, trải nghiệm và nguyện vọng. Không tự động gán nghề hoặc tự tạo mục tiêu nghề nghiệp đã xác nhận chỉ từ kết quả khảo sát.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await fetch('/api/advisory/orientation-tracking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'SYNC_HOLLAND',
                      studentId: selectedStudentId || selectedStudentCode,
                      studentCode: selectedStudentCode,
                      studentName: selectedStudentName,
                      classId,
                      className,
                      schoolYear,
                      semester,
                    }),
                  });
                  await loadWorkspaceData();
                }}
                className="px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-[#008B85] text-xs font-bold hover:bg-teal-100"
              >
                Đồng bộ kết quả Holland
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {[
                { code: 'DA_KHAO_SAT', label: '1. Đã khảo sát' },
                { code: 'CHO_PHAN_CONG', label: '2. Chờ phân công' },
                { code: 'CHO_TIEP_NHAN', label: '3. Chờ tiếp nhận' },
                { code: 'DANG_TU_VAN', label: '4. Đang tư vấn' },
                { code: 'DA_TU_VAN', label: '5. Đã tư vấn' },
              ].map((st, idx) => {
                const currentStatus = currentOrientRec?.status || (activeHolland ? 'CHO_PHAN_CONG' : 'CHUA_KHAO_SAT');
                const order = ['DA_KHAO_SAT', 'CHO_PHAN_CONG', 'CHO_TIEP_NHAN', 'DANG_TU_VAN', 'DA_TU_VAN'];
                const curIdx = order.indexOf(currentStatus);
                const isCurrent = currentStatus === st.code;
                const isDone = curIdx > idx;
                return (
                  <div
                    key={st.code}
                    className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between ${
                      isCurrent
                        ? 'bg-[#003B3A] text-white border-[#003B3A]'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span>{st.label}</span>
                    {isDone && <Check className="w-3.5 h-3.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Điểm 6 nhóm RIASEC & Lịch sử khảo sát */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h5 className="text-xs font-bold text-[#003B3A]">
                Kết quả RIASEC đang dùng làm căn cứ tư vấn
              </h5>
              {activeHolland ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Nhóm nổi trội:</span>
                    <span className="px-2.5 py-0.5 rounded font-black bg-[#003B3A] text-white tabular-nums">
                      {activeHolland.topCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngày & Đợt khảo sát:</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {activeHolland.completedAt ? new Date(activeHolland.completedAt).toLocaleDateString('vi-VN') : '—'} ({activeHolland.schoolYear})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 tabular-nums">
                    {[
                      { k: 'R', name: 'Realistic', v: activeHolland.rScore },
                      { k: 'I', name: 'Investigative', v: activeHolland.iScore },
                      { k: 'A', name: 'Artistic', v: activeHolland.aScore },
                      { k: 'S', name: 'Social', v: activeHolland.sScore },
                      { k: 'E', name: 'Enterprising', v: activeHolland.eScore },
                      { k: 'C', name: 'Conventional', v: activeHolland.cScore },
                    ].map(g => (
                      <div key={g.k} className="p-2 rounded bg-slate-50 border border-slate-200 text-center">
                        <div className="text-[11px] text-slate-500 font-semibold">{g.k} ({g.name})</div>
                        <div className="text-sm font-black text-[#003B3A]">{g.v ?? 0}</div>
                      </div>
                    ))}
                  </div>
                  {hollandHistory.length > 1 && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-slate-600 mb-1">
                        Lịch sử các lần khảo sát ({hollandHistory.length} lần):
                      </div>
                      {hollandHistory.map((h: any, idx: number) => (
                        <div key={h.id} className="flex items-center justify-between text-[11px] py-1">
                          <span>Lần #{hollandHistory.length - idx}: <strong>{h.topCode}</strong> ({new Date(h.completedAt).toLocaleDateString('vi-VN')})</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-[#008B85] font-bold">Căn cứ hiện hành</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-6 text-center">
                  Học sinh chưa có bài khảo sát Holland hoàn thành trong hệ thống.
                </div>
              )}
            </div>

            {/* Biểu mẫu làm việc của GV Tổ TLHN & Phối hợp CVHT */}
            <form onSubmit={handleSaveTlhnConsultation} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div>
                  <h5 className="text-sm font-bold text-[#003B3A]">
                    Hồ sơ Tư vấn Định hướng phát triển (GV Tổ TLHN & GVCN phối hợp)
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Người phụ trách TLHN: <strong>{currentOrientRec?.assignedTeacherName || 'Chưa phân công'}</strong>
                  </p>
                </div>
                {currentOrientRec?.status === 'CHO_TIEP_NHAN' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/advisory/orientation-tracking', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'ACCEPT_ASSIGNMENT',
                          recordId: currentOrientRec.id,
                          studentId: selectedStudentId || selectedStudentCode,
                          schoolYear,
                        }),
                      });
                      await loadWorkspaceData();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#00A19A] text-white font-bold"
                  >
                    GV TLHN Tiếp nhận nhiệm vụ
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sở thích & Điểm mạnh của học sinh</label>
                  <textarea
                    rows={2}
                    value={tlhnForm.studentInterestsStrengths}
                    onChange={e => setTlhnForm(s => ({ ...s, studentInterestsStrengths: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Băn khoăn & Nguyện vọng của học sinh</label>
                  <textarea
                    rows={2}
                    value={tlhnForm.studentConcernsAspirations}
                    onChange={e => setTlhnForm(s => ({ ...s, studentConcernsAspirations: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nội dung trao đổi tư vấn & Đề xuất mục tiêu phát triển</label>
                  <textarea
                    rows={2}
                    value={tlhnForm.discussionSummary}
                    onChange={e => setTlhnForm(s => ({ ...s, discussionSummary: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mục tiêu & Kế hoạch đã thống nhất (CVHT + TLHN + HS)</label>
                  <input
                    type="text"
                    value={tlhnForm.agreedGoalTitle}
                    onChange={e => setTlhnForm(s => ({ ...s, agreedGoalTitle: e.target.value }))}
                    placeholder="Tên mục tiêu Định hướng phát triển thống nhất..."
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 mb-1.5"
                  />
                  <input
                    type="text"
                    value={tlhnForm.agreedActionPlan}
                    onChange={e => setTlhnForm(s => ({ ...s, agreedActionPlan: e.target.value }))}
                    placeholder="Kế hoạch hành động cụ thể..."
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Gắn môn đặc thù, chủ đề hoặc hoạt động trải nghiệm từ danh mục thực tế của khối */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gắn môn đặc thù / Tổ hợp tự chọn thực tế của Khối
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {catalog.specialSubjects.map((subj: string) => {
                      const active = tlhnForm.selectedSpecialSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => {
                            setTlhnForm(s => ({
                              ...s,
                              selectedSpecialSubjects: active
                                ? s.selectedSpecialSubjects.filter(x => x !== subj)
                                : [...s.selectedSpecialSubjects, subj],
                            }));
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                            active ? 'bg-[#003B3A] text-white border-[#003B3A]' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {subj}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gắn chủ đề / Hoạt động trải nghiệm hướng nghiệp của Khối
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {catalog.experientialActivities.map((act: string) => {
                      const active = tlhnForm.selectedExperientialActivities.includes(act);
                      return (
                        <button
                          key={act}
                          type="button"
                          onClick={() => {
                            setTlhnForm(s => ({
                              ...s,
                              selectedExperientialActivities: active
                                ? s.selectedExperientialActivities.filter(x => x !== act)
                                : [...s.selectedExperientialActivities, act],
                            }));
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border text-left ${
                            active ? 'bg-[#00A19A] text-white border-[#00A19A]' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {act}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhận xét chuyên môn TLHN</label>
                  <input
                    type="text"
                    value={tlhnForm.counselorComment}
                    onChange={e => setTlhnForm(s => ({ ...s, counselorComment: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minh chứng ghi nhận</label>
                  <input
                    type="text"
                    value={tlhnForm.evidenceText}
                    onChange={e => setTlhnForm(s => ({ ...s, evidenceText: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đề xuất bước tiếp theo</label>
                  <input
                    type="text"
                    value={tlhnForm.nextStepProposal}
                    onChange={e => setTlhnForm(s => ({ ...s, nextStepProposal: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tlhnForm.createAgreedGoalInSystem}
                    onChange={e => setTlhnForm(s => ({ ...s, createAgreedGoalInSystem: e.target.checked }))}
                    className="rounded border-slate-300 text-[#003B3A]"
                  />
                  Đồng thời ghi mục tiêu đã thống nhất vào danh sách “4. Định hướng phát triển” của học sinh
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white font-bold"
                >
                  {saving ? 'Đang lưu...' : 'Lưu kết quả tư vấn TLHN (Đã tư vấn)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* SECTION VII: BẢNG NHIỆM VỤ ĐỒNG HÀNH & HỖ TRỢ (GVBM / TLHN / CỦA TÔI) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              Vòng đời chuẩn: <strong>Chờ tiếp nhận → Đã tiếp nhận → Đang hỗ trợ → Chờ xác nhận → Đã hoàn thành</strong> (kèm trạng thái <strong>Cần bổ sung</strong> và cảnh báo <strong>Quá hạn</strong>). Hoàn thành nhiệm vụ hỗ trợ không tự động đánh dấu đạt mục tiêu.
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Chưa có nhiệm vụ đồng hành nào trong mục này. Bấm <strong>“Phân công đồng hành”</strong> để giao nhiệm vụ gắn với mục tiêu học sinh.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs tabular-nums">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Học sinh & Mục tiêu liên kết</th>
                    <th className="py-3 px-4">Giáo viên đồng hành</th>
                    <th className="py-3 px-4">Nội dung hỗ trợ & Kết quả mong đợi</th>
                    <th className="py-3 px-4">Các mốc hạn</th>
                    <th className="py-3 px-4">Nhật ký & Minh chứng kết quả</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác nghiệp vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTasks.map(t => {
                    const sm = statusMeta(t);
                    const logs = Array.isArray(t.executionLog) ? t.executionLog : [];
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-900">{t.studentName}</div>
                          <div className="text-[11px] text-slate-500">Mã HS: {t.studentId} • Lớp {t.className || t.classId}</div>
                          <div className="mt-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] font-semibold text-[#003B3A]">
                            Mục tiêu: {t.goalTitle || 'Mục tiêu học tập & phát triển'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.companionType === 'TLHN' ? 'bg-teal-50 text-[#008B85] border border-teal-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {t.companionType === 'TLHN' ? 'Tổ TLHN' : 'GVBM phối hợp'}
                          </span>
                          <div className="font-bold text-slate-800 mt-1">{t.assignedToName || t.assignedToEmail}</div>
                          <div className="text-[11px] text-slate-500">{t.subjectName}</div>
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-xs space-y-1">
                          <div><span className="font-semibold text-slate-700">Nội dung:</span> {t.requestSummary}</div>
                          {t.expectedOutcome && (
                            <div><span className="font-semibold text-slate-700">Kết quả mong đợi:</span> {t.expectedOutcome}</div>
                          )}
                          {t.supplementRequestNote && (
                            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                              <strong>Yêu cầu bổ sung từ GVCN:</strong> {t.supplementRequestNote}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top space-y-1 text-[11px]">
                          <div>Hạn tiếp nhận: <strong>{t.acceptDeadline || 'Trong 2 ngày'}</strong></div>
                          <div>Mốc cập nhật: <strong>{t.updateMilestone || 'Định kỳ'}</strong></div>
                          <div>Hạn hoàn thành: <strong className="text-[#003B3A]">{t.dueDate || 'Cuối kỳ'}</strong></div>
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-xs space-y-1">
                          {t.teacherResponse ? (
                            <div className="p-2 rounded bg-teal-50/60 border border-teal-200 text-slate-800">
                              <div className="font-bold text-[#003B3A]">Báo cáo kết quả:</div>
                              <div>{t.teacherResponse}</div>
                              {t.evidenceAndProposal && (
                                <div className="text-[11px] text-slate-600 mt-0.5">Minh chứng & Đề xuất: {t.evidenceAndProposal}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Chưa có báo cáo hoàn thành</span>
                          )}
                          {logs.length > 0 && (
                            <div className="text-[11px] text-slate-600 pt-1">
                              <strong>Nhật ký thực hiện ({logs.length}):</strong> {logs[logs.length - 1]?.note}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top space-y-1">
                          <span className={`px-2.5 py-1 rounded text-xs font-bold border inline-block ${sm.cls}`}>
                            {sm.label}
                          </span>
                          {t.isOverdue && (
                            <div>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Quá hạn
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {/* Nút cho GVBM / TLHN */}
                            {t.status === 'ASSIGNED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickPatch(t.id, 'ACCEPT_TASK')}
                                  className="px-2.5 py-1 rounded bg-[#00A19A] text-white font-bold"
                                >
                                  Tiếp nhận
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionInput('');
                                    setActionModal({ task: t, mode: 'DECLINE' });
                                  }}
                                  className="px-2 py-1 rounded border border-slate-300 text-slate-600"
                                >
                                  Từ chối
                                </button>
                              </>
                            )}

                            {(t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS' || t.status === 'SUPPLEMENT_REQUESTED' || t.status === 'ASSIGNED') && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionInput('');
                                    setActionModal({ task: t, mode: 'LOG_ACTIVITY' });
                                  }}
                                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                                >
                                  Trao đổi / Ghi nhật ký
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionInput(t.teacherResponse || '');
                                    setActionEvidence(t.evidenceAndProposal || '');
                                    setActionModal({ task: t, mode: 'RESPOND' });
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#003B3A] text-white font-bold"
                                >
                                  Gửi báo cáo hoàn thành
                                </button>
                              </>
                            )}

                            {/* Nút cho GVCN / CVHT (Mục VII) */}
                            {t.status !== 'APPROVED' && t.status !== 'SENT_TO_PARENT' && (
                              <button
                                type="button"
                                onClick={() => handleQuickPatch(t.id, 'REMIND_TEACHER')}
                                className="px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-amber-800 font-semibold"
                              >
                                Nhắc cập nhật
                              </button>
                            )}

                            {t.status === 'RESPONDED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionInput('');
                                    setActionModal({ task: t, mode: 'REQUEST_SUPPLEMENT' });
                                  }}
                                  className="px-2.5 py-1 rounded border border-rose-200 bg-rose-50 text-rose-700 font-semibold"
                                >
                                  Yêu cầu bổ sung
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionSharedNote(t.cvhtApprovedParentNote || t.teacherResponse || '');
                                    setActionModal({ task: t, mode: 'APPROVE' });
                                  }}
                                  className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold"
                                >
                                  Xác nhận kết quả
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Phân công đồng hành (GVBM / TLHN) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">Phân công Giáo viên Đồng hành & Hỗ trợ (Mục IV & VII)</h4>
                <p className="text-xs text-teal-100 mt-0.5">
                  Mỗi nhiệm vụ gắn trực tiếp với một mục tiêu của học sinh
                </p>
              </div>
              <button type="button" onClick={() => setShowAssignModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignForm(s => ({ ...s, companionType: 'GVBM', subjectName: '' }))}
                  className={`py-2 px-3 rounded-lg font-bold border ${
                    assignForm.companionType === 'GVBM'
                      ? 'bg-[#003B3A] text-white border-[#003B3A]'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  GVBM phối hợp (theo phân công giảng dạy)
                </button>
                <button
                  type="button"
                  onClick={() => setAssignForm(s => ({ ...s, companionType: 'TLHN', goalCategory: 'DINH_HUONG', subjectName: 'Tổ Tâm lý – Hướng nghiệp' }))}
                  className={`py-2 px-3 rounded-lg font-bold border ${
                    assignForm.companionType === 'TLHN'
                      ? 'bg-[#003B3A] text-white border-[#003B3A]'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Tổ Tâm lý – Hướng nghiệp đồng hành
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã học sinh</label>
                  <input
                    type="text"
                    required
                    value={assignForm.studentId}
                    onChange={e => setAssignForm(s => ({ ...s, studentId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ tên học sinh</label>
                  <input
                    type="text"
                    required
                    value={assignForm.studentName}
                    onChange={e => setAssignForm(s => ({ ...s, studentName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mục tiêu liên kết của học sinh</label>
                <input
                  type="text"
                  required
                  value={assignForm.goalTitle}
                  onChange={e => setAssignForm(s => ({ ...s, goalTitle: e.target.value }))}
                  placeholder="Nhập hoặc chọn mục tiêu cần GV đồng hành..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                />
              </div>

              {/* Chọn giáo viên từ phân công giảng dạy hiện hành hoặc Tổ TLHN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {assignForm.companionType === 'TLHN' ? 'Chọn thành viên Tổ TLHN đang hoạt động' : 'Chọn GVBM theo phân công giảng dạy lớp'}
                  </label>
                  <select
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      if (assignForm.companionType === 'TLHN') {
                        const found = tlhnTeachers.find(t => t.email === val || t.id === val);
                        if (found) {
                          setAssignForm(s => ({
                            ...s,
                            assignedToEmail: found.email,
                            assignedToName: found.name,
                            subjectName: found.roleLabel || 'Tổ Tâm lý – Hướng nghiệp',
                          }));
                        }
                      } else {
                        const found = classTeachers.find(t => t.teacherEmail === val);
                        if (found) {
                          setAssignForm(s => ({
                            ...s,
                            assignedToEmail: found.teacherEmail,
                            assignedToName: found.teacherName,
                            subjectName: found.subjectName,
                          }));
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">-- Chọn từ danh sách phân công --</option>
                    {assignForm.companionType === 'TLHN'
                      ? tlhnTeachers.map((t, i) => (
                          <option key={i} value={t.email || t.id}>
                            {t.name} ({t.roleLabel || 'Tổ TLHN'})
                          </option>
                        ))
                      : classTeachers.map((t, i) => (
                          <option key={i} value={t.teacherEmail}>
                            {t.subjectName} — {t.teacherName}
                          </option>
                        ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên giáo viên & Môn / Bộ phận</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Họ tên GV..."
                      value={assignForm.assignedToName}
                      onChange={e => setAssignForm(s => ({ ...s, assignedToName: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Môn học / TLHN..."
                      value={assignForm.subjectName}
                      onChange={e => setAssignForm(s => ({ ...s, subjectName: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung yêu cầu hỗ trợ / tư vấn</label>
                <textarea
                  rows={2}
                  required
                  value={assignForm.requestSummary}
                  onChange={e => setAssignForm(s => ({ ...s, requestSummary: e.target.value }))}
                  placeholder="Ghi rõ nội dung cần GVBM hoặc GV TLHN hỗ trợ học sinh..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kết quả mong đợi</label>
                <input
                  type="text"
                  required
                  value={assignForm.expectedOutcome}
                  onChange={e => setAssignForm(s => ({ ...s, expectedOutcome: e.target.value }))}
                  placeholder="VD: Học sinh nắm vững chuyên đề hàm số, hoàn thành 3 đề luyện..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạn tiếp nhận</label>
                  <input
                    type="date"
                    value={assignForm.acceptDeadline}
                    onChange={e => setAssignForm(s => ({ ...s, acceptDeadline: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mốc cập nhật</label>
                  <input
                    type="text"
                    value={assignForm.updateMilestone}
                    onChange={e => setAssignForm(s => ({ ...s, updateMilestone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạn hoàn thành</label>
                  <input
                    type="date"
                    value={assignForm.dueDate}
                    onChange={e => setAssignForm(s => ({ ...s, dueDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white font-bold"
                >
                  {saving ? 'Đang giao...' : 'Giao nhiệm vụ đồng hành'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xử lý chi tiết nhiệm vụ (Ghi nhật ký, Gửi báo cáo, Yêu cầu bổ sung, Xác nhận kết quả) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#003B3A] text-white flex items-center justify-between">
              <h4 className="text-sm font-bold">
                {actionModal.mode === 'LOG_ACTIVITY' && 'Cập nhật nhật ký thực hiện & Trao đổi'}
                {actionModal.mode === 'RESPOND' && 'Gửi báo cáo hoàn thành nhiệm vụ hỗ trợ'}
                {actionModal.mode === 'DECLINE' && 'Từ chối tiếp nhận nhiệm vụ (nêu rõ lý do)'}
                {actionModal.mode === 'REQUEST_SUPPLEMENT' && 'Yêu cầu bổ sung kết quả hỗ trợ'}
                {actionModal.mode === 'APPROVE' && 'Xác nhận kết quả đồng hành & hỗ trợ'}
              </h4>
              <button type="button" onClick={() => setActionModal(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {actionModal.mode === 'APPROVE' ? (
                <>
                  <p className="text-slate-600">
                    Xác nhận hoàn thành nhiệm vụ hỗ trợ của <strong>{actionModal.task.assignedToName}</strong>. Lưu ý: Việc hoàn thành nhiệm vụ hỗ trợ không tự động đánh dấu mục tiêu của học sinh là đã đạt.
                  </p>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nội dung ghi nhận & chia sẻ PHHS (nếu công bố)</label>
                    <textarea
                      rows={3}
                      value={actionSharedNote}
                      onChange={e => setActionSharedNote(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {actionModal.mode === 'LOG_ACTIVITY' && 'Nội dung hoạt động hỗ trợ / trao đổi vừa thực hiện'}
                      {actionModal.mode === 'RESPOND' && 'Kết quả hỗ trợ đạt được'}
                      {actionModal.mode === 'DECLINE' && 'Lý do chưa thể tiếp nhận nhiệm vụ'}
                      {actionModal.mode === 'REQUEST_SUPPLEMENT' && 'Nội dung yêu cầu GVBM/TLHN bổ sung'}
                    </label>
                    <textarea
                      rows={3}
                      value={actionInput}
                      onChange={e => setActionInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  {actionModal.mode === 'RESPOND' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Minh chứng kết quả & Đề xuất bước tiếp theo</label>
                      <textarea
                        rows={2}
                        value={actionEvidence}
                        onChange={e => setActionEvidence(e.target.value)}
                        placeholder="Điểm cải thiện, bài tập đã hoàn thành, đề xuất GVCN..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const id = actionModal.task.id;
                    if (actionModal.mode === 'LOG_ACTIVITY') {
                      handleQuickPatch(id, 'LOG_ACTIVITY', { activityNote: actionInput });
                    } else if (actionModal.mode === 'RESPOND') {
                      handleQuickPatch(id, 'TEACHER_RESPOND', {
                        teacherResponse: actionInput,
                        evidenceAndProposal: actionEvidence,
                      });
                    } else if (actionModal.mode === 'DECLINE') {
                      handleQuickPatch(id, 'DECLINE_TASK', { declineReason: actionInput });
                    } else if (actionModal.mode === 'REQUEST_SUPPLEMENT') {
                      handleQuickPatch(id, 'REQUEST_SUPPLEMENT', { supplementRequestNote: actionInput });
                    } else if (actionModal.mode === 'APPROVE') {
                      handleQuickPatch(id, 'CVHT_APPROVE', {
                        cvhtApprovedParentNote: actionSharedNote,
                        publishToParent: true,
                      });
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-[#003B3A] hover:bg-[#00524F] text-white font-bold"
                >
                  {saving ? 'Đang xử lý...' : 'Lưu xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
