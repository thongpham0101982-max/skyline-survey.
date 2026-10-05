"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Download,
  Upload,
  BookOpen,
  MessageSquare,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
  Printer,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { CORE_COMPETENCIES_DEF, CORE_COMPETENCY_RATINGS, CTQT_LEVEL_CONFIGS, detectCtqtLevel } from "@/lib/ctqt/config";

interface Props {
  teacher: any;
  academicYears: any[];
  activeYearId: string;
  ctqtClasses: any[];
  isSuperAdmin: boolean;
}

export function SoDiemCtqtTeacherClient({
  teacher,
  academicYears,
  activeYearId,
  ctqtClasses,
  isSuperAdmin,
}: Props) {
  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab");
  const urlClassId = searchParams?.get("classId");
  const urlYearId = searchParams?.get("academicYearId");

  const [selectedYearId, setSelectedYearId] = useState(urlYearId || activeYearId || (academicYears[0]?.id || ""));
  const [selectedSemester, setSelectedSemester] = useState(2);
  const [activeTab, setActiveTab] = useState<"entry" | "review" | "consolidated">(
    (urlTab === "consolidated" || urlTab === "review" || urlTab === "entry") ? (urlTab as any) : "entry"
  );

  // Assignments for this teacher
  const [assignmentsData, setAssignmentsData] = useState<any>({
    primaryAssignments: [],
    delegatedAssignments: [],
  });
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Selected for Entry Tab
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("");
  const [subjectGradeData, setSubjectGradeData] = useState<any>(null);
  const [loadingSubjectGrades, setLoadingSubjectGrades] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);

  // Selected for Review Tab
  const [selectedReviewAssignment, setSelectedReviewAssignment] = useState<any>(null);
  const [reviewGradeData, setReviewGradeData] = useState<any>(null);
  const [loadingReviewData, setLoadingReviewData] = useState(false);
  const [actioningReview, setActioningReview] = useState(false);

  // Selected for Consolidated Tab (GVCN / Class View)
  const [consolidatedClassId, setConsolidatedClassId] = useState<string>(urlClassId || ctqtClasses[0]?.id || "");
  const [consolidatedData, setConsolidatedData] = useState<any>(null);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);
  const [savingCompetencies, setSavingCompetencies] = useState(false);

  useEffect(() => {
    if (urlTab === "consolidated") {
      setActiveTab("consolidated");
    } else if (urlTab === "review") {
      setActiveTab("review");
    }
    if (urlClassId) {
      setConsolidatedClassId(urlClassId);
    }
  }, [urlTab, urlClassId]);

  // Fetch teacher's CTQT assignments
  const fetchTeacherAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await fetch(
        `/api/teacher/ctqt/grades?action=getTeacherAssignments&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setAssignmentsData(data.data);
        if (data.data.primaryAssignments?.length > 0 && !selectedClassId) {
          setSelectedClassId(data.data.primaryAssignments[0].classId);
          setSelectedSubjectCode(data.data.primaryAssignments[0].subjectCode);
        }
        if (data.data.delegatedAssignments?.length > 0 && !selectedReviewAssignment) {
          setSelectedReviewAssignment(data.data.delegatedAssignments[0]);
        }
      }
    } catch {
      toast.error("Không thể tải danh sách phân công CTQT");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchTeacherAssignments();
  }, [selectedYearId, selectedSemester]);

  // Load subject grade data for Entry tab
  const fetchSubjectGrades = async () => {
    if (!selectedClassId || !selectedSubjectCode) return;
    setLoadingSubjectGrades(true);
    try {
      const res = await fetch(
        `/api/teacher/ctqt/grades?classId=${selectedClassId}&subjectCode=${selectedSubjectCode}&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setSubjectGradeData(data.data);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Lỗi tải dữ liệu điểm bộ môn");
    } finally {
      setLoadingSubjectGrades(false);
    }
  };

  useEffect(() => {
    if (activeTab === "entry" && selectedClassId && selectedSubjectCode) {
      fetchSubjectGrades();
    }
  }, [activeTab, selectedClassId, selectedSubjectCode, selectedYearId, selectedSemester]);

  // Load review grade data for Review tab
  const fetchReviewGrades = async () => {
    if (!selectedReviewAssignment) return;
    setLoadingReviewData(true);
    try {
      const res = await fetch(
        `/api/teacher/ctqt/grades?classId=${selectedReviewAssignment.classId}&subjectCode=${selectedReviewAssignment.subjectCode}&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setReviewGradeData(data.data);
      }
    } catch {
      toast.error("Lỗi tải dữ liệu rà soát");
    } finally {
      setLoadingReviewData(false);
    }
  };

  useEffect(() => {
    if (activeTab === "review" && selectedReviewAssignment) {
      fetchReviewGrades();
    }
  }, [activeTab, selectedReviewAssignment, selectedYearId, selectedSemester]);

  // Load consolidated grades for Consolidated Tab
  const fetchConsolidatedGrades = async () => {
    if (!consolidatedClassId) return;
    setLoadingConsolidated(true);
    try {
      const res = await fetch(
        `/api/admin/ctqt/grades?classId=${consolidatedClassId}&academicYearId=${selectedYearId}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success) {
        setConsolidatedData(data.data);
      }
    } catch {
      toast.error("Lỗi tải sổ điểm tổng hợp");
    } finally {
      setLoadingConsolidated(false);
    }
  };

  useEffect(() => {
    if (activeTab === "consolidated" && consolidatedClassId) {
      fetchConsolidatedGrades();
    }
  }, [activeTab, consolidatedClassId, selectedYearId, selectedSemester]);

  // Save Subject Grades (Draft or Submit Review)
  const handleSaveGrades = async (isSubmitReview = false) => {
    if (!subjectGradeData?.students || !selectedClassId || !selectedSubjectCode) return;
    setSavingGrades(true);
    try {
      const entries = subjectGradeData.students.map((st: any) => {
        const existing = subjectGradeData.entries?.find((e: any) => e.studentId === st.id) || {};
        return {
          studentId: st.id,
          progressScores: existing.progressScores || null,
          midTermScore: existing.midTermScore !== undefined ? existing.midTermScore : null,
          endTermScore: existing.endTermScore !== undefined ? existing.endTermScore : null,
          gpaScore: existing.gpaScore !== undefined ? existing.gpaScore : null,
          assessmentContentEn: existing.assessmentContentEn || null,
          assessmentContentVi: existing.assessmentContentVi || null,
          ieltsScore: existing.ieltsScore !== undefined ? existing.ieltsScore : null,
          commentEn: existing.commentEn || null,
          commentVi: existing.commentVi || null,
        };
      });

      const res = await fetch("/api/teacher/ctqt/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isSubmitReview ? "submitReview" : "saveDraft",
          academicYearId: selectedYearId,
          semester: selectedSemester,
          classId: selectedClassId,
          subjectCode: selectedSubjectCode,
          entries,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchSubjectGrades();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Lỗi kết nối khi lưu");
    } finally {
      setSavingGrades(false);
    }
  };

  // Review Action: Approve or Request Changes
  const handleReviewAction = async (action: "approve" | "requestChanges") => {
    if (!selectedReviewAssignment) return;
    let reviewerNote = "";
    if (action === "requestChanges") {
      const input = prompt("Nhập nội dung yêu cầu GVBM chỉnh sửa:");
      if (!input) return;
      reviewerNote = input;
    }

    setActioningReview(true);
    try {
      const entries = reviewGradeData?.students?.map((st: any) => {
        const e = reviewGradeData.entries?.find((x: any) => x.studentId === st.id) || {};
        return {
          studentId: st.id,
          commentEn: e.commentEn,
          commentVi: e.commentVi,
        };
      });

      const res = await fetch("/api/teacher/ctqt/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          classId: selectedReviewAssignment.classId,
          subjectCode: selectedReviewAssignment.subjectCode,
          academicYearId: selectedYearId,
          semester: selectedSemester,
          reviewerNote,
          entries,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchReviewGrades();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setActioningReview(false);
    }
  };

  // Save Core Competencies
  const handleSaveCompetencies = async () => {
    if (!consolidatedData?.students || !consolidatedClassId) return;
    setSavingCompetencies(true);
    try {
      const competencies = consolidatedData.students.map((st: any) => {
        const c = consolidatedData.competencies?.find((x: any) => x.studentId === st.id) || {};
        return {
          studentId: st.id,
          communication: c.communication || "E",
          collaboration: c.collaboration || "E",
          responsibility: c.responsibility || "E",
          criticalThinking: c.criticalThinking || "E",
          creativity: c.creativity || "E",
          problemSolving: c.problemSolving || "E",
        };
      });

      const res = await fetch("/api/teacher/ctqt/competencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: consolidatedClassId,
          academicYearId: selectedYearId,
          semester: selectedSemester,
          competencies,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchConsolidatedGrades();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingCompetencies(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl">
                <Globe className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  Sổ điểm CTQT & Rà soát Song ngữ
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                  Nhập điểm và nhận xét tiếng Anh, rà soát ủy quyền song ngữ và quản lý sổ điểm tổng hợp.
                </p>
              </div>
            </div>
          </div>

          {/* Year & Semester selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>
                  Năm học: {y.name}
                </option>
              ))}
            </select>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSemester(1)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedSemester === 1 ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester(2)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedSemester === 2 ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ 2
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("entry")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "entry"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            1. Nhập điểm Bộ môn
            {assignmentsData.primaryAssignments?.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                {assignmentsData.primaryAssignments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "review"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            2. Rà soát Song ngữ (GVTA ủy quyền)
            {assignmentsData.delegatedAssignments?.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                {assignmentsData.delegatedAssignments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("consolidated")}
            className={`pb-3 px-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "consolidated"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            3. Sổ điểm Tổng hợp & Năng lực Cốt lõi (GVCN)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NHẬP ĐIỂM BỘ MÔN (GVBM)                                            */}
      {/* ========================================================================= */}
      {activeTab === "entry" && (
        <div className="space-y-4">
          {/* Class & Subject Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Lớp & Môn phụ trách:</label>
              {assignmentsData.primaryAssignments?.length === 0 && !isSuperAdmin ? (
                <span className="text-xs text-slate-500 italic">Bạn chưa được phân công môn học CTQT nào trong học kỳ này.</span>
              ) : (
                <select
                  value={`${selectedClassId}_${selectedSubjectCode}`}
                  onChange={e => {
                    const [cId, sCode] = e.target.value.split("_");
                    setSelectedClassId(cId);
                    setSelectedSubjectCode(sCode);
                  }}
                  className="text-xs font-bold px-4 py-2 bg-teal-50 border border-teal-300 rounded-xl text-teal-900 focus:outline-teal-500"
                >
                  {assignmentsData.primaryAssignments?.map((a: any) => (
                    <option key={`${a.classId}_${a.subjectCode}`} value={`${a.classId}_${a.subjectCode}`}>
                      Lớp {a.class?.className} • Môn: {a.subjectCode} (GVTA Rà soát: {a.delegatedTeacher?.teacherName || "Chưa gán"})
                    </option>
                  ))}
                  {isSuperAdmin && ctqtClasses.map(c => (
                    <option key={`${c.id}_ENG`} value={`${c.id}_ENG`}>
                      [Admin] Lớp {c.className} • Môn: ENG
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveGrades(false)}
                disabled={savingGrades || !subjectGradeData}
                className="text-xs font-bold px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu Nháp
              </button>

              <button
                type="button"
                onClick={() => handleSaveGrades(true)}
                disabled={savingGrades || !subjectGradeData}
                className="text-xs font-bold px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Gửi Rà Soát Cho GVTA
              </button>
            </div>
          </div>

          {/* Status Banner */}
          {subjectGradeData?.assignment && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">GVTA được ủy quyền rà soát:</span>
                <span className="font-semibold text-teal-700 px-2 py-0.5 bg-teal-100 rounded-lg">
                  {subjectGradeData.assignment.delegatedTeacher?.teacherName || "Chưa gán GVTA rà soát"}
                </span>
              </div>
              <div className="text-slate-500">
                Môn: <strong>{subjectGradeData.subjectDef?.nameEn}</strong> ({subjectGradeData.subjectDef?.nameVi})
              </div>
            </div>
          )}

          {/* Grade Entry Grid */}
          {loadingSubjectGrades ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Đang tải danh sách học sinh và điểm...
            </div>
          ) : !subjectGradeData || subjectGradeData.students?.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Chưa có dữ liệu học sinh của lớp này.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto border-b border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border border-slate-300 text-center font-bold text-slate-700 w-10">STT</th>
                      <th className="p-2.5 border border-slate-300 font-bold text-slate-700 min-w-[140px]">Họ và tên</th>
                      <th className="p-2.5 border border-slate-300 font-bold text-teal-800 w-24">English Name</th>
                      <th className="p-2.5 border border-slate-300 text-center font-bold text-slate-700 w-24">Mã HS</th>

                      {/* Dynamic Score Columns */}
                      {subjectGradeData.subjectDef?.scoreColumns?.map((col: any) => (
                        <th key={col.key} className="p-2 border border-slate-300 text-center font-bold text-slate-700 min-w-[70px]">
                          {col.labelEn}
                          <div className="text-[10px] font-normal text-slate-500">{col.labelVi}</div>
                        </th>
                      ))}

                      {/* Comments columns */}
                      <th className="p-2.5 border border-slate-300 font-bold text-slate-800 min-w-[280px]">
                        COMMENTS (English)
                      </th>
                      <th className="p-2.5 border border-slate-300 font-bold text-slate-800 min-w-[280px]">
                        NHẬN XÉT (Bản dịch tiếng Việt)
                      </th>
                      <th className="p-2 border border-slate-300 text-center font-bold text-slate-700 w-24">Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {subjectGradeData.students.map((st: any, idx: number) => {
                      const entry = subjectGradeData.entries?.find((e: any) => e.studentId === st.id) || {};
                      let progArr: any[] = [];
                      try {
                        progArr = JSON.parse(entry.progressScores || "[]");
                      } catch {
                        progArr = [];
                      }

                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="p-2.5 border border-slate-200 font-bold text-slate-800">{st.studentName}</td>
                          <td className="p-2.5 border border-slate-200 font-semibold text-teal-700">{st.englishName || "-"}</td>
                          <td className="p-2.5 border border-slate-200 text-center font-mono text-slate-600">{st.studentCode}</td>

                          {/* Score input fields */}
                          {subjectGradeData.subjectDef?.scoreColumns?.map((col: any) => {
                            let val: any = "";
                            if (col.key.startsWith("progressScores_")) {
                              const pIdx = parseInt(col.key.replace("progressScores_", ""), 10);
                              val = progArr[pIdx] !== undefined ? progArr[pIdx] : "";
                            } else if (col.key === "midTermScore") {
                              val = entry.midTermScore !== null && entry.midTermScore !== undefined ? entry.midTermScore : "";
                            } else if (col.key === "endTermScore") {
                              val = entry.endTermScore !== null && entry.endTermScore !== undefined ? entry.endTermScore : "";
                            } else if (col.key === "gpaScore") {
                              val = entry.gpaScore !== null && entry.gpaScore !== undefined ? entry.gpaScore : "";
                            } else if (col.key === "ieltsScore") {
                              val = entry.ieltsScore !== null && entry.ieltsScore !== undefined ? entry.ieltsScore : "";
                            }

                            return (
                              <td key={col.key} className="p-1.5 border border-slate-200 text-center">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={val}
                                  onChange={e => {
                                    const raw = e.target.value;
                                    const parsed = raw === "" ? null : parseFloat(raw);
                                    const updatedEntries = [...(subjectGradeData.entries || [])];
                                    let found = updatedEntries.find(x => x.studentId === st.id);
                                    if (!found) {
                                      found = { studentId: st.id };
                                      updatedEntries.push(found);
                                    }

                                    if (col.key.startsWith("progressScores_")) {
                                      const pIdx = parseInt(col.key.replace("progressScores_", ""), 10);
                                      const copyProg = [...progArr];
                                      copyProg[pIdx] = parsed;
                                      found.progressScores = JSON.stringify(copyProg);
                                    } else {
                                      found[col.key] = parsed;
                                    }

                                    setSubjectGradeData({ ...subjectGradeData, entries: updatedEntries });
                                  }}
                                  className="w-16 text-center text-xs font-bold p-1 bg-white border border-slate-300 rounded focus:border-teal-500 focus:outline-hidden"
                                />
                              </td>
                            );
                          })}

                          {/* COMMENTS EN Textarea */}
                          <td className="p-1.5 border border-slate-200">
                            <textarea
                              rows={2}
                              value={entry.commentEn || ""}
                              placeholder="English comment..."
                              onChange={e => {
                                const val = e.target.value;
                                const updatedEntries = [...(subjectGradeData.entries || [])];
                                let found = updatedEntries.find(x => x.studentId === st.id);
                                if (!found) {
                                  found = { studentId: st.id };
                                  updatedEntries.push(found);
                                }
                                found.commentEn = val;
                                setSubjectGradeData({ ...subjectGradeData, entries: updatedEntries });
                              }}
                              className="w-full text-[11px] p-1.5 bg-white border border-slate-300 rounded focus:border-teal-500 focus:outline-hidden"
                            />
                          </td>

                          {/* NHẬN XÉT VI Textarea */}
                          <td className="p-1.5 border border-slate-200">
                            <textarea
                              rows={2}
                              value={entry.commentVi || ""}
                              placeholder="Nhận xét tiếng Việt..."
                              onChange={e => {
                                const val = e.target.value;
                                const updatedEntries = [...(subjectGradeData.entries || [])];
                                let found = updatedEntries.find(x => x.studentId === st.id);
                                if (!found) {
                                  found = { studentId: st.id };
                                  updatedEntries.push(found);
                                }
                                found.commentVi = val;
                                setSubjectGradeData({ ...subjectGradeData, entries: updatedEntries });
                              }}
                              className="w-full text-[11px] p-1.5 bg-white border border-slate-300 rounded focus:border-teal-500 focus:outline-hidden"
                            />
                          </td>

                          {/* Review Status Badge */}
                          <td className="p-2 border border-slate-200 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                entry.reviewStatus === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : entry.reviewStatus === "CHANGES_REQUESTED"
                                  ? "bg-rose-100 text-rose-800"
                                  : entry.reviewStatus === "PENDING_REVIEW"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {entry.reviewStatus === "APPROVED"
                                ? "Đã duyệt"
                                : entry.reviewStatus === "CHANGES_REQUESTED"
                                ? "Cần sửa"
                                : entry.reviewStatus === "PENDING_REVIEW"
                                ? "Chờ duyệt"
                                : "Nháp"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RÀ SOÁT SONG NGỮ (GVTA ĐƯỢC ỦY QUYỀN)                             */}
      {/* ========================================================================= */}
      {activeTab === "review" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Lớp & Môn được ủy quyền rà soát:</label>
              {assignmentsData.delegatedAssignments?.length === 0 && !isSuperAdmin ? (
                <span className="text-xs text-slate-500 italic">Bạn chưa được phân công làm người rà soát cho lớp nào.</span>
              ) : (
                <select
                  value={selectedReviewAssignment ? `${selectedReviewAssignment.classId}_${selectedReviewAssignment.subjectCode}` : ""}
                  onChange={e => {
                    const found = assignmentsData.delegatedAssignments.find(
                      (a: any) => `${a.classId}_${a.subjectCode}` === e.target.value
                    );
                    setSelectedReviewAssignment(found || null);
                  }}
                  className="text-xs font-bold px-4 py-2 bg-amber-50 border border-amber-300 rounded-xl text-amber-900"
                >
                  {assignmentsData.delegatedAssignments?.map((a: any) => (
                    <option key={`${a.classId}_${a.subjectCode}`} value={`${a.classId}_${a.subjectCode}`}>
                      Lớp {a.class?.className} • Môn: {a.subjectCode} (GVBM: {a.primaryTeacher?.teacherName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReviewAction("requestChanges")}
                disabled={actioningReview || !reviewGradeData}
                className="text-xs font-bold px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Yêu cầu Chỉnh sửa
              </button>

              <button
                type="button"
                onClick={() => handleReviewAction("approve")}
                disabled={actioningReview || !reviewGradeData}
                className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận Hoàn tất Rà soát (Approve)
              </button>
            </div>
          </div>

          {/* Side-by-Side Review Grid */}
          {loadingReviewData ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Đang tải dữ liệu rà soát...
            </div>
          ) : !reviewGradeData || reviewGradeData.students?.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Không có dữ liệu bài nộp nào đang chờ rà soát.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Hướng dẫn rà soát:</strong> GVTA kiểm tra ngữ pháp/chính tả nhận xét tiếng Anh (COMMENTS), bổ sung hoặc trau chuốt bản dịch tiếng Việt (NHẬN XÉT). Có thể chỉnh sửa trực tiếp vào các ô bên dưới trước khi bấm duyệt.
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="divide-y divide-slate-200">
                  {reviewGradeData.students.map((st: any, idx: number) => {
                    const entry = reviewGradeData.entries?.find((e: any) => e.studentId === st.id) || {};

                    return (
                      <div key={st.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">{idx + 1}.</span>
                            <span className="text-xs font-bold text-slate-800">{st.studentName}</span>
                            <span className="text-[11px] font-semibold text-teal-700">({st.englishName || "No English Name"})</span>
                            <span className="text-[10px] font-mono text-slate-400">#{st.studentCode}</span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              entry.reviewStatus === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : entry.reviewStatus === "CHANGES_REQUESTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {entry.reviewStatus || "DRAFT"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* English Comment Editor */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              COMMENTS (Tiếng Anh - GVBM soạn):
                            </label>
                            <textarea
                              rows={3}
                              value={entry.commentEn || ""}
                              onChange={e => {
                                const val = e.target.value;
                                const updated = [...(reviewGradeData.entries || [])];
                                let f = updated.find(x => x.studentId === st.id);
                                if (!f) {
                                  f = { studentId: st.id };
                                  updated.push(f);
                                }
                                f.commentEn = val;
                                setReviewGradeData({ ...reviewGradeData, entries: updated });
                              }}
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:outline-hidden leading-relaxed"
                            />
                          </div>

                          {/* Vietnamese Translation Editor */}
                          <div>
                            <label className="block text-[11px] font-bold text-teal-800 mb-1">
                              NHẬN XÉT (Bản dịch tiếng Việt):
                            </label>
                            <textarea
                              rows={3}
                              value={entry.commentVi || ""}
                              onChange={e => {
                                const val = e.target.value;
                                const updated = [...(reviewGradeData.entries || [])];
                                let f = updated.find(x => x.studentId === st.id);
                                if (!f) {
                                  f = { studentId: st.id };
                                  updated.push(f);
                                }
                                f.commentVi = val;
                                setReviewGradeData({ ...reviewGradeData, entries: updated });
                              }}
                              className="w-full text-xs p-2 bg-teal-50/30 border border-teal-300 rounded-xl focus:border-teal-500 focus:outline-hidden italic leading-relaxed"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SỔ ĐIỂM TỔNG HỢP & NĂNG LỰC CỐT LÕI (GVCN)                         */}
      {/* ========================================================================= */}
      {activeTab === "consolidated" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Lớp Chủ nhiệm / Theo dõi:</label>
              <select
                value={consolidatedClassId}
                onChange={e => setConsolidatedClassId(e.target.value)}
                className="text-xs font-bold px-4 py-2 bg-teal-50 border border-teal-300 rounded-xl text-teal-900"
              >
                {ctqtClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.className} ({c.campus?.campusName || ""})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveCompetencies}
                disabled={savingCompetencies || !consolidatedData}
                className="text-xs font-bold px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingCompetencies ? "Đang lưu..." : "Lưu Đánh giá Năng lực Cốt lõi"}
              </button>
            </div>
          </div>

          {loadingConsolidated ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Đang tải Sổ điểm Tổng hợp...
            </div>
          ) : !consolidatedData ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 font-semibold text-sm">
              Chưa có dữ liệu lớp này.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700">
                  Đánh giá 6 Tiêu chí Năng lực Cốt lõi (Core Competencies) • Thang E - S - N - U
                </div>
                <div className="text-[11px] text-slate-500">
                  E = Tốt | S = Đạt | N = Cần cải thiện | U = Chưa đạt
                </div>
              </div>

              <div className="overflow-x-auto border-b border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border border-slate-300 text-center font-bold text-slate-700 w-10">STT</th>
                      <th className="p-2.5 border border-slate-300 font-bold text-slate-700 min-w-[150px]">Họ và tên</th>
                      <th className="p-2.5 border border-slate-300 font-bold text-teal-800 w-28">English Name</th>
                      <th className="p-2.5 border border-slate-300 text-center font-bold text-slate-700 w-24">Mã HS</th>

                      {CORE_COMPETENCIES_DEF.map(cc => (
                        <th key={cc.key} className="p-2 border border-slate-300 text-center font-bold text-slate-800 min-w-[110px]">
                          {cc.labelVi}
                          <div className="text-[10px] font-normal text-slate-500">{cc.labelEn}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {consolidatedData.students.map((st: any, idx: number) => {
                      const comp = consolidatedData.competencies?.find((c: any) => c.studentId === st.id) || {};

                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="p-2.5 border border-slate-200 font-bold text-slate-800">{st.studentName}</td>
                          <td className="p-2.5 border border-slate-200 font-semibold text-teal-700">{st.englishName || "-"}</td>
                          <td className="p-2.5 border border-slate-200 text-center font-mono text-slate-600">{st.studentCode}</td>

                          {CORE_COMPETENCIES_DEF.map(cc => {
                            const val = comp[cc.key] || "E";
                            return (
                              <td key={cc.key} className="p-1.5 border border-slate-200 text-center">
                                <select
                                  value={val}
                                  onChange={e => {
                                    const nextVal = e.target.value;
                                    const updated = [...(consolidatedData.competencies || [])];
                                    let found = updated.find(x => x.studentId === st.id);
                                    if (!found) {
                                      found = { studentId: st.id };
                                      updated.push(found);
                                    }
                                    found[cc.key] = nextVal;
                                    setConsolidatedData({ ...consolidatedData, competencies: updated });
                                  }}
                                  className={`text-xs font-black p-1.5 rounded-lg border focus:outline-hidden ${
                                    val === "E"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                      : val === "S"
                                      ? "bg-blue-50 text-blue-800 border-blue-300"
                                      : val === "N"
                                      ? "bg-amber-50 text-amber-800 border-amber-300"
                                      : "bg-rose-50 text-rose-800 border-rose-300"
                                  }`}
                                >
                                  {CORE_COMPETENCY_RATINGS.map(r => (
                                    <option key={r.code} value={r.code}>
                                      {r.code} - {r.labelVi}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
