"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Puzzle,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  GitFork,
  ShieldCheck,
  Eye,
  Send,
  Save,
} from "lucide-react";

interface SkillComposerAndUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (skill: any) => void;
  initialSkill?: any | null;
  forkFromSkill?: any | null;
  catalogs?: {
    subjects?: Array<{ code: string; name: string }>;
    grades?: Array<{ code: string; name: string }>;
    skillWorkCategories?: Array<{ code: string; name: string }>;
    teachers?: Array<{
      userId: string;
      teacherName: string;
      campusName?: string | null;
      subjectName?: string | null;
    }>;
  };
}

export function SkillComposerAndUploadModal({
  isOpen,
  onClose,
  onSaved,
  initialSkill,
  forkFromSkill,
  catalogs,
}: SkillComposerAndUploadModalProps) {
  const [creationMode, setCreationMode] = useState<"FORM" | "AI_ASSISTED" | "PACKAGE_UPLOAD">(
    "FORM"
  );
  const [previewMode, setPreviewMode] = useState(false);

  // Core 13 fields of a Subject Skill
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [purpose, setPurpose] = useState("");
  const [workCategory, setWorkCategory] = useState("ACTIVITY_DESIGN");
  const [subjectCodes, setSubjectCodes] = useState<string[]>([]);
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [topicName, setTopicName] = useState("");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [usageConditions, setUsageConditions] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [workflowProcess, setWorkflowProcess] = useState("");
  const [principlesAndLimits, setPrinciplesAndLimits] = useState(
    "Không đưa họ tên, mã số học sinh hoặc thông tin định danh cá nhân vào nội dung chia sẻ. Bám sát mục tiêu bài học và kiểm chứng chuyên môn trước khi phát cho học sinh."
  );
  const [outputStructure, setOutputStructure] = useState("");
  const [validationCriteria, setValidationCriteria] = useState("");
  const [referenceDocsText, setReferenceDocsText] = useState("");
  const [samplePrompt, setSamplePrompt] = useState("");
  const [sampleOutput, setSampleOutput] = useState("");
  const [compatiblePlatforms, setCompatiblePlatforms] = useState<string[]>([
    "SSM_INTERNAL",
    "GEMINI",
    "CHATGPT",
  ]);
  const [usageGuide, setUsageGuide] = useState("");
  const [externalSkillUrl, setExternalSkillUrl] = useState("");
  const [visibility, setVisibility] = useState<"DEPARTMENT" | "CAMPUS" | "SYSTEM">(
    "CAMPUS"
  );
  const [changeLog, setChangeLog] = useState("");

  // AI-assisted draft fields
  const [teacherHowToDescription, setTeacherHowToDescription] = useState("");
  const [sampleTaskOrDocument, setSampleTaskOrDocument] = useState("");
  const [generatingAiDraft, setGeneratingAiDraft] = useState(false);

  // Uploaded package state
  const [uploadingPkg, setUploadingPkg] = useState(false);
  const [packageAttachment, setPackageAttachment] = useState<any>(null);
  const [packageInspection, setPackageInspection] = useState<any>(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setPreviewMode(false);
    const src = initialSkill || forkFromSkill;
    if (src) {
      setTitle(
        forkFromSkill ? `${src.title} (Phiên bản cải tiến)` : src.title || ""
      );
      setSummary(src.summary || "");
      setPurpose(src.purpose || "");
      setWorkCategory(src.workCategory || "ACTIVITY_DESIGN");
      setSubjectCodes(src.subjectCodes || []);
      setGradeLevels(src.gradeLevels || []);
      setTopicName(src.topicName || "");
      setCollaboratorIds(src.collaboratorIds || []);
      setUsageConditions(src.usageConditions || "");
      setAiInstruction(src.aiInstruction || "");
      setWorkflowProcess(src.workflowProcess || "");
      setPrinciplesAndLimits(src.principlesAndLimits || "");
      setOutputStructure(src.outputStructure || "");
      setValidationCriteria(src.validationCriteria || "");
      setReferenceDocsText(
        Array.isArray(src.referenceDocs)
          ? src.referenceDocs.map((r: any) => r.title || r).join("\n")
          : ""
      );
      setSamplePrompt(src.samplePrompt || "");
      setSampleOutput(src.sampleOutput || "");
      setCompatiblePlatforms(
        src.compatiblePlatforms || ["SSM_INTERNAL", "GEMINI", "CHATGPT"]
      );
      setUsageGuide(src.usageGuide || "");
      setExternalSkillUrl(src.externalSkillUrl || "");
      setVisibility(src.visibility || "CAMPUS");
      setChangeLog(
        forkFromSkill
          ? `Cải tiến từ Skill gốc "${src.title}" của ${src.authorName}`
          : "Cập nhật nội dung Skill môn học"
      );
    } else {
      setTitle("");
      setSummary("");
      setPurpose("");
      setWorkCategory("ACTIVITY_DESIGN");
      setSubjectCodes([]);
      setGradeLevels([]);
      setTopicName("");
      setCollaboratorIds([]);
      setUsageConditions("");
      setAiInstruction("");
      setWorkflowProcess("");
      setPrinciplesAndLimits(
        "Không đưa họ tên, mã số học sinh hoặc thông tin định danh cá nhân vào nội dung chia sẻ. Bám sát mục tiêu bài học và kiểm chứng chuyên môn trước khi sử dụng."
      );
      setOutputStructure("");
      setValidationCriteria("");
      setReferenceDocsText("");
      setSamplePrompt("");
      setSampleOutput("");
      setCompatiblePlatforms(["SSM_INTERNAL", "GEMINI", "CHATGPT"]);
      setUsageGuide("");
      setExternalSkillUrl("");
      setVisibility("CAMPUS");
      setChangeLog("Khởi tạo phiên bản 1.0");
      setPackageAttachment(null);
      setPackageInspection(null);
    }
  }, [isOpen, initialSkill, forkFromSkill]);

  if (!isOpen) return null;

  const subjects = catalogs?.subjects || [];
  const grades = catalogs?.grades || [];
  const workCats =
    catalogs?.skillWorkCategories && catalogs.skillWorkCategories.length > 0
      ? catalogs.skillWorkCategories
      : [
          { code: "ACTIVITY_DESIGN", name: "Thiết kế hoạt động" },
          { code: "MATERIAL_CREATION", name: "Tạo học liệu" },
          { code: "TASK_DIFFERENTIATION", name: "Phân hóa nhiệm vụ" },
          { code: "STUDENT_SUPPORT", name: "Hỗ trợ nội dung học sinh còn hạn chế" },
          { code: "ASSESSMENT_EVAL", name: "Kiểm tra và đánh giá" },
        ];

  const toggleItem = (list: string[], setter: (v: string[]) => void, code: string) => {
    setter(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  };

  const handleGenerateAiDraft = async () => {
    if (!teacherHowToDescription.trim()) {
      setErrorMsg("Vui lòng mô tả cách làm hoặc quy trình sư phạm để AI hỗ trợ tạo bản nháp.");
      return;
    }
    setGeneratingAiDraft(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "aiAssistDraftSkill",
          title,
          workCategory,
          subjectCodes,
          gradeLevels,
          topicName,
          teacherHowToDescription,
          sampleTaskOrDocument,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể tạo bản nháp từ mô tả.");
      const d = json.draft;
      if (d) {
        setTitle(d.title || title);
        setSummary(d.summary || summary);
        setPurpose(d.purpose || purpose);
        setUsageConditions(d.usageConditions || usageConditions);
        setAiInstruction(d.aiInstruction || aiInstruction);
        setWorkflowProcess(d.workflowProcess || workflowProcess);
        setPrinciplesAndLimits(d.principlesAndLimits || principlesAndLimits);
        setOutputStructure(d.outputStructure || outputStructure);
        setValidationCriteria(d.validationCriteria || validationCriteria);
        setSamplePrompt(d.samplePrompt || samplePrompt);
        setSampleOutput(d.sampleOutput || sampleOutput);
        setUsageGuide(d.usageGuide || usageGuide);
        setCreationMode("FORM");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi khi nhờ AI tạo bản nháp Skill.");
    } finally {
      setGeneratingAiDraft(false);
    }
  };

  const handleUploadPackage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPkg(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploadType", "SKILL_PACKAGE");
      const res = await fetch("/api/skyline-connect/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gói Skill tải lên không hợp lệ.");
      }
      setPackageAttachment(json.attachment);
      setPackageInspection(json.inspection);
      if (json.inspection?.manifestSummary) {
        const mf = json.inspection.manifestSummary;
        if (mf.title && !title) setTitle(mf.title);
        if (mf.summary && !summary) setSummary(mf.summary);
        if (mf.purpose && !purpose) setPurpose(mf.purpose);
        if (mf.aiInstruction && !aiInstruction) setAiInstruction(mf.aiInstruction);
      } else if (json.inspection?.extractedMarkdownPreview && !aiInstruction) {
        setAiInstruction(json.inspection.extractedMarkdownPreview);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể tải gói Skill lên.");
    } finally {
      setUploadingPkg(false);
      e.target.value = "";
    }
  };

  const handleSave = async (submitForReview: boolean) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const referenceDocs = referenceDocsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ title: line, type: "Tài liệu tham khảo" }));

      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createOrUpdateSkill",
          skillId: initialSkill?.id,
          parentSkillId: forkFromSkill?.id || initialSkill?.parentSkillId || null,
          title,
          summary,
          purpose,
          workCategory,
          creationMode: forkFromSkill ? "FORK" : creationMode,
          subjectCodes,
          gradeLevels,
          topicName,
          collaboratorIds,
          usageConditions,
          aiInstruction,
          workflowProcess,
          principlesAndLimits,
          outputStructure,
          validationCriteria,
          referenceDocs,
          samplePrompt,
          sampleOutput,
          compatiblePlatforms,
          usageGuide,
          packageAttachmentId: packageAttachment?.id || initialSkill?.packageAttachmentId || null,
          externalSkillUrl,
          visibility,
          submitForReview,
          changeLog,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể lưu Skill môn học.");
      onSaved(json.skill);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Đã xảy ra lỗi khi lưu Skill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#003B3A] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00A19A]/30 border border-[#5EEAD4]/40 flex items-center justify-center">
              {forkFromSkill ? (
                <GitFork className="w-5 h-5 text-[#5EEAD4]" />
              ) : (
                <Puzzle className="w-5 h-5 text-[#5EEAD4]" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {initialSkill
                  ? `Cập nhật Skill (Phiên bản hiện tại: v${initialSkill.currentVersion})`
                  : forkFromSkill
                  ? `Tạo phiên bản cải tiến từ Skill: ${forkFromSkill.title}`
                  : "Đóng góp Skill môn học"}
              </h2>
              <p className="text-xs text-teal-100/80">
                {forkFromSkill
                  ? `Ghi nhận nguồn và tác giả gốc: ${forkFromSkill.originalAuthorName || forkFromSkill.authorName}`
                  : "Hỗ trợ tạo bằng biểu mẫu chuẩn 13 mục, mô tả để AI tạo bản nháp, hoặc tải gói Skill có sẵn"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Bar */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-2.5 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              { id: "FORM" as const, label: "1. Tạo bằng biểu mẫu chuẩn", icon: FileText },
              {
                id: "AI_ASSISTED" as const,
                label: "2. Mô tả cách làm để AI tạo nháp",
                icon: Sparkles,
              },
              {
                id: "PACKAGE_UPLOAD" as const,
                label: "3. Tải lên gói Skill có sẵn (.zip/.md/.json)",
                icon: Upload,
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setCreationMode(m.id);
                    setPreviewMode(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    creationMode === m.id && !previewMode
                      ? "bg-[#003B3A] text-white"
                      : "bg-white text-slate-700 border border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPreviewMode((p) => !p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
              previewMode
                ? "bg-[#00A19A] text-white border-[#00A19A]"
                : "bg-white text-[#003B3A] border-[#E2E8F0]"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? "Quay lại chỉnh sửa" : "Xem trước 5 bước"}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PREVIEW MODE */}
          {previewMode ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border-l-4 border-[#003B3A] border border-[#E2E8F0]">
                <div className="text-sm font-bold text-[#003B3A]">
                  {title || "Chưa đặt tên Skill"}
                </div>
                <p className="text-xs text-slate-600 mt-1">{summary}</p>
              </div>
              {[
                { label: "1. Giúp làm gì", content: purpose || summary },
                { label: "2. Chuẩn bị gì", content: usageConditions },
                { label: "3. Yêu cầu mẫu", content: samplePrompt },
                { label: "4. Kết quả minh họa", content: sampleOutput },
                { label: "5. Cách sử dụng", content: usageGuide || workflowProcess },
              ].map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1"
                >
                  <div className="text-xs font-bold text-[#003B3A]">{sec.label}</div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap">
                    {sec.content || "Chưa nhập nội dung"}
                  </div>
                </div>
              ))}
            </div>
          ) : creationMode === "AI_ASSISTED" ? (
            /* MODE 2: AI ASSISTED DRAFTING */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border-l-4 border-[#003B3A] border border-[#E2E8F0]">
                <div className="text-xs font-bold text-[#003B3A]">
                  Mô tả cách làm chuyên môn của Thầy/Cô để AI chuyển hóa thành bản nháp Skill 13 mục
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Chỉ cần viết tự nhiên cách Thầy/Cô thường thiết kế bài tập, phân hóa học sinh hoặc nhận xét bài làm.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả cách làm / quy trình sư phạm của Thầy/Cô <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={5}
                  value={teacherHowToDescription}
                  onChange={(e) => setTeacherHowToDescription(e.target.value)}
                  placeholder="VD: Khi dạy phần đọc hiểu Ngữ văn lớp 8, tôi thường chia câu hỏi thành 3 tầng: Nhận biết chi tiết trong văn bản, Suy luận thông điệp nghệ thuật, và Liên hệ trải nghiệm bản thân..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ví dụ bài tập mẫu hoặc đoạn tài liệu (tùy chọn, không chứa tên học sinh)
                </label>
                <textarea
                  rows={3}
                  value={sampleTaskOrDocument}
                  onChange={(e) => setSampleTaskOrDocument(e.target.value)}
                  placeholder="Dán một ví dụ ngắn để AI học đúng văn phong của Thầy/Cô..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                />
              </div>

              <button
                type="button"
                disabled={generatingAiDraft}
                onClick={handleGenerateAiDraft}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer"
              >
                {generatingAiDraft ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tạo bản nháp Skill...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#5EEAD4]" />
                    <span>Tạo bản nháp Skill và chuyển sang biểu mẫu chỉnh sửa</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* MODE 1 & 3: STRUCTURED FORM + PACKAGE UPLOAD */
            <div className="space-y-4">
              {creationMode === "PACKAGE_UPLOAD" && (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#059669]" />
                        <span>Tải lên gói Skill có sẵn (Kiểm tra bảo mật tĩnh)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Chỉ chấp nhận `.zip`, `.md`, `.json`, `.txt`, `.pdf`, `.docx` (tối đa 15MB). Hệ thống chỉ lưu và đọc như tài liệu; tự động chặn đường dẫn leo thang (`..`), script thực thi và dữ liệu học sinh.
                      </p>
                    </div>
                    <label className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer shrink-0">
                      {uploadingPkg ? "Đang kiểm tra gói..." : "Chọn tệp gói Skill"}
                      <input
                        type="file"
                        accept=".zip,.md,.json,.txt,.pdf,.docx"
                        onChange={handleUploadPackage}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {packageAttachment && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                      <div>
                        <span className="font-bold">Đã kiểm tra an toàn:</span>{" "}
                        {packageAttachment.fileName} (
                        {Math.round((packageAttachment.fileSize || 0) / 1024)} KB)
                        {packageInspection?.fileCount
                          ? ` • ${packageInspection.fileCount} tệp hợp lệ trong gói`
                          : ""}
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    </div>
                  )}
                </div>
              )}

              {/* 1. Tên, mô tả, mục đích & Nhóm công việc */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Tên Skill môn học <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Thiết kế phiếu học tập phân hóa 3 mức độ môn Toán THCS"
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-900 font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhóm công việc chuyên môn
                  </label>
                  <select
                    value={workCategory}
                    onChange={(e) => setWorkCategory(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  >
                    {workCats.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mô tả ngắn gọn
                  </label>
                  <textarea
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Tóm tắt ngắn gọn giá trị của Skill..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục đích sư phạm (Giúp làm gì)
                  </label>
                  <textarea
                    rows={2}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Làm rõ Skill này giúp giáo viên giải quyết bài toán gì..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* 3. Môn, Khối, Bài/Chủ đề */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  3. Môn học áp dụng (bao gồm môn chương trình Bộ, CTQT & môn đặc thù Sky-Line)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  {subjects.map((s) => {
                    const active = subjectCodes.includes(s.code);
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => toggleItem(subjectCodes, setSubjectCodes, s.code)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          active
                            ? "bg-[#003B3A] text-white"
                            : "bg-white text-slate-700 border border-[#E2E8F0] hover:bg-slate-100"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Khối lớp áp dụng
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    {grades.map((g) => {
                      const active = gradeLevels.includes(g.code);
                      return (
                        <button
                          key={g.code}
                          type="button"
                          onClick={() => toggleItem(gradeLevels, setGradeLevels, g.code)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            active
                              ? "bg-[#00A19A] text-white"
                              : "bg-white text-slate-700 border border-[#E2E8F0]"
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bài học / Chủ đề cụ thể
                  </label>
                  <input
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="VD: Chủ đề Phương trình bậc nhất / Kỹ năng phòng tránh rủi ro tài chính..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                  <label className="block text-xs font-semibold text-slate-700 mt-2 mb-1">
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

              {/* 4, 6, 7, 8: Điều kiện, Hướng dẫn AI, Nguyên tắc, Đầu ra */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4. Điều kiện sử dụng (Chuẩn bị gì)
                  </label>
                  <textarea
                    rows={2}
                    value={usageConditions}
                    onChange={(e) => setUsageConditions(e.target.value)}
                    placeholder="Giáo viên cần chuẩn bị đầu vào gì trước khi chạy Skill..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    7. Nguyên tắc & Giới hạn bảo mật
                  </label>
                  <textarea
                    rows={2}
                    value={principlesAndLimits}
                    onChange={(e) => setPrinciplesAndLimits(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6. Hướng dẫn AI (System Prompt) & Quy trình thực hiện <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={5}
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="Nhập hướng dẫn chi tiết cho AI (vai trò, nhiệm vụ, các bước phân tích và định dạng kết quả)..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-mono text-slate-800 bg-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    8. Cấu trúc đầu ra & Tiêu chí kiểm tra
                  </label>
                  <textarea
                    rows={3}
                    value={outputStructure}
                    onChange={(e) => setOutputStructure(e.target.value)}
                    placeholder="Các phần bắt buộc trong kết quả sinh ra..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    9. Tài liệu tham khảo & 11. Hướng dẫn sử dụng
                  </label>
                  <textarea
                    rows={3}
                    value={usageGuide}
                    onChange={(e) => setUsageGuide(e.target.value)}
                    placeholder="Các bước sử dụng trên SSM hoặc sao chép sang Gemini / ChatGPT..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* 10. Yêu cầu mẫu & Kết quả minh họa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10a. Yêu cầu mẫu (Sample Input — không chứa tên HS)
                  </label>
                  <textarea
                    rows={3}
                    value={samplePrompt}
                    onChange={(e) => setSamplePrompt(e.target.value)}
                    placeholder="Ví dụ đầu vào mẫu để đồng nghiệp hình dung ngay..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10b. Kết quả minh họa (Sample Output)
                  </label>
                  <textarea
                    rows={3}
                    value={sampleOutput}
                    onChange={(e) => setSampleOutput(e.target.value)}
                    placeholder="Ví dụ đầu ra minh họa..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
              </div>

              {initialSkill && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    13. Ghi chú lịch sử thay đổi phiên bản mới
                  </label>
                  <input
                    type="text"
                    value={changeLog}
                    onChange={(e) => setChangeLog(e.target.value)}
                    placeholder="Mô tả những điểm cải tiến trong phiên bản này..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            {initialSkill?.status === "PUBLISHED"
              ? "Lưu ý: Phiên bản đang phát hành vẫn tiếp tục hoạt động cho đến khi bản cập nhật mới được duyệt."
              : "Tự động rà soát & ẩn danh thông tin cá nhân học sinh trước khi lưu."}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu nháp</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-bold cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Gửi duyệt phát hành</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
