'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  FileText,
  Printer,
  Download,
  Calendar,
  CheckCircle2,
  Building2,
  Layers,
  Award,
  Loader2,
} from 'lucide-react';
import { EXAM_FAMILY_META, EXAM_TYPE_META, ExamFamilyCode } from '@/lib/intl-exams/ruleEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allResults: any[];
  filterOptions: {
    academicYears: string[];
    campuses: string[];
    grades: string[];
    classes: string[];
  };
  defaultAcademicYear?: string;
  defaultSemester?: string;
  defaultMonth?: string;
  defaultCampus?: string;
  defaultExamFamily?: string;
}

export default function IntlExamPdfReportModal({
  isOpen,
  onClose,
  allResults = [],
  filterOptions = { academicYears: [], campuses: [], grades: [], classes: [] },
  defaultAcademicYear = '2026-2027',
  defaultSemester = 'HK1',
  defaultMonth = String(new Date().getMonth() + 1),
  defaultCampus = 'ALL',
  defaultExamFamily = 'ALL',
}: Props) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [periodMode, setPeriodMode] = useState<'MONTHLY' | 'SEMESTER' | 'YEARLY'>('YEARLY');
  const [selectedYear, setSelectedYear] = useState<string>(
    defaultAcademicYear !== 'ALL' ? defaultAcademicYear : filterOptions?.academicYears?.[0] || '2026-2027'
  );
  const [selectedSemester, setSelectedSemester] = useState<'HK1' | 'HK2' | 'SUMMER'>(
    defaultSemester === 'HK1' || defaultSemester === 'HK2' || defaultSemester === 'SUMMER'
      ? defaultSemester
      : 'HK1'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    defaultMonth !== 'ALL' ? defaultMonth : String(new Date().getMonth() + 1)
  );
  const [selectedCampus, setSelectedCampus] = useState<string>(defaultCampus || 'ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedFamily, setSelectedFamily] = useState<string>(defaultExamFamily || 'ALL');

  // Sections toggle
  const [showOverview, setShowOverview] = useState(true);
  const [showFamilyBreakdown, setShowFamilyBreakdown] = useState(true);
  const [showCampusComparison, setShowCampusComparison] = useState(true);
  const [showStudentRoster, setShowStudentRoster] = useState(true);

  const [exportingPdf, setExportingPdf] = useState(false);

  // Filter results according to selected Period Mode (Tháng / Kỳ học / Năm học) & scope
  const reportResults = useMemo(() => {
    return allResults.filter((r) => {
      if (selectedYear !== 'ALL' && r.academicYearText !== selectedYear) {
        return false;
      }
      if (periodMode === 'SEMESTER') {
        if ((r.semesterCode || 'HK1') !== selectedSemester) return false;
      } else if (periodMode === 'MONTHLY') {
        if (String(r.examMonth || '') !== String(selectedMonth)) return false;
      }
      if (selectedCampus !== 'ALL' && r.campusCodeSnapshot !== selectedCampus) {
        return false;
      }
      if (selectedGrade !== 'ALL' && r.gradeSnapshot !== selectedGrade) {
        return false;
      }
      if (selectedClass !== 'ALL' && r.classNameSnapshot !== selectedClass) {
        return false;
      }
      if (selectedFamily !== 'ALL' && r.examFamily !== selectedFamily) {
        return false;
      }
      return true;
    });
  }, [
    allResults,
    periodMode,
    selectedYear,
    selectedSemester,
    selectedMonth,
    selectedCampus,
    selectedGrade,
    selectedClass,
    selectedFamily,
  ]);

  // Compute summary metrics for the report
  const stats = useMemo(() => {
    const completed = reportResults.filter((r) => r.sittingStatus === 'COMPLETED');
    const absent = reportResults.filter((r) => r.sittingStatus === 'ABSENT');
    const uniqueStudents = new Set(
      completed.map((r) => r.studentId || r.studentCodeSnapshot || r.studentNameSnapshot)
    ).size;
    const totalComponents = completed.reduce(
      (acc, r) => acc + (r.skillResults ? r.skillResults.length : 0),
      0
    );
    const awardedCerts = completed.filter((r) => r.camAwardedCertificate !== false).length;

    // 1. YLE
    const yleRows = completed.filter((r) => r.examFamily === 'CAMBRIDGE_YLE');
    const yle15 = yleRows.filter((r) => r.yleTotalShields === 15).length;
    const yle10_14 = yleRows.filter(
      (r) => (r.yleTotalShields ?? 0) >= 10 && (r.yleTotalShields ?? 0) <= 14
    ).length;
    const yleAvg =
      yleRows.length > 0
        ? (yleRows.reduce((a, r) => a + (r.yleTotalShields ?? 0), 0) / yleRows.length).toFixed(2)
        : '0.00';

    // 2. KET / PET
    const ketRows = completed.filter((r) => r.examType === 'KET');
    const petRows = completed.filter((r) => r.examType === 'PET');
    const ketTarget = ketRows.filter((r) => r.camMeetsTargetLevel).length;
    const petTarget = petRows.filter((r) => r.camMeetsTargetLevel).length;

    // 3. IELTS
    const ieltsRows = completed.filter((r) => r.examFamily === 'IELTS');
    const ieltsAvg =
      ieltsRows.length > 0
        ? (
            ieltsRows.reduce((a, r) => a + (r.ieltsOverallBand ?? 0), 0) / ieltsRows.length
          ).toFixed(2)
        : '0.00';
    const ielts65Plus = ieltsRows.filter((r) => (r.ieltsOverallBand ?? 0) >= 6.5).length;

    // 4. Pearson
    const pearsonRows = completed.filter((r) => r.examFamily === 'PEARSON_EDEXCEL');
    const pearsonHigh = pearsonRows.reduce(
      (acc, r) =>
        acc + (r.skillResults || []).filter((s: any) => s.isHighOutstanding).length,
      0
    );

    // 5. Checkpoint
    const chkRows = completed.filter((r) => r.examFamily === 'CAMBRIDGE_CHECKPOINT');
    const chkHigh = chkRows.reduce(
      (acc, r) =>
        acc + (r.skillResults || []).filter((s: any) => s.isHighOutstanding).length,
      0
    );

    // Campus breakdown
    const campusMap = new Map<string, any[]>();
    for (const r of completed) {
      const cs = r.campusCodeSnapshot || 'Khác';
      const arr = campusMap.get(cs) || [];
      arr.push(r);
      campusMap.set(cs, arr);
    }
    const byCampus = Array.from(campusMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cs, list]) => ({
        campusCode: cs,
        totalSittings: list.length,
        uniqueStudents: new Set(list.map((x) => x.studentId || x.studentCodeSnapshot)).size,
        yleCount: list.filter((x) => x.examFamily === 'CAMBRIDGE_YLE').length,
        camMainCount: list.filter((x) => x.examFamily === 'CAMBRIDGE_MAIN').length,
        ieltsCount: list.filter((x) => x.examFamily === 'IELTS').length,
        pearsonCount: list.filter((x) => x.examFamily === 'PEARSON_EDEXCEL').length,
        checkpointCount: list.filter((x) => x.examFamily === 'CAMBRIDGE_CHECKPOINT').length,
      }));

    return {
      totalSittings: reportResults.length,
      completedCount: completed.length,
      absentCount: absent.length,
      uniqueStudents,
      totalComponents,
      awardedCerts,
      yle: { count: yleRows.length, count15: yle15, count10_14: yle10_14, avg: yleAvg },
      ket: { count: ketRows.length, targetMet: ketTarget },
      pet: { count: petRows.length, targetMet: petTarget },
      ielts: { count: ieltsRows.length, avg: ieltsAvg, count65Plus: ielts65Plus },
      pearson: { count: pearsonRows.length, highComponents: pearsonHigh },
      checkpoint: { count: chkRows.length, highComponents: chkHigh },
      byCampus,
    };
  }, [reportResults]);

  if (!isOpen) return null;

  const periodTitle =
    periodMode === 'MONTHLY'
      ? `THÁNG ${selectedMonth} - NĂM HỌC ${selectedYear === 'ALL' ? 'TẤT CẢ' : selectedYear}`
      : periodMode === 'SEMESTER'
      ? `${
          selectedSemester === 'HK1'
            ? 'HỌC KỲ I'
            : selectedSemester === 'HK2'
            ? 'HỌC KỲ II'
            : 'HỌC KỲ HÈ'
        } - NĂM HỌC ${selectedYear === 'ALL' ? 'TẤT CẢ' : selectedYear}`
      : `NĂM HỌC ${selectedYear === 'ALL' ? 'TẤT CẢ CÁC NĂM' : selectedYear}`;

  const fileSlug =
    periodMode === 'MONTHLY'
      ? `BaoCao_KhaoThiQuocTe_Thang_${selectedMonth}_${selectedYear}.pdf`
      : periodMode === 'SEMESTER'
      ? `BaoCao_KhaoThiQuocTe_${selectedSemester}_${selectedYear}.pdf`
      : `BaoCao_KhaoThiQuocTe_NamHoc_${selectedYear}.pdf`;

  const buildStandaloneReportHtml = () => {
    const contentEl = printAreaRef.current;
    if (!contentEl) return '';

    let inlinedStyles = '';
    try {
      Array.from(document.querySelectorAll('style')).forEach((el) => {
        if (el.textContent) inlinedStyles += el.textContent + '\n';
      });
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach((rule) => {
              inlinedStyles += rule.cssText + '\n';
            });
          }
        } catch (_) {}
      });
    } catch (_) {}

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${fileSlug}</title>
  <base href="${origin}" />
  <style>
    ${inlinedStyles}
    @page {
      size: A4 portrait;
      margin: 10mm 12mm !important;
    }
    *, *:before, *:after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      background: #ffffff !important;
      color: #0f172a !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: Arial, "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      font-size: 9.5pt !important;
      line-height: 1.4 !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  </style>
