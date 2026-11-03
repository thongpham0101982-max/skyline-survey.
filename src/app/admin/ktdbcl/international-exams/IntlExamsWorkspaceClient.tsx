'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Award,
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  Globe,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
  Layers,
  BookOpen,
  FileText,
  Bell,
} from 'lucide-react';
import { EXAM_FAMILY_META, EXAM_TYPE_META, ExamFamilyCode } from '@/lib/intl-exams/ruleEngine';
import {
  IntlExamFilterInput,
  deleteIntlExamResultAction,
  getIntlExamsWorkspaceData,
} from './actions';
import SpecializedDashboardsView from './components/SpecializedDashboardsView';
import SpecializedEntryModal from './components/SpecializedEntryModal';
import ImportAndReconcileView from './components/ImportAndReconcileView';
import IntlExamPdfReportModal from './components/IntlExamPdfReportModal';
import IntlExamNotificationModal from './components/IntlExamNotificationModal';
import SsmStudentRosterManager from './components/SsmStudentRosterManager';

interface Props {
  initialData: Awaited<ReturnType<typeof getIntlExamsWorkspaceData>>;
}

export default function IntlExamsWorkspaceClient({ initialData }: Props) {
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const [mainTab, setMainTab] = useState<
    'DASHBOARDS' | 'RESULTS_LEDGER' | 'CERTIFICATES_VAULT' | 'IMPORT_RECONCILE'
  >('DASHBOARDS');

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (
      tabParam === 'DASHBOARDS' ||
      tabParam === 'RESULTS_LEDGER' ||
      tabParam === 'CERTIFICATES_VAULT' ||
      tabParam === 'IMPORT_RECONCILE'
    ) {
      setMainTab(tabParam);
    }
  }, [searchParams]);

  // Global Filters (Default to active academic year 2026-2027 so classes & students match the current school year)
  const [filters, setFilters] = useState<IntlExamFilterInput>({
    academicYear: '2026-2027',
    semester: 'ALL',
    examMonth: 'ALL',
    campusCode: 'ALL',
    grade: 'ALL',
    className: 'ALL',
    eduSystem: 'ALL',
    examFamily: 'ALL',
    examType: 'ALL',
    search: '',
  });

  // Entry modal, PDF Report modal & Notification Hub modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyTargetIds, setNotifyTargetIds] = useState<string[] | undefined>(undefined);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [preselectedStudent, setPreselectedStudent] = useState<any | null>(null);
  const [defaultModalFamily, setDefaultModalFamily] = useState<ExamFamilyCode>('CAMBRIDGE_YLE');

  const refreshWorkspace = (nextFilters: IntlExamFilterInput = filters) => {
    startTransition(async () => {
      const fresh = await getIntlExamsWorkspaceData(nextFilters);
      setData(fresh);
    });
  };

  const handleFilterChange = (patch: Partial<IntlExamFilterInput>) => {
    const next = { ...filters, ...patch };
    if (patch.examFamily && patch.examFamily !== filters.examFamily) {
      next.examType = 'ALL';
    }
    if (
      patch.academicYear !== undefined ||
      patch.campusCode !== undefined ||
      patch.grade !== undefined
    ) {
      const validClasses = (data.filterOptions?.ssmClasses || []).filter((cl) => {
        if (next.academicYear && next.academicYear !== 'ALL' && cl.academicYearName !== next.academicYear) {
          return false;
        }
        if (next.campusCode && next.campusCode !== 'ALL' && cl.campusCode !== next.campusCode) {
          return false;
        }
        if (next.grade && next.grade !== 'ALL' && cl.grade !== next.grade) {
          return false;
        }
        return true;
      });
      if (
        next.className &&
        next.className !== 'ALL' &&
        !validClasses.some((cl) => cl.className === next.className)
      ) {
        next.className = 'ALL';
      }
    }
    setFilters(next);
    refreshWorkspace(next);
  };

  const handleDeleteResult = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa kết quả thi của học sinh "${name}"?`)) return;
    await deleteIntlExamResultAction(id);
    refreshWorkspace();
  };

  const handleExportExcel = () => {
    const exportRows = data.results.map((r, idx) => ({
      STT: idx + 1,
      'Năm học': r.academicYearText,
      'Nhóm kỳ thi': EXAM_FAMILY_META[r.examFamily]?.shortLabel || r.examFamily,
      'Bài thi': EXAM_TYPE_META[r.examType]?.label || r.examType,
      'Mã HS SSM': r.studentCodeSnapshot || 'Chờ đối soát',
      'Họ và tên học sinh': r.studentNameSnapshot,
      'Cơ sở': r.campusCodeSnapshot || '',
      Khối: r.gradeSnapshot || '',
      Lớp: r.classNameSnapshot || '',
      'Hệ đào tạo': r.eduSystemSnapshot || '',
      'Trạng thái dự thi': r.sittingStatus,
      'Tóm tắt Kết quả': r.summaryScoreLabel,
      'Chi tiết Kỹ năng / Môn học': (r.skillResults || [])
        .map(
          (s: any) =>
            `${s.componentCode}: ${s.numericScore ?? '-'}${
              s.officialBandCode ? ` (${s.officialBandCode})` : ''
            }`
        )
        .join(' | '),
      'Trạng thái Chứng chỉ': r.certificate?.certificateStatus || '',
      'Số hiệu Chứng chỉ': r.certificate?.certificateNumber || '',
      'Đã xác minh Mã HS': r.isStudentVerified ? 'Đã khớp SSM' : 'Lịch sử chờ đối soát',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KetQuaKhaoThiQuocTe');
    XLSX.writeFile(wb, `SSM_KetQua_KhaoThiQuocTe_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-4 space-y-5">
        {/* Independent Category Tag Bar for Khảo thí Quốc tế & Chứng chỉ */}
        <div className="space-y-3 no-print">
          {/* Level 1: Independent Category Header Tab */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 gap-2">
            <div className="flex items-center gap-2 px-5 py-3 border-b-2 border-[#48BFE3] text-[#007796] font-extrabold text-xs uppercase tracking-wider bg-sky-50/50 rounded-t-xl">
              <Globe className="w-4 h-4 text-[#48BFE3]" />
              <span>Khảo thí Quốc tế & Chứng chỉ (Cambridge / IELTS / Pearson)</span>
            </div>
            <div className="flex items-center gap-1.5 pb-1.5">
              {(
                [
                  { code: 'ALL', label: 'Tất cả Chuẩn Quốc tế' },
                  { code: 'CAMBRIDGE_YLE', label: 'Cambridge YLE (Starters/Movers/Flyers)' },
                  { code: 'CAMBRIDGE_MAIN', label: 'Cambridge KET / PET' },
                  { code: 'IELTS', label: 'IELTS Academic' },
                  { code: 'PEARSON_EDEXCEL', label: 'Pearson Edexcel' },
                  { code: 'CAMBRIDGE_CHECKPOINT', label: 'Cambridge Checkpoint' },
                ] as const
              ).map((fam) => {
                const isSelected = (filters.examFamily || 'ALL') === fam.code;
                return (
                  <button
                    key={fam.code}
                    type="button"
                    onClick={() => handleFilterChange({ examFamily: fam.code })}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {fam.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2: Dedicated Sub-Tabs of Danh mục Khảo thí Quốc tế & Chứng chỉ */}
          <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl px-1.5 py-1.5">
            <div className="flex flex-wrap gap-1">
              {[
                {
                  id: 'DASHBOARDS',
                  label: '1. Phân tích & Dashboard Chuyên biệt (5 Nhóm Kỳ thi)',
                  icon: BarChart3,
                },
                {
                  id: 'RESULTS_LEDGER',
                  label: `2. Sổ Kết quả & Thành phần Chi tiết (${data.results.length})`,
                  icon: BookOpen,
                },
                {
                  id: 'CERTIFICATES_VAULT',
                  label: `3. Kho Lưu trữ & Theo dõi Chứng chỉ (${data.denominators.awardedCertificatesCount})`,
                  icon: Award,
                },
                {
                  id: 'IMPORT_RECONCILE',
                  label: '4. Import Excel & Cấu hình Quy chuẩn Điểm',
                  icon: FileSpreadsheet,
                },
              ].map((tab) => {
                const isActive = mainTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMainTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                      isActive
                        ? 'bg-[#48BFE3] text-white border-[#48BFE3] shadow-xs'
                        : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Hero & Action Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-extrabold mb-1.5">
              <Award className="w-3.5 h-3.5 text-teal-600" />
              Phân hệ Quản lý Kết quả Khảo thí Quốc tế & Chứng chỉ Học sinh Sky-Line
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cambridge YLE • KET/PET • IELTS • Pearson Edexcel • Cambridge Checkpoint
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Nhập kết quả chuẩn cấu trúc kỹ năng/môn học • Theo dõi tiến bộ dọc • Phân tích 5 Dashboard chuyên biệt • Lưu trữ chứng chỉ & liên thông Hồ sơ học sinh 360°
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setNotifyTargetIds(
                  data.results.length > 0 ? data.results.map((r: any) => r.id) : undefined
                );
                setNotifyModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-extrabold flex items-center gap-2 shadow-2xs transition"
            >
              <Bell className="w-4 h-4 text-amber-600" />
              <span>Thông báo & Liên lạc (GVCN • PH • HS)</span>
            </button>
            <button
              onClick={() => setPdfModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-[#003B3A] bg-[#003B3A] hover:bg-[#004f4d] text-white text-xs font-extrabold flex items-center gap-2 shadow-2xs transition"
            >
              <FileText className="w-4 h-4 text-[#48BFE3]" />
              <span>Xuất Báo cáo PDF (Tháng / Kỳ / Năm)</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Xuất Báo cáo Excel ({data.results.length})</span>
            </button>
            <button
              onClick={() => {
                setEditingRecord(null);
                setPreselectedStudent(null);
                setDefaultModalFamily(
                  filters.examFamily && filters.examFamily !== 'ALL'
                    ? (filters.examFamily as ExamFamilyCode)
                    : 'CAMBRIDGE_YLE'
                );
                setEntryModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-xs flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nhập Kết quả / Chứng chỉ Mới</span>
            </button>
          </div>
        </div>

        {/* 4 Explicit Denominators Governance Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                1. Học sinh trong Danh sách SSM
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {data.denominators?.totalSsmStudentsCount ?? data.ssmStudentRoster?.length ?? 0}
              </div>
              <div className="text-[11px] text-teal-700 font-semibold mt-0.5">
                Đã có kết quả thi: {data.denominators.uniqueStudentsCount} HS
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                2. Số lượt thi (Exam Sittings)
              </div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {data.denominators.completedSittingsCount}
                {data.denominators.absentSittingsCount > 0 && (
                  <span className="text-xs font-bold text-amber-600 ml-1.5">
                    (+{data.denominators.absentSittingsCount} vắng)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Mẫu số chuẩn tính tỷ lệ theo bài thi
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                3. Kết quả Kỹ năng / Môn học
              </div>
              <div className="text-2xl font-black text-purple-700 mt-1">
                {data.denominators.totalComponentEntriesCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Mẫu số phân tích RW/L/S, Math/Sci/ESL
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                4. Chứng chỉ & Liên thông SSM
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {data.denominators.awardedCertificatesCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Đã khớp Mã HS SSM: {data.denominators.verifiedStudentsSittingsCount} lượt
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Global Multi-Dimensional Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
              <Filter className="w-4 h-4 text-teal-600" />
              <span>Bộ lọc Đa chiều (Năm học • Kỳ học • Tháng • Cơ sở • Khối • Lớp • Hệ học • Kỳ thi)</span>
            </div>
            {isPending && (
              <span className="text-xs font-bold text-teal-600 animate-pulse">
                Đang đồng bộ dữ liệu...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Năm học
              </label>
              <select
                value={filters.academicYear}
                onChange={(e) => handleFilterChange({ academicYear: e.target.value })}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả năm học</option>
                {data.filterOptions.academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kỳ học
              </label>
              <select
                value={filters.semester || 'ALL'}
                onChange={(e) => handleFilterChange({ semester: e.target.value })}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả kỳ học</option>
                <option value="HK1">Học kỳ I (T8–T12)</option>
                <option value="HK2">Học kỳ II (T1–T5)</option>
                <option value="SUMMER">Học kỳ Hè (T6–T7)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Tháng thi
              </label>
              <select
                value={filters.examMonth || 'ALL'}
                onChange={(e) => handleFilterChange({ examMonth: e.target.value })}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả tháng</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={String(m)}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Cơ sở
              </label>
              <select
                value={filters.campusCode}
                onChange={(e) => handleFilterChange({ campusCode: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả cơ sở</option>
                {data.filterOptions.campuses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Khối
              </label>
              <select
                value={filters.grade}
                onChange={(e) => handleFilterChange({ grade: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả khối</option>
                {data.filterOptions.grades.map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Lớp
              </label>
              <select
                value={filters.className}
                onChange={(e) => handleFilterChange({ className: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả lớp</option>
                {data.filterOptions.classes.map((cls) => (
                  <option key={cls} value={cls}>
                    Lớp {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Hệ đào tạo
              </label>
              <select
                value={filters.eduSystem}
                onChange={(e) => handleFilterChange({ eduSystem: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả hệ học</option>
                {data.filterOptions.eduSystems.map((ed) => (
                  <option key={ed} value={ed}>
                    {ed}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Nhóm kỳ thi
              </label>
              <select
                value={filters.examFamily}
                onChange={(e) => handleFilterChange({ examFamily: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả nhóm kỳ thi</option>
                {(Object.keys(EXAM_FAMILY_META) as ExamFamilyCode[]).map((f) => (
                  <option key={f} value={f}>
                    {EXAM_FAMILY_META[f].shortLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Bài thi cụ thể
              </label>
              <select
                value={filters.examType}
                onChange={(e) => handleFilterChange({ examType: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả bài thi</option>
                {Object.values(EXAM_TYPE_META)
                  .filter(
                    (t) =>
                      !filters.examFamily ||
                      filters.examFamily === 'ALL' ||
                      t.family === filters.examFamily
                  )
                  .map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.shortLabel}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Tìm Học sinh / Mã HS
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  placeholder="Tên HS, Mã SKL..."
                  className="w-full pl-2.5 pr-7 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            LIVE SSM STUDENT ROSTER MANAGER (CHỌN • NHẬP KQ • SỬA • XÓA)
           =================================================================== */}
        <SsmStudentRosterManager
          roster={data.ssmStudentRoster || []}
          totalCount={data.denominators?.totalSsmStudentsCount ?? data.ssmStudentRoster?.length ?? 0}
          ssmClasses={data.filterOptions?.ssmClasses || []}
          onAddExamForStudent={(student) => {
            setEditingRecord(null);
            setPreselectedStudent(student);
            setDefaultModalFamily(
              filters.examFamily && filters.examFamily !== 'ALL'
                ? (filters.examFamily as ExamFamilyCode)
                : 'CAMBRIDGE_YLE'
            );
            setEntryModalOpen(true);
          }}
          onEditExamResult={(resultRecord) => {
            setPreselectedStudent(null);
            setEditingRecord(resultRecord);
            setEntryModalOpen(true);
          }}
          onNotifyResults={(resultIds) => {
            setNotifyTargetIds(resultIds);
            setNotifyModalOpen(true);
          }}
          onRefresh={() => refreshWorkspace()}
        />

        {/* ===================================================================
            TAB 1: 5 SPECIALIZED DASHBOARDS
           =================================================================== */}
        {mainTab === 'DASHBOARDS' && (
          <SpecializedDashboardsView
            activeFamilyFilter={filters.examFamily || 'ALL'}
            yleAnalytics={data.yleAnalytics}
            camMainAnalytics={data.camMainAnalytics}
            ieltsAnalytics={data.ieltsAnalytics}
            pearsonAnalytics={data.pearsonAnalytics}
            checkpointAnalytics={data.checkpointAnalytics}
            comparativeReports={data.comparativeReports}
            onUpdateTargetClick={() => setMainTab('IMPORT_RECONCILE')}
          />
        )}

        {/* ===================================================================
            TAB 2: DETAILED RESULTS & SKILL/SUBJECT LEDGER
           =================================================================== */}
        {mainTab === 'RESULTS_LEDGER' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Sổ Quản lý Kết quả Tổng & Các Thành phần Kỹ năng / Môn học ({data.results.length} bản ghi)
                </h3>
                <p className="text-xs text-slate-500">
                  Hiển thị cấu trúc điểm chuyên biệt của từng bài thi (Khiên RW-L-S, Cambridge Scale 4 kỹ năng, Band IELTS, Điểm & Mức P1-P3 Pearson, Điểm & Band 0–50 Checkpoint).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="py-2.5 px-2 font-bold">Năm học</th>
                    <th className="py-2.5 px-2 font-bold">Bài thi</th>
                    <th className="py-2.5 px-2 font-bold">Học sinh & Liên thông SSM</th>
                    <th className="py-2.5 px-2 font-bold">Lớp / Cơ sở</th>
                    <th className="py-2.5 px-2 font-bold">Kết quả Tổng / Xếp loại</th>
                    <th className="py-2.5 px-2 font-bold">Chi tiết Từng Kỹ năng / Môn học</th>
                    <th className="py-2.5 px-2 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.results.slice(0, 250).map((r) => {
                    const typeMeta = EXAM_TYPE_META[r.examType];
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-2 font-bold text-slate-700 whitespace-nowrap">
                          {r.academicYearText}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              typeMeta?.badgeColor || 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {typeMeta?.shortLabel || r.examType}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-extrabold text-slate-900">
                            {r.studentNameSnapshot}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {r.isStudentVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                Mã HS: {r.studentCodeSnapshot}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                <Clock className="w-3 h-3" />
                                Lịch sử (Chờ đối soát)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <div className="font-bold text-slate-800">
                            Lớp {r.classNameSnapshot || '-'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {r.campusCodeSnapshot || '-'} • Khối {r.gradeSnapshot || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {r.sittingStatus === 'ABSENT' ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                              Vắng thi (ABSENT)
                            </span>
                          ) : (
                            <div className="font-black text-slate-900">{r.summaryScoreLabel}</div>
                          )}
                          {r.camOfficialStatement && (
                            <div className="text-[11px] text-blue-700 font-semibold">
                              {r.camOfficialStatement}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {r.skillResults && r.skillResults.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {r.skillResults.map((sk: any) => (
                                <span
                                  key={sk.id}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                    sk.isLowPerformance
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : sk.isHighOutstanding
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <strong>{sk.componentCode}:</strong> {sk.numericScore}
                                  {sk.officialBandCode &&
                                  !String(sk.officialBandCode).includes('SHIELD') &&
                                  !String(sk.officialBandCode).includes('BAND_')
                                    ? ` (${sk.officialBandCode})`
                                    : ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-slate-400">
                              Bản ghi lịch sử chỉ có Overall
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setNotifyTargetIds([r.id]);
                                setNotifyModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                              title="Thông báo & Liên lạc tới GVCN, Phụ huynh và Học sinh"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingRecord(r);
                                setEntryModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                              title="Chỉnh sửa kết quả & chứng chỉ"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteResult(r.id, r.studentNameSnapshot)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                              title="Xóa bản ghi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: CERTIFICATES VAULT
           =================================================================== */}
        {mainTab === 'CERTIFICATES_VAULT' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Kho Lưu trữ Chứng chỉ & Bảng điểm Chính thức (Statement of Results / TRF Vault)
                </h3>
                <p className="text-xs text-slate-500">
                  Theo dõi trạng thái nhận chứng chỉ tại trường, bàn giao cho học sinh/phụ huynh và lưu trữ liên kết bản scan minh chứng.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="py-2.5 px-2 font-bold">Năm học</th>
                    <th className="py-2.5 px-2 font-bold">Kỳ thi</th>
                    <th className="py-2.5 px-2 font-bold">Học sinh</th>
                    <th className="py-2.5 px-2 font-bold">Kết quả Đạt được</th>
                    <th className="py-2.5 px-2 font-bold">Số hiệu Chứng chỉ / TRF</th>
                    <th className="py-2.5 px-2 font-bold">Trạng thái Chứng chỉ</th>
                    <th className="py-2.5 px-2 font-bold">Minh chứng Scan</th>
                    <th className="py-2.5 px-2 font-bold text-right">Cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.results.slice(0, 200).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-bold text-slate-700">
                        {r.academicYearText}
                      </td>
                      <td className="py-2.5 px-2 font-bold">{r.examType}</td>
                      <td className="py-2.5 px-2">
                        <div className="font-extrabold text-slate-900">{r.studentNameSnapshot}</div>
                        <div className="text-[11px] text-slate-500">
                          Lớp {r.classNameSnapshot || '-'} ({r.campusCodeSnapshot || '-'})
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-teal-800">
                        {r.summaryScoreLabel}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-700">
                        {r.certificate?.certificateNumber || 'Chưa cập nhật số hiệu'}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            r.certificate?.certificateStatus === 'NOT_AWARDED'
                              ? 'bg-rose-100 text-rose-800'
                              : r.certificate?.certificateStatus === 'ISSUED_TO_STUDENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {r.certificate?.certificateStatus || 'RECEIVED_AT_SCHOOL'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        {r.certificate?.fileUrl ? (
                          <a
                            href={r.certificate.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-teal-700 font-bold hover:underline"
                          >
                            <span>Xem bản scan</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">Chưa đính kèm</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => {
                            setEditingRecord(r);
                            setEntryModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
                        >
                          Cập nhật CC
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: EXCEL IMPORT & STUDENT RECONCILIATION
           =================================================================== */}
        {mainTab === 'IMPORT_RECONCILE' && (
          <ImportAndReconcileView
            unverifiedResults={data.unverifiedResults}
            recentBatches={data.recentBatches}
            ruleSets={data.ruleSets}
            onRefresh={() => refreshWorkspace()}
          />
        )}
      </div>

      {/* Specialized Entry Modal */}
      <SpecializedEntryModal
        isOpen={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false);
          setPreselectedStudent(null);
        }}
        editingRecord={editingRecord}
        preselectedStudent={preselectedStudent}
        defaultExamFamily={defaultModalFamily}
        defaultAcademicYear={
          filters.academicYear && filters.academicYear !== 'ALL'
            ? filters.academicYear
            : '2026-2027'
        }
        ssmCampuses={data.filterOptions.ssmCampuses || []}
        ssmClasses={data.filterOptions.ssmClasses || []}
        onSaved={() => refreshWorkspace()}
      />

      {/* PDF Report Export Modal (Month / Semester / Academic Year) */}
      <IntlExamPdfReportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        allResults={data.results || []}
        filterOptions={data.filterOptions}
        defaultAcademicYear={filters.academicYear}
        defaultSemester={filters.semester}
        defaultMonth={filters.examMonth}
        defaultCampus={filters.campusCode}
        defaultExamFamily={filters.examFamily}
      />

      {/* 3-Channel Notification & Communication Hub Modal (GVCN • Parent • Student) */}
      <IntlExamNotificationModal
        isOpen={notifyModalOpen}
        onClose={() => setNotifyModalOpen(false)}
        targetResultIds={notifyTargetIds}
        onSent={() => refreshWorkspace()}
      />
    </div>
  );
}
