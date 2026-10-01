"use client"
// @ts-nocheck

import React, { useState, useEffect, useMemo } from "react";
import { SubjectCompetencyCard } from "./SubjectCompetencyCard";
import { BookOpen, Compass } from "lucide-react";

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
  const [summaries, setSummaries] = useState<any[]>([]);
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

  // Fetch competency summaries for this student (all available subjects)
  useEffect(() => {
    if (!studentId && !studentCode) return;

    setLoading(true);
    const query = new URLSearchParams();
    if (studentId) query.set("studentId", studentId);
    if (studentCode) query.set("studentCode", studentCode);
    if (selectedYearId) query.set("academicYearId", selectedYearId);
    query.set("assessmentPeriod", "ALL");

    fetch("/api/admin/competency-assessment/summary?" + query.toString())
      .then((res) => res.json())
      .then((data) => {
        if (data.summaries && data.summaries.length > 0) {
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
  }, [studentId, studentCode, selectedYearId]);

  const enrichedSummaries = useMemo(() => {
    return summaries.map((s) => ({
      ...s,
      benchmarkScore: 75,
      previousScore: null,
    }));
  }, [summaries]);

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
        return period || "Đánh giá";
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Deep-dive Subject Radar Charts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-600" />
            <span>Biểu đồ radar năng lực môn học</span>
          </h4>
          {enrichedSummaries.length > 0 && (
            <span className="text-xs text-slate-400 font-bold">
              {enrichedSummaries.length} môn học
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải dữ liệu biểu đồ radar môn học...</span>
          </div>
        ) : enrichedSummaries.length === 0 ? (
          <div className="p-10 text-center space-y-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <BookOpen className="w-7 h-7 text-slate-300 mx-auto" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-700">Chưa có dữ liệu biểu đồ radar môn học</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Chưa có kết quả đánh giá năng lực theo môn học được ghi nhận trong hệ thống.
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
