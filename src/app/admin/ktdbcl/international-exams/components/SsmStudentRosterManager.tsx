'use client';

import React, { useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Award,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Loader2,
  UserCheck,
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
  onAddExamForStudent: (student: any) => void;
  onEditExamResult: (result: any) => void;
  onNotifyResults: (resultIds: string[]) => void;
  onRefresh: () => void;
}

export default function SsmStudentRosterManager({
  roster,
  students,
  totalCount,
  ssmClasses = [],
  onAddExamForStudent,
  onEditExamResult,
  onNotifyResults,
  onRefresh,
}: Props) {
  const activeRoster = useMemo(
    () => (roster && roster.length > 0 ? roster : students || []),
    [roster, students]
  );
  const activeTotalCount = totalCount ?? activeRoster.length;

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WITH_RESULTS' | 'WITHOUT_RESULTS'>('ALL');
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

  const withResultsCount = useMemo(
    () => activeRoster.filter((s) => Array.isArray(s.examResults) && s.examResults.length > 0).length,
    [activeRoster]
  );
  const withoutResultsCount = activeRoster.length - withResultsCount;

  const filteredRoster = useMemo(() => {
    if (statusFilter === 'WITH_RESULTS') {
      return activeRoster.filter((s) => Array.isArray(s.examResults) && s.examResults.length > 0);
    }
    if (statusFilter === 'WITHOUT_RESULTS') {
      return activeRoster.filter((s) => !s.examResults || s.examResults.length === 0);
    }
    return activeRoster;
  }, [activeRoster, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRoster.slice(start, start + pageSize);
  }, [filteredRoster, safePage, pageSize]);

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
      alert('Vui lòng nhập đầy đủ Họ và tên Học sinh và Mã HS.');
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

  const handleDeleteSingleStudentRow = async (student: any) => {
    const hasExams = Array.isArray(student.examResults) && student.examResults.length > 0;
    if (hasExams) {
      const confirmResultOnly = window.confirm(
        `Học sinh "${student.studentName}" (${student.studentCode}) đang có ${student.examResults.length} kết quả khảo thí quốc tế.\n\nNhấn OK để XÓA KẾT QUẢ THI của học sinh này (giữ học sinh trong danh sách lớp SSM).`
      );
      if (!confirmResultOnly) return;
      setBusyId(student.id);
      try {
        await deleteSsmStudentOrResultsForIntlWorkspaceAction({
          studentId: student.id,
          mode: 'RESULTS_ONLY',
        });
        onRefresh();
      } finally {
        setBusyId(null);
      }
    } else {
      const confirmHide = window.confirm(
        `Bạn có chắc chắn muốn xóa/ẩn học sinh "${student.studentName}" (Mã HS: ${student.studentCode} - Lớp ${student.className}) khỏi danh sách hiện tại?`
      );
      if (!confirmHide) return;
      setBusyId(student.id);
      try {
        await deleteSsmStudentOrResultsForIntlWorkspaceAction({
          studentId: student.id,
          mode: 'HIDE_STUDENT',
        });
        setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
        onRefresh();
      } finally {
        setBusyId(null);
      }
    }
  };

  const handleDeleteSingleExamResult = async (resultId: string, studentName: string, examType: string) => {
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

  const handleBulkDelete = async (mode: 'RESULTS_ONLY' | 'HIDE_STUDENT') => {
    if (selectedStudentIds.length === 0) return;
    const msg =
      mode === 'RESULTS_ONLY'
        ? `Xóa toàn bộ kết quả khảo thí quốc tế của ${selectedStudentIds.length} học sinh đang chọn?`
        : `Xóa/ẩn ${selectedStudentIds.length} học sinh đang chọn khỏi danh sách hiện tại?`;
    if (!window.confirm(msg)) return;

    setBusyId('BULK');
    try {
      await bulkDeleteIntlExamStudentsOrResultsAction({
        studentIds: selectedStudentIds,
        mode,
      });
      setSelectedStudentIds([]);
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const selectedStudentsObjects = useMemo(
    () => activeRoster.filter((s) => selectedStudentIds.includes(s.id)),
    [activeRoster, selectedStudentIds]
  );

  const selectedResultIds = useMemo(
    () =>
      selectedStudentsObjects.flatMap((s) =>
        (s.examResults || []).map((r: any) => r.id)
      ),
    [selectedStudentsObjects]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header & Filter Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Danh sách Học sinh SSM ({activeTotalCount} học sinh theo bộ lọc)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn học sinh trong danh sách để <strong>Nhập kết quả / chứng chỉ</strong>, <strong>Sửa thông tin / điểm thi</strong> hoặc <strong>Xóa</strong> trực tiếp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `Tất cả HS hiển thị (${activeRoster.length})` },
            { id: 'WITH_RESULTS', label: `Đã có Kết quả / CC (${withResultsCount})` },
            { id: 'WITHOUT_RESULTS', label: `Chưa có Kết quả (${withoutResultsCount})` },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  active
                    ? 'bg-[#003B3A] text-white border-[#003B3A]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Select Batch Action Toolbar */}
      {selectedStudentIds.length > 0 && (
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-teal-900">
            <UserCheck className="w-4 h-4 text-teal-600" />
            <span>Đã chọn {selectedStudentIds.length} học sinh</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedStudentsObjects.length === 1 && (
              <button
                type="button"
                onClick={() => onAddExamForStudent(selectedStudentsObjects[0])}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nhập Kết quả cho {selectedStudentsObjects[0].studentName}</span>
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
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Gửi TB tới GVCN • PH • HS ({selectedResultIds.length})</span>
              </button>
            )}

            {selectedResultIds.length > 0 && (
              <button
                type="button"
                disabled={busyId === 'BULK'}
                onClick={() => handleBulkDelete('RESULTS_ONLY')}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa KQ thi đã chọn</span>
              </button>
            )}

            <button
              type="button"
              disabled={busyId === 'BULK'}
              onClick={() => handleBulkDelete('HIDE_STUDENT')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa HS đã chọn ({selectedStudentIds.length})</span>
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

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
            <tr>
              <th className="py-3 px-3 w-9">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={handleToggleSelectPage}
                  className="rounded text-teal-600 cursor-pointer"
                  title="Chọn tất cả học sinh trên trang này"
                />
              </th>
              <th className="py-3 px-2 font-bold w-12">STT</th>
              <th className="py-3 px-2.5 font-bold">Mã HS SSM</th>
              <th className="py-3 px-2.5 font-bold">Họ và tên Học sinh</th>
              <th className="py-3 px-2.5 font-bold">Lớp • Khối • Cơ sở</th>
              <th className="py-3 px-2.5 font-bold">Kết quả & Chứng chỉ Quốc tế</th>
              <th className="py-3 px-3 font-bold text-right">Thao tác (Chọn • Sửa • Xóa)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                  Không tìm thấy học sinh nào khớp với bộ lọc hiện tại. Hãy đổi bộ lọc Năm học / Cơ sở / Lớp để xem danh sách học sinh.
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
                    className={`transition ${
                      isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-50/90'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleOne(st.id)}
                        className="rounded text-teal-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-500">{stt}</td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono font-bold text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-teal-600" />
                        {st.studentCode}
                      </span>
                    </td>
                    <td className="py-3 px-2.5">
                      <div className="font-extrabold text-slate-900 text-xs">{st.studentName}</div>
                      {st.dateOfBirth && (
                        <div className="text-[11px] text-slate-500">
                          NS: {new Date(st.dateOfBirth).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        Lớp {st.className || '-'} • Khối {st.grade || '-'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {st.campusCode || '-'} • {st.eduSystem || 'Hội nhập'} ({st.academicYearName})
                      </div>
                    </td>
                    <td className="py-3 px-2.5">
                      {examResults.length > 0 ? (
                        <div className="space-y-1.5">
                          {examResults.map((er: any) => {
                            const typeMeta = EXAM_TYPE_META[er.examType as keyof typeof EXAM_TYPE_META];
                            return (
                              <div
                                key={er.id}
                                className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-teal-50/70 border border-teal-200"
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      typeMeta?.badgeColor || 'bg-white text-slate-800'
                                    }`}
                                  >
                                    {typeMeta?.shortLabel || er.examType}
                                  </span>
                                  <span className="font-black text-slate-900">
                                    {er.summaryScoreLabel}
                                  </span>
                                  {er.skillResults && er.skillResults.length > 0 && (
                                    <span className="text-[11px] text-slate-600">
                                      (
                                      {er.skillResults
                                        .map((sk: any) => `${sk.componentCode}:${sk.numericScore}`)
                                        .join(' • ')}
                                      )
                                    </span>
                                  )}
                                </div>

                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onEditExamResult(er)}
                                    className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                                    title="Sửa kết quả kỳ thi này"
                                  >
                                    <Edit3 className="w-3 h-3 text-teal-600" />
                                    <span>Sửa KQ</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onNotifyResults([er.id])}
                                    className="p-1 rounded bg-white border border-amber-200 hover:bg-amber-50 text-amber-600"
                                    title="Gửi thông báo kết quả này tới GVCN, Phụ huynh & Học sinh"
                                  >
                                    <Bell className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteSingleExamResult(
                                        er.id,
                                        st.studentName,
                                        typeMeta?.shortLabel || er.examType
                                      )
                                    }
                                    className="p-1 rounded bg-white border border-rose-200 hover:bg-rose-50 text-rose-600"
                                    title="Xóa kết quả bài thi này"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Chưa có kết quả thi quốc tế
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAddExamForStudent(st)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition"
                          title="Chọn học sinh này để nhập kết quả / chứng chỉ quốc tế"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nhập KQ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            examResults.length > 0
                              ? onEditExamResult(examResults[0])
                              : openEditStudentModal(st)
                          }
                          onDoubleClick={() => openEditStudentModal(st)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 transition"
                          title="Sửa thông tin học sinh hoặc kết quả thi"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          disabled={busyId === st.id}
                          onClick={() => handleDeleteSingleStudentRow(st)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-[11px] font-bold inline-flex items-center gap-1 transition"
                          title="Xóa học sinh hoặc xóa kết quả thi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
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

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>
            Hiển thị <strong>{pageItems.length}</strong> / <strong>{filteredRoster.length}</strong> học sinh
            (Tổng SSM khớp bộ lọc: <strong>{activeTotalCount}</strong>)
          </span>
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
        </div>

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
      </div>

      {/* Edit Student Info Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-200">
                  Cập nhật Hồ sơ Học sinh SSM
                </div>
                <h4 className="text-sm font-black mt-0.5">
                  Sửa thông tin Học sinh: {editingStudent.studentName}
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
                <label className="block font-bold text-slate-700 mb-1">Mã Học sinh SSM *</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên Học sinh *
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
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black flex items-center gap-1.5"
                >
                  {savingStudent ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu Thay Đổi</span>
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
