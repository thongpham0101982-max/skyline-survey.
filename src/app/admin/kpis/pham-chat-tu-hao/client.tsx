'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Flag,
  GraduationCap,
  Heart,
  Layers,
  Lock,
  Megaphone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Unlock,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { SkylineFlagMascot } from '@/components/reflection-pride/SkylineFlagMascot';

type AdminTab =
  | 'OVERVIEW'
  | 'QUALITIES'
  | 'PRIDE_NPS'
  | 'CLASSES'
  | 'COMPARISON'
  | 'PERIODS'
  | 'REPORTS';

interface CriterionStat {
  code: string;
  shortName: string;
  statement: string;
  avgScore4: number;
  percentage: number;
  passRatePct: number;
  ratedCount: number;
  distribution: Record<number, number>;
}

interface QualityStat {
  code: string;
  name: string;
  englishName: string;
  includedInOfficialIp21: boolean;
  avgScore4: number;
  percentage: number;
  passRatePct: number;
  ratedCount: number;
  criteria: CriterionStat[];
}

interface NpsSummaryData {
  totalResponses: number;
  minAnonymityThreshold: number;
  isAnonymityMet: boolean;
  promotersCount: number | null;
  passivesCount: number | null;
  detractorsCount: number | null;
  promoterPct: number | null;
  passivePct: number | null;
  detractorPct: number | null;
  npsScore: number | null;
  averageScore10: number | null;
  scoreDistribution: Record<number, number> | null;
  topReasons: Array<{ code: string; label: string; count: number; pct: number }>;
  anonymizedComments: Array<{
    group: 'PROMOTER' | 'PASSIVE' | 'DETRACTOR';
    proudMoments?: string;
    improvementIdeas?: string;
  }>;
}

interface OverviewMetrics {
  totalStudents: number;
  submittedCount: number;
  draftCount: number;
  notStartedCount: number;
  completionRatePct: number;
  ip21PassedCount: number;
  ip21PassRatePct: number;
  ip21TargetRatePct: number;
  ip21PassThresholdPct: number;
  ip21MeetsSchoolTarget: boolean;
  avgIp21Score16: number;
  avgIp21Percentage: number;
  avgExtendedScore20: number;
  avgExtendedPercentage: number;
  avgPrideQualityScore4: number;
  levelCounts: Record<string, number>;
  qualitiesBreakdown: QualityStat[];
  npsSummary: NpsSummaryData;
  npsParticipationRateVsTotalPct: number;
  gvcnReviewedCount: number;
  cvhtLinkedCount: number;
}

interface ClassSummaryRow {
  classId: string;
  className: string;
  gradeLevel: string;
  campusId: string;
  campusCode: string;
  campusName: string;
  homeroomTeacherName: string;
  totalStudents: number;
  submittedCount: number;
  draftCount: number;
  notStartedCount: number;
  completionRatePct: number;
  avgIp21Score16: number;
  avgIp21Percentage: number;
  ip21PassedCount: number;
  ip21PassRatePct: number;
  ip21MeetsSchoolTarget: boolean;
  avgExtendedScore20: number;
  avgPrideQualityScore4: number;
  qualitiesAvg: Record<string, number>;
  nps: {
    totalResponses: number;
    isAnonymityMet: boolean;
    npsScore: number | null;
    promoterPct: number | null;
    passivePct: number | null;
    detractorPct: number | null;
    averageScore10: number | null;
  };
  gvcnReviewedCount: number;
  cvhtLinkedCount: number;
}

interface PeriodRecord {
  id: string;
  code: string;
  title: string;
  academicYearId: string;
  semester: string;
  criteriaVersion: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'PUBLISHED' | string;
  startDate: string;
  endDate: string;
  extendedUntil?: string | null;
  publishedAt?: string | null;
  targetGrades: string[];
  targetCampuses: string[];
  targetClasses: string[];
  ip21TargetRatePct: number;
  ip21PassThresholdPct: number;
  minNpsAnonymityCount: number;
  allowPrideNps: boolean;
  description?: string | null;
  guidelineMascotMsg?: string | null;
  stats?: {
    submittedCount: number;
    draftCount: number;
    npsResponsesCount: number;
  };
}

