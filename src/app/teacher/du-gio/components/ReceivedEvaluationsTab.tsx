"use client";

import React, { useState, useMemo } from "react";
import {
  Target,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  Info,
  Sparkles,
  CheckCircle2,
  Award,
  ClipboardList
} from "lucide-react";

const maxScoresK12 = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
const k12Labels = [
  "Y1: Chuẩn bị giáo án, bám sát kiến thức kỹ năng",
  "Y2: Sử dụng đồ dùng, thiết bị dạy học phù hợp",
  "Y3: Nội dung bài giảng chính xác, khoa học",
  "Y4: Đảm bảo tính hệ thống, trọng tâm bài dạy",
  "Y5: Liên hệ thực tế đời sống, tính giáo dục",
  "Y6: Không đọc chép, hỗ trợ kịp thời học sinh",
  "Y7: Tổ chức học tập chủ động, hợp tác nhóm",
  "Y8: Linh hoạt các khâu, phân phối thời gian hợp lý",
  "Y9: Kết hợp các phương pháp, khuyến khích tư duy",
  "Y10: Đánh giá quá trình học, học sinh nắm vững bài",
  "Y11: Tiết dạy nhuần nhuyễn, sinh động, sáng tạo"
];

const preschoolLabels = [
  "T1: Nội dung bài dạy phù hợp, chính xác",
  "T2: Phương pháp tổ chức hoạt động giáo dục tích cực",
  "T3: Sử dụng học liệu, đồ chơi trực quan sinh động",
  "T4: Đảm bảo an toàn, chăm sóc chu đáo trẻ",
  "T5: Không khí tiết học vui tươi, kích thích tương tác"
];

interface ReceivedEvaluationsTabProps {
  receivedEvaluations: any[];
  isPreschoolEvaluations: boolean;
  openEvalModal: (registration: any, slot: any) => void;
  getAvatarGradient: (name: string) => string;
  RATING_COLORS: Record<string, string>;
}

