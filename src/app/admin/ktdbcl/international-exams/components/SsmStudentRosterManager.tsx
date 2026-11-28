'use client';

import React, { useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Loader2,
  UserCheck,
  Award,
} from 'lucide-react';
import { EXAM_TYPE_META } from '@/lib/intl-exams/ruleEngine';
import {
  updateSsmStudentForIntlWorkspaceAction,
  deleteSsmStudentOrResultsForIntlWorkspaceAction,
  bulkDeleteIntlExamStudentsOrResultsAction,
  deleteIntlExamResultAction,
} from '../actions';

interface Props {
  roster?: any[];
  students?: any[];
  totalCount?: number;
  ssmClasses: Array<{
    id: string;
    classCode: string;
    className: string;
    grade: string;
    campusId: string;
    campusCode: string;
    campusName: string;
    academicYearName: string;
    educationSystem: string;
    studentCount?: number;
  }>;
  onAddExamForStudent: (student?: any) => void;
  onEditExamResult: (result: any) => void;
  onNotifyResults: (resultIds: string[]) => void;
  onRefresh: () => void;
}

export default function SsmStudentRosterManager({
  roster,
  students,
  ssmClasses = [],
  onAddExamForStudent,
  onEditExamResult,
  onNotifyResults,
  onRefresh,
}: Props) {
  // Strictly display ONLY students who have entered international exam results
  const studentsWithResults = useMemo(() => {
    const raw = roster && roster.length > 0 ? roster : students || [];
    return raw.filter((s) => Array.isArray(s.examResults) && s.examResults.length > 0);
  }, [roster, students]);

  const totalResultsCount = useMemo(
    () =>
      studentsWithResults.reduce(
        (sum, s) => sum + (Array.isArray(s.examResults) ? s.examResults.length : 0),
        0
      ),
    [studentsWithResults]
  );

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Edit Student Info Modal state
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  const totalPages = Math.max(1, Math.ceil(studentsWithResults.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return studentsWithResults.slice(start, start + pageSize);
  }, [studentsWithResults, safePage, pageSize]);

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((s) => selectedStudentIds.includes(s.id));

  const handleToggleSelectPage = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(pageItems.map((s) => s.id));
      setSelectedStudentIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const next = new Set(selectedStudentIds);
      for (const s of pageItems) next.add(s.id);
      setSelectedStudentIds(Array.from(next));
    }
  };

  const handleToggleOne = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const openEditStudentModal = (student: any) => {
    setEditingStudent(student);
    setEditCode(student.studentCode || '');
    setEditName(student.studentName || '');
    setEditClassId(student.classId || '');
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editName.trim() || !editCode.trim()) {
      alert('Vui lòng nhập đầy đủ Họ và tên học sinh và Mã HS.');
      return;
    }
    setSavingStudent(true);
    try {
      await updateSsmStudentForIntlWorkspaceAction({
        studentId: editingStudent.id,
        studentCode: editCode,
        studentName: editName,
        classId: editClassId || undefined,
      });
      setEditingStudent(null);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Không thể cập nhật thông tin học sinh.');
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudentResults = async (student: any) => {
    const count = Array.isArray(student.examResults) ? student.examResults.length : 0;
    const confirmed = window.confirm(
      `Xóa ${count} kết quả khảo thí quốc tế của học sinh "${student.studentName}" (${student.studentCode})?`
    );
    if (!confirmed) return;
    setBusyId(student.id);
    try {
      await deleteSsmStudentOrResultsForIntlWorkspaceAction({
        studentId: student.id,
        mode: 'RESULTS_ONLY',
      });
      setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSingleExamResult = async (
    resultId: string,
    studentName: string,
    examType: string
  ) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa kết quả bài thi ${examType} của học sinh "${studentName}"?`
      )
    ) {
      return;
    }
    setBusyId(resultId);
    try {
      await deleteIntlExamResultAction(resultId);
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkDeleteResults = async () => {
    if (selectedStudentIds.length === 0) return;
    if (
      !window.confirm(
        `Xóa toàn bộ kết quả khảo thí quốc tế của ${selectedStudentIds.length} học sinh đang chọn?`
      )
    )
      return;

    setBusyId('BULK');
    try {
      await bulkDeleteIntlExamStudentsOrResultsAction({
        studentIds: selectedStudentIds,
        mode: 'RESULTS_ONLY',
      });
      setSelectedStudentIds([]);
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const selectedStudentsObjects = useMemo(
    () => studentsWithResults.filter((s) => selectedStudentIds.includes(s.id)),
    [studentsWithResults, selectedStudentIds]
  );

  const selectedResultIds = useMemo(
    () => selectedStudentsObjects.flatMap((s) => (s.examResults || []).map((r: any) => r.id)),
    [selectedStudentsObjects]
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#008B85]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Danh sách học sinh đã nhập kết quả khảo thí quốc tế
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-xs font-bold tabular-nums">
              {studentsWithResults.length} học sinh • {totalResultsCount} lượt thi
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chỉ hiển thị học sinh đã có kết quả hoặc chứng chỉ quốc tế theo bộ lọc hiện tại.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAddExamForStudent(undefined)}
          className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#004f4d] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
          <span>Thêm kết quả học sinh khác</span>
        </button>
      </div>

      {/* Multi-Select Batch Action Toolbar */}
      {selectedStudentIds.length > 0 && (
        <div className="p-3 rounded-xl bg-[#F0FDFA] border border-teal-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#003B3A] tabular-nums">
            <UserCheck className="w-4 h-4 text-[#008B85]" />
            <span>
              Đã chọn {selectedStudentIds.length} học sinh ({selectedResultIds.length} kết quả)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedStudentsObjects.length === 1 && (
              <button
                type="button"
                onClick={() => onAddExamForStudent(selectedStudentsObjects[0])}
                className="px-3 py-1.5 rounded-lg bg-[#008B85] hover:bg-[#00736E] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm bài thi cho {selectedStudentsObjects[0].studentName}</span>
              </button>
            )}

            {selectedStudentsObjects.length === 1 && (
              <button
                type="button"
                onClick={() => openEditStudentModal(selectedStudentsObjects[0])}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Sửa thông tin HS</span>
              </button>
            )}

            {selectedResultIds.length > 0 && (
              <button
                type="button"
                onClick={() => onNotifyResults(selectedResultIds)}
                className="px-3 py-1.5 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 tabular-nums"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Gửi thông báo GVCN • PH • HS ({selectedResultIds.length})</span>
              </button>
            )}

            <button
              type="button"
              disabled={busyId === 'BULK'}
              onClick={handleBulkDeleteResults}
              className="px-3 py-1.5 rounded-lg bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 tabular-nums"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa kết quả đã chọn ({selectedResultIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:underline"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-[#003B3A] border-b border-[#003B3A] text-left">
            <tr className="text-[11px] font-semibold whitespace-nowrap">
              <th className="py-3 px-3 w-9 text-white">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={handleToggleSelectPage}
                  className="rounded text-[#00A19A] cursor-pointer"
                  title="Chọn tất cả học sinh trên trang này"
                />
              </th>
              <th className="py-3 px-3 w-12 text-teal-100">STT</th>
              <th className="py-3 px-3 text-white">Mã HS SSM</th>
              <th className="py-3 px-3 text-white">Họ và tên học sinh</th>
              <th className="py-3 px-3 text-teal-100">Lớp • Khối • Cơ sở</th>
              <th className="py-3 px-3 text-[#5EEAD4]">Kết quả & Chứng chỉ quốc tế đã nhập</th>
              <th className="py-3 px-3 text-white text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                  <div className="max-w-md mx-auto space-y-2">
                    <div className="font-bold text-slate-700">
                      Chưa có học sinh nào đã nhập kết quả khảo thí quốc tế theo bộ lọc này
                    </div>
                    <p className="text-xs text-slate-500">
                      Nhấn <strong>Nhập kết quả / chứng chỉ mới</strong> để chọn học sinh từ dữ liệu SSM và ghi nhận điểm thi, hoặc điều chỉnh bộ lọc phía trên.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              pageItems.map((st, idx) => {
                const stt = (safePage - 1) * pageSize + idx + 1;
                const isSelected = selectedStudentIds.includes(st.id);
                const examResults: any[] = st.examResults || [];

                return (
                  <tr
                    key={st.id}
                    className={`transition-colors align-middle ${
                      isSelected
                        ? 'bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <td className="py-3 px-3 align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleOne(st.id)}
                        className="rounded text-[#00A19A] cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3 align-middle font-semibold text-slate-500">
                      {stt}
                    </td>
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono font-bold text-[11px] tabular-nums">
                        <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                        {st.studentCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <div className="font-extrabold text-slate-900 text-xs">
                        {st.studentName}
                      </div>
                      {st.dateOfBirth && (
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          NS: {new Date(st.dateOfBirth).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        Lớp {st.className || '-'} • Khối {st.grade || '-'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {st.campusCode || '-'} • {st.eduSystem || 'Hội nhập'} ({st.academicYearName})
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <div className="space-y-1.5">
                        {examResults.map((er: any) => {
                          const typeMeta =
                            EXAM_TYPE_META[er.examType as keyof typeof EXAM_TYPE_META];
                          return (
                            <div
                              key={er.id}
                              className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    typeMeta?.badgeColor ||
                                    'bg-white text-slate-800 border-slate-200'
                                  }`}
                                >
                                  {typeMeta?.shortLabel || er.examType}
                                </span>
                                <span className="font-black text-[#003B3A] tabular-nums">
                                  {er.summaryScoreLabel}
                                </span>
                                {er.skillResults && er.skillResults.length > 0 && (
                                  <span className="text-[11px] text-slate-600 tabular-nums">
                                    (
                                    {er.skillResults
                                      .map(
                                        (sk: any) => `${sk.componentCode}: ${sk.numericScore}`
                                      )
                                      .join(' • ')}
                                    )
                                  </span>
                                )}
                                {er.certificate?.certificateNumber && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-200 text-[10px] font-bold tabular-nums">
                                    <Award className="w-2.5 h-2.5" />
                                    {er.certificate.certificateNumber}
                                  </span>
                                )}
                              </div>

                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onEditExamResult(er)}
                                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                                  title="Chỉnh sửa kết quả kỳ thi này"
                                >
                                  <Edit3 className="w-3 h-3 text-[#008B85]" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onNotifyResults([er.id])}
                                  className="p-1 rounded-md bg-white border border-amber-200 hover:bg-amber-50 text-[#D97706]"
                                  title="Gửi thông báo kết quả này tới GVCN, Phụ huynh & Học sinh"
                                >
                                  <Bell className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === er.id}
                                  onClick={() =>
                                    handleDeleteSingleExamResult(
                                      er.id,
                                      st.studentName,
                                      typeMeta?.shortLabel || er.examType
                                    )
                                  }
                                  className="p-1 rounded-md bg-white border border-rose-200 hover:bg-rose-50 text-[#E11D48]"
                                  title="Xóa kết quả bài thi này"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAddExamForStudent(st)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#008B85] hover:bg-[#00736E] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition"
                          title="Thêm bài thi / chứng chỉ quốc tế khác cho học sinh này"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm KQ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditStudentModal(st)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 transition"
                          title="Cập nhật hồ sơ học sinh"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          <span>Hồ sơ</span>
                        </button>

                        <button
                          type="button"
                          disabled={busyId === st.id}
                          onClick={() => handleDeleteStudentResults(st)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-[#E11D48] text-[11px] font-bold inline-flex items-center transition"
                          title="Xóa kết quả thi của học sinh này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (Only shown when > 1 page or > 25 items) */}
      {studentsWithResults.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-600 tabular-nums">
          <div className="flex items-center gap-2">
            <span>
              Hiển thị <strong>{pageItems.length}</strong> /{' '}
              <strong>{studentsWithResults.length}</strong> học sinh đã nhập kết quả (
              <strong>{totalResultsCount}</strong> lượt thi)
            </span>
            {studentsWithResults.length > 25 && (
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 font-bold text-xs"
              >
                <option value={25}>25 HS / trang</option>
                <option value={50}>50 HS / trang</option>
                <option value={100}>100 HS / trang</option>
              </select>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <span className="px-3 py-1.5 font-extrabold text-slate-800">
                Trang {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold inline-flex items-center gap-1"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Student Info Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-teal-200">
                  Cập nhật hồ sơ học sinh SSM
                </div>
                <h4 className="text-sm font-black mt-0.5">
                  {editingStudent.studentName}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mã học sinh SSM *</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên học sinh *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lớp & Cơ sở SSM ({editingStudent.academicYearName || '2026-2027'})
                </label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {ssmClasses
                    .filter(
                      (cl) =>
                        !editingStudent.academicYearName ||
                        cl.academicYearName === editingStudent.academicYearName
                    )
                    .map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        Lớp {cl.className} — {cl.campusCode} ({cl.academicYearName})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="px-4 py-2 rounded-xl bg-[#008B85] hover:bg-[#00736E] text-white font-black flex items-center gap-1.5"
                >
                  {savingStudent ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
