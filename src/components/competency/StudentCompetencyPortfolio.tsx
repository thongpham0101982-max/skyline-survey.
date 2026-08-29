// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Award,
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { SubjectCompetencyCard } from "./SubjectCompetencyCard";

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

  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch academic years
  useEffect(() => {
    fetch("/api/admin/academic-years")
      .then((res) => res.json())
      .then((data) => {
        if (data.academicYears) {
          setAcademicYears(data.academicYears);
          if (!selectedYearId) {
            const active = data.academicYears.find((y: any) => y.status === "ACTIVE") || data.academicYears[0];
            if (active) setSelectedYearId(active.id);
          }
        }
      })
      .catch(() => {});
  }, [selectedYearId]);

  // Fetch competency summaries for this student
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
      {/* Filters & Header Bar */}
      <div className="bg-gradient-to-r from-teal-900 via-[#003B3A] to-[#007A72] p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-black text-teal-300 uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>Hồ Sơ Năng Lực Học Sinh (Competency Portfolio)</span>
          </div>
          <h3 className="text-xl font-black tracking-tight">
            Kết Quả Đánh Giá Năng Lực Môn Học
          </h3>
          <p className="text-xs text-teal-100/80 font-medium">
            Phân tích đa chiều trên biểu đồ Radar theo từng môn học và chuẩn đầu ra.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white/10 p-2 rounded-2xl backdrop-blur-xs border border-white/20">
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="bg-teal-950/80 border border-teal-600/50 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-teal-400"
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
            className="bg-teal-950/80 border border-teal-600/50 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-teal-400"
          >
            <option value="GIUA_KY_1" className="text-slate-900">Giữa Học kỳ I</option>
            <option value="CUOI_KY_1" className="text-slate-900">Cuối Học kỳ I</option>
            <option value="GIUA_KY_2" className="text-slate-900">Giữa Học kỳ II</option>
            <option value="CUOI_KY_2" className="text-slate-900">Cuối Học kỳ II</option>
            <option value="CA_NAM" className="text-slate-900">Tổng kết Cả năm</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#007A72] flex items-center justify-center font-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Điểm Bình Quân Tất Cả Môn
            </span>
            <span className="text-2xl font-black text-slate-850">
              {overallAvg !== null ? overallAvg + "%" : "Chưa có"}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Tiến Độ Đánh Giá Năng Lực
            </span>
            <span className="text-2xl font-black text-emerald-700">
              {totalEvaluated} <span className="text-sm font-bold text-slate-400">/ {totalRequired} năng lực</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Số Môn Đã Đánh Giá
            </span>
            <span className="text-2xl font-black text-indigo-900">
              {summaries.length} <span className="text-sm font-bold text-slate-400">môn học</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Subject Competency Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/80">
          Đang tải dữ liệu đánh giá năng lực môn học...
        </div>
      ) : summaries.length === 0 ? (
        <div className="p-12 text-center space-y-2 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Chưa Có Dữ Liệu Đánh Giá Năng Lực</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Học sinh chưa có kết quả đánh giá năng lực cho đợt {getPeriodLabel(selectedPeriod)}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {summaries.map((summary) => (
            <SubjectCompetencyCard
              key={summary.id || summary.subjectId}
              subjectName={summary.subject?.subjectName || "Môn học"}
              subjectCode={summary.subject?.subjectCode || "MON"}
              subjectScore={summary.subjectScore}
              evaluatedCount={summary.evaluatedCount}
              totalCompetencies={summary.totalCompetencies}
              radarData={summary.radarData || []}
              assessmentPeriodLabel={getPeriodLabel(summary.assessmentPeriod)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