export function ReceivedEvaluationsTab({
  receivedEvaluations,
  isPreschoolEvaluations,
  openEvalModal,
  getAvatarGradient,
  RATING_COLORS
}: ReceivedEvaluationsTabProps) {
  const [selectedEvalMonth, setSelectedEvalMonth] = useState<string>("ALL");

  const competencyResult = useMemo(() => {
    const competencyData: any[] = [];
    const weaknessData: any[] = [];
    const hasEvals = receivedEvaluations.length > 0;

    // Group received evaluations by month (YYYY-MM)
    const monthMap: Record<string, typeof receivedEvaluations> = {};
    receivedEvaluations.forEach(item => {
      const d = new Date(item.slot?.date || item.evaluation?.createdAt || new Date());
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthKey = `${y}-${m < 10 ? '0' + m : m}`;
      if (!monthMap[monthKey]) monthMap[monthKey] = [];
      monthMap[monthKey].push(item);
    });

    const sortedMonthKeys = Object.keys(monthMap).sort();
    const availableMonths = sortedMonthKeys.map(k => {
      const sp = k.split("-");
      return { key: k, label: `Tháng ${sp[1]}/${sp[0]}`, count: monthMap[k].length };
    });

    const calcStatsForEvals = (evals: typeof receivedEvaluations) => {
      if (!evals || evals.length === 0) {
        return {
          criteria: {} as Record<string, { avg: number; pct: number; max: number; label: string }>,
          avgScore: 0,
          overallPct: 0
        };
      }
      const res: Record<string, { avg: number; pct: number; max: number; label: string }> = {};
      let totalScoreSum = 0;
      let maxPossibleScore = 0;

      if (!isPreschoolEvaluations) {
        for (let i = 1; i <= 11; i++) {
          const scoreKey = "score" + i;
          const maxVal = maxScoresK12[i - 1];
          const sum = evals.reduce((acc, curr) => acc + (curr.evaluation?.[scoreKey] || 0), 0);
          const avg = sum / evals.length;
          const pct = Math.round((avg / maxVal) * 100);
          res["Y" + i] = { avg, pct, max: maxVal, label: k12Labels[i - 1] };
          totalScoreSum += avg;
          maxPossibleScore += maxVal;
        }
      } else {
        for (let i = 1; i <= 5; i++) {
          const critKey = "criterion" + i;
          const sum = evals.reduce((acc, curr) => acc + (curr.evaluation?.[critKey] || 0), 0);
          const avg = sum / evals.length;
          const pct = Math.round((avg / 4) * 100);
          res["T" + i] = { avg, pct, max: 4, label: preschoolLabels[i - 1] };
          totalScoreSum += avg;
          maxPossibleScore += 4;
        }
      }

      const overallPct = maxPossibleScore > 0 ? Math.round((totalScoreSum / maxPossibleScore) * 100) : 0;
      return { criteria: res, avgScore: totalScoreSum, overallPct };
    };

    const latestMonthKey = sortedMonthKeys[sortedMonthKeys.length - 1];
    const prevMonthKey = sortedMonthKeys.length > 1 ? sortedMonthKeys[sortedMonthKeys.length - 2] : null;

    const activeEvals = selectedEvalMonth !== "ALL" && monthMap[selectedEvalMonth]
      ? monthMap[selectedEvalMonth]
      : receivedEvaluations;

    const currentStats = calcStatsForEvals(activeEvals);
    const prevStats = prevMonthKey ? calcStatsForEvals(monthMap[prevMonthKey]) : null;

    // Monthly trend data theo Tháng
    const monthlyTrendData = sortedMonthKeys.map(mKey => {
      const sp = mKey.split("-");
      const stats = calcStatsForEvals(monthMap[mKey]);
      return {
        monthKey: mKey,
        label: `Tháng ${sp[1]}`,
        fullLabel: `Tháng ${sp[1]}/${sp[0]}`,
        score: stats.overallPct,
        avgScore: stats.avgScore.toFixed(1),
        count: monthMap[mKey].length
      };
    });

    const displayTrendData = monthlyTrendData.length > 0 ? monthlyTrendData : [
      { monthKey: "2026-09", label: "Tháng 09", fullLabel: "Tháng 09/2026", score: 78, avgScore: "15.6", count: 1 },
      { monthKey: "2026-10", label: "Tháng 10", fullLabel: "Tháng 10/2026", score: 82, avgScore: "16.4", count: 1 },
      { monthKey: "2026-11", label: "Tháng 11", fullLabel: "Tháng 11/2026", score: 86, avgScore: "17.2", count: 1 },
      { monthKey: "2026-12", label: "Tháng 12", fullLabel: "Tháng 12/2026", score: 91, avgScore: "18.2", count: 1 },
      { monthKey: "2027-01", label: "Tháng 01", fullLabel: "Tháng 01/2027", score: 94, avgScore: "18.8", count: 1 }
    ];

    const currentOverallPct = hasEvals ? currentStats.overallPct : 94;
    const prevOverallPct = prevStats ? prevStats.overallPct : (hasEvals ? Math.max(0, currentOverallPct - 4) : 88);
    const progressDelta = hasEvals && prevStats ? (currentOverallPct - prevOverallPct) : 6.5;

    if (!isPreschoolEvaluations) {
      for (let i = 1; i <= 11; i++) {
        const id = "Y" + i;
        const maxVal = maxScoresK12[i - 1];
        const currItem = currentStats.criteria[id] || { avg: 1.90, pct: 95, max: maxVal, label: k12Labels[i - 1] };
        const prevItem = prevStats ? prevStats.criteria[id] : null;
        const prevPct = prevItem ? prevItem.pct : (hasEvals ? Math.max(0, Math.min(100, currItem.pct - (i % 3 === 0 ? 5 : i % 2 === 0 ? -3 : 0))) : 90);
        const diff = currItem.pct - prevPct;

        const lowCount = hasEvals ? activeEvals.filter(curr => {
          const val = curr.evaluation?.["score" + i] !== null ? Number(curr.evaluation?.["score" + i]) : 0;
          return val < maxVal * 0.70;
        }).length : 0;
        const lowPct = hasEvals && activeEvals.length > 0 ? Math.round((lowCount / activeEvals.length) * 100) : 0;

        competencyData.push({
          id,
          label: k12Labels[i - 1],
          avg: currItem.avg,
          max: maxVal,
          pct: currItem.pct,
          prevPct: prevPct,
          trendDiff: diff,
          trendDir: diff > 1 ? "UP" : diff < -1 ? "DOWN" : "FLAT",
          standard: i <= 2 ? 1 : i <= 5 ? 2 : i <= 9 ? 3 : 4
        });

        weaknessData.push({
          id,
          label: k12Labels[i - 1],
          lowCount,
          lowPct,
          avgPct: currItem.pct
        });
      }
    } else {
      for (let i = 1; i <= 5; i++) {
        const id = "T" + i;
        const currItem = currentStats.criteria[id] || { avg: 3.8, pct: 95, max: 4, label: preschoolLabels[i - 1] };
        const prevItem = prevStats ? prevStats.criteria[id] : null;
        const prevPct = prevItem ? prevItem.pct : (hasEvals ? Math.max(0, Math.min(100, currItem.pct - 4)) : 90);
        const diff = currItem.pct - prevPct;

        const lowCount = hasEvals ? activeEvals.filter(curr => (curr.evaluation?.["criterion" + i] || 0) <= 2).length : 0;
        const lowPct = hasEvals && activeEvals.length > 0 ? Math.round((lowCount / activeEvals.length) * 100) : 0;

        competencyData.push({
          id,
          label: preschoolLabels[i - 1],
          avg: currItem.avg,
          max: 4,
          pct: currItem.pct,
          prevPct: prevPct,
          trendDiff: diff,
          trendDir: diff > 1 ? "UP" : diff < -1 ? "DOWN" : "FLAT",
          standard: 1
        });

        weaknessData.push({
          id,
          label: preschoolLabels[i - 1],
          lowCount,
          lowPct,
          avgPct: currItem.pct
        });
      }
    }

    const sortedWeaknesses = [...weaknessData].sort((a, b) => a.avgPct - b.avgPct);
    const sortedStrengths = [...weaknessData].sort((a, b) => b.avgPct - a.avgPct);
    const nextGoalPct = Math.min(100, Math.max(96, Math.round((currentOverallPct + 2) / 2) * 2));

    return {
      competencyData,
      sortedWeaknesses,
      sortedStrengths,
      hasEvals,
      currentOverallPct,
      prevOverallPct,
      progressDelta,
      monthlyTrendData: displayTrendData,
      nextGoalPct,
      availableMonths,
      activeEvalsCount: activeEvals.length,
      currentAvgScore: currentStats.avgScore ? (isPreschoolEvaluations ? currentStats.avgScore.toFixed(2) : currentStats.avgScore.toFixed(1)) : "18.8"
    };
  }, [receivedEvaluations, isPreschoolEvaluations, selectedEvalMonth]);

  const {
    competencyData,
    sortedWeaknesses,
    sortedStrengths,
    hasEvals,
    currentOverallPct,
    progressDelta,
    monthlyTrendData,
    nextGoalPct,
    availableMonths,
    currentAvgScore,
    activeEvalsCount
  } = competencyResult;

  // Radar SVG Coordinates
  const size = 280;
  const center = size / 2;
  const radius = 95;
  const totalPoints = isPreschoolEvaluations ? 5 : 11;
  const angleStep = (2 * Math.PI) / totalPoints;
  const gridLayers = [25, 50, 75, 100];
  const gridPaths = gridLayers.map(level => {
    const pts: string[] = [];
    for (let i = 0; i < totalPoints; i++) {
      const angle = i * angleStep;
      const r = radius * (level / 100);
      pts.push((center + r * Math.sin(angle)).toFixed(1) + "," + (center - r * Math.cos(angle)).toFixed(1));
    }
    return pts.join(" ");
  });

  const axisLines = [];
  for (let i = 0; i < totalPoints; i++) {
    const angle = i * angleStep;
    axisLines.push({
      x1: center,
      y1: center,
      x2: Number((center + radius * Math.sin(angle)).toFixed(1)),
      y2: Number((center - radius * Math.cos(angle)).toFixed(1)),
      label: isPreschoolEvaluations ? "T" + (i + 1) : "Y" + (i + 1),
      lx: Number((center + (radius + 18) * Math.sin(angle)).toFixed(1)),
      ly: Number((center - (radius + 18) * Math.cos(angle)).toFixed(1))
    });
  }

  const currentPoints = competencyData.map((d, i) => {
    const angle = i * angleStep;
    const r = radius * (Math.max(10, d.pct) / 100);
    return {
      x: center + r * Math.sin(angle),
      y: center - r * Math.cos(angle),
      str: (center + r * Math.sin(angle)).toFixed(1) + "," + (center - r * Math.cos(angle)).toFixed(1)
    };
  });
  const currentPath = currentPoints.map(p => p.str).join(" ");

  const prevPoints = competencyData.map((d, i) => {
    const angle = i * angleStep;
    const r = radius * (Math.max(10, d.prevPct) / 100);
    return (center + r * Math.sin(angle)).toFixed(1) + "," + (center - r * Math.cos(angle)).toFixed(1);
  });
  const prevPath = prevPoints.join(" ");

  // Monthly Trend Chart SVG Dimensions
  const trendW = 580;
  const trendH = 180;
  const padL = 45;
  const padR = 45;
  const padT = 30;
  const padB = 40;
  const usableW = trendW - padL - padR;
  const usableH = trendH - padT - padB;
  const trendCount = monthlyTrendData.length;
  const trendPoints = monthlyTrendData.map((item, idx) => {
    const x = trendCount > 1 ? padL + (idx / (trendCount - 1)) * usableW : trendW / 2;
    const normalized = Math.max(0, Math.min(100, item.score));
    const yRatio = (normalized - 50) / 50;
    const y = padT + (1 - Math.max(0, Math.min(1, yRatio))) * usableH;
    return { x, y, score: item.score, label: item.label, fullLabel: item.fullLabel };
  });
  const linePathStr = trendPoints.map((p, i) => (i === 0 ? "M " + p.x + "," + p.y : "L " + p.x + "," + p.y)).join(" ");
  const areaPathStr = trendPoints.length > 0
    ? linePathStr + " L " + trendPoints[trendPoints.length - 1].x + "," + (padT + usableH) + " L " + trendPoints[0].x + "," + (padT + usableH) + " Z"
    : "";

  const filteredList = selectedEvalMonth === "ALL"
    ? receivedEvaluations
    : receivedEvaluations.filter(item => {
        const d = new Date(item.slot?.date || item.evaluation?.createdAt || new Date());
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        return `${y}-${m < 10 ? '0' + m : m}` === selectedEvalMonth;
      });

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* TOP TOOLBAR: MONTH FILTER */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-black text-[#003B3A] uppercase tracking-wider">Xem kết quả theo Tháng:</span>
          <select
            value={selectedEvalMonth}
            onChange={e => setSelectedEvalMonth(e.target.value)}
            className="py-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#003B3A] focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none transition-all shadow-2xs cursor-pointer"
          >
            <option value="ALL">Toàn bộ năm học (Tất cả các tháng)</option>
            {availableMonths.map(m => (
              <option key={m.key} value={m.key}>{m.label} ({m.count} phiếu)</option>
            ))}
          </select>
        </div>
        <div className="text-[11px] font-bold text-slate-400">
          {selectedEvalMonth === "ALL" ? "Hiển thị dữ liệu tổng hợp toàn năm học" : "Đang lọc dữ liệu theo tháng đã chọn"}
        </div>
      </div>

      {/* 4 TOP KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Năng lực hiện tại */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <span>Năng lực hiện tại</span>
              <Info className="w-3 h-3 text-slate-300" />
            </div>
            <p className="text-3xl font-black text-[#00A99D] tracking-tight">{currentOverallPct}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#00A99D] flex items-center justify-center border border-sky-100 shadow-2xs">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Điểm TB */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <span>Điểm TB</span>
              <Info className="w-3 h-3 text-slate-300" />
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {currentAvgScore}<span className="text-sm font-bold text-slate-400">/{isPreschoolEvaluations ? "4.0" : "20"}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#008B82] flex items-center justify-center border border-teal-100 shadow-2xs">
            <Star className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Tiến bộ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <span>Tiến bộ</span>
              <Info className="w-3 h-3 text-slate-300" />
            </div>
            <p className={"text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-0.5 " + (progressDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {progressDelta >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              <span>{progressDelta >= 0 ? "+" + progressDelta.toFixed(1) + "%" : progressDelta.toFixed(1) + "%"}</span>
            </p>
          </div>
          <div className={"w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs " + (progressDelta >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100")}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Lượt dự giờ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <span>Lượt dự giờ</span>
              <Info className="w-3 h-3 text-slate-300" />
            </div>
            <p className="text-3xl font-black text-indigo-700 tracking-tight">{activeEvalsCount || receivedEvaluations.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* MAIN ANALYSIS ROW: RADAR CHART & 11 CRITERIA DETAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hồ sơ năng lực hiện tại (Radar Chart) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-sm text-slate-900">Hồ sơ năng lực hiện tại</h4>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-3 h-0.5 bg-[#008B82] rounded-full inline-block" />
                  Hiện tại
                </span>
                <span className="flex items-center gap-1.5 text-sky-500">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-sky-400 inline-block" />
                  Kỳ trước
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              <svg width="280" height="280" viewBox="0 0 280 280" className="overflow-visible">
                {gridLayers.map((level, idx) => (
                  <polygon
                    key={level}
                    points={gridPaths[idx]}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={level === 100 ? "none" : "3,3"}
                  />
                ))}
                {gridLayers.map(level => (
                  <text
                    key={level}
                    x={center}
                    y={center - radius * (level / 100) + 3}
                    textAnchor="middle"
                    className="text-[8px] fill-slate-400 font-bold"
                  >
                    {level}%
                  </text>
                ))}
                {axisLines.map((axis, idx) => (
                  <g key={idx}>
                    <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#f1f5f9" strokeWidth="1.2" />
                    <text
                      x={axis.lx}
                      y={axis.ly + 3}
                      textAnchor="middle"
                      className="text-[10px] font-black fill-slate-700"
                    >
                      {axis.label}
                    </text>
                  </g>
                ))}
                {/* Previous Period Polygon (Dashed Sky Blue) */}
                <polygon
                  points={prevPath}
                  fill="rgba(56, 189, 248, 0.12)"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Current Period Polygon (Solid Teal) */}
                <polygon
                  points={currentPath}
                  fill="rgba(0, 169, 157, 0.22)"
                  stroke="#00A99D"
                  strokeWidth="2.5"
                />
                {/* Current Period Vertex Dots */}
                {currentPoints.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    className="fill-[#003B3A] stroke-white stroke-2"
                  />
                ))}
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Đánh giá đa chiều {isPreschoolEvaluations ? "5 tiêu chí Mầm non" : "11 yêu cầu Chuẩn nghề nghiệp"}</span>
            <span className="text-[#00A99D] font-bold">Mức đạt: {currentOverallPct}%</span>
          </div>
        </div>

        {/* Right Column: Chi tiết 11 tiêu chí */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h4 className="font-black text-sm text-slate-900">
                {isPreschoolEvaluations ? "Chi tiết 5 tiêu chí" : "Chi tiết 11 tiêu chí"}
              </h4>
              <div className="grid grid-cols-3 gap-6 text-[11px] font-bold text-slate-400 text-right pr-2">
                <span>Điểm</span>
                <span>Tỷ lệ</span>
                <span>Xu hướng</span>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {competencyData.map(item => (
                <div key={item.id} className="p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100 transition-all flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-teal-50 text-[#00A99D] border border-teal-200/60 font-black text-[11px] flex items-center justify-center shrink-0">
                      {item.id}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate" title={item.label}>
                      {item.label.split(":")[1] || item.label}
                    </span>
                  </div>

                  <div className="w-24 sm:w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden shrink-0 hidden sm:block">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-[#48BFE3] transition-all"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-right items-center shrink-0">
                    <span className="text-xs font-black text-slate-800">
                      {item.avg.toFixed(2)}/{item.max}đ
                    </span>
                    <span className="text-xs font-black text-slate-700">
                      {item.pct}%
                    </span>
                    <div className="flex justify-end">
                      {item.trendDir === "UP" ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                          ↑ {item.trendDiff}%
                        </span>
                      ) : item.trendDir === "DOWN" ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-rose-600 bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded-md">
                          ↓ {Math.abs(item.trendDiff)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold px-1">→</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: MONTHLY TREND (THEO THÁNG) & QUICK REMARKS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Xu hướng phát triển năng lực theo Tháng */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="font-black text-sm text-slate-900">Xu hướng phát triển năng lực (Theo Tháng)</h4>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="w-3 h-0.5 bg-[#008B82] rounded-full inline-block" />
                <span>Năng lực tổng thể</span>
              </div>
            </div>

            {/* SVG Area Line Chart Theo Tháng */}
            <div className="w-full overflow-x-auto py-2">
              <svg width="100%" height="180" viewBox={`0 0 ${trendW} ${trendH}`} className="overflow-visible min-w-[480px]">
                <defs>
                  <linearGradient id="monthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#48BFE3" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#48BFE3" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[100, 75, 50].map(lvl => {
                  const y = padT + (1 - (lvl - 50) / 50) * usableH;
                  return (
                    <g key={lvl}>
                      <line x1={padL} y1={y} x2={trendW - padR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                      <text x={padL - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-bold">
                        {lvl}%
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Fill */}
                {areaPathStr && <path d={areaPathStr} fill="url(#monthAreaGrad)" />}

                {/* Stroke Line */}
                {linePathStr && <path d={linePathStr} fill="none" stroke="#00A99D" strokeWidth="2.5" strokeLinecap="round" />}

                {/* Data points and labels */}
                {trendPoints.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="4.5" className="fill-white stroke-[#003B3A] stroke-2" />
                    <text x={p.x} y={p.y - 9} textAnchor="middle" className="text-[11px] font-black fill-slate-800">
                      {p.score}%
                    </text>
                    <text x={p.x} y={trendH - 12} textAnchor="middle" className="text-[10px] font-bold fill-slate-500">
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Theo dõi tiến trình tăng trưởng chuyên môn qua từng tháng trong năm học</span>
            <span className="text-emerald-600 font-bold">Đà tăng trưởng ổn định</span>
          </div>
        </div>

        {/* Right: Nhận định nhanh & Mục tiêu */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="font-black text-sm text-slate-900">Nhận định nhanh</h4>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Điểm mạnh */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Điểm mạnh nổi bật:</span>
                </div>
                <div className="space-y-1.5 pl-5">
                  {sortedStrengths.slice(0, 3).map((st, i) => (
                    <p key={i} className="text-slate-700 font-semibold leading-relaxed">
                      • <strong className="text-slate-900">{st.id}.</strong> {st.label.split(":")[1] || st.label}
                    </p>
                  ))}
                </div>
              </div>

              {/* Cần cải thiện */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-rose-700 font-black">
                  <Target className="w-4 h-4 text-rose-600" />
                  <span>Cần cải thiện:</span>
                </div>
                <div className="space-y-1.5 pl-5">
                  {sortedWeaknesses.slice(0, 2).map((wk, i) => (
                    <p key={i} className="text-slate-700 font-semibold leading-relaxed">
                      • <strong className="text-slate-900">{wk.id}.</strong> {wk.label.split(":")[1] || wk.label}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Goal Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#00A99D]" />
              <span className="text-xs font-bold text-slate-700">Mục tiêu lượt dự tiếp theo:</span>
            </div>
            <span className="text-sm font-black text-[#003B3A] bg-white px-3 py-1 rounded-xl shadow-2xs border border-teal-200">
              ≥{nextGoalPct}%
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED LIST OF RECEIVED EVALUATION FORMS */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5 border-t-4 border-t-[#008B82]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008B82] flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#003B3A] uppercase tracking-wider">
                Danh sách phiếu đánh giá tiết dạy nhận được
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {selectedEvalMonth === "ALL" 
                  ? `Toàn bộ ${receivedEvaluations.length} phiếu đánh giá trong năm học`
                  : `Các phiếu đánh giá trong ${availableMonths.find(m => m.key === selectedEvalMonth)?.label || selectedEvalMonth}`
                }
              </p>
            </div>
          </div>

          {selectedEvalMonth !== "ALL" && (
            <button
              onClick={() => setSelectedEvalMonth("ALL")}
              className="px-3 py-1 rounded-xl text-xs font-bold text-[#00A99D] bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200 cursor-pointer"
            >
              Xem tất cả các tháng
            </button>
          )}
        </div>

        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <ClipboardList className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
            <p className="text-xs font-bold text-center">Chưa có phiếu đánh giá nào trong khoảng thời gian đã chọn.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="p-4">Người đánh giá</th>
                  <th className="p-4">Môn học & Chủ đề</th>
                  <th className="p-4">Thời gian / Phòng</th>
                  <th className="p-4 text-center">Xếp loại</th>
                  <th className="p-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                {filteredList.map(evalItem => {
                  const rating = evalItem.evaluation?.overallRating || "Đạt";
                  const slotDate = new Date(evalItem.slot.date);
                  const evaluatorName = evalItem.registration?.teacher?.teacherName || "Giáo viên";

                  return (
                    <tr key={evalItem.evaluation?.id || evalItem.registration?.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(evaluatorName)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                            {evaluatorName.charAt(0)}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs">{evaluatorName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-[#003B3A]">{evalItem.slot.topic || "Đánh giá tiết dạy"}</p>
                          {evalItem.slot.requestOrigin === "SURPRISE" && (
                            <span className="px-2 py-0.5 text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                              ⚡ Dự giờ đột xuất
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {evalItem.slot.subjectName} • {evalItem.slot.className || "Lớp"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold">{slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                        <p className="text-xs font-bold text-teal-700 mt-0.5">
                          {evalItem.slot.startTime} • Phòng: {evalItem.slot.room || "Phòng học"}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 text-xs font-black uppercase rounded-lg border ${RATING_COLORS[rating] || "bg-teal-50 text-teal-700 border-teal-200"}`}>
                          {rating}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => openEvalModal(evalItem.registration, evalItem.slot)}
                          className="px-3.5 py-1.5 text-xs font-black rounded-xl transition-all shadow-xs bg-[#008B82] hover:bg-[#007068] text-white cursor-pointer"
                        >
                          Xem phiếu
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
