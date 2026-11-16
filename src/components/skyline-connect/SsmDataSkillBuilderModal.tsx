"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  Play,
  RefreshCw,
  ShieldCheck,
  BookOpen,
  Clock,
  Layers,
  Check,
} from "lucide-react";

interface SsmDataSkillBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillCreated: (skill: any) => void;
  workCategories?: Array<{ code: string; name: string }>;
}

export function SsmDataSkillBuilderModal({
  isOpen,
  onClose,
  onSkillCreated,
  workCategories = [],
}: SsmDataSkillBuilderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [loadingScope, setLoadingScope] = useState(false);
  const [scopeCatalog, setScopeCatalog] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1 state: Scope selection
  const [academicYearId, setAcademicYearId] = useState("");
  const [selectedAssignmentIdx, setSelectedAssignmentIdx] = useState<number>(0);
  const [classId, setClassId] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [periodType, setPeriodType] = useState<"SEMESTER" | "MONTH">("SEMESTER");
  const [semester, setSemester] = useState<number>(1);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [topicName, setTopicName] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "ACADEMIC_RECORDS",
    "EXAM_BREAKDOWN",
  ]);
  const [showProactiveMaterialBox, setShowProactiveMaterialBox] = useState(false);

  // Step 2 & 3 state: Evidence brief
  const [reviewingData, setReviewingData] = useState(false);
  const [evidenceBrief, setEvidenceBrief] = useState<any>(null);

  // Step 4 state: Teacher confirmation & customization
  const [confirmedSourceIds, setConfirmedSourceIds] = useState<string[]>([]);
  const [customNeedsNote, setCustomNeedsNote] = useState("");
  const [lessonPlanReference, setLessonPlanReference] = useState("");
  const [targetObjective, setTargetObjective] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [workCategory, setWorkCategory] = useState<string>("STUDENT_SUPPORT");
  const [desiredOutputStructure, setDesiredOutputStructure] = useState("");

  // Step 5 state: Generated draft skill
  const [generatingSkill, setGeneratingSkill] = useState(false);
  const [draftSkill, setDraftSkill] = useState<any>(null);
  const [savedSkillRecord, setSavedSkillRecord] = useState<any>(null);
  const [visibility, setVisibility] = useState<"DEPARTMENT" | "CAMPUS" | "SYSTEM">("CAMPUS");

  // Department Working Session Update Mode (Cập nhật Skill hiện có từ phiên làm việc của GV Tổ chuyên môn)
  const [builderMode, setBuilderMode] = useState<"NEW_SKILL" | "UPDATE_DEPT_SKILL">(
    "NEW_SKILL"
  );
  const [targetSkillIdForUpdate, setTargetSkillIdForUpdate] = useState<string>("");
  const [deptSessionType, setDeptSessionType] = useState<string>("SHCM_DINH_KY");
  const [deptSessionTitle, setDeptSessionTitle] = useState<string>("");
  const [deptSessionParticipants, setDeptSessionParticipants] = useState<
    Array<{ userId: string; name: string; role?: string }>
  >([]);

  // Step 6 state: Sandbox test run
  const [runningTest, setRunningTest] = useState(false);
  const [testRunResult, setTestRunResult] = useState<any>(null);
  const [testRunError, setTestRunError] = useState<string | null>(null);
  const [customRunTopic, setCustomRunTopic] = useState("");
  const [savingFinal, setSavingFinal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setErrorMsg(null);
    setEvidenceBrief(null);
    setDraftSkill(null);
    setSavedSkillRecord(null);
    setTestRunResult(null);
    setTestRunError(null);
    loadScopeCatalog();
  }, [isOpen]);

  const loadScopeCatalog = async (yearId?: string) => {
    setLoadingScope(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams({ action: "ssmDataScope" });
      if (yearId) qs.set("academicYearId", yearId);
      const res = await fetch(`/api/skyline-connect?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể tải phạm vi phân công giảng dạy.");
      setScopeCatalog(json);
      if (json.selectedAcademicYearId) {
        setAcademicYearId(json.selectedAcademicYearId);
      }
      if (Array.isArray(json.assignments) && json.assignments.length > 0) {
        const first = json.assignments[0];
        setSelectedAssignmentIdx(0);
        setClassId(first.classId);
        setSubjectCode(first.subjectCode);
        setSubjectName(first.subjectName);
        setGradeLevel(first.gradeLevel);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi khi tải danh mục phân công của giáo viên.");
    } finally {
      setLoadingScope(false);
    }
  };

  if (!isOpen) return null;

  const assignments: any[] = scopeCatalog?.assignments || [];
  const dataSourceCatalog: any[] = scopeCatalog?.dataSources || [];

  const handleSelectAssignment = (idx: number) => {
    setSelectedAssignmentIdx(idx);
    const item = assignments[idx];
    if (item) {
      setClassId(item.classId);
      setSubjectCode(item.subjectCode);
      setSubjectName(item.subjectName);
      setGradeLevel(item.gradeLevel);
    }
  };

  const toggleSource = (srcId: string) => {
    setSelectedSources((prev) =>
      prev.includes(srcId) ? prev.filter((x) => x !== srcId) : [...prev, srcId]
    );
  };

  const handleStep1ToStep2 = async () => {
    if (!classId || !subjectCode) {
      setErrorMsg("Vui lòng chọn lớp và môn học từ phân công giảng dạy của Thầy/Cô.");
      return;
    }
    setReviewingData(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reviewScopeData",
          academicYearId,
          classId,
          subjectCode,
          subjectName,
          gradeLevel,
          periodType,
          semester: periodType === "SEMESTER" ? semester : undefined,
          month: periodType === "MONTH" ? month : undefined,
          topicName: topicName.trim() || undefined,
          selectedSources,
          teacherProactiveNotes: customNeedsNote.trim() || undefined,
          targetObjective: targetObjective.trim() || undefined,
          lessonPlanReference: lessonPlanReference.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể rà soát dữ liệu SSM.");
      const brief = json.brief;
      setEvidenceBrief(brief);
      const connectedIds = (brief.dataSourcesStatus || [])
        .filter((s: any) => s.status === "CONNECTED")
        .map((s: any) => s.id);
      setConfirmedSourceIds(connectedIds.length > 0 ? connectedIds : selectedSources);

      if (!targetObjective && topicName.trim()) {
        setTargetObjective(
          `Thiết kế hoạt động/học liệu hỗ trợ học sinh nắm vững chủ đề "${topicName.trim()}" môn ${subjectName} (${gradeLevel})`
        );
      }
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi khi rà soát dữ liệu SSM.");
    } finally {
      setReviewingData(false);
    }
  };

  const handleQuickProactiveGenerateFromStep1 = async () => {
    if (!classId || !subjectCode) {
      setErrorMsg("Vui lòng chọn lớp và môn học từ phân công giảng dạy của Thầy/Cô.");
      return;
    }
    if (!topicName.trim() && !targetObjective.trim() && !customNeedsNote.trim()) {
      setErrorMsg(
        "Vui lòng nhập Bài học / Chủ đề trọng tâm hoặc Nhận định / Mục tiêu chủ động của Thầy/Cô để khởi tạo nhanh Skill."
      );
      return;
    }
    setGeneratingSkill(true);
    setErrorMsg(null);
    try {
      const resolvedTopic =
        topicName.trim() ||
        targetObjective.trim().slice(0, 80) ||
        `Chuyên đề môn ${subjectName} (${gradeLevel})`;
      const resolvedObjective =
        targetObjective.trim() ||
        `Hỗ trợ học sinh nắm vững và vận dụng tốt nội dung "${resolvedTopic}" môn ${subjectName} (${gradeLevel})${
          customNeedsNote.trim() ? ` — Lưu ý thực tế lớp: ${customNeedsNote.trim()}` : ""
        }`;

      // 1. Build reference brief (combining teacher proactive input + optional SSM reference)
      const briefRes = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reviewScopeData",
          academicYearId,
          classId,
          subjectCode,
          subjectName,
          gradeLevel,
          periodType,
          semester: periodType === "SEMESTER" ? semester : undefined,
          month: periodType === "MONTH" ? month : undefined,
          topicName: resolvedTopic,
          selectedSources,
          teacherProactiveNotes: customNeedsNote.trim() || undefined,
          targetObjective: resolvedObjective,
          lessonPlanReference: lessonPlanReference.trim() || undefined,
        }),
      });
      const briefJson = await briefRes.json();
      if (!briefRes.ok) {
        throw new Error(briefJson.message || "Không thể đối chiếu phạm vi lớp học.");
      }
      const brief = briefJson.brief;
      setEvidenceBrief(brief);

      const connectedIds = (brief.dataSourcesStatus || [])
        .filter((s: any) => s.status === "CONNECTED")
        .map((s: any) => s.id);
      setConfirmedSourceIds(connectedIds.length > 0 ? connectedIds : selectedSources);

      // 2. Immediately generate draft skill grounded in teacher's proactive inputs + SSM reference
      const draftRes = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirmBriefAndGenerateSkill",
          briefId: brief.briefId,
          topicName: resolvedTopic,
          selectedSourceIds: connectedIds.length > 0 ? connectedIds : selectedSources,
          customNeedsNote:
            customNeedsNote.trim() ||
            brief.aiInterpretation?.learningSituationSummary ||
            "",
          lessonPlanReference: lessonPlanReference.trim(),
          targetObjective: resolvedObjective,
          durationMinutes,
          workCategory,
          desiredOutputStructure,
        }),
      });
      const draftJson = await draftRes.json();
      if (!draftRes.ok) {
        throw new Error(draftJson.message || "Không thể khởi tạo nhanh bản nháp Skill.");
      }
      if (!targetObjective.trim()) {
        setTargetObjective(resolvedObjective);
      }
      setDraftSkill(draftJson.draftSkill);
      setCustomRunTopic(resolvedTopic);
      setStep(5);
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi khi tạo nhanh bản nháp Skill.");
    } finally {
      setGeneratingSkill(false);
    }
  };

  const handleConfirmAndGenerateDraft = async () => {
    if (!targetObjective.trim() && !topicName.trim() && !lessonPlanReference.trim()) {
      setErrorMsg(
        "Vui lòng nhập Mục tiêu bài học/hỗ trợ hoặc Tài liệu/Giáo án tham chiếu để hệ thống không tự đặt yêu cầu chương trình chưa có căn cứ."
      );
      return;
    }
    setGeneratingSkill(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirmBriefAndGenerateSkill",
          briefId: evidenceBrief?.briefId,
          topicName: topicName.trim() || evidenceBrief?.scope?.topicOrLesson || "",
          selectedSourceIds: confirmedSourceIds,
          customNeedsNote,
          lessonPlanReference,
          targetObjective,
          durationMinutes,
          workCategory,
          desiredOutputStructure,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể tạo bản nháp Skill từ căn cứ.");
      setDraftSkill(json.draftSkill);
      setCustomRunTopic(topicName || json.draftSkill?.topicName || "");
      setStep(5);
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi khi khởi tạo bản nháp Skill.");
    } finally {
      setGeneratingSkill(false);
    }
  };

  const ensureDraftSavedForRun = async (submitForReview = false) => {
    const selectedAssignment = assignments[selectedAssignmentIdx] || null;
    const isUpdatingExistingSkill =
      builderMode === "UPDATE_DEPT_SKILL" && Boolean(targetSkillIdForUpdate);
    const payload = {
      action: "createOrUpdateSkill",
      skillId: savedSkillRecord?.id || (isUpdatingExistingSkill ? targetSkillIdForUpdate : undefined),
      title: draftSkill.title,
      summary: draftSkill.summary,
      purpose: draftSkill.purpose,
      workCategory: draftSkill.workCategory || workCategory,
      creationMode: "SSM_DATA",
      evidenceBriefId: evidenceBrief?.briefId,
      subjectCodes: draftSkill.subjectCodes || [subjectCode],
      gradeLevels: draftSkill.gradeLevels || [gradeLevel],
      topicName: draftSkill.topicName || topicName,
      usageConditions: draftSkill.usageConditions,
      inputSchema: draftSkill.inputSchema,
      aiInstruction: draftSkill.aiInstruction,
      workflowProcess: draftSkill.workflowProcess,
      principlesAndLimits: draftSkill.principlesAndLimits,
      outputStructure: draftSkill.outputStructure,
      validationCriteria: draftSkill.validationCriteria,
      referenceDocs: draftSkill.referenceDocs,
      samplePrompt: draftSkill.samplePrompt,
      sampleOutput: draftSkill.sampleOutput,
      compatiblePlatforms: draftSkill.compatiblePlatforms || ["SSM_INTERNAL", "GEMINI"],
      usageGuide: draftSkill.usageGuide,
      visibility,
      submitForReview,
      changelog: isUpdatingExistingSkill
        ? `[${deptSessionTitle || "Phiên làm việc Tổ chuyên môn"}] Cập nhật & nâng cấp Skill từ thực tế giảng dạy lớp ${
            selectedAssignment?.className || ""
          }`
        : "Khởi tạo từ dữ liệu SSM đã rà soát và xác nhận",
      departmentSessionMeta: isUpdatingExistingSkill
        ? {
            sessionTitle:
              deptSessionTitle.trim() ||
              `Phiên làm việc Tổ ${subjectName} — Cập nhật từ lớp ${
                selectedAssignment?.className || ""
              }`,
            sessionType: deptSessionType,
            sessionDate: new Date().toISOString(),
            participatingTeachers: deptSessionParticipants,
            testedClassesSummary: selectedAssignment
              ? `Lớp ${selectedAssignment.className} (${selectedAssignment.gradeLevel})`
              : "",
            classroomObservations: customNeedsNote.trim(),
            agreedAdjustments:
              targetObjective.trim() ||
              customNeedsNote.trim() ||
              "Cập nhật hướng dẫn AI & cấu trúc đầu ra theo phiên làm việc Tổ chuyên môn",
          }
        : null,
    };

    const res = await fetch("/api/skyline-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Không thể lưu bản nháp Skill.");
    setSavedSkillRecord(json.skill);
    return json.skill;
  };

  const handleRunSandboxTest = async () => {
    if (runningTest) return; // Prevent duplicate submission
    setRunningTest(true);
    setTestRunError(null);
    try {
      const skillObj = await ensureDraftSavedForRun(false);
      const clientRequestId = `ssm_test_${skillObj.id}_${Date.now()}`;
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "runSkill",
          skillId: skillObj.id,
          clientRequestId,
          runType: "SANDBOX_TEST",
          inputParams: {
            topic_or_lesson: customRunTopic || topicName || subjectName,
            duration_minutes: durationMinutes,
            student_group_context:
              customNeedsNote ||
              "Phân hóa nhiệm vụ theo các mức độ đạt chuẩn và cần hỗ trợ đã rà soát trên lớp",
          },
          customInstructionOverride: draftSkill.aiInstruction,
          bindClassScope: {
            academicYearId,
            classId,
            subjectCode,
            periodType,
            semester: periodType === "SEMESTER" ? semester : undefined,
            month: periodType === "MONTH" ? month : undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Lỗi khi chạy thử Skill.");
      setTestRunResult(json);
    } catch (err: any) {
      setTestRunError(err?.message || "Không thể chạy thử Skill.");
    } finally {
      setRunningTest(false);
    }
  };

  const handleFinalizeSkill = async (submitForReview: boolean) => {
    setSavingFinal(true);
    setErrorMsg(null);
    try {
      const saved = await ensureDraftSavedForRun(submitForReview);
      onSkillCreated(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể lưu Skill.");
    } finally {
      setSavingFinal(false);
    }
  };

  const stepsMeta = [
    { num: 1, label: "1. Chọn phạm vi" },
    { num: 2, label: "2. Rà soát dữ liệu" },
    { num: 3, label: "3. Bản căn cứ" },
    { num: 4, label: "4. GV xác nhận" },
    { num: 5, label: "5. Bản nháp Skill" },
    { num: 6, label: "6. Chạy thử & Lưu" },
  ];

  const dm = evidenceBrief?.deterministicMetrics;
  const ai = evidenceBrief?.aiInterpretation;
  const pa = evidenceBrief?.proposedActions;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header — Sky-Line Deep Pine Academic Ledger */}
        <div className="bg-[#003B3A] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00A19A]/30 border border-[#5EEAD4]/40 flex items-center justify-center">
              <Database className="w-5 h-5 text-[#5EEAD4]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Tạo Skill môn học từ dữ liệu SSM
              </h2>
              <p className="text-xs text-teal-100/80">
                Xây dựng Skill có căn cứ thực tế từ dữ liệu giảng dạy thuộc quyền của giáo viên — tách biệt tuyệt đối thông tin định danh học sinh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-2.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {stepsMeta.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                disabled={!isDone && !isActive}
                onClick={() => {
                  if (isDone) setStep(s.num as any);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : isDone
                    ? "bg-[#E6F4F5] text-[#00736E] hover:bg-[#CCFBF1] cursor-pointer"
                    : "bg-white text-slate-400 border border-[#E2E8F0]"
                }`}
              >
                {isDone && <Check className="w-3.5 h-3.5 text-[#059669]" />}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* ================================================================
              BƯỚC 1: CHỌN PHẠM VI & NGUỒN DỮ LIỆU SSM
              ================================================================ */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Segmented Mode Control: Tạo Skill mới vs Cập nhật Skill từ phiên làm việc Tổ chuyên môn */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs font-bold text-[#003B3A]">
                  Hình thức thực hiện của Giáo viên / Tổ chuyên môn:
                </div>
                <div className="inline-flex rounded-xl bg-white p-1 border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderMode("NEW_SKILL");
                      setTargetSkillIdForUpdate("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      builderMode === "NEW_SKILL"
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    + Tạo Skill môn học mới
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderMode("UPDATE_DEPT_SKILL");
                      const list = scopeCatalog?.departmentEditableSkills || [];
                      if (list.length > 0 && !targetSkillIdForUpdate) {
                        const firstSk = list[0];
                        setTargetSkillIdForUpdate(firstSk.id);
                        if (firstSk.topicOrLesson && !topicName) {
                          setTopicName(firstSk.topicOrLesson);
                        }
                        setDeptSessionTitle(
                          `SHCM Tổ ${firstSk.subjectName || subjectName || "chuyên môn"} — Nâng cấp ${firstSk.name}`
                        );
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      builderMode === "UPDATE_DEPT_SKILL"
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cập nhật Skill từ phiên làm việc Tổ chuyên môn (
                    {(scopeCatalog?.departmentEditableSkills || []).length})
                  </button>
                </div>
              </div>

              {builderMode === "UPDATE_DEPT_SKILL" && (
                <div className="p-4 rounded-xl bg-[#F0FDFA]/80 border border-[#00A19A]/40 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs font-bold text-[#003B3A]">
                      Cập nhật & nâng cấp phiên bản Skill từ phiên làm việc của GV Tổ chuyên môn
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#99F6E4] text-[10px] font-bold text-[#00736E]">
                      Tự động tăng phiên bản (v1.x) & ghi nhận GV đồng đóng góp
                    </span>
                  </div>

                  {(scopeCatalog?.departmentEditableSkills || []).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Chọn Skill hiện có của Tổ chuyên môn / Cá nhân cần nâng cấp *
                        </label>
                        <select
                          value={targetSkillIdForUpdate}
                          onChange={(e) => {
                            const id = e.target.value;
                            setTargetSkillIdForUpdate(id);
                            const found = (
                              scopeCatalog?.departmentEditableSkills || []
                            ).find((s: any) => s.id === id);
                            if (found) {
                              if (found.topicOrLesson) setTopicName(found.topicOrLesson);
                              if (found.workCategory) setWorkCategory(found.workCategory);
                              setDeptSessionTitle(
                                `SHCM Tổ ${found.subjectName || "chuyên môn"} — Rút kinh nghiệm & nâng cấp ${found.name}`
                              );
                            }
                          }}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white font-semibold"
                        >
                          {(scopeCatalog?.departmentEditableSkills || []).map((sk: any) => (
                            <option key={sk.id} value={sk.id}>
                              [v{sk.currentVersion}] {sk.name} — Môn {sk.subjectName} (Tác giả:{" "}
                              {sk.authorName})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Loại phiên làm việc Tổ chuyên môn
                        </label>
                        <select
                          value={deptSessionType}
                          onChange={(e) => setDeptSessionType(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                        >
                          <option value="SHCM_DINH_KY">
                            Sinh hoạt Tổ chuyên môn định kỳ (SHCM)
                          </option>
                          <option value="DAY_THU_NGHIEM">
                            Rút kinh nghiệm sau tiết dạy thử nghiệm
                          </option>
                          <option value="LIEN_LOP_CUNG_KHOI">
                            Đối sánh & điều chỉnh liên lớp cùng khối
                          </option>
                          <option value="CHUAN_HOA_HOC_LIEU">
                            Chuẩn hóa học liệu & Rubric Tổ chuyên môn
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tên phiên làm việc Tổ chuyên môn *
                        </label>
                        <input
                          type="text"
                          value={deptSessionTitle}
                          onChange={(e) => setDeptSessionTitle(e.target.value)}
                          placeholder="VD: SHCM Tổ Hóa học — Cập nhật từ thực tế lớp 11.1_CS1..."
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                        />
                      </div>

                      {Array.isArray(scopeCatalog?.departmentTeachers) &&
                        scopeCatalog.departmentTeachers.length > 0 && (
                          <div className="md:col-span-2 space-y-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Chọn thêm GV Tổ chuyên môn cùng tham gia phiên làm việc này (tùy chọn):
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap max-h-20 overflow-y-auto p-2 rounded-xl bg-white border border-[#E2E8F0]">
                              {scopeCatalog.departmentTeachers
                                .slice(0, 18)
                                .map((t: any) => {
                                  const isSel = deptSessionParticipants.some(
                                    (p) => p.userId === t.id
                                  );
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() =>
                                        setDeptSessionParticipants((prev) =>
                                          isSel
                                            ? prev.filter((p) => p.userId !== t.id)
                                            : [
                                                ...prev,
                                                {
                                                  userId: t.id,
                                                  name: t.fullName || t.name,
                                                  role: "GV Tổ chuyên môn tham gia phiên làm việc",
                                                },
                                              ]
                                        )
                                      }
                                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                        isSel
                                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                                          : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0]"
                                      }`}
                                    >
                                      {isSel ? "✓ " : "+ "}
                                      {t.fullName || t.name}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-[#E2E8F0]">
                      Hiện chưa có Skill nào thuộc môn/Tổ chuyên môn của Thầy/Cô để nâng cấp. Thầy/Cô hãy chọn <strong>+ Tạo Skill môn học mới</strong> để khởi tạo phiên bản v1.0 đầu tiên cho Tổ chuyên môn.
                    </div>
                  )}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border-l-4 border-[#003B3A] border border-[#E2E8F0]">
                <div className="text-xs font-bold text-[#003B3A]">
                  Bước 1: Tự động xác định môn/lớp từ phân công giảng dạy của Thầy/Cô
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Hệ thống chỉ truy xuất các trường dữ liệu cần thiết thuộc đúng lớp/môn Thầy/Cô được phân công và tự động ẩn danh mã/họ tên học sinh khi tổng hợp căn cứ.
                </p>
              </div>

              {loadingScope ? (
                <div className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00A19A]" />
                  <span>Đang tải phân công giảng dạy và kiểm tra kết nối dữ liệu SSM...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Năm học
                      </label>
                      <select
                        value={academicYearId}
                        onChange={(e) => {
                          setAcademicYearId(e.target.value);
                          loadScopeCatalog(e.target.value);
                        }}
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#00A19A] focus:outline-none"
                      >
                        {(scopeCatalog?.academicYears || []).map((y: any) => (
                          <option key={y.id} value={y.id}>
                            {y.name}
                            {y.isCurrent ? " (Hiện tại)" : ""}
                            {typeof y.assignmentCount === "number" && y.assignmentCount > 0
                              ? ` • ${y.assignmentCount} phân công`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lớp & Môn theo phân công giảng dạy ({assignments.length} phân công)
                      </label>
                      {assignments.length > 0 ? (
                        <select
                          value={selectedAssignmentIdx}
                          onChange={(e) => handleSelectAssignment(Number(e.target.value))}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#00A19A] focus:outline-none"
                        >
                          {assignments.map((a: any, idx: number) => (
                            <option key={`${a.classId}_${a.subjectCode}_${idx}`} value={idx}>
                              Lớp {a.className} — Môn {a.subjectName} ({a.gradeLevel}) [{a.sourceType}]
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                          Chưa tìm thấy bản ghi phân công lớp/môn trong năm học này.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kỳ / Tháng dữ liệu
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={periodType}
                          onChange={(e) => setPeriodType(e.target.value as any)}
                          className="rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs text-slate-800 bg-white"
                        >
                          <option value="SEMESTER">Theo Học kỳ</option>
                          <option value="MONTH">Theo Tháng</option>
                        </select>
                        {periodType === "SEMESTER" ? (
                          <select
                            value={semester}
                            onChange={(e) => setSemester(Number(e.target.value))}
                            className="flex-1 rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs text-slate-800 bg-white tabular-nums"
                          >
                            <option value={1}>Học kỳ 1</option>
                            <option value={2}>Học kỳ 2</option>
                          </select>
                        ) : (
                          <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="flex-1 rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs text-slate-800 bg-white tabular-nums"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                              <option key={m} value={m}>
                                Tháng {m}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bài học / Chủ đề trọng tâm Giáo viên cần xây dựng Skill <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        placeholder="VD: Saccharose và maltose / Phân số và phép cộng phân số khác mẫu..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#00A19A] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* KHỐI TRỌNG TÂM: GIÁO VIÊN CHỦ ĐỘNG XÁC ĐỊNH NỘI DUNG & THỰC TẾ LỚP HỌC */}
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-3.5">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#E2E8F0] pb-2.5">
                      <div>
                        <div className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#00A19A]" />
                          <span>Giáo viên chủ động định hướng chuyên môn & thực tế lớp học (Trọng tâm)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Thầy/Cô chủ động chọn mục tiêu công việc, ghi nhận tình hình thực tế trên lớp hoặc bổ sung giáo án. Dữ liệu SSM bên dưới chỉ đóng vai trò tham khảo bổ trợ.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProactiveMaterialBox((v) => !v)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#00A19A] text-[11px] font-semibold text-[#003B3A] cursor-pointer"
                      >
                        {showProactiveMaterialBox
                          ? "Thu gọn ô Mục tiêu & Giáo án"
                          : "+ Bổ sung Mục tiêu / Trích đoạn Giáo án"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mục đích công việc của Skill
                        </label>
                        <select
                          value={workCategory}
                          onChange={(e) => setWorkCategory(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-medium text-slate-800 bg-white focus:border-[#00A19A] focus:outline-none"
                        >
                          {(workCategories.length > 0
                            ? workCategories
                            : [
                                { code: "TASK_DIFFERENTIATION", name: "Phân hóa nhiệm vụ học tập (3 mức độ)" },
                                { code: "ACTIVITY_DESIGN", name: "Thiết kế hoạt động dạy học trên lớp" },
                                { code: "MATERIAL_CREATION", name: "Tạo học liệu / Phiếu bài tập" },
                                { code: "STUDENT_SUPPORT", name: "Hỗ trợ nội dung học sinh còn hạn chế" },
                                { code: "ASSESSMENT_EVAL", name: "Kiểm tra và đánh giá chẩn đoán" },
                              ]
                          ).map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Thời lượng dự kiến (phút)
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[15, 20, 45].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setDurationMinutes(mins)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border tabular-nums cursor-pointer ${
                                durationMinutes === mins
                                  ? "bg-[#003B3A] text-white border-[#003B3A]"
                                  : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                              }`}
                            >
                              {mins}p
                            </button>
                          ))}
                          <input
                            type="number"
                            min={5}
                            max={180}
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Number(e.target.value || 20))}
                            className="w-16 rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs text-slate-800 bg-white tabular-nums"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Nhận định chủ động của Giáo viên về tình hình lớp / Vấn đề học sinh gặp phải
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Bấm gợi ý bên dưới để chèn nhanh (không ghi tên riêng HS)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {[
                          "Học sinh hay nhầm lẫn khái niệm, tính chất hoặc công thức trọng tâm",
                          "Chênh lệch tốc độ tiếp thu giữa nhóm Khá/Giỏi và nhóm Trung bình",
                          "Nắm lý thuyết nhưng lúng túng khi giải bài tập vận dụng",
                          "Cần chia nhỏ nhiệm vụ kèm gợi ý từng bước (scaffolding) cho HS còn hạn chế",
                          "Cần hoạt động khởi động / phiếu học tập tương tác nhanh trên lớp",
                          "Cần bộ câu hỏi chẩn đoán nhanh lỗi sai thường gặp của bài học",
                        ].map((chip) => {
                          const isAdded = customNeedsNote.includes(chip);
                          return (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => {
                                setCustomNeedsNote((prev) => {
                                  if (prev.includes(chip)) return prev;
                                  return prev.trim() ? `${prev.trim()}; ${chip}.` : `${chip}.`;
                                });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                                isAdded
                                  ? "bg-[#E6F4F5] text-[#00736E] border-[#00A19A]"
                                  : "bg-white text-slate-700 border-[#E2E8F0] hover:border-[#00A19A]"
                              }`}
                            >
                              {isAdded ? "✓ " : "+ "}
                              {chip}
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        rows={2}
                        value={customNeedsNote}
                        onChange={(e) => setCustomNeedsNote(e.target.value)}
                        placeholder="Nhập hoặc chọn nhanh đặc điểm thực tế của lớp do Thầy/Cô quan sát qua giảng dạy..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#00A19A] focus:outline-none"
                      />
                    </div>

                    {showProactiveMaterialBox && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Mục tiêu / Yêu cầu cần đạt cụ thể của tiết học
                          </label>
                          <textarea
                            rows={2}
                            value={targetObjective}
                            onChange={(e) => setTargetObjective(e.target.value)}
                            placeholder="VD: Học sinh trình bày được cấu tạo phân tử, tính chất hóa học của Saccharose và Maltose..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#00A19A] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Trích đoạn Giáo án / KHBD / Ngữ liệu bài dạy (tùy chọn)
                          </label>
                          <textarea
                            rows={2}
                            value={lessonPlanReference}
                            onChange={(e) => setLessonPlanReference(e.target.value)}
                            placeholder="Dán nội dung trọng tâm từ giáo án hoặc SGK để AI bám sát 100%..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#00A19A] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nguồn dữ liệu SSM tham khảo bổ trợ (Tùy chọn tham khảo) */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          Nguồn dữ liệu SSM tham khảo bổ trợ (đối chiếu tự động nếu lớp đã có dữ liệu):
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          Chỉ mang tính tham khảo
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedSources(["ACADEMIC_RECORDS", "EXAM_BREAKDOWN"])}
                          className="px-2 py-0.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                        >
                          Mặc định (Điểm & Khảo sát)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSources(dataSourceCatalog.map((d: any) => d.id))}
                          className="px-2 py-0.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSources([])}
                          className="px-2 py-0.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                        >
                          Không dùng SSM (100% GV chủ động)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {dataSourceCatalog.map((src: any) => {
                        const checked = selectedSources.includes(src.id);
                        return (
                          <label
                            key={src.id}
                            className={`px-3 py-2 rounded-xl border text-xs flex items-start gap-2 cursor-pointer transition-colors ${
                              checked
                                ? "bg-[#F0FDFA]/60 border-[#00A19A]"
                                : "bg-[#F8FAFC]/60 border-[#E2E8F0] text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSource(src.id)}
                              className="mt-0.5 accent-[#003B3A]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-semibold text-slate-800 truncate">
                                  {src.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-600 shrink-0">
                                  Tham khảo
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                {src.note}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================================================================
              BƯỚC 2: RÀ SOÁT DỮ LIỆU (MISSING, DUPLICATES, GUARDRAILS)
              ================================================================ */}
          {step === 2 && evidenceBrief && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border-l-4 border-[#003B3A] border border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs font-bold text-[#003B3A]">
                    Bước 2: Kết quả rà soát chất lượng dữ liệu trước khi tổng hợp căn cứ
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Lớp {evidenceBrief.scope.className} • Môn {evidenceBrief.scope.subjectName} •{" "}
                    {evidenceBrief.scope.periodLabel}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-semibold tabular-nums">
                  Sĩ số lớp: {dm?.studentRosterCount ?? 0} học sinh
                </span>
              </div>

              {/* Guardrail Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#D97706]" />
                  <span>Nguyên tắc bảo toàn tính xác thực dữ liệu học thuật SSM:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  <li>
                    <strong>Không biến dữ liệu thiếu thành điểm 0:</strong> Có{" "}
                    <span className="font-bold tabular-nums">
                      {dm?.dataQuality?.missingAcademicScoreCount ?? 0}
                    </span>{" "}
                    học sinh chưa có điểm tổng kết được tách riêng hoàn toàn khỏi mẫu tính trung bình.
                  </li>
                  <li>
                    <strong>Kiểm soát suy diễn lỗi kiến thức:</strong>{" "}
                    {dm?.evidenceGuardrail?.reason}
                  </li>
                </ul>
              </div>

              {/* Bảng trạng thái từng nguồn dữ liệu */}
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                    <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold">
                      <th className="py-2.5 px-3 font-semibold">Nguồn dữ liệu SSM</th>
                      <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Số bản ghi</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Thiếu / Trùng</th>
                      <th className="py-2.5 px-3 font-semibold">Cập nhật gần nhất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] tabular-nums">
                    {(evidenceBrief.dataSourcesStatus || []).map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-500">{s.note}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              s.status === "CONNECTED"
                                ? "bg-emerald-50 text-[#059669]"
                                : s.status === "EMPTY"
                                ? "bg-amber-50 text-[#D97706]"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {s.status === "CONNECTED"
                              ? "Đủ dữ liệu"
                              : s.status === "EMPTY"
                              ? "Chưa có bản ghi"
                              : "Chưa kết nối"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                          {s.recordCount}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          Thiếu: {s.missingCount} • Trùng: {s.duplicateCount}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {s.lastUpdatedAt
                            ? new Date(s.lastUpdatedAt).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
              BƯỚC 3: BẢN CĂN CỨ XÂY DỰNG SKILL (3 KHỐI TÁCH BIỆT RÕ RÀNG)
              ================================================================ */}
          {step === 3 && evidenceBrief && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border-l-4 border-[#003B3A] border border-[#E2E8F0]">
                <div className="text-xs font-bold text-[#003B3A]">
                  Bước 3: Bản căn cứ xây dựng Skill (Phân tách 3 lớp: Số liệu tính từ dữ liệu • Nhận định AI • Đề xuất hành động)
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Số liệu được tính toán xác định ở backend từ CSDL SSM. AI chỉ diễn giải trên kết quả đã tính, tuyệt đối không tự tạo số liệu.
                </p>
              </div>

              {/* KHỐI 1: SỐ LIỆU TÍNH TỪ DỮ LIỆU */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                  <span className="text-xs font-bold text-[#003B3A]">
                    1. Số liệu tính từ dữ liệu (Deterministic Backend Metrics)
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    Phạm vi: Lớp {evidenceBrief.scope.className} • {dm?.studentRosterCount ?? 0} HS
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[11px] text-slate-500">Điểm TB hợp lệ</div>
                    <div className="text-lg font-bold text-[#003B3A] mt-0.5">
                      {dm?.academicSummary?.meanScore !== null &&
                      dm?.academicSummary?.meanScore !== undefined
                        ? dm.academicSummary.meanScore
                        : "Chưa có"}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Có điểm: {dm?.academicSummary?.studentsWithValidScore ?? 0}/
                      {dm?.studentRosterCount ?? 0} HS (Thiếu:{" "}
                      {dm?.academicSummary?.studentsWithMissingScore ?? 0})
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[11px] text-slate-500">Phân bố mức đạt</div>
                    <div className="text-xs font-semibold text-slate-800 mt-1 space-y-0.5">
                      <div>Tốt (≥8.0): {dm?.academicSummary?.distribution?.excellent ?? 0} HS</div>
                      <div>Khá (6.5–7.9): {dm?.academicSummary?.distribution?.good ?? 0} HS</div>
                      <div className="text-[#E11D48]">
                        Cần hỗ trợ (&lt;5.0): {dm?.academicSummary?.distribution?.needsSupport ?? 0} HS
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[11px] text-slate-500">Đánh giá năng lực tháng</div>
                    <div className="text-lg font-bold text-[#00736E] mt-0.5">
                      {dm?.competencySummary?.totalAssessments ?? 0} bản ghi
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Nhận xét cụ thể: {dm?.academicSummary?.teacherRemarksSampleCount ?? 0} mẫu
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[11px] text-slate-500">Bài làm / Rubric / Phụ đạo</div>
                    <div className="text-xs font-semibold text-slate-800 mt-1 space-y-0.5">
                      <div>Đề thi & phổ điểm: {dm?.examBreakdownSummary?.totalCandidateResults ?? 0}</div>
                      <div>Rubric đặc thù: {dm?.specialRubricSummary?.totalEntries ?? 0}</div>
                      <div>Hồ sơ phụ đạo: {dm?.supportSummary?.totalSupportRecords ?? 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI 2: NHẬN ĐỊNH AI TRÊN SỐ LIỆU ĐÃ TÍNH */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                  <span className="text-xs font-bold text-[#00736E]">
                    2. Nhận định AI (Diễn giải trên kết quả đã tính)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {ai?.generatedByAi ? "Tổng hợp bởi AI hệ thống" : "Tổng hợp quy tắc xác định"}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">{ai?.learningSituationSummary}</p>

                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-slate-700">
                    Nhu cầu hỗ trợ nổi bật và nguồn trích dẫn:
                  </div>
                  {(ai?.prominentSupportNeeds || []).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex items-start justify-between gap-3"
                    >
                      <span className="text-slate-800">{item.finding}</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-[#003B3A] shrink-0">
                        Nguồn: {item.sourceCitation}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* KHỐI 3: ĐỀ XUẤT HÀNH ĐỘNG & THÔNG TIN CÒN THIẾU */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                <div className="text-xs font-bold text-slate-900 border-b border-[#F1F5F9] pb-2">
                  3. Đề xuất hành động & Thông tin còn thiếu
                </div>

                {(pa?.missingInformationWarnings || []).length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-semibold">Thông tin còn thiếu cần lưu ý:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {pa.missingInformationWarnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(pa?.suggestedSkills || []).map((sg: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setWorkCategory(sg.workCategory)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        workCategory === sg.workCategory
                          ? "bg-[#F0FDFA] border-[#00A19A]"
                          : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="font-bold text-[#003B3A]">{sg.suggestedTitle}</div>
                      <div className="text-[11px] text-slate-600 mt-1">{sg.rationale}</div>
                      <div className="text-[10px] font-semibold text-[#00736E] mt-1.5">
                        Căn cứ: {sg.groundedInSource}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              BƯỚC 4: GIÁO VIÊN XÁC NHẬN & BỔ SUNG MỤC TIÊU/GIÁO ÁN
              ================================================================ */}
          {step === 4 && evidenceBrief && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border-l-4 border-[#003B3A] border border-[#E2E8F0]">
                <div className="text-xs font-bold text-[#003B3A]">
                  Bước 4: Giáo viên xác nhận căn cứ, bổ sung mục tiêu/học liệu và cấu trúc đầu ra
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Thầy/Cô có thể bỏ chọn nguồn căn cứ chưa phù hợp và bổ sung yêu cầu sư phạm thực tế của tiết dạy.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Chọn/bỏ chọn các căn cứ dữ liệu đưa vào xây dựng Skill:
                </label>
                <div className="flex flex-wrap gap-2">
                  {(evidenceBrief.dataSourcesStatus || []).map((s: any) => {
                    const checked = confirmedSourceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setConfirmedSourceIds((prev) =>
                            prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          checked
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-white text-slate-600 border-[#E2E8F0]"
                        }`}
                      >
                        {checked ? "✓ " : ""}
                        {s.name} ({s.recordCount})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhóm công việc của Skill
                  </label>
                  <select
                    value={workCategory}
                    onChange={(e) => setWorkCategory(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  >
                    {(workCategories.length > 0
                      ? workCategories
                      : [
                          { code: "ACTIVITY_DESIGN", name: "Thiết kế hoạt động" },
                          { code: "MATERIAL_CREATION", name: "Tạo học liệu" },
                          { code: "TASK_DIFFERENTIATION", name: "Phân hóa nhiệm vụ" },
                          { code: "STUDENT_SUPPORT", name: "Hỗ trợ nội dung học sinh còn hạn chế" },
                          { code: "ASSESSMENT_EVAL", name: "Kiểm tra và đánh giá" },
                        ]
                    ).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời lượng tiết học / hoạt động (phút)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value || 45))}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mục tiêu cần đạt của bài học / hoạt động hỗ trợ <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={targetObjective}
                  onChange={(e) => setTargetObjective(e.target.value)}
                  placeholder="Nhập rõ yêu cầu cần đạt hoặc mục tiêu hỗ trợ học sinh..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#00A19A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chỉnh sửa / Bổ sung nhu cầu hỗ trợ thực tế của lớp
                  </label>
                  <textarea
                    rows={3}
                    value={customNeedsNote}
                    onChange={(e) => setCustomNeedsNote(e.target.value)}
                    placeholder="Ghi chú thêm đặc điểm nhận thức hoặc nhóm học sinh cần lưu ý (không ghi tên riêng học sinh)..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bổ sung trích đoạn Giáo án / Học liệu tham khảo
                  </label>
                  <textarea
                    rows={3}
                    value={lessonPlanReference}
                    onChange={(e) => setLessonPlanReference(e.target.value)}
                    placeholder="Dán nội dung trọng tâm từ KHBD, SGK hoặc tài liệu tổ chuyên môn..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cấu trúc đầu ra mong muốn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={desiredOutputStructure}
                  onChange={(e) => setDesiredOutputStructure(e.target.value)}
                  placeholder="VD: Phiếu học tập 3 mức độ + Bảng kiểm + Hướng dẫn giải ngắn gọn..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                />
              </div>
            </div>
          )}

          {/* ================================================================
              BƯỚC 5: BẢN NHÁP SKILL BÁM SÁT DỮ LIỆU ĐÃ XÁC NHẬN
              ================================================================ */}
          {step === 5 && draftSkill && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border-l-4 border-[#003B3A] border border-[#E2E8F0]">
                <div className="text-xs font-bold text-[#003B3A]">
                  Bước 5: Kiểm tra & Hiệu chỉnh bản nháp Skill môn học
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Bản nháp dưới đây được khởi tạo từ căn cứ dữ liệu đã xác nhận và tách biệt hoàn toàn dữ liệu cá nhân của học sinh.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Skill môn học
                  </label>
                  <input
                    type="text"
                    value={draftSkill.title || ""}
                    onChange={(e) => setDraftSkill({ ...draftSkill, title: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phạm vi chia sẻ
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  >
                    <option value="DEPARTMENT">Trong Tổ chuyên môn</option>
                    <option value="CAMPUS">Trong Cơ sở</option>
                    <option value="SYSTEM">Toàn hệ thống Sky-Line</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục đích sư phạm (Giúp làm gì)
                  </label>
                  <textarea
                    rows={2}
                    value={draftSkill.purpose || ""}
                    onChange={(e) => setDraftSkill({ ...draftSkill, purpose: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Điều kiện sử dụng (Chuẩn bị gì)
                  </label>
                  <textarea
                    rows={2}
                    value={draftSkill.usageConditions || ""}
                    onChange={(e) =>
                      setDraftSkill({ ...draftSkill, usageConditions: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hướng dẫn AI (System Instruction & Quy trình thực hiện)
                </label>
                <textarea
                  rows={5}
                  value={draftSkill.aiInstruction || ""}
                  onChange={(e) =>
                    setDraftSkill({ ...draftSkill, aiInstruction: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-mono text-slate-800 bg-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cấu trúc đầu ra & Tiêu chí kiểm tra
                  </label>
                  <textarea
                    rows={4}
                    value={draftSkill.outputStructure || ""}
                    onChange={(e) =>
                      setDraftSkill({ ...draftSkill, outputStructure: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nguyên tắc & Giới hạn bảo mật
                  </label>
                  <textarea
                    rows={4}
                    value={draftSkill.principlesAndLimits || ""}
                    onChange={(e) =>
                      setDraftSkill({ ...draftSkill, principlesAndLimits: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              BƯỚC 6: CHẠY THỬ TRÊN DỮ LIỆU THUỘC QUYỀN GIÁO VIÊN & HOÀN THIỆN
              ================================================================ */}
          {step === 6 && draftSkill && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border-l-4 border-[#003B3A] border border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs font-bold text-[#003B3A]">
                    Bước 6: Chạy thử Skill với dữ liệu thuộc quyền giáo viên & Hoàn thiện
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Cho phép chỉnh sửa hướng dẫn AI và chạy lại ngay lập tức. Hệ thống lưu phiên bản Skill và nguồn dữ liệu đã dùng.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={runningTest}
                  onClick={handleRunSandboxTest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008B85] disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {runningTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xử lý chạy thử...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>{testRunResult ? "Chạy thử lại" : "Chạy thử Skill ngay"}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chủ đề / Yêu cầu thử nghiệm
                  </label>
                  <input
                    type="text"
                    value={customRunTopic}
                    onChange={(e) => setCustomRunTopic(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dữ liệu lớp gắn kèm theo phiên chạy này
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-700 font-medium">
                    Lớp {evidenceBrief?.scope?.className} • {evidenceBrief?.scope?.subjectName} (Chỉ gắn tạm thời trong phiên chạy của Thầy/Cô)
                  </div>
                </div>
              </div>

              {testRunError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
                  <span>{testRunError}</span>
                  <button
                    type="button"
                    onClick={handleRunSandboxTest}
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {testRunResult && (
                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                    <span className="text-xs font-bold text-[#059669] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Kết quả chạy thử ({testRunResult.run?.status})</span>
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      Thời gian xử lý: {testRunResult.run?.latencyMs ?? 0} ms • Tokens:{" "}
                      {(testRunResult.run?.promptTokens ?? 0) +
                        (testRunResult.run?.completionTokens ?? 0)}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-slate-800 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] max-h-72 overflow-y-auto font-sans leading-relaxed">
                    {testRunResult.outputText}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại bước {step - 1}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <>
                <button
                  type="button"
                  disabled={reviewingData || generatingSkill || !classId || !subjectCode}
                  onClick={handleStep1ToStep2}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  {reviewingData ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang đối chiếu tham khảo...</span>
                    </>
                  ) : (
                    <>
                      <span>Xem chi tiết tham khảo SSM (Bước 2)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={generatingSkill || reviewingData || !classId || !subjectCode}
                  onClick={handleQuickProactiveGenerateFromStep1}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {generatingSkill ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang khởi tạo bản nháp Skill...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#5EEAD4]" />
                      <span>Tạo nhanh bản nháp Skill (GV chủ động) →</span>
                    </>
                  )}
                </button>
              </>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer"
              >
                <span>Xem Bản căn cứ xây dựng Skill (Bước 3)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer"
              >
                <span>Xác nhận & Bổ sung mục tiêu (Bước 4)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                disabled={generatingSkill}
                onClick={handleConfirmAndGenerateDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {generatingSkill ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang khởi tạo bản nháp Skill...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    <span>Tạo bản nháp Skill (Bước 5)</span>
                  </>
                )}
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                onClick={() => setStep(6)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer"
              >
                <span>Sang Bước 6: Chạy thử & Hoàn thiện</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 6 && (
              <>
                <button
                  type="button"
                  disabled={savingFinal}
                  onClick={() => handleFinalizeSkill(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Lưu bản nháp
                </button>
                <button
                  type="button"
                  disabled={savingFinal}
                  onClick={() => handleFinalizeSkill(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  <span>Gửi duyệt & Chia sẻ</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