export default function AdminReflectionPrideClient() {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Unified filters + Drill-down state (Toàn hệ thống -> Cơ sở -> Khối -> Lớp)
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [periodId, setPeriodId] = useState<string>('');
  const [semester, setSemester] = useState<string>('ALL');
  const [campusId, setCampusId] = useState<string>('ALL');
  const [gradeLevel, setGradeLevel] = useState<string>('ALL');
  const [classId, setClassId] = useState<string>('ALL');
  const [criteriaVersion, setCriteriaVersion] = useState<string>('ALL');

  // Search & table filter in Classes tab
  const [classSearch, setClassSearch] = useState<string>('');

  // Data payload from server
  const [data, setData] = useState<{
    filterOptions: {
      academicYears: Array<{ id: string; name: string; code: string; isCurrent: boolean }>;
      campuses: Array<{ id: string; code: string; name: string }>;
      grades: Array<{ value: string; label: string }>;
      classes: Array<{ id: string; name: string; grade: string; campusId: string; campusName: string }>;
      criteriaVersions: string[];
    };
    selectedPeriod: PeriodRecord | null;
    periods: PeriodRecord[];
    overview: OverviewMetrics;
    classSummaries: ClassSummaryRow[];
    comparisons: {
      byCampus: Array<any>;
      byGrade: Array<any>;
      bySemester: {
        hk1: any;
        hk2: any;
        deltaIp21Score16: number;
        deltaIp21PassRatePct: number;
        deltaNpsScore: number | null;
      };
    };
  } | null>(null);

  // Create / Extend Period Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [submittingPeriod, setSubmittingPeriod] = useState<boolean>(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    code: 'SKL-REF-2026-HK1',
    title: 'Kỳ Tự nhìn nhận 5 Phẩm chất & Khảo sát Tự hào Sky-Line HK1 (2026–2027)',
    semester: 'HK1',
    criteriaVersion: 'v1.0-2026',
    status: 'OPEN',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    targetGrades: ['4', '5', '6', '7', '8', '9', '10', '11', '12'],
    targetCampuses: [] as string[],
    ip21TargetRatePct: 90,
    ip21PassThresholdPct: 72,
    minNpsAnonymityCount: 5,
    allowPrideNps: true,
    description:
      'Đánh giá sự trưởng thành 5 phẩm chất học sinh Sky-Line Khối 4–12 phục vụ KPI IP2.1 và lắng nghe tiếng nói Tự hào Sky-Line (Pride NPS).',
    guidelineMascotMsg:
      'Chào các Sky-Liners Khối 4–12! Hãy cùng Linh vật Sky-Line cầm cờ nhìn lại hành trình rèn luyện 5 phẩm chất và chia sẻ niềm tự hào Sky-Line của bạn nhé!',
  });

  const [extendModalPeriod, setExtendModalPeriod] = useState<PeriodRecord | null>(null);
  const [extendDateValue, setExtendDateValue] = useState<string>('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (academicYearId) params.set('academicYearId', academicYearId);
      if (periodId) params.set('periodId', periodId);
      if (semester && semester !== 'ALL') params.set('semester', semester);
      if (campusId && campusId !== 'ALL') params.set('campusId', campusId);
      if (gradeLevel && gradeLevel !== 'ALL') params.set('gradeLevel', gradeLevel);
      if (classId && classId !== 'ALL') params.set('classId', classId);
      if (criteriaVersion && criteriaVersion !== 'ALL') params.set('criteriaVersion', criteriaVersion);

      const res = await fetch(`/api/reflection-pride/admin?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể tải dữ liệu KPI Phẩm chất & Pride NPS.');
      }
      setData(json);
      if (!academicYearId && json.filters?.academicYearId) {
        setAcademicYearId(json.filters.academicYearId);
      }
      if (!periodId && json.filters?.periodId) {
        setPeriodId(json.filters.periodId);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [academicYearId, periodId, semester, campusId, gradeLevel, classId, criteriaVersion]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Danh sách lớp khả dụng theo Cơ sở + Khối đang chọn
  const availableClassesForDropdown = useMemo(() => {
    if (!data?.filterOptions?.classes) return [];
    return data.filterOptions.classes.filter((c) => {
      if (campusId !== 'ALL' && c.campusId !== campusId) return false;
      if (gradeLevel !== 'ALL' && c.grade !== gradeLevel) return false;
      return true;
    });
  }, [data, campusId, gradeLevel]);

  // Lọc bảng lớp theo từ khóa tìm kiếm
  const filteredClassRows = useMemo(() => {
    if (!data?.classSummaries) return [];
    const q = classSearch.trim().toLowerCase();
    if (!q) return data.classSummaries;
    return data.classSummaries.filter(
      (r) =>
        r.className.toLowerCase().includes(q) ||
        r.campusName.toLowerCase().includes(q) ||
        r.homeroomTeacherName.toLowerCase().includes(q)
    );
  }, [data, classSearch]);

  // Xử lý Drill-down nhanh
  const handleDrillDownCampus = (targetCampusId: string) => {
    setCampusId(targetCampusId);
    setGradeLevel('ALL');
    setClassId('ALL');
  };

  const handleDrillDownGrade = (targetGrade: string) => {
    setGradeLevel(targetGrade);
    setClassId('ALL');
  };

  const handleDrillDownClass = (targetClassId: string, targetCampusId?: string, targetGrade?: string) => {
    if (targetCampusId) setCampusId(targetCampusId);
    if (targetGrade) setGradeLevel(targetGrade);
    setClassId(targetClassId);
    setActiveTab('OVERVIEW');
  };

  const handleResetDrillDown = () => {
    setCampusId('ALL');
    setGradeLevel('ALL');
    setClassId('ALL');
    setSemester('ALL');
  };

  // Thao tác quản lý kỳ khảo sát
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPeriod(true);
    try {
      const res = await fetch('/api/reflection-pride/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_PERIOD',
          ...newPeriodForm,
          academicYearId: academicYearId || '2026-2027',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể tạo kỳ khảo sát.');
      showToast('success', json.message || 'Đã tạo kỳ khảo sát mới thành công!');
      setShowCreateModal(false);
      setPeriodId(json.period.id);
      await fetchAdminData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSubmittingPeriod(false);
    }
  };

  const handleChangePeriodStatus = async (targetPeriodId: string, status: string) => {
    try {
      const res = await fetch('/api/reflection-pride/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CHANGE_STATUS',
          periodId: targetPeriodId,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể cập nhật trạng thái kỳ.');
      showToast('success', json.message);
      await fetchAdminData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleExtendPeriodDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalPeriod || !extendDateValue) return;
    try {
      const res = await fetch('/api/reflection-pride/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXTEND_DEADLINE',
          periodId: extendModalPeriod.id,
          extendedUntil: extendDateValue,
          reopenPeriod: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể gia hạn kỳ khảo sát.');
      showToast('success', json.message);
      setExtendModalPeriod(null);
      await fetchAdminData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Xuất báo cáo Excel đa sheet
  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng quan KPI IP2.1 & Pride NPS
    const ov = data.overview;
    const overviewRows = [
      {
        'Chỉ tiêu / Thống kê': 'Kỳ khảo sát đang chọn',
        'Giá trị': data.selectedPeriod?.title || 'Tất cả các kỳ trong năm học',
        'Ghi chú chuẩn Sky-Line': `Mã kỳ: ${data.selectedPeriod?.code || 'ALL'} | Phiên bản: ${data.selectedPeriod?.criteriaVersion || 'v1.0-2026'}`,
      },
      {
        'Chỉ tiêu / Thống kê': 'Tổng số học sinh thuộc phạm vi (Khối 4–12)',
        'Giá trị': ov.totalStudents,
        'Ghi chú chuẩn Sky-Line': 'Chỉ áp dụng cho học sinh từ Khối 4 đến Khối 12',
      },
      {
        'Chỉ tiêu / Thống kê': 'Số học sinh đã hoàn thành tự nhìn nhận',
        'Giá trị': `${ov.submittedCount} (${ov.completionRatePct}%)`,
        'Ghi chú chuẩn Sky-Line': `Đang lưu nháp: ${ov.draftCount} | Chưa thực hiện: ${ov.notStartedCount}`,
      },
      {
        'Chỉ tiêu / Thống kê': 'KPI IP2.1 Chính thức (4 phẩm chất, thang 16 điểm)',
        'Giá trị': `${ov.ip21PassRatePct}% đạt ngưỡng >= ${ov.ip21PassThresholdPct}%`,
        'Ghi chú chuẩn Sky-Line': `Chỉ tiêu trường: >= ${ov.ip21TargetRatePct}% | ĐTB hệ 16: ${ov.avgIp21Score16}/16.0`,
      },
      {
        'Chỉ tiêu / Thống kê': 'Chỉ số 5 Phẩm chất mở rộng (thang 20 điểm)',
        'Giá trị': `${ov.avgExtendedScore20}/20.0 (${ov.avgExtendedPercentage}%)`,
        'Ghi chú chuẩn Sky-Line': 'Báo cáo mở rộng 5 phẩm chất, KHÔNG thay đổi KPI IP2.1 chính thức',
      },
      {
        'Chỉ tiêu / Thống kê': 'Phẩm chất thứ 5: Tự hào Sky-Line (thang 4.0)',
        'Giá trị': `${ov.avgPrideQualityScore4}/4.0`,
        'Ghi chú chuẩn Sky-Line': 'Tổng hợp từ 2 tiêu chí TC5.1 và TC5.2',
      },
      {
        'Chỉ tiêu / Thống kê': 'Chỉ số Pride NPS độc lập (Ẩn danh)',
        'Giá trị': ov.npsSummary.isAnonymityMet ? `${ov.npsSummary.npsScore}` : 'Ẩn bảo mật (< 5 phản hồi)',
        'Ghi chú chuẩn Sky-Line': `Số phản hồi NPS: ${ov.npsSummary.totalResponses} | Tính từ dữ liệu gốc toàn phạm vi, không lấy TB cộng NPS lớp`,
      },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), '1_TongQuan_KPI_IP21');

    // Sheet 2: Phân tích 5 Phẩm chất & 14 Tiêu chí
    const criteriaRows: any[] = [];
    for (const q of ov.qualitiesBreakdown) {
      for (const c of q.criteria) {
        criteriaRows.push({
          'Mã Phẩm chất': q.code,
          'Tên Phẩm chất': q.name,
          'Thuộc KPI IP2.1 Chính thức': q.includedInOfficialIp21 ? 'Có (IP2.1)' : 'Mở rộng (Tự hào SKL)',
          'ĐTB Phẩm chất (/4.0)': q.avgScore4,
          'Mã Tiêu chí': c.code,
          'Tên Tiêu chí': c.shortName,
          'Nội dung hành vi': c.statement,
          'ĐTB Tiêu chí (/4.0)': c.avgScore4,
          'Tỷ lệ Đạt Mức 3-4 (%)': c.passRatePct,
          'Mức 1': c.distribution[1] || 0,
          'Mức 2': c.distribution[2] || 0,
          'Mức 3': c.distribution[3] || 0,
          'Mức 4': c.distribution[4] || 0,
        });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(criteriaRows), '2_5PhamChat_14TieuChi');

    // Sheet 3: Tổng hợp tất cả lớp
    const classRows = data.classSummaries.map((c) => ({
      'Cơ sở': c.campusName,
      'Khối': `Khối ${c.gradeLevel}`,
      'Lớp': c.className,
      'GVCN': c.homeroomTeacherName,
      'Sĩ số': c.totalStudents,
      'Đã hoàn thành': c.submittedCount,
      'Tỷ lệ hoàn thành (%)': c.completionRatePct,
      'ĐTB IP2.1 (/16.0)': c.avgIp21Score16,
      'Số HS đạt IP2.1 (>=72%)': c.ip21PassedCount,
      'Tỷ lệ đạt IP2.1 (%)': c.ip21PassRatePct,
      'Đạt chỉ tiêu 90%': c.ip21MeetsSchoolTarget ? 'ĐẠT' : 'Chưa đạt',
      'ĐTB 5 Phẩm chất (/20.0)': c.avgExtendedScore20,
      'ĐTB Tự hào SKL (/4.0)': c.avgPrideQualityScore4,
      'Số phản hồi NPS': c.nps.totalResponses,
      'Pride NPS Lớp': c.nps.isAnonymityMet ? c.nps.npsScore : 'Bảo mật (<5)',
      'GVCN đã phản hồi': c.gvcnReviewedCount,
      'Đã gắn mục tiêu CVHT': c.cvhtLinkedCount,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classRows), '3_TongHopTatCaLop');

    // Sheet 4: So sánh Cơ sở & Khối & HK1-HK2
    const compRows = [
      ...data.comparisons.byCampus.map((cp: any) => ({
        'Nhóm so sánh': 'Theo Cơ sở',
        'Đơn vị': cp.campusName,
        'Số lớp': cp.classCount,
        'Tổng HS': cp.totalStudents,
        'Đã nộp': cp.submittedCount,
        'Tiến độ (%)': cp.completionRatePct,
        'ĐTB IP2.1 (/16)': cp.avgIp21Score16,
        'Tỷ lệ đạt IP2.1 (%)': cp.ip21PassRatePct,
        'ĐTB 5 Phẩm chất (/20)': cp.avgExtendedScore20,
        'Pride NPS': cp.nps.isAnonymityMet ? cp.nps.npsScore : 'Bảo mật (<5)',
      })),
      ...data.comparisons.byGrade.map((g: any) => ({
        'Nhóm so sánh': 'Theo Khối',
        'Đơn vị': g.gradeLabel,
        'Số lớp': g.classCount,
        'Tổng HS': g.totalStudents,
        'Đã nộp': g.submittedCount,
        'Tiến độ (%)': g.completionRatePct,
        'ĐTB IP2.1 (/16)': g.avgIp21Score16,
        'Tỷ lệ đạt IP2.1 (%)': g.ip21PassRatePct,
        'ĐTB 5 Phẩm chất (/20)': g.avgExtendedScore20,
        'Pride NPS': g.nps.isAnonymityMet ? g.nps.npsScore : 'Bảo mật (<5)',
      })),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compRows), '4_SoSanh_CoSo_Khoi');

    XLSX.writeFile(
      wb,
      `SSM_KPI_IP21_PhamChat_PrideNPS_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Trạng thái kỳ hiện tại
  const periodStatusBadge = (status?: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/40">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Đang thực hiện (Mở kỳ)
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-400/40">
            <Sparkles className="h-3.5 w-3.5" />
            Đã công bố kết quả
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-200 ring-1 ring-rose-400/40">
            <Lock className="h-3.5 w-3.5" />
            Đã đóng kỳ
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/30 px-3 py-1 text-xs font-bold text-slate-200 ring-1 ring-slate-400/40">
            <Clock className="h-3.5 w-3.5" />
            Chưa mở kỳ (Bản nháp)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-200 ring-1 ring-purple-400/40">
            Chưa khởi tạo kỳ khảo sát
          </span>
        );
    }
  };

  const selectedCampusName =
    campusId === 'ALL'
      ? 'Toàn hệ thống'
      : data?.filterOptions.campuses.find((c) => c.id === campusId)?.name || 'Cơ sở đã chọn';

  const selectedClassName =
    classId === 'ALL'
      ? null
      : data?.filterOptions.classes.find((c) => c.id === classId)?.name || 'Lớp đã chọn';

  return (
    <div className="min-h-screen bg-[#F6F5FA] pb-16 text-slate-800 print:bg-white">
      {/* Toast thông báo */}
      {toastMsg && (
        <div
          className={`fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl transition-all ${
            toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* HEADER TÍM GLOBAL CỦA SSM */}
      <div
        className="border-b border-purple-900/20 text-white shadow-md print:hidden"
        style={{
          background: 'linear-gradient(135deg, #2E1065 0%, #5B2D8B 55%, #3B0764 100%)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-200">
                <span>KPIs Hệ thống</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-amber-300">Phẩm chất HS & Tự hào Sky-Line</span>
                <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] text-white">
                  Khối 4–12 • KPI IP2.1 & Pride NPS
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Quản trị Phẩm chất Học sinh (IP2.1) & Khảo sát Pride NPS
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-purple-100/90">
                Đo lường chính thức KPI IP2.1 (4 phẩm chất cốt lõi, thang 16 điểm, chỉ tiêu 90%, ngưỡng đạt 72%),
                báo cáo mở rộng 5 phẩm chất và chỉ số Tự hào Sky-Line (Pride NPS) ẩn danh độc lập từ dữ liệu gốc.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {periodStatusBadge(data?.selectedPeriod?.status)}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('PERIODS');
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-purple-950 shadow-sm transition hover:bg-amber-300"
              >
                <Plus className="h-4 w-4" />
                Tạo / Mở kỳ khảo sát
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!data}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
                Xuất Excel
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Printer className="h-4 w-4 text-purple-200" />
                In / PDF
              </button>
              <button
                type="button"
                onClick={fetchAdminData}
                className="inline-flex items-center justify-center rounded-xl bg-white/10 p-2.5 text-white transition hover:bg-white/20"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* THANH BỘ LỌC DÙNG CHUNG & DRILL-DOWN (Toàn hệ thống -> Cơ sở -> Khối -> Lớp) */}
          <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-purple-200">
                  Năm học
                </label>
                <select
                  value={academicYearId}
                  onChange={(e) => {
                    setAcademicYearId(e.target.value);
                    setPeriodId('ALL');
                  }}
                  className="w-full rounded-xl border border-white/20 bg-purple-950/70 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                >
                  {data?.filterOptions.academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? '(Hiện tại)' : ''}
                    </option>
                  ))}
                  {!data?.filterOptions.academicYears?.length && (
                    <option value="2026-2027">Năm học 2026–2027</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-purple-200">
                  Kỳ khảo sát
                </label>
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-purple-950/70 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ALL">Tất cả kỳ trong năm</option>
                  {data?.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.semester}] {p.title} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-purple-200">
                  Học kỳ
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-purple-950/70 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ALL">Cả năm (HK1 & HK2)</option>
                  <option value="HK1">Học kỳ I (HK1)</option>
                  <option value="HK2">Học kỳ II (HK2)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-purple-200">
                  1. Cơ sở (Drill-down)
                </label>
                <select
                  value={campusId}
                  onChange={(e) => {
                    setCampusId(e.target.value);
                    setClassId('ALL');
                  }}
                  className="w-full rounded-xl border border-white/20 bg-purple-950/70 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ALL">Toàn hệ thống Sky-Line</option>
                  {data?.filterOptions.campuses.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-purple-200">
                  2. Khối (Khối 4–12)
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => {
                    setGradeLevel(e.target.value);
                    setClassId('ALL');
                  }}
                  className="w-full rounded-xl border border-white/20 bg-purple-950/70 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ALL">Tất cả Khối 4–12</option>
                  {data?.filterOptions.grades.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-purple-200">
                  3. Lớp học cụ thể
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-purple-950/70 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ALL">Tất cả các lớp ({availableClassesForDropdown.length})</option>
                  {availableClassesForDropdown.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Lớp {cls.name} {cls.campusName ? `- ${cls.campusName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Breadcrumb Drill-down trực quan */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-purple-200">Phạm vi đang xem:</span>
                <button
                  type="button"
                  onClick={handleResetDrillDown}
                  className={`rounded-lg px-2 py-0.5 font-bold transition ${
                    campusId === 'ALL' && gradeLevel === 'ALL' && classId === 'ALL'
                      ? 'bg-amber-400 text-purple-950'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Toàn hệ thống
                </button>
                {campusId !== 'ALL' && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-purple-300" />
                    <button
                      type="button"
                      onClick={() => {
                        setGradeLevel('ALL');
                        setClassId('ALL');
                      }}
                      className={`rounded-lg px-2 py-0.5 font-bold ${
                        gradeLevel === 'ALL' && classId === 'ALL'
                          ? 'bg-amber-400 text-purple-950'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {selectedCampusName}
                    </button>
                  </>
                )}
                {gradeLevel !== 'ALL' && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-purple-300" />
                    <button
                      type="button"
                      onClick={() => setClassId('ALL')}
                      className={`rounded-lg px-2 py-0.5 font-bold ${
                        classId === 'ALL' ? 'bg-amber-400 text-purple-950' : 'bg-white/10 text-white'
                      }`}
                    >
                      Khối {gradeLevel}
                    </button>
                  </>
                )}
                {selectedClassName && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-purple-300" />
                    <span className="rounded-lg bg-amber-400 px-2.5 py-0.5 font-extrabold text-purple-950">
                      Lớp {selectedClassName}
                    </span>
                  </>
                )}
              </div>

              {(campusId !== 'ALL' || gradeLevel !== 'ALL' || classId !== 'ALL' || semester !== 'ALL') && (
                <button
                  type="button"
                  onClick={handleResetDrillDown}
                  className="text-xs font-bold text-amber-300 underline hover:text-amber-200"
                >
                  Đặt lại bộ lọc về Toàn hệ thống
                </button>
              )}
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'OVERVIEW', label: '1. Tổng quan KPI & Tiến độ', icon: BarChart3 },
              { id: 'QUALITIES', label: '2. Phân tích 4 Phẩm chất IP2.1 & Tự hào SKL', icon: Award },
              { id: 'PRIDE_NPS', label: '3. Phân tích Pride NPS', icon: Heart },
              { id: 'CLASSES', label: '4. Tổng hợp tất cả lớp', icon: Users },
              { id: 'COMPARISON', label: '5. So sánh Cơ sở, Khối & HK1/HK2', icon: Layers },
              { id: 'PERIODS', label: '6. Quản lý Kỳ khảo sát', icon: Calendar },
              { id: 'REPORTS', label: '7. Báo cáo & Xuất Excel/PDF', icon: Download },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as AdminTab)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs font-bold transition ${
                    active
                      ? 'bg-[#F6F5FA] text-purple-950 shadow-sm'
                      : 'bg-white/10 text-purple-100 hover:bg-white/20'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-purple-700' : 'text-purple-200'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-bold">Lỗi tải dữ liệu:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Trạng thái chưa có kỳ khảo sát nào */}
        {!loading && data && data.periods.length === 0 && activeTab !== 'PERIODS' && (
          <div className="mb-6">
            <SkylineFlagMascot
              variant="empty"
              badgeText="TRẠNG THÁI: CHƯA MỞ KỲ KHẢO SÁT"
              title="Hệ thống chưa có kỳ khảo sát Phẩm chất & Pride NPS nào được khởi tạo"
              message="Ban KT&ĐBCL hoặc Quản trị viên có thể khởi tạo kỳ khảo sát cho học sinh Khối 4–12. Chỉ những học sinh thuộc kỳ khảo sát đang mở (OPEN) mới nhìn thấy nhiệm vụ mới trên Cổng Học sinh."
              actionButton={
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('PERIODS');
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-purple-950 shadow hover:bg-amber-300"
                >
                  <Plus className="h-4 w-4" />
                  Khởi tạo Kỳ khảo sát đầu tiên ngay
                </button>
              }
            />
          </div>
        )}

        {loading && !data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-36 animate-pulse rounded-2xl bg-white p-5 shadow-sm" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* =====================================================================
                TAB 1: TỔNG QUAN KPI & TIẾN ĐỘ HOÀN THÀNH
               ===================================================================== */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-6">
                {/* 4 KPI Cards trọng tâm */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Card 1: KPI IP2.1 Chính thức */}
                  <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-extrabold text-purple-900">
                          KPI IP2.1 CHÍNH THỨC (4 PHẨM CHẤT)
                        </span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-purple-950">
                            {data.overview.ip21PassRatePct}%
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            / chỉ tiêu {data.overview.ip21TargetRatePct}%
                          </span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-purple-100 p-2.5 text-purple-800">
                        <Target className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            data.overview.ip21MeetsSchoolTarget ? 'bg-emerald-500' : 'bg-purple-700'
                          }`}
                          style={{ width: `${Math.min(100, data.overview.ip21PassRatePct)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                        <span>
                          ĐTB hệ 16:{' '}
                          <strong className="text-purple-950">{data.overview.avgIp21Score16}/16.0</strong>
                        </span>
                        <span>
                          Ngưỡng đạt:{' '}
                          <strong className="text-purple-900">≥ {data.overview.ip21PassThresholdPct}%</strong> (11.52đ)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Tiến độ hoàn thành */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-extrabold text-teal-800">
                          TIẾN ĐỘ HỌC SINH KHỐI 4–12
                        </span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">
                            {data.overview.completionRatePct}%
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            ({data.overview.submittedCount}/{data.overview.totalStudents} HS)
                          </span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all"
                          style={{ width: `${Math.min(100, data.overview.completionRatePct)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                        <span>Đang lưu nháp: {data.overview.draftCount}</span>
                        <span>Chưa làm: {data.overview.notStartedCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Chỉ số 5 Phẩm chất mở rộng & Tự hào Sky-Line */}
                  <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">
                          CHỈ SỐ 5 PHẨM CHẤT (MỞ RỘNG)
                        </span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">
                            {data.overview.avgExtendedScore20}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">/ 20.0 điểm</span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                        <Award className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>PC5 - Tự hào Sky-Line riêng:</span>
                        <strong className="text-amber-700">{data.overview.avgPrideQualityScore4} / 4.0</strong>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        * Báo cáo mở rộng, không làm thay đổi công thức KPI IP2.1.
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Chỉ số Pride NPS Độc lập & Ẩn danh */}
                  <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-extrabold text-indigo-900">
                          PRIDE NPS (ĐỘC LẬP • ẨN DANH)
                        </span>
                        <div className="mt-2 flex items-baseline gap-2">
                          {data.overview.npsSummary.isAnonymityMet ? (
                            <>
                              <span
                                className={`text-3xl font-black ${
                                  (data.overview.npsSummary.npsScore ?? 0) >= 50
                                    ? 'text-emerald-600'
                                    : (data.overview.npsSummary.npsScore ?? 0) >= 0
                                    ? 'text-indigo-900'
                                    : 'text-rose-600'
                                }`}
                              >
                                {(data.overview.npsSummary.npsScore ?? 0) > 0
                                  ? `+${data.overview.npsSummary.npsScore}`
                                  : data.overview.npsSummary.npsScore}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                ({data.overview.npsSummary.totalResponses} phản hồi)
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-slate-500">
                              Chưa đủ ngưỡng ẩn danh ({data.overview.npsSummary.totalResponses}/
                              {data.overview.npsSummary.minAnonymityThreshold})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
                        <Heart className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                      {data.overview.npsSummary.isAnonymityMet ? (
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 font-semibold">
                            Promoters: {data.overview.npsSummary.promoterPct}%
                          </span>
                          <span className="text-amber-700 font-semibold">
                            Passives: {data.overview.npsSummary.passivePct}%
                          </span>
                          <span className="text-rose-700 font-semibold">
                            Detractors: {data.overview.npsSummary.detractorPct}%
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Cần tối thiểu {data.overview.npsSummary.minAnonymityThreshold} lượt phản hồi ẩn danh để hiển thị chỉ số NPS.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Biểu đồ Tổng quan 5 Phẩm chất & Phân bố xếp loại IP2.1 */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Cột trái (2/3): Điểm trung bình 4 phẩm chất IP2.1 và Phẩm chất Tự hào Sky-Line riêng */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900">
                          Phân tích 4 Phẩm chất cốt lõi (KPI IP2.1) & Phẩm chất Tự hào Sky-Line riêng
                        </h2>
                        <p className="text-xs text-slate-500">
                          Thang điểm 4.0/phẩm chất • Ngưỡng đạt từng phẩm chất: ≥ 2.88/4.0 (72%)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('QUALITIES')}
                        className="text-xs font-bold text-purple-700 hover:underline"
                      >
                        Xem chi tiết 14 tiêu chí →
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {data.overview.qualitiesBreakdown.map((q) => (
                        <div
                          key={q.code}
                          className={`rounded-xl border p-3.5 ${
                            q.includedInOfficialIp21
                              ? 'border-purple-100 bg-purple-50/40'
                              : 'border-amber-200 bg-amber-50/50'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                                  q.includedInOfficialIp21
                                    ? 'bg-purple-800 text-white'
                                    : 'bg-amber-500 text-purple-950'
                                }`}
                              >
                                {q.code}
                              </span>
                              <div>
                                <span className="text-sm font-bold text-slate-900">{q.name}</span>
                                <span className="ml-2 text-xs text-slate-500">({q.englishName})</span>
                              </div>
                              {!q.includedInOfficialIp21 && (
                                <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-950">
                                  Phẩm chất Tự hào Sky-Line riêng (Báo cáo mở rộng)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs">
                              <span>
                                ĐTB: <strong className="text-sm text-slate-900">{q.avgScore4}/4.0</strong>
                              </span>
                              <span className="rounded-md bg-white px-2 py-0.5 font-bold text-purple-900 shadow-sm">
                                Đạt chuẩn: {q.passRatePct}%
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white">
                            <div
                              className={`h-full rounded-full ${
                                q.includedInOfficialIp21 ? 'bg-purple-700' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, q.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cột phải (1/3): Phân bố mức độ trưởng thành IP2.1 & Đồng hành CVHT */}
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Phân bố mức độ trưởng thành (IP2.1)
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Xếp loại dựa hoàn toàn trên 4 phẩm chất cốt lõi (không dùng NPS để xếp loại phẩm chất).
                      </p>

                      <div className="mt-4 space-y-3">
                        {[
                          {
                            code: 'LAN_TOA',
                            label: 'Mức 4 - Lan tỏa (≥ 85%)',
                            color: 'bg-emerald-500',
                            textColor: 'text-emerald-800',
                          },
                          {
                            code: 'VUNG_VANG',
                            label: 'Mức 3 - Vững vàng (72% – <85%)',
                            color: 'bg-purple-700',
                            textColor: 'text-purple-900',
                          },
                          {
                            code: 'DANG_REN_LUYEN',
                            label: 'Mức 2 - Đang rèn luyện (50% – <72%)',
                            color: 'bg-amber-500',
                            textColor: 'text-amber-800',
                          },
                          {
                            code: 'CAN_DONG_HANH',
                            label: 'Mức 1 - Cần đồng hành (< 50%)',
                            color: 'bg-rose-500',
                            textColor: 'text-rose-800',
                          },
                        ].map((lv) => {
                          const count = data.overview.levelCounts[lv.code] || 0;
                          const pct =
                            data.overview.submittedCount > 0
                              ? Math.round((count / data.overview.submittedCount) * 100)
                              : 0;
                          return (
                            <div key={lv.code} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className={lv.textColor}>{lv.label}</span>
                                <span>
                                  {count} HS ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${lv.color}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-purple-200 bg-purple-950 p-5 text-white shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                        <ShieldCheck className="h-4 w-4" />
                        Nguyên tắc Bảo toàn Dữ liệu & KPI
                      </div>
                      <ul className="mt-2.5 space-y-1.5 text-xs text-purple-100">
                        <li>• KPI IP2.1 tính trên 4 phẩm chất (thang 16đ, ngưỡng đạt 72%, chỉ tiêu 90%).</li>
                        <li>• Pride NPS là chỉ số độc lập, ẩn danh, tính trực tiếp từ toàn bộ phản hồi gốc.</li>
                        <li>• Tuyệt đối không lấy trung bình NPS lớp để tính NPS toàn trường/cơ sở/khối.</li>
                        <li>• Không dùng điểm NPS để xếp loại phẩm chất cá nhân học sinh.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 2: PHÂN TÍCH 4 PHẨM CHẤT IP2.1 & TỰ HÀO SKY-LINE (14 TIÊU CHÍ)
               ===================================================================== */}
            {activeTab === 'QUALITIES' && (
              <div className="space-y-6">
                {data.overview.qualitiesBreakdown.map((q) => (
                  <div
                    key={q.code}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div
                      className={`flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4 ${
                        q.includedInOfficialIp21
                          ? 'border-purple-100 bg-purple-950 text-white'
                          : 'border-amber-200 bg-gradient-to-r from-amber-500 to-teal-700 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-black">
                          {q.code}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-extrabold">{q.name}</h3>
                            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">
                              {q.includedInOfficialIp21
                                ? 'Thuộc KPI IP2.1 chính thức'
                                : 'Phẩm chất Tự hào Sky-Line riêng (Mở rộng)'}
                            </span>
                          </div>
                          <p className="text-xs text-white/80">{q.englishName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <div className="text-[11px] uppercase text-white/75">Điểm TB / 4.0</div>
                          <div className="text-xl font-black">{q.avgScore4} / 4.0</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-white/75">Tỷ lệ đạt (≥72%)</div>
                          <div className="text-xl font-black text-amber-300">{q.passRatePct}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto p-4 sm:p-6">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                            <th className="pb-3 pr-3">Mã TC</th>
                            <th className="pb-3 pr-4">Tiêu chí & Hành vi cốt lõi</th>
                            <th className="pb-3 px-3 text-center">ĐTB (/4.0)</th>
                            <th className="pb-3 px-3 text-center">Đạt Mức 3–4</th>
                            <th className="pb-3 pl-3">Phân bố 4 mức độ (Mức 1 → Mức 4)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {q.criteria.map((c) => {
                            const total = c.ratedCount || 1;
                            const p1 = Math.round(((c.distribution[1] || 0) / total) * 100);
                            const p2 = Math.round(((c.distribution[2] || 0) / total) * 100);
                            const p3 = Math.round(((c.distribution[3] || 0) / total) * 100);
                            const p4 = Math.round(((c.distribution[4] || 0) / total) * 100);

                            return (
                              <tr key={c.code} className="hover:bg-slate-50/80">
                                <td className="py-3.5 pr-3 font-extrabold text-purple-900">{c.code}</td>
                                <td className="py-3.5 pr-4">
                                  <div className="font-bold text-slate-900">{c.shortName}</div>
                                  <div className="mt-0.5 text-slate-600">{c.statement}</div>
                                </td>
                                <td className="py-3.5 px-3 text-center">
                                  <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-sm font-black text-purple-950">
                                    {c.avgScore4}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-center font-bold text-emerald-700">
                                  {c.passRatePct}%
                                </td>
                                <td className="py-3.5 pl-3 min-w-[220px]">
                                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="bg-rose-400"
                                      style={{ width: `${p1}%` }}
                                      title={`Mức 1: ${c.distribution[1] || 0} HS (${p1}%)`}
                                    />
                                    <div
                                      className="bg-amber-400"
                                      style={{ width: `${p2}%` }}
                                      title={`Mức 2: ${c.distribution[2] || 0} HS (${p2}%)`}
                                    />
                                    <div
                                      className="bg-purple-600"
                                      style={{ width: `${p3}%` }}
                                      title={`Mức 3: ${c.distribution[3] || 0} HS (${p3}%)`}
                                    />
                                    <div
                                      className="bg-emerald-500"
                                      style={{ width: `${p4}%` }}
                                      title={`Mức 4: ${c.distribution[4] || 0} HS (${p4}%)`}
                                    />
                                  </div>
                                  <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                                    <span>M1: {c.distribution[1] || 0}</span>
                                    <span>M2: {c.distribution[2] || 0}</span>
                                    <span>M3: {c.distribution[3] || 0}</span>
                                    <span>M4: {c.distribution[4] || 0}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* =====================================================================
                TAB 3: PHÂN TÍCH PRIDE NPS (CHỈ SỐ ĐỘC LẬP & ẨN DANH)
               ===================================================================== */}
            {activeTab === 'PRIDE_NPS' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-900">
                        KHẢO SÁT ĐỘC LẬP • BẢO MẬT ẨN DANH 100%
                      </span>
                      <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                        Phân tích Chỉ số Tự hào Học sinh Sky-Line (Pride NPS)
                      </h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Công thức chuẩn: <code className="font-bold text-indigo-900">% Promoters (9–10) − % Detractors (0–6)</code> tính trực tiếp trên tổng số phản hồi hợp lệ của phạm vi đang lọc ({data.overview.npsSummary.totalResponses} phản hồi).
                      </p>
                    </div>

                    <div className="rounded-2xl bg-indigo-950 px-6 py-4 text-center text-white">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                        Chỉ số Pride NPS
                      </div>
                      <div className="mt-1 text-3xl font-black text-amber-300">
                        {data.overview.npsSummary.isAnonymityMet
                          ? (data.overview.npsSummary.npsScore ?? 0) > 0
                            ? `+${data.overview.npsSummary.npsScore}`
                            : data.overview.npsSummary.npsScore
                          : 'Ẩn bảo mật'}
                      </div>
                      <div className="mt-0.5 text-[11px] text-indigo-200">
                        ĐTB: {data.overview.npsSummary.averageScore10 ?? '—'} / 10.0
                      </div>
                    </div>
                  </div>

                  {!data.overview.npsSummary.isAnonymityMet ? (
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                      <div className="flex items-center gap-2 font-bold">
                        <Lock className="h-5 w-5 text-amber-700" />
                        Chưa đủ số mẫu tối thiểu để giải mã thống kê NPS ẩn danh
                      </div>
                      <p className="mt-1 text-xs">
                        Hiện có <strong>{data.overview.npsSummary.totalResponses}</strong> lượt phản hồi. Hệ thống yêu cầu tối thiểu{' '}
                        <strong>{data.overview.npsSummary.minAnonymityThreshold}</strong> lượt phản hồi trong phạm vi đang chọn để đảm bảo không thể suy đoán danh tính học sinh.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                      {/* 3 nhóm NPS */}
                      <div className="space-y-3">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase text-emerald-900">
                              Promoters (Điểm 9–10) • Lan tỏa tự hào
                            </span>
                            <span className="text-lg font-black text-emerald-700">
                              {data.overview.npsSummary.promoterPct}%
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-emerald-800">
                            {data.overview.npsSummary.promotersCount} học sinh sẵn sàng giới thiệu và tự hào cao về Sky-Line.
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase text-amber-900">
                              Passives (Điểm 7–8) • Hài lòng trung lập
                            </span>
                            <span className="text-lg font-black text-amber-700">
                              {data.overview.npsSummary.passivePct}%
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-amber-800">
                            {data.overview.npsSummary.passivesCount} học sinh có trải nghiệm ổn định, tiềm năng chuyển hóa thành Promoters.
                          </p>
                        </div>

                        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase text-rose-900">
                              Detractors (Điểm 0–6) • Cần lắng nghe
                            </span>
                            <span className="text-lg font-black text-rose-700">
                              {data.overview.npsSummary.detractorPct}%
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-rose-800">
                            {data.overview.npsSummary.detractorsCount} học sinh mong muốn nhà trường cải thiện thêm trải nghiệm.
                          </p>
                        </div>
                      </div>

                      {/* Yếu tố tạo nên niềm tự hào Sky-Line */}
                      <div className="rounded-xl border border-slate-200 p-4 lg:col-span-2">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Các yếu tố cốt lõi tạo nên niềm Tự hào Sky-Line (Pride Drivers)
                        </h3>
                        <div className="mt-3 space-y-2.5">
                          {data.overview.npsSummary.topReasons.map((r) => (
                            <div key={r.code} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-800">{r.label}</span>
                                <span className="font-bold text-purple-900">
                                  {r.count} lượt ({r.pct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-purple-700"
                                  style={{ width: `${Math.min(100, r.pct)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                          {data.overview.npsSummary.topReasons.length === 0 && (
                            <p className="text-xs text-slate-500">Chưa có dữ liệu chọn yếu tố tự hào.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chia sẻ ẩn danh của học sinh */}
                {data.overview.npsSummary.isAnonymityMet &&
                  data.overview.npsSummary.anonymizedComments.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Tiếng nói Ẩn danh từ Học sinh (Đã lược bỏ toàn bộ định danh cá nhân)
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {data.overview.npsSummary.anonymizedComments.slice(0, 12).map((c, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
                          >
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                c.group === 'PROMOTER'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : c.group === 'PASSIVE'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-900'
                              }`}
                            >
                              Nhóm {c.group}
                            </span>
                            {c.proudMoments && (
                              <p className="mt-2 text-slate-800">
                                <strong className="text-purple-900">Điều tự hào:</strong> {c.proudMoments}
                              </p>
                            )}
                            {c.improvementIdeas && (
                              <p className="mt-1.5 text-slate-700">
                                <strong className="text-teal-800">Đề xuất cải thiện:</strong>{' '}
                                {c.improvementIdeas}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* =====================================================================
                TAB 4: TỔNG HỢP TẤT CẢ LỚP (KHỐI 4–12) + DRILL-DOWN
               ===================================================================== */}
            {activeTab === 'CLASSES' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Tổng hợp Tất cả Lớp Khối 4–12 ({filteredClassRows.length} lớp)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Nhấn vào một lớp bất kỳ để đi sâu (Drill-down) phân tích chi tiết lớp đó.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      placeholder="Tìm theo tên lớp, cơ sở, GVCN..."
                      className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                        <th className="p-3">Cơ sở</th>
                        <th className="p-3">Khối / Lớp</th>
                        <th className="p-3">GVCN</th>
                        <th className="p-3 text-center">Tiến độ nộp</th>
                        <th className="p-3 text-center">ĐTB IP2.1 (/16)</th>
                        <th className="p-3 text-center">Tỷ lệ đạt IP2.1</th>
                        <th className="p-3 text-center">5 Phẩm chất (/20)</th>
                        <th className="p-3 text-center">Tự hào SKL (/4)</th>
                        <th className="p-3 text-center">Pride NPS Lớp</th>
                        <th className="p-3 text-center">Đồng hành GVCN</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClassRows.map((row) => (
                        <tr key={row.classId} className="hover:bg-purple-50/40">
                          <td className="p-3 font-medium text-slate-700">{row.campusName}</td>
                          <td className="p-3">
                            <span className="font-extrabold text-purple-950">{row.className}</span>
                            <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              K{row.gradeLevel}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700">{row.homeroomTeacherName}</td>
                          <td className="p-3 text-center">
                            <div className="font-bold text-slate-900">
                              {row.submittedCount}/{row.totalStudents} ({row.completionRatePct}%)
                            </div>
                            <div className="mx-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full bg-teal-600"
                                style={{ width: `${Math.min(100, row.completionRatePct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center font-extrabold text-purple-950">
                            {row.avgIp21Score16}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 font-bold ${
                                row.ip21MeetsSchoolTarget
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.ip21PassRatePct >= 72
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.ip21PassRatePct}%
                            </span>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-800">
                            {row.avgExtendedScore20}
                          </td>
                          <td className="p-3 text-center font-bold text-amber-700">
                            {row.avgPrideQualityScore4}
                          </td>
                          <td className="p-3 text-center">
                            {row.nps.isAnonymityMet ? (
                              <span className="font-extrabold text-indigo-900">
                                {(row.nps.npsScore ?? 0) > 0
                                  ? `+${row.nps.npsScore}`
                                  : row.nps.npsScore}{' '}
                                <span className="text-[10px] font-normal text-slate-500">
                                  ({row.nps.totalResponses})
                                </span>
                              </span>
                            ) : (
                              <span className="text-[11px] italic text-slate-400">
                                Ẩn ({row.nps.totalResponses}/5)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center text-slate-600">
                            {row.gvcnReviewedCount} NX • {row.cvhtLinkedCount} CVHT
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleDrillDownClass(row.classId, row.campusId, row.gradeLevel)
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1 font-bold text-purple-900 hover:bg-purple-200"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Đi sâu
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredClassRows.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400">
                            Không có lớp học nào khớp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 5: SO SÁNH CƠ SỞ, KHỐI, LỚP VÀ HK1 vs HK2
               ===================================================================== */}
            {activeTab === 'COMPARISON' && (
              <div className="space-y-6">
                {/* 1. Đối sánh Học kỳ I (HK1) vs Học kỳ II (HK2) */}
                <div className="rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Đối sánh Tiến bộ Học kỳ I (HK1) và Học kỳ II (HK2)
                      </h2>
                      <p className="text-xs text-slate-500">
                        So sánh sự trưởng thành về phẩm chất IP2.1 và chỉ số Tự hào Sky-Line giữa 2 học kỳ trong năm học.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="rounded-lg bg-purple-50 px-3 py-1.5 font-bold text-purple-900">
                        Δ Điểm IP2.1:{' '}
                        {data.comparisons.bySemester.deltaIp21Score16 >= 0 ? '+' : ''}
                        {data.comparisons.bySemester.deltaIp21Score16} đ
                      </span>
                      <span className="rounded-lg bg-teal-50 px-3 py-1.5 font-bold text-teal-900">
                        Δ Tỷ lệ đạt:{' '}
                        {data.comparisons.bySemester.deltaIp21PassRatePct >= 0 ? '+' : ''}
                        {data.comparisons.bySemester.deltaIp21PassRatePct}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[data.comparisons.bySemester.hk1, data.comparisons.bySemester.hk2].map(
                      (sem: any) => (
                        <div
                          key={sem.semester}
                          className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-purple-950">
                              {sem.label}
                            </span>
                            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-900">
                              Đã nộp: {sem.submittedCount}/{sem.totalStudents} ({sem.completionRatePct}%)
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-lg bg-white p-2.5 shadow-sm">
                              <div className="text-[10px] text-slate-500">ĐTB IP2.1 (/16)</div>
                              <div className="mt-0.5 text-base font-black text-purple-950">
                                {sem.avgIp21Score16}
                              </div>
                            </div>
                            <div className="rounded-lg bg-white p-2.5 shadow-sm">
                              <div className="text-[10px] text-slate-500">Tỷ lệ đạt (≥72%)</div>
                              <div className="mt-0.5 text-base font-black text-emerald-700">
                                {sem.ip21PassRatePct}%
                              </div>
                            </div>
                            <div className="rounded-lg bg-white p-2.5 shadow-sm">
                              <div className="text-[10px] text-slate-500">Pride NPS</div>
                              <div className="mt-0.5 text-base font-black text-indigo-900">
                                {sem.nps.isAnonymityMet ? sem.nps.npsScore : 'Ẩn (<5)'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 2. So sánh giữa các Cơ sở (Campuses) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-extrabold text-slate-900">
                    So sánh giữa các Cơ sở Sky-Line (Tính trực tiếp từ dữ liệu gốc từng cơ sở)
                  </h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                          <th className="p-3">Cơ sở</th>
                          <th className="p-3 text-center">Số lớp (K4–12)</th>
                          <th className="p-3 text-center">Tiến độ hoàn thành</th>
                          <th className="p-3 text-center">ĐTB IP2.1 (/16.0)</th>
                          <th className="p-3 text-center">Tỷ lệ đạt IP2.1 (≥72%)</th>
                          <th className="p-3 text-center">Chỉ số 5 PC (/20.0)</th>
                          <th className="p-3 text-center">Tự hào SKL (/4.0)</th>
                          <th className="p-3 text-center">Pride NPS Cơ sở</th>
                          <th className="p-3 text-right">Đi sâu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.comparisons.byCampus.map((cp: any) => (
                          <tr key={cp.campusId} className="hover:bg-purple-50/40">
                            <td className="p-3 font-extrabold text-purple-950">{cp.campusName}</td>
                            <td className="p-3 text-center">{cp.classCount}</td>
                            <td className="p-3 text-center">
                              {cp.submittedCount}/{cp.totalStudents} ({cp.completionRatePct}%)
                            </td>
                            <td className="p-3 text-center font-bold">{cp.avgIp21Score16}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-0.5 font-bold ${
                                  cp.ip21MeetsSchoolTarget
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-purple-100 text-purple-900'
                                }`}
                              >
                                {cp.ip21PassRatePct}%
                              </span>
                            </td>
                            <td className="p-3 text-center">{cp.avgExtendedScore20}</td>
                            <td className="p-3 text-center font-bold text-amber-700">
                              {cp.avgPrideQualityScore4}
                            </td>
                            <td className="p-3 text-center font-extrabold text-indigo-900">
                              {cp.nps.isAnonymityMet
                                ? `${cp.nps.npsScore} (${cp.nps.totalResponses})`
                                : `Ẩn (${cp.nps.totalResponses}/5)`}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDrillDownCampus(cp.campusId)}
                                className="rounded-lg bg-purple-100 px-2.5 py-1 font-bold text-purple-900 hover:bg-purple-200"
                              >
                                Lọc cơ sở
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. So sánh theo Khối 4–12 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-extrabold text-slate-900">
                    So sánh theo Khối lớp (Khối 4 → Khối 12)
                  </h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                          <th className="p-3">Khối</th>
                          <th className="p-3">Cấp học</th>
                          <th className="p-3 text-center">Số lớp</th>
                          <th className="p-3 text-center">Tiến độ</th>
                          <th className="p-3 text-center">ĐTB IP2.1 (/16)</th>
                          <th className="p-3 text-center">Tỷ lệ đạt IP2.1</th>
                          <th className="p-3 text-center">Tự hào SKL (/4)</th>
                          <th className="p-3 text-center">Pride NPS Khối</th>
                          <th className="p-3 text-right">Đi sâu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.comparisons.byGrade.map((g: any) => (
                          <tr key={g.gradeLevel} className="hover:bg-purple-50/40">
                            <td className="p-3 font-extrabold text-purple-950">{g.gradeLabel}</td>
                            <td className="p-3 text-slate-600">{g.educationStage}</td>
                            <td className="p-3 text-center">{g.classCount}</td>
                            <td className="p-3 text-center">
                              {g.submittedCount}/{g.totalStudents} ({g.completionRatePct}%)
                            </td>
                            <td className="p-3 text-center font-bold">{g.avgIp21Score16}</td>
                            <td className="p-3 text-center font-bold text-emerald-700">
                              {g.ip21PassRatePct}%
                            </td>
                            <td className="p-3 text-center font-bold text-amber-700">
                              {g.avgPrideQualityScore4}
                            </td>
                            <td className="p-3 text-center font-extrabold text-indigo-900">
                              {g.nps.isAnonymityMet
                                ? `${g.nps.npsScore} (${g.nps.totalResponses})`
                                : `Ẩn (${g.nps.totalResponses}/5)`}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDrillDownGrade(g.gradeLevel)}
                                className="rounded-lg bg-purple-100 px-2.5 py-1 font-bold text-purple-900 hover:bg-purple-200"
                              >
                                Lọc khối
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 6: QUẢN LÝ KỲ KHẢO SÁT (TẠO, CẤU HÌNH, MỞ/ĐÓNG, GIA HẠN, CÔNG BỐ)
               ===================================================================== */}
            {activeTab === 'PERIODS' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Quản lý Kỳ Tự nhìn nhận 5 Phẩm chất & Khảo sát Pride NPS
                    </h2>
                    <p className="text-xs text-slate-600">
                      Chỉ học sinh Khối 4–12 thuộc kỳ khảo sát có trạng thái <strong>Đang mở (OPEN)</strong> mới nhìn thấy nhiệm vụ mới trên Cổng Học sinh.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-800 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-purple-900"
                  >
                    <Plus className="h-4 w-4" />
                    Tạo kỳ khảo sát mới
                  </button>
                </div>

                {/* Danh sách kỳ khảo sát */}
                <div className="grid grid-cols-1 gap-4">
                  {data.periods.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-300"
                    >
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-black text-purple-900">
                              {p.code}
                            </span>
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              Học kỳ: {p.semester}
                            </span>
                            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                              Khối áp dụng: {p.targetGrades.join(', ')}
                            </span>
                            <span
                              className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${
                                p.status === 'OPEN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'PUBLISHED'
                                  ? 'bg-amber-100 text-amber-900'
                                  : p.status === 'CLOSED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {p.status === 'OPEN'
                                ? 'ĐANG MỞ (OPEN)'
                                : p.status === 'PUBLISHED'
                                ? 'ĐÃ CÔNG BỐ (PUBLISHED)'
                                : p.status === 'CLOSED'
                                ? 'ĐÃ ĐÓNG (CLOSED)'
                                : 'CHƯA MỞ (DRAFT)'}
                            </span>
                          </div>

                          <h3 className="mt-2 text-base font-extrabold text-slate-900">{p.title}</h3>
                          {p.description && (
                            <p className="mt-1 text-xs text-slate-600">{p.description}</p>
                          )}

                          <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span>
                              Thời gian:{' '}
                              <strong>
                                {new Date(p.startDate).toLocaleDateString('vi-VN')} →{' '}
                                {new Date(p.endDate).toLocaleDateString('vi-VN')}
                              </strong>
                            </span>
                            <span>
                              Chỉ tiêu IP2.1: <strong>{p.ip21TargetRatePct}%</strong> (Ngưỡng đạt HS:{' '}
                              <strong>{p.ip21PassThresholdPct}%</strong>)
                            </span>
                            <span>
                              Đã hoàn thành: <strong>{p.stats?.submittedCount || 0} HS</strong> | Lưu nháp:{' '}
                              <strong>{p.stats?.draftCount || 0}</strong> | Pride NPS:{' '}
                              <strong>{p.stats?.npsResponsesCount || 0} lượt</strong>
                            </span>
                          </div>
                        </div>

                        {/* Các nút điều khiển vòng đời kỳ khảo sát */}
                        <div className="flex flex-wrap items-center gap-2">
                          {p.status !== 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => handleChangePeriodStatus(p.id, 'OPEN')}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              Mở kỳ & Giao nhiệm vụ
                            </button>
                          )}
                          {p.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => handleChangePeriodStatus(p.id, 'CLOSED')}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Đóng kỳ
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setExtendModalPeriod(p);
                              setExtendDateValue(
                                new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
                              );
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Gia hạn
                          </button>
                          {p.status !== 'PUBLISHED' && (
                            <button
                              type="button"
                              onClick={() => handleChangePeriodStatus(p.id, 'PUBLISHED')}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-purple-950 hover:bg-amber-400"
                            >
                              <Megaphone className="h-3.5 w-3.5" />
                              Công bố kết quả
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 7: BÁO CÁO TỔNG HỢP & XUẤT EXCEL / PDF
               ===================================================================== */}
            {activeTab === 'REPORTS' && (
              <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-purple-950">
                      Báo cáo Tổng hợp KPI IP2.1 & Khảo sát Tự hào Sky-Line (Pride NPS)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Đơn vị: Ban Khảo thí & Đảm bảo Chất lượng (KT&ĐBCL) • Phạm vi: {selectedCampusName}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 print:hidden">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-emerald-700"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Tải file Excel (.xlsx) đầy đủ 4 Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-800 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-purple-900"
                    >
                      <Printer className="h-4 w-4" />
                      In / Lưu PDF Báo cáo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500">1. Kết quả KPI IP2.1 Chính thức</div>
                    <div className="mt-1 text-2xl font-black text-purple-950">
                      {data.overview.ip21PassRatePct}% đạt chuẩn
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Điểm TB: {data.overview.avgIp21Score16}/16.0 • Chỉ tiêu năm học: {data.overview.ip21TargetRatePct}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500">2. Chỉ số 5 Phẩm chất mở rộng</div>
                    <div className="mt-1 text-2xl font-black text-amber-700">
                      {data.overview.avgExtendedScore20} / 20.0
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Điểm Tự hào Sky-Line (PC5): {data.overview.avgPrideQualityScore4}/4.0
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500">3. Chỉ số Pride NPS Độc lập</div>
                    <div className="mt-1 text-2xl font-black text-indigo-900">
                      {data.overview.npsSummary.isAnonymityMet
                        ? `${data.overview.npsSummary.npsScore}`
                        : 'Bảo mật (<5 mẫu)'}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Tổng phản hồi ẩn danh: {data.overview.npsSummary.totalResponses} lượt
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* MODAL TẠO KỲ KHẢO SÁT MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-purple-950">
                Khởi tạo Kỳ Tự nhìn nhận 5 Phẩm chất & Pride NPS (Khối 4–12)
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-sm font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Mã kỳ khảo sát *</label>
                  <input
                    type="text"
                    required
                    value={newPeriodForm.code}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Học kỳ *</label>
                  <select
                    value={newPeriodForm.semester}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, semester: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                  >
                    <option value="HK1">Học kỳ I (HK1)</option>
                    <option value="HK2">Học kỳ II (HK2)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Tên kỳ khảo sát *</label>
                <input
                  type="text"
                  required
                  value={newPeriodForm.title}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={newPeriodForm.startDate}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={newPeriodForm.endDate}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Trạng thái ban đầu</label>
                  <select
                    value={newPeriodForm.status}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold text-purple-900"
                  >
                    <option value="OPEN">Mở kỳ ngay (OPEN)</option>
                    <option value="DRAFT">Lưu bản nháp (DRAFT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-700">
                  Khối lớp áp dụng (Mặc định Khối 4–12 theo quy định)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['4', '5', '6', '7', '8', '9', '10', '11', '12'].map((g) => {
                    const checked = newPeriodForm.targetGrades.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          const next = checked
                            ? newPeriodForm.targetGrades.filter((x) => x !== g)
                            : [...newPeriodForm.targetGrades, g];
                          if (next.length > 0) {
                            setNewPeriodForm({ ...newPeriodForm, targetGrades: next });
                          }
                        }}
                        className={`rounded-lg px-3 py-1.5 font-bold transition ${
                          checked
                            ? 'bg-purple-800 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Khối {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Thông điệp Linh vật Sky-Line cầm cờ hướng dẫn học sinh
                </label>
                <textarea
                  rows={2}
                  value={newPeriodForm.guidelineMascotMsg}
                  onChange={(e) =>
                    setNewPeriodForm({ ...newPeriodForm, guidelineMascotMsg: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingPeriod}
                  className="rounded-xl bg-purple-800 px-5 py-2 font-extrabold text-white shadow hover:bg-purple-900 disabled:opacity-50"
                >
                  {submittingPeriod ? 'Đang khởi tạo...' : 'Xác nhận Tạo kỳ khảo sát'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GIA HẠN KỲ KHẢO SÁT */}
      {extendModalPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-purple-950">
              Gia hạn Kỳ khảo sát: {extendModalPeriod.title}
            </h3>
            <form onSubmit={handleExtendPeriodDeadline} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Ngày kết thúc mới *</label>
                <input
                  type="date"
                  required
                  value={extendDateValue}
                  onChange={(e) => setExtendDateValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtendModalPeriod(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-800 px-4 py-2 font-extrabold text-white"
                >
                  Lưu Gia hạn & Mở lại kỳ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
