// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SubjectCompetencyCard } from "./SubjectCompetencyCard";
import { CompetencyOverviewChart, getCompetencyLevel } from "./CompetencyOverviewChart";
import {
  Sparkles,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Filter,
  BarChart3,
  Layers,
  ArrowLeftRight,
  Printer,
  Compass,
} from "lucide-react";

interface StudentCompetencyPortfolioProps {
  studentId?: string;
  studentCode?: string;
  studentName?: string;
  initialAcademicYearId?: string;
  isReadOnly?: boolean;
}

export const StudentCompetencyPortfolio: React.FC<StudentCompetencyPortfolioProps> = ({
  studentId,
  studentCode,
  studentName,
  initialAcademicYearId,
  isReadOnly = false,
}) => {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>(initialAcademicYearId || "");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("CUOI_KY_1");
  const [comparePeriod, setComparePeriod] = useState<string>("NONE");

  const [summaries, setSummaries] = useState<any[]>([]);
  const [compareSummaries, setCompareSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync initialAcademicYearId when parent passes it
  useEffect(() => {
    if (initialAcademicYearId) {
      setSelectedYearId(initialAcademicYearId);
    }
  }, [initialAcademicYearId]);

  // Fetch academic years
  useEffect(() => {
    fetch("/api/admin/academic-years")
      .then((res) => res.json())
      .then((data) => {
        if (data.academicYears && data.academicYears.length > 0) {
          setAcademicYears(data.academicYears);
          if (!selectedYearId && !initialAcademicYearId) {
            const active = data.academicYears.find((y: any) => y.status === "ACTIVE") || data.academicYears[0];
            if (active) setSelectedYearId(active.id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch primary competency summaries for this student
  useEffect(() => {
    if (!studentId && !studentCode) return;

    setLoading(true);
    const query = new URLSearchParams();
    if (studentId) query.set("studentId", studentId);
    if (studentCode) query.set("studentCode", studentCode);
    if (selectedYearId) query.set("academicYearId", selectedYearId);
    if (selectedPeriod) query.set("assessmentPeriod", selectedPeriod);

    fetch("/api/admin/competency-assessment/summary?" + query.toString())
      .then((res) => res.json())
      .then((data) => {
        if (data.summaries) {
          setSummaries(data.summaries);
        } else {
          setSummaries([]);
        }
      })
      .catch((err) => {
        console.error("Fetch competency summary error:", err);
        setSummaries([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [studentId, studentCode, selectedYearId, selectedPeriod]);

  // Fetch comparison summaries when comparePeriod is selected
  useEffect(() => {
    if (!studentId && !studentCode || comparePeriod === "NONE") {
      setCompareSummaries([]);
      return;
    }

    const query = new URLSearchParams();
    if (studentId) query.set("studentId", studentId);
    if (studentCode) query.set("studentCode", studentCode);
    if (selectedYearId) query.set("academicYearId", selectedYearId);
    query.set("assessmentPeriod", comparePeriod);

    fetch("/api/admin/competency-assessment/summary?" + query.toString())
      .then((res) => res.json())
      .then((data) => {
        if (data.summaries) {
          setCompareSummaries(data.summaries);
        } else {
          setCompareSummaries([]);
        }
      })
      .catch(() => setCompareSummaries([]));
  }, [studentId, studentCode, selectedYearId, comparePeriod]);

  // Merge primary summaries with comparison data
  const enrichedSummaries = useMemo(() => {
    const compareMap = new Map();
    compareSummaries.forEach((c) => {
      compareMap.set(c.subjectId, c.subjectScore);
    });

    return summaries.map((s) => ({
      ...s,
      benchmarkScore: 75,
      previousScore: compareMap.has(s.subjectId) ? compareMap.get(s.subjectId) : null,
    }));
  }, [summaries, compareSummaries]);

  // Overall calculations across all subjects
  const validScores = summaries
    .map((s) => s.subjectScore)
    .filter((score) => score !== null && score !== undefined) as number[];

  const overallAvg =
    validScores.length > 0
      ? Math.round((validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length) * 10) / 10
      : null;

  const totalEvaluated = summaries.reduce((acc, s) => acc + (s.evaluatedCount || 0), 0);
  const totalRequired = summaries.reduce((acc, s) => acc + (s.totalCompetencies || 0), 0);
  const overallLevel = getCompetencyLevel(overallAvg);

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "GIUA_KY_1":
        return "Giữa Học kỳ I";
      case "CUOI_KY_1":
        return "Cuối Học kỳ I";
      case "GIUA_KY_2":
        return "Giữa Học kỳ II";
      case "CUOI_KY_2":
        return "Cuối Học kỳ II";
      case "CA_NAM":
        return "Tổng kết Cả năm";
      default:
        return period;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sleek, Modern Executive Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-teal-900 p-5 sm:p-6 rounded-3xl text-white shadow-lg border border-teal-800/40 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2 text-[11px] font-black text-teal-300 uppercase tracking-widest">
            <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hồ Sơ Năng Lực Học Sinh Chuyên Sâu (Competency 360° Portfolio)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Kết Quả Đánh Giá Năng Lực Toàn Diện
          </h3>
          <p className="text-xs text-teal-200/80 font-medium max-w-xl">
            Tổng quan bằng biểu đồ cột so sánh • Chuyên sâu bằng Radar đa lớp (Học sinh vs Chuẩn khối) • Đo lường chuẩn xác.
          </p>
        </div>

        {/* Filter Controls (Year, Period, and Comparison Period) */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20 relative z-10">
          <div className="flex items-center gap-1.5 pl-2 text-teal-200 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="bg-teal-950 border border-teal-600/60 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-teal-400"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id} className="text-slate-900">
                {y.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-teal-950 border border-teal-600/60 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-teal-400"
          >
            <option value="GIUA_KY_1" className="text-slate-900">Giữa Học kỳ I</option>
            <option value="CUOI_KY_1" className="text-slate-900">Cuối Học kỳ I</option>
            <option value="GIUA_KY_2" className="text-slate-900">Giữa Học kỳ II</option>
            <option value="CUOI_KY_2" className="text-slate-900">Cuối Học kỳ II</option>
            <option value="CA_NAM" className="text-slate-900">Tổng kết Cả năm</option>
          </select>

          {/* Comparison selector */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
            <ArrowLeftRight className="w-3.5 h-3.5 text-teal-300" />
            <select
              value={comparePeriod}
              onChange={(e) => setComparePeriod(e.target.value)}
              className="bg-teal-950 border border-teal-600/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-teal-200 focus:outline-hidden"
              title="So sánh với kỳ khác để xem tiến độ tăng/giảm"
            >
              <option value="NONE" className="text-slate-900">Không so sánh</option>
              <option value="GIUA_KY_1" className="text-slate-900">So với Giữa HK I</option>
              <option value="CUOI_KY_1" className="text-slate-900">So với Cuối HK I</option>
              <option value="GIUA_KY_2" className="text-slate-900">So với Giữa HK II</option>
              <option value="CUOI_KY_2" className="text-slate-900">So với Cuối HK II</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-teal-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#007A72] flex items-center justify-center font-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Điểm Bình Quân Tất Cả Môn
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800">
                {overallAvg !== null ? overallAvg + "%" : "Chưa có"}
              </span>
              {overallAvg !== null && (
                <span className={"text-[10px] font-black uppercase px-2 py-0.5 rounded-full border " + overallLevel.bg + " " + overallLevel.color + " " + overallLevel.border}>
                  {overallLevel.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-emerald-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Tiến Độ Đánh Giá Năng Lực
            </span>
            <span className="text-2xl font-black text-emerald-700">
              {totalEvaluated} <span className="text-sm font-bold text-slate-400">/ {totalRequired} năng lực</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-indigo-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Số Môn Đã Đánh Giá
            </span>
            <span className="text-2xl font-black text-indigo-900">
              {summaries.length} <span className="text-sm font-bold text-slate-400">môn học</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1. Executive Competency Overview Bar Chart */}
      {!loading && enrichedSummaries.length > 0 && (
        <div className="print:break-inside-avoid">
          <CompetencyOverviewChart
            summaries={enrichedSummaries}
            benchmarkScore={75}
            periodLabel={getPeriodLabel(selectedPeriod)}
          />
        </div>
      )}

      {/* 2. Deep-dive Subject Competency Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-600" />
            <span>Phân Tích Chi Tiết Từng Môn Học (Chuyên Sâu)</span>
          </h4>
          <span className="text-xs text-slate-400 font-bold">
            Hiển thị {enrichedSummaries.length} môn
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải dữ liệu đánh giá năng lực môn học...</span>
          </div>
        ) : enrichedSummaries.length === 0 ? (
          <div className="p-12 text-center space-y-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Chưa Có Dữ Liệu Đánh Giá Năng Lực</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Học sinh chưa có kết quả đánh giá năng lực cho đợt {getPeriodLabel(selectedPeriod)}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6 print:grid-cols-2">
            {enrichedSummaries.map((summary) => (
              <SubjectCompetencyCard
                key={summary.id || summary.subjectId}
                subjectName={summary.subject?.subjectName || "Môn học"}
                subjectCode={summary.subject?.subjectCode || "MON"}
                subjectScore={summary.subjectScore}
                evaluatedCount={summary.evaluatedCount}
                totalCompetencies={summary.totalCompetencies}
                radarData={summary.radarData || []}
                assessmentPeriodLabel={getPeriodLabel(summary.assessmentPeriod)}
                previousScore={summary.previousScore}
                benchmarkScore={summary.benchmarkScore || 75}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
