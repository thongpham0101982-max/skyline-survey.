'use client';

import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Layers,
  Shield,
  Target,
  Info,
} from 'lucide-react';
import { EXAM_FAMILY_META, ExamFamilyCode } from '@/lib/intl-exams/ruleEngine';

interface Props {
  activeFamilyFilter: string;
  yleAnalytics: any;
  camMainAnalytics: any;
  ieltsAnalytics: any;
  pearsonAnalytics: any;
  checkpointAnalytics: any;
  comparativeReports: any;
  onUpdateTargetClick?: (family: ExamFamilyCode) => void;
}

export default function SpecializedDashboardsView({
  activeFamilyFilter,
  yleAnalytics,
  camMainAnalytics,
  ieltsAnalytics,
  pearsonAnalytics,
  checkpointAnalytics,
  comparativeReports,
  onUpdateTargetClick,
}: Props) {
  const [selectedDashboardTab, setSelectedDashboardTab] = useState<ExamFamilyCode | 'OVERVIEW_COMPARE'>(
    activeFamilyFilter && activeFamilyFilter !== 'ALL'
      ? (activeFamilyFilter as ExamFamilyCode)
      : 'CAMBRIDGE_YLE'
  );

  // Sync if parent filter changes to a specific family
  React.useEffect(() => {
    if (activeFamilyFilter && activeFamilyFilter !== 'ALL') {
      setSelectedDashboardTab(activeFamilyFilter as ExamFamilyCode);
    }
  }, [activeFamilyFilter]);

  const tabs: Array<{ id: ExamFamilyCode | 'OVERVIEW_COMPARE'; label: string; count: number; badgeColor: string }> = [
    {
      id: 'CAMBRIDGE_YLE',
      label: '1. Starters / Movers / Flyers',
      count: yleAnalytics?.totalSittings || 0,
      badgeColor: 'bg-teal-600',
    },
    {
      id: 'CAMBRIDGE_MAIN',
      label: '2. KET (A2) / PET (B1)',
      count: camMainAnalytics?.totalSittings || 0,
      badgeColor: 'bg-blue-600',
    },
    {
      id: 'IELTS',
      label: '3. IELTS (Band 0–9)',
      count: ieltsAnalytics?.totalSittings || 0,
      badgeColor: 'bg-rose-600',
    },
    {
      id: 'PEARSON_EDEXCEL',
      label: '4. Pearson iPrimary / iLS',
      count: pearsonAnalytics?.totalSittings || 0,
      badgeColor: 'bg-[#003B3A]',
    },
    {
      id: 'CAMBRIDGE_CHECKPOINT',
      label: '5. Cambridge Checkpoint',
      count: checkpointAnalytics?.totalSittings || 0,
      badgeColor: 'bg-amber-600',
    },
    {
      id: 'OVERVIEW_COMPARE',
      label: '6. Ma trận So sánh Cơ sở & Năm học',
      count:
        (yleAnalytics?.totalSittings || 0) +
        (camMainAnalytics?.totalSittings || 0) +
        (ieltsAnalytics?.totalSittings || 0) +
        (pearsonAnalytics?.totalSittings || 0) +
        (checkpointAnalytics?.totalSittings || 0),
      badgeColor: 'bg-slate-700',
    },
  ];

  return (
    <div className="space-y-4 tabular-nums">
      {/* Sub-navigation for the 5 Specialized Dashboards */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-2 shadow-xs flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const active = selectedDashboardTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedDashboardTab(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                active
                  ? 'bg-[#003B3A] text-white shadow-2xs'
                  : 'bg-[#F8FAFC] text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums ${
                  active ? 'bg-white/20 text-[#5EEAD4]' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          DASHBOARD A: CAMBRIDGE YLE (STARTERS / MOVERS / FLYERS)
         ===================================================================== */}
      {selectedDashboardTab === 'CAMBRIDGE_YLE' && (
        <div className="space-y-4">
          <div className="bg-[#003B3A] rounded-2xl p-5 text-white shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/15 text-teal-100 text-xs font-semibold mb-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  Cambridge Young Learners English (YLE) • Thang 0–15 khiên
                </div>
                <h2 className="text-lg font-black tracking-tight">
                  Phân tích chuyên biệt: Starters • Movers • Flyers
                </h2>
                <p className="text-xs text-teal-100/90 mt-1 max-w-3xl">
                  Đánh giá theo số khiên từng kỹ năng (Reading & Writing 0–5, Listening 0–5, Speaking 0–5; Tổng 0–15 khiên). Các nhóm 0–6, 7–9, 10–14 và 15 khiên là phân nhóm quản trị nội bộ của Sky-Line.
                </p>
              </div>
              {onUpdateTargetClick && (
                <button
                  type="button"
                  onClick={() => onUpdateTargetClick('CAMBRIDGE_YLE')}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 shrink-0 transition"
                >
                  Cấu hình ngưỡng mục tiêu ({yleAnalytics.internalTargetShields} khiên)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mt-4">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-[11px] text-teal-200 font-medium">Số lượt thi hoàn thành</div>
                <div className="text-xl font-black mt-0.5">{yleAnalytics.totalSittings}</div>
                <div className="text-[11px] text-teal-200/80 mt-0.5">
                  {yleAnalytics.uniqueStudents} học sinh duy nhất
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-[11px] text-teal-200 font-medium">Tổng khiên trung bình</div>
                <div className="text-xl font-black mt-0.5">{yleAnalytics.avgTotalShields} / 15</div>
                <div className="text-[11px] text-teal-200/80 mt-0.5">
                  Mẫu số: {yleAnalytics.totalSittings} lượt thi hoàn thành
                </div>
              </div>
              <div className="bg-emerald-500/20 rounded-xl p-3 border border-emerald-300/30">
                <div className="text-[11px] text-emerald-200 font-bold">Đạt 15 khiên tuyệt đối</div>
                <div className="text-xl font-black text-[#5EEAD4] mt-0.5">
                  {yleAnalytics.rate15Shields}%
                </div>
                <div className="text-[11px] text-emerald-100 mt-0.5">
                  {yleAnalytics.count15Shields} / {yleAnalytics.totalSittings} lượt thi
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-[11px] text-teal-200 font-medium">
                  Đạt mục tiêu nội bộ (≥{yleAnalytics.internalTargetShields} khiên)
                </div>
                <div className="text-xl font-black mt-0.5">{yleAnalytics.rateTargetMet}%</div>
                <div className="text-[11px] text-teal-200/80 mt-0.5">
                  {yleAnalytics.countTargetMet} / {yleAnalytics.totalSittings} lượt thi
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-[11px] text-teal-200 font-medium">Bản ghi đủ 3 kỹ năng RW-L-S</div>
                <div className="text-xl font-black mt-0.5">{yleAnalytics.fullSkillSittings}</div>
                <div className="text-[11px] text-teal-200/80 mt-0.5">
                  Mẫu số phân tích kỹ năng chuyên sâu
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 4 Nhóm Khiên Quản trị Sky-Line */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Phân bố 4 Nhóm Khiên theo Quản trị Sky-Line
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thống kê nhóm 0–6, 7–9, 10–14 và 15 khiên (Mẫu số N = {yleAnalytics.totalSittings} lượt thi)
                  </p>
                </div>
              </div>
              <div className="space-y-3.5">
                {yleAnalytics.skylineGroups.map((grp: any) => (
                  <div key={grp.code} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{grp.label}</span>
                      <span className="font-extrabold text-slate-900">
                        {grp.count} lượt ({grp.rate}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(grp.rate, grp.count > 0 ? 3 : 0)}%`,
                          backgroundColor: grp.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Phổ điểm chi tiết từ 6..15 khiên */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-3">
                  Biểu đồ phân bố chi tiết Tổng số khiên (0–15 khiên)
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 items-end h-28 pt-4">
                  {yleAnalytics.shieldHistogram.map((h: any) => {
                    const maxCount = Math.max(
                      1,
                      ...yleAnalytics.shieldHistogram.map((x: any) => x.count)
                    );
                    const heightPct = Math.round((h.count / maxCount) * 100);
                    return (
                      <div key={h.shields} className="flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[10px] font-bold text-slate-600">
                          {h.count > 0 ? h.count : ''}
                        </span>
                        <div className="w-full bg-slate-100 rounded-t-md flex items-end h-16 overflow-hidden">
                          <div
                            className={`w-full rounded-t-md ${
                              h.shields === 15
                                ? 'bg-emerald-500'
                                : h.shields >= 10
                                ? 'bg-blue-500'
                                : h.shields >= 7
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ height: `${Math.max(heightPct, h.count > 0 ? 8 : 0)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-700">{h.shields}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Phân tích 3 kỹ năng RW, Listening, Speaking */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Phân tích Số Khiên Riêng Từng Kỹ Năng (0–5 Khiên)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Tính trên {yleAnalytics.fullSkillSittings} kết quả có đầy đủ mã thành phần RW-L-S
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {yleAnalytics.skillAverages.map((sk: any) => (
                    <div
                      key={sk.code}
                      className="rounded-xl border border-slate-200 p-4 bg-slate-50/70 flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-600">{sk.label}</div>
                        <div className="text-2xl font-black text-teal-700 mt-1.5">
                          {sk.avgShields} <span className="text-xs font-semibold text-slate-500">/ 5.0</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Đạt 5 khiên tối đa:</span>
                          <span className="font-bold text-emerald-700">{sk.rate5Shields}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cần cải thiện (≤2 khiên):</span>
                          <span className="font-bold text-rose-600">{sk.lowCount} HS</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* So sánh Starters, Movers, Flyers */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-slate-800 mb-2.5">
                  So sánh Starters • Movers • Flyers theo cấp độ & phân bố kết quả
                </h4>
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs tabular-nums">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                      <tr className="text-left text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-3 px-3 text-white">Cấp độ thi</th>
                        <th className="py-3 px-3 text-center text-teal-100">Lượt thi</th>
                        <th className="py-3 px-3 text-center text-[#5EEAD4]">TB khiên</th>
                        <th className="py-3 px-3 text-center text-[#5EEAD4]">Tỷ lệ 15 khiên</th>
                        <th className="py-3 px-3 text-center text-teal-100">Nhóm 10–14</th>
                        <th className="py-3 px-3 text-center text-teal-100">Nhóm 7–9</th>
                        <th className="py-3 px-3 text-center text-teal-100">Nhóm 0–6</th>
                        <th className="py-3 px-3 text-center text-teal-100">TB RW / L / S</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {yleAnalytics.byLevel.map((row: any) => (
                        <tr key={row.examType} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3 align-middle font-extrabold text-slate-900">{row.examType}</td>
                          <td className="py-3 px-3 align-middle text-center font-bold">{row.totalSittings}</td>
                          <td className="py-3 px-3 align-middle text-center font-extrabold text-[#00736E]">
                            {row.avgTotalShields}
                          </td>
                          <td className="py-3 px-3 align-middle text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              {row.rate15Shields}% ({row.count15Shields})
                            </span>
                          </td>
                          <td className="py-3 px-3 align-middle text-center font-semibold text-blue-700">
                            {row.group10_14}
                          </td>
                          <td className="py-3 px-3 align-middle text-center font-semibold text-amber-700">
                            {row.group7_9}
                          </td>
                          <td className="py-3 px-3 align-middle text-center font-semibold text-rose-600">
                            {row.group0_6}
                          </td>
                          <td className="py-3 px-3 align-middle text-center text-[11px] font-mono text-slate-600">
                            {row.avgRW ?? '-'} / {row.avgListening ?? '-'} / {row.avgSpeaking ?? '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DASHBOARD B: CAMBRIDGE ENGLISH KET (A2 KEY) & PET (B1 PRELIMINARY)
         ===================================================================== */}
      {selectedDashboardTab === 'CAMBRIDGE_MAIN' && (
        <div className="space-y-4">
          <div className="bg-[#003B3A] rounded-2xl p-5 text-white shadow-xs">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/15 text-teal-100 text-xs font-semibold mb-1.5">
              <Award className="w-3.5 h-3.5 text-[#5EEAD4]" />
              Cambridge English Qualifications • KET (A2 Key) & PET (B1 Preliminary)
            </div>
            <h2 className="text-lg font-black tracking-tight">
              Phân tích chuyên biệt: KET (A2 Key) & PET (B1 Preliminary)
            </h2>
            <p className="text-xs text-teal-100/90 mt-1 max-w-4xl">
              Áp dụng thang điểm Cambridge English Scale chính thức: KET (140–150 Grade A/B1, 133–139 Grade B/A2, 120–132 Grade C/A2, 100–119 Level A1, &lt;100 Dưới ngưỡng) • PET (160–170 Grade A/B2, 153–159 Grade B/B1, 140–152 Grade C/B1, 120–139 Level A2, &lt;120 Dưới ngưỡng).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(['ket', 'pet'] as const).map((key) => {
              const data = camMainAnalytics[key];
              const isKet = key === 'ket';
              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase ${
                          isKet ? 'bg-blue-100 text-blue-800' : 'bg-teal-50 text-teal-800'
                        }`}
                      >
                        {isKet ? 'KET – A2 Key (Khung chuẩn 120–150)' : 'PET – B1 Preliminary (Khung chuẩn 140–170)'}
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        {isKet ? 'Phân tích Kết quả KET (A2 Key)' : 'Phân tích Kết quả PET (B1 Preliminary)'}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-blue-700">{data.avgScale}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        Scale TB ({data.totalSittings} lượt)
                      </div>
                    </div>
                  </div>

                  {/* 4 KPI mini cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-[11px] text-emerald-700 font-semibold">
                        Đạt chuẩn {isKet ? 'A2 (≥120)' : 'B1 (≥140)'}
                      </div>
                      <div className="text-lg font-black text-emerald-800 mt-0.5">
                        {data.targetMetRate}%
                      </div>
                      <div className="text-[10px] text-emerald-600">
                        {data.targetMetCount}/{data.totalSittings} lượt
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                      <div className="text-[11px] text-teal-800 font-semibold">
                        Vượt khung Grade A ({isKet ? 'B1' : 'B2'})
                      </div>
                      <div className="text-lg font-black text-teal-800 mt-0.5">
                        {data.exceedsRate}%
                      </div>
                      <div className="text-[10px] text-teal-800">
                        {data.exceedsCount}/{data.totalSittings} lượt
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="text-[11px] text-blue-700 font-semibold">
                        Được cấp chứng chỉ
                      </div>
                      <div className="text-lg font-black text-blue-800 mt-0.5">
                        {data.certAwardedRate}%
                      </div>
                      <div className="text-[10px] text-blue-600">
                        {data.certAwardedCount}/{data.totalSittings} lượt
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                      <div className="text-[11px] text-rose-700 font-semibold">
                        Dưới ngưỡng ({isKet ? '<100' : '<120'})
                      </div>
                      <div className="text-lg font-black text-rose-800 mt-0.5">
                        {data.belowThresholdCount}
                      </div>
                      <div className="text-[10px] text-rose-600">Không ép thành Grade C</div>
                    </div>
                  </div>

                  {/* Grade Distribution */}
                  <div>
                    <div className="text-xs font-extrabold text-slate-800 mb-2.5">
                      Phân bố Grade Chính thức & Mức Kết quả
                    </div>
                    <div className="space-y-2.5">
                      {data.gradeDistribution.map((g: any) => {
                        const pct =
                          data.totalSittings > 0
                            ? Number(((g.count / data.totalSittings) * 100).toFixed(1))
                            : 0;
                        return (
                          <div key={g.code} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700">{g.label}</span>
                              <span className="font-bold text-slate-900">
                                {g.count} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(pct, g.count > 0 ? 4 : 0)}%`,
                                  backgroundColor: g.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CEFR & 4 Skills Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <div className="text-xs font-extrabold text-slate-800 mb-2">
                        Phân bố Trình độ CEFR
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {data.cefrDistribution.map((c: any) => (
                          <div
                            key={c.cefr}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: c.color }}
                            />
                            <span className="text-xs font-extrabold text-slate-800">{c.cefr}:</span>
                            <span className="text-xs font-bold text-slate-600">{c.count} HS</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-extrabold text-slate-800 mb-2">
                        Điểm TB 4 Kỹ năng (Bản ghi đủ 4 kỹ năng)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {data.skillAverages.map((sk: any) => (
                          <div
                            key={sk.code}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                          >
                            <span className="text-[11px] font-bold text-slate-600">{sk.code}</span>
                            <span className="text-xs font-black text-blue-700">
                              {sk.avgScale !== null ? `${sk.avgScale} (n=${sk.denominator})` : 'Chưa có'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          DASHBOARD C: IELTS (BAND 0.0 – 9.0)
         ===================================================================== */}
      {selectedDashboardTab === 'IELTS' && (
        <div className="space-y-4">
          <div className="bg-[#003B3A] rounded-2xl p-5 text-white shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/15 text-teal-100 text-xs font-semibold mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  IELTS Academic & General Training • Band 0.0–9.0
                </div>
                <h2 className="text-lg font-black tracking-tight">
                  Phân tích chuyên biệt: Phổ điểm & Xu hướng IELTS
                </h2>
                <p className="text-xs text-teal-100/90 mt-1 max-w-3xl">
                  Thống kê theo 6 dải Band chuẩn (Dưới 4.0; 4.0–4.5; 5.0–5.5; 6.0–6.5; 7.0–7.5; Từ 8.0 trở lên), tỷ lệ đạt các mốc mục tiêu (6.0 / 6.5 / 7.0+) và theo dõi xu hướng qua các năm học.
                </p>
              </div>
              {onUpdateTargetClick && (
                <button
                  type="button"
                  onClick={() => onUpdateTargetClick('IELTS')}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 shrink-0 transition"
                >
                  Cấu hình mục tiêu IELTS ({ieltsAnalytics.defaultTargetBand})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mt-4">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-[11px] text-teal-200">Tổng lượt thi IELTS</div>
                <div className="text-xl font-black mt-0.5">{ieltsAnalytics.totalSittings}</div>
                <div className="text-[11px] text-teal-200/80 mt-0.5">
                  {ieltsAnalytics.uniqueStudents} học sinh duy nhất
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-[11px] text-teal-200">Overall Band trung bình</div>
                <div className="text-xl font-black mt-0.5">{ieltsAnalytics.avgBand}</div>
                <div className="text-[11px] text-teal-200/80 mt-0.5">
                  Cao nhất: Band {ieltsAnalytics.maxBand.toFixed(1)}
                </div>
              </div>
              {ieltsAnalytics.milestones
                .filter((m: any) => [6.0, 7.0, 8.0].includes(m.targetBand))
                .map((m: any) => (
                  <div key={m.targetBand} className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <div className="text-[11px] text-teal-200 font-semibold">
                      Đạt IELTS ≥ {m.targetBand.toFixed(1)}
                    </div>
                    <div className="text-xl font-black text-[#5EEAD4] mt-0.5">{m.rate}%</div>
                    <div className="text-[11px] text-teal-100 mt-0.5">
                      {m.count} / {ieltsAnalytics.totalSittings} lượt thi
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 6 Dải Band IELTS */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900">
                Phân bố Overall Band theo 6 dải chuẩn
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Dưới 4.0 • 4.0–4.5 • 5.0–5.5 • 6.0–6.5 • 7.0–7.5 • Từ 8.0 trở lên
              </p>
              <div className="space-y-3">
                {ieltsAnalytics.bandDistribution.map((b: any) => (
                  <div key={b.code} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700">{b.label}</span>
                      <span className="font-extrabold text-slate-900">
                        {b.count} HS ({b.rate}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(b.rate, b.count > 0 ? 4 : 0)}%`,
                          backgroundColor: b.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tỷ lệ đạt các mốc Band mục tiêu */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs font-extrabold text-slate-800 mb-2.5">
                  Tỷ lệ đạt các mốc Band mục tiêu nội bộ (5.5+ đến 8.0+)
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ieltsAnalytics.milestones.map((m: any) => (
                    <div
                      key={m.targetBand}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center"
                    >
                      <div className="text-[11px] font-bold text-slate-500">
                        ≥ {m.targetBand.toFixed(1)}
                      </div>
                      <div className="text-sm font-black text-[#003B3A] mt-0.5">{m.rate}%</div>
                      <div className="text-[10px] text-slate-500">{m.count} HS</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Xu hướng IELTS theo năm học & 4 kỹ năng */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Xu hướng kết quả IELTS qua các năm học
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Theo dõi sự dịch chuyển Band trung bình và tỷ lệ đạt Band 6.5+, 7.0+, 8.0+
                </p>
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs tabular-nums">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                      <tr className="text-left text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-3 px-3 text-white">Năm học</th>
                        <th className="py-3 px-3 text-center text-teal-100">Số lượng</th>
                        <th className="py-3 px-3 text-center text-[#5EEAD4]">Band TB</th>
                        <th className="py-3 px-3 text-center text-teal-100">Tỷ lệ ≥ 6.5</th>
                        <th className="py-3 px-3 text-center text-teal-100">Tỷ lệ ≥ 7.0</th>
                        <th className="py-3 px-3 text-center text-[#5EEAD4]">Tỷ lệ ≥ 8.0</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {ieltsAnalytics.byAcademicYear.map((yr: any) => (
                        <tr key={yr.academicYear} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3 align-middle font-extrabold text-slate-900">{yr.academicYear}</td>
                          <td className="py-3 px-3 align-middle text-center font-bold">{yr.count}</td>
                          <td className="py-3 px-3 align-middle text-center font-black text-[#003B3A]">{yr.avgBand}</td>
                          <td className="py-3 px-3 align-middle text-center font-semibold text-blue-700">
                            {yr.rate6_5Plus}%
                          </td>
                          <td className="py-3 px-3 align-middle text-center font-semibold text-[#059669]">
                            {yr.rate7_0Plus}%
                          </td>
                          <td className="py-3 px-3 align-middle text-center font-semibold text-[#00736E]">
                            {yr.rate8_0Plus}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="text-xs font-extrabold text-slate-800 mb-2">
                  Band trung bình từng kỹ năng (Listening • Reading • Writing • Speaking)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ieltsAnalytics.skillAverages.map((sk: any) => (
                    <div
                      key={sk.code}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                    >
                      <div className="text-[11px] font-bold text-slate-500">{sk.code}</div>
                      <div className="text-lg font-black text-slate-900 mt-0.5">
                        {sk.avgBand !== null ? sk.avgBand : 'Chưa có'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sk.denominator > 0
                          ? `Mẫu số: ${sk.denominator} bản ghi đủ 4 KN`
                          : 'Bản ghi lịch sử chỉ có Overall'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DASHBOARD D: PEARSON EDEXCEL (iPRIMARY & iLOWERSECONDARY)
         ===================================================================== */}
      {selectedDashboardTab === 'PEARSON_EDEXCEL' && (
        <div className="space-y-4">
          <div className="bg-[#003B3A] rounded-2xl p-5 text-white shadow-xs">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/15 text-teal-100 text-xs font-semibold mb-1.5">
              <Layers className="w-3.5 h-3.5 text-[#5EEAD4]" />
              Pearson Edexcel International Primary & Lower Secondary
            </div>
            <h2 className="text-lg font-black tracking-tight">
              Phân tích chuyên biệt: Pearson Edexcel (Theo từng môn Mathematics & Science)
            </h2>
            <p className="text-xs text-teal-100/90 mt-1 max-w-4xl">
              Cấu trúc đánh giá độc lập theo từng môn học (Mathematics, Science) và giữ nguyên mức đạt chuẩn gốc (P1/P2/P3 cho iPrimary; S1/S2/S3/S4 cho iLowerSecondary).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { title: 'Pearson Edexcel iPrimary (Mức P1 / P2 / P3)', data: pearsonAnalytics.iPrimary },
              { title: 'Pearson Edexcel iLowerSecondary (Mức S1 / S2 / S3 / S4)', data: pearsonAnalytics.iLowerSecondary },
            ].map((block) => (
              <div
                key={block.title}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{block.title}</h3>
                    <p className="text-xs text-slate-500">
                      Số học sinh dự thi: {block.data.totalStudentsSitting} HS
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {block.data.subjects.map((sub: any) => (
                    <div
                      key={sub.subjectCode}
                      className="rounded-xl border border-[#E2E8F0] p-4 bg-[#F8FAFC] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#003B3A]">
                          {sub.subjectName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#00736E] text-[11px] font-bold">
                          {sub.entriesCount} bài thi
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-[11px] text-slate-500">Điểm TB môn chính thức</div>
                          <div className="text-2xl font-black text-slate-900">{sub.avgScore}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-[#059669] font-semibold">
                            Mức cao (P3 / S3–S4)
                          </div>
                          <div className="text-lg font-extrabold text-[#059669]">
                            {sub.highRate}% ({sub.highCount})
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                        {sub.levelDistribution.map((lv: any) => (
                          <div key={lv.level} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-bold text-slate-700">Mức {lv.level}</span>
                              <span className="font-extrabold text-slate-900">
                                {lv.count} ({lv.rate}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#003B3A] rounded-full"
                                style={{ width: `${Math.max(lv.rate, lv.count > 0 ? 5 : 0)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Multi-year comparison for Pearson */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">
              Theo dõi thay đổi kết quả Pearson Mathematics & Science giữa các năm học
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Khoảng điểm quy đổi P1/P2/P3 của Pearson Edexcel có thể dịch chuyển nhẹ theo độ khó từng đợt thi (Grade Boundaries từng năm).
            </p>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                  <tr className="text-left text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-white">Năm học</th>
                    <th className="py-3 px-3 text-center text-teal-100">Tổng HS dự thi</th>
                    <th className="py-3 px-3 text-center text-teal-100">Số bài thi Mathematics</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Điểm TB Mathematics</th>
                    <th className="py-3 px-3 text-center text-teal-100">Số bài thi Science</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Điểm TB Science</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {pearsonAnalytics.byAcademicYear.map((yr: any) => (
                    <tr key={yr.academicYear} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 align-middle font-extrabold text-slate-900">{yr.academicYear}</td>
                      <td className="py-3 px-3 align-middle text-center font-bold">{yr.sittings}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.mathEntries}</td>
                      <td className="py-3 px-3 align-middle text-center font-black text-[#003B3A]">
                        {yr.avgMath ?? '-'}
                      </td>
                      <td className="py-3 px-3 align-middle text-center">{yr.sciEntries}</td>
                      <td className="py-3 px-3 align-middle text-center font-black text-[#003B3A]">
                        {yr.avgScience ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DASHBOARD E: CAMBRIDGE PRIMARY & LOWER SECONDARY CHECKPOINT
         ===================================================================== */}
      {selectedDashboardTab === 'CAMBRIDGE_CHECKPOINT' && (
        <div className="space-y-4">
          <div className="bg-[#003B3A] rounded-2xl p-5 text-white shadow-xs">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/15 text-teal-100 text-xs font-semibold mb-1.5">
              <Target className="w-3.5 h-3.5 text-[#5EEAD4]" />
              Cambridge Primary & Lower Secondary Checkpoint • Thang 0–50
            </div>
            <h2 className="text-lg font-black tracking-tight">
              Phân tích chuyên biệt: Cambridge Checkpoint (ESL • Mathematics • Science)
            </h2>
            <p className="text-xs text-teal-100/90 mt-1 max-w-4xl">
              Quy chuẩn điểm 0–50 chính thức của CAIE: 0 Unclassified • 1–10 Basic • 11–20 Aspiring • 21–30 Good • 31–40 High • 41–50 Outstanding. Phân tích độc lập từng môn học.
            </p>
          </div>

          {checkpointAnalytics.lowestPerformingSubjectAlert && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <span className="font-extrabold">
                  Nhận diện chuyên môn cần hỗ trợ: Môn {checkpointAnalytics.lowestPerformingSubjectAlert.subjectName}
                </span>{' '}
                hiện có điểm trung bình thấp nhất trong 3 môn ({checkpointAnalytics.lowestPerformingSubjectAlert.avgScore}/50, tỷ lệ High/Outstanding đạt {checkpointAnalytics.lowestPerformingSubjectAlert.highOutstandingRate}%, có {checkpointAnalytics.lowestPerformingSubjectAlert.lowCount} lượt học sinh ở mức Basic/Aspiring).
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {checkpointAnalytics.subjects.map((sub: any) => (
              <div
                key={sub.subjectCode}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-[#008B85]">
                        Môn thi độc lập
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-0.5">{sub.subjectName}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                      {sub.entriesCount} kết quả
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="text-[11px] text-slate-600 font-semibold">
                        Điểm TB (Thang 0–50)
                      </div>
                      <div className="text-2xl font-black text-[#003B3A] mt-0.5">
                        {sub.avgScore} <span className="text-xs font-normal text-slate-500">/ 50</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <div className="text-[11px] text-[#059669] font-semibold">
                        High + Outstanding
                      </div>
                      <div className="text-2xl font-black text-[#059669] mt-0.5">
                        {sub.highOutstandingRate}%
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        {sub.highOutstandingCount}/{sub.entriesCount} HS (31–50đ)
                      </div>
                    </div>
                  </div>

                  {/* 6 Performance Bands */}
                  <div className="space-y-2">
                    <div className="text-xs font-extrabold text-slate-800">
                      Phân bố 6 mức Performance Band
                    </div>
                    {sub.bandDistribution.map((b: any) => (
                      <div key={b.code} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">{b.label}</span>
                          <span className="font-bold text-slate-900">
                            {b.count} ({b.rate}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(b.rate, b.count > 0 ? 5 : 0)}%`,
                              backgroundColor: b.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Low performing students alert */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-extrabold text-[#E11D48] mb-1.5">
                    Học sinh mức Basic / Aspiring (≤20đ) cần hỗ trợ ({sub.lowPerformingStudents.length}):
                  </div>
                  {sub.lowPerformingStudents.length === 0 ? (
                    <div className="text-[11px] text-[#059669] font-medium">
                      100% học sinh đạt từ mức Good (≥21đ) trở lên.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {sub.lowPerformingStudents.map((st: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] bg-rose-50 px-2.5 py-1 rounded-lg text-rose-900"
                        >
                          <span className="font-bold">{st.studentName}</span>
                          <span>
                            Lớp {st.className} • <strong>{st.score}/50</strong> ({st.band})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          DASHBOARD 6: MULTI-CAMPUS & LONGITUDINAL MATRIX
         ===================================================================== */}
      {selectedDashboardTab === 'OVERVIEW_COMPARE' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900">
              Bảng đối sánh chất lượng khảo thí quốc tế giữa các cơ sở (CS1 – CS5)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Mọi tỷ lệ đều tính trên mẫu số lượt thi hoàn thành của từng loại kỳ thi tương ứng.
            </p>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                  <tr className="text-left text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-white">Cơ sở</th>
                    <th className="py-3 px-3 text-center text-teal-100">Tổng lượt thi</th>
                    <th className="py-3 px-3 text-center text-teal-100">YLE (S/M/F)</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Tỷ lệ 15 khiên YLE</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">KET (Đạt A2+)</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">PET (Đạt B1+)</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">IELTS (Band TB)</th>
                    <th className="py-3 px-3 text-center text-teal-100">Pearson</th>
                    <th className="py-3 px-3 text-center text-teal-100">Checkpoint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {comparativeReports.campusMatrix.map((row: any) => (
                    <tr key={row.campusCode} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 align-middle font-extrabold text-slate-900">{row.campusCode}</td>
                      <td className="py-3 px-3 align-middle text-center font-bold">{row.totalSittings}</td>
                      <td className="py-3 px-3 align-middle text-center">{row.yleCount}</td>
                      <td className="py-3 px-3 align-middle text-center font-bold text-[#00736E]">
                        {row.yle15Rate !== null ? `${row.yle15Rate}%` : '-'}
                      </td>
                      <td className="py-3 px-3 align-middle text-center font-bold text-blue-700">
                        {row.ketCount > 0 ? `${row.ketCount} (${row.ketTargetRate}%)` : '-'}
                      </td>
                      <td className="py-3 px-3 align-middle text-center font-bold text-[#00736E]">
                        {row.petCount > 0 ? `${row.petCount} (${row.petTargetRate}%)` : '-'}
                      </td>
                      <td className="py-3 px-3 align-middle text-center font-bold text-[#003B3A]">
                        {row.ieltsCount > 0 ? `${row.ieltsCount} (TB ${row.ieltsAvgBand})` : '-'}
                      </td>
                      <td className="py-3 px-3 align-middle text-center">{row.pearsonCount || '-'}</td>
                      <td className="py-3 px-3 align-middle text-center">{row.checkpointCount || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900">
              Ma trận quy mô kết quả khảo thí quốc tế qua các năm học
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Tổng hợp số lượt kết quả lưu trữ theo từng bài thi từ năm học 2022–2023 đến 2026–2027
            </p>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                  <tr className="text-left text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-white">Năm học</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Tổng cộng</th>
                    <th className="py-3 px-3 text-center text-teal-100">Starters</th>
                    <th className="py-3 px-3 text-center text-teal-100">Movers</th>
                    <th className="py-3 px-3 text-center text-teal-100">Flyers</th>
                    <th className="py-3 px-3 text-center text-teal-100">KET</th>
                    <th className="py-3 px-3 text-center text-teal-100">PET</th>
                    <th className="py-3 px-3 text-center text-teal-100">IELTS</th>
                    <th className="py-3 px-3 text-center text-teal-100">Pearson</th>
                    <th className="py-3 px-3 text-center text-teal-100">Checkpoint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {comparativeReports.yearlyMatrix.map((yr: any) => (
                    <tr key={yr.academicYear} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 align-middle font-extrabold text-slate-900">{yr.academicYear}</td>
                      <td className="py-3 px-3 align-middle text-center font-black text-[#003B3A]">{yr.totalSittings}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.starters || '-'}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.movers || '-'}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.flyers || '-'}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.ket || '-'}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.pet || '-'}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.ielts || '-'}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.pearson || '-'}</td>
                      <td className="py-3 px-3 align-middle text-center">{yr.checkpoint || '-'}</td>
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
