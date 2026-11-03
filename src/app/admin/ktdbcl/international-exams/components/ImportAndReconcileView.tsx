'use client';

import React, { useState } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Link2,
  FileSpreadsheet,
  Sliders,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  commitStagedBatchAction,
  reconcileResultStudentAction,
  resetAllIntlExamsDataAction,
  searchStudentsForIntlExamAction,
  updateRuleSetTargetsAction,
  uploadAndPreviewExcelAction,
} from '../actions';

interface Props {
  unverifiedResults: any[];
  recentBatches: any[];
  ruleSets: any[];
  onRefresh: () => void;
}

export default function ImportAndReconcileView({
  unverifiedResults,
  recentBatches,
  ruleSets,
  onRefresh,
}: Props) {
  const [subTab, setSubTab] = useState<'RECONCILE' | 'EXCEL_IMPORT' | 'RULESETS'>('EXCEL_IMPORT');
  const [resetting, setResetting] = useState(false);

  // Reconciliation state
  const [activeReconcileId, setActiveReconcileId] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [candidateStudents, setCandidateStudents] = useState<any[]>([]);
  const [applyToSameName, setApplyToSameName] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  // Excel upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    recentBatches[0]?.id || null
  );

  // RuleSet target editing
  const [yleTargetInput, setYleTargetInput] = useState<number>(() => {
    const rs = ruleSets.find((r) => r.examFamily === 'CAMBRIDGE_YLE');
    return rs?.skylineTargetsJson ? JSON.parse(rs.skylineTargetsJson).targetTotalShields || 10 : 10;
  });
  const [ieltsTargetInput, setIeltsTargetInput] = useState<number>(() => {
    const rs = ruleSets.find((r) => r.examFamily === 'IELTS');
    return rs?.skylineTargetsJson ? JSON.parse(rs.skylineTargetsJson).defaultTargetBand || 6.5 : 6.5;
  });
  const [savingTarget, setSavingTarget] = useState(false);

  const handleSearchForReconcile = async (q: string) => {
    setStudentQuery(q);
    if (q.trim().length < 2) {
      setCandidateStudents([]);
      return;
    }
    const res = await searchStudentsForIntlExamAction(q);
    setCandidateStudents(res);
  };

  const handleLinkStudent = async (resultId: string, studentId: string) => {
    setReconciling(true);
    try {
      await reconcileResultStudentAction({
        resultId,
        studentId,
        applyToSameNameInCampus: applyToSameName,
      });
      setActiveReconcileId(null);
      setStudentQuery('');
      setCandidateStudents([]);
      onRefresh();
    } finally {
      setReconciling(false);
    }
  };

  const handleExcelUpload = async (autoCommit: boolean) => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('autoCommit', autoCommit ? 'true' : 'false');
      const res = await uploadAndPreviewExcelAction(fd);
      setUploadMsg(
        `Đã phân tích ${res.totalRows} dòng trên ${res.sheetsSummary.length} sheet: ${res.validRows} hợp lệ, ${res.warningRows} cảnh báo chuẩn hóa, ${res.matchedStudents} dòng khớp tự động Mã HS SSM.`
      );
      setSelectedBatchId(res.batchId);
      onRefresh();
    } catch (e: any) {
      setUploadMsg(`Lỗi: ${e?.message || 'Không thể xử lý file Excel'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCommitBatch = async (batchId: string) => {
    setUploading(true);
    try {
      const res = await commitStagedBatchAction(batchId);
      setUploadMsg(`Đã ghi nhận chính thức ${res.committedCount} kết quả thi vào CSDL.`);
      onRefresh();
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTargets = async () => {
    setSavingTarget(true);
    try {
      const yleRules = ruleSets.filter((r) => r.examFamily === 'CAMBRIDGE_YLE');
      for (const r of yleRules) {
        await updateRuleSetTargetsAction({
          ruleSetId: r.id,
          skylineTargets: { targetTotalShields: yleTargetInput, minSkillShields: 3 },
        });
      }
      const ieltsRule = ruleSets.find((r) => r.examFamily === 'IELTS');
      if (ieltsRule) {
        await updateRuleSetTargetsAction({
          ruleSetId: ieltsRule.id,
          skylineTargets: {
            milestones: [5.5, 6.0, 6.5, 7.0, 7.5, 8.0],
            defaultTargetBand: ieltsTargetInput,
          },
        });
      }
      onRefresh();
    } finally {
      setSavingTarget(false);
    }
  };

  const activeBatch =
    recentBatches.find((b) => b.id === selectedBatchId) || recentBatches[0] || null;

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubTab('EXCEL_IMPORT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              subTab === 'EXCEL_IMPORT'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel (Chỉ nạp Học sinh có trong SSM)</span>
          </button>
          <button
            onClick={() => setSubTab('RULESETS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              subTab === 'RULESETS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Phiên bản Quy chuẩn Điểm & Ngưỡng Mục tiêu ({ruleSets.length})</span>
          </button>
        </div>

        <button
          type="button"
          disabled={resetting}
          onClick={async () => {
            if (
              !window.confirm(
                'Bạn có chắc chắn muốn làm mới hoàn toàn (xóa trắng) toàn bộ dữ liệu kết quả thi quốc tế và chứng chỉ?'
              )
            )
              return;
            setResetting(true);
            try {
              await resetAllIntlExamsDataAction();
              setSelectedBatchId(null);
              setUploadMsg('Đã làm mới hoàn toàn toàn bộ dữ liệu kết quả thi quốc tế.');
              onRefresh();
            } finally {
              setResetting(false);
            }
          }}
          className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>Làm mới hoàn toàn dữ liệu</span>
        </button>
      </div>

      {/* TAB 1: STUDENT RECONCILIATION QUEUE */}
      {subTab === 'RECONCILE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Danh sách Chờ Đối soát Mã Học sinh SSM ({unverifiedResults.length} bản ghi lịch sử)
              </h3>
              <p className="text-xs text-slate-500">
                Các bản ghi lịch sử (2022–2025, đặc biệt học sinh Khối 12 đã tốt nghiệp hoặc thiếu Mã SKL trong file gốc) vẫn được lưu trữ và thống kê đầy đủ. Tại đây bạn có thể đối chiếu và gắn Mã HS gốc SSM.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
              <input
                type="checkbox"
                checked={applyToSameName}
                onChange={(e) => setApplyToSameName(e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Tự động gắn cho tất cả các lần thi cùng Họ tên & Cơ sở</span>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="py-2.5 font-bold">Năm học</th>
                  <th className="py-2.5 font-bold">Kỳ thi</th>
                  <th className="py-2.5 font-bold">Họ và tên (Bản ghi lịch sử)</th>
                  <th className="py-2.5 font-bold">Lớp / Cơ sở lúc thi</th>
                  <th className="py-2.5 font-bold">Kết quả</th>
                  <th className="py-2.5 font-bold text-right">Thao tác đối soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unverifiedResults.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 font-bold text-slate-700">{r.academicYearText}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800">
                          {r.examType}
                        </span>
                      </td>
                      <td className="py-2.5 font-extrabold text-slate-900">
                        {r.studentNameSnapshot}
                      </td>
                      <td className="py-2.5 text-slate-600">
                        Lớp {r.classNameSnapshot || '-'} • {r.campusCodeSnapshot || 'Chưa rõ CS'}
                      </td>
                      <td className="py-2.5 font-bold text-teal-700">{r.summaryScore}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => {
                            if (activeReconcileId === r.id) {
                              setActiveReconcileId(null);
                            } else {
                              setActiveReconcileId(r.id);
                              handleSearchForReconcile(r.studentNameSnapshot);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 transition"
                        >
                          {activeReconcileId === r.id ? 'Đóng' : 'Tìm & Gắn Mã HS'}
                        </button>
                      </td>
                    </tr>
                    {activeReconcileId === r.id && (
                      <tr className="bg-teal-50/40">
                        <td colSpan={6} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 max-w-md bg-white border border-teal-300 rounded-xl px-3 py-1.5">
                              <Search className="w-4 h-4 text-teal-600" />
                              <input
                                type="text"
                                value={studentQuery}
                                onChange={(e) => handleSearchForReconcile(e.target.value)}
                                placeholder="Nhập tên hoặc Mã HS SSM để tìm..."
                                className="w-full text-xs focus:outline-none"
                              />
                            </div>
                            {candidateStudents.length === 0 ? (
                              <div className="text-xs text-slate-500">
                                Không tìm thấy học sinh trùng tên đang học năm 2026–2027 (Học sinh có thể đã tốt nghiệp THPT). Bản ghi vẫn được lưu trữ hợp lệ.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {candidateStudents.map((st) => (
                                  <div
                                    key={st.id}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <div className="font-extrabold text-slate-900">
                                        {st.studentName}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        Mã: <strong>{st.studentCode}</strong> • Lớp hiện tại: {st.className} ({st.campusCode})
                                      </div>
                                    </div>
                                    <button
                                      disabled={reconciling}
                                      onClick={() => handleLinkStudent(r.id, st.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-[11px] hover:bg-teal-700 shrink-0"
                                    >
                                      Liên kết
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXCEL IMPORT & STAGING PREVIEW */}
      {subTab === 'EXCEL_IMPORT' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Bộ máy Chuẩn hóa & Nhập Excel Lịch sử Đa Sheet (Multi-Sheet Normalizer)
            </h3>
            <p className="text-xs text-slate-600 max-w-4xl">
              Tự động nhận diện các sheet <strong>STARTERS, MOVERS, FLYERS, KET, PET, Ipls (Pearson), IELTS, Cambridge Checkpoint, 2026</strong>:
              Tách mã <code className="bg-slate-100 px-1 rounded">RW5-L5-S5</code> và <code className="bg-slate-100 px-1 rounded">R132-W133-L147-S150</code>, chuẩn hóa dấu phẩy thập phân <code className="bg-slate-100 px-1 rounded">IELTS 5,5</code>, khôi phục số serial ngày Excel bị nhảy ở cột Lớp, chuẩn hóa Unicode NFC và tự động bỏ qua sheet nháp <code className="bg-slate-100 px-1 rounded">Trang_tính1</code>.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
              />
              <button
                type="button"
                disabled={!selectedFile || uploading}
                onClick={() => handleExcelUpload(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {uploading ? 'Đang phân tích...' : '1. Tải lên & Xem trước (Preview)'}
              </button>
              <button
                type="button"
                disabled={!selectedFile || uploading}
                onClick={() => handleExcelUpload(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-50"
              >
                2. Tải lên & Ghi nhận Ngay
              </button>
            </div>

            {uploadMsg && (
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs font-bold text-teal-900">
                {uploadMsg}
              </div>
            )}
          </div>

          {activeBatch && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500">
                    Lô Import gần nhất: {activeBatch.batchCode}
                  </span>
                  <h4 className="text-sm font-black text-slate-900">
                    File: {activeBatch.fileName} • Trạng thái:{' '}
                    <span className="text-teal-700">{activeBatch.status}</span>
                  </h4>
                </div>
                {activeBatch.status === 'PREVIEW' && (
                  <button
                    onClick={() => handleCommitBatch(activeBatch.id)}
                    disabled={uploading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
                  >
                    Xác nhận Lưu Chính thức Lô Preview Này
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Tổng số Sheet</div>
                  <div className="text-lg font-black text-slate-900">{activeBatch.totalSheets}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Tổng dòng quét</div>
                  <div className="text-lg font-black text-slate-900">{activeBatch.totalRows}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] text-emerald-700">Hợp lệ hoàn toàn</div>
                  <div className="text-lg font-black text-emerald-800">{activeBatch.validRows}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] text-amber-700">Đã tự động chuẩn hóa</div>
                  <div className="text-lg font-black text-amber-800">{activeBatch.warningRows}</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-[11px] text-blue-700">Khớp tự động Mã HS</div>
                  <div className="text-lg font-black text-blue-800">
                    {activeBatch.matchedStudents}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-[11px] text-rose-700">Dòng lỗi cấu trúc</div>
                  <div className="text-lg font-black text-rose-800">{activeBatch.errorRows}</div>
                </div>
              </div>

              {/* Sheets summary pills */}
              <div className="flex flex-wrap gap-2">
                {activeBatch.summary.map((s: any) => (
                  <div
                    key={s.sheetName}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                      s.status === 'SKIPPED_DRAFT'
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-teal-50 text-teal-900 border-teal-200'
                    }`}
                  >
                    Sheet &ldquo;{s.sheetName}&rdquo;: {s.totalRows} dòng ({s.detectedType})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VERSIONED RULESETS & INTERNAL TARGETS */}
      {subTab === 'RULESETS' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Cấu hình Ngưỡng Mục tiêu Quản trị Nội bộ Sky-Line
            </h3>
            <p className="text-xs text-slate-500">
              Ngưỡng mục tiêu nội bộ dùng để tính tỷ lệ học sinh đạt kỳ vọng trên các Dashboard chuyên biệt mà không làm thay đổi phân loại chính thức của tổ chức khảo thí.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngưỡng mục tiêu Khiên YLE (Starters/Movers/Flyers)
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={yleTargetInput}
                  onChange={(e) => setYleTargetInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngưỡng mục tiêu Band IELTS Trọng tâm (6.0 / 6.5 / 7.0)
                </label>
                <select
                  value={ieltsTargetInput}
                  onChange={(e) => setIeltsTargetInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  <option value={5.5}>IELTS 5.5</option>
                  <option value={6.0}>IELTS 6.0</option>
                  <option value={6.5}>IELTS 6.5</option>
                  <option value={7.0}>IELTS 7.0</option>
                  <option value={7.5}>IELTS 7.5</option>
                </select>
              </div>
              <div>
                <button
                  onClick={handleSaveTargets}
                  disabled={savingTarget}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black"
                >
                  {savingTarget ? 'Đang cập nhật...' : 'Lưu Cấu hình Mục tiêu Nội bộ'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3">
              Danh mục Phiên bản Quy chuẩn Khảo thí Quốc tế Đang Áp dụng
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="py-2.5 font-bold">Mã Phiên bản Quy chuẩn</th>
                    <th className="py-2.5 font-bold">Tên Bộ Quy chuẩn</th>
                    <th className="py-2.5 font-bold">Tổ chức Khảo thí</th>
                    <th className="py-2.5 font-bold">Đơn vị Thang điểm</th>
                    <th className="py-2.5 font-bold">Dải điểm</th>
                    <th className="py-2.5 font-bold">Ngày áp dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ruleSets.map((rs) => (
                    <tr key={rs.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono font-bold text-teal-800">
                        {rs.versionCode}
                      </td>
                      <td className="py-2.5 font-extrabold text-slate-900">{rs.versionName}</td>
                      <td className="py-2.5 text-slate-600">{rs.organization}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold">
                          {rs.scaleUnit}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold">
                        {rs.minOverall !== null ? `${rs.minOverall} – ${rs.maxOverall}` : 'Theo từng môn học'}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {rs.effectiveFrom.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
