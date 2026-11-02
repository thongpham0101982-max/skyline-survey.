'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Flag,
  Heart,
  Lock,
  MessageSquareHeart,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { SkylineFlagMascot } from '@/components/reflection-pride/SkylineFlagMascot';

const SEVEN_STEPS = [
  { step: 1, title: '1. Tổng hợp SSM', subtitle: 'Kết quả học tập & rèn luyện' },
  { step: 2, title: '2. Nhìn lại bản thân', subtitle: 'Việc làm được & cần cải thiện' },
  { step: 3, title: '3. Tự đánh giá 5 Phẩm chất', subtitle: 'Đánh giá theo 14 tiêu chí' },
  { step: 4, title: '4. Minh chứng & Nhận xét', subtitle: 'Bổ sung minh chứng thực tế' },
  { step: 5, title: '5. Mục tiêu phát triển', subtitle: 'Cam kết rèn luyện mới' },
  { step: 6, title: '6. Hoàn thành tự nhìn nhận', subtitle: 'Gửi bản tự nhìn nhận chính thức' },
  { step: 7, title: '7. Phản hồi Pride NPS', subtitle: 'Khảo sát Tự hào Sky-Line ẩn danh' },
];

export default function StudentGrowthJourneyReflectionPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [payload, setPayload] = useState<any>(null);

  // State biểu mẫu Tự nhìn nhận (Bước 2 -> Bước 6)
  const [achievementsText, setAchievementsText] = useState<string>('');
  const [improvementsText, setImprovementsText] = useState<string>('');
  const [highlightTags, setHighlightTags] = useState<string[]>([]);
  const [criteriaRatings, setCriteriaRatings] = useState<Record<string, { score: number; note?: string }>>({});
  const [evidenceText, setEvidenceText] = useState<string>('');
  const [studentComment, setStudentComment] = useState<string>('');
  const [personalGoal, setPersonalGoal] = useState<string>('');

  // State biểu mẫu Khảo sát Pride NPS riêng biệt (Bước 7)
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsReasons, setNpsReasons] = useState<string[]>([]);
  const [npsProudMoments, setNpsProudMoments] = useState<string>('');
  const [npsImprovementIdeas, setNpsImprovementIdeas] = useState<string>('');
  const [npsSubmittedLocal, setNpsSubmittedLocal] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchStudentJourney = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reflection-pride/student', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể tải dữ liệu Hành trình trưởng thành.');
      }
      setPayload(json);

      if (json.reflection) {
        setAchievementsText(json.reflection.achievementsText || '');
        setImprovementsText(json.reflection.improvementsText || '');
        setHighlightTags(Array.isArray(json.reflection.highlightTags) ? json.reflection.highlightTags : []);

        const normalizedRatings: Record<string, { score: number; note?: string }> = {};
        const rawMap = json.reflection.criteriaRatings || {};
        Object.keys(rawMap).forEach((k) => {
          const val = rawMap[k];
          if (typeof val === 'number') {
            normalizedRatings[k] = { score: val };
          } else if (val && typeof val === 'object' && val.score) {
            normalizedRatings[k] = { score: Number(val.score), note: val.note || '' };
          }
        });
        setCriteriaRatings(normalizedRatings);
        setEvidenceText(json.reflection.evidenceText || '');
        setStudentComment(json.reflection.studentComment || '');
        setPersonalGoal(json.reflection.personalGoal || '');

        if (json.reflection.status === 'SUBMITTED') {
          setCurrentStep(json.hasSubmittedPrideNps ? 6 : 7);
        }
      }
      if (json.hasSubmittedPrideNps) {
        setNpsSubmittedLocal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentJourney();
  }, [fetchStudentJourney]);

  // Tính số tiêu chí đã đánh giá trên tổng số 14 tiêu chí
  const ratedCriteriaCount = useMemo(() => {
    return Object.values(criteriaRatings).filter((v) => v && [1, 2, 3, 4].includes(v.score)).length;
  }, [criteriaRatings]);

  const isPeriodOpen = payload?.activePeriod?.status === 'OPEN';
  const isAlreadySubmitted = payload?.reflection?.status === 'SUBMITTED';

  // Lưu bản nháp
  const handleSaveDraft = async () => {
    if (!payload?.activePeriod?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reflection-pride/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_DRAFT',
          periodId: payload.activePeriod.id,
          achievementsText,
          improvementsText,
          highlightTags,
          criteriaRatings,
          evidenceText,
          studentComment,
          personalGoal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể lưu nháp.');
      showToast('success', 'Đã lưu bản nháp tự nhìn nhận!');
      await fetchStudentJourney();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Hoàn thành & Nộp bản tự nhìn nhận chính thức (Bước 6)
  const handleSubmitReflection = async () => {
    if (!payload?.activePeriod?.id) return;
    if (ratedCriteriaCount < 14) {
      showToast(
        'error',
        `Bạn mới đánh giá ${ratedCriteriaCount}/14 tiêu chí. Vui lòng hoàn thành đủ 14 tiêu chí ở Bước 3 trước khi nộp nhé!`
      );
      setCurrentStep(3);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/reflection-pride/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_REFLECTION',
          periodId: payload.activePeriod.id,
          achievementsText,
          improvementsText,
          highlightTags,
          criteriaRatings,
          evidenceText,
          studentComment,
          personalGoal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể hoàn thành bản tự nhìn nhận.');
      showToast('success', json.message);
      await fetchStudentJourney();
      setCurrentStep(7);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Gửi khảo sát Pride NPS ẩn danh riêng biệt (Bước 7)
  const handleSubmitPrideNps = async () => {
    if (!payload?.activePeriod?.id) return;
    if (npsScore === null || npsScore < 0 || npsScore > 10) {
      showToast('error', 'Vui lòng chọn điểm từ 0 đến 10 cho mức độ Tự hào Sky-Line của bạn.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/reflection-pride/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_PRIDE_NPS',
          periodId: payload.activePeriod.id,
          score: npsScore,
          reasons: npsReasons,
          proudMoments: npsProudMoments,
          improvementIdeas: npsImprovementIdeas,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể gửi phản hồi Pride NPS.');
      showToast('success', json.message);
      setNpsSubmittedLocal(true);
      await fetchStudentJourney();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
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

      {/* HEADER HÀNH TRÌNH TRƯỞNG THÀNH SKY-LINE */}
      <div
        className="border-b border-purple-900/20 text-white shadow-md"
        style={{
          background: 'linear-gradient(135deg, #2E1065 0%, #5B2D8B 58%, #00A19A 100%)',
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/hocsinh/portal"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay về Cổng Học sinh
            </Link>

            {payload?.student && (
              <div className="flex items-center gap-2 text-xs font-bold text-purple-100">
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-white">
                  {payload.student.fullName} ({payload.student.studentCode})
                </span>
                <span className="rounded-lg bg-amber-400 px-2.5 py-1 text-purple-950">
                  Lớp {payload.student.className || payload.student.gradeLevel}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Hành trình Trưởng thành Sky-Line & Tự hào Sky-Liners
            </h1>
            <p className="mt-1 text-sm text-purple-100/90">
              Nhìn lại kết quả rèn luyện, tự đánh giá 5 phẩm chất theo 14 tiêu chí, đặt mục tiêu phát triển bản thân và chia sẻ tiếng nói Pride NPS ẩn danh.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white p-6 shadow-sm" />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            <strong>Thông báo:</strong> {error}
          </div>
        ) : payload && !payload.eligible ? (
          /* Trường hợp học sinh không thuộc Khối 4–12 */
          <SkylineFlagMascot
            variant="locked"
            badgeText="CHỈ ÁP DỤNG KHỐI 4–12"
            title="Phân hệ Hành trình trưởng thành áp dụng cho Học sinh Khối 4 đến Khối 12"
            message={
              payload.ineligibleReason ||
              'Chương trình Tự nhìn nhận 5 Phẩm chất & Khảo sát Tự hào Sky-Line hiện được thiết kế riêng cho học sinh từ Khối 4 đến Khối 12.'
            }
          />
        ) : payload && !payload.hasOpenTask && !payload.activePeriod ? (
          /* Trường hợp Admin chưa mở kỳ khảo sát */
          <SkylineFlagMascot
            variant="locked"
            badgeText="CHƯA MỞ KỲ KHẢO SÁT"
            title="Hiện tại Nhà trường chưa mở kỳ Tự nhìn nhận 5 Phẩm chất mới"
            message="Khi Ban Khảo thí & Đảm bảo Chất lượng (Admin) mở kỳ khảo sát mới cho khối lớp của bạn, Linh vật Sky-Line cầm cờ sẽ thông báo nhiệm vụ mới tại đây!"
          />
        ) : payload && payload.activePeriod ? (
          <div className="space-y-6">
            {/* LINH VẬT SKY-LINE CẦM CỜ HƯỚNG DẪN & THÔNG BÁO TRẠNG THÁI */}
            <SkylineFlagMascot
              variant={
                isAlreadySubmitted
                  ? 'celebration'
                  : isPeriodOpen
                  ? 'notification'
                  : 'locked'
              }
              badgeText={
                isAlreadySubmitted
                  ? `ĐÃ HOÀN THÀNH • ${payload.activePeriod.title}`
                  : isPeriodOpen
                  ? `KỲ ĐANG MỞ • HẠN NỘP: ${new Date(payload.activePeriod.endDate).toLocaleDateString('vi-VN')}`
                  : `TRẠNG THÁI KỲ: ${payload.activePeriod.status}`
              }
              title={
                isAlreadySubmitted
                  ? 'Tuyệt vời! Bạn đã hoàn thành Bản tự nhìn nhận 5 Phẩm chất Sky-Line!'
                  : payload.activePeriod.title
              }
              message={
                payload.activePeriod.guidelineMascotMsg ||
                'Hãy cùng Linh vật Sky-Line cầm cờ đi qua 7 bước hành trình trưởng thành: nhìn lại kết quả SSM, tự đánh giá 5 phẩm chất (14 tiêu chí), đặt mục tiêu mới và phản hồi Pride NPS ẩn danh nhé!'
              }
            />

            {/* THANH TIẾN TRÌNH 7 BƯỚC */}
            <div className="overflow-x-auto rounded-2xl border border-purple-200 bg-white p-3 shadow-sm">
              <div className="flex min-w-[780px] items-center justify-between gap-2">
                {SEVEN_STEPS.map((s) => {
                  const active = currentStep === s.step;
                  const completed =
                    (s.step < 6 && isAlreadySubmitted) ||
                    (s.step === 6 && isAlreadySubmitted) ||
                    (s.step === 7 && npsSubmittedLocal);

                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setCurrentStep(s.step)}
                      className={`flex flex-1 flex-col rounded-xl p-2.5 text-left transition ${
                        active
                          ? 'bg-purple-900 text-white shadow'
                          : completed
                          ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold">{s.title}</span>
                        {completed && (
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${
                              active ? 'text-amber-300' : 'text-emerald-600'
                            }`}
                          />
                        )}
                      </div>
                      <span
                        className={`mt-0.5 text-[10px] ${
                          active ? 'text-purple-200' : 'text-slate-500'
                        }`}
                      >
                        {s.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* =====================================================================
                BƯỚC 1: XEM KẾT QUẢ HỌC TẬP VÀ RÈN LUYỆN ĐƯỢC SSM TỔNG HỢP
               ===================================================================== */}
            {currentStep === 1 && (
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <span className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-extrabold text-purple-900">
                      BƯỚC 1 / 7 • DỮ LIỆU TỔNG HỢP TỪ HỆ THỐNG SSM
                    </span>
                    <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                      Bức tranh Kết quả Học tập & Rèn luyện của Bạn trên SSM
                    </h2>
                    <p className="text-xs text-slate-500">
                      Hệ thống SSM tự động tổng hợp dữ liệu Đánh giá năng lực (ĐGNL), chuyên cần và mục tiêu CVHT để bạn có căn cứ nhìn lại chính mình.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-purple-900">
                      <BookOpen className="h-4 w-4" />
                      1. Kết quả ĐGNL Định kỳ
                    </div>
                    <div className="mt-3 text-2xl font-black text-purple-950">
                      {payload.ssmSnapshot?.dgnl?.averageScore !== null &&
                      payload.ssmSnapshot?.dgnl?.averageScore !== undefined
                        ? `${payload.ssmSnapshot.dgnl.averageScore} / 10`
                        : 'Đang cập nhật'}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Xếp loại: <strong>{payload.ssmSnapshot?.dgnl?.rankLabel || '—'}</strong> •{' '}
                      {payload.ssmSnapshot?.dgnl?.examCount || 0} môn ghi nhận
                    </p>
                  </div>

                  <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-teal-900">
                      <Clock className="h-4 w-4" />
                      2. Chuyên cần & Rèn luyện
                    </div>
                    <div className="mt-3 text-2xl font-black text-teal-950">
                      {payload.ssmSnapshot?.attendance?.attendanceRatePct ?? 100}%
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Có mặt: {payload.ssmSnapshot?.attendance?.presentCount || 0} buổi • Đi muộn:{' '}
                      {payload.ssmSnapshot?.attendance?.lateCount || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-amber-900">
                      <Compass className="h-4 w-4" />
                      3. Mục tiêu Cố vấn Học tập (CVHT)
                    </div>
                    <div className="mt-3 text-2xl font-black text-amber-950">
                      {payload.ssmSnapshot?.advisoryGoals?.length || 0} mục tiêu
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Đồng hành cùng GVCN trong năm học
                    </p>
                  </div>
                </div>

                {/* Chi tiết điểm các môn ĐGNL nếu có */}
                {payload.ssmSnapshot?.dgnl?.subjects?.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-xs font-extrabold uppercase text-slate-600">
                      Điểm thành phần các môn ĐGNL gần nhất
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {payload.ssmSnapshot.dgnl.subjects.map((sub: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-slate-50 p-2.5 text-xs">
                          <div className="font-bold text-slate-700">{sub.subjectName}</div>
                          <div className="mt-0.5 text-sm font-black text-purple-900">
                            {sub.totalScore} điểm
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-800 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-purple-900"
                  >
                    Tiếp tục Bước 2: Nhìn lại việc đã làm được & cần cải thiện
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                BƯỚC 2: NHÌN LẠI NHỮNG VIỆC ĐÃ LÀM ĐƯỢC VÀ ĐIỀU CẦN CẢI THIỆN
               ===================================================================== */}
            {currentStep === 2 && (
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <span className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-extrabold text-purple-900">
                    BƯỚC 2 / 7 • TỰ NHÌN NHẬN HÀNH TRÌNH QUA
                  </span>
                  <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                    Nhìn lại những việc Bạn đã làm được và điều cần cải thiện
                  </h2>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold text-slate-800">
                    Chọn các dấu ấn nổi bật của bạn trong học kỳ này:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {payload.catalog?.highlightTags?.map((tag: string) => {
                      const active = highlightTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setHighlightTags(highlightTags.filter((t) => t !== tag));
                            } else {
                              setHighlightTags([...highlightTags, tag]);
                            }
                          }}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                            active
                              ? 'bg-purple-800 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-purple-50'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-extrabold text-emerald-900">
                      1. Những việc em đã làm tốt và cảm thấy tự hào nhất:
                    </label>
                    <textarea
                      rows={4}
                      value={achievementsText}
                      onChange={(e) => setAchievementsText(e.target.value)}
                      placeholder="Ví dụ: Em đã chủ động hoàn thành bài tập đúng hạn, tích cực hỗ trợ bạn trong nhóm dự án STEM..."
                      className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-purple-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-extrabold text-amber-900">
                      2. Những điều em nhận thấy bản thân cần cải thiện thêm:
                    </label>
                    <textarea
                      rows={4}
                      value={improvementsText}
                      onChange={(e) => setImprovementsText(e.target.value)}
                      placeholder="Ví dụ: Em cần quản lý thời gian tự học buổi tối tốt hơn và mạnh dạn phát biểu hơn trong giờ Tiếng Anh..."
                      className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-purple-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại Bước 1
                  </button>

                  <div className="flex items-center gap-2">
                    {isPeriodOpen && (
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-900"
                      >
                        <Save className="h-4 w-4" />
                        Lưu nháp
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-800 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-purple-900"
                    >
                      Tiếp tục Bước 3: Tự đánh giá 5 Phẩm chất (14 tiêu chí)
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                BƯỚC 3: TỰ ĐÁNH GIÁ 5 PHẨM CHẤT THEO 14 TIÊU CHÍ
               ===================================================================== */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
                  <div>
                    <span className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-extrabold text-purple-900">
                      BƯỚC 3 / 7 • TỰ ĐÁNH GIÁ 5 PHẨM CHẤT THEO 14 TIÊU CHÍ
                    </span>
                    <h2 className="mt-1.5 text-lg font-extrabold text-slate-900">
                      Chọn mức độ phù hợp nhất với hành vi thực tế của bạn (Mức 1 → Mức 4)
                    </h2>
                  </div>
                  <div className="rounded-xl bg-purple-950 px-4 py-2.5 text-center text-white">
                    <div className="text-[10px] uppercase text-purple-200">Tiến độ đánh giá</div>
                    <div className="text-lg font-black text-amber-300">
                      {ratedCriteriaCount} / 14 tiêu chí
                    </div>
                  </div>
                </div>

                {payload.catalog?.qualities?.map((q: any) => (
                  <div
                    key={q.code}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div
                      className={`px-6 py-4 text-white ${
                        q.includedInOfficialIp21
                          ? 'bg-purple-950'
                          : 'bg-gradient-to-r from-amber-500 to-teal-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-black">
                            {q.code}
                          </span>
                          <h3 className="text-base font-extrabold">{q.name}</h3>
                          <span className="text-xs opacity-80">({q.englishName})</span>
                        </div>
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">
                          {q.includedInOfficialIp21
                            ? 'Phẩm chất cốt lõi (KPI IP2.1)'
                            : 'Phẩm chất Tự hào Sky-Line mở rộng'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/85">{q.description}</p>
                    </div>

                    <div className="divide-y divide-slate-100 p-5">
                      {q.criteria.map((crit: any) => {
                        const selectedScore = criteriaRatings[crit.code]?.score || 0;
                        return (
                          <div key={crit.code} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-900">
                                  {crit.code}
                                </span>
                                <span className="ml-2 text-sm font-extrabold text-slate-900">
                                  {crit.shortName}
                                </span>
                                <p className="mt-1 text-xs text-slate-600">{crit.statement}</p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                              {[1, 2, 3, 4].map((lv) => {
                                const active = selectedScore === lv;
                                const levelName =
                                  lv === 1
                                    ? 'Mức 1: Cần đồng hành'
                                    : lv === 2
                                    ? 'Mức 2: Đang rèn luyện'
                                    : lv === 3
                                    ? 'Mức 3: Vững vàng (Đạt)'
                                    : 'Mức 4: Lan tỏa (Xuất sắc)';
                                return (
                                  <button
                                    key={lv}
                                    type="button"
                                    onClick={() =>
                                      setCriteriaRatings({
                                        ...criteriaRatings,
                                        [crit.code]: {
                                          ...criteriaRatings[crit.code],
                                          score: lv,
                                        },
                                      })
                                    }
                                    className={`flex flex-col justify-between rounded-xl border p-3 text-left text-xs transition ${
                                      active
                                        ? 'border-purple-700 bg-purple-900 text-white shadow-md ring-2 ring-purple-400'
                                        : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-purple-300 hover:bg-purple-50/50'
                                    }`}
                                  >
                                    <div className="font-extrabold">{levelName}</div>
                                    <p
                                      className={`mt-1 text-[11px] leading-snug ${
                                        active ? 'text-purple-100' : 'text-slate-500'
                                      }`}
                                    >
                                      {crit.rubric[lv]}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại Bước 2
                  </button>
                  <div className="flex items-center gap-2">
                    {isPeriodOpen && (
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-900"
                      >
                        <Save className="h-4 w-4" />
                        Lưu nháp ({ratedCriteriaCount}/14)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-800 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-purple-900"
                    >
                      Tiếp tục Bước 4: Bổ sung minh chứng & nhận xét
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                BƯỚC 4: BỔ SUNG MINH CHỨNG VÀ NHẬN XÉT
               ===================================================================== */}
            {currentStep === 4 && (
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <span className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-extrabold text-purple-900">
                    BƯỚC 4 / 7 • MINH CHỨNG THỰC TẾ & TỰ NHẬN XÉT
                  </span>
                  <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                    Bổ sung Minh chứng và Tự nhận xét của Bản thân
                  </h2>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-800">
                    1. Minh chứng cụ thể cho các phẩm chất bạn đã rèn luyện (hoạt động, sản phẩm học tập, giải thưởng, việc tốt...):
                  </label>
                  <textarea
                    rows={4}
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    placeholder="Ví dụ: Tham gia dự án thiện nguyện mùa xuân, đạt giải Nhì Olympic Tiếng Anh cấp trường, hoàn thành 100% nhiệm vụ nhóm..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-purple-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-800">
                    2. Lời tự nhận xét chung hoặc tâm tư muốn gửi tới Thầy/Cô GVCN:
                  </label>
                  <textarea
                    rows={3}
                    value={studentComment}
                    onChange={(e) => setStudentComment(e.target.value)}
                    placeholder="Chia sẻ cảm nhận của bạn về sự trưởng thành của bản thân trong học kỳ qua..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-purple-700 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại Bước 3
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-800 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-purple-900"
                  >
                    Tiếp tục Bước 5: Xác định mục tiêu phát triển bản thân
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                BƯỚC 5: XÁC ĐỊNH MỤC TIÊU PHÁT TRIỂN BẢN THÂN
               ===================================================================== */}
            {currentStep === 5 && (
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <span className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-extrabold text-purple-900">
                    BƯỚC 5 / 7 • MỤC TIÊU PHÁT TRIỂN BẢN THÂN & KẾT NỐI CVHT
                  </span>
                  <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                    Xác định Mục tiêu Phát triển Bản thân trong Giai đoạn tới
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Mục tiêu này sẽ được gửi tới GVCN để đồng hành cùng bạn trong Sổ tay Cố vấn Học tập (CVHT).
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-purple-950">
                    Mục tiêu hành động cụ thể của bạn:
                  </label>
                  <textarea
                    rows={4}
                    value={personalGoal}
                    onChange={(e) => setPersonalGoal(e.target.value)}
                    placeholder="Ví dụ: Rèn luyện phẩm chất Tự chủ (dậy sớm đọc sách 20 phút/ngày) và nâng điểm ĐGNL môn Toán lên từ 8.5 trở lên..."
                    className="w-full rounded-xl border border-purple-300 bg-purple-50/30 p-3.5 text-xs focus:border-purple-700 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại Bước 4
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(6)}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-800 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-purple-900"
                  >
                    Tiếp tục Bước 6: Kiểm tra & Hoàn thành bản tự nhìn nhận
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                BƯỚC 6: HOÀN THÀNH BẢN TỰ NHÌN NHẬN
               ===================================================================== */}
            {currentStep === 6 && (
              <div className="space-y-6 rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-900">
                      BƯỚC 6 / 7 • HOÀN THÀNH BẢN TỰ NHÌN NHẬN
                    </span>
                    <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                      Tổng kết Bản Tự nhìn nhận 5 Phẩm chất Sky-Line
                    </h2>
                  </div>

                  {isPeriodOpen && (
                    <button
                      type="button"
                      onClick={handleSubmitReflection}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isAlreadySubmitted
                        ? 'Cập nhật lại Bản tự nhìn nhận'
                        : 'Xác nhận Hoàn thành Bản tự nhìn nhận'}
                    </button>
                  )}
                </div>

                {/* Hiển thị kết quả tính toán từ server nếu đã lưu/nộp */}
                {payload.reflection?.scores && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 text-center">
                      <div className="text-xs font-bold text-purple-900">
                        Điểm 4 Phẩm chất cốt lõi (IP2.1)
                      </div>
                      <div className="mt-1 text-2xl font-black text-purple-950">
                        {payload.reflection.scores.ip21TotalScore16} / 16.0
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-purple-700">
                        {payload.reflection.scores.ip21LevelLabel} ({payload.reflection.scores.ip21Percentage}%)
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-center">
                      <div className="text-xs font-bold text-amber-900">
                        Tổng điểm 5 Phẩm chất mở rộng
                      </div>
                      <div className="mt-1 text-2xl font-black text-amber-950">
                        {payload.reflection.scores.extended5TotalScore20} / 20.0
                      </div>
                      <div className="mt-0.5 text-xs text-amber-800">
                        Tự hào Sky-Line: {payload.reflection.scores.prideQualityScore4}/4.0
                      </div>
                    </div>

                    <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 text-center">
                      <div className="text-xs font-bold text-teal-900">Phản hồi từ GVCN</div>
                      <div className="mt-1 text-xs font-semibold text-slate-800">
                        {payload.reflection.gvcnFeedback || 'GVCN đang theo dõi và sẽ sớm gửi lời nhận xét đồng hành cùng bạn.'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-indigo-200 bg-indigo-950 p-5 text-white">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-950">
                        BƯỚC TIẾP THEO • KHẢO SÁT ĐỘC LẬP & ẨN DANH
                      </span>
                      <h3 className="mt-1.5 text-base font-extrabold">
                        Bước 7: Mời bạn chia sẻ cảm nhận Tự hào Sky-Line (Pride NPS)
                      </h3>
                      <p className="mt-0.5 text-xs text-indigo-200">
                        Khảo sát hoàn toàn ẩn danh, tách biệt với hồ sơ cá nhân và không ảnh hưởng tới kết quả xếp loại phẩm chất của bạn.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(7)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-purple-950 shadow hover:bg-amber-300"
                    >
                      Mở Khảo sát Pride NPS (Bước 7)
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                BƯỚC 7: ĐƯỢC MỜI PHẢN HỒI PRIDE NPS RIÊNG BIỆT (ẨN DANH 100%)
               ===================================================================== */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <SkylineFlagMascot
                  variant="guide"
                  badgeText="BƯỚC 7 / 7 • KHẢO SÁT PRIDE NPS ĐỘC LẬP & ẨN DANH"
                  title="Tiếng nói Tự hào Sky-Line của Bạn (Pride NPS)"
                  message="Câu trả lời của bạn được mã hóa một chiều (SHA-256) hoàn toàn ẩn danh. Không ai (kể cả GVCN hay Admin) biết điểm số này thuộc về cá nhân nào, và điểm NPS tuyệt đối không dùng để xếp loại phẩm chất học sinh."
                />

                {npsSubmittedLocal ? (
                  <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="mt-3 text-xl font-extrabold text-slate-900">
                      Cảm ơn bạn đã gửi phản hồi Tự hào Sky-Line (Pride NPS)!
                    </h3>
                    <p className="mx-auto mt-1 max-w-xl text-xs text-slate-600">
                      Ý kiến ẩn danh của bạn đã được ghi nhận an toàn để giúp Nhà trường không ngừng nâng cao chất lượng trải nghiệm học đường tại Sky-Line.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
                    <div>
                      <label className="block text-sm font-extrabold text-slate-900">
                        1. Trên thang điểm từ 0 đến 10, bạn sẵn sàng giới thiệu trường Sky-Line với bạn bè và người thân ở mức độ nào? *
                      </label>
                      <p className="mt-0.5 text-xs text-slate-500">
                        (0 = Hoàn toàn chưa sẵn sàng • 7–8 = Hài lòng • 9–10 = Rất tự hào & Sẵn sàng lan tỏa)
                      </p>

                      <div className="mt-4 grid grid-cols-11 gap-1.5 sm:gap-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const selected = npsScore === num;
                          const colorClass =
                            num >= 9
                              ? selected
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                              : num >= 7
                              ? selected
                                ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                              : selected
                              ? 'bg-rose-600 text-white ring-2 ring-rose-300'
                              : 'bg-rose-50 text-rose-900 hover:bg-rose-100';

                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setNpsScore(num)}
                              className={`rounded-xl py-3 text-center text-sm font-black transition ${colorClass}`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-extrabold text-slate-800">
                        2. Điều gì làm bạn tự hào hoặc yêu thích nhất khi là học sinh Sky-Line?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {payload.catalog?.prideNpsDrivers?.map((d: any) => {
                          const active = npsReasons.includes(d.code);
                          return (
                            <button
                              key={d.code}
                              type="button"
                              onClick={() =>
                                setNpsReasons(
                                  active
                                    ? npsReasons.filter((x) => x !== d.code)
                                    : [...npsReasons, d.code]
                                )
                              }
                              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                                active
                                  ? 'bg-indigo-900 text-white shadow'
                                  : 'bg-slate-100 text-slate-700 hover:bg-indigo-50'
                              }`}
                            >
                              {active ? '✓ ' : '+ '}
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-extrabold text-slate-800">
                          3. Khoảnh khắc khiến bạn tự hào nhất tại Sky-Line (Ẩn danh):
                        </label>
                        <textarea
                          rows={3}
                          value={npsProudMoments}
                          onChange={(e) => setNpsProudMoments(e.target.value)}
                          placeholder="Chia sẻ điều bạn yêu thích nhất về thầy cô, bạn bè, hoạt động tại trường..."
                          className="w-full rounded-xl border border-slate-300 p-3 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-extrabold text-slate-800">
                          4. Điều bạn mong muốn nhà trường lắng nghe và cải thiện thêm (Ẩn danh):
                        </label>
                        <textarea
                          rows={3}
                          value={npsImprovementIdeas}
                          onChange={(e) => setNpsImprovementIdeas(e.target.value)}
                          placeholder="Đề xuất của bạn để trường Sky-Line ngày càng tuyệt vời hơn..."
                          className="w-full rounded-xl border border-slate-300 p-3 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={handleSubmitPrideNps}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-900 px-6 py-3 text-xs font-extrabold text-white shadow-lg hover:bg-indigo-950 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4 text-amber-300" />
                        Gửi Phản hồi Pride NPS Ẩn danh
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
