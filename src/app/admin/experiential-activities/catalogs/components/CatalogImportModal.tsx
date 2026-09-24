"use client";
import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { ParseCatalogResult, ParsedCatalogRow } from '@/lib/experiential/excel-parser';

interface CatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  academicYearId: string;
}

export function CatalogImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  academicYearId
}: CatalogImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewResult, setPreviewResult] = useState<ParseCatalogResult | null>(null);
  const [activeSheetTab, setActiveSheetTab] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Vui lòng chọn file Excel định dạng .xlsx hoặc .xls');
      return;
    }

    setFile(selectedFile);
    setParsing(true);
    setPreviewResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`/api/admin/experiential-activities/catalogs/import?mode=preview&academicYearId=${academicYearId}`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi đọc file Excel');
      }

      const result: ParseCatalogResult = await res.json();
      setPreviewResult(result);
      if (result.sheetSummaries.length > 0) {
        setActiveSheetTab(result.sheetSummaries[0].sheetName);
      }
      toast.success(`Đã phân tích ${result.totalRows} hoạt động từ ${result.totalSheetsFound} sheet`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi đọc file');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleSaveImport = async () => {
    if (!previewResult || previewResult.validRows.length === 0) {
      toast.error('Không có dòng dữ liệu hợp lệ để lưu');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/experiential-activities/catalogs/import?mode=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: previewResult.validRows,
          targetAcademicYearId: academicYearId
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi lưu dữ liệu');
      }

      const data = await res.json();
      toast.success(`Đã lưu thành công ${data.savedCount} hoạt động mới và cập nhật ${data.updatedCount} hoạt động!`);
      onImportSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hệ thống khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = previewResult
    ? previewResult.validRows.filter(r => !activeSheetTab || r.sheetName === activeSheetTab)
    : [];

  const invalidFilteredRows = previewResult
    ? previewResult.invalidRows.filter(r => !activeSheetTab || r.sheetName === activeSheetTab)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">
                Import Danh mục HĐTN & Ngoại khóa từ File Excel
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tự động nhận diện cấu trúc file mẫu của trường (MN, TH S, THCS S, THPT S, TH QT, THCS QT, THPT QT)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!previewResult && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-slate-300 hover:border-[#00A19A] rounded-3xl p-10 text-center cursor-pointer bg-slate-50/50 hover:bg-[#00A19A]/5 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center mx-auto mb-4 text-[#00A19A] group-hover:scale-110 transition-transform">
                {parsing ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
              </div>
              <h3 className="text-sm font-extrabold text-slate-700 mb-1">
                {parsing ? 'Đang phân tích các sheet trong file Excel...' : 'Kéo thả file Excel kế hoạch vào đây hoặc bấm để chọn file'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Hỗ trợ file tổng hợp năm học: <span className="font-semibold text-slate-600">tong hop HD ngoai khoa NH...xlsx</span>
              </p>
            </div>
          )}

          {previewResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Số sheet phát hiện</div>
                  <div className="text-lg font-black text-slate-800">{previewResult.totalSheetsFound} sheet</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Tổng số hoạt động</div>
                  <div className="text-lg font-black text-slate-800">{previewResult.totalRows} hoạt động</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <div className="text-[11px] font-bold text-emerald-600 uppercase">Hợp lệ để lưu</div>
                  <div className="text-lg font-black text-emerald-700">{previewResult.validRows.length} dòng</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <div className="text-[11px] font-bold text-rose-600 uppercase">Có lỗi / Cần sửa</div>
                  <div className="text-lg font-black text-rose-700">{previewResult.invalidRows.length} dòng</div>
                </div>
              </div>

              {/* Sheet Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                {previewResult.sheetSummaries.map(s => (
                  <button
                    key={s.sheetName}
                    onClick={() => setActiveSheetTab(s.sheetName)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeSheetTab === s.sheetName
                        ? 'bg-[#003B3A] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{s.sheetName}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
                      {s.count}
                    </span>
                    {s.errorsCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white max-h-[40vh]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">STT</th>
                      <th className="py-2.5 px-3 w-16">Khối</th>
                      <th className="py-2.5 px-3">Tên hoạt động ngoại khóa</th>
                      <th className="py-2.5 px-3">Chủ đề giáo dục</th>
                      <th className="py-2.5 px-3">Môn chủ trì</th>
                      <th className="py-2.5 px-3">Hình thức & Thời gian</th>
                      <th className="py-2.5 px-3">Địa điểm dự kiến</th>
                      <th className="py-2.5 px-3 text-center w-24">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{r.stt}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{r.grade}</td>
                        <td className="py-2.5 px-3 font-extrabold text-[#003B3A]">{r.activityName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.themeName || '—'}</td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-700">{r.primarySubjectName || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{r.organizationFormat} ({r.timeFrame || `HK${r.semester}`})</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.expectedLocation || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                          </span>
                        </td>
                      </tr>
                    ))}

                    {invalidFilteredRows.map((r, idx) => (
                      <tr key={'err-' + idx} className="bg-rose-50/40 hover:bg-rose-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center text-rose-500 font-bold">{r.stt}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{r.grade}</td>
                        <td className="py-2.5 px-3 font-extrabold text-rose-700">{r.activityName || '(Chưa có tên)'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.themeName || '—'}</td>
                        <td className="py-2.5 px-3">{r.primarySubjectName || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{r.timeFrame || `HK${r.semester}`}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.expectedLocation || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300" title={r.errors.join('; ')}>
                            <AlertTriangle className="w-3 h-3" /> {r.errors[0] || 'Lỗi'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <button
                  onClick={() => { setFile(null); setPreviewResult(null); }}
                  className="text-slate-500 hover:text-slate-800 underline font-semibold"
                >
                  Chọn file khác
                </button>
                <div className="font-medium text-slate-600">
                  Hiển thị {filteredRows.length + invalidFilteredRows.length} hoạt động thuộc sheet <span className="font-bold text-slate-800">{activeSheetTab}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Đóng
          </button>
          {previewResult && previewResult.validRows.length > 0 && (
            <button
              onClick={handleSaveImport}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{saving ? 'Đang lưu vào danh mục...' : `Xác nhận lưu ${previewResult.validRows.length} hoạt động`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
