'use client';

import React, { useEffect, useState } from 'react';
import { Award, ShieldCheck, ExternalLink, Layers, Sparkles } from 'lucide-react';
import { getStudentIntlExamsPassportAction } from '@/app/admin/ktdbcl/international-exams/actions';
import { EXAM_FAMILY_META, EXAM_TYPE_META } from '@/lib/intl-exams/ruleEngine';

interface Props {
  studentId: string;
  studentCode?: string;
}

export default function StudentInternationalExamsSection({ studentId, studentCode }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getStudentIntlExamsPassportAction(studentId, studentCode)
      .then((res) => {
        if (mounted) setRecords(res || []);
      })
      .catch(() => {
        if (mounted) setRecords([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [studentId, studentCode]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-500">
        Đang tải Hộ chiếu Khảo thí Quốc tế & Chứng chỉ...
      </div>
    );
  }

  if (records.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">
              Hộ chiếu Khảo thí Quốc tế & Chứng chỉ (Cambridge • IELTS • Pearson)
            </h3>
            <p className="text-xs text-slate-500">
              Lịch sử kết quả các kỳ thi chuẩn hóa quốc tế liên thông theo Mã học sinh SSM ({records.length} lượt thi)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {records.map((r) => {
          const typeMeta = EXAM_TYPE_META[r.examType as keyof typeof EXAM_TYPE_META];
          const famMeta = EXAM_FAMILY_META[r.examFamily as keyof typeof EXAM_FAMILY_META];
          return (
            <div
              key={r.id}
              className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      typeMeta?.badgeColor || 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {typeMeta?.label || r.examType}
                  </span>
                  <span className="text-xs font-extrabold text-slate-600">
                    Năm học {r.academicYearText}
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">{famMeta?.organization}</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {r.summaryScoreLabel}
                    </div>
                  </div>
                  {r.camOfficialStatement && (
                    <span className="text-xs font-bold text-blue-700">{r.camOfficialStatement}</span>
                  )}
                </div>

                {r.skillResults && r.skillResults.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-200/80">
                    {r.skillResults.map((sk: any) => (
                      <span
                        key={sk.id}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-700"
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
                )}
              </div>

              {r.certificate && (
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 text-slate-500">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Chứng chỉ: {r.certificate.certificateStatus}
                    {r.certificate.certificateNumber ? ` (#${r.certificate.certificateNumber})` : ''}
                  </span>
                  {r.certificate.fileUrl && (
                    <a
                      href={r.certificate.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 font-bold hover:underline"
                    >
                      <span>Bản scan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