</head>
<body>
  ${contentEl.outerHTML}
</body>
</html>`;
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      const html = buildStandaloneReportHtml();
      const res = await fetch('/api/admin/student-profiles/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, fileName: fileSlug }),
      });

      if (!res.ok) {
        throw new Error('Không thể kết xuất PDF từ máy chủ');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileSlug;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      handleBrowserPrint();
    } finally {
      setExportingPdf(false);
    }
  };

  const handleBrowserPrint = () => {
    const html = buildStandaloneReportHtml();
    if (!html) return;
    const printWin = window.open('', '_blank', 'width=1024,height=800');
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-700">
              <FileText className="w-4 h-4" />
              <span>Xuất Báo cáo PDF Khảo thí Quốc tế & Chứng chỉ (Tháng • Kỳ học • Năm học)</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">
              Báo cáo {periodTitle} ({reportResults.length} lượt thi)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>In / Lưu PDF qua Trình duyệt</span>
            </button>
            <button
              type="button"
              disabled={exportingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-black shadow-xs flex items-center gap-2 transition"
            >
              {exportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tạo file PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Tải File PDF Chuẩn A4 (.pdf)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 3 Period Mode Buttons: Tháng / Kỳ học / Năm học */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {[
                { id: 'MONTHLY', label: '1. Báo cáo theo Tháng' },
                { id: 'SEMESTER', label: '2. Báo cáo theo Kỳ học (Học kỳ)' },
                { id: 'YEARLY', label: '3. Báo cáo theo Năm học' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPeriodMode(m.id as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    periodMode === m.id
                      ? 'bg-[#003B3A] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Section checkboxes */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOverview}
                  onChange={(e) => setShowOverview(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>I. Quy mô & Mẫu số</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFamilyBreakdown}
                  onChange={(e) => setShowFamilyBreakdown(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>II. Phân tích 5 Nhóm Kỳ thi</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCampusComparison}
                  onChange={(e) => setShowCampusComparison(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>III. So sánh Cơ sở</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStudentRoster}
                  onChange={(e) => setShowStudentRoster(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>IV. Danh sách Học sinh</span>
              </label>
            </div>
          </div>

          {/* Filter Selects */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Năm học
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả năm học</option>
                {filterOptions.academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {periodMode === 'SEMESTER' && (
              <div>
                <label className="block text-[10px] font-bold text-teal-700 uppercase mb-1">
                  Chọn Kỳ học (Học kỳ)
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-teal-400 text-xs font-extrabold bg-teal-50/50 text-teal-900"
                >
                  <option value="HK1">Học kỳ I (Tháng 8–12)</option>
                  <option value="HK2">Học kỳ II (Tháng 1–5)</option>
                  <option value="SUMMER">Học kỳ Hè (Tháng 6–7)</option>
                </select>
              </div>
            )}

            {periodMode === 'MONTHLY' && (
              <div>
                <label className="block text-[10px] font-bold text-teal-700 uppercase mb-1">
                  Chọn Tháng báo cáo
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-teal-400 text-xs font-extrabold bg-teal-50/50 text-teal-900"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={String(m)}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Cơ sở SSM
              </label>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả cơ sở</option>
                {filterOptions.campuses.map((c) => (
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
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả khối</option>
                {filterOptions.grades.map((g) => (
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
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả lớp</option>
                {filterOptions.classes.map((cls) => (
                  <option key={cls} value={cls}>
                    Lớp {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Nhóm Kỳ thi Quốc tế
              </label>
              <select
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-slate-50"
              >
                <option value="ALL">Tất cả 5 nhóm kỳ thi</option>
                {(Object.keys(EXAM_FAMILY_META) as ExamFamilyCode[]).map((f) => (
                  <option key={f} value={f}>
                    {EXAM_FAMILY_META[f].shortLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live A4 Preview Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-200/70">
          <div
            ref={printAreaRef}
            className="bg-white text-slate-900 w-full max-w-[210mm] shadow-lg border border-slate-300 p-8 space-y-5"
          >
            {/* Official Administrative Header */}
            <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-800 pb-3">
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase text-slate-700">
                  HỆ THỐNG GIÁO DỤC SKY-LINE
                </div>
                <div className="text-xs font-black uppercase text-slate-900">
                  BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG
                </div>
                <div className="w-24 h-0.5 bg-slate-800 mx-auto mt-1" />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase text-slate-800">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-xs font-bold text-slate-900">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="w-28 h-0.5 bg-slate-800 mx-auto mt-1" />
              </div>
            </div>

            {/* Report Title */}
            <div className="text-center space-y-1 py-1">
              <h1 className="text-base font-black uppercase tracking-wide text-slate-900">
                BÁO CÁO KẾT QUẢ CÁC KỲ THI QUỐC TẾ & CHỨNG CHỈ HỌC SINH
              </h1>
              <div className="text-xs font-extrabold text-teal-800 uppercase">
                KỲ BÁO CÁO: {periodTitle}
              </div>
              <div className="text-[11px] text-slate-600">
                Phạm vi: Cơ sở{' '}
                <strong>{selectedCampus === 'ALL' ? 'Toàn Hệ thống' : selectedCampus}</strong> • Khối{' '}
                <strong>{selectedGrade === 'ALL' ? 'Tất cả' : selectedGrade}</strong> • Lớp{' '}
                <strong>{selectedClass === 'ALL' ? 'Tất cả' : selectedClass}</strong> • Nhóm thi:{' '}
                <strong>
                  {selectedFamily === 'ALL'
                    ? 'Tất cả 5 Chuẩn Khảo thí Quốc tế'
                    : EXAM_FAMILY_META[selectedFamily as ExamFamilyCode]?.shortLabel}
                </strong>
              </div>
            </div>

            {/* PART I: OVERVIEW & 4 DENOMINATORS */}
            {showOverview && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase text-slate-900 border-l-4 border-teal-600 pl-2">
                  I. Tổng quan Quy mô & 4 Mẫu số Quản trị trong Kỳ báo cáo
                </h2>
                <table className="w-full border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold">
                        1. Số học sinh duy nhất (Unique Students)
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold">
                        2. Tổng số lượt dự thi (Hoàn thành / Vắng)
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold">
                        3. Tổng điểm thành phần Kỹ năng / Môn
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold">
                        4. Số Chứng chỉ Quốc tế đạt được
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-center font-black text-sm">
                      <td className="border border-slate-300 px-3 py-2.5 text-teal-800">
                        {stats.uniqueStudents} học sinh
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-blue-800">
                        {stats.completedCount} lượt ({stats.absentCount} vắng)
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-indigo-800">
                        {stats.totalComponents} thành phần
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-emerald-800">
                        {stats.awardedCerts} chứng chỉ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* PART II: SPECIALIZED BREAKDOWN BY EXAM FAMILY */}
            {showFamilyBreakdown && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase text-slate-900 border-l-4 border-teal-600 pl-2">
                  II. Tổng hợp Kết quả Chuyên biệt theo Từng Tổ chức Khảo thí
                </h2>
                <table className="w-full border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 px-2.5 py-2 text-left font-bold">
                        Nhóm Kỳ thi / Tổ chức Khảo thí
                      </th>
                      <th className="border border-slate-300 px-2.5 py-2 text-center font-bold">
                        Số lượt hoàn thành
                      </th>
                      <th className="border border-slate-300 px-2.5 py-2 text-left font-bold">
                        Chỉ số Chất lượng Trọng tâm theo Quy chuẩn Chính thức
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-2.5 py-2 font-bold">
                        1. Cambridge YLE (Starters / Movers / Flyers)
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2 text-center font-bold">
                        {stats.yle.count}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2">
                        Trung bình: <strong>{stats.yle.avg}/15 khiên</strong> • Đạt tuyệt đối 15
                        khiên: <strong>{stats.yle.count15} lượt</strong> • Nhóm 10–14 khiên:{' '}
                        <strong>{stats.yle.count10_14} lượt</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2.5 py-2 font-bold">
                        2. Cambridge English Main Suite (KET A2 / PET B1)
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2 text-center font-bold">
                        {stats.ket.count + stats.pet.count}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2">
                        KET (A2 Key): <strong>{stats.ket.count} lượt</strong> (Đạt chuẩn A2/B1:{' '}
                        <strong>{stats.ket.targetMet}</strong>) • PET (B1 Preliminary):{' '}
                        <strong>{stats.pet.count} lượt</strong> (Đạt chuẩn B1/B2:{' '}
                        <strong>{stats.pet.targetMet}</strong>)
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2.5 py-2 font-bold">
                        3. IELTS Academic / General (Band 0.0–9.0)
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2 text-center font-bold">
                        {stats.ielts.count}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2">
                        Overall Band trung bình: <strong>{stats.ielts.avg}</strong> • Đạt từ Band
                        6.5 trở lên: <strong>{stats.ielts.count65Plus} lượt</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2.5 py-2 font-bold">
                        4. Pearson Edexcel (iPrimary / iLowerSecondary)
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2 text-center font-bold">
                        {stats.pearson.count}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2">
                        Số lượt môn đạt mức cao (P3 / S3–S4):{' '}
                        <strong>{stats.pearson.highComponents} lượt môn</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2.5 py-2 font-bold">
                        5. Cambridge Checkpoint (Primary / Lower Secondary)
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2 text-center font-bold">
                        {stats.checkpoint.count}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2">
                        Số lượt môn đạt mức High / Outstanding (31–50 điểm):{' '}
                        <strong>{stats.checkpoint.highComponents} lượt môn</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* PART III: CAMPUS COMPARISON */}
            {showCampusComparison && stats.byCampus.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase text-slate-900 border-l-4 border-teal-600 pl-2">
                  III. Thống kê So sánh Số lượng theo Cơ sở SSM
                </h2>
                <table className="w-full border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 px-2 py-1.5 text-left font-bold">
                        Cơ sở
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        Học sinh duy nhất
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        Tổng lượt thi
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        Cambridge YLE
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        KET / PET
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        IELTS
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        Pearson
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        Checkpoint
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byCampus.map((row) => (
                      <tr key={row.campusCode} className="text-center">
                        <td className="border border-slate-300 px-2 py-1.5 text-left font-bold">
                          {row.campusCode}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5">{row.uniqueStudents}</td>
                        <td className="border border-slate-300 px-2 py-1.5 font-bold">
                          {row.totalSittings}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5">{row.yleCount}</td>
                        <td className="border border-slate-300 px-2 py-1.5">{row.camMainCount}</td>
                        <td className="border border-slate-300 px-2 py-1.5">{row.ieltsCount}</td>
                        <td className="border border-slate-300 px-2 py-1.5">{row.pearsonCount}</td>
                        <td className="border border-slate-300 px-2 py-1.5">
                          {row.checkpointCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PART IV: DETAILED STUDENT ROSTER */}
            {showStudentRoster && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase text-slate-900 border-l-4 border-teal-600 pl-2">
                  IV. Danh sách Chi tiết Kết quả & Chứng chỉ Học sinh SSM ({reportResults.length}{' '}
                  bản ghi)
                </h2>
                {reportResults.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-xs text-slate-500">
                    Chưa có bản ghi kết quả thi quốc tế nào trong kỳ báo cáo đã chọn ({periodTitle}).
                  </div>
                ) : (
                  <table className="w-full border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 px-2 py-1.5 text-center font-bold w-8">
                          STT
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-bold">
                          Mã HS SSM
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-bold">
                          Họ và tên Học sinh
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                          Lớp / CS
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-bold">
                          Kỳ thi & Thời gian
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-bold">
                          Kết quả Tổng
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-bold">
                          Chi tiết Kỹ năng / Môn học
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportResults.map((r, idx) => (
                        <tr key={r.id}>
                          <td className="border border-slate-300 px-2 py-1.5 text-center">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 font-mono font-bold">
                            {r.studentCodeSnapshot || '-'}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 font-bold">
                            {r.studentNameSnapshot}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-center">
                            {r.classNameSnapshot || '-'} ({r.campusCodeSnapshot || '-'})
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5">
                            <div className="font-bold">
                              {EXAM_TYPE_META[r.examType as keyof typeof EXAM_TYPE_META]
                                ?.shortLabel || r.examType}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {r.semesterLabel || 'Học kỳ I'}
                              {r.examMonth ? ` • T${r.examMonth}` : ''} • {r.academicYearText}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 font-bold text-teal-900">
                            {r.summaryScoreLabel}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-[10px]">
                            {(r.skillResults || [])
                              .map(
                                (s: any) =>
                                  `${s.componentCode}: ${s.numericScore ?? '-'}${
                                    s.officialBandCode ? ` (${s.officialBandCode})` : ''
                                  }`
                              )
                              .join(' | ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Official Signature Footer */}
            <div className="pt-4 grid grid-cols-3 gap-4 text-center text-xs break-inside-avoid">
              <div>
                <div className="font-bold uppercase">NGƯỜI LẬP BẢNG</div>
                <div className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</div>
                <div className="h-16" />
              </div>
              <div>
                <div className="font-bold uppercase">BAN KHẢO THÍ & ĐBCL</div>
                <div className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</div>
                <div className="h-16" />
              </div>
              <div>
                <div className="text-[10px] italic text-slate-600 mb-0.5">
                  Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm{' '}
                  {new Date().getFullYear()}
                </div>
                <div className="font-bold uppercase">BAN GIÁM HIỆU / HỘI ĐỒNG GIÁO DỤC</div>
                <div className="text-[10px] italic text-slate-500">(Ký tên và đóng dấu)</div>
                <div className="h-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
