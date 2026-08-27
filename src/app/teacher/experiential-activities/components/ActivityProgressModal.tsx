"use client";
import React from 'react';
import { X, Users, CheckCircle2, Clock, BarChart3, AlertCircle, ArrowRight, ExternalLink, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ActivityProgressModal({ activity, isOpen, onClose }: { activity: any; isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  if (!isOpen || !activity) return null;

  const assignedClasses = activity.assignedClasses || [];
  const totalClasses = assignedClasses.length;
  const completedClasses = assignedClasses.filter((c: any) => c.status === 'COMPLETED').length;
  const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black text-[#003B3A] bg-[#00A99D]/10 px-2.5 py-0.5 rounded-lg border border-[#00A99D]/20">
                {activity.code || 'HDTN'}
              </span>
              <span className="text-xs font-bold text-slate-400"></span>
              <span className="text-xs font-bold text-slate-500">{activity.activityTypeName || 'Hoạt động trải nghiệm'}</span>
            </div>
            <h3 className="text-base font-black text-slate-900 line-clamp-1">{activity.name}</h3>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overall Progress Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-700">Tiến độ hoàn thành ton b?:</span>
            <span className="text-[#00A99D]">{completedClasses}/{totalClasses} lớp ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={"h-full rounded-full transition-all " + (progressPercent === 100 ? 'bg-emerald-500' : 'bg-[#00A99D]')}
              style={{ width: progressPercent + "%" }}
            />
          </div>
        </div>

        {/* Class by Class List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {assignedClasses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-bold">
              Chưa cóó lớp nào được gán cho hoạt động này
            </div>
          ) : (
            assignedClasses.map((cls: any, idx: number) => {
              const isCompleted = cls.status === 'COMPLETED';
              const isInProgress = cls.status === 'IN_PROGRESS';
              const totalSt = cls.totalStudents || 30;
              const evalSt = cls.evaluatedStudents || 0;
              const pct = totalSt > 0 ? Math.round((evalSt / totalSt) * 100) : 0;

              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#00A99D]/40 transition-all flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className={"w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs " + (
                      isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isInProgress ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    )}>
                      {cls.className}
                    </div>

                    <div>
                      <div className="text-xs font-black text-slate-800">
                        {cls.campusName || cls.campusCode}  Khối {cls.grade}
                      </div>
                      <div className="text-[11px] text-slate-400 font-bold">
                        GVCN: <span className="text-slate-700">{cls.homeroomTeacherName || 'Cha gn'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-800">{evalSt}/{totalSt} HS</div>
                      <div className={"text-[10px] font-black " + (isCompleted ? 'text-emerald-600' : 'text-[#00A99D]')}>
                        {pct}% ({isCompleted ? 'đã nộp' : isInProgress ? 'Đang chấm' : 'Chưa cóóh?m'})
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        router.push("/teacher/experiential-activities/" + activity.id + "đượclassId=" + cls.classId);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-[#00A99D] hover:text-white text-slate-600 transition-all"
                      title="M? sổ đánh giá của lớp này"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
          >
            ng
          </button>
        </div>

      </div>
    </div>
  );
}
