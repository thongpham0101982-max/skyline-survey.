'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  Heart,
  Link2,
  Lock,
  MessageSquareHeart,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
} from 'lucide-react';
import { SkylineFlagMascot } from '@/components/reflection-pride/SkylineFlagMascot';

type TeacherTab =
  | 'CLASS_OVERVIEW'
  | 'STUDENT_PROGRESS'
  | 'SELF_ASSESSMENT_5Q'
  | 'DGNL_COMPARISON'
  | 'CLASS_PRIDE_NPS'
  | 'CVHT_ACCOMPANIMENT';

export default function TeacherReflectionPrideClient() {
  const [activeTab, setActiveTab] = useState<TeacherTab>('CLASS_OVERVIEW');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'DRAFT' | 'NOT_STARTED'>('ALL');

  const [data, setData] = useState<any>(null);

  // Học sinh đang chọn để xem chi tiết 5 phẩm chất / phản hồi CVHT
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<string>('');
  const [cvhtCategory, setCvhtCategory] = useState<string>('RÈN LUYỆN PHẨM CHẤT SKL');
  const [cvhtGoalText, setCvhtGoalText] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchTeacherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedClassId) params.set('classId', selectedClassId);
      if (selectedPeriodId) params.set('periodId', selectedPeriodId);

      const res = await fetch(`/api/reflection-pride/teacher?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể tải dữ liệu lớp phụ trách.');
      }
      setData(json);
      if (!selectedClassId && json.selectedClass?.id) {
        setSelectedClassId(json.selectedClass.id);
      }
      if (!selectedPeriodId && json.selectedPeriod?.id) {
        setSelectedPeriodId(json.selectedPeriod.id);
      }
      if (!selectedStudentId && json.students?.length > 0) {
        const firstSubmitted =
          json.students.find((s: any) => s.reflectionStatus === 'SUBMITTED') || json.students[0];
        setSelectedStudentId(firstSubmitted.studentId);
        setFeedbackDraft(firstSubmitted.gvcnFeedback || '');
        setCvhtGoalText(firstSubmitted.personalGoal || '');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedPeriodId, selectedStudentId]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  const selectedStudent = useMemo(() => {
    if (!data?.students || !selectedStudentId) return null;
    return data.students.find((s: any) => s.studentId === selectedStudentId) || null;
  }, [data, selectedStudentId]);

  const handleSelectStudentForDetail = (student: any) => {
    setSelectedStudentId(student.studentId);
    setFeedbackDraft(student.gvcnFeedback || '');
    setCvhtGoalText(
      student.personalGoal ||
        `Phát triển phẩm chất Sky-Line và duy trì thói quen rèn luyện tích cực trong học kỳ.`
    );
  };

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((s: any) => {
      if (statusFilter !== 'ALL' && s.reflectionStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, statusFilter, searchQuery]);

  // Gửi nhắc nhiệm vụ cho học sinh chưa hoàn thành
  const handleRemindStudents = async (studentIds?: string[]) => {
    if (!data?.selectedClass?.id || !data?.selectedPeriod?.id) {
      showToast('error', 'Chưa có kỳ khảo sát đang mở để gửi lời nhắc.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/reflection-pride/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REMIND_STUDENTS',
          periodId: data.selectedPeriod.id,
          classId: data.selectedClass.id,
          studentIds,
          message:
            'GVCN nhắc em hoàn thành Bản tự nhìn nhận 5 Phẩm chất & khảo sát Tự hào Sky-Line trên Cổng Học sinh nhé!',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể gửi nhắc nhiệm vụ.');
      showToast('success', json.message);
      await fetchTeacherData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Lưu nhận xét của GVCN
  const handleSaveGvcnFeedback = async () => {
    if (!selectedStudent || !data?.selectedPeriod?.id) return;
    if (!feedbackDraft.trim()) {
      showToast('error', 'Vui lòng nhập nội dung nhận xét đồng hành của GVCN.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/reflection-pride/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_GVCN_FEEDBACK',
          periodId: data.selectedPeriod.id,
          studentId: selectedStudent.studentId,
          gvcnFeedback: feedbackDraft,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể lưu nhận xét.');
      showToast('success', json.message);
      await fetchTeacherData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Kết nối mục tiêu tự nhìn nhận của học sinh sang Cố vấn học tập (CVHT)
  const handleConnectCvhtGoal = async () => {
    if (!selectedStudent || !data?.selectedPeriod?.id) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/reflection-pride/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONNECT_CVHT_GOAL',
          periodId: data.selectedPeriod.id,
          studentId: selectedStudent.studentId,
          goalContent: cvhtGoalText || selectedStudent.personalGoal,
          category: cvhtCategory,
          gvcnFeedback: feedbackDraft || selectedStudent.gvcnFeedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể kết nối mục tiêu CVHT.');
      showToast('success', json.message);
      await fetchTeacherData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5FA] pb-16 text-slate-800">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-xl ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* HEADER TÍM GLOBAL SSM DÀNH CHO GVCN */}
      <div
        className="border-b border-teal-900/20 text-white shadow-md"
        style={{
          background: 'linear-gradient(135deg, #003B3A 0%, #003B3A 58%, #00A19A 100%)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
                <span>Lớp Học sinh</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-amber-300">NPS Tự hào Học sinh SKL</span>
                {data?.selectedClass && (
                  <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-white">
                    Lớp {data.selectedClass.name} • Khối {data.selectedClass.grade}
                  </span>
                )}
              </div>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Đồng hành Phẩm chất Học sinh & NPS Tự hào Sky-Line
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-teal-700/95">
                Theo dõi kết quả tự đánh giá 5 phẩm chất (14 tiêu chí), đối chiếu ĐGNL định kỳ, xem chỉ số Pride NPS ẩn danh của lớp và kết nối mục tiêu phát triển cá nhân vào hồ sơ Cố vấn học tập (CVHT).
              </p>
            </div>

            {/* Bộ chọn Lớp phụ trách & Kỳ khảo sát */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-teal-700">
                  Lớp phụ trách (Khối 4–12)
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentId(null);
                  }}
                  className="rounded-xl border border-white/25 bg-teal-950/75 px-3 py-2 text-xs font-bold text-white focus:border-amber-300 focus:outline-none"
                >
                  {data?.classes?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name} ({c.campusName || 'Sky-Line'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-teal-700">
                  Kỳ khảo sát
                </label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="rounded-xl border border-white/25 bg-teal-950/75 px-3 py-2 text-xs font-bold text-white focus:border-amber-300 focus:outline-none"
                >
                  {data?.periods?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      [{p.semester}] {p.title} ({p.status})
                    </option>
                  ))}
                  {!data?.periods?.length && <option value="">Chưa có kỳ khảo sát</option>}
                </select>
              </div>

              <button
                type="button"
                onClick={fetchTeacherData}
                className="mt-4 rounded-xl bg-white/15 p-2.5 text-white hover:bg-white/25"
                title="Làm mới"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 6 TABS THEO ĐÚNG THIẾT KẾ MỤC B */}
          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'CLASS_OVERVIEW', label: '1. Tổng quan lớp', icon: BarChart3 },
              { id: 'STUDENT_PROGRESS', label: '2. Tiến độ học sinh', icon: Users },
              { id: 'SELF_ASSESSMENT_5Q', label: '3. Tự đánh giá 5 phẩm chất', icon: Award },
              { id: 'DGNL_COMPARISON', label: '4. Đối chiếu ĐGNL định kỳ', icon: Scale },
              { id: 'CLASS_PRIDE_NPS', label: '5. Pride NPS lớp (Ẩn danh)', icon: Heart },
              { id: 'CVHT_ACCOMPANIMENT', label: '6. Phản hồi & Đồng hành CVHT', icon: Compass },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as TeacherTab)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs font-bold transition ${
                    active
                      ? 'bg-[#F6F5FA] text-teal-800 shadow-sm'
                      : 'bg-white/10 text-teal-700 hover:bg-white/20'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-teal-800' : 'text-teal-700'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <strong>Thông báo:</strong> {error}
          </div>
        )}

        {!loading && data && !data.selectedClass && (
          <SkylineFlagMascot
            variant="empty"
            title="Chưa tìm thấy lớp Khối 4–12 được phân công"
            message="Phân hệ Tự nhìn nhận 5 Phẩm chất & Pride NPS áp dụng cho các lớp từ Khối 4 đến Khối 12."
          />
        )}

        {!loading && data?.selectedClass && !data?.selectedPeriod && (
          <div className="mb-6">
            <SkylineFlagMascot
              variant="locked"
              badgeText="CHƯA MỞ KỲ KHẢO SÁT"
              title={`Lớp ${data.selectedClass.name} hiện chưa có kỳ khảo sát nào được Admin mở`}
              message="Khi Ban KT&ĐBCL mở kỳ khảo sát mới cho Khối 4–12, học sinh trong lớp sẽ nhận được nhiệm vụ tự nhìn nhận và GVCN có thể theo dõi tiến độ tại đây."
            />
          </div>
        )}

        {data?.selectedClass && data?.overview && (
          <>
            {/* =====================================================================
                TAB 1: TỔNG QUAN LỚP
               ===================================================================== */}
            {activeTab === 'CLASS_OVERVIEW' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
                    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-extrabold text-teal-800">
                      TIẾN ĐỘ LỚP {data.selectedClass.name}
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-teal-800">
                        {data.overview.completionRatePct}%
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        ({data.overview.submittedCount}/{data.overview.totalStudents} HS)
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-[#003B3A]"
                        style={{ width: `${Math.min(100, data.overview.completionRatePct)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                      <span>Nháp: {data.overview.draftCount}</span>
                      <span>Chưa làm: {data.overview.notStartedCount}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-900">
                      KPI IP2.1 LỚP (4 PHẨM CHẤT)
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-700">
                        {data.overview.ip21PassRatePct}%
                      </span>
                      <span className="text-xs text-slate-500">
                        đạt ≥ {data.overview.ip21PassThresholdPct}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      ĐTB hệ 16: <strong>{data.overview.avgIp21Score16}/16.0</strong> • Chỉ tiêu:{' '}
                      <strong>{data.overview.ip21TargetRatePct}%</strong>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">
                      5 PHẨM CHẤT & TỰ HÀO SKL
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">
                        {data.overview.avgExtendedScore20}
                      </span>
                      <span className="text-xs text-slate-500">/ 20.0 điểm</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      Phẩm chất Tự hào Sky-Line: <strong>{data.overview.avgPrideQualityScore4}/4.0</strong>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
                    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-extrabold text-teal-800">
                      ĐỒNG HÀNH GVCN & CVHT
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-teal-800">
                        {data.overview.gvcnReviewedCount}
                      </span>
                      <span className="text-xs text-slate-500">
                        /{data.overview.submittedCount} HS đã nhận xét
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      Đã gắn mục tiêu CVHT: <strong>{data.overview.cvhtLinkedCount} HS</strong>
                    </p>
                  </div>
                </div>

                {/* Biểu đồ 5 phẩm chất của lớp */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <h2 className="text-base font-extrabold text-slate-900">
                      Bức tranh 5 Phẩm chất của Lớp {data.selectedClass.name}
                    </h2>
                    <div className="mt-4 space-y-3.5">
                      {data.overview.qualityClassAverages.map((q: any) => (
                        <div
                          key={q.code}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="rounded bg-[#003B3A] px-2 py-0.5 font-extrabold text-white">
                                {q.code}
                              </span>
                              <span className="ml-2 font-bold text-slate-900">{q.name}</span>
                              {!q.includedInOfficialIp21 && (
                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                  Mở rộng
                                </span>
                              )}
                            </div>
                            <span className="font-extrabold text-teal-800">
                              {q.averageScore} / 4.0 ({q.percentage}%)
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                            <div
                              className={`h-full rounded-full ${
                                q.includedInOfficialIp21 ? 'bg-[#003B3A]' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, q.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card hành động nhanh cho GVCN */}
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-extrabold text-teal-800">
                        Tác vụ nhanh dành cho GVCN
                      </h3>
                      <div className="mt-3 space-y-2.5">
                        <button
                          type="button"
                          onClick={() => handleRemindStudents()}
                          disabled={actionLoading || data.overview.notStartedCount + data.overview.draftCount === 0}
                          className="flex w-full items-center justify-between rounded-xl bg-[#003B3A] px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-[#003B3A] disabled:opacity-50"
                        >
                          <span className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-amber-300" />
                            Nhắc {data.overview.notStartedCount + data.overview.draftCount} HS chưa hoàn thành
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('SELF_ASSESSMENT_5Q')}
                          className="flex w-full items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-50"
                        >
                          <span>Xem chi tiết tự đánh giá từng học sinh</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('CVHT_ACCOMPANIMENT')}
                          className="flex w-full items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-950 hover:bg-teal-100"
                        >
                          <span>Nhận xét & Kết nối mục tiêu CVHT</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 2: TIẾN ĐỘ HỌC SINH & NHẮC NHIỆM VỤ
               ===================================================================== */}
            {activeTab === 'STUDENT_PROGRESS' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Tiến độ thực hiện của Học sinh Lớp {data.selectedClass.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      GVCN có thể gửi thông báo nhắc nhiệm vụ cho từng học sinh hoặc toàn bộ học sinh chưa hoàn thành.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      <option value="ALL">Tất cả ({data.students.length})</option>
                      <option value="SUBMITTED">Đã hoàn thành ({data.overview.submittedCount})</option>
                      <option value="DRAFT">Đang lưu nháp ({data.overview.draftCount})</option>
                      <option value="NOT_STARTED">Chưa làm ({data.overview.notStartedCount})</option>
                    </select>

                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm tên hoặc mã HS..."
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemindStudents()}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#003B3A] disabled:opacity-50"
                    >
                      <Bell className="h-3.5 w-3.5 text-amber-300" />
                      Nhắc tất cả HS chưa nộp
                    </button>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                        <th className="p-3">Mã HS</th>
                        <th className="p-3">Họ và tên</th>
                        <th className="p-3 text-center">Trạng thái</th>
                        <th className="p-3 text-center">Điểm IP2.1 (/16)</th>
                        <th className="p-3 text-center">5 Phẩm chất (/20)</th>
                        <th className="p-3 text-center">Xếp loại IP2.1</th>
                        <th className="p-3 text-center">Đồng hành GVCN</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((s: any) => (
                        <tr key={s.studentId} className="hover:bg-teal-50/40">
                          <td className="p-3 font-mono font-bold text-slate-600">{s.studentCode}</td>
                          <td className="p-3 font-extrabold text-slate-900">{s.fullName}</td>
                          <td className="p-3 text-center">
                            {s.reflectionStatus === 'SUBMITTED' ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                                Đã hoàn thành
                              </span>
                            ) : s.reflectionStatus === 'DRAFT' ? (
                              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                                Đang lưu nháp
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">
                                Chưa thực hiện
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-extrabold text-teal-800">
                            {s.scores ? `${s.scores.ip21TotalScore16} (${s.scores.ip21Percentage}%)` : '—'}
                          </td>
                          <td className="p-3 text-center font-semibold">
                            {s.scores ? `${s.scores.extended5TotalScore20}/20` : '—'}
                          </td>
                          <td className="p-3 text-center">
                            {s.scores ? (
                              <span className="font-bold text-teal-800">{s.scores.ip21LevelLabel}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {s.gvcnFeedback ? (
                              <span className="text-emerald-700 font-bold">Đã nhận xét</span>
                            ) : (
                              <span className="text-slate-400">Chưa nhận xét</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {s.reflectionStatus !== 'SUBMITTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleRemindStudents([s.studentId])}
                                  className="rounded-lg bg-amber-100 px-2.5 py-1 font-bold text-amber-900 hover:bg-amber-200"
                                >
                                  Nhắc HS
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectStudentForDetail(s);
                                  setActiveTab('SELF_ASSESSMENT_5Q');
                                }}
                                className="rounded-lg bg-teal-50 px-2.5 py-1 font-bold text-teal-800 hover:bg-teal-50"
                              >
                                Xem chi tiết
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 3: TỰ ĐÁNH GIÁ 5 PHẨM CHẤT (CHI TIẾT TỪNG HỌC SINH TRONG LỚP)
               ===================================================================== */}
            {activeTab === 'SELF_ASSESSMENT_5Q' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Cột danh sách học sinh */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Chọn học sinh trong lớp ({data.students.length})
                  </h3>
                  <div className="mt-3 max-h-[600px] space-y-1.5 overflow-y-auto pr-1">
                    {data.students.map((s: any) => {
                      const isSelected = s.studentId === selectedStudent?.studentId;
                      return (
                        <button
                          key={s.studentId}
                          type="button"
                          onClick={() => handleSelectStudentForDetail(s)}
                          className={`flex w-full items-center justify-between rounded-xl p-3 text-left text-xs transition ${
                            isSelected
                              ? 'bg-[#003B3A] text-white shadow'
                              : 'bg-slate-50 text-slate-800 hover:bg-teal-50'
                          }`}
                        >
                          <div>
                            <div className="font-extrabold">{s.fullName}</div>
                            <div
                              className={`text-[11px] ${
                                isSelected ? 'text-teal-700' : 'text-slate-500'
                              }`}
                            >
                              {s.studentCode}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              s.reflectionStatus === 'SUBMITTED'
                                ? 'bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {s.scores ? `${s.scores.ip21TotalScore16}/16` : s.reflectionStatus}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cột chi tiết bản tự nhìn nhận 5 phẩm chất của học sinh */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                  {selectedStudent ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                        <div>
                          <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800">
                            {selectedStudent.studentCode}
                          </span>
                          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                            {selectedStudent.fullName}
                          </h2>
                        </div>
                        {selectedStudent.scores && (
                          <div className="flex items-center gap-3 text-center text-xs">
                            <div className="rounded-xl bg-teal-50 px-3.5 py-2">
                              <div className="text-[10px] text-slate-500">KPI IP2.1 (4 PC)</div>
                              <div className="text-base font-black text-teal-800">
                                {selectedStudent.scores.ip21TotalScore16} / 16.0
                              </div>
                            </div>
                            <div className="rounded-xl bg-amber-50 px-3.5 py-2">
                              <div className="text-[10px] text-slate-500">5 Phẩm chất</div>
                              <div className="text-base font-black text-amber-900">
                                {selectedStudent.scores.extended5TotalScore20} / 20.0
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {!selectedStudent.scores ? (
                        <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
                          Học sinh chưa hoàn thành bài tự đánh giá trong kỳ này.
                        </div>
                      ) : (
                        <>
                          {/* Điểm 5 phẩm chất */}
                          <div className="space-y-3">
                            {selectedStudent.scores.qualities.map((q: any) => (
                              <div
                                key={q.qualityCode}
                                className="rounded-xl border border-slate-200 p-3.5 text-xs"
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-teal-800">
                                    {q.qualityCode} - {q.qualityName}
                                  </span>
                                  <span className="text-sm font-black text-teal-800">
                                    {q.averageScore} / 4.0
                                  </span>
                                </div>
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  {q.criteriaScores.map((c: any) => (
                                    <div
                                      key={c.code}
                                      className="rounded-lg bg-slate-50 p-2 text-[11px]"
                                    >
                                      <span className="font-bold text-slate-700">{c.code}:</span>{' '}
                                      <strong className="text-teal-800">Mức {c.score}/4</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Tự nhìn nhận của học sinh */}
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                              <div className="font-extrabold text-emerald-900">
                                Điều em đã làm tốt & tự hào:
                              </div>
                              <p className="mt-1 text-slate-700">
                                {selectedStudent.achievementsText || 'Chưa ghi nhận'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                              <div className="font-extrabold text-amber-900">
                                Điều em cần cải thiện:
                              </div>
                              <p className="mt-1 text-slate-700">
                                {selectedStudent.improvementsText || 'Chưa ghi nhận'}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-xs">
                            <div className="font-extrabold text-teal-800">
                              Mục tiêu phát triển bản thân & Minh chứng:
                            </div>
                            <p className="mt-1 text-slate-800">
                              <strong>Mục tiêu:</strong> {selectedStudent.personalGoal || 'Chưa đặt mục tiêu'}
                            </p>
                            {selectedStudent.evidenceText && (
                              <p className="mt-1 text-slate-700">
                                <strong>Minh chứng:</strong> {selectedStudent.evidenceText}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setActiveTab('CVHT_ACCOMPANIMENT')}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#003B3A] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#003B3A]"
                            >
                              <Compass className="h-4 w-4" />
                              Chuyển sang Nhận xét & Kết nối CVHT cho học sinh này
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 4: ĐỐI CHIẾU ĐGNL ĐỊNH KỲ
               ===================================================================== */}
            {activeTab === 'DGNL_COMPARISON' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Đối chiếu Kết quả Tự đánh giá 5 Phẩm chất với ĐGNL Định kỳ
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Giúp GVCN nhận diện mức độ tương quan giữa nhận thức bản thân của học sinh và kết quả Đánh giá năng lực (ĐGNL) định kỳ trên hệ thống SSM.
                </p>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                        <th className="p-3">Học sinh</th>
                        <th className="p-3 text-center">Tự đánh giá IP2.1 (/16)</th>
                        <th className="p-3 text-center">Tự đánh giá (%)</th>
                        <th className="p-3 text-center">ĐTB ĐGNL Định kỳ (/10)</th>
                        <th className="p-3 text-center">Xếp loại ĐGNL</th>
                        <th className="p-3 text-center">Đối chiếu nhận thức</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.students.map((s: any) => {
                        const selfPct = s.scores?.ip21Percentage ?? null;
                        const dgnlPct =
                          s.dgnlSnapshot?.averageScore !== null &&
                          s.dgnlSnapshot?.averageScore !== undefined
                            ? s.dgnlSnapshot.averageScore * 10
                            : null;
                        const diff =
                          selfPct !== null && dgnlPct !== null ? Math.round(selfPct - dgnlPct) : null;

                        return (
                          <tr key={s.studentId} className="hover:bg-teal-50/40">
                            <td className="p-3 font-bold text-slate-900">
                              {s.fullName}{' '}
                              <span className="text-[11px] font-normal text-slate-500">
                                ({s.studentCode})
                              </span>
                            </td>
                            <td className="p-3 text-center font-extrabold text-teal-800">
                              {s.scores ? `${s.scores.ip21TotalScore16}/16` : 'Chưa nộp'}
                            </td>
                            <td className="p-3 text-center font-bold">
                              {selfPct !== null ? `${selfPct}%` : '—'}
                            </td>
                            <td className="p-3 text-center font-bold text-teal-800">
                              {s.dgnlSnapshot?.averageScore ?? 'Chưa có ĐGNL'}
                            </td>
                            <td className="p-3 text-center">
                              {s.dgnlSnapshot?.rankLabel || '—'}
                            </td>
                            <td className="p-3 text-center">
                              {diff === null ? (
                                <span className="text-slate-400">Chưa đủ dữ liệu đối chiếu</span>
                              ) : Math.abs(diff) <= 12 ? (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                                  Tự nhận thức sát thực tế (Δ {diff > 0 ? `+${diff}` : diff}%)
                                </span>
                              ) : diff > 12 ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                                  Tự đánh giá cao hơn ĐGNL (+{diff}%)
                                </span>
                              ) : (
                                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-bold text-teal-800">
                                  Khiêm tốn / Cần khích lệ ({diff}%)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 5: PRIDE NPS LỚP (ẨN DANH TUYỆT ĐỐI KHI ĐẠT NGƯỠNG BẢO MẬT)
               ===================================================================== */}
            {activeTab === 'CLASS_PRIDE_NPS' && (
              <div className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold text-teal-800">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      CHỈ HIỂN THỊ TỔNG HỢP ẨN DANH
                    </span>
                    <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                      Chỉ số Pride NPS Lớp {data.selectedClass.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      Theo quy định bảo mật của Sky-Line, phản hồi Pride NPS không gắn với danh tính học sinh và chỉ hiển thị khi lớp có từ{' '}
                      <strong>{data.classPrideNps.minAnonymityThreshold}</strong> phản hồi trở lên.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#003B3A] px-6 py-4 text-center text-white">
                    <div className="text-[11px] uppercase text-teal-700">Pride NPS Lớp</div>
                    <div className="mt-1 text-3xl font-black text-amber-300">
                      {data.classPrideNps.isAnonymityMet
                        ? (data.classPrideNps.npsScore ?? 0) > 0
                          ? `+${data.classPrideNps.npsScore}`
                          : data.classPrideNps.npsScore
                        : 'Đang ẩn bảo mật'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-teal-700">
                      Số phản hồi: {data.classPrideNps.totalResponses}
                    </div>
                  </div>
                </div>

                {!data.classPrideNps.isAnonymityMet ? (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Lock className="h-4 w-4" />
                      Bảo vệ tính ẩn danh học sinh ({data.classPrideNps.totalResponses}/
                      {data.classPrideNps.minAnonymityThreshold} phản hồi)
                    </div>
                    <p className="mt-1">
                      Lớp cần thêm tối thiểu{' '}
                      <strong>
                        {data.classPrideNps.minAnonymityThreshold - data.classPrideNps.totalResponses}
                      </strong>{' '}
                      lượt phản hồi khảo sát Tự hào Sky-Line để mở khóa báo cáo tổng hợp ẩn danh.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="font-extrabold text-emerald-900">
                          Promoters (9–10): {data.classPrideNps.promoterPct}%
                        </div>
                        <div className="mt-1 text-emerald-700">
                          {data.classPrideNps.promotersCount} học sinh tự hào & lan tỏa tích cực
                        </div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="font-extrabold text-amber-900">
                          Passives (7–8): {data.classPrideNps.passivePct}%
                        </div>
                        <div className="mt-1 text-amber-700">
                          {data.classPrideNps.passivesCount} học sinh hài lòng trung lập
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <div className="font-extrabold text-rose-900">
                          Detractors (0–6): {data.classPrideNps.detractorPct}%
                        </div>
                        <div className="mt-1 text-rose-700">
                          {data.classPrideNps.detractorsCount} học sinh cần lắng nghe thêm
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                TAB 6: PHẢN HỒI VÀ ĐỒNG HÀNH CVHT
               ===================================================================== */}
            {activeTab === 'CVHT_ACCOMPANIMENT' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Danh sách học sinh bên trái */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Chọn Học sinh để Nhận xét & Gắn mục tiêu CVHT
                  </h3>
                  <div className="mt-3 max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
                    {data.students.map((s: any) => {
                      const active = s.studentId === selectedStudent?.studentId;
                      return (
                        <button
                          key={s.studentId}
                          type="button"
                          onClick={() => handleSelectStudentForDetail(s)}
                          className={`flex w-full items-center justify-between rounded-xl p-3 text-left text-xs transition ${
                            active
                              ? 'bg-[#003B3A] text-white'
                              : 'bg-slate-50 text-slate-800 hover:bg-teal-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{s.fullName}</div>
                            <div className="text-[10px] opacity-75">
                              {s.gvcnFeedback ? '✓ Đã nhận xét' : 'Chưa nhận xét'} •{' '}
                              {s.cvhtLinkedGoal ? '✓ Đã gắn CVHT' : 'Chưa gắn CVHT'}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Khu vực nhập nhận xét GVCN & Kết nối CVHT */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                  {selectedStudent ? (
                    <div className="space-y-5">
                      <div className="border-b border-slate-200 pb-3">
                        <h2 className="text-lg font-extrabold text-teal-800">
                          Đồng hành CVHT cùng học sinh: {selectedStudent.fullName}
                        </h2>
                        <p className="text-xs text-slate-500">
                          Mục tiêu tự đặt của học sinh:{' '}
                          <strong className="text-slate-800">
                            {selectedStudent.personalGoal || 'Học sinh chưa nhập mục tiêu cá nhân'}
                          </strong>
                        </p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-extrabold text-slate-800">
                          1. Nhận xét, khích lệ & định hướng của GVCN
                        </label>
                        <textarea
                          rows={3}
                          value={feedbackDraft}
                          onChange={(e) => setFeedbackDraft(e.target.value)}
                          placeholder="Nhập lời nhận xét đồng hành của GVCN dành cho bản tự nhìn nhận của học sinh..."
                          className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-teal-400 focus:outline-none"
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleSaveGvcnFeedback}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#003B3A] disabled:opacity-50"
                          >
                            <MessageSquareHeart className="h-4 w-4" />
                            Lưu nhận xét của GVCN
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5">
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-teal-900">
                          <Link2 className="h-4 w-4" />
                          2. Kết nối trực tiếp vào Hồ sơ Mục tiêu Cố vấn Học tập (CVHT)
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Tạo hoặc cập nhật mục tiêu chính thức trong Sổ tay Cố vấn Học tập (`StudentGoal` & `AcademicConsultationLog`) để tam giác Gia đình – Nhà trường – Học sinh cùng theo dõi.
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                          <div>
                            <label className="mb-1 block font-bold text-slate-700">Nhóm mục tiêu CVHT</label>
                            <select
                              value={cvhtCategory}
                              onChange={(e) => setCvhtCategory(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold"
                            >
                              <option value="RÈN LUYỆN PHẨM CHẤT SKL">Rèn luyện Phẩm chất SKL</option>
                              <option value="HỌC TẬP & TỰ CHỦ">Học tập & Tự chủ</option>
                              <option value="KỸ NĂNG & CỘNG ĐỒNG">Kỹ năng & Cộng đồng</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1 block font-bold text-slate-700">
                              Nội dung mục tiêu cam kết trên CVHT
                            </label>
                            <input
                              type="text"
                              value={cvhtGoalText}
                              onChange={(e) => setCvhtGoalText(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold"
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          {selectedStudent.cvhtLinkedGoal ? (
                            <span className="text-xs font-bold text-emerald-700">
                              ✓ Đã kết nối mục tiêu CVHT ({selectedStudent.cvhtLinkedGoal.status})
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Chưa gắn vào sổ CVHT</span>
                          )}

                          <button
                            type="button"
                            onClick={handleConnectCvhtGoal}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-teal-800 disabled:opacity-50"
                          >
                            <Compass className="h-4 w-4" />
                            Kết nối & Đồng bộ sang CVHT
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
