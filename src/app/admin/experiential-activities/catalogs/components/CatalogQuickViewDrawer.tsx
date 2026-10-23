"use client";
import React from 'react';
import { 
  X, Calendar, MapPin, BookOpen, Layers, Award, Tag, 
  Building2, Users, Sliders, CheckCircle2, AlertCircle, 
  Clock, Send, Edit3, Sparkles, FileText, CheckCheck, Target, UserCheck
} from 'lucide-react';
import { 
  ActivityCatalogItem,
  getEducationalThemeInfo,
  getEvaluationModeInfo
} from '@/lib/experiential/catalog-types';
import { formatTimeFrameAndSemester } from '@/lib/experiential/timeframe-helper';

interface CatalogQuickViewDrawerProps {
  open: boolean;
  onClose: () => void;
  item: ActivityCatalogItem | null;
  onOpenAllocate?: (item: ActivityCatalogItem) => void;
  onOpenEdit?: (item: ActivityCatalogItem) => void;
  onOpenEvalConfig?: (item: ActivityCatalogItem) => void;
  onOpenAssignToClass?: (item: ActivityCatalogItem) => void;
}

export function CatalogQuickViewDrawer({
  open,
  onClose,
  item,
  onOpenAllocate,
  onOpenEdit,
  onOpenEvalConfig,
  onOpenAssignToClass
}: CatalogQuickViewDrawerProps) {
  if (!open || !item) return null;

  const meta: any = item.meta || {};
  const allocatedCampuses = meta.allocatedCampuses || [];
  const isAllocated = allocatedCampuses.length > 0;
  const totalAssignedClasses = allocatedCampuses.reduce((acc: number, a: any) => {
    const count = a.assignedClassesCount || (Array.isArray(a.assignedClasses) ? a.assignedClasses.length : 0) || (Array.isArray(a.selectedClassIds) ? a.selectedClassIds.length : 0);
    return acc + count;
  }, 0);

  const themeInfo = meta.themeName ? getEducationalThemeInfo(meta.themeName) : null;
  const evalInfo = getEvaluationModeInfo(meta.evaluationConfig?.mode || 'RUBRIC');
  const timeInfo = formatTimeFrameAndSemester(meta.timeFrame, '2026-2027', meta.semester);
  const evalCfg: any = meta.evaluationConfig || {};
  const criteriaList = Array.isArray(evalCfg.criteria) ? evalCfg.criteria : [];
  const rolesList = Array.isArray(evalCfg.rolesList) ? evalCfg.rolesList : [];

  // Bậc học & Hệ học
  const eduLevels = Array.isArray(meta.educationLevels) && meta.educationLevels.length > 0
    ? meta.educationLevels
    : [meta.educationLevel || 'TIEU_HOC'];
  const progTypes = Array.isArray(meta.programTypes) && meta.programTypes.length > 0
    ? meta.programTypes
    : [meta.programType || 'HE_S'];

  const formatEduLevel = (lvl: string) => {
    switch (lvl) {
      case 'MN': return 'Mầm non';
      case 'TIEU_HOC': return 'Tiểu học';
      case 'THCS': return 'THCS';
      case 'THPT': return 'THPT';
      default: return lvl;
    }
  };

  const formatProgType = (prog: string) => {
    switch (prog) {
      case 'HE_S':
      case 'HI_S': return 'Hệ S (Chất lượng cao)';
      case 'SONG_NGU': return 'Hệ Song ngữ';
      case 'QUOC_TE': return 'Hệ Quốc tế';
      default: return prog;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div className="relative w-screen max-w-2xl bg-white shadow-2xl duration-200 animate-in slide-in-from-right flex flex-col h-full border-l border-slate-200">
          
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-teal-50/60 via-sky-50/40 to-white flex items-start justify-between gap-3 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  {item.code}
                </span>
                {item.status === 'CANCELLED' ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Đã hủy áp dụng
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Đang áp dụng
                  </span>
                )}
                {isAllocated ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    <span>Đã gán {totalAssignedClasses > 0 ? `${totalAssignedClasses} lớp` : ''}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Chưa phân bổ cơ sở
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900 leading-snug">
                {item.name}
              </h2>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              title="Đóng xem nhanh"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
            
            {/* THẺ TỔNG QUAN PHÂN LOẠI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Khối áp dụng</span>
                <span className="text-xs font-black text-slate-800">
                  {Array.isArray(meta.grades) ? meta.grades.join(', ') : meta.grades || 'Toàn trường'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Bậc học</span>
                <span className="text-xs font-black text-blue-900">
                  {eduLevels.map(formatEduLevel).join(', ')}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/80">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">Hệ học</span>
                <span className="text-xs font-black text-indigo-900">
                  {progTypes.map(formatProgType).join(', ')}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200/80">
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1">Thời gian</span>
                <span className="text-xs font-black text-teal-950 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#00A19A]" />
                  <span>{timeInfo.formattedTime} (HK {timeInfo.semester})</span>
                </span>
              </div>
            </div>

            {/* CHỦ ĐỀ & ĐỊA ĐIỂM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>Chủ đề giáo dục</span>
                </span>
                <div>
                  {themeInfo ? (
                    <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black border ${themeInfo.badgeCls}`}>
                      {meta.themeName}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-bold text-xs">{meta.themeName || '—'}</span>
                  )}
                </div>
                {themeInfo?.description && (
                  <p className="text-[11px] text-slate-500 italic leading-relaxed pt-0.5">
                    {themeInfo.description}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Địa điểm tổ chức</span>
                </span>
                <div className="text-xs font-bold text-slate-800 leading-snug">
                  {meta.expectedLocation || 'Theo kế hoạch cơ sở'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {meta.organizationFormat ? `Hình thức: ${meta.organizationFormat}` : 'Quy mô theo phân cấp'}
                </div>
              </div>
            </div>

            {/* NỘI DUNG GIÁO DỤC CHI TIẾT */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <span className="text-[11px] font-black uppercase text-[#003B3A] tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>Nội dung giáo dục chi tiết</span>
              </span>
              <div className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                {meta.educationalContent || meta.description || 'Chưa có nội dung mô tả chi tiết.'}
              </div>
            </div>

            {/* MỤC TIÊU & SẢN PHẨM HỌC TẬP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl border border-teal-100 bg-teal-50/30 space-y-1.5">
                <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3 text-[#00A19A]" />
                  <span>Mục tiêu bài học / Cần đạt</span>
                </span>
                <div className="text-[11px] text-slate-700 leading-relaxed font-normal">
                  {meta.learningOutcomes || meta.objectives || 'Chưa cập nhật mục tiêu cần đạt.'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                <span className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Sản phẩm học tập (Deliverables)</span>
                </span>
                <div className="text-[11px] text-slate-700 leading-relaxed font-normal">
                  {meta.deliverables || 'Poster, bài thu hoạch, hình ảnh hoặc sản phẩm sáng tạo của học sinh.'}
                </div>
              </div>
            </div>

            {/* MÔN HỌC & GIÁO VIÊN PHỤ TRÁCH */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
              <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>Môn học & Tổ chuyên môn phụ trách</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">Môn chủ trì:</span>
                  <span className="font-bold text-indigo-700">{meta.primarySubjectName || '—'}</span>
                  {meta.coopSubjectNames && (
                    <div className="mt-1">
                      <span className="text-slate-400 block text-[10px] font-bold">Môn phối hợp / tích hợp:</span>
                      <span className="text-slate-700">{meta.coopSubjectNames}</span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">Tổ chuyên môn (TCM):</span>
                  <span className="font-bold text-slate-800">{meta.departmentName || 'BP HĐNGLL - Tổ CTHS'}</span>
                  {meta.subjectTeacherName && (
                    <div className="mt-1">
                      <span className="text-slate-400 block text-[10px] font-bold">Giáo viên phụ trách:</span>
                      <span className="font-bold text-teal-800">{meta.subjectTeacherName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* HÌNH THỨC & MA TRẬN ĐÁNH GIÁ */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Ma trận & Hình thức đánh giá</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${evalInfo.badgeCls}`}>
                  {evalInfo.name}
                </span>
              </div>

              {/* Chế độ 1 / Chế độ 2: Danh sách 6 vai trò */}
              {(evalInfo.value === 'PARTICIPATION_ONLY' || evalInfo.value === 'COMPLETION_LEVEL') && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span>Đánh giá 6 vai trò học sinh trong hoạt động:</span>
                    <span className="text-[10px] text-teal-700 font-extrabold">{rolesList.length > 0 ? rolesList.length : 6} vai trò chuẩn</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(rolesList.length > 0 ? rolesList : ['Trưởng nhóm', 'Thư ký', 'Báo cáo viên', 'Hậu cần', 'Kỹ thuật', 'Thành viên']).map((r: string) => (
                      <span key={r} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shadow-2xs">
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chế độ 3: Bảng tiêu chí Rubric */}
              {evalInfo.value === 'RUBRIC' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700">Danh sách tiêu chí Rubric:</span>
                    <span className="text-teal-700 font-bold">
                      {evalCfg.formulaType === 'AVERAGE' ? 'Đồng trọng số' : 'Tính theo Trọng số (%)'}
                    </span>
                  </div>
                  {criteriaList.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {criteriaList.map((c: any, cIdx: number) => (
                        <div key={c.id || cIdx} className="p-2.5 bg-slate-50/50 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800">{c.name || `Tiêu chí ${cIdx + 1}`}</div>
                            {c.description && <div className="text-[10px] text-slate-500">{c.description}</div>}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-[#00A19A]">{c.weight ? `${c.weight}%` : 'Đồng điểm'}</span>
                            <span className="text-[10px] text-slate-400 block">Thang {c.maxScore || 10}đ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded-xl">
                      Chưa cấu hình chi tiết danh sách tiêu chí Rubric.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TÌNH TRẠNG PHÂN BỔ CÁC CƠ SỞ */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Tình trạng phân bổ xuống các Cơ sở ({allocatedCampuses.length}/5)</span>
                </span>
                <span className="font-bold text-blue-700 text-[11px]">
                  Tổng {totalAssignedClasses} lớp đã gán
                </span>
              </div>

              {allocatedCampuses.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {allocatedCampuses.map((a: any) => {
                    const isDeployed = a.status === 'DA_TRIEN_KHAI';
                    const isAccepted = a.status === 'DA_TIEP_NHAN';
                    const classCount = a.assignedClassesCount || (Array.isArray(a.assignedClasses) ? a.assignedClasses.length : 0) || (Array.isArray(a.selectedClassIds) ? a.selectedClassIds.length : 0);
                    return (
                      <div key={a.campusId} className="p-3 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isDeployed ? 'bg-emerald-500' : isAccepted ? 'bg-amber-500' : 'bg-slate-300'}`} />
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {a.campusName || `Cơ sở ${a.campusCode || a.campusId}`}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              GV tiếp nhận: <strong className="text-slate-700">{a.subjectTeacherName || a.tlhnTeacherName || 'GV Phụ trách cơ sở'}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            isDeployed 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isAccepted 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {classCount > 0 ? `Đã gán ${classCount} lớp` : isDeployed ? 'Đã triển khai' : isAccepted ? 'Đã tiếp nhận' : 'Chờ tiếp nhận'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-4 bg-slate-50 rounded-xl text-slate-400 text-xs">
                  Hoạt động này chưa được đẩy xuống cơ sở nào.
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors"
            >
              Đóng
            </button>

            <div className="flex items-center gap-2">
              {onOpenAssignToClass && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAssignToClass(item);
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Thêm hoạt động này vào lớp của tôi để đánh giá vai trò học sinh"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Thêm vào lớp của tôi</span>
                </button>
              )}

              {onOpenEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(item);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-teal-50 text-teal-800 hover:text-[#003B3A] font-bold rounded-xl border border-teal-200 shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Sửa thông tin</span>
                </button>
              )}

              {onOpenAllocate && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAllocate(item);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-700 via-indigo-600 to-[#00A19A] hover:from-blue-800 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAllocated ? 'Quản lý Gán Lớp' : 'Đẩy Hoạt Động Xuống Cơ Sở'}</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
