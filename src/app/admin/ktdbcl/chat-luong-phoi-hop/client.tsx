'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  ShieldCheck,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Star,
  Award,
  Filter,
  Download,
  PlusCircle,
  RefreshCw,
  Target,
  Sparkles,
  Lock,
  FileSpreadsheet,
  Users,
  Activity,
} from 'lucide-react';
import {
  COORDINATION_TOPICS,
  CASE_STATUS_LABELS,
  PRIORITY_CONFIG,
  classifyAdminRole,
} from '@/lib/coordination/constants';

interface Props {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function AdminQualityCoordinationClient({ user }: Props) {
  const [activeTab, setActiveTab] = useState<
    'D1_OVERVIEW' | 'D3_CASES' | 'D4_NPS' | 'D5_IMPROVEMENTS' | 'D6_RBAC'
  >('D1_OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // D2. 12-Dimension Filter State
  const [contextData, setContextData] = useState<any>(null);
  const [filters, setFilters] = useState({
    academicYearId: '',
    periodId: '',
    campusId: '',
    level: '',
    programType: '',
    grade: '',
    classId: '',
    subjectId: '',
    departmentId: '',
    teacherId: '',
    fromDate: '',
    toDate: '',
    status: '',
  });

  // Data States
  const [dashboard, setDashboard] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [npsPeriods, setNpsPeriods] = useState<any[]>([]);
  const [npsAnalytics, setNpsAnalytics] = useState<any>(null);
  const [improvements, setImprovements] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  // D4. Create NPS Period Modal
  const [showNpsModal, setShowNpsModal] = useState(false);
  const [npsPeriodForm, setNpsPeriodForm] = useState({
    title: '',
    semester: 'HK1',
    targetScope: 'ALL' as 'ALL' | 'GVCN_ONLY' | 'GVBM_ONLY',
    minSampleSize: 5,
    publishImmediately: true,
  });

  // D5. Create Improvement Action Modal
  const [showImpModal, setShowImpModal] = useState(false);
  const [impForm, setImpForm] = useState({
    title: '',
    content: '',
    verifiedRootCause: '',
    actionPlan: '',
    assigneeUserId: '',
    assigneeName: '',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    sourceType: 'QA_AUDIT',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const adminGovernanceType = classifyAdminRole(user.role);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctxRes = await fetch(
        `/api/coordination/context${
          filters.academicYearId ? `?academicYearId=${filters.academicYearId}` : ''
        }`
      );
      const ctxJson = await ctxRes.json();
      if (!ctxRes.ok) throw new Error(ctxJson.error || 'Không thể tải cấu hình bộ lọc.');

      const ctx = ctxJson.data;
      setContextData(ctx);
      const ayId = filters.academicYearId || ctx.activeAcademicYear?.id || '';
      if (!filters.academicYearId && ayId) {
        setFilters((prev) => ({ ...prev, academicYearId: ayId }));
      }

      const qs = new URLSearchParams({
        viewMode: 'ADMIN_QA',
        ...(ayId ? { academicYearId: ayId } : {}),
        ...(filters.periodId ? { periodId: filters.periodId } : {}),
        ...(filters.campusId ? { campusId: filters.campusId } : {}),
        ...(filters.level ? { level: filters.level } : {}),
        ...(filters.programType ? { programType: filters.programType } : {}),
        ...(filters.grade ? { grade: filters.grade } : {}),
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
        ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
        ...(filters.toDate ? { toDate: filters.toDate } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      });

      const [dashRes, caseRes, npsRes, impRes] = await Promise.all([
        fetch(`/api/coordination/dashboard?${qs.toString()}`),
        fetch(`/api/coordination/cases?${qs.toString()}`),
        fetch(`/api/coordination/nps?${qs.toString()}`),
        fetch(
          `/api/coordination/improvements?includeSuggestions=true&${qs.toString()}`
        ),
      ]);

      const [dashJson, caseJson, npsJson, impJson] = await Promise.all([
        dashRes.json(),
        caseRes.json(),
        npsRes.json(),
        impRes.json(),
      ]);

      if (dashJson.success) setDashboard(dashJson.data);
      if (caseJson.success) setCases(caseJson.data || []);
      if (npsJson.success) {
        setNpsPeriods(npsJson.data.periods || []);
        setNpsAnalytics(npsJson.data.analytics || null);
      }
      if (impJson.success) {
        setImprovements(impJson.data.actions || []);
        setAiSuggestions(impJson.data.suggestions || []);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleCreateNpsPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!npsPeriodForm.title.trim()) return;
    try {
      const res = await fetch('/api/coordination/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_PERIOD',
          academicYearId: filters.academicYearId || contextData?.activeAcademicYear?.id,
          campusId: filters.campusId || null,
          ...npsPeriodForm,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShowNpsModal(false);
      showToast(
        `Đã tạo kỳ khảo sát & tự động đồng bộ ${json.data.syncedAssignmentsCount} phân công GVCN/GVBM!`
      );
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleCreateImprovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const defaultCampusId =
        filters.campusId || contextData?.filterOptions?.campuses?.[0]?.id || 'CAMPUS_MAIN';
      const res = await fetch('/api/coordination/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYearId: filters.academicYearId || contextData?.activeAcademicYear?.id,
          campusId: defaultCampusId,
          ...impForm,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShowImpModal(false);
      showToast(`Đã ban hành nhiệm vụ cải tiến ${json.data.issueCode}!`);
      await fetchAllData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleExportExcelReport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: 10 KPIs Summary
    const k = dashboard?.kpis || {};
    const kpiRows = [
      { ChiSo: '1. Tổng số hội thoại', GiaTri: k.totalThreads ?? 0 },
      { ChiSo: '2. Số yêu cầu cần xử lý', GiaTri: k.pendingCasesCount ?? 0 },
      { ChiSo: '3. Số yêu cầu quá hạn SLA', GiaTri: k.overdueCasesCount ?? 0 },
      {
        ChiSo: '4. Tỷ lệ phản hồi đúng hạn (%)',
        GiaTri: k.onTimeResponseRate ?? 'Chưa có dữ liệu',
      },
      {
        ChiSo: '5. Thời gian phản hồi trung vị (giờ hành chính)',
        GiaTri: k.medianResponseBusinessHours ?? 'Chưa có dữ liệu',
      },
      {
        ChiSo: '6. Tỷ lệ xử lý hoàn tất (%)',
        GiaTri: k.completionRate ?? 'Chưa có dữ liệu',
      },
      {
        ChiSo: '7. Tỷ lệ mở lại yêu cầu (%)',
        GiaTri: k.reopenRate ?? 'Chưa có dữ liệu',
      },
      {
        ChiSo: '8. CSAT sau xử lý (thang 1-5)',
        GiaTri: k.csatAverage ?? 'Chưa có dữ liệu',
      },
      {
        ChiSo: '9. NPS GVCN',
        GiaTri: k.npsGvcnEligible ? k.npsGvcn : 'Chưa đủ mẫu (<5)',
      },
      {
        ChiSo: '10. NPS GVBM',
        GiaTri: k.npsGvbmEligible ? k.npsGvbm : 'Chưa đủ mẫu (<5)',
      },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), '10_KPI_TongQuan');

    // Sheet 2: NPS By Teacher (Recalculated from raw valid responses)
    const teacherRows = (npsAnalytics?.byTeacher || []).map((t: any) => ({
      MaGV: t.teacherCode,
      HoTenGV: t.teacherName,
      VaiTro: t.roleType,
      LopPhuTrach: (t.classes || []).join(', '),
      MonHoc: (t.subjects || []).join(', '),
      SoPhanHoi: t.totalResponses,
      DuDieuKienCongBo: t.isEligibleToPublish ? 'Đủ mẫu' : 'Chưa đủ mẫu',
      DiemNPS: t.isEligibleToPublish ? t.npsScore : 'Ẩn (<5 mẫu)',
      PromotersPct: t.promotersPct ?? '',
      DetractorsPct: t.detractorsPct ?? '',
      DiemHaiLongTB_1_5: t.criteriaAverages?.overallSatisfaction ?? '',
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        teacherRows.length > 0 ? teacherRows : [{ ThongBao: 'Chưa có dữ liệu khảo sát NPS' }]
      ),
      'PhanTich_NPS_GiaoVien'
    );

    // Sheet 3: Cases
    const caseRows = cases.map((c) => ({
      MaYeuCau: c.caseCode,
      HocSinh: c.studentName,
      Lop: c.className,
      ChuyenMuc: c.categoryLabel,
      TieuDe: c.title,
      MucUuTien: c.priority,
      PhuTrach: c.assignedToName || c.teacherName,
      TrangThai: c.status,
      QuaHanSLA: c.isOverdue ? 'Quá hạn' : 'Trong hạn',
      SoLanMoLai: c.reopenedCount,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        caseRows.length > 0 ? caseRows : [{ ThongBao: 'Chưa có yêu cầu xử lý' }]
      ),
      'QuanLy_YeuCau_SLA'
    );

    XLSX.writeFile(
      wb,
      `Bao_Cao_Chat_Luong_Phoi_Hop_Giao_Duc_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    showToast('Đã xuất báo cáo Excel thành công!');
  };

  const kpis = dashboard?.kpis || {};
  const filterOpts = contextData?.filterOptions || {};

  return (
    <div className="min-h-screen bg-slate-50/80 pb-14">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#003B3A] px-4 py-3 text-xs font-bold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#003B3A]">
                <span>Đảm bảo chất lượng (KT&ĐBCL)</span>
                <span>/</span>
                <span>Chất lượng Phối hợp Giáo dục</span>
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Trung tâm Giám sát Chất lượng Phối hợp Giáo dục & NPS/CSAT
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Phân quyền hiện tại:{' '}
                <strong className="text-[#003B3A]">
                  {adminGovernanceType === 'TECHNICAL_ADMIN'
                    ? 'Admin Kỹ thuật (Quản trị cấu hình & bảo mật nội dung riêng tư)'
                    : 'Admin Nghiệp vụ KT&ĐBCL (Giám sát chất lượng, NPS & Cải tiến)'}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportExcelReport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Xuất Báo cáo Excel
              </button>
              <button
                onClick={() => setShowNpsModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#00A19A] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#008B85]"
              >
                <PlusCircle className="h-4 w-4" />
                Tạo Kỳ Khảo sát NPS
              </button>
              <button
                onClick={() => setShowImpModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#5B3172]"
              >
                <Target className="h-4 w-4" />
                Giao Nhiệm vụ Cải tiến
              </button>
            </div>
          </div>

          {/* D2. Bộ lọc đa chiều (12 Chiều) */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-600">
                <Filter className="h-3.5 w-3.5 text-[#003B3A]" />
                Bộ lọc đa chiều (12 tiêu chí)
              </span>
              <button
                onClick={() =>
                  setFilters({
                    academicYearId: contextData?.activeAcademicYear?.id || '',
                    periodId: '',
                    campusId: '',
                    level: '',
                    programType: '',
                    grade: '',
                    classId: '',
                    subjectId: '',
                    departmentId: '',
                    teacherId: '',
                    fromDate: '',
                    toDate: '',
                    status: '',
                  })
                }
                className="text-[11px] font-semibold text-[#003B3A] hover:underline"
              >
                Đặt lại bộ lọc
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {/* 1. Năm học */}
              <select
                value={filters.academicYearId}
                onChange={(e) => setFilters({ ...filters, academicYearId: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                {(contextData?.academicYears || []).map((ay: any) => (
                  <option key={ay.id} value={ay.id}>
                    1. Năm học: {ay.name}
                  </option>
                ))}
              </select>

              {/* 2. Kỳ khảo sát */}
              <select
                value={filters.periodId}
                onChange={(e) => setFilters({ ...filters, periodId: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">2. Tất cả kỳ khảo sát</option>
                {npsPeriods.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.semester})
                  </option>
                ))}
              </select>

              {/* 3. Cơ sở */}
              <select
                value={filters.campusId}
                onChange={(e) => setFilters({ ...filters, campusId: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">3. Tất cả cơ sở</option>
                {(filterOpts.campuses || []).map((cp: any) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.campusName}
                  </option>
                ))}
              </select>

              {/* 4. Cấp học */}
              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">4. Tất cả cấp học</option>
                {(filterOpts.levels || []).map((lv: string) => (
                  <option key={lv} value={lv}>
                    Cấp: {lv}
                  </option>
                ))}
              </select>

              {/* 5. Hệ học */}
              <select
                value={filters.programType}
                onChange={(e) => setFilters({ ...filters, programType: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">5. Tất cả hệ đào tạo</option>
                {(filterOpts.programTypes || []).map((pt: string) => (
                  <option key={pt} value={pt}>
                    Hệ: {pt}
                  </option>
                ))}
              </select>

              {/* 6. Khối */}
              <select
                value={filters.grade}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">6. Tất cả khối</option>
                {(filterOpts.grades || []).map((gr: string) => (
                  <option key={gr} value={gr}>
                    Khối {gr}
                  </option>
                ))}
              </select>

              {/* 7. Lớp */}
              <select
                value={filters.classId}
                onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">7. Tất cả lớp</option>
                {(filterOpts.classes || []).map((cl: any) => (
                  <option key={cl.id} value={cl.id}>
                    Lớp {cl.className}
                  </option>
                ))}
              </select>

              {/* 8. Môn học */}
              <select
                value={filters.subjectId}
                onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">8. Tất cả môn học</option>
                {(filterOpts.subjects || []).map((sb: any) => (
                  <option key={sb.id} value={sb.id}>
                    {sb.name}
                  </option>
                ))}
              </select>

              {/* 9. Tổ chuyên môn */}
              <select
                value={filters.departmentId}
                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">9. Tất cả tổ chuyên môn</option>
                {(filterOpts.departments || []).map((dp: any) => (
                  <option key={dp.id} value={dp.id}>
                    {dp.name}
                  </option>
                ))}
              </select>

              {/* 10. GVCN / GVBM */}
              <select
                value={filters.teacherId}
                onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">10. Tất cả GVCN/GVBM</option>
                {(filterOpts.teachers || []).map((tc: any) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.teacherName} ({tc.teacherCode})
                  </option>
                ))}
              </select>

              {/* 11. Khoảng thời gian */}
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                title="11. Từ ngày"
              />

              {/* 12. Trạng thái xử lý */}
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="">12. Tất cả trạng thái xử lý</option>
                {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        {/* D1. 10 Real-Data KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              1. Tổng hội thoại
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">
              {kpis.totalThreads ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              2. YC cần xử lý
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-blue-700">
              {kpis.pendingCasesCount ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-rose-100 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              3. YC quá hạn
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-rose-600">
              {kpis.overdueCasesCount ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              4. Đúng hạn %
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-[#00736E]">
              {kpis.onTimeResponseRate !== null && kpis.onTimeResponseRate !== undefined
                ? `${kpis.onTimeResponseRate}%`
                : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              5. TG trung vị
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">
              {kpis.medianResponseBusinessHours !== null &&
              kpis.medianResponseBusinessHours !== undefined
                ? `${kpis.medianResponseBusinessHours}h`
                : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              6. Hoàn tất %
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-emerald-700">
              {kpis.completionRate !== null && kpis.completionRate !== undefined
                ? `${kpis.completionRate}%`
                : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              7. Tỷ lệ mở lại
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-amber-700">
              {kpis.reopenRate !== null && kpis.reopenRate !== undefined
                ? `${kpis.reopenRate}%`
                : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              8. CSAT xử lý
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">
              {kpis.csatAverage !== null && kpis.csatAverage !== undefined
                ? `${kpis.csatAverage}/5`
                : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase text-[#003B3A]">
              9. NPS GVCN
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-[#003B3A]">
              {kpis.npsGvcnEligible && kpis.npsGvcn !== null ? kpis.npsGvcn : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase text-[#003B3A]">
              10. NPS GVBM
            </div>
            <div className="mt-1 text-lg font-extrabold tabular-nums text-[#003B3A]">
              {kpis.npsGvbmEligible && kpis.npsGvbm !== null ? kpis.npsGvbm : '—'}
            </div>
          </div>
        </div>

        {/* Empty State Notice when no real data exists yet (Section D1 Rule) */}
        {dashboard && !dashboard.hasData && (
          <div className="mt-4 rounded-2xl border border-dashed border-teal-200 bg-white p-6 text-center">
            <Activity className="mx-auto h-8 w-8 text-[#003B3A]" />
            <h3 className="mt-2 text-sm font-bold text-slate-800">
              Trạng thái Dữ liệu Thực: Chưa có phát sinh trong phạm vi bộ lọc hiện tại
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Hệ thống tuân thủ nguyên tắc minh bạch dữ liệu thật 100%, không tự sinh số liệu giả. Khi PHHS, GVCN và GVBM thực hiện trao đổi hoặc khảo sát NPS, các chỉ số sẽ tự động tổng hợp tức thời.
            </p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {[
            { id: 'D1_OVERVIEW', label: 'D1. Tổng quan & Phân tích Chủ đề' },
            { id: 'D3_CASES', label: `D3. Quản lý Yêu cầu & Phản ánh (${cases.length})` },
            { id: 'D4_NPS', label: `D4. Quản lý NPS Định kỳ (${npsPeriods.length})` },
            { id: 'D5_IMPROVEMENTS', label: `D5. Quản lý Cải tiến & Gợi ý AI (${improvements.length})` },
            { id: 'D6_RBAC', label: 'D6. Phân quyền Admin Kỹ thuật vs Nghiệp vụ' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === t.id
                  ? 'bg-[#003B3A] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB D1: OVERVIEW */}
        {activeTab === 'D1_OVERVIEW' && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6">
              <h3 className="text-sm font-bold text-slate-900">
                Phân bố Yêu cầu theo 7 Nhóm Chủ đề
              </h3>
              <div className="mt-3 space-y-2.5">
                {(dashboard?.recurringIssues || []).length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    Chưa có dữ liệu yêu cầu xử lý theo chủ đề.
                  </p>
                ) : (
                  (dashboard?.recurringIssues || []).map((item: any) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{item.label}</span>
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-mono font-bold text-[#003B3A]">
                        {item.count} hồ sơ
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6">
              <h3 className="text-sm font-bold text-slate-900">
                Tổng hợp NPS Toàn Hệ thống (Tính lại từ Toàn bộ Phản hồi Gốc Hợp lệ)
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Công thức chuẩn: NPS = %Promoters (9–10) – %Detractors (0–6). Không lấy trung bình cộng điểm NPS các lớp.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5">
                  <div className="font-semibold text-[#003B3A]">NPS Khối GVCN</div>
                  <div className="mt-1 text-2xl font-extrabold text-[#003B3A]">
                    {npsAnalytics?.gvcnMetrics?.isEligibleToPublish
                      ? npsAnalytics.gvcnMetrics.npsScore
                      : 'Chưa đủ mẫu (<5)'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Tổng mẫu: {npsAnalytics?.gvcnMetrics?.totalResponses || 0} phản hồi
                  </div>
                </div>

                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3.5">
                  <div className="font-semibold text-[#00736E]">NPS Khối GVBM</div>
                  <div className="mt-1 text-2xl font-extrabold text-[#00736E]">
                    {npsAnalytics?.gvbmMetrics?.isEligibleToPublish
                      ? npsAnalytics.gvbmMetrics.npsScore
                      : 'Chưa đủ mẫu (<5)'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Tổng mẫu: {npsAnalytics?.gvbmMetrics?.totalResponses || 0} phản hồi
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB D3: QUẢN LÝ YÊU CẦU VÀ PHẢN ÁNH */}
        {activeTab === 'D3_CASES' && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Giám sát Hồ sơ Yêu cầu, SLA & Kiểm tra Đóng Yêu cầu ({cases.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Cảnh báo quá hạn tự động theo giờ hành chính. Chỉ người có quyền phù hợp mới xem được nội dung riêng tư.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã YC</th>
                    <th className="px-4 py-3">Học sinh / Lớp</th>
                    <th className="px-4 py-3">Nhóm chủ đề & Nội dung</th>
                    <th className="px-4 py-3">Ưu tiên / SLA</th>
                    <th className="px-4 py-3">Người phụ trách</th>
                    <th className="px-4 py-3">Trạng thái / Nhật ký</th>
                    <th className="px-4 py-3 text-right">Thẩm định Đóng YC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Chưa có yêu cầu xử lý nào trong bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => {
                      const stBadge =
                        CASE_STATUS_LABELS[c.status] || CASE_STATUS_LABELS.NEW;
                      const priBadge =
                        PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.NORMAL;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-[#003B3A]">
                            {c.caseCode}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{c.studentName}</div>
                            <div className="text-[11px] text-slate-500">Lớp {c.className}</div>
                          </td>
                          <td className="max-w-sm px-4 py-3">
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-[#003B3A]">
                              {c.categoryLabel}
                            </span>
                            <div className="mt-1 font-semibold text-slate-900">{c.title}</div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                              {c.description}
                            </p>
                            {c.resolutionSummary && (
                              <div className="mt-1 rounded bg-teal-50 p-1.5 text-[11px] text-teal-900">
                                <strong>Kết quả:</strong> {c.resolutionSummary}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${priBadge.badgeClass}`}
                            >
                              {priBadge.label}
                            </span>
                            <div className="mt-1 font-mono text-[11px]">
                              Hạn: {new Date(c.slaDueAt).toLocaleDateString('vi-VN')}
                            </div>
                            {c.isOverdue && (
                              <span className="inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                Quá hạn SLA
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">
                              {c.assignedToName || c.teacherName}
                            </div>
                            <div className="text-[10px] text-slate-400">{c.assignedRole}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${stBadge.badgeClass}`}
                            >
                              {stBadge.label}
                            </span>
                            <div className="mt-1 text-[10px] text-slate-400">
                              {c.history?.length || 0} bước nhật ký • Mở lại: {c.reopenedCount}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {c.status !== 'COMPLETED' && (
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/coordination/cases/${c.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'SLA_REMINDER',
                                        note: 'Ban KT&ĐBCL gửi nhắc việc xử lý đúng hạn SLA.',
                                      }),
                                    });
                                    showToast(`Đã gửi nhắc việc cho hồ sơ ${c.caseCode}.`);
                                    fetchAllData();
                                  }}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                                >
                                  Nhắc SLA
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
        )}

        {/* TAB D4: QUẢN LÝ NPS */}
        {activeTab === 'D4_NPS' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">
                Danh sách Kỳ Khảo sát NPS & Đồng bộ Phân công ({npsPeriods.length})
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {npsPeriods.length === 0 ? (
                  <p className="col-span-2 py-4 text-center text-xs text-slate-400">
                    Chưa có kỳ khảo sát NPS nào. Nhấn &ldquo;Tạo Kỳ Khảo sát NPS&rdquo; để khởi tạo.
                  </p>
                ) : (
                  npsPeriods.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#003B3A]">{p.code}</span>
                        <h4 className="mt-0.5 font-bold text-slate-900">{p.title}</h4>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Học kỳ: {p.semester} • Phạm vi: {p.targetScope} • Ngưỡng mẫu tối thiểu:{' '}
                          <strong>&ge; {p.minSampleSize}</strong>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Số phân công GV: {p._count?.assignments || 0} • Phản hồi hợp lệ:{' '}
                          <strong>{p._count?.responses || 0}</strong>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-[#003B3A]">
                          {p.status}
                        </span>
                        <button
                          onClick={async () => {
                            const res = await fetch('/api/coordination/nps', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'SYNC_ASSIGNMENTS',
                                periodId: p.id,
                              }),
                            });
                            const json = await res.json();
                            if (res.ok) {
                              showToast(
                                `Đã đồng bộ bổ sung ${json.data.syncedCount} phân công GVCN/GVBM.`
                              );
                              fetchAllData();
                            }
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Đồng bộ lại phân công
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Teacher NPS Breakdown Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Bảng Phân tích NPS & Điểm Hài lòng 5 Tiêu chí theo Giáo viên
                </h3>
                <p className="text-xs text-slate-500">
                  Khi giáo viên dạy nhiều lớp, điểm NPS được tính lại chính xác từ toàn bộ phản hồi gốc hợp lệ của giáo viên đó.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Giáo viên</th>
                      <th className="px-4 py-3">Vai trò</th>
                      <th className="px-4 py-3">Lớp / Môn</th>
                      <th className="px-4 py-3">Số phản hồi</th>
                      <th className="px-4 py-3">Promoters / Detractors</th>
                      <th className="px-4 py-3">Điểm NPS</th>
                      <th className="px-4 py-3">Điểm 5 tiêu chí (1–5)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(npsAnalytics?.byTeacher || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Chưa có dữ liệu phản hồi khảo sát NPS.
                        </td>
                      </tr>
                    ) : (
                      (npsAnalytics?.byTeacher || []).map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{t.teacherName}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {t.teacherCode}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-[#003B3A]">
                              {t.roleType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px]">
                            <div>Lớp: {(t.classes || []).join(', ')}</div>
                            {t.subjects?.length > 0 && (
                              <div className="text-slate-500">
                                Môn: {t.subjects.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            {t.totalResponses} (tối thiểu {t.minSampleSize})
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px]">
                            {t.isEligibleToPublish
                              ? `${t.promotersPct}% / ${t.detractorsPct}%`
                              : 'Ẩn bảo mật mẫu nhỏ'}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm font-extrabold text-[#003B3A]">
                            {t.isEligibleToPublish ? t.npsScore : 'Chưa đủ mẫu (<5)'}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-teal-800">
                            {t.isEligibleToPublish
                              ? `${t.criteriaAverages?.overallSatisfaction}/5.0`
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB D5: QUẢN LÝ CẢI TIẾN & AI SUGGESTIONS */}
        {activeTab === 'D5_IMPROVEMENTS' && (
          <div className="mt-4 space-y-4">
            {/* Human-in-the-loop AI Suggestions (Phase 4) */}
            {aiSuggestions.length > 0 && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#003B3A]">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    Gợi ý Phân tích Chủ đề & Hành động Cải tiến (Dựa trên dữ liệu xác thực – Cần thẩm định)
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {aiSuggestions.map((sug: any) => (
                    <div
                      key={sug.suggestedCode}
                      className="rounded-xl border border-teal-200 bg-white p-4 text-xs shadow-2xs"
                    >
                      <div className="font-bold text-slate-900">{sug.suggestedTitle}</div>
                      <p className="mt-1 text-slate-600">
                        <strong>Phân tích nguyên nhân:</strong> {sug.suggestedRootCauseHypothesis}
                      </p>
                      <p className="mt-1 text-slate-600">
                        <strong>Đề xuất biện pháp:</strong> {sug.suggestedActionPlan}
                      </p>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => {
                            setImpForm({
                              title: sug.suggestedTitle,
                              content: `Phát hiện từ ${sug.evidenceCount} yêu cầu thực tế thuộc nhóm ${sug.categoryLabel}`,
                              verifiedRootCause: sug.suggestedRootCauseHypothesis,
                              actionPlan: sug.suggestedActionPlan,
                              assigneeUserId: user.id || '',
                              assigneeName: user.name || 'Tổ chuyên môn',
                              dueDate: new Date(Date.now() + 14 * 86400000)
                                .toISOString()
                                .slice(0, 10),
                              sourceType: 'AI_SUGGESTED',
                            });
                            setShowImpModal(true);
                          }}
                          className="rounded-lg bg-[#003B3A] px-3 py-1.5 font-bold text-white"
                        >
                          Thẩm định & Tạo nhiệm vụ cải tiến
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Danh mục Nhiệm vụ Cải tiến Chất lượng ({improvements.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Mã vấn đề</th>
                      <th className="px-4 py-3">Nội dung & Nguyên nhân xác minh</th>
                      <th className="px-4 py-3">Biện pháp & Minh chứng</th>
                      <th className="px-4 py-3">Phụ trách / Hạn</th>
                      <th className="px-4 py-3">Tái diễn</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Xác minh hiệu quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {improvements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Chưa có nhiệm vụ cải tiến nào.
                        </td>
                      </tr>
                    ) : (
                      improvements.map((imp) => (
                        <tr key={imp.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-[#003B3A]">
                            {imp.issueCode}
                          </td>
                          <td className="max-w-xs px-4 py-3">
                            <div className="font-bold text-slate-900">{imp.title}</div>
                            <p className="mt-0.5 text-[11px] text-slate-600">
                              <strong>Nguyên nhân:</strong> {imp.verifiedRootCause}
                            </p>
                          </td>
                          <td className="max-w-xs px-4 py-3">
                            <p className="text-[11px] text-slate-700">{imp.actionPlan}</p>
                            {imp.evidenceNote && (
                              <p className="mt-1 text-[11px] text-teal-800">
                                <strong>Minh chứng:</strong> {imp.evidenceNote}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px]">
                            <div className="font-semibold text-slate-800">
                              {imp.assigneeName || 'Người phụ trách'}
                            </div>
                            <div className="text-slate-500">
                              Hạn: {new Date(imp.dueDate).toLocaleDateString('vi-VN')}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            {imp.recurrenceCount} kỳ
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-[#003B3A]">
                              {imp.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {imp.status !== 'VERIFIED_EFFECTIVE' && (
                              <button
                                onClick={async () => {
                                  await fetch('/api/coordination/improvements', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      id: imp.id,
                                      status: 'VERIFIED_EFFECTIVE',
                                      verificationResult:
                                        'Ban KT&ĐBCL đã kiểm tra minh chứng và xác nhận hiệu quả cải tiến.',
                                      postImprovementEffectiveness: 'Giảm tái diễn phản ánh',
                                    }),
                                  });
                                  showToast(`Đã nghiệm thu nhiệm vụ cải tiến ${imp.issueCode}!`);
                                  fetchAllData();
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white"
                              >
                                Nghiệm thu đạt
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB D6: PHÂN QUYỀN ADMIN KỸ THUẬT VS ADMIN NGHIỆP VỤ KT&ĐBCL */}
        {activeTab === 'D6_RBAC' && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Lock className="h-4 w-4 text-slate-700" />
                <span>1. Admin Kỹ thuật (Technical Admin)</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Áp dụng cho vai trò: <code>ADMIN</code>, <code>SUPER_ADMIN</code>, <code>IT_ADMIN</code>
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-slate-700">
                <li>Quản lý cấu hình hệ thống, tài khoản, phân quyền, tích hợp và nhật ký AuditLog.</li>
                <li>
                  <strong>Giới hạn quyền riêng tư:</strong> Không mặc định được cấp quyền đọc toàn bộ nội dung hội thoại riêng tư giữa PHHS và Giáo viên nếu hội thoại/yêu cầu không được chuyển cấp xử lý.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-[#003B3A]">
                <ShieldCheck className="h-4 w-4 text-[#003B3A]" />
                <span>2. Admin Nghiệp vụ KT&ĐBCL (QA Business Admin)</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Áp dụng cho vai trò: <code>KT_DBCL</code>, <code>KHAO_THI</code>, <code>BGH</code>, <code>GDCS</code>
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-slate-700">
                <li>
                  Quản lý kỳ khảo sát NPS, đồng bộ phân công GVCN/GVBM, giám sát SLA và phân tích chất lượng theo phạm vi Cơ sở được phân quyền.
                </li>
                <li>
                  Thẩm định đóng yêu cầu, tạo và nghiệm thu các nhiệm vụ cải tiến chất lượng (<code>QualityImprovementAction</code>).
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Modal D4: Tạo kỳ khảo sát NPS */}
      {showNpsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Tạo Kỳ Khảo sát NPS & Đồng bộ Phân công GVCN/GVBM
            </h3>
            <form onSubmit={handleCreateNpsPeriod} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Tên kỳ khảo sát *</label>
                <input
                  type="text"
                  required
                  value={npsPeriodForm.title}
                  onChange={(e) => setNpsPeriodForm({ ...npsPeriodForm, title: e.target.value })}
                  placeholder="VD: Khảo sát Chất lượng Phối hợp Giáo dục Học kỳ I"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700">Kỳ học</label>
                  <select
                    value={npsPeriodForm.semester}
                    onChange={(e) =>
                      setNpsPeriodForm({ ...npsPeriodForm, semester: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                    <option value="CA_NAM">Cả năm</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Ngưỡng mẫu tối thiểu</label>
                  <input
                    type="number"
                    min={1}
                    value={npsPeriodForm.minSampleSize}
                    onChange={(e) =>
                      setNpsPeriodForm({
                        ...npsPeriodForm,
                        minSampleSize: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Phạm vi đối tượng</label>
                <select
                  value={npsPeriodForm.targetScope}
                  onChange={(e) =>
                    setNpsPeriodForm({
                      ...npsPeriodForm,
                      targetScope: e.target.value as any,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="ALL">Toàn bộ GVCN & GVBM</option>
                  <option value="GVCN_ONLY">Chỉ Giáo viên Chủ nhiệm (GVCN)</option>
                  <option value="GVBM_ONLY">Chỉ Giáo viên Bộ môn (GVBM)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNpsModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#003B3A] px-4 py-2 font-bold text-white"
                >
                  Tạo & Đồng bộ phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal D5: Tạo nhiệm vụ cải tiến */}
      {showImpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Ban hành Nhiệm vụ Cải tiến Chất lượng (D5)
            </h3>
            <form onSubmit={handleCreateImprovement} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Tiêu đề vấn đề cần cải tiến *</label>
                <input
                  type="text"
                  required
                  value={impForm.title}
                  onChange={(e) => setImpForm({ ...impForm, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Nội dung chi tiết *</label>
                <textarea
                  rows={2}
                  required
                  value={impForm.content}
                  onChange={(e) => setImpForm({ ...impForm, content: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Nguyên nhân đã xác minh *</label>
                <textarea
                  rows={2}
                  required
                  value={impForm.verifiedRootCause}
                  onChange={(e) => setImpForm({ ...impForm, verifiedRootCause: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Biện pháp khắc phục & cải tiến *</label>
                <textarea
                  rows={2}
                  required
                  value={impForm.actionPlan}
                  onChange={(e) => setImpForm({ ...impForm, actionPlan: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700">Người / Bộ phận phụ trách</label>
                  <input
                    type="text"
                    value={impForm.assigneeName}
                    onChange={(e) => setImpForm({ ...impForm, assigneeName: e.target.value })}
                    placeholder="VD: Tổ Toán / GVCN Khối 8"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Hạn hoàn thành *</label>
                  <input
                    type="date"
                    required
                    value={impForm.dueDate}
                    onChange={(e) => setImpForm({ ...impForm, dueDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImpModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#003B3A] px-4 py-2 font-bold text-white"
                >
                  Giao nhiệm vụ cải tiến
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
